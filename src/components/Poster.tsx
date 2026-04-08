import React, { useState } from 'react';
import {
  TouchableHighlight,
  Image,
  Text,
  View,
  StyleSheet,
} from 'react-native';

interface PosterProps {
  id: string;
  name: string;
  serverUrl: string;
  onPress: () => void;
  onFocusFn?: () => void;
  width?: number;
  height?: number;
  imageType?: 'Primary' | 'Thumb' | 'Backdrop';
  subtitle?: string;
  seriesName?: string;
  seriesId?: string;
}

const Poster: React.FC<PosterProps> = ({
  id,
  name,
  serverUrl,
  onPress,
  onFocusFn,
  width = 180,
  height = 260,
  imageType = 'Primary',
  subtitle,
  seriesName,
  seriesId,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  // 0 = try item's imageType, 1 = try seriesId Primary (or item fallback), 2 = placeholder
  const [stage, setStage] = useState(0);

  const getImageUrl = () => {
    const q = `fillHeight=${height}&fillWidth=${width}&quality=90`;
    if (seriesId) {
      // For episodes: prefer series poster (portrait) first, fall back to episode thumbnail
      if (stage === 0) { return `${serverUrl}/Items/${seriesId}/Images/Primary?${q}`; }
      if (stage === 1) { return `${serverUrl}/Items/${id}/Images/${imageType}?${q}`; }
    } else {
      if (stage === 0) { return `${serverUrl}/Items/${id}/Images/${imageType}?${q}`; }
      if (stage === 1) {
        const fallbackType = imageType === 'Primary' ? 'Backdrop' : 'Primary';
        return `${serverUrl}/Items/${id}/Images/${fallbackType}?${q}`;
      }
    }
    return null;
  };

  const handleError = () => {
    if (stage < 1) { setStage(stage + 1); }
    else { setStage(2); }
  };

  const imageUrl = getImageUrl();

  return (
    <TouchableHighlight
      style={[styles.container, { width, height }, isFocused && styles.focused]}
      onPress={onPress}
      onFocus={() => { setIsFocused(true); onFocusFn?.(); }}
      onBlur={() => setIsFocused(false)}
      underlayColor="transparent"
    >
      <View style={styles.imageContainer}>
        {stage === 2 || !imageUrl ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText} numberOfLines={3}>{name}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={handleError}
          />
        )}
        <View style={styles.overlay}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
          {seriesName ? (
            <Text style={styles.subtitle} numberOfLines={1}>{seriesName}</Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </TouchableHighlight>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A2332',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 4,
  },
  focused: {
    borderColor: '#4fc3f7',
    elevation: 14,
    transform: [{ scale: 1.03 }],
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    flex: 1,
    borderRadius: 10,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#1e2d3d',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  placeholderText: {
    color: '#78909c',
    fontSize: 13,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  title: {
    color: '#e0f4ff',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#90caf9',
    fontSize: 12,
    marginTop: 2,
  },
});

export default Poster;
