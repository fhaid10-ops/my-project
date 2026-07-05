package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.ContactsContract;
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
        return openWhatsAppPackage(context, item, PKG_WHATSAPP, "واتساب", true);
    }

    public static boolean openWhatsAppBusiness(Context context, MissedCallQueueStore.Item item) {
        return openWhatsAppPackage(context, item, PKG_WHATSAPP_BUSINESS, "واتساب بزنس", false);
    }

    public static boolean openContacts(Context context, MissedCallQueueStore.Item item) {
        if (item == null) return false;
        String number = sanitizeForDial(item.number);
        if (!number.isEmpty() && !number.startsWith("888")) {
            Uri lookupUri = Uri.withAppendedPath(
                    ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                    Uri.encode(number));
            try {
                Intent lookup = new Intent(Intent.ACTION_VIEW, lookupUri);
                lookup.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(lookup);
                return true;
            } catch (Exception ignored) {
            }
        }

        String query = item.bestName();
        if (query == null || query.isEmpty() || CallUiHelper.isMostlyPhone(query)) {
            query = number;
        }
        String[] contactPackages = {
                "com.hihonor.contacts",
                "com.huawei.contacts",
                "com.android.contacts",
        };
        for (String pkg : contactPackages) {
            if (tryOpenContactsPackage(context, pkg, query)) return true;
        }

        try {
            Intent generic = new Intent(Intent.ACTION_VIEW, ContactsContract.Contacts.CONTENT_URI);
            generic.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(generic);
            return true;
        } catch (Exception ignored) {
            Toast.makeText(context, "تعذر فتح جهات الاتصال", Toast.LENGTH_SHORT).show();
            return false;
        }
    }

    private static boolean tryOpenContactsPackage(Context context, String packageName, String query) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, ContactsContract.Contacts.CONTENT_URI);
            intent.setPackage(packageName);
            if (query != null && !query.isEmpty()) {
                intent.putExtra("query", query);
                intent.putExtra(Intent.EXTRA_TITLE, query);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private static boolean openWhatsAppPackage(Context context, MissedCallQueueStore.Item item,
                                               String packageName, String label,
                                               boolean allowGenericFallback) {
        if (item == null) return false;
        String wa = whatsAppNumber(item);
        if (wa == null) {
            Toast.makeText(context, "رقم واتساب غير متاح", Toast.LENGTH_SHORT).show();
            return false;
        }

        Uri[] uris = new Uri[] {
                Uri.parse("https://wa.me/" + wa),
                Uri.parse("whatsapp://send?phone=" + wa),
                Uri.parse("https://api.whatsapp.com/send?phone=" + wa)
        };
        for (Uri uri : uris) {
            if (tryLaunch(context, uri, packageName)) return true;
        }
        if (allowGenericFallback && tryLaunchAny(context, uris[0])) return true;

        Toast.makeText(context, "تعذر فتح " + label, Toast.LENGTH_LONG).show();
        return false;
    }

    private static String whatsAppNumber(MissedCallQueueStore.Item item) {
        String raw = item.number;
        if (raw == null || raw.isEmpty()) raw = item.subtitle;
        return whatsAppDigits(raw);
    }

    private static String whatsAppDigits(String raw) {
        String number = sanitizeForDial(raw);
        String wa = number.startsWith("+") ? number.substring(1) : number;
        if (wa.startsWith("00")) wa = wa.substring(2);
        if (wa.isEmpty() || wa.startsWith("888")) return null;
        return wa;
    }

    private static boolean tryLaunch(Context context, Uri uri, String packageName) {
        try {
            Intent direct = new Intent(Intent.ACTION_VIEW, uri);
            direct.setPackage(packageName);
            direct.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(direct);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private static boolean tryLaunchAny(Context context, Uri uri) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, uri);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(i);
            return true;
        } catch (Exception ignored) {
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
