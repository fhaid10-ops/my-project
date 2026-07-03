package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public final class SnapEventStore {
    private static final String PREFS = "snap_bridge_events";
    private static final String KEY_LOG = "log";
    private static final int MAX_LINES = 30;

    private SnapEventStore() {}

    public static void append(Context context, String line) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String time = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());
        String entry = time + "  " + line;
        String existing = prefs.getString(KEY_LOG, "");
        String[] lines = existing.isEmpty() ? new String[0] : existing.split("\n");
        List<String> kept = new ArrayList<>();
        kept.add(entry);
        for (String l : lines) {
            if (kept.size() >= MAX_LINES) break;
            kept.add(l);
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < kept.size(); i++) {
            if (i > 0) sb.append('\n');
            sb.append(kept.get(i));
        }
        prefs.edit().putString(KEY_LOG, sb.toString()).apply();
    }

    public static String read(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String log = prefs.getString(KEY_LOG, "");
        return log.isEmpty() ? "لا أحداث بعد — جرّب مكالمة Snapchat" : log;
    }

    public static void clear(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
    }
}
