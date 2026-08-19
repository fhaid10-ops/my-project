const assert = require("assert");
const {
  looksLikeShowMainMenu,
  looksLikeMenuShortcut,
  looksLikeGreeting,
} = require("../lib/main-menu");
const { advancePersonalFinanceFlow } = require("../lib/conversation");

assert.strictEqual(looksLikeShowMainMenu("مرحبا"), true);
assert.strictEqual(looksLikeShowMainMenu("السلام عليكم"), true);
assert.strictEqual(looksLikeShowMainMenu("وعليكم السلام"), false);
assert.strictEqual(looksLikeGreeting("وعليكم السلام"), false);
assert.strictEqual(looksLikeMenuShortcut("1"), true);
assert.strictEqual(looksLikeMenuShortcut("١"), true);

assert.strictEqual(looksLikeGreeting("طيب"), false);
assert.strictEqual(looksLikeShowMainMenu("طيب"), false);
assert.strictEqual(looksLikeShowMainMenu("تمام"), false);
assert.strictEqual(looksLikeShowMainMenu("S20000"), false);
assert.strictEqual(looksLikeShowMainMenu("15000"), false);
assert.strictEqual(looksLikeMenuShortcut("طيب"), false);

const start = { flow: "personal_chat", step: "sector" };
const afterCivilian = advancePersonalFinanceFlow(start, "مدني");
const afterGov = advancePersonalFinanceFlow(afterCivilian.draft, "حكومي");
assert.strictEqual(afterGov.draft.step, "salary");
const afterSalary = advancePersonalFinanceFlow(afterGov.draft, "15000");
assert.ok(afterSalary.ok);
assert.strictEqual(afterSalary.draft.step, "commitments");
assert.match(afterSalary.reply, /التزام/);

console.log("OK: القائمة فقط عند التحية أو 1، والراتب يكمل المسار");
