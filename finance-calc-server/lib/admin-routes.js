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

  function isLocalRequest(req) {
    const host = String(req.get("host") || "").toLowerCase();
    if (
      host.startsWith("127.0.0.1") ||
      host.startsWith("localhost") ||
      host.startsWith("[::1]")
    ) {
      return true;
    }
    const ip = String(req.ip || req.socket?.remoteAddress || "");
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1" ||
      ip.endsWith("127.0.0.1")
    );
  }

  function requireAdmin(req, res, next) {
    // من الكمبيوتر على 127.0.0.1 / localhost: دخول مباشر
    if (isLocalRequest(req)) return next();

    const token = normalizeToken(adminToken) || "123456";
    const got = normalizeToken(
      req.get("x-admin-token") ||
        (req.get("authorization") || "").replace(/^Bearer\s+/i, "") ||
        req.query.token ||
        ""
    );
    const clean = token.replace(/^@+/, "");
    const aliases = new Set([token, clean, `@${clean}`, "123456", "@123456"]);
    if (!aliases.has(got)) {
      return res.status(401).json({
        ok: false,
        error: "الرمز غير صحيح — من الجوال اكتب 123456",
      });
    }
    return next();
  }

  // فحص سريع بدون حماية — لمعرفة إن السيرفر يرد
  router.get("/ping", (req, res) => {
    res.json({
      ok: true,
      local: isLocalRequest(req),
      host: req.get("host") || "",
      ip: req.ip || req.socket?.remoteAddress || "",
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
