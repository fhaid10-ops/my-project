package com.hihonor.contacts.snapbridge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BubbleSnoozeReceiver extends BroadcastReceiver {
    public static final String ACTION_WAKE = "com.hihonor.contacts.snapbridge.ACTION_BUBBLE_SNOOZE_WAKE";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;
        BubbleSnoozeStore.clear(context);
        MissedCallAutoWatcher.scanNow(context);
        MissedCallOverlayController.refresh(context);
        SnapEventStore.append(context, "✓ عادت الفقاعة بعد ساعة");
    }
}
