import { Song } from '@/types';
import { loadSongs, persistSongs } from '@/utils/songStorage';
import { SongModel } from './models/Song';
import { DB_SCHEMA_VERSION, TABLES } from './schema';

/**
 * Repository interface for song database persistence operations.
 */
export class SongsRepository {
  /**
   * Retrieves all songs from persistent storage as `SongModel` instances.
   */
  async all(fallbackSongs: Song[] = []): Promise<SongModel[]> {
    const rawSongs = await loadSongs(fallbackSongs);
    return rawSongs.map((s) => SongModel.fromSong(s));
  }

  /**
   * Finds a single song by its unique ID.
   */
  async find(id: string): Promise<SongModel | null> {
    const songs = await this.all();
    const found = songs.find((s) => s.id === id);
    return found ?? null;
  }

  /**
   * Creates and persists a new song model.
   */
  async create(song: Song): Promise<SongModel> {
    const model = SongModel.fromSong(song);
    const { valid, errors } = model.validate();
    if (!valid) {
      throw new Error(`Invalid song data: ${errors.join(', ')}`);
    }

    const songs = await this.all();
    const updated = [...songs.map((s) => s.toSong()), model.toSong()];
    await persistSongs(updated);
    return model;
  }

  /**
   * Updates an existing song record by ID.
   */
  async update(id: string, updates: Partial<Song>): Promise<SongModel | null> {
    const songs = await this.all();
    const index = songs.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const current = songs[index].toSong();
    const updatedSong: Song = {
      ...current,
      ...updates,
      id, // Preserve immutable ID
      updatedAt: Date.now(),
    };

    const updatedModel = SongModel.fromSong(updatedSong);
    songs[index] = updatedModel;

    await persistSongs(songs.map((s) => s.toSong()));
    return updatedModel;
  }

  /**
   * Deletes a song record by ID.
   */
  async delete(id: string): Promise<boolean> {
    const songs = await this.all();
    const filtered = songs.filter((s) => s.id !== id);
    if (filtered.length === songs.length) return false;

    await persistSongs(filtered.map((s) => s.toSong()));
    return true;
  }

  /**
   * Batch saves an array of songs into database storage.
   */
  async batchSave(songs: Song[]): Promise<void> {
    const models = songs.map((s) => SongModel.fromSong(s));
    await persistSongs(models.map((m) => m.toSong()));
  }

  /**
   * Clears all songs from database storage.
   */
  async clearAll(): Promise<void> {
    await persistSongs([]);
  }
}

/**
 * Database instance providing table repositories and schema version metadata.
 */
export const database = {
  version: DB_SCHEMA_VERSION,
  tables: TABLES,
  songs: new SongsRepository(),
};

export default database;
export { SongModel } from './models/Song';
export * from './schema';
