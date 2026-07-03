package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.database.Cursor;
import android.provider.CallLog;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public final class CallerCallHistory {
    private static final int DEFAULT_DAYS = 14;

    private CallerCallHistory() {}

    public static final class Record {
        public final long id;
        public final int type;
        public final long date;
        public final int durationSec;
        public final String number;
        public final String cachedName;

        public Record(long id, int type, long date, int durationSec, String number, String cachedName) {
            this.id = id;
            this.type = type;
            this.date = date;
            this.durationSec = durationSec;
            this.number = number;
            this.cachedName = cachedName;
        }

        public boolean isMissed() {
            return type == CallLog.Calls.MISSED_TYPE;
        }

        public boolean isIncoming() {
            return type == CallLog.Calls.INCOMING_TYPE;
        }
    }

    public static List<Record> forGroup(Context context, CallerGroupHelper.CallerGroup group) {
        return forGroup(context, group, DEFAULT_DAYS);
    }

    public static List<Record> forGroup(Context context, CallerGroupHelper.CallerGroup group, int days) {
        if (group == null) return new ArrayList<>();
        long since = startDaysAgo(days);
        ArrayList<Record> out = new ArrayList<>();
        Cursor cursor = null;
        try {
            if (group.isSnap) {
                cursor = querySnap(context, group, since);
            } else {
                cursor = queryPhone(context, group, since);
            }
            if (cursor == null) return out;
            while (cursor.moveToNext()) {
                int type = cursor.getInt(1);
                if (type != CallLog.Calls.MISSED_TYPE && type != CallLog.Calls.INCOMING_TYPE) {
                    continue;
                }
                out.add(new Record(
                        cursor.getLong(0),
                        type,
                        cursor.getLong(2),
                        cursor.getInt(3),
                        cursor.getString(4),
                        cursor.getString(5)));
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return out;
    }

    private static Cursor queryPhone(Context context, CallerGroupHelper.CallerGroup group, long since) {
        String key = CallerGroupHelper.normalizePhoneKey(group.number);
        if (!key.isEmpty()) {
            String selection = CallLog.Calls.NUMBER + " LIKE ?"
                    + " AND " + CallLog.Calls.TYPE + " IN (?,?)"
                    + " AND " + CallLog.Calls.DATE + ">=?";
            String[] args = new String[] {
                    "%" + key,
                    String.valueOf(CallLog.Calls.MISSED_TYPE),
                    String.valueOf(CallLog.Calls.INCOMING_TYPE),
                    String.valueOf(since)
            };
            return context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    projection(),
                    selection,
                    args,
                    CallLog.Calls.DATE + " DESC");
        }
        String name = group.displayName != null ? group.displayName : "";
        String selection = CallLog.Calls.CACHED_NAME + " LIKE ?"
                + " AND " + CallLog.Calls.TYPE + " IN (?,?)"
                + " AND " + CallLog.Calls.DATE + ">=?";
        String[] args = new String[] {
                "%" + name + "%",
                String.valueOf(CallLog.Calls.MISSED_TYPE),
                String.valueOf(CallLog.Calls.INCOMING_TYPE),
                String.valueOf(since)
        };
        return context.getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                projection(),
                selection,
                args,
                CallLog.Calls.DATE + " DESC");
    }

    private static Cursor querySnap(Context context, CallerGroupHelper.CallerGroup group, long since) {
        String name = group.displayName != null ? group.displayName : "";
        String likeName = "%" + name + "%";
        String selection = "(" + CallLog.Calls.PHONE_ACCOUNT_ID + "=?"
                + " OR " + CallLog.Calls.CACHED_NAME + " LIKE ?"
                + " OR " + CallLog.Calls.NUMBER + "=?"
                + " OR " + CallLog.Calls.CACHED_FORMATTED_NUMBER + "=?)"
                + " AND " + CallLog.Calls.TYPE + " IN (?,?)"
                + " AND " + CallLog.Calls.DATE + ">=?";
        String[] args = new String[] {
                SnapPhoneAccount.ACCOUNT_ID,
                likeName,
                group.number != null ? group.number : "",
                name,
                String.valueOf(CallLog.Calls.MISSED_TYPE),
                String.valueOf(CallLog.Calls.INCOMING_TYPE),
                String.valueOf(since)
        };
        return context.getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                projection(),
                selection,
                args,
                CallLog.Calls.DATE + " DESC");
    }

    private static String[] projection() {
        return new String[] {
                CallLog.Calls._ID,
                CallLog.Calls.TYPE,
                CallLog.Calls.DATE,
                CallLog.Calls.DURATION,
                CallLog.Calls.NUMBER,
                CallLog.Calls.CACHED_NAME
        };
    }

    private static long startDaysAgo(int days) {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_MONTH, -days);
        return c.getTimeInMillis();
    }

    public static String typeLabel(Context context, Record record) {
        if (record.isMissed()) return "فائتة";
        if (record.isIncoming()) return "واردة";
        return "مكالمة";
    }

    public static String durationLabel(Record record) {
        if (!record.isIncoming() || record.durationSec <= 0) return "";
        int m = record.durationSec / 60;
        int s = record.durationSec % 60;
        if (m > 0) return String.format(Locale.getDefault(), "%d:%02d د", m, s);
        return String.format(Locale.getDefault(), "%d ث", s);
    }
}
