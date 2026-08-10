import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import { Alert, Linking } from 'react-native';
import RootLayout from '../_layout';
import * as apiKeyStorage from '@/utils/apiKeyStorage';
import * as dataUtils from '@/utils/dataUtils';
import * as documentImport from '@/utils/documentImport';

const mockImportSongs = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({
  Stack: 'ExpoStack',
  useRouter: () => mockRouter,
}));

jest.mock('expo-status-bar', () => ({ StatusBar: 'ExpoStatusBar' }));

jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn() }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/context/SettingsContext', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSettings: () => ({ theme: { background: '#fff' }, settings: { darkMode: false } }),
}));

jest.mock('@/context/SongsContext', () => ({
  SongsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSongs: () => ({ importSongs: mockImportSongs, isHydrated: true }),
}));

jest.mock('@/context/SyncContext', () => ({
  SyncProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/utils/apiKeyStorage', () => ({ getGeminiApiKey: jest.fn() }));

jest.mock('@/utils/dataUtils', () => ({
  importSongsFromUri: jest.fn(),
  logChordProImport: jest.fn(),
}));

jest.mock('@/utils/documentImport', () => ({
  detectSupportedDocumentType: jest.fn((document: { mimeType?: string }) => {
    if (document.mimeType?.startsWith('image/')) return 'image';
    throw new Error('Unsupported document.');
  }),
  importDocumentAsSong: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: class File {
    readonly uri: string;
    readonly name: string;
    readonly type: string;
    readonly size = 3;

    constructor(uri: string) {
      this.uri = uri;
      this.name = uri.split('/').pop() || '';
      this.type = this.name.endsWith('.heic') ? 'image/heic' : 'text/plain';
    }
  },
}), { virtual: true });

describe('native image intents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof Linking.addEventListener>);
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (apiKeyStorage.getGeminiApiKey as jest.Mock).mockResolvedValue('test-key');
    (documentImport.importDocumentAsSong as jest.Mock).mockResolvedValue({
      sourceName: 'song.heic',
      warnings: [],
      song: { id: 'image-song', title: 'Image Song', content: '[C]Hello' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function renderRootLayout() {
    await act(async () => {
      render(<RootLayout />);
      await Promise.resolve();
    });
  }

  it('imports an incoming image with the saved Gemini key', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('content://provider/song.heic');

    await renderRootLayout();

    await waitFor(() => {
      expect(documentImport.importDocumentAsSong).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'song.heic', mimeType: 'image/heic' }),
        'test-key',
        undefined,
        expect.any(AbortSignal)
      );
    });
    expect(dataUtils.importSongsFromUri).not.toHaveBeenCalled();
    expect(mockImportSongs).toHaveBeenCalledWith([expect.objectContaining({ title: 'Image Song' })]);
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('shows the API-key prompt instead of uploading an image without a saved key', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('content://provider/song.heic');
    (apiKeyStorage.getGeminiApiKey as jest.Mock).mockResolvedValue(null);

    await renderRootLayout();

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(documentImport.importDocumentAsSong).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Import Failed',
      'Enter and save a Gemini API key in Settings before opening an image file.',
      expect.any(Array)
    );
  });

  it('keeps incoming ChordPro files on the existing text import path', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('content://provider/song.cho');
    (dataUtils.importSongsFromUri as jest.Mock).mockResolvedValue([
      { id: 'chordpro-song', title: 'ChordPro Song', content: '[G]Hello' },
    ]);

    await renderRootLayout();

    await waitFor(() => expect(dataUtils.importSongsFromUri).toHaveBeenCalledWith('content://provider/song.cho'));
    expect(documentImport.importDocumentAsSong).not.toHaveBeenCalled();
    expect(mockImportSongs).toHaveBeenCalledWith([expect.objectContaining({ title: 'ChordPro Song' })]);
  });
});
