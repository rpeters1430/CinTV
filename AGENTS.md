# Repository Guidelines

## Project Structure & Module Organization
`CinTV` is a basic `react-native-tvos` project for a Jellyfin Android TV app. App bootstrap lives in `App.tsx` and `index.js`. Keep product code in `src/`: `api/` wraps Jellyfin SDK entry points, `context/` owns auth/session state, `hooks/` contains data-fetching logic, `screens/` holds route components, `components/` stores reusable UI such as `Poster`, and `types/` keeps shared navigation types. Tests live in `__tests__/`. Native platform code stays under `android/` and `ios/`.

## Build, Test, and Development Commands
Use Node 20+.

- `npm start`: start the Metro bundler.
- `npm run android`: launch the app on Android TV or emulator.
- `npm run ios`: launch the `react-native-tvos` target in the Apple simulator when needed.
- `npm test`: run the Jest suite (`react-native` preset).
- `npm run lint`: run ESLint across the repo.
- `bundle install && bundle exec pod install`: install iOS CocoaPods dependencies after native dependency changes.

## Coding Style & Naming Conventions
Write new code in TypeScript (`.ts`/`.tsx`). Follow the repository Prettier and ESLint configuration instead of hand-formatting: single quotes, trailing commas, and no parentheses for single-argument arrow functions. Use PascalCase for screens, providers, and reusable components (`PlayerScreen.tsx`, `JellyfinProvider`), camelCase for hooks and helpers (`useHomeData`), and keep navigation route names aligned with `src/types/navigation.ts`. Prefer adding Jellyfin SDK access through `src/api/jellyfin.ts` rather than importing deep SDK paths in screens.

## Testing Guidelines
Add or update Jest tests in `__tests__/` for behavior changes. Name test files `*.test.tsx` or `*.test.ts` and mirror the feature under test when practical, for example `__tests__/App.test.tsx`. Cover new hooks, navigation changes, and auth/data-loading branches when feasible. Run `npm test` before opening a PR.

## Commit & Pull Request Guidelines
This checkout does not include `.git` history, so no project-specific commit pattern can be verified locally. Use short imperative commit subjects such as `Add player seek overlay` and keep each commit focused. PRs should explain user-visible changes, list test coverage (`npm test`, `npm run lint`), link related issues, and include screenshots or short recordings for TV UI changes.

## Agent Notes
Preserve TV-specific behavior. Use `react-native-tvos` APIs for focus and remote handling, prefer `TouchableHighlight` for focusable controls, and keep data fetching inside `src/hooks/` instead of embedding request logic directly in screens. Optimize first for the Android TV experience even if the shared TV code also runs on Apple TV simulators.
