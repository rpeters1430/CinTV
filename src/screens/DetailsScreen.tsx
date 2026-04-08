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
  Alert,
} from 'react-native';
import { useItemDetails } from '../hooks/useItemDetails';
import type { BaseItemDto, BaseItemPerson } from '@jellyfin/sdk/lib/generated-client';
import type { NavProp, RouteProps } from '../types/navigation';
import { useJellyfin } from '../context/JellyfinContext';
import { getLibraryApi } from '../api/jellyfin';

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
  if (item.Studios?.length) { return 'Studio'; }
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
  emphasis?: 'primary' | 'secondary' | 'destructive';
  onPress: () => void;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isPrimary = emphasis === 'primary';
  const isDestructive = emphasis === 'destructive';

  const btnStyle = isPrimary
    ? styles.actionButtonPrimary
    : isDestructive
    ? styles.actionButtonDestructive
    : styles.actionButtonSecondary;

  const txtStyle = isPrimary
    ? styles.actionButtonTextPrimary
    : isDestructive
    ? styles.actionButtonTextDestructive
    : styles.actionButtonTextSecondary;

  const underlayColor = isPrimary ? '#42d9ff' : isDestructive ? '#ff6666' : 'rgba(255,255,255,0.16)';

  return (
    <TouchableHighlight
      style={[
        styles.actionButton,
        btnStyle,
        isFocused && styles.actionButtonFocused,
      ]}
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      underlayColor={underlayColor}
    >
      <Text
        style={[
          styles.actionButtonText,
          txtStyle,
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
  const { serverUrl, api } = useJellyfin();
  const { item, seasons, episodes, selectedSeasonId, selectSeason, cast, similarItems, loading, episodesLoading, error } = useItemDetails(itemId);
  const [focusedEpisode, setFocusedEpisode] = useState<string | null>(null);
  const [focusedSeason, setFocusedSeason] = useState<string | null>(null);
  const [isBackFocused, setIsBackFocused] = useState(false);

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
  const currentSeasonIndex = seasons.findIndex(season => season.Id === currentSeason?.Id);
  const firstEpisode = episodes[0] ?? null;
  const nextEpisode = episodes.find(ep => !ep.UserData?.Played) ?? firstEpisode;
  const seasonLabel = isSeries ? 'Series' : item.Type ?? 'Title';
  const episodeCountLabel = getEpisodeCountLabel(episodes.length);
  const seasonCountLabel = getSeasonCountLabel(seasons.length);
  const heroSummary = item.Taglines?.[0] ?? item.Studios?.[0]?.Name ?? (isSeries ? 'Series' : item.Type ?? 'Feature');
  const heroSummaryLabel = getHeroSummaryLabel(item);
  const displayTitle = getDisplayTitle(item);
  const seriesStatus = isSeries ? (item.Status ?? null) : null;
  const playedPercentage = item.UserData?.PlayedPercentage != null
    ? Math.round(item.UserData.PlayedPercentage)
    : null;
  const hasProgress = playedPercentage != null && playedPercentage > 0 && playedPercentage < 100;
  const progressBarWidth = hasProgress ? `${playedPercentage}%` : '0%';

  const actors = cast.filter(p => p.Type === 'Actor').slice(0, 12);
  const directors = cast.filter(p => p.Type === 'Director');

  const cycleSeason = () => {
    if (!isSeries || seasons.length < 2 || currentSeasonIndex < 0) { return; }
    const nextIndex = (currentSeasonIndex + 1) % seasons.length;
    const nextSeasonId = seasons[nextIndex]?.Id;

    if (nextSeasonId) {
      selectSeason(nextSeasonId);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.Name ?? 'this item'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!api || !item.Id) { return; }
            try {
              await getLibraryApi(api).deleteItem({ itemId: item.Id });
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete item. Check server permissions.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: backdropUrl }} style={styles.backdrop} />
      <View style={styles.backdropScrim} />
      <View style={styles.backdropGlow} />

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableHighlight
          style={[styles.backBtn, isBackFocused && styles.backBtnFocused]}
          onPress={() => navigation.goBack()}
          onFocus={() => setIsBackFocused(true)}
          onBlur={() => setIsBackFocused(false)}
          underlayColor="rgba(255,255,255,0.12)"
        >
          <Text style={[styles.backText, isBackFocused && styles.backTextFocused]}>← Back</Text>
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
                  {seriesStatus ? (
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Status</Text>
                      <Text style={[
                        styles.statValue,
                        seriesStatus === 'Continuing' && styles.statValueContinuing,
                        seriesStatus === 'Ended' && styles.statValueEnded,
                      ]}>{seriesStatus}</Text>
                    </View>
                  ) : null}
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

            {hasProgress ? (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Continue watching</Text>
                  <Text style={styles.progressPercent}>{playedPercentage}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: progressBarWidth }]} />
                </View>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              {isSeries ? (
                <>
                  <ActionButton
                    label={nextEpisode ? `Play ${formatEpisodeLabel(nextEpisode) ?? 'Episode 1'}` : 'Play First Episode'}
                    emphasis="primary"
                    onPress={() => {
                      if (nextEpisode) {
                        openEpisode(nextEpisode);
                      }
                    }}
                  />
                  <ActionButton
                    label={seasons.length > 1 ? `Next: ${seasons[(currentSeasonIndex + 1) % seasons.length]?.Name ?? 'Season'}` : (currentSeason?.Name ?? 'Season')}
                    onPress={cycleSeason}
                  />
                </>
              ) : (
                <>
                  <ActionButton
                    label="Play Now"
                    emphasis="primary"
                    onPress={() => navigation.navigate('Player', { itemId: item.Id!, title: item.Name ?? '' })}
                  />
                  <ActionButton
                    label="Delete"
                    emphasis="destructive"
                    onPress={handleDelete}
                  />
                </>
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

        {actors.length > 0 && (
          <CastSection
            actors={actors}
            directors={directors}
            serverUrl={serverUrl!}
          />
        )}

        {similarItems.length > 0 && (
          <SimilarSection
            items={similarItems}
            serverUrl={serverUrl!}
            onPress={id => navigation.push('Details', { itemId: id })}
          />
        )}
      </ScrollView>
    </View>
  );
};

const CastSection = ({
  actors,
  directors,
  serverUrl,
}: {
  actors: BaseItemPerson[];
  directors: BaseItemPerson[];
  serverUrl: string;
}) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  return (
    <View style={styles.extraPanel}>
      <View style={styles.extraPanelHeader}>
        <Text style={styles.sectionEyebrow}>People</Text>
        <Text style={styles.sectionTitle}>Cast &amp; Crew</Text>
      </View>
      {directors.length > 0 && (
        <View style={styles.directorRow}>
          <Text style={styles.directorLabel}>Directed by </Text>
          <Text style={styles.directorName}>{directors.map(d => d.Name).join(', ')}</Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castList}>
        {actors.map(person => {
          const isFocused = focusedId === person.Id;
          const imgUrl = person.Id
            ? `${serverUrl}/Items/${person.Id}/Images/Primary?fillHeight=200&fillWidth=140&quality=85`
            : null;
          return (
            <View key={person.Id ?? person.Name} style={[styles.castCard, isFocused && styles.castCardFocused]}>
              <TouchableHighlight
                style={styles.castThumbBtn}
                onFocus={() => setFocusedId(person.Id ?? null)}
                onBlur={() => setFocusedId(null)}
                onPress={() => {}}
                underlayColor="transparent"
              >
                <View>
                  {imgUrl ? (
                    <CastImage uri={imgUrl} name={person.Name ?? '?'} />
                  ) : (
                    <View style={styles.castThumbPlaceholder}>
                      <Text style={styles.castThumbInitial}>{(person.Name ?? '?')[0]}</Text>
                    </View>
                  )}
                </View>
              </TouchableHighlight>
              <Text style={styles.castName} numberOfLines={2}>{person.Name}</Text>
              {person.Role ? <Text style={styles.castRole} numberOfLines={1}>{person.Role}</Text> : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const CastImage = ({ uri, name }: { uri: string; name: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={styles.castThumbPlaceholder}>
        <Text style={styles.castThumbInitial}>{name[0]}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.castThumb}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
};

const SimilarSection = ({
  items,
  serverUrl,
  onPress,
}: {
  items: BaseItemDto[];
  serverUrl: string;
  onPress: (id: string) => void;
}) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  return (
    <View style={styles.extraPanel}>
      <View style={styles.extraPanelHeader}>
        <Text style={styles.sectionEyebrow}>Discover</Text>
        <Text style={styles.sectionTitle}>More Like This</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castList}>
        {items.map(sim => {
          const isFocused = focusedId === sim.Id;
          const imgUrl = sim.Id
            ? `${serverUrl}/Items/${sim.Id}/Images/Primary?fillHeight=270&fillWidth=180&quality=85`
            : null;
          return (
            <TouchableHighlight
              key={sim.Id}
              style={[styles.similarCard, isFocused && styles.similarCardFocused]}
              onFocus={() => setFocusedId(sim.Id ?? null)}
              onBlur={() => setFocusedId(null)}
              onPress={() => sim.Id && onPress(sim.Id)}
              underlayColor="transparent"
            >
              <View>
                {imgUrl ? (
                  <SimilarImage uri={imgUrl} name={sim.Name ?? ''} />
                ) : (
                  <View style={styles.similarThumbPlaceholder}>
                    <Text style={styles.similarThumbText} numberOfLines={3}>{sim.Name}</Text>
                  </View>
                )}
                <Text style={styles.similarName} numberOfLines={2}>{sim.Name}</Text>
                {sim.ProductionYear ? (
                  <Text style={styles.similarYear}>{sim.ProductionYear}</Text>
                ) : null}
              </View>
            </TouchableHighlight>
          );
        })}
      </ScrollView>
    </View>
  );
};

const SimilarImage = ({ uri, name }: { uri: string; name: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={styles.similarThumbPlaceholder}>
        <Text style={styles.similarThumbText} numberOfLines={3}>{name}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.similarThumb}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
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
  backBtnFocused: {
    borderColor: '#5ed9ff',
    backgroundColor: 'rgba(94,217,255,0.18)',
    transform: [{ scale: 1.04 }],
  },
  backText: {
    color: '#5ed9ff',
    fontSize: 20,
    fontWeight: '700',
  },
  backTextFocused: {
    color: '#fff',
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
  statValueContinuing: {
    color: '#5ed9a0',
  },
  statValueEnded: {
    color: '#ff9090',
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
  progressCard: {
    maxWidth: 560,
    marginBottom: 24,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(94,217,255,0.30)',
    backgroundColor: 'rgba(10,25,34,0.80)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressTitle: {
    color: '#d7e7ef',
    fontSize: 16,
    fontWeight: '700',
  },
  progressPercent: {
    color: '#5ed9ff',
    fontSize: 16,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#00a4dc',
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
  actionButtonDestructive: {
    backgroundColor: 'rgba(220,50,50,0.18)',
    borderColor: 'rgba(220,50,50,0.55)',
  },
  actionButtonTextDestructive: {
    color: '#ff9090',
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
  extraPanel: {
    marginTop: 32,
    padding: 28,
    borderRadius: 30,
    backgroundColor: 'rgba(6,15,22,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  extraPanelHeader: {
    marginBottom: 20,
  },
  directorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  directorLabel: {
    color: '#8da4b4',
    fontSize: 16,
    fontWeight: '600',
  },
  directorName: {
    color: '#d7e7ef',
    fontSize: 16,
    fontWeight: '700',
  },
  castList: {
    paddingBottom: 8,
    gap: 16,
  },
  castCard: {
    width: 140,
    alignItems: 'center',
    borderRadius: 16,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  castCardFocused: {
    borderColor: '#5ed9ff',
    backgroundColor: 'rgba(0,164,220,0.12)',
  },
  castThumbBtn: {
    borderRadius: 70,
    overflow: 'hidden',
  },
  castThumb: {
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#13202b',
  },
  castThumbPlaceholder: {
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#13202b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  castThumbInitial: {
    color: '#5ed9ff',
    fontSize: 36,
    fontWeight: '800',
  },
  castName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  castRole: {
    color: '#8da4b4',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  similarCard: {
    width: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  similarCardFocused: {
    borderColor: '#5ed9ff',
    transform: [{ scale: 1.04 }],
  },
  similarThumb: {
    width: 180,
    height: 270,
    backgroundColor: '#13202b',
  },
  similarThumbPlaceholder: {
    width: 180,
    height: 270,
    backgroundColor: '#13202b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  similarThumbText: {
    color: '#8da4b4',
    fontSize: 14,
    textAlign: 'center',
  },
  similarName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    paddingHorizontal: 6,
  },
  similarYear: {
    color: '#8da4b4',
    fontSize: 12,
    marginTop: 2,
    paddingHorizontal: 6,
    marginBottom: 6,
  },
});

export default DetailsScreen;
