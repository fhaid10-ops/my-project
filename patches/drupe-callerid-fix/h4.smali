.class public final Luu/h4;
.super Ljava/lang/Object;
.source "UpgradeManager.kt"


# instance fields
.field public final a:Landroid/content/Context;
    .annotation build Lorg/jetbrains/annotations/NotNull;
    .end annotation
.end field


# direct methods
.method public constructor <init>(Landroid/content/Context;)V
    .locals 1
    .param p1    # Landroid/content/Context;
        .annotation build Lorg/jetbrains/annotations/NotNull;
        .end annotation
    .end param

    .line 1
    const-string v0, "context"

    .line 2
    .line 3
    invoke-static {p1, v0}, Lkotlin/jvm/internal/Intrinsics;->checkNotNullParameter(Ljava/lang/Object;Ljava/lang/String;)V

    .line 4
    .line 5
    .line 6
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 7
    .line 8
    .line 9
    iput-object p1, p0, Luu/h4;->a:Landroid/content/Context;

    .line 10
    .line 11
    return-void
.end method


# virtual methods
.method public final a(Lkotlin/coroutines/jvm/internal/ContinuationImpl;)Ljava/lang/Object;
    .locals 10
    .param p1    # Lkotlin/coroutines/jvm/internal/ContinuationImpl;
        .annotation build Lorg/jetbrains/annotations/NotNull;
        .end annotation
    .end param
    .annotation build Lorg/jetbrains/annotations/Nullable;
    .end annotation

    .line 1
    sget-object v0, Ldu/g0;->a:Ldu/g0;

    .line 2
    .line 3
    instance-of v1, p1, Luu/f4;

    .line 4
    .line 5
    if-eqz v1, :cond_0

    .line 6
    .line 7
    move-object v1, p1

    .line 8
    check-cast v1, Luu/f4;

    .line 9
    .line 10
    iget v2, v1, Luu/f4;->u:I

    .line 11
    .line 12
    const/high16 v3, -0x80000000

    .line 13
    .line 14
    and-int v4, v2, v3

    .line 15
    .line 16
    if-eqz v4, :cond_0

    .line 17
    .line 18
    sub-int/2addr v2, v3

    .line 19
    iput v2, v1, Luu/f4;->u:I

    .line 20
    .line 21
    goto :goto_0

    .line 22
    :cond_0
    new-instance v1, Luu/f4;

    .line 23
    .line 24
    invoke-direct {v1, p0, p1}, Luu/f4;-><init>(Luu/h4;Lkotlin/coroutines/jvm/internal/ContinuationImpl;)V

    .line 25
    .line 26
    .line 27
    :goto_0
    iget-object p1, v1, Luu/f4;->s:Ljava/lang/Object;

    .line 28
    .line 29
    sget-object v2, Lkotlin/coroutines/intrinsics/CoroutineSingletons;->COROUTINE_SUSPENDED:Lkotlin/coroutines/intrinsics/CoroutineSingletons;

    .line 30
    .line 31
    iget v3, v1, Luu/f4;->u:I

    .line 32
    .line 33
    const/16 v4, 0x1a

    .line 34
    .line 35
    const-string v5, "deps"

    .line 36
    .line 37
    const/4 v6, 0x0

    .line 38
    const/4 v7, 0x0

    .line 39
    const/4 v8, 0x1

    .line 40
    if-eqz v3, :cond_2

    .line 41
    .line 42
    if-ne v3, v8, :cond_1

    .line 43
    .line 44
    invoke-static {p1}, Lkotlin/ResultKt;->b(Ljava/lang/Object;)V

    .line 45
    .line 46
    .line 47
    goto/16 :goto_3

    .line 48
    .line 49
    :cond_1
    new-instance p1, Ljava/lang/IllegalStateException;

    .line 50
    .line 51
    const-string v0, "call to \'resume\' before \'invoke\' with coroutine"

    .line 52
    .line 53
    invoke-direct {p1, v0}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    .line 54
    .line 55
    .line 56
    throw p1

    .line 57
    :cond_2
    invoke-static {p1}, Lkotlin/ResultKt;->b(Ljava/lang/Object;)V

    .line 58
    .line 59
    .line 60
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 61
    .line 62
    if-nez p1, :cond_3

    .line 63
    .line 64
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 65
    .line 66
    .line 67
    move-object p1, v6

    .line 68
    :cond_3
    invoke-virtual {p1}, Ldu/e0;->h()Lgv/a;

    .line 69
    .line 70
    .line 71
    move-result-object p1

    .line 72
    const v3, 0x11f703d0

    .line 73
    .line 74
    .line 75
    invoke-interface {p1, v3, v7}, Lgv/a;->m(IZ)Z

    .line 76
    .line 77
    .line 78
    move-result p1

    .line 79
    if-eqz p1, :cond_5

    .line 80
    .line 81
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 82
    .line 83
    if-nez p1, :cond_4

    .line 84
    .line 85
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 86
    .line 87
    .line 88
    move-object p1, v6

    .line 89
    :cond_4
    invoke-virtual {p1}, Ldu/e0;->h()Lgv/a;

    .line 90
    .line 91
    .line 92
    move-result-object p1

    .line 93
    const v3, 0x7f130659

    .line 94
    .line 95
    .line 96
    invoke-interface {p1, v3, v7}, Lgv/a;->setBoolean(IZ)V

    .line 97
    .line 98
    .line 99
    :cond_5
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 100
    .line 101
    if-nez p1, :cond_6

    .line 102
    .line 103
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 104
    .line 105
    .line 106
    move-object p1, v6

    .line 107
    :cond_6
    invoke-virtual {p1}, Ldu/e0;->h()Lgv/a;

    .line 108
    .line 109
    .line 110
    move-result-object p1

    .line 111
    const v3, 0x120c5e88

    .line 112
    .line 113
    .line 114
    invoke-interface {p1, v3, v7}, Lgv/a;->m(IZ)Z

    .line 115
    .line 116
    .line 117
    move-result p1

    .line 118
    if-eqz p1, :cond_8

    .line 119
    .line 120
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 121
    .line 122
    if-nez p1, :cond_7

    .line 123
    .line 124
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 125
    .line 126
    .line 127
    move-object p1, v6

    .line 128
    :cond_7
    invoke-virtual {p1}, Ldu/e0;->h()Lgv/a;

    .line 129
    .line 130
    .line 131
    move-result-object p1

    .line 132
    const v3, 0x7f1307f6

    .line 133
    .line 134
    .line 135
    const/4 v9, -0x1

    .line 136
    invoke-interface {p1, v3, v9}, Lgv/a;->K(II)V

    .line 137
    .line 138
    .line 139
    :cond_8
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 140
    .line 141
    .line 142
    move-result-object p1

    .line 143
    const v3, 0x1210f060

    .line 144
    .line 145
    .line 146
    invoke-interface {p1, v3, v7}, Lgv/a;->m(IZ)Z

    .line 147
    .line 148
    .line 149
    move-result p1

    .line 150
    if-nez p1, :cond_9

    .line 151
    .line 152
    goto :goto_2

    .line 153
    :cond_9
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 154
    .line 155
    .line 156
    move-result-object p1

    .line 157
    const v3, 0x7f1306ec

    .line 158
    .line 159
    .line 160
    invoke-interface {p1, v3}, Lgv/a;->getBoolean(I)Z

    .line 161
    .line 162
    .line 163
    move-result p1

    .line 164
    const v3, 0x7f1306e9

    .line 165
    .line 166
    .line 167
    if-eqz p1, :cond_b

    .line 168
    .line 169
    sget p1, Landroid/os/Build$VERSION;->SDK_INT:I

    .line 170
    .line 171
    if-lt p1, v4, :cond_a

    .line 172
    .line 173
    goto :goto_1

    .line 174
    :cond_a
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 175
    .line 176
    .line 177
    move-result-object p1

    .line 178
    const v9, 0x120f69c0

    .line 179
    .line 180
    .line 181
    invoke-interface {p1, v9, v7}, Lgv/a;->m(IZ)Z

    .line 182
    .line 183
    .line 184
    move-result p1

    .line 185
    if-eqz p1, :cond_c

    .line 186
    .line 187
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 188
    .line 189
    .line 190
    move-result-object p1

    .line 191
    const-string v9, "1"

    .line 192
    .line 193
    invoke-interface {p1, v3, v9}, Lgv/a;->d(ILjava/lang/String;)V

    .line 194
    .line 195
    .line 196
    goto :goto_2

    .line 197
    :cond_b
    :goto_1
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 198
    .line 199
    .line 200
    move-result-object p1

    .line 201
    const-string v9, "1"

    .line 202
    .line 203
    invoke-interface {p1, v3, v9}, Lgv/a;->d(ILjava/lang/String;)V

    .line 204
    .line 205
    .line 206
    sget p1, Landroid/os/Build$VERSION;->SDK_INT:I

    .line 207
    .line 208
    if-lt p1, v4, :cond_c

    .line 209
    .line 210
    invoke-virtual {v0}, Ldu/g0;->n()Lbs/p3;

    .line 211
    .line 212
    .line 213
    move-result-object p1

    .line 214
    iget-object v3, p0, Luu/h4;->a:Landroid/content/Context;

    .line 215
    .line 216
    invoke-interface {p1, v3, v8}, Lbs/p3;->p(Landroid/content/Context;Z)V

    .line 217
    .line 218
    .line 219
    :cond_c
    :goto_2
    iput v8, v1, Luu/f4;->u:I

    .line 220
    .line 221
    invoke-virtual {p0, v1}, Luu/h4;->b(Lkotlin/coroutines/jvm/internal/ContinuationImpl;)Ljava/lang/Object;

    .line 222
    .line 223
    .line 224
    move-result-object p1

    .line 225
    if-ne p1, v2, :cond_d

    .line 226
    .line 227
    return-object v2

    .line 228
    :cond_d
    :goto_3
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 229
    .line 230
    if-nez p1, :cond_e

    .line 231
    .line 232
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 233
    .line 234
    .line 235
    move-object p1, v6

    .line 236
    :cond_e
    invoke-virtual {p1}, Ldu/e0;->h()Lgv/a;

    .line 237
    .line 238
    .line 239
    move-result-object p1

    .line 240
    const v1, 0x1230fb8f

    .line 241
    .line 242
    .line 243
    invoke-interface {p1, v1, v8}, Lgv/a;->m(IZ)Z

    .line 244
    .line 245
    .line 246
    move-result p1

    .line 247
    if-eqz p1, :cond_11

    .line 248
    .line 249
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 250
    .line 251
    if-nez p1, :cond_f

    .line 252
    .line 253
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 254
    .line 255
    .line 256
    move-object p1, v6

    .line 257
    :cond_f
    invoke-virtual {p1}, Ldu/e0;->m()Lbs/f3;

    .line 258
    .line 259
    .line 260
    move-result-object p1

    .line 261
    invoke-interface {p1}, Lbs/f3;->c()Z

    .line 262
    .line 263
    .line 264
    move-result p1

    .line 265
    if-nez p1, :cond_11

    .line 266
    .line 267
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 268
    .line 269
    if-nez p1, :cond_10

    .line 270
    .line 271
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 272
    .line 273
    .line 274
    move-object p1, v6

    .line 275
    :cond_10
    invoke-virtual {p1}, Ldu/e0;->h()Lgv/a;

    .line 276
    .line 277
    .line 278
    move-result-object p1

    .line 279
    const v1, 0x7f130690

    .line 280
    .line 281
    .line 282
    invoke-interface {p1, v1, v7}, Lgv/a;->setBoolean(IZ)V

    .line 283
    .line 284
    .line 285
    :cond_11
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 286
    .line 287
    if-nez p1, :cond_12

    .line 288
    .line 289
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 290
    .line 291
    .line 292
    goto :goto_4

    .line 293
    :cond_12
    move-object v6, p1

    .line 294
    :goto_4
    invoke-virtual {v6}, Ldu/e0;->h()Lgv/a;

    .line 295
    .line 296
    .line 297
    move-result-object p1

    .line 298
    const v1, 0x1230fba5

    .line 299
    .line 300
    .line 301
    invoke-interface {p1, v1, v8}, Lgv/a;->m(IZ)Z

    .line 302
    .line 303
    .line 304
    move-result p1

    .line 305
    if-eqz p1, :cond_13

    .line 306
    .line 307
    sget p1, Landroid/os/Build$VERSION;->SDK_INT:I

    .line 308
    .line 309
    if-lt p1, v4, :cond_13

    .line 310
    .line 311
    iget-object v1, p0, Luu/h4;->a:Landroid/content/Context;

    .line 312
    .line 313
    new-instance v2, Lo3/l;

    .line 314
    .line 315
    invoke-direct {v2, v1}, Lo3/l;-><init>(Landroid/content/Context;)V

    .line 316
    .line 317
    .line 318
    if-lt p1, v4, :cond_13

    .line 319
    .line 320
    iget-object p1, v2, Lo3/l;->b:Landroid/app/NotificationManager;

    .line 321
    .line 322
    invoke-static {p1}, Lo3/l$a;->c(Landroid/app/NotificationManager;)V

    .line 323
    .line 324
    .line 325
    :cond_13
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 326
    .line 327
    .line 328
    move-result-object p1

    .line 329
    const v1, 0x1230fca5

    .line 330
    .line 331
    .line 332
    invoke-interface {p1, v1, v7}, Lgv/a;->m(IZ)Z

    .line 333
    .line 334
    .line 335
    move-result p1

    .line 336
    if-nez p1, :cond_14

    .line 337
    .line 338
    goto :goto_5

    .line 339
    :cond_14
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 340
    .line 341
    .line 342
    move-result-object p1

    .line 343
    const v1, 0x7f130638

    .line 344
    .line 345
    .line 346
    invoke-interface {p1, v1, v8}, Lgv/a;->setBoolean(IZ)V

    .line 347
    .line 348
    .line 349
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 350
    .line 351
    .line 352
    move-result-object p1

    .line 353
    const v1, 0x7f1306f6

    .line 354
    .line 355
    .line 356
    invoke-interface {p1, v1, v8}, Lgv/a;->setBoolean(IZ)V

    .line 357
    .line 358
    .line 359
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 360
    .line 361
    .line 362
    move-result-object p1

    .line 363
    const v1, 0x7f130737

    .line 364
    .line 365
    .line 366
    invoke-interface {p1, v1, v8}, Lgv/a;->setBoolean(IZ)V

    .line 367
    .line 368
    .line 369
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 370
    .line 371
    .line 372
    move-result-object p1

    .line 373
    const v1, 0x7f130735

    .line 374
    .line 375
    .line 376
    invoke-interface {p1, v1, v8}, Lgv/a;->setBoolean(IZ)V

    .line 377
    .line 378
    .line 379
    invoke-virtual {v0}, Ldu/g0;->h()Lgv/a;

    .line 380
    .line 381
    .line 382
    move-result-object p1

    .line 383
    const v0, 0x7f130667

    .line 384
    .line 385
    .line 386
    invoke-interface {p1, v0, v8}, Lgv/a;->setBoolean(IZ)V

    .line 387
    .line 388
    .line 389
    :goto_5
    sget-object p1, Lkotlin/Unit;->a:Lkotlin/Unit;

    .line 390
    .line 391
    return-object p1
.end method

.method public final b(Lkotlin/coroutines/jvm/internal/ContinuationImpl;)Ljava/lang/Object;
    .locals 8

    .line 1
    instance-of v0, p1, Luu/g4;

    .line 2
    .line 3
    if-eqz v0, :cond_0

    .line 4
    .line 5
    move-object v0, p1

    .line 6
    check-cast v0, Luu/g4;

    .line 7
    .line 8
    iget v1, v0, Luu/g4;->u:I

    .line 9
    .line 10
    const/high16 v2, -0x80000000

    .line 11
    .line 12
    and-int v3, v1, v2

    .line 13
    .line 14
    if-eqz v3, :cond_0

    .line 15
    .line 16
    sub-int/2addr v1, v2

    .line 17
    iput v1, v0, Luu/g4;->u:I

    .line 18
    .line 19
    goto :goto_0

    .line 20
    :cond_0
    new-instance v0, Luu/g4;

    .line 21
    .line 22
    invoke-direct {v0, p0, p1}, Luu/g4;-><init>(Luu/h4;Lkotlin/coroutines/jvm/internal/ContinuationImpl;)V

    .line 23
    .line 24
    .line 25
    :goto_0
    iget-object p1, v0, Luu/g4;->s:Ljava/lang/Object;

    .line 26
    .line 27
    sget-object v1, Lkotlin/coroutines/intrinsics/CoroutineSingletons;->COROUTINE_SUSPENDED:Lkotlin/coroutines/intrinsics/CoroutineSingletons;

    .line 28
    .line 29
    iget v2, v0, Luu/g4;->u:I

    .line 30
    .line 31
    const-string v3, "repo_drupe_bot_row_id"

    .line 32
    .line 33
    const/4 v4, 0x1

    .line 34
    const-string v5, "deps"

    .line 35
    .line 36
    const/4 v6, 0x0

    .line 37
    if-eqz v2, :cond_2

    .line 38
    .line 39
    if-ne v2, v4, :cond_1

    .line 40
    .line 41
    invoke-static {p1}, Lkotlin/ResultKt;->b(Ljava/lang/Object;)V

    .line 42
    .line 43
    .line 44
    goto :goto_1

    .line 45
    :cond_1
    new-instance p1, Ljava/lang/IllegalStateException;

    .line 46
    .line 47
    const-string v0, "call to \'resume\' before \'invoke\' with coroutine"

    .line 48
    .line 49
    invoke-direct {p1, v0}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    .line 50
    .line 51
    .line 52
    throw p1

    .line 53
    :cond_2
    invoke-static {p1}, Lkotlin/ResultKt;->b(Ljava/lang/Object;)V

    .line 54
    .line 55
    .line 56
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 57
    .line 58
    if-nez p1, :cond_3

    .line 59
    .line 60
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 61
    .line 62
    .line 63
    move-object p1, v6

    .line 64
    :cond_3
    invoke-virtual {p1}, Ldu/e0;->h()Lgv/a;

    .line 65
    .line 66
    .line 67
    move-result-object p1

    .line 68
    const v2, 0x1230fb82

    .line 69
    .line 70
    .line 71
    const/4 v7, 0x0

    .line 72
    invoke-interface {p1, v2, v7}, Lgv/a;->m(IZ)Z

    .line 73
    .line 74
    .line 75
    move-result p1

    .line 76
    if-nez p1, :cond_4

    .line 77
    .line 78
    sget-object p1, Lkotlin/Unit;->a:Lkotlin/Unit;

    .line 79
    .line 80
    return-object p1

    .line 81
    :cond_4
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 82
    .line 83
    if-nez p1, :cond_5

    .line 84
    .line 85
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 86
    .line 87
    .line 88
    move-object p1, v6

    .line 89
    :cond_5
    invoke-virtual {p1}, Ldu/e0;->h()Lgv/a;

    .line 90
    .line 91
    .line 92
    move-result-object p1

    .line 93
    invoke-interface {p1, v3}, Lgv/a;->k(Ljava/lang/String;)Ljava/lang/String;

    .line 94
    .line 95
    .line 96
    move-result-object p1

    .line 97
    sget-object v2, Ldu/g0;->b:Ldu/e0;

    .line 98
    .line 99
    if-nez v2, :cond_6

    .line 100
    .line 101
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 102
    .line 103
    .line 104
    move-object v2, v6

    .line 105
    :cond_6
    invoke-virtual {v2}, Ldu/e0;->A()Lau/s;

    .line 106
    .line 107
    .line 108
    move-result-object v2

    .line 109
    iput v4, v0, Luu/g4;->u:I

    .line 110
    .line 111
    invoke-interface {v2, p1, v0}, Lau/s;->C(Ljava/lang/String;Lkotlin/coroutines/jvm/internal/ContinuationImpl;)Ljava/lang/Object;

    .line 112
    .line 113
    .line 114
    move-result-object p1

    .line 115
    if-ne p1, v1, :cond_7

    .line 116
    .line 117
    return-object v1

    .line 118
    :cond_7
    :goto_1
    sget-object p1, Ldu/g0;->b:Ldu/e0;

    .line 119
    .line 120
    if-nez p1, :cond_8

    .line 121
    .line 122
    invoke-static {v5}, Lkotlin/jvm/internal/Intrinsics;->throwUninitializedPropertyAccessException(Ljava/lang/String;)V

    .line 123
    .line 124
    .line 125
    goto :goto_2

    .line 126
    :cond_8
    move-object v6, p1

    .line 127
    :goto_2
    invoke-virtual {v6}, Ldu/e0;->h()Lgv/a;

    .line 128
    .line 129
    .line 130
    move-result-object p1

    .line 131
    invoke-interface {p1, v3}, Lgv/a;->Q(Ljava/lang/String;)V

    .line 132
    .line 133
    .line 134
    sget-object p1, Lkotlin/Unit;->a:Lkotlin/Unit;

    .line 135
    .line 136
    return-object p1
.end method
