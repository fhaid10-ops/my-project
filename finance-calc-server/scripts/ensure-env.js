/**
 * يتأكد أن ملف .env موجود ويثبّت ADMIN_TOKEN=123456
 * يُستدعى من start-calc.bat قبل تشغيل السيرفر
 */
const fs = require("fs");
const path = require("path");
const { readEnvFile, rewriteEnvUtf8 } = require("../lib/load-env");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");
const DEFAULT_TOKEN = "123456";

function readExample() {
  if (!fs.existsSync(examplePath)) {
    return `PORT=5055\nHOST=0.0.0.0\nINTERAKT_API_KEY=\nWEBHOOK_SECRET=\n`;
  }
  return readEnvFile(examplePath).text;
}

let { text: content, values } = readEnvFile(envPath);
if (!content || !Object.keys(values).length) {
  content = readExample();
  values = {};
}

// أعِد بناء الملف بشكل نظيف UTF-8 حتى لا يبقى UTF-16 من Notepad
const port = values.PORT || "5055";
const host = values.HOST || "0.0.0.0";
const interakt = values.INTERAKT_API_KEY || "";
const webhookSecret = values.WEBHOOK_SECRET || "";
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
console.log(`[ensure-env] رمز اللوحة الثابت: ${DEFAULT_TOKEN}`);
console.log(
  interakt.trim()
    ? `[ensure-env] INTERAKT_API_KEY: موجود (طول ${interakt.trim().length})`
    : "[ensure-env] تنبيه: INTERAKT_API_KEY فاضي"
);
console.log(`[ensure-env] ملف .env: ${envPath}`);
