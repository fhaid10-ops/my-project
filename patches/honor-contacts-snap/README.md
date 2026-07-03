# Honor Contacts — Snapchat Call Log Bridge

Patched `com.hihonor.contacts` v18.1.15.605 to show Snapchat calls in the native call history (similar to iPhone CallKit).

## Changes

1. **VoIP call log query** — adds `include_voip_calls=true` when loading call history (Android 16 unified call history).
2. **SnapCallLogSyncService** — `NotificationListenerService` that watches Snapchat (`com.snapchat.android`) call notifications and writes them to `CallLog.Calls`.
3. **SnapCallLogBootReceiver** — logs a reminder on boot if notification access is not granted.

## Install

> System app replacement requires ADB or root. Unsigned system APK cannot replace the stock app without matching signature.

1. Enable **USB debugging** on the Honor device.
2. Uninstall updates or disable the stock Contacts app if needed (system apps may require `adb shell pm uninstall -k --user 0` only for updates).
3. Install via ADB:
   ```bash
   adb install -r honor_contacts_18.1.15.605_snap_call_log.apk
   ```
   For system-level install (advanced):
   ```bash
   adb push honor_contacts_18.1.15.605_snap_call_log.apk /data/local/tmp/
   adb shell pm install -r --user 0 /data/local/tmp/honor_contacts_18.1.15.605_snap_call_log.apk
   ```
4. Open **Settings → Apps → Special access → Notification access** (الوصول للإشعارات).
5. Enable access for **Contacts** / **جهات الاتصال**.
6. Make a Snapchat test call — it should appear in **Call history** with `(Snapchat)` suffix.

## Files

| File | Description |
|------|-------------|
| `honor_contacts_18.1.15.605_snap_call_log.apk` | Patched signed APK |
| `src/` | Java source for bridge service |

## Limitations

- Requires user to grant notification access manually.
- Depends on Snapchat notification text (may break if Snapchat changes notification format).
- Patched APK uses a debug signature — not a drop-in replacement for the factory system signature without root/ADB.
