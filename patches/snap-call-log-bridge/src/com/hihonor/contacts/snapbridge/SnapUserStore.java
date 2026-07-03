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

    public static void save(Context context, String address, String displayName, String snapUsername) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("display:" + address, displayName)
                .putString("user:" + address, snapUsername != null ? snapUsername : "")
                .apply();
    }

    public static String getDisplayName(Context context, String address) {
        if (address == null) return "";
        String stored = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("display:" + address, null);
        if (stored != null) return stored;
        return decodeLegacyAddress(address);
    }

    public static String getSnapUser(Context context, String address) {
        if (address == null) return "";
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("user:" + address, "");
    }

    /** Resolves snap:… address from any legacy or current format. */
    public static String resolveAddress(Context context, String raw) {
        if (raw == null || raw.isEmpty()) return "";
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
