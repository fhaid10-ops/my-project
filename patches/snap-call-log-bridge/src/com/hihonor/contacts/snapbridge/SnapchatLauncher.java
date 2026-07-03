package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;

public final class SnapchatLauncher {
    private static final String SNAP_PKG = "com.snapchat.android";

    private SnapchatLauncher() {}

    public static boolean open(Context context, String addressKey) {
        String address = SnapUserStore.resolveAddress(context, addressKey);
        String snapUser = SnapUserStore.getSnapUser(context, address);
        String display = SnapUserStore.getDisplayName(context, address);
        if (snapUser == null || snapUser.isEmpty()) {
            snapUser = display != null ? display : address;
        }
        return openSnapchat(context, snapUser, display);
    }

    public static boolean openSnapchat(Context context, String snapUser, String displayName) {
        String user = sanitizeUsername(snapUser);
        if (user.isEmpty()) {
            Toast.makeText(context, "افتح Snapchat واتصل بـ " + displayName, Toast.LENGTH_LONG).show();
            return launchApp(context);
        }
        if (tryDeepLink(context, "snapchat://add/" + user)) return true;
        if (tryDeepLink(context, "https://snapchat.com/add/" + user)) return true;
        Toast.makeText(context, "افتح Snapchat → " + (displayName != null ? displayName : user), Toast.LENGTH_LONG).show();
        return launchApp(context);
    }

    private static boolean tryDeepLink(Context context, String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.setPackage(SNAP_PKG);
            context.startActivity(intent);
            return true;
        } catch (Exception e) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
    }

    private static boolean launchApp(Context context) {
        try {
            Intent intent = context.getPackageManager().getLaunchIntentForPackage(SNAP_PKG);
            if (intent == null) return false;
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static String sanitizeUsername(String raw) {
        if (raw == null) return "";
        String u = raw.trim();
        if (u.startsWith("snap:")) u = u.substring(5);
        if (u.contains(" ")) return "";
        return u.replaceAll("[^a-zA-Z0-9._-]", "");
    }
}
