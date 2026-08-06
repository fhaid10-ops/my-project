const assert = require("assert");
const {
  parseApplicationOrderNumber,
  looksLikeApplicationOrderNumber,
  buildOrderNumberAckReply,
} = require("../lib/order-number");
const CONFIG = require("../config");
const { looksLikeAmountChoice } = require("../lib/personal-finance");

assert.strictEqual(parseApplicationOrderNumber("1017123456"), "1017123456");
assert.strictEqual(parseApplicationOrderNumber("رقم الطلب 1017987654"), "1017987654");
assert.strictEqual(parseApplicationOrderNumber("1017"), null); // قصير
assert.strictEqual(parseApplicationOrderNumber("10170"), null); // راتب محتمل
assert.strictEqual(parseApplicationOrderNumber("8000"), null);
assert.ok(looksLikeApplicationOrderNumber("1017123456"));

// رقم الطلب لازم يُلتقط قبل ما ينحسب كمبلغ تمويل
assert.ok(looksLikeAmountChoice("1017123456"));
assert.ok(looksLikeApplicationOrderNumber("1017123456"));

const reply = buildOrderNumberAckReply(CONFIG.messages);
assert.match(reply, /تم استلام رقم الطلب/);
assert.match(reply, /24 إلى 48/);
assert.match(reply, /عبدالرحمن/);
assert.match(reply, /0531240724/);

console.log("OK: order number ack (1017…)");
