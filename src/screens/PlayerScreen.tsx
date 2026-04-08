import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableHighlight,
  BackHandler,
  useTVEventHandler,
} from 'react-native';
import Video, { VideoRef, OnProgressData, OnLoadData } from 'react-native-video';
import { useJellyfin } from '../context/JellyfinContext';
import { getMediaInfoApi } from '../api/jellyfin';
import type { NavProp, RouteProps } from '../types/navigation';

interface Props {
  navigation: NavProp<'Player'>;
  route: RouteProps<'Player'>;
}

// Minimal Android TV device profile, favoring direct play with a transcode fallback.
const DEVICE_PROFILE = {
  DirectPlayProfiles: [
    { Type: 'Video' as const },
  ],
  TranscodingProfiles: [
    {
      Type: 'Video' as const,
      Container: 'ts',
      VideoCodec: 'h264',
      AudioCodec: 'aac,mp3',
      Protocol: 'hls' as const,
    },
  ],
  SubtitleProfiles: [],
  CodecProfiles: [],
  ResponseProfiles: [],
  ContainerProfiles: [],
};

const CONTROLS_HIDE_DELAY = 4000;
const FEEDBACK_HIDE_DELAY = 1400;
const SEEK_SECONDS = 10;
const CONTROL_IDS = {
  back: 'back',
  rewind: 'rewind',
  playPause: 'playPause',
  forward: 'forward',
  restart: 'restart',
} as const;

type ControlId = (typeof CONTROL_IDS)[keyof typeof CONTROL_IDS];

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
};

const PlayerScreen = ({ route, navigation }: Props) => {
  const { itemId, title } = route.params;
  const { api, userId, serverUrl, accessToken } = useJellyfin();

  const videoRef = useRef<VideoRef>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [focusedControl, setFocusedControl] = useState<ControlId>(CONTROL_IDS.playPause);
  const [transportFeedback, setTransportFeedback] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolve = async () => {
      if (!api || !userId || !serverUrl || !accessToken) {
        setStreamUrl(`${serverUrl}/Videos/${itemId}/stream?static=true&api_key=${accessToken}`);
        setResolving(false);
        return;
      }

      try {
        const mediaApi = getMediaInfoApi(api);
        const res = await mediaApi.getPlaybackInfo({
          itemId,
          userId,
          openPlaybackInfo: { DeviceProfile: DEVICE_PROFILE as any },
        });

        if (!mounted) {
          return;
        }

        const sources = res.data.MediaSources ?? [];
        const source = sources[0];

        if (source?.SupportsDirectStream && source.DirectStreamUrl) {
          setStreamUrl(source.DirectStreamUrl + `&api_key=${accessToken}`);
        } else if (source?.SupportsTranscoding && source.TranscodingUrl) {
          setStreamUrl(`${serverUrl}${source.TranscodingUrl}`);
        } else {
          setStreamUrl(`${serverUrl}/Videos/${itemId}/stream?static=true&api_key=${accessToken}`);
        }
      } catch {
        if (mounted) {
          setStreamUrl(`${serverUrl}/Videos/${itemId}/stream?static=true&api_key=${accessToken}`);
        }
      } finally {
        if (mounted) {
          setResolving(false);
        }
      }
    };

    resolve();

    return () => {
      mounted = false;
    };
  }, [api, userId, serverUrl, accessToken, itemId]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleControlsHide = useCallback(() => {
    clearHideTimer();
    if (paused) {
      return;
    }
    hideTimerRef.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE_DELAY);
  }, [clearHideTimer, paused]);

  const showControlsTemporarily = useCallback((focusTarget?: ControlId) => {
    if (focusTarget) {
      setFocusedControl(focusTarget);
    }
    setShowControls(true);
    scheduleControlsHide();
  }, [scheduleControlsHide]);

  const showFeedback = useCallback((message: string) => {
    setTransportFeedback(message);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => setTransportFeedback(null), FEEDBACK_HIDE_DELAY);
  }, []);

  const handleSeek = useCallback((offset: number) => {
    const nextTime = Math.max(0, Math.min(duration, currentTime + offset));
    videoRef.current?.seek(nextTime);
    setCurrentTime(nextTime);
    showFeedback(offset > 0 ? `+${Math.abs(offset)}s` : `-${Math.abs(offset)}s`);
    showControlsTemporarily(offset > 0 ? CONTROL_IDS.forward : CONTROL_IDS.rewind);
  }, [currentTime, duration, showControlsTemporarily, showFeedback]);

  const handleTogglePause = useCallback(() => {
    setPaused(previous => {
      const nextPaused = !previous;
      showFeedback(nextPaused ? 'Paused' : 'Playing');
      return nextPaused;
    });
    setShowControls(true);
    setFocusedControl(CONTROL_IDS.playPause);
  }, [showFeedback]);

  const handleRestart = useCallback(() => {
    videoRef.current?.seek(0);
    setCurrentTime(0);
    showFeedback('Restarted');
    showControlsTemporarily(CONTROL_IDS.restart);
  }, [showControlsTemporarily, showFeedback]);

  useEffect(() => {
    setShowControls(true);
    scheduleControlsHide();

    return () => {
      clearHideTimer();
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, [clearHideTimer, scheduleControlsHide]);

  useEffect(() => {
    if (!showControls) {
      return;
    }

    scheduleControlsHide();
  }, [paused, showControls, scheduleControlsHide]);

  useTVEventHandler(useCallback(evt => {
    if (!evt?.eventType) {
      return;
    }

    switch (evt.eventType) {
      case 'select':
      case 'playPause':
        if (showControls) {
          handleTogglePause();
        } else {
          showControlsTemporarily(CONTROL_IDS.playPause);
        }
        break;
      case 'left':
        if (showControls && focusedControl !== CONTROL_IDS.playPause) {
          showControlsTemporarily();
          return;
        }
        handleSeek(-SEEK_SECONDS);
        break;
      case 'right':
        if (showControls && focusedControl !== CONTROL_IDS.playPause) {
          showControlsTemporarily();
          return;
        }
        handleSeek(SEEK_SECONDS);
        break;
      case 'up':
        showControlsTemporarily(CONTROL_IDS.back);
        break;
      case 'down':
        showControlsTemporarily(CONTROL_IDS.playPause);
        break;
    }
  }, [focusedControl, handleSeek, handleTogglePause, showControls, showControlsTemporarily]));

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    return () => handler.remove();
  }, [navigation]);

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    setBuffering(false);
  };

  const handleProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const remainingTime = Math.max(0, duration - currentTime);

  if (resolving) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00a4dc" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {streamUrl && (
        <Video
          ref={videoRef}
          source={{ uri: streamUrl }}
          style={styles.video}
          paused={paused}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
          onError={event => {
            console.error('Video error:', event);
            setError('Playback failed. The format may not be supported.');
          }}
          resizeMode="contain"
          progressUpdateInterval={500}
        />
      )}

      {buffering && !error && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#00a4dc" />
        </View>
      )}

      {error && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableHighlight style={styles.backButton} onPress={() => navigation.goBack()} underlayColor="#333">
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableHighlight>
        </View>
      )}

      {showControls && !error && (
        <View style={styles.controls}>
          <View style={styles.topScrim} pointerEvents="none" />
          <View style={styles.bottomScrim} pointerEvents="none" />

          <View style={styles.topBar}>
            <TouchableHighlight
              style={[
                styles.controlBackBtn,
                focusedControl === CONTROL_IDS.back && styles.focusedPill,
              ]}
              onPress={() => navigation.goBack()}
              onFocus={() => setFocusedControl(CONTROL_IDS.back)}
              hasTVPreferredFocus={focusedControl === CONTROL_IDS.back}
              underlayColor="#333"
            >
              <Text style={styles.controlBackText}>Back</Text>
            </TouchableHighlight>

            <View style={styles.titleWrap}>
              <Text style={styles.kickerText}>Now Playing</Text>
              <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
            </View>

            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{paused ? 'Paused' : buffering ? 'Buffering' : 'Playing'}</Text>
            </View>
          </View>

          <View style={styles.centerContent}>
            {transportFeedback && (
              <View style={styles.feedbackBubble}>
                <Text style={styles.feedbackText}>{transportFeedback}</Text>
              </View>
            )}

            <View style={styles.transportRow}>
              <TouchableHighlight
                style={[
                  styles.transportButton,
                  focusedControl === CONTROL_IDS.rewind && styles.transportButtonFocused,
                ]}
                onPress={() => handleSeek(-SEEK_SECONDS)}
                onFocus={() => setFocusedControl(CONTROL_IDS.rewind)}
                hasTVPreferredFocus={focusedControl === CONTROL_IDS.rewind}
                underlayColor="#2e2e2e"
              >
                <View style={styles.transportButtonInner}>
                  <Text style={styles.transportIcon}>⏪</Text>
                  <Text style={styles.transportLabel}>Back {SEEK_SECONDS}s</Text>
                </View>
              </TouchableHighlight>

              <TouchableHighlight
                style={[
                  styles.playButton,
                  focusedControl === CONTROL_IDS.playPause && styles.playButtonFocused,
                ]}
                onPress={handleTogglePause}
                onFocus={() => setFocusedControl(CONTROL_IDS.playPause)}
                hasTVPreferredFocus={focusedControl === CONTROL_IDS.playPause}
                underlayColor="#1081a6"
              >
                <View style={styles.transportButtonInner}>
                  <Text style={styles.playButtonIcon}>{paused ? '▶' : '⏸'}</Text>
                  <Text style={styles.playButtonLabel}>{paused ? 'Resume' : 'Pause'}</Text>
                </View>
              </TouchableHighlight>

              <TouchableHighlight
                style={[
                  styles.transportButton,
                  focusedControl === CONTROL_IDS.forward && styles.transportButtonFocused,
                ]}
                onPress={() => handleSeek(SEEK_SECONDS)}
                onFocus={() => setFocusedControl(CONTROL_IDS.forward)}
                hasTVPreferredFocus={focusedControl === CONTROL_IDS.forward}
                underlayColor="#2e2e2e"
              >
                <View style={styles.transportButtonInner}>
                  <Text style={styles.transportIcon}>⏩</Text>
                  <Text style={styles.transportLabel}>Forward {SEEK_SECONDS}s</Text>
                </View>
              </TouchableHighlight>

              <TouchableHighlight
                style={[
                  styles.transportButton,
                  focusedControl === CONTROL_IDS.restart && styles.transportButtonFocused,
                ]}
                onPress={handleRestart}
                onFocus={() => setFocusedControl(CONTROL_IDS.restart)}
                hasTVPreferredFocus={focusedControl === CONTROL_IDS.restart}
                underlayColor="#2e2e2e"
              >
                <View style={styles.transportButtonInner}>
                  <Text style={styles.transportIcon}>↺</Text>
                  <Text style={styles.transportLabel}>Start Over</Text>
                </View>
              </TouchableHighlight>
            </View>

            <Text style={styles.hintText}>
              Press left or right on the remote to seek while video keeps playing.
            </Text>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeLabel}>Elapsed</Text>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            </View>

            <View style={styles.progressWrap}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                <View style={[styles.progressThumb, { left: `${progress * 100}%` as any }]} />
              </View>

              <View style={styles.progressMetaRow}>
                <Text style={styles.progressMetaText}>Duration {formatTime(duration)}</Text>
                <Text style={styles.progressMetaText}>Remaining -{formatTime(remainingTime)}</Text>
              </View>
            </View>

            <View style={styles.timeColumn}>
              <Text style={styles.timeLabel}>Total</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>
      )}

      {!showControls && !error && transportFeedback && (
        <View style={styles.feedbackOverlay} pointerEvents="none">
          <View style={styles.feedbackBubble}>
            <Text style={styles.feedbackText}>{transportFeedback}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 20,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 18,
    marginTop: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#333',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '34%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 28,
    gap: 20,
  },
  controlBackBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  controlBackText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  focusedPill: {
    backgroundColor: '#00a4dc',
    transform: [{ scale: 1.05 }],
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  kickerText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  titleText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackBubble: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  feedbackText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  transportRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 18,
    flexWrap: 'wrap',
  },
  transportButton: {
    minWidth: 180,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  transportButtonFocused: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    transform: [{ scale: 1.05 }],
  },
  transportButtonInner: {
    alignItems: 'center',
    gap: 8,
  },
  transportIcon: {
    color: '#fff',
    fontSize: 34,
  },
  transportLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  playButton: {
    minWidth: 220,
    paddingHorizontal: 30,
    paddingVertical: 22,
    borderRadius: 26,
    backgroundColor: '#00a4dc',
  },
  playButtonFocused: {
    backgroundColor: '#22bee8',
    transform: [{ scale: 1.06 }],
  },
  playButtonIcon: {
    color: '#fff',
    fontSize: 42,
  },
  playButtonLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  hintText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 18,
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 40,
    paddingBottom: 30,
    gap: 18,
  },
  timeColumn: {
    minWidth: 92,
    gap: 6,
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  progressWrap: {
    flex: 1,
    gap: 10,
  },
  progressBar: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00a4dc',
    borderRadius: 999,
  },
  progressThumb: {
    position: 'absolute',
    top: -7,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginLeft: -12,
    borderWidth: 3,
    borderColor: '#00a4dc',
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressMetaText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
  },
});

export default PlayerScreen;
