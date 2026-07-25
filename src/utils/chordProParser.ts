import { ParsedSong, ParsedLine, ChordSegment } from '@/types';

/**
 * Parses a ChordPro formatted string into a structured array of lines (`ParsedSong`).
 * Each line contains an array of `ChordSegment` objects, representing lyrics, bracketed chords, or directives.
 *
 * @param text - The raw ChordPro string content to parse.
 * @returns A structured `ParsedSong` representation of the parsed lines and segments.
 */
export const parseChordPro = (text: string): ParsedSong => {
  if (!text) return [];

  const lines = text.split('\n');

  return lines.map((line): ParsedLine => {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return [{ chord: null, text: trimmed, isDirective: true }];
    }

    const segments: ChordSegment[] = [];
    const parts = line.split(/\[(.*?)\]/g);

    for (let i = 0; i < parts.length; i += 2) {
      const lyric = parts[i];
      const chord = i > 0 ? parts[i - 1] : null;

      if (lyric || chord) {
        segments.push({
          chord: chord || null,
          text: lyric || '',
        });
      }
    }

    return segments.length > 0 ? segments : [{ chord: null, text: '' }];
  });
};
