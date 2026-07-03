package com.hihonor.contacts.snap;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;

/**
 * Prompts the user to enable notification access after boot if not yet granted.
 */
public class SnapCallLogBootReceiver extends BroadcastReceiver {
    private static final String TAG = "SnapCallLogBoot";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            return;
        }
        if (isNotificationListenerEnabled(context)) {
            return;
        }
        Log.i(TAG, "Snapchat call log bridge needs notification access");
    }

    private static boolean isNotificationListenerEnabled(Context context) {
        String enabled = Settings.Secure.getString(
                context.getContentResolver(), "enabled_notification_listeners");
        if (TextUtils.isEmpty(enabled)) {
            return false;
        }
        ComponentName cn = new ComponentName(context, SnapCallLogSyncService.class);
        return enabled.contains(cn.flattenToString());
    }
}
