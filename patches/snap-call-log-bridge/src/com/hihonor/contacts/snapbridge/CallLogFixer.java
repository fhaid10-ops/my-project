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
                String displayName = resolveDisplayName(context, number, cached);
                String snapUser = "";
                if (number != null && number.startsWith("snap")) {
                    snapUser = SnapUserStore.getSnapUser(context,
                            SnapUserStore.resolveAddress(context, number));
                }
                String address = SnapUserStore.addressFor(displayName, snapUser);
                String dialId = SnapUserStore.dialIdForAddress(address);
                SnapUserStore.save(context, address, displayName, snapUser);

                if (dialId.equals(number) && hasPhoneAccount(context, id)) {
                    continue;
                }

                ContentValues values = new ContentValues();
                values.put(CallLog.Calls.NUMBER, dialId);
                values.put(CallLog.Calls.CACHED_FORMATTED_NUMBER, displayName);
                putPhoneAccount(context, values, address);
                Uri uri = CallLog.Calls.CONTENT_URI.buildUpon()
                        .appendPath(String.valueOf(id)).build();
                if (context.getContentResolver().update(uri, values, null, null) > 0) {
                    fixed++;
                    SnapContactSync.upsert(context, displayName, dialId);
                    Log.i(TAG, "Fixed entry id=" + id + " dial=" + dialId);
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
            SnapEventStore.append(context, "✓ أُصلح " + fixed + " سجل للاتصال من السجل");
        }
        return fixed;
    }

    private static void putPhoneAccount(Context context, ContentValues values, String address) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ComponentName cn = new ComponentName(context, SnapConnectionService.class);
            values.put(CallLog.Calls.PHONE_ACCOUNT_COMPONENT_NAME, cn.flattenToString());
            values.put(CallLog.Calls.PHONE_ACCOUNT_ID, SnapPhoneAccount.ACCOUNT_ID);
            values.put("phone_account_address", address);
        }
    }

    private static String resolveDisplayName(Context context, String number, String cached) {
        if (number != null && !number.isEmpty() && !number.startsWith("snap")
                && !SnapUserStore.isSnapDialId(number)) {
            return number;
        }
        if (number != null && (number.startsWith("snap") || SnapUserStore.isSnapDialId(number))) {
            String fromStore = SnapUserStore.getDisplayName(context, number);
            if (fromStore != null && !fromStore.startsWith("snap")) return fromStore;
            if (number.startsWith("snap:")) {
                String suffix = number.substring(5);
                if (suffix.contains("%")) return Uri.decode(suffix);
            }
        }
        if (cached != null) {
            return cached.replace(" (Snapchat)", "").trim();
        }
        return "Snapchat";
    }

    private static boolean hasPhoneAccount(Context context, long id) {
        Cursor c = null;
        try {
            Uri uri = CallLog.Calls.CONTENT_URI.buildUpon().appendPath(String.valueOf(id)).build();
            c = context.getContentResolver().query(uri,
                    new String[] {"phone_account_address"}, null, null, null);
            if (c != null && c.moveToFirst()) {
                String addr = c.getString(0);
                return addr != null && !addr.isEmpty();
            }
        } catch (Exception ignored) {
        } finally {
            if (c != null) c.close();
        }
        return false;
    }
}
