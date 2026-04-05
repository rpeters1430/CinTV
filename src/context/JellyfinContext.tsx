import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Jellyfin } from '@jellyfin/sdk';
import { Api } from '@jellyfin/sdk/lib/api';
import { createJellyfinInstance, createApiClient, getUserApi } from '../api/jellyfin';

interface JellyfinContextType {
    jellyfin: Jellyfin | null;
    api: Api | null;
    serverUrl: string | null;
    accessToken: string | null;
    userId: string | null;
    isAuthenticated: boolean;
    login: (url: string, username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isInitialized: boolean;
}

const JellyfinContext = createContext<JellyfinContextType | undefined>(undefined);

export const JellyfinProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [jellyfin, setJellyfin] = useState<Jellyfin | null>(null);
    const [api, setApi] = useState<Api | null>(null);
    const [serverUrl, setServerUrl] = useState<string | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const initialize = async () => {
            const deviceId = await DeviceInfo.getUniqueId();
            const inst = createJellyfinInstance(deviceId);
            setJellyfin(inst);

            const storedUrl = await AsyncStorage.getItem('serverUrl');
            const storedToken = await AsyncStorage.getItem('accessToken');
            const storedUserId = await AsyncStorage.getItem('userId');

            if (storedUrl && storedToken && storedUserId) {
                setServerUrl(storedUrl);
                setAccessToken(storedToken);
                setUserId(storedUserId);
                setApi(createApiClient(inst, storedUrl, storedToken));
            }
            setIsInitialized(true);
        };
        initialize();
    }, []);

    const login = async (url: string, username: string, pw: string) => {
        if (!jellyfin) return;

        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        const newApi = createApiClient(jellyfin, cleanUrl);
        const userApi = getUserApi(newApi);

        try {
            const response = await userApi.authenticateUserByName({
                authenticateUserByName: {
                    Username: username,
                    Pw: pw
                }
            });

            const data = response.data;
            if (data.AccessToken && data.SessionInfo?.UserId) {
                const token = data.AccessToken;
                const userId = data.SessionInfo.UserId;

                await AsyncStorage.setItem('serverUrl', cleanUrl);
                await AsyncStorage.setItem('accessToken', token);
                await AsyncStorage.setItem('userId', userId);

                setServerUrl(cleanUrl);
                setAccessToken(token);
                setUserId(userId);
                setApi(createApiClient(jellyfin, cleanUrl, token));
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('serverUrl');
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('userId');
        setServerUrl(null);
        setAccessToken(null);
        setUserId(null);
        setApi(null);
    };

    return (
        <JellyfinContext.Provider value={{
            jellyfin,
            api,
            serverUrl,
            accessToken,
            userId,
            isAuthenticated: !!accessToken,
            login,
            logout,
            isInitialized
        }}>
            {children}
        </JellyfinContext.Provider>
    );
};

export const useJellyfin = () => {
    const context = useContext(JellyfinContext);
    if (!context) {
        throw new Error('useJellyfin must be used within a JellyfinProvider');
    }
    return context;
};
