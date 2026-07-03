package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.List;

public class MissedCallListActivity extends Activity {
    private LinearLayout listContainer;
    private TextView countBadge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int pad = CallUiHelper.dp(this, 16);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(CallUiHelper.BG_DARK);
        root.setPadding(pad, pad, pad, pad);

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView icon = new TextView(this);
        icon.setText("📞");
        icon.setTextSize(22f);
        icon.setPadding(0, 0, CallUiHelper.dp(this, 8), 0);
        header.addView(icon);

        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setLayoutParams(new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        TextView title = new TextView(this);
        title.setText("المكالمات الفائتة");
        title.setTextColor(CallUiHelper.TEXT_PRIMARY);
        title.setTextSize(22f);
        title.setTypeface(null, Typeface.BOLD);
        titles.addView(title);

        TextView sub = new TextView(this);
        sub.setText("اضغط الاسم لعرض السجل الكامل");
        sub.setTextColor(CallUiHelper.TEXT_SECONDARY);
        sub.setTextSize(13f);
        sub.setPadding(0, CallUiHelper.dp(this, 2), 0, 0);
        titles.addView(sub);
        header.addView(titles);

        countBadge = new TextView(this);
        countBadge.setTextColor(Color.WHITE);
        countBadge.setTextSize(14f);
        countBadge.setTypeface(null, Typeface.BOLD);
        countBadge.setGravity(Gravity.CENTER);
        int badgePad = CallUiHelper.dp(this, 10);
        countBadge.setPadding(badgePad, badgePad / 2, badgePad, badgePad / 2);
        GradientDrawable badgeBg = new GradientDrawable();
        badgeBg.setCornerRadius(CallUiHelper.dp(this, 14));
        badgeBg.setColor(CallUiHelper.MISSED_ACCENT);
        countBadge.setBackground(badgeBg);
        header.addView(countBadge);
        root.addView(header);

        ScrollView scroll = new ScrollView(this);
        scroll.setPadding(0, pad, 0, pad);
        listContainer = new LinearLayout(this);
        listContainer.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(listContainer);
        root.addView(scroll, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        TextView close = CallUiHelper.makeActionButton(this, "إغلاق", CallUiHelper.ACTION_DEL);
        close.setOnClickListener(v -> finish());
        root.addView(close);

        setContentView(root);
        render();
    }

    @Override
    protected void onResume() {
        super.onResume();
        render();
    }

    private void render() {
        MissedCallAutoWatcher.scanNow(this);
        listContainer.removeAllViews();
        List<CallerGroupHelper.CallerGroup> groups = CallerGroupHelper.groupAll(this);
        int totalMissed = MissedCallQueueStore.size(this);
        updateCountBadge(groups.isEmpty() ? 0 : groups.size(), totalMissed);

        if (groups.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText("لا توجد مكالمات فائتة 🎉");
            empty.setTextColor(CallUiHelper.TEXT_SECONDARY);
            empty.setTextSize(16f);
            empty.setGravity(Gravity.CENTER);
            empty.setPadding(0, CallUiHelper.dp(this, 40), 0, 0);
            listContainer.addView(empty);
            MissedCallOverlayController.refresh(this);
            return;
        }

        int gap = CallUiHelper.dp(this, 10);
        for (CallerGroupHelper.CallerGroup group : groups) {
            listContainer.addView(buildCard(group), cardLayout(gap));
        }
    }

    private void updateCountBadge(int callers, int totalMissed) {
        if (countBadge != null) {
            countBadge.setText(callers + (totalMissed > callers ? " (" + totalMissed + ")" : ""));
        }
    }

    private LinearLayout.LayoutParams cardLayout(int gap) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = gap;
        return lp;
    }

    private View buildCard(CallerGroupHelper.CallerGroup group) {
        int accent = CallUiHelper.accentForItem(group.isSnap);
        int pad = CallUiHelper.dp(this, 14);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setPadding(pad, pad, pad, pad);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setBackground(CallUiHelper.roundedCard(CallUiHelper.CARD_BG, accent, this));
        card.setOnClickListener(v -> MissedCallDetailActivity.open(this, group));

        TextView avatar = new TextView(this);
        avatar.setText(CallUiHelper.initial(group.displayName));
        avatar.setTextColor(Color.WHITE);
        avatar.setTextSize(20f);
        avatar.setTypeface(null, Typeface.BOLD);
        avatar.setGravity(Gravity.CENTER);
        int avatarSize = CallUiHelper.dp(this, 48);
        LinearLayout.LayoutParams avatarLp = new LinearLayout.LayoutParams(avatarSize, avatarSize);
        avatarLp.setMarginEnd(CallUiHelper.dp(this, 12));
        avatar.setLayoutParams(avatarLp);
        avatar.setBackground(CallUiHelper.circle(CallUiHelper.colorForName(group.displayName), 48, this));
        card.addView(avatar);

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        info.setLayoutParams(new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        TextView nameView = new TextView(this);
        nameView.setText(group.displayName);
        nameView.setTextColor(CallUiHelper.TEXT_PRIMARY);
        nameView.setTextSize(17f);
        nameView.setTypeface(null, Typeface.BOLD);
        info.addView(nameView);

        TextView subtitle = new TextView(this);
        String missedLabel = group.missedCount() == 1
                ? "مكالمة فائتة واحدة"
                : (group.missedCount() + " مكالمات فائتة");
        subtitle.setText(missedLabel + " · اضغط للسجل");
        subtitle.setTextColor(CallUiHelper.TEXT_SECONDARY);
        subtitle.setTextSize(13f);
        subtitle.setPadding(0, CallUiHelper.dp(this, 2), 0, 0);
        info.addView(subtitle);

        LinearLayout meta = new LinearLayout(this);
        meta.setOrientation(LinearLayout.HORIZONTAL);
        meta.setPadding(0, CallUiHelper.dp(this, 6), 0, 0);
        meta.setGravity(Gravity.CENTER_VERTICAL);

        int badgeBg = group.isSnap
                ? Color.parseColor("#3D3500")
                : Color.parseColor("#0D2A3D");
        int badgeFg = group.isSnap ? CallUiHelper.SNAP_ACCENT : CallUiHelper.PHONE_ACCENT;
        TextView sourceBadge = CallUiHelper.makeBadge(this, group.sourceLabel, badgeBg, badgeFg);
        LinearLayout.LayoutParams badgeLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        badgeLp.setMarginEnd(CallUiHelper.dp(this, 8));
        sourceBadge.setLayoutParams(badgeLp);
        meta.addView(sourceBadge);

        TextView timeView = new TextView(this);
        timeView.setText(CallUiHelper.formatTimeAgo(this, group.latestTimestamp));
        timeView.setTextColor(CallUiHelper.MISSED_ACCENT);
        timeView.setTextSize(12f);
        meta.addView(timeView);
        info.addView(meta);
        card.addView(info);

        TextView chevron = new TextView(this);
        chevron.setText("‹");
        chevron.setTextColor(CallUiHelper.TEXT_SECONDARY);
        chevron.setTextSize(28f);
        chevron.setRotation(180f);
        card.addView(chevron);

        return card;
    }
}
