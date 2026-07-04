package com.hihonor.contacts.snapbridge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public final class BubbleSnoozeNotifier {
    private static final String CHANNEL_ID = "bubble_snooze_reminder";
    private static final int NOTIFICATION_ID = 9404;

    private BubbleSnoozeNotifier() {}

    public static void showReminder(Context context, int minutesLeft) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        ensureChannel(nm);

        PendingIntent openPi = PendingIntent.getActivity(
                context,
                200,
                new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent wakeIntent = new Intent(context, BubbleSnoozeReceiver.class);
        wakeIntent.setAction(BubbleSnoozeReceiver.ACTION_WAKE_NOW);
        PendingIntent wakePi = PendingIntent.getBroadcast(
                context,
                201,
                wakeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String text = minutesLeft <= 1
                ? "الفقاعة ستعود خلال دقيقة — أو اضغط «إظهار الآن»"
                : ("الفقاعة ستعود خلال " + minutesLeft + " دقائق — أو اضغط «إظهار الآن»");

        Notification.Builder b = new Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_more)
                .setContentTitle("تذكير الفقاعة")
                .setContentText(text)
                .setContentIntent(openPi)
                .addAction(new Notification.Action.Builder(null, "إظهار الآن", wakePi).build())
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setPriority(Notification.PRIORITY_DEFAULT);
        nm.notify(NOTIFICATION_ID, b.build());
        SnapEventStore.append(context, "🔔 " + text);
    }

    public static void cancel(Context context) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(NOTIFICATION_ID);
    }

    private static void ensureChannel(NotificationManager nm) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "تذكير عودة الفقاعة",
                NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("إشعار اختياري قبل عودة الفقاعة بعد الإخفاء المؤقت");
        nm.createNotificationChannel(channel);
    }
}
