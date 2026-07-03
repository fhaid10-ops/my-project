package com.hihonor.contacts.snapbridge;

import android.content.Context;

import java.util.Calendar;

public final class MissedCallsBackfill {
    private MissedCallsBackfill() {}

    /**
     * Marks missed calls since yesterday as unread/new so they appear as missed bubbles.
     * Includes regular phone calls and Snapchat entries.
     */
    public static int markSinceYesterday(Context context) {
        return MissedCallScanner.enqueueAllMissedSince(context, startOfYesterdayMillis(), true);
    }

    private static long startOfYesterdayMillis() {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        c.add(Calendar.DAY_OF_MONTH, -1);
        return c.getTimeInMillis();
    }
}
