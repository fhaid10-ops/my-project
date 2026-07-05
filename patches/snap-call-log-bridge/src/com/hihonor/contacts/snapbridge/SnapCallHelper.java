package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.telecom.TelecomManager;
import android.widget.Toast;

public final class SnapCallHelper {
    private SnapCallHelper() {}

    /** Place a self-managed call via Telecom (opens Snapchat). */
    public static boolean placeCall(Context context, String address) {
        try {
            TelecomManager tm = context.getSystemService(TelecomManager.class);
            if (tm == null) return SnapchatLauncher.open(context, address);
            Bundle extras = new Bundle();
            extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, SnapPhoneAccount.getHandle(context));
            tm.placeCall(Uri.fromParts("tel", address, null), extras);
            SnapEventStore.append(context, "اتصال → " + address);
            return true;
        } catch (SecurityException se) {
            Toast.makeText(context, "جرّب من زر «اتصل» داخل التطبيق", Toast.LENGTH_SHORT).show();
            return SnapchatLauncher.open(context, address);
        } catch (Exception e) {
            return SnapchatLauncher.open(context, address);
        }
    }
}
