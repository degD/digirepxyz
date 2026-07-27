import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTranslation } from '@/i18n';

export interface BottomNavProps {
  activeTab?: string;
  onTabPress?: (tab: string) => void;
}

const TAB_ITEMS = [
  { key: 'library', icon: '♫', route: '/' },
  { key: 'settings', icon: '⚙', route: '/settings' },
];

export default function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
  const { theme } = useSettings();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const currentTab = activeTab || (pathname === '/settings' ? 'settings' : 'library');

  const handlePress = (item: (typeof TAB_ITEMS)[number]) => {
    if (onTabPress) {
      onTabPress(item.key);
    } else {
      if (item.route === '/') {
        router.replace('/');
      } else {
        router.push(item.route as any);
      }
    }
  };

  return (
    <View style={[styles.container, { borderTopColor: theme.border, backgroundColor: theme.background + 'F2', paddingBottom: insets.bottom + 12 }]}>
      {TAB_ITEMS.map((item) => {
        const label = t(`nav.${item.key}`);
        const isActive = currentTab === item.key;
        return (
          <TouchableOpacity key={item.key} style={styles.tab} onPress={() => handlePress(item)}>
            <Text style={[styles.icon, { color: isActive ? theme.primary : theme.textSecondary }]}>{item.icon}</Text>
            <Text style={[styles.label, { color: isActive ? theme.primary : theme.textSecondary }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { fontSize: 20 },
  label: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
});
