import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/i18n';
import { useSettings } from '@/context/SettingsContext';
import { useSongs } from '@/context/SongsContext';
import SongItem from '@/components/SongItem';
import SearchBar from '@/components/SearchBar';
import FilterTabs, { TabItem } from '@/components/FilterTabs';
import BottomNav from '@/components/BottomNav';
import { shareSong } from '@/utils/dataUtils';
import { Song } from '@/types/song';

export default function LibraryScreenRoute() {
  const { theme } = useSettings();
  const { songs, toggleFavorite, deleteSong } = useSongs();
  const { t } = useTranslation();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const handleFilterPress = (tabKey: string) => {
    setActiveFilter(tabKey);
  };

  const dynamicTabs = useMemo<TabItem[]>(() => {
    const tagSet = new Set<string>();
    songs.forEach((s) => {
      if (s.tags) s.tags.forEach((tg) => tagSet.add(tg));
    });
    const tagTabs = Array.from(tagSet).map((tg) => ({
      key: `tag:${tg.toLowerCase()}`,
      label: tg.charAt(0).toUpperCase() + tg.slice(1),
    }));
    return [
      { key: 'all', label: t('library.allSongs') },
      { key: 'favorites', label: t('library.favorites') },
      ...tagTabs,
    ];
  }, [songs, t]);

  const filteredSongs = useMemo(() => {
    let result = songs;
    if (activeFilter === 'favorites') {
      result = result.filter((s) => s.isFavorite);
    } else if (activeFilter !== 'all') {
      const tagLower = activeFilter.replace(/^tag:/, '');
      result = result.filter((s) => s.tags && s.tags.includes(tagLower));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.artist && s.artist.toLowerCase().includes(q)) ||
          (s.originalKey && s.originalKey.toLowerCase().includes(q))
      );
    }
    return result;
  }, [songs, searchQuery, activeFilter]);

  const handleSongPress = useCallback(
    (song: Song) => {
      router.push({ pathname: '/viewer', params: { id: song.id } });
    },
    [router]
  );

  const handleCreateSong = () => {
    router.push('/editor');
  };

  const renderItem = useCallback(
    ({ item }: { item: Song }) => (
      <SongItem
        song={item}
        onPress={handleSongPress}
        onToggleFavorite={toggleFavorite}
        onDelete={deleteSong}
        onShare={(s) => shareSong(s)}
      />
    ),
    [handleSongPress, toggleFavorite, deleteSong]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerIcon, { color: theme.primary }]}>♫</Text>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('library.title')}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.songCountBadge, { backgroundColor: theme.primary + '1A' }]}>
            <Text style={[styles.songCountText, { color: theme.primary }]}>
              {t('library.songsCount', { count: filteredSongs.length })}
            </Text>
          </View>
        </View>
      </View>

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      <View style={styles.filterTabsWrap}>
        <FilterTabs activeTab={activeFilter} onTabPress={handleFilterPress} tabs={dynamicTabs} />
      </View>

      <FlatList
        key={activeFilter}
        data={filteredSongs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={songs}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎵</Text>
            <Text style={[styles.emptyText, { color: theme.textPrimary }]}>{t('library.noSongs')}</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              {activeFilter === 'favorites' ? t('library.emptyFavorites') : t('library.emptyDefault')}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
        onPress={handleCreateSong}
        testID="create-song-fab"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <BottomNav activeTab="library" />
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { fontSize: 28 },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  songCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  songCountText: { fontSize: 12, fontWeight: '600' },
  filterTabsWrap: { zIndex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14, textAlign: 'center', marginTop: 6, paddingHorizontal: 40 },
  fab: {
    position: 'absolute',
    bottom: 72,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  fabText: { color: '#ffffff', fontSize: 28, fontWeight: '300', marginTop: -2 },
});
