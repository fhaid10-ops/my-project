/**
 * واجهة برمجة لوحة التحكم الخارجية
 */
const path = require("path");
const express = require("express");
const CONFIG = require("../config");
const {
  listCustomersFromLog,
  defaultYesterdayToToday,
  getRiyadhYmd,
  riyadhRangeToUtc,
  normalizePhone,
} = require("./customer-log");
const { listInteraktCustomersInRange } = require("./interakt-users");

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

  // اللوحة على جهاز الكوبري — بدون رمز
  // لا تشارك رابط Cloudflare علنًا
  function requireAdmin(req, _res, next) {
    console.log(`[admin] ${req.method} ${req.path}`);
    return next();
  }

  // فحص سريع — لمعرفة إن السيرفر يرد
  router.get("/ping", (req, res) => {
    console.log(`[admin] ping host=${req.get("host") || ""}`);
    res.json({
      ok: true,
      open: true,
      version: "2026-08-04-envfix2",
      host: req.get("host") || "",
      ip: req.ip || req.socket?.remoteAddress || "",
      tokenConfigured: Boolean(adminToken),
    });
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
    res.json({
      ok: true,
      service: "finance-calc-server",
      interaktConfigured: Boolean(interaktConfigured),
      counts: {
        sessions: sessions.size,
        drafts: drafts.size,
        paused: pausedChats.size,
        conversations: listConversations().length,
      },
      brand: CONFIG.brand?.name || "رائد الحربي",
      followUpPreview: CONFIG.followUp?.electronicMessage || "",
      outboundDelayMs: CONFIG.outbound?.delayMs || 3500,
    });
  });

  router.get("/conversations", requireAdmin, (_req, res) => {
    res.json({ ok: true, conversations: listConversations() });
  });

  router.get("/activity", requireAdmin, (_req, res) => {
    res.json({ ok: true, activity: activityLog });
  });

  /**
   * عملاء من تاريخ → تاريخ (توقيت الرياض)
   * افتراضيًا: أمس → اليوم
   * يجمع: Interakt + السجل المحلي + الجلسات الحية
   */
  router.get("/customers", requireAdmin, async (req, res) => {
    try {
      const defaults = defaultYesterdayToToday();
      const fromYmd = String(req.query.from || defaults.from).slice(0, 10);
      const toYmd = String(req.query.to || defaults.to).slice(0, 10);

      const localRows = listCustomersFromLog(fromYmd, toYmd);
      const interakt = await listInteraktCustomersInRange({
        apiKey: interaktApiKey,
        fromYmd,
        toYmd,
      });

      const byPhone = new Map();
      function upsert(row, sourceHint) {
        if (!row?.phone) return;
        const phone = normalizePhone(row.phone);
        if (!phone) return;
        const prev = byPhone.get(phone) || {
          phone,
          countryCode: row.countryCode || "+966",
          name: "",
          lastAt: null,
          lastPreview: "",
          events: 0,
          sources: [],
          live: null,
        };
        if (row.name && !prev.name) prev.name = row.name;
        if (row.countryCode) prev.countryCode = row.countryCode;
        if (
          row.lastAt &&
          (!prev.lastAt || Date.parse(row.lastAt) > Date.parse(prev.lastAt))
        ) {
          prev.lastAt = row.lastAt;
        }
        if (row.lastPreview) prev.lastPreview = row.lastPreview;
        if (row.events) prev.events += Number(row.events) || 0;
        const src = sourceHint || row.source;
        if (src && !prev.sources.includes(src)) prev.sources.push(src);
        byPhone.set(phone, prev);
      }

      for (const row of interakt.customers || []) upsert(row, "interakt");
      for (const row of localRows) upsert(row, "local");

      // جلسات حية ضمن الفترة (إن وُجدت)
      const liveRange = riyadhRangeToUtc(fromYmd, toYmd);
      for (const live of listConversations()) {
        const atMs = Math.max(
          live.session?.savedAt || 0,
          live.draft?.savedAt || 0
        );
        if (!atMs) continue;
        if (atMs < liveRange.from.getTime() || atMs > liveRange.to.getTime()) {
          continue;
        }
        upsert(
          {
            phone: live.phone,
            countryCode: live.countryCode,
            lastAt: new Date(atMs).toISOString(),
            lastPreview: live.draft?.flow || (live.session ? "جلسة حسبة" : ""),
            events: 1,
          },
          "live"
        );
        const cur = byPhone.get(normalizePhone(live.phone));
        if (cur) {
          cur.live = {
            paused: live.paused,
            flow: live.draft?.flow || null,
            maxAmount: live.session?.maxAmount || null,
          };
        }
      }

      const customers = [...byPhone.values()].sort(
        (a, b) => Date.parse(b.lastAt || 0) - Date.parse(a.lastAt || 0)
      );

      res.json({
        ok: true,
        from: fromYmd,
        to: toYmd,
        today: getRiyadhYmd(),
        count: customers.length,
        interaktCount: (interakt.customers || []).length,
        localCount: localRows.length,
        interaktError: interakt.error || null,
        customers,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
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
أرسل رقم الطلب (يبدأ بـ 101).`;
      await sendInteraktText(countryCode, phone, message);
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
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.set("Pragma", "no-cache");
    res.sendFile(indexFile);
  });

  app.use("/admin", express.static(adminDir));
}

module.exports = {
  createAdminRouter,
  mountAdmin,
  normalizePhoneParts,
};
