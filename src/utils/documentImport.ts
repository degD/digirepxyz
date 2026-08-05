import { unzipSync } from 'fflate';
import type { Song } from '@/types/song';
import type {
  DocumentImportProgress,
  DocumentImportResult,
  PickedDocument,
  SupportedDocumentType,
} from '@/types/documentImport';
import { parseImportedContent } from '@/utils/dataUtils';

export const DOCUMENT_IMPORT_MODEL = 'gemini-3.5-flash-lite';
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const PDF_MIME_TYPE = 'application/pdf';
export const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const DOCUMENT_IMPORT_TIMEOUT_MS = 60_000;
export const DOCUMENT_IMPORT_INTERRUPTED_MESSAGE = 'Document import interrupted.';

const SONG_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    artist: { type: 'STRING' },
    key: { type: 'STRING' },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
    content: { type: 'STRING' },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['title', 'content'],
} as const;

const SONG_SYSTEM_PROMPT = `You convert exactly one song document into ChordPro.

Return only JSON matching the requested schema. The entire input is one song, even when it spans multiple pages. Never split it into multiple songs and never treat a page break as a song boundary.

ChordPro rules:
- Put metadata in the returned fields, not in the content field.
- Put chords inline immediately before the syllable they belong to, for example [G]Amazing [C]grace.
- Convert chord lines above lyric lines into inline chords when their positions are clear.
- Preserve chords already present in the source. Do not invent uncertain chords.
- Convert section labels into ChordPro comments such as {comment: Chorus}.
- Return warnings for uncertain or missing information.
- Return the lyrics/content only in the content field, with no Markdown fences or explanation.`;

function logDocumentImport(event: string, details?: Record<string, unknown>): void {
  console.log('[DocumentImport]', event, details || {});
}

function getFileExtension(name: string): string {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
}

export function detectSupportedDocumentType(document: PickedDocument): SupportedDocumentType {
  const extension = getFileExtension(document.name);
  const mimeType = (document.mimeType || '').toLowerCase();

  if (extension === 'pdf' || mimeType === PDF_MIME_TYPE) return 'pdf';
  if (extension === 'docx' || mimeType === DOCX_MIME_TYPE) return 'docx';
  throw new Error('Unsupported document. Select a PDF or DOCX file.');
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value.replace(/^data:[^;]+;base64,/, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function readDocumentBytes(document: PickedDocument): Promise<Uint8Array> {
  if (document.base64) return base64ToBytes(document.base64);
  if (document.file?.arrayBuffer) return new Uint8Array(await document.file.arrayBuffer());

  // expo-file-system File.bytes() works for both file:// and content:// URIs on native.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File } = require('expo-file-system') as {
    File: new (uri: string) => { bytes: () => Promise<Uint8Array> };
  };
  return File ? await new File(document.uri).bytes() : new Uint8Array();
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

function extractParagraphText(xml: string): string {
  return (xml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi) || [])
    .map((paragraph) => {
      const parts = paragraph.match(/<w:t\b[^>]*>[\s\S]*?<\/w:t>|<w:tab\s*\/?>|<w:br\b[^>]*\/?>/gi) || [];
      return parts
        .map((part) => {
          if (/^<w:tab/i.test(part)) return '\t';
          if (/^<w:br/i.test(part)) return '\n';
          return decodeXml(part.replace(/^<w:t\b[^>]*>/i, '').replace(/<\/w:t>$/i, ''));
        })
        .join('');
    })
    .filter((paragraph) => paragraph.trim())
    .join('\n');
}

export function extractDocxText(bytes: Uint8Array): string {
  const archive = unzipSync(bytes);
  const documentXml = archive['word/document.xml'];
  if (!documentXml) throw new Error('The DOCX file does not contain a document body.');

  const text = extractParagraphText(new TextDecoder('utf-8').decode(documentXml)).trim();
  if (!text) throw new Error('No readable text was found in the DOCX file.');
  return text;
}

export function buildDocumentPrompt(filename: string, sourceText?: string): string {
  return `${SONG_SYSTEM_PROMPT}\n\nThe source filename is "${filename}".\n${
    sourceText ? `\n--- BEGIN EXTRACTED DOCUMENT TEXT ---\n${sourceText}\n--- END EXTRACTED DOCUMENT TEXT ---` : ''
  }`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getResponseText(response: unknown): string {
  if (!isRecord(response) || !Array.isArray(response.candidates)) {
    throw new Error('Gemini returned an invalid response.');
  }
  const candidate = response.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) {
    throw new Error('Gemini returned no song content.');
  }
  const text = candidate.content.parts
    .filter(isRecord)
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();
  if (!text) throw new Error('Gemini returned empty song content.');
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function songFromGeminiResponse(response: unknown, fallbackTitle: string): { song: Song; warnings: string[] } {
  const raw = JSON.parse(getResponseText(response)) as unknown;
  if (!isRecord(raw)) throw new Error('Gemini returned an invalid song object.');

  const title = stringValue(raw.title) || fallbackTitle.replace(/\.[^.]+$/, '') || 'Imported Song';
  const content = stringValue(raw.content);
  if (!content) throw new Error('Gemini returned no ChordPro content.');

  const artist = stringValue(raw.artist);
  const originalKey = stringValue(raw.key);
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim().toLowerCase()).filter(Boolean)
    : undefined;
  const warnings = Array.isArray(raw.warnings)
    ? raw.warnings.filter((warning): warning is string => typeof warning === 'string').map((warning) => warning.trim()).filter(Boolean)
    : [];

  const metadata = [
    `{title: ${title}}`,
    artist ? `{artist: ${artist}}` : '',
    originalKey ? `{key: ${originalKey}}` : '',
    tags?.length ? `{tags: ${tags.join(', ')}}` : '',
    '',
    content,
  ]
    .filter(Boolean)
    .join('\n');
  const [song] = parseImportedContent(metadata);
  if (!song) throw new Error('Gemini returned an unusable song.');
  return { song, warnings };
}

async function generateSong(
  apiKey: string,
  document: PickedDocument,
  type: SupportedDocumentType,
  bytes: Uint8Array,
  sourceText?: string,
  onProgress?: DocumentImportProgress,
  externalSignal?: AbortSignal
): Promise<{ song: Song; warnings: string[] }> {
  const requestParts: Record<string, unknown>[] = [{ text: buildDocumentPrompt(document.name, sourceText) }];
  if (type === 'pdf') {
    requestParts.push({
      inline_data: {
        mime_type: PDF_MIME_TYPE,
        data: bytesToBase64(bytes),
      },
    });
  }

  onProgress?.('sending');
  logDocumentImport('Sending Gemini request', {
    fileName: document.name,
    type,
    bytes: bytes.length,
    model: DOCUMENT_IMPORT_MODEL,
  });
  const controller = new AbortController();
  const abortForExternalSignal = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener('abort', abortForExternalSignal, { once: true });
  const timeoutId = setTimeout(() => controller.abort(), DOCUMENT_IMPORT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${DOCUMENT_IMPORT_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: requestParts }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: SONG_RESPONSE_SCHEMA,
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        }),
        signal: controller.signal,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const interrupted = externalSignal?.aborted === true;
    const timedOut = controller.signal.aborted && !interrupted;
    logDocumentImport(interrupted ? 'Gemini request interrupted' : timedOut ? 'Gemini request timed out' : 'Gemini request failed', {
      message,
    });
    throw new Error(interrupted ? DOCUMENT_IMPORT_INTERRUPTED_MESSAGE : timedOut ? 'Gemini request timed out after 60 seconds.' : `Gemini request failed: ${message}`);
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', abortForExternalSignal);
  }
  logDocumentImport('Received Gemini response', { status: response.status, ok: response.ok });
  if (externalSignal?.aborted) throw new Error(DOCUMENT_IMPORT_INTERRUPTED_MESSAGE);
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gemini request failed (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`);
  }
  onProgress?.('parsing');
  const result = songFromGeminiResponse(await response.json(), document.name);
  logDocumentImport('Parsed song', { fileName: document.name, title: result.song.title });
  return result;
}

export async function importDocumentAsSong(
  document: PickedDocument,
  apiKey: string,
  onProgress?: DocumentImportProgress,
  signal?: AbortSignal
): Promise<DocumentImportResult> {
  try {
    return await importDocumentAsSongInternal(document, apiKey, onProgress, signal);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logDocumentImport('Import failed', { fileName: document.name, message });
    throw error;
  }
}

async function importDocumentAsSongInternal(
  document: PickedDocument,
  apiKey: string,
  onProgress?: DocumentImportProgress,
  signal?: AbortSignal
): Promise<DocumentImportResult> {
  logDocumentImport('Starting import', {
    fileName: document.name,
    mimeType: document.mimeType || 'unknown',
    size: document.size ?? 'unknown',
  });
  if (!apiKey.trim()) throw new Error('Enter a Gemini API key before importing a document.');
  if (signal?.aborted) throw new Error(DOCUMENT_IMPORT_INTERRUPTED_MESSAGE);
  const type = detectSupportedDocumentType(document);
  logDocumentImport('Detected document type', { fileName: document.name, type });
  onProgress?.('reading');
  const bytes = await readDocumentBytes(document);
  if (signal?.aborted) throw new Error(DOCUMENT_IMPORT_INTERRUPTED_MESSAGE);
  logDocumentImport('Read document bytes', { fileName: document.name, bytes: bytes.length });
  if (bytes.length === 0) throw new Error('The selected document is empty.');
  if (bytes.length > MAX_DOCUMENT_BYTES) throw new Error('The selected document is larger than 50 MB.');

  onProgress?.('extracting');
  const sourceText = type === 'docx' ? extractDocxText(bytes) : undefined;
  if (signal?.aborted) throw new Error(DOCUMENT_IMPORT_INTERRUPTED_MESSAGE);
  if (sourceText) logDocumentImport('Extracted DOCX text', { characters: sourceText.length });
  const result = await generateSong(apiKey.trim(), document, type, bytes, sourceText, onProgress, signal);
  return { ...result, sourceName: document.name };
}

export async function pickDocumentForImport(): Promise<PickedDocument | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DocumentPicker = require('expo-document-picker') as {
    getDocumentAsync: (options: { type: string[]; multiple: boolean; copyToCacheDirectory: boolean }) => Promise<{
      canceled?: boolean;
      assets?: PickedDocument[];
    }>;
  };
  logDocumentImport('Opening document picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: [PDF_MIME_TYPE, DOCX_MIME_TYPE],
    multiple: false,
    copyToCacheDirectory: true,
  });
  logDocumentImport('Document picker completed', { canceled: result.canceled, count: result.assets?.length || 0 });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}
