const assert = require("assert");
const {
  looksLikeGreeting,
  looksLikeShowMainMenu,
  looksLikeMenuShortcut,
  showMainMenu,
  parseMainMenuChoice,
  handleMainMenuChoice,
} = require("../lib/main-menu");

assert.strictEqual(looksLikeGreeting("السلام عليكم"), true);
assert.strictEqual(looksLikeGreeting("السلام عليكم ورحمة الله وبركاته"), true);
assert.strictEqual(looksLikeGreeting("مرحبا"), true);
assert.strictEqual(looksLikeGreeting("تمويل شخصي"), false);

assert.strictEqual(looksLikeShowMainMenu("السلام عليكم"), true);
assert.strictEqual(looksLikeShowMainMenu("قائمة"), true);
assert.strictEqual(looksLikeShowMainMenu("قائمة رئيسية"), true);
assert.strictEqual(looksLikeMenuShortcut("1"), true);
assert.strictEqual(looksLikeMenuShortcut("١"), true);
assert.strictEqual(looksLikeMenuShortcut("12"), false);
assert.strictEqual(looksLikeMenuShortcut("تمويل"), false);

const welcome = showMainMenu("السلام عليكم");
assert.ok(welcome.reply.includes("وعليكم السلام"));
assert.ok(welcome.interactive);
assert.strictEqual(welcome.interactive.kind, "list");
assert.strictEqual(welcome.interactive.rows.length, 7);
assert.ok(
  welcome.interactive.rows.some((r) => r.title === "تمويل شخصي")
);
assert.ok(
  welcome.interactive.rows.some((r) => r.title === "شراء مديونية")
);
assert.ok(
  welcome.interactive.rows.some((r) => r.title === "مبالغ التمويل")
);
assert.ok(
  !welcome.interactive.rows.some((r) => /إيقاف الرد/.test(r.title))
);
assert.strictEqual(welcome.draft.flow, "main_menu");

assert.strictEqual(parseMainMenuChoice("1"), "1");
assert.strictEqual(parseMainMenuChoice("تمويل شخصي"), "1");
assert.strictEqual(parseMainMenuChoice("شراء مديونية"), "2");
assert.strictEqual(parseMainMenuChoice("مبالغ التمويل"), "3");
assert.strictEqual(parseMainMenuChoice("إيقاف خدمات"), "4");
assert.strictEqual(parseMainMenuChoice("ساعات الدوام"), "5");
assert.strictEqual(parseMainMenuChoice("موقعنا"), "6");
assert.strictEqual(parseMainMenuChoice("رقم المساعد"), "7");
assert.strictEqual(parseMainMenuChoice("إيقاف الرد الآلي"), null);
assert.strictEqual(parseMainMenuChoice("xyz"), null);

const personal = handleMainMenuChoice("1");
assert.strictEqual(personal.startFlow, "personal");
const debt = handleMainMenuChoice("2");
assert.strictEqual(debt.startFlow, "debt");
const amounts = handleMainMenuChoice("3");
assert.strictEqual(amounts.draft.step, "awaiting_amount_examples_sector");
const hours = handleMainMenuChoice("5");
assert.ok(hours.reply.includes("الأحد") || hours.reply.includes("دوام"));
const assistant = handleMainMenuChoice("7");
assert.ok(assistant.reply.includes("ماجد"));
assert.ok(assistant.reply.includes("0507009290"));
assert.ok(assistant.reply.includes("رائد الحربي"));
assert.ok(assistant.reply.includes("0501812339"));

console.log("test-main-menu: OK");
