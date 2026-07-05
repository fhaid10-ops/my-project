package com.hihonor.contacts.snapbridge;

import android.content.Context;

import java.util.ArrayList;
import java.util.List;

/** ذاكرة مؤقتة لنتيجة التجميع — تُبطَل عند تغيير قائمة الفقاعة. */
public final class CallerGroupCache {
    private static List<CallerGroupHelper.CallerGroup> cachedGroups;
    private static String cachedFingerprint = "";
    private static CallerGroupHelper.CallerGroup pendingDetailGroup;

    private CallerGroupCache() {}

    public static void invalidate() {
        cachedGroups = null;
        cachedFingerprint = "";
    }

    public static List<CallerGroupHelper.CallerGroup> groupAll(Context context) {
        String fingerprint = MissedCallQueueStore.fingerprint(context);
        if (cachedGroups != null && fingerprint.equals(cachedFingerprint)) {
            return new ArrayList<>(cachedGroups);
        }
        List<CallerGroupHelper.CallerGroup> built = CallerGroupHelper.buildGroups(context);
        cachedGroups = built;
        cachedFingerprint = fingerprint;
        return new ArrayList<>(built);
    }

    public static CallerGroupHelper.CallerGroup findByKey(Context context, String key) {
        if (key == null || key.isEmpty()) return null;
        if (pendingDetailGroup != null && key.equals(pendingDetailGroup.key)) {
            return pendingDetailGroup;
        }
        for (CallerGroupHelper.CallerGroup group : groupAll(context)) {
            if (key.equals(group.key)) return group;
        }
        return null;
    }

    public static void setPendingDetail(CallerGroupHelper.CallerGroup group) {
        pendingDetailGroup = group;
    }

    public static CallerGroupHelper.CallerGroup takePendingDetail(String key) {
        if (pendingDetailGroup != null && key != null && key.equals(pendingDetailGroup.key)) {
            CallerGroupHelper.CallerGroup group = pendingDetailGroup;
            pendingDetailGroup = null;
            return group;
        }
        return null;
    }
}
