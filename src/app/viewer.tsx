import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '@/i18n';
import { useSettings } from '@/context/SettingsContext';
import { useSongs } from '@/context/SongsContext';
import BottomNav from '@/components/BottomNav';
import ChordSheet from '@/components/ChordSheet';
import { FONT_SCALE_STEP, MIN_FONT_SCALE, getSongFontScale } from '@/utils/fontScale';

export default function ViewerScreenRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useSettings();
  const { getSongById, toggleFavorite } = useSongs();
  const { t } = useTranslation();
  const router = useRouter();

  const song = useMemo(() => (id ? getSongById(id) : undefined), [id, getSongById]);

  const [transposeOffset, setTransposeOffset] = useState<number>(0);
  const [songFontScale, setSongFontScale] = useState<number>(() => getSongFontScale(song));
  const [isSplit, setIsSplit] = useState<boolean>(false);

  const [splitLeftContent, splitRightContent] = useMemo(() => {
    const lines = (song?.content || '').split('\n');
    const middle = Math.ceil(lines.length / 2);
    const left = lines.slice(0, middle).join('\n');
    const right = lines.slice(middle).join('\n');
    return [left, right];
  }, [song?.content]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleEdit = () => {
    if (song?.id) {
      router.push({ pathname: '/editor', params: { id: song.id } });
    }
  };

  const decreaseFontSize = () => {
    setSongFontScale((prev) => Math.max(MIN_FONT_SCALE, Number((prev - FONT_SCALE_STEP).toFixed(2))));
  };

  const increaseFontSize = () => {
    setSongFontScale((prev) => Number((prev + FONT_SCALE_STEP).toFixed(2)));
  };

  if (!song) {
    return (
      <SafeAreaView testID="viewer-screen" style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primary }]}>{t('editor.back')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: theme.textPrimary }]}>{t('library.songNotFound')}</Text>
        </View>
        <BottomNav activeTab="library" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID="viewer-screen" style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity testID="viewer-back" onPress={handleBack} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.primary }]}>{t('editor.back')}</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.headerActionsScroll}>
          <View style={styles.headerActions}>
            <View style={styles.readControls}>
              <TouchableOpacity
                testID="viewer-favorite"
                onPress={() => toggleFavorite(song.id)}
                style={styles.favoriteButton}
              >
                <Text style={[styles.favoriteIcon, { color: song.isFavorite ? '#ef4444' : theme.textSecondary + '66' }]}>
                  {song.isFavorite ? '♥' : '♡'}
                </Text>
              </TouchableOpacity>

              <View style={styles.transposeControls}>
                <TouchableOpacity
                  testID="viewer-split-toggle"
                  accessibilityLabel="viewer-split-toggle"
                  style={[styles.transposeButton, { borderColor: theme.border }, isSplit && { backgroundColor: theme.primary }]}
                  onPress={() => setIsSplit((prev) => !prev)}
                >
                  <Text style={[styles.transposeButtonText, { color: isSplit ? '#ffffff' : theme.primary }]}>⇆</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="viewer-transpose-down"
                  style={[styles.transposeButton, { borderColor: theme.border }]}
                  onPress={() => setTransposeOffset((prev) => prev - 1)}
                >
                  <Text style={[styles.transposeButtonText, { color: theme.primary }]}>-T</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="viewer-transpose-up"
                  style={[styles.transposeButton, { borderColor: theme.border }]}
                  onPress={() => setTransposeOffset((prev) => prev + 1)}
                >
                  <Text style={[styles.transposeButtonText, { color: theme.primary }]}>+T</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.separator, { backgroundColor: theme.border }]} />

              <View style={styles.fontSizeControls}>
                <TouchableOpacity
                  testID="viewer-font-size-decrease"
                  style={[
                    styles.transposeButton,
                    { borderColor: theme.border },
                    songFontScale <= MIN_FONT_SCALE && styles.buttonDisabled,
                  ]}
                  onPress={decreaseFontSize}
                  disabled={songFontScale <= MIN_FONT_SCALE}
                >
                  <Text
                    style={[
                      styles.transposeButtonText,
                      { color: songFontScale <= MIN_FONT_SCALE ? theme.textSecondary + '44' : theme.primary },
                    ]}
                  >
                    -A
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="viewer-font-size-increase"
                  style={[styles.transposeButton, { borderColor: theme.border }]}
                  onPress={increaseFontSize}
                >
                  <Text style={[styles.transposeButtonText, { color: theme.primary }]}>+A</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity testID="viewer-edit" style={[styles.editButton, { backgroundColor: theme.primary }]} onPress={handleEdit}>
              <Text style={styles.editText}>{t('editor.edit')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Meta Section */}
      <View style={[styles.metaSection, { borderBottomColor: theme.border }]}>
        <Text style={[styles.titleText, { color: theme.textPrimary }]}>{song.title}</Text>
        {song.artist && <Text style={[styles.artistText, { color: theme.textSecondary }]}>{song.artist}</Text>}
        {song.tags && song.tags.length > 0 && (
          <View style={styles.tagRow}>
            {song.tags.map((tag) => (
              <View key={tag} style={[styles.tagChip, { backgroundColor: theme.primary + '1A' }]}>
                <Text style={[styles.tagChipText, { color: theme.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {isSplit ? (
          <View style={styles.splitContainer}>
            <View testID="split-left" style={styles.splitPane}>
              <ChordSheet content={splitLeftContent} transpose={transposeOffset} fontScale={songFontScale} />
            </View>
            <View style={[styles.splitDivider, { backgroundColor: theme.border }]} />
            <View testID="split-right" style={styles.splitPane}>
              <ChordSheet content={splitRightContent} transpose={transposeOffset} fontScale={songFontScale} />
            </View>
          </View>
        ) : (
          <View testID="single-pane" style={styles.singlePane}>
            <ChordSheet content={song.content} transpose={transposeOffset} fontScale={songFontScale} />
          </View>
        )}
      </View>

      <BottomNav activeTab="library" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerActionsScroll: { flex: 1 },
  backButton: { paddingVertical: 4, paddingRight: 16 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  editText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  favoriteButton: { paddingHorizontal: 4 },
  favoriteIcon: { fontSize: 20 },
  readControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  transposeControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fontSizeControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  transposeButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  transposeButtonText: { fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
  separator: { width: 1, height: 28, borderRadius: 1, alignSelf: 'center' },
  metaSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1 },
  titleText: { fontSize: 22, fontWeight: '700' },
  artistText: { fontSize: 15, fontWeight: '500', marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  tagChipText: { fontSize: 12, fontWeight: '600' },
  contentArea: { flex: 1 },
  singlePane: { flex: 1 },
  splitContainer: { flex: 1, flexDirection: 'row' },
  splitPane: { flex: 1 },
  splitDivider: { width: 1, alignSelf: 'stretch' },
  notFoundContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 18, fontWeight: '600' },
});
