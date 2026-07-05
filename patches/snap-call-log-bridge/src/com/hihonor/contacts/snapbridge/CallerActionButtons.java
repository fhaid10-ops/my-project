package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public final class CallerActionButtons {
    public static final String APP_VERSION = "2.44";

    public interface Listener {
        void onCallback();

        void onWhatsApp();

        void onWhatsAppBusiness();

        void onDelete();
    }

    public interface BubbleListener {
        void onContacts();

        void onCallback();

        void onWhatsApp();

        void onWhatsAppBusiness();
    }

    private CallerActionButtons() {}

    public static View buildBubbleIconRow(Context context, BubbleListener listener) {
        LinearLayout row = new LinearLayout(context);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        int pad = CallUiHelper.dp(context, 4);
        row.setPadding(pad, pad, pad, pad);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(CallUiHelper.dp(context, 18));
        bg.setColor(CallUiHelper.CARD_BG);
        bg.setStroke(CallUiHelper.dp(context, 1), CallUiHelper.BORDER_MEDIUM);
        row.setBackground(bg);

        row.addView(bubbleIcon(context, "👤", listener::onContacts));
        row.addView(bubbleIcon(context, "📞", listener::onCallback));
        row.addView(bubbleIcon(context, "💬", listener::onWhatsApp));
        row.addView(bubbleIcon(context, "💼", listener::onWhatsAppBusiness));
        return row;
    }

    private static TextView bubbleIcon(Context context, String icon, Runnable action) {
        TextView btn = CallUiHelper.makeBubbleIconButton(context, icon, CallUiHelper.ACTION_CONTACTS);
        btn.setLayoutParams(CallUiHelper.bubbleIconParams(context));
        btn.setOnClickListener(v -> action.run());
        return btn;
    }

    public static void performContacts(Context context, MissedCallQueueStore.Item item) {
        if (item == null) return;
        MissedCallActionHandler.openContacts(context, item);
    }

    public static void performCallbackItem(Context context, MissedCallQueueStore.Item item) {
        if (item == null) return;
        if (MissedCallActionHandler.callback(context, item)) {
            MissedCallQueueStore.remove(context, item.id);
            MissedCallOverlayController.refresh(context);
        }
    }

    public static void performWhatsAppItem(Context context, MissedCallQueueStore.Item item) {
        if (item == null) return;
        if (MissedCallActionHandler.openWhatsApp(context, item)) {
            MissedCallQueueStore.remove(context, item.id);
            MissedCallOverlayController.refresh(context);
        }
    }

    public static void performWhatsAppBusinessItem(Context context, MissedCallQueueStore.Item item) {
        if (item == null) return;
        if (MissedCallActionHandler.openWhatsAppBusiness(context, item)) {
            MissedCallQueueStore.remove(context, item.id);
            MissedCallOverlayController.refresh(context);
        }
    }

    public static View buildBottomBar(Context context, Listener listener) {
        LinearLayout wrap = new LinearLayout(context);
        wrap.setOrientation(LinearLayout.VERTICAL);
        wrap.setBackgroundColor(CallUiHelper.BG_DARK);
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

    public static void performCallback(Context context, CallerGroupHelper.CallerGroup group) {
        if (group == null) return;
        MissedCallQueueStore.Item item = group.representative();
        if (item != null && MissedCallActionHandler.callback(context, item)) {
            removeGroup(context, group);
        }
    }

    public static void performWhatsApp(Context context, CallerGroupHelper.CallerGroup group) {
        if (group == null) return;
        MissedCallQueueStore.Item item = group.representative();
        if (item != null && MissedCallActionHandler.openWhatsApp(context, item)) {
            removeGroup(context, group);
        }
    }

    public static void performWhatsAppBusiness(Context context, CallerGroupHelper.CallerGroup group) {
        if (group == null) return;
        MissedCallQueueStore.Item item = group.representative();
        if (item != null && MissedCallActionHandler.openWhatsAppBusiness(context, item)) {
            removeGroup(context, group);
        }
    }

    public static boolean performDelete(Context context, CallerGroupHelper.CallerGroup group) {
        if (group == null) return false;
        int removed = CallerGroupHelper.removeByKey(context, group.key);
        MissedCallOverlayController.refresh(context);
        if (removed > 0) {
            Toast.makeText(context, "تم الحذف", Toast.LENGTH_SHORT).show();
            return true;
        }
        Toast.makeText(context, "لم يُحذف — حاول مرة أخرى", Toast.LENGTH_SHORT).show();
        return false;
    }

    private static void removeGroup(Context context, CallerGroupHelper.CallerGroup group) {
        CallerGroupHelper.removeByKey(context, group.key);
        MissedCallOverlayController.refresh(context);
    }
}
