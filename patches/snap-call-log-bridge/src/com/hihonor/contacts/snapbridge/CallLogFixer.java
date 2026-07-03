package com.hihonor.contacts.snapbridge;

import android.content.ComponentName;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.CallLog;
import android.util.Log;

public final class CallLogFixer {
    private static final String TAG = "SnapCallLogBridge";

    private CallLogFixer() {}

    /**
     * Fixes Snapchat entries that store the display name in NUMBER (causes «الاتصال على null»).
     * NUMBER must be the snap address; CACHED_FORMATTED_NUMBER holds the visible name.
     */
    public static int fixSnapEntries(Context context) {
        int fixed = 0;
        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[] {CallLog.Calls._ID, CallLog.Calls.NUMBER, CallLog.Calls.CACHED_NAME},
                    CallLog.Calls.CACHED_NAME + " LIKE ?",
                    new String[] {"%(Snapchat)%"},
                    CallLog.Calls.DATE + " DESC");
            if (cursor == null) return 0;
            while (cursor.moveToNext()) {
                long id = cursor.getLong(0);
                String number = cursor.getString(1);
                String cached = cursor.getString(2);
                if (number != null && number.startsWith("snap:")) continue;

                String displayName = displayNameFrom(number, cached);
                String address = SnapUserStore.addressFor(displayName, "");
                SnapUserStore.save(context, address, displayName, "");

                ContentValues values = new ContentValues();
                values.put(CallLog.Calls.NUMBER, address);
                values.put(CallLog.Calls.CACHED_FORMATTED_NUMBER, displayName);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    ComponentName cn = new ComponentName(context, SnapConnectionService.class);
                    values.put(CallLog.Calls.PHONE_ACCOUNT_COMPONENT_NAME, cn.flattenToString());
                    values.put(CallLog.Calls.PHONE_ACCOUNT_ID, SnapPhoneAccount.ACCOUNT_ID);
                    values.put("phone_account_address", address);
                }
                Uri uri = CallLog.Calls.CONTENT_URI.buildUpon()
                        .appendPath(String.valueOf(id)).build();
                if (context.getContentResolver().update(uri, values, null, null) > 0) {
                    fixed++;
                    Log.i(TAG, "Fixed entry id=" + id + " -> " + address);
                }
            }
        } catch (SecurityException se) {
            SnapEventStore.append(context, "لا يمكن إصلاح السجل — صلاحية مطلوبة");
        } catch (Exception e) {
            Log.w(TAG, "fixSnapEntries failed", e);
        } finally {
            if (cursor != null) cursor.close();
        }
        if (fixed > 0) {
            SnapEventStore.append(context, "✓ أُصلح " + fixed + " سجل للاتصال");
        }
        return fixed;
    }

    private static String displayNameFrom(String number, String cached) {
        if (number != null && !number.isEmpty() && !number.startsWith("snap:")) {
            return number;
        }
        if (cached != null) {
            return cached.replace(" (Snapchat)", "").trim();
        }
        return "Snapchat";
    }
}
