/**
 * Chord diagram structure matching standard guitar chord positioning schema.
 */

export interface ChordPosition {
  frets: number[]; // e.g. [-1, 0, 2, 2, 2, 0] (-1 = muted/x, 0 = open)
  fingers: number[]; // e.g. [0, 0, 1, 2, 3, 0] (0 = unassigned)
  barres?: number[]; // fret numbers where barres are applied
  capo?: boolean;
  baseFret?: number;
}

export interface ChordDefinition {
  key: string; // e.g. "C", "A", "G"
  suffix: string; // e.g. "major", "m7", "dim"
  positions: ChordPosition[];
}

export interface ChordFilter {
  key?: string;
  suffix?: string;
  query?: string;
}
