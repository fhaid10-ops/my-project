const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  decodeEnvBuffer,
  parseEnvText,
  loadEnvIntoProcess,
} = require("../lib/load-env");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "envtest-"));
const envPath = path.join(tmpDir, ".env");

// محاكاة Notepad UTF-16 LE
const body = "PORT=5055\r\nINTERAKT_API_KEY=abc123Key=\r\nADMIN_TOKEN=123456\r\n";
const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(body, "utf16le")]);
fs.writeFileSync(envPath, utf16);

const decoded = decodeEnvBuffer(fs.readFileSync(envPath));
assert.match(decoded, /INTERAKT_API_KEY=abc123Key=/);
const parsed = parseEnvText(decoded);
assert.strictEqual(parsed.INTERAKT_API_KEY, "abc123Key=");

delete process.env.INTERAKT_API_KEY;
const info = loadEnvIntoProcess(tmpDir);
assert.strictEqual(info.hasInterakt, true);
assert.strictEqual(process.env.INTERAKT_API_KEY, "abc123Key=");

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log("test-load-env: OK");
