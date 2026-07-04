package com.hihonor.contacts.snapbridge;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;

public final class MissedCallScanner {
    private MissedCallScanner() {}

    public static int enqueuePhoneMissedSince(Context context, long sinceMs) {
        return scan(context, sinceMs, false, false);
    }

    public static int enqueueAllMissedSince(Context context, long sinceMs, boolean markUnread) {
        return scan(context, sinceMs, true, markUnread);
    }

    private static int scan(Context context, long sinceMs, boolean includeSnap, boolean markUnread) {
        int queued = 0;
        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[] {
                            CallLog.Calls._ID,
                            CallLog.Calls.NUMBER,
                            CallLog.Calls.CACHED_NAME,
                            CallLog.Calls.NEW,
                            CallLog.Calls.IS_READ,
                            CallLog.Calls.PHONE_ACCOUNT_ID,
                            "phone_account_address",
                            CallLog.Calls.DATE,
                            CallLog.Calls.GEOCODED_LOCATION
                    },
                    CallLog.Calls.TYPE + "=? AND " + CallLog.Calls.DATE + ">=?",
                    new String[] {
                            String.valueOf(CallLog.Calls.MISSED_TYPE),
                            String.valueOf(sinceMs)
                    },
                    CallLog.Calls.DATE + " DESC");
            if (cursor == null) return 0;
            while (cursor.moveToNext()) {
                long id = cursor.getLong(0);
                String number = cursor.getString(1);
                String cachedName = cursor.getString(2);
                int isNew = cursor.getInt(3);
                int isRead = cursor.getInt(4);
                String phoneAccountId = cursor.getString(5);
                String phoneAccountAddress = cursor.getString(6);
                long callDate = cursor.getLong(7);
                String geoLabel = cursor.getString(8);

                boolean isSnap = isSnapEntry(phoneAccountId, cachedName);
                if (!includeSnap && isSnap) continue;
                if (!isTargetEntry(number, cachedName, phoneAccountId)) continue;
                String idStr = String.valueOf(id);
                if (MissedCallDismissStore.isDismissed(context, idStr)) continue;

                if (markUnread && !(isNew == 1 && isRead == 0)) {
                    ContentValues values = new ContentValues();
                    values.put(CallLog.Calls.NEW, 1);
                    values.put(CallLog.Calls.IS_READ, 0);
                    Uri row = CallLog.Calls.CONTENT_URI.buildUpon()
                            .appendPath(String.valueOf(id))
                            .build();
                    context.getContentResolver().update(row, values, null, null);
                }

                String displayName = resolveDisplayName(number, cachedName);
                String snapAddress = "";
                if (isSnap) {
                    if (phoneAccountAddress != null && !phoneAccountAddress.isEmpty()) {
                        snapAddress = phoneAccountAddress;
                    } else {
                        snapAddress = SnapUserStore.resolveAddress(context, number);
                    }
                }
                String sourceLabel = isSnap ? "Snapchat" : safeSource(geoLabel);
                if (MissedCallQueueStore.enqueue(context, MissedCallQueueStore.build(
                        context,
                        idStr,
                        displayName,
                        number,
                        snapAddress,
                        isSnap,
                        callDate,
                        sourceLabel))) {
                    queued++;
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        if (queued > 0) {
            MissedCallOverlayController.refresh(context);
        }
        return queued;
    }

    static boolean isSnapEntry(String phoneAccountId, String cachedName) {
        return SnapPhoneAccount.ACCOUNT_ID.equals(phoneAccountId)
                || (cachedName != null && cachedName.contains("(Snapchat)"));
    }

    static boolean isTargetEntry(String number, String cachedName, String phoneAccountId) {
        if (SnapPhoneAccount.ACCOUNT_ID.equals(phoneAccountId)) return true;
        if (cachedName != null && cachedName.contains("(Snapchat)")) return true;
        if (number != null && number.matches("[+0-9*#\\- ]{3,}")) return true;
        if (cachedName != null) {
            String name = cachedName.replace(" (Snapchat)", "").trim();
            if (!name.isEmpty() && !name.equalsIgnoreCase("unknown")) return true;
        }
        return false;
    }

    static String resolveDisplayName(String number, String cachedName) {
        if (cachedName != null && !cachedName.isEmpty()) {
            String name = cachedName.replace(" (Snapchat)", "").trim();
            if (!name.isEmpty() && !name.equalsIgnoreCase("unknown")) return name;
        }
        if (number != null && !number.isEmpty()) return number;
        return "مكالمة فائتة";
    }

    private static String safeSource(String geoLabel) {
        if (geoLabel != null && !geoLabel.trim().isEmpty()) return geoLabel.trim();
        return "هاتف";
    }
}
