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
import android.net.Uri;
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
        title.setTypeface(null, Typeface.BOLD);
        title.setPadding(0, 0, 0, pad / 2);
        root.addView(title);

        root.addView(buildSetupBox(pad));

        TextView setupTitle = new TextView(this);
        setupTitle.setText(getString(R.string.setup_title));
        setupTitle.setTextSize(14f);
        setupTitle.setPadding(0, pad, 0, pad / 3);
        root.addView(setupTitle);

        statusView = new TextView(this);
        statusView.setTextSize(15f);
        statusView.setPadding(0, 0, 0, pad / 2);
        root.addView(statusView);

        Button btnRedirect = new Button(this);
        btnRedirect.setText(getString(R.string.btn_redirect));
        btnRedirect.setOnClickListener(v -> SnapRoleHelper.requestCallRedirection(this));
        root.addView(btnRedirect);

        Button btnNotif = new Button(this);
        btnNotif.setText(getString(R.string.btn_enable));
        btnNotif.setOnClickListener(v ->
                startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        root.addView(btnNotif);

        Button btnPerms = new Button(this);
        btnPerms.setText(getString(R.string.btn_perms));
        btnPerms.setOnClickListener(v -> requestNeededPermissions());
        root.addView(btnPerms);

        Button btnContacts = new Button(this);
        btnContacts.setText(getString(R.string.btn_contacts));
        btnContacts.setOnClickListener(v -> requestContactsPermission());
        root.addView(btnContacts);

        Button btnClean = new Button(this);
        btnClean.setText(getString(R.string.btn_clean));
        btnClean.setOnClickListener(v -> {
            if (hasCallLogPermissions()) {
                CallLogCleaner.cleanLegacy(this);
                CallLogFixer.fixSnapEntries(this);
                refreshUi();
            } else {
                requestNeededPermissions();
            }
        });
        root.addView(btnClean);

        Button btnBackfillMissed = new Button(this);
        btnBackfillMissed.setText(getString(R.string.btn_backfill_missed));
        btnBackfillMissed.setOnClickListener(v -> {
            if (hasCallLogPermissions()) {
                int n = MissedCallsBackfill.markSinceYesterday(this);
                if (n > 0) {
                    SnapEventStore.append(this, "✓ تمت إضافة " + n + " مكالمة فائتة من أمس للفقاعة");
                } else {
                    SnapEventStore.append(this, "لا توجد مكالمات فائتة جديدة من أمس");
                }
                MissedCallOverlayController.refresh(this);
                refreshUi();
            } else {
                requestNeededPermissions();
            }
        });
        root.addView(btnBackfillMissed);

        Button btnOverlay = new Button(this);
        btnOverlay.setText(getString(R.string.btn_overlay));
        btnOverlay.setOnClickListener(v -> requestOverlayPermission());
        root.addView(btnOverlay);

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
                LinearLayout.LayoutParams.MATCH_PARENT, (int) (140 * getResources().getDisplayMetrics().density));
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

    private LinearLayout buildSetupBox(int pad) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        int inner = pad * 2 / 3;
        box.setPadding(inner, inner, inner, inner);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#E8F5E9"));
        bg.setCornerRadius(pad / 2f);
        box.setBackground(bg);

        TextView howTitle = new TextView(this);
        howTitle.setText(getString(R.string.call_from_title));
        howTitle.setTextSize(17f);
        howTitle.setTypeface(null, Typeface.BOLD);
        howTitle.setTextColor(Color.parseColor("#1B5E20"));
        box.addView(howTitle);

        TextView how = new TextView(this);
        how.setText(getString(R.string.call_from_steps));
        how.setTextSize(14f);
        how.setTextColor(Color.parseColor("#2E7D32"));
        how.setPadding(0, pad / 3, 0, 0);
        box.addView(how);
        return box;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (hasCallLogPermissions()) {
            CallLogCleaner.cleanLegacy(this);
            CallLogFixer.fixSnapEntries(this);
        }
        MissedCallOverlayController.refresh(this);
        refreshUi();
    }

    private void refreshUi() {
        StringBuilder status = new StringBuilder();
        status.append(isListenerEnabled() ? getString(R.string.status_ok) : getString(R.string.status_no));
        status.append('\n');
        status.append(hasCallLogPermissions() ? getString(R.string.perms_ok) : getString(R.string.perms_no));
        status.append('\n');
        status.append(hasContactsPermission() ? getString(R.string.contacts_ok) : getString(R.string.contacts_no));
        status.append('\n');
        status.append(SnapRoleHelper.isCallRedirectionHeld(this)
                ? getString(R.string.redirect_ok) : getString(R.string.redirect_no));
        status.append('\n');
        status.append(hasOverlayPermission()
                ? getString(R.string.overlay_ok) : getString(R.string.overlay_no));
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
        requestContactsPermission();
    }

    private void requestContactsPermission() {
        List<String> needed = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.READ_CONTACTS);
        }
        if (checkSelfPermission(Manifest.permission.WRITE_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.WRITE_CONTACTS);
        }
        if (!needed.isEmpty()) {
            requestPermissions(needed.toArray(new String[0]), REQ_PERMS);
        }
    }

    private boolean hasCallLogPermissions() {
        return checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.WRITE_CALL_LOG) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasContactsPermission() {
        return checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.WRITE_CONTACTS) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasOverlayPermission() {
        return Settings.canDrawOverlays(this);
    }

    private void requestOverlayPermission() {
        if (hasOverlayPermission()) {
            MissedCallOverlayController.refresh(this);
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } catch (Exception e) {
            SnapEventStore.append(this, "تعذر فتح إعدادات الفقاعة العائمة");
        }
    }

    private boolean isListenerEnabled() {
        String enabled = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        if (TextUtils.isEmpty(enabled)) return false;
        ComponentName cn = new ComponentName(this, SnapCallLogSyncService.class);
        return enabled.contains(cn.flattenToString());
    }
}
