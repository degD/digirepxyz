import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Song } from '@/types/song';
import { SyncLibrary } from '@/types/sync';
import { INITIAL_SONGS } from '@/constants/initialSongs';
import { loadSyncLibrary, persistSyncLibrary } from '@/utils/syncStorage';
import { activeSongs, deleteSongFromLibrary, importSongsToLibrary, saveSongToLibrary, toggleFavoriteInLibrary } from '@/utils/syncLibrary';
import { getSongFontScale } from '@/utils/fontScale';

export interface SongsContextValue {
  songs: Song[];
  isHydrated: boolean;
  allTags: string[];
  saveSong: (songData: Partial<Song> & { id?: string }) => void;
  deleteSong: (id: string) => void;
  toggleFavorite: (id: string) => void;
  importSongs: (imported: Song[]) => void;
  getSongById: (id: string) => Song | undefined;
  syncLibrary: SyncLibrary | null;
  replaceSyncLibrary: (library: SyncLibrary) => void;
}

export const SongsContext = createContext<SongsContextValue | undefined>(undefined);

export function SongsProvider({ children }: { children: React.ReactNode }) {
  const [syncLibrary, setSyncLibrary] = useState<SyncLibrary | null>(null);
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    loadSyncLibrary(INITIAL_SONGS)
      .then((loaded) => {
        if (isMounted) setSyncLibrary(loaded);
      })
      .finally(() => {
        if (isMounted) setHasHydrated(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated || !syncLibrary) return;
    persistSyncLibrary(syncLibrary);
  }, [syncLibrary, hasHydrated]);

  const songs = useMemo(() => (syncLibrary ? activeSongs(syncLibrary) : []), [syncLibrary]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    songs.forEach((s) => {
      if (s.tags) s.tags.forEach((t) => set.add(t.toLowerCase()));
    });
    return Array.from(set).sort();
  }, [songs]);

  const saveSong = useCallback((songData: Partial<Song> & { id?: string }) => {
    setSyncLibrary((current) => current ? saveSongToLibrary(current, songData) : current);
  }, []);

  const deleteSong = useCallback((id: string) => {
    setSyncLibrary((current) => current ? deleteSongFromLibrary(current, id) : current);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setSyncLibrary((current) => current ? toggleFavoriteInLibrary(current, id) : current);
  }, []);

  const importSongs = useCallback((imported: Song[]) => {
    const normalized = (imported || []).map((song) => ({
      ...song,
      fontScale: getSongFontScale(song),
    }));
    if (normalized.length === 0) return;
    setSyncLibrary((current) => current ? importSongsToLibrary(current, normalized) : current);
  }, []);

  const getSongById = useCallback(
    (id: string) => songs.find((s) => s.id === id),
    [songs]
  );

  const replaceSyncLibrary = useCallback((library: SyncLibrary) => {
    setSyncLibrary(library);
  }, []);

  const value = useMemo<SongsContextValue>(
    () => ({
      songs,
      isHydrated: hasHydrated,
      allTags,
      saveSong,
      deleteSong,
      toggleFavorite,
      importSongs,
      getSongById,
      syncLibrary,
      replaceSyncLibrary,
    }),
    [songs, hasHydrated, allTags, saveSong, deleteSong, toggleFavorite, importSongs, getSongById, syncLibrary, replaceSyncLibrary]
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
