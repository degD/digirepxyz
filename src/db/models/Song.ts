import { Song, SongTableEntity } from '@/types';
import { entityToSong, songToEntity } from '../schema';

/**
 * Domain model class representing a Song in the database persistence layer.
 */
export class SongModel {
  public id: string;
  public title: string;
  public artist?: string;
  public originalKey?: string;
  public content: string;
  public isFavorite: boolean;
  public tags?: string[];
  public fontScale?: number;
  public createdAt: number;
  public updatedAt: number;

  constructor(song: Song) {
    const now = Date.now();
    this.id = song.id;
    this.title = song.title;
    this.artist = song.artist;
    this.originalKey = song.originalKey;
    this.content = song.content;
    this.isFavorite = Boolean(song.isFavorite);
    this.tags = song.tags;
    this.fontScale = song.fontScale;
    this.createdAt = song.createdAt ?? now;
    this.updatedAt = song.updatedAt ?? now;
  }

  /**
   * Instantiates a `SongModel` from an application `Song` object.
   */
  static fromSong(song: Song): SongModel {
    return new SongModel(song);
  }

  /**
   * Instantiates a `SongModel` from a database `SongTableEntity`.
   */
  static fromEntity(entity: SongTableEntity): SongModel {
    return new SongModel(entityToSong(entity));
  }

  /**
   * Serializes the model into a database `SongTableEntity`.
   */
  toEntity(): SongTableEntity {
    return songToEntity(this.toSong());
  }

  /**
   * Converts the model into a plain application `Song` object.
   */
  toSong(): Song {
    return {
      id: this.id,
      title: this.title,
      artist: this.artist,
      originalKey: this.originalKey,
      content: this.content,
      isFavorite: this.isFavorite,
      tags: this.tags,
      fontScale: this.fontScale,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validates whether the song model has valid required fields.
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.id || typeof this.id !== 'string') {
      errors.push('Song ID is required and must be a string.');
    }
    if (!this.title || typeof this.title !== 'string' || this.title.trim().length === 0) {
      errors.push('Song title is required.');
    }
    if (typeof this.content !== 'string') {
      errors.push('Song content must be a string.');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
