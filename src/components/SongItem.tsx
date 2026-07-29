import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { useTranslation } from '@/i18n';
import { Song } from '@/types/song';

export interface SongItemProps {
  song: Song;
  onPress: (song: Song) => void;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddToSetlist?: () => void;
  onExport?: (song: Song) => void;
}

export default function SongItem({
  song,
  onPress,
  onToggleFavorite,
  onDelete,
  onAddToSetlist,
  onExport,
}: SongItemProps) {
  const { theme } = useSettings();
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);

  const stopProp = (e: GestureResponderEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(song)}
      onLongPress={() => setShowActions(!showActions)}
      style={[styles.songItem, { borderBottomColor: theme.border }]}
    >
      <View style={styles.songItemLeft}>
        <View style={[styles.songIcon, { backgroundColor: theme.primary + '1A' }]}>
          <Text style={[styles.songIconText, { color: theme.primary }]}>♪</Text>
        </View>
        <View style={styles.songInfo}>
          <Text style={[styles.songTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {song.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.songArtist, { color: theme.textSecondary }]} numberOfLines={1}>
              {song.artist || 'Unknown Artist'}
            </Text>
            {song.tags && song.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {song.tags.map((tag) => (
                  <View key={tag} style={[styles.tagChip, { backgroundColor: theme.primary + '12' }]}>
                    <Text style={[styles.tagText, { color: theme.primary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {showActions && (
            <View style={styles.actionRow}>
              {onDelete && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#ef4444' + '1A' }]}
                  onPress={(e) => {
                    stopProp(e);
                    onDelete(song.id);
                  }}
                >
                  <Text style={[styles.actionText, { color: '#ef4444' }]}>🗑 Delete</Text>
                </TouchableOpacity>
              )}
              {onExport && (
                <TouchableOpacity
                  testID="song-export-action"
                  style={[styles.actionButton, { backgroundColor: theme.primary + '06' }]}
                  onPress={(e) => {
                    stopProp(e);
                    onExport(song);
                    setShowActions(false);
                  }}
                >
                  <Text style={[styles.actionText, { color: theme.primary }]}>↓ {t('library.exportSong')}</Text>
                </TouchableOpacity>
              )}
              {onAddToSetlist && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.primary + '1A' }]}
                  onPress={(e) => {
                    stopProp(e);
                    onAddToSetlist();
                    setShowActions(false);
                  }}
                >
                  <Text style={[styles.actionText, { color: theme.primary }]}>☰ Add to Setlist</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
      <View style={styles.rightSection}>
        {onToggleFavorite && (
          <TouchableOpacity
            onPress={(e) => {
              stopProp(e);
              onToggleFavorite(song.id);
            }}
            style={styles.favoriteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.favoriteIcon, { color: song.isFavorite ? '#ef4444' : theme.textSecondary + '66' }]}>
              {song.isFavorite ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        )}
        {song.originalKey ? (
          <View style={[styles.keyBadge, { backgroundColor: theme.primary + '1A', borderColor: theme.primary + '33' }]}>
            <Text style={[styles.keyBadgeText, { color: theme.primary }]}>{song.originalKey}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    minHeight: 72,
    borderBottomWidth: 1,
  },
  songItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  songIcon: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  songIconText: { fontSize: 20 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 16, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  songArtist: { fontSize: 14, fontWeight: '500' },
  tagsRow: { flexDirection: 'row', gap: 4 },
  tagChip: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  favoriteButton: { padding: 4 },
  favoriteIcon: { fontSize: 22 },
  keyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  keyBadgeText: { fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionButton: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: '600' },
});
