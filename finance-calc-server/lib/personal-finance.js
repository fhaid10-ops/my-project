/**
 * حسبة التمويل الشخصي — نفس منطق البوت القديم.
 */
const {
  calculateEstimatedAmount,
  calculateMonthlyCapacity,
  calculateMonthlyInstallment,
  calculateTotalRepayment,
  roundDownToStep,
  buildLowerAmountTiers,
  meetsMinimumSalary,
  meetsMinimumEstimatedAmount,
  formatMoney,
  getMinSalaryForCategory,
  shouldOfferPropertyComboToMilitary,
  resolveComboRejectReason,
} = require("./calculations");
const {
  resolveJobCategory,
  resolveInterestRate,
} = require("./interest-rate");
const CONFIG = require("../config");
const { normalizeDigits } = require("./digits");

/** خطوة قائمة المبالغ الأقل للعميل (100 ألف → 90 → 80 … → 10) */
const AMOUNT_MENU_STEP = 10000;

function mapSector(text) {
  const t = String(text || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[➦►▶➢➤•·●○▪️]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;
  // عسكري قبل مدني حتى لا تلتبس نصوص مركّبة
  if (/عسكري|military|army/i.test(t)) return "military";
  if (/متقاعد|retired|pension/i.test(t)) return "retired";
  if (/مدني|civilian|civil/i.test(t)) return "civilian";
  if (/^3$/.test(t)) return "military";
  if (/^2$/.test(t)) return "retired";
  if (/^1$/.test(t)) return "civilian";
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
  const n = Number(normalizeDigits(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * يستخرج الحقول من رسالة العميل (نموذج البيانات).
 */
function parsePersonalFinanceMessage(text) {
  const raw = normalizeDigits(text);
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

  const sessionLike = {
    jobCategory,
    salary,
    grossSalary: salary,
    realEstate: realEstateType,
  };

  if (!meetsMinimumSalary(salary, jobCategory)) {
    // عسكري راتبه أقل من حد الشخصي لكن يصلح لباقة عقاري+شخصي
    if (shouldOfferPropertyComboToMilitary(sessionLike)) {
      return buildPropertyComboInterestAsk({
        jobCategory,
        salary,
        commitments,
        realEstateType,
        supportAmount,
        reason: "military_low_salary",
      });
    }
    const min = getMinSalaryForCategory(jobCategory);
    return {
      ok: false,
      reply: `نعتذر منك الراتب أقل من المطلوب.\nالراتب المطلوب من ${formatMoney(min)} ريال`,
    };
  }

  const session = { jobCategory };
  const rate = resolveInterestRate(session);
  const supportForCalc =
    realEstateType === "supported" ? supportAmount : 0;
  const monthlyCapacity = calculateMonthlyCapacity(
    realEstateType,
    salary,
    commitments,
    supportForCalc
  );
  if (!Number.isFinite(monthlyCapacity) || monthlyCapacity <= 0) {
    return {
      ok: false,
      reply: "نعتذر منك التزامك عالي حسب نسبة الاستقطاع المتاحة.",
      data: { monthlyCapacity },
    };
  }

  // أعلى مبلغ بحيث القسط لا يتجاوز المتاح الشهري (حسب فائدة القطاع)
  const estimated = calculateEstimatedAmount(
    realEstateType,
    salary,
    commitments,
    supportForCalc,
    rate
  );
  let rounded = roundDownToStep(estimated);
  let installment = calculateMonthlyInstallment(
    rounded,
    rate,
    undefined,
    jobCategory
  );

  // بعد التقريب: إن تجاوز القسط المتاح، ننزل بالمبلغ حتى يدخل ضمن القدرة
  while (rounded > 0 && installment > monthlyCapacity) {
    rounded = Math.max(0, rounded - 100);
    installment = calculateMonthlyInstallment(
      rounded,
      rate,
      undefined,
      jobCategory
    );
  }

  // حماية نهائية لكل القطاعات: لا نعرض عرضًا قسطه أعلى من المتاح
  if (rounded > 0 && installment > monthlyCapacity) {
    const comboReason = resolveComboRejectReason(
      sessionLike,
      rounded,
      commitments
    );
    if (comboReason) {
      return buildPropertyComboInterestAsk({
        jobCategory,
        salary,
        commitments,
        realEstateType,
        supportAmount,
        estimated,
        rounded,
        monthlyCapacity,
        reason: comboReason,
      });
    }
    return {
      ok: false,
      reply:
        "مستنفذ حد التمويل الشخصي نعتذر منك",
      data: { estimated, rounded, monthlyCapacity, installment, rate },
    };
  }

  if (!meetsMinimumEstimatedAmount(rounded)) {
    // مستنفد حد الشخصي / المبلغ قليل → عرض عقاري + شخصي إن انطبق
    const comboReason = resolveComboRejectReason(
      sessionLike,
      rounded,
      commitments
    );
    if (comboReason) {
      return buildPropertyComboInterestAsk({
        jobCategory,
        salary,
        commitments,
        realEstateType,
        supportAmount,
        estimated,
        rounded,
        monthlyCapacity,
        reason: comboReason,
      });
    }
    return {
      ok: false,
      reply:
        "مستنفذ حد التمويل الشخصي نعتذر منك",
      data: { estimated, rounded, monthlyCapacity },
    };
  }

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
  });
  const interactive = buildLowerAmountInteractive(lowerTiers);
  const followUpReply = buildPersonalApplyFollowUp();

  return {
    ok: true,
    reply,
    followUpReply,
    interactive,
    // نص النتيجة أولًا، ثم رسالة التقديم، ثم قائمة المبالغ الأقل
    sendTextThenInteractive: Boolean(interactive),
    data: {
      jobCategory,
      realEstateType,
      salary,
      commitments,
      supportAmount,
      monthlyCapacity,
      estimated,
      rounded,
      maxAmount: rounded,
      rate,
      installment,
      total,
      lowerTiers,
      awaitingAmountChoice: true,
    },
  };
}

function personalEmployeeCode() {
  const fromConfig = CONFIG.financing?.personalEmployeeCode;
  if (fromConfig) return String(fromConfig);
  const portalUrl =
    CONFIG.financing?.personalPortalUrl ||
    "https://portal.sfco.com.sa/?DSA=SF1695";
  const match = String(portalUrl).match(/[?&]DSA=([^&#]+)/i);
  return match ? match[1] : "SF1695";
}

/** رسالة التقديم الإلكتروني — تُرسل منفصلة بعد نتيجة الحساب */
function buildPersonalApplyFollowUp() {
  const custom = CONFIG.messages?.personalApplyFollowUp;
  if (typeof custom === "function") {
    return custom(personalEmployeeCode(), CONFIG.financing?.personalPortalUrl);
  }
  if (typeof custom === "string" && custom.trim()) return custom;

  const code = personalEmployeeCode();
  const portalUrl =
    CONFIG.financing?.personalPortalUrl ||
    "https://portal.sfco.com.sa/?DSA=SF1695";
  return `سجل مبلغ التمويل المرغوب فيه
واكتب رمز الموظف ${code} بالتقديم لمتابعة الطلب
وارسلي رقم الطلب

${portalUrl}`;
}

function contactFooter() {
  return buildPersonalApplyFollowUp();
}

function buildPropertyComboInterestAsk(base = {}) {
  const reasonKey = base.reason || "low_amount";
  const reasonFn =
    CONFIG.templates?.personalRejectReason ||
    CONFIG.messages?.personalRejectReason;
  const rejectReply =
    (typeof reasonFn === "function" ? reasonFn(reasonKey) : "") ||
    "مستنفذ حد التمويل الشخصي نعتذر منك";

  const interestBody =
    CONFIG.messages?.propertyComboInterest ||
    CONFIG.templates?.propertyComboInterest ||
    `هل ترغب بحلول تمويلية أخرى؟`;

  return {
    ok: true,
    offer: "property_combo_interest",
    // رسالة 1: سبب الرفض
    reply: rejectReply,
    // رسالة 2 تفاعلية: سؤال الحلول + أزرار نعم/لا
    interactive: {
      kind: "buttons",
      body: interestBody,
      buttons: [
        { id: "combo_yes", title: "نعم" },
        { id: "combo_no", title: "لا" },
      ],
    },
    sendTextThenInteractive: true,
    data: {
      ...base,
      awaitingComboInterest: true,
      awaitingCombo: false,
      comboRejectReason: reasonKey,
    },
  };
}

function buildPropertyComboOffer(base = {}) {
  const pkg = CONFIG.comboPackage || {};
  const total = pkg.totalExample || 1000000;
  const propertyAmount = pkg.propertyAmount || 400000;
  const personalAmount = pkg.personalAmount || 600000;
  const offerFn =
    CONFIG.templates?.propertyComboOffer ||
    CONFIG.messages?.propertyComboOffer;
  const offerBody =
    typeof offerFn === "function"
      ? offerFn(
          formatMoney(total),
          formatMoney(propertyAmount),
          formatMoney(personalAmount)
        )
      : `حلول تمويل أخرى
في حال رغبتك بسداد جميع التزاماتك واستخراج
عرض التمويل العقاري + الشخصي

مثال ${formatMoney(total)} ريال
${formatMoney(propertyAmount)} ريال عقاري
${formatMoney(personalAmount)} ريال شخصي

هل ترغب بهذا العرض؟`;

  return {
    ok: true,
    offer: "property_combo",
    interactive: {
      kind: "buttons",
      body: offerBody,
      buttons: [
        { id: "combo_yes", title: "نعم" },
        { id: "combo_no", title: "لا" },
      ],
    },
    data: {
      ...base,
      awaitingComboInterest: false,
      awaitingCombo: true,
      comboTotal: total,
      comboProperty: propertyAmount,
      comboPersonal: personalAmount,
    },
  };
}

function looksLikeYesNoReply(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 40) return null;
  if (/^(1|نعم|اي|أي|أجل|موافق|ابي|أبي|أرغب|ارغب|combo_yes|yes)$/i.test(t)) {
    return "yes";
  }
  if (/^(2|لا|لأ|لاء|ما ابي|ماأبي|رفض|combo_no|no)$/i.test(t)) return "no";
  return null;
}

function replyPropertyComboInterestDecision(choice, sessionBase = {}) {
  if (choice === "yes") {
    return buildPropertyComboOffer({
      ...sessionBase,
      reason: sessionBase.comboRejectReason || sessionBase.reason,
    });
  }

  const apology =
    CONFIG.messages?.propertyComboDeclinedApology ||
    CONFIG.templates?.propertyComboDeclinedApology ||
    "حسناً، نعتذر منك ونأسف على عدم خدمتك.";
  return {
    ok: true,
    offer: "property_combo_interest_declined",
    reply: apology,
  };
}

function replyPropertyComboDecision(choice) {
  if (choice === "yes") {
    const agentName =
      CONFIG.financing?.propertyComboAgentName || "أبو شايع";
    const agentPhone =
      CONFIG.financing?.propertyComboAgentPhone || "0501812339";
    const footer =
      CONFIG.financing?.propertyComboContactFooter ||
      "من طرف رائد الحربي\nربي يسر أمرك";
    const direct = CONFIG.messages?.propertyComboAgentDirect;
    const reply =
      typeof direct === "function"
        ? direct(agentName, agentPhone, footer)
        : `للتواصل مع المندوب ${agentName}:
${agentPhone}

${footer}`;
    return { ok: true, offer: "property_combo_accepted", reply };
  }

  const apology =
    CONFIG.messages?.propertyComboDeclinedApology ||
    "حسناً، نعتذر منك ونأسف على عدم خدمتك.";
  return { ok: true, offer: "property_combo_declined", reply: apology };
}

function buildMaxAmountReply({ rounded, installment, total }) {
  return `تم حساب التمويل الشخصي:

أعلى مبلغ متاح لك:
${formatMoney(rounded)} ريال

القسط الشهري لهذا المبلغ:
${formatMoney(installment)} ريال

الإجمالي التقريبي:
${formatMoney(total)} ريال`;
}

/**
 * واتساب/Interakt عمليًا يعرض عدد محدود من صفوف القائمة.
 * نختار عيّنة من الأعلى للأقل مع ضمان وصول آخر خيار إلى 10,000.
 */
function selectTiersForWhatsAppList(tiers, maxRows = 8) {
  if (!tiers.length) return [];
  if (tiers.length <= maxRows) return tiers.slice();

  const first = tiers[0];
  const last = tiers[tiers.length - 1];
  const selected = [first];
  const inner = tiers.slice(1, -1);
  const innerSlots = Math.max(maxRows - 2, 0);

  if (innerSlots > 0 && inner.length) {
    for (let i = 0; i < innerSlots; i += 1) {
      const idx =
        innerSlots === 1
          ? 0
          : Math.round((i * (inner.length - 1)) / (innerSlots - 1));
      const value = inner[Math.min(inner.length - 1, idx)];
      if (selected[selected.length - 1] !== value) selected.push(value);
    }
  }

  if (selected[selected.length - 1] !== last) selected.push(last);

  const unique = [];
  for (const value of selected) {
    if (!unique.includes(value)) unique.push(value);
  }
  while (unique.length > maxRows) {
    unique.splice(Math.floor(unique.length / 2), 1);
  }
  unique[0] = first;
  unique[unique.length - 1] = last;
  return unique;
}

/**
 * قائمة المبالغ الأقل فقط — زر: اذا ترغب بمبلغ اقل اختر هنا
 * دائمًا تنتهي عند الحد الأدنى (10,000)
 */
function buildLowerAmountInteractive(lowerTiers = []) {
  if (!lowerTiers.length) return null;

  const displayTiers = selectTiersForWhatsAppList(lowerTiers, 8);
  const rows = displayTiers.map((amount) => ({
    id: `amt_${amount}`,
    title: `${formatMoney(amount)} ريال`,
    description: "مبلغ أقل",
  }));

  return {
    kind: "list",
    body: "اذا ترغب بمبلغ اقل اختر هنا",
    button: "اختر هنا",
    sectionTitle: "مبالغ أقل",
    rows,
  };
}

/** @deprecated استخدم buildLowerAmountInteractive */
function buildAmountChoiceInteractive({ lowerTiers = [] } = {}) {
  return buildLowerAmountInteractive(lowerTiers);
}

/**
 * هل الرسالة اختيار مبلغ؟ (مثال: 90000 أو 90,000 أو amt_60000)
 */
function parseAmountChoice(text) {
  const raw = normalizeDigits(text).trim();
  if (!raw) return null;

  const idMatch = raw.match(/^amt_(\d+)$/i);
  if (idMatch) {
    const amount = Number(idMatch[1]);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }

  // رقم واحد في الرسالة (مع فواصل اختيارية)
  const m = raw.match(
    /^[\s]*([0-9]{1,3}(?:[.,\s]?[0-9]{3})+|[0-9]+)[\s]*(?:ريال|ر\.س|SAR)?[\s]*$/i
  );
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
  const capacity = Number(sessionData?.monthlyCapacity);
  if (Number.isFinite(capacity) && capacity > 0 && installment > capacity) {
    return {
      ok: false,
      reply: `هذا المبلغ قسطه أعلى من المتاح الشهري لديك (${formatMoney(Math.floor(capacity))} ريال).\nاختر مبلغًا أقل من القائمة.`,
    };
  }
  const total = calculateTotalRepayment(amount, rate);

  const reply = `تم اختيار المبلغ:

قيمة التمويل:
${formatMoney(amount)} ريال

القسط الشهري:
${formatMoney(installment)} ريال

الإجمالي التقريبي:
${formatMoney(total)} ريال`;

  return {
    ok: true,
    reply,
    followUpReply: buildPersonalApplyFollowUp(),
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
  looksLikeYesNoReply,
  calculatePersonalFinance,
  parseAmountChoice,
  looksLikeAmountChoice,
  calculateSelectedAmount,
  replyPropertyComboDecision,
  replyPropertyComboInterestDecision,
  buildMaxAmountReply,
  buildPersonalApplyFollowUp,
  buildAmountChoiceInteractive,
  buildLowerAmountInteractive,
  selectTiersForWhatsAppList,
  buildPropertyComboOffer,
  buildPropertyComboInterestAsk,
  mapSector,
  mapRealEstate,
};
