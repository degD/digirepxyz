import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { SongsProvider } from '@/context/SongsContext';
import '@/i18n';

function AppLayoutInner() {
  const { theme, settings } = useSettings();

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
