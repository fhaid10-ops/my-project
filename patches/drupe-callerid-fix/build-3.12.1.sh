#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
WORK="${WORK:-/tmp/drupe-build-3121}"
ANDROID_HOME="${ANDROID_HOME:-/home/ubuntu/android-sdk}"
BT="$ANDROID_HOME/build-tools/35.0.0"
KEYSTORE="$ROOT/debug.keystore"
APK_INPUT="${1:-$ROOT/drupe_3.12.1_original_resigned.apk}"

if [ ! -f "$APK_INPUT" ]; then
  echo "Usage: $0 [path/to/drupe_3.12.1.apk]"
  echo "APK file not found: $APK_INPUT"
  exit 1
fi

rm -rf "$WORK/decode"
mkdir -p "$WORK"

echo "==> Decoding APK"
apktool d -r -f -o "$WORK/decode" "$APK_INPUT"

echo "==> Applying 3.12.1 caller ID login patches"
cp "$ROOT/HorizontalOverlayView.smali" \
  "$WORK/decode/smali_classes3/mobi/drupe/app/overlay/"
cp "$ROOT/LoginAndUploadContactsActivityViewModel.smali" \
  "$WORK/decode/smali_classes3/mobi/drupe/app/activities/login_and_upload_contacts/"
cp "$ROOT/LoginAndUploadContactsActivity.smali" \
  "$WORK/decode/smali_classes3/mobi/drupe/app/activities/login_and_upload_contacts/"
cp "$ROOT/GoogleLoginHelper.smali" \
  "$WORK/decode/smali_classes3/me/sync/caller_id_sdk/publics/"

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
  --out "$ROOT/drupe_3.12.1_patched_callerid.apk" "$WORK/rebuilt_aligned.apk"

echo "Built: $ROOT/drupe_3.12.1_patched_callerid.apk"
ls -lh "$ROOT/drupe_3.12.1_patched_callerid.apk"
