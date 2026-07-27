import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Song } from '@/types/song';
import { INITIAL_SONGS } from '@/constants/initialSongs';
import { getInitialSongs, loadSongsResult, persistSongs, SongLoadStatus } from '@/utils/songStorage';
import { upsertSong } from '@/utils/songState';
import { getSongFontScale } from '@/utils/fontScale';

export interface SongsContextValue {
  songs: Song[];
  hasHydrated: boolean;
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
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);
  const [loadStatus, setLoadStatus] = useState<SongLoadStatus>('missing');

  const markStorageRecovery = useCallback(() => {
    setLoadStatus((status) => status === 'error' ? 'missing' : status);
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadSongsResult(INITIAL_SONGS)
      .then((result) => {
        if (isMounted) {
          if (result.status === 'loaded') setSongs(result.songs);
          setLoadStatus(result.status);
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
    if (!hasHydrated || loadStatus === 'error') return;
    persistSongs(songs);
  }, [songs, hasHydrated, loadStatus]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    songs.forEach((s) => {
      if (s.tags) s.tags.forEach((t) => set.add(t.toLowerCase()));
    });
    return Array.from(set).sort();
  }, [songs]);

  const saveSong = useCallback((songData: Partial<Song> & { id?: string }) => {
    markStorageRecovery();
    setSongs((prev) => {
      const selected = songData.id ? prev.find((s) => s.id === songData.id) || songData : songData;
      return upsertSong(prev, selected, songData);
    });
  }, [markStorageRecovery]);

  const deleteSong = useCallback((id: string) => {
    markStorageRecovery();
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }, [markStorageRecovery]);

  const toggleFavorite = useCallback((id: string) => {
    markStorageRecovery();
    setSongs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
    );
  }, [markStorageRecovery]);

  const importSongs = useCallback((imported: Song[]) => {
    const normalized = (imported || []).map((song) => ({
      ...song,
      fontScale: getSongFontScale(song),
    }));
    if (normalized.length === 0) return;
    markStorageRecovery();
    setSongs((prev) => {
      const existingIds = new Set(prev.map((song) => song.id));
      const uniqueImported = normalized.filter((song) => {
        if (!song.id || existingIds.has(song.id)) return false;
        existingIds.add(song.id);
        return true;
      });
      return [...uniqueImported, ...prev];
    });
  }, [markStorageRecovery]);

  const getSongById = useCallback(
    (id: string) => songs.find((s) => s.id === id),
    [songs]
  );

  const value = useMemo<SongsContextValue>(
    () => ({
      songs,
      hasHydrated,
      allTags,
      saveSong,
      deleteSong,
      toggleFavorite,
      importSongs,
      getSongById,
    }),
    [songs, hasHydrated, allTags, saveSong, deleteSong, toggleFavorite, importSongs, getSongById]
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
