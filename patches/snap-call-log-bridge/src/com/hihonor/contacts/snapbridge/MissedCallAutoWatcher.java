package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.database.ContentObserver;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.provider.CallLog;

public final class MissedCallAutoWatcher {
    private static final long SCAN_WINDOW_MS = 24 * 60 * 60 * 1000L;
    private static final long DEBOUNCE_MS = 400L;
    private static final long POLL_MS = 20_000L;

    private static MissedCallAutoWatcher instance;
    private ContentObserver observer;
    private HandlerThread observerThread;
    private Handler observerHandler;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private Runnable pendingScan;
    private Runnable pollRunnable;
    private Context appContext;

    private MissedCallAutoWatcher() {}

    public static synchronized void ensureStarted(Context context) {
        if (context == null) return;
        if (!hasCallLogAccess(context)) return;
        if (instance == null) instance = new MissedCallAutoWatcher();
        instance.start(context.getApplicationContext());
    }

    public static void scanNow(Context context) {
        if (context == null || !hasCallLogAccess(context)) return;
        Context app = context.getApplicationContext();
        if (instance != null) {
            instance.scanNowInternal(app);
        } else {
            doScan(app);
        }
    }

    public static synchronized void startPolling(Context context) {
        ensureStarted(context);
        if (instance == null) return;
        instance.startPoll(context.getApplicationContext());
    }

    public static synchronized void stopPolling() {
        if (instance != null && instance.pollRunnable != null) {
            instance.mainHandler.removeCallbacks(instance.pollRunnable);
            instance.pollRunnable = null;
        }
    }

    private void start(Context app) {
        appContext = app;
        if (observer == null) {
            observerThread = new HandlerThread("missed-call-watcher");
            observerThread.start();
            observerHandler = new Handler(observerThread.getLooper());
            observer = new ContentObserver(observerHandler) {
                @Override
                public void onChange(boolean selfChange) {
                    scheduleScan(app);
                }
            };
            try {
                app.getContentResolver().registerContentObserver(
                        CallLog.Calls.CONTENT_URI, true, observer);
            } catch (Exception ignored) {
                observer = null;
            }
        }
        scanNowInternal(app);
    }

    private void startPoll(Context app) {
        appContext = app;
        if (pollRunnable != null) return;
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                scanNowInternal(app);
                mainHandler.postDelayed(this, POLL_MS);
            }
        };
        mainHandler.post(pollRunnable);
    }

    private void scheduleScan(Context app) {
        mainHandler.post(() -> {
            if (pendingScan != null) mainHandler.removeCallbacks(pendingScan);
            pendingScan = () -> scanNowInternal(app);
            mainHandler.postDelayed(pendingScan, DEBOUNCE_MS);
        });
    }

    private void scanNowInternal(Context app) {
        if (!hasCallLogAccess(app)) return;
        if (observerHandler != null) {
            observerHandler.post(() -> doScan(app));
        } else {
            doScan(app);
        }
    }

    private static void doScan(Context app) {
        long since = System.currentTimeMillis() - SCAN_WINDOW_MS;
        int added = MissedCallScanner.enqueuePhoneMissedSince(app, since);
        if (added > 0) {
            SnapEventStore.append(app, "✓ فائت هاتف تلقائي: " + added);
            new Handler(Looper.getMainLooper()).post(() -> MissedCallOverlayController.refresh(app));
        }
    }

    private static boolean hasCallLogAccess(Context context) {
        return context.checkSelfPermission(android.Manifest.permission.READ_CALL_LOG)
                == android.content.pm.PackageManager.PERMISSION_GRANTED;
    }
}
