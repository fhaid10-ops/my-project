const {
  calculatePersonalFinance,
  parsePersonalFinanceMessage,
  calculateSelectedAmount,
  parseAmountChoice,
  selectTiersForWhatsAppList,
} = require("../lib/personal-finance");
const { buildLowerAmountTiers } = require("../lib/calculations");

const sample = `الراتب: 8000
الالتزامات: 1500
القطاع: مدني
العقاري: لا يوجد
الدعم: 0`;

const parsed = parsePersonalFinanceMessage(sample);
const result = calculatePersonalFinance(parsed);
console.log("--- الحسبة الأولى (أعلى مبلغ + قائمة أقل) ---");
console.log(result.reply);
console.log("\ninteractive:", JSON.stringify(result.interactive, null, 2));

if (!String(result.reply).includes("قدم وارسلي رقم الطلب")) {
  console.error("FAIL: لازم جملة قدم وارسلي رقم الطلب");
  process.exitCode = 1;
}

if (!result.sendTextThenInteractive) {
  console.error("FAIL: لازم sendTextThenInteractive");
  process.exitCode = 1;
}

if (!result.interactive || result.interactive.kind !== "list") {
  console.error("FAIL: لازم قائمة مبالغ أقل");
  process.exitCode = 1;
} else if (result.interactive.body !== "اذا ترغب بمبلغ اقل اختر هنا") {
  console.error("FAIL: نص قائمة المبالغ الأقل", result.interactive.body);
  process.exitCode = 1;
} else if (result.interactive.button !== "اختر هنا") {
  console.error("FAIL: زر القائمة", result.interactive.button);
  process.exitCode = 1;
} else {
  const first = result.interactive.rows[0];
  const last = result.interactive.rows[result.interactive.rows.length - 1];
  const max = result.data.maxAmount;
  if (first?.id === `amt_${max}`) {
    console.error("FAIL: أعلى مبلغ ما يكون داخل قائمة الأقل");
    process.exitCode = 1;
  } else if (last?.id !== "amt_10000") {
    console.error("FAIL: آخر خيار لازم 10,000", last);
    process.exitCode = 1;
  } else {
    console.log("OK: نص أعلى مبلغ + قائمة أقل تنتهي بـ 10,000");
  }
}

// محاكاة مبلغ عالي مثل الشاشة (حوالي 126 ألف)
const highTiers = buildLowerAmountTiers(126000, 10000, 10000);
const picked = selectTiersForWhatsAppList(highTiers, 8);
if (picked[picked.length - 1] !== 10000) {
  console.error("FAIL: العيّنة ما توصل 10,000", picked);
  process.exitCode = 1;
} else {
  console.log("OK: عيّنة المبالغ العالية تصل لـ 10,000:", picked.join(", "));
}

if (result.ok && result.data?.lowerTiers?.length) {
  const pick = result.data.lowerTiers[0];
  const selected = calculateSelectedAmount(result.data, pick);
  console.log(`\n--- بعد اختيار ${pick} ---`);
  console.log(selected.reply);
}

const fromListId = parseAmountChoice(`amt_${result.data.lowerTiers[0]}`);
if (fromListId !== result.data.lowerTiers[0]) {
  console.error("FAIL: parseAmountChoice من amt_");
  process.exitCode = 1;
}
