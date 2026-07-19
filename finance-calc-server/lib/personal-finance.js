/**
 * حسبة التمويل الشخصي — نفس منطق البوت القديم.
 */
const {
  calculateEstimatedAmount,
  roundDownToStep,
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
  if (/مدعوم/.test(t) && !/غير/.test(t)) return "supported";
  if (/غير\s*مدعوم/.test(t)) return "unsupported";
  if (/لا\s*يوجد|لا|بدون|ما\s*علي/.test(t)) return "none";
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
      /الراتب[^:\d]*[:：]?\s*([0-9][0-9,]*)/i,
      /راتب[^:\d]*[:：]?\s*([0-9][0-9,]*)/i,
      /ينزل بالصراف[^:\d]*[:：]?\s*([0-9][0-9,]*)/i,
    ]) || null;

  const commitments =
    get([
      /الالتزامات[^:\d]*[:：]?\s*([0-9][0-9,]*)/i,
      /التزام[^:\d]*[:：]?\s*([0-9][0-9,]*)/i,
    ]) || null;

  const sector =
    get([
      /القطاع[^:\n]*[:：]?\s*([^\n]+)/i,
      /قطاع[^:\n]*[:：]?\s*([^\n]+)/i,
    ]) || null;

  const realEstate =
    get([
      /التمويل العقاري[^:\n]*[:：]?\s*([^\n]+)/i,
      /العقاري[^:\n]*[:：]?\s*([^\n]+)/i,
      /عقاري[^:\n]*[:：]?\s*([^\n]+)/i,
    ]) || null;

  const support =
    get([
      /الدعم العقاري[^:\d]*[:：]?\s*([0-9][0-9,]*)/i,
      /قيمة الدعم[^:\d]*[:：]?\s*([0-9][0-9,]*)/i,
      /الدعم[^:\d]*[:：]?\s*([0-9][0-9,]*)/i,
    ]) || "0";

  return {
    salary: parseNumber(salary),
    commitments: parseNumber(commitments),
    sectorRaw: sector,
    jobCategory: mapSector(sector),
    realEstateRaw: realEstate,
    realEstateType: mapRealEstate(realEstate),
    supportAmount: parseNumber(support) || 0,
  };
}

function looksLikePersonalFinanceData(text) {
  const t = String(text || "");
  const hasSalary = /راتب|ينزل بالصراف/.test(t);
  const hasCommitments = /التزام/.test(t);
  const hasSector = /قطاع|عسكري|مدني|متقاعد/.test(t);
  return hasSalary && hasCommitments && hasSector;
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

  const reply = `تم حساب التمويل الشخصي:

قيمة التمويل:
${formatMoney(rounded)} ريال

القسط الشهري:
${formatMoney(installment)} ريال

الإجمالي التقريبي:
${formatMoney(total)} ريال

للتقديم أو الاستفسار كلم عبدالرحمن:
0531240724`;

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
      rate,
      installment,
      total,
    },
  };
}

module.exports = {
  parsePersonalFinanceMessage,
  looksLikePersonalFinanceData,
  calculatePersonalFinance,
  mapSector,
  mapRealEstate,
};
