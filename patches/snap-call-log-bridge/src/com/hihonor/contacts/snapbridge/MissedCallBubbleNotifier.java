package com.hihonor.contacts.snapbridge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.Toast;

public final class MissedCallBubbleNotifier {
    public static final String ACTION_CALLBACK = "com.hihonor.contacts.snapbridge.ACTION_CALLBACK";
    public static final String ACTION_WHATSAPP = "com.hihonor.contacts.snapbridge.ACTION_WHATSAPP";
    public static final String ACTION_DELETE = "com.hihonor.contacts.snapbridge.ACTION_DELETE";
    public static final String EXTRA_ITEM_ID = "extra_item_id";

    private static final String CHANNEL_ID = "missed_call_bubble";
    private static final int NOTIFICATION_ID = 9401;

    private MissedCallBubbleNotifier() {}

    public static boolean enqueue(Context context, MissedCallQueueStore.Item item) {
        boolean added = MissedCallQueueStore.enqueue(context, item);
        if (added) refresh(context);
        return added;
    }

    public static void refresh(Context context) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        createChannel(nm);
        MissedCallQueueStore.Item item = MissedCallQueueStore.first(context);
        if (item == null) {
            nm.cancel(NOTIFICATION_ID);
            return;
        }

        PendingIntent openPi = PendingIntent.getActivity(
                context,
                100,
                new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        PendingIntent callbackPi = actionPendingIntent(context, ACTION_CALLBACK, item.id, 101);
        PendingIntent whatsappPi = actionPendingIntent(context, ACTION_WHATSAPP, item.id, 102);
        PendingIntent deletePi = actionPendingIntent(context, ACTION_DELETE, item.id, 103);

        int count = MissedCallQueueStore.size(context);
        String name = item.displayName != null && !item.displayName.isEmpty() ? item.displayName : item.number;
        Notification.Builder b = new Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_missed_call)
                .setContentTitle("مكالمة فائتة: " + name)
                .setContentText("اختَر إجراء: واتساب / معاودة / حذف" + (count > 1 ? " (" + count + ")" : ""))
                .setContentIntent(openPi)
                .setOngoing(true)
                .setAutoCancel(false)
                .setCategory(Notification.CATEGORY_MISSED_CALL)
                .setPriority(Notification.PRIORITY_MAX)
                .setNumber(count)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(new Notification.Action.Builder(null, "معاودة الاتصال", callbackPi).build())
                .addAction(new Notification.Action.Builder(null, "واتساب", whatsappPi).build())
                .addAction(new Notification.Action.Builder(null, "حذف", deletePi).build());
        nm.notify(NOTIFICATION_ID, b.build());
    }

    public static void handleAction(Context context, String action, String itemId) {
        MissedCallQueueStore.Item item = MissedCallQueueStore.byId(context, itemId);
        if (item == null) {
            refresh(context);
            return;
        }
        boolean acted = false;
        if (ACTION_CALLBACK.equals(action)) {
            acted = doCallback(context, item);
        } else if (ACTION_WHATSAPP.equals(action)) {
            acted = openWhatsApp(context, item.number);
        } else if (ACTION_DELETE.equals(action)) {
            acted = true;
        }
        if (acted) {
            MissedCallQueueStore.remove(context, item.id);
        }
        refresh(context);
    }

    private static boolean doCallback(Context context, MissedCallQueueStore.Item item) {
        try {
            if (item.isSnap) {
                String key = (item.snapAddress != null && !item.snapAddress.isEmpty())
                        ? item.snapAddress : item.number;
                return SnapchatLauncher.open(context, key);
            }
            String number = sanitizeForDial(item.number);
            if (number.isEmpty()) return false;
            Intent dial = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(number)));
            dial.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(dial);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean openWhatsApp(Context context, String rawNumber) {
        String number = sanitizeForDial(rawNumber);
        String wa = number.startsWith("+") ? number.substring(1) : number;
        if (wa.isEmpty() || wa.startsWith("888")) {
            Toast.makeText(context, "رقم واتساب غير متاح", Toast.LENGTH_SHORT).show();
            return false;
        }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/" + wa));
            i.setPackage("com.whatsapp");
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(i);
            return true;
        } catch (Exception first) {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/" + wa));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(i);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
    }

    private static String sanitizeForDial(String raw) {
        if (raw == null) return "";
        String s = raw.replaceAll("[^0-9+]", "");
        if (s.startsWith("00")) s = "+" + s.substring(2);
        return s;
    }

    private static PendingIntent actionPendingIntent(
            Context context, String action, String itemId, int requestCode) {
        Intent i = new Intent(context, MissedCallActionReceiver.class);
        i.setAction(action);
        i.putExtra(EXTRA_ITEM_ID, itemId);
        return PendingIntent.getBroadcast(
                context,
                requestCode,
                i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void createChannel(NotificationManager nm) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "فقاعة المكالمات الفائتة",
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("تبقى حتى تختار: حذف / واتساب / معاودة اتصال");
            channel.enableVibration(true);
            nm.createNotificationChannel(channel);
        }
    }
}

