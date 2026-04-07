import { useEffect, useState } from 'react';
import { useJellyfin } from '../context/JellyfinContext';
import { getUserViewsApi, getItemsApi, getTvShowsApi } from '../api/jellyfin';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';

export interface RecentSection {
  libraryId: string;
  libraryName: string;
  items: BaseItemDto[];
}

const EXCLUDED_TYPES = new Set([
  'CollectionFolder',
  'Folder',
  'UserView',
  'PlaylistsFolder',
  'ManualPlaylistsFolder',
  'Season',
]);

const filterPlayableItems = (items: BaseItemDto[]) =>
  items.filter(item => item.Id && !EXCLUDED_TYPES.has(item.Type ?? ''));

export const useHomeData = () => {
  const { api, userId, serverUrl, accessToken } = useJellyfin();
  const [libraries, setLibraries] = useState<BaseItemDto[]>([]);
  const [continueWatching, setContinueWatching] = useState<BaseItemDto[]>([]);
  const [nextUp, setNextUp] = useState<BaseItemDto[]>([]);
  const [recentSections, setRecentSections] = useState<RecentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (!api || !userId || !serverUrl || !accessToken) { return; }
      try {
        const viewsApi = getUserViewsApi(api);
        const itemsApi = getItemsApi(api);
        const tvApi = getTvShowsApi(api);

        const [viewsRes, resumeRes, nextUpRes] = await Promise.all([
          viewsApi.getUserViews({ userId }),
          itemsApi.getItems({
            userId,
            filters: ['IsResumable'],
            mediaTypes: ['Video'],
            recursive: true,
            fields: ['PrimaryImageAspectRatio', 'UserData', 'SeriesInfo'],
            limit: 20,
            sortBy: ['DatePlayed'],
            sortOrder: ['Descending'],
          }),
          tvApi.getNextUp({
            userId,
            limit: 20,
            fields: ['PrimaryImageAspectRatio', 'SeriesInfo'],
          }),
        ]);

        const libraryList = (viewsRes.data.Items ?? []).filter(lib => lib.Id);

        const recentResults = await Promise.all(
          libraryList.map(async lib => {
            try {
              const params = new URLSearchParams({
                ParentId: lib.Id!,
                Recursive: 'true',
                Limit: '20',
                SortBy: 'DateCreated',
                SortOrder: 'Descending',
                Fields: 'PrimaryImageAspectRatio,DateCreated',
                IncludeItemTypes: 'Movie,Episode,Video',
              });
              const res = await fetch(
                `${serverUrl}/Users/${userId}/Items?${params.toString()}`,
                { headers: { 'X-Emby-Token': accessToken, Accept: 'application/json' } },
              );
              if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
              const data = await res.json();
              const items = filterPlayableItems(data.Items ?? []);
              return { libraryId: lib.Id!, libraryName: lib.Name!, items };
            } catch (e: any) {
              console.error('[useHomeData] recent fetch failed for', lib.Name, e?.message ?? e);
              return { libraryId: lib.Id!, libraryName: lib.Name!, items: [] as BaseItemDto[] };
            }
          }),
        );

        if (!mounted) { return; }
        setLibraries(libraryList);
        setContinueWatching(filterPlayableItems(resumeRes.data.Items ?? []));
        setNextUp(nextUpRes.data.Items ?? []);
        setRecentSections(recentResults.filter(s => s.items.length > 0));
      } catch (e: any) {
        console.error('[useHomeData] error:', e?.response?.data ?? e?.message ?? e);
        if (mounted) { setError('Failed to load home data'); }
      } finally {
        if (mounted) { setLoading(false); }
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [api, userId, serverUrl, accessToken]);

  return { libraries, continueWatching, nextUp, recentSections, loading, error };
};
