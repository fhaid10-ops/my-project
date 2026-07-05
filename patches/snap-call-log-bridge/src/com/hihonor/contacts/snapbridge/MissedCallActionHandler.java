package com.hihonor.contacts.snapbridge;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Set;

public final class MissedCallActionHandler {
    private static final String PKG_WHATSAPP = "com.whatsapp";
    private static final String PKG_WHATSAPP_BUSINESS = "com.whatsapp.w4b";
    private static final String[] HONOR_CONTACT_PACKAGES = {
            "com.hihonor.contacts",
            "com.huawei.contacts",
    };
    private static final String PEOPLE_ACTIVITY = "com.android.contacts.activities.PeopleActivity";
    private static final String CONTACT_DETAIL_ACTIVITY =
            "com.android.contacts.activities.ContactDetailActivity";

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
        String query = resolveContactsQuery(item, number);

        if (!number.isEmpty() && !number.startsWith("888")) {
            Uri contactUri = findContactLookupUri(context, number);
            if (contactUri != null) {
                for (String pkg : installedHonorContactPackages(context)) {
                    if (openContactUriInPackage(context, contactUri, pkg)) return true;
                }
            }
        }

        for (String pkg : installedHonorContactPackages(context)) {
            if (openContactsSearchInPackage(context, pkg, query)) return true;
        }

        for (String pkg : installedHonorContactPackages(context)) {
            if (launchHonorContactsMain(context, pkg)) return true;
        }

        Toast.makeText(context, "تعذر فتح تطبيق جهات الاتصال", Toast.LENGTH_SHORT).show();
        return false;
    }

    private static String resolveContactsQuery(MissedCallQueueStore.Item item, String number) {
        String query = item.bestName();
        if (query == null || query.isEmpty() || CallUiHelper.isMostlyPhone(query)) {
            query = number;
        }
        return query != null ? query.trim() : "";
    }

    private static String[] installedHonorContactPackages(Context context) {
        PackageManager pm = context.getPackageManager();
        ArrayList<String> installed = new ArrayList<>();
        for (String pkg : HONOR_CONTACT_PACKAGES) {
            try {
                pm.getPackageInfo(pkg, 0);
                installed.add(pkg);
            } catch (PackageManager.NameNotFoundException ignored) {
            }
        }
        return installed.toArray(new String[0]);
    }

    private static Uri findContactLookupUri(Context context, String number) {
        for (String variant : phoneVariants(number)) {
            Uri filterUri = Uri.withAppendedPath(
                    ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                    Uri.encode(variant));
            Cursor cursor = null;
            try {
                cursor = context.getContentResolver().query(
                        filterUri,
                        new String[] {
                                ContactsContract.PhoneLookup._ID,
                                ContactsContract.PhoneLookup.LOOKUP_KEY,
                        },
                        null, null, null);
                if (cursor != null && cursor.moveToFirst()) {
                    long contactId = cursor.getLong(0);
                    String lookupKey = cursor.getString(1);
                    if (lookupKey != null && !lookupKey.isEmpty()) {
                        return ContactsContract.Contacts.getLookupUri(contactId, lookupKey);
                    }
                    return ContactsContract.Contacts.getLookupUri(contactId, "");
                }
            } catch (Exception ignored) {
            } finally {
                if (cursor != null) cursor.close();
            }
        }
        return null;
    }

    private static boolean openContactUriInPackage(Context context, Uri contactUri, String packageName) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, contactUri);
            intent.setPackage(packageName);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception ignored) {
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, contactUri);
            intent.setComponent(new ComponentName(packageName, CONTACT_DETAIL_ACTIVITY));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private static boolean openContactsSearchInPackage(Context context, String packageName, String query) {
        if (query == null || query.isEmpty()) return false;
        try {
            Intent intent = new Intent("com.android.contacts.action.FILTER");
            intent.setPackage(packageName);
            intent.putExtra("query", query);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception ignored) {
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, ContactsContract.Contacts.CONTENT_URI);
            intent.setPackage(packageName);
            intent.putExtra("query", query);
            intent.putExtra(Intent.EXTRA_TITLE, query);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private static boolean launchHonorContactsMain(Context context, String packageName) {
        try {
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_LAUNCHER);
            intent.setComponent(new ComponentName(packageName, PEOPLE_ACTIVITY));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception ignored) {
        }
        try {
            Intent launch = context.getPackageManager().getLaunchIntentForPackage(packageName);
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(launch);
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private static String[] phoneVariants(String number) {
        Set<String> variants = new LinkedHashSet<>();
        if (number == null) return new String[0];
        String trimmed = number.trim();
        if (!trimmed.isEmpty()) variants.add(trimmed);
        String compact = CallUiHelper.compactPhone(trimmed);
        if (!compact.isEmpty()) variants.add(compact);
        String digits = trimmed.replaceAll("[^0-9]", "");
        if (digits.startsWith("0") && digits.length() == 10) {
            variants.add("+966" + digits.substring(1));
            variants.add("966" + digits.substring(1));
            variants.add(digits.substring(1));
        } else if (digits.startsWith("966") && digits.length() >= 12) {
            variants.add("0" + digits.substring(3));
            variants.add("+" + digits);
        } else if (digits.length() == 9 && digits.startsWith("5")) {
            variants.add("0" + digits);
            variants.add("+966" + digits);
            variants.add("966" + digits);
        }
        return variants.toArray(new String[0]);
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
