package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.database.Cursor;
import android.provider.CallLog;

/** يضمن ظهور مكالمة Snapchat الفائتة في الفقاعة حتى لو تخطّى التسجيل المكرر. */
public final class SnapMissedQueueHelper {
    private static final long LOOKBACK_MS = 30 * 60 * 1000L;

    private SnapMissedQueueHelper() {}

    public static void ensureQueued(Context context, String displayName, String snapUsername) {
        if (context == null) return;
        String address = SnapUserStore.addressFor(displayName, snapUsername);
        String dialId = SnapUserStore.dialIdForAddress(address);
        long since = System.currentTimeMillis() - LOOKBACK_MS;

        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[] {
                            CallLog.Calls._ID,
                            CallLog.Calls.DATE,
                            CallLog.Calls.TYPE
                    },
                    "(" + CallLog.Calls.NUMBER + "=? OR " + CallLog.Calls.PHONE_ACCOUNT_ID + "=?)"
                            + " AND " + CallLog.Calls.DATE + ">=?",
                    new String[] {dialId, SnapPhoneAccount.ACCOUNT_ID, String.valueOf(since)},
                    CallLog.Calls.DATE + " DESC LIMIT 5");
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    long id = cursor.getLong(0);
                    long date = cursor.getLong(1);
                    int type = cursor.getInt(2);
                    if (type != CallLog.Calls.INCOMING_TYPE
                            && type != CallLog.Calls.MISSED_TYPE) {
                        continue;
                    }
                    String idStr = String.valueOf(id);
                    if (MissedCallDismissStore.isDismissed(context, idStr)) continue;
                    if (MissedCallQueueStore.byId(context, idStr) != null) return;
                    MissedCallQueueStore.Item item = MissedCallQueueStore.build(
                            context,
                            idStr,
                            displayName,
                            dialId,
                            address,
                            true,
                            date,
                            "Snapchat",
                            SnapPhoneAccount.ACCOUNT_ID);
                    if (MissedCallQueueStore.enqueue(context, item)) {
                        MissedCallOverlayController.refresh(context);
                    }
                    return;
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }

        if (!SnapNameHelper.isGenericAppName(displayName)) {
            boolean ok = CallLogWriter.writeMissedSnap(context, displayName, snapUsername,
                    System.currentTimeMillis(), "queue_fallback");
            if (ok) {
                SnapEventStore.append(context, "✓ أُضيف فائت Snapchat للفقاعة (احتياطي): " + displayName);
            }
        }
    }
}
