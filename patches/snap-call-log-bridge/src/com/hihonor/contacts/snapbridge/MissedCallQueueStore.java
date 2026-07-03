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

        public Item(String id, String displayName, String number, String snapAddress, boolean isSnap) {
            this.id = id;
            this.displayName = displayName;
            this.number = number;
            this.snapAddress = snapAddress;
            this.isSnap = isSnap;
        }

        JSONObject toJson() {
            JSONObject o = new JSONObject();
            try {
                o.put("id", id);
                o.put("name", displayName);
                o.put("number", number);
                o.put("snapAddress", snapAddress);
                o.put("isSnap", isSnap);
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
                    o.optBoolean("isSnap", false));
        }
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
        if (changed) save(context, items);
        return changed;
    }

    public static int size(Context context) {
        return load(context).size();
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
                    out.add(item);
                }
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    private static void save(Context context, List<Item> items) {
        JSONArray arr = new JSONArray();
        for (Item i : items) {
            arr.put(i.toJson());
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_ITEMS, arr.toString())
                .apply();
    }
}

