const assert = require("assert");
const {
  startPersonalFinanceFlow,
  advancePersonalFinanceFlow,
  realEstateStepReply,
} = require("../lib/conversation");

const re = realEstateStepReply({
  flow: "personal_chat",
  step: "real_estate",
  jobCategory: "civilian",
  salary: 8000,
  commitments: 1500,
});
assert.strictEqual(re.sendTextThenInteractive, true);
assert.ok(re.reply.includes("تمويل عقاري"));
assert.strictEqual(re.interactive?.kind, "list");

let draft = startPersonalFinanceFlow({ askSector: true }).draft;
draft = advancePersonalFinanceFlow(draft, "مدني").draft;
draft = advancePersonalFinanceFlow(draft, "8000").draft;
assert.strictEqual(draft.step, "commitments");

const afterCommitments = advancePersonalFinanceFlow(draft, "1500");
assert.strictEqual(afterCommitments.draft.step, "real_estate");
assert.strictEqual(afterCommitments.sendTextThenInteractive, true);
assert.ok(afterCommitments.reply.includes("عقاري"));
assert.strictEqual(afterCommitments.interactive?.kind, "list");

console.log("OK: بعد الالتزامات يكتمل بسؤال العقاري (نص + قائمة)");
