/**
 * أي صورة من العميل = رد فوري «تم استلام الطلب»
 * بدون انتظار قراءة OCR حتى ما تعلق الصورة الثانية
 */
const { looksLikeApplicationOrderNumber } = require("./order-number");

function shouldAckInboundImage({ isImage, text } = {}) {
  return Boolean(isImage) && !looksLikeApplicationOrderNumber(text);
}

module.exports = { shouldAckInboundImage };
