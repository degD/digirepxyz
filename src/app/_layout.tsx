import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { SongsProvider, useSongs } from '@/context/SongsContext';
import { SyncProvider } from '@/context/SyncContext';
import { i18n } from '@/i18n';
import type { PickedDocument } from '@/types/documentImport';
import { getGeminiApiKey } from '@/utils/apiKeyStorage';
import { importSongsFromUri, logChordProImport } from '@/utils/dataUtils';
import { detectSupportedDocumentType, importDocumentAsSong } from '@/utils/documentImport';

function incomingImageDocument(uri: string): PickedDocument | null {
  // expo-file-system resolves metadata for both file:// and Android content:// URIs.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File } = require('expo-file-system') as {
    File: new (uri: string) => { uri?: string; name?: string; size?: number; type?: string };
  };
  const file = new File(uri);
  const document: PickedDocument = {
    uri: file.uri || uri,
    name: file.name || decodeURIComponent(uri.split(/[/?#]/).pop() || ''),
    mimeType: file.type || undefined,
    size: file.size,
  };

  try {
    return detectSupportedDocumentType(document) === 'image' ? document : null;
  } catch {
    return null;
  }
}

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

    logChordProImport('Starting incoming import', { incomingUrl });
    let isCurrent = true;
    let appStateSubscription: { remove: () => void } | null = null;
    let abortController: AbortController | null = null;

    const importIncomingUri = async () => {
      const imageDocument = incomingImageDocument(incomingUrl);
      if (imageDocument) {
        const apiKey = await getGeminiApiKey();
        if (!apiKey?.trim()) {
          Alert.alert(i18n.t('settings.importFailed'), i18n.t('settings.openWithApiKeyRequired'), [
            { text: i18n.t('common.cancel'), style: 'cancel' },
            { text: i18n.t('settings.title'), onPress: () => router.push('/settings') },
          ]);
          return;
        }

        abortController = new AbortController();
        appStateSubscription = AppState.addEventListener('change', (nextState) => {
          if (nextState !== 'active') abortController?.abort();
        });
        const result = await importDocumentAsSong(imageDocument, apiKey, undefined, abortController.signal);
        if (!isCurrent) return;

        importSongs([result.song]);
        processedUrls.current.add(incomingUrl);
        logChordProImport('Added image song to library', { incomingUrl, title: result.song.title });
        router.replace('/');
        Alert.alert(
          i18n.t('settings.importComplete'),
          i18n.t('settings.importedSuccess', { count: 1 })
        );
        return;
      }

      const songs = await importSongsFromUri(incomingUrl);
      if (!isCurrent) return;
      if (songs.length === 0) {
        logChordProImport('Import produced no songs', { incomingUrl });
        Alert.alert(i18n.t('settings.importFailed'), i18n.t('settings.noSongsInFile'));
        return;
      }

      importSongs(songs);
      processedUrls.current.add(incomingUrl);
      logChordProImport('Added songs to library', { incomingUrl, songCount: songs.length });
      router.replace('/');
      Alert.alert(
        i18n.t('settings.importComplete'),
        i18n.t('settings.importedSuccess', { count: songs.length })
      );
    };

    void importIncomingUri()
      .catch((error: unknown) => {
        if (!isCurrent) return;
        const message = error instanceof Error ? error.message : String(error);
        logChordProImport('Incoming import handler failed', { incomingUrl, message });
        Alert.alert(
          i18n.t('settings.importFailed'),
          abortController?.signal.aborted ? i18n.t('settings.documentImportInterrupted') : message
        );
      })
      .finally(() => {
        appStateSubscription?.remove();
        if (isCurrent) setIncomingUrl((url) => url === incomingUrl ? null : url);
      });

    return () => {
      isCurrent = false;
      abortController?.abort();
      appStateSubscription?.remove();
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
