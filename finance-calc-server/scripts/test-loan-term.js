const assert = require("assert");
const {
  calculatePersonalFinance,
  calculateSelectedAmount,
  confirmLowerAmountSuggestion,
  parseLoanTermChoice,
  loanTermChoiceInteractive,
  getAvailableYearsForAmount,
  looksLikeWantLowerAmount,
  looksLikeYesNoReply,
  beginLowerAmountFlow,
  replyWantLowerAmountAsk,
  looksLikeApplyMethodReply,
  replyWantApplyMethod,
  applyLowerAmountTerm,
} = require("../lib/personal-finance");
const { advancePersonalFinanceFlow } = require("../lib/conversation");

assert.strictEqual(parseLoanTermChoice("3 سنوات"), 3);
assert.strictEqual(parseLoanTermChoice("term_5"), 5);
assert.strictEqual(parseLoanTermChoice("سنتين"), 2);
assert.strictEqual(parseLoanTermChoice("سنة"), 1);
assert.ok(looksLikeWantLowerAmount("want_lower_amount"));
assert.ok(looksLikeWantLowerAmount("مبلغ أقل"));
assert.ok(looksLikeWantLowerAmount("اختر مبلغ أقل هنا"));
assert.ok(looksLikeWantLowerAmount("هل ترغب بمبلغ أقل"));
assert.ok(looksLikeWantLowerAmount("هل ترغب بمبلغ اقل"));
assert.strictEqual(looksLikeYesNoReply("نعم"), "yes");
assert.strictEqual(looksLikeYesNoReply("لا"), "no");
assert.strictEqual(looksLikeYesNoReply("1"), "yes");
assert.strictEqual(looksLikeYesNoReply("2"), "no");
assert.strictEqual(looksLikeYesNoReply("1- نعم"), "yes");
assert.strictEqual(looksLikeYesNoReply("2- لا"), "no");

const fiveOpts = loanTermChoiceInteractive([5, 4, 3, 2, 1]);
assert.strictEqual(fiveOpts.kind, "list");
assert.ok(fiveOpts.rows.some((r) => r.id === "term_1"));

const twoOpts = loanTermChoiceInteractive([5, 4]);
assert.strictEqual(twoOpts.kind, "buttons");
assert.strictEqual(twoOpts.buttons.length, 2);

// بعد العقاري → حسبة على 5 سنوات + سؤال هل ترغب بمبلغ أقل
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
assert.strictEqual(afterRe.sessionData?.awaitingLowerAmountAsk, true);
assert.ok(!String(afterRe.followUpReply || "").includes("portal.sfco.com.sa"));
assert.strictEqual(afterRe.interactive?.kind, "buttons");
assert.strictEqual(afterRe.interactive?.body, "هل ترغب بمبلغ أقل");
assert.ok(
  afterRe.interactive?.buttons?.some(
    (b) => b.id === "want_lower_yes" && b.title === "نعم"
  )
);
assert.ok(
  afterRe.interactive?.buttons?.some(
    (b) => b.id === "want_lower_no" && b.title === "لا"
  )
);
assert.ok(String(afterRe.reply).includes("5 سنوات"));

const declined = replyWantLowerAmountAsk("no", afterRe.sessionData);
assert.ok(!declined.silent);
assert.strictEqual(declined.interactive?.kind, "buttons");
assert.match(
  String(declined.interactive?.body || ""),
  /التقديم الإلكتروني أو زيارة الفرع/
);
assert.ok(
  declined.interactive?.buttons?.some((b) => b.id === "apply_electronic")
);
assert.ok(declined.interactive?.buttons?.some((b) => b.id === "apply_branch"));
assert.strictEqual(declined.data.awaitingLowerAmountAsk, false);
assert.strictEqual(declined.data.awaitingApplyMethod, true);
assert.ok(!declined.data.awaitingLowerAmountTerm);

assert.strictEqual(looksLikeApplyMethodReply("apply_electronic"), "electronic");
assert.strictEqual(looksLikeApplyMethodReply("زيارة الفرع"), "branch");
const electronic = replyWantApplyMethod("electronic", declined.data);
assert.ok(String(electronic.reply).includes("قدم الان هنا"));
assert.ok(String(electronic.reply).includes("https://portal.sfco.com.sa/?DSA=SF1888"));
assert.ok(!String(electronic.reply).includes("سجل مبلغ التمويل"));
assert.ok(!String(electronic.reply).includes("0507009290"));
assert.match(String(electronic.followUpReply), /^ملاحظه/);
assert.ok(String(electronic.followUpReply).includes("سجل مبلغ التمويل المرغوب فيه بالملاحظات"));
assert.ok(String(electronic.followUpReply).includes("SF1888"));
assert.ok(!String(electronic.followUpReply).includes("portal.sfco.com.sa"));
assert.ok(!String(electronic.followUpReply).includes("0507009290"));
assert.ok(!String(electronic.followUpReply).includes("وارسلي رقم الطلب"));
assert.strictEqual(electronic.data.awaitingApplyMethod, false);
const branch = replyWantApplyMethod("branch", declined.data);
assert.match(String(branch.reply), /معرض السديري للسيارات/);
assert.match(String(branch.reply), /رايد الحربي/);
assert.match(String(branch.reply), /الأحد إلى الخميس/);
assert.match(String(branch.reply), /9 ص إلى 5 م/);
assert.ok(!String(branch.reply).includes("portal.sfco.com.sa"));

const accepted = replyWantLowerAmountAsk("yes", afterRe.sessionData);
assert.strictEqual(accepted.interactive?.kind, "list");
assert.strictEqual(accepted.interactive?.body, "اختر مبلغ أقل هنا");
assert.strictEqual(accepted.data.awaitingAmountChoice, true);
assert.strictEqual(accepted.data.awaitingLowerAmountAsk, false);

// توافق: «مبلغ أقل» يعيد قائمة المبالغ
const lowerStart = beginLowerAmountFlow(afterRe.sessionData);
assert.strictEqual(lowerStart.interactive?.kind, "list");
assert.strictEqual(lowerStart.data.awaitingAmountChoice, true);

// اختيار مبلغ → سنوات متاحة فقط (أكثر من واحدة → سؤال)
const pick = afterRe.sessionData.lowerTiers[0];
const afterAmount = calculateSelectedAmount(afterRe.sessionData, pick);
assert.ok(afterAmount.ok, afterAmount.reply);
const available = getAvailableYearsForAmount(afterRe.sessionData, pick);
assert.ok(available.length >= 1);
function assertApplyMethodAsk(result) {
  assert.strictEqual(result.interactive?.kind, "buttons");
  assert.match(
    String(result.interactive?.body || ""),
    /التقديم الإلكتروني أو زيارة الفرع/
  );
  assert.ok(
    result.interactive?.buttons?.some((b) => b.id === "apply_electronic")
  );
  assert.ok(result.interactive?.buttons?.some((b) => b.id === "apply_branch"));
  assert.strictEqual(result.data.awaitingApplyMethod, true);
  assert.ok(!result.followUpReply);
}

if (available.length === 1) {
  assert.strictEqual(afterAmount.data.selectedAmount, pick);
  assert.strictEqual(afterAmount.data.loanTermYears, available[0]);
  assertApplyMethodAsk(afterAmount);
} else {
  assert.strictEqual(afterAmount.data.awaitingLowerAmountTerm, true);
  assert.strictEqual(afterAmount.data.pendingSelectedAmount, pick);
  assert.deepStrictEqual(afterAmount.data.availableYearsForAmount, available);
  assert.ok(!afterAmount.followUpReply);

  const yearsPick = available[available.length - 1]; // أقصر مدة متاحة
  const finalized = applyLowerAmountTerm(afterAmount.data, yearsPick);
  assert.ok(finalized.ok, finalized.reply);
  assert.strictEqual(finalized.data.selectedAmount, pick);
  assert.strictEqual(finalized.data.loanTermYears, yearsPick);
  assert.ok(String(finalized.reply).includes(yearsPick === 1 ? "سنة" : String(yearsPick)));
  assertApplyMethodAsk(finalized);
}

// مبلغ قريب من الأعلى → غالبًا 5 سنوات فقط → تثبيت تلقائي
const nearMax = afterRe.sessionData.maxAmount;
const onlyLong = calculateSelectedAmount(afterRe.sessionData, nearMax);
const yearsForMax = getAvailableYearsForAmount(afterRe.sessionData, nearMax);
assert.ok(yearsForMax.includes(5));
if (yearsForMax.length === 1) {
  assert.strictEqual(onlyLong.data.selectedAmount, nearMax);
  assert.strictEqual(onlyLong.data.loanTermYears, 5);
  assert.ok(!onlyLong.data.awaitingLowerAmountTerm);
} else {
  assert.strictEqual(onlyLong.data.awaitingLowerAmountTerm, true);
}

// مبلغ صغير جدًا → عدة سنوات بما فيها سنتين/سنة إن سمحت
const smallPick = 10000;
const yearsSmall = getAvailableYearsForAmount(afterRe.sessionData, smallPick);
assert.ok(yearsSmall.includes(5));
assert.ok(yearsSmall.length >= 2, `expected multiple years for 10k, got ${yearsSmall}`);

// بعد اختيار المدة: طلب مبلغ أعلى من المتاح → اقتراح أقل
const base = calculatePersonalFinance({
  jobCategory: "civilian",
  civilianSubtype: "government",
  salary: 10000,
  commitments: 1500,
  realEstateType: "none",
  loanTermYears: 5,
});
assert.ok(base.ok, base.reply);
const tooHigh = (base.data.maxAmount || 0) + 10000;
const suggestion = calculateSelectedAmount(base.data, tooHigh);
assert.ok(
  suggestion.offer === "lower_amount_suggestion" || !suggestion.ok,
  suggestion.reply
);
if (suggestion.offer === "lower_amount_suggestion") {
  assert.ok(String(suggestion.reply).includes("ما يسمح فيه وضع التزاماتك"));
  const confirmed = confirmLowerAmountSuggestion(suggestion.data, "yes");
  assert.ok(confirmed.ok);
  assert.ok(
    confirmed.data.selectedAmount === suggestion.data.suggestedAmount ||
      confirmed.data.pendingSelectedAmount === suggestion.data.suggestedAmount
  );
}

console.log("OK: amount first, then available years only");
