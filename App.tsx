import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { JellyfinProvider, useJellyfin } from './src/context/JellyfinContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import DetailsScreen from './src/screens/DetailsScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootStack = () => {
    const { isAuthenticated, isInitialized } = useJellyfin();

    if (!isInitialized) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#00a4dc" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
                <>
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="Library" component={LibraryScreen} />
                    <Stack.Screen name="Details" component={DetailsScreen} />
                    <Stack.Screen name="Player" component={PlayerScreen} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                </>
            )}
        </Stack.Navigator>
    );
};

const App = () => {
    return (
        <JellyfinProvider>
            <NavigationContainer>
                <RootStack />
            </NavigationContainer>
        </JellyfinProvider>
    );
};

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#101010',
    },
});

export default App;
