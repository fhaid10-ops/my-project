package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.app.Notification;
import android.app.Person;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import android.text.TextUtils;

import java.util.Locale;

public final class SnapNotificationParser {
    public static final class ParsedCall {
        public final String displayName;
        public final String snapUsername;
        public final int callType;
        public final String reason;

        ParsedCall(String displayName, String snapUsername, int callType, String reason) {
            this.displayName = displayName;
            this.snapUsername = snapUsername;
            this.callType = callType;
            this.reason = reason;
        }
    }

    public static ParsedCall forcedCall(Context context, StatusBarNotification sbn) {
        Notification n = sbn.getNotification();
        Bundle extras = n != null ? n.extras : null;
        String snapUser = extras != null ? extractSnapUsername(extras) : "";
        String name = LastSnapStore.getName(context);
        if (SnapNameHelper.isGenericAppName(name) && extras != null) {
            CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
            if (title != null && !SnapNameHelper.isGenericAppName(title.toString())) {
                name = title.toString().trim();
            }
        }
        if (SnapNameHelper.isGenericAppName(name)) name = "Snapchat";
        String combined = "";
        if (extras != null) {
            combined = join(
                    extras.getCharSequence(Notification.EXTRA_TITLE),
                    extras.getCharSequence(Notification.EXTRA_TEXT),
                    extras.getCharSequence(Notification.EXTRA_BIG_TEXT),
                    extras.getCharSequence(Notification.EXTRA_SUB_TEXT),
                    extras.getCharSequence(Notification.EXTRA_INFO_TEXT));
        }
        return new ParsedCall(name, snapUser, resolveTypeFromText(combined), "forced");
    }

    private SnapNotificationParser() {}

    public static ParsedCall parse(StatusBarNotification sbn) {
        if (isNonCallNotification(sbn)) return null;
        Notification n = sbn.getNotification();
        if (n == null) return null;
        Bundle extras = n.extras;
        if (extras == null) return null;

        String snapUser = extractSnapUsername(extras);
        if (Notification.CATEGORY_CALL.equals(n.category)) {
            return buildParsed(extras, n, snapUser, resolveCallerName(extras), "CATEGORY_CALL");
        }

        if (Build.VERSION.SDK_INT >= 31) {
            String template = extras.getString("android.template");
            if (template != null && template.contains("CallStyle")) {
                return buildParsed(extras, n, snapUser, resolveCallerName(extras), "CallStyle");
            }
        }

        if (n.actions != null && n.actions.length >= 2 && isLikelyCallActions(n)) {
            return buildParsed(extras, n, snapUser, resolveCallerName(extras), "actions");
        }

        if (hasCallExtraKeys(extras)) {
            return buildParsed(extras, n, snapUser, resolveCallerName(extras), "call_extra");
        }

        if ((n.flags & Notification.FLAG_ONGOING_EVENT) != 0 && n.fullScreenIntent != null
                && (hasCallExtraKeys(extras) || isLikelyCallActions(n))) {
            return buildParsed(extras, n, snapUser, resolveCallerName(extras), "ongoing");
        }

        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
        CharSequence info = extras.getCharSequence(Notification.EXTRA_INFO_TEXT);
        String combined = join(title, text, bigText, subText, info);
        if (TextUtils.isEmpty(combined)) return null;

        String lower = combined.toLowerCase(Locale.ROOT);
        if (!hasExplicitCallPhrase(combined) && !hasCallExtraKeys(extras)) return null;

        String name = resolveCallerName(extras);
        if (TextUtils.isEmpty(name) || SnapNameHelper.isGenericAppName(name)) {
            name = firstNonEmpty(
                    extractNameFromText(text),
                    extractNameFromPhrase(combined));
        }
        if (TextUtils.isEmpty(name) || SnapNameHelper.isGenericAppName(name)) {
            name = firstMeaningfulExtraString(extras);
        }
        if (TextUtils.isEmpty(name) || SnapNameHelper.isGenericAppName(name)) {
            name = extractNameFromCallingPatterns(title, text, bigText, subText, info, combined);
        }
        if (TextUtils.isEmpty(name) || SnapNameHelper.isGenericAppName(name)) {
            name = "Snapchat";
        }
        return new ParsedCall(SnapNameHelper.clean(name), snapUser, resolveTypeFromText(lower), "text");
    }

    public static boolean isLikelyCallNotification(StatusBarNotification sbn) {
        if (isNonCallNotification(sbn)) return false;
        Notification n = sbn != null ? sbn.getNotification() : null;
        if (n == null) return false;
        Bundle extras = n.extras;
        if (extras == null) return false;
        if (Notification.CATEGORY_CALL.equals(n.category)) return true;
        if (hasCallExtraKeys(extras)) return true;
        if (Build.VERSION.SDK_INT >= 31) {
            String template = extras.getString("android.template");
            if (template != null && template.contains("CallStyle")) return true;
        }
        if (n.actions != null && n.actions.length >= 2 && isLikelyCallActions(n)) return true;
        if ((n.flags & Notification.FLAG_ONGOING_EVENT) != 0 && n.fullScreenIntent != null
                && (hasCallExtraKeys(extras) || isLikelyCallActions(n))) {
            return true;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channel = n.getChannelId();
            if (isCallChannel(channel)) return true;
        }
        String combined = join(
                extras.getCharSequence(Notification.EXTRA_TITLE),
                extras.getCharSequence(Notification.EXTRA_TEXT),
                extras.getCharSequence(Notification.EXTRA_BIG_TEXT),
                extras.getCharSequence(Notification.EXTRA_SUB_TEXT),
                extras.getCharSequence(Notification.EXTRA_INFO_TEXT));
        return !TextUtils.isEmpty(combined) && hasExplicitCallPhrase(combined);
    }

    /** @deprecated استخدم isLikelyCallNotification — أوسع سابقاً ويسبب تسجيل رسائل/طلبات صداقة */
    public static boolean isSnapProbableCall(StatusBarNotification sbn) {
        return isLikelyCallNotification(sbn);
    }

    /** إشعارات ليست مكالمات: رسائل، طلبات صداقة، قصص، إلخ. */
    public static boolean isNonCallNotification(StatusBarNotification sbn) {
        Notification n = sbn != null ? sbn.getNotification() : null;
        if (n == null) return true;
        String cat = n.category;
        if (Notification.CATEGORY_MESSAGE.equals(cat)
                || Notification.CATEGORY_SOCIAL.equals(cat)
                || Notification.CATEGORY_EMAIL.equals(cat)
                || Notification.CATEGORY_PROMO.equals(cat)
                || Notification.CATEGORY_EVENT.equals(cat)
                || Notification.CATEGORY_RECOMMENDATION.equals(cat)) {
            return true;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channel = n.getChannelId();
            if (isNonCallChannel(channel)) return true;
        }
        Bundle extras = n.extras;
        if (extras == null) return false;
        String combined = join(
                extras.getCharSequence(Notification.EXTRA_TITLE),
                extras.getCharSequence(Notification.EXTRA_TEXT),
                extras.getCharSequence(Notification.EXTRA_BIG_TEXT),
                extras.getCharSequence(Notification.EXTRA_SUB_TEXT),
                extras.getCharSequence(Notification.EXTRA_INFO_TEXT));
        if (TextUtils.isEmpty(combined)) return false;
        return isFriendMessageOrSocial(combined.toLowerCase(Locale.ROOT));
    }

    private static boolean isCallChannel(String channel) {
        if (channel == null) return false;
        String lc = channel.toLowerCase(Locale.ROOT);
        if (isNonCallChannel(channel)) return false;
        return lc.contains("call") || lc.contains("ring") || lc.contains("voice")
                || lc.contains("voip") || lc.contains("rtc");
    }

    private static boolean isNonCallChannel(String channel) {
        if (channel == null) return false;
        String lc = channel.toLowerCase(Locale.ROOT);
        return lc.contains("message") || lc.contains("chat") || lc.contains("friend")
                || lc.contains("social") || lc.contains("story") || lc.contains("stories")
                || lc.contains("memory") || lc.contains("memories") || lc.contains("discover")
                || lc.contains("subscription") || lc.contains("marketing") || lc.contains("promo");
    }

    private static boolean isFriendMessageOrSocial(String lower) {
        String[] block = {
                "friend request", "طلب صداق", "طلب صداقه", "added you", "أضافك", "add friend",
                "wants to be your friend", "accept friend", "قبول الطلب", "صداقة",
                "sent you a", "sent you", "أرسل لك", "أرسلت", "رسالة", "رساله", "message",
                "new chat", "new snap", "replied to", "رد على", "mentioned you", "ذكرك",
                "story", "قصة", "stories", "memory", "ذكريات", "memories",
                "streak", "spotlight", "discover", "subscription", "اشتراك",
                "typing", "يكتب", "screenshot", "لقطة شاشة",
                "bitmoji", "birthday", "عيد ميلاد", "team snapchat", "opened your",
                "فتح", "snap from", "chat from", "محادثة"
        };
        for (String token : block) {
            if (lower.contains(token)) return true;
        }
        return false;
    }

    private static boolean hasExplicitCallPhrase(String text) {
        if (TextUtils.isEmpty(text)) return false;
        String lower = text.toLowerCase(Locale.ROOT);
        if (isFriendMessageOrSocial(lower)) return false;
        String[] phrases = {
                "is calling you", " is calling", "calling you", "incoming call",
                "missed call", "video call", "voice call", "call from",
                "يتصل بك", "يتصل", "مكالمة فائتة", "مكالمة واردة", "مكالمة من",
                "يرن", "ringing", "رنين", "لم يتم الرد", "لم يرد"
        };
        for (String phrase : phrases) {
            if (lower.contains(phrase)) return true;
        }
        return lower.contains("call") || lower.contains("مكالم");
    }

    public static ParsedCall parseOrFallback(StatusBarNotification sbn) {
        if (isNonCallNotification(sbn)) return null;
        ParsedCall call = parse(sbn);
        if (call != null) return call;
        if (!isLikelyCallNotification(sbn)) return null;
        Notification n = sbn.getNotification();
        Bundle extras = n.extras;
        String snapUser = extractSnapUsername(extras);
        String combined = join(
                extras.getCharSequence(Notification.EXTRA_TITLE),
                extras.getCharSequence(Notification.EXTRA_TEXT),
                extras.getCharSequence(Notification.EXTRA_BIG_TEXT),
                extras.getCharSequence(Notification.EXTRA_SUB_TEXT),
                extras.getCharSequence(Notification.EXTRA_INFO_TEXT));
        return new ParsedCall(
                fallbackCallName(extras, snapUser),
                snapUser,
                resolveTypeFromText(combined),
                "fallback");
    }

    private static ParsedCall buildParsed(Bundle extras, Notification n, String snapUser,
                                          String resolvedName, String reason) {
        String name = resolvedName;
        if (TextUtils.isEmpty(name) || SnapNameHelper.isGenericAppName(name)) {
            name = fallbackCallName(extras, snapUser);
        }
        return new ParsedCall(
                SnapNameHelper.clean(name),
                snapUser,
                resolveType(extras, n),
                reason);
    }

    private static String fallbackCallName(Bundle extras, String snapUser) {
        if (!TextUtils.isEmpty(snapUser)) return snapUser;
        String fromPeople = extractFromPeopleList(extras);
        if (!TextUtils.isEmpty(fromPeople)) return fromPeople;
        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
        String fromPatterns = extractNameFromCallingPatterns(title, text, subText, null, null);
        if (!TextUtils.isEmpty(fromPatterns)) return fromPatterns;
        String bullet = text != null ? extractNameBeforeBullet(text.toString()) : null;
        if (!TextUtils.isEmpty(bullet)) return bullet;
        if (text != null && !SnapNameHelper.isGenericAppName(text.toString())
                && !isGenericCallWord(text.toString())) {
            return text.toString().trim();
        }
        if (title != null && title.length() > 0) return title.toString().trim();
        return "Snapchat";
    }

    private static String extractSnapUsername(Bundle extras) {
        String[] keys = {"username", "user", "user_name", "sender", "sender_username", "senderId"};
        for (String key : keys) {
            Object v = extras.get(key);
            if (v instanceof CharSequence) {
                String s = v.toString().trim();
                if (looksLikeUsername(s)) return s;
            }
        }
        for (String key : extras.keySet()) {
            String lk = key.toLowerCase();
            if (lk.contains("user") || lk.contains("sender")) {
                Object v = extras.get(key);
                if (v instanceof CharSequence) {
                    String s = v.toString().trim();
                    if (looksLikeUsername(s)) return s;
                }
            }
        }
        return "";
    }

    private static boolean looksLikeUsername(String s) {
        return !TextUtils.isEmpty(s) && s.length() >= 2 && s.length() <= 32 && !s.contains(" ");
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
                        || t.contains("رفض") || t.contains("hang") || t.contains("إنهاء")
                        || t.contains("end") || t.contains("accept")) {
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
        if (lower.contains("missed") || lower.contains("فائت")
                || lower.contains("cancel") || lower.contains("canceled")
                || lower.contains("declined") || lower.contains("unanswered")
                || lower.contains("ملغ") || lower.contains("لم يتم الرد")
                || lower.contains("لم يرد")) {
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

    private static String resolveCallerName(Bundle extras) {
        String person = extractPersonName(extras);
        if (!TextUtils.isEmpty(person) && !SnapNameHelper.isGenericAppName(person)) {
            return cleanName(person);
        }
        String fromPeople = extractFromPeopleList(extras);
        if (!TextUtils.isEmpty(fromPeople)) return cleanName(fromPeople);

        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
        CharSequence info = extras.getCharSequence(Notification.EXTRA_INFO_TEXT);
        String combined = join(title, text, bigText, subText, info);

        String fromPatterns = extractNameFromCallingPatterns(title, text, bigText, subText, combined);
        if (!TextUtils.isEmpty(fromPatterns)) return cleanName(fromPatterns);

        if (title != null && !SnapNameHelper.isGenericAppName(title.toString())) {
            return cleanName(title.toString());
        }
        if (text != null) {
            String fromText = extractNameFromCallingPatterns(null, text, null, null, text.toString());
            if (!TextUtils.isEmpty(fromText)) return cleanName(fromText);
            String bullet = extractNameBeforeBullet(text.toString());
            if (!TextUtils.isEmpty(bullet)) return cleanName(bullet);
        }
        if (subText != null && !SnapNameHelper.isGenericAppName(subText.toString())) {
            return cleanName(subText.toString());
        }
        return null;
    }

    private static String extractNameFromCallingPatterns(CharSequence... parts) {
        for (CharSequence part : parts) {
            if (part == null || part.length() == 0) continue;
            String t = part.toString().trim();
            String fromBullet = extractNameBeforeBullet(t);
            if (!TextUtils.isEmpty(fromBullet)) return fromBullet;

            String lower = t.toLowerCase(Locale.ROOT);
            String[] enPatterns = {
                    " is calling you", " is calling", " calling you", " calling",
                    " incoming call from ", " missed call from ", " call from ",
                    " video call from ", " voice call from "
            };
            for (String pattern : enPatterns) {
                int idx = lower.indexOf(pattern);
                if (idx >= 0) {
                    String candidate = idx == 0
                            ? t.substring(pattern.length()).trim()
                            : t.substring(0, idx).trim();
                    candidate = stripCallSuffix(candidate);
                    if (isValidCallerName(candidate)) return candidate;
                }
            }
            String[] arPatterns = {
                    " يتصل بك", " يتصل", "يتصل بك ", "يتصل ",
                    "مكالمة فائتة من ", "مكالمة من ", "مكالمة واردة من ",
                    "من ", "مع "
            };
            for (String pattern : arPatterns) {
                int idx = t.indexOf(pattern);
                if (idx >= 0) {
                    String candidate = pattern.startsWith("من ") || pattern.startsWith("مع ")
                            ? t.substring(idx + pattern.length()).trim()
                            : (idx == 0 ? t.substring(pattern.length()).trim() : t.substring(0, idx).trim());
                    candidate = stripCallSuffix(candidate);
                    if (isValidCallerName(candidate)) return candidate;
                }
            }
        }
        return null;
    }

    private static String extractNameBeforeBullet(String text) {
        if (text == null) return null;
        int idx = text.indexOf('•');
        if (idx <= 0) idx = text.indexOf('|');
        if (idx <= 0) return null;
        String candidate = text.substring(0, idx).trim();
        return isValidCallerName(candidate) ? candidate : null;
    }

    private static String stripCallSuffix(String candidate) {
        if (candidate == null) return null;
        String c = candidate.trim();
        String lower = c.toLowerCase(Locale.ROOT);
        String[] suffixes = {
                " incoming call", " missed call", " video call", " voice call",
                " مكالمة فائتة", " مكالمة", " واردة", " فائتة"
        };
        for (String suffix : suffixes) {
            if (lower.endsWith(suffix)) {
                c = c.substring(0, c.length() - suffix.length()).trim();
                lower = c.toLowerCase(Locale.ROOT);
            }
        }
        return c;
    }

    private static boolean isValidCallerName(String candidate) {
        if (TextUtils.isEmpty(candidate)) return false;
        if (candidate.length() > 60) return false;
        if (SnapNameHelper.isGenericAppName(candidate)) return false;
        if (isGenericCallWord(candidate)) return false;
        if (isCallRelated(candidate.toLowerCase(Locale.ROOT))) return false;
        return true;
    }

    private static String extractNameFromPhrase(String phrase) {
        String[] markers = {"from ", "with ", "to ", "من ", "مع ", "إلى ", "الي ", "عبر "};
        String lower = phrase.toLowerCase(Locale.ROOT);
        for (String marker : markers) {
            int idx = lower.indexOf(marker);
            if (idx >= 0) {
                String tail = phrase.substring(idx + marker.length()).trim();
                int end = tail.indexOf('\n');
                if (end > 0) tail = tail.substring(0, end).trim();
                tail = stripCallSuffix(tail);
                if (isValidCallerName(tail)) return tail;
            }
        }
        return null;
    }

    private static boolean isCallRelated(String lower) {
        if (isFriendMessageOrSocial(lower)) return false;
        return hasExplicitCallPhrase(lower);
    }

    private static boolean isGenericCallWord(String s) {
        if (SnapNameHelper.isGenericAppName(s)) return true;
        String l = s.toLowerCase(Locale.ROOT);
        return l.contains("مكالمة") || l.contains("call")
                || l.contains("incoming") || l.contains("واردة")
                || l.contains("missed") || l.contains("فائت")
                || l.contains("ringing") || l.contains("video") || l.contains("voice");
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
