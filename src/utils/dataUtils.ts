import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Song } from '@/types';
import { parseChordPro } from '@/utils/chordProParser';
import { Document, HeadingLevel, PageBreak, Paragraph, Packer, TextRun } from 'docx';

export interface StatusCallback {
  (status: { type: 'error' | 'info' | 'success'; message: string }): void;
}

const IMPORT_LOG_PREFIX = '[ChordProImport]';
const IMPORT_LOGGING_ENABLED = Constants.expoConfig?.extra?.chordProImportLoggingEnabled === true;

export function logChordProImport(event: string, details?: Record<string, unknown>): void {
  if (!IMPORT_LOGGING_ENABLED) return;
  console.info(IMPORT_LOG_PREFIX, event, details || {});
}

/**
 * Builds a filesystem-safe filename from a song title by collapsing non-alphanumeric/Latin characters into underscores.
 */
function toSafeFilename(title?: string): string {
  const safe = (title || 'song')
    .replace(/[^\w\u00C0-\u024F.\-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return safe || 'song';
}

export type ExportMethod = 'save' | 'share' | 'pdf' | 'word';

function formatSongAsChordPro(song: Song): string {
  return [
    `{title: ${song.title}}`,
    song.artist ? `{artist: ${song.artist}}` : null,
    song.originalKey ? `{key: ${song.originalKey}}` : null,
    song.tags && song.tags.length > 0 ? `{tags: ${song.tags.join(', ')}}` : null,
    '',
    song.content || '',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatChordLineAsHtml(content: string): string {
  return parseChordPro(content)
    .map((segments) => {
      if (segments.length === 1 && segments[0].isDirective) {
        return `<p class="directive">${escapeHtml(segments[0].text)}</p>`;
      }

      const hasChords = segments.some((segment) => segment.chord);
      if (!hasChords) {
        return `<p class="line">${escapeHtml(segments.map((segment) => segment.text).join('')) || '&nbsp;'}</p>`;
      }

      const groups = segments
        .map(
          (segment) =>
            `<span class="group"><span class="chord">${escapeHtml(segment.chord || '')}</span><span>${
              escapeHtml(segment.text) || '&nbsp;'
            }</span></span>`
        )
        .join('');
      return `<p class="line">${groups}</p>`;
    })
    .join('');
}

function formatSongsAsHtml(songs: Song[]): string {
  const sections = songs
    .map(
      (song) => `
        <section class="song">
          <h1>${escapeHtml(song.title)}</h1>
          ${song.artist ? `<p class="metadata">${escapeHtml(song.artist)}</p>` : ''}
          ${song.originalKey ? `<p class="metadata">Key: ${escapeHtml(song.originalKey)}</p>` : ''}
          ${song.tags && song.tags.length > 0 ? `<p class="metadata">${escapeHtml(song.tags.join(', '))}</p>` : ''}
          <div class="content">${formatChordLineAsHtml(song.content || '')}</div>
        </section>`
    )
    .join('');

  return `<!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { margin: 48px; }
          body { color: #111827; font-family: Arial, sans-serif; font-size: 14px; }
          .song { page-break-after: always; }
          .song:last-child { page-break-after: auto; }
          h1 { font-size: 24px; margin: 0 0 4px; }
          .metadata { color: #4b5563; margin: 2px 0; }
          .content { margin-top: 20px; font-family: "Courier New", monospace; }
          .line { display: flex; margin: 0 0 8px; min-height: 18px; white-space: pre-wrap; }
          .group { display: inline-flex; flex-direction: column; margin-right: 6px; }
          .chord { color: #2563eb; font-weight: 700; min-height: 16px; }
          .directive { color: #4b5563; margin: 0 0 8px; }
        </style>
      </head>
      <body>${sections}</body>
    </html>`;
}

function formatSegmentsAsWordParagraphs(content: string): Paragraph[] {
  return parseChordPro(content).flatMap((segments) => {
    if (segments.length === 1 && segments[0].isDirective) {
      return [new Paragraph({ text: segments[0].text })];
    }

    const hasChords = segments.some((segment) => segment.chord);
    const lyrics = segments.map((segment) => segment.text).join('') || ' ';
    if (!hasChords) return [new Paragraph({ text: lyrics })];

    const chords = segments.map((segment) => segment.chord || ' ').join('    ');
    return [
      new Paragraph({ children: [new TextRun({ text: chords, bold: true, color: '2563EB' })] }),
      new Paragraph({ text: lyrics }),
    ];
  });
}

function buildWordDocument(songs: Song[]): Document {
  const children: Paragraph[] = [];

  songs.forEach((song, index) => {
    if (index > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({ text: song.title, heading: HeadingLevel.HEADING_1 }));
    if (song.artist) children.push(new Paragraph({ text: song.artist }));
    if (song.originalKey) children.push(new Paragraph({ text: `Key: ${song.originalKey}` }));
    if (song.tags && song.tags.length > 0) children.push(new Paragraph({ text: `Tags: ${song.tags.join(', ')}` }));
    children.push(...formatSegmentsAsWordParagraphs(song.content || ''));
  });

  return new Document({
    title: songs.length === 1 ? songs[0].title : 'Repertoire',
    sections: [{ children }],
  });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function saveNativeFile(uri: string, fileName: string, mimeType: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DocumentsPicker = require('@react-native-documents/picker');
  const results = await DocumentsPicker.saveDocuments({
    sourceUris: [uri],
    fileName,
    mimeType,
    copy: true,
  });
  const error = results?.[0]?.error;
  if (error) throw new Error(String(error));
}

function startPdfExport(songs: Song[], fileName: string, onStatus?: StatusCallback): void {
  (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Print = require('expo-print');
      const result = await Print.printToFileAsync({ html: formatSongsAsHtml(songs) });

      if (Platform.OS === 'web') {
        if (onStatus) onStatus({ type: 'success', message: 'PDF save dialog opened' });
        return;
      }

      await saveNativeFile(result.uri, fileName, 'application/pdf');
      if (onStatus) onStatus({ type: 'success', message: `Saved ${fileName}` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (onStatus) onStatus({ type: 'error', message: `PDF export failed: ${message}` });
    }
  })();
}

function startWordExport(songs: Song[], fileName: string, onStatus?: StatusCallback): void {
  (async () => {
    try {
      const documentFile = buildWordDocument(songs);

      if (Platform.OS === 'web') {
        const blob = await Packer.toBlob(documentFile);
        downloadBlob(blob, fileName);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { File, Paths } = require('expo-file-system');
        const file = new File(Paths.cache, fileName);
        const base64 = await Packer.toBase64String(documentFile);
        await file.write(base64, { encoding: 'base64' });
        await saveNativeFile(file.uri, fileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }

      if (onStatus) onStatus({ type: 'success', message: `Saved ${fileName}` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (onStatus) onStatus({ type: 'error', message: `Word export failed: ${message}` });
    }
  })();
}

function exportText(
  content: string,
  fileName: string,
  method: ExportMethod,
  shareTitle: string,
  onStatus: StatusCallback | undefined,
  webMessage: string,
  nativeMessage: string
): { success: boolean; message: string } {
  if (Platform.OS === 'web') {
    if (method === 'share') {
      try {
        const webNavigator = navigator as Navigator & {
          share?: (data: { title: string; text: string }) => Promise<void>;
        };
        if (webNavigator.share) {
          webNavigator.share({ title: shareTitle, text: content }).catch(() => {});
          return { success: true, message: 'Shared via navigator.share' };
        }
      } catch {}
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return { success: true, message: webMessage };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File, Paths } = require('expo-file-system');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require('expo-sharing');

    (async () => {
      try {
        const file = new File(Paths.cache, fileName);
        file.write(content);

        if (method === 'save') {
          // saveDocuments opens the native Save As dialog instead of the Share sheet.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const DocumentsPicker = require('@react-native-documents/picker');
          const results = await DocumentsPicker.saveDocuments({
            sourceUris: [file.uri],
            fileName,
            mimeType: 'application/x-chordpro',
            copy: true,
          });
          const result = results[0];
          if (result?.error) {
            if (onStatus) onStatus({ type: 'error', message: `Save failed: ${result.error}` });
          } else if (onStatus) {
            onStatus({ type: 'success', message: `Saved ${fileName}` });
          }
        } else if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/plain',
            dialogTitle: shareTitle,
          });
        } else if (onStatus) {
          onStatus({ type: 'error', message: 'Sharing is not available on this device.' });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (onStatus) onStatus({ type: 'error', message: `Export failed: ${message}` });
      }
    })();

    return { success: true, message: nativeMessage };
  } catch {
    if (onStatus) {
      onStatus({ type: 'error', message: 'Native export requires expo-file-system and expo-sharing' });
    }
    return { success: false, message: 'Export failed' };
  }
}

/**
 * Exports all songs in the library into a combined ChordPro text file (.cho).
 * Triggers a web download on web platforms or system share sheet via `expo-file-system` and `expo-sharing` on native.
 *
 * @param songs - Array of songs to export.
 * @param method - Whether to save the file or open sharing.
 * @param onStatus - Optional callback for reporting status updates or error messages.
 * @returns Status object containing `success` boolean and status message string.
 */
export function exportLibrary(
  songs: Song[],
  method: ExportMethod = 'save',
  onStatus?: StatusCallback
): { success: boolean; message: string } {
  const content = songs.map(formatSongAsChordPro).join('\n---\n');
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `repertoire_export_${date}.cho`;

  if (method === 'pdf') {
    const pdfFileName = `repertoire_export_${date}.pdf`;
    startPdfExport(songs, pdfFileName, onStatus);
    return { success: true, message: `Preparing PDF for ${songs.length} songs...` };
  }

  if (method === 'word') {
    const wordFileName = `repertoire_export_${date}.docx`;
    startWordExport(songs, wordFileName, onStatus);
    return { success: true, message: `Preparing Word for ${songs.length} songs...` };
  }

  const action = method === 'share' ? 'Share' : 'Save';

  return exportText(
    content,
    fileName,
    method,
    `${action} Library`,
    onStatus,
    `Exported ${songs.length} songs`,
    `Preparing ${method} for ${songs.length} songs...`
  );
}

/**
 * Parses raw imported ChordPro file content into an array of structured `Song` objects.
 * Splits song blocks separated by `---` and extracts title, artist, key, and tags directives.
 *
 * @param content - Raw text content from imported file.
 * @returns Array of parsed `Song` objects.
 */
export function parseImportedContent(content: string): Song[] {
  if (!content || !content.trim()) return [];

  const rawBlocks = content.split(/\n---\n/);
  const songs: Song[] = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i].trim();
    if (!block) continue;

    let title = 'Untitled';
    let artist = '';
    let originalKey = '';
    let tags: string[] = [];

    const titleMatch = block.match(/\{title:\s*([^}]+)\}/i) || block.match(/\{t:\s*([^}]+)\}/i);
    if (titleMatch) title = titleMatch[1].trim();

    const artistMatch = block.match(/\{artist:\s*([^}]+)\}/i) || block.match(/\{a:\s*([^}]+)\}/i);
    if (artistMatch) artist = artistMatch[1].trim();

    const keyMatch = block.match(/\{key:\s*([^}]+)\}/i) || block.match(/\{k:\s*([^}]+)\}/i);
    if (keyMatch) originalKey = keyMatch[1].trim();

    const tagsMatch = block.match(/\{tags:\s*([^}]+)\}/i);
    if (tagsMatch) {
      tags = tagsMatch[1]
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
    }

    if (!title || title === 'Untitled') {
      const firstLine = block.split('\n')[0].replace(/[{}[\]]/g, '').trim();
      title = firstLine ? firstLine.slice(0, 30) : 'Untitled';
    }

    const cleanContent = block
      .replace(/\{title:\s*[^}]+\}\n?/gi, '')
      .replace(/\{t:\s*[^}]+\}\n?/gi, '')
      .replace(/\{artist:\s*[^}]+\}\n?/gi, '')
      .replace(/\{a:\s*[^}]+\}\n?/gi, '')
      .replace(/\{key:\s*[^}]+\}\n?/gi, '')
      .replace(/\{k:\s*[^}]+\}\n?/gi, '')
      .replace(/\{tags:\s*[^}]+\}\n?/gi, '')
      .trim();

    songs.push({
      id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      artist: artist || undefined,
      originalKey: originalKey || undefined,
      tags: tags.length > 0 ? tags : undefined,
      content: cleanContent || block,
      fontScale: 1,
      isFavorite: false,
    });
  }

  return songs;
}

/**
 * Reads a file URI received from the operating system and parses its ChordPro content.
 * The URI can be a local file URI or an Android content URI.
 */
export async function importSongsFromUri(fileUri: string): Promise<Song[]> {
  if (!fileUri) {
    logChordProImport('Rejected empty URI');
    return [];
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File } = require('expo-file-system') as {
      File: new (uri: string) => {
        exists?: boolean;
        name?: string;
        size?: number;
        type?: string;
        text: () => Promise<string>;
      };
    };
    const file = new File(fileUri);
    const fileName = file.name || decodeURIComponent(fileUri.split(/[/?#]/).pop() || '');
    logChordProImport('Resolved incoming file', {
      uri: fileUri,
      fileName,
      mimeType: file.type || 'unknown',
      size: file.size ?? 'unknown',
      exists: file.exists ?? 'unknown',
    });

    const hasChordProExtension = /\.(cho|chordpro)$/i.test(fileName);
    const hasExplicitExtension = /\.[^./]+$/.test(fileName);
    if (hasExplicitExtension && !hasChordProExtension) {
      logChordProImport('Rejected unsupported extension', { fileName });
      throw new Error('Unsupported file type. Select a .cho or .chordpro file.');
    }
    if (!hasChordProExtension) {
      logChordProImport('Provider hid filename extension; validating content', { fileName });
    }

    const content = await file.text();
    logChordProImport('Read incoming file', { fileName, characters: content.length });
    const hasChordProDirective = /\{(?:title|t|artist|a|key|k|tags|comment|c|start_of_chorus|end_of_chorus|soc|eoc|define)\s*(?::|\})/i.test(
      content
    );
    const hasChord = /\[[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|no|[0-9]|[/()+\-])*\]/i.test(content);
    logChordProImport('Validated ChordPro syntax', { fileName, hasChordProDirective, hasChord });
    if (!hasChordProDirective && !hasChord) {
      throw new Error('The selected file is not a valid ChordPro document.');
    }

    const songs = parseImportedContent(content);
    logChordProImport('Parsed incoming file', { fileName, songCount: songs.length });
    return songs;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logChordProImport('Import failed', { uri: fileUri, message });
    throw new Error(`Could not read the selected ChordPro file: ${message}`);
  }
}

/**
 * Triggers a native document picker or web file dialog to select and import ChordPro song files.
 *
 * @param onImport - Callback invoked with the parsed array of imported `Song` objects.
 * @param onStatus - Optional callback for reporting status updates or error messages.
 */
export function triggerFileImport(
  onImport: (songs: Song[]) => void,
  onStatus?: StatusCallback
): void {
  if (Platform.OS === 'web') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cho,.chordpro,.txt';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          const songs = parseImportedContent(text);
          if (songs.length > 0) {
            onImport(songs);
            if (onStatus) onStatus({ type: 'success', message: `Imported ${songs.length} song(s)` });
          } else {
            if (onStatus) onStatus({ type: 'error', message: 'No valid songs found in file.' });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DocumentPicker = require('expo-document-picker');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File } = require('expo-file-system');

    (async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['text/plain', '*/*'],
          copyToCacheDirectory: true,
        });

        const cancelled =
          result?.canceled === true ||
          result?.type === 'cancel' ||
          result?.type === 'cancelled' ||
          result?.status === 'cancelled';
        if (cancelled) return;

        let fileUri: string | null = null;
        if (result?.assets && result.assets.length > 0) {
          fileUri = result.assets[0].uri;
        } else if (result?.uri) {
          fileUri = result.uri;
        } else if (result?.fileUri) {
          fileUri = result.fileUri;
        }

        if (!fileUri) {
          if (onStatus) onStatus({ type: 'error', message: 'Could not determine file URI from picker result.' });
          return;
        }

        const pickedFile = new File(fileUri);
        const text = await pickedFile.text();

        const songs = parseImportedContent(text);
        if (songs.length > 0) {
          onImport(songs);
        } else {
          if (onStatus) onStatus({ type: 'error', message: 'No songs found in the selected file.' });
        }
      } catch (err: any) {
        if (onStatus) onStatus({ type: 'error', message: `Error importing file: ${err.message}` });
      }
    })();
  } catch {
    if (onStatus) onStatus({ type: 'error', message: 'Native import requires expo-document-picker and expo-file-system' });
  }
}

/**
 * Exports one song as a ChordPro `.cho` file.
 * `save` uses the system file destination flow on native platforms; `share` uses sharing.
 *
 * @param song - Song to export.
 * @param method - Whether to save the file or open sharing.
 * @param onStatus - Optional callback for reporting status updates or error messages.
 */
export function exportSong(
  song: Song,
  method: ExportMethod = 'save',
  onStatus?: StatusCallback
): { success: boolean; message: string } {
  const content = formatSongAsChordPro(song);
  const safeTitle = toSafeFilename(song.title);

  if (method === 'pdf') {
    const fileName = `${safeTitle}.pdf`;
    startPdfExport([song], fileName, onStatus);
    return { success: true, message: `Preparing PDF for ${song.title}...` };
  }

  if (method === 'word') {
    const fileName = `${safeTitle}.docx`;
    startWordExport([song], fileName, onStatus);
    return { success: true, message: `Preparing Word for ${song.title}...` };
  }

  const fileName = `${safeTitle}.cho`;
  const action = method === 'share' ? 'Share' : 'Save';

  return exportText(
    content,
    fileName,
    method,
    `${action} ${song.title}`,
    onStatus,
    `Exported ${song.title}`,
    `Preparing ${method} for ${song.title}...`
  );
}

/**
 * Triggers a file picker dialog to import a single song into the editor or library.
 *
 * @param onImportSingle - Callback function invoked with the single imported `Song`.
 * @param onStatus - Optional callback for status and error reporting.
 */
export function importSingleSong(
  onImportSingle: (song: Song) => void,
  onStatus?: StatusCallback
): void {
  if (Platform.OS === 'web') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cho,.chordpro,.txt';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          const songs = parseImportedContent(text);
          if (songs.length > 0) onImportSingle(songs[0]);
          else if (onStatus) onStatus({ type: 'error', message: 'No song found in file.' });
        };
        reader.readAsText(file);
      }
    };
    input.click();
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DocumentPicker = require('expo-document-picker');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File } = require('expo-file-system');

    (async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['text/plain', '*/*'],
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) return;

        const fileUri = result.assets[0].uri;
        const pickedFile = new File(fileUri);
        const text = await pickedFile.text();

        const songs = parseImportedContent(text);
        if (songs.length > 0) {
          onImportSingle(songs[0]);
        } else {
          if (onStatus) onStatus({ type: 'error', message: 'No songs found in the selected file.' });
        }
      } catch (err: any) {
        if (onStatus) onStatus({ type: 'error', message: `Error importing file: ${err.message}` });
      }
    })();
  } catch {
    if (onStatus) onStatus({ type: 'error', message: 'Native import requires expo-document-picker and expo-file-system' });
  }
}
