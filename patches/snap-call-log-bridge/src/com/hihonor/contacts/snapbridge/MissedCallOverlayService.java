package com.hihonor.contacts.snapbridge;

import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

public class MissedCallOverlayService extends Service {
    public static final String ACTION_REFRESH = "com.hihonor.contacts.snapbridge.ACTION_REFRESH_OVERLAY";

    private WindowManager wm;
    private View bubbleView;
    private TextView countText;
    private WindowManager.LayoutParams params;
    private float touchDownX;
    private float touchDownY;
    private int startX;
    private int startY;

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
        int count = MissedCallQueueStore.size(this);
        if (count <= 0) {
            removeBubble();
            stopSelf();
            return START_NOT_STICKY;
        }
        ensureBubble();
        countText.setText(String.valueOf(count));
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
        countText = new TextView(this);
        countText.setTextColor(Color.WHITE);
        countText.setTextSize(16f);
        countText.setGravity(Gravity.CENTER);
        int size = dp(62);
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(Color.parseColor("#E53935"));
        bg.setStroke(dp(2), Color.WHITE);
        countText.setBackground(bg);
        countText.setLayoutParams(new WindowManager.LayoutParams(size, size));

        params = new WindowManager.LayoutParams(
                size,
                size,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = dp(18);
        params.y = dp(180);

        countText.setOnTouchListener(this::handleTouch);
        countText.setOnClickListener(v -> {
            Intent i = new Intent(this, MissedCallListActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        });

        bubbleView = countText;
        wm.addView(bubbleView, params);
    }

    private boolean handleTouch(View v, MotionEvent ev) {
        if (params == null) return false;
        switch (ev.getAction()) {
            case MotionEvent.ACTION_DOWN:
                touchDownX = ev.getRawX();
                touchDownY = ev.getRawY();
                startX = params.x;
                startY = params.y;
                return false;
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
    }

    private int dp(int v) {
        return (int) (v * getResources().getDisplayMetrics().density);
    }
}

