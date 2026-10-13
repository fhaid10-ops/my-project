const assert = require("assert");
const {
  flattenInteraktErrorBody,
  describeInteraktFailure,
  recordOutboundError,
  recordOutboundSuccess,
  getLastOutboundError,
} = require("../lib/interakt-send-error");

assert.strictEqual(
  flattenInteraktErrorBody([
    "Your wallet doesn't have sufficient balance. Please recharge your wallet to continue sending messages.",
  ]),
  "Your wallet doesn't have sufficient balance. Please recharge your wallet to continue sending messages."
);

const wallet = describeInteraktFailure({
  status: 400,
  json: [
    "Your wallet doesn't have sufficient balance. Please recharge your wallet to continue sending messages.",
  ],
});
assert.strictEqual(wallet.code, "wallet_empty");
assert.match(wallet.hint, /محفظة Interakt فارغة/);

const walletObj = describeInteraktFailure({
  status: 400,
  json: {
    details: ["Please recharge your wallet to continue sending messages."],
  },
});
assert.strictEqual(walletObj.code, "wallet_empty");

const windowErr = describeInteraktFailure({
  status: 400,
  json: { message: "Customer care window has expired (24 hour)" },
});
assert.strictEqual(windowErr.code, "outside_window");

const generic = describeInteraktFailure({
  status: 400,
  json: { message: "rate limited" },
});
assert.strictEqual(generic.code, "send_failed");
assert.match(generic.hint, /rate limited/);

recordOutboundSuccess();
assert.strictEqual(getLastOutboundError(), null);
recordOutboundError(wallet, { phone: "559954968" });
const stored = getLastOutboundError();
assert.strictEqual(stored.code, "wallet_empty");
assert.strictEqual(stored.phone, "559954968");
assert.ok(stored.at);
recordOutboundSuccess();
assert.strictEqual(getLastOutboundError(), null);

console.log("test-interakt-send-error: OK");
