import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { Song } from '@/types/song';
import { INITIAL_SONGS } from '@/constants/initialSongs';
import { getInitialSongs, loadSongs, persistSongs } from '@/utils/songStorage';
import { upsertSong } from '@/utils/songState';
import { getSongFontScale } from '@/utils/fontScale';

export interface SongsContextValue {
  songs: Song[];
  allTags: string[];
  saveSong: (songData: Partial<Song> & { id?: string }) => void;
  deleteSong: (id: string) => void;
  toggleFavorite: (id: string) => void;
  importSongs: (imported: Song[]) => void;
  getSongById: (id: string) => Song | undefined;
}

export const SongsContext = createContext<SongsContextValue | undefined>(undefined);

export function SongsProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>(() => getInitialSongs(INITIAL_SONGS));
  const [hasHydrated, setHasHydrated] = useState<boolean>(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let isMounted = true;
    loadSongs(INITIAL_SONGS)
      .then((loaded) => {
        if (isMounted && loaded && loaded.length > 0) {
          setSongs((prev) => {
            const loadedIds = new Set(loaded.map((s) => s.id));
            const extras = prev.filter((s) => !loadedIds.has(s.id));
            return [...loaded, ...extras];
          });
        }
      })
      .finally(() => {
        if (isMounted) setHasHydrated(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    persistSongs(songs);
  }, [songs, hasHydrated]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    songs.forEach((s) => {
      if (s.tags) s.tags.forEach((t) => set.add(t.toLowerCase()));
    });
    return Array.from(set).sort();
  }, [songs]);

  const saveSong = useCallback((songData: Partial<Song> & { id?: string }) => {
    setSongs((prev) => {
      const selected = songData.id ? prev.find((s) => s.id === songData.id) || songData : songData;
      return upsertSong(prev, selected, songData);
    });
  }, []);

  const deleteSong = useCallback((id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setSongs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
    );
  }, []);

  const importSongs = useCallback((imported: Song[]) => {
    const normalized = (imported || []).map((song) => ({
      ...song,
      fontScale: getSongFontScale(song),
    }));
    if (normalized.length === 0) return;
    setSongs((prev) => [...normalized, ...prev]);
  }, []);

  const getSongById = useCallback(
    (id: string) => songs.find((s) => s.id === id),
    [songs]
  );

  const value = useMemo<SongsContextValue>(
    () => ({
      songs,
      allTags,
      saveSong,
      deleteSong,
      toggleFavorite,
      importSongs,
      getSongById,
    }),
    [songs, allTags, saveSong, deleteSong, toggleFavorite, importSongs, getSongById]
  );

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>;
}

export function useSongs(): SongsContextValue {
  const context = useContext(SongsContext);
  if (!context) {
    throw new Error('useSongs must be used within a SongsProvider');
  }
  return context;
}
