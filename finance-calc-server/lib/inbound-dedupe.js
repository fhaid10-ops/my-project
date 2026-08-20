/**
 * Interakt أحيانًا يرسل نفس نقرة القائمة مرتين
 * (list_reply + نص «تمويل شخصي») فالكوبري يرد قائمتين
 */
const DEFAULT_WINDOW_MS = 3000;

function canonicalizeInbound(text) {
  const t = String(text || "").trim();
  if (
    /^(menu_1|تمويل شخصي|ابي تمويل شخصي|أبي تمويل شخصي|ابي تمويل|أبي تمويل|تمويل|ابدأ|ابدا|ابدأ الحسبة|ابدا الحسبة)$/i.test(
      t
    )
  ) {
    return "personal_finance";
  }
  if (
    /^(menu_2|شراء مديونية|شراء المديونية|شراء مديونية الشركات|مديونية الشركات|ابي شراء مديونية|أبي شراء مديونية|مديونية)$/i.test(
      t
    )
  ) {
    return "debt_purchase";
  }
  return t;
}

function createInboundDedupe(options = {}) {
  const windowMs = Number(options.windowMs) > 0 ? Number(options.windowMs) : DEFAULT_WINDOW_MS;
  const recent = new Map();

  function keyOf(countryCode, phone) {
    return `${countryCode || ""}:${phone || ""}`;
  }

  function prune(now = Date.now()) {
    for (const [key, row] of recent.entries()) {
      if (!row || now - Number(row.at || 0) > windowMs * 4) {
        recent.delete(key);
      }
    }
  }

  function isDuplicate(countryCode, phone, text, extra = {}) {
    const phoneKey = String(phone || "").replace(/\D/g, "");
    if (!phoneKey) return false;
    let normalized = canonicalizeInbound(text);
    if (!normalized && extra && extra.isImage) {
      const url = String(extra.mediaUrl || "").split("?")[0];
      normalized = url ? `img:${url}` : "";
    }
    if (!normalized) return false;
    prune();
    const key = keyOf(countryCode, phoneKey);
    const now = Date.now();
    const prev = recent.get(key);
    recent.set(key, { text: normalized, at: now });
    return Boolean(prev && prev.text === normalized && now - prev.at < windowMs);
  }

  return { isDuplicate, _recent: recent };
}

function looksLikeEchoedMenuBody(text) {
  const t = String(text || "").trim();
  if (t.length < 40) return false;
  return /اختر من القائمة|مرحبا معاك|مانوع استفسارك|1-\s*تمويل شخصي/i.test(t);
}

module.exports = {
  DEFAULT_WINDOW_MS,
  createInboundDedupe,
  canonicalizeInbound,
  looksLikeEchoedMenuBody,
};
