import { useEffect, useState, useCallback } from 'react';
import { useJellyfin } from '../context/JellyfinContext';
import { getUserLibraryApi, getTvShowsApi } from '../api/jellyfin';
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
    if (!item || item.Type !== 'Series' || !selectedSeasonId || !api || !userId) { return; }
    let mounted = true;
    const fetchEpisodes = async () => {
      setEpisodesLoading(true);
      try {
        const tvApi = getTvShowsApi(api);
        const res = await tvApi.getEpisodes({
          seriesId: item.Id!,
          userId,
          seasonId: selectedSeasonId,
          fields: ['Overview', 'MediaSources', 'MediaStreams'],
          sortBy: ['IndexNumber'],
          limit: 200,
        });
        const episodeItems = res.data.Items ?? [];

        const missingOverviewEpisodes = episodeItems.filter(episode => episode.Id && !episode.Overview);
        const hydratedEpisodes = missingOverviewEpisodes.length > 0
          ? await Promise.all(episodeItems.map(async episode => {
            if (!episode.Id || episode.Overview) { return episode; }

            try {
              const itemRes = await getUserLibraryApi(api).getItem({
                userId,
                itemId: episode.Id,
              });
              return {
                ...episode,
                ...itemRes.data,
              };
            } catch {
              return episode;
            }
          }))
          : episodeItems;

        if (mounted) { setEpisodes(hydratedEpisodes); }
      } catch {
        // episodes just won't show
      } finally {
        if (mounted) { setEpisodesLoading(false); }
      }
    };
    fetchEpisodes();
    return () => { mounted = false; };
  }, [api, item, userId, selectedSeasonId]);

  return { item, seasons, episodes, selectedSeasonId, selectSeason, loading, episodesLoading, error };
};
