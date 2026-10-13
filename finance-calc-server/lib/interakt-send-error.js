/**
 * تفسير أخطاء إرسال Interakt — خصوصاً المحفظة الفارغة
 * حتى تظهر في الصحة ولوحة التحكم بدل «رفض الإرسال» فقط.
 */

let lastOutboundError = null;

function flattenInteraktErrorBody(json) {
  if (json == null) return "";
  if (typeof json === "string") return json;
  if (Array.isArray(json)) {
    return json
      .map((item) => flattenInteraktErrorBody(item))
      .filter(Boolean)
      .join(" — ");
  }
  if (typeof json === "object") {
    return [
      json.message,
      json.error,
      json.msg,
      json.detail,
      flattenInteraktErrorBody(json.details),
      json.raw,
    ]
      .filter(Boolean)
      .join(" — ");
  }
  return String(json);
}

function describeInteraktFailure({ status = 0, json = null, networkMessage = "" } = {}) {
  const raw = [networkMessage, flattenInteraktErrorBody(json)]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 400);
  const blob = raw.toLowerCase();

  if (/wallet|insufficient balance|recharge your wallet|recharge/.test(blob)) {
    return {
      code: "wallet_empty",
      hint: "محفظة Interakt فارغة — اشحن الرصيد من لوحة Interakt حتى يرجع الرد الآلي.",
      raw,
    };
  }
  if (
    /24\s*hour|24hr|session expir|outside.*window|not messaged|customer care window/.test(
      blob
    )
  ) {
    return {
      code: "outside_window",
      hint: "خارج نافذة واتساب 24 ساعة — الرسالة العادية لا تصل، استخدم قالب إنترأكت.",
      raw,
    };
  }
  if (/unauthorized|invalid api|api key|forbidden/.test(blob) || Number(status) === 401) {
    return {
      code: "auth",
      hint: "مفتاح Interakt مرفوض — تحقق من INTERAKT_API_KEY في إعدادات السيرفر.",
      raw,
    };
  }
  if (networkMessage && !json) {
    return {
      code: "connection",
      hint: `فشل الاتصال بـ Interakt: ${networkMessage}`,
      raw,
    };
  }
  return {
    code: "send_failed",
    hint: raw
      ? `Interakt ${status || ""}: ${raw}`.replace(/\s+/g, " ").trim()
      : `Interakt ${status || ""}: رفض الإرسال`.replace(/\s+/g, " ").trim(),
    raw,
  };
}

function recordOutboundError(described, extra = {}) {
  lastOutboundError = {
    code: described?.code || "send_failed",
    hint:
      described?.hint ||
      "فشل إرسال الرد الآلي عبر Interakt",
    raw: described?.raw || null,
    phone: extra.phone || described?.phone || null,
    at: extra.at || new Date().toISOString(),
  };
  return lastOutboundError;
}

function recordOutboundSuccess() {
  lastOutboundError = null;
}

function getLastOutboundError() {
  return lastOutboundError;
}

module.exports = {
  flattenInteraktErrorBody,
  describeInteraktFailure,
  recordOutboundError,
  recordOutboundSuccess,
  getLastOutboundError,
};
