package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.telephony.PhoneNumberUtils;

public final class CallerIdentityResolver {
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
        String label = clean(sourceLabel);
        if (label.isEmpty()) label = "هاتف";
        String name = clean(fallbackName);
        if (name.isEmpty()) name = formatNumber(number);
        return new Identity(name, formatNumber(number), label, null);
    }

    private static Identity lookupContact(Context context, String number) {
        if (number == null || number.isEmpty()) return null;
        if (number.startsWith("888") && number.length() >= 10) return null;
        Uri uri = Uri.withAppendedPath(
                ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                Uri.encode(number));
        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    uri,
                    new String[] {
                            ContactsContract.PhoneLookup.DISPLAY_NAME,
                            ContactsContract.PhoneLookup.PHOTO_URI,
                            ContactsContract.PhoneLookup.NUMBER,
                            ContactsContract.PhoneLookup.LABEL
                    },
                    null, null, null);
            if (cursor == null || !cursor.moveToFirst()) return null;
            String name = cursor.getString(0);
            String photo = cursor.getString(1);
            String storedNumber = cursor.getString(2);
            if (name == null || name.trim().isEmpty()) return null;
            Uri photoUri = photo != null && !photo.isEmpty() ? Uri.parse(photo) : null;
            String subtitle = formatNumber(storedNumber != null ? storedNumber : number);
            return new Identity(name.trim(), subtitle, "هاتف", photoUri);
        } catch (Exception ignored) {
            return null;
        } finally {
            if (cursor != null) cursor.close();
        }
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
