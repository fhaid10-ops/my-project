package com.hihonor.contacts.snapbridge;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/** Opens Snapchat when user taps notification or snapbridge://call/… links. */
public class SnapCallbackActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri data = getIntent() != null ? getIntent().getData() : null;
        if (data != null) {
            String address = extractAddress(data);
            if (address != null && !address.isEmpty()) {
                SnapchatLauncher.open(this, address);
            }
        }
        finish();
    }

    private static String extractAddress(Uri data) {
        if ("snapbridge".equals(data.getScheme()) && "call".equals(data.getHost())) {
            String seg = data.getLastPathSegment();
            if (seg != null) return Uri.decode(seg);
            String path = data.getPath();
            if (path != null) return Uri.decode(path.replaceFirst("^/", ""));
        }
        String part = data.getSchemeSpecificPart();
        if (part != null && part.startsWith("call/")) {
            return Uri.decode(part.substring(5));
        }
        return null;
    }
}
