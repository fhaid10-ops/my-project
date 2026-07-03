package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private TextView statusView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        int pad = (int) (24 * getResources().getDisplayMetrics().density);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);
        root.setGravity(Gravity.START);

        TextView title = new TextView(this);
        title.setText(getString(R.string.title));
        title.setTextSize(20f);
        title.setPadding(0, 0, 0, pad / 2);
        root.addView(title);

        TextView desc = new TextView(this);
        desc.setText(getString(R.string.desc));
        desc.setTextSize(16f);
        desc.setPadding(0, 0, 0, pad);
        root.addView(desc);

        statusView = new TextView(this);
        statusView.setTextSize(15f);
        statusView.setPadding(0, 0, 0, pad);
        root.addView(statusView);

        Button btn = new Button(this);
        btn.setText(getString(R.string.btn_enable));
        btn.setOnClickListener(v ->
                startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        root.addView(btn);

        TextView note = new TextView(this);
        note.setText(getString(R.string.note));
        note.setTextSize(13f);
        note.setPadding(0, pad, 0, 0);
        root.addView(note);

        setContentView(root);
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatus();
    }

    private void updateStatus() {
        boolean enabled = isListenerEnabled();
        statusView.setText(enabled ? getString(R.string.status_ok) : getString(R.string.status_no));
    }

    private boolean isListenerEnabled() {
        String enabled = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        if (TextUtils.isEmpty(enabled)) {
            return false;
        }
        ComponentName cn = new ComponentName(this, SnapCallLogSyncService.class);
        return enabled.contains(cn.flattenToString());
    }
}
