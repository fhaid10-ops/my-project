package com.hihonor.contacts.snapbridge;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.Toast;

public final class BubbleSnoozeStore {
    private static final String PREFS = "bubble_snooze";
    private static final String KEY_UNTIL = "until";
    private static final long SNOOZE_MS = 60 * 60 * 1000L;
    private static final int ALARM_REQUEST = 9402;

    private BubbleSnoozeStore() {}

    public static void restoreOnBoot(Context context) {
        long until = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getLong(KEY_UNTIL, 0L);
        if (until > System.currentTimeMillis()) {
            scheduleWake(context, until);
        } else if (until > 0L) {
            clear(context);
        }
    }

    public static void snoozeOneHour(Context context) {
        long until = System.currentTimeMillis() + SNOOZE_MS;
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putLong(KEY_UNTIL, until)
                .commit();
        scheduleWake(context, until);
        Toast.makeText(context, "إخفاء الفقاعة ساعة — ستعود تلقائياً", Toast.LENGTH_LONG).show();
        SnapEventStore.append(context, "⏸ إخفاء الفقاعة ساعة واحدة");
    }

    public static boolean isSnoozed(Context context) {
        long until = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getLong(KEY_UNTIL, 0L);
        if (until <= System.currentTimeMillis()) {
            clear(context);
            return false;
        }
        return true;
    }

    public static void clear(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .remove(KEY_UNTIL)
                .apply();
        cancelWake(context);
    }

    public static void scheduleWake(Context context, long until) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent intent = new Intent(context, BubbleSnoozeReceiver.class);
            intent.setAction(BubbleSnoozeReceiver.ACTION_WAKE);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, ALARM_REQUEST, intent, flags);
            am.set(AlarmManager.RTC_WAKEUP, until, pi);
        } catch (Exception ignored) {
        }
    }

    private static void cancelWake(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent intent = new Intent(context, BubbleSnoozeReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, ALARM_REQUEST, intent, flags);
            am.cancel(pi);
        } catch (Exception ignored) {
        }
    }
}
