package com.hihonor.contacts.snapbridge;

import android.app.Notification;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.SharedPreferences;
import android.provider.CallLog;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.text.TextUtils;
import android.util.Log;

public class SnapCallLogSyncService extends NotificationListenerService {
    private static final String TAG = "SnapCallLogBridge";
    private static final String SNAP_PKG = "com.snapchat.android";
    private static final String PREFS = "snap_active_calls";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        String pkg = sbn.getPackageName();
        if (TextUtils.isEmpty(pkg) || isIgnoredDialerPackage(pkg) || getPackageName().equals(pkg)) return;
        try {
            SnapEventStore.append(this, "إشعار [" + pkg + "]: " + SnapNotificationParser.dumpExtras(sbn));
            SnapNotificationParser.ParsedCall call = SnapNotificationParser.parse(sbn);
            if (call == null) {
                SnapEventStore.append(this, "لم يُعرَف كمكالمة من " + pkg);
                return;
            }
            String appLabel = getAppLabel(pkg);
            boolean isSnapchat = SNAP_PKG.equals(pkg);
            markActive(sbn.getKey(), call.displayName);
            boolean ok = CallLogWriter.write(this, call.displayName, call.snapUsername, call.callType,
                    System.currentTimeMillis(), call.reason, appLabel, isSnapchat);
            if (ok && isSnapchat) {
                LastSnapStore.save(this, call.displayName,
                        SnapUserStore.addressFor(call.displayName, call.snapUsername));
            }
        } catch (Exception e) {
            SnapEventStore.append(this, "خطأ: " + e.getMessage());
            Log.w(TAG, "onNotificationPosted failed", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn == null) return;
        clearActive(sbn.getKey());
        SnapEventStore.append(this, "انتهى إشعار: " + sbn.getPackageName());
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

    private boolean isIgnoredDialerPackage(String pkg) {
        return pkg.startsWith("com.android.dialer")
                || pkg.startsWith("com.google.android.dialer")
                || pkg.startsWith("com.hihonor.contacts")
                || pkg.startsWith("com.android.server.telecom")
                || pkg.startsWith("com.huawei.contacts")
                || pkg.startsWith("com.huawei.dialer");
    }

    private String getAppLabel(String pkg) {
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo info = pm.getApplicationInfo(pkg, 0);
            CharSequence label = pm.getApplicationLabel(info);
            if (label != null && label.length() > 0) return label.toString();
        } catch (Exception ignored) {
        }
        return pkg;
    }
}
