import { Chord } from '@tonaljs/tonal';

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Transposes a single chord string (e.g. "C", "Am7", "C/G") by a musical interval string (e.g. "2M", "5P").
 * Uses `@tonaljs/tonal` `Chord.transpose` with full slash-chord root and bass transposition support.
 *
 * @param chordStr - The chord string to transpose (e.g., "C", "Am7", "C/G").
 * @param interval - Tonal interval string (e.g., "2M" for major second, "5P" for perfect fifth).
 * @returns Transposed chord string.
 */
export const transposeChord = (chordStr: string, interval: string): string => {
  if (!chordStr) return chordStr;

  try {
    if (chordStr.includes('/')) {
      const [root, bass] = chordStr.split('/');
      const transposedRoot = Chord.transpose(root, interval) || root;
      const transposedBass = Chord.transpose(bass, interval) || bass;
      return `${transposedRoot}/${transposedBass}`;
    }

    return Chord.transpose(chordStr, interval) || chordStr;
  } catch (error) {
    console.error('Transposition error', error);
    return chordStr;
  }
};

/**
 * Transposes a single chord string by a numeric semitone count (positive = transpose up, negative = transpose down).
 * Preserves sharp or flat scale preference based on the original root note.
 *
 * @param chordStr - The chord string to transpose.
 * @param semitones - Number of semitones to transpose by.
 * @returns Transposed chord string.
 */
export const transposeBySemitones = (chordStr: string, semitones: number): string => {
  if (!chordStr || semitones === 0) return chordStr;

  let rootLen = 1;
  if (chordStr.length > 1 && (chordStr[1] === '#' || chordStr[1] === 'b')) {
    rootLen = 2;
  }
  const root = chordStr.substring(0, rootLen);
  const suffix = chordStr.substring(rootLen);

  const useFlats = root.includes('b');
  const scale = useFlats ? CHROMATIC_FLAT : CHROMATIC;

  const idx = scale.indexOf(root);
  if (idx === -1) {
    const altScale = useFlats ? CHROMATIC : CHROMATIC_FLAT;
    const altIdx = altScale.indexOf(root);
    if (altIdx === -1) return chordStr;
    const newIdx = ((altIdx + semitones) % 12 + 12) % 12;
    return altScale[newIdx] + suffix;
  }

  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return scale[newIdx] + suffix;
};

/**
 * Transposes all bracketed chords (e.g. `[C]`, `[Am7]`, `[C/G]`) in a ChordPro text string by N semitones.
 *
 * @param text - ChordPro text content containing bracketed chords.
 * @param semitones - Number of semitones to shift all chords.
 * @returns Transposed ChordPro text.
 */
export const transposeContent = (text: string, semitones: number): string => {
  if (!text || semitones === 0) return text;
  return text.replace(/\[([^\]]+)\]/g, (_match, chord) => {
    if (chord.includes('/')) {
      const [main, bass] = chord.split('/');
      return `[${transposeBySemitones(main, semitones)}/${transposeBySemitones(bass, semitones)}]`;
    }
    return `[${transposeBySemitones(chord, semitones)}]`;
  });
};
