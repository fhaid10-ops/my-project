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
console.log("\ndata:", JSON.stringify(result.data, null, 2));

if (result.ok && result.data?.lowerTiers?.length) {
  const pick = result.data.lowerTiers[0];
  const selected = calculateSelectedAmount(result.data, pick);
  console.log(`\n--- بعد اختيار ${pick} ---`);
  console.log(selected.reply);
}
