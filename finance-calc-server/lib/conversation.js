/**
 * محادثة تمويل شخصي خطوة بخطوة (مثل البوت القديم)
 */
const {
  mapSector,
  mapRealEstate,
  calculatePersonalFinance,
  buildPropertyComboOffer,
} = require("./personal-finance");
const {
  getMinSalaryForEntry,
  getMinSalaryForCategory,
  meetsMinimumSalaryForEntry,
} = require("./calculations");

function looksLikeStartPersonalFinance(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (t.length > 60) return false;
  return /^(1|تمويل شخصي|ابي تمويل شخصي|أبي تمويل شخصي|ابي تمويل|أبي تمويل|تمويل|ابدأ|ابدا|ابدأ الحسبة|ابدا الحسبة)$/i.test(
    t
  );
}

function startPersonalFinanceFlow() {
  // لا نرسل سؤال القطاع هنا إذا Interakt يعرض أزرار القطاع
  // فقط نجهّز الجلسة؛ لما يضغط مدني/متقاعد/عسكري نكمل للراتب
  return {
    ok: true,
    flow: "personal_chat",
    reply: null,
    draft: {
      flow: "personal_chat",
      step: "sector",
    },
  };
}

function parseSalaryReply(text) {
  const t = String(text || "").trim();
  const m = t.match(/([0-9][0-9,]*)/);
  if (!m) return NaN;
  return Number(String(m[1]).replace(/,/g, ""));
}

/** مثال الراتب حسب القطاع */
function salaryExampleForSector(jobCategory) {
  if (jobCategory === "military") return "10000";
  // مدني + متقاعد
  return "4000";
}

function salaryPrompt(jobCategory) {
  const example = salaryExampleForSector(jobCategory);
  return `كم راتبك الشهري؟
أرسل الرقم فقط
مثال: ${example} ريال`;
}

function invalidSalaryPrompt(jobCategory) {
  const example = salaryExampleForSector(jobCategory);
  return `أرسل الراتب بالأرقام فقط.
مثال: ${example} ريال`;
}

function lowSalaryApology(jobCategory) {
  const min = getMinSalaryForEntry(jobCategory);
  const formatted = Number(min).toLocaleString("en-US");
  if (jobCategory === "military") {
    return `نعتذر منك الراتب أقل من المطلوب.
الراتب المطلوب للعسكري من ${formatted} ريال`;
  }
  if (jobCategory === "retired") {
    return `نعتذر منك الراتب أقل من المطلوب.
راتب المتقاعد من ${formatted} ريال`;
  }
  return `نعتذر منك الراتب أقل من المطلوب.
راتب المدني من ${formatted} ريال`;
}

function realEstatePrompt() {
  return `هل عليك تمويل عقاري؟

1- لا يوجد عقاري
2- عقاري مدعوم
3- عقاري غير مدعوم
4- عقاري قديم الي قسطه 1667

أرسل الرقم أو النص.`;
}

/** عسكري راتبه تحت 10,000 + لا عقاري → باقة عقاري+شخصي */
function offerMilitaryPropertyCombo(state) {
  const result = buildPropertyComboOffer({
    jobCategory: "military",
    salary: state.salary,
    commitments: state.commitments || 0,
    realEstateType: "none",
    supportAmount: 0,
    reason: "military_low_salary",
  });
  return {
    ...result,
    draft: {
      flow: "personal_chat",
      step: "done",
      awaitingCombo: true,
      ...result.data,
    },
    sessionData: result.data,
  };
}

function militaryWithPropertyReject() {
  const min = getMinSalaryForCategory("military");
  const formatted = Number(min).toLocaleString("en-US");
  return `نعتذر منك الراتب أقل من المطلوب.
الراتب المطلوب للعسكري للتمويل الشخصي من ${formatted} ريال`;
}

function advancePersonalFinanceFlow(draft, text) {
  const state = { ...(draft || {}), flow: "personal_chat" };
  const step = state.step || "sector";
  const raw = String(text || "").trim();

  // إعادة بدء من داخل المحادثة (لا تفسّر "تمويل" كقطاع)
  if (looksLikeStartPersonalFinance(raw)) {
    return startPersonalFinanceFlow();
  }

  if (step === "sector") {
    const jobCategory = mapSector(raw);
    if (!jobCategory) {
      return {
        ok: false,
        reply: `ما قدرت أحدد القطاع.
أرسل:
1- مدني
2- متقاعد
3- عسكري`,
        draft: state,
      };
    }
    state.jobCategory = jobCategory;
    state.step = "salary";
    return {
      ok: true,
      reply: salaryPrompt(jobCategory),
      draft: state,
    };
  }

  if (step === "salary") {
    const salary = parseSalaryReply(raw);
    if (!Number.isFinite(salary) || salary <= 0) {
      return {
        ok: false,
        reply: invalidSalaryPrompt(state.jobCategory),
        draft: state,
      };
    }
    // رفض فوري إذا الراتب تحت الحد (مدني/متقاعد 4000، عسكري دخول 7000)
    if (!meetsMinimumSalaryForEntry(salary, state.jobCategory)) {
      return {
        ok: false,
        reply: lowSalaryApology(state.jobCategory),
        draft: null,
        clearDraft: true,
      };
    }
    state.salary = salary;

    // عسكري أقل من 10,000 → اسأله عن العقاري مباشرة (بدون التزامات)
    const personalMin = getMinSalaryForCategory(state.jobCategory);
    if (state.jobCategory === "military" && salary < personalMin) {
      state.commitments = 0;
      state.militaryLowSalaryPath = true;
      state.step = "real_estate";
      return {
        ok: true,
        reply: realEstatePrompt(),
        draft: state,
      };
    }

    state.step = "commitments";
    return {
      ok: true,
      reply: `كم إجمالي التزاماتك الشهرية؟
أرسل الرقم فقط
مثال: 1500
إذا ما عليك التزامات أرسل: 0`,
      draft: state,
    };
  }

  if (step === "commitments") {
    const commitments = parseSalaryReply(raw);
    if (!Number.isFinite(commitments) || commitments < 0) {
      return {
        ok: false,
        reply: `أرسل الالتزامات بالأرقام فقط.
مثال: 1500`,
        draft: state,
      };
    }
    state.commitments = commitments;
    state.step = "real_estate";
    return {
      ok: true,
      reply: realEstatePrompt(),
      draft: state,
    };
  }

  if (step === "real_estate") {
    let realEstateType = mapRealEstate(raw);
    if (!realEstateType) {
      if (/^1$/.test(raw)) realEstateType = "none";
      if (/^2$/.test(raw)) realEstateType = "supported";
      if (/^3$/.test(raw)) realEstateType = "unsupported";
      if (/^4$/.test(raw)) realEstateType = "old";
    }
    if (!realEstateType) {
      return {
        ok: false,
        reply: `ما قدرت أحدد حالة العقاري.
أرسل:
1- لا يوجد عقاري
2- عقاري مدعوم
3- عقاري غير مدعوم
4- عقاري قديم الي قسطه 1667`,
        draft: state,
      };
    }
    state.realEstateType = realEstateType;

    // مسار العسكري تحت 10,000
    if (state.militaryLowSalaryPath) {
      if (realEstateType === "none") {
        return offerMilitaryPropertyCombo(state);
      }
      return {
        ok: false,
        reply: militaryWithPropertyReject(),
        draft: null,
        clearDraft: true,
      };
    }

    if (realEstateType === "supported") {
      state.step = "support";
      return {
        ok: true,
        reply: `كم قيمة الدعم العقاري الشهري؟
أرسل الرقم فقط
مثال: 1000
إذا ما فيه دعم أرسل: 0`,
        draft: state,
      };
    }

    state.supportAmount = 0;
    return finishPersonalFlow(state);
  }

  if (step === "support") {
    const supportAmount = parseSalaryReply(raw);
    if (!Number.isFinite(supportAmount) || supportAmount < 0) {
      return {
        ok: false,
        reply: `أرسل مبلغ الدعم بالأرقام فقط.
مثال: 1000`,
        draft: state,
      };
    }
    state.supportAmount = supportAmount;
    return finishPersonalFlow(state);
  }

  // خطوة غير معروفة → نعيد من القطاع
  return startPersonalFinanceFlow();
}

function finishPersonalFlow(state) {
  const result = calculatePersonalFinance({
    jobCategory: state.jobCategory,
    salary: state.salary,
    commitments: state.commitments,
    realEstateType: state.realEstateType || "none",
    supportAmount: state.supportAmount || 0,
  });

  return {
    ...result,
    draft: result.data?.awaitingCombo
      ? {
          flow: "personal_chat",
          step: "done",
          awaitingCombo: true,
          ...result.data,
        }
      : null,
    sessionData: result.ok ? result.data : null,
  };
}

module.exports = {
  looksLikeStartPersonalFinance,
  startPersonalFinanceFlow,
  advancePersonalFinanceFlow,
};
