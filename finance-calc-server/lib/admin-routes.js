/**
 * واجهة برمجة لوحة التحكم الخارجية
 */
const path = require("path");
const express = require("express");
const CONFIG = require("../config");

function normalizePhoneParts(input = {}) {
  let phone = String(input.phone || input.phoneNumber || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
  let countryCode = String(input.countryCode || "+966").trim();
  if (!countryCode.startsWith("+")) countryCode = `+${countryCode}`;
  if (phone.startsWith("966") && phone.length > 9) {
    phone = phone.slice(3);
  }
  return { phone, countryCode };
}

function createAdminRouter(deps) {
  const {
    adminToken,
    sessions,
    drafts,
    pausedChats,
    sessionKey,
    clearDraft,
    clearSession,
    pauseChat,
    resumeChat,
    isChatPaused,
    saveDraft,
    sendInteraktText,
    sendResultReply,
    showMainMenu,
    interaktConfigured,
    customerLedger,
    interaktApiKey,
  } = deps;

  const router = express.Router();
  const activityLog = [];

  function pushLog(entry) {
    activityLog.unshift({
      ...entry,
      at: new Date().toISOString(),
    });
    if (activityLog.length > 100) activityLog.length = 100;
  }

  function normalizeToken(value) {
    return String(value || "")
      .replace(/^\uFEFF/, "")
      .replace(/[\r\n]/g, "")
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }

  function cookieToken(req) {
    const raw = req.get("cookie") || "";
    const parts = raw.split(";").map((p) => p.trim());
    for (const part of parts) {
      if (part.startsWith("raed_admin_token=")) {
        try {
          return decodeURIComponent(part.slice("raed_admin_token=".length));
        } catch {
          return part.slice("raed_admin_token=".length);
        }
      }
    }
    return "";
  }

  function setAdminCookie(res, token) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      `raed_admin_token=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly${secure}`
    );
  }

  function clearAdminCookie(res) {
    res.setHeader(
      "Set-Cookie",
      "raed_admin_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly"
    );
  }

  function requireAdmin(req, res, next) {
    const token = normalizeToken(adminToken);
    if (!token) {
      return res.status(503).json({
        ok: false,
        error: "ADMIN_TOKEN غير مضبوط في ملف .env — أضفه وأعد تشغيل السيرفر",
      });
    }
    const got = normalizeToken(
      req.get("x-admin-token") ||
        (req.get("authorization") || "").replace(/^Bearer\s+/i, "") ||
        req.query.token ||
        cookieToken(req) ||
        ""
    );
    if (got !== token) {
      return res.status(401).json({
        ok: false,
        error: "الرمز غير صحيح — تأكد من ADMIN_TOKEN في .env وأعد تشغيل السيرفر",
      });
    }
    return next();
  }

  /** دخول يضبط كوكي HttpOnly عشان ما يضيع بعد تحديث الجوال */
  router.post("/login", (req, res) => {
    const token = normalizeToken(adminToken);
    if (!token) {
      return res.status(503).json({ ok: false, error: "ADMIN_TOKEN غير مضبوط" });
    }
    const got = normalizeToken(req.body?.token || req.get("x-admin-token") || "");
    if (got !== token) {
      return res.status(401).json({ ok: false, error: "الرمز غير صحيح" });
    }
    setAdminCookie(res, token);
    const persistence = customerLedger?.persistenceInfo?.() || null;
    const summary = customerLedger?.summary?.() || null;
    return res.json({
      ok: true,
      counts: summary?.counts || null,
      persistence,
    });
  });

  router.post("/logout", (_req, res) => {
    clearAdminCookie(res);
    res.json({ ok: true });
  });

  function listConversations() {
    const keys = new Set([
      ...sessions.keys(),
      ...drafts.keys(),
      ...pausedChats,
    ]);
    const rows = [];
    for (const key of keys) {
      const [countryCode, phone] = key.split(":");
      const sessionRow = sessions.get(key);
      const draftRow = drafts.get(key);
      rows.push({
        key,
        countryCode,
        phone,
        paused: pausedChats.has(key),
        session: sessionRow
          ? {
              savedAt: sessionRow.savedAt,
              maxAmount: sessionRow.data?.maxAmount || sessionRow.data?.rounded,
              offer: sessionRow.data?.offer || null,
              awaitingCombo: Boolean(sessionRow.data?.awaitingCombo),
              awaitingDebtContinue: Boolean(
                sessionRow.data?.awaitingDebtContinue
              ),
              awaitingAmountChoice: Boolean(
                sessionRow.data?.awaitingAmountChoice
              ),
            }
          : null,
        draft: draftRow
          ? {
              savedAt: draftRow.savedAt,
              flow: draftRow.data?.flow || null,
              step: draftRow.data?.step || null,
              jobCategory: draftRow.data?.jobCategory || null,
            }
          : null,
      });
    }
    rows.sort((a, b) => {
      const ta = Math.max(a.session?.savedAt || 0, a.draft?.savedAt || 0);
      const tb = Math.max(b.session?.savedAt || 0, b.draft?.savedAt || 0);
      return tb - ta;
    });
    return rows;
  }

  router.get("/status", requireAdmin, (_req, res) => {
    const ledgerSummary = customerLedger?.summary?.() || null;
    const persistence = customerLedger?.persistenceInfo?.() || null;
    res.json({
      ok: true,
      service: "finance-calc-server",
      interaktConfigured: Boolean(interaktConfigured),
      counts: {
        sessions: sessions.size,
        drafts: drafts.size,
        paused: pausedChats.size,
        conversations: listConversations().length,
        customersToday: ledgerSummary?.counts?.today || 0,
        customersYesterday: ledgerSummary?.counts?.yesterday || 0,
        customersAll: ledgerSummary?.counts?.all || 0,
      },
      customers: ledgerSummary,
      persistence,
      brand: CONFIG.brand?.name || "رائد الحربي",
      followUpPreview: CONFIG.followUp?.electronicMessage || "",
      outboundDelayMs: CONFIG.outbound?.delayMs || 3500,
    });
  });

  router.get("/conversations", requireAdmin, (_req, res) => {
    res.json({ ok: true, conversations: listConversations() });
  });

  /**
   * عملاء اليوم / أمس / الكل
   * ?day=today|yesterday|all|YYYY-MM-DD
   * ?limit=&offset= للصفحات (افتراضي 100) — يقلل ثقل الجوال
   * ?phonesOnly=1 لنسخ الأرقام فقط
   */
  router.get("/customers", requireAdmin, (req, res) => {
    if (!customerLedger) {
      return res.status(503).json({
        ok: false,
        error: "سجل العملاء غير مفعّل على هذا السيرفر",
      });
    }
    const day = String(req.query.day || "today").trim() || "today";
    const pack = customerLedger.listByDay(day);
    const summary = customerLedger.summary();
    const phonesOnly =
      req.query.phonesOnly === "1" || req.query.phonesOnly === "true";
    if (phonesOnly) {
      return res.json({
        ok: true,
        timezone: pack.timezone,
        today: pack.today,
        yesterday: pack.yesterday,
        day: pack.day,
        count: pack.count,
        counts: summary.counts,
        phones: pack.customers.map((row) => ({
          phone: row.phone,
          countryCode: row.countryCode,
        })),
      });
    }

    const total = pack.customers.length;
    const wantAll =
      req.query.limit === "all" ||
      req.query.limit === "0" ||
      req.query.all === "1";
    const limit = wantAll
      ? total
      : Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const slice = pack.customers.slice(offset, offset + limit);
    const enriched = slice.map((row) => {
      const key = sessionKey(row.countryCode, row.phone);
      const sessionRow = sessions.get(key);
      const draftRow = drafts.get(key);
      return {
        key: row.key,
        phone: row.phone,
        countryCode: row.countryCode,
        firstSeenAt: row.firstSeenAt,
        lastSeenAt: row.lastSeenAt,
        lastInboundText: row.lastInboundText || "",
        lastOutboundPreview: row.lastOutboundPreview || "",
        inboundCount: row.inboundCount || 0,
        outboundCount: row.outboundCount || 0,
        flow: row.flow || null,
        step: row.step || null,
        maxAmount: row.maxAmount ?? null,
        source: row.source || null,
        syncedAt: row.syncedAt || null,
        dayKey: row.dayKey || null,
        paused: pausedChats.has(key),
        live: {
          session: sessionRow
            ? {
                savedAt: sessionRow.savedAt,
                maxAmount:
                  sessionRow.data?.maxAmount || sessionRow.data?.rounded || null,
                offer: sessionRow.data?.offer || null,
              }
            : null,
          draft: draftRow
            ? {
                savedAt: draftRow.savedAt,
                flow: draftRow.data?.flow || null,
                step: draftRow.data?.step || null,
              }
            : null,
        },
      };
    });
    res.json({
      ok: true,
      timezone: pack.timezone,
      today: pack.today,
      yesterday: pack.yesterday,
      day: pack.day,
      count: total,
      offset,
      limit: wantAll ? total : limit,
      hasMore: offset + enriched.length < total,
      counts: summary.counts,
      customers: enriched,
      persistence: customerLedger.persistenceInfo?.() || null,
    });
  });

  router.get("/activity", requireAdmin, (_req, res) => {
    res.json({ ok: true, activity: activityLog });
  });

  /** تنزيل بكب JSON لسجل العملاء */
  router.get("/customers/export", requireAdmin, (_req, res) => {
    if (!customerLedger) {
      return res.status(503).json({ ok: false, error: "سجل العملاء غير مفعّل" });
    }
    const payload = customerLedger.exportPayload();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="customers-backup-${stamp}.json"`
    );
    pushLog({ action: "customers-export", count: payload.count });
    res.send(JSON.stringify(payload, null, 2));
  });

  /** استيراد بكب JSON (دمج مع الحالي) */
  router.post("/customers/import", requireAdmin, (req, res) => {
    if (!customerLedger) {
      return res.status(503).json({ ok: false, error: "سجل العملاء غير مفعّل" });
    }
    const payload = req.body?.customers ? req.body : req.body?.payload || req.body;
    const result = customerLedger.importPayload(payload, {
      merge: req.body?.merge !== false,
    });
    if (!result.ok) return res.status(400).json(result);
    pushLog({
      action: "customers-import",
      imported: result.imported,
      updated: result.updated,
    });
    res.json(result);
  });

  /** إنشاء نسخة احتياطية محلية الآن */
  router.post("/customers/backup", requireAdmin, (_req, res) => {
    if (!customerLedger) {
      return res.status(503).json({ ok: false, error: "سجل العملاء غير مفعّل" });
    }
    customerLedger.flush();
    const snap = customerLedger.createSnapshot("manual");
    pushLog({ action: "customers-backup", count: snap.count || 0 });
    res.json({
      ok: Boolean(snap.ok),
      snapshot: snap,
      backups: customerLedger.listBackups().slice(0, 10),
      summary: customerLedger.summary(),
    });
  });

  router.get("/customers/backups", requireAdmin, (_req, res) => {
    if (!customerLedger) {
      return res.status(503).json({ ok: false, error: "سجل العملاء غير مفعّل" });
    }
    res.json({ ok: true, backups: customerLedger.listBackups() });
  });

  /**
   * جلب العملاء السابقين من Interakt (آخر N أيام)
   * يعتمد Get Users API — أرقام + تواريخ، مو نصوص الشات كاملة
   */
  router.post("/customers/sync-interakt", requireAdmin, async (req, res) => {
    if (!customerLedger) {
      return res.status(503).json({ ok: false, error: "سجل العملاء غير مفعّل" });
    }
    const apiKey = interaktApiKey || process.env.INTERAKT_API_KEY || "";
    if (!apiKey) {
      return res.status(503).json({
        ok: false,
        error: "INTERAKT_API_KEY غير مضبوط — لا يمكن جلب السابق من Interakt",
      });
    }
    try {
      const { syncInteraktUsersSince } = require("./interakt-users");
      const days = Math.min(Math.max(Number(req.body?.days || 7), 1), 30);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      customerLedger.createSnapshot("pre-sync");
      const result = await syncInteraktUsersSince({
        apiKey,
        sinceIso: since,
        onUser: (contact) =>
          customerLedger.upsertContact({
            ...contact,
            // عشان يظهرون فورًا في تبويب اليوم بعد الجلب
            touchNow: true,
            source: "interakt",
          }),
      });
      const saved = customerLedger.flush();
      const persistence = customerLedger.persistenceInfo();
      pushLog({
        action: "customers-sync-interakt",
        fetched: result.fetched,
        created: result.created,
        savedOk: Boolean(saved?.ok),
        durable: Boolean(persistence?.durable),
      });
      res.json({
        ...result,
        days,
        since,
        summary: customerLedger.summary(),
        persistence,
        saved,
        // touchNow يختمهم بتاريخ اليوم فيظهرون في تبويب اليوم
        preferDay: result.fetched > 0 ? "today" : "all",
        hint: persistence?.durable
          ? null
          : "تم الجلب في الذاكرة والملف المحلي — لكن بدون Persistent Disk على Render يختفي السجل بعد إعادة التشغيل أو النشر. أضف Disk على /var/data واضبط CUSTOMERS_DATA_DIR=/var/data/kobri",
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err.message,
        details: err.details || null,
      });
    }
  });

  router.post("/pause", requireAdmin, (req, res) => {
    const { phone, countryCode } = normalizePhoneParts(req.body || {});
    if (!phone) return res.status(400).json({ ok: false, error: "رقم الجوال مطلوب" });
    pauseChat(countryCode, phone);
    pushLog({ action: "pause", phone, countryCode });
    res.json({ ok: true, paused: true, phone, countryCode });
  });

  router.post("/resume", requireAdmin, (req, res) => {
    const { phone, countryCode } = normalizePhoneParts(req.body || {});
    if (!phone) return res.status(400).json({ ok: false, error: "رقم الجوال مطلوب" });
    resumeChat(countryCode, phone);
    pushLog({ action: "resume", phone, countryCode });
    res.json({ ok: true, paused: false, phone, countryCode });
  });

  router.post("/reset", requireAdmin, (req, res) => {
    const { phone, countryCode } = normalizePhoneParts(req.body || {});
    if (!phone) return res.status(400).json({ ok: false, error: "رقم الجوال مطلوب" });
    clearDraft(countryCode, phone);
    clearSession(countryCode, phone);
    resumeChat(countryCode, phone);
    pushLog({ action: "reset", phone, countryCode });
    res.json({ ok: true, reset: true, phone, countryCode });
  });

  router.post("/send-text", requireAdmin, async (req, res) => {
    try {
      const { phone, countryCode } = normalizePhoneParts(req.body || {});
      const message = String(req.body?.message || "").trim();
      if (!phone) return res.status(400).json({ ok: false, error: "رقم الجوال مطلوب" });
      if (!message) return res.status(400).json({ ok: false, error: "نص الرسالة مطلوب" });
      await sendInteraktText(countryCode, phone, message);
      customerLedger?.recordOutbound?.(countryCode, phone, message, {
        mode: "admin-text",
      });
      pushLog({
        action: "send-text",
        phone,
        countryCode,
        preview: message.slice(0, 80),
      });
      res.json({ ok: true, sent: true, phone, countryCode });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err.message,
        details: err.details || null,
      });
    }
  });

  router.post("/send-followup", requireAdmin, async (req, res) => {
    try {
      const { phone, countryCode } = normalizePhoneParts(req.body || {});
      if (!phone) return res.status(400).json({ ok: false, error: "رقم الجوال مطلوب" });
      const message =
        String(req.body?.message || "").trim() ||
        CONFIG.followUp?.electronicMessage ||
        `السلام عليكم
هل قدمت تمويل؟
أرسل رقم الطلب (8 أرقام ويبدأ بـ 1016 أو 1017).`;
      await sendInteraktText(countryCode, phone, message);
      customerLedger?.recordOutbound?.(countryCode, phone, message, {
        mode: "admin-followup",
      });
      pushLog({
        action: "send-followup",
        phone,
        countryCode,
        preview: message.slice(0, 80),
      });
      res.json({ ok: true, sent: true, phone, countryCode });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err.message,
        details: err.details || null,
      });
    }
  });

  router.post("/send-menu", requireAdmin, async (req, res) => {
    try {
      const { phone, countryCode } = normalizePhoneParts(req.body || {});
      if (!phone) return res.status(400).json({ ok: false, error: "رقم الجوال مطلوب" });
      const result = showMainMenu("قائمة");
      resumeChat(countryCode, phone);
      clearDraft(countryCode, phone);
      clearSession(countryCode, phone);
      if (result.draft) saveDraft(countryCode, phone, result.draft);
      await sendResultReply(countryCode, phone, result);
      customerLedger?.recordOutbound?.(
        countryCode,
        phone,
        result.reply || "القائمة الرئيسية",
        { mode: "admin-menu", flow: "main_menu", step: "awaiting_choice" }
      );
      pushLog({ action: "send-menu", phone, countryCode });
      res.json({ ok: true, sent: true, phone, countryCode });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err.message,
        details: err.details || null,
      });
    }
  });

  router.post("/bulk-followup", requireAdmin, async (req, res) => {
    const phones = Array.isArray(req.body?.phones) ? req.body.phones : [];
    const message =
      String(req.body?.message || "").trim() ||
      CONFIG.followUp?.electronicMessage ||
      "";
    const delayMs = Number(
      req.body?.delayMs != null
        ? req.body.delayMs
        : CONFIG.outbound?.delayMs || 3500
    );
    if (!phones.length) {
      return res.status(400).json({ ok: false, error: "أضف رقمًا واحدًا على الأقل" });
    }
    if (!message) {
      return res.status(400).json({ ok: false, error: "نص المتابعة فارغ" });
    }

    const results = [];
    for (let i = 0; i < phones.length; i += 1) {
      const parts = normalizePhoneParts({
        phone: phones[i],
        countryCode: req.body?.countryCode,
      });
      try {
        if (!parts.phone) throw new Error("رقم غير صالح");
        await sendInteraktText(parts.countryCode, parts.phone, message);
        customerLedger?.recordOutbound?.(
          parts.countryCode,
          parts.phone,
          message,
          { mode: "admin-bulk-followup" }
        );
        results.push({ phone: parts.phone, ok: true });
        pushLog({
          action: "bulk-followup",
          phone: parts.phone,
          countryCode: parts.countryCode,
        });
      } catch (err) {
        results.push({
          phone: parts.phone || String(phones[i]),
          ok: false,
          error: err.message,
        });
      }
      if (i < phones.length - 1 && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    res.json({
      ok: true,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  });

  // حالة محادثة واحدة
  router.get("/conversation/:phone", requireAdmin, (req, res) => {
    const { phone, countryCode } = normalizePhoneParts({
      phone: req.params.phone,
      countryCode: req.query.countryCode,
    });
    if (!phone) return res.status(400).json({ ok: false, error: "رقم الجوال مطلوب" });
    const key = sessionKey(countryCode, phone);
    res.json({
      ok: true,
      phone,
      countryCode,
      paused: isChatPaused(countryCode, phone),
      session: sessions.get(key) || null,
      draft: drafts.get(key) || null,
    });
  });

  return router;
}

function mountAdmin(app, deps) {
  const router = createAdminRouter(deps);
  const adminDir = path.join(__dirname, "..", "public", "admin");
  const indexFile = path.join(adminDir, "index.html");

  app.use("/admin/api", router);

  app.get(["/admin", "/admin/"], (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.sendFile(indexFile);
  });

  app.use(
    "/admin",
    express.static(adminDir, {
      etag: false,
      lastModified: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        }
      },
    })
  );
}

module.exports = {
  createAdminRouter,
  mountAdmin,
  normalizePhoneParts,
};
