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
                LinearLayout.LayoutParams.MATCH_PARENT, (int) (200 * getResources().getDisplayMetrics().density));
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
