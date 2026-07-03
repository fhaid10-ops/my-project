#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD="$ROOT/build"
ANDROID_HOME="${ANDROID_HOME:-/home/ubuntu/android-sdk}"
BT="$ANDROID_HOME/build-tools/35.0.0"
PLATFORM="$ANDROID_HOME/platforms/android-34/android.jar"
KEYSTORE="$ROOT/debug.keystore"

rm -rf "$BUILD"
mkdir -p "$BUILD/gen" "$BUILD/classes" "$BUILD/apk"

# Generate R.java and compile resources
"$BT/aapt" package -f -M "$ROOT/AndroidManifest.xml" -S "$ROOT/res" \
  -I "$PLATFORM" -m -J "$BUILD/gen" -F "$BUILD/apk/resources.ap_" 2>&1

# Compile Java
javac --release 17 -cp "$PLATFORM:$BUILD/gen" -d "$BUILD/classes" \
  "$BUILD/gen/com/hihonor/contacts/snapbridge/R.java" \
  "$ROOT/src/com/hihonor/contacts/snapbridge/"*.java

# Dex
"$BT/d8" --lib "$PLATFORM" --output "$BUILD" "$BUILD/classes/com/hihonor/contacts/snapbridge/"*.class

# Package APK (resources + manifest)
"$BT/aapt" package -f -M "$ROOT/AndroidManifest.xml" -S "$ROOT/res" \
  -I "$PLATFORM" -F "$BUILD/unsigned.apk"

# Add dex
"$BT/aapt" add "$BUILD/unsigned.apk" "$BUILD/classes.dex"

# Sign
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias snapbridge -keyalg RSA \
    -keysize 2048 -validity 10000 -storepass android -keypass android \
    -dname "CN=Snap Call Log Bridge"
fi
"$BT/zipalign" -f 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
"$BT/apksigner" sign --min-sdk-version 26 --ks "$KEYSTORE" --ks-pass pass:android \
  --key-pass pass:android --out "$ROOT/snap_call_log_bridge.apk" "$BUILD/aligned.apk"

echo "Built: $ROOT/snap_call_log_bridge.apk"
ls -la "$ROOT/snap_call_log_bridge.apk"
