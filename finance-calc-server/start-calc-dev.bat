@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

echo.
echo ========================================
echo  كوبري الحاسبة — وضع التطوير المحلي
echo  أي تعديل على الملفات = إعادة تشغيل تلقائي
echo  لوحة التحكم: http://127.0.0.1:5055/admin
echo ========================================
echo.
echo ملاحظة: لاختبار واتساب من الجوال بدون Render:
echo   cloudflared tunnel --url http://127.0.0.1:5055
echo   ثم ضع رابط النفق في Webhook عند Interakt
echo.

call npm run dev
pause
