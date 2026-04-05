# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

CinTV is a React Native **Android TV** client for [Jellyfin](https://jellyfin.org/) media servers. The `react-native` package is aliased to `react-native-tvos` — all TV-specific APIs (`useTVEventHandler`, D-pad focus, etc.) come from that package.

## Commands

```sh
# Start Metro bundler
npm start

# Run on Android TV / emulator
npm run android

# Run on iOS (TV simulator)
npm run ios

# Lint
npm lint

# Run all tests
npm test

# Run a single test file
npx jest __tests__/SomeTest.test.tsx
```

For iOS, install CocoaPods dependencies first:
```sh
bundle install
bundle exec pod install
```

## Architecture

### Auth & State (`src/context/JellyfinContext.tsx`)
`JellyfinProvider` is the single source of truth for auth state. On startup it reads `serverUrl`, `accessToken`, and `userId` from AsyncStorage to restore a previous session. The `login()` function calls `authenticateUserByName`, stores the returned token, and updates context. All screens access this via `useJellyfin()`.

### Jellyfin SDK (`src/api/jellyfin.ts`)
Thin re-exports of `@jellyfin/sdk` API factory functions. When a screen needs a new API (e.g., `getTvShowsApi`), import it from here rather than calling the SDK directly. Adding a new API: import the factory from `@jellyfin/sdk/lib/utils/api/<name>-api` and re-export it.

### Navigation (`App.tsx`)
`react-navigation` native stack typed with `RootStackParamList` from `src/types/navigation.ts`. Auth gate: unauthenticated → `LoginScreen`; authenticated → `Home → Library → Details → Player`. Use `NavProp<'ScreenName'>` and `RouteProps<'ScreenName'>` for screen prop types.

### Data Hooks (`src/hooks/`)
All data fetching lives in hooks, not inline in screens:
- `useHomeData` — libraries + recently added
- `useLibraryItems(libraryId)` — paginated (50/page), call `loadMore()` from `FlatList.onEndReached`
- `useItemDetails(itemId)` — item + seasons + episodes; call `selectSeason(id)` to load a season's episodes

### TV Focus Handling
- Use `TouchableHighlight` (not `TouchableOpacity`) for focusable elements — it handles D-pad selection reliably on tvOS/Android TV.
- Track focus with `onFocus`/`onBlur` and apply a highlight style (border + scale) to indicate the focused element. See `Poster.tsx` for the pattern.
- For TV remote events (play, pause, seek, back), use `useTVEventHandler` from `react-native`. See `PlayerScreen.tsx` for the full remote event map.
- Hardware back button on Android TV must be handled via `BackHandler` — see `PlayerScreen.tsx`.

### Video Playback (`src/screens/PlayerScreen.tsx`)
1. Calls `getMediaInfoApi.getPlaybackInfo` with a minimal device profile to get the best stream URL.
2. Prefers `DirectStreamUrl`, falls back to `TranscodingUrl` (HLS/h264), then falls back to `?static=true`.
3. TV remote events: `select`/`playPause` = toggle pause, `left`/`right` = ±10s seek.
4. Controls overlay auto-hides after 4 seconds; any remote event resets the timer.

### Image URLs (`src/components/Poster.tsx`)
Jellyfin image URL format: `{serverUrl}/Items/{id}/Images/{imageType}?fillHeight={h}&fillWidth={w}&quality=90`. Supported `imageType` values: `Primary`, `Thumb`, `Backdrop`. `Poster` shows a text placeholder if the image fails to load.
