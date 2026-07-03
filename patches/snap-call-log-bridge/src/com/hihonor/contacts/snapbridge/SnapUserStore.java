package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.net.Uri;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public final class SnapUserStore {
    private static final String PREFS = "snap_users";

    private SnapUserStore() {}

    public static String addressFor(String displayName, String snapUsername) {
        String key = snapUsername != null && !snapUsername.isEmpty() ? snapUsername : displayName;
        return "snap:" + shortHash(key);
    }

    /** Dialable id stored in call log NUMBER, e.g. snap90463b2d */
    public static String dialIdForAddress(String address) {
        if (address == null) return "";
        if (address.startsWith("snap:")) return "snap" + address.substring(5);
        return "snap" + shortHash(address);
    }

    public static String dialIdFor(String displayName, String snapUsername) {
        return dialIdForAddress(addressFor(displayName, snapUsername));
    }

    public static boolean isSnapDialId(String num) {
        return num != null && num.matches("snap[0-9a-f]{8}");
    }

    public static String addressFromDialId(String dialId) {
        if (dialId == null) return "";
        if (dialId.startsWith("snap:")) return dialId;
        if (isSnapDialId(dialId)) return "snap:" + dialId.substring(4);
        return dialId;
    }

    public static void save(Context context, String address, String displayName, String snapUsername) {
        String dialId = dialIdForAddress(address);
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("display:" + address, displayName)
                .putString("user:" + address, snapUsername != null ? snapUsername : "")
                .putString("dial:" + dialId, address)
                .putString("name:" + dialId, displayName)
                .apply();
    }

    public static String getDisplayName(Context context, String addressOrDialId) {
        if (addressOrDialId == null) return "";
        if (isSnapDialId(addressOrDialId)) {
            String n = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString("name:" + addressOrDialId, null);
            if (n != null) return n;
            addressOrDialId = addressFromDialId(addressOrDialId);
        }
        String stored = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("display:" + addressOrDialId, null);
        if (stored != null) return stored;
        return decodeLegacyAddress(addressOrDialId);
    }

    public static String getSnapUser(Context context, String address) {
        if (address == null) return "";
        if (isSnapDialId(address)) {
            address = addressFromDialId(address);
        }
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("user:" + address, "");
    }

    public static String resolveAddress(Context context, String raw) {
        if (raw == null || raw.isEmpty()) return "";
        if (isSnapDialId(raw)) {
            String mapped = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString("dial:" + raw, null);
            if (mapped != null) return mapped;
            return addressFromDialId(raw);
        }
        String decoded = Uri.decode(raw);
        if (decoded.startsWith("snap:")) {
            String suffix = decoded.substring(5);
            if (suffix.matches("[0-9a-f]{8}")) return decoded;
            if (suffix.contains("%") || suffix.length() > 8) {
                String name = Uri.decode(suffix);
                String addr = addressFor(name, "");
                save(context, addr, name, "");
                return addr;
            }
        }
        return addressFor(decoded, "");
    }

    private static String decodeLegacyAddress(String address) {
        if (!address.startsWith("snap:")) return address;
        String suffix = address.substring(5);
        if (suffix.contains("%")) return Uri.decode(suffix);
        return address;
    }

    private static String shortHash(String key) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(key.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(8);
            for (int i = 0; i < 4; i++) {
                sb.append(String.format("%02x", digest[i]));
            }
            return sb.toString();
        } catch (Exception e) {
            return String.format("%08x", key.hashCode());
        }
    }
}
