package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;

public final class MissedCallActionHandler {
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
        if (item == null) return false;
        String number = sanitizeForDial(item.number);
        String wa = number.startsWith("+") ? number.substring(1) : number;
        if (wa.isEmpty() || wa.startsWith("888")) {
            Toast.makeText(context, "رقم واتساب غير متاح", Toast.LENGTH_SHORT).show();
            return false;
        }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/" + wa));
            i.setPackage("com.whatsapp");
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(i);
            return true;
        } catch (Exception first) {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/" + wa));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(i);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
    }

    private static String sanitizeForDial(String raw) {
        if (raw == null) return "";
        String s = raw.replaceAll("[^0-9+]", "");
        if (s.startsWith("00")) s = "+" + s.substring(2);
        return s;
    }
}

