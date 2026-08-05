import { Platform } from 'react-native';

const GEMINI_API_KEY_STORAGE_KEY = 'repertoire_gemini_api_key';
const WEB_STORAGE_KEY = 'repertoire_gemini_api_key_web';
let webApiKey: string | null = null;

function logApiKeyStorage(event: string, details?: Record<string, unknown>): void {
  console.log('[GeminiApiKey]', event, details || {});
}

function getWebStorage(): Storage | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}

function getSecureStore(): {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
} {
  // SecureStore is native-only. Keeping this require lazy also keeps web builds independent of native storage.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-secure-store') as {
    getItemAsync: (key: string) => Promise<string | null>;
    setItemAsync: (key: string, value: string) => Promise<void>;
    deleteItemAsync: (key: string) => Promise<void>;
  };
}

export async function getGeminiApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const stored = getWebStorage()?.getItem(WEB_STORAGE_KEY) || webApiKey;
      webApiKey = stored;
      logApiKeyStorage('Loaded web key', { present: Boolean(stored) });
      return stored;
    }
    const key = await getSecureStore().getItemAsync(GEMINI_API_KEY_STORAGE_KEY);
    logApiKeyStorage('Loaded native key', { present: Boolean(key) });
    return key;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logApiKeyStorage('Load failed', { message });
    throw error;
  }
}

export async function saveGeminiApiKey(value: string): Promise<void> {
  const key = value.trim();
  try {
    if (Platform.OS === 'web') {
      webApiKey = key || null;
      const storage = getWebStorage();
      if (key) storage?.setItem(WEB_STORAGE_KEY, key);
      else storage?.removeItem(WEB_STORAGE_KEY);
      logApiKeyStorage('Saved web key', { present: Boolean(key) });
      return;
    }

    const secureStore = getSecureStore();
    if (key) {
      await secureStore.setItemAsync(GEMINI_API_KEY_STORAGE_KEY, key);
    } else {
      await secureStore.deleteItemAsync(GEMINI_API_KEY_STORAGE_KEY);
    }
    logApiKeyStorage('Saved native key', { present: Boolean(key) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logApiKeyStorage('Save failed', { message });
    throw error;
  }
}

export const GEMINI_API_KEY_KEY = GEMINI_API_KEY_STORAGE_KEY;
