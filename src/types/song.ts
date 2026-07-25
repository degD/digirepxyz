/**
 * Core type definitions for Songs and ChordPro parsed structures.
 */

export interface Song {
  id: string;
  title: string;
  artist?: string;
  originalKey?: string;
  content: string;
  isFavorite?: boolean;
  tags?: string[];
  fontScale?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface ChordSegment {
  chord: string | null;
  text: string;
  isDirective?: boolean;
}

export type ParsedLine = ChordSegment[];
export type ParsedSong = ParsedLine[];
