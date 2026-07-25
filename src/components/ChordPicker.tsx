import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSettings } from '@/context/SettingsContext';

const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const QUALITIES = ['Major', 'Minor', '7', 'maj7', 'min7', 'dim', 'sus4', 'aug', '6', 'm9'];

interface ExtensionOption {
  label: string;
  value: string;
}

const EXTENSIONS: ExtensionOption[] = [
  { label: '9th', value: 'add9' },
  { label: '11th', value: 'add11' },
  { label: '13th', value: 'add13' },
];

const QUALITY_MAP: Record<string, string> = {
  Major: '',
  Minor: 'm',
  '7': '7',
  maj7: 'maj7',
  min7: 'm7',
  dim: 'dim',
  sus4: 'sus4',
  aug: 'aug',
  '6': '6',
  m9: 'm9',
};

export interface ChordPickerProps {
  onChordSelect: (chord: string) => void;
  onClose: () => void;
}

export default function ChordPicker({ onChordSelect, onClose }: ChordPickerProps) {
  const { theme } = useSettings();
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedQuality, setSelectedQuality] = useState('Major');
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([]);

  const toggleExtension = (ext: ExtensionOption) => {
    setSelectedExtensions((prev) =>
      prev.includes(ext.value) ? prev.filter((e) => e !== ext.value) : [...prev, ext.value]
    );
  };

  const chordString = `${selectedRoot}${QUALITY_MAP[selectedQuality]}${selectedExtensions.join('')}`;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>

        <View style={[styles.chordDisplay, { borderBottomColor: theme.border }]}>
          <View>
            <Text style={[styles.selectedLabel, { color: theme.textSecondary }]}>SELECTED CHORD</Text>
            <View style={styles.chordNameRow}>
              <Text style={[styles.chordRoot, { color: theme.primary }]}>{selectedRoot}</Text>
              <Text style={[styles.chordQuality, { color: theme.textPrimary }]}>
                {QUALITY_MAP[selectedQuality]}
                {selectedExtensions.join('')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.primary }]}
            onPress={() => onChordSelect(chordString)}
          >
            <Text style={styles.applyText}>Apply</Text>
            <Text style={styles.applyCheck}>✓</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} bounces={false}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ROOT NOTE</Text>
          <View style={styles.rootGrid}>
            {ROOT_NOTES.map((note) => (
              <TouchableOpacity
                key={note}
                style={[
                  styles.rootButton,
                  {
                    backgroundColor: theme.card,
                    borderColor: selectedRoot === note ? theme.primary : theme.border,
                    borderWidth: selectedRoot === note ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedRoot(note)}
              >
                <Text style={[styles.rootText, { color: selectedRoot === note ? theme.primary : theme.textSecondary }]}>
                  {note}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>QUALITY</Text>
          <View style={styles.qualityGrid}>
            {QUALITIES.map((quality) => (
              <TouchableOpacity
                key={quality}
                style={[
                  styles.qualityButton,
                  {
                    backgroundColor: selectedQuality === quality ? theme.primary + '33' : theme.card,
                    borderColor: selectedQuality === quality ? theme.primary : theme.border,
                    borderWidth: selectedQuality === quality ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedQuality(quality)}
              >
                <Text
                  style={[
                    styles.qualityText,
                    {
                      color: selectedQuality === quality ? theme.primary : theme.textSecondary,
                      fontWeight: selectedQuality === quality ? '700' : '600',
                    },
                  ]}
                >
                  {quality}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>EXTENSIONS</Text>
          <View style={styles.extensionsRow}>
            {EXTENSIONS.map((ext) => {
              const isActive = selectedExtensions.includes(ext.value);
              return (
                <TouchableOpacity
                  key={ext.value}
                  style={[
                    styles.extensionChip,
                    {
                      backgroundColor: isActive ? theme.primary + '33' : theme.card + '80',
                      borderColor: isActive ? theme.primary : theme.border,
                      borderWidth: isActive ? 2 : 1,
                    },
                  ]}
                  onPress={() => toggleExtension(ext)}
                >
                  <Text style={[styles.extensionPlus, { color: isActive ? theme.primary : theme.textSecondary }]}>
                    {isActive ? '✓' : '+'}
                  </Text>
                  <Text
                    style={[
                      styles.extensionText,
                      { color: isActive ? theme.primary : theme.textPrimary, fontWeight: isActive ? '700' : '500' },
                    ]}
                  >
                    {ext.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <View style={[styles.bottomSpacer, { backgroundColor: theme.background }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  handleRow: { alignItems: 'center', paddingVertical: 12 },
  handle: { width: 48, height: 6, borderRadius: 3 },
  chordDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  selectedLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  chordNameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  chordRoot: { fontSize: 32, fontWeight: '900' },
  chordQuality: { fontSize: 20, fontWeight: '600' },
  applyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999 },
  applyText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  applyCheck: { color: '#ffffff', fontSize: 14 },
  scrollContent: { paddingBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    opacity: 0.6,
  },
  rootGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  rootButton: { width: '22%', height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  rootText: { fontWeight: '700', fontSize: 18 },
  qualityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  qualityButton: { height: 40, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 9999 },
  qualityText: { fontSize: 14 },
  extensionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  extensionChip: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 16, borderRadius: 12, gap: 8 },
  extensionPlus: { fontSize: 18 },
  extensionText: { fontSize: 14 },
  bottomSpacer: { height: 32 },
});
