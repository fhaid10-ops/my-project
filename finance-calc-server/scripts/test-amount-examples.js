const assert = require("assert");
const {
  buildAmountList,
  askAmountExamplesSector,
  parseAmountExamplesSector,
  handleAmountExamplesSector,
  looksLikeAmountExamplesCta,
} = require("../lib/amount-examples");
const {
  parseMainMenuChoice,
  handleMainMenuChoice,
  showMainMenu,
} = require("../lib/main-menu");

assert.strictEqual(parseMainMenuChoice("مبالغ التمويل"), "3");
assert.strictEqual(parseMainMenuChoice("3"), "3");
assert.ok(
  showMainMenu("مرحبا").interactive.rows.some((r) => r.title === "مبالغ التمويل")
);

const ask = askAmountExamplesSector();
assert.strictEqual(ask.interactive.kind, "buttons");
assert.strictEqual(ask.interactive.buttons.length, 3);
assert.strictEqual(ask.draft.step, "awaiting_amount_examples_sector");

assert.strictEqual(parseAmountExamplesSector("عسكري"), "military");
assert.strictEqual(parseAmountExamplesSector("مدني"), "civilian");
assert.strictEqual(parseAmountExamplesSector("قطاع خاص"), "private");
assert.strictEqual(parseAmountExamplesSector("amt_private"), "private");
assert.strictEqual(parseAmountExamplesSector("amt_military"), "military");

const military = handleAmountExamplesSector("عسكري");
assert.ok(military.reply.includes("عسكري"));
assert.ok(military.reply.includes("10,000 ريال"));
assert.ok(military.reply.includes("150,000 ريال"));
assert.ok(military.reply.includes("القسط:"));
assert.strictEqual(military.sendTextThenInteractive, true);
assert.strictEqual(military.interactive?.kind, "buttons");
assert.strictEqual(
  military.interactive.buttons[0].title,
  "تقدم بتمويلك الآن"
);
assert.strictEqual(military.draft.step, "awaiting_amount_examples_cta");
assert.strictEqual(
  looksLikeAmountExamplesCta("start_personal_from_examples"),
  true
);
assert.strictEqual(looksLikeAmountExamplesCta("تقدم بتمويلك الآن"), true);
assert.strictEqual(looksLikeAmountExamplesCta("تقدم بتمويلك الان"), true);
assert.strictEqual(looksLikeAmountExamplesCta("تقدم بطلب التمويل الان"), true);

const { startPersonalFinanceFlow } = require("../lib/conversation");
const fromCta = startPersonalFinanceFlow({ askSector: true });
assert.ok(fromCta.reply, "CTA لازم يرسل سؤال القطاع");
assert.ok(fromCta.interactive, "CTA لازم يرسل أزرار القطاع");

const civilian = buildAmountList("civilian");
assert.ok(civilian.includes("مدني"));
assert.ok(civilian.includes("150,000 ريال"));
assert.ok(civilian.includes("13%"));

const privateList = handleAmountExamplesSector("قطاع خاص");
assert.ok(privateList.reply.includes("قطاع خاص"));
assert.ok(privateList.reply.includes("15.50%"));
assert.ok(privateList.reply.includes("10,000 ريال"));
assert.ok(privateList.reply.includes("150,000 ريال"));
assert.strictEqual(privateList.draft.step, "awaiting_amount_examples_cta");

const fromMenu = handleMainMenuChoice("3");
assert.strictEqual(fromMenu.draft.step, "awaiting_amount_examples_sector");

console.log("test-amount-examples: OK");
