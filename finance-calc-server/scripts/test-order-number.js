const assert = require("assert");
const {
  parseApplicationOrderNumber,
  looksLikeApplicationOrderNumber,
  buildOrderNumberAckReply,
} = require("../lib/order-number");
const CONFIG = require("../config");

assert.strictEqual(parseApplicationOrderNumber("10171234"), "10171234");
assert.strictEqual(parseApplicationOrderNumber("10169876"), "10169876");
assert.strictEqual(parseApplicationOrderNumber("رقم الطلب 10171234"), "10171234");
assert.strictEqual(parseApplicationOrderNumber("رقم الطلب 10169876"), "10169876");

assert.strictEqual(parseApplicationOrderNumber("1017"), null);
assert.strictEqual(parseApplicationOrderNumber("10170"), null);
assert.strictEqual(parseApplicationOrderNumber("101712345"), null); // أطول من 8
assert.strictEqual(parseApplicationOrderNumber("101612345"), null);
assert.strictEqual(parseApplicationOrderNumber("10151234"), null); // بادئة غلط
assert.strictEqual(parseApplicationOrderNumber("8000"), null);

assert.ok(looksLikeApplicationOrderNumber("10171234"));
assert.ok(looksLikeApplicationOrderNumber("10169876"));
assert.ok(!looksLikeApplicationOrderNumber("1017123456"));

const reply = buildOrderNumberAckReply(CONFIG.messages);
assert.match(reply, /تم استلام رقم الطلب/);
assert.match(reply, /24 إلى 48/);
assert.match(reply, /عبدالرحمن/);
assert.match(reply, /0531240724/);

console.log("OK: order number ack (1016|1017 + 8 digits)");
