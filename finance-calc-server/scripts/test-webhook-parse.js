const assert = require("assert");
const { extractIncomingMessage } = require("../lib/webhook-parse");
const {
  startPersonalFinanceFlow,
  advancePersonalFinanceFlow,
} = require("../lib/conversation");
const { mapSector } = require("../lib/personal-finance");

function check(name, fn) {
  try {
    fn();
    console.log("OK:", name);
  } catch (err) {
    console.error("FAIL:", name, err.message);
    process.exitCode = 1;
  }
}

check("button_text يتقدم على message الطويل", () => {
  const got = extractIncomingMessage({
    type: "message_api_clicked",
    data: {
      customer: {
        phone_number: "551850488",
        country_code: "+966",
      },
      message: {
        message_content_type: "Template",
        message:
          '[{"type":"body","parameters":[{"type":"text","text":"x"}]}]',
        button_text: "مدني",
        button_payload: {
          payload: { type: "QUICK_REPLY", text: "مدني" },
        },
      },
    },
  });
  assert.strictEqual(got.text, "مدني");
  assert.strictEqual(got.phone, "551850488");
});

check("interactive.button_reply.title", () => {
  const got = extractIncomingMessage({
    type: "message_received",
    data: {
      customer: {
        channel_phone_number: "966501234567",
        country_code: "+966",
      },
      message: {
        message_content_type: "InteractiveButtonReply",
        message: "",
        interactive: {
          type: "button_reply",
          button_reply: { id: "sec-1", title: "➦ متقاعد" },
        },
      },
    },
  });
  assert.strictEqual(got.text, "متقاعد");
  assert.strictEqual(got.phone, "501234567");
});

check("لا يأخذ نص الرسالة الأصلية بدل الزر", () => {
  const got = extractIncomingMessage({
    type: "message_received",
    data: {
      customer: { phone_number: "500000001", country_code: "+966" },
      message: {
        message: "✅ تمام نبدأ حسبة التمويل الشخصي. اختر قطاعك:",
        button_text: "عسكري",
      },
    },
  });
  assert.strictEqual(got.text, "عسكري");
});

check("mapSector يفهم مدني مع رمز السهم", () => {
  assert.strictEqual(mapSector("➦ مدني"), "civilian");
  assert.strictEqual(mapSector("civilian"), "civilian");
  assert.strictEqual(mapSector("2"), "retired");
});

check("ضغط مدني يكمل لسؤال الراتب", () => {
  const start = startPersonalFinanceFlow();
  assert.strictEqual(start.reply, null);
  const next = advancePersonalFinanceFlow(start.draft, "مدني");
  assert.ok(next.ok);
  assert.match(next.reply, /راتبك/);
  assert.strictEqual(next.draft.step, "salary");
  assert.strictEqual(next.draft.jobCategory, "civilian");
});

check("سيناريو الزر الفاشل سابقًا", () => {
  const start = startPersonalFinanceFlow();
  const extracted = extractIncomingMessage({
    type: "message_api_clicked",
    data: {
      customer: { phone_number: "551850488", country_code: "+966" },
      message: {
        message:
          "✅ تمام نبدأ حسبة التمويل الشخصي. اختر قطاعك:",
        button_text: "مدني",
      },
    },
  });
  const next = advancePersonalFinanceFlow(start.draft, extracted.text);
  assert.ok(next.ok, next.reply);
  assert.strictEqual(next.draft.jobCategory, "civilian");
});

if (!process.exitCode) {
  console.log("\nكل اختبارات webhook-parse نجحت");
}
