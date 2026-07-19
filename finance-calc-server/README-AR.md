# حاسبة التمويل + Interakt (جهاز البيت)

هذه الخدمة تستخدم **نفس حسبة البوت القديم** وترد على العميل عبر Interakt تلقائيًا.

## المطلوب على جهاز عبدالرحمن (ويندوز)

1. تثبيت [Node.js LTS](https://nodejs.org/)
2. نسخ مجلد `finance-calc-server` للجهاز
3. إنشاء ملف `.env` من `.env.example`
4. وضع مفتاح Interakt:
   - افتح: https://app.interakt.ai/settings/developer-setting
   - انسخ **Secret Key**
   - ضعه في `.env` عند `INTERAKT_API_KEY=`
5. تشغيل:
   - دبل كليك على `start-calc.bat`
   - أو: `npm install` ثم `npm start`

## فتح الجهاز على الإنترنت (مهم)

لأن الجهاز في البيت، Interakt ما يوصل له مباشرة إلا عبر نفق:

### الأسهل: Cloudflare Tunnel
1. ثبت `cloudflared` على الجهاز
2. شغّل:
```bat
cloudflared tunnel --url http://127.0.0.1:5055
```
3. انسخ الرابط اللي يطلع (مثل `https://xxxx.trycloudflare.com`)

## ربط Webhook في Interakt

1. Settings → Developer Settings
2. فعّل Webhook لرسائل العملاء الواردة
3. Webhook URL:
```
https://XXXX.trycloudflare.com/webhook/interakt
```
4. احفظ

## كيف يستخدمها العميل

بعد ما يختار تمويل شخصي، يرسل بهذا الشكل:

```
الراتب: 8000
الالتزامات: 1500
القطاع: مدني
العقاري: لا يوجد
الدعم: 0
```

السيرفر يحسب ويرد تلقائي بقيمة التمويل والقسط.

## اختبار محلي بدون واتساب

```bat
npm run test:calc
```

أو:

```bat
curl -X POST http://127.0.0.1:5055/calculate/personal -H "Content-Type: application/json" -d "{\"message\":\"الراتب: 8000\\nالالتزامات: 1500\\nالقطاع: مدني\\nالعقاري: لا يوجد\\nالدعم: 0\"}"
```

## ملاحظات

- لا تشغّل البوت غير الرسمي على رقم `0488` بنفس الوقت مع Interakt.
- الجهاز لازم يبقى فاتح + النفق شغّال.
- أول نسخة تدعم **التمويل الشخصي**. شراء المديونية/إيقاف الخدمات نضيفها بعد التجربة.
