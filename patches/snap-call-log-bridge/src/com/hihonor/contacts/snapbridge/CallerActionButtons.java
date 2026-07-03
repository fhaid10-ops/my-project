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
    public interface Listener {
        void onCallback();

        void onWhatsApp();

        void onWhatsAppBusiness();

        void onDelete();
    }

    private CallerActionButtons() {}

    /** قائمة خيارات واضحة داخل شاشة المتصل */
    public static View buildMenu(Context context, Listener listener) {
        LinearLayout wrap = new LinearLayout(context);
        wrap.setOrientation(LinearLayout.VERTICAL);

        TextView title = new TextView(context);
        title.setText("اختر إجراء");
        title.setTextColor(CallUiHelper.TEXT_PRIMARY);
        title.setTextSize(16f);
        title.setTypeface(null, Typeface.BOLD);
        title.setPadding(0, 0, 0, CallUiHelper.dp(context, 8));
        wrap.addView(title);

        wrap.addView(menuRow(context, "📞  معاودة اتصال", CallUiHelper.ACTION_CALL,
                listener::onCallback));
        wrap.addView(menuRow(context, "💬  واتساب", CallUiHelper.ACTION_WA,
                listener::onWhatsApp));
        wrap.addView(menuRow(context, "💼  واتساب بزنس", CallUiHelper.ACTION_WA_BUSINESS,
                listener::onWhatsAppBusiness));
        wrap.addView(menuRow(context, "🗑  حذف", CallUiHelper.ACTION_DEL,
                listener::onDelete));

        return wrap;
    }

    private static View menuRow(Context context, String label, int color, Runnable action) {
        TextView row = new TextView(context);
        row.setText(label);
        row.setTextColor(Color.WHITE);
        row.setTextSize(16f);
        row.setTypeface(null, Typeface.BOLD);
        row.setGravity(Gravity.CENTER_VERTICAL);
        int hPad = CallUiHelper.dp(context, 16);
        int vPad = CallUiHelper.dp(context, 14);
        row.setPadding(hPad, vPad, hPad, vPad);
        row.setBackground(CallUiHelper.roundedCard(color, Color.TRANSPARENT, context));
        row.setOnClickListener(v -> action.run());

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = CallUiHelper.dp(context, 8);
        row.setLayoutParams(lp);
        return row;
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
