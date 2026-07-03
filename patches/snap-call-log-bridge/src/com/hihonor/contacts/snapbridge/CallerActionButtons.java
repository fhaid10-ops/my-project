package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.content.Context;
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

    public static View build(Context context, Listener listener) {
        int pad = CallUiHelper.dp(context, 8);

        LinearLayout wrap = new LinearLayout(context);
        wrap.setOrientation(LinearLayout.VERTICAL);
        wrap.setPadding(0, pad, 0, 0);

        LinearLayout row1 = new LinearLayout(context);
        row1.setOrientation(LinearLayout.HORIZONTAL);

        TextView call = CallUiHelper.makeActionButton(context, "معاودة", CallUiHelper.ACTION_CALL);
        call.setLayoutParams(CallUiHelper.actionParams(context));
        call.setOnClickListener(v -> listener.onCallback());
        row1.addView(call);

        TextView wa = CallUiHelper.makeActionButton(context, "واتساب", CallUiHelper.ACTION_WA);
        wa.setLayoutParams(CallUiHelper.actionParams(context));
        wa.setOnClickListener(v -> listener.onWhatsApp());
        row1.addView(wa);

        LinearLayout row2 = new LinearLayout(context);
        row2.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams row2Lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        row2Lp.topMargin = CallUiHelper.dp(context, 6);
        row2.setLayoutParams(row2Lp);

        TextView waBiz = CallUiHelper.makeActionButton(context, "واتساب بزنس", CallUiHelper.ACTION_WA_BUSINESS);
        waBiz.setLayoutParams(CallUiHelper.actionParams(context));
        waBiz.setOnClickListener(v -> listener.onWhatsAppBusiness());
        row2.addView(waBiz);

        TextView del = CallUiHelper.makeActionButton(context, "حذف", CallUiHelper.ACTION_DEL);
        del.setLayoutParams(CallUiHelper.actionParams(context));
        del.setOnClickListener(v -> listener.onDelete());
        row2.addView(del);

        wrap.addView(row1);
        wrap.addView(row2);
        return wrap;
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
