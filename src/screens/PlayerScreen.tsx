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

// Minimal Android TV device profile — prefer direct play, allow transcode fallback
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
const SEEK_SECONDS = 10;

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

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Resolve the best stream URL via PlaybackInfo
  useEffect(() => {
    let mounted = true;
    const resolve = async () => {
      if (!api || !userId || !serverUrl || !accessToken) {
        // Fall back to static stream
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
        if (!mounted) { return; }
        const sources = res.data.MediaSources ?? [];
        const source = sources[0];
        if (source?.SupportsDirectStream && source.DirectStreamUrl) {
          setStreamUrl(source.DirectStreamUrl + `&api_key=${accessToken}`);
        } else if (source?.SupportsTranscoding && source.TranscodingUrl) {
          setStreamUrl(`${serverUrl}${source.TranscodingUrl}`);
        } else {
          // Last resort: static stream
          setStreamUrl(`${serverUrl}/Videos/${itemId}/stream?static=true&api_key=${accessToken}`);
        }
      } catch {
        if (mounted) {
          setStreamUrl(`${serverUrl}/Videos/${itemId}/stream?static=true&api_key=${accessToken}`);
        }
      } finally {
        if (mounted) { setResolving(false); }
      }
    };
    resolve();
    return () => { mounted = false; };
  }, [api, userId, serverUrl, accessToken, itemId]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); }
    hideTimerRef.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE_DELAY);
  }, []);

  // Auto-hide controls after mount
  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); }
    };
  }, [showControlsTemporarily]);

  // TV remote handler
  useTVEventHandler(useCallback((evt) => {
    if (!evt?.eventType) { return; }
    switch (evt.eventType) {
      case 'select':
      case 'playPause':
        if (showControls) {
          setPaused(p => !p);
          showControlsTemporarily();
        } else {
          showControlsTemporarily();
        }
        break;
      case 'left':
        videoRef.current?.seek(Math.max(0, currentTime - SEEK_SECONDS));
        setCurrentTime(t => Math.max(0, t - SEEK_SECONDS));
        showControlsTemporarily();
        break;
      case 'right':
        videoRef.current?.seek(Math.min(duration, currentTime + SEEK_SECONDS));
        setCurrentTime(t => Math.min(duration, t + SEEK_SECONDS));
        showControlsTemporarily();
        break;
      case 'up':
      case 'down':
        showControlsTemporarily();
        break;
    }
  }, [showControls, currentTime, duration, showControlsTemporarily]));

  // Hardware back button
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

  if (resolving) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00a4dc" />
        <Text style={styles.loadingText}>Loading…</Text>
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
          onError={(e) => {
            console.error('Video error:', e);
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

      {/* Controls overlay */}
      {showControls && !error && (
        <View style={styles.controls}>
          {/* Top bar: title */}
          <View style={styles.topBar}>
            <TouchableHighlight style={styles.controlBackBtn} onPress={() => navigation.goBack()} underlayColor="#333">
              <Text style={styles.controlBackText}>←</Text>
            </TouchableHighlight>
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          </View>

          {/* Bottom bar: progress + time */}
          <View style={styles.bottomBar}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.progressThumb, { left: `${progress * 100}%` as any }]} />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Center: play/pause indicator */}
          <View style={styles.centerIndicator} pointerEvents="none">
            <Text style={styles.playPauseIcon}>{paused ? '▶' : '⏸'}</Text>
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
  // Controls overlay
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    gap: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  controlBackBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  controlBackText: {
    color: '#fff',
    fontSize: 26,
  },
  titleText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 28,
    gap: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  timeText: {
    color: '#fff',
    fontSize: 16,
    minWidth: 56,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00a4dc',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginLeft: -8,
  },
  centerIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  playPauseIcon: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 56,
  },
});

export default PlayerScreen;
