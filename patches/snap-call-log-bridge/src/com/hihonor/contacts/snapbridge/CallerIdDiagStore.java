package com.hihonor.contacts.snapbridge;

import android.content.Context;

public final class CallerIdDiagStore {
    private static final String PREFS = "caller_id_diag";
    private static final String KEY_LINE = "line";

    private CallerIdDiagStore() {}

    public static void record(Context context, int total, int named, boolean truecallerInstalled) {
        String line = "معرف المتصل: " + named + "/" + total
                + (truecallerInstalled ? " · Truecaller مثبّت" : " · Truecaller غير مثبّت");
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_LINE, line)
                .apply();
    }

    public static String statusLine(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_LINE, "");
    }
}
