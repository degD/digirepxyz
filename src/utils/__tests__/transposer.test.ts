import { transposeChord, transposeBySemitones, transposeContent } from '../transposer';

describe('transposer', () => {
  it('transposes a basic major chord up a whole step', () => {
    expect(transposeChord('C', '2M')).toBe('D');
  });

  it('transposes a minor 7th chord up a perfect fifth', () => {
    expect(transposeChord('Am7', '5P')).toBe('Em7');
  });

  it('transposes slash chords properly', () => {
    expect(transposeChord('C/G', '2M')).toBe('D/A');
    expect(transposeChord('Dmaj7/F#', '2M')).toBe('Emaj7/G#');
  });

  it('handles flat/sharp enharmonics correctly via tonal', () => {
    expect(transposeChord('Bb', '2M')).toBe('C');
  });
});

describe('transposeBySemitones', () => {
  it('transposes C up 2 semitones to D', () => {
    expect(transposeBySemitones('C', 2)).toBe('D');
  });

  it('transposes Am7 up 1 semitone', () => {
    expect(transposeBySemitones('Am7', 1)).toBe('A#m7');
  });

  it('transposes Bb down 2 semitones to Ab', () => {
    expect(transposeBySemitones('Bb', -2)).toBe('Ab');
  });

  it('returns chord unchanged for 0 semitones', () => {
    expect(transposeBySemitones('C', 0)).toBe('C');
  });

  it('wraps around correctly', () => {
    expect(transposeBySemitones('B', 1)).toBe('C');
  });

  it('handles sharp chords', () => {
    expect(transposeBySemitones('F#m', 2)).toBe('G#m');
  });
});

describe('transposeContent', () => {
  it('transposes all chords in ChordPro text', () => {
    const input = '[C]Hello [G]World';
    const result = transposeContent(input, 2);
    expect(result).toBe('[D]Hello [A]World');
  });

  it('transposes down correctly', () => {
    const input = '[D]Hello [A]World';
    const result = transposeContent(input, -2);
    expect(result).toBe('[C]Hello [G]World');
  });

  it('handles slash chords', () => {
    const input = '[C/G]Hello';
    const result = transposeContent(input, 2);
    expect(result).toBe('[D/A]Hello');
  });

  it('preserves non-chord text', () => {
    const input = 'Just lyrics with no chords';
    expect(transposeContent(input, 5)).toBe(input);
  });

  it('returns text unchanged for 0 semitones', () => {
    const input = '[Am]Hey [G]there';
    expect(transposeContent(input, 0)).toBe(input);
  });

  it('handles multiline content', () => {
    const input = '[C]Line 1\n[G]Line 2';
    const result = transposeContent(input, 1);
    expect(result).toBe('[C#]Line 1\n[G#]Line 2');
  });
});
