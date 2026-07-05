package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.graphics.Typeface;
import android.os.Bundle;
import android.provider.CallLog;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.List;
import java.util.Locale;

public class MissedCallDetailActivity extends Activity {
    private String callerKey;
    private LinearLayout headerCard;
    private LinearLayout historyContainer;
    private CallerGroupHelper.CallerGroup currentGroup;
    private boolean skipNextResumeRender;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        callerKey = getIntent().getStringExtra(CallerGroupHelper.EXTRA_CALLER_KEY);
        if (callerKey == null || callerKey.isEmpty()) {
            finish();
            return;
        }

        int pad = CallUiHelper.dp(this, 16);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(CallUiHelper.BG_DARK);
        root.setPadding(pad, pad, 0, 0);

        TextView back = new TextView(this);
        back.setText("← رجوع");
        back.setTextColor(CallUiHelper.TEXT_PRIMARY);
        back.setTextSize(15f);
        back.setPadding(pad, 0, pad, pad / 2);
        back.setOnClickListener(v -> finish());
        root.addView(back);

        headerCard = new LinearLayout(this);
        headerCard.setOrientation(LinearLayout.VERTICAL);
        headerCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams headerLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        headerLp.setMarginStart(pad);
        headerLp.setMarginEnd(pad);
        headerCard.setLayoutParams(headerLp);
        root.addView(headerCard);

        TextView historyTitle = new TextView(this);
        historyTitle.setText("سجل المكالمات (فائتة + واردة)");
        historyTitle.setTextColor(CallUiHelper.TEXT_PRIMARY);
        historyTitle.setTextSize(15f);
        historyTitle.setTypeface(null, Typeface.BOLD);
        historyTitle.setPadding(pad, pad, pad, CallUiHelper.dp(this, 8));
        root.addView(historyTitle);

        ScrollView scroll = new ScrollView(this);
        historyContainer = new LinearLayout(this);
        historyContainer.setOrientation(LinearLayout.VERTICAL);
        historyContainer.setPadding(pad, 0, pad, pad);
        scroll.addView(historyContainer);
        root.addView(scroll, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        CallerActionButtons.Listener listener = new CallerActionButtons.Listener() {
            @Override
            public void onCallback() {
                CallerActionButtons.performCallback(MissedCallDetailActivity.this, currentGroup);
                finish();
            }

            @Override
            public void onWhatsApp() {
                CallerActionButtons.performWhatsApp(MissedCallDetailActivity.this, currentGroup);
                finish();
            }

            @Override
            public void onWhatsAppBusiness() {
                CallerActionButtons.performWhatsAppBusiness(MissedCallDetailActivity.this, currentGroup);
                finish();
            }

            @Override
            public void onDelete() {
                CallerActionButtons.performDelete(MissedCallDetailActivity.this, currentGroup);
                finish();
            }
        };
        root.addView(CallerActionButtons.buildBottomBar(this, listener));

        setContentView(root);
        skipNextResumeRender = true;
        render();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (skipNextResumeRender) {
            skipNextResumeRender = false;
            return;
        }
        render();
    }

    private void render() {
        CallerGroupHelper.CallerGroup group = CallerGroupCache.takePendingDetail(callerKey);
        if (group == null) {
            group = CallerGroupCache.findByKey(this, callerKey);
        }
        if (group == null) {
            finish();
            return;
        }
        currentGroup = group;

        buildHeader(group);
        historyContainer.removeAllViews();
        TextView loading = new TextView(this);
        loading.setText("جاري التحميل…");
        loading.setTextColor(CallUiHelper.TEXT_SECONDARY);
        loading.setPadding(0, CallUiHelper.dp(this, 8), 0, 0);
        historyContainer.addView(loading);

        final CallerGroupHelper.CallerGroup groupFinal = group;
        new Thread(() -> {
            final List<CallerCallHistory.Record> records =
                    CallerCallHistory.forGroup(MissedCallDetailActivity.this, groupFinal);
            runOnUiThread(() -> showHistory(groupFinal, records));
        }).start();
    }

    private void showHistory(CallerGroupHelper.CallerGroup group,
                             List<CallerCallHistory.Record> records) {
        if (currentGroup == null || !group.key.equals(currentGroup.key)) return;
        historyContainer.removeAllViews();

        if (records.isEmpty()) {
            for (MissedCallQueueStore.Item item : group.queuedItems) {
                historyContainer.addView(buildHistoryRow(
                                item.timestamp, CallLog.Calls.MISSED_TYPE, 0, item.bestSimLabel()),
                        rowLayout());
            }
            if (group.queuedItems.isEmpty()) {
                TextView empty = new TextView(this);
                empty.setText("لا يوجد سجل إضافي.");
                empty.setTextColor(CallUiHelper.TEXT_SECONDARY);
                historyContainer.addView(empty);
            }
            return;
        }

        for (CallerCallHistory.Record record : records) {
            historyContainer.addView(buildHistoryRow(
                            record.date, record.type, record.durationSec, record.simLabel),
                    rowLayout());
        }
    }

    private void buildHeader(CallerGroupHelper.CallerGroup group) {
        headerCard.removeAllViews();
        int accent = CallUiHelper.accentForItem(group.isSnap);
        headerCard.setBackground(CallUiHelper.roundedCard(CallUiHelper.CARD_BG, accent, this, 1));

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.VERTICAL);

        TextView name = new TextView(this);
        CallUiHelper.bindCallerLabel(name, group.displayName);
        name.setTextColor(CallUiHelper.TEXT_PRIMARY);
        name.setTextSize(20f);
        name.setTypeface(null, Typeface.BOLD);
        top.addView(name);

        TextView sub = new TextView(this);
        String subText = group.missedCount() + " فائتة · " + group.sourceLabel;
        if (group.simLabel != null && !group.simLabel.isEmpty()) {
            subText = subText + " · " + group.simLabel;
        }
        sub.setText(subText);
        sub.setTextColor(CallUiHelper.TEXT_SECONDARY);
        sub.setTextSize(13f);
        sub.setPadding(0, CallUiHelper.dp(this, 4), 0, 0);
        top.addView(sub);
        headerCard.addView(top);
    }

    private LinearLayout.LayoutParams rowLayout() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = CallUiHelper.dp(this, 8);
        return lp;
    }

    private View buildHistoryRow(long date, int type, int durationSec, String simLabel) {
        int rowPad = CallUiHelper.dp(this, 12);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(rowPad, rowPad, rowPad, rowPad);
        boolean missed = type == CallLog.Calls.MISSED_TYPE;
        row.setBackground(CallUiHelper.roundedCard(
                CallUiHelper.CARD_BG,
                CallUiHelper.BORDER_LIGHT,
                this, 1));

        TextView typeBadge = CallUiHelper.makeBadge(
                this,
                missed ? "فائتة" : "واردة",
                CallUiHelper.CHIP_SIM_BG,
                CallUiHelper.TEXT_PRIMARY,
                CallUiHelper.BORDER_LIGHT,
                1);
        LinearLayout.LayoutParams badgeLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        badgeLp.setMarginEnd(CallUiHelper.dp(this, 10));
        typeBadge.setLayoutParams(badgeLp);
        row.addView(typeBadge);

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        info.setLayoutParams(new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        TextView time = new TextView(this);
        time.setText(CallUiHelper.formatTimeAgo(this, date));
        time.setTextColor(CallUiHelper.TEXT_PRIMARY);
        time.setTextSize(14f);
        info.addView(time);

        if (!missed && durationSec > 0) {
            TextView dur = new TextView(this);
            int m = durationSec / 60;
            int s = durationSec % 60;
            dur.setText(m > 0
                    ? String.format(Locale.getDefault(), "%d:%02d د", m, s)
                    : String.format(Locale.getDefault(), "%d ث", s));
            dur.setTextColor(CallUiHelper.TEXT_SECONDARY);
            dur.setTextSize(12f);
            info.addView(dur);
        }
        row.addView(info);

        if (simLabel != null && !simLabel.isEmpty()) {
            TextView sim = CallUiHelper.makeBadge(
                    this, simLabel, CallUiHelper.CHIP_SIM_BG, CallUiHelper.CHIP_SIM_FG,
                    CallUiHelper.BORDER_LIGHT, 1);
            row.addView(sim);
        }
        return row;
    }

    public static void open(Activity from, CallerGroupHelper.CallerGroup group) {
        android.content.Intent i = new android.content.Intent(from, MissedCallDetailActivity.class);
        i.putExtra(CallerGroupHelper.EXTRA_CALLER_KEY, group.key);
        from.startActivity(i);
    }
}
