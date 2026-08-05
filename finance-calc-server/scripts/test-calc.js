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
console.log("\n--- رسالة التقديم المنفصلة ---");
console.log(result.followUpReply);
console.log("\ninteractive:", JSON.stringify(result.interactive, null, 2));

if (String(result.reply).includes("سجل مبلغ التمويل المرغوب فيه")) {
  console.error("FAIL: رسالة التقديم لازم تكون منفصلة عن نتيجة الحساب");
  process.exitCode = 1;
}

if (
  !result.followUpReply ||
  !String(result.followUpReply).includes("سجل مبلغ التمويل المرغوب فيه") ||
  !String(result.followUpReply).includes("SF1695") ||
  !String(result.followUpReply).includes("وارسلي رقم الطلب")
) {
  console.error("FAIL: لازم followUpReply برمز الموظف SF1695");
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
  console.log("\n--- follow-up بعد الاختيار ---");
  console.log(selected.followUpReply);
  if (
    !selected.followUpReply ||
    !String(selected.followUpReply).includes("SF1695")
  ) {
    console.error("FAIL: اختيار المبلغ لازم followUpReply برمز SF1695");
    process.exitCode = 1;
  }
}

const fromListId = parseAmountChoice(`amt_${result.data.lowerTiers[0]}`);
if (fromListId !== result.data.lowerTiers[0]) {
  console.error("FAIL: parseAmountChoice من amt_");
  process.exitCode = 1;
}

// رجوع: القسط ما يتجاوز المتاح — عسكري / مدني / متقاعد
const capacityCases = [
  {
    name: "عسكري",
    input: {
      jobCategory: "military",
      realEstateType: "supported",
      salary: 11000,
      commitments: 5000,
      supportAmount: 1070,
    },
  },
  {
    name: "مدني",
    input: {
      jobCategory: "civilian",
      realEstateType: "none",
      salary: 8000,
      commitments: 1500,
      supportAmount: 0,
    },
  },
  {
    name: "متقاعد",
    input: {
      jobCategory: "retired",
      realEstateType: "unsupported",
      salary: 9000,
      commitments: 2000,
      supportAmount: 0,
    },
  },
];

for (const c of capacityCases) {
  const got = calculatePersonalFinance(c.input);
  if (!got.ok) {
    console.error(`FAIL: حسبة ${c.name} المفروض تنجح`, got.reply);
    process.exitCode = 1;
    continue;
  }
  if (got.data.installment > got.data.monthlyCapacity) {
    console.error(
      `FAIL: قسط ${c.name} تجاوز المتاح`,
      got.data.installment,
      ">",
      got.data.monthlyCapacity
    );
    process.exitCode = 1;
  } else {
    console.log(
      `OK: قسط ${c.name} ضمن المتاح`,
      got.data.installment,
      "<=",
      got.data.monthlyCapacity,
      "| مبلغ",
      got.data.maxAmount,
      "| فائدة",
      got.data.rate
    );
  }
}
