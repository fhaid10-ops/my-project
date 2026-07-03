.class public final Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;
.super Lmobi/drupe/app/ui/BoundActivity;


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$DeclineUploadContactsDialogFragment;,
        Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$Companion;
    }
.end annotation

.annotation system Ldalvik/annotation/Signature;
    value = {
        "Lmobi/drupe/app/ui/BoundActivity<",
        "Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;",
        ">;"
    }
.end annotation


# static fields
.field public static final Companion:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$Companion;

.field public static final EXTRA_IS_DURING_ONBOARDING:Ljava/lang/String; = "EXTRA_IS_DURING_ONBOARDING"


# instance fields
.field private b:Ljava/lang/String;

.field private c:Ljava/lang/Boolean;

.field private d:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

.field private f:Z

.field private final g:Lkotlin/Lazy;

.field private final h:Landroidx/activity/result/ActivityResultLauncher;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Landroidx/activity/result/ActivityResultLauncher<",
            "[",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field

.field private final i:Landroidx/activity/result/ActivityResultLauncher;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Landroidx/activity/result/ActivityResultLauncher<",
            "Landroid/content/Intent;",
            ">;"
        }
    .end annotation
.end field


# direct methods
.method public static constructor <clinit>()V
    .locals 2

    new-instance v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$Companion;

    const/4 v1, 0x0

    invoke-direct {v0, v1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$Companion;-><init>(Lkotlin/jvm/internal/DefaultConstructorMarker;)V

    sput-object v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->Companion:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$Companion;

    return-void
.end method

.method public constructor <init>()V
    .locals 2

    sget-object v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$a;->a:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$a;

    invoke-direct {p0, v0}, Lmobi/drupe/app/ui/BoundActivity;-><init>(Lkotlin/jvm/functions/Function1;)V

    sget-object v0, Lkotlin/LazyThreadSafetyMode;->NONE:Lkotlin/LazyThreadSafetyMode;

    new-instance v1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$c;

    invoke-direct {v1, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$c;-><init>(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;)V

    invoke-static {v0, v1}, Lkotlin/LazyKt;->lazy(Lkotlin/LazyThreadSafetyMode;Lkotlin/jvm/functions/Function0;)Lkotlin/Lazy;

    move-result-object v0

    iput-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->g:Lkotlin/Lazy;

    new-instance v0, Landroidx/activity/result/contract/ActivityResultContracts$RequestMultiplePermissions;

    invoke-direct {v0}, Landroidx/activity/result/contract/ActivityResultContracts$RequestMultiplePermissions;-><init>()V

    new-instance v1, Lmobi/drupe/app/activities/login_and_upload_contacts/e;

    invoke-direct {v1, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/e;-><init>(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;)V

    invoke-virtual {p0, v0, v1}, Landroidx/activity/ComponentActivity;->registerForActivityResult(Landroidx/activity/result/contract/ActivityResultContract;Landroidx/activity/result/ActivityResultCallback;)Landroidx/activity/result/ActivityResultLauncher;

    move-result-object v0

    iput-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->h:Landroidx/activity/result/ActivityResultLauncher;

    new-instance v0, Landroidx/activity/result/contract/ActivityResultContracts$StartActivityForResult;

    invoke-direct {v0}, Landroidx/activity/result/contract/ActivityResultContracts$StartActivityForResult;-><init>()V

    new-instance v1, Lmobi/drupe/app/activities/login_and_upload_contacts/d;

    invoke-direct {v1, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/d;-><init>(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;)V

    invoke-virtual {p0, v0, v1}, Landroidx/activity/ComponentActivity;->registerForActivityResult(Landroidx/activity/result/contract/ActivityResultContract;Landroidx/activity/result/ActivityResultCallback;)Landroidx/activity/result/ActivityResultLauncher;

    move-result-object v0

    iput-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->i:Landroidx/activity/result/ActivityResultLauncher;

    return-void
.end method

.method public static final synthetic access$getGoogleToken$p(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;)Ljava/lang/String;
    .locals 0

    iget-object p0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->b:Ljava/lang/String;

    return-object p0
.end method

.method public static final synthetic access$getViewModel$p(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;)Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;
    .locals 0

    iget-object p0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->d:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

    return-object p0
.end method

.method public static final synthetic access$setUserAcceptedToUploadContacts$p(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Ljava/lang/Boolean;)V
    .locals 0

    iput-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->c:Ljava/lang/Boolean;

    return-void
.end method

.method public static synthetic e(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroid/view/View;)V
    .locals 0

    invoke-static {p0, p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->o(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroid/view/View;)V

    return-void
.end method

.method public static synthetic f(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State;)V
    .locals 0

    invoke-static {p0, p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->m(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State;)V

    return-void
.end method

.method public static synthetic g(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroid/view/View;)V
    .locals 0

    invoke-static {p0, p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->n(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroid/view/View;)V

    return-void
.end method

.method public static synthetic h(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Ljava/util/Map;)V
    .locals 0

    invoke-static {p0, p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->q(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Ljava/util/Map;)V

    return-void
.end method

.method public static synthetic i(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroidx/activity/result/ActivityResult;)V
    .locals 0

    invoke-static {p0, p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->r(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroidx/activity/result/ActivityResult;)V

    return-void
.end method

.method public static synthetic j(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroid/view/View;)V
    .locals 0

    invoke-static {p0, p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->p(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroid/view/View;)V

    return-void
.end method

.method private final l()Z
    .locals 1

    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->g:Lkotlin/Lazy;

    invoke-interface {v0}, Lkotlin/Lazy;->getValue()Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Ljava/lang/Boolean;

    invoke-virtual {v0}, Ljava/lang/Boolean;->booleanValue()Z

    move-result v0

    return v0
.end method

.method private static final m(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State;)V
    .locals 5

    sget-object v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NoContactsPermissions;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NoContactsPermissions;

    invoke-static {p1, v0}, Lkotlin/jvm/internal/Intrinsics;->areEqual(Ljava/lang/Object;Ljava/lang/Object;)Z

    move-result v0

    const/4 v1, 0x0

    const/4 v2, 0x2

    const/4 v3, 0x0

    if-eqz v0, :cond_0

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->viewSwitcher:Landroid/widget/ViewAnimator;

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object v0

    check-cast v0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object v0, v0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->loaderBeforeContactsUpload:Landroid/view/View;

    invoke-static {p1, v0, v3, v2, v1}, Lmobi/drupe/app/utils/ViewUtilKt;->setViewToSwitchTo$default(Landroid/widget/ViewAnimator;Landroid/view/View;ZILjava/lang/Object;)Z

    iget-object p0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->h:Landroidx/activity/result/ActivityResultLauncher;

    const-string p1, "android.permission.READ_CONTACTS"

    const-string v0, "android.permission.WRITE_CONTACTS"

    const-string v1, "android.permission.GET_ACCOUNTS"

    filled-new-array {p1, v0, v1}, [Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p0, p1}, Landroidx/activity/result/ActivityResultLauncher;->launch(Ljava/lang/Object;)V

    goto/16 :goto_2

    :cond_0
    sget-object v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$GotContactsPermission;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$GotContactsPermission;

    invoke-static {p1, v0}, Lkotlin/jvm/internal/Intrinsics;->areEqual(Ljava/lang/Object;Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_1

    :goto_0
    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->viewSwitcher:Landroid/widget/ViewAnimator;

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p0

    check-cast p0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p0, p0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->loaderBeforeContactsUpload:Landroid/view/View;

    :goto_1
    invoke-static {p1, p0, v3, v2, v1}, Lmobi/drupe/app/utils/ViewUtilKt;->setViewToSwitchTo$default(Landroid/widget/ViewAnimator;Landroid/view/View;ZILjava/lang/Object;)Z

    goto/16 :goto_2

    :cond_1
    sget-object v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$AnalyzingGoogleToken;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$AnalyzingGoogleToken;

    invoke-static {p1, v0}, Lkotlin/jvm/internal/Intrinsics;->areEqual(Ljava/lang/Object;Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_2

    goto :goto_0

    :cond_2
    instance-of v0, p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NeedGoogleToken;

    if-eqz v0, :cond_3

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->viewSwitcher:Landroid/widget/ViewAnimator;

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object v0

    check-cast v0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object v0, v0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->loaderBeforeContactsUpload:Landroid/view/View;

    invoke-static {p1, v0, v3, v2, v1}, Lmobi/drupe/app/utils/ViewUtilKt;->setViewToSwitchTo$default(Landroid/widget/ViewAnimator;Landroid/view/View;ZILjava/lang/Object;)Z

    invoke-direct {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->l()Z

    iget-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->i:Landroidx/activity/result/ActivityResultLauncher;

    sget-object v0, Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;->INSTANCE:Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;

    sget-object v1, Lmobi/drupe/app/Keys;->INSTANCE:Lmobi/drupe/app/Keys;

    invoke-virtual {v1}, Lmobi/drupe/app/Keys;->getSERVER_CLIENT_ID()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v0, p0, v1}, Lme/sync/caller_id_sdk/publics/GoogleLoginHelper;->prepareIntent(Landroid/content/Context;Ljava/lang/String;)Landroid/content/Intent;

    move-result-object p0

    invoke-virtual {p1, p0}, Landroidx/activity/result/ActivityResultLauncher;->launch(Ljava/lang/Object;)V

    goto/16 :goto_2

    :cond_3
    instance-of v0, p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NeedUserConfirmation;

    const v4, 0x7f060031

    if-eqz v0, :cond_5

    check-cast p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NeedUserConfirmation;

    invoke-virtual {p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$NeedUserConfirmation;->getGoogleToken()Ljava/lang/String;

    move-result-object p1

    iput-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->b:Ljava/lang/String;

    iget-boolean p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->f:Z

    if-nez p1, :cond_4

    invoke-direct {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->l()Z

    const/4 p1, 0x1

    iput-boolean p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->f:Z

    :cond_4
    invoke-virtual {p0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;

    move-result-object p1

    new-instance v0, Landroid/graphics/drawable/ColorDrawable;

    invoke-static {p0, v4}, Lmobi/drupe/app/utils/AppComponentsHelperKt;->getColorCompat(Landroid/content/Context;I)I

    move-result v4

    invoke-direct {v0, v4}, Landroid/graphics/drawable/ColorDrawable;-><init>(I)V

    invoke-virtual {p1, v0}, Landroid/view/Window;->setBackgroundDrawable(Landroid/graphics/drawable/Drawable;)V

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->viewSwitcher:Landroid/widget/ViewAnimator;

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p0

    check-cast p0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p0, p0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->contactsUploadTutorial:Landroidx/constraintlayout/widget/ConstraintLayout;

    goto :goto_1

    :cond_5
    instance-of v0, p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$DuringRegistration;

    if-eqz v0, :cond_6

    invoke-virtual {p0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;

    move-result-object p1

    new-instance v0, Landroid/graphics/drawable/ColorDrawable;

    invoke-static {p0, v4}, Lmobi/drupe/app/utils/AppComponentsHelperKt;->getColorCompat(Landroid/content/Context;I)I

    move-result v4

    invoke-direct {v0, v4}, Landroid/graphics/drawable/ColorDrawable;-><init>(I)V

    invoke-virtual {p1, v0}, Landroid/view/Window;->setBackgroundDrawable(Landroid/graphics/drawable/Drawable;)V

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->viewSwitcher:Landroid/widget/ViewAnimator;

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p0

    check-cast p0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p0, p0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->uploadingContacts:Landroid/widget/LinearLayout;

    goto/16 :goto_1

    :cond_6
    sget-object v0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$DoneWithRegistration;->INSTANCE:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$DoneWithRegistration;

    invoke-static {p1, v0}, Lkotlin/jvm/internal/Intrinsics;->areEqual(Ljava/lang/Object;Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_8

    invoke-static {p0}, Lmobi/drupe/app/CallerIdManager;->isSupportedInUserCountry(Landroid/content/Context;)Z

    move-result p1

    if-nez p1, :cond_7

    const p1, 0x7f12041a

    invoke-static {p0, p1, v3}, Lmobi/drupe/app/repository/Repository;->setBoolean(Landroid/content/Context;IZ)V

    :cond_7
    invoke-virtual {p0}, Landroid/app/Activity;->finish()V

    goto :goto_2

    :cond_8
    instance-of p1, p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$State$ErrorInRegistration;

    if-eqz p1, :cond_9

    invoke-virtual {p0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;

    move-result-object p1

    new-instance v0, Landroid/graphics/drawable/ColorDrawable;

    invoke-static {p0, v4}, Lmobi/drupe/app/utils/AppComponentsHelperKt;->getColorCompat(Landroid/content/Context;I)I

    move-result v4

    invoke-direct {v0, v4}, Landroid/graphics/drawable/ColorDrawable;-><init>(I)V

    invoke-virtual {p1, v0}, Landroid/view/Window;->setBackgroundDrawable(Landroid/graphics/drawable/Drawable;)V

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->viewSwitcher:Landroid/widget/ViewAnimator;

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p0

    check-cast p0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p0, p0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->registrationError:Landroidx/core/widget/NestedScrollView;

    goto/16 :goto_1

    :cond_9
    :goto_2
    return-void
.end method

.method private static final n(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroid/view/View;)V
    .locals 1

    sget-object p1, Ljava/lang/Boolean;->TRUE:Ljava/lang/Boolean;

    iput-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->c:Ljava/lang/Boolean;

    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->b:Ljava/lang/String;

    invoke-direct {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->l()Z

    iget-object p0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->d:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

    if-nez p0, :cond_0

    const/4 p0, 0x0

    :cond_0
    invoke-virtual {p0, p1, v0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->register(Ljava/lang/Boolean;Ljava/lang/String;)V

    return-void
.end method

.method private static final o(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroid/view/View;)V
    .locals 3

    new-instance p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$DeclineUploadContactsDialogFragment;

    invoke-direct {p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity$DeclineUploadContactsDialogFragment;-><init>()V

    invoke-static {p1}, Lmobi/drupe/app/utils/AppComponentsHelperKt;->argumentsSafe(Landroidx/fragment/app/Fragment;)Landroid/os/Bundle;

    move-result-object v0

    invoke-direct {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->l()Z

    move-result v1

    const-string v2, "EXTRA_IS_DURING_ONBOARDING"

    invoke-virtual {v0, v2, v1}, Landroid/os/Bundle;->putBoolean(Ljava/lang/String;Z)V

    const/4 v0, 0x0

    const/4 v1, 0x2

    invoke-static {p1, p0, v0, v1, v0}, Lmobi/drupe/app/utils/AppComponentsHelperKt;->showAllowStateLoss$default(Landroidx/fragment/app/DialogFragment;Landroidx/fragment/app/FragmentActivity;Ljava/lang/String;ILjava/lang/Object;)Z

    return-void
.end method

.method private static final p(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroid/view/View;)V
    .locals 1

    iget-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->d:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

    if-nez p1, :cond_0

    const/4 p1, 0x0

    :cond_0
    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->c:Ljava/lang/Boolean;

    iget-object p0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->b:Ljava/lang/String;

    invoke-virtual {p1, v0, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->register(Ljava/lang/Boolean;Ljava/lang/String;)V

    return-void
.end method

.method private static final q(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Ljava/util/Map;)V
    .locals 0

    invoke-static {p0}, Lmobi/drupe/app/activities/permissions/Permissions;->hasContactsPermission(Landroid/content/Context;)Z

    move-result p1

    if-eqz p1, :cond_1

    iget-object p0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->d:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

    if-nez p0, :cond_0

    const/4 p0, 0x0

    :cond_0
    invoke-virtual {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->onGotRequiredPermissions()V

    goto :goto_0

    :cond_1
    const p1, 0x7f1203a9

    invoke-static {p0, p1}, Lmobi/drupe/app/views/DrupeToast;->showErrorToast(Landroid/content/Context;I)V

    invoke-virtual {p0}, Landroid/app/Activity;->finish()V

    :goto_0
    return-void
.end method

.method private static final r(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;Landroidx/activity/result/ActivityResult;)V
    .locals 0

    invoke-direct {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->l()Z

    iget-object p0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->d:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

    if-nez p0, :cond_0

    const/4 p0, 0x0

    :cond_0
    invoke-virtual {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->onReturnedFromGoogleLogin()V

    return-void
.end method


# virtual methods
.method public onCreate(Landroid/os/Bundle;)V
    .locals 4

    invoke-super {p0, p1}, Lmobi/drupe/app/ui/BoundActivity;->onCreate(Landroid/os/Bundle;)V

    invoke-direct {p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->l()Z

    move-result v0

    if-nez v0, :cond_0

    invoke-virtual {p0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;

    move-result-object v0

    new-instance v1, Landroid/graphics/drawable/ColorDrawable;

    const v2, 0x7f060031

    invoke-static {p0, v2}, Lmobi/drupe/app/utils/AppComponentsHelperKt;->getColorCompat(Landroid/content/Context;I)I

    move-result v2

    invoke-direct {v1, v2}, Landroid/graphics/drawable/ColorDrawable;-><init>(I)V

    invoke-virtual {v0, v1}, Landroid/view/Window;->setBackgroundDrawable(Landroid/graphics/drawable/Drawable;)V

    :cond_0
    const/4 v0, 0x0

    if-eqz p1, :cond_2

    const-string v1, "SAVED_STATE__HAS_REPORTED_SEEING_CONTACTS_UPLOAD_TUTORIAL"

    invoke-virtual {p1, v1, v0}, Landroid/os/Bundle;->getBoolean(Ljava/lang/String;Z)Z

    move-result v1

    iput-boolean v1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->f:Z

    const-string v1, "SAVED_STATE__GOOGLE_TOKEN"

    invoke-virtual {p1, v1}, Landroid/os/BaseBundle;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    iput-object v1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->b:Ljava/lang/String;

    const-string v1, "SAVED_STATE__USER_ACCEPTED_TO_UPLOAD_CONTACTS"

    invoke-virtual {p1, v1}, Landroid/os/BaseBundle;->containsKey(Ljava/lang/String;)Z

    move-result v2

    if-eqz v2, :cond_1

    invoke-virtual {p1, v1}, Landroid/os/Bundle;->getBoolean(Ljava/lang/String;)Z

    move-result p1

    invoke-static {p1}, Ljava/lang/Boolean;->valueOf(Z)Ljava/lang/Boolean;

    move-result-object p1

    goto :goto_0

    :cond_1
    iget-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->c:Ljava/lang/Boolean;

    :goto_0
    iput-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->c:Ljava/lang/Boolean;

    :cond_2
    new-instance p1, Landroidx/lifecycle/ViewModelProvider;

    invoke-direct {p1, p0}, Landroidx/lifecycle/ViewModelProvider;-><init>(Landroidx/lifecycle/ViewModelStoreOwner;)V

    const-class v1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

    invoke-virtual {p1, v1}, Landroidx/lifecycle/ViewModelProvider;->get(Ljava/lang/Class;)Landroidx/lifecycle/ViewModel;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

    iput-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->d:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->viewSwitcher:Landroid/widget/ViewAnimator;

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object v1

    check-cast v1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object v1, v1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->loaderBeforeContactsUpload:Landroid/view/View;

    const/4 v2, 0x2

    const/4 v3, 0x0

    invoke-static {p1, v1, v0, v2, v3}, Lmobi/drupe/app/utils/ViewUtilKt;->setViewToSwitchTo$default(Landroid/widget/ViewAnimator;Landroid/view/View;ZILjava/lang/Object;)Z

    iget-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->d:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

    if-nez p1, :cond_3

    move-object p1, v3

    :cond_3
    invoke-virtual {p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->init()V

    iget-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->d:Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;

    if-nez p1, :cond_4

    goto :goto_1

    :cond_4
    move-object v3, p1

    :goto_1
    invoke-virtual {v3}, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel;->getLiveData()Landroidx/lifecycle/MutableLiveData;

    move-result-object p1

    new-instance v1, Lmobi/drupe/app/activities/login_and_upload_contacts/f;

    invoke-direct {v1, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/f;-><init>(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;)V

    invoke-virtual {p1, p0, v1}, Landroidx/lifecycle/LiveData;->observe(Landroidx/lifecycle/LifecycleOwner;Landroidx/lifecycle/Observer;)V

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->acceptButton:Lcom/google/android/material/button/MaterialButton;

    new-instance v1, Lmobi/drupe/app/activities/login_and_upload_contacts/b;

    invoke-direct {v1, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/b;-><init>(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;)V

    invoke-virtual {p1, v1}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->declineButton:Lcom/google/android/material/button/MaterialButton;

    new-instance v1, Lmobi/drupe/app/activities/login_and_upload_contacts/a;

    invoke-direct {v1, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/a;-><init>(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;)V

    invoke-virtual {p1, v1}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->tryAgainButton:Lcom/google/android/material/button/MaterialButton;

    new-instance v1, Lmobi/drupe/app/activities/login_and_upload_contacts/c;

    invoke-direct {v1, p0}, Lmobi/drupe/app/activities/login_and_upload_contacts/c;-><init>(Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;)V

    invoke-virtual {p1, v1}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object p1

    check-cast p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object p1, p1, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->descTextView:Landroid/widget/TextView;

    const v1, 0x7f120096

    invoke-virtual {p0, v1}, Landroid/content/Context;->getString(I)Ljava/lang/String;

    move-result-object v1

    invoke-static {v1, v0}, Landroidx/core/text/HtmlCompat;->fromHtml(Ljava/lang/String;I)Landroid/text/Spanned;

    move-result-object v0

    invoke-virtual {p1, v0}, Landroid/widget/TextView;->setText(Ljava/lang/CharSequence;)V

    sget-object p1, Lmobi/drupe/app/utils/ViewUtil;->INSTANCE:Lmobi/drupe/app/utils/ViewUtil;

    invoke-virtual {p0}, Lmobi/drupe/app/ui/BoundActivity;->getBinding()Landroidx/viewbinding/ViewBinding;

    move-result-object v0

    check-cast v0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;

    iget-object v0, v0, Lmobi/drupe/app/databinding/ActivityLoginAndUploadContactsBinding;->descTextView:Landroid/widget/TextView;

    invoke-virtual {p1, v0, p0}, Lmobi/drupe/app/utils/ViewUtil;->linkifyTextView(Landroid/widget/TextView;Landroid/app/Activity;)V

    return-void
.end method

.method public onSaveInstanceState(Landroid/os/Bundle;)V
    .locals 2

    invoke-super {p0, p1}, Landroidx/activity/ComponentActivity;->onSaveInstanceState(Landroid/os/Bundle;)V

    iget-boolean v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->f:Z

    const-string v1, "SAVED_STATE__HAS_REPORTED_SEEING_CONTACTS_UPLOAD_TUTORIAL"

    invoke-virtual {p1, v1, v0}, Landroid/os/Bundle;->putBoolean(Ljava/lang/String;Z)V

    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->c:Ljava/lang/Boolean;

    if-eqz v0, :cond_0

    invoke-virtual {v0}, Ljava/lang/Boolean;->booleanValue()Z

    move-result v0

    const-string v1, "SAVED_STATE__USER_ACCEPTED_TO_UPLOAD_CONTACTS"

    invoke-virtual {p1, v1, v0}, Landroid/os/Bundle;->putBoolean(Ljava/lang/String;Z)V

    :cond_0
    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivity;->b:Ljava/lang/String;

    if-eqz v0, :cond_1

    const-string v1, "SAVED_STATE__GOOGLE_TOKEN"

    invoke-virtual {p1, v1, v0}, Landroid/os/BaseBundle;->putString(Ljava/lang/String;Ljava/lang/String;)V

    :cond_1
    return-void
.end method
