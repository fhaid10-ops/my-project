package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class DashboardUiHelper {
    public static final int BG = Color.parseColor("#121212");
    public static final int CARD = Color.parseColor("#1C1C1E");
    public static final int CARD_STROKE = Color.parseColor("#2C2C2E");
    public static final int TEXT_PRIMARY = Color.parseColor("#FFFFFF");
    public static final int TEXT_SECONDARY = Color.parseColor("#9E9E9E");
    public static final int OK = Color.parseColor("#4CD964");
    public static final int WARN = Color.parseColor("#FFCC00");
    public static final int BAD = Color.parseColor("#FF3B30");
    public static final int ACCENT = Color.parseColor("#5AC8FA");

    private DashboardUiHelper() {}

    public static LinearLayout verticalRoot(Context context) {
        LinearLayout root = new LinearLayout(context);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        int pad = dp(context, 16);
        root.setPadding(pad, pad, pad, pad);
        return root;
    }

    public static TextView sectionTitle(Context context, String text) {
        TextView tv = new TextView(context);
        tv.setText(text);
        tv.setTextColor(TEXT_PRIMARY);
        tv.setTextSize(16f);
        tv.setTypeface(null, Typeface.BOLD);
        tv.setPadding(0, dp(context, 18), 0, dp(context, 8));
        return tv;
    }

    public static LinearLayout card(Context context, int strokeColor) {
        LinearLayout card = new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(context, 14);
        card.setPadding(pad, pad, pad, pad);
        card.setBackground(CallUiHelper.roundedCard(CARD, strokeColor, context, 2));
        return card;
    }

    public static LinearLayout statusRow(Context context) {
        LinearLayout row = new LinearLayout(context);
        row.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(context, 10);
        row.setLayoutParams(lp);
        return row;
    }

    public static View statusTile(Context context, String icon, String title, String value,
                                  int accent) {
        LinearLayout tile = card(context, accent);
        tile.setLayoutParams(new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        TextView iconView = new TextView(context);
        iconView.setText(icon);
        iconView.setTextSize(22f);
        tile.addView(iconView);

        TextView titleView = new TextView(context);
        titleView.setText(title);
        titleView.setTextColor(TEXT_SECONDARY);
        titleView.setTextSize(12f);
        titleView.setPadding(0, dp(context, 6), 0, 0);
        tile.addView(titleView);

        TextView valueView = new TextView(context);
        valueView.setText(value);
        valueView.setTextColor(TEXT_PRIMARY);
        valueView.setTextSize(20f);
        valueView.setTypeface(null, Typeface.BOLD);
        valueView.setPadding(0, dp(context, 2), 0, 0);
        tile.addView(valueView);
        return tile;
    }

    public static View spacer(Context context, int dp) {
        View v = new View(context);
        v.setLayoutParams(new LinearLayout.LayoutParams(dp(context, dp), dp(context, dp)));
        return v;
    }

    public static View checklistItem(Context context, String label, boolean ok) {
        LinearLayout row = new LinearLayout(context);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(0, dp(context, 6), 0, dp(context, 6));

        TextView dot = new TextView(context);
        dot.setText(ok ? "✓" : "✗");
        dot.setTextColor(ok ? OK : BAD);
        dot.setTextSize(16f);
        dot.setTypeface(null, Typeface.BOLD);
        dot.setPadding(0, 0, dp(context, 10), 0);
        row.addView(dot);

        TextView text = new TextView(context);
        text.setText(label);
        text.setTextColor(ok ? TEXT_PRIMARY : TEXT_SECONDARY);
        text.setTextSize(14f);
        row.addView(text);
        return row;
    }

    public static TextView actionButton(Context context, String title, String subtitle,
                                        int strokeColor) {
        TextView btn = new TextView(context);
        btn.setText(title + (subtitle != null && !subtitle.isEmpty() ? "\n" + subtitle : ""));
        btn.setTextColor(TEXT_PRIMARY);
        btn.setTextSize(15f);
        btn.setTypeface(null, Typeface.BOLD);
        btn.setBackground(CallUiHelper.roundedCard(CARD, strokeColor, context, 2));
        int pad = dp(context, 14);
        btn.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(context, 8);
        btn.setLayoutParams(lp);
        return btn;
    }

    public static TextView mutedNote(Context context, String text) {
        TextView tv = new TextView(context);
        tv.setText(text);
        tv.setTextColor(TEXT_SECONDARY);
        tv.setTextSize(12f);
        tv.setPadding(0, dp(context, 4), 0, 0);
        return tv;
    }

    public static int dp(Context context, int value) {
        return CallUiHelper.dp(context, value);
    }
}
