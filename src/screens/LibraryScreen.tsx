import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableHighlight,
  Dimensions,
} from 'react-native';

const COLUMNS = 5;
const SCREEN_PADDING = 20;
const CARD_MARGIN = 10; // matches Poster margin (10 each side = 20 total per card)
const { width: screenWidth } = Dimensions.get('window');
const cardWidth = Math.floor((screenWidth - SCREEN_PADDING * 2 - CARD_MARGIN * 2 * COLUMNS) / COLUMNS);
const cardHeight = Math.floor(cardWidth * 1.5);
import { useJellyfin } from '../context/JellyfinContext';
import { useLibraryItems } from '../hooks/useLibraryItems';
import Poster from '../components/Poster';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import type { NavProp, RouteProps } from '../types/navigation';

interface Props {
  navigation: NavProp<'Library'>;
  route: RouteProps<'Library'>;
}

const FOLDER_TYPES = new Set(['CollectionFolder', 'Folder', 'UserView', 'PlaylistsFolder', 'ManualPlaylistsFolder']);

const LibraryScreen = ({ route, navigation }: Props) => {
  const { libraryId, libraryName } = route.params;
  const { serverUrl } = useJellyfin();
  const { items, loading, loadingMore, error, loadMore } = useLibraryItems(libraryId);
  const flatListRef = useRef<FlatList>(null);

  const handlePress = useCallback((item: BaseItemDto) => {
    if (item.Type === 'Series') {
      navigation.navigate('Details', { itemId: item.Id! });
    } else if (FOLDER_TYPES.has(item.Type ?? '') || item.IsFolder) {
      navigation.push('Library', { libraryId: item.Id!, libraryName: item.Name! });
    } else {
      navigation.navigate('Details', { itemId: item.Id! });
    }
  }, [navigation]);

  const renderItem = useCallback(({ item, index }: { item: BaseItemDto; index: number }) => (
    <Poster
      id={item.Id!}
      name={item.Name!}
      serverUrl={serverUrl!}
      onPress={() => handlePress(item)}
      onFocusFn={() => {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }}
      width={cardWidth}
      height={cardHeight}
    />
  ), [serverUrl, handlePress]);

  const renderFooter = () => {
    if (!loadingMore) { return null; }
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#00a4dc" />
      </View>
    );
  };

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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableHighlight
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          underlayColor="#333"
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableHighlight>
        <Text style={styles.title}>{libraryName}</Text>
      </View>

      {!loading && items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No items in this library</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={items}
          numColumns={COLUMNS}
          keyExtractor={item => item.Id!}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          onScrollToIndexFailed={() => {}}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backText: {
    color: '#00a4dc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 20,
  },
});

export default LibraryScreen;
