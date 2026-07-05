package com.hihonor.contacts.snapbridge;

import android.content.ContentProviderOperation;
import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.util.Log;

import java.util.ArrayList;

public final class SnapContactSync {
    private static final String TAG = "SnapCallLogBridge";

    private SnapContactSync() {}

    public static void upsert(Context context, String displayName, String dialId) {
        try {
            deleteLegacyContacts(context.getContentResolver());
            long rawId = findRawContactId(context.getContentResolver(), dialId);
            if (rawId < 0) {
                rawId = findRawContactByName(context.getContentResolver(), displayName);
            }
            ArrayList<ContentProviderOperation> ops = new ArrayList<>();
            if (rawId < 0) {
                ops.add(ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                        .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null)
                        .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null)
                        .build());
                int idx = 0;
                ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, idx)
                        .withValue(ContactsContract.Data.MIMETYPE,
                                ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, displayName)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME, displayName)
                        .build());
                ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, idx)
                        .withValue(ContactsContract.Data.MIMETYPE,
                                ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)
                        .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, dialId)
                        .withValue(ContactsContract.CommonDataKinds.Phone.TYPE,
                                ContactsContract.CommonDataKinds.Phone.TYPE_CUSTOM)
                        .withValue(ContactsContract.CommonDataKinds.Phone.LABEL, "Snapchat")
                        .build());
            } else {
                long nameId = findDataId(context.getContentResolver(), rawId,
                        ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE);
                if (nameId >= 0) {
                    ops.add(ContentProviderOperation.newUpdate(ContactsContract.Data.CONTENT_URI)
                            .withSelection(ContactsContract.Data._ID + "=?",
                                    new String[] {String.valueOf(nameId)})
                            .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, displayName)
                            .withValue(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME, displayName)
                            .build());
                }
                long phoneId = findDataId(context.getContentResolver(), rawId,
                        ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE);
                if (phoneId >= 0) {
                    ops.add(ContentProviderOperation.newUpdate(ContactsContract.Data.CONTENT_URI)
                            .withSelection(ContactsContract.Data._ID + "=?",
                                    new String[] {String.valueOf(phoneId)})
                            .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, dialId)
                            .withValue(ContactsContract.CommonDataKinds.Phone.LABEL, "Snapchat")
                            .build());
                }
            }
            if (!ops.isEmpty()) {
                context.getContentResolver().applyBatch(ContactsContract.AUTHORITY, ops);
                Log.i(TAG, "Contact synced: " + displayName + " / " + dialId);
            }
        } catch (SecurityException se) {
            Log.w(TAG, "Contact sync denied", se);
        } catch (Exception e) {
            Log.w(TAG, "Contact sync failed", e);
        }
    }

    private static void deleteLegacyContacts(ContentResolver resolver) {
        Cursor cursor = null;
        try {
            cursor = resolver.query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[] {ContactsContract.CommonDataKinds.Phone.RAW_CONTACT_ID,
                            ContactsContract.CommonDataKinds.Phone.NUMBER},
                    ContactsContract.CommonDataKinds.Phone.NUMBER + " LIKE ?",
                    new String[] {"snap%"},
                    null);
            if (cursor == null) return;
            while (cursor.moveToNext()) {
                long rawId = cursor.getLong(0);
                Uri uri = ContactsContract.RawContacts.CONTENT_URI.buildUpon()
                        .appendPath(String.valueOf(rawId)).build();
                resolver.delete(uri, null, null);
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    private static long findRawContactByName(ContentResolver resolver, String name) {
        Cursor cursor = null;
        try {
            cursor = resolver.query(
                    ContactsContract.Data.CONTENT_URI,
                    new String[] {ContactsContract.Data.RAW_CONTACT_ID},
                    ContactsContract.Data.MIMETYPE + "=? AND "
                            + ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME + "=?",
                    new String[] {ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE, name},
                    null);
            if (cursor != null && cursor.moveToFirst()) {
                return cursor.getLong(0);
            }
        } finally {
            if (cursor != null) cursor.close();
        }
        return -1;
    }

    private static long findRawContactId(ContentResolver resolver, String dialId) {
        Cursor cursor = null;
        try {
            cursor = resolver.query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[] {ContactsContract.CommonDataKinds.Phone.RAW_CONTACT_ID},
                    ContactsContract.CommonDataKinds.Phone.NUMBER + "=?",
                    new String[] {dialId},
                    null);
            if (cursor != null && cursor.moveToFirst()) {
                return cursor.getLong(0);
            }
        } finally {
            if (cursor != null) cursor.close();
        }
        return -1;
    }

    private static long findDataId(ContentResolver resolver, long rawId, String mimeType) {
        Cursor cursor = null;
        try {
            cursor = resolver.query(
                    ContactsContract.Data.CONTENT_URI,
                    new String[] {ContactsContract.Data._ID},
                    ContactsContract.Data.RAW_CONTACT_ID + "=? AND " + ContactsContract.Data.MIMETYPE + "=?",
                    new String[] {String.valueOf(rawId), mimeType},
                    null);
            if (cursor != null && cursor.moveToFirst()) {
                return cursor.getLong(0);
            }
        } finally {
            if (cursor != null) cursor.close();
        }
        return -1;
    }
}
