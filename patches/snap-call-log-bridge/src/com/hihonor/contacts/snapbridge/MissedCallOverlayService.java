package com.hihonor.contacts.snapbridge;

import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.LayerDrawable;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MissedCallOverlayService extends Service {
    public static final String ACTION_REFRESH = "com.hihonor.contacts.snapbridge.ACTION_REFRESH_OVERLAY";
    private static final int LONG_PRESS_MS = 550;

    private WindowManager wm;
    private View bubbleView;
    private TextView countText;
    private TextView hintText;
    private WindowManager.LayoutParams params;
    private float touchDownX;
    private float touchDownY;
    private int startX;
    private int startY;
    private long touchDownTime;

    @Override
    public void onCreate() {
        super.onCreate();
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!Settings.canDrawOverlays(this)) {
            removeBubble();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (BubbleSnoozeStore.isSnoozed(this)) {
            removeBubble();
            stopSelf();
            return START_NOT_STICKY;
        }
        int count = MissedCallQueueStore.size(this);
        if (count <= 0) {
            removeBubble();
            stopSelf();
            return START_NOT_STICKY;
        }
        ensureBubble();
        countText.setText(String.valueOf(count));
        MissedCallQueueStore.Item latest = MissedCallQueueStore.first(this);
        if (latest != null && hintText != null) {
            String name = CallUiHelper.displayCallerLabel(latest.bestName());
            if (name.length() > 12) name = name.substring(0, 11) + "…";
            hintText.setTextDirection(View.TEXT_DIRECTION_LTR);
            hintText.setText(name);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        removeBubble();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void ensureBubble() {
        if (bubbleView != null) return;

        int size = dp(68);
        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setGravity(Gravity.CENTER);

        countText = new TextView(this);
        countText.setTextColor(Color.WHITE);
        countText.setTextSize(20f);
        countText.setTypeface(null, Typeface.BOLD);
        countText.setGravity(Gravity.CENTER);
        countText.setText("0");

        TextView phoneIcon = new TextView(this);
        phoneIcon.setText("📵");
        phoneIcon.setTextSize(14f);
        phoneIcon.setGravity(Gravity.CENTER);
        phoneIcon.setPadding(0, 0, 0, dp(2));

        container.addView(phoneIcon);
        container.addView(countText);

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(CallUiHelper.BUBBLE_RED);
        bg.setStroke(dp(CallUiHelper.BUBBLE_STROKE_DP), Color.WHITE);

        GradientDrawable shadow = new GradientDrawable();
        shadow.setShape(GradientDrawable.OVAL);
        shadow.setColor(Color.parseColor("#66000000"));

        LayerDrawable layered = new LayerDrawable(new android.graphics.drawable.Drawable[] {shadow, bg});
        layered.setLayerInset(0, dp(2), dp(4), dp(2), 0);
        layered.setLayerInset(1, 0, 0, 0, 0);
        container.setBackground(layered);
        container.setPadding(dp(4), dp(6), dp(4), dp(4));

        hintText = new TextView(this);
        hintText.setTextColor(Color.WHITE);
        hintText.setTextSize(10f);
        hintText.setTypeface(null, Typeface.BOLD);
        hintText.setGravity(Gravity.CENTER);
        hintText.setMaxLines(1);
        hintText.setBackground(createHintBackground());
        hintText.setPadding(dp(8), dp(3), dp(8), dp(3));
        LinearLayout.LayoutParams hintLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        hintLp.topMargin = dp(4);
        hintLp.gravity = Gravity.CENTER_HORIZONTAL;
        hintText.setLayoutParams(hintLp);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(container, new LinearLayout.LayoutParams(size, size));
        root.addView(hintText);

        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = dp(18);
        params.y = dp(180);

        root.setOnTouchListener(this::handleTouch);

        bubbleView = root;
        wm.addView(bubbleView, params);
    }

    private GradientDrawable createHintBackground() {
        GradientDrawable d = new GradientDrawable();
        d.setCornerRadius(dp(12));
        d.setColor(Color.parseColor("#E6121212"));
        d.setStroke(dp(2), Color.parseColor("#88FFFFFF"));
        return d;
    }

    private boolean handleTouch(View v, MotionEvent ev) {
        if (params == null) return false;
        switch (ev.getAction()) {
            case MotionEvent.ACTION_DOWN:
                touchDownTime = System.currentTimeMillis();
                touchDownX = ev.getRawX();
                touchDownY = ev.getRawY();
                startX = params.x;
                startY = params.y;
                return true;
            case MotionEvent.ACTION_MOVE:
                int dx = (int) (ev.getRawX() - touchDownX);
                int dy = (int) (ev.getRawY() - touchDownY);
                params.x = startX + dx;
                params.y = startY + dy;
                try {
                    wm.updateViewLayout(bubbleView, params);
                } catch (Exception ignored) {
                }
                return true;
            case MotionEvent.ACTION_UP:
                int tapDx = (int) (ev.getRawX() - touchDownX);
                int tapDy = (int) (ev.getRawY() - touchDownY);
                long elapsed = System.currentTimeMillis() - touchDownTime;
                int slop = dp(14);
                if (Math.abs(tapDx) < slop && Math.abs(tapDy) < slop) {
                    if (elapsed >= LONG_PRESS_MS) {
                        BubbleSnoozeStore.snoozeOneHour(this);
                        removeBubble();
                        stopSelf();
                    } else if (elapsed < 350) {
                        Intent i = new Intent(this, MissedCallListActivity.class);
                        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(i);
                    }
                }
                return true;
            default:
                return false;
        }
    }

    private void removeBubble() {
        if (bubbleView != null && wm != null) {
            try {
                wm.removeView(bubbleView);
            } catch (Exception ignored) {
            }
        }
        bubbleView = null;
        countText = null;
        hintText = null;
    }

    private int dp(int v) {
        return (int) (v * getResources().getDisplayMetrics().density);
    }
}
