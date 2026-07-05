package com.hihonor.contacts.snapbridge;

import android.telecom.Call;
import android.telecom.InCallService;

/** Minimal InCallService so Telecom can complete Snapchat call routing. */
public class SnapInCallService extends InCallService {
    @Override
    public void onCallAdded(Call call) {
        if (call != null && call.getState() == Call.STATE_DIALING) {
            call.disconnect();
        }
    }
}
