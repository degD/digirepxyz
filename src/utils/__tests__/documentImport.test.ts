import { strToU8, zipSync } from 'fflate';
import * as DocumentPicker from 'expo-document-picker';
import {
  DOCX_MIME_TYPE,
  DOCUMENT_IMPORT_INTERRUPTED_MESSAGE,
  DOCUMENT_IMPORT_MODEL,
  PDF_MIME_TYPE,
  buildDocumentPrompt,
  detectSupportedDocumentType,
  extractDocxText,
  importDocumentAsSong,
  pickDocumentForImport,
  songFromGeminiResponse,
} from '../documentImport';
import type { PickedDocument } from '@/types/documentImport';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}), { virtual: true });

function createDocxBytes(xml: string): Uint8Array {
  return zipSync({ 'word/document.xml': strToU8(xml) });
}

describe('documentImport', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extracts ordered DOCX paragraphs, tabs, line breaks, and XML entities', () => {
    const bytes = createDocxBytes(`
      <w:document><w:body>
        <w:p><w:r><w:t>{title: Grace &amp; Light}</w:t></w:r></w:p>
        <w:p><w:r><w:t>[G]Amazing</w:t><w:tab/><w:t>[C]grace</w:t><w:br/><w:t>again</w:t></w:r></w:p>
      </w:body></w:document>
    `);

    expect(extractDocxText(bytes)).toBe('{title: Grace & Light}\n[G]Amazing\t[C]grace\nagain');
  });

  it('rejects a DOCX without a document body or readable text', () => {
    expect(() => extractDocxText(zipSync({ 'word/styles.xml': strToU8('<styles />') }))).toThrow(
      'does not contain a document body'
    );
    expect(() => extractDocxText(createDocxBytes('<w:document><w:body /></w:document>'))).toThrow(
      'No readable text'
    );
  });

  it('detects only PDF and DOCX documents', () => {
    expect(detectSupportedDocumentType({ uri: 'file://song', name: 'song.pdf' })).toBe('pdf');
    expect(detectSupportedDocumentType({ uri: 'file://song', name: 'song.docx' })).toBe('docx');
    expect(() => detectSupportedDocumentType({ uri: 'file://song', name: 'song.doc' })).toThrow('PDF or DOCX');
  });

  it('builds a prompt that keeps a multi-page document as one song', () => {
    const prompt = buildDocumentPrompt('long-song.pdf');
    expect(prompt).toContain('exactly one song');
    expect(prompt).toContain('Never split it into multiple songs');
  });

  it('parses structured Gemini output and keeps one song', () => {
    const result = songFromGeminiResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'Long Song',
                    artist: 'Artist',
                    key: 'G',
                    tags: ['Live'],
                    content: '[G]First page\n\n[G]Second page',
                    warnings: ['Page break detected'],
                  }),
                },
              ],
            },
          },
        ],
      },
      'fallback.pdf'
    );

    expect(result.song.title).toBe('Long Song');
    expect(result.song.content).toBe('[G]First page\n\n[G]Second page');
    expect(result.warnings).toEqual(['Page break detected']);
  });

  it('imports a PDF as one song using the fixed Gemini model', async () => {
    const response = {
      candidates: [{ content: { parts: [{ text: '{"title":"PDF Song","content":"[C]Hello"}' }] } }],
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => response,
    } as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const document: PickedDocument = {
      uri: 'file://song.pdf',
      name: 'song.pdf',
      mimeType: PDF_MIME_TYPE,
      file: { arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer as ArrayBuffer },
    };

    const result = await importDocumentAsSong(document, 'test-key');

    expect(result.song.title).toBe('PDF Song');
    expect(fetchMock).toHaveBeenCalledWith(
      `https://generativelanguage.googleapis.com/v1beta/models/${DOCUMENT_IMPORT_MODEL}:generateContent`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-goog-api-key': 'test-key' }),
        body: expect.stringContaining('application/pdf'),
      })
    );
  });

  it('imports DOCX text as one song without sending the ZIP bytes', async () => {
    const response = {
      candidates: [{ content: { parts: [{ text: '{"title":"DOCX Song","content":"[G]Hello"}' }] } }],
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => response,
    } as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const bytes = createDocxBytes('<w:document><w:body><w:p><w:r><w:t>[G]Hello</w:t></w:r></w:p></w:body></w:document>');
    const document: PickedDocument = {
      uri: 'file://song.docx',
      name: 'song.docx',
      mimeType: DOCX_MIME_TYPE,
      file: { arrayBuffer: async () => bytes.buffer as ArrayBuffer },
    };

    const result = await importDocumentAsSong(document, 'test-key');
    const request = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
      contents: { parts: { text?: string; inline_data?: unknown }[] }[];
    };

    expect(result.song.title).toBe('DOCX Song');
    expect(request.contents[0].parts[0].text).toContain('[G]Hello');
    expect(request.contents[0].parts.some((part) => part.inline_data)).toBe(false);
  });

  it('does not call Gemini for an empty key, oversized file, or failed response', async () => {
    const document: PickedDocument = {
      uri: 'file://song.pdf',
      name: 'song.pdf',
      file: { arrayBuffer: async () => new Uint8Array([1]).buffer as ArrayBuffer },
    };
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(importDocumentAsSong(document, '')).rejects.toThrow('API key');
    expect(fetchMock).not.toHaveBeenCalled();

    const oversized = {
      ...document,
      file: { arrayBuffer: async () => new Uint8Array(50 * 1024 * 1024 + 1).buffer as ArrayBuffer },
    };
    await expect(importDocumentAsSong(oversized, 'key')).rejects.toThrow('larger than 50 MB');

    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid key' } as Response);
    await expect(importDocumentAsSong(document, 'key')).rejects.toThrow('Gemini request failed (401)');
  });

  it('aborts an active Gemini request when its caller signal aborts', async () => {
    const controller = new AbortController();
    let startRequest: (() => void) | undefined;
    const requestStarted = new Promise<void>((resolve) => {
      startRequest = resolve;
    });
    const fetchMock = jest.fn((_url: string, options?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        startRequest?.();
        options?.signal?.addEventListener('abort', () => reject(new Error('request aborted')));
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const document: PickedDocument = {
      uri: 'file://song.pdf',
      name: 'song.pdf',
      file: { arrayBuffer: async () => new Uint8Array([1]).buffer as ArrayBuffer },
    };

    const importing = importDocumentAsSong(document, 'test-key', undefined, controller.signal);
    await requestStarted;
    controller.abort();

    await expect(importing).rejects.toThrow(DOCUMENT_IMPORT_INTERRUPTED_MESSAGE);
  });

  it('picks one PDF or DOCX file and honors cancellation', async () => {
    const picker = DocumentPicker.getDocumentAsync as jest.Mock;
    picker.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://song.pdf', name: 'song.pdf' }],
    });
    await expect(pickDocumentForImport()).resolves.toEqual({ uri: 'file://song.pdf', name: 'song.pdf' });
    expect(picker).toHaveBeenLastCalledWith({
      type: [PDF_MIME_TYPE, DOCX_MIME_TYPE],
      multiple: false,
      copyToCacheDirectory: true,
    });

    picker.mockResolvedValueOnce({ canceled: true });
    await expect(pickDocumentForImport()).resolves.toBeNull();
  });
});
