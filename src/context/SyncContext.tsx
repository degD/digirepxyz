import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SyncLibrary, SyncStatus, WebDavSyncConfig, WebDavSyncSecrets } from '@/types';
import { useSongs } from '@/context/SongsContext';
import { MergeResult, mergeSnapshot, snapshotFromLibrary } from '@/utils/syncLibrary';
import { loadWebDavConfig, loadWebDavSecrets, persistWebDavConfig, persistWebDavSecrets } from '@/utils/syncStorage';
import { downloadSnapshot, getWebDavSyncUrl, uploadSnapshot } from '@/utils/webDavSync';

export interface SyncContextValue {
  config: WebDavSyncConfig | null;
  webDavPassword: string;
  isReady: boolean;
  isConfigured: boolean;
  status: SyncStatus;
  saveConfiguration: (url: string, username: string, password: string) => Promise<void>;
  syncNow: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'Synchronization failed.';
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { syncLibrary, replaceSyncLibrary, isHydrated } = useSongs();
  const [config, setConfig] = useState<WebDavSyncConfig | null>(null);
  const [secrets, setSecrets] = useState<WebDavSyncSecrets | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' });
  const libraryRef = useRef(syncLibrary);
  const syncingRef = useRef(false);

  useEffect(() => {
    libraryRef.current = syncLibrary;
  }, [syncLibrary]);

  useEffect(() => {
    Promise.all([loadWebDavConfig(), loadWebDavSecrets()])
      .then(([storedConfig, storedSecrets]) => {
        setConfig(storedConfig);
        setSecrets(storedSecrets);
      })
      .finally(() => setIsReady(true));
  }, []);

  const synchronize = useCallback(async (nextConfig: WebDavSyncConfig, nextSecrets: WebDavSyncSecrets) => {
    if (syncingRef.current) return;
    if (!libraryRef.current) return;
    syncingRef.current = true;
    setStatus({ state: 'syncing', updatedAt: Date.now() });

    try {
      getWebDavSyncUrl(nextConfig.url);
      let rejectedEtag: string | null | undefined;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const currentLibrary: SyncLibrary | null = libraryRef.current;
        if (!currentLibrary) return;
        const downloaded = await downloadSnapshot(nextConfig, nextSecrets);
        const merged: MergeResult = downloaded.snapshot
          ? mergeSnapshot(currentLibrary, downloaded.snapshot)
          : { library: currentLibrary, changed: false };
        if (merged.changed) {
          libraryRef.current = merged.library;
          replaceSyncLibrary(merged.library);
        }

        const snapshot = snapshotFromLibrary(merged.library);
        const remoteMatches = downloaded.snapshot && JSON.stringify(downloaded.snapshot.records) === JSON.stringify(snapshot.records);
        if (remoteMatches) break;
        const force = rejectedEtag !== undefined && rejectedEtag === downloaded.etag;
        const result = await uploadSnapshot(nextConfig, nextSecrets, snapshot, downloaded.etag, force);
        if (result === 'saved') break;
        rejectedEtag = downloaded.etag;
        if (attempt === 1) throw new Error('The WebDAV file changed repeatedly. Please try again.');
      }

      const savedConfig = { ...nextConfig, lastSyncedAt: Date.now() };
      setConfig(savedConfig);
      await persistWebDavConfig(savedConfig);
      setStatus({ state: 'success', updatedAt: savedConfig.lastSyncedAt });
    } catch (error) {
      setStatus({ state: 'error', message: messageFrom(error), updatedAt: Date.now() });
    } finally {
      syncingRef.current = false;
    }
  }, [replaceSyncLibrary]);

  const syncNow = useCallback(async () => {
    if (!config || !secrets) {
      setStatus({ state: 'error', message: 'Enter WebDAV details before syncing.', updatedAt: Date.now() });
      return;
    }
    await synchronize(config, secrets);
  }, [config, secrets, synchronize]);

  const saveConfiguration = useCallback(async (url: string, username: string, password: string) => {
    const nextConfig: WebDavSyncConfig = { url: url.trim(), username: username.trim(), lastSyncedAt: config?.lastSyncedAt };
    const nextPassword = password || secrets?.password || '';
    if (!nextConfig.url || !nextConfig.username || !nextPassword) {
      setStatus({ state: 'error', message: 'WebDAV URL, username, and password are required.', updatedAt: Date.now() });
      return;
    }
    try {
      getWebDavSyncUrl(nextConfig.url);
      const nextSecrets = { password: nextPassword };
      await Promise.all([persistWebDavConfig(nextConfig), persistWebDavSecrets(nextSecrets)]);
      setConfig(nextConfig);
      setSecrets(nextSecrets);
      await synchronize(nextConfig, nextSecrets);
    } catch (error) {
      setStatus({ state: 'error', message: messageFrom(error), updatedAt: Date.now() });
    }
  }, [config, secrets, synchronize]);

  const disconnect = useCallback(async () => {
    await Promise.all([persistWebDavConfig(null), persistWebDavSecrets(null)]);
    setConfig(null);
    setSecrets(null);
    setStatus({ state: 'idle' });
  }, []);

  const recordsFingerprint = syncLibrary ? JSON.stringify(syncLibrary.records) : '';
  useEffect(() => {
    if (!isHydrated || !isReady || !config || !secrets || !recordsFingerprint) return;
    const timer = setTimeout(() => {
      void synchronize(config, secrets);
    }, 1200);
    return () => clearTimeout(timer);
  }, [config, isHydrated, isReady, recordsFingerprint, secrets, synchronize]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && config && secrets) void synchronize(config, secrets);
    });
    return () => subscription.remove();
  }, [config, secrets, synchronize]);

  const value = useMemo<SyncContextValue>(() => ({
    config,
    webDavPassword: secrets?.password || '',
    isReady,
    isConfigured: Boolean(config && secrets),
    status,
    saveConfiguration,
    syncNow,
    disconnect,
  }), [config, isReady, secrets, status, saveConfiguration, syncNow, disconnect]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
}
