import { Song } from '@/types';

/**
 * Performs an immutable upsert (update or insert) operation on a list of songs in component/application state.
 * If `selectedSong` exists in `existingSongs`, updates its fields; otherwise prepends a new song if content is non-blank.
 *
 * @param existingSongs - Current array of songs in state.
 * @param selectedSong - Currently selected song object (if editing an existing song).
 * @param songData - Updated or new song data fields.
 * @returns Updated array of songs.
 */
export function upsertSong(
  existingSongs: Song[],
  selectedSong: Partial<Song> | null | undefined,
  songData: Partial<Song>
): Song[] {
  if (!selectedSong?.id) return existingSongs;

  const songIndex = existingSongs.findIndex((song) => song.id === selectedSong.id);
  if (songIndex >= 0) {
    const updated = [...existingSongs];
    updated[songIndex] = { ...updated[songIndex], ...songData };
    return updated;
  }

  const content = typeof songData?.content === 'string' ? songData.content : '';
  if (content.trim() === '') return existingSongs;

  return [{ ...selectedSong, ...songData } as Song, ...existingSongs];
}
