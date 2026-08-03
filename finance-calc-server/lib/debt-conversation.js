/**
 * محادثة شراء مديونية خطوة بخطوة عبر الكوبري
 * المسار: قطاع → راتب → عقاري → التزامات → مبلغ المديونية → عرض → إكمال
 */
const CONFIG = require("../config");
const { mapSector } = require("./personal-finance");
const {
  getMinSalaryForEntry,
  getMinSalaryForCategory,
  meetsMinimumSalaryForEntry,
} = require("./calculations");
const { normalizeDigits } = require("./digits");
const {
  calculateDebtPurchaseOffer,
  buildDebtPurchaseComplete,
  buildDebtPurchaseDeclined,
  looksLikeDebtContinueReply,
} = require("./debt-purchase");
const {
  parseSalaryReply,
  salaryPrompt,
  invalidSalaryPrompt,
  lowSalaryApology,
  realEstateStepReply,
  parseRealEstateChoice,
  realEstateInteractive,
  offerMilitaryPropertyCombo,
  militaryWithPropertyReject,
} = require("./conversation");

function looksLikeStartDebtPurchase(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (t.length > 80) return false;
  // لا نستخدم "2" وحده — يتعارض مع خيارات العقاري/نعم-لا
  return /^(شراء مديونية|شراء المديونية|ابي شراء مديونية|أبي شراء مديونية|مديونية)$/i.test(
    t
  );
}

function startDebtPurchaseFlow() {
  // Interakt يعرض أزرار القطاع؛ الكوبري يجهّز الجلسة فقط
  return {
    ok: true,
    flow: "debt_chat",
    reply: null,
    draft: {
      flow: "debt_chat",
      step: "sector",
    },
  };
}

function debtRulesText() {
  return (
    CONFIG.messages?.debtPurchaseRules ||
    `تنويه بخصوص شراء المديونية:

نشتري مديونية الشركات فقط مثل: إمكان، النايفات، اليسر
ونشتري مديونية واحدة فقط`
  );
}

function debtCommitmentsPrompt() {
  return (
    CONFIG.messages?.commitmentsDebtPurchase ||
    `أرسل إجمالي الالتزامات الشهرية بالأرقام فقط
(جميع الأقساط عندك بدون قسط الشركة التي نشتري مديونيتها).

مثال:
3500`
  );
}

function debtAmountPrompt() {
  return (
    CONFIG.messages?.debtPurchaseAmount ||
    `كم مبلغ شراء المديونية المطلوب؟

أرسل المبلغ بالأرقام فقط.

مثال:
20000`
  );
}

function advanceDebtPurchaseFlow(draft, text) {
  const state = { ...(draft || {}), flow: "debt_chat" };
  const step = state.step || "sector";
  const raw = String(text || "").trim();

  if (looksLikeStartDebtPurchase(raw)) {
    return startDebtPurchaseFlow();
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
      reply: `${debtRulesText()}

${salaryPrompt(jobCategory)}`,
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
    if (!meetsMinimumSalaryForEntry(salary, state.jobCategory)) {
      return {
        ok: false,
        reply: lowSalaryApology(state.jobCategory),
        draft: null,
        clearDraft: true,
      };
    }
    state.salary = salary;

    const personalMin = getMinSalaryForCategory(state.jobCategory);
    if (state.jobCategory === "military" && salary < personalMin) {
      state.commitments = 0;
      state.militaryLowSalaryPath = true;
      state.step = "real_estate";
      return realEstateStepReply(state);
    }

    state.step = "real_estate";
    return realEstateStepReply(state);
  }

  if (step === "real_estate") {
    const realEstateType = parseRealEstateChoice(raw);
    if (!realEstateType) {
      return {
        ok: false,
        reply: `ما قدرت أحدد حالة العقاري.
اختر من القائمة أو أرسل:
1- لا يوجد عقاري
2- عقاري مدعوم
3- عقاري غير مدعوم
4- عقاري قديم الي قسطه 1667`,
        interactive: realEstateInteractive(),
        draft: state,
      };
    }
    state.realEstateType = realEstateType;

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
    state.step = "commitments";
    return {
      ok: true,
      reply: debtCommitmentsPrompt(),
      draft: state,
    };
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
    state.step = "commitments";
    return {
      ok: true,
      reply: debtCommitmentsPrompt(),
      draft: state,
    };
  }

  if (step === "commitments") {
    const commitments = parseSalaryReply(raw);
    if (!Number.isFinite(commitments) || commitments < 0) {
      return {
        ok: false,
        reply:
          CONFIG.messages?.invalidCommitmentsDebtPurchase ||
          `الرجاء كتابة إجمالي الالتزامات بالأرقام فقط
(جميع الأقساط عندك بدون قسط الشركة التي نشتري مديونيتها).

مثال:
3500`,
        draft: state,
      };
    }
    state.commitments = commitments;
    state.step = "debt_amount";
    return {
      ok: true,
      reply: debtAmountPrompt(),
      draft: state,
    };
  }

  if (step === "debt_amount") {
    const debtAmount = parseSalaryReply(raw);
    if (!Number.isFinite(debtAmount) || debtAmount <= 0) {
      return {
        ok: false,
        reply:
          CONFIG.messages?.invalidDebtPurchaseAmount ||
          `الرجاء كتابة مبلغ شراء المديونية بالأرقام فقط.

مثال:
20000`,
        draft: state,
      };
    }
    state.debtAmount = debtAmount;
    const offer = calculateDebtPurchaseOffer({
      debtAmount,
      jobCategory: state.jobCategory,
    });
    if (!offer.ok) {
      return { ...offer, draft: state };
    }
    return {
      ...offer,
      draft: {
        ...state,
        step: "debt_continue",
        awaitingDebtContinue: true,
        ...offer.data,
      },
      sessionData: offer.data,
    };
  }

  if (step === "debt_continue") {
    const choice = looksLikeDebtContinueReply(raw);
    if (!choice) {
      return {
        ok: false,
        reply:
          CONFIG.messages?.invalidDebtContinue ||
          `الرجاء الرد على السؤال بالشكل الصحيح.

هل تبي تكمل؟

1- نعم
2- لا`,
        interactive: {
          kind: "buttons",
          body:
            CONFIG.messages?.debtContinueQuestion ||
            `هل تبي تكمل إجراءات شراء المديونية؟

1- نعم
2- لا`,
          buttons: [
            { id: "debt_yes", title: "نعم" },
            { id: "debt_no", title: "لا" },
          ],
        },
        draft: state,
      };
    }
    if (choice === "yes") {
      return {
        ...buildDebtPurchaseComplete(),
        draft: null,
        clearDraft: true,
      };
    }
    return {
      ...buildDebtPurchaseDeclined(),
      draft: null,
      clearDraft: true,
    };
  }

  return startDebtPurchaseFlow();
}

module.exports = {
  looksLikeStartDebtPurchase,
  startDebtPurchaseFlow,
  advanceDebtPurchaseFlow,
};
