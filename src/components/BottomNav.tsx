import React from 'react';
import type { ComponentProps } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTranslation } from '@/i18n';

export type BottomNavProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_ITEMS = [
  { key: 'index', labelKey: 'library', icon: '♫' },
  { key: 'settings', labelKey: 'settings', icon: '⚙' },
];

export default function BottomNav({ state, navigation, insets }: BottomNavProps) {
  const { theme } = useSettings();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { borderTopColor: theme.border, backgroundColor: theme.background + 'F2', paddingBottom: insets.bottom + 12 }]}>
      {state.routes.map((route, index) => {
        const item = TAB_ITEMS.find((tab) => tab.key === route.name);
        if (!item) return null;
        const label = t(`nav.${item.labelKey}`);
        const isActive = state.index === index;
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
            style={styles.tab}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isActive && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          >
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
