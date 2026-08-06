import { Song } from './song';

export type SyncRevision = Record<string, number>;

export interface SyncRecord {
  id: string;
  song: Song;
  revision: SyncRevision;
  deletedAt?: number;
}

export interface SyncSnapshot {
  version: 1;
  records: Record<string, SyncRecord>;
}

export interface SyncLibrary extends SyncSnapshot {
  deviceId: string;
}

export interface WebDavSyncConfig {
  url: string;
  username: string;
  lastSyncedAt?: number;
}

export interface WebDavSyncSecrets {
  password: string;
}

export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncStatus {
  state: SyncState;
  message?: string;
  updatedAt?: number;
}
