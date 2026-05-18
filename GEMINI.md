# CinTV Project Context

CinTV is a React Native Android TV client for [Jellyfin](https://jellyfin.org/) media servers. It is built using the [`react-native-tvos`](https://github.com/react-native-tvos/react-native-tvos) fork to ensure compatibility with TV input devices and UI patterns.

## Project Architecture

- **Entry Point:** `App.tsx` handles the main navigation and provides the `JellyfinProvider` context.
- **API Layer (`src/api/`):** Utilizes `@jellyfin/sdk` to interact with Jellyfin servers. It includes helper functions for creating instances and accessing specific API modules (User, Library, Items, etc.).
- **Context (`src/context/`):** `JellyfinContext.tsx` manages the global authentication state, server configuration, and the active API instance.
- **Hooks (`src/hooks/`):** Custom hooks like `useHomeData`, `useLibraryItems`, and `useItemDetails` encapsulate data fetching logic and state management for screens.
- **Screens (`src/screens/`):** Implements the TV user interface using standard React Native components optimized for d-pad navigation.
- **Components (`src/components/`):** Reusable UI elements such as `Poster.tsx`.
- **Types (`src/types/`):** Centralized TypeScript definitions, including navigation parameters in `navigation.ts`.

## Tech Stack

- **Framework:** React Native (TVOS fork)
- **Language:** TypeScript
- **API SDK:** `@jellyfin/sdk`
- **Navigation:** `@react-navigation/native` with `@react-navigation/native-stack`
- **Video Playback:** `react-native-video`
- **Storage:** `@react-native-async-storage/async-storage` for persisting session data.
- **Icons:** `lucide-react-native`

## Development Workflow

### Key Commands

- **Start Metro Bundler:** `npm start`
- **Run on Android TV:** `npm run android` (Requires an Android TV emulator or device)
- **Run on tvOS (iOS):** `npm run ios` (Requires macOS and CocoaPods setup)
- **Run Tests:** `npm test`
- **Linting:** `npm run lint`

### Android TV Emulator Setup

1. Create an Android TV AVD in Android Studio (**Television** category).
2. Ensure `emulator` and `adb` are in your system PATH.
3. Start the emulator before running `npm run android`.

### Cloud Validation

The project includes scripts for CI/CD or cloud environments in the `scripts/` directory:
- `codex-cloud-setup.sh`: Sets up the environment (Android SDK, etc.).
- `codex-cloud-verify.sh`: Runs lint, tests, and Gradle builds.

## Known Issues & TODOs

- **Testing:** Jest tests may fail due to ESM transformation issues with `@react-navigation/native`. This requires an update to `jest.config.js` to properly transform dependencies.
- **Playback:** Ensure `react-native-video` is correctly configured for the target TV platforms for hardware acceleration.
- **Navigation:** All screens must be focusable and navigable via D-pad.

## Coding Conventions

- **Functional Components:** Use functional components and hooks for all new UI logic.
- **Type Safety:** Ensure all props and API responses are correctly typed.
- **API Centralization:** Always use `src/api/jellyfin.ts` wrappers for interacting with the Jellyfin SDK.
- **Context Access:** Use the `useJellyfin` hook to access authentication and API state.
