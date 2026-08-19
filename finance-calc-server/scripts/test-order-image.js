const assert = require("assert");
const {
  isSafeMediaUrl,
  looksLikeImageBuffer,
  downloadImage,
  readOrderNumberFromImage,
  OCR_LANGS,
} = require("../lib/order-image");

function check(name, fn) {
  try {
    const out = fn();
    if (out && typeof out.then === "function") {
      return out.then(
        () => console.log("OK:", name),
        (err) => {
          console.error("FAIL:", name, err.message);
          process.exitCode = 1;
        }
      );
    }
    console.log("OK:", name);
    return Promise.resolve();
  } catch (err) {
    console.error("FAIL:", name, err.message);
    process.exitCode = 1;
    return Promise.resolve();
  }
}

async function run() {
  await check("يرفض http وlocalhost", () => {
    assert.strictEqual(isSafeMediaUrl("http://cdn.example.com/a.jpg"), false);
    assert.strictEqual(isSafeMediaUrl("https://localhost/a.jpg"), false);
    assert.strictEqual(isSafeMediaUrl("https://127.0.0.1/a.jpg"), false);
    assert.strictEqual(isSafeMediaUrl("https://10.0.0.5/a.jpg"), false);
    assert.strictEqual(
      isSafeMediaUrl("https://cdn.interakt.ai/media/order.jpg"),
      true
    );
  });

  await check("تعرف ترويسة JPEG", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    assert.strictEqual(looksLikeImageBuffer(jpeg), true);
    assert.strictEqual(looksLikeImageBuffer(Buffer.from("not-an-image!!")), false);
  });

  await check("downloadImage يرفض URL غير آمن", async () => {
    await assert.rejects(
      () => downloadImage("http://example.com/a.jpg"),
      /unsafe media url/
    );
  });

  await check("OCR وهمي يستخرج 1017 من الصورة", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const got = await readOrderNumberFromImage(
      "https://cdn.interakt.ai/media/order.jpg",
      {
        fetchImpl: async () => ({
          ok: true,
          headers: {
            get: (name) =>
              name === "content-type" ? "image/jpeg" : name === "content-length" ? String(jpeg.length) : null,
          },
          arrayBuffer: async () => jpeg,
        }),
        recognizeFn: async () => "Application No\n1017 8456",
      }
    );
    assert.strictEqual(got, "10178456");
  });

  await check("OCR وهمي بدون رقم يرجع null", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const got = await readOrderNumberFromImage(
      "https://cdn.interakt.ai/media/selfie.jpg",
      {
        fetchImpl: async () => ({
          ok: true,
          headers: {
            get: (name) => (name === "content-type" ? "image/jpeg" : null),
          },
          arrayBuffer: async () => jpeg,
        }),
        recognizeFn: async () => "مرحبا",
      }
    );
    assert.strictEqual(got, null);
  });

  await check("OCR وهمي يقرأ أرقام عربية هندية ١٠١٧١٩١٥", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const got = await readOrderNumberFromImage(
      "https://cdn.interakt.ai/media/sfc.jpg",
      {
        fetchImpl: async () => ({
          ok: true,
          headers: {
            get: (name) => (name === "content-type" ? "image/jpeg" : null),
          },
          arrayBuffer: async () => jpeg,
        }),
        recognizeFn: async () =>
          "تم تقديم الطلب بنجاح\nرقم الطلب ١٠١٧١٩١٥\n22651973.30",
      }
    );
    assert.strictEqual(got, "10171915");
  });

  await check("OCR وهمي يقرأ شاشة نجاح البوابة رقم طلبك الحالي", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const got = await readOrderNumberFromImage(
      "https://cdn.interakt.ai/media/success.jpg",
      {
        fetchImpl: async () => ({
          ok: true,
          headers: {
            get: (name) => (name === "content-type" ? "image/jpeg" : null),
          },
          arrayBuffer: async () => jpeg,
        }),
        recognizeFn: async () =>
          "تم تقديم الطلب بنجاح!\nتهانينا! أنت مؤهل للحصول على مبلغ ٢٢١,٤٦٢ ر.س بحد أقصى بناءً على رقم طلبك الحالي ١٠١٧١٩٩٢.",
      }
    );
    assert.strictEqual(got, "10171992");
  });

  await check("OCR يجرب العربية ثم الإنجليزية", () => {
    assert.deepStrictEqual(OCR_LANGS, ["ara+eng", "eng"]);
  });

  if (!process.exitCode) {
    console.log("\nكل اختبارات order-image نجحت");
  }
}

run();
