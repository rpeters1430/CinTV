import { useEffect, useState, useCallback, useRef } from 'react';
import { useJellyfin } from '../context/JellyfinContext';
import { getItemsApi } from '../api/jellyfin';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';

const PAGE_SIZE = 50;

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
      const response = await itemsApi.getItems({
        userId,
        parentId: libraryId,
        fields: ['PrimaryImageAspectRatio', 'SortName'],
        sortBy: ['SortName'],
        sortOrder: ['Ascending'],
        recursive: true,
        excludeItemTypes: ['CollectionFolder', 'Folder', 'UserView', 'PlaylistsFolder'],
        limit: PAGE_SIZE,
        startIndex: index,
      });
      const newItems = response.data.Items ?? [];
      const total = response.data.TotalRecordCount ?? 0;
      console.log('[useLibraryItems] types:', [...new Set(newItems.map(i => i.Type))], 'total:', total);
      setItems(prev => replace ? newItems : [...prev, ...newItems]);
      setHasMore(index + newItems.length < total);
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
