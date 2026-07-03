package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.widget.Toast;

public final class MissedCallActionHandler {
    private static final String PKG_WHATSAPP = "com.whatsapp";
    private static final String PKG_WHATSAPP_BUSINESS = "com.whatsapp.w4b";

    private MissedCallActionHandler() {}

    public static boolean callback(Context context, MissedCallQueueStore.Item item) {
        if (item == null) return false;
        try {
            if (item.isSnap) {
                String key = (item.snapAddress != null && !item.snapAddress.isEmpty())
                        ? item.snapAddress : item.number;
                return SnapchatLauncher.open(context, key);
            }
            String number = sanitizeForDial(item.number);
            if (number.isEmpty()) return false;
            Intent dial = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(number)));
            dial.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(dial);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean openWhatsApp(Context context, MissedCallQueueStore.Item item) {
        return openWhatsAppPackage(context, item, PKG_WHATSAPP, "واتساب");
    }

    public static boolean openWhatsAppBusiness(Context context, MissedCallQueueStore.Item item) {
        return openWhatsAppPackage(context, item, PKG_WHATSAPP_BUSINESS, "واتساب بزنس");
    }

    private static boolean openWhatsAppPackage(Context context, MissedCallQueueStore.Item item,
                                               String packageName, String label) {
        if (item == null) return false;
        String wa = whatsAppNumber(item.number);
        if (wa == null) return false;
        if (!isPackageInstalled(context, packageName)) {
            Toast.makeText(context, label + " غير مثبت", Toast.LENGTH_SHORT).show();
            return false;
        }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/" + wa));
            i.setPackage(packageName);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(i);
            return true;
        } catch (Exception e) {
            Toast.makeText(context, "تعذر فتح " + label, Toast.LENGTH_SHORT).show();
            return false;
        }
    }

    private static String whatsAppNumber(String raw) {
        String number = sanitizeForDial(raw);
        String wa = number.startsWith("+") ? number.substring(1) : number;
        if (wa.isEmpty() || wa.startsWith("888")) {
            return null;
        }
        return wa;
    }

    private static boolean isPackageInstalled(Context context, String packageName) {
        try {
            context.getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    private static String sanitizeForDial(String raw) {
        if (raw == null) return "";
        String s = raw.replaceAll("[^0-9+]", "");
        if (s.startsWith("00")) s = "+" + s.substring(2);
        return s;
    }
}
