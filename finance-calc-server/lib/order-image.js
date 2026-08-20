/**
 * قراءة رقم طلب التقديم من صورة واتساب (Interakt media_url)
 * يعتمد Tesseract محلياً — بدون إرسال الصورة لخدمة خارجية
 */
const { extractOrderNumberFromOcr } = require("./order-number");

function looksLikeLockedPortalAccount(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return false;
  const locked =
    /تم\s*قفل\s*حسابك|قفل\s*حسابك|حسابك\s+حاليا.?[^\n]{0,40}قفل|account[^\n]{0,60}locked|locked[^\n]{0,40}account/i.test(
      s
    );
  const loginFail = /فشل\s*تسجيل\s*الدخول|login\s*failed/i.test(s);
  const portal =
    /portal\.sfco|sfco\.com|الشركة السعودية للتمويل|saudi finance/i.test(s);
  const support = /فريق الدعم|contact[^\n]{0,24}support/i.test(s);
  return locked || (loginFail && (portal || support));
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 12000;
const OCR_TIMEOUT_MS = 25000;
const TESSDATA_CACHE = process.env.TESSDATA_CACHE || "/tmp/tesseract";

let workerPromise = null;
let ocrChain = Promise.resolve();

function isOcrEnabled() {
  const v = String(process.env.ORDER_IMAGE_OCR || "1")
    .trim()
    .toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

function isPrivateHostname(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]"
  ) {
    return true;
  }
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(host)) return true;
  return false;
}

function isSafeMediaUrl(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw || ""));
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (isPrivateHostname(parsed.hostname)) return false;
  return true;
}

function looksLikeImageBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true; // jpeg
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return true; // png
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true; // gif
  const head = buf.subarray(0, 4).toString("ascii");
  const webp = buf.subarray(8, 12).toString("ascii");
  if (head === "RIFF" && webp === "WEBP") return true;
  return false;
}

async function downloadImage(url, { fetchImpl = fetch } = {}) {
  if (!isSafeMediaUrl(url)) {
    throw new Error("unsafe media url");
  }
  const res = await fetchImpl(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    headers: { Accept: "image/*,*/*" },
  });
  if (!res.ok) {
    throw new Error(`media download ${res.status}`);
  }
  const length = Number(res.headers.get("content-length") || 0);
  if (length > MAX_IMAGE_BYTES) {
    throw new Error("media too large");
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_IMAGE_BYTES) {
    throw new Error("media too large");
  }
  if (!looksLikeImageBuffer(buf)) {
    const mime = String(res.headers.get("content-type") || "").toLowerCase();
    if (!mime.startsWith("image/")) {
      throw new Error("not an image");
    }
  }
  return buf;
}

const OCR_LANGS = ["ara+eng", "eng"];
const OCR_DIGIT_WHITELIST = "0123456789٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹";

async function createOcrWorker(create) {
  let lastErr;
  for (const lang of OCR_LANGS) {
    try {
      const worker = await create(lang, 1, {
        cachePath: TESSDATA_CACHE,
        logger: () => {},
      });
      console.log("[order-image] ocr lang", lang);
      return worker;
    } catch (err) {
      lastErr = err;
      console.error("[order-image] ocr lang fail", lang, err.message || err);
    }
  }
  throw lastErr || new Error("ocr worker failed");
}

async function getWorker(createWorkerFn) {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = require("tesseract.js");
      const create = createWorkerFn || createWorker;
      return createOcrWorker(create);
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label || "timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function recognizeDigits(buffer, { createWorkerFn } = {}) {
  const worker = await getWorker(createWorkerFn);
  const texts = [];

  const first = await withTimeout(
    worker.recognize(buffer),
    OCR_TIMEOUT_MS,
    "ocr timeout"
  );
  texts.push(String(first?.data?.text || ""));
  if (extractOrderNumberFromOcr(texts[0])) return texts[0];

  const extraPasses = [
    { tessedit_char_whitelist: OCR_DIGIT_WHITELIST },
    { tessedit_pageseg_mode: "6" },
    { tessedit_pageseg_mode: "11" },
  ];
  for (const params of extraPasses) {
    try {
      await worker.setParameters(params);
      const { data } = await withTimeout(
        worker.recognize(buffer),
        OCR_TIMEOUT_MS,
        "ocr timeout"
      );
      const piece = String(data?.text || "");
      texts.push(piece);
      if (extractOrderNumberFromOcr(piece)) {
        await resetOcrParameters(worker);
        return piece;
      }
    } catch (err) {
      console.error("[order-image] ocr pass fail", err.message || err);
    }
  }
  await resetOcrParameters(worker);
  return texts.filter(Boolean).join("\n");
}

async function resetOcrParameters(worker) {
  if (!worker || typeof worker.setParameters !== "function") return;
  try {
    await worker.setParameters({
      tessedit_char_whitelist: "",
      tessedit_pageseg_mode: "3",
    });
  } catch {
    // تجاهل — نكمل بالنص اللي تجمع
  }
}

function enqueue(fn) {
  const run = ocrChain.then(fn, fn);
  ocrChain = run.then(
    () => {},
    () => {}
  );
  return run;
}

async function inspectInboundImage(url, deps = {}) {
  if (!isOcrEnabled() || !url) {
    return { kind: "unknown", orderNumber: null, ocrText: "" };
  }
  return enqueue(async () => {
    const buf = await downloadImage(url, deps);
    const ocrText =
      typeof deps.recognizeFn === "function"
        ? await deps.recognizeFn(buf)
        : await recognizeDigits(buf, deps);
    const text = String(ocrText || "");
    const orderNumber = extractOrderNumberFromOcr(text) || null;
    if (orderNumber) {
      return { kind: "order_number", orderNumber, ocrText: text };
    }
    if (looksLikeLockedPortalAccount(text)) {
      console.log(
        "[order-image:account-locked]",
        text.replace(/\s+/g, " ").slice(0, 180)
      );
      return { kind: "account_locked", orderNumber: null, ocrText: text };
    }
    if (text.trim()) {
      console.log(
        "[order-image:ocr-text]",
        text.replace(/\s+/g, " ").slice(0, 220)
      );
    }
    return { kind: "unknown", orderNumber: null, ocrText: text };
  });
}

async function readOrderNumberFromImage(url, deps = {}) {
  const info = await inspectInboundImage(url, deps);
  return info.orderNumber || null;
}

module.exports = {
  MAX_IMAGE_BYTES,
  OCR_LANGS,
  isOcrEnabled,
  isSafeMediaUrl,
  looksLikeImageBuffer,
  looksLikeLockedPortalAccount,
  downloadImage,
  inspectInboundImage,
  readOrderNumberFromImage,
  extractOrderNumberFromOcr,
};
