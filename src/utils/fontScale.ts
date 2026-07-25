import { Song } from '@/types';

export const DEFAULT_FONT_SCALE = 1;
export const MIN_FONT_SCALE = 0.5;
export const FONT_SCALE_STEP = 0.1;

const LEGACY_FONT_SIZE_TO_SCALE: Record<string, number> = {
  Small: 0.85,
  Medium: 1,
  Large: 1.25,
  'Extra Large': 1.5,
};

/**
 * Normalizes a font scale value, ensuring it is a valid finite number above the minimum threshold.
 *
 * @param input - The font scale candidate to normalize.
 * @returns Normalized numeric font scale (defaults to DEFAULT_FONT_SCALE if invalid).
 */
export function normalizeFontScale(input?: unknown): number {
  if (typeof input !== 'number' || !Number.isFinite(input)) return DEFAULT_FONT_SCALE;
  return Math.max(MIN_FONT_SCALE, input);
}

/**
 * Extracts and normalizes the font scale factor for a given song, supporting legacy `fontSizeName` migration.
 *
 * @param song - The song object to extract font scale from.
 * @returns The numeric font scale factor for the song.
 */
export function getSongFontScale(song?: (Partial<Song> & { fontSizeName?: string }) | null): number {
  if (typeof song?.fontScale === 'number') return normalizeFontScale(song.fontScale);
  if (song?.fontSizeName && LEGACY_FONT_SIZE_TO_SCALE[song.fontSizeName]) {
    return LEGACY_FONT_SIZE_TO_SCALE[song.fontSizeName];
  }
  return DEFAULT_FONT_SCALE;
}

/**
 * Formats a numeric font scale into a user-friendly percentage string (e.g. `1.25` -> `'125%'`).
 *
 * @param fontScale - Numeric font scale value.
 * @returns Formatted percentage string representation.
 */
export function formatFontScalePercent(fontScale?: number): string {
  return `${Math.round(normalizeFontScale(fontScale) * 100)}%`;
}
