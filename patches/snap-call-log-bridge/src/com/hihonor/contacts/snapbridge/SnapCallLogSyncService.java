package com.hihonor.contacts.snapbridge;

import android.os.Handler;
import android.os.Looper;
import android.provider.CallLog;
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
        scanActiveSnapNotifications();
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
        if (isSnapPackage(pkg)) {
            handleSnapchat(sbn, false);
        } else if (DIALER_PKGS.contains(pkg)) {
            MissedCallAutoWatcher.scanNow(this);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn == null || !isSnapPackage(sbn.getPackageName())) return;
        handleSnapchat(sbn, true);
    }

    private void scanActiveSnapNotifications() {
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) {
                if (isSnapPackage(sbn.getPackageName())) {
                    handleSnapchat(sbn, false);
                }
            }
        } catch (Exception e) {
            SnapEventStore.append(this, "تعذر فحص إشعارات Snapchat النشطة");
        }
    }

    private static boolean isSnapPackage(String pkg) {
        return pkg != null && (SNAP_PKG.equals(pkg) || pkg.startsWith("com.snapchat.android"));
    }

    private void handleSnapchat(StatusBarNotification sbn, boolean removed) {
        try {
            String key = sbn.getKey();
            if (!removed) {
                SnapEventStore.append(this, "إشعار [Snapchat]: " + SnapNotificationParser.dumpExtras(sbn));
            }

            SnapNotificationParser.ParsedCall call = SnapNotificationParser.parseOrFallback(sbn);
            if (call == null) {
                if (!removed) {
                    SnapEventStore.append(this, "لم يُعرَف كمكالمة من Snapchat");
                } else {
                    finalizeRemovedCall(key, null);
                }
                return;
            }

            String displayName = call.displayName;
            if (SnapNameHelper.isGenericAppName(displayName)
                    && call.snapUsername != null && !call.snapUsername.isEmpty()) {
                displayName = call.snapUsername;
            }

            if (removed) {
                finalizeRemovedCall(key, call);
                return;
            }

            markActive(key, displayName, call.snapUsername, call.callType);
            boolean ok = CallLogWriter.write(this, displayName, call.snapUsername, call.callType,
                    System.currentTimeMillis(), call.reason, "Snapchat", true);
            if (ok) {
                getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                        .putBoolean(key + "_logged", true)
                        .apply();
                LastSnapStore.save(this, displayName,
                        SnapUserStore.addressFor(displayName, call.snapUsername));
            }
        } catch (Exception e) {
            SnapEventStore.append(this, "خطأ: " + e.getMessage());
            Log.w(TAG, "handleSnapchat failed", e);
        }
    }

    private void finalizeRemovedCall(String key, SnapNotificationParser.ParsedCall call) {
        android.content.SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String activeName = prefs.getString(key + "_name", null);
        if (activeName == null) {
            SnapEventStore.append(this, "انتهى إشعار Snapchat");
            clearActive(key);
            return;
        }

        String snapUser = prefs.getString(key + "_user", "");
        int postedType = prefs.getInt(key + "_type", CallLog.Calls.INCOMING_TYPE);
        boolean alreadyLogged = prefs.getBoolean(key + "_logged", false);

        int type = call != null ? call.callType : postedType;
        if (type == CallLog.Calls.INCOMING_TYPE) {
            type = CallLog.Calls.MISSED_TYPE;
        }

        String displayName = activeName;
        if (call != null && !SnapNameHelper.isGenericAppName(call.displayName)) {
            displayName = call.displayName;
        }
        if (SnapNameHelper.isGenericAppName(displayName)
                && snapUser != null && !snapUser.isEmpty()) {
            displayName = snapUser;
        }

        if (type == CallLog.Calls.MISSED_TYPE) {
            boolean ok = CallLogWriter.write(this, displayName, snapUser, type,
                    System.currentTimeMillis(), "removed", "Snapchat", true);
            if (ok) {
                SnapEventStore.append(this, "✓ فائت Snapchat عند إغلاق الإشعار: " + displayName);
                LastSnapStore.save(this, displayName, SnapUserStore.addressFor(displayName, snapUser));
            } else if (!alreadyLogged) {
                SnapEventStore.append(this, "تعذر تسجيل فائت Snapchat: " + displayName);
            }
        } else {
            SnapEventStore.append(this, "انتهت مكالمة Snapchat: " + displayName);
        }
        clearActive(key);
    }

    private void markActive(String key, String name, String snapUser, int type) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString(key + "_name", name)
                .putString(key + "_user", snapUser != null ? snapUser : "")
                .putInt(key + "_type", type)
                .putLong(key + "_at", System.currentTimeMillis())
                .remove(key + "_logged")
                .apply();
    }

    private void clearActive(String key) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .remove(key + "_name")
                .remove(key + "_user")
                .remove(key + "_type")
                .remove(key + "_at")
                .remove(key + "_logged")
                .apply();
    }
}
