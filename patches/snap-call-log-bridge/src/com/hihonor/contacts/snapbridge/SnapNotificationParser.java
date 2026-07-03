package com.hihonor.contacts.snapbridge;

import android.app.Notification;
import android.app.Person;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import android.text.TextUtils;

public final class SnapNotificationParser {
    public static final class ParsedCall {
        public final String displayName;
        public final int callType;
        public final String reason;

        ParsedCall(String displayName, int callType, String reason) {
            this.displayName = displayName;
            this.callType = callType;
            this.reason = reason;
        }
    }

    private SnapNotificationParser() {}

    public static ParsedCall parse(StatusBarNotification sbn) {
        Notification n = sbn.getNotification();
        if (n == null) return null;
        Bundle extras = n.extras;
        if (extras == null) return null;

        String category = n.category;
        if (Notification.CATEGORY_CALL.equals(category)) {
            String name = firstNonEmpty(extractPersonName(extras), extras.getString(Notification.EXTRA_TITLE));
            if (!TextUtils.isEmpty(name)) {
                return new ParsedCall(cleanName(name), resolveType(extras, n), "CATEGORY_CALL");
            }
        }

        if (Build.VERSION.SDK_INT >= 31) {
            String template = extras.getString("android.template");
            if (template != null && template.contains("CallStyle")) {
                String name = firstNonEmpty(extractPersonName(extras), extras.getString(Notification.EXTRA_TITLE));
                if (!TextUtils.isEmpty(name)) {
                    return new ParsedCall(cleanName(name), resolveType(extras, n), "CallStyle");
                }
            }
        }

        if (n.actions != null && n.actions.length >= 2 && isLikelyCallActions(n)) {
            String name = firstNonEmpty(extractPersonName(extras), extras.getString(Notification.EXTRA_TITLE));
            if (!TextUtils.isEmpty(name) && !isGenericCallWord(name)) {
                return new ParsedCall(cleanName(name), android.provider.CallLog.Calls.INCOMING_TYPE, "actions");
            }
        }

        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
        CharSequence info = extras.getCharSequence(Notification.EXTRA_INFO_TEXT);
        String combined = join(title, text, bigText, subText, info);
        if (TextUtils.isEmpty(combined)) return null;

        String lower = combined.toLowerCase();
        if (!isCallRelated(lower) && !hasCallExtraKeys(extras)) return null;

        String name = firstNonEmpty(
                extractPersonName(extras),
                extractFromPeopleList(extras),
                extractNameFromText(title),
                extractNameFromText(text),
                extractNameFromPhrase(combined));
        if (TextUtils.isEmpty(name) || isGenericCallWord(name)) {
            name = firstMeaningfulExtraString(extras);
        }
        if (TextUtils.isEmpty(name) || isGenericCallWord(name)) {
            name = "Snapchat";
        }
        return new ParsedCall(name, resolveTypeFromText(lower), "text");
    }

    private static String extractFromPeopleList(Bundle extras) {
        if (Build.VERSION.SDK_INT >= 28) {
            java.util.ArrayList<Person> people = extras.getParcelableArrayList(Notification.EXTRA_PEOPLE_LIST);
            if (people != null) {
                for (Person p : people) {
                    if (p != null && p.getName() != null) {
                        String n = p.getName().toString().trim();
                        if (!TextUtils.isEmpty(n) && !isGenericCallWord(n)) return n;
                    }
                }
            }
        }
        return null;
    }

    private static String firstMeaningfulExtraString(Bundle extras) {
        for (String key : extras.keySet()) {
            Object v = extras.get(key);
            if (v instanceof CharSequence) {
                String s = v.toString().trim();
                if (s.length() >= 2 && s.length() <= 60 && !isGenericCallWord(s) && !isCallRelated(s.toLowerCase())) {
                    return s;
                }
            }
        }
        return null;
    }

    public static String dumpExtras(StatusBarNotification sbn) {
        Notification n = sbn.getNotification();
        if (n == null) return "no notification";
        Bundle e = n.extras;
        StringBuilder sb = new StringBuilder();
        sb.append("cat=").append(n.category).append(" | ");
        if (e != null) {
            for (String key : e.keySet()) {
                if (key.startsWith("android.") || key.contains("call") || key.contains("title") || key.contains("text")) {
                    Object v = e.get(key);
                    if (v instanceof CharSequence || v instanceof String || v instanceof Integer) {
                        sb.append(key).append('=').append(v).append("; ");
                    }
                }
            }
        }
        if (n.actions != null) sb.append("actions=").append(n.actions.length);
        return sb.toString();
    }

    private static boolean hasCallExtraKeys(Bundle extras) {
        return extras.containsKey(Notification.EXTRA_CALL_TYPE)
                || extras.containsKey("android.callType")
                || extras.containsKey("android.callPerson");
    }

    private static boolean isLikelyCallActions(Notification n) {
        for (Notification.Action action : n.actions) {
            if (action != null && action.title != null) {
                String t = action.title.toString().toLowerCase();
                if (t.contains("answer") || t.contains("رد") || t.contains("decline")
                        || t.contains("رفض") || t.contains("hang")) {
                    return true;
                }
            }
        }
        return false;
    }

    private static int resolveType(Bundle extras, Notification n) {
        if (Build.VERSION.SDK_INT >= 31) {
            int callType = extras.getInt(Notification.EXTRA_CALL_TYPE, -1);
            if (callType == 1) return android.provider.CallLog.Calls.INCOMING_TYPE;
            if (callType == 2) return android.provider.CallLog.Calls.OUTGOING_TYPE;
            if (callType == 3) return android.provider.CallLog.Calls.MISSED_TYPE;
        }
        return resolveTypeFromText(join(
                extras.getCharSequence(Notification.EXTRA_TITLE),
                extras.getCharSequence(Notification.EXTRA_TEXT)));
    }

    private static int resolveTypeFromText(String lower) {
        if (lower.contains("missed") || lower.contains("فائت")) {
            return android.provider.CallLog.Calls.MISSED_TYPE;
        }
        if (lower.contains("outgoing") || lower.contains("صادر") || lower.contains("calling")) {
            return android.provider.CallLog.Calls.OUTGOING_TYPE;
        }
        return android.provider.CallLog.Calls.INCOMING_TYPE;
    }

    private static String extractPersonName(Bundle extras) {
        if (Build.VERSION.SDK_INT >= 31) {
            Person person = extras.getParcelable(Notification.EXTRA_CALL_PERSON, Person.class);
            if (person == null) {
                person = extras.getParcelable("android.callPerson", Person.class);
            }
            if (person != null && person.getName() != null) {
                return person.getName().toString();
            }
        } else if (Build.VERSION.SDK_INT >= 28) {
            Person person = extras.getParcelable(Notification.EXTRA_CALL_PERSON);
            if (person == null) person = extras.getParcelable("android.callPerson");
            if (person != null && person.getName() != null) {
                return person.getName().toString();
            }
        }
        return null;
    }

    private static String extractNameFromText(CharSequence cs) {
        if (cs == null) return null;
        String t = cs.toString().trim();
        if (TextUtils.isEmpty(t) || isGenericCallWord(t)) return null;
        return t;
    }

    private static String extractNameFromPhrase(String phrase) {
        String[] markers = {"from ", "with ", "to ", "من ", "مع ", "إلى ", "الي ", "عبر "};
        String lower = phrase.toLowerCase();
        for (String marker : markers) {
            int idx = lower.indexOf(marker);
            if (idx >= 0) {
                String tail = phrase.substring(idx + marker.length()).trim();
                int end = tail.indexOf('\n');
                if (end > 0) tail = tail.substring(0, end).trim();
                if (!TextUtils.isEmpty(tail) && tail.length() <= 80 && !isCallRelated(tail.toLowerCase())) {
                    return tail;
                }
            }
        }
        return null;
    }

    private static boolean isCallRelated(String lower) {
        return lower.contains("call") || lower.contains("مكالم") || lower.contains("ringing")
                || lower.contains("يرن") || lower.contains("video") || lower.contains("فيديو")
                || lower.contains("voice") || lower.contains("صوت") || lower.contains("snap");
    }

    private static boolean isGenericCallWord(String s) {
        String l = s.toLowerCase();
        return l.equals("snapchat") || l.contains("مكالمة") || l.contains("call")
                || l.contains("incoming") || l.contains("واردة");
    }

    private static String cleanName(String name) {
        if (name == null) return null;
        String t = name.trim();
        return t.length() > 80 ? t.substring(0, 80) : t;
    }

    private static String firstNonEmpty(String... values) {
        for (String v : values) {
            if (!TextUtils.isEmpty(v)) return v;
        }
        return null;
    }

    private static String join(CharSequence... parts) {
        StringBuilder sb = new StringBuilder();
        for (CharSequence p : parts) {
            if (p == null || p.length() == 0) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(p);
        }
        return sb.toString().trim().toLowerCase();
    }
}
