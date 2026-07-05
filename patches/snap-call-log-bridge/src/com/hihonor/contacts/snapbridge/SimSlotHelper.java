package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;

import java.util.List;

/** يحدد الشريحة (1 أو 2) من معرّف سجل المكالمات. */
public final class SimSlotHelper {
    private SimSlotHelper() {}

    public static String resolveLabel(Context context, String phoneAccountId) {
        if (phoneAccountId == null || phoneAccountId.isEmpty()) return "";
        int slot = resolveSlotIndex(context, phoneAccountId);
        if (slot < 0) return "";
        return labelForSlot(context, slot);
    }

    public static String labelForSlot(Context context, int slotIndex) {
        if (slotIndex < 0) return "";
        SubscriptionInfo info = subscriptionForSlot(context, slotIndex);
        if (info != null) {
            CharSequence display = info.getDisplayName();
            if (display != null && display.length() > 0) {
                return display.toString().trim();
            }
            CharSequence carrier = info.getCarrierName();
            if (carrier != null && carrier.length() > 0) {
                return carrier.toString().trim() + " · ش" + (slotIndex + 1);
            }
        }
        return "شريحة " + (slotIndex + 1);
    }

    private static int resolveSlotIndex(Context context, String accountId) {
        int fromSub = slotFromSubscriptions(context, accountId);
        if (fromSub >= 0) return fromSub;
        int fromTelecom = slotFromTelecom(context, accountId);
        if (fromTelecom >= 0) return fromTelecom;
        return slotFromDirectId(accountId);
    }

    private static int slotFromSubscriptions(Context context, String accountId) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) return -1;
        if (!hasPhoneState(context)) return -1;
        try {
            SubscriptionManager sm = context.getSystemService(SubscriptionManager.class);
            if (sm == null) return -1;
            List<SubscriptionInfo> list = sm.getActiveSubscriptionInfoList();
            if (list == null) return -1;
            for (SubscriptionInfo info : list) {
                if (String.valueOf(info.getSubscriptionId()).equals(accountId)) {
                    return info.getSimSlotIndex();
                }
                String icc = info.getIccId();
                if (icc != null && !icc.isEmpty()
                        && (accountId.contains(icc) || icc.contains(accountId))) {
                    return info.getSimSlotIndex();
                }
            }
        } catch (Exception ignored) {
        }
        return -1;
    }

    private static int slotFromTelecom(Context context, String accountId) {
        try {
            TelecomManager tm = context.getSystemService(TelecomManager.class);
            if (tm == null) return -1;
            List<PhoneAccountHandle> handles = tm.getCallCapablePhoneAccounts();
            if (handles == null) return -1;
            for (int i = 0; i < handles.size(); i++) {
                PhoneAccountHandle handle = handles.get(i);
                if (accountId.equals(handle.getId())) return i;
                PhoneAccount account = tm.getPhoneAccount(handle);
                if (account != null && accountId.equals(account.getAccountHandle().getId())) {
                    return i;
                }
            }
        } catch (Exception ignored) {
        }
        return -1;
    }

    private static int slotFromDirectId(String accountId) {
        try {
            int value = Integer.parseInt(accountId.trim());
            if (value == 0 || value == 1) return value;
            if (value == 2) return 1;
        } catch (NumberFormatException ignored) {
        }
        return -1;
    }

    private static SubscriptionInfo subscriptionForSlot(Context context, int slotIndex) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP_MR1) return null;
        if (!hasPhoneState(context)) return null;
        try {
            SubscriptionManager sm = context.getSystemService(SubscriptionManager.class);
            if (sm == null) return null;
            List<SubscriptionInfo> list = sm.getActiveSubscriptionInfoList();
            if (list == null) return null;
            for (SubscriptionInfo info : list) {
                if (info.getSimSlotIndex() == slotIndex) return info;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static boolean hasPhoneState(Context context) {
        return context.checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE)
                == PackageManager.PERMISSION_GRANTED;
    }
}
