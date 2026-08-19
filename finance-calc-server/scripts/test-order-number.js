const assert = require("assert");
const {
  parseApplicationOrderNumber,
  looksLikeApplicationOrderNumber,
  extractOrderNumberFromOcr,
  buildOrderNumberAckReply,
  buildOrderImageMissReply,
  looksLikeThanksOrBlessing,
  looksLikeOrderScreenshot,
  shouldAskForOrderNumberFromImage,
} = require("../lib/order-number");
const CONFIG = require("../config");

assert.strictEqual(parseApplicationOrderNumber("10171234"), "10171234");
assert.strictEqual(parseApplicationOrderNumber("10169876"), "10169876");
assert.strictEqual(parseApplicationOrderNumber("10151234"), "10151234");
assert.strictEqual(parseApplicationOrderNumber("رقم الطلب 10171234"), "10171234");
assert.strictEqual(parseApplicationOrderNumber("رقم الطلب 10101234"), "10101234");

assert.strictEqual(parseApplicationOrderNumber("1017"), null);
assert.strictEqual(parseApplicationOrderNumber("10170"), null);
assert.strictEqual(parseApplicationOrderNumber("101712345"), null); // أطول من 8
assert.strictEqual(parseApplicationOrderNumber("101612345"), null);
assert.strictEqual(parseApplicationOrderNumber("10201234"), null); // ما يبدأ بـ 101
assert.strictEqual(parseApplicationOrderNumber("8000"), null);

assert.ok(looksLikeApplicationOrderNumber("10171234"));
assert.ok(looksLikeApplicationOrderNumber("10101234"));
assert.ok(!looksLikeApplicationOrderNumber("1017123456"));

const reply = buildOrderNumberAckReply(CONFIG.messages);
assert.match(reply, /تم استلام رقم الطلب/);
assert.match(reply, /أقرب وقت ممكن/);
assert.match(reply, /لمتابعة الطلب/);
assert.match(reply, /عبدالرحمن/);
assert.match(reply, /0595243553/);

assert.strictEqual(extractOrderNumberFromOcr("10178456"), "10178456");
assert.strictEqual(extractOrderNumberFromOcr("1017 8456"), "10178456");
assert.strictEqual(extractOrderNumberFromOcr("رقم الطلب\n1 0 1 7 8 4 5 6"), "10178456");
assert.strictEqual(extractOrderNumberFromOcr("I0I78456"), "10178456"); // I→1, O→0
assert.strictEqual(extractOrderNumberFromOcr("10101234 و 10178456"), "10178456");
assert.strictEqual(extractOrderNumberFromOcr("فاتورة 8000"), null);
assert.strictEqual(extractOrderNumberFromOcr(""), null);
assert.strictEqual(extractOrderNumberFromOcr("١٠١٧١٩١٥"), "10171915");
assert.strictEqual(
  extractOrderNumberFromOcr(
    "تم تقديم الطلب بنجاح\nمؤهل حتى ٢٢,٦٥١,٩٧٣.٣٠\nرقم الطلب ١٠١٧١٩١٥"
  ),
  "10171915"
);
assert.strictEqual(
  extractOrderNumberFromOcr(
    "تم تقديم الطلب بنجاح!\nتهانينا! أنت مؤهل للحصول على مبلغ ٢٢١,٤٦٢ ر.س بحد أقصى بناءً على رقم طلبك الحالي ١٠١٧١٩٩٢."
  ),
  "10171992"
);
assert.strictEqual(
  extractOrderNumberFromOcr(
    "Congratulations! eligible for 221,462 SAR based on your current request number 10171992."
  ),
  "10171992"
);
assert.strictEqual(parseApplicationOrderNumber("١٠١٧١٩١٥"), "10171915");
assert.strictEqual(parseApplicationOrderNumber("رقم الطلب ١٠١٧١٩١٥"), "10171915");
assert.strictEqual(
  parseApplicationOrderNumber("رقم طلبك الحالي ١٠١٧١٩٩٢"),
  "10171992"
);

const miss = buildOrderImageMissReply(CONFIG.messages);
assert.match(miss, /ما قدرت أقرأ رقم الطلب/);
assert.match(miss, /8 أرقام/);

assert.ok(looksLikeThanksOrBlessing("بارك الله فيك"));
assert.ok(looksLikeThanksOrBlessing("شكراً لك"));
assert.ok(looksLikeThanksOrBlessing("thank you"));
assert.ok(!looksLikeThanksOrBlessing("تم تقديم الطلب بنجاح"));

assert.ok(looksLikeOrderScreenshot("رقم طلبك الحالي"));
assert.ok(looksLikeOrderScreenshot("تم تقديم الطلب بنجاح"));
assert.ok(!looksLikeOrderScreenshot("بارك الله فيك"));

assert.strictEqual(
  shouldAskForOrderNumberFromImage({
    caption: "بارك الله فيك",
    ocrText: "بارك الله فيك الله يعافيك",
  }),
  false
);
assert.strictEqual(
  shouldAskForOrderNumberFromImage({
    caption: "",
    ocrText: "مرحبا",
  }),
  false
);
assert.strictEqual(
  shouldAskForOrderNumberFromImage({
    caption: "",
    ocrText: "تم تقديم الطلب بنجاح\nرقم طلبك الحالي",
  }),
  true
);
assert.strictEqual(
  shouldAskForOrderNumberFromImage({
    caption: "شكرا",
    ocrText: "رقم الطلب 10171915",
    orderNumber: "10171915",
  }),
  false
);

console.log("OK: order number ack (101 + 8 digits)");
