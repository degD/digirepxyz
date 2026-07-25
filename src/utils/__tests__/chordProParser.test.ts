import { parseChordPro } from '../chordProParser';

describe('chordProParser', () => {
  it('parses a basic line with chords', () => {
    const text = 'Hello [C]world of [G]music';
    const parsed = parseChordPro(text);

    expect(parsed.length).toBe(1);
    expect(parsed[0]).toEqual([
      { chord: null, text: 'Hello ' },
      { chord: 'C', text: 'world of ' },
      { chord: 'G', text: 'music' },
    ]);
  });

  it('parses a line starting with a chord', () => {
    const text = '[Am]Starting chord';
    const parsed = parseChordPro(text);

    expect(parsed[0]).toEqual([
      { chord: 'Am', text: 'Starting chord' },
    ]);
  });

  it('handles directives', () => {
    const text = '{title: My Song}';
    const parsed = parseChordPro(text);

    expect(parsed[0]).toEqual([
      { chord: null, text: '{title: My Song}', isDirective: true },
    ]);
  });

  it('handles multiline strings', () => {
    const text = '[C]Line 1\n[G]Line 2';
    const parsed = parseChordPro(text);

    expect(parsed.length).toBe(2);
    expect(parsed[1][0].chord).toBe('G');
  });

  it('handles adjacent chords with no text between', () => {
    const text = '[C][G]Hey';
    const parsed = parseChordPro(text);

    expect(parsed[0]).toEqual([
      { chord: 'C', text: '' },
      { chord: 'G', text: 'Hey' },
    ]);
  });
});
