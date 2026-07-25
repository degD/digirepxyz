/**
 * Database table entities matching DB schema (e.g. WatermelonDB / SQLite tables).
 */

export interface SongTableEntity {
  id: string;
  title: string;
  artist?: string | null;
  original_key?: string | null;
  content: string;
  is_favorite: boolean;
  tags?: string | null; // serialized string or JSON array
  created_at: number;
  updated_at: number;
}
