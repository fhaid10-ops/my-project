/**
 * يتأكد أن ملف .env موجود ويثبّت ADMIN_TOKEN=123456
 * يحافظ على INTERAKT_API_KEY ولا يمسحه أبدًا
 */
const fs = require("fs");
const path = require("path");
const { readEnvFile, rewriteEnvUtf8, decodeEnvBuffer } = require("../lib/load-env");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");
const DEFAULT_TOKEN = "123456";

function extractKeyLoose(raw, name) {
  const clean = String(raw || "").replace(/\u0000/g, "").replace(/^\uFEFF/, "");
  const re = new RegExp(`(?:^|\\n)\\s*${name}\\s*=\\s*([^\\r\\n]*)`, "i");
  const m = clean.match(re);
  return m ? String(m[1] || "").trim().replace(/^['"]|['"]$/g, "") : "";
}

function readExample() {
  if (!fs.existsSync(examplePath)) {
    return `PORT=5055\nHOST=0.0.0.0\nINTERAKT_API_KEY=\nWEBHOOK_SECRET=\n`;
  }
  return readEnvFile(examplePath).text;
}

const existed = fs.existsSync(envPath);
const rawBuf = existed ? fs.readFileSync(envPath) : Buffer.alloc(0);
const rawText = existed ? decodeEnvBuffer(rawBuf) : "";
let { text: content, values } = readEnvFile(envPath);

if (!content) {
  content = readExample();
  values = {};
}

const port = values.PORT || extractKeyLoose(rawText, "PORT") || "5055";
const host = values.HOST || extractKeyLoose(rawText, "HOST") || "0.0.0.0";
let interakt =
  values.INTERAKT_API_KEY ||
  extractKeyLoose(rawText, "INTERAKT_API_KEY") ||
  "";
const webhookSecret =
  values.WEBHOOK_SECRET || extractKeyLoose(rawText, "WEBHOOK_SECRET") || "";

// لا تكتب مفتاح فاضي فوق مفتاح موجود في الملف الخام
if (!interakt.trim()) {
  const loose = extractKeyLoose(rawText, "INTERAKT_API_KEY");
  if (loose) interakt = loose;
}

content = [
  `PORT=${port}`,
  `HOST=${host}`,
  `INTERAKT_API_KEY=${interakt}`,
  `WEBHOOK_SECRET=${webhookSecret}`,
  `ADMIN_TOKEN=${DEFAULT_TOKEN}`,
  "",
].join("\n");

rewriteEnvUtf8(envPath, content);

console.log(`[ensure-env] ADMIN_TOKEN=${DEFAULT_TOKEN}`);
console.log(
  interakt.trim()
    ? `[ensure-env] INTERAKT_API_KEY: YES len=${interakt.trim().length}`
    : "[ensure-env] INTERAKT_API_KEY: EMPTY - paste Secret Key in .env"
);
console.log(`[ensure-env] env file: ${envPath}`);
