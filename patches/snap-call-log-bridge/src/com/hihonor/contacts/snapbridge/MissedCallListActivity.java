package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class MissedCallListActivity extends Activity {
    private static final int PRESET_NONE = -1;
    private static final int PRESET_TODAY = 0;
    private static final int PRESET_YESTERDAY = 1;
    private static final int PRESET_BEFORE_YESTERDAY = 2;
    private static final int PRESET_WEEK = 3;
    private static final int PRESET_CUSTOM = 4;

    private LinearLayout listContainer;
    private LinearLayout filterChipsRow;
    private TextView countBadge;
    private TextView filterSummary;
    private TextView deleteBtn;
    private volatile boolean rendering;

    private int selectedPreset = PRESET_NONE;
    private long filterFrom;
    private long filterTo;
    private String filterLabel = "اختر تاريخاً للحذف";
    private TextView[] presetChips;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int pad = CallUiHelper.dp(this, 16);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(CallUiHelper.BG_DARK);
        root.setPadding(pad, pad, pad, pad);

        root.addView(buildHeader());

        LinearLayout filterCard = new LinearLayout(this);
        filterCard.setOrientation(LinearLayout.VERTICAL);
        filterCard.setPadding(pad, pad, pad, pad);
        filterCard.setBackground(CallUiHelper.roundedCard(
                CallUiHelper.CARD_BG, CallUiHelper.BORDER_LIGHT, this, 1));
        LinearLayout.LayoutParams filterLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        filterLp.bottomMargin = pad;
        filterCard.setLayoutParams(filterLp);

        TextView filterTitle = new TextView(this);
        filterTitle.setText("حذف حسب التاريخ من الفقاعة");
        filterTitle.setTextColor(CallUiHelper.TEXT_PRIMARY);
        filterTitle.setTextSize(15f);
        filterTitle.setTypeface(null, Typeface.BOLD);
        filterCard.addView(filterTitle);

        filterChipsRow = new LinearLayout(this);
        filterChipsRow.setOrientation(LinearLayout.HORIZONTAL);
        filterChipsRow.setPadding(0, CallUiHelper.dp(this, 10), 0, 0);
        filterCard.addView(filterChipsRow);
        buildFilterChips();

        filterSummary = new TextView(this);
        filterSummary.setText(filterLabel);
        filterSummary.setTextColor(CallUiHelper.TEXT_SECONDARY);
        filterSummary.setTextSize(12f);
        filterSummary.setPadding(0, CallUiHelper.dp(this, 8), 0, 0);
        filterCard.addView(filterSummary);

        deleteBtn = CallUiHelper.makeActionButton(this, "حذف المكالمات المحددة", CallUiHelper.MISSED_ACCENT);
        LinearLayout.LayoutParams delLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        delLp.topMargin = CallUiHelper.dp(this, 10);
        deleteBtn.setLayoutParams(delLp);
        deleteBtn.setEnabled(false);
        deleteBtn.setAlpha(0.45f);
        deleteBtn.setOnClickListener(v -> confirmDeleteByDate());
        filterCard.addView(deleteBtn);

        root.addView(filterCard);

        ScrollView scroll = new ScrollView(this);
        scroll.setPadding(0, 0, 0, pad);
        listContainer = new LinearLayout(this);
        listContainer.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(listContainer);
        root.addView(scroll, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        TextView close = CallUiHelper.makeCloseButton(this, "إغلاق");
        close.setOnClickListener(v -> finish());
        root.addView(close);

        setContentView(root);
        render();
    }

    private LinearLayout buildHeader() {
        int pad = CallUiHelper.dp(this, 16);
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams headerLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        headerLp.bottomMargin = pad;
        header.setLayoutParams(headerLp);

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
        sub.setText("اضغط على الاسم لاختيار إجراء");
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
        countBadge.setBackground(CallUiHelper.roundedCard(
                CallUiHelper.BUBBLE_RED, CallUiHelper.BORDER_LIGHT, this, 1));
        header.addView(countBadge);
        return header;
    }

    private void buildFilterChips() {
        filterChipsRow.removeAllViews();
        String[] labels = {"اليوم", "أمس", "قبل أمس", "7 أيام", "تاريخ"};
        int[] presets = {PRESET_TODAY, PRESET_YESTERDAY, PRESET_BEFORE_YESTERDAY, PRESET_WEEK, PRESET_CUSTOM};
        presetChips = new TextView[labels.length];
        int gap = CallUiHelper.dp(this, 6);
        for (int i = 0; i < labels.length; i++) {
            final int preset = presets[i];
            TextView chip = CallUiHelper.makeFilterChip(this, labels[i], preset == selectedPreset);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            if (i > 0) lp.setMarginStart(gap);
            chip.setLayoutParams(lp);
            chip.setOnClickListener(v -> onPresetSelected(preset));
            presetChips[i] = chip;
            filterChipsRow.addView(chip);
        }
    }

    private void onPresetSelected(int preset) {
        if (preset == PRESET_CUSTOM) {
            openDatePicker();
            return;
        }
        selectedPreset = preset;
        switch (preset) {
            case PRESET_TODAY:
                filterFrom = CallUiHelper.startOfToday();
                filterTo = CallUiHelper.endOfToday();
                filterLabel = "اليوم — " + CallUiHelper.formatDateShort(filterFrom);
                break;
            case PRESET_YESTERDAY:
                filterFrom = CallUiHelper.startOfDaysAgo(1);
                filterTo = CallUiHelper.endOfDaysAgo(1);
                filterLabel = "أمس — " + CallUiHelper.formatDateShort(filterFrom);
                break;
            case PRESET_BEFORE_YESTERDAY:
                filterFrom = CallUiHelper.startOfDaysAgo(2);
                filterTo = CallUiHelper.endOfDaysAgo(2);
                filterLabel = "قبل أمس — " + CallUiHelper.formatDateShort(filterFrom);
                break;
            case PRESET_WEEK:
                filterFrom = CallUiHelper.startOfDaysAgo(6);
                filterTo = CallUiHelper.endOfToday();
                filterLabel = "آخر 7 أيام";
                break;
            default:
                selectedPreset = PRESET_NONE;
                filterLabel = "اختر تاريخاً للحذف";
                break;
        }
        refreshFilterUi();
        render();
    }

    private void openDatePicker() {
        Calendar now = Calendar.getInstance();
        new DatePickerDialog(this, (view, year, month, day) -> {
            Calendar c = Calendar.getInstance();
            c.set(year, month, day, 0, 0, 0);
            c.set(Calendar.MILLISECOND, 0);
            filterFrom = CallUiHelper.startOfDay(c.getTimeInMillis());
            filterTo = CallUiHelper.endOfDay(c.getTimeInMillis());
            selectedPreset = PRESET_CUSTOM;
            filterLabel = "تاريخ محدد — " + CallUiHelper.formatDateShort(filterFrom);
            refreshFilterUi();
            render();
        }, now.get(Calendar.YEAR), now.get(Calendar.MONTH), now.get(Calendar.DAY_OF_MONTH)).show();
    }

    private void refreshFilterUi() {
        buildFilterChips();
        int count = selectedPreset == PRESET_NONE
                ? 0 : MissedCallCleanupHelper.countInRange(this, filterFrom, filterTo);
        if (selectedPreset == PRESET_NONE) {
            filterSummary.setText("اختر تاريخاً لعرض وحذف مكالمات الفقاعة");
            deleteBtn.setEnabled(false);
            deleteBtn.setAlpha(0.45f);
            deleteBtn.setText("حذف المكالمات المحددة");
        } else {
            filterSummary.setText(filterLabel + " · " + count + " مكالمة في الفقاعة");
            deleteBtn.setEnabled(count > 0);
            deleteBtn.setAlpha(count > 0 ? 1f : 0.45f);
            deleteBtn.setText(count > 0
                    ? ("حذف " + count + " مكالمة من الفقاعة")
                    : "لا توجد مكالمات في هذا التاريخ");
        }
    }

    private void confirmDeleteByDate() {
        if (selectedPreset == PRESET_NONE) return;
        int count = MissedCallCleanupHelper.countInRange(this, filterFrom, filterTo);
        if (count <= 0) {
            Toast.makeText(this, "لا توجد مكالمات في هذا التاريخ", Toast.LENGTH_SHORT).show();
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle("تأكيد الحذف")
                .setMessage("حذف " + count + " مكالمة من الفقاعة؟\n" + filterLabel)
                .setPositiveButton("حذف", (d, w) -> {
                    int removed = MissedCallCleanupHelper.removeInRange(this, filterFrom, filterTo);
                    Toast.makeText(this,
                            removed > 0 ? ("تم حذف " + removed + " مكالمة") : "لم يُحذف شيء",
                            Toast.LENGTH_SHORT).show();
                    refreshFilterUi();
                    render();
                })
                .setNegativeButton("إلغاء", null)
                .show();
    }

    @Override
    protected void onResume() {
        super.onResume();
        refreshFilterUi();
        render();
    }

    private void render() {
        if (rendering) return;
        rendering = true;
        final long from = filterFrom;
        final long to = filterTo;
        final boolean filterActive = selectedPreset != PRESET_NONE;
        new Thread(() -> {
            List<CallerGroupHelper.CallerGroup> groups = CallerGroupCache.groupAll(
                    MissedCallListActivity.this);
            if (filterActive) {
                ArrayList<CallerGroupHelper.CallerGroup> filtered = new ArrayList<>();
                for (CallerGroupHelper.CallerGroup group : groups) {
                    if (MissedCallCleanupHelper.groupMatchesRange(group, from, to)) {
                        filtered.add(group);
                    }
                }
                groups = filtered;
            }
            int totalMissed = MissedCallQueueStore.size(MissedCallListActivity.this);
            List<CallerGroupHelper.CallerGroup> finalGroups = groups;
            runOnUiThread(() -> {
                rendering = false;
                renderUi(finalGroups, totalMissed, filterActive);
            });
        }).start();
    }

    private void renderUi(List<CallerGroupHelper.CallerGroup> groups, int totalMissed,
                          boolean filterActive) {
        listContainer.removeAllViews();
        updateCountBadge(groups.isEmpty() ? 0 : groups.size(), totalMissed);

        if (groups.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText(filterActive
                    ? "لا توجد مكالمات في التاريخ المحدد"
                    : "لا توجد مكالمات فائتة 🎉");
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

    private View buildCard(final CallerGroupHelper.CallerGroup group) {
        int accent = CallUiHelper.accentForItem(group.isSnap);
        int pad = CallUiHelper.dp(this, 14);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setPadding(pad, pad, pad, pad);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setBackground(CallUiHelper.roundedCard(CallUiHelper.CARD_BG, accent, this, 1));
        card.setOnClickListener(v -> {
            CallerGroupCache.setPendingDetail(group);
            MissedCallDetailActivity.open(MissedCallListActivity.this, group);
        });

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        info.setLayoutParams(new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        TextView nameView = new TextView(this);
        CallUiHelper.bindCallerLabel(nameView, group.displayName);
        nameView.setTextColor(CallUiHelper.TEXT_PRIMARY);
        nameView.setTextSize(17f);
        nameView.setTypeface(null, Typeface.BOLD);
        info.addView(nameView);

        TextView subtitle = new TextView(this);
        String missedLabel = group.missedCount() == 1
                ? "مكالمة فائتة واحدة"
                : (group.missedCount() + " مكالمات فائتة");
        subtitle.setText(missedLabel + " · اضغط للخيارات");
        subtitle.setTextColor(CallUiHelper.TEXT_SECONDARY);
        subtitle.setTextSize(13f);
        subtitle.setPadding(0, CallUiHelper.dp(this, 2), 0, 0);
        info.addView(subtitle);

        LinearLayout meta = new LinearLayout(this);
        meta.setOrientation(LinearLayout.HORIZONTAL);
        meta.setPadding(0, CallUiHelper.dp(this, 6), 0, 0);
        meta.setGravity(Gravity.CENTER_VERTICAL);

        TextView sourceBadge = CallUiHelper.makeBadge(
                this, group.sourceLabel, CallUiHelper.CHIP_SNAP_BG,
                CallUiHelper.TEXT_PRIMARY, CallUiHelper.BORDER_LIGHT, 1);
        LinearLayout.LayoutParams badgeLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        badgeLp.setMarginEnd(CallUiHelper.dp(this, 8));
        sourceBadge.setLayoutParams(badgeLp);
        meta.addView(sourceBadge);

        if (group.simLabel != null && !group.simLabel.isEmpty()) {
            TextView simBadge = CallUiHelper.makeBadge(
                    this, group.simLabel, CallUiHelper.CHIP_SIM_BG, CallUiHelper.CHIP_SIM_FG,
                    CallUiHelper.BORDER_LIGHT, 1);
            LinearLayout.LayoutParams simLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            simLp.setMarginEnd(CallUiHelper.dp(this, 8));
            simBadge.setLayoutParams(simLp);
            meta.addView(simBadge);
        }

        TextView timeView = new TextView(this);
        timeView.setText(CallUiHelper.formatTimeAgo(this, group.latestTimestamp));
        timeView.setTextColor(CallUiHelper.TEXT_SECONDARY);
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
