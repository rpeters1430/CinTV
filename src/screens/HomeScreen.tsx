import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableHighlight,
} from 'react-native';
import { useJellyfin } from '../context/JellyfinContext';
import { useHomeData } from '../hooks/useHomeData';
import Poster from '../components/Poster';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import type { NavProp } from '../types/navigation';

interface Props {
  navigation: NavProp<'Home'>;
}
const HomeScreen = ({ navigation }: Props) => {
  const { serverUrl, logout } = useJellyfin();
  const { libraries, continueWatching, nextUp, recentSections, loading, error } = useHomeData();

  const renderLibrary = useCallback(({ item }: { item: BaseItemDto }) => (
    <Poster
      id={item.Id!}
      name={item.Name!}
      serverUrl={serverUrl!}
      onPress={() => navigation.navigate('Library', { libraryId: item.Id!, libraryName: item.Name! })}
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>CinTV</Text>
        <View style={styles.headerActions}>
          <TouchableHighlight
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerBtn}
            underlayColor="rgba(255,255,255,0.12)"
          >
            <Text style={styles.headerBtnText}>⚙ Settings</Text>
          </TouchableHighlight>
          <TouchableHighlight
            onPress={logout}
            style={[styles.headerBtn, styles.logoutBtn]}
            underlayColor="#ff4444"
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableHighlight>
        </View>
      </View>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  content: {
    padding: 24,
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
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerBtnText: {
    color: '#cde6f5',
    fontSize: 18,
    fontWeight: '600',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#4fc3f7',
    letterSpacing: 0.5,
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
  logoutBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.45)',
    backgroundColor: 'rgba(239,83,80,0.10)',
  },
  logoutText: {
    color: '#ef9a9a',
    fontSize: 18,
    fontWeight: '600',
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
