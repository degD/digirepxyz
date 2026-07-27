import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, ToastAndroid, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { SongsProvider, useSongs } from '@/context/SongsContext';
import { resolveAndroidBackAction } from '@/utils/backNavigation';
import '@/i18n';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function AppLayoutInner() {
  const { theme, settings } = useSettings();
  const { hasHydrated } = useSongs();
  const pathname = usePathname();
  const lastBackPressAt = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(theme.background);
    }
  }, [theme.background]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pathname !== '/') return false;

      const action = resolveAndroidBackAction({
        currentScreen: 'library',
        lastBackPressAt: lastBackPressAt.current,
      });
      lastBackPressAt.current = action.nextLastBackPressAt;
      if (action.type === 'prompt-exit') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [pathname]);

  if (!hasHydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={settings.darkMode ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="viewer/[id]" />
        <Stack.Screen name="editor" />
        <Stack.Screen name="editor/[id]" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

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
