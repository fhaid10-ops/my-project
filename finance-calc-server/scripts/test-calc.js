const {
  calculatePersonalFinance,
  parsePersonalFinanceMessage,
  calculateSelectedAmount,
} = require("../lib/personal-finance");

const sample = `الراتب: 8000
الالتزامات: 1500
القطاع: مدني
العقاري: لا يوجد
الدعم: 0`;

const parsed = parsePersonalFinanceMessage(sample);
const result = calculatePersonalFinance(parsed);
console.log("--- الحسبة الأولى (أعلى مبلغ + قائمة) ---");
console.log(result.reply);
console.log("\ninteractive:", JSON.stringify(result.interactive, null, 2));
console.log("\ndata:", JSON.stringify(result.data, null, 2));

if (!result.interactive || result.interactive.kind !== "list") {
  console.error("FAIL: لازم قائمة اختيار مبلغ");
  process.exitCode = 1;
} else {
  const first = result.interactive.rows[0];
  const max = result.data.maxAmount;
  if (!first || first.id !== `amt_${max}`) {
    console.error("FAIL: أول خيار لازم يكون أعلى مبلغ", first, max);
    process.exitCode = 1;
  } else {
    console.log("OK: أعلى مبلغ أول خيار في القائمة");
  }
}

if (result.ok && result.data?.lowerTiers?.length) {
  const pick = result.data.lowerTiers[0];
  const selected = calculateSelectedAmount(result.data, pick);
  console.log(`\n--- بعد اختيار ${pick} ---`);
  console.log(selected.reply);
}

const fromListId = require("../lib/personal-finance").parseAmountChoice(
  `amt_${result.data.maxAmount}`
);
if (fromListId !== result.data.maxAmount) {
  console.error("FAIL: parseAmountChoice من amt_");
  process.exitCode = 1;
}
