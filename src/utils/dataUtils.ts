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

/**
 * Exports all songs in the library into a combined ChordPro text file (.cho).
 * Triggers a web download on web platforms or system share sheet via `expo-file-system` and `expo-sharing` on native.
 *
 * @param songs - Array of songs to export.
 * @param onStatus - Optional callback for reporting status updates or error messages.
 * @returns Status object containing `success` boolean and status message string.
 */
export function exportLibrary(
  songs: Song[],
  onStatus?: StatusCallback
): { success: boolean; message: string } {
  const content = songs
    .map((song) => {
      return [
        `{title: ${song.title}}`,
        song.artist ? `{artist: ${song.artist}}` : null,
        song.originalKey ? `{key: ${song.originalKey}}` : null,
        song.tags && song.tags.length > 0 ? `{tags: ${song.tags.join(', ')}}` : null,
        '',
        song.content || '',
        '',
        '---',
        '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repertoire_export_${new Date().toISOString().slice(0, 10)}.cho`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, message: `Exported ${songs.length} songs` };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { File, Paths } = require('expo-file-system');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sharing = require('expo-sharing');

    (async () => {
      try {
        const fileName = `repertoire_export_${new Date().toISOString().slice(0, 10)}.cho`;
        const file = new File(Paths.cache, fileName);
        file.write(content);

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/plain',
            dialogTitle: 'Export Library',
          });
        } else {
          if (onStatus) onStatus({ type: 'error', message: 'Sharing is not available on this device.' });
        }
      } catch (err: any) {
        console.warn('Native export failed', err);
        if (onStatus) onStatus({ type: 'error', message: `Native export failed: ${err.message}` });
      }
    })();

    return { success: true, message: `Preparing native export for ${songs.length} songs...` };
  } catch (err) {
    console.warn('Native export dependencies unavailable', err);
    if (onStatus) onStatus({ type: 'error', message: 'Native export requires expo-file-system and expo-sharing.' });
  }

  return { success: false, message: 'Export failed (missing packages)' };
}

/**
 * Parses raw imported ChordPro file content into an array of structured `Song` objects.
 * Splits song blocks separated by `---` and extracts title, artist, key, and tags directives.
 *
 * @param text - Raw string text of the imported ChordPro file.
 * @returns Array of parsed `Song` objects.
 */
export function parseImportedContent(text: string): Song[] {
  const songBlocks = text.split(/\n---\n/).filter((block) => block.trim());
  const songs: Song[] = [];

  for (const block of songBlocks) {
    const lines = block.trim().split('\n');
    let title = 'Untitled';
    let artist = '';
    let key = '';
    let tags: string[] = [];
    const contentLines: string[] = [];

    for (const line of lines) {
      const titleMatch = line.match(/\{title:\s*(.+)\}/i);
      const artistMatch = line.match(/\{artist:\s*(.+)\}/i);
      const keyMatch = line.match(/\{key:\s*(.+)\}/i);
      const tagsMatch = line.match(/\{tags:\s*(.+)\}/i);

      if (titleMatch) title = titleMatch[1].trim();
      else if (artistMatch) artist = artistMatch[1].trim();
      else if (keyMatch) key = keyMatch[1].trim();
      else if (tagsMatch) tags = tagsMatch[1].split(',').map((t) => t.trim().toLowerCase());
      else contentLines.push(line);
    }

    songs.push({
      id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      title,
      artist: artist || undefined,
      originalKey: key || undefined,
      content: contentLines.join('\n').trim(),
      isFavorite: false,
      tags,
      fontScale: 1,
    });
  }

  return songs;
}

/**
 * Triggers a file picker to import songs into the library (web file input / native document picker).
 *
 * @param onImport - Callback function invoked with parsed `Song[]` array upon successful file selection.
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
          onImport(songs);
        };
        reader.readAsText(file);
      }
    };
    input.click();
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DocumentPicker = require('expo-document-picker');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
  } catch (err) {
    if (onStatus) onStatus({ type: 'error', message: 'Native import requires expo-document-picker and expo-file-system' });
  }
}

/**
 * Shares a single song using system share sheet on native devices, `navigator.share`, or web download fallback.
 *
 * @param song - The target `Song` object to share.
 * @param onStatus - Optional callback for status reporting.
 * @returns Status object containing `success` boolean and status message.
 */
export function shareSong(
  song: Song,
  onStatus?: StatusCallback
): { success: boolean; message: string } {
  const content = [
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

  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        (navigator as any).share({ title: song.title, text: content }).catch(() => {});
        return { success: true, message: 'Shared via navigator.share' };
      }
    } catch (e) {}

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toSafeFilename(song.title)}.cho`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, message: 'Downloaded song' };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { File, Paths } = require('expo-file-system');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sharing = require('expo-sharing');

    (async () => {
      try {
        const fileName = `${toSafeFilename(song.title)}.cho`;
        const file = new File(Paths.cache, fileName);
        file.write(content);

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'text/plain',
            dialogTitle: `Share ${song.title}`,
          });
        } else if (onStatus) onStatus({ type: 'error', message: 'Sharing is not available on this device.' });
      } catch (err: any) {
        if (onStatus) onStatus({ type: 'error', message: `Error sharing song: ${err.message}` });
      }
    })();

    return { success: true, message: 'Preparing native share...' };
  } catch (err) {
    if (onStatus) onStatus({ type: 'error', message: 'Native share requires expo-file-system and expo-sharing' });
  }
  return { success: false, message: 'Share failed' };
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DocumentPicker = require('expo-document-picker');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
  } catch (err) {
    if (onStatus) onStatus({ type: 'error', message: 'Native import requires expo-document-picker and expo-file-system' });
  }
}
