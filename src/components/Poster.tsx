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
  width?: number;
  height?: number;
  imageType?: 'Primary' | 'Thumb' | 'Backdrop';
}

const Poster: React.FC<PosterProps> = ({
  id,
  name,
  serverUrl,
  onPress,
  width = 160,
  height = 240,
  imageType = 'Primary',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [imageFallback, setImageFallback] = useState(false);
  const [imageError, setImageError] = useState(false);

  const fallbackType = imageType === 'Primary' ? 'Backdrop' : 'Primary';
  const activeType = imageFallback ? fallbackType : imageType;
  const imageUrl = `${serverUrl}/Items/${id}/Images/${activeType}?fillHeight=${height}&fillWidth=${width}&quality=90`;

  return (
    <TouchableHighlight
      style={[styles.container, { width, height }, isFocused && styles.focused]}
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      underlayColor="transparent"
    >
      <View style={styles.imageContainer}>
        {imageError ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText} numberOfLines={3}>{name}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => {
              if (!imageFallback) { setImageFallback(true); }
              else { setImageError(true); }
            }}
          />
        )}
        <View style={styles.overlay}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
        </View>
      </View>
    </TouchableHighlight>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#202020',
    borderWidth: 3,
    borderColor: 'transparent',
    elevation: 5,
  },
  focused: {
    borderColor: '#00a4dc',
    transform: [{ scale: 1.05 }],
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    flex: 1,
    borderRadius: 5,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  placeholderText: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Poster;
