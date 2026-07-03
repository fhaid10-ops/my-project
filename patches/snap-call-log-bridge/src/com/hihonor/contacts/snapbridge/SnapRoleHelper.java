package com.hihonor.contacts.snapbridge;

import android.app.role.RoleManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.telecom.TelecomManager;

public final class SnapRoleHelper {
    private static final int REQ_REDIRECT = 2001;

    private SnapRoleHelper() {}

    public static boolean isCallRedirectionHeld(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false;
        RoleManager rm = context.getSystemService(RoleManager.class);
        return rm != null && rm.isRoleHeld(RoleManager.ROLE_CALL_REDIRECTION);
    }

    public static boolean isPhoneAccountEnabled(Context context) {
        try {
            TelecomManager tm = context.getSystemService(TelecomManager.class);
            if (tm == null) return false;
            return tm.getPhoneAccount(SnapPhoneAccount.getHandle(context)) != null;
        } catch (Exception e) {
            return false;
        }
    }

    public static void requestCallRedirection(Context activity) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        RoleManager rm = activity.getSystemService(RoleManager.class);
        if (rm == null || rm.isRoleHeld(RoleManager.ROLE_CALL_REDIRECTION)) return;
        if (rm.isRoleAvailable(RoleManager.ROLE_CALL_REDIRECTION)) {
            Intent intent = rm.createRequestRoleIntent(RoleManager.ROLE_CALL_REDIRECTION);
            if (activity instanceof android.app.Activity) {
                ((android.app.Activity) activity).startActivityForResult(intent, REQ_REDIRECT);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(intent);
            }
        }
    }

    public static void openPhoneAccountSettings(Context context) {
        try {
            Intent intent = new Intent(TelecomManager.ACTION_CHANGE_PHONE_ACCOUNTS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception ignored) {
        }
    }
}
