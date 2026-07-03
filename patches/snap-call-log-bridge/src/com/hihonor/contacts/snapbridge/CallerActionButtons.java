package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class CallerActionButtons {
    public static final String APP_VERSION = "2.15";

    public interface Listener {
        void onCallback();

        void onWhatsApp();

        void onWhatsAppBusiness();

        void onDelete();
    }

    private CallerActionButtons() {}

    /** شريط أزرار ثابت أسفل الشاشة — 4 خيارات واضحة */
    public static View buildBottomBar(Context context, Listener listener) {
        LinearLayout wrap = new LinearLayout(context);
        wrap.setOrientation(LinearLayout.VERTICAL);
        wrap.setBackgroundColor(Color.parseColor("#1A2332"));
        int pad = CallUiHelper.dp(context, 12);
        wrap.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(context);
        title.setText("اختر إجراء  ·  v" + APP_VERSION);
        title.setTextColor(CallUiHelper.TEXT_SECONDARY);
        title.setTextSize(12f);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 0, 0, CallUiHelper.dp(context, 8));
        wrap.addView(title);

        LinearLayout row1 = new LinearLayout(context);
        row1.setOrientation(LinearLayout.HORIZONTAL);
        row1.addView(gridBtn(context, "معاودة", CallUiHelper.ACTION_CALL, listener::onCallback));
        row1.addView(gridBtn(context, "واتساب", CallUiHelper.ACTION_WA, listener::onWhatsApp));

        LinearLayout row2 = new LinearLayout(context);
        row2.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams row2Lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        row2Lp.topMargin = CallUiHelper.dp(context, 8);
        row2.setLayoutParams(row2Lp);
        row2.addView(gridBtn(context, "واتساب بزنس", CallUiHelper.ACTION_WA_BUSINESS,
                listener::onWhatsAppBusiness));
        row2.addView(gridBtn(context, "حذف", CallUiHelper.ACTION_DEL, listener::onDelete));

        wrap.addView(row1);
        wrap.addView(row2);
        return wrap;
    }

    private static TextView gridBtn(Context context, String label, int color, Runnable action) {
        TextView btn = CallUiHelper.makeActionButton(context, label, color);
        btn.setLayoutParams(CallUiHelper.actionParams(context));
        btn.setTextSize(label.length() > 8 ? 12f : 14f);
        btn.setOnClickListener(v -> action.run());
        return btn;
    }

    public static void performCallback(Activity activity, CallerGroupHelper.CallerGroup group) {
        if (group == null) return;
        MissedCallQueueStore.Item item = group.representative();
        if (item != null && MissedCallActionHandler.callback(activity, item)) {
            CallerGroupHelper.removeByKey(activity, group.key);
            MissedCallOverlayController.refresh(activity);
        }
    }

    public static void performWhatsApp(Activity activity, CallerGroupHelper.CallerGroup group) {
        if (group == null) return;
        MissedCallQueueStore.Item item = group.representative();
        if (item != null && MissedCallActionHandler.openWhatsApp(activity, item)) {
            CallerGroupHelper.removeByKey(activity, group.key);
            MissedCallOverlayController.refresh(activity);
        }
    }

    public static void performWhatsAppBusiness(Activity activity, CallerGroupHelper.CallerGroup group) {
        if (group == null) return;
        MissedCallQueueStore.Item item = group.representative();
        if (item != null && MissedCallActionHandler.openWhatsAppBusiness(activity, item)) {
            CallerGroupHelper.removeByKey(activity, group.key);
            MissedCallOverlayController.refresh(activity);
        }
    }

    public static void performDelete(Activity activity, CallerGroupHelper.CallerGroup group) {
        if (group == null) return;
        CallerGroupHelper.removeByKey(activity, group.key);
        MissedCallOverlayController.refresh(activity);
    }
}
