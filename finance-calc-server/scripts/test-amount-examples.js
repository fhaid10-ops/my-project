const assert = require("assert");
const {
  buildAmountList,
  askAmountExamplesSector,
  askAmountExamplesCivilianSubtype,
  parseAmountExamplesSector,
  parseAmountExamplesCivilianSubtype,
  handleAmountExamplesSector,
  handleAmountExamplesCivilianSubtype,
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
assert.ok(ask.interactive.buttons.some((b) => b.title === "مدني"));
assert.ok(ask.interactive.buttons.some((b) => b.title === "عسكري"));
assert.ok(ask.interactive.buttons.some((b) => b.title === "متقاعد"));
assert.strictEqual(ask.draft.step, "awaiting_amount_examples_sector");

assert.strictEqual(parseAmountExamplesSector("عسكري"), "military");
assert.strictEqual(parseAmountExamplesSector("مدني"), "civilian");
assert.strictEqual(parseAmountExamplesSector("متقاعد"), "retired");
assert.strictEqual(parseAmountExamplesSector("قطاع خاص"), null);

assert.strictEqual(parseAmountExamplesCivilianSubtype("قطاع حكومي"), "civilian");
assert.strictEqual(parseAmountExamplesCivilianSubtype("قطاع خاص"), "private");
assert.strictEqual(parseAmountExamplesCivilianSubtype("amt_private"), "private");

const military = handleAmountExamplesSector("عسكري");
assert.ok(military.reply.includes("عسكري"));
assert.ok(military.reply.includes("18.50%"));
assert.ok(military.reply.includes("10,000 ريال"));
assert.ok(military.reply.includes("150,000 ريال"));
assert.strictEqual(military.sendTextThenInteractive, true);
assert.strictEqual(military.interactive?.kind, "buttons");
assert.strictEqual(
  military.interactive.buttons[0].title,
  "تقدم بتمويلك الآن"
);
assert.strictEqual(military.draft.step, "awaiting_amount_examples_cta");

const retired = handleAmountExamplesSector("متقاعد");
assert.ok(retired.reply.includes("متقاعد"));
assert.ok(retired.reply.includes("13%"));
assert.strictEqual(retired.draft.step, "awaiting_amount_examples_cta");

const afterCivilian = handleAmountExamplesSector("مدني");
assert.strictEqual(
  afterCivilian.draft.step,
  "awaiting_amount_examples_civilian_subtype"
);
assert.ok(afterCivilian.interactive.buttons.some((b) => b.title === "قطاع حكومي"));
assert.ok(afterCivilian.interactive.buttons.some((b) => b.title === "قطاع خاص"));

const gov = handleAmountExamplesCivilianSubtype("قطاع حكومي");
assert.ok(gov.reply.includes("قطاع حكومي"));
assert.ok(gov.reply.includes("13%"));
assert.strictEqual(gov.draft.step, "awaiting_amount_examples_cta");

const privateList = handleAmountExamplesCivilianSubtype("قطاع خاص");
assert.ok(privateList.reply.includes("قطاع خاص"));
assert.ok(privateList.reply.includes("15.50%"));
assert.ok(privateList.reply.includes("10,000 ريال"));
assert.strictEqual(privateList.draft.step, "awaiting_amount_examples_cta");

assert.strictEqual(
  looksLikeAmountExamplesCta("start_personal_from_examples"),
  true
);
assert.strictEqual(looksLikeAmountExamplesCta("تقدم بتمويلك الآن"), true);

const { startPersonalFinanceFlow } = require("../lib/conversation");
const fromCta = startPersonalFinanceFlow({ askSector: true });
assert.ok(fromCta.reply, "CTA لازم يرسل سؤال القطاع");
assert.ok(fromCta.interactive, "CTA لازم يرسل أزرار القطاع");

const civilian = buildAmountList("civilian");
assert.ok(civilian.includes("قطاع حكومي"));
assert.ok(civilian.includes("13%"));

const subtypeAsk = askAmountExamplesCivilianSubtype();
assert.strictEqual(
  subtypeAsk.draft.step,
  "awaiting_amount_examples_civilian_subtype"
);

const fromMenu = handleMainMenuChoice("3");
assert.strictEqual(fromMenu.draft.step, "awaiting_amount_examples_sector");

console.log("test-amount-examples: OK");
