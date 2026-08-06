import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '@/i18n';
import ChordPicker from '@/components/ChordPicker';
import { useSettings, FONT_SIZES } from '@/context/SettingsContext';
import { useSongs } from '@/context/SongsContext';
import { FONT_SCALE_STEP, MIN_FONT_SCALE, getSongFontScale } from '@/utils/fontScale';
import { createSyncId } from '@/utils/syncLibrary';
import { Song } from '@/types/song';

function useUndoRedo(initialValue: string) {
  const [history, setHistory] = useState<string[]>([initialValue]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentValue = history[historyIndex];

  const pushState = useCallback((newValue: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        return [...truncated, newValue];
      });
      setHistoryIndex((prev) => prev + 1);
    }, 500);
  }, [historyIndex]);

  const pushImmediate = useCallback((newValue: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, newValue];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setHistoryIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setHistoryIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return { currentValue, pushState, pushImmediate, undo, redo, canUndo, canRedo };
}

export default function EditorScreenRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme, settings } = useSettings();
  const { getSongById, saveSong, allTags } = useSongs();
  const { t } = useTranslation();
  const router = useRouter();

  const existingSong = useMemo(() => (id ? getSongById(id) : undefined), [id, getSongById]);

  const [songId] = useState<string>(() => existingSong?.id || createSyncId('song'));
  const songIdRef = useRef<string>(songId);

  const [title, setTitle] = useState<string>(existingSong?.title || '');
  const [artist, setArtist] = useState<string>(existingSong?.artist || '');
  const [tags, setTags] = useState<string[]>((existingSong?.tags || []).map((t) => t.toLowerCase()));
  const [songFontScale, setSongFontScale] = useState<number>(() => getSongFontScale(existingSong));
  const [tagInput, setTagInput] = useState<string>('');

  const [showChordPicker, setShowChordPicker] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const textInputRef = useRef<TextInput>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseEditorSize = FONT_SIZES.Medium.editor;

  const {
    currentValue: content,
    pushState: pushContent,
    pushImmediate: pushContentImmediate,
    undo, redo, canUndo, canRedo
  } = useUndoRedo(existingSong?.content || '');

  const [liveContent, setLiveContent] = useState<string>(existingSong?.content || '');

  const suggestions = useMemo(() => {
    const input = tagInput.trim().toLowerCase();
    if (input === '') return [];
    return (allTags || []).filter((t) => t.startsWith(input) && !tags.includes(t));
  }, [allTags, tagInput, tags]);

  const persistDraft = useCallback(() => {
    const songData: Partial<Song> & { id: string } = {
      id: songIdRef.current,
      title,
      artist,
      content: liveContent,
      tags,
      fontScale: songFontScale,
    };
    saveSong(songData);
  }, [saveSong, title, artist, liveContent, tags, songFontScale]);

  const handleContentChange = (text: string) => {
    setLiveContent(text);
    pushContent(text);
  };

  const contentRef = useRef(content);
  useEffect(() => {
    if (content !== contentRef.current) {
      contentRef.current = content;
      setLiveContent(content);
    }
  }, [content]);

  useEffect(() => {
    if (settings.autoSave) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        persistDraft();
      }, 2000);
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [settings.autoSave, persistDraft]);

  const handleChordInsert = (chordString: string) => {
    const before = liveContent.substring(0, cursorPosition);
    const after = liveContent.substring(cursorPosition);
    const newContent = `${before}[${chordString}]${after}`;
    setLiveContent(newContent);
    pushContentImmediate(newContent);
    setShowChordPicker(false);
    setCursorPosition(cursorPosition + chordString.length + 2);
  };

  const handleSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    persistDraft();
  };

  const handleBackPress = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (settings.autoSave) {
      persistDraft();
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleSelectSuggestion = (suggestion: string) => {
    if (suggestion && !tags.includes(suggestion)) {
      setTags((prev) => [...prev, suggestion]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const decreaseFontSize = () => {
    setSongFontScale((prev) => Math.max(MIN_FONT_SCALE, Number((prev - FONT_SCALE_STEP).toFixed(2))));
  };

  const increaseFontSize = () => {
    setSongFontScale((prev) => Number((prev + FONT_SCALE_STEP).toFixed(2)));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.primary }]}>{t('editor.back')}</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={undo} disabled={!canUndo} style={[styles.undoRedoButton, !canUndo && styles.undoRedoDisabled]}>
            <Text style={[styles.undoRedoText, { color: canUndo ? theme.primary : theme.textSecondary + '44' }]}>↶</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={redo} disabled={!canRedo} style={[styles.undoRedoButton, !canRedo && styles.undoRedoDisabled]}>
            <Text style={[styles.undoRedoText, { color: canRedo ? theme.primary : theme.textSecondary + '44' }]}>↷</Text>
          </TouchableOpacity>

          <View style={styles.fontSizeControls}>
            <TouchableOpacity
              testID="font-size-decrease"
              style={[styles.transposeButton, { borderColor: theme.border }, songFontScale <= MIN_FONT_SCALE && styles.undoRedoDisabled]}
              onPress={decreaseFontSize}
              disabled={songFontScale <= MIN_FONT_SCALE}
            >
              <Text style={[styles.transposeButtonText, { color: songFontScale <= MIN_FONT_SCALE ? theme.textSecondary + '44' : theme.primary }]}>-A</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="font-size-increase"
              style={[styles.transposeButton, { borderColor: theme.border }]}
              onPress={increaseFontSize}
            >
              <Text style={[styles.transposeButtonText, { color: theme.primary }]}>+A</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.chordModeButton, { borderColor: theme.primary }, showChordPicker && { backgroundColor: theme.primary }]}
            onPress={() => setShowChordPicker(!showChordPicker)}
          >
            <Text style={[styles.chordModeText, { color: showChordPicker ? '#ffffff' : theme.primary }]}>
              {showChordPicker ? t('editor.chordActive') : t('editor.chord')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSave}>
            <Text style={styles.saveText}>{t('editor.save')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Meta Section */}
      <View style={[styles.metaSection, { borderBottomColor: theme.border }]}>
        <TextInput
          style={[styles.titleInput, { color: theme.textPrimary }]}
          value={title}
          onChangeText={setTitle}
          placeholder={t('editor.songTitle')}
          placeholderTextColor={theme.textSecondary}
        />
        <TextInput
          style={[styles.artistInput, { color: theme.textSecondary }]}
          value={artist}
          onChangeText={setArtist}
          placeholder={t('editor.artist')}
          placeholderTextColor={theme.textSecondary}
        />

        {/* Tags */}
        <View style={styles.tagSection}>
          <View style={styles.tagList}>
            {tags.map((tag) => (
              <TouchableOpacity key={tag} style={[styles.tagChip, { backgroundColor: theme.primary + '1A' }]} onPress={() => handleRemoveTag(tag)}>
                <Text style={[styles.tagChipText, { color: theme.primary }]}>{tag}</Text>
                <Text style={[styles.tagRemove, { color: theme.primary }]}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.tagInputField, { color: theme.textPrimary, borderColor: theme.border }]}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder={t('editor.addTag')}
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={handleAddTag}
              returnKeyType="done"
            />
            {tagInput.trim() !== '' && (
              <TouchableOpacity style={[styles.tagAddButton, { backgroundColor: theme.primary }]} onPress={handleAddTag}>
                <Text style={styles.tagAddText}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestionsList}>
              {suggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.suggestionItem, { backgroundColor: theme.primary + '08' }]}
                  onPress={() => handleSelectSuggestion(s)}
                >
                  <Text style={[styles.suggestionText, { color: theme.textPrimary }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Editor Content Area */}
      <KeyboardAvoidingView
        style={styles.contentArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={styles.editorWrapper}>
          <TextInput
            ref={textInputRef}
            style={[
              styles.editor,
              {
                color: theme.textPrimary,
                fontSize: Math.round(baseEditorSize * songFontScale),
                lineHeight: Math.round(baseEditorSize * songFontScale * 1.45),
              },
            ]}
            value={liveContent}
            onChangeText={handleContentChange}
            multiline
            textAlignVertical="top"
            placeholder={t('editor.editorPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
          />
        </View>
      </KeyboardAvoidingView>

      {showChordPicker && (
        <ChordPicker onChordSelect={handleChordInsert} onClose={() => setShowChordPicker(false)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { paddingVertical: 4, paddingRight: 12 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saveButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  saveText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  undoRedoButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  undoRedoDisabled: { opacity: 0.4 },
  undoRedoText: { fontSize: 20, fontWeight: '700' },
  fontSizeControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  transposeButton: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  transposeButtonText: { fontSize: 12, fontWeight: '700' },
  chordModeButton: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  chordModeText: { fontWeight: '700', fontSize: 12 },
  metaSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, borderBottomWidth: 1 },
  titleInput: { fontSize: 20, fontWeight: '700', marginBottom: 4, padding: 0 },
  artistInput: { fontSize: 14, fontWeight: '500', padding: 0 },
  contentArea: { flex: 1 },
  editorWrapper: { flex: 1 },
  editor: { flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', padding: 20, textAlignVertical: 'top' },
  tagSection: { marginTop: 10 },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  tagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
  tagChipText: { fontSize: 12, fontWeight: '600' },
  tagRemove: { fontSize: 14, fontWeight: '700' },
  tagInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagInputField: { flex: 1, fontSize: 13, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, height: 32 },
  tagAddButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tagAddText: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  suggestionsList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  suggestionItem: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginRight: 6, marginBottom: 6 },
  suggestionText: { fontSize: 13 },
});
