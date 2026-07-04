package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.Calendar;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

public final class CallUiHelper {
    public static final int BG_DARK = Color.parseColor("#0F1419");
    public static final int CARD_BG = Color.parseColor("#1A2332");
    public static final int TEXT_PRIMARY = Color.parseColor("#F5F7FA");
    public static final int TEXT_SECONDARY = Color.parseColor("#9AA7B8");
    public static final int SNAP_ACCENT = Color.parseColor("#FFFC00");
    public static final int PHONE_ACCENT = Color.parseColor("#4FC3F7");
    public static final int MISSED_ACCENT = Color.parseColor("#FF5252");
    public static final int ACTION_CALL = Color.parseColor("#43A047");
    public static final int ACTION_WA = Color.parseColor("#25D366");
    public static final int ACTION_WA_BUSINESS = Color.parseColor("#128C7E");
    public static final int ACTION_DEL = Color.parseColor("#546E7A");

    private CallUiHelper() {}

    public static int dp(Context context, int value) {
        return (int) (value * context.getResources().getDisplayMetrics().density);
    }

    public static String initial(String name) {
        if (name == null || name.trim().isEmpty()) return "?";
        String trimmed = name.trim();
        for (int i = 0; i < trimmed.length(); i++) {
            char c = trimmed.charAt(i);
            if (Character.isLetterOrDigit(c)) {
                return String.valueOf(Character.toUpperCase(c));
            }
        }
        return "?";
    }

    public static int colorForName(String name) {
        int hash = name == null ? 0 : name.hashCode();
        int[] palette = {
                Color.parseColor("#E53935"),
                Color.parseColor("#8E24AA"),
                Color.parseColor("#3949AB"),
                Color.parseColor("#00897B"),
                Color.parseColor("#F4511E"),
                Color.parseColor("#6D4C41"),
                Color.parseColor("#C2185B"),
                Color.parseColor("#5E35B1")
        };
        return palette[Math.abs(hash) % palette.length];
    }

    public static GradientDrawable circle(int color, int sizeDp, Context context) {
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(color);
        int size = dp(context, sizeDp);
        d.setSize(size, size);
        return d;
    }

    public static GradientDrawable roundedCard(int fillColor, int strokeColor, Context context) {
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.RECTANGLE);
        d.setColor(fillColor);
        d.setCornerRadius(dp(context, 16));
        d.setStroke(dp(context, 1), strokeColor);
        return d;
    }

    public static TextView makeBadge(Context context, String text, int bg, int fg) {
        TextView badge = new TextView(context);
        badge.setText(text);
        badge.setTextColor(fg);
        badge.setTextSize(11f);
        badge.setTypeface(null, Typeface.BOLD);
        int hPad = dp(context, 8);
        int vPad = dp(context, 3);
        badge.setPadding(hPad, vPad, hPad, vPad);
        GradientDrawable bgDrawable = new GradientDrawable();
        bgDrawable.setCornerRadius(dp(context, 10));
        bgDrawable.setColor(bg);
        badge.setBackground(bgDrawable);
        return badge;
    }

    public static TextView makeActionButton(Context context, String label, int color) {
        TextView btn = new TextView(context);
        btn.setText(label);
        btn.setTextColor(Color.WHITE);
        btn.setTextSize(13f);
        btn.setTypeface(null, Typeface.BOLD);
        btn.setGravity(Gravity.CENTER);
        int hPad = dp(context, 12);
        int vPad = dp(context, 8);
        btn.setPadding(hPad, vPad, hPad, vPad);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dp(context, 12));
        bg.setColor(color);
        btn.setBackground(bg);
        return btn;
    }

    public static LinearLayout.LayoutParams actionParams(Context context) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        lp.setMarginEnd(dp(context, 6));
        return lp;
    }

    public static String formatTimeAgo(Context context, long timestamp) {
        if (timestamp <= 0) return "وقت غير معروف";
        long now = System.currentTimeMillis();
        long diff = now - timestamp;
        if (diff < TimeUnit.MINUTES.toMillis(1)) return "الآن";
        if (diff < TimeUnit.HOURS.toMillis(1)) {
            long mins = TimeUnit.MILLISECONDS.toMinutes(diff);
            return "منذ " + mins + (mins == 1 ? " دقيقة" : " دقائق");
        }
        Calendar calNow = Calendar.getInstance();
        Calendar calThen = Calendar.getInstance();
        calThen.setTimeInMillis(timestamp);
        boolean sameDay = calNow.get(Calendar.YEAR) == calThen.get(Calendar.YEAR)
                && calNow.get(Calendar.DAY_OF_YEAR) == calThen.get(Calendar.DAY_OF_YEAR);
        if (sameDay) {
            return "اليوم " + formatClock(timestamp);
        }
        calNow.add(Calendar.DAY_OF_YEAR, -1);
        boolean yesterday = calNow.get(Calendar.YEAR) == calThen.get(Calendar.YEAR)
                && calNow.get(Calendar.DAY_OF_YEAR) == calThen.get(Calendar.DAY_OF_YEAR);
        if (yesterday) {
            return "أمس " + formatClock(timestamp);
        }
        return String.format(Locale.getDefault(), "%02d/%02d %s",
                calThen.get(Calendar.DAY_OF_MONTH),
                calThen.get(Calendar.MONTH) + 1,
                formatClock(timestamp));
    }

    private static String formatClock(long timestamp) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(timestamp);
        int hour = c.get(Calendar.HOUR);
        if (hour == 0) hour = 12;
        String ampm = c.get(Calendar.AM_PM) == Calendar.AM ? "ص" : "م";
        return String.format(Locale.getDefault(), "%d:%02d %s",
                hour, c.get(Calendar.MINUTE), ampm);
    }

    public static int accentForItem(boolean isSnap) {
        return isSnap ? SNAP_ACCENT : PHONE_ACCENT;
    }

    /** يعرض الرقم بصيغة سعودية واضحة بدون مسافات، مع عزل LTR في الواجهة العربية. */
    public static String compactPhone(String raw) {
        if (raw == null) return "";
        String digits = raw.replaceAll("[^0-9+]", "");
        if (digits.isEmpty()) return raw.trim();

        if (digits.startsWith("+966")) {
            String local = digits.substring(4);
            if (local.length() == 9) return "0" + local;
            return "+966" + local;
        }
        if (digits.startsWith("966") && digits.length() >= 12) {
            String local = digits.substring(3);
            if (local.length() == 9) return "0" + local;
        }
        if (digits.startsWith("00") && digits.length() > 4) {
            return compactPhone("+" + digits.substring(2));
        }
        if (digits.startsWith("0") && digits.length() == 10) return digits;
        if (digits.startsWith("5") && digits.length() == 9) return "0" + digits;
        if (digits.startsWith("+")) return digits;
        return digits;
    }

    public static boolean isMostlyPhone(String text) {
        if (text == null || text.isEmpty()) return false;
        String trimmed = text.trim();
        if (trimmed.matches("^[+0-9*#\\-\\s()]+$")) return true;
        int digits = 0;
        for (int i = 0; i < trimmed.length(); i++) {
            if (Character.isDigit(trimmed.charAt(i))) digits++;
        }
        return digits >= 7 && digits >= trimmed.length() / 2;
    }

    public static String displayCallerLabel(String label) {
        if (label == null || label.isEmpty()) return "";
        if (!isMostlyPhone(label)) return label.trim();
        return "\u2066" + compactPhone(label) + "\u2069";
    }

    public static void bindCallerLabel(TextView tv, String label) {
        if (tv == null) return;
        if (isMostlyPhone(label)) {
            tv.setTextDirection(View.TEXT_DIRECTION_LTR);
        }
        tv.setText(displayCallerLabel(label));
    }

    public static void setRipple(View view) {
        view.setClickable(true);
        view.setFocusable(true);
    }
}
