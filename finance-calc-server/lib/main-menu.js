/**
 * رسالة الترحيب + القائمة الرئيسية (عند السلام عليكم / قائمة)
 */
const CONFIG = require("../config");
const { normalizeDigits } = require("./digits");
const { askAmountExamplesSector } = require("./amount-examples");

function looksLikeGreeting(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 80) return false;
  if (/^(السلام عليكم|سلام عليكم|السلام عليكم ورحمة الله|السلام عليكم ورحمة الله وبركاته|سلام|مرحبا|مرحباً|اهلا|أهلا|أهلاً|هلا|هاي|hi|hello)$/i.test(t)) {
    return true;
  }
  // صيغ شائعة قصيرة فيها «السلام عليكم»
  return /السلام\s*عليكم/.test(t) && t.length <= 60;
}

function looksLikeMainMenuTrigger(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 40) return false;
  return /^(قائمة|القائمة|قائمة رئيسية|القائمة الرئيسية|menu|start)$/i.test(t);
}

function looksLikeShowMainMenu(text) {
  return looksLikeGreeting(text) || looksLikeMainMenuTrigger(text);
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
5- ساعات ووقت الدوام الرسمي
6- موقعنا
7- رقم المساعد`;
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
        title: "ساعات الدوام",
        description: "ساعات ووقت الدوام الرسمي",
      },
      {
        id: "menu_6",
        title: "موقعنا",
        description: "عنوان المعرض والتواصل",
      },
      {
        id: "menu_7",
        title: "رقم المساعد",
        description: "للتواصل مع المساعد",
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
 * يُرجع "1"…"7" أو null
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
    /ساعات|الدوام|وقت الدوام/i.test(t) ||
    /^menu_5$/i.test(t)
  ) {
    return "5";
  }
  if (/^[6]$/.test(t) || /^موقعنا$/i.test(t) || /^menu_6$/i.test(t)) {
    return "6";
  }
  if (
    /^[7]$/.test(t) ||
    /رقم\s*المساعد|^المساعد$/i.test(t) ||
    /^menu_7$/i.test(t)
  ) {
    return "7";
  }
  return null;
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
  const name =
    CONFIG.contact?.personalAgentName ||
    CONFIG.brand?.name ||
    "رائد الحربي";
  const phone =
    CONFIG.contact?.personalAgentPhone ||
    CONFIG.brand?.contactPhone ||
    "0501812339";
  const tpl = CONFIG.templates?.assistantContact;
  if (typeof tpl === "function") return tpl(name, phone);
  return `رقم المساعد — ${name}:
${phone}

رائد الحربي`;
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
      return {
        ok: true,
        flow: "main_menu",
        reply: serviceStopInfoReply(),
        draft: { flow: "main_menu", step: "awaiting_choice" },
      };
    case "5":
      return {
        ok: true,
        flow: "main_menu",
        reply: CONFIG.brand?.workingHours || "ساعات الدوام: الأحد–الخميس 9ص–5م",
        draft: { flow: "main_menu", step: "awaiting_choice" },
      };
    case "6":
      return {
        ok: true,
        flow: "main_menu",
        reply: CONFIG.brand?.locationInfo || "موقعنا: معرض السديري للسيارات",
        draft: { flow: "main_menu", step: "awaiting_choice" },
      };
    case "7":
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
    body: "أي قطاع؟",
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
  looksLikeShowMainMenu,
  showMainMenu,
  parseMainMenuChoice,
  handleMainMenuChoice,
  sectorButtonsInteractive,
  mainMenuInteractive,
};
