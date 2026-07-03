package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.content.Intent;
import android.app.NotificationManager;

public final class MissedCallOverlayController {
    private MissedCallOverlayController() {}

    public static void enqueue(Context context, MissedCallQueueStore.Item item) {
        if (MissedCallQueueStore.enqueue(context, item)) {
            refresh(context);
        }
    }

    public static void refresh(Context context) {
        try {
            NotificationManager nm = context.getSystemService(NotificationManager.class);
            if (nm != null) nm.cancel(9401); // hide legacy notification mode
            Intent intent = new Intent(context, MissedCallOverlayService.class);
            intent.setAction(MissedCallOverlayService.ACTION_REFRESH);
            context.startService(intent);
        } catch (Exception ignored) {
        }
    }
}

