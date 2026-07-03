package com.hihonor.contacts.snapbridge;

import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.util.Log;

public final class SnapPhoneAccount {
    private static final String TAG = "SnapCallLogBridge";
    public static final String ACCOUNT_ID = "snap_bridge";

    private SnapPhoneAccount() {}

    public static PhoneAccountHandle getHandle(Context context) {
        ComponentName cn = new ComponentName(context, SnapConnectionService.class);
        return new PhoneAccountHandle(cn, ACCOUNT_ID);
    }

    public static void register(Context context) {
        try {
            TelecomManager tm = context.getSystemService(TelecomManager.class);
            if (tm == null) return;
            PhoneAccountHandle handle = getHandle(context);
            Bundle extras = new Bundle();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                extras.putBoolean(PhoneAccount.EXTRA_LOG_SELF_MANAGED_CALLS, true);
            }
            PhoneAccount account = PhoneAccount.builder(handle, "Snapchat")
                    .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED
                            | PhoneAccount.CAPABILITY_CALL_PROVIDER)
                    .setShortDescription("Snapchat")
                    .setExtras(extras)
                    .build();
            tm.registerPhoneAccount(account);
            Log.i(TAG, "PhoneAccount registered");
        } catch (Exception e) {
            Log.w(TAG, "PhoneAccount register failed", e);
        }
    }
}
