import { useEffect, useState, useCallback } from 'react';
import { useJellyfin } from '../context/JellyfinContext';
import { getUserLibraryApi, getTvShowsApi, getItemsApi } from '../api/jellyfin';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';

export const useItemDetails = (itemId: string) => {
  const { api, userId } = useJellyfin();
  const [item, setItem] = useState<BaseItemDto | null>(null);
  const [seasons, setSeasons] = useState<BaseItemDto[]>([]);
  const [episodes, setEpisodes] = useState<BaseItemDto[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      if (!api || !userId) { return; }
      try {
        const libraryApi = getUserLibraryApi(api);
        const response = await libraryApi.getItem({ userId, itemId });
        const data = response.data;
        if (!mounted) { return; }
        setItem(data);

        if (data.Type === 'Series') {
          const tvApi = getTvShowsApi(api);
          const seasonsRes = await tvApi.getSeasons({ seriesId: itemId, userId });
          if (!mounted) { return; }
          const seasonList = seasonsRes.data.Items ?? [];
          setSeasons(seasonList);
          if (seasonList.length > 0 && seasonList[0].Id) {
            setSelectedSeasonId(seasonList[0].Id);
          }
        }
      } catch {
        if (mounted) { setError('Failed to load details'); }
      } finally {
        if (mounted) { setLoading(false); }
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [api, userId, itemId]);

  const selectSeason = useCallback((seasonId: string) => {
    setSelectedSeasonId(seasonId);
  }, []);

  // Fetch episodes whenever selected season changes
  useEffect(() => {
    if (!selectedSeasonId || !api || !userId) { return; }
    let mounted = true;
    const fetchEpisodes = async () => {
      setEpisodesLoading(true);
      try {
        const itemsApi = getItemsApi(api);
        const res = await itemsApi.getItems({
          userId,
          parentId: selectedSeasonId,
          fields: ['Overview'],
          sortBy: ['IndexNumber'],
          sortOrder: ['Ascending'],
        });
        if (mounted) { setEpisodes(res.data.Items ?? []); }
      } catch {
        // episodes just won't show
      } finally {
        if (mounted) { setEpisodesLoading(false); }
      }
    };
    fetchEpisodes();
    return () => { mounted = false; };
  }, [api, userId, selectedSeasonId]);

  return { item, seasons, episodes, selectedSeasonId, selectSeason, loading, episodesLoading, error };
};
