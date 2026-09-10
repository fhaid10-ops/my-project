#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
WORK="${WORK:-/tmp/drupe-build}"
ANDROID_HOME="${ANDROID_HOME:-/home/ubuntu/android-sdk}"
BT="$ANDROID_HOME/build-tools/35.0.0"
KEYSTORE="$ROOT/debug.keystore"
APKS_INPUT="${1:-$WORK/drupe_3.26.2.0.apks}"

if [ ! -f "$APKS_INPUT" ]; then
  echo "Usage: $0 [path/to/drupe_3.26.2.0.apks]"
  echo "APKS file not found: $APKS_INPUT"
  exit 1
fi

rm -rf "$WORK/extract" "$WORK/merge" "$WORK/decode"
mkdir -p "$WORK/extract" "$WORK/merge"

echo "==> Extracting APKS"
unzip -q "$APKS_INPUT" -d "$WORK/extract"

echo "==> Merging split APKs into universal"
mkdir -p "$WORK/merge/base"
unzip -q "$WORK/extract/base.apk" -d "$WORK/merge/base"
unzip -qo "$WORK/extract/split_config.arm64_v8a.apk" "lib/*" -d "$WORK/merge/base"
unzip -qo "$WORK/extract/split_config.xxxhdpi.apk" "res/*" -d "$WORK/merge/base"
(cd "$WORK/merge/base" && zip -qr "$WORK/merge/universal_unsigned.apk" .)

echo "==> Decoding smali only"
apktool d -r -f -o "$WORK/decode" "$WORK/merge/universal_unsigned.apk"

echo "==> Applying 3.26.2 caller ID login patches"
cp "$ROOT/smali-3.26.2/mobi/drupe/app/overlay/HorizontalOverlayView.smali" \
  "$WORK/decode/smali_classes7/mobi/drupe/app/overlay/"
cp "$ROOT/smali-3.26.2/mobi/drupe/app/activities/login_and_upload_contacts/b.smali" \
  "$WORK/decode/smali_classes7/mobi/drupe/app/activities/login_and_upload_contacts/"

echo "==> Rebuilding APK"
apktool b -f -o "$WORK/rebuilt_unsigned.apk" "$WORK/decode"

if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias drupefix -keyalg RSA \
    -keysize 2048 -validity 10000 -storepass android -keypass android \
    -dname "CN=Drupe Caller ID Fix"
fi

"$BT/zipalign" -f -p 4 "$WORK/rebuilt_unsigned.apk" "$WORK/rebuilt_aligned.apk"
"$BT/apksigner" sign --min-sdk-version 25 \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --ks "$KEYSTORE" --ks-pass pass:android --key-pass pass:android \
  --out "$ROOT/drupe_3.26.2_patched_callerid.apk" "$WORK/rebuilt_aligned.apk"

# Also sign the merged universal (unpatched) for install testing
"$BT/zipalign" -f -p 4 "$WORK/merge/universal_unsigned.apk" "$WORK/universal_aligned.apk"
"$BT/apksigner" sign --min-sdk-version 25 \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --ks "$KEYSTORE" --ks-pass pass:android --key-pass pass:android \
  --out "$ROOT/drupe_3.26.2_universal.apk" "$WORK/universal_aligned.apk"

echo "Built:"
ls -lh "$ROOT/drupe_3.26.2_universal.apk" "$ROOT/drupe_3.26.2_patched_callerid.apk"
