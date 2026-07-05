package com.hihonor.contacts.snapbridge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BubbleSnoozeReceiver extends BroadcastReceiver {
    public static final String ACTION_WAKE = "com.hihonor.contacts.snapbridge.ACTION_BUBBLE_SNOOZE_WAKE";
    public static final String ACTION_REMINDER = "com.hihonor.contacts.snapbridge.ACTION_BUBBLE_SNOOZE_REMINDER";
    public static final String ACTION_WAKE_NOW = "com.hihonor.contacts.snapbridge.ACTION_BUBBLE_WAKE_NOW";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        if (ACTION_REMINDER.equals(action)) {
            if (BubbleSnoozeStore.isSnoozed(context)) {
                BubbleSnoozeNotifier.showReminder(context, 5);
            }
            return;
        }
        if (ACTION_WAKE_NOW.equals(action)) {
            BubbleSnoozeStore.wakeNow(context);
            return;
        }
        BubbleSnoozeStore.clear(context);
        MissedCallAutoWatcher.scanNow(context);
        MissedCallOverlayController.refresh(context);
        SnapEventStore.append(context, "✓ عادت الفقاعة بعد ساعة");
    }
}
