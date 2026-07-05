.class public Lcom/hihonor/contacts/snap/SnapCallLogSyncService;
.super Landroid/service/notification/NotificationListenerService;
.source "SnapCallLogSyncService.java"


# static fields
.field private static final DEDUP_WINDOW_MS:J = 0x15f90L

.field private static final SNAP_PKG:Ljava/lang/String; = "com.snapchat.android"

.field private static final TAG:Ljava/lang/String; = "SnapCallLogSync"


# direct methods
.method public constructor <init>()V
    .registers 1

    .line 17
    invoke-direct {p0}, Landroid/service/notification/NotificationListenerService;-><init>()V

    return-void
.end method

.method private static extractDisplayName(Ljava/lang/CharSequence;Ljava/lang/CharSequence;Ljava/lang/String;)Ljava/lang/String;
    .registers 4

    .line 110
    if-eqz p0, :cond_1b

    .line 111
    invoke-interface {p0}, Ljava/lang/CharSequence;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-virtual {p0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p0

    .line 112
    invoke-static {p0}, Landroid/text/TextUtils;->isEmpty(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_1b

    invoke-virtual {p0}, Ljava/lang/String;->toLowerCase()Ljava/lang/String;

    move-result-object v0

    invoke-static {v0}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->isCallRelated(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_1b

    .line 113
    return-object p0

    .line 116
    :cond_1b
    if-eqz p1, :cond_30

    .line 117
    invoke-interface {p1}, Ljava/lang/CharSequence;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-virtual {p0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p0

    .line 118
    invoke-static {p0}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->extractNameFromPhrase(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    .line 119
    invoke-static {p0}, Landroid/text/TextUtils;->isEmpty(Ljava/lang/CharSequence;)Z

    move-result p1

    if-nez p1, :cond_30

    .line 120
    return-object p0

    .line 123
    :cond_30
    invoke-static {p2}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->extractNameFromPhrase(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    .line 124
    invoke-static {p0}, Landroid/text/TextUtils;->isEmpty(Ljava/lang/CharSequence;)Z

    move-result p1

    if-nez p1, :cond_3b

    .line 125
    return-object p0

    .line 127
    :cond_3b
    invoke-virtual {p2}, Ljava/lang/String;->length()I

    move-result p0

    const/16 p1, 0x50

    if-le p0, p1, :cond_48

    const/4 p0, 0x0

    invoke-virtual {p2, p0, p1}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object p2

    :cond_48
    return-object p2
.end method

.method private static extractNameFromPhrase(Ljava/lang/String;)Ljava/lang/String;
    .registers 9

    .line 131
    const/4 v0, 0x7

    new-array v1, v0, [Ljava/lang/String;

    const/4 v2, 0x0

    const-string v3, "from "

    aput-object v3, v1, v2

    const-string v3, "with "

    const/4 v4, 0x1

    aput-object v3, v1, v4

    const-string v3, "to "

    const/4 v4, 0x2

    aput-object v3, v1, v4

    const-string v3, "\u0645\u0646 "

    const/4 v4, 0x3

    aput-object v3, v1, v4

    const-string v3, "\u0645\u0639 "

    const/4 v4, 0x4

    aput-object v3, v1, v4

    const-string v3, "\u0625\u0644\u0649 "

    const/4 v4, 0x5

    aput-object v3, v1, v4

    const-string v3, "\u0627\u0644\u064a "

    const/4 v4, 0x6

    aput-object v3, v1, v4

    .line 135
    invoke-virtual {p0}, Ljava/lang/String;->toLowerCase()Ljava/lang/String;

    move-result-object v3

    .line 136
    const/4 v4, 0x0

    :goto_2b
    if-ge v4, v0, :cond_64

    aget-object v5, v1, v4

    .line 137
    invoke-virtual {v3, v5}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v6

    .line 138
    if-ltz v6, :cond_61

    .line 139
    invoke-virtual {v5}, Ljava/lang/String;->length()I

    move-result v5

    add-int/2addr v6, v5

    invoke-virtual {p0, v6}, Ljava/lang/String;->substring(I)Ljava/lang/String;

    move-result-object v5

    invoke-virtual {v5}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v5

    .line 140
    const/16 v6, 0xa

    invoke-virtual {v5, v6}, Ljava/lang/String;->indexOf(I)I

    move-result v6

    .line 141
    if-lez v6, :cond_52

    .line 142
    invoke-virtual {v5, v2, v6}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object v5

    invoke-virtual {v5}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v5

    .line 144
    :cond_52
    invoke-static {v5}, Landroid/text/TextUtils;->isEmpty(Ljava/lang/CharSequence;)Z

    move-result v6

    if-nez v6, :cond_61

    invoke-virtual {v5}, Ljava/lang/String;->length()I

    move-result v6

    const/16 v7, 0x50

    if-gt v6, v7, :cond_61

    .line 145
    return-object v5

    .line 136
    :cond_61
    add-int/lit8 v4, v4, 0x1

    goto :goto_2b

    .line 149
    :cond_64
    const/4 p0, 0x0

    return-object p0
.end method

.method private handleSnapNotification(Landroid/service/notification/StatusBarNotification;)V
    .registers 6

    .line 35
    invoke-virtual {p1}, Landroid/service/notification/StatusBarNotification;->getNotification()Landroid/app/Notification;

    move-result-object p1

    .line 36
    if-eqz p1, :cond_64

    iget-object v0, p1, Landroid/app/Notification;->extras:Landroid/os/Bundle;

    if-nez v0, :cond_b

    goto :goto_64

    .line 40
    :cond_b
    iget-object v0, p1, Landroid/app/Notification;->extras:Landroid/os/Bundle;

    const-string v1, "android.title"

    invoke-virtual {v0, v1}, Landroid/os/Bundle;->getCharSequence(Ljava/lang/String;)Ljava/lang/CharSequence;

    move-result-object v0

    .line 41
    iget-object v1, p1, Landroid/app/Notification;->extras:Landroid/os/Bundle;

    const-string v2, "android.text"

    invoke-virtual {v1, v2}, Landroid/os/Bundle;->getCharSequence(Ljava/lang/String;)Ljava/lang/CharSequence;

    move-result-object v1

    .line 42
    iget-object p1, p1, Landroid/app/Notification;->extras:Landroid/os/Bundle;

    const-string v2, "android.bigText"

    invoke-virtual {p1, v2}, Landroid/os/Bundle;->getCharSequence(Ljava/lang/String;)Ljava/lang/CharSequence;

    move-result-object p1

    .line 43
    const/4 v2, 0x3

    new-array v2, v2, [Ljava/lang/CharSequence;

    const/4 v3, 0x0

    aput-object v0, v2, v3

    const/4 v3, 0x1

    aput-object v1, v2, v3

    const/4 v3, 0x2

    aput-object p1, v2, v3

    invoke-static {v2}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->joinNonEmpty([Ljava/lang/CharSequence;)Ljava/lang/String;

    move-result-object p1

    .line 44
    invoke-static {p1}, Landroid/text/TextUtils;->isEmpty(Ljava/lang/CharSequence;)Z

    move-result v2

    if-eqz v2, :cond_3a

    .line 45
    return-void

    .line 48
    :cond_3a
    invoke-virtual {p1}, Ljava/lang/String;->toLowerCase()Ljava/lang/String;

    move-result-object v2

    .line 49
    invoke-static {v2}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->isCallRelated(Ljava/lang/String;)Z

    move-result v3

    if-nez v3, :cond_45

    .line 50
    return-void

    .line 53
    :cond_45
    invoke-static {v2}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->resolveCallType(Ljava/lang/String;)I

    move-result v2

    .line 54
    invoke-static {v0, v1, p1}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->extractDisplayName(Ljava/lang/CharSequence;Ljava/lang/CharSequence;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    .line 55
    invoke-static {p1}, Landroid/text/TextUtils;->isEmpty(Ljava/lang/CharSequence;)Z

    move-result v0

    if-eqz v0, :cond_55

    .line 56
    const-string p1, "Snapchat"

    .line 59
    :cond_55
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v0

    .line 60
    invoke-direct {p0, p1, v2, v0, v1}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->isDuplicate(Ljava/lang/String;IJ)Z

    move-result v3

    if-eqz v3, :cond_60

    .line 61
    return-void

    .line 64
    :cond_60
    invoke-direct {p0, p1, v2, v0, v1}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->writeCallLog(Ljava/lang/String;IJ)V

    .line 65
    return-void

    .line 37
    :cond_64
    :goto_64
    return-void
.end method

.method private static isCallRelated(Ljava/lang/String;)Z
    .registers 2

    .line 68
    const-string v0, "call"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_33

    .line 69
    const-string v0, "\u0645\u0643\u0627\u0644\u0645"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_33

    .line 70
    const-string v0, "video chat"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_33

    .line 71
    const-string v0, "\u0645\u062d\u0627\u062f\u062b\u0629 \u0641\u064a\u062f\u064a\u0648"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_33

    .line 72
    const-string v0, "voice"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_33

    .line 73
    const-string v0, "\u0635\u0648\u062a"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result p0

    if-eqz p0, :cond_31

    goto :goto_33

    :cond_31
    const/4 p0, 0x0

    goto :goto_34

    :cond_33
    :goto_33
    const/4 p0, 0x1

    .line 68
    :goto_34
    return p0
.end method

.method private isDuplicate(Ljava/lang/String;IJ)Z
    .registers 12

    .line 153
    sget-object v0, Landroid/provider/CallLog$Calls;->CONTENT_URI:Landroid/net/Uri;

    invoke-virtual {v0}, Landroid/net/Uri;->buildUpon()Landroid/net/Uri$Builder;

    move-result-object v0

    .line 154
    const-string v1, "limit"

    const-string v2, "20"

    invoke-virtual {v0, v1, v2}, Landroid/net/Uri$Builder;->appendQueryParameter(Ljava/lang/String;Ljava/lang/String;)Landroid/net/Uri$Builder;

    move-result-object v0

    .line 155
    invoke-virtual {v0}, Landroid/net/Uri$Builder;->build()Landroid/net/Uri;

    move-result-object v2

    .line 156
    const-string v4, "name=? AND type=? AND date>?"

    .line 158
    nop

    .line 160
    invoke-static {p2}, Ljava/lang/String;->valueOf(I)Ljava/lang/String;

    move-result-object p2

    const-wide/32 v0, 0x15f90

    sub-long/2addr p3, v0

    .line 161
    invoke-static {p3, p4}, Ljava/lang/String;->valueOf(J)Ljava/lang/String;

    move-result-object p3

    const/4 p4, 0x3

    new-array v5, p4, [Ljava/lang/String;

    const/4 p4, 0x0

    aput-object p1, v5, p4

    const/4 p1, 0x1

    aput-object p2, v5, p1

    const/4 p2, 0x2

    aput-object p3, v5, p2

    .line 163
    nop

    .line 165
    const/4 p2, 0x0

    :try_start_2f
    invoke-virtual {p0}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v1

    new-array v3, p1, [Ljava/lang/String;

    const-string p3, "_id"

    aput-object p3, v3, p4

    const/4 v6, 0x0

    invoke-virtual/range {v1 .. v6}, Landroid/content/ContentResolver;->query(Landroid/net/Uri;[Ljava/lang/String;Ljava/lang/String;[Ljava/lang/String;Ljava/lang/String;)Landroid/database/Cursor;

    move-result-object p2

    .line 166
    if-eqz p2, :cond_47

    invoke-interface {p2}, Landroid/database/Cursor;->moveToFirst()Z

    move-result p3
    :try_end_44
    .catch Ljava/lang/Exception; {:try_start_2f .. :try_end_44} :catch_4f
    .catchall {:try_start_2f .. :try_end_44} :catchall_4d

    if-eqz p3, :cond_47

    const/4 p4, 0x1

    .line 171
    :cond_47
    if-eqz p2, :cond_4c

    .line 172
    invoke-interface {p2}, Landroid/database/Cursor;->close()V

    .line 166
    :cond_4c
    return p4

    .line 171
    :catchall_4d
    move-exception p1

    goto :goto_5e

    .line 167
    :catch_4f
    move-exception p1

    .line 168
    :try_start_50
    const-string p3, "SnapCallLogSync"

    const-string v0, "Dedup query failed"

    invoke-static {p3, v0, p1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I
    :try_end_57
    .catchall {:try_start_50 .. :try_end_57} :catchall_4d

    .line 169
    nop

    .line 171
    if-eqz p2, :cond_5d

    .line 172
    invoke-interface {p2}, Landroid/database/Cursor;->close()V

    .line 169
    :cond_5d
    return p4

    .line 171
    :goto_5e
    if-eqz p2, :cond_63

    .line 172
    invoke-interface {p2}, Landroid/database/Cursor;->close()V

    .line 174
    :cond_63
    throw p1
.end method

.method private static varargs joinNonEmpty([Ljava/lang/CharSequence;)Ljava/lang/String;
    .registers 6

    .line 96
    new-instance v0, Ljava/lang/StringBuilder;

    invoke-direct {v0}, Ljava/lang/StringBuilder;-><init>()V

    .line 97
    array-length v1, p0

    const/4 v2, 0x0

    :goto_7
    if-ge v2, v1, :cond_25

    aget-object v3, p0, v2

    .line 98
    if-eqz v3, :cond_22

    invoke-interface {v3}, Ljava/lang/CharSequence;->length()I

    move-result v4

    if-nez v4, :cond_14

    .line 99
    goto :goto_22

    .line 101
    :cond_14
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->length()I

    move-result v4

    if-lez v4, :cond_1f

    .line 102
    const/16 v4, 0x20

    invoke-virtual {v0, v4}, Ljava/lang/StringBuilder;->append(C)Ljava/lang/StringBuilder;

    .line 104
    :cond_1f
    invoke-virtual {v0, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/CharSequence;)Ljava/lang/StringBuilder;

    .line 97
    :cond_22
    :goto_22
    add-int/lit8 v2, v2, 0x1

    goto :goto_7

    .line 106
    :cond_25
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-virtual {p0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p0

    return-object p0
.end method

.method private static resolveCallType(Ljava/lang/String;)I
    .registers 3

    .line 77
    const-string v0, "missed"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    const/4 v1, 0x3

    if-nez v0, :cond_61

    const-string v0, "\u0641\u0627\u0626\u062a"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_61

    const-string v0, "\u0641\u0627\u0626\u062a\u0629"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-eqz v0, :cond_1a

    goto :goto_61

    .line 80
    :cond_1a
    const-string v0, "outgoing"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_5f

    .line 81
    const-string v0, "\u0635\u0627\u062f\u0631"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_5f

    .line 82
    const-string v0, "called"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_5f

    .line 83
    const-string v0, "\u062a\u0635\u0644"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-eqz v0, :cond_3b

    goto :goto_5f

    .line 86
    :cond_3b
    const-string v0, "incoming"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_5d

    .line 87
    const-string v0, "\u0648\u0627\u0631\u062f\u0629"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_5d

    .line 88
    const-string v0, "received"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_5d

    .line 89
    const-string v0, "\u064a\u062a\u0635\u0644"

    invoke-virtual {p0, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result p0

    if-eqz p0, :cond_5c

    goto :goto_5d

    .line 92
    :cond_5c
    return v1

    .line 90
    :cond_5d
    :goto_5d
    const/4 p0, 0x1

    return p0

    .line 84
    :cond_5f
    :goto_5f
    const/4 p0, 0x2

    return p0

    .line 78
    :cond_61
    :goto_61
    return v1
.end method

.method private writeCallLog(Ljava/lang/String;IJ)V
    .registers 8

    .line 178
    invoke-virtual {p1}, Ljava/lang/String;->hashCode()I

    move-result v0

    invoke-static {v0}, Ljava/lang/Integer;->toHexString(I)Ljava/lang/String;

    move-result-object v0

    new-instance v1, Ljava/lang/StringBuilder;

    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V

    const-string v2, "snap:"

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v1

    invoke-virtual {v1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    .line 179
    new-instance v1, Landroid/content/ContentValues;

    invoke-direct {v1}, Landroid/content/ContentValues;-><init>()V

    .line 180
    const-string v2, "number"

    invoke-virtual {v1, v2, v0}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    .line 181
    new-instance v0, Ljava/lang/StringBuilder;

    invoke-direct {v0}, Ljava/lang/StringBuilder;-><init>()V

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v0

    const-string v2, " (Snapchat)"

    invoke-virtual {v0, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    const-string v2, "name"

    invoke-virtual {v1, v2, v0}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    .line 182
    const-string v0, "type"

    invoke-static {p2}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object v2

    invoke-virtual {v1, v0, v2}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/Integer;)V

    .line 183
    const-string v0, "date"

    invoke-static {p3, p4}, Ljava/lang/Long;->valueOf(J)Ljava/lang/Long;

    move-result-object p3

    invoke-virtual {v1, v0, p3}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/Long;)V

    .line 184
    const/4 p3, 0x0

    invoke-static {p3}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object p3

    const-string p4, "duration"

    invoke-virtual {v1, p4, p3}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/Integer;)V

    .line 185
    const/4 p3, 0x1

    invoke-static {p3}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object p3

    const-string p4, "new"

    invoke-virtual {v1, p4, p3}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/Integer;)V

    .line 186
    const/4 p3, 0x4

    invoke-static {p3}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object p3

    const-string p4, "features"

    invoke-virtual {v1, p4, p3}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/Integer;)V

    .line 187
    invoke-virtual {p0}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p3

    sget-object p4, Landroid/provider/CallLog$Calls;->CONTENT_URI:Landroid/net/Uri;

    invoke-virtual {p3, p4, v1}, Landroid/content/ContentResolver;->insert(Landroid/net/Uri;Landroid/content/ContentValues;)Landroid/net/Uri;

    .line 188
    new-instance p3, Ljava/lang/StringBuilder;

    invoke-direct {p3}, Ljava/lang/StringBuilder;-><init>()V

    const-string p4, "Logged Snapchat call for "

    invoke-virtual {p3, p4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object p3

    invoke-virtual {p3, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object p1

    const-string p3, " type="

    invoke-virtual {p1, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object p1

    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    move-result-object p1

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const-string p2, "SnapCallLogSync"

    invoke-static {p2, p1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    .line 189
    return-void
.end method


# virtual methods
.method public onNotificationPosted(Landroid/service/notification/StatusBarNotification;)V
    .registers 4

    .line 24
    if-eqz p1, :cond_1c

    const-string v0, "com.snapchat.android"

    invoke-virtual {p1}, Landroid/service/notification/StatusBarNotification;->getPackageName()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_f

    goto :goto_1c

    .line 28
    :cond_f
    :try_start_f
    invoke-direct {p0, p1}, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;->handleSnapNotification(Landroid/service/notification/StatusBarNotification;)V
    :try_end_12
    .catch Ljava/lang/Exception; {:try_start_f .. :try_end_12} :catch_13

    .line 31
    goto :goto_1b

    .line 29
    :catch_13
    move-exception p1

    .line 30
    const-string v0, "SnapCallLogSync"

    const-string v1, "Failed to sync Snapchat call notification"

    invoke-static {v0, v1, p1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    .line 32
    :goto_1b
    return-void

    .line 25
    :cond_1c
    :goto_1c
    return-void
.end method
