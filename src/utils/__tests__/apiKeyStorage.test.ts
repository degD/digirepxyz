import * as SecureStore from 'expo-secure-store';
import { getGeminiApiKey, saveGeminiApiKey } from '../apiKeyStorage';

let mockPlatformOS: 'android' | 'web' = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('apiKeyStorage', () => {
  it('uses SecureStore rather than normal settings storage', async () => {
    const secureStore = SecureStore as unknown as {
      getItemAsync: jest.Mock;
      setItemAsync: jest.Mock;
      deleteItemAsync: jest.Mock;
    };
    secureStore.getItemAsync.mockResolvedValue('stored-key');

    await expect(getGeminiApiKey()).resolves.toBe('stored-key');
    await saveGeminiApiKey('  new-key  ');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('repertoire_gemini_api_key', 'new-key');
    await saveGeminiApiKey('');
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('repertoire_gemini_api_key');
  });

  it('persists the web key across route unmounts in session storage', async () => {
    mockPlatformOS = 'web';
    const values: Record<string, string> = {};
    (globalThis as { sessionStorage?: Storage }).sessionStorage = {
      getItem: (key: string) => values[key] || null,
      setItem: (key: string, value: string) => {
        values[key] = value;
      },
      removeItem: (key: string) => {
        delete values[key];
      },
      clear: jest.fn(),
      key: jest.fn(),
      length: 0,
    };

    await saveGeminiApiKey('web-key');
    expect(await getGeminiApiKey()).toBe('web-key');
    expect(values.repertoire_gemini_api_key_web).toBe('web-key');
    mockPlatformOS = 'android';
  });
});
