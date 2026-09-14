// node test_simulator.js — 從 index.html 抽出模擬器邏輯，確認與 Code.gs 同一套引擎且回覆格式正確
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const s = html.indexOf('    // 共用比對引擎與知識庫');
const e = html.indexOf('    function showToast(msg)');
const m = { exports: {} };
new Function('module', 'const dynamicMemory=[];\n' + html.slice(s, e) + '\nmodule.exports={generateSmartAnswer};')(m);
const g = m.exports.generateSmartAnswer;

const qs = ['我是租房子，但沒有租約，算第幾順位?', '#記住 制服去哪買 開學前至合作社購買', '制服去哪買', '嗨'];
let fail = 0;
for (const q of qs) {
  const a = g(q);
  const ok = a && !a.includes('━') && !a.includes('【');
  if (!ok) fail++;
  console.log((ok ? '✅ ' : '❌ ') + q + '\n' + a + '\n');
}
process.exit(fail ? 1 : 0);
