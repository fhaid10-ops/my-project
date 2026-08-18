const assert = require("assert");
const {
  parseApplicationOrderNumber,
  looksLikeApplicationOrderNumber,
  extractOrderNumberFromOcr,
  buildOrderNumberAckReply,
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

console.log("OK: order number ack (101 + 8 digits)");
