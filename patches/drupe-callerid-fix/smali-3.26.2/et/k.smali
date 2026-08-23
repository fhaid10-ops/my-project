.class public final synthetic Let/k;
.super Ljava/lang/Object;
.source "R8$$SyntheticClass"

# interfaces
.implements Ljava/lang/Runnable;


# instance fields
.field public final synthetic a:Lmobi/drupe/app/activities/login_and_upload_contacts/a;


# direct methods
.method public synthetic constructor <init>(Lmobi/drupe/app/activities/login_and_upload_contacts/a;)V
    .locals 0

    .line 1
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 2
    .line 3
    .line 4
    iput-object p1, p0, Let/k;->a:Lmobi/drupe/app/activities/login_and_upload_contacts/a;

    .line 5
    .line 6
    return-void
.end method


# virtual methods
.method public final run()V
    .locals 3

    .line 1
    iget-object v0, p0, Let/k;->a:Lmobi/drupe/app/activities/login_and_upload_contacts/a;

    .line 2
    .line 3
    sget-object v1, Lapp/cleared/caller_id_sdk/publics/CallerIdManager;->INSTANCE:Lapp/cleared/caller_id_sdk/publics/CallerIdManager;

    .line 4
    .line 5
    iget-object v2, v0, Lpv/l;->Z:Landroid/content/Context;

    .line 6
    .line 7
    invoke-virtual {v1, v2}, Lapp/cleared/caller_id_sdk/publics/CallerIdManager;->isRegistered(Landroid/content/Context;)Z

    .line 8
    .line 9
    .line 10
    move-result v1

    .line 11
    if-eqz v1, :cond_1

    .line 12
    .line 13
    sget-object v1, Ldu/g0;->b:Ldu/e0;

    .line 14
    .line 15
    if-nez v1, :cond_0

    .line 16
    .line 17
    const-string v1, "deps"

    .line 18
    .line 19
    invoke-static {v1}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 20
    .line 21
    .line 22
    const/4 v1, 0x0

    .line 23
    :cond_0
    invoke-virtual {v1}, Ldu/e0;->h()Lgv/a;

    .line 24
    .line 25
    .line 26
    move-result-object v1

    .line 27
    const/4 v2, 0x1

    .line 28
    invoke-interface {v1, v2}, Lgv/a;->r(Z)V

    .line 29
    .line 30
    .line 31
    sget-object v1, Lapp/cleared/callerid/sdk/CallerIdSdk;->Companion:Lapp/cleared/callerid/sdk/CallerIdSdk$Companion;

    .line 32
    .line 33
    invoke-virtual {v1}, Lapp/cleared/callerid/sdk/CallerIdSdk$Companion;->getInstance()Lapp/cleared/callerid/sdk/CallerIdSdk;

    .line 34
    .line 35
    .line 36
    move-result-object v1

    .line 37
    invoke-interface {v1}, Lapp/cleared/callerid/sdk/CallerIdSdk;->checkTopSpammers()V

    .line 38
    .line 39
    .line 40
    iget-object v0, v0, Lmobi/drupe/app/activities/login_and_upload_contacts/a;->c0:Landroidx/lifecycle/l0;

    .line 41
    .line 42
    sget-object v1, Lmobi/drupe/app/activities/login_and_upload_contacts/a$b$b;->a:Lmobi/drupe/app/activities/login_and_upload_contacts/a$b$b;

    .line 43
    .line 44
    invoke-virtual {v0, v1}, Landroidx/lifecycle/l0;->postValue(Ljava/lang/Object;)V

    .line 45
    .line 46
    .line 47
    return-void

    .line 48
    :cond_1
    invoke-virtual {v0}, Lmobi/drupe/app/activities/login_and_upload_contacts/a;->X()V

    .line 49
    .line 50
    .line 51
    return-void
.end method
