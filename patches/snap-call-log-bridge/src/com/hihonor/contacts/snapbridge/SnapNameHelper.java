package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.text.TextUtils;

import java.util.Locale;

public final class SnapNameHelper {
    private SnapNameHelper() {}

    public static boolean isGenericAppName(String name) {
        if (TextUtils.isEmpty(name)) return true;
        if (isSnapAddress(name)) return true;
        if (isHiddenSensitivePlaceholder(name)) return true;
        if (looksLikeDialId(name)) return true;
        String n = name.trim().toLowerCase(Locale.ROOT);
        if (n.equals("snapchat") || n.equals("snap") || n.equals("سناب") || n.equals("سناب شات")
                || n.equals("سنابشات") || n.equals("سناب شات")) {
            return true;
        }
        if (n.equals("مكالمة snapchat") || n.equals("مكالمة سناب") || n.equals("مكالمة فائتة")
                || n.equals("unknown") || n.equals("voip")) {
            return true;
        }
        return n.contains("مكالمة") && (n.contains("snap") || n.contains("سناب"));
    }

    /** Honor / Snapchat يستبدلان الاسم أحياناً بهذه العبارة — نرفضها ونستعيد الاسم المحفوظ. */
    public static boolean isHiddenSensitivePlaceholder(String name) {
        if (TextUtils.isEmpty(name)) return false;
        String n = name.trim();
        if (n.contains("البيانات الحساسة")) return true;
        if (n.contains("حساسة") && n.contains("مخفية")) return true;
        String lower = n.toLowerCase(Locale.ROOT);
        return lower.contains("sensitive data") || lower.contains("hidden sensitive");
    }

    public static String pickBestSnapName(Context context, String number, String snapAddress,
                                          String... candidates) {
        if (candidates != null) {
            for (String candidate : candidates) {
                String cleaned = clean(candidate);
                if (!isGenericAppName(cleaned)) return cleaned;
            }
        }
        return resolve(context, number, snapAddress, "", "");
    }

    public static String clean(String name) {
        if (name == null) return "";
        String t = name.replace(" (Snapchat)", "")
                .replace("(Snapchat)", "")
                .trim();
        if (t.endsWith("•")) t = t.substring(0, t.length() - 1).trim();
        return t.length() > 80 ? t.substring(0, 80) : t;
    }

    public static String resolve(Context context, String number, String snapAddress,
                                 String fallbackName, String formattedName) {
        String fromStore = "";
        if (number != null && !number.isEmpty()) {
            fromStore = SnapUserStore.getDisplayName(context, number);
        }
        if (isGenericAppName(fromStore) && snapAddress != null && !snapAddress.isEmpty()) {
            fromStore = SnapUserStore.getDisplayName(context, snapAddress);
        }
        if (!isGenericAppName(fromStore)) return clean(fromStore);

        String formatted = clean(formattedName);
        if (!isGenericAppName(formatted)) return formatted;

        String fallback = clean(fallbackName);
        if (!isGenericAppName(fallback)) return fallback;

        String last = LastSnapStore.getName(context);
        if (!isGenericAppName(last)) return clean(last);

        return isGenericAppName(fallback) ? "مكالمة Snapchat" : fallback;
    }

    public static boolean looksLikeDialId(String name) {
        if (TextUtils.isEmpty(name)) return false;
        String n = name.trim();
        if (isSnapAddress(n)) return true;
        if (SnapUserStore.isSnapDialId(n)) return true;
        return n.matches("888\\d{3,}");
    }

    /** عنوان داخلي مثل snap:cd08ff12 — ليس اسماً حقيقياً. */
    public static boolean isSnapAddress(String name) {
        if (TextUtils.isEmpty(name)) return false;
        return name.trim().toLowerCase(Locale.ROOT).matches("snap:[0-9a-f]{8}");
    }

}
