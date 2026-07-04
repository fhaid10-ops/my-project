package com.hihonor.contacts.snapbridge;

import android.content.ComponentName;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.CallLog;
import android.util.Log;

public final class CallLogWriter {
    private static final String TAG = "SnapCallLogBridge";
    private static final long DEDUP_WINDOW_MS = 90_000L;
    private static final long UPGRADE_LOOKBACK_MS = 10 * 60 * 1000L;

    private CallLogWriter() {}

    /** يكتب فائت أو يحوّل واردة حديثة إلى فائت ثم يضيفها للفقاعة. */
    public static boolean writeMissedSnap(Context context, String displayName, String snapUsername,
                                          long when, String reason) {
        String address = SnapUserStore.addressFor(displayName, snapUsername);
        String dialId = SnapUserStore.dialIdForAddress(address);
        SnapUserStore.save(context, address, displayName, snapUsername);

        long existingId = findRecentSnapRow(context, dialId, when,
                CallLog.Calls.INCOMING_TYPE);
        if (existingId > 0 && upgradeToMissed(context, existingId, displayName, when)) {
            SnapEventStore.append(context, "✓ تحويل واردة إلى فائت: " + displayName + " (" + reason + ")");
            enqueueMissed(context, existingId, displayName, dialId, address, when, reason);
            return true;
        }

        long missedId = findRecentSnapRow(context, dialId, when, CallLog.Calls.MISSED_TYPE);
        if (missedId > 0) {
            enqueueMissed(context, missedId, displayName, dialId, address, when, reason);
            return true;
        }

        return write(context, displayName, snapUsername, CallLog.Calls.MISSED_TYPE,
                when, reason, "Snapchat", true);
    }

    public static boolean write(Context context, String displayName, String snapUsername,
                                int type, long when, String reason,
                                String sourceLabel, boolean enableSnapCallback) {
        String appLabel = safeLabel(sourceLabel);
        String label = displayName + " (" + appLabel + ")";
        String address = null;
        String dialId = displayName;
        if (enableSnapCallback) {
            address = SnapUserStore.addressFor(displayName, snapUsername);
            dialId = SnapUserStore.dialIdForAddress(address);
            SnapUserStore.save(context, address, displayName, snapUsername);
        }
        if (isDuplicate(context, label, dialId, type, when, enableSnapCallback)) {
            SnapEventStore.append(context, "تخطي مكرر: " + label);
            if (type == CallLog.Calls.MISSED_TYPE && enableSnapCallback) {
                long existing = findRecentSnapRow(context, dialId, when, CallLog.Calls.MISSED_TYPE);
                if (existing <= 0) {
                    existing = findRecentSnapRow(context, dialId, when, CallLog.Calls.INCOMING_TYPE);
                }
                if (existing > 0) {
                    enqueueMissed(context, existing, displayName, dialId, address, when, reason);
                    return true;
                }
            }
            return false;
        }

        ContentValues values = new ContentValues();
        values.put(CallLog.Calls.NUMBER, dialId);
        values.put(CallLog.Calls.CACHED_NAME, label);
        values.put(CallLog.Calls.CACHED_FORMATTED_NUMBER, displayName);
        values.put(CallLog.Calls.GEOCODED_LOCATION, appLabel);
        values.put(CallLog.Calls.TYPE, type);
        values.put(CallLog.Calls.DATE, when);
        values.put(CallLog.Calls.DURATION, 0);
        boolean isMissed = type == CallLog.Calls.MISSED_TYPE;
        values.put(CallLog.Calls.NEW, isMissed ? 1 : 0);
        values.put(CallLog.Calls.IS_READ, isMissed ? 0 : 1);
        values.put(CallLog.Calls.FEATURES, 0x4);

        if (enableSnapCallback && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ComponentName cn = new ComponentName(context, SnapConnectionService.class);
            values.put(CallLog.Calls.PHONE_ACCOUNT_COMPONENT_NAME, cn.flattenToString());
            values.put(CallLog.Calls.PHONE_ACCOUNT_ID, SnapPhoneAccount.ACCOUNT_ID);
            values.put("phone_account_address", address);
        }

        try {
            Uri uri = context.getContentResolver().insert(CallLog.Calls.CONTENT_URI, values);
            if (uri == null) {
                SnapEventStore.append(context, "فشل الكتابة في السجل — تحقق من صلاحية سجل المكالمات");
                return false;
            }
            SnapEventStore.append(context, "✓ أُضيف للسجل: " + label + " (" + reason + ")");
            Log.i(TAG, "Logged: " + label + " dial=" + dialId);
            if (enableSnapCallback) {
                SnapContactSync.upsert(context, displayName, dialId);
            }
            long rowId = ContentUris.parseId(uri);
            if (isMissed) {
                enqueueMissed(context, rowId, displayName, dialId, address, when, reason);
            } else if (type == CallLog.Calls.INCOMING_TYPE) {
                SnapEventStore.append(context, "ℹ مكالمة واردة Snapchat (ستُضاف للفقاعة عند الانتهاء)");
            }
            return true;
        } catch (SecurityException se) {
            SnapEventStore.append(context, "مرفوض: صلاحية سجل المكالمات غير ممنوحة");
            Log.w(TAG, "SecurityException writing call log", se);
            return false;
        } catch (Exception e) {
            SnapEventStore.append(context, "خطأ: " + e.getMessage());
            Log.w(TAG, "write failed", e);
            return false;
        }
    }

    private static void enqueueMissed(Context context, long rowId, String displayName,
                                      String dialId, String address, long when, String reason) {
        String idStr = String.valueOf(rowId);
        if (MissedCallDismissStore.isDismissed(context, idStr)) return;
        if (MissedCallQueueStore.byId(context, idStr) != null) {
            MissedCallOverlayController.refresh(context);
            return;
        }
        MissedCallQueueStore.Item item = MissedCallQueueStore.build(
                context,
                idStr,
                displayName,
                dialId,
                address != null ? address : "",
                true,
                when,
                "Snapchat",
                SnapPhoneAccount.ACCOUNT_ID);
        if (MissedCallQueueStore.enqueue(context, item)) {
            SnapEventStore.append(context, "✓ أُضيف للفقاعة: " + displayName + " (" + reason + ")");
            MissedCallOverlayController.refresh(context);
        }
    }

    private static long findRecentSnapRow(Context context, String dialId, long when, int type) {
        if (dialId == null || dialId.isEmpty()) return -1;
        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[] {CallLog.Calls._ID},
                    CallLog.Calls.NUMBER + "=? AND " + CallLog.Calls.TYPE + "=? AND "
                            + CallLog.Calls.PHONE_ACCOUNT_ID + "=? AND "
                            + CallLog.Calls.DATE + ">=?",
                    new String[] {
                            dialId,
                            String.valueOf(type),
                            SnapPhoneAccount.ACCOUNT_ID,
                            String.valueOf(when - UPGRADE_LOOKBACK_MS)
                    },
                    CallLog.Calls.DATE + " DESC LIMIT 1");
            if (cursor != null && cursor.moveToFirst()) {
                return cursor.getLong(0);
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return -1;
    }

    private static boolean upgradeToMissed(Context context, long rowId, String displayName, long when) {
        try {
            ContentValues values = new ContentValues();
            values.put(CallLog.Calls.TYPE, CallLog.Calls.MISSED_TYPE);
            values.put(CallLog.Calls.NEW, 1);
            values.put(CallLog.Calls.IS_READ, 0);
            values.put(CallLog.Calls.DATE, when);
            values.put(CallLog.Calls.CACHED_FORMATTED_NUMBER, displayName);
            Uri uri = CallLog.Calls.CONTENT_URI.buildUpon()
                    .appendPath(String.valueOf(rowId)).build();
            return context.getContentResolver().update(uri, values, null, null) > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private static String safeLabel(String sourceLabel) {
        if (sourceLabel == null || sourceLabel.trim().isEmpty()) {
            return "VoIP";
        }
        String s = sourceLabel.trim();
        return s.length() > 32 ? s.substring(0, 32) : s;
    }

    private static boolean isDuplicate(Context context, String cachedName, String dialId,
                                       int type, long now, boolean isSnap) {
        Uri uri = CallLog.Calls.CONTENT_URI.buildUpon().appendQueryParameter("limit", "20").build();
        String selection = CallLog.Calls.CACHED_NAME + "=? AND " + CallLog.Calls.TYPE + "=? AND "
                + CallLog.Calls.DATE + ">?";
        String[] args = new String[] {cachedName, String.valueOf(type), String.valueOf(now - DEDUP_WINDOW_MS)};
        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(uri, new String[] {CallLog.Calls._ID}, selection, args, null);
            if (cursor != null && cursor.moveToFirst()) return true;
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        if (!isSnap || dialId == null || dialId.isEmpty()) return false;
        if (type != CallLog.Calls.MISSED_TYPE) return false;
        try {
            cursor = context.getContentResolver().query(
                    uri,
                    new String[] {CallLog.Calls._ID},
                    CallLog.Calls.NUMBER + "=? AND " + CallLog.Calls.TYPE + "=? AND "
                            + CallLog.Calls.DATE + ">?",
                    new String[] {dialId, String.valueOf(CallLog.Calls.MISSED_TYPE),
                            String.valueOf(now - DEDUP_WINDOW_MS)},
                    null);
            return cursor != null && cursor.moveToFirst();
        } catch (Exception e) {
            return false;
        } finally {
            if (cursor != null) cursor.close();
        }
    }
}
