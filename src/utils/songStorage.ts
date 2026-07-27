import { Platform } from 'react-native';
import { Song } from '@/types';
import { getSongFontScale } from './fontScale';

export const SONGS_STORAGE_KEY = 'repertoire_songs';

export type SongLoadStatus = 'loaded' | 'missing' | 'error';

export interface SongLoadResult {
  status: SongLoadStatus;
  songs: Song[];
}

/**
 * Safely resolves the AsyncStorage module across native and test environments.
 */
function getAsyncStorage() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-async-storage/async-storage');
    const storage = mod?.default || mod;
    if (storage && typeof storage.setItem === 'function' && typeof storage.getItem === 'function') {
      return storage;
    }
  } catch {}
  return null;
}

/**
 * Normalizes an unparsed or raw array of song records, ensuring every song has a valid `fontScale`.
 */
function normalizeSongs(value: unknown): Song[] | null {
  if (!Array.isArray(value)) return null;

  const ids = new Set<string>();
  const songs: Song[] = [];

  for (const valueItem of value) {
    if (!valueItem || typeof valueItem !== 'object') return null;
    const item = valueItem as Record<string, unknown>;
    if (typeof item.id !== 'string' || item.id.trim() === '' || typeof item.title !== 'string' || typeof item.content !== 'string') {
      return null;
    }
    if (ids.has(item.id)) return null;
    if (item.tags !== undefined && (!Array.isArray(item.tags) || item.tags.some((tag) => typeof tag !== 'string'))) {
      return null;
    }

    const song: Song & { fontSizeName?: string } = {
      id: item.id,
      title: item.title,
      content: item.content,
      fontScale: getSongFontScale({
        fontScale: typeof item.fontScale === 'number' ? item.fontScale : undefined,
        fontSizeName: typeof item.fontSizeName === 'string' ? item.fontSizeName : undefined,
      }),
    };
    if (typeof item.artist === 'string') song.artist = item.artist;
    if (typeof item.originalKey === 'string') song.originalKey = item.originalKey;
    if (typeof item.isFavorite === 'boolean') song.isFavorite = item.isFavorite;
    if (Array.isArray(item.tags)) song.tags = item.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    if (typeof item.createdAt === 'number') song.createdAt = item.createdAt;
    if (typeof item.updatedAt === 'number') song.updatedAt = item.updatedAt;
    if (typeof item.fontSizeName === 'string') song.fontSizeName = item.fontSizeName;

    ids.add(song.id);
    songs.push(song);
  }

  return songs;
}

/**
 * Reads song list synchronously from `localStorage` on web browsers.
 */
function readWebSongs(fallbackSongs: Song[]): Song[] {
  try {
    if (typeof localStorage === 'undefined') return fallbackSongs;
    const raw = localStorage.getItem(SONGS_STORAGE_KEY);
    if (!raw) return fallbackSongs;
    return normalizeSongs(JSON.parse(raw)) || fallbackSongs;
  } catch (error) {
    console.warn('Unable to read songs from localStorage', error);
    return fallbackSongs;
  }
}

/**
 * Synchronously retrieves initial songs on Web from `localStorage`, or returns fallback array on native platforms.
 *
 * @param fallbackSongs - Default array of songs to return if storage is empty or uninitialized.
 * @returns Initial array of songs.
 */
export function getInitialSongs(fallbackSongs: Song[] = []): Song[] {
  if (Platform.OS !== 'web') return fallbackSongs;
  return readWebSongs(fallbackSongs);
}

/**
 * Asynchronously loads songs from persistent storage (`localStorage` on web, `@react-native-async-storage/async-storage` on native).
 *
 * @param fallbackSongs - Default array of songs to return if storage is empty or uninitialized.
 * @returns Promise resolving to the array of loaded songs with normalized font scales.
 */
export async function loadSongs(fallbackSongs: Song[] = []): Promise<Song[]> {
  return (await loadSongsResult(fallbackSongs)).songs;
}

export async function loadSongsResult(fallbackSongs: Song[] = []): Promise<SongLoadResult> {
  try {
    let raw: string | null | undefined;
    if (Platform.OS === 'web') {
      raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(SONGS_STORAGE_KEY);
    } else {
      const storage = getAsyncStorage();
      if (!storage) return { status: 'error', songs: fallbackSongs };
      raw = await storage.getItem(SONGS_STORAGE_KEY);
    }
    if (raw == null) return { status: 'missing', songs: fallbackSongs };

    const songs = normalizeSongs(JSON.parse(raw));
    if (songs === null) return { status: 'error', songs: fallbackSongs };
    return { status: 'loaded', songs };
  } catch (error) {
    console.warn('Unable to load songs from storage', error);
    return { status: 'error', songs: fallbackSongs };
  }
}

/**
 * Asynchronously persists the current song library to persistent storage (`localStorage` on web, `AsyncStorage` on native).
 *
 * @param songs - Array of song objects to serialize and persist.
 */
export async function persistSongs(songs: Song[]): Promise<void> {
  const json = JSON.stringify(songs);
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(SONGS_STORAGE_KEY, json);
      return;
    }
    const AsyncStorage = getAsyncStorage();
    if (AsyncStorage) {
      await AsyncStorage.setItem(SONGS_STORAGE_KEY, json);
    }
  } catch (error) {
    console.warn('Unable to persist songs', error);
  }
}
