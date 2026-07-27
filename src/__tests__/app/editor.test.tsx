import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsProvider } from '@/context/SettingsContext';
import EditorScreenRoute from '@/app/editor';

const mockSaveSong = jest.fn();
const mockGetSongById = jest.fn();
const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    back: mockRouterBack,
  }),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), dispatch: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'test-song-1' }),
}));

jest.mock('@/context/SongsContext', () => ({
  useSongs: () => ({
    songs: [],
    allTags: ['rock', 'jazz'],
    saveSong: mockSaveSong,
    deleteSong: jest.fn(),
    toggleFavorite: jest.fn(),
    importSongs: jest.fn(),
    getSongById: mockGetSongById,
  }),
}));

const testSong = {
  id: 'test-song-1',
  title: 'Test Song',
  artist: 'Tester',
  content: '[C]Hello',
  tags: ['rock'],
  fontScale: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSongById.mockReturnValue(testSong);
});

function renderEditor() {
  return render(
    <SettingsProvider>
      <EditorScreenRoute />
    </SettingsProvider>
  );
}

describe('EditorScreen', () => {
  it('saves draft when going back with autosave enabled', async () => {
    const { getByText, getByPlaceholderText } = await renderEditor();

    await fireEvent.changeText(
      getByPlaceholderText('Start typing ChordPro lyrics...\nExample: [C]Hello [G]World'),
      '[C]Hello world'
    );
    await fireEvent.press(getByText('← Back'));

    expect(mockSaveSong).toHaveBeenCalledWith({
      id: 'test-song-1',
      title: 'Test Song',
      artist: 'Tester',
      content: '[C]Hello world',
      tags: ['rock'],
      fontScale: 1,
    });
    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('changes song font size and persists it on save', async () => {
    const { getByTestId, getByText } = await renderEditor();

    await fireEvent.press(getByTestId('font-size-increase'));
    await fireEvent.press(getByText('Save'));

    expect(mockSaveSong).toHaveBeenCalledWith({
      id: 'test-song-1',
      title: 'Test Song',
      artist: 'Tester',
      content: '[C]Hello',
      tags: ['rock'],
      fontScale: 1.1,
    });
  });

  it('does not turn an unknown edit ID into a new draft', async () => {
    mockGetSongById.mockReturnValue(undefined);
    const { getByText } = await renderEditor();

    expect(getByText('Song not found')).toBeTruthy();
    expect(mockSaveSong).not.toHaveBeenCalled();
  });
});
