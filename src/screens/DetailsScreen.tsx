import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableHighlight,
  ScrollView,
  FlatList,
} from 'react-native';
import { useItemDetails } from '../hooks/useItemDetails';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';
import type { NavProp, RouteProps } from '../types/navigation';
import { useJellyfin } from '../context/JellyfinContext';

interface Props {
  navigation: NavProp<'Details'>;
  route: RouteProps<'Details'>;
}

const formatRuntime = (ticks?: number | null) => {
  if (!ticks) { return null; }
  const mins = Math.round(ticks / 600_000_000);
  if (mins < 60) { return `${mins}m`; }
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const formatEpisodeLabel = (episode?: BaseItemDto | null) => {
  if (!episode) { return null; }
  const season = episode.ParentIndexNumber;
  const number = episode.IndexNumber;

  if (season != null && number != null) {
    return `S${season} E${number}`;
  }

  if (number != null) {
    return `Episode ${number}`;
  }

  return null;
};

const getSeasonCountLabel = (count: number) => `${count} ${count === 1 ? 'Season' : 'Seasons'}`;
const getEpisodeCountLabel = (count: number) => `${count} ${count === 1 ? 'Episode' : 'Episodes'}`;

const formatAirDate = (value?: string | null) => {
  if (!value) { return null; }
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const formatEpisodeRating = (rating?: number | null) => {
  if (rating == null) { return null; }
  return `★ ${rating.toFixed(1)}`;
};

const getEpisodeQuality = (episode: BaseItemDto) => {
  const primarySource = episode.MediaSources?.[0];
  const streams = primarySource?.MediaStreams ?? episode.MediaStreams ?? [];
  const videoStream = streams.find(stream => stream.Type === 'Video');

  const height = videoStream?.Height ?? null;
  const codec = videoStream?.Codec?.toUpperCase() ?? null;
  const range = videoStream?.VideoRangeType ?? videoStream?.VideoRange ?? null;

  let resolution: string | null = null;

  if (height != null) {
    if (height >= 2160) { resolution = '4K'; }
    else if (height >= 1440) { resolution = '1440p'; }
    else if (height >= 1080) { resolution = '1080p'; }
    else if (height >= 720) { resolution = '720p'; }
    else if (height >= 480) { resolution = '480p'; }
    else { resolution = `${height}p`; }
  }

  const parts = [resolution, codec, range].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : null;
};

const getHeroSummaryLabel = (item: BaseItemDto) => {
  if (item.Studios?.length) { return 'Network'; }
  if (item.Taglines?.length) { return 'Tagline'; }
  return 'Details';
};

const getDisplayTitle = (item: BaseItemDto) => {
  const name = item.Name ?? '';
  const year = item.ProductionYear;

  if (!year) { return name; }

  const suffix = ` (${year})`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
};

const ActionButton = ({
  label,
  emphasis = 'secondary',
  onPress,
}: {
  label: string;
  emphasis?: 'primary' | 'secondary';
  onPress: () => void;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isPrimary = emphasis === 'primary';

  return (
    <TouchableHighlight
      style={[
        styles.actionButton,
        isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary,
        isFocused && styles.actionButtonFocused,
      ]}
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      underlayColor={isPrimary ? '#42d9ff' : 'rgba(255,255,255,0.16)'}
    >
      <Text
        style={[
          styles.actionButtonText,
          isPrimary ? styles.actionButtonTextPrimary : styles.actionButtonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </TouchableHighlight>
  );
};

const EpisodeSeparator = () => <View style={styles.episodeSpacer} />;

const DetailsScreen = ({ route, navigation }: Props) => {
  const { itemId } = route.params;
  const { serverUrl } = useJellyfin();
  const { item, seasons, episodes, selectedSeasonId, selectSeason, loading, episodesLoading, error } = useItemDetails(itemId);
  const [focusedEpisode, setFocusedEpisode] = useState<string | null>(null);
  const [focusedSeason, setFocusedSeason] = useState<string | null>(null);

  const openEpisode = useCallback((episode: BaseItemDto) => {
    if (!episode.Id) { return; }
    navigation.navigate('Player', {
      itemId: episode.Id,
      title: episode.Name ?? 'Episode',
    });
  }, [navigation]);

  const renderEpisode = useCallback(({ item: ep }: { item: BaseItemDto }) => {
    const isFocused = focusedEpisode === ep.Id;
    const thumbUrl = ep.Id
      ? `${serverUrl}/Items/${ep.Id}/Images/Thumb?fillHeight=180&fillWidth=320&quality=90`
      : null;
    const fallbackUrl = ep.Id
      ? `${serverUrl}/Items/${ep.Id}/Images/Primary?fillHeight=180&fillWidth=320&quality=90`
      : null;
    const runtime = formatRuntime(ep.RunTimeTicks);
    const episodeLabel = formatEpisodeLabel(ep);
    const airDate = formatAirDate(ep.PremiereDate);
    const rating = formatEpisodeRating(ep.CommunityRating);
    const quality = getEpisodeQuality(ep);
    const metadata = [airDate, rating, runtime, quality].filter(Boolean);

    return (
      <TouchableHighlight
        style={[styles.episodeRow, isFocused && styles.episodeRowFocused]}
        onPress={() => openEpisode(ep)}
        onFocus={() => setFocusedEpisode(ep.Id ?? null)}
        onBlur={() => setFocusedEpisode(null)}
        underlayColor="transparent"
      >
        <View style={styles.episodeInner}>
          <EpisodeThumb thumbUrl={thumbUrl} fallbackUrl={fallbackUrl} epNumber={ep.IndexNumber} />
          <View style={styles.episodeText}>
            <View style={styles.episodeTitleRow}>
              {episodeLabel ? <Text style={styles.episodeKicker}>{episodeLabel}</Text> : null}
            </View>
            <Text style={[styles.episodeTitle, isFocused && styles.episodeTitleFocused]} numberOfLines={1}>
              {ep.Name}
            </Text>
            {metadata.length > 0 ? (
              <View style={styles.episodeMetaRow}>
                {metadata.map(value => (
                  <Text key={value} style={styles.episodeMetaPill}>
                    {value}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.episodeSummaryLabel}>Summary</Text>
            {ep.Overview ? (
              <Text style={styles.episodeOverview} numberOfLines={4}>{ep.Overview}</Text>
            ) : (
              <Text style={styles.episodeOverviewMuted} numberOfLines={2}>No episode summary available.</Text>
            )}
          </View>
          <View style={[styles.playBadge, isFocused && styles.playBadgeFocused]}>
            <Text style={[styles.playBadgeText, isFocused && styles.playBadgeTextFocused]}>Play</Text>
          </View>
        </View>
      </TouchableHighlight>
    );
  }, [focusedEpisode, openEpisode, serverUrl]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00a4dc" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Item not found'}</Text>
      </View>
    );
  }

  const backdropUrl = `${serverUrl}/Items/${item.Id}/Images/Backdrop/0?fillHeight=1080&fillWidth=1920&quality=85`;
  const posterUrl = `${serverUrl}/Items/${item.Id}/Images/Primary?fillHeight=720&fillWidth=480&quality=90`;
  const isSeries = item.Type === 'Series';
  const runtime = formatRuntime(item.RunTimeTicks);
  const currentSeason = seasons.find(season => season.Id === selectedSeasonId) ?? seasons[0] ?? null;
  const firstEpisode = episodes[0] ?? null;
  const seasonLabel = isSeries ? 'Series' : item.Type ?? 'Title';
  const episodeCountLabel = getEpisodeCountLabel(episodes.length);
  const seasonCountLabel = getSeasonCountLabel(seasons.length);
  const heroSummary = item.Taglines?.[0] ?? item.Studios?.[0]?.Name ?? (isSeries ? 'Series' : item.Type ?? 'Feature');
  const heroSummaryLabel = getHeroSummaryLabel(item);
  const displayTitle = getDisplayTitle(item);

  return (
    <View style={styles.container}>
      <Image source={{ uri: backdropUrl }} style={styles.backdrop} />
      <View style={styles.backdropScrim} />
      <View style={styles.backdropGlow} />

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableHighlight
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          underlayColor="rgba(255,255,255,0.12)"
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableHighlight>

        <View style={styles.heroPanel}>
          <View style={styles.posterFrame}>
            <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.kicker}>{seasonLabel}</Text>
            <Text style={styles.itemTitle}>{displayTitle}</Text>

            <View style={styles.metaRow}>
              {item.ProductionYear != null && (
                <Text style={styles.metaPill}>{item.ProductionYear}</Text>
              )}
              {item.OfficialRating != null && (
                <Text style={styles.metaPill}>{item.OfficialRating}</Text>
              )}
              {runtime && !isSeries && (
                <Text style={styles.metaPill}>{runtime}</Text>
              )}
              {item.CommunityRating != null && (
                <Text style={styles.metaPill}>★ {item.CommunityRating.toFixed(1)}</Text>
              )}
            </View>

            <View style={styles.statRow}>
              {isSeries ? (
                <>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Seasons</Text>
                    <Text style={styles.statValue}>{seasonCountLabel}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Episodes</Text>
                    <Text style={styles.statValue}>{episodeCountLabel}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Runtime</Text>
                  <Text style={styles.statValue}>{runtime ?? 'Unknown'}</Text>
                </View>
              )}
              <View style={styles.statCardWide}>
                <Text style={styles.statLabel}>{heroSummaryLabel}</Text>
                <Text style={styles.statValueWide} numberOfLines={1}>{heroSummary}</Text>
              </View>
            </View>

            {item.Genres && item.Genres.length > 0 && (
              <View style={styles.genreRow}>
                {item.Genres.slice(0, 5).map(g => (
                  <Text key={g} style={styles.genrePill}>{g}</Text>
                ))}
              </View>
            )}

            {item.Overview ? (
              <Text style={styles.overview} numberOfLines={isSeries ? 5 : 6}>{item.Overview}</Text>
            ) : (
              <Text style={styles.overviewMuted}>No summary available.</Text>
            )}

            <View style={styles.actionRow}>
              {isSeries ? (
                <>
                  <ActionButton
                    label={firstEpisode ? `Play ${formatEpisodeLabel(firstEpisode) ?? 'Episode 1'}` : 'Play First Episode'}
                    emphasis="primary"
                    onPress={() => {
                      if (firstEpisode) {
                        openEpisode(firstEpisode);
                      }
                    }}
                  />
                  <ActionButton
                    label={currentSeason?.Name ?? 'Choose Season'}
                    onPress={() => {
                      if (selectedSeasonId) {
                        selectSeason(selectedSeasonId);
                      }
                    }}
                  />
                </>
              ) : (
                <ActionButton
                  label="Play Now"
                  emphasis="primary"
                  onPress={() => navigation.navigate('Player', { itemId: item.Id!, title: item.Name ?? '' })}
                />
              )}
            </View>
          </View>
        </View>

        {isSeries && seasons.length > 0 && (
          <View style={styles.episodesPanel}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Browse</Text>
                <Text style={styles.sectionTitle}>{currentSeason?.Name ?? 'Episodes'}</Text>
              </View>
              <Text style={styles.sectionMeta}>{episodeCountLabel}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.seasonTabs}
              contentContainerStyle={styles.seasonTabsContent}
            >
              {seasons.map(season => {
                const isSelected = season.Id === selectedSeasonId;
                const isFocused = focusedSeason === season.Id;

                return (
                  <TouchableHighlight
                    key={season.Id}
                    style={[
                      styles.seasonTab,
                      isSelected && styles.seasonTabSelected,
                      isFocused && !isSelected && styles.seasonTabFocused,
                    ]}
                    onPress={() => selectSeason(season.Id!)}
                    onFocus={() => setFocusedSeason(season.Id ?? null)}
                    onBlur={() => setFocusedSeason(null)}
                    underlayColor="rgba(255,255,255,0.10)"
                  >
                    <View>
                      <Text style={[styles.seasonTabEyebrow, isSelected && styles.seasonTabEyebrowSelected]}>
                        Season
                      </Text>
                      <Text style={[styles.seasonTabText, isSelected && styles.seasonTabTextSelected]}>
                        {season.Name}
                      </Text>
                    </View>
                  </TouchableHighlight>
                );
              })}
            </ScrollView>

            {episodesLoading ? (
              <ActivityIndicator color="#00a4dc" style={styles.sectionLoader} />
            ) : episodes.length === 0 ? (
              <Text style={styles.emptyText}>No episodes found</Text>
            ) : (
              <FlatList
                data={episodes}
                keyExtractor={ep => ep.Id!}
                renderItem={renderEpisode}
                scrollEnabled={false}
                ItemSeparatorComponent={EpisodeSeparator}
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const EpisodeThumb = ({
  thumbUrl,
  fallbackUrl,
  epNumber,
}: {
  thumbUrl: string | null;
  fallbackUrl: string | null;
  epNumber?: number | null;
}) => {
  const [useFallback, setUseFallback] = useState(false);
  const [failed, setFailed] = useState(false);
  const uri = useFallback ? fallbackUrl : thumbUrl;

  return (
    <View style={styles.episodeThumbWrap}>
      {!failed && uri ? (
        <Image
          source={{ uri }}
          style={styles.episodeThumb}
          resizeMode="cover"
          onError={() => {
            if (!useFallback) { setUseFallback(true); }
            else { setFailed(true); }
          }}
        />
      ) : (
        <View style={[styles.episodeThumb, styles.episodeThumbPlaceholder]} />
      )}
      {epNumber != null && (
        <View style={styles.epNumberBadge}>
          <Text style={styles.epNumberText}>{epNumber}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071017',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#071017',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.32,
  },
  backdropScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,8,12,0.74)',
  },
  backdropGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '55%',
    height: 420,
    backgroundColor: 'rgba(0,164,220,0.08)',
  },
  content: {
    paddingHorizontal: 56,
    paddingTop: 30,
    paddingBottom: 72,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(7,16,23,0.72)',
  },
  backText: {
    color: '#5ed9ff',
    fontSize: 20,
    fontWeight: '700',
  },
  heroPanel: {
    flexDirection: 'row',
    gap: 34,
    marginBottom: 36,
    alignItems: 'flex-start',
  },
  posterFrame: {
    padding: 8,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  poster: {
    width: 268,
    height: 402,
    borderRadius: 22,
    backgroundColor: '#13202b',
  },
  heroInfo: {
    flex: 1,
    paddingTop: 12,
    maxWidth: 1120,
  },
  kicker: {
    color: '#5ed9ff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 58,
    fontWeight: '800',
    marginBottom: 18,
    letterSpacing: 0.4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  metaPill: {
    color: '#d7e7ef',
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    minWidth: 170,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statCardWide: {
    flexGrow: 1,
    minWidth: 220,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    color: '#8da4b4',
    fontSize: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  statValue: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  statValueWide: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  genrePill: {
    color: '#9ce8ff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(94,217,255,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(14,33,43,0.68)',
  },
  overview: {
    color: '#d7e7ef',
    fontSize: 20,
    lineHeight: 31,
    marginBottom: 26,
    maxWidth: 980,
  },
  overviewMuted: {
    color: '#8da4b4',
    fontSize: 18,
    marginBottom: 26,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionButton: {
    paddingHorizontal: 26,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 3,
  },
  actionButtonPrimary: {
    backgroundColor: '#00a4dc',
    borderColor: '#00a4dc',
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  actionButtonFocused: {
    borderColor: '#fff',
    transform: [{ scale: 1.03 }],
  },
  actionButtonText: {
    fontSize: 22,
    fontWeight: '700',
  },
  actionButtonTextPrimary: {
    color: '#fff',
  },
  actionButtonTextSecondary: {
    color: '#e7f6fb',
  },
  episodesPanel: {
    padding: 28,
    borderRadius: 30,
    backgroundColor: 'rgba(6,15,22,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  sectionEyebrow: {
    color: '#5ed9ff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
  },
  sectionMeta: {
    color: '#8da4b4',
    fontSize: 18,
    fontWeight: '600',
  },
  seasonTabs: {
    marginBottom: 20,
  },
  seasonTabsContent: {
    paddingRight: 12,
  },
  seasonTab: {
    minWidth: 180,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  seasonTabSelected: {
    backgroundColor: '#00a4dc',
    borderColor: '#00a4dc',
  },
  seasonTabFocused: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  seasonTabEyebrow: {
    color: '#8da4b4',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  seasonTabEyebrowSelected: {
    color: 'rgba(255,255,255,0.82)',
  },
  seasonTabText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  seasonTabTextSelected: {
    color: '#fff',
  },
  sectionLoader: {
    marginTop: 28,
  },
  episodeSpacer: {
    height: 12,
  },
  episodeRow: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  episodeRowFocused: {
    borderColor: '#5ed9ff',
    backgroundColor: 'rgba(0,164,220,0.12)',
  },
  episodeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 20,
  },
  episodeThumbWrap: {
    position: 'relative',
  },
  episodeThumb: {
    width: 288,
    height: 162,
    borderRadius: 14,
    backgroundColor: '#13202b',
  },
  episodeThumbPlaceholder: {
    backgroundColor: '#13202b',
  },
  epNumberBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  epNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  episodeText: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  episodeTitleRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  episodeKicker: {
    color: '#5ed9ff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  episodeMeta: {
    color: '#8da4b4',
    fontSize: 14,
    fontWeight: '600',
  },
  episodeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  episodeMetaPill: {
    color: '#d7e7ef',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  episodeSummaryLabel: {
    color: '#8da4b4',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  episodeTitleFocused: {
    color: '#fff',
  },
  episodeOverview: {
    color: '#c3d2da',
    fontSize: 16,
    lineHeight: 24,
  },
  episodeOverviewMuted: {
    color: '#7f95a2',
    fontSize: 16,
    lineHeight: 24,
  },
  playBadge: {
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  playBadgeFocused: {
    borderColor: '#5ed9ff',
    backgroundColor: 'rgba(94,217,255,0.12)',
  },
  playBadgeText: {
    color: '#d7e7ef',
    fontSize: 18,
    fontWeight: '700',
  },
  playBadgeTextFocused: {
    color: '#fff',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 20,
  },
  emptyText: {
    color: '#8da4b4',
    fontSize: 18,
    marginTop: 14,
  },
});

export default DetailsScreen;
