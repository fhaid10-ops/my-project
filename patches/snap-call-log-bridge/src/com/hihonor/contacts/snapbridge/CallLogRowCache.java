package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.database.Cursor;
import android.provider.CallLog;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** استعلام واحد مجمّع لسجل المكالمات بدل استعلام لكل عنصر. */
final class CallLogRowCache {
    private final Map<String, String> formattedById = new HashMap<>();

    private CallLogRowCache() {}

    static CallLogRowCache load(Context context, List<MissedCallQueueStore.Item> items) {
        CallLogRowCache cache = new CallLogRowCache();
        if (context == null || items == null || items.isEmpty()) return cache;

        StringBuilder selection = new StringBuilder(CallLog.Calls._ID + " IN (");
        int count = 0;
        for (MissedCallQueueStore.Item item : items) {
            if (item == null || item.id == null || item.id.isEmpty()) continue;
            if (count > 0) selection.append(',');
            selection.append('?');
            count++;
        }
        if (count == 0) return cache;
        selection.append(')');

        String[] args = new String[count];
        int i = 0;
        for (MissedCallQueueStore.Item item : items) {
            if (item == null || item.id == null || item.id.isEmpty()) continue;
            args[i++] = item.id;
        }

        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[] {
                            CallLog.Calls._ID,
                            CallLog.Calls.CACHED_FORMATTED_NUMBER,
                            CallLog.Calls.CACHED_NAME
                    },
                    selection.toString(),
                    args,
                    null);
            if (cursor == null) return cache;
            while (cursor.moveToNext()) {
                String id = String.valueOf(cursor.getLong(0));
                String formatted = cursor.getString(1);
                if (formatted != null && !formatted.isEmpty()) {
                    cache.formattedById.put(id, formatted);
                    continue;
                }
                String cached = cursor.getString(2);
                if (cached != null) {
                    cached = cached.replace(" (Snapchat)", "").trim();
                    if (!cached.isEmpty()) cache.formattedById.put(id, cached);
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return cache;
    }

    String formatted(String id) {
        if (id == null) return "";
        String value = formattedById.get(id);
        return value != null ? value : "";
    }
}
