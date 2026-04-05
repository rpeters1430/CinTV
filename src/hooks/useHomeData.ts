import { useEffect, useState } from 'react';
import { useJellyfin } from '../context/JellyfinContext';
import { getUserViewsApi, getItemsApi, getUserLibraryApi } from '../api/jellyfin';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';

export interface RecentSection {
  libraryId: string;
  libraryName: string;
  items: BaseItemDto[];
}

const FOLDER_TYPES = new Set([
  'CollectionFolder',
  'Folder',
  'UserView',
  'PlaylistsFolder',
  'ManualPlaylistsFolder',
]);

const filterPlayableItems = (items: BaseItemDto[]) =>
  items.filter(item => item.Id && !item.IsFolder && !FOLDER_TYPES.has(item.Type ?? ''));

export const useHomeData = () => {
  const { api, userId } = useJellyfin();
  const [libraries, setLibraries] = useState<BaseItemDto[]>([]);
  const [recentSections, setRecentSections] = useState<RecentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      if (!api || !userId) { return; }
      try {
        const viewsApi = getUserViewsApi(api);
        const itemsApi = getItemsApi(api);
        const userLibraryApi = getUserLibraryApi(api);

        const viewsRes = await viewsApi.getUserViews({ userId });
        const libraryList = (viewsRes.data.Items ?? []).filter(lib => lib.Id);

        const recentResults = await Promise.all(
          libraryList.map(async lib => {
            try {
              const latestRes = await userLibraryApi.getLatestMedia({
                userId,
                parentId: lib.Id!,
                fields: ['PrimaryImageAspectRatio', 'DateCreated', 'ParentId'],
                enableImages: true,
                enableUserData: true,
                imageTypeLimit: 1,
                limit: 50,
                groupItems: false,
              });

              const latestItems = filterPlayableItems(latestRes.data ?? []).slice(0, 20);
              console.log(
                '[useHomeData] latest',
                lib.Name,
                lib.Id,
                'count=',
                latestItems.length,
                'types=',
                [...new Set(latestItems.map(item => item.Type ?? 'unknown'))],
              );

              if (latestItems.length > 0) {
                return {
                  libraryId: lib.Id!,
                  libraryName: lib.Name!,
                  items: latestItems,
                };
              }

              const itemsRes = await itemsApi.getItems({
                userId,
                parentId: lib.Id!,
                recursive: true,
                enableUserData: true,
                fields: ['PrimaryImageAspectRatio', 'DateCreated', 'ParentId'],
                imageTypeLimit: 1,
                limit: 100,
                sortBy: ['DateCreated'],
                sortOrder: ['Descending'],
              });

              const fallbackItems = filterPlayableItems(itemsRes.data.Items ?? []).slice(0, 20);
              console.log(
                '[useHomeData] fallback',
                lib.Name,
                lib.Id,
                'count=',
                fallbackItems.length,
                'types=',
                [...new Set(fallbackItems.map(item => item.Type ?? 'unknown'))],
              );

              return {
                libraryId: lib.Id!,
                libraryName: lib.Name!,
                items: fallbackItems,
              };
            } catch (e: any) {
              console.error('[useHomeData] recent fetch failed for', lib.Name, e?.response?.data ?? e?.message ?? e);
              return { libraryId: lib.Id!, libraryName: lib.Name!, items: [] as BaseItemDto[] };
            }
          }),
        );

        if (!mounted) { return; }
        setLibraries(libraryList);
        setRecentSections(recentResults.filter(s => s.items.length > 0));
      } catch (e: any) {
        console.error('[useHomeData] error:', e?.response?.data ?? e?.message ?? e);
        if (mounted) { setError('Failed to load home data'); }
      } finally {
        if (mounted) { setLoading(false); }
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [api, userId]);

  return { libraries, recentSections, loading, error };
};
