import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableHighlight,
  Image,
} from 'react-native';
import { useJellyfin } from '../context/JellyfinContext';
import { useHomeData } from '../hooks/useHomeData';
import Poster from '../components/Poster';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import type { NavProp } from '../types/navigation';

import Sidebar from '../components/Sidebar';

interface Props {
  navigation: NavProp<'Home'>;
}
const HomeScreen = ({ navigation }: Props) => {
  const { serverUrl, logout } = useJellyfin();
  const { libraries, continueWatching, nextUp, recentSections, loading, error } = useHomeData();
  const [focusedItem, setFocusedItem] = useState<BaseItemDto | null>(null);

  const renderLibrary = useCallback(({ item }: { item: BaseItemDto }) => (
    <Poster
      id={item.Id!}
      name={item.Name!}
      serverUrl={serverUrl!}
      onPress={() => navigation.navigate('Library', { libraryId: item.Id!, libraryName: item.Name! })}
      onFocusFn={() => setFocusedItem(item)}
      width={320}
      height={180}
      imageType="Primary"
    />
  ), [serverUrl, navigation]);

  const renderWideItem = useCallback(({ item }: { item: BaseItemDto }) => (
    <Poster
      id={item.Id!}
      name={item.Name!}
      serverUrl={serverUrl!}
      onPress={() => navigation.navigate('Details', { itemId: item.Id! })}
      onFocusFn={() => setFocusedItem(item)}
      width={280}
      height={158}
      imageType="Thumb"
    />
  ), [serverUrl, navigation]);

  const renderRecentItem = useCallback(({ item }: { item: BaseItemDto }) => {
    const isEpisode = item.Type === 'Episode';
    const subtitle = isEpisode && item.ParentIndexNumber != null && item.IndexNumber != null
      ? `S${item.ParentIndexNumber}E${item.IndexNumber}`
      : undefined;
    return (
      <Poster
        id={item.Id!}
        name={item.Name!}
        serverUrl={serverUrl!}
        onPress={() => navigation.navigate('Details', { itemId: item.Id! })}
        onFocusFn={() => setFocusedItem(item)}
        width={160}
        height={240}
        subtitle={subtitle}
        seriesName={isEpisode ? (item.SeriesName ?? undefined) : undefined}
        seriesId={isEpisode ? (item.SeriesId ?? undefined) : undefined}
      />
    );
  }, [serverUrl, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00a4dc" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const backdropUrl = focusedItem?.Id
    ? `${serverUrl}/Items/${focusedItem.Id}/Images/Backdrop/0?fillHeight=1080&fillWidth=1920&quality=85`
    : null;

  return (
    <View style={styles.container}>
      <Sidebar active="Home" />
      
      <View style={styles.mainContent}>
        {backdropUrl && (
          <Image
            source={{ uri: backdropUrl }}
            style={styles.backdrop}
            resizeMode="cover"
          />
        )}
        <View style={styles.backdropScrim} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>CinTV</Text>
          </View>

          <View style={styles.heroSection}>
            {focusedItem ? (
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {focusedItem.Name}
                </Text>
                <View style={styles.heroMeta}>
                  {focusedItem.ProductionYear && (
                    <Text style={styles.heroMetaText}>{focusedItem.ProductionYear}</Text>
                  )}
                  {focusedItem.CommunityRating && (
                    <Text style={styles.heroMetaText}>★ {focusedItem.CommunityRating.toFixed(1)}</Text>
                  )}
                  {focusedItem.OfficialRating && (
                    <Text style={styles.heroMetaText}>{focusedItem.OfficialRating}</Text>
                  )}
                </View>
                <Text style={styles.heroOverview} numberOfLines={3}>
                  {focusedItem.Overview || 'No description available.'}
                </Text>
              </View>
            ) : (
              <View style={styles.heroPlaceholder}>
                <Text style={styles.heroPlaceholderText}>Select an item to see details</Text>
              </View>
            )}
          </View>

          <View style={styles.rows}>
            {libraries.length === 0 ? (
              <Text style={styles.emptyText}>No libraries found</Text>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Libraries</Text>
                <FlatList
                  data={libraries}
                  horizontal
                  keyExtractor={item => 'lib_' + item.Id}
                  renderItem={renderLibrary}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                />
              </>
            )}

            {continueWatching.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.sectionTitle}>Continue Watching</Text>
                <FlatList
                  data={continueWatching}
                  horizontal
                  keyExtractor={item => 'resume_' + item.Id}
                  renderItem={renderWideItem}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                />
              </View>
            )}

            {nextUp.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.sectionTitle}>Next Up</Text>
                <FlatList
                  data={nextUp}
                  horizontal
                  keyExtractor={item => 'nextup_' + item.Id}
                  renderItem={renderWideItem}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                />
              </View>
            )}

            {recentSections.map(section => {
              const hasEpisodes = section.items[0]?.Type === 'Episode';
              const sectionLabel = hasEpisodes ? 'Episodes' : section.libraryName;
              return (
                <View key={section.libraryId} style={styles.recentSection}>
                  <Text style={styles.sectionTitle}>Recently Added — {sectionLabel}</Text>
                  <FlatList
                    data={section.items}
                    horizontal
                    keyExtractor={item => 'recent_' + section.libraryId + '_' + item.Id}
                    renderItem={renderRecentItem}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B0F',
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  backdropScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 11, 15, 0.65)',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1117',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#4fc3f7',
    letterSpacing: 0.5,
  },
  heroSection: {
    height: 320,
    paddingHorizontal: 50,
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroContent: {
    maxWidth: '85%',
  },
  heroTitle: {
    fontSize: 54,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  heroMetaText: {
    color: '#4fc3f7',
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroOverview: {
    fontSize: 20,
    color: '#e0f4ff',
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroPlaceholder: {
    height: 100,
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 22,
    fontStyle: 'italic',
  },
  rows: {
    paddingHorizontal: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e0f4ff',
    marginBottom: 10,
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  recentSection: {
    marginTop: 32,
  },
  listContent: {
    paddingVertical: 10,
  },
  errorText: {
    color: '#ef5350',
    fontSize: 20,
  },
  emptyText: {
    color: '#78909c',
    fontSize: 20,
    textAlign: 'center',
    marginTop: 40,
  },
});

export default HomeScreen;
