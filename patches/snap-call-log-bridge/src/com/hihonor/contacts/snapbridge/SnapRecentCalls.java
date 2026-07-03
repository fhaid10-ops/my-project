package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.database.Cursor;
import android.os.Build;
import android.provider.CallLog;

import java.util.ArrayList;
import java.util.List;

public final class SnapRecentCalls {
    public static final class Entry {
        public final String displayName;
        public final String address;
        public final long date;

        Entry(String displayName, String address, long date) {
            this.displayName = displayName;
            this.address = address;
            this.date = date;
        }
    }

    private SnapRecentCalls() {}

    public static List<Entry> load(Context context, int limit) {
        List<Entry> out = new ArrayList<>();
        String[] projection = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
                ? new String[] {
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.CACHED_NAME,
                    CallLog.Calls.DATE,
                    "phone_account_address"
                }
                : new String[] {
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.CACHED_NAME,
                    CallLog.Calls.DATE
                };
        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    projection,
                    CallLog.Calls.CACHED_NAME + " LIKE ?",
                    new String[] {"%(Snapchat)%"},
                    CallLog.Calls.DATE + " DESC LIMIT " + limit);
            if (cursor == null) return out;
            while (cursor.moveToNext()) {
                String number = cursor.getString(0);
                String cached = cursor.getString(1);
                long date = cursor.getLong(2);
                String address = null;
                if (projection.length > 3) {
                    address = cursor.getString(3);
                }
                String name;
                if (number != null && number.startsWith("snap")) {
                    name = SnapUserStore.getDisplayName(context, number);
                    if (name.startsWith("snap")) name = stripSnapchat(cached);
                    if (address == null || address.isEmpty()) {
                        address = SnapUserStore.resolveAddress(context, number);
                    }
                } else {
                    name = number != null && !number.isEmpty() ? number : stripSnapchat(cached);
                    if (address == null || address.isEmpty()) {
                        address = SnapUserStore.addressFor(name, "");
                    }
                }
                out.add(new Entry(name, address, date));
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return out;
    }

    private static String stripSnapchat(String cached) {
        if (cached == null) return "Snapchat";
        return cached.replace(" (Snapchat)", "").trim();
    }
}
