package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.widget.Toast;

import java.util.List;

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
        if (wa == null) {
            Toast.makeText(context, "رقم واتساب غير متاح", Toast.LENGTH_SHORT).show();
            return false;
        }

        if (tryLaunch(context, Uri.parse("https://wa.me/" + wa), packageName)) return true;
        if (tryLaunch(context, Uri.parse("whatsapp://send?phone=" + wa), packageName)) return true;
        if (tryLaunch(context, Uri.parse("https://api.whatsapp.com/send?phone=" + wa), packageName)) return true;

        Toast.makeText(context, label + " غير مثبت — ثبّته من المتجر", Toast.LENGTH_LONG).show();
        return false;
    }

    private static boolean tryLaunch(Context context, Uri uri, String packageName) {
        try {
            Intent direct = new Intent(Intent.ACTION_VIEW, uri);
            direct.setPackage(packageName);
            direct.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PackageManager pm = context.getPackageManager();
            if (direct.resolveActivity(pm) != null) {
                context.startActivity(direct);
                return true;
            }
            List<ResolveInfo> handlers = pm.queryIntentActivities(direct, PackageManager.MATCH_DEFAULT_ONLY);
            for (ResolveInfo info : handlers) {
                if (info.activityInfo != null
                        && packageName.equals(info.activityInfo.packageName)) {
                    context.startActivity(direct);
                    return true;
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private static String whatsAppNumber(String raw) {
        String number = sanitizeForDial(raw);
        String wa = number.startsWith("+") ? number.substring(1) : number;
        if (wa.startsWith("00")) wa = wa.substring(2);
        if (wa.isEmpty() || wa.startsWith("888")) return null;
        return wa;
    }

    private static String sanitizeForDial(String raw) {
        if (raw == null) return "";
        String s = raw.replaceAll("[^0-9+]", "");
        if (s.startsWith("00")) s = "+" + s.substring(2);
        return s;
    }
}
