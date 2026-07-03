package com.hihonor.contacts.snapbridge;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final int REQ_PERMS = 1001;
    private TextView statusView;
    private TextView logView;
    private LinearLayout recentCallsLayout;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        SnapPhoneAccount.register(this);
        requestNeededPermissions();

        int pad = (int) (24 * getResources().getDisplayMetrics().density);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText(getString(R.string.title));
        title.setTextSize(20f);
        title.setTypeface(null, Typeface.BOLD);
        title.setPadding(0, 0, 0, pad / 2);
        root.addView(title);

        root.addView(buildCallFromBox(pad));

        TextView recentTitle = new TextView(this);
        recentTitle.setText(getString(R.string.recent_title));
        recentTitle.setTextSize(16f);
        recentTitle.setTypeface(null, Typeface.BOLD);
        recentTitle.setPadding(0, pad / 2, 0, pad / 3);
        root.addView(recentTitle);

        recentCallsLayout = new LinearLayout(this);
        recentCallsLayout.setOrientation(LinearLayout.VERTICAL);
        root.addView(recentCallsLayout);

        TextView setupTitle = new TextView(this);
        setupTitle.setText(getString(R.string.setup_title));
        setupTitle.setTextSize(14f);
        setupTitle.setPadding(0, pad, 0, pad / 3);
        root.addView(setupTitle);

        statusView = new TextView(this);
        statusView.setTextSize(15f);
        statusView.setPadding(0, 0, 0, pad / 2);
        root.addView(statusView);

        Button btnNotif = new Button(this);
        btnNotif.setText(getString(R.string.btn_enable));
        btnNotif.setOnClickListener(v ->
                startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        root.addView(btnNotif);

        Button btnPerms = new Button(this);
        btnPerms.setText(getString(R.string.btn_perms));
        btnPerms.setOnClickListener(v -> requestNeededPermissions());
        root.addView(btnPerms);

        Button btnClean = new Button(this);
        btnClean.setText(getString(R.string.btn_clean));
        btnClean.setOnClickListener(v -> {
            if (hasCallLogPermissions()) {
                int n = CallLogCleaner.cleanLegacy(this);
                int f = CallLogFixer.fixSnapEntries(this);
                if (n == 0 && f == 0) {
                    SnapEventStore.append(this, "لا توجد سجلات تحتاج إصلاح");
                }
                refreshUi();
            } else {
                requestNeededPermissions();
            }
        });
        root.addView(btnClean);

        TextView logTitle = new TextView(this);
        logTitle.setText(getString(R.string.log_title));
        logTitle.setTextSize(14f);
        logTitle.setPadding(0, pad, 0, pad / 3);
        root.addView(logTitle);

        logView = new TextView(this);
        logView.setTextSize(12f);
        logView.setTextIsSelectable(true);

        ScrollView scroll = new ScrollView(this);
        scroll.addView(logView);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, (int) (120 * getResources().getDisplayMetrics().density));
        scroll.setLayoutParams(lp);
        root.addView(scroll);

        Button btnRefresh = new Button(this);
        btnRefresh.setText(getString(R.string.btn_refresh));
        btnRefresh.setOnClickListener(v -> refreshUi());
        root.addView(btnRefresh);

        ScrollView outer = new ScrollView(this);
        outer.addView(root);
        setContentView(outer);
    }

    private LinearLayout buildCallFromBox(int pad) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        int inner = pad * 2 / 3;
        box.setPadding(inner, inner, inner, inner);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#FFF9C4"));
        bg.setCornerRadius(pad / 2f);
        box.setBackground(bg);

        TextView howTitle = new TextView(this);
        howTitle.setText(getString(R.string.call_from_title));
        howTitle.setTextSize(17f);
        howTitle.setTypeface(null, Typeface.BOLD);
        howTitle.setTextColor(Color.parseColor("#333300"));
        box.addView(howTitle);

        TextView how = new TextView(this);
        how.setText(getString(R.string.call_from_steps));
        how.setTextSize(14f);
        how.setTextColor(Color.parseColor("#333300"));
        how.setPadding(0, pad / 3, 0, pad / 3);
        box.addView(how);

        Button lastCall = new Button(this);
        lastCall.setText(getString(R.string.btn_call_last));
        lastCall.setOnClickListener(v -> {
            String address = LastSnapStore.getAddress(this);
            if (address != null) {
                SnapchatLauncher.open(this, address);
            } else {
                SnapEventStore.append(this, "لا توجد مكالمة سناب بعد");
                refreshUi();
            }
        });
        box.addView(lastCall);
        return box;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (hasCallLogPermissions()) {
            CallLogCleaner.cleanLegacy(this);
            CallLogFixer.fixSnapEntries(this);
        }
        SnapQuickCallNotification.refresh(this);
        refreshUi();
    }

    private void refreshUi() {
        boolean notif = isListenerEnabled();
        boolean perms = hasCallLogPermissions();
        StringBuilder status = new StringBuilder();
        status.append(notif ? getString(R.string.status_ok) : getString(R.string.status_no));
        status.append('\n');
        status.append(perms ? getString(R.string.perms_ok) : getString(R.string.perms_no));
        statusView.setText(status.toString());
        logView.setText(SnapEventStore.read(this));
        refreshRecentCalls();
    }

    private void refreshRecentCalls() {
        recentCallsLayout.removeAllViews();
        if (!hasCallLogPermissions()) {
            TextView hint = new TextView(this);
            hint.setText(getString(R.string.recent_need_perms));
            hint.setTextSize(14f);
            recentCallsLayout.addView(hint);
            return;
        }
        List<SnapRecentCalls.Entry> entries = SnapRecentCalls.load(this, 8);
        if (!entries.isEmpty() && LastSnapStore.getAddress(this) == null) {
            LastSnapStore.save(this, entries.get(0).displayName, entries.get(0).address);
        }
        if (entries.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText(getString(R.string.recent_empty));
            empty.setTextSize(14f);
            recentCallsLayout.addView(empty);
            return;
        }
        int gap = (int) (10 * getResources().getDisplayMetrics().density);
        for (SnapRecentCalls.Entry entry : entries) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(0, gap, 0, gap);

            TextView name = new TextView(this);
            name.setText(entry.displayName);
            name.setTextSize(17f);
            name.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
            row.addView(name);

            Button call = new Button(this);
            call.setText(getString(R.string.btn_call));
            call.setTextSize(16f);
            call.setOnClickListener(v -> SnapchatLauncher.open(this, entry.address));
            row.addView(call);

            recentCallsLayout.addView(row);
        }
    }

    private void requestNeededPermissions() {
        List<String> needed = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.READ_CALL_LOG);
        }
        if (checkSelfPermission(Manifest.permission.WRITE_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.WRITE_CALL_LOG);
        }
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (!needed.isEmpty()) {
            requestPermissions(needed.toArray(new String[0]), REQ_PERMS);
        }
    }

    private boolean hasCallLogPermissions() {
        return checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.WRITE_CALL_LOG) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isListenerEnabled() {
        String enabled = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        if (TextUtils.isEmpty(enabled)) return false;
        ComponentName cn = new ComponentName(this, SnapCallLogSyncService.class);
        return enabled.contains(cn.flattenToString());
    }
}
