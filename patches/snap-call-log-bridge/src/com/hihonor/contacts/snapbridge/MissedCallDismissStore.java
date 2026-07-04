package com.hihonor.contacts.snapbridge;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.provider.CallLog;

import org.json.JSONArray;

import java.util.HashSet;
import java.util.Set;

public final class MissedCallDismissStore {
    private static final String PREFS = "missed_call_dismissed";
    private static final String KEY_IDS = "ids";

    private MissedCallDismissStore() {}

    public static void dismiss(Context context, String callLogId) {
        if (callLogId == null || callLogId.isEmpty()) return;
        markCallLogRead(context, callLogId);
        Set<String> ids = loadIds(context);
        ids.add(callLogId);
        saveIds(context, ids);
    }

    public static boolean isDismissed(Context context, String callLogId) {
        if (callLogId == null) return false;
        return loadIds(context).contains(callLogId);
    }

    private static void markCallLogRead(Context context, String callLogId) {
        try {
            ContentValues values = new ContentValues();
            values.put(CallLog.Calls.NEW, 0);
            values.put(CallLog.Calls.IS_READ, 1);
            Uri row = CallLog.Calls.CONTENT_URI.buildUpon()
                    .appendPath(callLogId)
                    .build();
            context.getContentResolver().update(row, values, null, null);
        } catch (Exception ignored) {
        }
    }

    private static Set<String> loadIds(Context context) {
        HashSet<String> out = new HashSet<>();
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_IDS, "[]");
        try {
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                String id = arr.optString(i, "");
                if (!id.isEmpty()) out.add(id);
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    private static void saveIds(Context context, Set<String> ids) {
        JSONArray arr = new JSONArray();
        for (String id : ids) {
            arr.put(id);
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_IDS, arr.toString())
                .commit();
    }
}
