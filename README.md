# CinTV

A React Native Android TV client for [Jellyfin](https://jellyfin.org/) media servers, built with [`react-native-tvos`](https://github.com/react-native-tvos/react-native-tvos).

## Prerequisites

- [Android Studio](https://developer.android.com/studio) with the Android SDK installed
- Java Development Kit (JDK 17 recommended)
- Node.js and npm

## Android TV Emulator Setup

Before running the app you need an Android TV emulator configured in Android Studio.

### 1. Create an Android TV AVD

1. Open Android Studio and go to **Tools > Device Manager**
2. Click **Create Device**
3. Under **Category**, select **Television**
4. Choose a TV hardware profile (e.g. **Android TV (1080p)**) and click **Next**
5. Select a system image — choose one with **Google APIs** (e.g. API 33 or 34) and click **Next**
6. Name the AVD and click **Finish**

### 2. Start the Emulator

Launch the AVD from **Device Manager** by clicking the play button, or run:

```sh
# List available AVDs
emulator -list-avds

# Start a specific AVD
emulator -avd <avd_name>
```

Make sure `emulator` is on your PATH (`$ANDROID_HOME/emulator`).

### 3. Verify ADB Connection

```sh
adb devices
```

You should see the emulator listed as a connected device.

## Running the App

### Step 1: Start Metro

In your project directory, start the Metro bundler:

```sh
npm start
```

### Step 2: Build and Run on Android TV

With Metro running, open a new terminal and run:

```sh
npm run android
```

This builds the APK and installs it on the running Android TV emulator. The app should launch automatically.

> **Tip:** If multiple devices are connected, set `ANDROID_SERIAL` to target a specific one:
> ```sh
> ANDROID_SERIAL=emulator-5554 npm run android
> ```

### iOS / tvOS (optional)

Install CocoaPods dependencies first:

```sh
bundle install
bundle exec pod install
```

Then run:

```sh
npm run ios
```

## Troubleshooting

- **Emulator not detected:** Ensure the AVD is fully booted before running `npm run android`. Check with `adb devices`.
- **Build failures:** See the [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting) guide.
- **Metro cache issues:** Run `npm start -- --reset-cache` to clear the bundler cache.

## Learn More

- [React Native TVOS](https://github.com/react-native-tvos/react-native-tvos)
- [Jellyfin](https://jellyfin.org/)
- [React Native CLI](https://github.com/react-native-community/cli)
