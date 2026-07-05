package com.hihonor.contacts.snap;

import android.app.Notification;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.text.TextUtils;
import android.util.Log;

/**
 * Bridges Snapchat call notifications into the system call log so they appear
 * in Honor Contacts recents (similar to iPhone CallKit integration).
 */
public class SnapCallLogSyncService extends NotificationListenerService {
    private static final String TAG = "SnapCallLogSync";
    private static final String SNAP_PKG = "com.snapchat.android";
    private static final long DEDUP_WINDOW_MS = 90_000L;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || !SNAP_PKG.equals(sbn.getPackageName())) {
            return;
        }
        try {
            handleSnapNotification(sbn);
        } catch (Exception e) {
            Log.w(TAG, "Failed to sync Snapchat call notification", e);
        }
    }

    private void handleSnapNotification(StatusBarNotification sbn) {
        Notification notification = sbn.getNotification();
        if (notification == null || notification.extras == null) {
            return;
        }

        CharSequence title = notification.extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = notification.extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigText = notification.extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        String combined = joinNonEmpty(title, text, bigText);
        if (TextUtils.isEmpty(combined)) {
            return;
        }

        String lower = combined.toLowerCase();
        if (!isCallRelated(lower)) {
            return;
        }

        int type = resolveCallType(lower);
        String displayName = extractDisplayName(title, text, combined);
        if (TextUtils.isEmpty(displayName)) {
            displayName = "Snapchat";
        }

        long now = System.currentTimeMillis();
        if (isDuplicate(displayName, type, now)) {
            return;
        }

        writeCallLog(displayName, type, now);
    }

    private static boolean isCallRelated(String lower) {
        return lower.contains("call")
                || lower.contains("مكالم")
                || lower.contains("video chat")
                || lower.contains("محادثة فيديو")
                || lower.contains("voice")
                || lower.contains("صوت");
    }

    private static int resolveCallType(String lower) {
        if (lower.contains("missed") || lower.contains("فائت") || lower.contains("فائتة")) {
            return CallLog.Calls.MISSED_TYPE;
        }
        if (lower.contains("outgoing")
                || lower.contains("صادر")
                || lower.contains("called")
                || lower.contains("تصل")) {
            return CallLog.Calls.OUTGOING_TYPE;
        }
        if (lower.contains("incoming")
                || lower.contains("واردة")
                || lower.contains("received")
                || lower.contains("يتصل")) {
            return CallLog.Calls.INCOMING_TYPE;
        }
        return CallLog.Calls.MISSED_TYPE;
    }

    private static String joinNonEmpty(CharSequence... parts) {
        StringBuilder sb = new StringBuilder();
        for (CharSequence part : parts) {
            if (part == null || part.length() == 0) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append(' ');
            }
            sb.append(part);
        }
        return sb.toString().trim();
    }

    private static String extractDisplayName(CharSequence title, CharSequence text, String combined) {
        if (title != null) {
            String t = title.toString().trim();
            if (!TextUtils.isEmpty(t) && !isCallRelated(t.toLowerCase())) {
                return t;
            }
        }
        if (text != null) {
            String t = text.toString().trim();
            String from = extractNameFromPhrase(t);
            if (!TextUtils.isEmpty(from)) {
                return from;
            }
        }
        String fromCombined = extractNameFromPhrase(combined);
        if (!TextUtils.isEmpty(fromCombined)) {
            return fromCombined;
        }
        return combined.length() > 80 ? combined.substring(0, 80) : combined;
    }

    private static String extractNameFromPhrase(String phrase) {
        String[] markers = {
                "from ", "with ", "to ",
                "من ", "مع ", "إلى ", "الي "
        };
        String lower = phrase.toLowerCase();
        for (String marker : markers) {
            int idx = lower.indexOf(marker);
            if (idx >= 0) {
                String tail = phrase.substring(idx + marker.length()).trim();
                int end = tail.indexOf('\n');
                if (end > 0) {
                    tail = tail.substring(0, end).trim();
                }
                if (!TextUtils.isEmpty(tail) && tail.length() <= 80) {
                    return tail;
                }
            }
        }
        return null;
    }

    private boolean isDuplicate(String displayName, int type, long now) {
        Uri uri = CallLog.Calls.CONTENT_URI.buildUpon()
                .appendQueryParameter("limit", "20")
                .build();
        String selection = CallLog.Calls.CACHED_NAME + "=? AND " + CallLog.Calls.TYPE + "=? AND "
                + CallLog.Calls.DATE + ">?";
        String[] args = new String[] {
                displayName,
                String.valueOf(type),
                String.valueOf(now - DEDUP_WINDOW_MS)
        };
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(uri, new String[] { CallLog.Calls._ID }, selection, args, null);
            return cursor != null && cursor.moveToFirst();
        } catch (Exception e) {
            Log.w(TAG, "Dedup query failed", e);
            return false;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    private void writeCallLog(String displayName, int type, long when) {
        String pseudoNumber = "snap:" + Integer.toHexString(displayName.hashCode());
        ContentValues values = new ContentValues();
        values.put(CallLog.Calls.NUMBER, pseudoNumber);
        values.put(CallLog.Calls.CACHED_NAME, displayName + " (Snapchat)");
        values.put(CallLog.Calls.TYPE, type);
        values.put(CallLog.Calls.DATE, when);
        values.put(CallLog.Calls.DURATION, 0);
        values.put(CallLog.Calls.NEW, 1);
        values.put(CallLog.Calls.FEATURES, 0x4); // VOIP_VIDEO flag
        getContentResolver().insert(CallLog.Calls.CONTENT_URI, values);
        Log.i(TAG, "Logged Snapchat call for " + displayName + " type=" + type);
    }
}
