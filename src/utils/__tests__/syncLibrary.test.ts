import { SyncSnapshot } from '@/types';
import {
  activeSongs,
  compareRevisions,
  createSyncLibrary,
  deleteSongFromLibrary,
  mergeSnapshot,
  saveSongToLibrary,
} from '@/utils/syncLibrary';

describe('syncLibrary', () => {
  it('compares version vectors and recognizes concurrent changes', () => {
    expect(compareRevisions({ one: 2 }, { one: 1 })).toBe(1);
    expect(compareRevisions({ one: 1 }, { one: 2 })).toBe(-1);
    expect(compareRevisions({ one: 1 }, { one: 1 })).toBe(0);
    expect(compareRevisions({ one: 1 }, { two: 1 })).toBeNull();
  });

  it('uses a deterministic legacy baseline for migrated libraries', () => {
    const first = createSyncLibrary([{ id: 'sample', title: 'Sample', content: '[C]Text' }], 'first');
    const second = createSyncLibrary([{ id: 'sample', title: 'Sample', content: '[C]Text' }], 'second');

    expect(mergeSnapshot(first, second)).toEqual({ library: first, changed: false });
  });

  it('keeps a conflict copy for concurrent edits', () => {
    const initial = createSyncLibrary([{ id: 'song', title: 'Original', content: '[C]Text' }], 'seed');
    const first = saveSongToLibrary({ ...initial, deviceId: 'first' }, { id: 'song', title: 'First edit', content: '[C]Text' });
    const second = saveSongToLibrary({ ...initial, deviceId: 'second' }, { id: 'song', title: 'Second edit', content: '[D]Text' });
    const remote: SyncSnapshot = { version: 1, records: second.records };

    const merged = mergeSnapshot(first, remote);
    const songs = activeSongs(merged.library);

    expect(merged.changed).toBe(true);
    expect(songs).toHaveLength(2);
    expect(songs.map((song) => song.title)).toContain('First edit');
    expect(songs.map((song) => song.title)).toContain('Second edit (Conflict)');
  });

  it('keeps an edited conflict copy when deletion is concurrent', () => {
    const initial = createSyncLibrary([{ id: 'song', title: 'Original', content: '[C]Text' }], 'seed');
    const deleted = deleteSongFromLibrary({ ...initial, deviceId: 'delete-device' }, 'song');
    const edited = saveSongToLibrary({ ...initial, deviceId: 'edit-device' }, { id: 'song', title: 'Edited', content: '[D]Text' });
    const merged = mergeSnapshot(deleted, { version: 1, records: edited.records });

    expect(merged.library.records.song.deletedAt).toBeDefined();
    expect(activeSongs(merged.library)).toEqual([
      expect.objectContaining({ title: 'Edited (Conflict)', content: '[D]Text' }),
    ]);
  });
});
