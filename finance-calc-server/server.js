/**
 * سيرفر الحاسبة + Webhook Interakt
 * يشتغل على جهاز البيت (جهاز عبدالرحمن)
 */
require("dotenv").config();
const express = require("express");
const {
  parsePersonalFinanceMessage,
  looksLikePersonalFinanceData,
  calculatePersonalFinance,
} = require("./lib/personal-finance");

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 5055);
const INTERAKT_API_KEY = String(process.env.INTERAKT_API_KEY || "").trim();
const WEBHOOK_SECRET = String(process.env.WEBHOOK_SECRET || "").trim();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "finance-calc-server",
    interaktConfigured: Boolean(INTERAKT_API_KEY),
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

async function sendInteraktText(countryCode, phoneNumber, message) {
  if (!INTERAKT_API_KEY) {
    throw new Error("INTERAKT_API_KEY غير موجود في ملف .env");
  }

  const payload = {
    countryCode,
    phoneNumber,
    type: "Text",
    data: {
      message,
    },
  };

  const response = await fetch("https://api.interakt.ai/v1/public/message/", {
    method: "POST",
    headers: {
      Authorization: `Basic ${INTERAKT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

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

function extractIncomingMessage(payload) {
  const data = payload?.data || payload;
  const messageObj = data?.message || {};
  const customer = data?.customer || {};

  const text =
    messageObj?.message ||
    messageObj?.text ||
    messageObj?.body ||
    data?.text ||
    "";

  let phone =
    customer?.phone_number ||
    customer?.phoneNumber ||
    customer?.trailing_phone ||
    "";
  let countryCode =
    customer?.country_code ||
    customer?.countryCode ||
    "+966";

  phone = String(phone).replace(/\D/g, "");
  if (phone.startsWith("966") && phone.length > 9) {
    phone = phone.slice(3);
  }
  if (phone.startsWith("0")) phone = phone.slice(1);

  countryCode = String(countryCode || "+966");
  if (!countryCode.startsWith("+")) countryCode = `+${countryCode}`;

  return { text: String(text || ""), phone, countryCode };
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
    const { text, phone, countryCode } = extractIncomingMessage(payload);

    console.log("[webhook]", { type, phone, preview: text.slice(0, 80) });

    if (!phone || !text) return;
    if (!looksLikePersonalFinanceData(text)) return;

    const parsed = parsePersonalFinanceMessage(text);
    const result = calculatePersonalFinance(parsed);

    try {
      await sendInteraktText(countryCode, phone, result.reply);
      console.log("[reply:ok]", phone, result.ok);
    } catch (err) {
      console.error("[reply:fail]", err.message, err.details || "");
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
