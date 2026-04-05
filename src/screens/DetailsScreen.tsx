import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableHighlight,
  ScrollView,
  FlatList,
} from 'react-native';
import { useItemDetails } from '../hooks/useItemDetails';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import type { NavProp, RouteProps } from '../types/navigation';
import { useJellyfin } from '../context/JellyfinContext';

interface Props {
  navigation: NavProp<'Details'>;
  route: RouteProps<'Details'>;
}

const DetailsScreen = ({ route, navigation }: Props) => {
  const { itemId } = route.params;
  const { serverUrl } = useJellyfin();
  const { item, seasons, episodes, selectedSeasonId, selectSeason, loading, episodesLoading, error } = useItemDetails(itemId);
  const [focusedEpisode, setFocusedEpisode] = useState<string | null>(null);
  const [focusedSeason, setFocusedSeason] = useState<string | null>(null);

  const renderEpisode = useCallback(({ item: ep }: { item: BaseItemDto }) => {
    const epThumb = ep.Id ? `${serverUrl}/Items/${ep.Id}/Images/Primary?fillHeight=180&fillWidth=320&quality=90` : null;
    const isFocused = focusedEpisode === ep.Id;
    return (
      <TouchableHighlight
        style={[styles.episodeRow, isFocused && styles.episodeRowFocused]}
        onPress={() => navigation.navigate('Player', { itemId: ep.Id!, title: ep.Name ?? 'Episode' })}
        onFocus={() => setFocusedEpisode(ep.Id ?? null)}
        onBlur={() => setFocusedEpisode(null)}
        underlayColor="#1a1a1a"
      >
        <View style={styles.episodeInner}>
          {epThumb ? (
            <Image source={{ uri: epThumb }} style={styles.episodeThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.episodeThumb, styles.episodeThumbPlaceholder]} />
          )}
          <View style={styles.episodeText}>
            <Text style={styles.episodeTitle} numberOfLines={1}>
              {ep.IndexNumber != null ? `${ep.IndexNumber}. ` : ''}{ep.Name}
            </Text>
            {ep.Overview ? (
              <Text style={styles.episodeOverview} numberOfLines={2}>{ep.Overview}</Text>
            ) : null}
          </View>
          <Text style={styles.playArrow}>▶</Text>
        </View>
      </TouchableHighlight>
    );
  }, [serverUrl, navigation, focusedEpisode]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00a4dc" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Item not found'}</Text>
      </View>
    );
  }

  const backdropUrl = `${serverUrl}/Items/${item.Id}/Images/Backdrop/0?fillHeight=720&fillWidth=1280&quality=85`;
  const posterUrl = `${serverUrl}/Items/${item.Id}/Images/Primary?fillHeight=450&fillWidth=300&quality=90`;
  const isSeries = item.Type === 'Series';

  return (
    <View style={styles.container}>
      <Image source={{ uri: backdropUrl }} style={styles.backdrop} blurRadius={4} />
      <View style={styles.backdropOverlay} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Back button */}
        <TouchableHighlight
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          underlayColor="#333"
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableHighlight>

        {/* Hero row */}
        <View style={styles.heroRow}>
          <Image source={{ uri: posterUrl }} style={styles.poster} />
          <View style={styles.heroInfo}>
            <Text style={styles.itemTitle}>{item.Name}</Text>

            <View style={styles.metaRow}>
              {item.ProductionYear != null && (
                <Text style={styles.metaItem}>{item.ProductionYear}</Text>
              )}
              {item.OfficialRating != null && (
                <Text style={styles.metaItem}>{item.OfficialRating}</Text>
              )}
              {item.RunTimeTicks != null && (
                <Text style={styles.metaItem}>{Math.round(item.RunTimeTicks / 600_000_000)} min</Text>
              )}
              {item.CommunityRating != null && (
                <Text style={styles.metaItem}>★ {item.CommunityRating.toFixed(1)}</Text>
              )}
            </View>

            {item.Genres && item.Genres.length > 0 && (
              <Text style={styles.genres}>{item.Genres.slice(0, 4).join('  •  ')}</Text>
            )}

            {item.Overview ? (
              <Text style={styles.overview} numberOfLines={isSeries ? 4 : 6}>{item.Overview}</Text>
            ) : null}

            {/* Movie: single play button */}
            {!isSeries && (
              <TouchableHighlight
                style={styles.playButton}
                onPress={() => navigation.navigate('Player', { itemId: item.Id!, title: item.Name ?? '' })}
                underlayColor="#00c8ff"
              >
                <Text style={styles.playButtonText}>▶  Play</Text>
              </TouchableHighlight>
            )}
          </View>
        </View>

        {/* TV Series: seasons + episodes */}
        {isSeries && seasons.length > 0 && (
          <View style={styles.seasonsSection}>
            {/* Season tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonTabs}>
              {seasons.map(season => {
                const isSelected = season.Id === selectedSeasonId;
                const isFocused = focusedSeason === season.Id;
                return (
                  <TouchableHighlight
                    key={season.Id}
                    style={[
                      styles.seasonTab,
                      isSelected && styles.seasonTabSelected,
                      isFocused && styles.seasonTabFocused,
                    ]}
                    onPress={() => selectSeason(season.Id!)}
                    onFocus={() => setFocusedSeason(season.Id ?? null)}
                    onBlur={() => setFocusedSeason(null)}
                    underlayColor="#333"
                  >
                    <Text style={[styles.seasonTabText, isSelected && styles.seasonTabTextSelected]}>
                      {season.Name}
                    </Text>
                  </TouchableHighlight>
                );
              })}
            </ScrollView>

            {/* Episodes */}
            {episodesLoading ? (
              <ActivityIndicator color="#00a4dc" style={styles.episodesLoader} />
            ) : episodes.length === 0 ? (
              <Text style={styles.emptyText}>No episodes found</Text>
            ) : (
              <FlatList
                data={episodes}
                keyExtractor={ep => ep.Id!}
                renderItem={renderEpisode}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#101010',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  content: {
    padding: 40,
    paddingTop: 30,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backText: {
    color: '#00a4dc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  heroRow: {
    flexDirection: 'row',
    gap: 40,
  },
  poster: {
    width: 280,
    height: 420,
    borderRadius: 10,
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  itemTitle: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    color: '#aaa',
    fontSize: 18,
    backgroundColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  genres: {
    color: '#888',
    fontSize: 16,
    marginBottom: 16,
  },
  overview: {
    fontSize: 17,
    color: '#ddd',
    lineHeight: 26,
    marginBottom: 28,
  },
  playButton: {
    backgroundColor: '#00a4dc',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  // Series / seasons
  seasonsSection: {
    marginTop: 40,
  },
  seasonTabs: {
    marginBottom: 20,
  },
  seasonTab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#1e1e1e',
  },
  seasonTabSelected: {
    backgroundColor: '#00a4dc',
  },
  seasonTabFocused: {
    borderColor: '#fff',
  },
  seasonTabText: {
    color: '#aaa',
    fontSize: 18,
    fontWeight: '600',
  },
  seasonTabTextSelected: {
    color: '#fff',
  },
  episodesLoader: {
    marginTop: 20,
  },
  episodeRow: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#161616',
  },
  episodeRowFocused: {
    backgroundColor: '#1e2d38',
    borderWidth: 2,
    borderColor: '#00a4dc',
  },
  episodeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 16,
  },
  episodeThumb: {
    width: 160,
    height: 90,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  episodeThumbPlaceholder: {
    backgroundColor: '#2a2a2a',
  },
  episodeText: {
    flex: 1,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeOverview: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  playArrow: {
    color: '#00a4dc',
    fontSize: 20,
    paddingRight: 8,
  },
  separator: {
    height: 6,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginTop: 20,
  },
});

export default DetailsScreen;
