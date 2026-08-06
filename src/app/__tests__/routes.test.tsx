import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SettingsProvider } from '@/context/SettingsContext';
import { SongsProvider } from '@/context/SongsContext';
import { SyncProvider } from '@/context/SyncContext';
import LibraryScreenRoute from '../index';
import SettingsScreenRoute from '../settings';
import ViewerScreenRoute from '../viewer';
import EditorScreenRoute from '../editor';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SafeAreaView: ({ children, style }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useLocalSearchParams: () => ({ id: '1' }),
}));

describe('Phase 6 Routes & Screens', () => {
  let tree: renderer.ReactTestRenderer | null = null;

  afterEach(() => {
    act(() => {
      tree?.unmount();
    });
    tree = null;
  });

  it('renders LibraryScreenRoute (index.tsx)', async () => {
    await act(async () => {
      tree = renderer.create(
        <SettingsProvider>
          <SongsProvider>
            <LibraryScreenRoute />
          </SongsProvider>
        </SettingsProvider>
      );
    });
    expect(tree!.root.findByType(LibraryScreenRoute)).toBeTruthy();
  });

  it('renders ViewerScreenRoute (viewer.tsx)', async () => {
    await act(async () => {
      tree = renderer.create(
        <SettingsProvider>
          <SongsProvider>
            <ViewerScreenRoute />
          </SongsProvider>
        </SettingsProvider>
      );
    });
    expect(tree!.root.findByType(ViewerScreenRoute)).toBeTruthy();
  });

  it('renders EditorScreenRoute (editor.tsx)', async () => {
    await act(async () => {
      tree = renderer.create(
        <SettingsProvider>
          <SongsProvider>
            <EditorScreenRoute />
          </SongsProvider>
        </SettingsProvider>
      );
    });
    expect(tree!.root.findByType(EditorScreenRoute)).toBeTruthy();
  });

  it('renders SettingsScreenRoute (settings.tsx)', async () => {
    await act(async () => {
      tree = renderer.create(
        <SettingsProvider>
          <SongsProvider>
            <SyncProvider>
              <SettingsScreenRoute />
            </SyncProvider>
          </SongsProvider>
        </SettingsProvider>
      );
    });
    expect(tree!.root.findByType(SettingsScreenRoute)).toBeTruthy();
  });
});
