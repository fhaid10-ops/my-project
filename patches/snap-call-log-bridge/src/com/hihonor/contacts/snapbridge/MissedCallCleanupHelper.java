package com.hihonor.contacts.snapbridge;

import android.content.Context;

import java.util.List;

public final class MissedCallCleanupHelper {
    private MissedCallCleanupHelper() {}

    public static int countInRange(Context context, long fromMs, long toMs) {
        int count = 0;
        for (MissedCallQueueStore.Item item : MissedCallQueueStore.all(context)) {
            if (isInRange(item.timestamp, fromMs, toMs)) count++;
        }
        return count;
    }

    public static int removeInRange(Context context, long fromMs, long toMs) {
        List<MissedCallQueueStore.Item> items = MissedCallQueueStore.all(context);
        int removed = 0;
        for (MissedCallQueueStore.Item item : items) {
            if (!isInRange(item.timestamp, fromMs, toMs)) continue;
            MissedCallDismissStore.dismiss(context, item.id);
            if (MissedCallQueueStore.remove(context, item.id)) removed++;
        }
        if (removed > 0) {
            CallerGroupCache.invalidate();
            MissedCallOverlayController.refresh(context);
        }
        return removed;
    }

    public static boolean groupMatchesRange(CallerGroupHelper.CallerGroup group,
                                            long fromMs, long toMs) {
        if (group == null || group.queuedItems == null) return false;
        for (MissedCallQueueStore.Item item : group.queuedItems) {
            if (isInRange(item.timestamp, fromMs, toMs)) return true;
        }
        return false;
    }

    private static boolean isInRange(long timestamp, long fromMs, long toMs) {
        if (timestamp <= 0) return false;
        return timestamp >= fromMs && timestamp <= toMs;
    }
}
