import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import i18n from '@/i18n';
import { Settings, Theme, FontSizeCategory, FontSizeConfig, ChordColorName } from '@/types/settings';

export const THEME_BASE = {
  dark: {
    background: '#101622',
    card: '#1e293b',
    border: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    white: '#ffffff',
    statusBar: 'light-content' as const,
  },
  light: {
    background: '#f5f6f8',
    card: '#ffffff',
    border: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    white: '#ffffff',
    statusBar: 'dark-content' as const,
  },
};

export function buildTheme(isDark: boolean, accentColor: string): Theme {
  const base = isDark ? THEME_BASE.dark : THEME_BASE.light;
  return { ...base, primary: accentColor };
}

export const CHORD_COLORS: Record<ChordColorName, string> = {
  Blue: '#256af4',
  Green: '#10b981',
  Purple: '#8b5cf6',
  Red: '#ef4444',
  Orange: '#f59e0b',
  Pink: '#ec4899',
};

export const FONT_SIZES: Record<FontSizeCategory, FontSizeConfig> = {
  Small: { lyric: 13, chord: 11, editor: 13 },
  Medium: { lyric: 16, chord: 14, editor: 15 },
  Large: { lyric: 20, chord: 17, editor: 18 },
  'Extra Large': { lyric: 24, chord: 20, editor: 22 },
};

export const defaultSettings: Settings = {
  darkMode: true,
  chordColorName: 'Blue',
  autoSave: true,
  showChordDiagrams: false,
  referencePitch: 440,
  language: 'en',
};

const STORAGE_KEY = 'repertoire_settings';

export const storage = {
  async get(): Promise<Partial<Settings> | null> {
    try {
      if (Platform.OS === 'web') {
        const raw = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async set(value: Settings): Promise<void> {
    try {
      const json = JSON.stringify(value);
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, json);
        }
        return;
      }
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(STORAGE_KEY, json);
    } catch {}
  },
};

export interface SettingsContextValue {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  theme: Theme;
  chordColor: string;
  CHORD_COLORS: typeof CHORD_COLORS;
  FONT_SIZES: typeof FONT_SIZES;
}

export const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function getInitialSettings(): Settings {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...defaultSettings, ...JSON.parse(raw) };
      }
    }
  } catch {}
  return defaultSettings;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(getInitialSettings);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      storage.get().then((saved) => {
        if (saved) {
          setSettings((prev) => ({ ...prev, ...saved }));
        }
      });
    }
  }, []);

  useEffect(() => {
    if (settings && settings.language) {
      try {
        i18n.changeLanguage(settings.language);
      } catch {}
    }
  }, [settings.language]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      storage.set(next);
      return next;
    });
  }, []);

  const chordColor = CHORD_COLORS[settings.chordColorName as ChordColorName] || CHORD_COLORS.Blue;
  const theme = buildTheme(settings.darkMode, chordColor);

  const value: SettingsContextValue = {
    settings,
    updateSetting,
    theme,
    chordColor,
    CHORD_COLORS,
    FONT_SIZES,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
