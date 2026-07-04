package com.hihonor.contacts.snapbridge;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.telephony.PhoneNumberUtils;

public final class CallerIdentityResolver {
    private static final String PKG_NUMBERBOOK = "com.mobiles.numberbookdirectory";

    private CallerIdentityResolver() {}

    public static final class Identity {
        public final String displayName;
        public final String subtitle;
        public final String sourceLabel;
        public final Uri photoUri;

        public Identity(String displayName, String subtitle, String sourceLabel, Uri photoUri) {
            this.displayName = displayName;
            this.subtitle = subtitle;
            this.sourceLabel = sourceLabel;
            this.photoUri = photoUri;
        }
    }

    public static Identity resolve(Context context, String number, String fallbackName,
                                   boolean isSnap, String sourceLabel) {
        if (isSnap) {
            String name = SnapNameHelper.resolve(context, number, "", fallbackName, "");
            if (SnapNameHelper.isGenericAppName(name)) name = "مكالمة Snapchat";
            return new Identity(name, "Snapchat", "Snapchat", null);
        }
        Identity fromContacts = lookupContact(context, number);
        if (fromContacts != null) return fromContacts;
        Identity fromDirectory = lookupExternalDirectories(context, number);
        if (fromDirectory != null) return fromDirectory;
        String label = clean(sourceLabel);
        if (label.isEmpty()) label = "هاتف";
        String name = clean(fallbackName);
        if (name.isEmpty() || looksLikePhoneNumber(name)) {
            name = formatNumber(number);
        }
        return new Identity(name, formatNumber(number), label, null);
    }

    private static Identity lookupContact(Context context, String number) {
        return queryPhoneLookup(
                context.getContentResolver(),
                number,
                null,
                "هاتف");
    }

    /** يبحث في أدلة المتصلين المثبتة (نمر بوك، Truecaller، إلخ). */
    private static Identity lookupExternalDirectories(Context context, String number) {
        if (number == null || number.isEmpty()) return null;
        if (number.startsWith("888") && number.length() >= 10) return null;
        ContentResolver resolver = context.getContentResolver();
        Cursor dirs = null;
        try {
            dirs = resolver.query(
                    ContactsContract.Directory.CONTENT_URI,
                    new String[] {
                            ContactsContract.Directory._ID,
                            ContactsContract.Directory.DISPLAY_NAME,
                            ContactsContract.Directory.PACKAGE_NAME,
                    },
                    null, null, null);
            if (dirs == null) return null;
            while (dirs.moveToNext()) {
                long dirId = dirs.getLong(0);
                if (dirId <= ContactsContract.Directory.DEFAULT) continue;
                String dirLabel = dirs.getString(1);
                String pkg = dirs.getString(2);
                String source = sourceLabelForDirectory(pkg, dirLabel);
                Identity hit = queryPhoneLookup(resolver, number, dirId, source);
                if (hit != null) return hit;
            }
        } catch (Exception ignored) {
        } finally {
            if (dirs != null) dirs.close();
        }
        return null;
    }

    private static Identity queryPhoneLookup(ContentResolver resolver, String number,
                                             Long directoryId, String sourceLabel) {
        if (number == null || number.isEmpty()) return null;
        Uri uri = Uri.withAppendedPath(
                ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                Uri.encode(number));
        if (directoryId != null) {
            uri = uri.buildUpon()
                    .appendQueryParameter(
                            ContactsContract.DIRECTORY_PARAM_KEY,
                            String.valueOf(directoryId))
                    .build();
        }
        Cursor cursor = null;
        try {
            cursor = resolver.query(
                    uri,
                    new String[] {
                            ContactsContract.PhoneLookup.DISPLAY_NAME,
                            ContactsContract.PhoneLookup.PHOTO_URI,
                            ContactsContract.PhoneLookup.NUMBER,
                    },
                    null, null, null);
            if (cursor == null || !cursor.moveToFirst()) return null;
            String name = cursor.getString(0);
            String photo = cursor.getString(1);
            String storedNumber = cursor.getString(2);
            if (name == null || name.trim().isEmpty()) return null;
            if (looksLikePhoneNumber(name.trim())) return null;
            Uri photoUri = photo != null && !photo.isEmpty() ? Uri.parse(photo) : null;
            String subtitle = formatNumber(storedNumber != null ? storedNumber : number);
            return new Identity(name.trim(), subtitle, sourceLabel, photoUri);
        } catch (Exception ignored) {
            return null;
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    private static String sourceLabelForDirectory(String packageName, String dirLabel) {
        if (PKG_NUMBERBOOK.equals(packageName)) return "نمر بوك";
        if (packageName != null && packageName.contains("truecaller")) return "Truecaller";
        if (dirLabel != null && !dirLabel.trim().isEmpty()) return dirLabel.trim();
        return "دليل المتصل";
    }

    private static boolean looksLikePhoneNumber(String value) {
        if (value == null || value.isEmpty()) return false;
        String trimmed = value.trim();
        if (trimmed.matches("^[+0-9*#\\-\\s()]+$")) return true;
        String digits = trimmed.replaceAll("[^0-9]", "");
        return digits.length() >= 7 && digits.length() >= trimmed.length() / 2;
    }

    private static String formatNumber(String number) {
        if (number == null || number.isEmpty()) return "";
        try {
            String formatted = PhoneNumberUtils.formatNumber(number, "SA");
            if (formatted != null && !formatted.isEmpty()) return formatted;
        } catch (Exception ignored) {
        }
        return number;
    }

    private static String clean(String value) {
        if (value == null) return "";
        return value.replace(" (Snapchat)", "").trim();
    }
}
