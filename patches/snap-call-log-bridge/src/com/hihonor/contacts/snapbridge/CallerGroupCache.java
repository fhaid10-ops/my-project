package com.hihonor.contacts.snapbridge;

import android.content.Context;

import java.util.ArrayList;
import java.util.List;

/** ذاكرة مؤقتة لنتيجة التجميع — تُبطَل عند تغيير قائمة الفقاعة. */
public final class CallerGroupCache {
    private static List<CallerGroupHelper.CallerGroup> cachedGroups;
    private static int cachedQueueSize = -1;
    private static CallerGroupHelper.CallerGroup pendingDetailGroup;

    private CallerGroupCache() {}

    public static void invalidate() {
        cachedGroups = null;
        cachedQueueSize = -1;
    }

    public static List<CallerGroupHelper.CallerGroup> groupAll(Context context) {
        int size = MissedCallQueueStore.size(context);
        if (cachedGroups != null && cachedQueueSize == size) {
            return new ArrayList<>(cachedGroups);
        }
        List<CallerGroupHelper.CallerGroup> built = CallerGroupHelper.buildGroups(context);
        cachedGroups = built;
        cachedQueueSize = size;
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
