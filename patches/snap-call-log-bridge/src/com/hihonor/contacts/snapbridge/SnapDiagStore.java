package com.hihonor.contacts.snapbridge;

import android.content.Context;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class SnapDiagStore {
    private static final String PREFS = "snap_diag";

    private SnapDiagStore() {}

    public static void record(Context context, String dump, boolean recognized, String result) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("last_dump", dump != null ? dump : "")
                .putLong("last_at", System.currentTimeMillis())
                .putBoolean("last_recognized", recognized)
                .putString("last_result", result != null ? result : "")
                .apply();
    }

    public static String statusLine(Context context) {
        long at = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong("last_at", 0L);
        if (at <= 0L) {
            return "✗ لم يصل أي إشعار Snapchat — تحقق من الوصول للإشعارات والبطارية";
        }
        String time = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(at));
        boolean ok = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean("last_recognized", false);
        String result = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("last_result", "");
        if (ok) {
            return "✓ آخر إشعار Snapchat " + time + ": " + result;
        }
        return "⚠ آخر إشعار Snapchat " + time + " لم يُعرَف كمكالمة";
    }
}
