import {
  normalizeFontScale,
  getSongFontScale,
  formatFontScalePercent,
  DEFAULT_FONT_SCALE,
  MIN_FONT_SCALE,
} from '../fontScale';

describe('fontScale', () => {
  describe('normalizeFontScale', () => {
    it('returns DEFAULT_FONT_SCALE for invalid input', () => {
      expect(normalizeFontScale(undefined)).toBe(DEFAULT_FONT_SCALE);
      expect(normalizeFontScale(null)).toBe(DEFAULT_FONT_SCALE);
      expect(normalizeFontScale('1.5')).toBe(DEFAULT_FONT_SCALE);
      expect(normalizeFontScale(NaN)).toBe(DEFAULT_FONT_SCALE);
    });

    it('enforces MIN_FONT_SCALE lower bound', () => {
      expect(normalizeFontScale(0.2)).toBe(MIN_FONT_SCALE);
    });

    it('returns valid scale numbers unchanged', () => {
      expect(normalizeFontScale(1.2)).toBe(1.2);
    });
  });

  describe('getSongFontScale', () => {
    it('returns song.fontScale normalized if numeric', () => {
      expect(getSongFontScale({ id: '1', title: 'A', content: '', fontScale: 1.5 })).toBe(1.5);
      expect(getSongFontScale({ id: '1', title: 'A', content: '', fontScale: 0.1 })).toBe(0.5);
    });

    it('migrates legacy fontSizeName', () => {
      expect(getSongFontScale({ id: '1', title: 'A', content: '', fontSizeName: 'Large' })).toBe(1.25);
      expect(getSongFontScale({ id: '1', title: 'A', content: '', fontSizeName: 'Small' })).toBe(0.85);
    });

    it('returns DEFAULT_FONT_SCALE when no scale info exists', () => {
      expect(getSongFontScale({ id: '1', title: 'A', content: '' })).toBe(DEFAULT_FONT_SCALE);
    });
  });

  describe('formatFontScalePercent', () => {
    it('formats percentage strings correctly', () => {
      expect(formatFontScalePercent(1)).toBe('100%');
      expect(formatFontScalePercent(1.25)).toBe('125%');
      expect(formatFontScalePercent(0.85)).toBe('85%');
    });
  });
});
