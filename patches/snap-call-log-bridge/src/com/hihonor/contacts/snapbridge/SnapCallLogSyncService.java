package com.hihonor.contacts.snapbridge;

import android.os.Handler;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class SnapCallLogSyncService extends NotificationListenerService {
    private static final String TAG = "SnapCallLogBridge";
    private static final String SNAP_PKG = "com.snapchat.android";
    private static final String PREFS = "snap_active_calls";

    private static final Set<String> DIALER_PKGS = new HashSet<>(Arrays.asList(
            "com.hihonor.contacts",
            "com.huawei.contacts",
            "com.hihonor.dialer",
            "com.android.dialer",
            "com.google.android.dialer",
            "com.android.server.telecom",
            "com.samsung.android.dialer",
            "com.oneplus.dialer"
    ));

    private final Handler pollHandler = new Handler(Looper.getMainLooper());
    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            MissedCallAutoWatcher.scanNow(SnapCallLogSyncService.this);
            pollHandler.postDelayed(this, 20_000L);
        }
    };

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        MissedCallAutoWatcher.ensureStarted(this);
        MissedCallAutoWatcher.startPolling(this);
        pollHandler.removeCallbacks(pollRunnable);
        pollHandler.post(pollRunnable);
        MissedCallAutoWatcher.scanNow(this);
    }

    @Override
    public void onListenerDisconnected() {
        pollHandler.removeCallbacks(pollRunnable);
        MissedCallAutoWatcher.stopPolling();
        super.onListenerDisconnected();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        String pkg = sbn.getPackageName();
        if (SNAP_PKG.equals(pkg)) {
            handleSnapchat(sbn);
        } else if (DIALER_PKGS.contains(pkg)) {
            MissedCallAutoWatcher.scanNow(this);
        }
    }

    private void handleSnapchat(StatusBarNotification sbn) {
        try {
            SnapEventStore.append(this, "إشعار [Snapchat]: " + SnapNotificationParser.dumpExtras(sbn));
            SnapNotificationParser.ParsedCall call = SnapNotificationParser.parse(sbn);
            if (call == null) {
                SnapEventStore.append(this, "لم يُعرَف كمكالمة من Snapchat");
                return;
            }
            String displayName = call.displayName;
            if (SnapNameHelper.isGenericAppName(displayName)
                    && call.snapUsername != null && !call.snapUsername.isEmpty()) {
                displayName = call.snapUsername;
            }
            markActive(sbn.getKey(), displayName);
            boolean ok = CallLogWriter.write(this, displayName, call.snapUsername, call.callType,
                    System.currentTimeMillis(), call.reason, "Snapchat", true);
            if (ok) {
                LastSnapStore.save(this, displayName,
                        SnapUserStore.addressFor(displayName, call.snapUsername));
            }
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

    private void clearActive(String key) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().remove(key).apply();
    }
}
