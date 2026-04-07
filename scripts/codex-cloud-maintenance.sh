#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ROOT_DIR/.codex-cache/android-sdk}"
ANDROID_HOME="$ANDROID_SDK_ROOT"
ANDROID_CMDLINE_TOOLS_DIR="$ANDROID_SDK_ROOT/cmdline-tools/latest"

export ANDROID_SDK_ROOT ANDROID_HOME
export PATH="$ANDROID_CMDLINE_TOOLS_DIR/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"

cd "$ROOT_DIR"

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

if [[ -f Gemfile ]]; then
  bundle config set --local path vendor/bundle
  bundle install
fi

if [[ -x "$ANDROID_CMDLINE_TOOLS_DIR/bin/sdkmanager" ]]; then
  sdkmanager "platform-tools" >/dev/null
fi
