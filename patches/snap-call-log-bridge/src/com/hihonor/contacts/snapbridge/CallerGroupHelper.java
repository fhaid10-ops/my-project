package com.hihonor.contacts.snapbridge;

import android.content.Context;

import java.text.Normalizer;
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
        public final String simLabel;
        public final List<MissedCallQueueStore.Item> queuedItems;
        public final long latestTimestamp;

        CallerGroup(String key, String displayName, String number, String snapAddress,
                    boolean isSnap, String sourceLabel, String simLabel,
                    List<MissedCallQueueStore.Item> queuedItems, long latestTimestamp) {
            this.key = key;
            this.displayName = displayName;
            this.number = number;
            this.snapAddress = snapAddress;
            this.isSnap = isSnap;
            this.sourceLabel = sourceLabel;
            this.simLabel = simLabel;
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
        return callerKey(null, item);
    }

    public static String callerKey(Context context, MissedCallQueueStore.Item item) {
        if (item == null) return "";
        if (item.isSnap) {
            String addr = resolveSnapAddress(context, item);
            if (addr != null && !addr.isEmpty()) {
                return "snap:addr:" + addr.toLowerCase(Locale.ROOT);
            }
            if (item.number != null && SnapUserStore.isSnapDialId(item.number)) {
                return "snap:dial:" + item.number;
            }
            String nameKey = normalizeNameKey(item.bestName());
            if (nameKey != null) return "snap:" + nameKey;
            String phone = normalizePhoneKey(item.number);
            if (!phone.isEmpty()) return "snap:num:" + phone;
            return "";
        }
        String phone = normalizePhoneKey(item.number);
        if (!phone.isEmpty()) return "phone:" + phone;
        String nameKey = normalizeNameKey(item.bestName());
        if (nameKey != null) return "phone:name:" + nameKey;
        return "";
    }

    private static String resolveSnapAddress(Context context, MissedCallQueueStore.Item item) {
        if (item.snapAddress != null && !item.snapAddress.isEmpty()) {
            return item.snapAddress;
        }
        if (context != null && item.number != null && SnapUserStore.isSnapDialId(item.number)) {
            return SnapUserStore.addressFromDialId(context, item.number);
        }
        return "";
    }

    public static String normalizePhoneKey(String number) {
        if (number == null) return "";
        String digits = number.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return "";
        if (digits.startsWith("966") && digits.length() > 9) {
            digits = digits.substring(3);
        }
        if (digits.startsWith("00") && digits.length() > 11) {
            digits = digits.substring(2);
            if (digits.startsWith("966") && digits.length() > 9) {
                digits = digits.substring(3);
            }
        }
        if (digits.startsWith("0") && digits.length() > 9) {
            digits = digits.substring(1);
        }
        if (digits.length() >= 9) {
            return digits.substring(digits.length() - 9);
        }
        return digits;
    }

    static String normalizeNameKey(String name) {
        if (name == null) return null;
        String n = name.replace(" (Snapchat)", "").replace("(Snapchat)", "").trim();
        if (n.isEmpty()) return null;
        n = Normalizer.normalize(n, Normalizer.Form.NFKC);
        n = n.replaceAll("[\\p{So}\\p{Sk}\\p{Emoji_Presentation}\\p{Extended_Pictographic}]", "");
        n = n.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
        if (n.isEmpty()) return null;
        if (n.equals("مكالمة فائتة") || n.equals("unknown")) return null;
        if (n.matches("^[+0-9*#\\-\\s]+$")) return null;
        if (n.startsWith("888") && n.length() >= 10) return null;
        return n;
    }

    public static List<CallerGroup> groupAll(Context context) {
        List<MissedCallQueueStore.Item> items = MissedCallQueueStore.all(context);
        Map<String, List<MissedCallQueueStore.Item>> map = new LinkedHashMap<>();
        for (MissedCallQueueStore.Item item : items) {
            String key = callerKey(context, item);
            if (key.isEmpty()) continue;
            List<MissedCallQueueStore.Item> bucket = map.get(key);
            if (bucket == null) {
                bucket = new ArrayList<>();
                map.put(key, bucket);
            }
            bucket.add(item);
        }
        mergeSnapGroupsByName(map);

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
                    summarizeSimLabels(bucket),
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

    /** دمج بطاقات Snapchat المكررة لنفس الشخص (عناوين snap مختلفة أو إيموجي مختلف). */
    private static void mergeSnapGroupsByName(Map<String, List<MissedCallQueueStore.Item>> map) {
        Map<String, String> nameToKey = new LinkedHashMap<>();
        ArrayList<String> keys = new ArrayList<>(map.keySet());
        for (String key : keys) {
            List<MissedCallQueueStore.Item> bucket = map.get(key);
            if (bucket == null || bucket.isEmpty() || !bucket.get(0).isSnap) continue;
            String nameKey = normalizeNameKey(bucket.get(0).bestName());
            if (nameKey == null) continue;
            String mergeId = "snap:name:" + nameKey;
            String canonical = nameToKey.get(mergeId);
            if (canonical == null) {
                nameToKey.put(mergeId, key);
                continue;
            }
            if (canonical.equals(key)) continue;
            List<MissedCallQueueStore.Item> target = map.get(canonical);
            if (target != null) {
                target.addAll(bucket);
            }
            map.remove(key);
        }
    }

    private static String summarizeSimLabels(List<MissedCallQueueStore.Item> items) {
        java.util.LinkedHashSet<String> labels = new java.util.LinkedHashSet<>();
        for (MissedCallQueueStore.Item item : items) {
            String label = item.bestSimLabel();
            if (label != null && !label.isEmpty()) labels.add(label);
        }
        if (labels.isEmpty()) return "";
        if (labels.size() == 1) return labels.iterator().next();
        StringBuilder sb = new StringBuilder();
        for (String label : labels) {
            if (sb.length() > 0) sb.append(" / ");
            sb.append(label);
        }
        return sb.toString();
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
            MissedCallDismissStore.dismiss(context, item.id);
            if (MissedCallQueueStore.remove(context, item.id)) removed++;
        }
        return removed;
    }
}
