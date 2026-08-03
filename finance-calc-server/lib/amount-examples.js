/**
 * أمثلة مبالغ التمويل (بدون حسبة) — للقائمة الرئيسية
 */
const CONFIG = require("../config");
const {
  calculateMonthlyInstallment,
  formatMoney,
} = require("./calculations");

function amountExamplesConfig() {
  const cfg = CONFIG.amountExamples || {};
  return {
    min: Number(cfg.min || 10000),
    max: Number(cfg.max || 150000),
    step: Number(cfg.step || 10000),
  };
}

function buildAmountList(jobCategory) {
  const { min, max, step } = amountExamplesConfig();
  const rate =
    CONFIG.jobCategories?.[jobCategory]?.interestRate ||
    (jobCategory === "military" ? 18.5 : 14.5);
  const label =
    CONFIG.jobCategories?.[jobCategory]?.label ||
    (jobCategory === "military" ? "عسكري" : "مدني");

  const lines = [];
  for (let amount = min; amount <= max; amount += step) {
    const installment = calculateMonthlyInstallment(
      amount,
      rate,
      CONFIG.financing?.loanTermMonths || 60,
      jobCategory
    );
    lines.push(
      `${formatMoney(amount)} ريال — القسط: ${formatMoney(installment)} ريال`
    );
  }

  return `أمثلة مبالغ التمويل — ${label}
(نسبة تقريبية ${rate}% لمدة 60 شهر)

${lines.join("\n")}

ملاحظة: هذه أمثلة توضيحية فقط وليست عرضًا ملزمًا.
للحسبة الدقيقة اختر: تمويل شخصي
للقائمة الرئيسية اكتب: مرحبا`;
}

function askAmountExamplesSector() {
  return {
    ok: true,
    flow: "main_menu",
    reply: "أي قطاع؟",
    interactive: {
      kind: "buttons",
      body: "أي قطاع؟",
      buttons: [
        { id: "amt_military", title: "عسكري" },
        { id: "amt_civilian", title: "مدني" },
      ],
    },
    draft: {
      flow: "main_menu",
      step: "awaiting_amount_examples_sector",
    },
  };
}

function parseAmountExamplesSector(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (
    /^(عسكري|military|amt_military|1)$/i.test(t) ||
    t === "عسكري"
  ) {
    return "military";
  }
  if (
    /^(مدني|civilian|amt_civilian|2)$/i.test(t) ||
    t === "مدني"
  ) {
    return "civilian";
  }
  return null;
}

function handleAmountExamplesSector(text) {
  const sector = parseAmountExamplesSector(text);
  if (!sector) {
    return {
      ok: false,
      ...askAmountExamplesSector(),
      reply: "أي قطاع؟",
    };
  }
  return {
    ok: true,
    flow: "main_menu",
    reply: buildAmountList(sector),
    draft: { flow: "main_menu", step: "awaiting_choice" },
  };
}

module.exports = {
  buildAmountList,
  askAmountExamplesSector,
  parseAmountExamplesSector,
  handleAmountExamplesSector,
  amountExamplesConfig,
};
