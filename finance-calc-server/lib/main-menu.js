/**
 * رسالة الترحيب + القائمة الرئيسية (عند السلام عليكم / قائمة)
 */
const CONFIG = require("../config");
const { normalizeDigits } = require("./digits");
const { askAmountExamplesSector } = require("./amount-examples");

function looksLikeGreeting(text) {
  const t = String(text || "")
    .trim()
    .replace(/[.!?…]+$/g, "")
    .trim();
  if (!t || t.length > 80) return false;
  if (
    /^(السلام عليكم|سلام عليكم|السلام عليكم ورحمة الله|السلام عليكم ورحمة الله وبركاته|وعليكم السلام|السلام|سلام|مرحبا|مرحباً|اهلا|أهلا|أهلاً|هلا|هلا والله|يا هلا|صباح الخير|مساء الخير|صباح النور|مساء النور|هاي|hi|hello)$/i.test(
      t
    )
  ) {
    return true;
  }
  // صيغ شائعة قصيرة فيها «السلام» أو «السلام عليكم»
  return /(?:^|\s)السلام(?:\s*عليكم)?(?:\s|$)/.test(t) && t.length <= 60;
}

function looksLikeMainMenuTrigger(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 40) return false;
  return /^(قائمة|القائمة|قائمة رئيسية|القائمة الرئيسية|menu|start)$/i.test(t);
}

/**
 * اختصار عرض القائمة — اكتب: 1
 * يعمل من المكتب أو من العميل، حتى لو داخل مسار حسبة
 */
function looksLikeMenuShortcut(text) {
  const t = normalizeDigits(String(text || "").trim());
  return /^(1)$/.test(t);
}

function looksLikeShowMainMenu(text) {
  return looksLikeGreeting(text) || looksLikeMainMenuTrigger(text);
}

/**
 * إعادة من جديد أثناء المسار (راتب/التزامات خطأ…): إعادة | اعادة | reset | من جديد
 */
function looksLikeRestartFlow(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 40) return false;
  const keywords = CONFIG.session?.resetKeywords || [
    "reset",
    "إعادة",
    "اعادة",
    "من جديد",
  ];
  const normalized = t.replace(/\s+/g, " ");
  return keywords.some((keyword) => {
    const k = String(keyword || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!k) return false;
    return normalized.localeCompare(k, "ar", { sensitivity: "accent" }) === 0
      || normalized.toLowerCase() === k.toLowerCase();
  });
}

function welcomeBody(text) {
  if (looksLikeGreeting(text)) {
    return `وعليكم السلام ورحمة الله وبركاته

مرحبا معاك رائد الحربي.
مانوع استفسارك؟
اختر من القائمة:`;
  }
  return `مرحبا معاك رائد الحربي.
مانوع استفسارك؟
اختر من القائمة:`;
}

function numberedMenuFallback(body) {
  return `${body}

1- تمويل شخصي
2- شراء مديونية
3- مبالغ التمويل
4- عليك إيقاف خدمات وتبي الحل
5- حلول تمويلية
6- ساعات ووقت الدوام الرسمي
7- موقعنا
8- رقم الموظفين`;
}

function mainMenuInteractive(body) {
  return {
    kind: "list",
    body,
    button: "اختر الخدمة",
    sectionTitle: "القائمة الرئيسية",
    rows: [
      {
        id: "menu_1",
        title: "تمويل شخصي",
        description: "حاسبة التمويل الشخصي",
      },
      {
        id: "menu_2",
        title: "شراء مديونية",
        description: "شراء مديونية الشركات",
      },
      {
        id: "menu_3",
        title: "مبالغ التمويل",
        description: "أمثلة المبالغ والأقساط",
      },
      {
        id: "menu_4",
        title: "إيقاف خدمات",
        description: "عليك إيقاف خدمات وتبي الحل",
      },
      {
        id: "menu_5",
        title: "حلول تمويلية",
        description: "باقة عقاري وشخصي",
      },
      {
        id: "menu_6",
        title: "ساعات الدوام",
        description: "ساعات ووقت الدوام الرسمي",
      },
      {
        id: "menu_7",
        title: "موقعنا",
        description: "عنوان المعرض والتواصل",
      },
      {
        id: "menu_8",
        title: "رقم الموظفين",
        description: "عبدالرحمن وماجد",
      },
    ],
  };
}

function showMainMenu(text) {
  const body = welcomeBody(text);
  return {
    ok: true,
    flow: "main_menu",
    reply: numberedMenuFallback(body),
    interactive: mainMenuInteractive(body),
    draft: { flow: "main_menu", step: "awaiting_choice" },
    clearSession: true,
    resumeChat: true,
  };
}

/**
 * يُرجع "1"…"8" أو null
 */
function parseMainMenuChoice(text) {
  const raw = String(text || "").trim();
  if (!raw || raw.length > 80) return null;
  const t = normalizeDigits(raw);

  if (/^[1]$/.test(t) || /^تمويل\s*شخصي$/i.test(t) || /^menu_1$/i.test(t)) {
    return "1";
  }
  if (
    /^[2]$/.test(t) ||
    /^شراء\s*مديوني/i.test(t) ||
    /^مديونية$/i.test(t) ||
    /^menu_2$/i.test(t)
  ) {
    return "2";
  }
  if (
    /^[3]$/.test(t) ||
    /مبالغ\s*التمويل|امثلة\s*المبالغ|أمثلة\s*المبالغ/i.test(t) ||
    /^menu_3$/i.test(t)
  ) {
    return "3";
  }
  if (
    /^[4]$/.test(t) ||
    /ايقاف\s*خدمات|إيقاف\s*خدمات|إيقاف خدمات/i.test(t) ||
    /^menu_4$/i.test(t)
  ) {
    return "4";
  }
  if (
    /^[5]$/.test(t) ||
    /حلول\s*تمويلي/i.test(t) ||
    /^menu_5$/i.test(t)
  ) {
    return "5";
  }
  if (
    /^[6]$/.test(t) ||
    /ساعات|الدوام|وقت الدوام/i.test(t) ||
    /^menu_6$/i.test(t)
  ) {
    return "6";
  }
  if (/^[7]$/.test(t) || /^موقعنا$/i.test(t) || /^menu_7$/i.test(t)) {
    return "7";
  }
  if (
    /^[8]$/.test(t) ||
    /رقم\s*الموظفين|رقم\s*المساعد|^المساعد$|^الموظفين$/i.test(t) ||
    /^menu_8$/i.test(t)
  ) {
    return "8";
  }
  return null;
}

function serviceStopYesNoButtons(body) {
  return {
    kind: "buttons",
    body: String(body || "").slice(0, 1024),
    buttons: [
      { id: "ss_yes", title: "نعم" },
      { id: "ss_no", title: "لا" },
    ],
  };
}

function parseServiceStopYesNo(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 40) return null;
  if (/^(1|نعم|اي|أي|أجل|موافق|ss_yes|yes)$/i.test(t)) return "yes";
  if (/^(2|لا|لأ|لاء|ما ابي|ماأبي|رفض|ss_no|no)$/i.test(t)) return "no";
  return null;
}

function qualifyAgentVariant(kind) {
  if (kind === "financing_solutions") {
    return {
      qualifyStep: "awaiting_financing_solutions_qualify",
      agentStep: "awaiting_financing_solutions_agent",
      offer: "financing_solutions",
      accepted: "financing_solutions_accepted",
    };
  }
  return {
    qualifyStep: "awaiting_service_stop_qualify",
    agentStep: "awaiting_service_stop_agent",
    offer: "service_stop",
    accepted: "service_stop_accepted",
  };
}

function kindFromDraft(draft) {
  const step = String(draft?.step || "");
  if (draft?.kind === "financing_solutions" || /financing_solutions/.test(step)) {
    return "financing_solutions";
  }
  return "service_stop";
}

function startQualifyAgentFlow(kind = "service_stop") {
  const v = qualifyAgentVariant(kind);
  const tpl =
    CONFIG.messages?.serviceStopQualify ||
    CONFIG.templates?.serviceStopQualify;
  const body =
    typeof tpl === "function"
      ? tpl()
      : tpl ||
        `هل راتبك لا يقل عن 7000 ريال
وما عليك عقاري؟`;
  return {
    ok: true,
    flow: "main_menu",
    offer: v.offer,
    interactive: serviceStopYesNoButtons(body),
    draft: { flow: "main_menu", step: v.qualifyStep, kind },
  };
}

function startServiceStopFlow() {
  return startQualifyAgentFlow("service_stop");
}

function startFinancingSolutionsFlow() {
  return startQualifyAgentFlow("financing_solutions");
}

function serviceStopOfferBody() {
  const combo = CONFIG.comboPackage || {};
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const tpl = CONFIG.templates?.serviceStopOffer;
  if (typeof tpl === "function") {
    return tpl(
      fmt(combo.totalExample || 1000000),
      fmt(combo.propertyAmount || 400000),
      fmt(combo.personalAmount || 600000)
    );
  }
  return `• شركة تسددلك جميع التزاماتك
• و تستخرج لك مثال
مليون
${fmt(combo.propertyAmount || 400000)} ريال عقاري
${fmt(combo.personalAmount || 600000)} ريال شخصي
كل عميل حسب راتبه وحسب حسب البنك له يعني 60% كاش

تبي ارسلك رقم المندوب؟`;
}

/**
 * خطوات إيقاف الخدمات بعد اختيار القائمة
 */
function advanceServiceStopFlow(draft, text, yesNoHint) {
  const kind = kindFromDraft(draft);
  const v = qualifyAgentVariant(kind);
  const step = draft?.step;
  const choice = yesNoHint || parseServiceStopYesNo(text);

  if (step === v.qualifyStep) {
    if (choice === "yes") {
      return {
        ok: true,
        flow: "main_menu",
        offer: v.offer,
        interactive: serviceStopYesNoButtons(serviceStopOfferBody()),
        draft: { flow: "main_menu", step: v.agentStep, kind },
      };
    }
    if (choice === "no") {
      const declined =
        CONFIG.messages?.serviceStopNotQualified ||
        CONFIG.templates?.serviceStopNotQualified;
      return {
        ok: true,
        flow: "main_menu",
        offer: v.offer,
        reply:
          typeof declined === "function"
            ? declined()
            : declined || "بالتوفيق وحياك الله",
        clearDraft: true,
        draft: null,
      };
    }
    const reask =
      CONFIG.messages?.serviceStopQualify ||
      CONFIG.templates?.serviceStopQualify;
    return {
      ok: false,
      flow: "main_menu",
      offer: v.offer,
      interactive: serviceStopYesNoButtons(
        typeof reask === "function"
          ? reask()
          : reask ||
              `هل راتبك لا يقل عن 7000 ريال
وما عليك عقاري؟`
      ),
      draft: { flow: "main_menu", step: v.qualifyStep, kind },
    };
  }

  if (step === v.agentStep) {
    if (choice === "yes") {
      // طلب صريح: إذا نعم لا ترسل أي شيء
      return {
        ok: true,
        flow: "main_menu",
        offer: v.accepted,
        silent: true,
        clearDraft: true,
        draft: null,
      };
    }
    if (choice === "no") {
      const declined =
        CONFIG.messages?.serviceStopAgentDeclined ||
        CONFIG.templates?.serviceStopAgentDeclined;
      return {
        ok: true,
        flow: "main_menu",
        offer: v.offer,
        reply:
          typeof declined === "function"
            ? declined()
            : declined || "بالتوفيق وحياك الله",
        clearDraft: true,
        draft: null,
      };
    }
    return {
      ok: false,
      flow: "main_menu",
      offer: v.offer,
      interactive: serviceStopYesNoButtons(serviceStopOfferBody()),
      draft: { flow: "main_menu", step: v.agentStep, kind },
    };
  }

  return startQualifyAgentFlow(kind);
}

function serviceStopInfoReply() {
  const combo = CONFIG.comboPackage || {};
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const tpl = CONFIG.templates?.serviceStopWelcome;
  if (typeof tpl === "function") {
    return tpl(
      fmt(combo.totalExample),
      fmt(combo.propertyAmount),
      fmt(combo.personalAmount)
    );
  }
  return `شروط إيقاف الخدمات:

• أقل راتب شهري: 7000 ريال
• ما عليك عقاري
• شركة تسددلك جميع التزاماتك

للتواصل: ${CONFIG.brand?.contactPhone || "0501812339"}`;
}

function assistantContactReply() {
  const assistants = CONFIG.brand?.assistants;
  const multiTpl = CONFIG.templates?.assistantContacts;
  if (Array.isArray(assistants) && assistants.length && typeof multiTpl === "function") {
    return multiTpl(assistants);
  }
  if (Array.isArray(assistants) && assistants.length) {
    const lines = assistants
      .filter((a) => a && a.name && a.phone)
      .map((a) => `${a.name} ${a.phone}`)
      .join("\n");
    return `رقم الموظفين
${lines}`;
  }
  const name =
    CONFIG.financing?.branchEmployeeName ||
    CONFIG.brand?.name ||
    "رائد الحربي";
  const phone =
    CONFIG.financing?.branchEmployeePhone ||
    CONFIG.brand?.contactPhone ||
    "0501812339";
  const tpl = CONFIG.templates?.assistantContact;
  if (typeof tpl === "function") return tpl(name, phone);
  return `رقم الموظفين
${name} ${phone}`;
}

/**
 * معالجة اختيار من القائمة الرئيسية
 */
function handleMainMenuChoice(choice) {
  switch (String(choice)) {
    case "1":
      return {
        ok: true,
        flow: "main_menu",
        startFlow: "personal",
        clearDraft: true,
      };
    case "2":
      return {
        ok: true,
        flow: "main_menu",
        startFlow: "debt",
        clearDraft: true,
      };
    case "3":
      return askAmountExamplesSector();
    case "4":
      return startServiceStopFlow();
    case "5":
      return startFinancingSolutionsFlow();
    case "6":
      return {
        ok: true,
        flow: "main_menu",
        reply: CONFIG.brand?.workingHours || "ساعات الدوام: الأحد–الخميس 9ص–5م",
        draft: { flow: "main_menu", step: "awaiting_choice" },
      };
    case "7":
      return {
        ok: true,
        flow: "main_menu",
        reply: CONFIG.brand?.locationInfo || "موقعنا: معرض السديري للسيارات",
        draft: { flow: "main_menu", step: "awaiting_choice" },
      };
    case "8":
      return {
        ok: true,
        flow: "main_menu",
        reply: assistantContactReply(),
        draft: { flow: "main_menu", step: "awaiting_choice" },
      };
    default:
      return {
        ok: false,
        reply:
          CONFIG.messages?.invalidInquiryType ||
          numberedMenuFallback("اختر من القائمة:"),
        interactive: mainMenuInteractive("اختر نوع استفسارك من القائمة:"),
        draft: { flow: "main_menu", step: "awaiting_choice" },
      };
  }
}

function sectorButtonsInteractive() {
  return {
    kind: "buttons",
    body: "اختر",
    buttons: [
      { id: "civilian", title: "مدني" },
      { id: "retired", title: "متقاعد" },
      { id: "military", title: "عسكري" },
    ],
  };
}

module.exports = {
  looksLikeGreeting,
  looksLikeMainMenuTrigger,
  looksLikeMenuShortcut,
  looksLikeShowMainMenu,
  looksLikeRestartFlow,
  showMainMenu,
  parseMainMenuChoice,
  handleMainMenuChoice,
  startServiceStopFlow,
  startFinancingSolutionsFlow,
  advanceServiceStopFlow,
  parseServiceStopYesNo,
  sectorButtonsInteractive,
  mainMenuInteractive,
};
