/**
 * User preferences, settings context, and theme token definitions.
 */

export type ChordColorName =
  | 'Blue'
  | 'Green'
  | 'Purple'
  | 'Red'
  | 'Orange'
  | 'Pink';

export interface Settings {
  darkMode: boolean;
  chordColorName: ChordColorName | string;
  autoSave: boolean;
  showChordDiagrams: boolean;
  referencePitch: number;
  language: string;
}

export interface FontSizeConfig {
  lyric: number;
  chord: number;
  editor: number;
}

export type FontSizeCategory = 'Small' | 'Medium' | 'Large' | 'Extra Large';

export interface Theme {
  background: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  white: string;
  statusBar: 'light-content' | 'dark-content';
  primary: string;
}
