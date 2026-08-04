/**
 * يتأكد أن ملف .env موجود ويثبّت ADMIN_TOKEN=123456
 * يُستدعى من start-calc.bat قبل تشغيل السيرفر
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");
const DEFAULT_TOKEN = "123456";

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

let content = readEnv(envPath);
if (!content) {
  content = fs.existsSync(examplePath)
    ? readEnv(examplePath)
    : `PORT=5055\nINTERAKT_API_KEY=\nWEBHOOK_SECRET=\n`;
}

// ثبّت الرمز دائمًا على 123456 حتى لا يحصل لبس (@123456 وغيره)
if (/^\s*ADMIN_TOKEN\s*=/m.test(content)) {
  content = content.replace(/^\s*ADMIN_TOKEN\s*=.*$/m, `ADMIN_TOKEN=${DEFAULT_TOKEN}`);
} else {
  if (!content.endsWith("\n")) content += "\n";
  content += `ADMIN_TOKEN=${DEFAULT_TOKEN}\n`;
}

fs.writeFileSync(envPath, content, "utf8");
console.log(`[ensure-env] ADMIN_TOKEN=${DEFAULT_TOKEN}`);
console.log(`[ensure-env] رمز اللوحة الثابت: ${DEFAULT_TOKEN}`);
