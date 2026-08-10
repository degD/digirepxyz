import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { useTranslation } from '@/i18n';

export interface TabItem {
  key: string;
  label: string;
}

export interface FilterTabsProps {
  activeTab: string;
  onTabPress: (key: string) => void;
  tabs?: (string | TabItem)[];
}

export default function FilterTabs({ activeTab, onTabPress, tabs }: FilterTabsProps) {
  const { theme } = useSettings();
  const { t } = useTranslation();
  const defaultTabs: TabItem[] = [
    { key: 'all', label: t('library.allSongs') },
    { key: 'favorites', label: t('library.favorites') },
  ];
  const items: TabItem[] = (tabs || defaultTabs).map((tab) =>
    typeof tab === 'string' ? { key: tab, label: tab } : tab
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            testID={`library-filter-${item.key}`}
            onPress={() => onTabPress(item.key)}
          style={[
            styles.tab,
            activeTab === item.key
              ? [styles.activeTab, { backgroundColor: theme.primary }]
              : { backgroundColor: theme.card },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === item.key ? '#ffffff' : theme.textSecondary },
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginBottom: 6 },
  container: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'flex-start' },
  tab: { minHeight: 36, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  activeTab: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  tabText: { fontSize: 14, fontWeight: '600' },
});
