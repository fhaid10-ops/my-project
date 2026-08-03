/**
 * حسبة شراء المديونية — فائدة 12% للجميع، فائض حتى 50% من مبلغ المديونية
 */
const CONFIG = require("../config");
const {
  calculateMonthlyInstallment,
  formatMoney,
} = require("./calculations");
const { resolveDebtPurchaseInterestRate } = require("./interest-rate");

function getSurplusMaxRatio() {
  return (
    Number(CONFIG.debtPurchase?.surplusMaxRatioOfDebt) ||
    Number(CONFIG.debtPurchasePath?.surplusMaxRatioOfDebt) ||
    0.5
  );
}

/**
 * @param {{ debtAmount: number, jobCategory?: string }} input
 */
function calculateDebtPurchaseOffer(input) {
  const debtAmount = Number(input.debtAmount);
  if (!Number.isFinite(debtAmount) || debtAmount <= 0) {
    return {
      ok: false,
      reply:
        CONFIG.messages?.invalidDebtPurchaseAmount ||
        `الرجاء كتابة مبلغ شراء المديونية بالأرقام فقط.

مثال:
20000`,
    };
  }

  const rate = resolveDebtPurchaseInterestRate();
  const surplus = Math.round(debtAmount * getSurplusMaxRatio());
  const total = debtAmount + surplus;
  const installment = calculateMonthlyInstallment(
    total,
    rate,
    undefined,
    input.jobCategory || "civilian"
  );

  const offerFn = CONFIG.templates?.debtPurchaseOffer;
  const offerText =
    typeof offerFn === "function"
      ? offerFn(
          formatMoney(debtAmount),
          formatMoney(surplus),
          formatMoney(installment)
        )
      : `سداد المديونية: ${formatMoney(debtAmount)} ريال
الفائض الشخصي: ${formatMoney(surplus)} ريال

القسط الشهري (على الإجمالي): ${formatMoney(installment)} ريال`;

  const continueQ =
    CONFIG.messages?.debtContinueQuestion ||
    `هل تبي تكمل إجراءات شراء المديونية؟

1- نعم
2- لا`;

  const reply = `${offerText}

${continueQ}`;

  return {
    ok: true,
    offer: "debt_purchase",
    reply,
    interactive: {
      kind: "buttons",
      body: reply,
      buttons: [
        { id: "debt_yes", title: "نعم" },
        { id: "debt_no", title: "لا" },
      ],
    },
    data: {
      flow: "debt_chat",
      jobCategory: input.jobCategory || null,
      debtAmount,
      surplus,
      total,
      rate,
      installment,
      awaitingDebtContinue: true,
    },
  };
}

function buildDebtPurchaseComplete() {
  const fin = CONFIG.financing || {};
  const completeFn = CONFIG.templates?.debtPurchaseComplete;
  const employeeName = fin.employeeName || "عبدالرحمن";
  const employeePhone = fin.employeePhone || "0507009290";
  const portalUrl =
    fin.portalUrl || "https://portal.sfco.com.sa/?DSA=SF1888";
  const letterCompany =
    CONFIG.debtPurchase?.letterCompanyExample || "إمكان";

  const reply =
    typeof completeFn === "function"
      ? completeFn(employeeName, employeePhone, portalUrl, letterCompany)
      : `لإكمال طلب شراء المديونية:

تواصل مع الموظف ${employeeName}:
${employeePhone}

يرجى إحضار خطاب شراء مديونية (مثال: من شركة ${letterCompany})

رابط التقديم الإلكتروني:
${portalUrl}`;

  return { ok: true, offer: "debt_purchase_accepted", reply };
}

function buildDebtPurchaseDeclined() {
  return {
    ok: true,
    offer: "debt_purchase_declined",
    reply:
      CONFIG.messages?.debtDeclined ||
      "شكراً لتواصلك. إذا رغبت لاحقاً اكتب: مرحبا",
  };
}

function looksLikeDebtContinueReply(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 40) return null;
  if (/^(1|نعم|اي|أي|أجل|موافق|ابي|أبي|أرغب|ارغب|debt_yes|yes)$/i.test(t)) {
    return "yes";
  }
  if (/^(2|لا|لأ|لاء|ما ابي|ماأبي|رفض|debt_no|no)$/i.test(t)) return "no";
  return null;
}

module.exports = {
  calculateDebtPurchaseOffer,
  buildDebtPurchaseComplete,
  buildDebtPurchaseDeclined,
  looksLikeDebtContinueReply,
  getSurplusMaxRatio,
};
