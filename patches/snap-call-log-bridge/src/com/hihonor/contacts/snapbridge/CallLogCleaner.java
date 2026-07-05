package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;
import android.util.Log;

public final class CallLogCleaner {
    private static final String TAG = "SnapCallLogBridge";

    private CallLogCleaner() {}

    /** Removes legacy hash-only entries like snap:90463b2d (v1.0–1.2). */
    public static int cleanLegacy(Context context) {
        int deleted = 0;
        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[] {CallLog.Calls._ID, CallLog.Calls.NUMBER},
                    CallLog.Calls.NUMBER + " LIKE ?",
                    new String[] {"snap:%"},
                    CallLog.Calls.DATE + " DESC");
            if (cursor == null) return 0;
            while (cursor.moveToNext()) {
                long id = cursor.getLong(0);
                String number = cursor.getString(1);
                if (!isLegacyHashOnly(number)) continue;
                if (deleteById(context, id)) {
                    deleted++;
                    Log.i(TAG, "Deleted legacy entry: " + number);
                }
            }
        } catch (SecurityException se) {
            SnapEventStore.append(context, "لا يمكن الحذف — صلاحية سجل المكالمات مطلوبة");
        } catch (Exception e) {
            Log.w(TAG, "cleanLegacy failed", e);
        } finally {
            if (cursor != null) cursor.close();
        }
        if (deleted > 0) {
            SnapEventStore.append(context, "✓ حُذف " + deleted + " سجل قديم (snap:hash)");
        }
        return deleted;
    }

    private static boolean isLegacyHashOnly(String number) {
        if (number == null || !number.startsWith("snap:")) return false;
        String rest = number.substring(5);
        if (rest.contains("%")) return false;
        return rest.matches("[0-9a-f]{6,32}");
    }

    private static boolean deleteById(Context context, long id) {
        try {
            Uri uri = CallLog.Calls.CONTENT_URI.buildUpon().appendPath(String.valueOf(id)).build();
            int rows = context.getContentResolver().delete(uri, null, null);
            return rows > 0;
        } catch (Exception e) {
            return false;
        }
    }
}
