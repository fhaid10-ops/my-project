const assert = require("assert");
const {
  looksLikeGreeting,
  looksLikeShowMainMenu,
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
assert.strictEqual(welcome.draft.flow, "main_menu");

assert.strictEqual(parseMainMenuChoice("1"), "1");
assert.strictEqual(parseMainMenuChoice("تمويل شخصي"), "1");
assert.strictEqual(parseMainMenuChoice("شراء مديونية"), "2");
assert.strictEqual(parseMainMenuChoice("إيقاف خدمات"), "3");
assert.strictEqual(parseMainMenuChoice("ساعات الدوام"), "4");
assert.strictEqual(parseMainMenuChoice("موقعنا"), "5");
assert.strictEqual(parseMainMenuChoice("إيقاف الرد الآلي"), "6");
assert.strictEqual(parseMainMenuChoice("رقم المساعد"), "7");
assert.strictEqual(parseMainMenuChoice("xyz"), null);

const personal = handleMainMenuChoice("1");
assert.strictEqual(personal.startFlow, "personal");
const debt = handleMainMenuChoice("2");
assert.strictEqual(debt.startFlow, "debt");
const hours = handleMainMenuChoice("4");
assert.ok(hours.reply.includes("الأحد") || hours.reply.includes("دوام"));
const pause = handleMainMenuChoice("6");
assert.strictEqual(pause.pauseChat, true);

console.log("test-main-menu: OK");
