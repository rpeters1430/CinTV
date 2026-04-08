import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableHighlight,
  Alert,
} from 'react-native';
import { useJellyfin } from '../context/JellyfinContext';
import type { NavProp } from '../types/navigation';

interface Props {
  navigation: NavProp<'Settings'>;
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

const SettingRow = ({ label, description, children }: SettingRowProps) => (
  <View style={styles.settingRow}>
    <View style={styles.settingInfo}>
      <Text style={styles.settingLabel}>{label}</Text>
      {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
    </View>
    <View style={styles.settingControl}>{children}</View>
  </View>
);

interface SettingButtonProps {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

const SettingButton = ({ label, onPress, destructive }: SettingButtonProps) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <TouchableHighlight
      style={[
        styles.settingBtn,
        destructive && styles.settingBtnDestructive,
        isFocused && styles.settingBtnFocused,
        isFocused && destructive && styles.settingBtnDestructiveFocused,
      ]}
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      underlayColor={destructive ? '#ff6666' : 'rgba(255,255,255,0.15)'}
    >
      <Text style={[styles.settingBtnText, destructive && styles.settingBtnTextDestructive]}>
        {label}
      </Text>
    </TouchableHighlight>
  );
};

const SettingsScreen = ({ navigation }: Props) => {
  const { serverUrl, logout } = useJellyfin();
  const [isBackFocused, setIsBackFocused] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? You will need to enter your server URL and credentials again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: logout,
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
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

        <Text style={styles.screenTitle}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server</Text>
          <View style={styles.card}>
            <SettingRow label="Server URL" description="The Jellyfin server this app is connected to">
              <Text style={styles.settingValue} numberOfLines={1}>{serverUrl ?? 'Not configured'}</Text>
            </SettingRow>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <SettingButton
                label="Change Server / Log Out"
                onPress={handleLogout}
                destructive
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <SettingRow label="App Name">
              <Text style={styles.settingValue}>CinTV</Text>
            </SettingRow>
            <View style={styles.divider} />
            <SettingRow label="Version">
              <Text style={styles.settingValue}>1.0.0</Text>
            </SettingRow>
            <View style={styles.divider} />
            <SettingRow label="Media Server">
              <Text style={styles.settingValue}>Jellyfin</Text>
            </SettingRow>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071017',
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
  screenTitle: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 36,
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 36,
  },
  sectionTitle: {
    color: '#5ed9ff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    minHeight: 72,
    gap: 20,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  settingDescription: {
    color: '#8da4b4',
    fontSize: 15,
    marginTop: 4,
  },
  settingControl: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  settingValue: {
    color: '#8da4b4',
    fontSize: 18,
    maxWidth: 420,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 24,
  },
  settingBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  settingBtnFocused: {
    borderColor: '#5ed9ff',
    backgroundColor: 'rgba(94,217,255,0.14)',
    transform: [{ scale: 1.03 }],
  },
  settingBtnDestructive: {
    borderColor: 'rgba(220,50,50,0.45)',
    backgroundColor: 'rgba(220,50,50,0.14)',
  },
  settingBtnDestructiveFocused: {
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(220,50,50,0.28)',
  },
  settingBtnText: {
    color: '#d7e7ef',
    fontSize: 18,
    fontWeight: '700',
  },
  settingBtnTextDestructive: {
    color: '#ff9090',
  },
});

export default SettingsScreen;
