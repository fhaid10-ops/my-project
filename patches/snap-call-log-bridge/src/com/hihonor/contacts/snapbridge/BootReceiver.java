package com.hihonor.contacts.snapbridge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            SnapPhoneAccount.register(context);
            Log.i("SnapCallLogBridge", "Device booted");
        }
    }
}
