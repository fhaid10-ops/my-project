/**
 * قراءة .env بشكل آمن على ويندوز (UTF-8 / UTF-16 من Notepad)
 */
const fs = require("fs");
const path = require("path");

function decodeEnvBuffer(buf) {
  if (!buf || !buf.length) return "";
  // UTF-16 LE
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.slice(2).toString("utf16le");
  }
  // UTF-16 BE
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.alloc(buf.length - 2);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    return swapped.toString("utf16le");
  }
  // UTF-8 BOM
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString("utf8");
  }
  let text = buf.toString("utf8");
  // ملف UTF-16 بدون BOM يقرأ كـ utf8 فيه null bytes بين الحروف
  if (text.includes("\u0000")) {
    text = buf.toString("utf16le").replace(/^\uFEFF/, "");
  }
  return text.replace(/\u0000/g, "");
}

function parseEnvText(text) {
  const out = {};
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return { text: "", values: {}, exists: false };
  const buf = fs.readFileSync(envPath);
  const text = decodeEnvBuffer(buf);
  return { text, values: parseEnvText(text), exists: true };
}

function loadEnvIntoProcess(rootDir = path.join(__dirname, "..")) {
  const envPath = path.join(rootDir, ".env");
  const { values, exists, text } = readEnvFile(envPath);
  for (const [key, value] of Object.entries(values)) {
    // لا نكتب فوق متغيرات النظام إن كانت مضبوطة صراحة
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
  return {
    envPath,
    exists,
    keys: Object.keys(values),
    hasInterakt: Boolean(String(values.INTERAKT_API_KEY || "").trim()),
    interaktLength: String(values.INTERAKT_API_KEY || "").trim().length,
    rawLength: text.length,
  };
}

function rewriteEnvUtf8(envPath, content) {
  const text = String(content || "")
    .replace(/\u0000/g, "")
    .replace(/^\uFEFF/, "");
  fs.writeFileSync(envPath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

module.exports = {
  decodeEnvBuffer,
  parseEnvText,
  readEnvFile,
  loadEnvIntoProcess,
  rewriteEnvUtf8,
};
