import { Song, SyncLibrary, SyncRecord, SyncRevision, SyncSnapshot } from '@/types';

export function createSyncId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function cloneRevision(revision: SyncRevision): SyncRevision {
  return { ...revision };
}

function createRevision(deviceId: string): SyncRevision {
  return { [deviceId]: 1 };
}

function nextRevision(revision: SyncRevision, deviceId: string): SyncRevision {
  return { ...revision, [deviceId]: (revision[deviceId] || 0) + 1 };
}

function mergeRevisions(first: SyncRevision, second: SyncRevision): SyncRevision {
  const merged: SyncRevision = {};
  new Set([...Object.keys(first), ...Object.keys(second)]).forEach((deviceId) => {
    merged[deviceId] = Math.max(first[deviceId] || 0, second[deviceId] || 0);
  });
  return merged;
}

export function compareRevisions(first: SyncRevision, second: SyncRevision): -1 | 0 | 1 | null {
  let firstGreater = false;
  let secondGreater = false;
  new Set([...Object.keys(first), ...Object.keys(second)]).forEach((deviceId) => {
    const firstValue = first[deviceId] || 0;
    const secondValue = second[deviceId] || 0;
    firstGreater ||= firstValue > secondValue;
    secondGreater ||= secondValue > firstValue;
  });

  if (firstGreater && secondGreater) return null;
  if (firstGreater) return 1;
  if (secondGreater) return -1;
  return 0;
}

function normalizeSong(song: Song, now: number): Song {
  return {
    ...song,
    tags: song.tags?.map((tag) => tag.toLowerCase()),
    fontScale: song.fontScale ?? 1,
    createdAt: song.createdAt ?? now,
    updatedAt: song.updatedAt ?? now,
  };
}

export function createSyncLibrary(songs: Song[], deviceId = createSyncId('device')): SyncLibrary {
  const now = 0;
  const records: Record<string, SyncRecord> = {};
  songs.forEach((song) => {
    const normalized = normalizeSong(song, now);
    records[normalized.id] = {
      id: normalized.id,
      song: normalized,
      revision: { legacy: 1 },
    };
  });
  return { version: 1, deviceId, records };
}

export function isSyncLibrary(value: unknown): value is SyncLibrary {
  if (!value || typeof value !== 'object') return false;
  const library = value as Partial<SyncLibrary>;
  return library.version === 1 && typeof library.deviceId === 'string' && Boolean(library.records);
}

export function isSyncSnapshot(value: unknown): value is SyncSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<SyncSnapshot>;
  return snapshot.version === 1 && Boolean(snapshot.records);
}

export function snapshotFromLibrary(library: SyncLibrary): SyncSnapshot {
  return { version: 1, records: library.records };
}

export function activeSongs(library: SyncLibrary): Song[] {
  return Object.values(library.records)
    .filter((record) => !record.deletedAt)
    .map((record) => record.song);
}

export function saveSongToLibrary(
  library: SyncLibrary,
  songData: Partial<Song> & { id?: string }
): SyncLibrary {
  if (!songData.id) return library;
  const existing = library.records[songData.id];
  const content = typeof songData.content === 'string' ? songData.content : existing?.song.content || '';
  if (!existing && content.trim() === '') return library;

  const now = Date.now();
  const song = normalizeSong(
    {
      ...existing?.song,
      ...songData,
      id: songData.id,
      title: songData.title ?? existing?.song.title ?? '',
      content,
      createdAt: existing?.song.createdAt ?? songData.createdAt ?? now,
      updatedAt: now,
    },
    now
  );
  const record: SyncRecord = {
    id: song.id,
    song,
    revision: existing ? nextRevision(existing.revision, library.deviceId) : createRevision(library.deviceId),
  };
  return { ...library, records: { ...library.records, [record.id]: record } };
}

export function deleteSongFromLibrary(library: SyncLibrary, id: string): SyncLibrary {
  const existing = library.records[id];
  if (!existing || existing.deletedAt) return library;
  const record: SyncRecord = {
    ...existing,
    revision: nextRevision(existing.revision, library.deviceId),
    deletedAt: Date.now(),
  };
  return { ...library, records: { ...library.records, [id]: record } };
}

export function toggleFavoriteInLibrary(library: SyncLibrary, id: string): SyncLibrary {
  const existing = library.records[id];
  if (!existing || existing.deletedAt) return library;
  return saveSongToLibrary(library, { ...existing.song, isFavorite: !existing.song.isFavorite });
}

export function importSongsToLibrary(library: SyncLibrary, songs: Song[]): SyncLibrary {
  return songs.reduce((current, song) => saveSongToLibrary(current, song), library);
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function conflictCopy(record: SyncRecord): SyncRecord {
  const id = `${record.id}-conflict-${stableHash(JSON.stringify(record))}`;
  const title = record.song.title.endsWith(' (Conflict)') ? record.song.title : `${record.song.title} (Conflict)`;
  return {
    ...record,
    id,
    song: { ...record.song, id, title },
    revision: cloneRevision(record.revision),
  };
}

function resolveConcurrent(first: SyncRecord, second: SyncRecord): { primary: SyncRecord; conflict: SyncRecord | null } {
  const revision = mergeRevisions(first.revision, second.revision);
  if (first.deletedAt && second.deletedAt) {
    return { primary: { ...first, revision, deletedAt: Math.max(first.deletedAt, second.deletedAt) }, conflict: null };
  }

  if (first.deletedAt || second.deletedAt) {
    const active = first.deletedAt ? second : first;
    const deleted = first.deletedAt ? first : second;
    return { primary: { ...deleted, revision }, conflict: conflictCopy(active) };
  }

  const firstValue = JSON.stringify(first.song);
  const secondValue = JSON.stringify(second.song);
  const primary = firstValue <= secondValue ? first : second;
  const conflict = firstValue <= secondValue ? second : first;
  return { primary: { ...primary, revision }, conflict: conflictCopy(conflict) };
}

export interface MergeResult {
  library: SyncLibrary;
  changed: boolean;
}

export function mergeSnapshot(library: SyncLibrary, snapshot: SyncSnapshot): MergeResult {
  const records = { ...library.records };
  Object.values(snapshot.records).forEach((remote) => {
    const local = records[remote.id];
    if (!local) {
      records[remote.id] = remote;
      return;
    }

    const comparison = compareRevisions(local.revision, remote.revision);
    if (comparison === -1) {
      records[remote.id] = remote;
      return;
    }
    if (comparison === 1) return;
    if (comparison === 0 && JSON.stringify(local) === JSON.stringify(remote)) return;

    const resolved = resolveConcurrent(local, remote);
    records[remote.id] = resolved.primary;
    if (resolved.conflict && !records[resolved.conflict.id]) records[resolved.conflict.id] = resolved.conflict;
  });
  const changed = JSON.stringify(records) !== JSON.stringify(library.records);
  return { library: changed ? { ...library, records } : library, changed };
}
