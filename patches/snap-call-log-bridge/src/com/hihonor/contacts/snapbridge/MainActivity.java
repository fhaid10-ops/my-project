package com.hihonor.contacts.snapbridge;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int REQ_PERMS = 1001;
    private LinearLayout statusCard;
    private TextView logView;
    private TextView btnSnoozeNotify;
    private TextView btnWakeBubble;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(DashboardUiHelper.BG);
            getWindow().setNavigationBarColor(DashboardUiHelper.BG);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
        SnapPhoneAccount.register(this);
        requestNeededPermissions();

        LinearLayout root = DashboardUiHelper.verticalRoot(this);

        TextView header = new TextView(this);
        String version;
        try {
            version = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception e) {
            version = CallerActionButtons.APP_VERSION;
        }
        header.setText("لوحة التحكم  ·  v" + version);
        header.setTextColor(DashboardUiHelper.TEXT_PRIMARY);
        header.setTextSize(22f);
        header.setTypeface(null, Typeface.BOLD);
        header.setPadding(0, 0, 0, DashboardUiHelper.dp(this, 4));
        root.addView(header);

        TextView subtitle = new TextView(this);
        subtitle.setText("فقاعة المكالمات الفائتة — هوية المتصل وسجل ملوّن");
        subtitle.setTextColor(DashboardUiHelper.TEXT_SECONDARY);
        subtitle.setTextSize(13f);
        subtitle.setPadding(0, 0, 0, DashboardUiHelper.dp(this, 14));
        root.addView(subtitle);

        LinearLayout statusRow = DashboardUiHelper.statusRow(this);
        boolean serviceOk = isServiceReady();
        statusRow.addView(DashboardUiHelper.statusTile(this, "✓",
                "حالة الخدمة",
                serviceOk ? "تعمل" : "تحتاج إعداد",
                serviceOk ? DashboardUiHelper.OK : DashboardUiHelper.TEXT_SECONDARY));
        statusRow.addView(DashboardUiHelper.spacer(this, 10));
        int missed = MissedCallQueueStore.size(this);
        statusRow.addView(DashboardUiHelper.statusTile(this, "📞",
                "فائت في الفقاعة",
                String.valueOf(missed),
                DashboardUiHelper.TEXT_PRIMARY));
        root.addView(statusRow);

        LinearLayout setupCard = DashboardUiHelper.card(this, DashboardUiHelper.CARD_STROKE);
        TextView setupTitle = new TextView(this);
        setupTitle.setText(getString(R.string.call_from_title));
        setupTitle.setTextColor(DashboardUiHelper.TEXT_PRIMARY);
        setupTitle.setTextSize(16f);
        setupTitle.setTypeface(null, Typeface.BOLD);
        setupCard.addView(setupTitle);
        TextView setupSteps = new TextView(this);
        setupSteps.setText(getString(R.string.call_from_steps));
        setupSteps.setTextColor(DashboardUiHelper.TEXT_SECONDARY);
        setupSteps.setTextSize(13f);
        setupSteps.setPadding(0, DashboardUiHelper.dp(this, 8), 0, 0);
        setupCard.addView(setupSteps);
        LinearLayout.LayoutParams setupLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        setupLp.bottomMargin = DashboardUiHelper.dp(this, 4);
        setupCard.setLayoutParams(setupLp);
        root.addView(setupCard);

        root.addView(DashboardUiHelper.sectionTitle(this, getString(R.string.setup_title)));

        statusCard = DashboardUiHelper.card(this, DashboardUiHelper.CARD_STROKE);
        root.addView(statusCard);

        root.addView(DashboardUiHelper.sectionTitle(this, "الإجراءات"));

        root.addView(action(getString(R.string.btn_redirect), null, DashboardUiHelper.CARD_STROKE,
                v -> SnapRoleHelper.requestCallRedirection(this)));
        root.addView(action(getString(R.string.btn_enable), "Snapchat + المكالمات", DashboardUiHelper.CARD_STROKE,
                v -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))));
        root.addView(action(getString(R.string.btn_perms), "قراءة وكتابة السجل", DashboardUiHelper.CARD_STROKE,
                v -> requestNeededPermissions()));
        root.addView(action(getString(R.string.btn_contacts), "لعرض الأسماء", DashboardUiHelper.CARD_STROKE,
                v -> requestContactsPermission()));
        root.addView(action(getString(R.string.btn_clean), null, DashboardUiHelper.CARD_STROKE,
                v -> {
                    if (hasCallLogPermissions()) {
                        CallLogCleaner.cleanLegacy(this);
                        CallLogFixer.fixSnapEntries(this);
                        refreshUi();
                    } else {
                        requestNeededPermissions();
                    }
                }));
        root.addView(action(getString(R.string.btn_backfill_missed), "اختياري", DashboardUiHelper.CARD_STROKE,
                v -> {
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
                }));
        root.addView(action(getString(R.string.btn_overlay), "فوق التطبيقات", DashboardUiHelper.CARD_STROKE,
                v -> requestOverlayPermission()));

        btnSnoozeNotify = action(getString(R.string.btn_snooze_notify_off), null,
                DashboardUiHelper.CARD_STROKE, v -> {
                    boolean next = !BubbleSnoozeStore.isNotifyBeforeEndEnabled(this);
                    BubbleSnoozeStore.setNotifyBeforeEndEnabled(this, next);
                    long ends = BubbleSnoozeStore.snoozeEndsAt(this);
                    if (next && ends > System.currentTimeMillis()) {
                        BubbleSnoozeStore.scheduleWake(this, ends);
                    }
                    refreshUi();
                });
        btnSnoozeNotify.setTag("snooze_notify_btn");
        root.addView(btnSnoozeNotify);

        btnWakeBubble = action(getString(R.string.btn_wake_bubble), null, DashboardUiHelper.CARD_STROKE,
                v -> {
                    BubbleSnoozeStore.wakeNow(this);
                    refreshUi();
                });
        btnWakeBubble.setTag("wake_bubble_btn");
        root.addView(btnWakeBubble);

        root.addView(DashboardUiHelper.sectionTitle(this, getString(R.string.log_title)));

        LinearLayout logCard = DashboardUiHelper.card(this, DashboardUiHelper.CARD_STROKE);
        logView = new TextView(this);
        logView.setTextSize(12f);
        logView.setTextColor(DashboardUiHelper.TEXT_SECONDARY);
        logView.setTextIsSelectable(true);
        logCard.addView(logView);
        LinearLayout.LayoutParams logLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                DashboardUiHelper.dp(this, 140));
        logCard.setLayoutParams(logLp);
        root.addView(logCard);

        TextView btnRefresh = DashboardUiHelper.actionButton(this,
                getString(R.string.btn_refresh), "تحديث الفقاعة والأسماء", DashboardUiHelper.ACCENT);
        btnRefresh.setTextColor(android.graphics.Color.WHITE);
        btnRefresh.setBackground(CallUiHelper.roundedCard(
                CallUiHelper.ACTION_CALL, CallUiHelper.ACTION_CALL, this, 0));
        btnRefresh.setOnClickListener(v -> {
            SnapListenerHelper.requestScan(this);
            if (hasCallLogPermissions()) {
                int rebuilt = MissedCallQueueStore.rebuildAll(this);
                int restored = SnapCallLogNameGuard.restoreAll(this);
                MissedCallAutoWatcher.scanNow(this);
                SnapEventStore.append(this, "✓ تحديث الأسماء: " + rebuilt
                        + (restored > 0 ? " · استُعيد " + restored + " اسم سناب" : ""));
            }
            if (BubbleSnoozeStore.isSnoozed(this)) {
                BubbleSnoozeStore.wakeNow(this);
            } else {
                MissedCallOverlayController.refresh(this);
            }
            refreshUi();
        });
        root.addView(btnRefresh);

        ScrollView outer = new ScrollView(this);
        outer.setBackgroundColor(DashboardUiHelper.BG);
        outer.addView(root);
        setContentView(outer);
    }

    private TextView action(String title, String subtitle, int stroke,
                            View.OnClickListener listener) {
        TextView btn = DashboardUiHelper.actionButton(this, title, subtitle, stroke);
        btn.setOnClickListener(listener);
        return btn;
    }

    @Override
    protected void onResume() {
        super.onResume();
        SnapListenerHelper.requestRebind(this);
        SnapListenerHelper.requestScan(this);
        if (hasCallLogPermissions()) {
            CallLogCleaner.cleanLegacy(this);
            CallLogFixer.fixSnapEntries(this);
            MissedCallAutoWatcher.ensureStarted(this);
        }
        MissedCallOverlayController.refresh(this);
        refreshUi();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_PERMS && hasCallLogPermissions()) {
            MissedCallAutoWatcher.ensureStarted(this);
            MissedCallOverlayController.refresh(this);
        }
        refreshUi();
    }

    private void refreshUi() {
        statusCard.removeAllViews();
        statusCard.addView(DashboardUiHelper.checklistItem(this, "الوصول للإشعارات", isListenerEnabled()));
        statusCard.addView(DashboardUiHelper.checklistItem(this, "صلاحية سجل المكالمات", hasCallLogPermissions()));
        statusCard.addView(DashboardUiHelper.checklistItem(this, "صلاحية جهات الاتصال", hasContactsPermission()));
        statusCard.addView(DashboardUiHelper.checklistItem(this, "الاتصال من السجل", SnapRoleHelper.isCallRedirectionHeld(this)));
        statusCard.addView(DashboardUiHelper.checklistItem(this, "الفقاعة العائمة", hasOverlayPermission()));
        statusCard.addView(DashboardUiHelper.checklistItem(this, "إشعار قبل عودة الفقاعة",
                BubbleSnoozeStore.isNotifyBeforeEndEnabled(this)));

        String diag = SnapDiagStore.statusLine(this);
        if (diag != null && !diag.isEmpty()) {
            statusCard.addView(DashboardUiHelper.mutedNote(this, diag));
        }
        String callerDiag = CallerIdDiagStore.statusLine(this);
        if (callerDiag != null && !callerDiag.isEmpty()) {
            statusCard.addView(DashboardUiHelper.mutedNote(this, callerDiag));
        }
        if (BubbleSnoozeStore.isSnoozed(this)) {
            long ends = BubbleSnoozeStore.snoozeEndsAt(this);
            String time = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(ends));
            statusCard.addView(DashboardUiHelper.mutedNote(this, getString(R.string.snooze_hidden, time)));
        } else {
            statusCard.addView(DashboardUiHelper.mutedNote(this, getString(R.string.snooze_visible)));
        }

        if (logView != null) {
            logView.setText(SnapEventStore.read(this));
        }
        updateSnoozeNotifyButton();
        updateWakeBubbleButton();
    }

    private boolean isServiceReady() {
        return isListenerEnabled() && hasCallLogPermissions() && hasOverlayPermission();
    }

    private void updateWakeBubbleButton() {
        if (btnWakeBubble == null) return;
        boolean snoozed = BubbleSnoozeStore.isSnoozed(this);
        btnWakeBubble.setVisibility(snoozed ? View.VISIBLE : View.GONE);
        if (snoozed) {
            long ends = BubbleSnoozeStore.snoozeEndsAt(this);
            String time = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(ends));
            btnWakeBubble.setText(getString(R.string.btn_wake_bubble) + "\n(حتى " + time + ")");
        } else {
            btnWakeBubble.setText(getString(R.string.btn_wake_bubble));
        }
    }

    private void updateSnoozeNotifyButton() {
        if (btnSnoozeNotify == null) return;
        btnSnoozeNotify.setText(BubbleSnoozeStore.isNotifyBeforeEndEnabled(this)
                ? getString(R.string.btn_snooze_notify_on)
                : getString(R.string.btn_snooze_notify_off));
    }

    private void requestNeededPermissions() {
        List<String> needed = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.READ_CALL_LOG);
        }
        if (checkSelfPermission(Manifest.permission.WRITE_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.WRITE_CALL_LOG);
        }
        if (checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.READ_PHONE_STATE);
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
