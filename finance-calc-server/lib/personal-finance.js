/**
 * حسبة التمويل الشخصي — نفس منطق البوت القديم.
 */
const {
  calculateEstimatedAmount,
  roundDownToStep,
  buildLowerAmountTiers,
  calculateMonthlyInstallment,
  calculateTotalRepayment,
  meetsMinimumSalary,
  meetsMinimumEstimatedAmount,
  formatMoney,
  getMinSalaryForCategory,
} = require("./calculations");
const {
  resolveJobCategory,
  resolveInterestRate,
} = require("./interest-rate");
const CONFIG = require("../config");

/** خطوة قائمة المبالغ الأقل للعميل (100 ألف → 90 → 80 … → 10) */
const AMOUNT_MENU_STEP = 10000;

function mapSector(text) {
  const t = String(text || "").trim();
  if (/عسكري/.test(t)) return "military";
  if (/متقاعد/.test(t)) return "retired";
  if (/مدني/.test(t)) return "civilian";
  return null;
}

function mapRealEstate(text) {
  const t = String(text || "").trim();
  if (/قديم/.test(t)) return "old";
  if (/غير\s*مدعوم/.test(t)) return "unsupported";
  if (/مدعوم/.test(t)) return "supported";
  if (/لا\s*يوجد|بدون|ما\s*علي|ما\s*فيه|لايوجد/.test(t)) return "none";
  // "يوجد" / "عندي" بدون تفاصيل = عنده عقاري (نحسبه غير مدعوم)
  if (/يوجد|عندي|فيه/.test(t)) return "unsupported";
  if (/^(لا|لأ)$/.test(t)) return "none";
  return null;
}

function parseNumber(value) {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * يستخرج الحقول من رسالة العميل (نموذج البيانات).
 */
function parsePersonalFinanceMessage(text) {
  const raw = String(text || "");
  const get = (patterns) => {
    for (const re of patterns) {
      const m = raw.match(re);
      if (m && m[1] != null) return String(m[1]).trim();
    }
    return null;
  };

  const salary =
    get([
      /الراتب\s*[:：\-]?\s*([0-9][0-9,]*)/i,
      /راتب\s*[:：\-]?\s*([0-9][0-9,]*)/i,
      /ينزل بالصراف\s*[:：\-]?\s*([0-9][0-9,]*)/i,
    ]) || null;

  const commitments =
    get([
      /الالتزامات\s*[:：\-]?\s*([0-9][0-9,]*)/i,
      /التزام(?:ات)?\s*[:：\-]?\s*([0-9][0-9,]*)/i,
    ]) || null;

  // يدعم: "القطاع: مدني" أو "القطاع مدني" بدون نقطتين
  const sector =
    get([
      /القطاع\s*[:：\-]?\s*([^\n]+)/i,
      /قطاع\s*[:：\-]?\s*([^\n]+)/i,
    ]) || null;

  const realEstate =
    get([
      /التمويل العقاري\s*[:：\-]?\s*([^\n]+)/i,
      /العقاري\s*[:：\-]?\s*([^\n]+)/i,
      /عقاري\s*[:：\-]?\s*([^\n]+)/i,
    ]) || null;

  const support =
    get([
      /الدعم العقاري\s*[:：\-]?\s*([0-9][0-9,]*)/i,
      /قيمة الدعم\s*[:：\-]?\s*([0-9][0-9,]*)/i,
      /الدعم\s*[:：\-]?\s*([0-9][0-9,]*)/i,
    ]) || "0";

  // لو القطاع ما انالتقط من السطر، ابحث في كامل الرسالة
  const jobCategory = mapSector(sector) || mapSector(raw);

  return {
    salary: parseNumber(salary),
    commitments: parseNumber(commitments),
    sectorRaw: sector || (jobCategory ? raw : null),
    jobCategory,
    realEstateRaw: realEstate,
    realEstateType: mapRealEstate(realEstate) || mapRealEstate(raw),
    supportAmount: parseNumber(support) || 0,
  };
}

function looksLikePersonalFinanceData(text) {
  const t = String(text || "");
  const hasSalary = /راتب|ينزل بالصراف/.test(t);
  const hasCommitments = /التزام/.test(t);
  // يكفي الراتب + الالتزامات؛ القطاع يُستخرج أو يُسأل عنه
  return hasSalary && hasCommitments;
}

/** رد قصير لتحديد القطاع فقط: مدني / متقاعد / عسكري */
function looksLikeSectorOnlyReply(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 40) return false;
  if (looksLikePersonalFinanceData(t)) return false;
  return mapSector(t) != null;
}

/**
 * @returns {{ ok: boolean, reply: string, data?: object }}
 */
function calculatePersonalFinance(input) {
  const jobCategory = input.jobCategory || mapSector(input.sectorRaw);
  const realEstateType =
    input.realEstateType || mapRealEstate(input.realEstateRaw) || "none";
  const salary = Number(input.salary);
  const commitments = Number(input.commitments);
  const supportAmount = Number(input.supportAmount || 0);

  if (!jobCategory) {
    return {
      ok: false,
      reply:
        "ما قدرت أحدد القطاع.\nاكتب: مدني أو متقاعد أو عسكري",
    };
  }

  if (!Number.isFinite(salary) || salary <= 0) {
    return {
      ok: false,
      reply: "أرسل الراتب بالأرقام فقط.\nمثال: 8000",
    };
  }

  if (!Number.isFinite(commitments) || commitments < 0) {
    return {
      ok: false,
      reply: "أرسل الالتزامات الشهرية بالأرقام.\nمثال: 1500",
    };
  }

  if (!meetsMinimumSalary(salary, jobCategory)) {
    const min = getMinSalaryForCategory(jobCategory);
    return {
      ok: false,
      reply: `نعتذر منك الراتب أقل من المطلوب.\nالراتب المطلوب من ${formatMoney(min)} ريال`,
    };
  }

  const estimated = calculateEstimatedAmount(
    realEstateType,
    salary,
    commitments,
    realEstateType === "supported" ? supportAmount : 0
  );
  const rounded = roundDownToStep(estimated);

  if (!meetsMinimumEstimatedAmount(rounded)) {
    return {
      ok: false,
      reply:
        "نعتذر منك المبلغ التقديري أقل من المطلوب حسب بياناتك الحالية.",
      data: { estimated, rounded },
    };
  }

  const session = { jobCategory };
  const rate = resolveInterestRate(session);
  const installment = calculateMonthlyInstallment(
    rounded,
    rate,
    undefined,
    jobCategory
  );
  const total = calculateTotalRepayment(rounded, rate);
  const lowerTiers = buildLowerAmountTiers(
    rounded,
    AMOUNT_MENU_STEP,
    CONFIG.financing.minLowerAmount || 10000
  );

  const reply = buildMaxAmountReply({
    rounded,
    installment,
    total,
    lowerTiers,
  });

  return {
    ok: true,
    reply,
    data: {
      jobCategory,
      realEstateType,
      salary,
      commitments,
      supportAmount,
      estimated,
      rounded,
      maxAmount: rounded,
      rate,
      installment,
      total,
      lowerTiers,
    },
  };
}

function contactFooter() {
  return `للتقديم الإلكتروني:
https://portal.sfco.com.sa/?DSA=SF195`;
}

function buildMaxAmountReply({ rounded, installment, total, lowerTiers }) {
  let reply = `تم حساب التمويل الشخصي:

أعلى مبلغ متاح لك:
${formatMoney(rounded)} ريال

القسط الشهري لهذا المبلغ:
${formatMoney(installment)} ريال

الإجمالي التقريبي:
${formatMoney(total)} ريال`;

  if (lowerTiers && lowerTiers.length) {
    reply += `

إذا تبي مبلغ أقل، أرسل أحد المبالغ من القائمة:`;
    for (const amount of lowerTiers) {
      reply += `\n• ${formatMoney(amount)}`;
    }
  }

  reply += `\n\n${contactFooter()}`;
  return reply;
}

/**
 * هل الرسالة اختيار مبلغ؟ (مثال: 90000 أو 90,000)
 */
function parseAmountChoice(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  // رقم واحد في الرسالة (مع فواصل اختيارية)
  const m = raw.match(/^[\s]*([0-9]{1,3}(?:[.,\s]?[0-9]{3})+|[0-9]+)[\s]*(?:ريال|ر\.س|SAR)?[\s]*$/i);
  if (!m) return null;

  const amount = Number(String(m[1]).replace(/[^\d]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function looksLikeAmountChoice(text) {
  return parseAmountChoice(text) != null;
}

/**
 * حساب القسط لمبلغ اختاره العميل (أقل من أو يساوي الأعلى)
 */
function calculateSelectedAmount(sessionData, selectedAmount) {
  const maxAmount = Number(sessionData?.maxAmount || sessionData?.rounded || 0);
  const rate = Number(sessionData?.rate);
  const jobCategory = sessionData?.jobCategory;
  const minAmount = CONFIG.financing.minLowerAmount || 10000;
  const amount = Number(selectedAmount);

  if (!maxAmount || !Number.isFinite(rate) || !jobCategory) {
    return {
      ok: false,
      reply:
        "أرسل بيانات التمويل أولًا بهذا الشكل:\nالراتب: 8000\nالالتزامات: 1500\nالقطاع: مدني\nالعقاري: لا يوجد\nالدعم: 0",
    };
  }

  if (!Number.isFinite(amount) || amount < minAmount) {
    return {
      ok: false,
      reply: `أقل مبلغ يمكن اختياره ${formatMoney(minAmount)} ريال.\nأرسل مبلغ من القائمة.`,
    };
  }

  if (amount > maxAmount) {
    return {
      ok: false,
      reply: `أعلى مبلغ متاح لك ${formatMoney(maxAmount)} ريال.\nأرسل مبلغ من القائمة أو أقل.`,
    };
  }

  // اسمح بأي مبلغ ضمن الحد، مع تفضيل مضاعفات الخطوة
  const installment = calculateMonthlyInstallment(
    amount,
    rate,
    undefined,
    jobCategory
  );
  const total = calculateTotalRepayment(amount, rate);

  const reply = `تم اختيار المبلغ:

قيمة التمويل:
${formatMoney(amount)} ريال

القسط الشهري:
${formatMoney(installment)} ريال

الإجمالي التقريبي:
${formatMoney(total)} ريال

${contactFooter()}`;

  return {
    ok: true,
    reply,
    data: {
      ...sessionData,
      selectedAmount: amount,
      installment,
      total,
    },
  };
}

module.exports = {
  parsePersonalFinanceMessage,
  looksLikePersonalFinanceData,
  looksLikeSectorOnlyReply,
  calculatePersonalFinance,
  parseAmountChoice,
  looksLikeAmountChoice,
  calculateSelectedAmount,
  buildMaxAmountReply,
  mapSector,
  mapRealEstate,
};
