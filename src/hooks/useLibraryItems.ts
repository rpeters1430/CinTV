import { useEffect, useState, useCallback, useRef } from 'react';
import { useJellyfin } from '../context/JellyfinContext';
import { getItemsApi } from '../api/jellyfin';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';

const PAGE_SIZE = 50;
const FOLDER_TYPES = new Set(['CollectionFolder', 'Folder', 'UserView', 'PlaylistsFolder', 'ManualPlaylistsFolder']);

export const useLibraryItems = (libraryId: string) => {
  const { api, userId } = useJellyfin();
  const [items, setItems] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startIndexRef = useRef(0);

  const fetchPage = useCallback(async (index: number, replace: boolean) => {
    if (!api || !userId) { return; }
    try {
      const itemsApi = getItemsApi(api);
      const mediaResponse = await itemsApi.getItems({
        userId,
        parentId: libraryId,
        fields: ['PrimaryImageAspectRatio', 'SortName', 'ParentId', 'DateCreated'],
        sortBy: ['SortName'],
        sortOrder: ['Ascending'],
        recursive: true,
        mediaTypes: ['Video', 'Audio', 'Photo', 'Book'],
        excludeItemTypes: ['CollectionFolder', 'Folder', 'UserView', 'PlaylistsFolder'],
        limit: PAGE_SIZE,
        startIndex: index,
      });

      let newItems = mediaResponse.data.Items ?? [];
      let total = mediaResponse.data.TotalRecordCount ?? 0;

      if (newItems.length === 0 && index === 0) {
        const childResponse = await itemsApi.getItems({
          userId,
          parentId: libraryId,
          fields: ['PrimaryImageAspectRatio', 'SortName', 'ParentId'],
          sortBy: ['SortName'],
          sortOrder: ['Ascending'],
          recursive: false,
          limit: PAGE_SIZE,
          startIndex: 0,
        });
        newItems = childResponse.data.Items ?? [];
        total = childResponse.data.TotalRecordCount ?? 0;
        console.log('[useLibraryItems] fallback child types:', [...new Set(newItems.map(i => i.Type))], 'total:', total);
      } else {
        console.log('[useLibraryItems] media types:', [...new Set(newItems.map(i => i.Type))], 'total:', total);
      }

      const dedupedItems = newItems.filter(
        (item, itemIndex, array) => item.Id && array.findIndex(candidate => candidate.Id === item.Id) === itemIndex,
      );

      setItems(prev => replace ? dedupedItems : [...prev, ...dedupedItems]);
      setHasMore(index + dedupedItems.length < total && !dedupedItems.every(item => FOLDER_TYPES.has(item.Type ?? '') || item.IsFolder));
    } catch {
      setError('Failed to load items');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [api, userId, libraryId]);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setHasMore(true);
    setError(null);
    startIndexRef.current = 0;
    fetchPage(0, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) { return; }
    setLoadingMore(true);
    startIndexRef.current += PAGE_SIZE;
    fetchPage(startIndexRef.current, false);
  }, [loadingMore, hasMore, loading, fetchPage]);

  return { items, loading, loadingMore, hasMore, error, loadMore };
};
