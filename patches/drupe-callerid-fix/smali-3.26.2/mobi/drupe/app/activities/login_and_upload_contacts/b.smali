.class public final Lmobi/drupe/app/activities/login_and_upload_contacts/b;
.super Lkotlin/coroutines/jvm/internal/SuspendLambda;
.source "LoginAndUploadContactsActivityViewModel.kt"

# interfaces
.implements Lkotlin/jvm/functions/Function2;


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lmobi/drupe/app/activities/login_and_upload_contacts/b$a;
    }
.end annotation

.annotation system Ldalvik/annotation/Signature;
    value = {
        "Lkotlin/coroutines/jvm/internal/SuspendLambda;",
        "Lkotlin/jvm/functions/Function2<",
        "Ldr/k0;",
        "Lkotlin/coroutines/Continuation<",
        "-",
        "Lkotlin/Unit;",
        ">;",
        "Ljava/lang/Object;",
        ">;"
    }
.end annotation

.annotation runtime Lkotlin/coroutines/jvm/internal/DebugMetadata;
    c = "mobi.drupe.app.activities.login_and_upload_contacts.LoginAndUploadContactsActivityViewModel$register$1$1"
    f = "LoginAndUploadContactsActivityViewModel.kt"
    l = {
        0x84
    }
    m = "invokeSuspend"
    v = 0x1
.end annotation

.annotation build Lkotlin/jvm/internal/SourceDebugExtension;
    value = {
        "SMAP\nLoginAndUploadContactsActivityViewModel.kt\nKotlin\n*S Kotlin\n*F\n+ 1 LoginAndUploadContactsActivityViewModel.kt\nmobi/drupe/app/activities/login_and_upload_contacts/LoginAndUploadContactsActivityViewModel$register$1$1\n+ 2 fake.kt\nkotlin/jvm/internal/FakeKt\n*L\n1#1,200:1\n1#2:201\n*E\n"
    }
.end annotation


# instance fields
.field public s:I

.field public synthetic t:Ljava/lang/Object;

.field public final synthetic u:Ljava/lang/String;

.field public final synthetic v:Lmobi/drupe/app/activities/login_and_upload_contacts/a;


# direct methods
.method public constructor <init>(Ljava/lang/String;Lmobi/drupe/app/activities/login_and_upload_contacts/a;Lkotlin/coroutines/Continuation;)V
    .locals 0
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Ljava/lang/String;",
            "Lmobi/drupe/app/activities/login_and_upload_contacts/a;",
            "Lkotlin/coroutines/Continuation<",
            "-",
            "Lmobi/drupe/app/activities/login_and_upload_contacts/b;",
            ">;)V"
        }
    .end annotation

    .line 1
    iput-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->u:Ljava/lang/String;

    .line 2
    .line 3
    iput-object p2, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->v:Lmobi/drupe/app/activities/login_and_upload_contacts/a;

    .line 4
    .line 5
    const/4 p1, 0x2

    .line 6
    invoke-direct {p0, p1, p3}, Lkotlin/coroutines/jvm/internal/SuspendLambda;-><init>(ILkotlin/coroutines/Continuation;)V

    .line 7
    .line 8
    .line 9
    return-void
.end method


# virtual methods
.method public final create(Ljava/lang/Object;Lkotlin/coroutines/Continuation;)Lkotlin/coroutines/Continuation;
    .locals 3
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Ljava/lang/Object;",
            "Lkotlin/coroutines/Continuation<",
            "*>;)",
            "Lkotlin/coroutines/Continuation<",
            "Lkotlin/Unit;",
            ">;"
        }
    .end annotation

    .line 1
    new-instance v0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;

    .line 2
    .line 3
    iget-object v1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->u:Ljava/lang/String;

    .line 4
    .line 5
    iget-object v2, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->v:Lmobi/drupe/app/activities/login_and_upload_contacts/a;

    .line 6
    .line 7
    invoke-direct {v0, v1, v2, p2}, Lmobi/drupe/app/activities/login_and_upload_contacts/b;-><init>(Ljava/lang/String;Lmobi/drupe/app/activities/login_and_upload_contacts/a;Lkotlin/coroutines/Continuation;)V

    .line 8
    .line 9
    .line 10
    iput-object p1, v0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->t:Ljava/lang/Object;

    .line 11
    .line 12
    return-object v0
.end method

.method public final invoke(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
    .locals 0

    .line 1
    check-cast p1, Ldr/k0;

    .line 2
    .line 3
    check-cast p2, Lkotlin/coroutines/Continuation;

    .line 4
    .line 5
    invoke-virtual {p0, p1, p2}, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->create(Ljava/lang/Object;Lkotlin/coroutines/Continuation;)Lkotlin/coroutines/Continuation;

    .line 6
    .line 7
    .line 8
    move-result-object p1

    .line 9
    check-cast p1, Lmobi/drupe/app/activities/login_and_upload_contacts/b;

    .line 10
    .line 11
    sget-object p2, Lkotlin/Unit;->a:Lkotlin/Unit;

    .line 12
    .line 13
    invoke-virtual {p1, p2}, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->invokeSuspend(Ljava/lang/Object;)Ljava/lang/Object;

    .line 14
    .line 15
    .line 16
    move-result-object p1

    .line 17
    return-object p1
.end method

.method public final invokeSuspend(Ljava/lang/Object;)Ljava/lang/Object;
    .locals 5

    .line 1
    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->t:Ljava/lang/Object;

    .line 2
    .line 3
    check-cast v0, Ldr/k0;

    .line 4
    .line 5
    sget-object v1, Lkotlin/coroutines/intrinsics/CoroutineSingletons;->COROUTINE_SUSPENDED:Lkotlin/coroutines/intrinsics/CoroutineSingletons;

    .line 6
    .line 7
    iget v2, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->s:I

    .line 8
    .line 9
    const/4 v3, 0x1

    .line 10
    if-eqz v2, :cond_1

    .line 11
    .line 12
    if-ne v2, v3, :cond_0

    .line 13
    .line 14
    invoke-static {p1}, Lkotlin/ResultKt;->b(Ljava/lang/Object;)V

    .line 15
    .line 16
    .line 17
    goto :goto_0

    .line 18
    :cond_0
    new-instance p1, Ljava/lang/IllegalStateException;

    .line 19
    .line 20
    const-string v0, "call to \'resume\' before \'invoke\' with coroutine"

    .line 21
    .line 22
    invoke-direct {p1, v0}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    .line 23
    .line 24
    .line 25
    throw p1

    .line 26
    :cond_1
    invoke-static {p1}, Lkotlin/ResultKt;->b(Ljava/lang/Object;)V

    .line 27
    .line 28
    .line 29
    sget-object p1, Lapp/cleared/callerid/sdk/CallerIdSdk;->Companion:Lapp/cleared/callerid/sdk/CallerIdSdk$Companion;

    .line 30
    .line 31
    invoke-virtual {p1}, Lapp/cleared/callerid/sdk/CallerIdSdk$Companion;->getInstance()Lapp/cleared/callerid/sdk/CallerIdSdk;

    .line 32
    .line 33
    .line 34
    move-result-object p1

    .line 35
    iget-object v2, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->u:Ljava/lang/String;

    .line 36
    .line 37
    iput-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->t:Ljava/lang/Object;

    .line 38
    .line 39
    iput v3, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->s:I

    .line 40
    .line 41
    invoke-interface {p1, v2, p0}, Lapp/cleared/callerid/sdk/CallerIdSdk;->register(Ljava/lang/String;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;

    .line 42
    .line 43
    .line 44
    move-result-object p1

    .line 45
    if-ne p1, v1, :cond_2

    .line 46
    .line 47
    return-object v1

    .line 48
    :cond_2
    :goto_0
    check-cast p1, Lapp/cleared/callerid/sdk/result/RegisterResult;

    .line 49
    .line 50
    sget-object v0, Lapp/cleared/callerid/sdk/result/RegisterResult$Success;->INSTANCE:Lapp/cleared/callerid/sdk/result/RegisterResult$Success;

    .line 51
    .line 52
    invoke-static {p1, v0}, Lkotlin/jvm/internal/Intrinsics;->areEqual(Ljava/lang/Object;Ljava/lang/Object;)Z

    .line 53
    .line 54
    .line 55
    move-result v0

    .line 56
    const/4 v1, 0x0

    .line 57
    if-eqz v0, :cond_4

    .line 58
    .line 59
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 60
    .line 61
    if-nez p1, :cond_3

    .line 62
    .line 63
    const-string p1, "deps"

    .line 64
    .line 65
    invoke-static {p1}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 66
    .line 67
    .line 68
    goto :goto_1

    .line 69
    :cond_3
    move-object v1, p1

    .line 70
    :goto_1
    invoke-virtual {v1}, Ldu/e0;->h()Lgv/a;

    .line 71
    .line 72
    .line 73
    move-result-object p1

    .line 74
    invoke-interface {p1, v3}, Lgv/a;->r(Z)V

    .line 75
    .line 76
    .line 77
    sget-object p1, Lapp/cleared/callerid/sdk/CallerIdSdk;->Companion:Lapp/cleared/callerid/sdk/CallerIdSdk$Companion;

    .line 78
    .line 79
    invoke-virtual {p1}, Lapp/cleared/callerid/sdk/CallerIdSdk$Companion;->getInstance()Lapp/cleared/callerid/sdk/CallerIdSdk;

    .line 80
    .line 81
    .line 82
    move-result-object p1

    .line 83
    invoke-interface {p1}, Lapp/cleared/callerid/sdk/CallerIdSdk;->checkTopSpammers()V

    .line 84
    .line 85
    .line 86
    iget-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->v:Lmobi/drupe/app/activities/login_and_upload_contacts/a;

    .line 87
    .line 88
    iget-object p1, p1, Lmobi/drupe/app/activities/login_and_upload_contacts/a;->c0:Landroidx/lifecycle/l0;

    .line 89
    .line 90
    sget-object v0, Lmobi/drupe/app/activities/login_and_upload_contacts/a$b$b;->a:Lmobi/drupe/app/activities/login_and_upload_contacts/a$b$b;

    .line 91
    .line 92
    invoke-virtual {p1, v0}, Landroidx/lifecycle/l0;->postValue(Ljava/lang/Object;)V

    .line 93
    .line 94
    .line 95
    goto/16 :goto_6

    .line 96
    .line 97
    :cond_4
    instance-of v0, p1, Lapp/cleared/callerid/sdk/result/RegisterResult$Failure;

    .line 98
    .line 99
    if-eqz v0, :cond_c

    .line 100
    .line 101
    check-cast p1, Lapp/cleared/callerid/sdk/result/RegisterResult$Failure;

    .line 102
    .line 103
    invoke-virtual {p1}, Lapp/cleared/callerid/sdk/result/RegisterResult$Failure;->getErrorType()Lapp/cleared/callerid/sdk/result/RegisterErrorType;

    .line 104
    .line 105
    .line 106
    move-result-object v0

    .line 107
    sget-object v2, Lmobi/drupe/app/activities/login_and_upload_contacts/b$a;->a:[I

    .line 108
    .line 109
    invoke-virtual {v0}, Ljava/lang/Enum;->ordinal()I

    .line 110
    .line 111
    .line 112
    move-result v0

    .line 113
    aget v0, v2, v0

    .line 114
    .line 115
  # Patched: skip BadGoogleToken logout/re-login loop; fall through to normal failure handling
    goto :cond_5

    .line 149
    .line 150
    :cond_5
    sget-object v0, Lapp/cleared/caller_id_sdk/publics/GoogleLoginHelper;->INSTANCE:Lapp/cleared/caller_id_sdk/publics/GoogleLoginHelper;

    .line 151
    .line 152
    iget-object v2, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->v:Lmobi/drupe/app/activities/login_and_upload_contacts/a;

    .line 153
    .line 154
    iget-object v2, v2, Lpv/l;->Z:Landroid/content/Context;

    .line 155
    .line 156
    invoke-virtual {v0, v2}, Lapp/cleared/caller_id_sdk/publics/GoogleLoginHelper;->isLoggedIn(Landroid/content/Context;)Z

    .line 157
    .line 158
    .line 159
    move-result v0

    .line 160
    if-nez v0, :cond_6

    .line 161
    .line 162
    iget-object p1, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->v:Lmobi/drupe/app/activities/login_and_upload_contacts/a;

    .line 163
    .line 164
    invoke-virtual {p1}, Lmobi/drupe/app/activities/login_and_upload_contacts/a;->X()V

    .line 165
    .line 166
    .line 167
    goto/16 :goto_6

    .line 168
    .line 169
    :cond_6
    sget-object v0, Lrv/c;->a:Lrv/c;

    .line 170
    .line 171
    new-instance v2, Ljava/lang/StringBuilder;

    .line 172
    .line 173
    const-string v4, "Registration failed: errorType="

    .line 174
    .line 175
    invoke-direct {v2, v4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    .line 176
    .line 177
    .line 178
    invoke-virtual {p1}, Lapp/cleared/callerid/sdk/result/RegisterResult$Failure;->getErrorType()Lapp/cleared/callerid/sdk/result/RegisterErrorType;

    .line 179
    .line 180
    .line 181
    move-result-object v4

    .line 182
    invoke-virtual {v2, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    .line 183
    .line 184
    .line 185
    const-string v4, ", serverErrorCode="

    .line 186
    .line 187
    invoke-virtual {v2, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    .line 188
    .line 189
    .line 190
    invoke-virtual {p1}, Lapp/cleared/callerid/sdk/result/RegisterResult$Failure;->getCode()I

    .line 191
    .line 192
    .line 193
    move-result v4

    .line 194
    invoke-virtual {v2, v4}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    .line 195
    .line 196
    .line 197
    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    .line 198
    .line 199
    .line 200
    move-result-object v2

    .line 201
    invoke-static {v0, v2}, Lrv/c;->d(Lrv/c;Ljava/lang/String;)V

    .line 202
    .line 203
    .line 204
    iget-object v0, p0, Lmobi/drupe/app/activities/login_and_upload_contacts/b;->v:Lmobi/drupe/app/activities/login_and_upload_contacts/a;

    .line 205
    .line 206
    iget-object v0, v0, Lmobi/drupe/app/activities/login_and_upload_contacts/a;->c0:Landroidx/lifecycle/l0;

    .line 207
    .line 208
    invoke-virtual {p1}, Lapp/cleared/callerid/sdk/result/RegisterResult$Failure;->getCode()I

    .line 209
    .line 210
    .line 211
    move-result v2

    .line 212
    invoke-static {v2}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    .line 213
    .line 214
    .line 215
    move-result-object v4

    .line 216
    if-lez v2, :cond_7

    .line 217
    .line 218
    goto :goto_3

    .line 219
    :cond_7
    move-object v4, v1

    .line 220
    :goto_3
    invoke-virtual {p1}, Lapp/cleared/callerid/sdk/result/RegisterResult$Failure;->getErrorType()Lapp/cleared/callerid/sdk/result/RegisterErrorType;

    .line 221
    .line 222
    .line 223
    move-result-object p1

    .line 224
    sget-object v2, Lmobi/drupe/app/activities/login_and_upload_contacts/a$c;->a:[I

    .line 225
    .line 226
    invoke-virtual {p1}, Ljava/lang/Enum;->ordinal()I

    .line 227
    .line 228
    .line 229
    move-result p1

    .line 230
    aget p1, v2, p1

    .line 231
    .line 232
    if-ne p1, v3, :cond_a

    .line 233
    .line 234
    new-instance p1, Lmobi/drupe/app/activities/login_and_upload_contacts/a$b$d;

    .line 235
    .line 236
    const/16 v1, 0x69

    .line 237
    .line 238
    if-eqz v4, :cond_8

    .line 239
    .line 240
    invoke-virtual {v4}, Ljava/lang/Integer;->intValue()I

    .line 241
    .line 242
    .line 243
    move-result v2

    .line 244
    goto :goto_4

    .line 245
    :cond_8
    move v2, v1

    .line 246
    :goto_4
    invoke-static {v2}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    .line 247
    .line 248
    .line 249
    move-result-object v2

    .line 250
    filled-new-array {v2}, [Ljava/lang/Object;

    .line 251
    .line 252
    .line 253
    move-result-object v2

    .line 254
    if-eqz v4, :cond_9

    .line 255
    .line 256
    invoke-virtual {v4}, Ljava/lang/Integer;->intValue()I

    .line 257
    .line 258
    .line 259
    move-result v1

    .line 260
    :cond_9
    invoke-static {v1}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    .line 261
    .line 262
    .line 263
    move-result-object v1

    .line 264
    const v3, 0x7f1300b1

    .line 265
    .line 266
    .line 267
    invoke-direct {p1, v3, v2, v1}, Lmobi/drupe/app/activities/login_and_upload_contacts/a$b$d;-><init>(I[Ljava/lang/Object;Ljava/lang/Integer;)V

    .line 268
    .line 269
    .line 270
    goto :goto_5

    .line 271
    :cond_a
    if-eqz v4, :cond_b

    .line 272
    .line 273
    new-instance p1, Lmobi/drupe/app/activities/login_and_upload_contacts/a$b$d;

    .line 274
    .line 275
    const v1, 0x7f1300b2

    .line 276
    .line 277
    .line 278
    filled-new-array {v4}, [Ljava/lang/Object;

    .line 279
    .line 280
    .line 281
    move-result-object v2

    .line 282
    invoke-direct {p1, v1, v2, v4}, Lmobi/drupe/app/activities/login_and_upload_contacts/a$b$d;-><init>(I[Ljava/lang/Object;Ljava/lang/Integer;)V

    .line 283
    .line 284
    .line 285
    goto :goto_5

    .line 286
    :cond_b
    new-instance p1, Lmobi/drupe/app/activities/login_and_upload_contacts/a$b$d;

    .line 287
    .line 288
    const/4 v2, 0x0

    .line 289
    new-array v2, v2, [Ljava/lang/Object;

    .line 290
    .line 291
    const v3, 0x7f1300b0

    .line 292
    .line 293
    .line 294
    invoke-direct {p1, v3, v2, v1}, Lmobi/drupe/app/activities/login_and_upload_contacts/a$b$d;-><init>(I[Ljava/lang/Object;Ljava/lang/Integer;)V

    .line 295
    .line 296
    .line 297
    :goto_5
    invoke-virtual {v0, p1}, Landroidx/lifecycle/l0;->postValue(Ljava/lang/Object;)V

    .line 298
    .line 299
    .line 300
    :goto_6
    sget-object p1, Lkotlin/Unit;->a:Lkotlin/Unit;

    .line 301
    .line 302
    return-object p1

    .line 303
    :cond_c
    new-instance p1, Lkotlin/NoWhenBranchMatchedException;

    .line 304
    .line 305
    invoke-direct {p1}, Lkotlin/NoWhenBranchMatchedException;-><init>()V

    .line 306
    .line 307
    .line 308
    throw p1
.end method
