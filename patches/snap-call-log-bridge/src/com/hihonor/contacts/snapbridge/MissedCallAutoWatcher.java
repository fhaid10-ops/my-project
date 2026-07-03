package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.database.ContentObserver;
import android.os.Handler;
import android.os.Looper;
import android.provider.CallLog;

public final class MissedCallAutoWatcher {
    private static final long SCAN_WINDOW_MS = 30 * 60 * 1000L;
    private static final long DEBOUNCE_MS = 600L;

    private static MissedCallAutoWatcher instance;
    private ContentObserver observer;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable pendingScan;
    private Context appContext;

    private MissedCallAutoWatcher() {}

    public static synchronized void ensureStarted(Context context) {
        if (context == null) return;
        if (!hasCallLogAccess(context)) return;
        if (instance == null) instance = new MissedCallAutoWatcher();
        instance.start(context.getApplicationContext());
    }

    public static synchronized void stop(Context context) {
        if (instance == null) return;
        instance.unregister(context != null ? context.getApplicationContext() : null);
    }

    private void start(Context app) {
        if (observer != null) {
            appContext = app;
            scanNow(app);
            return;
        }
        appContext = app;
        observer = new ContentObserver(handler) {
            @Override
            public void onChange(boolean selfChange) {
                scheduleScan(app);
            }
        };
        try {
            app.getContentResolver().registerContentObserver(
                    CallLog.Calls.CONTENT_URI, true, observer);
            scanNow(app);
        } catch (Exception ignored) {
            observer = null;
        }
    }

    private void unregister(Context app) {
        if (observer != null && app != null) {
            try {
                app.getContentResolver().unregisterContentObserver(observer);
            } catch (Exception ignored) {
            }
        }
        if (pendingScan != null) {
            handler.removeCallbacks(pendingScan);
            pendingScan = null;
        }
        observer = null;
        appContext = null;
        instance = null;
    }

    private void scheduleScan(Context app) {
        if (pendingScan != null) handler.removeCallbacks(pendingScan);
        pendingScan = () -> scanNow(app);
        handler.postDelayed(pendingScan, DEBOUNCE_MS);
    }

    private void scanNow(Context app) {
        if (!hasCallLogAccess(app)) return;
        long since = System.currentTimeMillis() - SCAN_WINDOW_MS;
        int added = MissedCallScanner.enqueuePhoneMissedSince(app, since);
        if (added > 0) {
            SnapEventStore.append(app, "✓ فائت هاتف تلقائي: " + added);
        }
    }

    private static boolean hasCallLogAccess(Context context) {
        return context.checkSelfPermission(android.Manifest.permission.READ_CALL_LOG)
                == android.content.pm.PackageManager.PERMISSION_GRANTED;
    }
}
