package com.hihonor.contacts.snapbridge;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;

/** يستعيد أسماء Snapchat الحقيقية بعد أن يستبدلها Honor بـ «البيانات الحساسة مخفية». */
public final class SnapCallLogNameGuard {
    private SnapCallLogNameGuard() {}

    public static int restoreAll(Context context) {
        int fixed = 0;
        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[] {
                            CallLog.Calls._ID,
                            CallLog.Calls.NUMBER,
                            CallLog.Calls.CACHED_NAME,
                            CallLog.Calls.CACHED_FORMATTED_NUMBER,
                            "phone_account_address"
                    },
                    CallLog.Calls.CACHED_NAME + " LIKE ? OR "
                            + CallLog.Calls.CACHED_FORMATTED_NUMBER + " LIKE ? OR "
                            + CallLog.Calls.PHONE_ACCOUNT_ID + "=?",
                    new String[] {
                            "%(Snapchat)%",
                            "%(Snapchat)%",
                            SnapPhoneAccount.ACCOUNT_ID
                    },
                    CallLog.Calls.DATE + " DESC LIMIT 80");
            if (cursor == null) return 0;
            while (cursor.moveToNext()) {
                if (restoreRow(context, cursor)) fixed++;
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        if (fixed > 0) {
            SnapEventStore.append(context, "✓ استُعيد اسم Snapchat لـ " + fixed + " سجل");
        }
        return fixed;
    }

    private static boolean restoreRow(Context context, Cursor cursor) {
        long id = cursor.getLong(0);
        String number = cursor.getString(1);
        String cached = cursor.getString(2);
        String formatted = cursor.getString(3);
        String address = cursor.getString(4);

        String realName = resolveRealName(context, number, address, cached, formatted);
        if (realName == null || realName.isEmpty()) return false;

        String currentLabel = cached != null ? cached.replace(" (Snapchat)", "").trim() : "";
        String currentFormatted = formatted != null ? formatted.trim() : "";
        if (realName.equals(currentLabel) && realName.equals(currentFormatted)) {
            return false;
        }
        if (!SnapNameHelper.isHiddenSensitivePlaceholder(currentLabel)
                && !SnapNameHelper.isGenericAppName(currentLabel)
                && !SnapNameHelper.isSnapAddress(currentLabel)
                && !realName.equals(currentLabel)) {
            return false;
        }
        if (!SnapNameHelper.isHiddenSensitivePlaceholder(currentFormatted)
                && !SnapNameHelper.isGenericAppName(currentFormatted)
                && !SnapNameHelper.isSnapAddress(currentFormatted)
                && !realName.equals(currentFormatted)) {
            return false;
        }

        ContentValues values = new ContentValues();
        values.put(CallLog.Calls.CACHED_NAME, realName + " (Snapchat)");
        values.put(CallLog.Calls.CACHED_FORMATTED_NUMBER, realName);
        Uri uri = CallLog.Calls.CONTENT_URI.buildUpon().appendPath(String.valueOf(id)).build();
        return context.getContentResolver().update(uri, values, null, null) > 0;
    }

    static String resolveRealName(Context context, String number, String address,
                                  String cached, String formatted) {
        String fromStore = "";
        if (address != null && !address.isEmpty()) {
            fromStore = SnapUserStore.getDisplayName(context, address);
        }
        if (SnapNameHelper.isGenericAppName(fromStore) && number != null && !number.isEmpty()) {
            fromStore = SnapUserStore.getDisplayName(context, number);
        }
        if (!SnapNameHelper.isGenericAppName(fromStore)) return SnapNameHelper.clean(fromStore);

        if (!SnapNameHelper.isHiddenSensitivePlaceholder(formatted)
                && !SnapNameHelper.isGenericAppName(formatted)) {
            return SnapNameHelper.clean(formatted);
        }
        if (!SnapNameHelper.isHiddenSensitivePlaceholder(cached)
                && !SnapNameHelper.isGenericAppName(cached)) {
            return SnapNameHelper.clean(cached.replace(" (Snapchat)", ""));
        }
        String last = LastSnapStore.getName(context);
        if (!SnapNameHelper.isGenericAppName(last)) return SnapNameHelper.clean(last);
        return null;
    }
}
