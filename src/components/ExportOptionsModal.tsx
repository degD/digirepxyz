import React from 'react';
import { Modal, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import type { ExportMethod } from '@/utils/dataUtils';

export interface ExportOptionsModalProps {
  visible: boolean;
  title: string;
  saveLabel: string;
  shareLabel: string;
  cancelLabel: string;
  onSelect: (method: ExportMethod) => void;
  onClose: () => void;
  theme: {
    background: string;
    border: string;
    primary: string;
    textPrimary: string;
  };
}

export default function ExportOptionsModal({
  visible,
  title,
  saveLabel,
  shareLabel,
  cancelLabel,
  onSelect,
  onClose,
  theme,
}: ExportOptionsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
          <TouchableOpacity
            testID="export-save-option"
            style={[styles.option, { borderColor: theme.border }]}
            onPress={() => onSelect('save')}
          >
            <Text style={[styles.optionText, { color: theme.primary }]}>{saveLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="export-share-option"
            style={[styles.option, { borderColor: theme.border }]}
            onPress={() => onSelect('share')}
          >
            <Text style={[styles.optionText, { color: theme.primary }]}>{shareLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="export-cancel-option" style={styles.cancel} onPress={onClose}>
            <Text style={[styles.cancelText, { color: theme.textPrimary }]}>{cancelLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: '85%', maxWidth: 360, borderRadius: 16, borderWidth: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  option: { borderWidth: 1, borderRadius: 8, paddingVertical: 11, marginTop: 8, alignItems: 'center' },
  optionText: { fontSize: 15, fontWeight: '700' },
  cancel: { paddingVertical: 11, marginTop: 4, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
});
