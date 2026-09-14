/**
 * 共用知識庫比對引擎（GAS 後端與網頁模擬器共用同一份，由 build_site.py 注入）
 *
 * 關鍵字欄語法（逗號分隔）：
 *   詞        ：查詢句包含即得分（分數 = 詞長，越長越專屬）
 *   詞A+詞B   ：兩詞都出現才得分
 *   -詞       ：查詢句出現此詞則整列排除
 * 規則：分數最高者勝；同分取較前列；完全沒命中但問到「順位」→ 回「順位總覽」列。
 */
function kbNormalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s　,，。、？?！!「」『』（）()【】\[\]:：;；'"‘’“”.\-\/～~]/g, '');
}

function kbScoreRow(q, row) {
  if (String(row.status == null ? 'Y' : row.status).toUpperCase().trim() !== 'Y') return -1;
  var tokens = String(row.keywords || '').split(/[,，]/);
  var score = 0;
  for (var i = 0; i < tokens.length; i++) {
    var raw = tokens[i].trim();
    if (!raw) continue;
    if (raw.charAt(0) === '-') {
      var ex = kbNormalize(raw.substring(1));
      if (ex && q.indexOf(ex) !== -1) return -1;
      continue;
    }
    if (raw.indexOf('+') !== -1) {
      var parts = raw.split('+').map(kbNormalize).filter(function (p) { return p; });
      var all = parts.length > 0;
      for (var j = 0; j < parts.length; j++) if (q.indexOf(parts[j]) === -1) { all = false; break; }
      if (all) for (var k = 0; k < parts.length; k++) score += parts[k].length;
      continue;
    }
    var kw = kbNormalize(raw);
    if (kw && q.indexOf(kw) !== -1) score += kw.length;
  }
  var question = kbNormalize(row.question);
  // 整句題目互相包含才加分；題目太短（#記住 的單一關鍵字）不加，避免蓋過官方列
  if (question.length >= 6 && q.length >= 5 && (q.indexOf(question) !== -1 || question.indexOf(q) !== -1)) score += 10;
  return score;
}

/**
 * rows: [{ keywords, question, answer, category, status }]
 * 回傳最佳 row 或 null
 */
function kbMatch(query, rows) {
  var q = kbNormalize(query);
  if (!q) return null;
  var best = null, bestScore = 0;
  for (var i = 0; i < rows.length; i++) {
    var s = kbScoreRow(q, rows[i]);
    if (s > bestScore) { bestScore = s; best = rows[i]; }
  }
  if (best) return best;
  if (q.indexOf('順位') !== -1) {
    for (var r = 0; r < rows.length; r++) {
      if (rows[r].category === '順位總覽' && String(rows[r].status || 'Y').toUpperCase() === 'Y') return rows[r];
    }
  }
  return null;
}

if (typeof module !== 'undefined') module.exports = { kbNormalize: kbNormalize, kbScoreRow: kbScoreRow, kbMatch: kbMatch };
