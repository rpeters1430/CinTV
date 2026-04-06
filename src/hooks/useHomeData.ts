import { useEffect, useState } from 'react';
import { useJellyfin } from '../context/JellyfinContext';
import { getUserViewsApi, getItemsApi } from '../api/jellyfin';
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

const sortByDateCreatedDesc = (items: BaseItemDto[]) =>
  [...items].sort((a, b) => {
    const aTime = a.DateCreated ? Date.parse(a.DateCreated) : 0;
    const bTime = b.DateCreated ? Date.parse(b.DateCreated) : 0;
    return bTime - aTime;
  });

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

        const viewsRes = await viewsApi.getUserViews({ userId });
        const libraryList = (viewsRes.data.Items ?? []).filter(lib => lib.Id);

        const recentResults = await Promise.all(
          libraryList.map(async lib => {
            try {
              const itemsRes = await itemsApi.getItems({
                userId,
                parentId: lib.Id!,
                recursive: true,
                fields: ['PrimaryImageAspectRatio', 'SortName', 'DateCreated', 'ParentId'],
                excludeItemTypes: ['CollectionFolder', 'Folder', 'UserView', 'PlaylistsFolder'],
                limit: 100,
                startIndex: 0,
                sortBy: ['SortName'],
                sortOrder: ['Ascending'],
              });

              const scopedItems = sortByDateCreatedDesc(
                filterPlayableItems(itemsRes.data.Items ?? []),
              ).slice(0, 20);
              console.log(
                '[useHomeData] scoped recent',
                lib.Name,
                lib.Id,
                'count=',
                scopedItems.length,
                'parentIds=',
                [...new Set(scopedItems.map(item => item.ParentId ?? 'none'))],
                'types=',
                [...new Set(scopedItems.map(item => item.Type ?? 'unknown'))],
              );
              console.log(
                'section',
                lib.Name,
                scopedItems.map(item => ({
                  name: item.Name,
                  parentId: item.ParentId,
                  type: item.Type,
                })),
              );

              return {
                libraryId: lib.Id!,
                libraryName: lib.Name!,
                items: scopedItems,
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
