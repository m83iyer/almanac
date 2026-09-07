#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NATIVE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$NATIVE_ROOT/../.." && pwd)"
TODAY="$(date +%F)"
ARTIFACT_ROOT="/Volumes/Media/AutomationStore/project-artifacts/almanac/$TODAY/almanac-native"
SCRATCH_PATH="$ARTIFACT_ROOT/swift-build"
STAGE_ROOT="$ARTIFACT_ROOT/app-stage"
APP_PATH="${1:-/Applications/Almanac.app}"
ICON_SOURCE="$PROJECT_ROOT/app/assets/icon-1024.png"

if [[ ! -d /Volumes/Media ]]; then
  echo "Almanac packaging stopped: /Volumes/Media is unavailable." >&2
  exit 1
fi
if [[ ! -f "$ICON_SOURCE" ]]; then
  echo "Almanac packaging stopped: missing icon source at $ICON_SOURCE" >&2
  exit 1
fi

mkdir -p "$ARTIFACT_ROOT" "$SCRATCH_PATH"
/usr/bin/swift build --package-path "$NATIVE_ROOT" --scratch-path "$SCRATCH_PATH" -c release

if [[ -e "$STAGE_ROOT" ]]; then
  /bin/rm -rf "$STAGE_ROOT"
fi
mkdir -p "$STAGE_ROOT/Almanac.app/Contents/MacOS" "$STAGE_ROOT/Almanac.app/Contents/Resources"

/usr/bin/ditto "$NATIVE_ROOT/Resources/Info.plist" "$STAGE_ROOT/Almanac.app/Contents/Info.plist"
/usr/bin/ditto "$SCRATCH_PATH/release/Almanac" "$STAGE_ROOT/Almanac.app/Contents/MacOS/Almanac"
/bin/chmod 755 "$STAGE_ROOT/Almanac.app/Contents/MacOS/Almanac"

ICONSET="$ARTIFACT_ROOT/Almanac.iconset"
if [[ -e "$ICONSET" ]]; then
  /bin/rm -rf "$ICONSET"
fi
mkdir -p "$ICONSET"

while read -r pixels filename; do
  /usr/bin/sips -z "$pixels" "$pixels" "$ICON_SOURCE" --out "$ICONSET/$filename" >/dev/null
done <<'SIZES'
16 icon_16x16.png
32 icon_16x16@2x.png
32 icon_32x32.png
64 icon_32x32@2x.png
128 icon_128x128.png
256 icon_128x128@2x.png
256 icon_256x256.png
512 icon_256x256@2x.png
512 icon_512x512.png
1024 icon_512x512@2x.png
SIZES

/usr/bin/iconutil -c icns "$ICONSET" -o "$STAGE_ROOT/Almanac.app/Contents/Resources/Almanac.icns"
/usr/bin/codesign --force --deep --sign - "$STAGE_ROOT/Almanac.app"

if [[ "$(basename "$APP_PATH")" != "Almanac.app" ]]; then
  echo "Refusing to install to unexpected app target: $APP_PATH" >&2
  exit 1
fi
if [[ -e "$APP_PATH" ]]; then
  /bin/rm -rf "$APP_PATH"
fi
/usr/bin/ditto "$STAGE_ROOT/Almanac.app" "$APP_PATH"
/usr/bin/codesign --verify --deep --strict --verbose=2 "$APP_PATH"

echo "$APP_PATH"
