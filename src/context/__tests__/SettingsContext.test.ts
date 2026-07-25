import {
  THEME_BASE,
  CHORD_COLORS,
  FONT_SIZES,
  buildTheme,
  defaultSettings,
} from '../SettingsContext';

function loadSettingsContextForPlatform(os: 'android' | 'ios' | 'web', asyncStorageMock?: any) {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: os },
  }));

  if (os !== 'web') {
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      default: asyncStorageMock,
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../SettingsContext');
}

describe('SettingsContext utilities and defaults', () => {
  it('has correct THEME_BASE colors', () => {
    expect(THEME_BASE.dark.background).toBe('#101622');
    expect(THEME_BASE.dark.card).toBe('#1e293b');
    expect(THEME_BASE.light.background).toBe('#f5f6f8');
    expect(THEME_BASE.light.card).toBe('#ffffff');
  });

  it('buildTheme correctly applies accent primary color', () => {
    const darkTheme = buildTheme(true, '#ef4444');
    expect(darkTheme.background).toBe('#101622');
    expect(darkTheme.primary).toBe('#ef4444');

    const lightTheme = buildTheme(false, '#10b981');
    expect(lightTheme.background).toBe('#f5f6f8');
    expect(lightTheme.primary).toBe('#10b981');
  });

  it('provides standard CHORD_COLORS', () => {
    expect(CHORD_COLORS.Blue).toBe('#256af4');
    expect(CHORD_COLORS.Green).toBe('#10b981');
    expect(CHORD_COLORS.Purple).toBe('#8b5cf6');
    expect(CHORD_COLORS.Red).toBe('#ef4444');
    expect(CHORD_COLORS.Orange).toBe('#f59e0b');
    expect(CHORD_COLORS.Pink).toBe('#ec4899');
  });

  it('provides standard FONT_SIZES presets', () => {
    expect(FONT_SIZES.Small).toEqual({ lyric: 13, chord: 11, editor: 13 });
    expect(FONT_SIZES.Medium).toEqual({ lyric: 16, chord: 14, editor: 15 });
    expect(FONT_SIZES.Large).toEqual({ lyric: 20, chord: 17, editor: 18 });
    expect(FONT_SIZES['Extra Large']).toEqual({ lyric: 24, chord: 20, editor: 22 });
  });

  it('provides correct defaultSettings', () => {
    expect(defaultSettings).toEqual({
      darkMode: true,
      chordColorName: 'Blue',
      autoSave: true,
      showChordDiagrams: false,
      referencePitch: 440,
      language: 'en',
    });
  });

  it('storage helper get/set operates correctly on web platform', async () => {
    let store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    };

    const { storage: webStorage, defaultSettings: defaults } = loadSettingsContextForPlatform('web');
    const customSettings = { ...defaults, darkMode: false, referencePitch: 432 };
    await webStorage.set(customSettings);
    const loaded = await webStorage.get();
    expect(loaded).toEqual(customSettings);

    delete (globalThis as any).localStorage;
  });

  it('storage helper get/set operates correctly on native platform', async () => {
    let nativeStore: Record<string, string> = {};
    const asyncStorageMock = {
      getItem: jest.fn(async (key: string) => nativeStore[key] || null),
      setItem: jest.fn(async (key: string, value: string) => {
        nativeStore[key] = value;
      }),
    };

    const { storage: nativeStorage, defaultSettings: defaults } = loadSettingsContextForPlatform(
      'android',
      asyncStorageMock
    );
    const customSettings = { ...defaults, chordColorName: 'Red', autoSave: false };
    await nativeStorage.set(customSettings);
    expect(asyncStorageMock.setItem).toHaveBeenCalledWith(
      'repertoire_settings',
      JSON.stringify(customSettings)
    );

    const loaded = await nativeStorage.get();
    expect(asyncStorageMock.getItem).toHaveBeenCalledWith('repertoire_settings');
    expect(loaded).toEqual(customSettings);
  });
});
