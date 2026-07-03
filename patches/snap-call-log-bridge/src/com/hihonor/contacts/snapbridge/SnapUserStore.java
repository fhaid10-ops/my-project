package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.net.Uri;

public final class SnapUserStore {
    private static final String PREFS = "snap_users";

    private SnapUserStore() {}

    public static String addressFor(String displayName, String snapUsername) {
        String key = snapUsername != null && !snapUsername.isEmpty() ? snapUsername : displayName;
        return "snap:" + Uri.encode(key);
    }

    public static void save(Context context, String address, String displayName, String snapUsername) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("display:" + address, displayName)
                .putString("user:" + address, snapUsername != null ? snapUsername : "")
                .apply();
    }

    public static String getDisplayName(Context context, String address) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("display:" + address, address);
    }

    public static String getSnapUser(Context context, String address) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("user:" + address, "");
    }
}
