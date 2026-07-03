package com.hihonor.contacts.snapbridge;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;

import java.util.Calendar;

public final class MissedCallsBackfill {
    private MissedCallsBackfill() {}

    /**
     * Marks missed calls since yesterday as unread/new so they appear as missed bubbles.
     * Includes regular phone calls and Snapchat entries.
     */
    public static int markSinceYesterday(Context context) {
        long start = startOfYesterdayMillis();
        int queued = 0;
        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[] {
                            CallLog.Calls._ID,
                            CallLog.Calls.NUMBER,
                            CallLog.Calls.CACHED_NAME,
                            CallLog.Calls.TYPE,
                            CallLog.Calls.NEW,
                            CallLog.Calls.IS_READ,
                            CallLog.Calls.PHONE_ACCOUNT_ID,
                            "phone_account_address"
                    },
                    CallLog.Calls.TYPE + "=? AND " + CallLog.Calls.DATE + ">=?",
                    new String[] {
                            String.valueOf(CallLog.Calls.MISSED_TYPE),
                            String.valueOf(start)
                    },
                    CallLog.Calls.DATE + " DESC");
            if (cursor == null) return 0;
            while (cursor.moveToNext()) {
                long id = cursor.getLong(0);
                String number = cursor.getString(1);
                String cachedName = cursor.getString(2);
                int isNew = cursor.getInt(4);
                int isRead = cursor.getInt(5);
                String phoneAccountId = cursor.getString(6);
                String phoneAccountAddress = cursor.getString(7);

                if (!isTargetEntry(number, cachedName, phoneAccountId)) continue;
                if (!(isNew == 1 && isRead == 0)) {
                    ContentValues values = new ContentValues();
                    values.put(CallLog.Calls.NEW, 1);
                    values.put(CallLog.Calls.IS_READ, 0);
                    Uri row = CallLog.Calls.CONTENT_URI.buildUpon()
                            .appendPath(String.valueOf(id))
                            .build();
                    context.getContentResolver().update(row, values, null, null);
                }
                boolean isSnap = SnapPhoneAccount.ACCOUNT_ID.equals(phoneAccountId)
                        || (cachedName != null && cachedName.contains("(Snapchat)"));
                String displayName = resolveDisplayName(number, cachedName);
                String snapAddress = "";
                if (isSnap) {
                    if (phoneAccountAddress != null && !phoneAccountAddress.isEmpty()) {
                        snapAddress = phoneAccountAddress;
                    } else {
                        snapAddress = SnapUserStore.resolveAddress(context, number);
                    }
                }
                if (MissedCallQueueStore.enqueue(context, new MissedCallQueueStore.Item(
                        String.valueOf(id),
                        displayName,
                        number,
                        snapAddress,
                        isSnap))) {
                    queued++;
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        MissedCallOverlayController.refresh(context);
        return queued;
    }

    private static boolean isTargetEntry(String number, String cachedName, String phoneAccountId) {
        if (SnapPhoneAccount.ACCOUNT_ID.equals(phoneAccountId)) return true; // Snapchat entries
        if (cachedName != null && cachedName.contains("(Snapchat)")) return true;
        if (number == null) return false;
        // Regular phone calls (digits, +, *, #, spaces, hyphen)
        return number.matches("[+0-9*#\\- ]{3,}");
    }

    private static String resolveDisplayName(String number, String cachedName) {
        if (cachedName != null && !cachedName.isEmpty()) {
            return cachedName.replace(" (Snapchat)", "").trim();
        }
        if (number == null || number.isEmpty()) return "مكالمة فائتة";
        return number;
    }

    private static long startOfYesterdayMillis() {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        c.add(Calendar.DAY_OF_MONTH, -1);
        return c.getTimeInMillis();
    }
}

