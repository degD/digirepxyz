import { Song } from '@/types';
import { database, entityToSong, songToEntity, SongModel } from '../index';

// Mock songStorage utilities to isolate in-memory test operations
jest.mock('@/utils/songStorage', () => {
  let mockStore: Song[] = [];
  return {
    loadSongs: jest.fn(async (fallback: Song[] = []) => (mockStore.length ? mockStore : fallback)),
    persistSongs: jest.fn(async (songs: Song[]) => {
      mockStore = [...songs];
    }),
    __resetMockStore: (initial: Song[] = []) => {
      mockStore = [...initial];
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockStorage = require('@/utils/songStorage');

describe('Database Layer (Phase 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.__resetMockStore([]);
  });

  describe('Schema Converters', () => {
    it('should convert a Song domain model to a SongTableEntity', () => {
      const song: Song = {
        id: 'song-1',
        title: 'Amazing Grace',
        artist: 'John Newton',
        originalKey: 'G',
        content: '[G]Amazing grace how [C]sweet the [G]sound',
        isFavorite: true,
        tags: ['hymn', 'traditional'],
        createdAt: 1000,
        updatedAt: 2000,
      };

      const entity = songToEntity(song);
      expect(entity).toEqual({
        id: 'song-1',
        title: 'Amazing Grace',
        artist: 'John Newton',
        original_key: 'G',
        content: '[G]Amazing grace how [C]sweet the [G]sound',
        is_favorite: true,
        tags: '["hymn","traditional"]',
        created_at: 1000,
        updated_at: 2000,
      });
    });

    it('should convert a SongTableEntity back to a Song domain model', () => {
      const entity = {
        id: 'song-2',
        title: 'Hotel California',
        artist: 'Eagles',
        original_key: 'Bm',
        content: '[Bm]On a dark desert highway',
        is_favorite: false,
        tags: '["rock","70s"]',
        created_at: 3000,
        updated_at: 4000,
      };

      const song = entityToSong(entity);
      expect(song).toEqual({
        id: 'song-2',
        title: 'Hotel California',
        artist: 'Eagles',
        originalKey: 'Bm',
        content: '[Bm]On a dark desert highway',
        isFavorite: false,
        tags: ['rock', '70s'],
        createdAt: 3000,
        updatedAt: 4000,
      });
    });

    it('should handle comma-separated string tags in entityToSong fallback', () => {
      const entity = {
        id: 'song-3',
        title: 'Test Song',
        artist: null,
        original_key: null,
        content: 'Test content',
        is_favorite: false,
        tags: 'pop, acoustic',
        created_at: 5000,
        updated_at: 6000,
      };

      const song = entityToSong(entity);
      expect(song.tags).toEqual(['pop', 'acoustic']);
    });
  });

  describe('SongModel', () => {
    it('should instantiate and validate valid song data', () => {
      const model = SongModel.fromSong({
        id: '1',
        title: 'Valid Song',
        content: 'Chords here',
      });

      const validation = model.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should report validation errors for missing title', () => {
      const model = SongModel.fromSong({
        id: '1',
        title: '',
        content: 'Content',
      });

      const validation = model.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Song title is required.');
    });

    it('should convert between Model, Entity, and Song', () => {
      const raw: Song = {
        id: '10',
        title: 'Song Ten',
        content: 'Content',
        isFavorite: true,
      };

      const model = SongModel.fromSong(raw);
      const entity = model.toEntity();
      const modelFromEntity = SongModel.fromEntity(entity);

      expect(modelFromEntity.toSong().title).toBe('Song Ten');
      expect(modelFromEntity.isFavorite).toBe(true);
    });
  });

  describe('SongsRepository (database.songs)', () => {
    it('should create and retrieve a song', async () => {
      const newSong: Song = {
        id: 'song-101',
        title: 'Hallelujah',
        artist: 'Leonard Cohen',
        content: '[C]I heard there was a [Am]secret chord',
      };

      const created = await database.songs.create(newSong);
      expect(created.id).toBe('song-101');

      const found = await database.songs.find('song-101');
      expect(found).not.toBeNull();
      expect(found?.title).toBe('Hallelujah');
    });

    it('should update an existing song', async () => {
      await database.songs.create({
        id: 'song-102',
        title: 'Original Title',
        content: 'Content',
      });

      const updated = await database.songs.update('song-102', {
        title: 'Updated Title',
        isFavorite: true,
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.isFavorite).toBe(true);

      const fetched = await database.songs.find('song-102');
      expect(fetched?.title).toBe('Updated Title');
    });

    it('should delete a song by ID', async () => {
      await database.songs.create({ id: 'song-103', title: 'To Delete', content: '' });

      const deleted = await database.songs.delete('song-103');
      expect(deleted).toBe(true);

      const found = await database.songs.find('song-103');
      expect(found).toBeNull();
    });

    it('should batch save and clear all songs', async () => {
      const batch: Song[] = [
        { id: 'b1', title: 'Batch 1', content: '' },
        { id: 'b2', title: 'Batch 2', content: '' },
      ];

      await database.songs.batchSave(batch);
      let all = await database.songs.all();
      expect(all).toHaveLength(2);

      await database.songs.clearAll();
      all = await database.songs.all();
      expect(all).toHaveLength(0);
    });
  });
});
