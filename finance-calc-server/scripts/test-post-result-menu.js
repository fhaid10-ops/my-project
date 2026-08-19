const assert = require("assert");
const {
  calculatePersonalFinance,
  parsePersonalFinanceMessage,
  typedTextShowsMenuAfterAmountResult,
  hasQualifyingAmountResult,
} = require("../lib/personal-finance");

const parsed = parsePersonalFinanceMessage(`الراتب: 8000
الالتزامات: 1500
القطاع: مدني
العقاري: لا يوجد
الدعم: 0`);
const result = calculatePersonalFinance(parsed);
assert.ok(result.ok, "الحسبة لازم تنجح");
assert.ok(hasQualifyingAmountResult(result.data));

const session = result.data;

assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(session, "S20000", false),
  true,
  "S20000 المكتوب يعيد القائمة"
);
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(session, "20000", false),
  true,
  "رقم مكتوب بدون ضغط القائمة يعيد القائمة"
);
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(session, "تمام", false),
  true
);
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(session, "amt_20000", false),
  false,
  "ضغط صف القائمة يبقى اختيار مبلغ"
);
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(session, "20,000 ريال مبلغ أقل", false),
  false
);
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(session, "اختر مبلغ أقل هنا", false),
  false
);
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(session, "20000", true),
  false,
  "نقرة تفاعلية ما تتحول قائمة"
);

assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(
    { awaitingCombo: true, rounded: 10000 },
    "S20000",
    false
  ),
  false
);
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(null, "S20000", false),
  false
);
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult({ salary: 8000 }, "S20000", false),
  false,
  "قبل نتيجة المبلغ ما نرجع القائمة لهذا السبب"
);

const termSession = {
  ...session,
  awaitingAmountChoice: false,
  awaitingLowerAmountTerm: true,
  pendingSelectedAmount: 20000,
  availableYearsForAmount: [5, 4],
};
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(termSession, "S20000", false),
  true
);
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(termSession, "term_5", false),
  false
);
assert.strictEqual(
  typedTextShowsMenuAfterAmountResult(termSession, "5 سنوات", false),
  false,
  "عنوان زر المدة يبقى اختيار مدة"
);

console.log("OK: بعد نتيجة المبلغ الكتابة الحرة تعيد القائمة");
