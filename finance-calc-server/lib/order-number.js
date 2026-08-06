/**
 * رقم طلب التقديم الإلكتروني — يبدأ بـ 1017
 */
const { normalizeDigits } = require("./digits");

const ORDER_PREFIX = "1017";
const MIN_DIGITS = 8; // 1017 + 4 على الأقل

function parseApplicationOrderNumber(text) {
  const raw = normalizeDigits(String(text || "")).trim();
  if (!raw) return null;

  const digitsOnly = raw.replace(/\D/g, "");
  if (
    digitsOnly.startsWith(ORDER_PREFIX) &&
    digitsOnly.length >= MIN_DIGITS &&
    digitsOnly.length <= 20 &&
    /^1017\d+$/.test(digitsOnly)
  ) {
    // الرسالة تقريبًا كلها الرقم (مع كلمات خفيفة مسموحة)
    const withoutDigits = raw.replace(/\d/g, "").replace(/[^\u0600-\u06FFa-zA-Z]/g, "");
    const allowedWords = /^(رقم|الطلب|طلبي|طلب)?$/i;
    if (!withoutDigits || allowedWords.test(withoutDigits)) {
      return digitsOnly;
    }
  }

  // «رقم الطلب: 1017xxxxxxx»
  const labeled = raw.match(
    /(?:رقم\s*الطلب|طلب(?:ي)?)\s*[:：\-]?\s*(1017\d{4,17})\b/i
  );
  if (labeled) return labeled[1];

  return null;
}

function looksLikeApplicationOrderNumber(text) {
  return parseApplicationOrderNumber(text) != null;
}

function buildOrderNumberAckReply(configMessages = {}) {
  const custom = configMessages.orderNumberRecorded;
  if (typeof custom === "string" && custom.trim()) return custom.trim();
  return `تم استلام رقم الطلب
سيتم الرد خلال 24 إلى 48 ساعه ايام عمل
للاستفسار تواصل مع عبدالرحمن 0531240724`;
}

module.exports = {
  ORDER_PREFIX,
  parseApplicationOrderNumber,
  looksLikeApplicationOrderNumber,
  buildOrderNumberAckReply,
};
