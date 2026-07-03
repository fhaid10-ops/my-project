package com.hihonor.contacts.snapbridge;

import android.content.Context;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class CallerGroupHelper {
    public static final String EXTRA_CALLER_KEY = "caller_key";

    private CallerGroupHelper() {}

    public static final class CallerGroup {
        public final String key;
        public final String displayName;
        public final String number;
        public final String snapAddress;
        public final boolean isSnap;
        public final String sourceLabel;
        public final List<MissedCallQueueStore.Item> queuedItems;
        public final long latestTimestamp;

        CallerGroup(String key, String displayName, String number, String snapAddress,
                    boolean isSnap, String sourceLabel,
                    List<MissedCallQueueStore.Item> queuedItems, long latestTimestamp) {
            this.key = key;
            this.displayName = displayName;
            this.number = number;
            this.snapAddress = snapAddress;
            this.isSnap = isSnap;
            this.sourceLabel = sourceLabel;
            this.queuedItems = queuedItems;
            this.latestTimestamp = latestTimestamp;
        }

        public int missedCount() {
            return queuedItems.size();
        }

        public MissedCallQueueStore.Item representative() {
            return queuedItems.isEmpty() ? null : queuedItems.get(0);
        }
    }

    public static String callerKey(MissedCallQueueStore.Item item) {
        if (item == null) return "";
        if (item.isSnap) {
            if (item.snapAddress != null && !item.snapAddress.isEmpty()) {
                return "snap:addr:" + item.snapAddress.toLowerCase(Locale.ROOT);
            }
            if (item.number != null && item.number.startsWith("888")) {
                return "snap:num:" + item.number;
            }
            return "snap:name:" + item.bestName().toLowerCase(Locale.ROOT);
        }
        String digits = digitsOnly(item.number);
        if (!digits.isEmpty()) return "phone:" + digits;
        return "phone:name:" + item.bestName().toLowerCase(Locale.ROOT);
    }

    public static List<CallerGroup> groupAll(Context context) {
        List<MissedCallQueueStore.Item> items = MissedCallQueueStore.all(context);
        Map<String, List<MissedCallQueueStore.Item>> map = new LinkedHashMap<>();
        for (MissedCallQueueStore.Item item : items) {
            String key = callerKey(item);
            if (key.isEmpty()) continue;
            List<MissedCallQueueStore.Item> bucket = map.get(key);
            if (bucket == null) {
                bucket = new ArrayList<>();
                map.put(key, bucket);
            }
            bucket.add(item);
        }

        ArrayList<CallerGroup> groups = new ArrayList<>();
        for (Map.Entry<String, List<MissedCallQueueStore.Item>> entry : map.entrySet()) {
            List<MissedCallQueueStore.Item> bucket = entry.getValue();
            Collections.sort(bucket, new Comparator<MissedCallQueueStore.Item>() {
                @Override
                public int compare(MissedCallQueueStore.Item a, MissedCallQueueStore.Item b) {
                    return Long.compare(b.timestamp, a.timestamp);
                }
            });
            MissedCallQueueStore.Item latest = bucket.get(0);
            groups.add(new CallerGroup(
                    entry.getKey(),
                    latest.bestName(),
                    latest.number,
                    latest.snapAddress,
                    latest.isSnap,
                    latest.bestSourceLabel(),
                    bucket,
                    latest.timestamp));
        }
        Collections.sort(groups, new Comparator<CallerGroup>() {
            @Override
            public int compare(CallerGroup a, CallerGroup b) {
                return Long.compare(b.latestTimestamp, a.latestTimestamp);
            }
        });
        return groups;
    }

    public static CallerGroup findByKey(Context context, String key) {
        if (key == null || key.isEmpty()) return null;
        for (CallerGroup group : groupAll(context)) {
            if (key.equals(group.key)) return group;
        }
        return null;
    }

    public static int removeByKey(Context context, String key) {
        CallerGroup group = findByKey(context, key);
        if (group == null) return 0;
        int removed = 0;
        for (MissedCallQueueStore.Item item : group.queuedItems) {
            if (MissedCallQueueStore.remove(context, item.id)) removed++;
        }
        return removed;
    }

    private static String digitsOnly(String raw) {
        if (raw == null) return "";
        return raw.replaceAll("[^0-9+]", "");
    }
}
