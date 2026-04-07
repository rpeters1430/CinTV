import { useEffect, useState, useCallback, useRef } from 'react';
import { useJellyfin } from '../context/JellyfinContext';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';

const PAGE_SIZE = 50;

export const useLibraryItems = (libraryId: string) => {
  const { userId, serverUrl, accessToken } = useJellyfin();
  const [items, setItems] = useState<BaseItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startIndexRef = useRef(0);

  const fetchPage = useCallback(async (index: number, replace: boolean) => {
    if (!userId || !serverUrl || !accessToken) { return; }
    try {
      const params = new URLSearchParams({
        ParentId: libraryId,
        Recursive: 'false',
        SortBy: 'SortName',
        SortOrder: 'Ascending',
        Fields: 'PrimaryImageAspectRatio,SortName',
        Limit: String(PAGE_SIZE),
        StartIndex: String(index),
      });
      const res = await fetch(
        `${serverUrl}/Users/${userId}/Items?${params.toString()}`,
        { headers: { 'X-Emby-Token': accessToken, Accept: 'application/json' } },
      );
      if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
      const data = await res.json();
      const newItems: BaseItemDto[] = data.Items ?? [];
      const total: number = data.TotalRecordCount ?? 0;

      setItems(prev => replace ? newItems : [...prev, ...newItems]);
      setHasMore(index + newItems.length < total);
    } catch {
      setError('Failed to load items');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, serverUrl, accessToken, libraryId]);

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
