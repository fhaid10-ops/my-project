.class public Lcom/hihonor/contacts/snap/SnapCallLogBootReceiver;
.super Landroid/content/BroadcastReceiver;
.source "SnapCallLogBootReceiver.java"


# static fields
.field private static final TAG:Ljava/lang/String; = "SnapCallLogBoot"


# direct methods
.method public constructor <init>()V
    .registers 1

    .line 14
    invoke-direct {p0}, Landroid/content/BroadcastReceiver;-><init>()V

    return-void
.end method

.method private static isNotificationListenerEnabled(Landroid/content/Context;)Z
    .registers 4

    .line 29
    nop

    .line 30
    invoke-virtual {p0}, Landroid/content/Context;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v0

    .line 29
    const-string v1, "enabled_notification_listeners"

    invoke-static {v0, v1}, Landroid/provider/Settings$Secure;->getString(Landroid/content/ContentResolver;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    .line 31
    invoke-static {v0}, Landroid/text/TextUtils;->isEmpty(Ljava/lang/CharSequence;)Z

    move-result v1

    if-eqz v1, :cond_13

    .line 32
    const/4 p0, 0x0

    return p0

    .line 34
    :cond_13
    new-instance v1, Landroid/content/ComponentName;

    const-class v2, Lcom/hihonor/contacts/snap/SnapCallLogSyncService;

    invoke-direct {v1, p0, v2}, Landroid/content/ComponentName;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    .line 35
    invoke-virtual {v1}, Landroid/content/ComponentName;->flattenToString()Ljava/lang/String;

    move-result-object p0

    invoke-virtual {v0, p0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result p0

    return p0
.end method


# virtual methods
.method public onReceive(Landroid/content/Context;Landroid/content/Intent;)V
    .registers 4

    .line 19
    if-eqz p2, :cond_1e

    const-string v0, "android.intent.action.BOOT_COMPLETED"

    invoke-virtual {p2}, Landroid/content/Intent;->getAction()Ljava/lang/String;

    move-result-object p2

    invoke-virtual {v0, p2}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p2

    if-nez p2, :cond_f

    goto :goto_1e

    .line 22
    :cond_f
    invoke-static {p1}, Lcom/hihonor/contacts/snap/SnapCallLogBootReceiver;->isNotificationListenerEnabled(Landroid/content/Context;)Z

    move-result p1

    if-eqz p1, :cond_16

    .line 23
    return-void

    .line 25
    :cond_16
    const-string p1, "SnapCallLogBoot"

    const-string p2, "Snapchat call log bridge needs notification access"

    invoke-static {p1, p2}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    .line 26
    return-void

    .line 20
    :cond_1e
    :goto_1e
    return-void
.end method
