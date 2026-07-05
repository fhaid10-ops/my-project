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
    private static final String KEY_NOTIFY_BEFORE = "notify_before_end";
    private static final long SNOOZE_MS = 60 * 60 * 1000L;
    private static final long REMINDER_BEFORE_MS = 5 * 60 * 1000L;
    private static final int ALARM_WAKE = 9402;
    private static final int ALARM_REMINDER = 9403;

    private BubbleSnoozeStore() {}

    public static boolean isNotifyBeforeEndEnabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean(KEY_NOTIFY_BEFORE, false);
    }

    public static void setNotifyBeforeEndEnabled(Context context, boolean enabled) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean(KEY_NOTIFY_BEFORE, enabled)
                .commit();
        if (enabled) {
            Toast.makeText(context, "✓ سيصلك إشعار قبل 5 دقائق من عودة الفقاعة", Toast.LENGTH_LONG).show();
        } else {
            Toast.makeText(context, "تم إيقاف إشعار ما قبل العودة", Toast.LENGTH_SHORT).show();
            cancelReminder(context);
        }
    }

    public static void restoreOnBoot(Context context) {
        long until = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getLong(KEY_UNTIL, 0L);
        if (until > System.currentTimeMillis()) {
            scheduleWake(context, until);
            scheduleReminderIfNeeded(context, until);
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
        scheduleReminderIfNeeded(context, until);
        String msg = isNotifyBeforeEndEnabled(context)
                ? "إخفاء الفقاعة ساعة — إشعار قبل العودة بـ 5 دقائق"
                : "إخفاء الفقاعة ساعة — ستعود تلقائياً";
        Toast.makeText(context, msg, Toast.LENGTH_LONG).show();
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

    public static long snoozeEndsAt(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getLong(KEY_UNTIL, 0L);
    }

    public static void clear(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .remove(KEY_UNTIL)
                .apply();
        cancelWake(context);
        cancelReminder(context);
        BubbleSnoozeNotifier.cancel(context);
    }

    /** إلغاء الإخفاء فوراً وإظهار الفقاعة عند الحاجة. */
    public static void wakeNow(Context context) {
        if (!isSnoozed(context)) {
            MissedCallOverlayController.refresh(context);
            return;
        }
        clear(context);
        MissedCallAutoWatcher.scanNow(context);
        MissedCallOverlayController.refresh(context);
        Toast.makeText(context, "✓ عادت الفقاعة", Toast.LENGTH_SHORT).show();
        SnapEventStore.append(context, "✓ إظهار الفقاعة يدوياً");
    }

    public static void scheduleWake(Context context, long until) {
        scheduleAlarm(context, ALARM_WAKE, BubbleSnoozeReceiver.ACTION_WAKE, until);
    }

    private static void scheduleReminderIfNeeded(Context context, long until) {
        cancelReminder(context);
        if (!isNotifyBeforeEndEnabled(context)) return;
        long reminderAt = until - REMINDER_BEFORE_MS;
        if (reminderAt <= System.currentTimeMillis()) return;
        scheduleAlarm(context, ALARM_REMINDER, BubbleSnoozeReceiver.ACTION_REMINDER, reminderAt);
    }

    private static void scheduleAlarm(Context context, int requestCode, String action, long when) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent intent = new Intent(context, BubbleSnoozeReceiver.class);
            intent.setAction(action);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent, flags);
            am.set(AlarmManager.RTC_WAKEUP, when, pi);
        } catch (Exception ignored) {
        }
    }

    private static void cancelWake(Context context) {
        cancelAlarm(context, ALARM_WAKE, BubbleSnoozeReceiver.ACTION_WAKE);
    }

    private static void cancelReminder(Context context) {
        cancelAlarm(context, ALARM_REMINDER, BubbleSnoozeReceiver.ACTION_REMINDER);
    }

    private static void cancelAlarm(Context context, int requestCode, String action) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent intent = new Intent(context, BubbleSnoozeReceiver.class);
            intent.setAction(action);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent, flags);
            am.cancel(pi);
        } catch (Exception ignored) {
        }
    }
}
