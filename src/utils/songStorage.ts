import { Platform } from 'react-native';
import { Song } from '@/types';
import { getSongFontScale } from './fontScale';

export const SONGS_STORAGE_KEY = 'repertoire_songs';

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
function normalizeSongs(value: unknown, fallbackSongs: Song[]): Song[] {
  if (!Array.isArray(value) || value.length === 0) return fallbackSongs;
  return value.map((song: Song & { fontSizeName?: string }) => ({
    ...song,
    fontScale: getSongFontScale(song),
  }));
}

/**
 * Reads song list synchronously from `localStorage` on web browsers.
 */
function readWebSongs(fallbackSongs: Song[]): Song[] {
  try {
    if (typeof localStorage === 'undefined') return fallbackSongs;
    const raw = localStorage.getItem(SONGS_STORAGE_KEY);
    if (!raw) return fallbackSongs;
    return normalizeSongs(JSON.parse(raw), fallbackSongs);
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
  if (Platform.OS === 'web') return readWebSongs(fallbackSongs);
  try {
    const AsyncStorage = getAsyncStorage();
    if (!AsyncStorage) return fallbackSongs;
    const raw = await AsyncStorage.getItem(SONGS_STORAGE_KEY);
    if (!raw) return fallbackSongs;
    return normalizeSongs(JSON.parse(raw), fallbackSongs);
  } catch (error) {
    console.warn('Unable to load songs from storage', error);
    return fallbackSongs;
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
