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
const { extractIncomingMessage } = require("./lib/webhook-parse");

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 5055);
const INTERAKT_API_KEY = String(process.env.INTERAKT_API_KEY || "").trim();
const WEBHOOK_SECRET = String(process.env.WEBHOOK_SECRET || "").trim();

/** جلسات مؤقتة: phone -> نتيجة الحسبة (أعلى مبلغ + نسبة) */
const sessions = new Map();
/** مسودات ناقصة: phone -> بيانات الراتب/الالتزامات بانتظار القطاع */
const drafts = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 6; // 6 ساعات

function sessionKey(countryCode, phone) {
  return `${countryCode}:${phone}`;
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

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "finance-calc-server",
    interaktConfigured: Boolean(INTERAKT_API_KEY),
    activeSessions: sessions.size,
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
    await sendInteraktInteractive(countryCode, phone, result.interactive);
    return "text+interactive";
  }
  if (result?.interactive) {
    await sendInteraktInteractive(countryCode, phone, result.interactive);
    return "interactive";
  }
  if (result?.reply) {
    await sendInteraktText(countryCode, phone, result.reply);
    return "text";
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

    // تجاهل أحداث التسليم/القراءة؛ نقبل message_received وضغط الأزرار
    const ignoredTypes = /^(message_api_sent|message_api_delivered|message_api_read|message_api_failed|message_campaign_)/i;
    if (type && ignoredTypes.test(String(type)) && !payload?.data?.message?.button_text) {
      return;
    }

    if (!phone || !text) return;

    let result = null;
    const yesNo = looksLikeYesNoReply(text);
    const currentSession = getSession(countryCode, phone);
    const draft = getDraft(countryCode, phone);

    if (yesNo && (currentSession?.awaitingCombo || draft?.awaitingCombo)) {
      result = replyPropertyComboDecision(yesNo);
      saveSession(countryCode, phone, {
        ...(currentSession || draft || {}),
        awaitingCombo: false,
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
        clearDraft(countryCode, phone);
        saveSession(countryCode, phone, result.sessionData);
      } else if (result.data?.awaitingCombo) {
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
      } else if (result.data?.awaitingCombo) {
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
      if (sessionData?.awaitingCombo) return;
      if (!sessionData?.maxAmount && !sessionData?.rounded) return;
      const amount = parseAmountChoice(text);
      result = calculateSelectedAmount(sessionData || {}, amount);
    } else {
      return;
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
      if (result?.interactive && result?.reply) {
        try {
          await sendInteraktText(countryCode, phone, result.reply);
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

app.listen(PORT, () => {
  console.log(`finance-calc-server على المنفذ ${PORT}`);
  console.log(`Health: http://127.0.0.1:${PORT}/health`);
  console.log(`Webhook: http://127.0.0.1:${PORT}/webhook/interakt`);
});
