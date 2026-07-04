package com.hihonor.contacts.snapbridge;

import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.service.notification.NotificationListenerService;

public final class SnapListenerHelper {
    private SnapListenerHelper() {}

    public static void requestRebind(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return;
        try {
            NotificationListenerService.requestRebind(
                    new ComponentName(context, SnapCallLogSyncService.class));
        } catch (Exception ignored) {
        }
    }

    public static void requestScan(Context context) {
        context.getSharedPreferences("snap_listener", Context.MODE_PRIVATE).edit()
                .putLong("scan_snap_now", System.currentTimeMillis())
                .apply();
        requestRebind(context);
    }

    static boolean consumeScanRequest(Context context) {
        long at = context.getSharedPreferences("snap_listener", Context.MODE_PRIVATE)
                .getLong("scan_snap_now", 0L);
        if (at <= 0L) return false;
        context.getSharedPreferences("snap_listener", Context.MODE_PRIVATE).edit()
                .remove("scan_snap_now")
                .apply();
        return true;
    }
}
