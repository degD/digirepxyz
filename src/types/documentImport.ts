import type { Song } from '@/types/song';

export type SupportedDocumentType = 'pdf' | 'docx' | 'image';

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

export interface BulkDocumentImportActiveFile {
  name: string;
  stage: DocumentImportStage;
}

export interface BulkDocumentImportProgress {
  total: number;
  completed: number;
  remaining: number;
  imported: number;
  failed: number;
  activeFiles: BulkDocumentImportActiveFile[];
}

export interface BulkDocumentImportFailure {
  sourceName: string;
}

export interface BulkDocumentImportResult {
  songs: Song[];
  failures: BulkDocumentImportFailure[];
  interrupted: boolean;
}

export type BulkDocumentImportProgressCallback = (progress: BulkDocumentImportProgress) => void;
