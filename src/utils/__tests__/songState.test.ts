import { upsertSong } from '../songState';
import { Song } from '@/types';

describe('songState', () => {
  it('updates an existing song by id', () => {
    const existing: Song[] = [{ id: '1', title: 'Old', content: '[C]Old line' }];
    const selected: Partial<Song> = { id: '1', title: 'Old', content: '[C]Old line' };

    const result = upsertSong(existing, selected, { title: 'Updated', content: '[C]New line' });

    expect(result).toEqual([{ id: '1', title: 'Updated', content: '[C]New line' }]);
  });

  it('adds a new song when content is not empty', () => {
    const existing: Song[] = [{ id: '1', title: 'Existing', content: '[C]Existing' }];
    const selected: Partial<Song> = { id: '2', title: '', content: '' };

    const result = upsertSong(existing, selected, { title: 'New Song', content: '[G]Hello' });

    expect(result[0]).toEqual({ id: '2', title: 'New Song', content: '[G]Hello' });
    expect(result).toHaveLength(2);
  });

  it('discards a new song when content is blank', () => {
    const existing: Song[] = [{ id: '1', title: 'Existing', content: '[C]Existing' }];
    const selected: Partial<Song> = { id: '2', title: '', content: '' };

    const result = upsertSong(existing, selected, { title: 'Untitled', content: '   ' });

    expect(result).toEqual(existing);
  });
});
