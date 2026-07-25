import { Song, SongTableEntity } from '@/types';

/**
 * Database schema version matching digirepx2.
 */
export const DB_SCHEMA_VERSION = 2;

/**
 * Database table name constants.
 */
export const TABLES = {
  SONGS: 'songs',
} as const;

/**
 * Schema definition for the `songs` table.
 */
export const SONGS_TABLE_SCHEMA = {
  name: TABLES.SONGS,
  columns: [
    { name: 'id', type: 'string', isOptional: false },
    { name: 'title', type: 'string', isOptional: false },
    { name: 'artist', type: 'string', isOptional: true },
    { name: 'original_key', type: 'string', isOptional: true },
    { name: 'content', type: 'string', isOptional: false },
    { name: 'is_favorite', type: 'boolean', isOptional: false },
    { name: 'tags', type: 'string', isOptional: true },
    { name: 'created_at', type: 'number', isOptional: false },
    { name: 'updated_at', type: 'number', isOptional: false },
  ],
} as const;

/**
 * Converts an application `Song` object into a database `SongTableEntity`.
 */
export function songToEntity(song: Song): SongTableEntity {
  const now = Date.now();
  return {
    id: song.id,
    title: song.title,
    artist: song.artist ?? null,
    original_key: song.originalKey ?? null,
    content: song.content ?? '',
    is_favorite: Boolean(song.isFavorite),
    tags: song.tags && song.tags.length > 0 ? JSON.stringify(song.tags) : null,
    created_at: song.createdAt ?? now,
    updated_at: song.updatedAt ?? now,
  };
}

/**
 * Converts a database `SongTableEntity` into an application `Song` object.
 */
export function entityToSong(entity: SongTableEntity): Song {
  let parsedTags: string[] | undefined;
  if (entity.tags) {
    try {
      const parsed = JSON.parse(entity.tags);
      if (Array.isArray(parsed)) {
        parsedTags = parsed;
      } else {
        parsedTags = [entity.tags];
      }
    } catch {
      parsedTags = entity.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }

  return {
    id: entity.id,
    title: entity.title,
    artist: entity.artist ?? undefined,
    originalKey: entity.original_key ?? undefined,
    content: entity.content,
    isFavorite: entity.is_favorite,
    tags: parsedTags,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}
