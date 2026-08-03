const assert = require("assert");
const {
  calculateDebtPurchaseOffer,
  looksLikeDebtContinueReply,
} = require("../lib/debt-purchase");
const {
  looksLikeStartDebtPurchase,
  startDebtPurchaseFlow,
  advanceDebtPurchaseFlow,
} = require("../lib/debt-conversation");

function check(name, fn) {
  try {
    fn();
    console.log("OK:", name);
  } catch (err) {
    console.error("FAIL:", name, err.message);
    process.exitCode = 1;
  }
}

check("بداية شراء المديونية", () => {
  assert.strictEqual(looksLikeStartDebtPurchase("شراء مديونية"), true);
  assert.strictEqual(looksLikeStartDebtPurchase("مديونية"), true);
  assert.strictEqual(looksLikeStartDebtPurchase("2"), false);
  const start = startDebtPurchaseFlow();
  assert.strictEqual(start.reply, null);
  assert.strictEqual(start.draft.flow, "debt_chat");
});

check("حسبة مديونية 20000 → فائض 10000 وقسط بـ 12%", () => {
  const offer = calculateDebtPurchaseOffer({
    debtAmount: 20000,
    jobCategory: "civilian",
  });
  assert.ok(offer.ok);
  assert.strictEqual(offer.data.surplus, 10000);
  assert.strictEqual(offer.data.total, 30000);
  assert.strictEqual(offer.data.rate, 12);
  // قسط = 30000/60 + (30000*0.12)/12 = 500 + 300 = 800
  assert.strictEqual(offer.data.installment, 800);
  assert.match(offer.reply, /سداد المديونية/);
  assert.match(offer.reply, /الفائض الشخصي/);
});

check("مسار مدني كامل حتى العرض", () => {
  let d = startDebtPurchaseFlow().draft;
  d = advanceDebtPurchaseFlow(d, "مدني").draft;
  assert.match(
    advanceDebtPurchaseFlow(
      { flow: "debt_chat", step: "sector" },
      "مدني"
    ).reply,
    /تنويه بخصوص شراء المديونية|إمكان/
  );
  let r = advanceDebtPurchaseFlow(d, "8000");
  assert.ok(r.ok);
  assert.strictEqual(r.draft.step, "real_estate");
  r = advanceDebtPurchaseFlow(r.draft, "لا يوجد");
  assert.strictEqual(r.draft.step, "commitments");
  r = advanceDebtPurchaseFlow(r.draft, "1500");
  assert.strictEqual(r.draft.step, "debt_amount");
  r = advanceDebtPurchaseFlow(r.draft, "20000");
  assert.ok(r.ok);
  assert.strictEqual(r.offer, "debt_purchase");
  assert.strictEqual(r.draft.step, "debt_continue");
  assert.strictEqual(looksLikeDebtContinueReply("نعم"), "yes");
  const done = advanceDebtPurchaseFlow(r.draft, "نعم");
  assert.strictEqual(done.offer, "debt_purchase_accepted");
  assert.match(done.reply, /خطاب شراء مديونية|التقديم الإلكتروني/);
});

if (!process.exitCode) {
  console.log("\nكل اختبارات شراء المديونية نجحت");
}
