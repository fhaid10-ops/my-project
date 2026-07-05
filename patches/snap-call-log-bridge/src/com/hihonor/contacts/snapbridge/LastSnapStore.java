package com.hihonor.contacts.snapbridge;

import android.content.Context;

public final class LastSnapStore {
    private static final String PREFS = "last_snap";

    private LastSnapStore() {}

    public static void save(Context context, String displayName, String address) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("name", displayName)
                .putString("address", address)
                .putLong("when", System.currentTimeMillis())
                .apply();
    }

    public static String getName(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("name", null);
    }

    public static String getAddress(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("address", null);
    }
}
