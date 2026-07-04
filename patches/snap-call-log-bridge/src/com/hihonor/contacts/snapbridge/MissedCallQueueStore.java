package com.hihonor.contacts.snapbridge;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public final class MissedCallQueueStore {
    private static final String PREFS = "missed_call_queue";
    private static final String KEY_ITEMS = "items";

    private MissedCallQueueStore() {}

    public static final class Item {
        public final String id;
        public final String displayName;
        public final String number;
        public final String snapAddress;
        public final boolean isSnap;
        public final long timestamp;
        public final String sourceLabel;
        public final String resolvedName;
        public final String subtitle;
        public final String simLabel;

        public Item(String id, String displayName, String number, String snapAddress, boolean isSnap) {
            this(id, displayName, number, snapAddress, isSnap, 0L, "", "", "", "");
        }

        public Item(String id, String displayName, String number, String snapAddress, boolean isSnap,
                    long timestamp, String sourceLabel, String resolvedName, String subtitle) {
            this(id, displayName, number, snapAddress, isSnap, timestamp, sourceLabel, resolvedName, subtitle, "");
        }

        public Item(String id, String displayName, String number, String snapAddress, boolean isSnap,
                    long timestamp, String sourceLabel, String resolvedName, String subtitle,
                    String simLabel) {
            this.id = id;
            this.displayName = displayName;
            this.number = number;
            this.snapAddress = snapAddress;
            this.isSnap = isSnap;
            this.timestamp = timestamp;
            this.sourceLabel = sourceLabel != null ? sourceLabel : "";
            this.resolvedName = resolvedName != null ? resolvedName : "";
            this.subtitle = subtitle != null ? subtitle : "";
            this.simLabel = simLabel != null ? simLabel : "";
        }

        public String bestName() {
            String name = resolvedName != null && !resolvedName.isEmpty()
                    ? resolvedName : displayName;
            if (name == null || name.isEmpty()) return "مكالمة فائتة";
            if (CallUiHelper.isMostlyPhone(name)) return CallUiHelper.compactPhone(name);
            return name;
        }

        public String bestSubtitle() {
            if (subtitle != null && !subtitle.isEmpty()) {
                if (CallUiHelper.isMostlyPhone(subtitle)) return CallUiHelper.compactPhone(subtitle);
                return subtitle;
            }
            if (isSnap) return "Snapchat";
            return number != null ? CallUiHelper.compactPhone(number) : "";
        }

        public String bestSourceLabel() {
            if (sourceLabel != null && !sourceLabel.isEmpty()) return sourceLabel;
            return isSnap ? "Snapchat" : "هاتف";
        }

        public String bestSimLabel() {
            return simLabel != null ? simLabel : "";
        }

        JSONObject toJson() {
            JSONObject o = new JSONObject();
            try {
                o.put("id", id);
                o.put("name", displayName);
                o.put("number", number);
                o.put("snapAddress", snapAddress);
                o.put("isSnap", isSnap);
                o.put("timestamp", timestamp);
                o.put("sourceLabel", sourceLabel);
                o.put("resolvedName", resolvedName);
                o.put("subtitle", subtitle);
                o.put("simLabel", simLabel);
            } catch (Exception ignored) {
            }
            return o;
        }

        static Item fromJson(JSONObject o) {
            if (o == null) return null;
            return new Item(
                    o.optString("id", ""),
                    o.optString("name", ""),
                    o.optString("number", ""),
                    o.optString("snapAddress", ""),
                    o.optBoolean("isSnap", false),
                    o.optLong("timestamp", 0L),
                    o.optString("sourceLabel", ""),
                    o.optString("resolvedName", ""),
                    o.optString("subtitle", ""),
                    o.optString("simLabel", ""));
        }
    }

    public static Item build(Context context, String id, String displayName, String number,
                             String snapAddress, boolean isSnap, long timestamp, String sourceLabel) {
        return build(context, id, displayName, number, snapAddress, isSnap, timestamp, sourceLabel, "");
    }

    public static Item build(Context context, String id, String displayName, String number,
                             String snapAddress, boolean isSnap, long timestamp, String sourceLabel,
                             String phoneAccountId) {
        String resolvedName = displayName;
        String subtitle = "";
        String simLabel = "";
        if (isSnap) {
            resolvedName = SnapNameHelper.resolve(context, number, snapAddress, displayName, "");
            subtitle = "Snapchat";
        } else {
            CallerIdentityResolver.Identity identity = CallerIdentityResolver.resolve(
                    context, number, displayName, false, sourceLabel);
            resolvedName = identity.displayName;
            subtitle = identity.subtitle;
            sourceLabel = identity.sourceLabel;
            simLabel = SimSlotHelper.resolveLabel(context, phoneAccountId);
        }
        return new Item(
                id,
                displayName,
                number,
                snapAddress,
                isSnap,
                timestamp,
                sourceLabel != null ? sourceLabel : "",
                resolvedName,
                subtitle,
                simLabel);
    }

    public static boolean enqueue(Context context, Item item) {
        if (item == null || item.id == null || item.id.isEmpty()) return false;
        List<Item> items = load(context);
        for (Item i : items) {
            if (item.id.equals(i.id)) return false;
        }
        items.add(item);
        save(context, items);
        return true;
    }

    public static Item first(Context context) {
        List<Item> items = load(context);
        return items.isEmpty() ? null : items.get(0);
    }

    public static Item byId(Context context, String id) {
        if (id == null) return null;
        for (Item i : load(context)) {
            if (id.equals(i.id)) return i;
        }
        return null;
    }

    public static boolean remove(Context context, String id) {
        if (id == null) return false;
        List<Item> items = load(context);
        boolean changed = false;
        for (int i = items.size() - 1; i >= 0; i--) {
            if (id.equals(items.get(i).id)) {
                items.remove(i);
                changed = true;
            }
        }
        if (changed) {
            save(context, items, true);
        }
        return changed;
    }

    public static int size(Context context) {
        return load(context).size();
    }

    public static List<Item> all(Context context) {
        return new ArrayList<>(load(context));
    }

    private static List<Item> load(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_ITEMS, "[]");
        ArrayList<Item> out = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                Item item = Item.fromJson(arr.optJSONObject(i));
                if (item != null && item.id != null && !item.id.isEmpty()) {
                    out.add(enrichIfNeeded(context, item));
                }
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    private static Item enrichIfNeeded(Context context, Item item) {
        long timestamp = item.timestamp;
        if (timestamp <= 0L) {
            timestamp = lookupTimestamp(context, item.id);
        }
        Item rebuilt = build(context, item.id, item.displayName, item.number,
                item.snapAddress, item.isSnap, timestamp, item.sourceLabel,
                lookupPhoneAccountId(context, item.id));
        String simLabel = rebuilt.simLabel;
        if (simLabel.isEmpty() && !item.simLabel.isEmpty()) simLabel = item.simLabel;
        if (!simLabel.equals(rebuilt.simLabel)) {
            rebuilt = new Item(
                    rebuilt.id, rebuilt.displayName, rebuilt.number, rebuilt.snapAddress,
                    rebuilt.isSnap, rebuilt.timestamp, rebuilt.sourceLabel, rebuilt.resolvedName,
                    rebuilt.subtitle, simLabel);
        }
        if (item.isSnap && SnapNameHelper.isGenericAppName(rebuilt.resolvedName)) {
            String formatted = lookupFormattedNumber(context, item.id);
            String resolved = SnapNameHelper.resolve(context, item.number, item.snapAddress,
                    item.displayName, formatted);
            if (!SnapNameHelper.isGenericAppName(resolved)) {
                return new Item(
                        rebuilt.id, rebuilt.displayName, rebuilt.number, rebuilt.snapAddress,
                        rebuilt.isSnap, rebuilt.timestamp, rebuilt.sourceLabel, resolved,
                        rebuilt.subtitle, rebuilt.simLabel);
            }
        }
        return rebuilt;
    }

    private static String lookupPhoneAccountId(Context context, String id) {
        try {
            android.database.Cursor cursor = context.getContentResolver().query(
                    android.provider.CallLog.Calls.CONTENT_URI,
                    new String[] {android.provider.CallLog.Calls.PHONE_ACCOUNT_ID},
                    android.provider.CallLog.Calls._ID + "=?",
                    new String[] {id},
                    null);
            if (cursor != null) {
                try {
                    if (cursor.moveToFirst()) {
                        String value = cursor.getString(0);
                        return value != null ? value : "";
                    }
                } finally {
                    cursor.close();
                }
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    private static String lookupFormattedNumber(Context context, String id) {
        try {
            android.database.Cursor cursor = context.getContentResolver().query(
                    android.provider.CallLog.Calls.CONTENT_URI,
                    new String[] {android.provider.CallLog.Calls.CACHED_FORMATTED_NUMBER},
                    android.provider.CallLog.Calls._ID + "=?",
                    new String[] {id},
                    null);
            if (cursor != null) {
                try {
                    if (cursor.moveToFirst()) {
                        String value = cursor.getString(0);
                        return value != null ? value : "";
                    }
                } finally {
                    cursor.close();
                }
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    private static long lookupTimestamp(Context context, String id) {
        try {
            android.database.Cursor cursor = context.getContentResolver().query(
                    android.provider.CallLog.Calls.CONTENT_URI,
                    new String[] {android.provider.CallLog.Calls.DATE},
                    android.provider.CallLog.Calls._ID + "=?",
                    new String[] {id},
                    null);
            if (cursor != null) {
                try {
                    if (cursor.moveToFirst()) return cursor.getLong(0);
                } finally {
                    cursor.close();
                }
            }
        } catch (Exception ignored) {
        }
        return 0L;
    }

    private static void save(Context context, List<Item> items) {
        save(context, items, false);
    }

    private static void save(Context context, List<Item> items, boolean sync) {
        JSONArray arr = new JSONArray();
        for (Item i : items) {
            arr.put(i.toJson());
        }
        if (sync) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                    .putString(KEY_ITEMS, arr.toString())
                    .commit();
        } else {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                    .putString(KEY_ITEMS, arr.toString())
                    .apply();
        }
    }
}
