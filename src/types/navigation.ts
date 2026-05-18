import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Search: undefined;
  Library: { libraryId: string; libraryName: string };
  Details: { itemId: string };
  Player: { itemId: string; title: string };
  Settings: undefined;
};

export type NavProp<T extends keyof RootStackParamList> = NativeStackNavigationProp<RootStackParamList, T>;
export type RouteProps<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;
