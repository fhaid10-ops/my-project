.class public final Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;
.super Lmobi/drupe/app/utils/BaseViewModel;


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State;,
        Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$WhenMappings;
    }
.end annotation


# instance fields
.field private final e:Landroidx/lifecycle/MutableLiveData;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Landroidx/lifecycle/MutableLiveData<",
            "Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State;",
            ">;"
        }
    .end annotation
.end field


# direct methods
.method public constructor <init>(Landroid/app/Application;)V
    .locals 0

    invoke-direct {p0, p1}, Lmobi/drupe/app/utils/BaseViewModel;-><init>(Landroid/app/Application;)V

    new-instance p1, Landroidx/lifecycle/MutableLiveData;

    invoke-direct {p1}, Landroidx/lifecycle/MutableLiveData;-><init>()V

    iput-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    return-void
.end method

.method public static synthetic a(Ljava/lang/String;Ljava/lang/Boolean;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V
    .locals 0

    invoke-static {p0, p1, p2}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->f(Ljava/lang/String;Ljava/lang/Boolean;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V

    return-void
.end method

.method public static synthetic b(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V
    .locals 0

    invoke-static {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->d(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V

    return-void
.end method

.method public static synthetic c(Lcom/google/android/gms/auth/api/signin/GoogleSignInAccount;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V
    .locals 0

    invoke-static {p0, p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e(Lcom/google/android/gms/auth/api/signin/GoogleSignInAccount;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V

    return-void
.end method

.method private static final d(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V
    .locals 3

    sget-object v0, Lme/sync/caller_id_sdk/publics/CallerIdManager;->INSTANCE:Lme/sync/caller_id_sdk/publics/CallerIdManager;

    invoke-virtual {p0}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object v1

    invoke-virtual {v0, v1}, Lme/sync/caller_id_sdk/publics/CallerIdManager;->isRegistered(Landroid/content/Context;)Z

    move-result v0

    if-eqz v0, :cond_0

    sget-object v0, Lmobi/drupe/app/repository/Repository;->INSTANCE:Lmobi/drupe/app/repository/Repository;

    invoke-virtual {p0}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object v1

    const/4 v2, 0x1

    invoke-virtual {v0, v1, v2}, Lmobi/drupe/app/repository/Repository;->setHasFinishedLoginAndContactsUploadProcedure(Landroid/content/Context;Z)V

    iget-object p0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    sget-object v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$DoneWithRegistration;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$DoneWithRegistration;

    invoke-virtual {p0, v0}, Landroidx/lifecycle/MutableLiveData;->postValue(Ljava/lang/Object;)V

    goto :goto_0

    :cond_0
    invoke-direct {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->g()V

    :goto_0
    return-void
.end method

.method private static final e(Lcom/google/android/gms/auth/api/signin/GoogleSignInAccount;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V
    .locals 4

    if-eqz p0, :cond_2

    goto :cond_0

    :cond_0
    sget-object v0, Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;->INSTANCE:Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;

    invoke-virtual {p1}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object v1

    sget-object v2, Lmobi/drupe/app/Keys;->INSTANCE:Lmobi/drupe/app/Keys;

    invoke-virtual {v2}, Lmobi/drupe/app/Keys;->getSERVER_CLIENT_ID()Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v2}, Lmobi/drupe/app/Keys;->getCLIENT_SECRET()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v0, v1, p0, v3, v2}, Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;->getGoogleToken(Landroid/content/Context;Lcom/google/android/gms/auth/api/signin/GoogleSignInAccount;Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    if-eqz p0, :cond_1

    iget-object p1, p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    new-instance v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NeedUserConfirmation;

    invoke-direct {v0, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NeedUserConfirmation;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1, v0}, Landroidx/lifecycle/MutableLiveData;->postValue(Ljava/lang/Object;)V

    goto :goto_0

    :cond_1
    invoke-direct {p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->g()V

    :goto_0
    return-void

    :cond_2
    :goto_1
    invoke-direct {p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->g()V

    return-void
.end method

.method private static final f(Ljava/lang/String;Ljava/lang/Boolean;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V
    .locals 2

    if-eqz p0, :cond_5

    if-nez p1, :cond_0

    goto :goto_3

    :cond_0
    sget-object v0, Lme/sync/caller_id_sdk/publics/CallerIdManager;->INSTANCE:Lme/sync/caller_id_sdk/publics/CallerIdManager;

    invoke-virtual {p2}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object v1

    invoke-virtual {p1}, Ljava/lang/Boolean;->booleanValue()Z

    move-result p1

    invoke-virtual {v0, v1, p0, p1}, Lme/sync/caller_id_sdk/publics/CallerIdManager;->internalRegister(Landroid/content/Context;Ljava/lang/String;Z)Lme/sync/caller_id_sdk/publics/CallerIdManager$RegistrationResult;

    move-result-object p0

    sget-object p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$WhenMappings;->$EnumSwitchMapping$0:[I

    invoke-virtual {p0}, Ljava/lang/Enum;->ordinal()I

    move-result p0

    aget p0, p1, p0

    const/4 p1, 0x1

    if-eq p0, p1, :cond_4

    const/4 p1, 0x2

    if-eq p0, p1, :cond_3

    const/4 p1, 0x3

    if-eq p0, p1, :cond_1

    goto :goto_2

    :cond_1
    sget-object p0, Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;->INSTANCE:Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;

    invoke-virtual {p2}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object p1

    invoke-virtual {p0, p1}, Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;->isLoggedIn(Landroid/content/Context;)Z

    move-result p0

    if-nez p0, :cond_2

    goto :goto_0

    :cond_2
    iget-object p0, p2, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    sget-object p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$ErrorInRegistration;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$ErrorInRegistration;

    goto :goto_1

    :cond_3
    sget-object p0, Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;->INSTANCE:Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;

    invoke-virtual {p2}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object p1

    sget-object v0, Lmobi/drupe/app/Keys;->INSTANCE:Lmobi/drupe/app/Keys;

    invoke-virtual {v0}, Lmobi/drupe/app/Keys;->getSERVER_CLIENT_ID()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {p0, p1, v0}, Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;->logout(Landroid/content/Context;Ljava/lang/String;)V

    :goto_0
    invoke-direct {p2}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->g()V

    goto :goto_2

    :cond_4
    sget-object p0, Lmobi/drupe/app/repository/Repository;->INSTANCE:Lmobi/drupe/app/repository/Repository;

    invoke-virtual {p2}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object v0

    invoke-virtual {p0, v0, p1}, Lmobi/drupe/app/repository/Repository;->setHasFinishedLoginAndContactsUploadProcedure(Landroid/content/Context;Z)V

    iget-object p0, p2, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    sget-object p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$DoneWithRegistration;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$DoneWithRegistration;

    :goto_1
    invoke-virtual {p0, p1}, Landroidx/lifecycle/MutableLiveData;->postValue(Ljava/lang/Object;)V

    :goto_2
    return-void

    :cond_5
    :goto_3
    invoke-direct {p2}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->g()V

    return-void
.end method

.method private final g()V
    .locals 3

    sget-object v0, Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;->INSTANCE:Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;

    invoke-virtual {p0}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object v1

    sget-object v2, Lmobi/drupe/app/Keys;->INSTANCE:Lmobi/drupe/app/Keys;

    invoke-virtual {v2}, Lmobi/drupe/app/Keys;->getSERVER_APP_ID()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v0, v1, v2}, Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;->prepareIntent(Landroid/content/Context;Ljava/lang/String;)Landroid/content/Intent;

    move-result-object v0

    iget-object v1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    new-instance v2, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NeedGoogleToken;

    invoke-direct {v2, v0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NeedGoogleToken;-><init>(Landroid/content/Intent;)V

    invoke-virtual {v1, v2}, Landroidx/lifecycle/MutableLiveData;->postValue(Ljava/lang/Object;)V

    return-void
.end method


# virtual methods
.method public final getLiveData()Landroidx/lifecycle/MutableLiveData;
    .locals 1
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "()",
            "Landroidx/lifecycle/MutableLiveData<",
            "Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State;",
            ">;"
        }
    .end annotation

    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    return-object v0
.end method

.method public final init()V
    .locals 2

    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    invoke-virtual {v0}, Landroidx/lifecycle/LiveData;->getValue()Ljava/lang/Object;

    move-result-object v0

    if-eqz v0, :cond_0

    return-void

    :cond_0
    invoke-virtual {p0}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object v0

    invoke-static {v0}, Lmobi/drupe/app/activities/permissions/Permissions;->hasContactsPermission(Landroid/content/Context;)Z

    move-result v0

    if-nez v0, :cond_1

    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    sget-object v1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NoContactsPermissions;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NoContactsPermissions;

    invoke-virtual {v0, v1}, Landroidx/lifecycle/MutableLiveData;->setValue(Ljava/lang/Object;)V

    return-void

    :cond_1
    invoke-virtual {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->onGotRequiredPermissions()V

    return-void
.end method

.method public final onGotRequiredPermissions()V
    .locals 8

    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    invoke-virtual {v0}, Landroidx/lifecycle/LiveData;->getValue()Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State;

    sget-object v1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$GotContactsPermission;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$GotContactsPermission;

    invoke-static {v0, v1}, Lkotlin/jvm/internal/Intrinsics;->areEqual(Ljava/lang/Object;Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_0

    return-void

    :cond_0
    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    invoke-virtual {v0, v1}, Landroidx/lifecycle/MutableLiveData;->setValue(Ljava/lang/Object;)V

    sget-object v2, Lme/sync/caller_id_sdk/publics/CallerIdManager;->INSTANCE:Lme/sync/caller_id_sdk/publics/CallerIdManager;

    invoke-virtual {p0}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object v3

    const-wide/16 v4, 0x0

    const/4 v6, 0x2

    const/4 v7, 0x0

    invoke-static/range {v2 .. v7}, Lme/sync/caller_id_sdk/publics/CallerIdManager;->onGotRequiredPermissions$default(Lme/sync/caller_id_sdk/publics/CallerIdManager;Landroid/content/Context;JILjava/lang/Object;)V

    sget-object v0, Lmobi/drupe/app/utils/Executors;->IO:Ljava/util/concurrent/Executor;

    new-instance v1, Lmobi/drupe/app/activities/login_and_upload_contacts/j;

    invoke-direct {v1, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/j;-><init>(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V

    invoke-interface {v0, v1}, Ljava/util/concurrent/Executor;->execute(Ljava/lang/Runnable;)V

    return-void
.end method

.method public final onReturnedFromGoogleLogin()V
    .locals 3

    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    invoke-virtual {v0}, Landroidx/lifecycle/LiveData;->getValue()Ljava/lang/Object;

    move-result-object v0

    sget-object v1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$AnalyzingGoogleToken;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$AnalyzingGoogleToken;

    invoke-static {v0, v1}, Lkotlin/jvm/internal/Intrinsics;->areEqual(Ljava/lang/Object;Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_0

    return-void

    :cond_0
    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    invoke-virtual {v0, v1}, Landroidx/lifecycle/MutableLiveData;->setValue(Ljava/lang/Object;)V

    invoke-virtual {p0}, Lmobi/drupe/app/utils/BaseViewModel;->getContext()Landroid/content/Context;

    move-result-object v0

    invoke-static {v0}, Lcom/google/android/gms/auth/api/signin/GoogleSignIn;->getLastSignedInAccount(Landroid/content/Context;)Lcom/google/android/gms/auth/api/signin/GoogleSignInAccount;

    move-result-object v0

    sget-object v1, Lmobi/drupe/app/utils/Executors;->IO:Ljava/util/concurrent/Executor;

    new-instance v2, Lmobi/drupe/app/activities/login_and_upload_contacts/h;

    invoke-direct {v2, v0, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/h;-><init>(Lcom/google/android/gms/auth/api/signin/GoogleSignInAccount;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V

    invoke-interface {v1, v2}, Ljava/util/concurrent/Executor;->execute(Ljava/lang/Runnable;)V

    return-void
.end method

.method public final register(Ljava/lang/Boolean;Ljava/lang/String;)V
    .locals 2

    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    invoke-virtual {v0}, Landroidx/lifecycle/LiveData;->getValue()Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State;

    instance-of v1, v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NeedUserConfirmation;

    if-nez v1, :cond_0

    instance-of v0, v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$ErrorInRegistration;

    if-nez v0, :cond_0

    return-void

    :cond_0
    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->e:Landroidx/lifecycle/MutableLiveData;

    sget-object v1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$DuringRegistration;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$DuringRegistration;

    invoke-virtual {v0, v1}, Landroidx/lifecycle/MutableLiveData;->setValue(Ljava/lang/Object;)V

    sget-object v0, Lmobi/drupe/app/utils/Executors;->IO:Ljava/util/concurrent/Executor;

    new-instance v1, Lmobi/drupe/app/activities/login_and_upload_contacts/i;

    invoke-direct {v1, p2, p1, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/i;-><init>(Ljava/lang/String;Ljava/lang/Boolean;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;)V

    invoke-interface {v0, v1}, Ljava/util/concurrent/Executor;->execute(Ljava/lang/Runnable;)V

    return-void
.end method
