package com.hihonor.contacts.snapbridge;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
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
        title.setPadding(0, 0, 0, pad / 2);
        root.addView(title);

        TextView desc = new TextView(this);
        desc.setText(getString(R.string.desc));
        desc.setTextSize(16f);
        desc.setPadding(0, 0, 0, pad);
        root.addView(desc);

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
                if (n == 0) {
                    SnapEventStore.append(this, "لا توجد سجلات snap: قديمة");
                }
                refreshUi();
            } else {
                requestNeededPermissions();
            }
        });
        root.addView(btnClean);

        TextView recentTitle = new TextView(this);
        recentTitle.setText(getString(R.string.recent_title));
        recentTitle.setTextSize(14f);
        recentTitle.setPadding(0, pad, 0, pad / 3);
        root.addView(recentTitle);

        recentCallsLayout = new LinearLayout(this);
        recentCallsLayout.setOrientation(LinearLayout.VERTICAL);
        root.addView(recentCallsLayout);

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
                LinearLayout.LayoutParams.MATCH_PARENT, (int) (160 * getResources().getDisplayMetrics().density));
        scroll.setLayoutParams(lp);
        root.addView(scroll);

        Button btnRefresh = new Button(this);
        btnRefresh.setText(getString(R.string.btn_refresh));
        btnRefresh.setOnClickListener(v -> refreshUi());
        root.addView(btnRefresh);

        TextView note = new TextView(this);
        note.setText(getString(R.string.note));
        note.setTextSize(13f);
        note.setPadding(0, pad / 2, 0, 0);
        root.addView(note);

        ScrollView outer = new ScrollView(this);
        outer.addView(root);
        setContentView(outer);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (hasCallLogPermissions()) {
            CallLogCleaner.cleanLegacy(this);
        }
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
            hint.setTextSize(13f);
            recentCallsLayout.addView(hint);
            return;
        }
        List<SnapRecentCalls.Entry> entries = SnapRecentCalls.load(this, 8);
        if (entries.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText(getString(R.string.recent_empty));
            empty.setTextSize(13f);
            recentCallsLayout.addView(empty);
            return;
        }
        int gap = (int) (8 * getResources().getDisplayMetrics().density);
        for (SnapRecentCalls.Entry entry : entries) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setPadding(0, gap, 0, gap);

            TextView name = new TextView(this);
            name.setText(entry.displayName);
            name.setTextSize(15f);
            name.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
            row.addView(name);

            Button call = new Button(this);
            call.setText(getString(R.string.btn_call));
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
