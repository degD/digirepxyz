import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { useTranslation } from '@/i18n';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export default function SearchBar({ value, onChangeText }: SearchBarProps) {
  const { theme } = useSettings();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder={t('library.searchPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 48, paddingHorizontal: 16 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 16, fontWeight: '500' },
});
