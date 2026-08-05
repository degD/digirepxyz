import type { Song } from '@/types/song';

export type SupportedDocumentType = 'pdf' | 'docx';

export interface PickedDocument {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  file?: {
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };
  base64?: string;
}

export interface DocumentImportResult {
  song: Song;
  sourceName: string;
  warnings: string[];
}

export type DocumentImportStage = 'reading' | 'extracting' | 'sending' | 'parsing';

export type DocumentImportProgress = (stage: DocumentImportStage) => void;
