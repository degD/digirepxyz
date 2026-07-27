import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsProvider } from '@/context/SettingsContext';
import SettingsScreenRoute from '@/app/(tabs)/settings';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockImportSongs = jest.fn();

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
  it('shows help and chord syntax sections', async () => {
    const { getByText } = await renderSettings();

    expect(getByText('How to Use the App')).toBeTruthy();
    expect(getByText('ChordPro Syntax')).toBeTruthy();
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
});
