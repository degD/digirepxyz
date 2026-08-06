import { Platform } from 'react-native';
import { Song, SyncLibrary, WebDavSyncConfig, WebDavSyncSecrets } from '@/types';
import { loadSongs } from '@/utils/songStorage';
import { createSyncLibrary, isSyncLibrary } from '@/utils/syncLibrary';

const SYNC_LIBRARY_STORAGE_KEY = 'repertoire_sync_library';
const SYNC_CONFIG_STORAGE_KEY = 'repertoire_webdav_config';
const SYNC_SECRETS_STORAGE_KEY = 'repertoire_webdav_secrets';
const WEB_SECRETS_STORAGE_KEY = 'repertoire_webdav_secrets_web';

function getAsyncStorage(): {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@react-native-async-storage/async-storage');
    return module?.default || module;
  } catch {
    return null;
  }
}

function getSecureStore(): {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-secure-store') as {
    getItemAsync: (key: string) => Promise<string | null>;
    setItemAsync: (key: string, value: string) => Promise<void>;
    deleteItemAsync: (key: string) => Promise<void>;
  };
}

function getWebStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function getWebSessionStorage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return getWebStorage()?.getItem(key) || null;
  return getAsyncStorage()?.getItem(key) || null;
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(key, value);
    return;
  }
  await getAsyncStorage()?.setItem(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    getWebStorage()?.removeItem(key);
    return;
  }
  await getAsyncStorage()?.removeItem(key);
}

export async function loadSyncLibrary(fallbackSongs: Song[]): Promise<SyncLibrary> {
  try {
    const raw = await getItem(SYNC_LIBRARY_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isSyncLibrary(parsed)) return parsed;
    }
  } catch (error) {
    console.warn('Unable to load sync library', error);
  }
  return createSyncLibrary(await loadSongs(fallbackSongs));
}

export async function persistSyncLibrary(library: SyncLibrary): Promise<void> {
  try {
    await setItem(SYNC_LIBRARY_STORAGE_KEY, JSON.stringify(library));
  } catch (error) {
    console.warn('Unable to persist sync library', error);
  }
}

export async function loadWebDavConfig(): Promise<WebDavSyncConfig | null> {
  try {
    const raw = await getItem(SYNC_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const config = parsed as Partial<WebDavSyncConfig>;
    return typeof config.url === 'string' && typeof config.username === 'string' ? config as WebDavSyncConfig : null;
  } catch {
    return null;
  }
}

export async function persistWebDavConfig(config: WebDavSyncConfig | null): Promise<void> {
  if (!config) return removeItem(SYNC_CONFIG_STORAGE_KEY);
  await setItem(SYNC_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export async function loadWebDavSecrets(): Promise<WebDavSyncSecrets | null> {
  try {
    const raw = Platform.OS === 'web'
      ? getWebSessionStorage()?.getItem(WEB_SECRETS_STORAGE_KEY) || null
      : await getSecureStore().getItemAsync(SYNC_SECRETS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && typeof (parsed as WebDavSyncSecrets).password === 'string'
      ? parsed as WebDavSyncSecrets
      : null;
  } catch {
    return null;
  }
}

export async function persistWebDavSecrets(secrets: WebDavSyncSecrets | null): Promise<void> {
  const value = secrets ? JSON.stringify(secrets) : null;
  if (Platform.OS === 'web') {
    if (value) getWebSessionStorage()?.setItem(WEB_SECRETS_STORAGE_KEY, value);
    else getWebSessionStorage()?.removeItem(WEB_SECRETS_STORAGE_KEY);
    return;
  }
  if (value) await getSecureStore().setItemAsync(SYNC_SECRETS_STORAGE_KEY, value);
  else await getSecureStore().deleteItemAsync(SYNC_SECRETS_STORAGE_KEY);
}
