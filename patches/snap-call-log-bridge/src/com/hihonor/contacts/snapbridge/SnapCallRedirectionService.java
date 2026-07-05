package com.hihonor.contacts.snapbridge;

import android.net.Uri;
import android.os.Build;
import android.telecom.CallRedirectionService;
import android.telecom.PhoneAccountHandle;

public class SnapCallRedirectionService extends CallRedirectionService {
    @Override
    public void onPlaceCall(Uri handle, PhoneAccountHandle initialPhoneAccount, boolean allowInteractiveResponse) {
        String num = handle != null ? Uri.decode(handle.getSchemeSpecificPart()) : "";
        if (num != null) {
            num = num.replaceAll("[^0-9a-zA-Z]", "");
        }
        if (SnapUserStore.isSnapDialId(num) || (num != null && num.startsWith("snap"))) {
            SnapEventStore.append(this, "↪ إعادة توجيه: " + num);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                redirectCall(handle, SnapPhoneAccount.getHandle(this), false);
                return;
            }
        }
        placeCallUnmodified();
    }
}
