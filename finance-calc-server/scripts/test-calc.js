const {
  calculatePersonalFinance,
  parsePersonalFinanceMessage,
} = require("../lib/personal-finance");

const sample = `الراتب: 8000
الالتزامات: 1500
القطاع: مدني
العقاري: لا يوجد
الدعم: 0`;

const parsed = parsePersonalFinanceMessage(sample);
const result = calculatePersonalFinance(parsed);
console.log(JSON.stringify({ parsed, result }, null, 2));
