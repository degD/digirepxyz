import { Platform } from 'react-native';
import { Song } from '@/types';

export interface StatusCallback {
  (status: { type: 'error' | 'info' | 'success'; message: string }): void;
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

export type ExportMethod = 'save' | 'share';

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
            mimeType: 'text/plain',
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
  const fileName = `repertoire_export_${new Date().toISOString().slice(0, 10)}.cho`;
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
  const fileName = `${toSafeFilename(song.title)}.cho`;
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
