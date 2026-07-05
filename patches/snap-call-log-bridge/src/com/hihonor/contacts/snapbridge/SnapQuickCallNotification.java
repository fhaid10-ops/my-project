package com.hihonor.contacts.snapbridge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

public final class SnapQuickCallNotification {
    private static final String CHANNEL = "snap_quick_call";
    private static final int NOTIF_ID = 4242;

    private SnapQuickCallNotification() {}

    public static void update(Context context, String displayName, String address) {
        LastSnapStore.save(context, displayName, address);
        show(context, displayName, address);
    }

    public static void refresh(Context context) {
        String name = LastSnapStore.getName(context);
        String address = LastSnapStore.getAddress(context);
        if (name != null && address != null) {
            show(context, name, address);
        }
    }

    private static void show(Context context, String displayName, String address) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL, "اتصال Snapchat", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("زر سريع للاتصال عبر Snapchat");
            nm.createNotificationChannel(ch);
        }
        Intent callIntent = new Intent(context, SnapCallbackActivity.class);
        callIntent.setData(Uri.parse("snapbridge://call/" + Uri.encode(address)));
        callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent callPi = PendingIntent.getActivity(context, 1, callIntent, flags);

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, CHANNEL)
                : new Notification.Builder(context);
        builder.setSmallIcon(android.R.drawable.sym_call_outgoing)
                .setContentTitle("اتصل: " + displayName)
                .setContentText("اضغط هنا لفتح Snapchat")
                .setContentIntent(callPi)
                .addAction(new Notification.Action.Builder(
                        null, "اتصل الآن", callPi).build())
                .setOngoing(true)
                .setAutoCancel(false);
        nm.notify(NOTIF_ID, builder.build());
    }
}
