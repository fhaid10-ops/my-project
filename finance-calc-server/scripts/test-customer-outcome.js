const assert = require("assert");
const os = require("os");
const path = require("path");
const {
  detectCustomerOutcome,
  canAutoUpdateNotes,
  OUTCOMES,
} = require("../lib/customer-outcome");
const { createCustomerLedger } = require("../lib/customer-ledger");
const {
  buildPersonalApplyFollowUp,
  buildPropertyComboInterestAsk,
  replyPropertyComboDecision,
  calculatePersonalFinance,
} = require("../lib/personal-finance");

assert.strictEqual(
  detectCustomerOutcome({
    offer: "property_combo_accepted",
    reply: "للتواصل مع المندوب",
  }),
  OUTCOMES.PACKAGE
);

assert.strictEqual(
  detectCustomerOutcome(buildPropertyComboInterestAsk({ reason: "low_amount" })),
  OUTCOMES.LIMIT_EXHAUSTED
);

assert.strictEqual(
  detectCustomerOutcome({
    ok: false,
    reply: "مستنفذ حد التمويل الشخصي نعتذر منك",
  }),
  OUTCOMES.LIMIT_EXHAUSTED
);

assert.strictEqual(
  detectCustomerOutcome({
    ok: true,
    reply: "تم حساب التمويل الشخصي",
    followUpReply: buildPersonalApplyFollowUp(),
  }),
  OUTCOMES.FINANCE_LINK
);

assert.strictEqual(
  detectCustomerOutcome(replyPropertyComboDecision("yes")),
  OUTCOMES.PACKAGE
);

assert.strictEqual(detectCustomerOutcome({ reply: "مرحبا" }), null);
assert.ok(canAutoUpdateNotes(""));
assert.ok(canAutoUpdateNotes("أخذ باقة"));
assert.ok(!canAutoUpdateNotes("ملاحظة يدوية خاصة"));

const ledger = createCustomerLedger({
  dataFile: path.join(os.tmpdir(), `outcome-ledger-${Date.now()}.json`),
});
ledger.recordInbound("+966", "501112223", "مرحبا");
ledger.setOutcomeNotes("+966", "501112223", OUTCOMES.LIMIT_EXHAUSTED);
assert.strictEqual(
  ledger._customers.get("+966:501112223").notes,
  OUTCOMES.LIMIT_EXHAUSTED
);
ledger.setOutcomeNotes("+966", "501112223", OUTCOMES.PACKAGE);
assert.strictEqual(
  ledger._customers.get("+966:501112223").notes,
  OUTCOMES.PACKAGE
);
ledger.setNotes("+966", "501112223", "ملاحظة يدوية خاصة");
ledger.setOutcomeNotes("+966", "501112223", OUTCOMES.FINANCE_LINK);
assert.strictEqual(
  ledger._customers.get("+966:501112223").notes,
  "ملاحظة يدوية خاصة",
  "لا نستبدل ملاحظة يدوية خارج الحالات التلقائية"
);

// حاسبة ناجحة ترسل followUp مع الرابط
const okCalc = calculatePersonalFinance({
  jobCategory: "military",
  salary: 15000,
  commitments: 500,
  realEstateType: "none",
});
if (okCalc.ok && okCalc.followUpReply) {
  assert.strictEqual(detectCustomerOutcome(okCalc), OUTCOMES.FINANCE_LINK);
}

console.log("OK: customer outcome auto-detect");
