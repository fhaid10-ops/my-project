package com.hihonor.contacts.snapbridge;

import android.app.Notification;
import android.content.SharedPreferences;
import android.provider.CallLog;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class SnapCallLogSyncService extends NotificationListenerService {
    private static final String TAG = "SnapCallLogBridge";
    private static final String SNAP_PKG = "com.snapchat.android";
    private static final String PREFS = "snap_active_calls";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || !SNAP_PKG.equals(sbn.getPackageName())) return;
        try {
            SnapEventStore.append(this, "إشعار: " + SnapNotificationParser.dumpExtras(sbn));
            SnapNotificationParser.ParsedCall call = SnapNotificationParser.parse(sbn);
            if (call == null) {
                SnapEventStore.append(this, "لم يُعرَف كمكالمة — ربما إشعار عادي");
                return;
            }
            markActive(sbn.getKey(), call.displayName);
            CallLogWriter.write(this, call.displayName, call.callType, System.currentTimeMillis(), call.reason);
        } catch (Exception e) {
            SnapEventStore.append(this, "خطأ: " + e.getMessage());
            Log.w(TAG, "onNotificationPosted failed", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn == null || !SNAP_PKG.equals(sbn.getPackageName())) return;
        clearActive(sbn.getKey());
        SnapEventStore.append(this, "انتهى إشعار Snapchat");
    }

    private void markActive(String key, String name) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(key, name).apply();
    }

    private String getActiveName(String key) {
        return getSharedPreferences(PREFS, MODE_PRIVATE).getString(key, null);
    }

    private void clearActive(String key) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().remove(key).apply();
    }
}
