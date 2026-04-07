#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ROOT_DIR/.codex-cache/android-sdk}"
ANDROID_HOME="$ANDROID_SDK_ROOT"
ANDROID_PLATFORM="${ANDROID_PLATFORM:-android-36}"
ANDROID_BUILD_TOOLS_VERSION="${ANDROID_BUILD_TOOLS_VERSION:-36.0.0}"
ANDROID_NDK_VERSION="${ANDROID_NDK_VERSION:-27.1.12297006}"
ANDROID_CMAKE_VERSION="${ANDROID_CMAKE_VERSION:-3.22.1}"
ANDROID_CMDLINE_TOOLS_VERSION="${ANDROID_CMDLINE_TOOLS_VERSION:-14742923}"
ANDROID_CMDLINE_TOOLS_ZIP="commandlinetools-linux-${ANDROID_CMDLINE_TOOLS_VERSION}_latest.zip"
ANDROID_CMDLINE_TOOLS_URL="${ANDROID_CMDLINE_TOOLS_URL:-https://dl.google.com/android/repository/${ANDROID_CMDLINE_TOOLS_ZIP}}"
ANDROID_CMDLINE_TOOLS_DIR="$ANDROID_SDK_ROOT/cmdline-tools/latest"
PROFILE_FILE="$HOME/.bashrc"
PERSIST_ENVIRONMENT="${CODEX_CLOUD_PERSIST_ENV:-0}"

export ANDROID_SDK_ROOT ANDROID_HOME
export PATH="$ANDROID_CMDLINE_TOOLS_DIR/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"

log() {
  printf '==> %s\n' "$1"
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$cmd" >&2
    exit 1
  fi
}

preflight_checks() {
  log "Running preflight checks"
  require_command npm
  require_command java
  require_command curl
  require_command unzip
}

append_profile_export() {
  local line="$1"

  touch "$PROFILE_FILE"
  if ! grep -Fqx "$line" "$PROFILE_FILE"; then
    printf '%s\n' "$line" >>"$PROFILE_FILE"
  fi
}

install_node_dependencies() {
  log "Installing Node dependencies"
  cd "$ROOT_DIR"

  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
}

install_ruby_dependencies() {
  if [[ "${CODEX_CLOUD_INSTALL_RUBY:-0}" != "1" && "$(uname -s)" != "Darwin" ]]; then
    log "Skipping Bundler install on non-Darwin cloud host"
    return
  fi

  if [[ ! -f "$ROOT_DIR/Gemfile" ]]; then
    return
  fi

  log "Installing Ruby dependencies"
  cd "$ROOT_DIR"
  bundle config set --local path vendor/bundle
  bundle install
}

install_android_cmdline_tools() {
  if [[ -x "$ANDROID_CMDLINE_TOOLS_DIR/bin/sdkmanager" ]]; then
    log "Android command-line tools already installed"
    return
  fi

  log "Installing Android command-line tools"
  rm -rf "$ANDROID_SDK_ROOT/cmdline-tools"
  mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"

  local archive
  archive="$(mktemp)"

  curl -fsSL "$ANDROID_CMDLINE_TOOLS_URL" -o "$archive"
  unzip -q "$archive" -d "$ANDROID_SDK_ROOT/cmdline-tools"
  rm -f "$archive"

  mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_CMDLINE_TOOLS_DIR"
}

install_android_packages() {
  log "Installing Android SDK packages"
  yes | sdkmanager --licenses >/dev/null
  sdkmanager \
    "platform-tools" \
    "platforms;$ANDROID_PLATFORM" \
    "build-tools;$ANDROID_BUILD_TOOLS_VERSION" \
    "ndk;$ANDROID_NDK_VERSION" \
    "cmake;$ANDROID_CMAKE_VERSION"
}

write_android_local_properties() {
  log "Writing android/local.properties"
  cat >"$ANDROID_DIR/local.properties" <<EOF
sdk.dir=$ANDROID_SDK_ROOT
EOF
}

warm_gradle() {
  log "Warming Gradle"
  cd "$ANDROID_DIR"
  ./gradlew --no-daemon help
}

persist_environment() {
  if [[ "$PERSIST_ENVIRONMENT" != "1" ]]; then
    log "Skipping shell profile updates (set CODEX_CLOUD_PERSIST_ENV=1 to enable)"
    return
  fi

  log "Persisting Android environment to $PROFILE_FILE"
  append_profile_export "export ANDROID_SDK_ROOT=\"$ANDROID_SDK_ROOT\""
  append_profile_export "export ANDROID_HOME=\"$ANDROID_HOME\""
  append_profile_export "export PATH=\"$ANDROID_CMDLINE_TOOLS_DIR/bin:$ANDROID_SDK_ROOT/platform-tools:\$PATH\""
}

main() {
  log "Using ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
  preflight_checks
  mkdir -p "$ANDROID_SDK_ROOT"
  persist_environment
  install_node_dependencies
  install_ruby_dependencies
  install_android_cmdline_tools
  install_android_packages
  write_android_local_properties
  warm_gradle

  if [[ "${CODEX_CLOUD_RUN_VERIFY:-0}" == "1" ]]; then
    "$ROOT_DIR/scripts/codex-cloud-verify.sh"
  fi
}

main "$@"
