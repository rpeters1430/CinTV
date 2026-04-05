import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableHighlight,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useJellyfin } from '../context/JellyfinContext';

const LoginScreen = () => {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login } = useJellyfin();

  const handleLogin = async () => {
    if (!url || !username) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(url, username, password);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>CinTV</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={inputStyle('url')}
          placeholder="Server URL (http://192.168.1.x:8096)"
          placeholderTextColor="#666"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          onFocus={() => setFocusedField('url')}
          onBlur={() => setFocusedField(null)}
        />

        <TextInput
          style={inputStyle('username')}
          placeholder="Username"
          placeholderTextColor="#666"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          onFocus={() => setFocusedField('username')}
          onBlur={() => setFocusedField(null)}
        />

        <TextInput
          style={inputStyle('password')}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
        />

        <TouchableHighlight
          style={[styles.button, focusedField === 'button' && styles.buttonFocused]}
          onPress={handleLogin}
          onFocus={() => setFocusedField('button')}
          onBlur={() => setFocusedField(null)}
          underlayColor="#00c8ff"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect</Text>
          )}
        </TouchableHighlight>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    width: '50%',
    maxWidth: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00a4dc',
    textAlign: 'center',
    marginBottom: 48,
  },
  input: {
    backgroundColor: '#202020',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: '#00a4dc',
    backgroundColor: '#252525',
  },
  button: {
    backgroundColor: '#00a4dc',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  buttonFocused: {
    borderColor: '#fff',
    backgroundColor: '#00c8ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  error: {
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
});

export default LoginScreen;
