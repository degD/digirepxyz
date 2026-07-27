import { Song } from '@/types';

function loadSongStorageForPlatform(os: 'android' | 'ios' | 'web', asyncStorageMock?: any) {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: os },
  }));

  if (os !== 'web') {
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      default: asyncStorageMock,
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../songStorage');
}

describe('songStorage', () => {
  const fallbackSongs: Song[] = [
    { id: 'fallback', title: 'Fallback', content: '[C]Fallback', fontScale: 1 },
  ];

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it('loads songs from AsyncStorage on android and normalizes fontScale', async () => {
    const asyncStorageMock = {
      getItem: jest.fn().mockResolvedValue(
        JSON.stringify([
          { id: '1', title: 'Saved', content: '[G]Hello', fontScale: 0.3 },
          { id: '2', title: 'Legacy', content: '[Am]World', fontSizeName: 'Large' },
        ])
      ),
      setItem: jest.fn(),
    };

    const { loadSongs } = loadSongStorageForPlatform('android', asyncStorageMock);
    const songs = await loadSongs(fallbackSongs);

    expect(asyncStorageMock.getItem).toHaveBeenCalledWith('repertoire_songs');
    expect(songs).toEqual([
      { id: '1', title: 'Saved', content: '[G]Hello', fontScale: 0.5 },
      { id: '2', title: 'Legacy', content: '[Am]World', fontSizeName: 'Large', fontScale: 1.25 },
    ]);
  });

  it('persists songs to AsyncStorage on android', async () => {
    const asyncStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn().mockResolvedValue(undefined),
    };

    const { persistSongs } = loadSongStorageForPlatform('android', asyncStorageMock);
    const songs = [{ id: '1', title: 'Saved', content: '[D]Line', fontScale: 1 }];

    await persistSongs(songs);

    expect(asyncStorageMock.setItem).toHaveBeenCalledWith('repertoire_songs', JSON.stringify(songs));
  });

  it('preserves an intentionally empty stored library', async () => {
    const asyncStorageMock = {
      getItem: jest.fn().mockResolvedValue(JSON.stringify([])),
      setItem: jest.fn(),
    };
    const { loadSongsResult } = loadSongStorageForPlatform('android', asyncStorageMock);

    await expect(loadSongsResult(fallbackSongs)).resolves.toEqual({ status: 'loaded', songs: [] });
  });

  it('does not treat malformed storage as a missing library', async () => {
    const asyncStorageMock = {
      getItem: jest.fn().mockResolvedValue(JSON.stringify([{ id: 'bad', title: 1, content: 'text' }])),
      setItem: jest.fn(),
    };
    const { loadSongsResult } = loadSongStorageForPlatform('android', asyncStorageMock);

    await expect(loadSongsResult(fallbackSongs)).resolves.toEqual({ status: 'error', songs: fallbackSongs });
  });

  it('reads initial songs from localStorage on web', () => {
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue(
        JSON.stringify([{ id: 'w1', title: 'Web', content: '[F]Web', fontScale: 1.1 }])
      ),
      setItem: jest.fn(),
    };
    (globalThis as any).localStorage = localStorageMock;

    const { getInitialSongs } = loadSongStorageForPlatform('web');
    const songs = getInitialSongs(fallbackSongs);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('repertoire_songs');
    expect(songs).toEqual([{ id: 'w1', title: 'Web', content: '[F]Web', fontScale: 1.1 }]);
  });
});
