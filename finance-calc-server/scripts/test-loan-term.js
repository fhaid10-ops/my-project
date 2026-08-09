const assert = require("assert");
const {
  calculatePersonalFinance,
  calculateSelectedAmount,
  confirmLowerAmountSuggestion,
  parseLoanTermChoice,
  loanTermChoiceInteractive,
} = require("../lib/personal-finance");
const { advancePersonalFinanceFlow } = require("../lib/conversation");

assert.strictEqual(parseLoanTermChoice("3 سنوات"), 3);
assert.strictEqual(parseLoanTermChoice("term_5"), 5);
assert.strictEqual(parseLoanTermChoice("4"), 4);
assert.strictEqual(parseLoanTermChoice("term_9"), null);

const interactive = loanTermChoiceInteractive();
assert.strictEqual(interactive.kind, "buttons");
assert.ok(interactive.buttons.some((b) => b.id === "term_3"));
assert.ok(interactive.buttons.some((b) => b.id === "term_5"));

// بعد العقاري يسأل عن المدة
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
assert.strictEqual(afterRe.draft.step, "loan_term");
assert.ok(String(afterRe.reply || afterRe.interactive?.body).includes("سنة"));

const afterTerm = advancePersonalFinanceFlow(
  { ...afterRe.draft },
  "term_5"
);
assert.ok(afterTerm.ok);
assert.ok(afterTerm.sessionData?.loanTermMonths === 60);
assert.ok(String(afterTerm.reply).includes("5 سنوات"));

// مدة أقصر تسمح → تُعتمد
const shortOk = calculatePersonalFinance({
  jobCategory: "civilian",
  civilianSubtype: "government",
  salary: 12000,
  commitments: 500,
  realEstateType: "none",
  loanTermYears: 3,
});
assert.ok(shortOk.ok, shortOk.reply);
assert.strictEqual(shortOk.data.loanTermMonths, 36);
assert.ok(!shortOk.data.forcedToFallbackTerm);
assert.ok(String(shortOk.reply).includes("3 سنوات"));

// مدة قصيرة ما تسمح والخمسة تسمح → رسالة الالتزام + 5 سنوات
const forced = calculatePersonalFinance({
  jobCategory: "civilian",
  civilianSubtype: "government",
  salary: 8000,
  commitments: 3100,
  realEstateType: "none",
  loanTermYears: 3,
});
assert.ok(forced.ok, forced.reply);
assert.strictEqual(forced.data.forcedToFallbackTerm, true);
assert.strictEqual(forced.data.loanTermMonths, 60);
assert.ok(String(forced.reply).includes("ما يجي التمويل إلا على 5 سنوات"));
assert.ok(String(forced.reply).includes("علشان التزاماتك"));

// طلب مبلغ أعلى من المتاح → اقتراح أقل
const base = calculatePersonalFinance({
  jobCategory: "civilian",
  civilianSubtype: "government",
  salary: 10000,
  commitments: 1500,
  realEstateType: "none",
  loanTermYears: 3,
});
assert.ok(base.ok, base.reply);
const tooHigh = (base.data.maxAmount || 0) + 10000;
const suggestion = calculateSelectedAmount(base.data, tooHigh);
assert.strictEqual(suggestion.offer, "lower_amount_suggestion");
assert.ok(String(suggestion.reply).includes("ما يسمح فيه وضع التزاماتك"));
assert.ok(suggestion.data.awaitingLowerAmountConfirm);
assert.ok(suggestion.data.suggestedAmount > 0);
assert.ok(suggestion.data.suggestedAmount < tooHigh);

const confirmed = confirmLowerAmountSuggestion(suggestion.data, "yes");
assert.ok(confirmed.ok);
assert.strictEqual(confirmed.data.selectedAmount, suggestion.data.suggestedAmount);
assert.ok(String(confirmed.reply).includes("تم اختيار المبلغ"));

const declined = confirmLowerAmountSuggestion(suggestion.data, "no");
assert.ok(String(declined.reply).includes("اختر مبلغًا آخر"));
assert.strictEqual(declined.data.awaitingLowerAmountConfirm, false);

console.log("OK: loan term choice + fallback + lower amount suggestion");
