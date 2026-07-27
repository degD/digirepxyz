import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SettingsProvider } from '@/context/SettingsContext';
import { SongsProvider } from '@/context/SongsContext';
import LibraryScreenRoute from '@/app/(tabs)/index';
import SettingsScreenRoute from '@/app/(tabs)/settings';
import ViewerScreenRoute from '@/app/viewer/[id]';
import EditorScreenRoute from '@/app/editor';

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
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), dispatch: jest.fn() }),
  useLocalSearchParams: () => ({ id: '1' }),
}));

describe('Phase 6 Routes & Screens', () => {
  it('renders LibraryScreenRoute (index.tsx)', async () => {
    let tree: renderer.ReactTestRenderer = null!;
    await act(async () => {
      tree = renderer.create(
        <SettingsProvider>
          <SongsProvider>
            <LibraryScreenRoute />
          </SongsProvider>
        </SettingsProvider>
      );
    });
    expect(tree.root.findByType(LibraryScreenRoute)).toBeTruthy();
    await act(async () => tree.unmount());
  });

  it('renders ViewerScreenRoute (viewer.tsx)', async () => {
    let tree: renderer.ReactTestRenderer = null!;
    await act(async () => {
      tree = renderer.create(
        <SettingsProvider>
          <SongsProvider>
            <ViewerScreenRoute />
          </SongsProvider>
        </SettingsProvider>
      );
    });
    expect(tree.root.findByType(ViewerScreenRoute)).toBeTruthy();
    await act(async () => tree.unmount());
  });

  it('renders EditorScreenRoute (editor.tsx)', async () => {
    let tree: renderer.ReactTestRenderer = null!;
    await act(async () => {
      tree = renderer.create(
        <SettingsProvider>
          <SongsProvider>
            <EditorScreenRoute />
          </SongsProvider>
        </SettingsProvider>
      );
    });
    expect(tree.root.findByType(EditorScreenRoute)).toBeTruthy();
    await act(async () => tree.unmount());
  });

  it('renders SettingsScreenRoute (settings.tsx)', async () => {
    let tree: renderer.ReactTestRenderer = null!;
    await act(async () => {
      tree = renderer.create(
        <SettingsProvider>
          <SongsProvider>
            <SettingsScreenRoute />
          </SongsProvider>
        </SettingsProvider>
      );
    });
    expect(tree.root.findByType(SettingsScreenRoute)).toBeTruthy();
    await act(async () => tree.unmount());
  });
});
