/**
 * حسبة التمويل الشخصي — نفس منطق البوت القديم.
 */
const {
  calculateEstimatedAmount,
  calculateMonthlyCapacity,
  calculateMonthlyInstallment,
  calculateTotalRepayment,
  findMaxAffordableAmount,
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

/** خطوة قائمة المبالغ الأقل — من config (افتراضي 5,000: 60→55→50→45…→10) */
const AMOUNT_MENU_STEP = Number(CONFIG.financing?.lowerStep) || 5000;

function loanTermOptionsYears() {
  const opts = CONFIG.financing?.loanTermOptionsYears;
  return Array.isArray(opts) && opts.length ? opts.map(Number) : [3, 4, 5];
}

function loanTermFallbackYears() {
  return Number(CONFIG.financing?.loanTermFallbackYears) || 5;
}

function loanTermFallbackMonths() {
  return loanTermFallbackYears() * 12;
}

function resolveLoanTermMonths(input = {}) {
  const months = Number(input.loanTermMonths);
  if (Number.isFinite(months) && months > 0) return months;
  const years = Number(input.loanTermYears);
  if (Number.isFinite(years) && years > 0) return years * 12;
  return Number(CONFIG.financing?.loanTermMonths) || 60;
}

function yearsLabel(months) {
  const years = Math.round(Number(months) / 12);
  return `${years} ${years === 1 ? "سنة" : "سنوات"}`;
}

function parseLoanTermChoice(text) {
  const raw = normalizeDigits(String(text || "")).trim();
  if (!raw || raw.length > 40) return null;
  const opts = loanTermOptionsYears();
  const idMatch = raw.match(/^term_(\d+)$/i);
  if (idMatch) {
    const years = Number(idMatch[1]);
    if (opts.includes(years)) return years;
  }
  for (const years of opts) {
    const re = new RegExp(`^${years}\\s*(سنوات|سنة|yrs?|years?)?$`, "i");
    if (re.test(raw)) return years;
  }
  const m = raw.match(/(\d+)\s*(سنوات|سنة)/);
  if (m) {
    const years = Number(m[1]);
    if (opts.includes(years)) return years;
  }
  return null;
}

function loanTermChoiceInteractive() {
  const opts = loanTermOptionsYears();
  return {
    kind: "buttons",
    body: "ترغب التمويل على كم سنة؟",
    buttons: opts.map((years) => ({
      id: `term_${years}`,
      title: `${years} سنوات`,
    })),
  };
}

function computeRoundedOffer({
  monthlyCapacity,
  rate,
  jobCategory,
  months,
  realEstateType,
  salary,
  commitments,
  supportForCalc,
}) {
  const estimated = calculateEstimatedAmount(
    realEstateType,
    salary,
    commitments,
    supportForCalc,
    rate,
    months
  );
  let rounded = roundDownToStep(estimated);
  let installment = calculateMonthlyInstallment(
    rounded,
    rate,
    months,
    jobCategory
  );
  while (rounded > 0 && installment > monthlyCapacity) {
    rounded = Math.max(0, rounded - 100);
    installment = calculateMonthlyInstallment(
      rounded,
      rate,
      months,
      jobCategory
    );
  }
  return { estimated, rounded, installment };
}

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
  let jobCategory = input.jobCategory || mapSector(input.sectorRaw);
  if (input.civilianSubtype === "private") jobCategory = "private";
  if (input.civilianSubtype === "government") jobCategory = "civilian";
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

  const session = {
    jobCategory,
    civilianSubtype: input.civilianSubtype,
    companyName: input.companyName,
  };
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
    const comboReason = resolveComboRejectReason(sessionLike, 0, commitments);
    if (comboReason) {
      return buildPropertyComboInterestAsk({
        jobCategory,
        salary,
        commitments,
        realEstateType,
        supportAmount,
        estimated: 0,
        rounded: 0,
        monthlyCapacity,
        reason: comboReason,
      });
    }
    return {
      ok: false,
      reply: "نعتذر منك التزامك عالي حسب نسبة الاستقطاع المتاحة.",
      data: { monthlyCapacity },
    };
  }

  const requestedMonths = resolveLoanTermMonths(input);
  const fallbackMonths = loanTermFallbackMonths();
  let loanTermMonths = requestedMonths;
  let forcedToFallbackTerm = false;

  let { estimated, rounded, installment } = computeRoundedOffer({
    monthlyCapacity,
    rate,
    jobCategory,
    months: loanTermMonths,
    realEstateType,
    salary,
    commitments,
    supportForCalc,
  });

  const offerOk =
    rounded > 0 &&
    installment <= monthlyCapacity &&
    meetsMinimumEstimatedAmount(rounded);

  // اختار مدة أقصر وما تسمح الاستقطاع → نرجع لـ 5 سنوات إن كانت تسمح
  if (!offerOk && requestedMonths < fallbackMonths) {
    const fallback = computeRoundedOffer({
      monthlyCapacity,
      rate,
      jobCategory,
      months: fallbackMonths,
      realEstateType,
      salary,
      commitments,
      supportForCalc,
    });
    const fallbackOk =
      fallback.rounded > 0 &&
      fallback.installment <= monthlyCapacity &&
      meetsMinimumEstimatedAmount(fallback.rounded);
    if (fallbackOk) {
      estimated = fallback.estimated;
      rounded = fallback.rounded;
      installment = fallback.installment;
      loanTermMonths = fallbackMonths;
      forcedToFallbackTerm = true;
    }
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
      reply: "مستنفذ حد التمويل الشخصي نعتذر منك",
      data: {
        estimated,
        rounded,
        monthlyCapacity,
        installment,
        rate,
        loanTermMonths,
      },
    };
  }

  if (!meetsMinimumEstimatedAmount(rounded)) {
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
      reply: "مستنفذ حد التمويل الشخصي نعتذر منك",
      data: { estimated, rounded, monthlyCapacity, loanTermMonths },
    };
  }

  const total = calculateTotalRepayment(rounded, rate, loanTermMonths);
  const lowerTiers = buildLowerAmountTiers(
    rounded,
    AMOUNT_MENU_STEP,
    CONFIG.financing.minLowerAmount || 10000
  );

  const resultReply = buildMaxAmountReply({
    rounded,
    installment,
    total,
    loanTermMonths,
  });
  const reply = forcedToFallbackTerm
    ? `ما يجي التمويل إلا على ${loanTermFallbackYears()} سنوات
علشان التزاماتك

${resultReply}`
    : resultReply;
  // أول نتيجة: زر «مبلغ أقل» فقط — قائمة المبالغ بعد اختيار السنوات
  const showLowerList = Boolean(input.forLowerAmount || input.showLowerAmountList);
  const interactive = showLowerList
    ? buildLowerAmountInteractive(lowerTiers)
    : buildWantLowerAmountInteractive();
  const followUpReply = buildPersonalApplyFollowUp();

  return {
    ok: true,
    reply,
    followUpReply,
    interactive,
    // نص النتيجة أولًا، ثم رسالة التقديم، ثم زر/قائمة المبالغ الأقل
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
      loanTermMonths,
      loanTermYears: Math.round(loanTermMonths / 12),
      requestedLoanTermMonths: requestedMonths,
      forcedToFallbackTerm,
      awaitingLowerAmountEntry: !showLowerList,
      awaitingLowerAmountTerm: false,
      awaitingAmountChoice: Boolean(showLowerList),
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
  if (
    /^(1|نعم|اي|أي|أجل|موافق|ابي|أبي|أرغب|ارغب|combo_yes|lower_yes|yes)$/i.test(
      t
    )
  ) {
    return "yes";
  }
  if (/^(2|لا|لأ|لاء|ما ابي|ماأبي|رفض|combo_no|lower_no|no)$/i.test(t)) {
    return "no";
  }
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

function buildMaxAmountReply({ rounded, installment, total, loanTermMonths }) {
  const months =
    Number(loanTermMonths) || Number(CONFIG.financing?.loanTermMonths) || 60;
  return `تم حساب التمويل الشخصي:

أعلى مبلغ متاح لك:
${formatMoney(rounded)} ريال

القسط الشهري لهذا المبلغ:
${formatMoney(installment)} ريال

الإجمالي التقريبي:
${formatMoney(total)} ريال

(على مدة ${yearsLabel(months)})`;
}

/**
 * واتساب/Interakt عمليًا يعرض عدد محدود من صفوف القائمة.
 * نختار عيّنة من الأعلى للأقل مع ضمان وصول آخر خيار إلى 10,000.
 */
function selectTiersForWhatsAppList(tiers, maxRows = 10) {
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

/** زر الدخول لمسار المبلغ الأقل → بعده نسأل عن السنوات */
function buildWantLowerAmountInteractive() {
  return {
    kind: "buttons",
    body: "اذا ترغب بمبلغ اقل اضغط هنا",
    buttons: [{ id: "want_lower_amount", title: "مبلغ أقل" }],
  };
}

function looksLikeWantLowerAmount(text) {
  const t = normalizeDigits(String(text || "")).trim();
  if (!t || t.length > 60) return false;
  if (/^want_lower_amount$/i.test(t)) return true;
  if (/^مبلغ\s*أقل$/i.test(t)) return true;
  if (/^مبلغ\s*اقل$/i.test(t)) return true;
  if (/اذا\s*ترغب\s*بمبلغ\s*اقل/i.test(t)) return true;
  return false;
}

function beginLowerAmountFlow(sessionData = {}) {
  return {
    ok: true,
    reply: "ترغب المبلغ على كم سنة؟",
    interactive: loanTermChoiceInteractive(),
    data: {
      ...sessionData,
      awaitingLowerAmountEntry: false,
      awaitingLowerAmountTerm: true,
      awaitingAmountChoice: false,
    },
  };
}

function applyLowerAmountTerm(sessionData = {}, years) {
  const termYears = Number(years);
  if (!Number.isFinite(termYears) || termYears <= 0) {
    return {
      ok: false,
      reply: "اختر مدة التمويل من الأزرار.",
      interactive: loanTermChoiceInteractive(),
      data: {
        ...sessionData,
        awaitingLowerAmountTerm: true,
        awaitingAmountChoice: false,
      },
    };
  }

  const result = calculatePersonalFinance({
    jobCategory: sessionData.jobCategory,
    civilianSubtype: sessionData.civilianSubtype,
    salary: sessionData.salary,
    commitments: sessionData.commitments,
    realEstateType: sessionData.realEstateType || "none",
    supportAmount: sessionData.supportAmount || 0,
    companyName: sessionData.companyName,
    loanTermYears: termYears,
    loanTermMonths: termYears * 12,
    forLowerAmount: true,
  });

  if (!result.ok) {
    return {
      ...result,
      data: {
        ...sessionData,
        ...(result.data || {}),
        awaitingLowerAmountTerm: false,
        awaitingLowerAmountEntry: true,
        awaitingAmountChoice: false,
      },
    };
  }

  return {
    ...result,
    data: {
      ...result.data,
      // نحافظ على أعلى مبلغ أول عرض (5 سنوات) للمقارنة إن احتجنا
      initialMaxAmount:
        sessionData.initialMaxAmount ||
        sessionData.maxAmount ||
        result.data?.maxAmount,
      awaitingLowerAmountEntry: false,
      awaitingLowerAmountTerm: false,
      awaitingAmountChoice: true,
    },
  };
}

/**
 * قائمة المبالغ الأقل فقط — زر: اذا ترغب بمبلغ اقل اختر هنا
 * دائمًا تنتهي عند الحد الأدنى (10,000)
 */
function buildLowerAmountInteractive(lowerTiers = []) {
  if (!lowerTiers.length) return null;

  const displayTiers = selectTiersForWhatsAppList(lowerTiers, 10);
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
 * هل الرسالة اختيار مبلغ؟ (مثال: 90000 أو 90,000 أو amt_60000 أو «15,000 ريال مبلغ أقل»)
 */
function parseAmountChoice(text) {
  let raw = normalizeDigits(text)
    .replace(/[\u066B\u066C٬]/g, ",") // فواصل آلاف عربية
    .replace(/\u2026/g, "...")
    .trim();
  if (!raw) return null;

  const idMatch = raw.match(/^amt_(\d+)$/i);
  if (idMatch) {
    const amount = Number(idMatch[1]);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }

  // واتساب أحيانًا يرسل العنوان + الوصف: «15,000 ريال» + «مبلغ أقل»
  raw = raw
    .replace(/\n+/g, " ")
    .replace(/\s*مبلغ\s*أقل\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

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

function buildSelectedAmountSuccess(sessionData, amount, months) {
  const rate = Number(sessionData?.rate);
  const jobCategory = sessionData?.jobCategory;
  const installment = calculateMonthlyInstallment(
    amount,
    rate,
    months,
    jobCategory
  );
  const total = calculateTotalRepayment(amount, rate, months);
  const lowerTiers =
    Array.isArray(sessionData?.lowerTiers) && sessionData.lowerTiers.length
      ? sessionData.lowerTiers
      : buildLowerAmountTiers(
          Number(sessionData?.maxAmount || sessionData?.rounded || amount),
          AMOUNT_MENU_STEP,
          CONFIG.financing.minLowerAmount || 10000
        );
  const interactive = buildLowerAmountInteractive(lowerTiers);
  const reply = `تم اختيار المبلغ:

قيمة التمويل:
${formatMoney(amount)} ريال

القسط الشهري:
${formatMoney(installment)} ريال

الإجمالي التقريبي:
${formatMoney(total)} ريال

(على مدة ${yearsLabel(months)})`;

  return {
    ok: true,
    reply,
    followUpReply: buildPersonalApplyFollowUp(),
    interactive,
    sendTextThenInteractive: Boolean(interactive),
    data: {
      ...sessionData,
      selectedAmount: amount,
      installment,
      total,
      lowerTiers,
      loanTermMonths: months,
      loanTermYears: Math.round(months / 12),
      maxAmount: Number(sessionData?.maxAmount || sessionData?.rounded || 0),
      awaitingAmountChoice: true,
      awaitingLowerAmountConfirm: false,
      suggestedAmount: null,
      requestedAmount: null,
    },
  };
}

function buildLowerAmountSuggestion(sessionData, requestedAmount, suggested) {
  const months = resolveLoanTermMonths(sessionData);
  const rate = Number(sessionData?.rate);
  const jobCategory = sessionData?.jobCategory;
  const installment = calculateMonthlyInstallment(
    suggested,
    rate,
    months,
    jobCategory
  );
  return {
    ok: true,
    offer: "lower_amount_suggestion",
    reply: `مبلغ ${formatMoney(requestedAmount)} على ${yearsLabel(months)}
ما يسمح فيه وضع التزاماتك الحالي.

يسمح لك على ${yearsLabel(months)} بمبلغ:
${formatMoney(suggested)} ريال

القسط الشهري:
${formatMoney(installment)} ريال

تبغى تكمل على هذا المبلغ؟`,
    interactive: {
      kind: "buttons",
      body: "تبغى تكمل على هذا المبلغ؟",
      buttons: [
        { id: "lower_yes", title: "نعم" },
        { id: "lower_no", title: "لا" },
      ],
    },
    sendTextThenInteractive: true,
    data: {
      ...sessionData,
      loanTermMonths: months,
      loanTermYears: Math.round(months / 12),
      awaitingAmountChoice: true,
      awaitingLowerAmountConfirm: true,
      suggestedAmount: suggested,
      requestedAmount: Number(requestedAmount),
    },
  };
}

/**
 * حساب القسط لمبلغ اختاره العميل (أقل من أو يساوي الأعلى)
 */
function calculateSelectedAmount(sessionData, selectedAmount) {
  const maxAmount = Number(sessionData?.maxAmount || sessionData?.rounded || 0);
  const rate = Number(sessionData?.rate);
  const jobCategory = sessionData?.jobCategory;
  const minAmount = CONFIG.financing.minLowerAmount || 10000;
  const months = resolveLoanTermMonths(sessionData);
  const amount = Number(selectedAmount);

  if (!maxAmount || !Number.isFinite(rate) || !jobCategory) {
    return {
      ok: false,
      reply:
        "أرسل بيانات التمويل أولًا بهذا الشكل:\nالراتب: 8000\nالالتزامات: 1500\nالقطاع: مدني\nالعقاري: لا يوجد\nالدعم: 0",
    };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      reply: `أقل مبلغ يمكن اختياره ${formatMoney(minAmount)} ريال.\nأرسل مبلغ من القائمة.`,
    };
  }

  const capacity = Number(sessionData?.monthlyCapacity);
  const installment = calculateMonthlyInstallment(
    amount,
    rate,
    months,
    jobCategory
  );
  const fitsCapacity =
    !Number.isFinite(capacity) ||
    capacity <= 0 ||
    installment <= capacity;
  const withinMax = amount <= maxAmount;
  const aboveMin = amount >= minAmount;

  if (aboveMin && withinMax && fitsCapacity) {
    return buildSelectedAmountSuccess(sessionData, amount, months);
  }

  // طلب مبلغ أعلى مما يسمح التزامه → نعرض أعلى مبلغ يسمح على نفس المدة
  const suggested = findMaxAffordableAmount({
    monthlyCapacity: capacity,
    annualRatePercent: rate,
    months,
    jobCategory,
    minAmount,
  });
  const cappedSuggested = Math.min(
    suggested || 0,
    maxAmount || suggested || 0
  );
  if (cappedSuggested >= minAmount && cappedSuggested < amount) {
    return buildLowerAmountSuggestion(
      sessionData,
      amount,
      roundDownToStep(cappedSuggested) || cappedSuggested
    );
  }

  if (!aboveMin) {
    return {
      ok: false,
      reply: `أقل مبلغ يمكن اختياره ${formatMoney(minAmount)} ريال.\nأرسل مبلغ من القائمة.`,
    };
  }

  if (!withinMax) {
    return {
      ok: false,
      reply: `أعلى مبلغ متاح لك ${formatMoney(maxAmount)} ريال.\nأرسل مبلغ من القائمة أو أقل.`,
    };
  }

  return {
    ok: false,
    reply: `هذا المبلغ قسطه أعلى من المتاح الشهري لديك (${formatMoney(Math.floor(capacity))} ريال).\nاختر مبلغًا أقل من القائمة.`,
  };
}

function confirmLowerAmountSuggestion(sessionData, choice) {
  if (choice === "yes") {
    const suggested = Number(sessionData?.suggestedAmount);
    if (!Number.isFinite(suggested) || suggested <= 0) {
      return {
        ok: false,
        reply: "اختر مبلغًا من القائمة مرة أخرى.",
        data: {
          ...sessionData,
          awaitingLowerAmountConfirm: false,
        },
      };
    }
    return buildSelectedAmountSuccess(
      sessionData,
      suggested,
      resolveLoanTermMonths(sessionData)
    );
  }
  return {
    ok: true,
    reply: "تمام، اختر مبلغًا آخر من القائمة.",
    interactive: buildLowerAmountInteractive(
      Array.isArray(sessionData?.lowerTiers) ? sessionData.lowerTiers : []
    ),
    data: {
      ...sessionData,
      awaitingLowerAmountConfirm: false,
      suggestedAmount: null,
      requestedAmount: null,
      awaitingAmountChoice: true,
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
  confirmLowerAmountSuggestion,
  parseLoanTermChoice,
  loanTermChoiceInteractive,
  loanTermOptionsYears,
  resolveLoanTermMonths,
  looksLikeWantLowerAmount,
  beginLowerAmountFlow,
  applyLowerAmountTerm,
  buildWantLowerAmountInteractive,
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
