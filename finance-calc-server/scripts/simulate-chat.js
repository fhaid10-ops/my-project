/**
 * محاكاة محادثة كاملة مع البوت بدون واتساب وبدون نشر.
 * يشغّل نفس مسار الـ Webhook ويطبع الردود في الطرفية.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "kobri-sim-"));
process.env.WEBHOOK_DRY_RUN = "1";
process.env.WEBHOOK_SECRET = "";
process.env.INTERAKT_API_KEY = "";
process.env.CUSTOMERS_DATA_DIR = dataDir;
process.env.ORDER_IMAGE_OCR = "0";

const {
  processInboundPayload,
  drainDryRunOutbox,
} = require("../server");
const { buildCustomerMessagePayload } = require("../lib/simulate-payload");

function joined(replies) {
  return (replies || [])
    .map((r) => String(r.text || r.body || r.name || ""))
    .join("\n");
}

async function say(label, phone, opts) {
  drainDryRunOutbox();
  await processInboundPayload(
    buildCustomerMessagePayload({ phone, ...opts })
  );
  const replies = drainDryRunOutbox();
  const out = joined(replies);
  console.log(`\n—— ${label} ——`);
  console.log(`العميل: ${opts.buttonText || opts.text || (opts.isImage ? "[صورة]" : "")}`);
  if (!out.trim()) {
    console.log("البوت: (ما رد — وهذا متوقع في بعض الخطوات)");
  } else {
    console.log(`البوت:\n${out}`);
  }
  return replies;
}

async function run() {
  const financePhone = "500111001";
  const orderPhone = "500111002";
  const thanksPhone = "500111003";
  const missPhone = "500111004";
  const selfiePhone = "500111005";
  const ocrPhone = "500111006";

  const menu = await say("1) السلام → القائمة", financePhone, {
    text: "مرحبا",
  });
  assert.match(joined(menu), /تمويل شخصي/);

  await say("2) اختيار تمويل شخصي", financePhone, {
    text: "تمويل شخصي",
    buttonText: "تمويل شخصي",
  });

  const sector = await say("3) قطاع عسكري", financePhone, {
    text: "عسكري",
    buttonText: "عسكري",
  });
  assert.match(joined(sector), /راتبك/);

  const salary = await say("4) الراتب", financePhone, { text: "10000" });
  assert.match(joined(salary), /التزام/);

  const commitments = await say("5) الالتزامات", financePhone, { text: "0" });
  assert.match(joined(commitments), /عقاري/);

  const result = await say("6) لا يوجد عقاري → نتيجة الحسبة", financePhone, {
    text: "لا يوجد عقاري",
    buttonText: "لا يوجد عقاري",
  });
  const resultText = joined(result);
  assert.ok(
    /أعلى مبلغ|المبلغ|قسط|اختر مبلغ/i.test(resultText),
    `توقعت نتيجة حسبة، وصل: ${resultText.slice(0, 200)}`
  );

  const order = await say("7) رقم طلب مكتوب", orderPhone, {
    text: "10171992",
  });
  assert.match(joined(order), /تم استلام رقم الطلب/);

  const thanks = await say("8) صورة شكر (بارك الله فيك)", thanksPhone, {
    text: "بارك الله فيك",
    isImage: true,
    ocrText: "بارك الله فيك\nالله يعافيك",
  });
  assert.doesNotMatch(
    joined(thanks),
    /ما قدرت أقرأ رقم الطلب/,
    "صورة الشكر ما المفروض تطلب رقم الطلب"
  );

  const miss = await say("9) شاشة تقديم بدون رقم واضح", missPhone, {
    text: "",
    isImage: true,
    ocrText: "تم تقديم الطلب بنجاح\nرقم طلبك الحالي",
  });
  assert.match(joined(miss), /ما قدرت أقرأ رقم الطلب/);

  const selfie = await say("10) صورة عادية بدون طلب", selfiePhone, {
    text: "",
    isImage: true,
    ocrText: "مرحبا",
  });
  assert.doesNotMatch(joined(selfie), /ما قدرت أقرأ رقم الطلب/);

  const fromOcr = await say("11) صورة طلب فيها الرقم", ocrPhone, {
    text: "",
    isImage: true,
    ocrText: "تم تقديم الطلب بنجاح\nرقم الطلب ١٠١٧١٩١٥",
  });
  assert.match(joined(fromOcr), /تم استلام رقم الطلب/);

  console.log("\n==============================");
  console.log("نجحت محاكاة البوت كامل (بدون واتساب وبدون نشر)");
  console.log(`ملفات التجربة المؤقتة: ${dataDir}`);
  console.log("==============================");
}

run().catch((err) => {
  console.error("FAIL: simulate-chat", err);
  process.exitCode = 1;
});
