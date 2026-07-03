package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.graphics.Color;
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
        back.setTextColor(CallUiHelper.PHONE_ACCENT);
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
                CallerGroupHelper.CallerGroup g = CallerGroupHelper.findByKey(MissedCallDetailActivity.this, callerKey);
                CallerActionButtons.performCallback(MissedCallDetailActivity.this, g);
                finish();
            }

            @Override
            public void onWhatsApp() {
                CallerGroupHelper.CallerGroup g = CallerGroupHelper.findByKey(MissedCallDetailActivity.this, callerKey);
                CallerActionButtons.performWhatsApp(MissedCallDetailActivity.this, g);
                finish();
            }

            @Override
            public void onWhatsAppBusiness() {
                CallerGroupHelper.CallerGroup g = CallerGroupHelper.findByKey(MissedCallDetailActivity.this, callerKey);
                CallerActionButtons.performWhatsAppBusiness(MissedCallDetailActivity.this, g);
                finish();
            }

            @Override
            public void onDelete() {
                CallerGroupHelper.CallerGroup g = CallerGroupHelper.findByKey(MissedCallDetailActivity.this, callerKey);
                CallerActionButtons.performDelete(MissedCallDetailActivity.this, g);
                finish();
            }
        };
        root.addView(CallerActionButtons.buildBottomBar(this, listener));

        setContentView(root);
        render();
    }

    @Override
    protected void onResume() {
        super.onResume();
        render();
    }

    private void render() {
        CallerGroupHelper.CallerGroup group = CallerGroupHelper.findByKey(this, callerKey);
        if (group == null) {
            finish();
            return;
        }

        buildHeader(group);
        historyContainer.removeAllViews();

        List<CallerCallHistory.Record> records = CallerCallHistory.forGroup(this, group);
        if (records.isEmpty()) {
            for (MissedCallQueueStore.Item item : group.queuedItems) {
                historyContainer.addView(buildHistoryRow(item.timestamp, CallLog.Calls.MISSED_TYPE, 0),
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
            historyContainer.addView(buildHistoryRow(record.date, record.type, record.durationSec),
                    rowLayout());
        }
    }

    private void buildHeader(CallerGroupHelper.CallerGroup group) {
        headerCard.removeAllViews();
        int accent = CallUiHelper.accentForItem(group.isSnap);
        headerCard.setBackground(CallUiHelper.roundedCard(CallUiHelper.CARD_BG, accent, this));

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);

        TextView avatar = new TextView(this);
        avatar.setText(CallUiHelper.initial(group.displayName));
        avatar.setTextColor(Color.WHITE);
        avatar.setTextSize(24f);
        avatar.setTypeface(null, Typeface.BOLD);
        avatar.setGravity(Gravity.CENTER);
        int avatarSize = CallUiHelper.dp(this, 56);
        LinearLayout.LayoutParams avatarLp = new LinearLayout.LayoutParams(avatarSize, avatarSize);
        avatarLp.setMarginEnd(CallUiHelper.dp(this, 14));
        avatar.setLayoutParams(avatarLp);
        avatar.setBackground(CallUiHelper.circle(CallUiHelper.colorForName(group.displayName), 56, this));
        top.addView(avatar);

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        info.setLayoutParams(new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        TextView name = new TextView(this);
        name.setText(group.displayName);
        name.setTextColor(CallUiHelper.TEXT_PRIMARY);
        name.setTextSize(20f);
        name.setTypeface(null, Typeface.BOLD);
        info.addView(name);

        TextView sub = new TextView(this);
        sub.setText(group.missedCount() + " فائتة · " + group.sourceLabel);
        sub.setTextColor(CallUiHelper.TEXT_SECONDARY);
        sub.setTextSize(13f);
        sub.setPadding(0, CallUiHelper.dp(this, 4), 0, 0);
        info.addView(sub);
        top.addView(info);
        headerCard.addView(top);
    }

    private LinearLayout.LayoutParams rowLayout() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = CallUiHelper.dp(this, 8);
        return lp;
    }

    private View buildHistoryRow(long date, int type, int durationSec) {
        int rowPad = CallUiHelper.dp(this, 12);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(rowPad, rowPad, rowPad, rowPad);
        boolean missed = type == CallLog.Calls.MISSED_TYPE;
        row.setBackground(CallUiHelper.roundedCard(
                Color.parseColor("#151C28"),
                missed ? CallUiHelper.MISSED_ACCENT : CallUiHelper.ACTION_CALL,
                this));

        TextView typeBadge = CallUiHelper.makeBadge(
                this,
                missed ? "فائتة" : "واردة",
                missed ? Color.parseColor("#3D1515") : Color.parseColor("#0D2E14"),
                missed ? CallUiHelper.MISSED_ACCENT : CallUiHelper.ACTION_CALL);
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
        return row;
    }

    public static void open(Activity from, CallerGroupHelper.CallerGroup group) {
        android.content.Intent i = new android.content.Intent(from, MissedCallDetailActivity.class);
        i.putExtra(CallerGroupHelper.EXTRA_CALLER_KEY, group.key);
        from.startActivity(i);
    }
}
