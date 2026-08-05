/**
 * سيرفر الحاسبة + Webhook Interakt
 * يشتغل على جهاز البيت (جهاز عبدالرحمن)
 *
 * التدفق:
 * 1) العميل يرسل بيانات التمويل → نحسب أعلى مبلغ + قائمة أقل
 * 2) إذا أرسل مبلغ من القائمة → نحسب قسط المبلغ المختار
 */
require("dotenv").config();
const express = require("express");
const {
  parsePersonalFinanceMessage,
  looksLikePersonalFinanceData,
  looksLikeSectorOnlyReply,
  looksLikeYesNoReply,
  calculatePersonalFinance,
  looksLikeAmountChoice,
  parseAmountChoice,
  calculateSelectedAmount,
  replyPropertyComboDecision,
  replyPropertyComboInterestDecision,
  mapSector,
} = require("./lib/personal-finance");
const {
  looksLikeStartPersonalFinance,
  startPersonalFinanceFlow,
  advancePersonalFinanceFlow,
} = require("./lib/conversation");
const {
  looksLikeStartDebtPurchase,
  startDebtPurchaseFlow,
  advanceDebtPurchaseFlow,
} = require("./lib/debt-conversation");
const {
  looksLikeDebtContinueReply,
  buildDebtPurchaseComplete,
  buildDebtPurchaseDeclined,
} = require("./lib/debt-purchase");
const {
  looksLikeShowMainMenu,
  looksLikeMenuShortcut,
  showMainMenu,
  parseMainMenuChoice,
  handleMainMenuChoice,
} = require("./lib/main-menu");
const { handleAmountExamplesSector } = require("./lib/amount-examples");
const { extractIncomingMessage } = require("./lib/webhook-parse");
const { normalizeDigits } = require("./lib/digits");
const { mountAdmin } = require("./lib/admin-routes");

function normalizeEnvValue(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\r\n]/g, "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 5055);
const INTERAKT_API_KEY = normalizeEnvValue(process.env.INTERAKT_API_KEY);
const WEBHOOK_SECRET = normalizeEnvValue(process.env.WEBHOOK_SECRET);
const ADMIN_TOKEN = normalizeEnvValue(process.env.ADMIN_TOKEN);

/** جلسات مؤقتة: phone -> نتيجة الحسبة (أعلى مبلغ + نسبة) */
const sessions = new Map();
/** مسودات ناقصة: phone -> بيانات الراتب/الالتزامات بانتظار القطاع */
const drafts = new Map();
/** محادثات أوقف العميل فيها الرد الآلي (خيار 6) */
const pausedChats = new Set();
/** منع تكرار نفس الرسالة الواردة (Webhook مزدوج / سباق) */
const recentInbound = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 6; // 6 ساعات
const INBOUND_DEDUP_MS = 12000;

function sessionKey(countryCode, phone) {
  return `${countryCode}:${phone}`;
}

/** true = أول مرة نتعامل مع الرسالة | false = مكررة خلال الثواني */
function claimInbound(countryCode, phone, text) {
  const normalized = normalizeDigits(String(text || "").trim())
    .replace(/\s+/g, " ")
    .slice(0, 100);
  const key = `${sessionKey(countryCode, phone)}:${normalized}`;
  const now = Date.now();
  const prev = recentInbound.get(key);
  if (prev && now - prev < INBOUND_DEDUP_MS) {
    return false;
  }
  recentInbound.set(key, now);
  if (recentInbound.size > 500) {
    for (const [k, ts] of recentInbound) {
      if (now - ts > INBOUND_DEDUP_MS) recentInbound.delete(k);
    }
  }
  return true;
}

function saveSession(countryCode, phone, data) {
  sessions.set(sessionKey(countryCode, phone), {
    data,
    savedAt: Date.now(),
  });
}

function getSession(countryCode, phone) {
  const key = sessionKey(countryCode, phone);
  const row = sessions.get(key);
  if (!row) return null;
  if (Date.now() - row.savedAt > SESSION_TTL_MS) {
    sessions.delete(key);
    return null;
  }
  return row.data;
}

function saveDraft(countryCode, phone, data) {
  drafts.set(sessionKey(countryCode, phone), {
    data,
    savedAt: Date.now(),
  });
}

function getDraft(countryCode, phone) {
  const key = sessionKey(countryCode, phone);
  const row = drafts.get(key);
  if (!row) return null;
  if (Date.now() - row.savedAt > SESSION_TTL_MS) {
    drafts.delete(key);
    return null;
  }
  return row.data;
}

function clearDraft(countryCode, phone) {
  drafts.delete(sessionKey(countryCode, phone));
}

function clearSession(countryCode, phone) {
  sessions.delete(sessionKey(countryCode, phone));
}

function isChatPaused(countryCode, phone) {
  return pausedChats.has(sessionKey(countryCode, phone));
}

function pauseChat(countryCode, phone) {
  pausedChats.add(sessionKey(countryCode, phone));
}

function resumeChat(countryCode, phone) {
  pausedChats.delete(sessionKey(countryCode, phone));
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "finance-calc-server",
    interaktConfigured: Boolean(INTERAKT_API_KEY),
    adminConfigured: Boolean(ADMIN_TOKEN),
    activeSessions: sessions.size,
    drafts: drafts.size,
    paused: pausedChats.size,
  });
});

/** اختبار الحسبة مباشرة */
app.post("/calculate/personal", (req, res) => {
  const body = req.body || {};
  let input = body;

  if (body.message || body.text) {
    input = parsePersonalFinanceMessage(body.message || body.text);
  }

  const result = calculatePersonalFinance(input);
  res.status(result.ok ? 200 : 400).json(result);
});

/** اختبار اختيار مبلغ أقل */
app.post("/calculate/select-amount", (req, res) => {
  const body = req.body || {};
  const sessionData = body.session || body.data || {};
  const amount =
    body.amount != null ? Number(body.amount) : parseAmountChoice(body.message || body.text || "");
  const result = calculateSelectedAmount(sessionData, amount);
  res.status(result.ok ? 200 : 400).json(result);
});

async function postInteraktPayload(payload) {
  if (!INTERAKT_API_KEY) {
    throw new Error("INTERAKT_API_KEY غير موجود في ملف .env");
  }

  let response;
  try {
    response = await fetch("https://api.interakt.ai/v1/public/message/", {
      method: "POST",
      headers: {
        Authorization: `Basic ${INTERAKT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    const cause = netErr?.cause;
    const detail = [
      netErr.message,
      cause?.code,
      cause?.message,
      cause?.hostname,
    ]
      .filter(Boolean)
      .join(" | ");
    const err = new Error(`فشل الاتصال بـ Interakt: ${detail}`);
    err.details = {
      hint: "تأكد من الإنترنت على الجهاز، وأن جدار الحماية لا يمنع Node.js",
      causeCode: cause?.code || null,
    };
    throw err;
  }

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const err = new Error(`Interakt API ${response.status}`);
    err.details = json;
    throw err;
  }

  return json;
}

async function sendInteraktText(countryCode, phoneNumber, message) {
  return postInteraktPayload({
    countryCode,
    phoneNumber,
    type: "Text",
    data: {
      message,
    },
  });
}

/** أزرار Quick Reply أو قائمة InteractiveList عبر Interakt */
async function sendInteraktInteractive(countryCode, phoneNumber, interactive) {
  if (!interactive || !interactive.kind) {
    throw new Error("interactive payload ناقص");
  }

  if (interactive.kind === "buttons") {
    const buttons = (interactive.buttons || []).slice(0, 3).map((b) => ({
      type: "reply",
      reply: {
        id: String(b.id || b.title),
        title: String(b.title).slice(0, 20),
      },
    }));
    return postInteraktPayload({
      countryCode,
      phoneNumber,
      type: "InteractiveButton",
      data: {
        message: {
          type: "button",
          body: { text: String(interactive.body || "").slice(0, 1024) },
          action: { buttons },
        },
      },
    });
  }

  if (interactive.kind === "list") {
    const rows = (interactive.rows || []).slice(0, 10).map((row) => ({
      id: String(row.id),
      title: String(row.title).slice(0, 24),
      description: row.description
        ? String(row.description).slice(0, 72)
        : undefined,
    }));
    return postInteraktPayload({
      countryCode,
      phoneNumber,
      type: "InteractiveList",
      data: {
        message: {
          type: "list",
          body: { text: String(interactive.body || "").slice(0, 1024) },
          action: {
            button: String(interactive.button || "اختر").slice(0, 20),
            sections: [
              {
                title: String(interactive.sectionTitle || "الخيارات").slice(
                  0,
                  24
                ),
                rows,
              },
            ],
          },
        },
      },
    });
  }

  throw new Error(`نوع interactive غير مدعوم: ${interactive.kind}`);
}

async function sendResultReply(countryCode, phone, result) {
  // نتيجة الحسبة: نص أعلى مبلغ ثم قائمة المبالغ الأقل
  if (result?.sendTextThenInteractive && result?.reply && result?.interactive) {
    await sendInteraktText(countryCode, phone, result.reply);
    if (result.followUpReply) {
      await sendInteraktText(countryCode, phone, result.followUpReply);
    }
    await sendInteraktInteractive(countryCode, phone, result.interactive);
    return result.followUpReply ? "text+followup+interactive" : "text+interactive";
  }
  if (result?.interactive) {
    await sendInteraktInteractive(countryCode, phone, result.interactive);
    if (result.followUpReply) {
      await sendInteraktText(countryCode, phone, result.followUpReply);
    }
    return result.followUpReply ? "interactive+followup" : "interactive";
  }
  if (result?.reply) {
    await sendInteraktText(countryCode, phone, result.reply);
    if (result.followUpReply) {
      await sendInteraktText(countryCode, phone, result.followUpReply);
    }
    return result.followUpReply ? "text+followup" : "text";
  }
  return null;
}

/**
 * Webhook من Interakt — فعّله من Developer Settings
 * URL مثال: https://xxxx.trycloudflare.com/webhook/interakt
 */
app.post("/webhook/interakt", async (req, res) => {
  try {
    if (WEBHOOK_SECRET) {
      const got =
        req.get("x-interakt-secret") ||
        req.get("x-webhook-secret") ||
        req.query.secret ||
        "";
      if (String(got) !== WEBHOOK_SECRET) {
        return res.status(401).json({ ok: false, error: "invalid secret" });
      }
    }

    // رد سريع لـ Interakt (مهم)
    res.status(200).json({ ok: true, received: true });

    const payload = req.body || {};
    const type = payload?.type || payload?.event || "";
    const { text, phone, countryCode, contentType, eventType } =
      extractIncomingMessage(payload);

    console.log("[webhook]", {
      type: type || eventType,
      phone,
      contentType,
      preview: text.slice(0, 80),
      messageKeys: Object.keys(payload?.data?.message || {}),
      hasButtonText: Boolean(payload?.data?.message?.button_text),
    });

    // تجاهل التسليم/القراءة؛ نقبل الوارد + اختصار المكتب (1) حتى لو message_api_sent
    const isOutboundSent = /^message_api_sent$/i.test(String(type));
    const ignoredTypes =
      /^(message_api_sent|message_api_delivered|message_api_read|message_api_failed|message_campaign_)/i;
    const staffMenuShortcut =
      isOutboundSent && phone && text && looksLikeMenuShortcut(text);
    if (
      type &&
      ignoredTypes.test(String(type)) &&
      !payload?.data?.message?.button_text &&
      !staffMenuShortcut
    ) {
      return;
    }

    if (!phone || !text) return;

    // منع إرسال القائمة/الرد مرتين لنفس الرسالة (Webhook مكرر أو سباق)
    if (!claimInbound(countryCode, phone, text)) {
      console.log("[webhook:dedup]", phone, String(text).slice(0, 40));
      return;
    }

    let result = null;
    const yesNo = looksLikeYesNoReply(text);
    const currentSession = getSession(countryCode, phone);
    const draft = getDraft(countryCode, phone);

    // داخل مسار/اختيار قائمة: الرقم 1 له معنى ثاني (لا نعيد القائمة)
    const inActiveChoice =
      (draft?.flow === "main_menu" &&
        (draft.step === "awaiting_choice" ||
          draft.step === "awaiting_amount_examples_sector")) ||
      (draft?.flow === "personal_chat" &&
        draft.step &&
        draft.step !== "done") ||
      (draft?.flow === "debt_chat" && draft.step && draft.step !== "done") ||
      currentSession?.awaitingCombo ||
      currentSession?.awaitingComboInterest ||
      currentSession?.awaitingDebtContinue ||
      draft?.awaitingCombo ||
      draft?.awaitingComboInterest ||
      draft?.awaitingDebtContinue;

    // السلام / قائمة / اختصار المكتب (1) → القائمة الرئيسية
    // (حتى لو القائمة مفتوحة أصلًا نعيد إرسالها — أفضل من صمت يظن العميل إن البوت واقف)
    if (
      looksLikeShowMainMenu(text) ||
      staffMenuShortcut ||
      (!inActiveChoice && looksLikeMenuShortcut(text))
    ) {
      result = showMainMenu(text);
      resumeChat(countryCode, phone);
      clearDraft(countryCode, phone);
      clearSession(countryCode, phone);
      saveDraft(countryCode, phone, result.draft);
      // قائمة تفاعلية فقط — النص الاحتياطي للفشل فقط (حتى لا تظهر القائمة مرتين)
      result = {
        ...result,
        replyFallback: result.reply,
        reply: undefined,
      };
    } else if (isChatPaused(countryCode, phone)) {
      // محادثة موقوفة: لا نرد إلا بعد سلام / قائمة / اختصار
      return;
    } else if (
      draft?.flow === "main_menu" &&
      draft.step === "awaiting_amount_examples_sector"
    ) {
      result = handleAmountExamplesSector(text);
      if (result.draft) saveDraft(countryCode, phone, result.draft);
      else clearDraft(countryCode, phone);
    } else if (
      // خيار قائمة بالاسم (موقعنا / رقم المساعد / …) يقاطع أي مسار عالق
      // الأرقام 1–7 وحدها تُقبل فقط والقائمة مفتوحة حتى لا تتعارض مع خطوات المسار
      parseMainMenuChoice(text) &&
      (!/^[1-7]$/.test(normalizeDigits(text).trim()) ||
        (draft?.flow === "main_menu" && draft.step === "awaiting_choice"))
    ) {
      const menuResult = handleMainMenuChoice(parseMainMenuChoice(text));
      if (menuResult.pauseChat) {
        pauseChat(countryCode, phone);
        clearDraft(countryCode, phone);
        clearSession(countryCode, phone);
        result = menuResult;
      } else if (menuResult.startFlow === "personal") {
        clearSession(countryCode, phone);
        result = startPersonalFinanceFlow();
        saveDraft(countryCode, phone, result.draft);
      } else if (menuResult.startFlow === "debt") {
        clearSession(countryCode, phone);
        result = startDebtPurchaseFlow();
        saveDraft(countryCode, phone, result.draft);
      } else {
        // ردود معلوماتية (موقعنا، الدوام، إيقاف خدمات، رقم المساعد)
        clearSession(countryCode, phone);
        result = menuResult;
        if (result.clearDraft) clearDraft(countryCode, phone);
        else if (result.draft) saveDraft(countryCode, phone, result.draft);
        else {
          // أبقِ القائمة جاهزة لاختيار لاحق
          saveDraft(countryCode, phone, {
            flow: "main_menu",
            step: "awaiting_choice",
          });
        }
      }
    } else if (
      yesNo &&
      (currentSession?.awaitingComboInterest || draft?.awaitingComboInterest)
    ) {
      const sessionBase = { ...(currentSession || {}), ...(draft || {}) };
      result = replyPropertyComboInterestDecision(yesNo, sessionBase);
      if (result.data?.awaitingCombo) {
        saveSession(countryCode, phone, result.data);
        saveDraft(countryCode, phone, {
          flow: "personal_chat",
          step: "done",
          ...result.data,
        });
      } else {
        clearDraft(countryCode, phone);
        saveSession(countryCode, phone, {
          ...sessionBase,
          awaitingComboInterest: false,
          awaitingCombo: false,
          comboDecision: yesNo,
        });
      }
    } else if (yesNo && (currentSession?.awaitingCombo || draft?.awaitingCombo)) {
      result = replyPropertyComboDecision(yesNo);
      saveSession(countryCode, phone, {
        ...(currentSession || draft || {}),
        awaitingCombo: false,
        awaitingComboInterest: false,
        comboDecision: yesNo,
      });
      clearDraft(countryCode, phone);
    } else if (
      looksLikeDebtContinueReply(text) &&
      (currentSession?.awaitingDebtContinue || draft?.awaitingDebtContinue)
    ) {
      const choice = looksLikeDebtContinueReply(text);
      result =
        choice === "yes"
          ? buildDebtPurchaseComplete()
          : buildDebtPurchaseDeclined();
      clearDraft(countryCode, phone);
      saveSession(countryCode, phone, {
        ...(currentSession || draft || {}),
        awaitingDebtContinue: false,
      });
    } else if (looksLikePersonalFinanceData(text)) {
      // ما زال يدعم إرسال كل البيانات دفعة واحدة
      const parsed = parsePersonalFinanceMessage(text);
      result = calculatePersonalFinance(parsed);
      if (result.ok && result.data) {
        clearDraft(countryCode, phone);
        saveSession(countryCode, phone, result.data);
      } else if (!parsed.jobCategory) {
        saveDraft(countryCode, phone, parsed);
      }
    } else if (looksLikeStartPersonalFinance(text)) {
      result = startPersonalFinanceFlow();
      saveDraft(countryCode, phone, result.draft);
    } else if (looksLikeStartDebtPurchase(text)) {
      result = startDebtPurchaseFlow();
      saveDraft(countryCode, phone, result.draft);
    } else if (draft?.flow === "personal_chat" && draft.step && draft.step !== "done") {
      result = advancePersonalFinanceFlow(draft, text);
      if (result.clearDraft || result.draft == null) {
        clearDraft(countryCode, phone);
      } else if (result.draft) {
        saveDraft(countryCode, phone, result.draft);
      }
      if (result.sessionData) {
        const keepComboDraft =
          result.sessionData.awaitingComboInterest ||
          result.sessionData.awaitingCombo;
        if (keepComboDraft) {
          if (result.draft) saveDraft(countryCode, phone, result.draft);
          saveSession(countryCode, phone, result.sessionData);
        } else {
          clearDraft(countryCode, phone);
          saveSession(countryCode, phone, result.sessionData);
        }
      } else if (
        result.data?.awaitingCombo ||
        result.data?.awaitingComboInterest
      ) {
        saveSession(countryCode, phone, result.data);
        if (result.draft) saveDraft(countryCode, phone, result.draft);
      }
    } else if (draft?.flow === "debt_chat" && draft.step && draft.step !== "done") {
      result = advanceDebtPurchaseFlow(draft, text);
      if (result.clearDraft || result.draft == null) {
        clearDraft(countryCode, phone);
      } else if (result.draft) {
        saveDraft(countryCode, phone, result.draft);
      }
      if (result.sessionData) {
        if (!result.draft || result.clearDraft) clearDraft(countryCode, phone);
        saveSession(countryCode, phone, result.sessionData);
      } else if (
        result.data?.awaitingCombo ||
        result.data?.awaitingComboInterest
      ) {
        saveSession(countryCode, phone, result.data);
        if (result.draft) saveDraft(countryCode, phone, result.draft);
      }
    } else if (looksLikeSectorOnlyReply(text)) {
      if (!draft) return;
      const merged = {
        ...draft,
        sectorRaw: text,
        jobCategory: mapSector(text),
      };
      result = calculatePersonalFinance(merged);
      if (result.ok && result.data) {
        clearDraft(countryCode, phone);
        saveSession(countryCode, phone, result.data);
      }
    } else if (looksLikeAmountChoice(text)) {
      const sessionData = getSession(countryCode, phone);
      if (sessionData?.awaitingCombo || sessionData?.awaitingComboInterest) return;
      if (!sessionData?.maxAmount && !sessionData?.rounded) return;
      const amount = parseAmountChoice(text);
      result = calculateSelectedAmount(sessionData || {}, amount);
    } else {
      // رسالة ما انفهمت — أعد القائمة بدل الصمت
      result = showMainMenu(text);
      resumeChat(countryCode, phone);
      clearDraft(countryCode, phone);
      clearSession(countryCode, phone);
      saveDraft(countryCode, phone, result.draft);
      result = {
        ...result,
        replyFallback: result.reply,
        reply: undefined,
      };
    }

    if (!result?.reply && !result?.interactive) return;

    try {
      const mode = await sendResultReply(countryCode, phone, result);
      console.log(
        "[reply:ok]",
        phone,
        mode,
        result.ok,
        result.offer || result.flow || ""
      );
    } catch (err) {
      console.error("[reply:fail]", err.message, err.details || "");
      // إذا فشلت القائمة/الأزرار، حاول النص الاحتياطي
      const fallbackText = result?.replyFallback || result?.reply;
      if (result?.interactive && fallbackText) {
        try {
          await sendInteraktText(countryCode, phone, fallbackText);
          console.log("[reply:fallback-text:ok]", phone);
        } catch (err2) {
          console.error("[reply:fallback-text:fail]", err2.message);
        }
      }
    }
  } catch (err) {
    console.error("[webhook:error]", err);
    if (!res.headersSent) {
      res.status(500).json({ ok: false });
    }
  }
});

mountAdmin(app, {
  adminToken: ADMIN_TOKEN,
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
  interaktConfigured: Boolean(INTERAKT_API_KEY),
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`finance-calc-server على المنفذ ${PORT}`);
  console.log(`Health: /health`);
  console.log(`Webhook: /webhook/interakt`);
  console.log(`Admin: /admin`);
  if (!ADMIN_TOKEN) {
    console.log("تنبيه: ضع ADMIN_TOKEN في متغيرات البيئة لتفعيل لوحة التحكم");
  } else {
    console.log(`Admin token length: ${ADMIN_TOKEN.length} (جاهز)`);
    if (process.env.NODE_ENV !== "production") {
      console.log(`رمز دخول اللوحة: ${ADMIN_TOKEN}`);
    }
  }
});
