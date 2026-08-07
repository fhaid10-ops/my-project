/**
 * أمثلة مبالغ التمويل (بدون حسبة) — للقائمة الرئيسية
 * المسار: مدني/عسكري/متقاعد → إن مدني: حكومي أو قطاع خاص
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

function amountExamplesLabel(jobCategory) {
  if (jobCategory === "military") return "عسكري";
  if (jobCategory === "retired") return "متقاعد";
  if (jobCategory === "private") return "قطاع خاص";
  if (jobCategory === "civilian") return "قطاع حكومي";
  return CONFIG.jobCategories?.[jobCategory]?.label || "مدني";
}

function buildAmountList(jobCategory) {
  const { min, max, step } = amountExamplesConfig();
  const rate =
    CONFIG.jobCategories?.[jobCategory]?.interestRate ||
    (jobCategory === "military"
      ? 18.5
      : jobCategory === "private"
        ? 15.5
        : 13);
  const label = amountExamplesLabel(jobCategory);
  const rateLabel = Number.isInteger(rate) ? String(rate) : rate.toFixed(2);

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
(نسبة تقريبية ${rateLabel}% لمدة 60 شهر)

${lines.join("\n")}

ملاحظة: هذه أمثلة توضيحية فقط وليست عرضًا ملزمًا.`;
}

function showAmountExamplesList(jobCategory) {
  return {
    ok: true,
    flow: "main_menu",
    reply: buildAmountList(jobCategory),
    interactive: amountExamplesCtaInteractive(),
    sendTextThenInteractive: true,
    draft: {
      flow: "main_menu",
      step: "awaiting_amount_examples_cta",
      amountExamplesSector: jobCategory,
    },
  };
}

/** زر تحت الأمثلة لبدء التمويل الشخصي */
function amountExamplesCtaInteractive() {
  return {
    kind: "buttons",
    body: "تبي تقدم بتمويلك الآن؟",
    buttons: [
      {
        id: "start_personal_from_examples",
        title: "تقدم بتمويلك الآن",
      },
    ],
  };
}

function looksLikeAmountExamplesCta(text) {
  const t = String(text || "")
    .trim()
    .replace(/[.\u061F؟?!]+$/g, "")
    .trim();
  if (!t || t.length > 60) return false;
  if (/^start_personal_from_examples$/i.test(t)) return true;
  if (/^تقدم\s*بتمويلك\s*الان$/i.test(t)) return true;
  if (/^تقدم\s*بتمويلك\s*الآن$/i.test(t)) return true;
  if (/^تقدم\s*بطلب\s*التمويل\s*الان$/i.test(t)) return true;
  if (/^تقدم\s*بطلب\s*التمويل\s*الآن$/i.test(t)) return true;
  if (/تقدم.*(تمويلك|التمويل|بطلب)/i.test(t) && t.length <= 40) return true;
  return false;
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
        { id: "amt_civilian", title: "مدني" },
        { id: "amt_military", title: "عسكري" },
        { id: "amt_retired", title: "متقاعد" },
      ],
    },
    draft: {
      flow: "main_menu",
      step: "awaiting_amount_examples_sector",
    },
  };
}

function askAmountExamplesCivilianSubtype() {
  return {
    ok: true,
    flow: "main_menu",
    reply: "مدني — اختر: قطاع حكومي أو قطاع خاص",
    interactive: {
      kind: "buttons",
      body: "مدني — اختر: قطاع حكومي أو قطاع خاص",
      buttons: [
        { id: "amt_gov", title: "قطاع حكومي" },
        { id: "amt_private", title: "قطاع خاص" },
      ],
    },
    draft: {
      flow: "main_menu",
      step: "awaiting_amount_examples_civilian_subtype",
    },
  };
}

/** الشاشة الأولى: مدني / عسكري / متقاعد */
function parseAmountExamplesSector(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (
    /^(عسكري|military|amt_military|2)$/i.test(t) ||
    t === "عسكري"
  ) {
    return "military";
  }
  if (
    /^(متقاعد|retired|amt_retired|3)$/i.test(t) ||
    t === "متقاعد"
  ) {
    return "retired";
  }
  if (
    /^(مدني|civilian|amt_civilian|1)$/i.test(t) ||
    t === "مدني"
  ) {
    return "civilian";
  }
  return null;
}

/** بعد مدني: حكومي → civilian | خاص → private */
function parseAmountExamplesCivilianSubtype(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (
    /^(قطاع\s*حكومي|حكومي|government|gov|amt_gov|civilian_gov|1)$/i.test(t) ||
    t === "قطاع حكومي"
  ) {
    return "civilian";
  }
  if (
    /^(قطاع\s*خاص|خاص|private|amt_private|civilian_private|2)$/i.test(t) ||
    t === "قطاع خاص"
  ) {
    return "private";
  }
  return null;
}

function handleAmountExamplesSector(text) {
  const sector = parseAmountExamplesSector(text);
  if (!sector) {
    return {
      ok: false,
      ...askAmountExamplesSector(),
      reply: "أي قطاع؟\nمدني / عسكري / متقاعد",
    };
  }
  if (sector === "civilian") {
    return askAmountExamplesCivilianSubtype();
  }
  return showAmountExamplesList(sector);
}

function handleAmountExamplesCivilianSubtype(text) {
  const jobCategory = parseAmountExamplesCivilianSubtype(text);
  if (!jobCategory) {
    return {
      ok: false,
      ...askAmountExamplesCivilianSubtype(),
      reply: "اختر: قطاع حكومي أو قطاع خاص",
    };
  }
  return showAmountExamplesList(jobCategory);
}

module.exports = {
  buildAmountList,
  askAmountExamplesSector,
  askAmountExamplesCivilianSubtype,
  parseAmountExamplesSector,
  parseAmountExamplesCivilianSubtype,
  handleAmountExamplesSector,
  handleAmountExamplesCivilianSubtype,
  amountExamplesCtaInteractive,
  looksLikeAmountExamplesCta,
  amountExamplesConfig,
};
