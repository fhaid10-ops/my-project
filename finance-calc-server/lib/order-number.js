/**
 * رقم طلب التقديم الإلكتروني — يبدأ بـ 101 ويتكون من 8 أرقام
 */
const { normalizeDigits } = require("./digits");

const ORDER_PREFIX = "101";
const ORDER_DIGITS = 8;
const ORDER_NUMBER_RE = /^101\d{5}$/;

function extractOrderCandidate(raw) {
  const digitsOnly = String(raw || "").replace(/\D/g, "");
  if (ORDER_NUMBER_RE.test(digitsOnly)) return digitsOnly;

  // «رقم الطلب: 101xxxxx» داخل نص أطول
  const labeled = String(raw || "").match(
    /(?:رقم\s*الطلب|طلب(?:ي)?)\s*[:：\-]?\s*(101\d{5})\b/i
  );
  if (labeled) return labeled[1];

  const embedded = String(raw || "").match(/\b(101\d{5})\b/);
  if (embedded) return embedded[1];

  return null;
}

function collectOrderNumbersFromDigits(digits) {
  const raw = String(digits || "");
  const found = [];
  const seen = new Set();
  for (let i = 0; i + ORDER_DIGITS <= raw.length; i += 1) {
    const slice = raw.slice(i, i + ORDER_DIGITS);
    if (!ORDER_NUMBER_RE.test(slice) || seen.has(slice)) continue;
    seen.add(slice);
    found.push(slice);
  }
  return found;
}

function pickPreferredOrderNumber(candidates) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  return candidates.find((n) => String(n).startsWith("1017")) || candidates[0];
}

/** OCR غالبًا يخلط O/0 و I/1؛ نفضّل الأرقام التي تبدأ بـ 1017 */
function normalizeOcrGarbage(text) {
  return normalizeDigits(String(text || ""))
    .replace(/[Oo]/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(/[Zz]/g, "2")
    .replace(/[Ss]/g, "5")
    .replace(/[Bb]/g, "8");
}

function extractOrderNumberFromOcr(text) {
  const normalized = normalizeDigits(String(text || ""));
  const labeled = extractOrderCandidate(normalized);
  const extra = labeled && ORDER_NUMBER_RE.test(labeled) ? [labeled] : [];
  const fromRaw = collectOrderNumbersFromDigits(normalized.replace(/\D/g, ""));
  const fromSwapped = collectOrderNumbersFromDigits(
    normalizeOcrGarbage(normalized).replace(/\D/g, "")
  );
  return pickPreferredOrderNumber([...extra, ...fromRaw, ...fromSwapped]);
}

function parseApplicationOrderNumber(text) {
  const raw = normalizeDigits(String(text || "")).trim();
  if (!raw) return null;

  const candidate = extractOrderCandidate(raw);
  if (!candidate || !ORDER_NUMBER_RE.test(candidate)) return null;

  const digitsOnly = raw.replace(/\D/g, "");
  // الرسالة كلها الرقم، أو رقم الطلب مع كلمات خفيفة، أو الرقم مضمّن بعد تسمية
  if (digitsOnly === candidate) {
    const withoutDigits = raw
      .replace(/\d/g, "")
      .replace(/[^\u0600-\u06FFa-zA-Z]/g, "");
    const allowedWords = /^(رقم|الطلب|طلبي|طلب)?$/i;
    if (!withoutDigits || allowedWords.test(withoutDigits)) {
      return candidate;
    }
  }

  if (
    /(?:رقم\s*الطلب|طلب(?:ي)?)/i.test(raw) &&
    digitsOnly.includes(candidate)
  ) {
    return candidate;
  }

  // رقم 8 خانات وحده في الرسالة
  if (digitsOnly === candidate) return candidate;

  return null;
}

function looksLikeApplicationOrderNumber(text) {
  return parseApplicationOrderNumber(text) != null;
}

function buildOrderNumberAckReply(configMessages = {}) {
  const custom = configMessages.orderNumberRecorded;
  if (typeof custom === "string" && custom.trim()) return custom.trim();
  return `تم استلام رقم الطلب
سيتم الرد في أقرب وقت ممكن 
لمتابعة الطلب  ارسل رقم الطلب إلى 
 عبدالرحمن 
0595243553`;
}

function buildOrderImageMissReply(configMessages = {}) {
  const custom = configMessages.orderImageUnreadable;
  if (typeof custom === "string" && custom.trim()) return custom.trim();
  return `ما قدرت أقرأ رقم الطلب من الصورة.
أرسل رقم الطلب (8 أرقام ويبدأ بـ 101).`;
}

module.exports = {
  ORDER_PREFIX,
  ORDER_DIGITS,
  ORDER_NUMBER_RE,
  parseApplicationOrderNumber,
  looksLikeApplicationOrderNumber,
  extractOrderNumberFromOcr,
  buildOrderNumberAckReply,
  buildOrderImageMissReply,
};
