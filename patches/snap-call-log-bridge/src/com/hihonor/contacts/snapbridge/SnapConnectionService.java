package com.hihonor.contacts.snapbridge;

import android.content.Context;
import android.content.Intent;
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
        String address = request.getAddress() != null
                ? request.getAddress().getSchemeSpecificPart() : "";
        SnapEventStore.append(this, "اتصال من السجل: " + address);
        boolean ok = SnapchatLauncher.open(this, address);
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
}
