/**
 * Types for chord and song transposition operations.
 */

export interface TranspositionResult {
  originalKey?: string;
  targetKey?: string;
  semitones: number;
  transposedContent: string;
}

export interface KeyOption {
  key: string;
  accidental: 'flat' | 'sharp' | 'natural';
}
