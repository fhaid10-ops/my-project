package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.provider.CallLog;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
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
        return callerKey(context, item, null);
    }

    public static String callerKey(Context context, MissedCallQueueStore.Item item,
                                   CallLogRowCache rowCache) {
        if (item == null) return "";
        if (item.isSnap) {
            String snapKey = snapGroupKey(context, item, rowCache);
            if (!snapKey.isEmpty()) return "snap:" + snapKey;
            return "";
        }
        String phone = normalizePhoneKey(item.number);
        if (!phone.isEmpty()) return "phone:" + phone;
        String nameKey = normalizeNameKey(item.bestName());
        if (nameKey != null) return "phone:name:" + nameKey;
        return "";
    }

    /** مفتاح تجميع Snapchat: الاسم الحقيقي أولاً، ثم العنوان، ثم رقم الاتصال الداخلي. */
    static String snapGroupKey(Context context, MissedCallQueueStore.Item item) {
        return snapGroupKey(context, item, null);
    }

    static String snapGroupKey(Context context, MissedCallQueueStore.Item item,
                               CallLogRowCache rowCache) {
        if (item == null) return "";
        String addr = resolveSnapAddress(context, item);
        String formatted = formattedForItem(context, item, rowCache);
        String resolved = SnapNameHelper.resolve(context, item.number, addr, item.displayName, formatted);

        String nameKey = normalizeNameKey(resolved);
        if (nameKey != null && !isWeakSnapNameKey(nameKey)) {
            return "name:" + nameKey;
        }

        String fmtKey = normalizeNameKey(SnapNameHelper.clean(formatted));
        if (fmtKey != null && !isWeakSnapNameKey(fmtKey)) {
            return "name:" + fmtKey;
        }

        if (context != null && !SnapNameHelper.isGenericAppName(resolved)) {
            String byIdentity = SnapUserStore.addressForIdentity(context, resolved);
            if (byIdentity != null && !byIdentity.isEmpty()) {
                return "addr:" + byIdentity.toLowerCase(Locale.ROOT);
            }
        }

        if (addr != null && !addr.isEmpty()) {
            return "addr:" + addr.toLowerCase(Locale.ROOT);
        }

        if (item.number != null && SnapUserStore.isSnapDialId(item.number)) {
            return "dial:" + item.number;
        }

        if (nameKey != null) return "name:" + nameKey;
        if (fmtKey != null) return "name:" + fmtKey;
        return "";
    }

    private static boolean isWeakSnapNameKey(String key) {
        if (key == null || key.isEmpty()) return true;
        if (key.equals("888")) return true;
        if (key.matches("888\\d+")) return true;
        return SnapNameHelper.isGenericAppName(key);
    }

    private static String resolveSnapAddress(Context context, MissedCallQueueStore.Item item) {
        if (item.snapAddress != null && !item.snapAddress.isEmpty()) {
            return item.snapAddress;
        }
        if (context != null && item.number != null && SnapUserStore.isSnapDialId(item.number)) {
            String mapped = SnapUserStore.addressFromDialId(context, item.number);
            if (mapped != null && !mapped.isEmpty()) return mapped;
        }
        if (context != null && item.displayName != null && !item.displayName.isEmpty()) {
            String byIdentity = SnapUserStore.addressForIdentity(context, item.displayName);
            if (byIdentity != null && !byIdentity.isEmpty()) return byIdentity;
        }
        return "";
    }

    private static String formattedForItem(Context context, MissedCallQueueStore.Item item,
                                           CallLogRowCache rowCache) {
        if (item == null) return "";
        if (!SnapNameHelper.isGenericAppName(item.displayName)
                && !SnapNameHelper.looksLikeDialId(item.displayName)) {
            return item.displayName;
        }
        if (!SnapNameHelper.isGenericAppName(item.resolvedName)
                && !SnapNameHelper.looksLikeDialId(item.resolvedName)) {
            return item.resolvedName;
        }
        if (rowCache != null) {
            String cached = rowCache.formatted(item.id);
            if (cached != null && !cached.isEmpty()) return cached;
        }
        return context != null ? lookupFormattedNumber(context, item.id) : "";
    }

    private static String lookupFormattedNumber(Context context, String id) {
        if (context == null || id == null || id.isEmpty()) return "";
        try {
            android.database.Cursor cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[] {CallLog.Calls.CACHED_FORMATTED_NUMBER},
                    CallLog.Calls._ID + "=?",
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
        return CallerGroupCache.groupAll(context);
    }

    static List<CallerGroup> buildGroups(Context context) {
        List<MissedCallQueueStore.Item> items = MissedCallQueueStore.all(context);
        CallLogRowCache rowCache = CallLogRowCache.load(context, items);
        Map<String, List<MissedCallQueueStore.Item>> map = new LinkedHashMap<>();
        for (MissedCallQueueStore.Item item : items) {
            String key = callerKey(context, item, rowCache);
            if (key.isEmpty()) continue;
            List<MissedCallQueueStore.Item> bucket = map.get(key);
            if (bucket == null) {
                bucket = new ArrayList<>();
                map.put(key, bucket);
            }
            bucket.add(item);
        }
        mergeSnapGroups(context, map, rowCache);

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
            String displayName = latest.isSnap
                    ? pickBestSnapDisplayName(context, bucket, rowCache)
                    : latest.bestName();
            groups.add(new CallerGroup(
                    entry.getKey(),
                    displayName,
                    latest.number,
                    resolveSnapAddress(context, latest),
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

    private static String pickBestSnapDisplayName(Context context,
                                                  List<MissedCallQueueStore.Item> bucket,
                                                  CallLogRowCache rowCache) {
        for (MissedCallQueueStore.Item item : bucket) {
            String formatted = formattedForItem(context, item, rowCache);
            String resolved = SnapNameHelper.resolve(context, item.number,
                    resolveSnapAddress(context, item), item.displayName, formatted);
            if (!SnapNameHelper.isGenericAppName(resolved) && !SnapNameHelper.looksLikeDialId(resolved)) {
                return resolved;
            }
        }
        for (MissedCallQueueStore.Item item : bucket) {
            String name = item.bestName();
            if (!SnapNameHelper.isGenericAppName(name) && !SnapNameHelper.looksLikeDialId(name)) {
                return name;
            }
        }
        return "مكالمة Snapchat";
    }

    /** دمج بطاقات Snapchat المكررة لنفس الشخص. */
    private static void mergeSnapGroups(Context context,
                                        Map<String, List<MissedCallQueueStore.Item>> map,
                                        CallLogRowCache rowCache) {
        Map<String, List<String>> mergeIndex = new LinkedHashMap<>();
        for (String key : new ArrayList<>(map.keySet())) {
            List<MissedCallQueueStore.Item> bucket = map.get(key);
            if (bucket == null || bucket.isEmpty() || !bucket.get(0).isSnap) continue;

            LinkedHashSet<String> mergeIds = new LinkedHashSet<>();
            for (MissedCallQueueStore.Item item : bucket) {
                String id = snapMergeId(context, item, rowCache);
                if (!id.isEmpty()) mergeIds.add(id);
                for (String name : collectSnapNameCandidates(context, item, rowCache)) {
                    String nk = normalizeNameKey(name);
                    if (nk != null && !isWeakSnapNameKey(nk)) {
                        mergeIds.add("name:" + nk);
                    }
                }
            }
            for (String mergeId : mergeIds) {
                List<String> keyList = mergeIndex.get(mergeId);
                if (keyList == null) {
                    keyList = new ArrayList<>();
                    mergeIndex.put(mergeId, keyList);
                }
                if (!keyList.contains(key)) keyList.add(key);
            }
        }

        for (List<String> keyList : mergeIndex.values()) {
            if (keyList.size() <= 1) continue;
            String canonical = keyList.get(0);
            List<MissedCallQueueStore.Item> target = map.get(canonical);
            if (target == null) continue;
            for (int i = 1; i < keyList.size(); i++) {
                String other = keyList.get(i);
                List<MissedCallQueueStore.Item> bucket = map.get(other);
                if (bucket != null) {
                    target.addAll(bucket);
                    map.remove(other);
                }
            }
        }
    }

    private static String snapMergeId(Context context, MissedCallQueueStore.Item item,
                                    CallLogRowCache rowCache) {
        String primary = snapGroupKey(context, item, rowCache);
        for (String name : collectSnapNameCandidates(context, item, rowCache)) {
            String nk = normalizeNameKey(name);
            if (nk != null && !isWeakSnapNameKey(nk)) {
                return "name:" + nk;
            }
        }
        return primary;
    }

    private static List<String> collectSnapNameCandidates(Context context,
                                                          MissedCallQueueStore.Item item,
                                                          CallLogRowCache rowCache) {
        ArrayList<String> out = new ArrayList<>();
        String addr = resolveSnapAddress(context, item);
        String formatted = formattedForItem(context, item, rowCache);
        out.add(SnapNameHelper.resolve(context, item.number, addr, item.displayName, formatted));
        out.add(SnapNameHelper.clean(formatted));
        out.add(item.displayName);
        out.add(item.resolvedName);
        out.add(item.bestName());
        if (context != null) {
            if (item.number != null) out.add(SnapUserStore.getDisplayName(context, item.number));
            if (addr != null && !addr.isEmpty()) {
                out.add(SnapUserStore.getDisplayName(context, addr));
            }
        }
        return out;
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
        return CallerGroupCache.findByKey(context, key);
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
