package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/** Fallback when user opens snapbridge://call/... links from call log. */
public class SnapCallbackActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri data = getIntent() != null ? getIntent().getData() : null;
        if (data != null) {
            String address = data.getSchemeSpecificPart();
            if (address == null && data.getPath() != null) {
                address = data.getPath().replaceFirst("^/", "");
            }
            if (address != null) {
                SnapchatLauncher.open(this, Uri.decode(address));
            }
        }
        finish();
    }
}
