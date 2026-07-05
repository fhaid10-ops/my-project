package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.database.Cursor;
import android.provider.CallLog;

/** يضمن ظهور مكالمة Snapchat الفائتة في الفقاعة حتى لو تخطّى التسجيل المكرر. */
public final class SnapMissedQueueHelper {
    private static final long LOOKBACK_MS = 30 * 60 * 1000L;

    private SnapMissedQueueHelper() {}

    public static void ensureQueued(Context context, String displayName, String snapUsername) {
        ensureQueued(context, null, displayName, snapUsername);
    }

    public static void ensureQueued(Context context, String sessionKey, String displayName,
                                    String snapUsername) {
        if (context == null) return;
        String address = SnapUserStore.addressForSession(context, sessionKey, displayName, snapUsername);
        String dialId = SnapUserStore.dialIdForAddress(address);
        SnapUserStore.save(context, address, displayName, snapUsername);
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
                    CallLog.Calls.DATE + " DESC LIMIT 8");
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
                    if (MissedCallQueueStore.byId(context, idStr) != null) {
                        MissedCallOverlayController.refresh(context);
                        return;
                    }
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

        long now = System.currentTimeMillis();
        boolean ok = CallLogWriter.writeMissedSnap(context, sessionKey, displayName, snapUsername,
                now, "queue_fallback");
        if (ok) return;

        enqueueDirect(context, sessionKey, address, dialId, displayName, now);
    }

    private static void enqueueDirect(Context context, String sessionKey, String address,
                                      String dialId, String displayName, long when) {
        String id = directQueueId(sessionKey, dialId, when);
        if (MissedCallDismissStore.isDismissed(context, id)) return;
        if (MissedCallQueueStore.byId(context, id) != null) {
            MissedCallOverlayController.refresh(context);
            return;
        }
        MissedCallQueueStore.Item item = MissedCallQueueStore.build(
                context,
                id,
                displayName,
                dialId,
                address,
                true,
                when,
                "Snapchat",
                SnapPhoneAccount.ACCOUNT_ID);
        if (MissedCallQueueStore.enqueue(context, item)) {
            SnapEventStore.append(context, "✓ أُضيف للفقاعة مباشرة: " + displayName);
            MissedCallOverlayController.refresh(context);
        }
    }

    private static String directQueueId(String sessionKey, String dialId, long when) {
        if (sessionKey != null && !sessionKey.isEmpty()) {
            return "snapq:" + sessionKey.hashCode();
        }
        return "snapq:" + dialId + ":" + (when / 60_000L);
    }
}
