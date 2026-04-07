#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ROOT_DIR/.codex-cache/android-sdk}"
ANDROID_HOME="$ANDROID_SDK_ROOT"
ANDROID_CMDLINE_TOOLS_DIR="$ANDROID_SDK_ROOT/cmdline-tools/latest"

export ANDROID_SDK_ROOT ANDROID_HOME
export PATH="$ANDROID_CMDLINE_TOOLS_DIR/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"

cd "$ROOT_DIR"
npm run lint
npm test -- --runInBand

cd "$ROOT_DIR/android"
./gradlew --no-daemon assembleDebug testDebugUnitTest
