package com.hihonor.contacts.snapbridge;

import android.content.ContentProviderOperation;
import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.provider.ContactsContract;
import android.util.Log;

import java.util.ArrayList;

public final class SnapContactSync {
    private static final String TAG = "SnapCallLogBridge";
    private static final String ACCOUNT_TYPE = "com.hihonor.contacts.snapbridge.snap";
    private static final String ACCOUNT_NAME = "Snapchat";

    private SnapContactSync() {}

    public static void upsert(Context context, String displayName, String dialId) {
        try {
            long rawId = findRawContactId(context.getContentResolver(), dialId);
            ArrayList<ContentProviderOperation> ops = new ArrayList<>();
            if (rawId < 0) {
                ops.add(ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                        .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, ACCOUNT_TYPE)
                        .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, ACCOUNT_NAME)
                        .build());
            }
            int rawContactInsertIndex = rawId < 0 ? 0 : -1;
            if (rawId < 0) {
                ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, rawContactInsertIndex)
                        .withValue(ContactsContract.Data.MIMETYPE,
                                ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, displayName)
                        .build());
                ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, rawContactInsertIndex)
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
