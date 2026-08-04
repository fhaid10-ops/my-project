const assert = require("assert");
const {
  buildAmountList,
  askAmountExamplesSector,
  parseAmountExamplesSector,
  handleAmountExamplesSector,
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
assert.strictEqual(ask.interactive.buttons.length, 2);
assert.strictEqual(ask.draft.step, "awaiting_amount_examples_sector");

assert.strictEqual(parseAmountExamplesSector("عسكري"), "military");
assert.strictEqual(parseAmountExamplesSector("مدني"), "civilian");
assert.strictEqual(parseAmountExamplesSector("amt_military"), "military");

const military = handleAmountExamplesSector("عسكري");
assert.ok(military.reply.includes("عسكري"));
assert.ok(military.reply.includes("10,000 ريال"));
assert.ok(military.reply.includes("150,000 ريال"));
assert.ok(military.reply.includes("القسط:"));

const civilian = buildAmountList("civilian");
assert.ok(civilian.includes("مدني"));
assert.ok(civilian.includes("150,000 ريال"));

const fromMenu = handleMainMenuChoice("3");
assert.strictEqual(fromMenu.draft.step, "awaiting_amount_examples_sector");

console.log("test-amount-examples: OK");
