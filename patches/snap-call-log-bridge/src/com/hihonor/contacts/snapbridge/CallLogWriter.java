package com.hihonor.contacts.snapbridge;

import android.content.ComponentName;
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

    private CallLogWriter() {}

    public static boolean write(Context context, String displayName, String snapUsername,
                                int type, long when, String reason) {
        String label = displayName + " (Snapchat)";
        if (isDuplicate(context, label, type, when)) {
            SnapEventStore.append(context, "تخطي مكرر: " + label);
            return false;
        }
        String address = SnapUserStore.addressFor(displayName, snapUsername);
        String dialId = SnapUserStore.dialIdForAddress(address);
        SnapUserStore.save(context, address, displayName, snapUsername);

        ContentValues values = new ContentValues();
        values.put(CallLog.Calls.NUMBER, dialId);
        values.put(CallLog.Calls.CACHED_NAME, label);
        values.put(CallLog.Calls.CACHED_FORMATTED_NUMBER, displayName);
        values.put(CallLog.Calls.GEOCODED_LOCATION, "Snapchat");
        values.put(CallLog.Calls.TYPE, type);
        values.put(CallLog.Calls.DATE, when);
        values.put(CallLog.Calls.DURATION, 0);
        values.put(CallLog.Calls.NEW, 1);
        values.put(CallLog.Calls.FEATURES, 0x4);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
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
            SnapContactSync.upsert(context, displayName, dialId);
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

    private static boolean isDuplicate(Context context, String cachedName, int type, long now) {
        Uri uri = CallLog.Calls.CONTENT_URI.buildUpon().appendQueryParameter("limit", "20").build();
        String selection = CallLog.Calls.CACHED_NAME + "=? AND " + CallLog.Calls.TYPE + "=? AND "
                + CallLog.Calls.DATE + ">?";
        String[] args = new String[] {cachedName, String.valueOf(type), String.valueOf(now - DEDUP_WINDOW_MS)};
        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(uri, new String[] {CallLog.Calls._ID}, selection, args, null);
            return cursor != null && cursor.moveToFirst();
        } catch (Exception e) {
            return false;
        } finally {
            if (cursor != null) cursor.close();
        }
    }
}
