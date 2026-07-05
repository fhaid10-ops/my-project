package com.hihonor.contacts.snapbridge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class MissedCallActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String id = intent.getStringExtra(MissedCallBubbleNotifier.EXTRA_ITEM_ID);
        MissedCallBubbleNotifier.handleAction(context, action, id);
    }
}

