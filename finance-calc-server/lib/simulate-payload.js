/**
 * بناء جسم Webhook مثل Interakt — للاختبار المحلي بدون واتساب
 */
function buildCustomerMessagePayload({
  phone = "500000001",
  countryCode = "+966",
  text = "",
  buttonText,
  isImage = false,
  ocrText,
} = {}) {
  const message = {
    message: String(text || ""),
    message_content_type: isImage ? "Image" : "Text",
  };
  if (buttonText) message.button_text = String(buttonText);
  if (isImage) {
    message.media_url = "https://cdn.interakt.ai/media/simulate.jpg";
    if (ocrText != null) message.ocr_text = String(ocrText);
  }
  return {
    type: "message_received",
    data: {
      customer: {
        phone_number: String(phone).replace(/\D/g, ""),
        country_code: countryCode,
      },
      message,
    },
  };
}

module.exports = { buildCustomerMessagePayload };
