const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  createCampaignedAudience,
  phonesFromCsv,
} = require("../lib/campaigned-audience");

const parsed = phonesFromCsv(
  "countryCode,phoneNumber\n+966,555000111\n+966,555000111\n0115033469\n555000222\n"
);
assert.deepStrictEqual(parsed, ["555000111", "555000222"]);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "campaigned-"));
const seed = path.join(dir, "seed");
fs.mkdirSync(seed);
fs.writeFileSync(
  path.join(seed, "one.csv"),
  "countryCode,phoneNumber\n+966,555000111\n"
);

const store = createCampaignedAudience({ dataDir: dir, seedDir: seed });
assert.strictEqual(store.count(), 1);
assert.strictEqual(store.has("0555000111"), true);

const second = store.importCsv("+966555000333\n555000111");
assert.strictEqual(second.added, 1);
assert.strictEqual(second.count, 2);

const reloaded = createCampaignedAudience({ dataDir: dir, seedDir: null });
assert.strictEqual(reloaded.count(), 2);
assert.ok(reloaded.excludeSet().has("555000333"));

console.log("test-campaigned-audience: OK");
