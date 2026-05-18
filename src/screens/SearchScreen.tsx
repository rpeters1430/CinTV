import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useJellyfin } from '../context/JellyfinContext';
import { getItemsApi } from '../api/jellyfin';
import Poster from '../components/Poster';
import Sidebar from '../components/Sidebar';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import type { NavProp } from '../types/navigation';

interface Props {
  navigation: NavProp<'Search'>;
}

const SEARCH_FIELDS = [
  'PrimaryImageAspectRatio',
  'UserData',
  'SeriesInfo',
  'Overview',
  'ProductionYear',
  'CommunityRating',
];

const SearchScreen = ({ navigation }: Props) => {
  const { api, userId, serverUrl } = useJellyfin();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (text: string) => {
    if (!api || !userId || !text.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const itemsApi = getItemsApi(api);
      const response = await itemsApi.getItems({
        userId,
        searchTerm: text,
        recursive: true,
        includeItemTypes: ['Movie', 'Series', 'Episode', 'Video'],
        fields: SEARCH_FIELDS as any,
        limit: 40,
      });

      setResults(response.data.Items ?? []);
    } catch (e: any) {
      console.error('[SearchScreen] search error:', e);
      setError('Failed to fetch search results');
    } finally {
      setLoading(false);
    }
  }, [api, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const renderItem = ({ item }: { item: BaseItemDto }) => (
    <Poster
      id={item.Id!}
      name={item.Name!}
      serverUrl={serverUrl!}
      onPress={() => navigation.navigate('Details', { itemId: item.Id! })}
      width={200}
      height={300}
      imageType="Primary"
    />
  );

  return (
    <View style={styles.container}>
      <Sidebar active="Search" />

      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Search</Text>
          <TextInput
            style={styles.input}
            placeholder="Type to search movies and shows..."
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            value={query}
            onChangeText={setQuery}
            autoFocus
            selectionColor="#00a4dc"
          />
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#00a4dc" />
          </View>
        )}

        {error && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && query.trim().length > 0 && results.length === 0 && (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No results found for "{query}"</Text>
          </View>
        )}

        <FlatList
          data={results}
          keyExtractor={item => item.Id!}
          renderItem={renderItem}
          numColumns={5}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          key={`grid-${5}`} // Force re-render if columns change
        />
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
    paddingHorizontal: 40,
  },
  header: {
    marginTop: 60,
    marginBottom: 30,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 18,
    fontSize: 22,
    color: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  errorText: {
    color: '#ef5350',
    fontSize: 20,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 22,
  },
});

export default SearchScreen;
