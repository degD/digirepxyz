import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import { AppState, type AppStateStatus } from 'react-native';
import { SettingsProvider } from '@/context/SettingsContext';
import SettingsScreenRoute from '../settings';
import * as apiKeyStorage from '@/utils/apiKeyStorage';
import * as documentImport from '@/utils/documentImport';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockImportSongs = jest.fn();

jest.mock('@/utils/apiKeyStorage', () => ({
  getGeminiApiKey: jest.fn(() => Promise.resolve(null)),
  saveGeminiApiKey: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/utils/documentImport', () => ({
  pickDocumentForImport: jest.fn(() => Promise.resolve({ uri: 'file://song.pdf', name: 'song.pdf' })),
  importDocumentAsSong: jest.fn(() =>
    Promise.resolve({
      sourceName: 'song.pdf',
      warnings: [],
      song: { id: 'imported', title: 'Imported PDF Song', content: '[C]Hello' },
    })
  ),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    back: jest.fn(),
  }),
  usePathname: () => '/settings',
}));

jest.mock('@/context/SongsContext', () => ({
  useSongs: () => ({
    songs: [],
    allTags: [],
    saveSong: jest.fn(),
    deleteSong: jest.fn(),
    toggleFavorite: jest.fn(),
    importSongs: mockImportSongs,
    getSongById: jest.fn(),
  }),
}));

function renderSettings() {
  return render(
    <SettingsProvider>
      <SettingsScreenRoute />
    </SettingsProvider>
  );
}

const flattenStyle = (style: any) => Object.assign({}, ...(Array.isArray(style) ? style : [style]));

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows help and chord syntax sections', async () => {
    const { getByText } = await renderSettings();

    expect(getByText('How to Use the App')).toBeTruthy();
    expect(getByText('ChordPro Syntax')).toBeTruthy();
  });

  it('labels the combined single or multiple song import action', async () => {
    const { getByText } = await renderSettings();

    expect(getByText('Import Song(s)')).toBeTruthy();
  });

  it('keeps the Gemini API key visible and saves it when the field loses focus', async () => {
    const { getByTestId } = await renderSettings();
    const input = getByTestId('gemini-api-key-input');

    expect(input.props.secureTextEntry).not.toBe(true);
    fireEvent.changeText(input, 'visible-key');
    await waitFor(() => expect(getByTestId('gemini-api-key-input').props.value).toBe('visible-key'));
    await act(async () => {
      fireEvent(input, 'blur');
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(apiKeyStorage.saveGeminiApiKey).toHaveBeenCalledWith('visible-key');
    });
  });

  it('opens export options from the library export setting', async () => {
    const { getByText, getByTestId } = await renderSettings();

    await fireEvent.press(getByText('Export Library'));

    expect(getByTestId('export-save-option')).toBeTruthy();
    expect(getByTestId('export-share-option')).toBeTruthy();
    expect(getByTestId('export-pdf-option')).toBeTruthy();
    expect(getByTestId('export-word-option')).toBeTruthy();
  });

  it('uses an in-app modal for help content', async () => {
    const { getByText } = await renderSettings();

    await fireEvent.press(getByText('How to Use the App'));

    expect(getByText('How to Use Repertoire')).toBeTruthy();
    expect(getByText('Close')).toBeTruthy();
  });

  it('centers info modal overlay', async () => {
    const { getByText, getByTestId } = await renderSettings();

    await fireEvent.press(getByText('How to Use the App'));
    const infoOverlay = getByTestId('settings-info-modal-overlay');
    const infoStyle = flattenStyle(infoOverlay.props.style);
    expect(infoStyle.justifyContent).toBe('center');
    expect(infoStyle.alignItems).toBe('center');
  });

  it('saves a Gemini key and imports one document as one song', async () => {
    const { getByTestId, getByText } = await renderSettings();
    fireEvent.changeText(getByTestId('gemini-api-key-input'), 'test-key');
    await waitFor(() => expect(getByTestId('gemini-api-key-input').props.value).toBe('test-key'));
    await act(async () => {
      fireEvent.press(getByTestId('save-gemini-api-key'));
      await Promise.resolve();
    });
    expect(apiKeyStorage.saveGeminiApiKey).toHaveBeenCalledWith('test-key');
    await act(async () => {
      fireEvent.press(getByTestId('import-document'));
      await Promise.resolve();
    });

    expect(mockImportSongs).toHaveBeenCalledWith([expect.objectContaining({ title: 'Imported PDF Song' })]);
    expect(getByText('Import Complete')).toBeTruthy();
  });

  it('shows a blocking loading screen until the document import completes', async () => {
    let finishImport: ((value: { sourceName: string; warnings: string[]; song: { id: string; title: string; content: string } }) => void) | undefined;
    (documentImport.importDocumentAsSong as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishImport = resolve;
        })
    );
    const { getByTestId, queryByTestId } = await renderSettings();

    fireEvent.changeText(getByTestId('gemini-api-key-input'), 'test-key');
    await waitFor(() => expect(getByTestId('gemini-api-key-input').props.value).toBe('test-key'));
    fireEvent.press(getByTestId('import-document'));

    await waitFor(() => expect(getByTestId('document-import-loading-modal')).toBeTruthy());
    expect(getByTestId('document-import-loading-modal').props.children.props.children[1].props.children).toBe('Importing document...');

    await act(async () => {
      finishImport?.({
        sourceName: 'song.pdf',
        warnings: [],
        song: { id: 'imported', title: 'Imported PDF Song', content: '[C]Hello' },
      });
    });
    await waitFor(() => expect(queryByTestId('document-import-loading-modal')).toBeNull());
  });

  it('aborts an active import when the app backgrounds without importing a song', async () => {
    let appStateHandler: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateHandler = listener;
      return { remove } as ReturnType<typeof AppState.addEventListener>;
    });
    (documentImport.importDocumentAsSong as jest.Mock).mockImplementationOnce(
      (_document, _apiKey, _onProgress, signal?: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('Document import interrupted.')));
        })
    );
    const importCountBefore = mockImportSongs.mock.calls.length;
    const { getByTestId, getByText, queryByTestId } = await renderSettings();

    fireEvent.changeText(getByTestId('gemini-api-key-input'), 'test-key');
    await waitFor(() => expect(getByTestId('gemini-api-key-input').props.value).toBe('test-key'));
    fireEvent.press(getByTestId('import-document'));
    await waitFor(() => expect(appStateHandler).toBeDefined());

    await act(async () => {
      appStateHandler?.('background');
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => expect(getByText('Import interrupted. Please try again.')).toBeTruthy());
    expect(mockImportSongs.mock.calls).toHaveLength(importCountBefore);
    expect(remove).toHaveBeenCalled();
    expect(queryByTestId('document-import-loading-modal')).toBeNull();
  });

  it('does not show raw document import errors in the UI', async () => {
    (documentImport.importDocumentAsSong as jest.Mock).mockRejectedValueOnce(new Error('Gemini request failed (401): invalid key'));
    const { getByTestId, getByText, queryByText } = await renderSettings();

    fireEvent.changeText(getByTestId('gemini-api-key-input'), 'test-key');
    await waitFor(() => expect(getByTestId('gemini-api-key-input').props.value).toBe('test-key'));
    await act(async () => {
      fireEvent.press(getByTestId('import-document'));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(getByText('Could not import this document. Check your API key and internet connection, then try again.')).toBeTruthy();
    });
    expect(queryByText(/Gemini request failed/)).toBeNull();
  });
});
