import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/i18n';
import { useSettings, CHORD_COLORS } from '@/context/SettingsContext';
import { useSongs } from '@/context/SongsContext';
import { exportLibrary, triggerFileImport } from '@/utils/dataUtils';
import { ChordColorName } from '@/types/settings';

const LANG_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'tr', label: 'Türkçe' },
];

const LANG_LABELS: Record<string, string> = LANG_OPTIONS.reduce(
  (acc, l) => ({ ...acc, [l.code]: l.label }),
  {}
);

function SettingRow({
  icon,
  label,
  value,
  onPress,
  hasSwitch,
  switchValue,
  onToggle,
  theme,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onToggle?: (val: boolean) => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={hasSwitch && !onPress}
      activeOpacity={hasSwitch ? 1 : 0.7}
    >
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>{label}</Text>
      </View>
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onToggle}
          trackColor={{ false: theme.border, true: theme.primary + '80' }}
          thumbColor={switchValue ? theme.primary : '#ffffff'}
          {...(Platform.OS === 'web' ? { activeThumbColor: theme.primary } : {})}
        />
      ) : (
        <View style={styles.settingRight}>
          {value && <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{value}</Text>}
          <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SettingSection({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>{children}</View>
    </View>
  );
}

function PickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  theme,
}: {
  visible: boolean;
  title: string;
  options: any[];
  selectedValue: string;
  onSelect: (val: string) => void;
  onClose: () => void;
  theme: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        testID="settings-picker-modal-overlay"
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalSheet, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <View style={styles.modalHandle}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          </View>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{title}</Text>
          <ScrollView style={styles.modalScroll} bounces={false}>
            {options.map((opt) => {
              const optValue = typeof opt === 'string' ? opt : opt.code || opt.name;
              const optLabel = typeof opt === 'string' ? opt : opt.label || opt.name || opt.code;
              const isActive = optValue === selectedValue;
              return (
                <TouchableOpacity
                  key={optValue}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: theme.border },
                    isActive && { backgroundColor: theme.primary + '1A' },
                  ]}
                  onPress={() => onSelect(optValue)}
                >
                  {opt.color && typeof opt.color === 'string' && opt.color.startsWith('#') && (
                    <View style={[styles.colorDot, { backgroundColor: opt.color }]} />
                  )}
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: isActive ? theme.primary : theme.textPrimary },
                      isActive && { fontWeight: '700' },
                    ]}
                  >
                    {optLabel}
                  </Text>
                  {isActive && <Text style={[styles.modalCheck, { color: theme.primary }]}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function InfoModal({
  visible,
  title,
  message,
  onClose,
  theme,
  closeText = 'Close',
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  theme: any;
  closeText?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        testID="settings-info-modal-overlay"
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.infoSheet, { backgroundColor: theme.background, borderColor: theme.border }]}
        >
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{title}</Text>
          <ScrollView style={styles.infoBody} bounces={false}>
            <Text style={[styles.infoMessage, { color: theme.textPrimary }]}>{message}</Text>
          </ScrollView>
          <TouchableOpacity style={[styles.infoCloseButton, { backgroundColor: theme.primary }]} onPress={onClose}>
            <Text style={styles.infoCloseText}>{closeText}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function SettingsScreenRoute() {
  const { theme, settings, updateSetting } = useSettings();
  const { songs, importSongs } = useSongs();
  const { t } = useTranslation();

  const chordColorOptions = (Object.keys(CHORD_COLORS) as ChordColorName[]).map((name) => ({
    name,
    color: CHORD_COLORS[name],
    label: t('colors.' + name),
  }));

  const [activePicker, setActivePicker] = useState<'color' | 'language' | null>(null);
  const [activeInfo, setActiveInfo] = useState<'usage' | 'syntax' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const showStatus = useCallback((message: string) => {
    if (isMountedRef.current) setStatusMessage(message);
  }, []);

  const handleExport = () => {
    const res = exportLibrary(songs, (status) => {
      showStatus(status.message);
    });
    showStatus(res.message);
  };

  const handleImport = () => {
    triggerFileImport((imported) => {
        if (imported && imported.length > 0) {
          importSongs(imported);
          showStatus(t('settings.importedSuccess', { count: imported.length }));
        }
      }, (status) => showStatus(status.message));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('settings.title')}</Text>
      </View>

      {statusMessage && (
        <View style={[styles.banner, { backgroundColor: theme.primary + '1A' }]}>
          <Text style={[styles.bannerText, { color: theme.primary }]}>{statusMessage}</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Appearance */}
        <SettingSection title={t('settings.appearance')} theme={theme}>
          <SettingRow
            icon="🌙"
            label={t('settings.darkMode')}
            hasSwitch
            switchValue={settings.darkMode}
            onToggle={(val) => updateSetting('darkMode', val)}
            theme={theme}
          />
          <SettingRow
            icon="🎨"
            label={t('settings.chordColor')}
            value={t('colors.' + settings.chordColorName)}
            onPress={() => setActivePicker('color')}
            theme={theme}
          />
          <SettingRow
            icon="🎸"
            label={t('settings.chordDiagrams')}
            hasSwitch
            switchValue={settings.showChordDiagrams}
            onToggle={(val) => updateSetting('showChordDiagrams', val)}
            theme={theme}
          />
        </SettingSection>

        {/* Behavior */}
        <SettingSection title={t('settings.behavior')} theme={theme}>
          <SettingRow
            icon="💾"
            label={t('settings.autoSave')}
            hasSwitch
            switchValue={settings.autoSave}
            onToggle={(val) => updateSetting('autoSave', val)}
            theme={theme}
          />
          <SettingRow
            icon="🌐"
            label={t('settings.language')}
            value={LANG_LABELS[settings.language] || settings.language}
            onPress={() => setActivePicker('language')}
            theme={theme}
          />
        </SettingSection>

        {/* Data */}
        <SettingSection title={t('settings.data')} theme={theme}>
          <SettingRow icon="📤" label={t('settings.exportLibrary')} onPress={handleExport} theme={theme} />
          <SettingRow icon="📥" label={t('settings.importSongs')} onPress={handleImport} theme={theme} />
        </SettingSection>

        {/* Help & About */}
        <SettingSection title={t('settings.help')} theme={theme}>
          <SettingRow icon="❓" label={t('settings.howToUseLabel')} onPress={() => setActiveInfo('usage')} theme={theme} />
          <SettingRow icon="🎼" label={t('settings.chordProSyntax')} onPress={() => setActiveInfo('syntax')} theme={theme} />
        </SettingSection>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>Repertoire v1.0.0 (Expo SDK 57)</Text>
        </View>
      </ScrollView>

      {/* Pickers */}
      <PickerModal
        visible={activePicker === 'color'}
        title={t('settings.chordColor')}
        options={chordColorOptions}
        selectedValue={settings.chordColorName}
        onSelect={(val) => {
          updateSetting('chordColorName', val as ChordColorName);
          setActivePicker(null);
        }}
        onClose={() => setActivePicker(null)}
        theme={theme}
      />

      <PickerModal
        visible={activePicker === 'language'}
        title={t('settings.language')}
        options={LANG_OPTIONS}
        selectedValue={settings.language}
        onSelect={(val) => {
          updateSetting('language', val);
          setActivePicker(null);
        }}
        onClose={() => setActivePicker(null)}
        theme={theme}
      />

      {/* Info Modals */}
      <InfoModal
        visible={activeInfo === 'usage'}
        title={t('settings.howToUseTitle')}
        message={t('help.app')}
        onClose={() => setActiveInfo(null)}
        theme={theme}
        closeText={t('common.close')}
      />

      <InfoModal
        visible={activeInfo === 'syntax'}
        title={t('settings.chordProSyntax')}
        message={t('help.chordpro')}
        onClose={() => setActiveInfo(null)}
        theme={theme}
        closeText={t('common.close')}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  banner: { marginHorizontal: 16, marginVertical: 8, padding: 12, borderRadius: 8 },
  bannerText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 12, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { fontSize: 18 },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontSize: 14 },
  chevron: { fontSize: 18, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalSheet: { width: '85%', maxWidth: 360, maxHeight: '60%', borderRadius: 16, borderTopWidth: 1, padding: 16 },
  modalHandle: { alignItems: 'center', marginBottom: 8 },
  handleBar: { width: 36, height: 4, borderRadius: 2 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  modalScroll: { flexGrow: 0 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 10 },
  modalOptionText: { flex: 1, fontSize: 15 },
  modalCheck: { fontSize: 16, fontWeight: '700' },
  infoSheet: { width: '85%', maxWidth: 420, maxHeight: '70%', borderRadius: 16, borderWidth: 1, padding: 20 },
  infoBody: { marginVertical: 12 },
  infoMessage: { fontSize: 14, lineHeight: 22 },
  infoCloseButton: { paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  infoCloseText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { fontSize: 12 },
});
