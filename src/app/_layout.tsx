import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { SongsProvider, useSongs } from '@/context/SongsContext';
import { SyncProvider } from '@/context/SyncContext';
import { i18n } from '@/i18n';
import { importSongsFromUri, logChordProImport } from '@/utils/dataUtils';

function AppLayoutInner() {
  const { theme, settings } = useSettings();
  const { importSongs, isHydrated } = useSongs();
  const router = useRouter();
  const [incomingUrl, setIncomingUrl] = useState<string | null>(null);
  const processedUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(theme.background);
    }
  }, [theme.background]);

  useEffect(() => {
    let isCurrent = true;
    logChordProImport('Subscribing to native file intents');

    Linking.getInitialURL()
      .then((url) => {
        logChordProImport('Initial native URL resolved', { url: url || null });
        if (isCurrent && url) setIncomingUrl(url);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logChordProImport('Failed to resolve initial native URL', { message });
      });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      logChordProImport('Foreground native URL received', { url });
      setIncomingUrl(url);
    });

    return () => {
      isCurrent = false;
      subscription.remove();
      logChordProImport('Unsubscribed from native file intents');
    };
  }, []);

  useEffect(() => {
    if (!incomingUrl) return;

    logChordProImport('Linking URL observed', { incomingUrl, isHydrated });
    if (!isHydrated) {
      logChordProImport('Deferred until song storage hydrates', { incomingUrl });
      return;
    }
    if (processedUrls.current.has(incomingUrl)) {
      logChordProImport('Ignored duplicate URI', { incomingUrl });
      return;
    }
    if (!incomingUrl.startsWith('file://') && !incomingUrl.startsWith('content://')) {
      logChordProImport('Ignored non-file URL', { incomingUrl });
      return;
    }

    processedUrls.current.add(incomingUrl);
    logChordProImport('Starting incoming import', { incomingUrl });
    let isCurrent = true;

    importSongsFromUri(incomingUrl)
      .then((songs) => {
        if (!isCurrent) return;
        if (songs.length === 0) {
          logChordProImport('Import produced no songs', { incomingUrl });
          Alert.alert(i18n.t('settings.importFailed'), i18n.t('settings.noSongsInFile'));
          return;
        }

        importSongs(songs);
        logChordProImport('Added songs to library', { incomingUrl, songCount: songs.length });
        router.replace('/');
        Alert.alert(
          i18n.t('settings.importComplete'),
          i18n.t('settings.importedSuccess', { count: songs.length })
        );
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        const message = error instanceof Error ? error.message : String(error);
        logChordProImport('Incoming import handler failed', { incomingUrl, message });
        Alert.alert(i18n.t('settings.importFailed'), message);
      });

    return () => {
      isCurrent = false;
    };
  }, [incomingUrl, importSongs, isHydrated, router]);

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
          <SyncProvider>
            <AppLayoutInner />
          </SyncProvider>
        </SongsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
