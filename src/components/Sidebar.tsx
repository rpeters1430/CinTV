import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableHighlight,
  Animated,
  Easing,
} from 'react-native';
import { Home, Search, Settings } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavProp } from '../types/navigation';

interface SidebarProps {
  active: 'Home' | 'Search' | 'Settings';
}

const Sidebar: React.FC<SidebarProps> = ({ active }) => {
  const navigation = useNavigation<NavProp<'Home'>>();
  const [isExpanded, setIsExpanded] = useState(false);
  const widthAnim = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const expand = useCallback(() => {
    setIsExpanded(true);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: 260,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [widthAnim, opacityAnim]);

  const collapse = useCallback(() => {
    setIsExpanded(false);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: 80,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  }, [widthAnim, opacityAnim]);

  const NavItem = ({
    name,
    icon: Icon,
    target,
  }: {
    name: string;
    icon: any;
    target: 'Home' | 'Search' | 'Settings';
  }) => {
    const isActive = active === target;
    const [isFocused, setIsFocused] = useState(false);

    return (
      <TouchableHighlight
        style={[
          styles.navItem,
          isFocused && styles.navItemFocused,
          isActive && !isFocused && styles.navItemActive,
        ]}
        onPress={() => {
          if (!isActive) {
            navigation.navigate(target);
          }
        }}
        onFocus={() => {
          setIsFocused(true);
          expand();
        }}
        onBlur={() => {
          setIsFocused(false);
          collapse();
        }}
        underlayColor="rgba(255, 255, 255, 0.15)"
      >
        <View style={styles.navItemInner}>
          <Icon
            size={28}
            color={isActive || isFocused ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
            strokeWidth={isActive ? 2.5 : 2}
          />
          <Animated.View style={[styles.labelContainer, { opacity: opacityAnim }]}>
            <Text
              style={[
                styles.label,
                isActive && styles.labelActive,
                isFocused && styles.labelFocused,
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </Animated.View>
        </View>
      </TouchableHighlight>
    );
  };

  return (
    <Animated.View style={[styles.container, { width: widthAnim }]}>
      <View style={styles.topSpacer} />
      <View style={styles.items}>
        <NavItem name="Home" icon={Home} target="Home" />
        <NavItem name="Search" icon={Search} target="Search" />
        <NavItem name="Settings" icon={Settings} target="Settings" />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: 'rgba(13, 17, 23, 0.95)',
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 100,
  },
  topSpacer: {
    height: 120,
  },
  items: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 16,
  },
  navItem: {
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  navItemFocused: {
    backgroundColor: '#00a4dc',
    transform: [{ scale: 1.05 }],
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 20,
    fontWeight: '600',
  },
  labelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  labelFocused: {
    color: '#fff',
  },
});

export default Sidebar;
