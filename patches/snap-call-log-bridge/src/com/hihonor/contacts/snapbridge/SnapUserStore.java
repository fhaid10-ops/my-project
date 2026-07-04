package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.net.Uri;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.util.Locale;

public final class SnapUserStore {
    private static final String PREFS = "snap_users";
    // Numeric dial id prefix reserved for Snapchat bridge records.
    private static final String DIAL_PREFIX = "888";

    private SnapUserStore() {}

    public static String addressFor(String displayName, String snapUsername) {
        String key;
        if (snapUsername != null && !snapUsername.isEmpty()) {
            key = snapUsername.trim().toLowerCase(Locale.ROOT);
        } else {
            key = normalizeIdentityKey(displayName);
        }
        if (key.isEmpty()) key = "unknown";
        return "snap:" + shortHash(key);
    }

    static String normalizeIdentityKey(String displayName) {
        if (displayName == null) return "";
        String n = Normalizer.normalize(displayName.trim(), Normalizer.Form.NFKC);
        n = n.replaceAll("[\\p{So}\\p{Sk}\\p{Emoji_Presentation}\\p{Extended_Pictographic}]", "");
        return n.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
    }

    public static String dialIdForAddress(String address) {
        String hash = address != null && address.startsWith("snap:")
                ? address.substring(5) : shortHash(address != null ? address : "");
        long v;
        try {
            v = Long.parseLong(hash, 16) % 1_000_000_000L;
        } catch (Exception ignored) {
            v = Math.abs(hash.hashCode()) % 1_000_000_000L;
        }
        return DIAL_PREFIX + String.format("%09d", v);
    }

    public static String dialIdFor(String displayName, String snapUsername) {
        return dialIdForAddress(addressFor(displayName, snapUsername));
    }

    public static boolean isSnapDialId(String num) {
        if (num == null) return false;
        if (num.matches(DIAL_PREFIX + "\\d{0,9}")) return true;
        return num.matches("snap[0-9a-f]{8}");
    }

    public static String addressFromDialId(Context context, String dialId) {
        if (dialId == null) return "";
        String mapped = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("dial:" + dialId, null);
        if (mapped != null) return mapped;
        if (dialId.matches("snap[0-9a-f]{8}")) return "snap:" + dialId.substring(4);
        return "";
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
            String addr = addressFromDialId(context, addressOrDialId);
            if (!addr.isEmpty()) addressOrDialId = addr;
            else {
                String last = LastSnapStore.getName(context);
                if (last != null && !last.isEmpty()) return last;
            }
        }
        String stored = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("display:" + addressOrDialId, null);
        if (stored != null) return stored;
        return decodeLegacyAddress(addressOrDialId);
    }

    public static String getSnapUser(Context context, String address) {
        if (address == null) return "";
        if (isSnapDialId(address)) {
            address = addressFromDialId(context, address);
        }
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("user:" + address, "");
    }

    public static String resolveAddress(Context context, String raw) {
        if (raw == null || raw.isEmpty()) return "";
        if (isSnapDialId(raw)) {
            String mapped = addressFromDialId(context, raw);
            if (!mapped.isEmpty()) return mapped;
            String last = LastSnapStore.getAddress(context);
            if (last != null && !last.isEmpty()) return last;
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
