package com.hihonor.contacts.snapbridge;

import android.net.Uri;
import android.telecom.Connection;
import android.telecom.ConnectionRequest;
import android.telecom.ConnectionService;
import android.telecom.DisconnectCause;
import android.telecom.PhoneAccountHandle;
import android.widget.Toast;

public class SnapConnectionService extends ConnectionService {
    @Override
    public Connection onCreateOutgoingConnection(PhoneAccountHandle connectionManagerPhoneAccount,
                                                   ConnectionRequest request) {
        String raw = extractAddress(request);
        String address = SnapUserStore.resolveAddress(this, raw);
        if (address == null || address.isEmpty()) {
            address = LastSnapStore.getAddress(this);
        }
        String name = SnapUserStore.getDisplayName(this, address != null ? address : raw);
        SnapEventStore.append(this, "اتصال من السجل: " + name);
        boolean ok = SnapchatLauncher.open(this, address != null ? address : raw);
        if (!ok) {
            Toast.makeText(this, "تعذّر فتح Snapchat", Toast.LENGTH_SHORT).show();
        }
        Connection connection = new Connection() {};
        connection.setDisconnected(new DisconnectCause(DisconnectCause.LOCAL));
        connection.destroy();
        return connection;
    }

    @Override
    public Connection onCreateIncomingConnection(PhoneAccountHandle connectionManagerPhoneAccount,
                                                   ConnectionRequest request) {
        return Connection.createFailedConnection(new DisconnectCause(DisconnectCause.MISSED));
    }

    private static String extractAddress(ConnectionRequest request) {
        if (request == null || request.getAddress() == null) return "";
        String raw = request.getAddress().getSchemeSpecificPart();
        if (raw == null) return "";
        return Uri.decode(raw);
    }
}
