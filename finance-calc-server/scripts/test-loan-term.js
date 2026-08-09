const assert = require("assert");
const {
  calculatePersonalFinance,
  calculateSelectedAmount,
  confirmLowerAmountSuggestion,
  parseLoanTermChoice,
  loanTermChoiceInteractive,
  looksLikeWantLowerAmount,
  beginLowerAmountFlow,
  applyLowerAmountTerm,
} = require("../lib/personal-finance");
const { advancePersonalFinanceFlow } = require("../lib/conversation");

assert.strictEqual(parseLoanTermChoice("3 سنوات"), 3);
assert.strictEqual(parseLoanTermChoice("term_5"), 5);
assert.ok(looksLikeWantLowerAmount("want_lower_amount"));
assert.ok(looksLikeWantLowerAmount("مبلغ أقل"));

const interactive = loanTermChoiceInteractive();
assert.strictEqual(interactive.kind, "buttons");
assert.ok(interactive.buttons.some((b) => b.id === "term_3"));

// بعد العقاري → حسبة مباشرة على 5 سنوات (بدون سؤال السنوات)
const afterRe = advancePersonalFinanceFlow(
  {
    flow: "personal_chat",
    step: "real_estate",
    jobCategory: "civilian",
    civilianSubtype: "government",
    salary: 8000,
    commitments: 1500,
  },
  "لا يوجد"
);
assert.ok(afterRe.ok);
assert.ok(!afterRe.draft || afterRe.draft === null);
assert.strictEqual(afterRe.sessionData?.loanTermMonths, 60);
assert.strictEqual(afterRe.sessionData?.awaitingLowerAmountEntry, true);
assert.strictEqual(afterRe.interactive?.kind, "buttons");
assert.strictEqual(afterRe.interactive?.buttons?.[0]?.id, "want_lower_amount");
assert.ok(String(afterRe.reply).includes("5 سنوات"));

// ضغط مبلغ أقل → سؤال السنوات
const lowerStart = beginLowerAmountFlow(afterRe.sessionData);
assert.ok(String(lowerStart.reply).includes("كم سنة"));
assert.strictEqual(lowerStart.data.awaitingLowerAmountTerm, true);

// اختيار 3 سنوات تسمح → قائمة مبالغ أقل على 3
const on3 = applyLowerAmountTerm(lowerStart.data, 3);
assert.ok(on3.ok, on3.reply);
assert.strictEqual(on3.data.loanTermMonths, 36);
assert.ok(!on3.data.forcedToFallbackTerm);
assert.strictEqual(on3.interactive?.kind, "list");
assert.strictEqual(on3.data.awaitingAmountChoice, true);
assert.ok(String(on3.reply).includes("3 سنوات"));

// اختيار 3 سنوات ما تسمح → إجبار 5 سنوات
const forcedBase = calculatePersonalFinance({
  jobCategory: "civilian",
  civilianSubtype: "government",
  salary: 8000,
  commitments: 3100,
  realEstateType: "none",
  loanTermYears: 5,
});
assert.ok(forcedBase.ok, forcedBase.reply);
const forcedLower = applyLowerAmountTerm(
  { ...forcedBase.data, awaitingLowerAmountTerm: true },
  3
);
assert.ok(forcedLower.ok, forcedLower.reply);
assert.strictEqual(forcedLower.data.forcedToFallbackTerm, true);
assert.strictEqual(forcedLower.data.loanTermMonths, 60);
assert.ok(String(forcedLower.reply).includes("ما يجي التمويل إلا على 5 سنوات"));
assert.ok(String(forcedLower.reply).includes("علشان التزاماتك"));
assert.strictEqual(forcedLower.interactive?.kind, "list");

// بعد اختيار المدة: طلب مبلغ أعلى من المتاح → اقتراح أقل
const base = applyLowerAmountTerm(
  {
    ...calculatePersonalFinance({
      jobCategory: "civilian",
      civilianSubtype: "government",
      salary: 10000,
      commitments: 1500,
      realEstateType: "none",
      loanTermYears: 5,
    }).data,
    awaitingLowerAmountTerm: true,
  },
  3
);
assert.ok(base.ok, base.reply);
const tooHigh = (base.data.maxAmount || 0) + 10000;
const suggestion = calculateSelectedAmount(base.data, tooHigh);
assert.strictEqual(suggestion.offer, "lower_amount_suggestion");
assert.ok(String(suggestion.reply).includes("ما يسمح فيه وضع التزاماتك"));

const confirmed = confirmLowerAmountSuggestion(suggestion.data, "yes");
assert.ok(confirmed.ok);
assert.strictEqual(confirmed.data.selectedAmount, suggestion.data.suggestedAmount);

console.log("OK: years asked only on lower-amount path");
