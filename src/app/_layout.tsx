import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { SongsProvider } from '@/context/SongsContext';
import '@/i18n';

function AppLayoutInner() {
  const { theme, settings } = useSettings();

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(theme.background);
    }
  }, [theme.background]);

  return (
    <>
      <StatusBar style={settings.darkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'fade',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <SongsProvider>
          <AppLayoutInner />
        </SongsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
