/**
 * ============================================================================
 * 🏫 新竹市立竹光國民中學 115學年度新生入學總量管制 LINE Bot 智慧小幫手
 * ============================================================================
 * 核心引擎：Google Apps Script (GAS) + Google Sheets 雲端資料庫 + LINE Messaging API
 * 承辦單位：教務處註冊組（諮詢專線：03-5246683 分機 613）
 * 
 * 核心架構：
 * 1. ⚡ Google 試算表 RAG 知識庫：註冊組隨時在 Google Sheet 修改問答，小幫手即時連線生效！
 * 2. 📋 7 大工作表資料庫結構：
 *    - 工作表 1：總量管制Q&A知識庫 (QA對照與觸發關鍵字)
 *    - 工作表 2：六大順位判定矩陣 (第1順位至最後順位審查規範)
 *    - 工作表 3：學區劃分與改分發學校 (單一學區 vs 共同學區對照)
 *    - 工作表 4：115學年度重要日程表 (3/14現場審查、放榜、線上報到)
 *    - 工作表 5：歷年設籍門檻數據 (111-114歷年第四順位設籍年份)
 *    - 工作表 6：家長在線提問紀錄簿 (自動記錄 #提問 或對話諮詢)
 *    - 工作表 7：待補充問題庫 (自動收集 AI 未精準命中的冷門特例問題)
 * 3. 🚀 一鍵初始化函式：執行 initQuotaKnowledgeBaseSheet() 一秒灌入全部資料與美化格式！
 * ============================================================================
 */

// ======================= 全域設定 =======================
const CONFIG = {
  LINE_ACCESS_TOKEN: 'YOUR_LINE_CHANNEL_ACCESS_TOKEN', // 於 LINE Developers Messaging API 取得
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',               // 於 Google AI Studio (aistudio.google.com) 取得
  GEMINI_MODEL: 'gemini-2.5-flash',
  
  SCHOOL_NAME: '新竹市立竹光國民中學',
  UNIT_NAME: '教務處註冊組',
  BOT_NAME: '竹光115總量管制小幫手',
  PHONE_INFO: '(03) 524-6683 分機 613',
  SCHOOL_ADDRESS: '新竹市北區和平路 1 號',
  OFFICIAL_URL: 'https://www.zgjh.hc.edu.tw',
  
  // 工作表名稱設定
  SHEET_QA: '總量管制Q&A知識庫',
  SHEET_MATRIX: '六大順位判定矩陣',
  SHEET_DISTRICT: '學區劃分與改分發學校',
  SHEET_SCHEDULE: '115學年度重要日程表',
  SHEET_HISTORY: '歷年設籍門檻數據',
  SHEET_INQUIRY: '家長在線提問紀錄簿',
  SHEET_UNANSWERED: '待補充問題庫'
};

// ======================= Webhook 進入點 =======================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }
    const json = JSON.parse(e.postData.contents);
    const events = json.events || [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.type === 'message' && event.message.type === 'text') {
        handleTextMessage(event);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('doPost error:', err);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('竹光國中 115學年度總量管制 - 智慧控制台')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 供前端 index.html 透過 google.script.run 取得試算表問答清單
function getKnowledgeBaseData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return [];
    const ws = ss.getSheetByName(CONFIG.SHEET_QA);
    if (!ws) return [];
    const data = ws.getDataRange().getValues();
    if (data.length <= 1) return [];
    const list = [];
    for (let i = 1; i < data.length; i++) {
      list.push({
        id: data[i][0],
        category: data[i][1],
        keywords: data[i][2],
        question: data[i][3],
        answer: data[i][4],
        note: data[i][5],
        status: data[i][6]
      });
    }
    return list;
  } catch (err) {
    console.error('getKnowledgeBaseData error:', err);
    return [];
  }
}

// ======================= 訊息處理核心 =======================
function handleTextMessage(event) {
  const replyToken = event.replyToken;
  const userText = (event.message.text || '').trim();
  const userId = event.source ? (event.source.userId || 'anonymous') : 'anonymous';

  // 1. 立即啟動 LINE 載入中動畫
  sendLoadingAnimation(userId);

  // 2. 檢查是否為「#提問」或「#留言」登記諮詢
  if (userText.startsWith('#提問') || userText.startsWith('#留言') || userText.startsWith('#諮詢')) {
    const inquiryContent = userText.replace(/^[#＃](提問|留言|諮詢)\s*/, '').trim();
    if (!inquiryContent) {
      replyLineMessage(replyToken, '您好！請於 #提問 後方輸入您想向註冊組諮詢的完整問題。\n例：#提問 請問外公的房子但尚未完成繼承過戶，算直系自有房屋嗎？');
      return;
    }
    const orderNo = logParentInquiry(userId, inquiryContent);
    const reply = `📝【已為您登錄家長在線諮詢】\n━━━━━━━━━━━━━━\n• 諮詢單號：${orderNo}\n• 提問內容：${inquiryContent}\n• 處理狀態：已送交註冊組查核中\n\n同仁將儘速為您查覆，或您亦可於上班時間致電註冊組：${CONFIG.PHONE_INFO} 洽詢！`;
    replyLineMessage(replyToken, reply);
    return;
  }

  // 3. 檢查是否為「#記住」或「#新增」指令 (直接寫入試算表知識庫)
  if (userText.startsWith('#記住') || userText.startsWith('#新增') || userText.startsWith('#記憶')) {
    const rememberReply = handleRememberCommand(userText, userId);
    replyLineMessage(replyToken, rememberReply);
    return;
  }

  // 3. 從 Google 試算表即時比對問答庫 (零快取 RAG)
  const sheetReply = findAnswerFromGoogleSheet(userText);
  if (sheetReply) {
    replyLineMessage(replyToken, sheetReply);
    return;
  }

  // 4. 若試算表未直接命中，呼叫 Gemini AI 進行語意問答
  let aiReply = '';
  if (CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
    aiReply = askGeminiWithSheetContext(userText);
  }

  // 5. 若仍無滿意回覆，回傳引導選單，並將問題記入「待補充問題庫」
  if (!aiReply) {
    logUnansweredQuestion(userText, userId);
    aiReply = getDefaultHelpMessage(userText);
  }

  replyLineMessage(replyToken, aiReply);
}

// ======================= Google 試算表即時查詢 =======================
// 讀取 Q&A 工作表 → 轉成 {keywords, question, answer, category, status} 陣列
function loadQaRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return [];
  const ws = ss.getSheetByName(CONFIG.SHEET_QA);
  if (!ws) return [];
  const data = ws.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][4]) continue;
    rows.push({
      id: data[i][0],
      category: String(data[i][1] || ''),
      keywords: String(data[i][2] || ''),
      question: String(data[i][3] || ''),
      answer: String(data[i][4] || ''),
      note: String(data[i][5] || ''),
      status: String(data[i][6] || 'Y')
    });
  }
  return rows;
}

// 試算表沒有資料（尚未初始化）時退回程式內建種子，避免 bot 完全失聲
function findAnswerFromGoogleSheet(query) {
  try {
    let rows = loadQaRows();
    if (rows.length === 0) rows = KB_SEED.qa;
    const hit = kbMatch(query, rows);
    return hit ? hit.answer : null;
  } catch (err) {
    console.error('findAnswerFromGoogleSheet error:', err);
    return null;
  }
}

// ======================= 共用比對引擎（由 build_site.py 從 kb_matcher.js 注入，勿手改） =======================
// __KB_MATCHER_START__
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

// __KB_MATCHER_END__

// ======================= #記住 指令：新增內容至試算表知識庫 =======================
function handleRememberCommand(rawText, userId) {
  try {
    const content = rawText.replace(/^[#＃](記住|新增|記憶)\s*/, '').trim();
    if (!content) {
      return `💡【#記住 指令格式說明】：\n您可以直接在 LINE 輸入：\n「#記住 [問題/關鍵字] [回答內容]」\n\n例如：\n#記住 雙胞胎同班申請 可以在3/14現場登記時於入學登記表勾選申請「同班」或「不同班」！\n\n系統將自動寫入 Google 試算表，隨後家長提問即可秒速獲得解答！`;
    }

    let question = '';
    let answer = '';

    if (content.includes('\n')) {
      const parts = content.split('\n');
      question = parts[0].trim();
      answer = parts.slice(1).join('\n').trim();
    } else {
      const spaceIdx = content.search(/[\s　]+/);
      if (spaceIdx > 0) {
        question = content.substring(0, spaceIdx).trim();
        answer = content.substring(spaceIdx).trim();
      } else {
        return `⚠️ 請以「空格」或「換行」分開問題與回答內容！\n例：#記住 制服去哪買 開學前可至合作社或特約門市購買。`;
      }
    }

    if (!question || !answer) {
      return `⚠️ 請確認已輸入「問題」與「回答內容」！\n格式：#記住 [問題] [回答]`;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return `⚠️ 找不到綁定的 Google 試算表，請確認 Apps Script 已綁定於 Google 試算表專案中！`;
    }

    let ws = ss.getSheetByName(CONFIG.SHEET_QA);
    if (!ws) {
      initQuotaKnowledgeBaseSheet();
      ws = ss.getSheetByName(CONFIG.SHEET_QA);
    }

    const lastRow = ws.getLastRow();
    const newId = lastRow >= 2 ? lastRow : 1;
    const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy/MM/dd HH:mm');

    const newRowData = [
      newId,
      'LINE前端新增',
      question,
      question,
      answer,
      `LINE前端新增 (${nowStr})`,
      'Y'
    ];

    ws.appendRow(newRowData);

    return `✅【已成功為您記住並寫入 Google 試算表！】\n━━━━━━━━━━━━━━\n• 題目關鍵字：${question}\n• 回覆內容：${answer}\n• 儲存位置：Google 試算表「${CONFIG.SHEET_QA}」第 ${lastRow + 1} 列\n\n💡 下次家長提問「${question}」時，小幫手將即時採用此內容回答！`;
  } catch (err) {
    console.error('handleRememberCommand error:', err);
    return `⚠️ 寫入失敗：${err.toString()}`;
  }
}

// ======================= 登記家長在線提問 =======================
function logParentInquiry(userId, content) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return 'Q' + Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMddHHmm');

    let ws = ss.getSheetByName(CONFIG.SHEET_INQUIRY);
    if (!ws) {
      ws = ss.insertSheet(CONFIG.SHEET_INQUIRY);
      ws.appendRow(['提問時間', '諮詢單號', '家長LINE識別碼', '學生畢業國小', '家長提問內容', '小幫手AI回覆摘要', '處理狀態', '承辦同仁備註']);
    }

    const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy/MM/dd HH:mm:ss');
    const orderNo = 'Q' + Utilities.formatDate(new Date(), 'GMT+8', 'MMddHHmmss');

    ws.appendRow([nowStr, orderNo, userId, '待填', content, '已轉交人工處理', '待查覆', '']);
    return orderNo;
  } catch (err) {
    console.error('logParentInquiry error:', err);
    return 'Q' + Utilities.formatDate(new Date(), 'GMT+8', 'MMddHHmmss');
  }
}

// ======================= 記錄待補充冷門提問 =======================
function logUnansweredQuestion(text, userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;

    let ws = ss.getSheetByName(CONFIG.SHEET_UNANSWERED);
    if (!ws) {
      ws = ss.insertSheet(CONFIG.SHEET_UNANSWERED);
      ws.appendRow(['收集時間', '家長原句提問', '觸發模式', '提問者辨識碼', '出現次數', '建議增修處室', '註冊組擬定官方答案', '納入知識庫狀態']);
    }

    const nowStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy/MM/dd HH:mm:ss');
    ws.appendRow([nowStr, text, 'LINE私訊', userId, 1, '教務處註冊組', '', '待評估']);
  } catch (err) {
    console.error('logUnansweredQuestion error:', err);
  }
}

// ======================= Gemini RAG 增強問答 =======================
function askGeminiWithSheetContext(query) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    
    // 從試算表撈取全部啟用中的 Q&A 作為 context（無資料時用內建種子）
    let rows = loadQaRows().filter(r => String(r.status).toUpperCase().trim() === 'Y');
    if (rows.length === 0) rows = KB_SEED.qa;
    const sheetSummary = rows.map(r => `問：${r.question}\n答：${r.answer}`).join('\n\n');

    const systemPrompt = `你是由${CONFIG.SCHOOL_NAME}教務處註冊組指派的「115學年度新生總量管制智慧諮詢小幫手」。
請一律使用台灣繁體中文、親切溫暖、條理分明回覆。
【法規核心】：
1. 115學年度核定招生 12 班。
2. 六大順位：
   - 第一順位：少年安置、低收入戶、父母雙亡、教職員隨同子女、市府安置特教生。
   - 第二順位：新竹市轄內國小畢業生＋自有權狀/115稅籍證明或法院公證租約(涵蓋115/3/14~9/1)＋家訪同意書。
   - 第三順位：外縣市國小畢業生＋自有權狀或法院公證租約＋家訪同意書。
   - 第四順位：本學區國小畢業生＋「未公證」房屋租賃契約(涵蓋115/3/14~9/1)＋家訪同意書。
   - 第五順位：本學區國小畢業生＋戶籍符合但無法提供居住證明（沒有權狀、沒有租約）＋家訪同意書。
   - 第六順位（最後順位）：無法簽家訪同意書，或經查為空戶/非實際居住者。
   - 戶籍內無直系尊親屬同戶者無法登記，連順位都沒有。
3. 排序：先比順位，同順位再比戶籍遷入學區時間先後。
4. 設籍累計：學區內搬家可連續累計；中途曾遷出學區以最後遷入日重算。
5. 共同學區：北門里(115新增，竹光/光華/建華)若欲同時登記另一所總量國中，須於3/12前申請。
6. 重要時程：3/14(六)現場登記、3/23(一)公布錄取、3/30-4/4線上報到、5/30(六)新生測驗。
7. 諮詢電話：${CONFIG.PHONE_INFO}。
只能依據以下知識庫回答；知識庫沒有的細節請家長改用「#提問」或致電註冊組，不要自行推測。

【試算表知識庫全文】：
${sheetSummary}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n家長諮詢問題：${query}\n請給出專屬回答：` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 600
      }
    };

    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const resJson = JSON.parse(response.getContentText());
    if (resJson.candidates && resJson.candidates[0].content.parts[0].text) {
      return resJson.candidates[0].content.parts[0].text.trim();
    }
    return '';
  } catch (err) {
    console.error('Gemini RAG error:', err);
    return '';
  }
}

// ======================= 預設提示訊息 =======================
function getDefaultHelpMessage(text) {
  return `您好！我是【竹光國中 115學年度總量管制智慧諮詢小幫手】🤖

您可直接輸入關鍵字提問：
• 順位總覽：總量管制有哪些順位？
• 順位試算：我有權狀算第幾順位？租約沒公證算第幾？沒有租約算第幾？
• 順位差別：第四跟第五順位差在哪？
• 門檻分析：設籍大約要滿幾年才排得上？
• 攜帶文件：3/14 (六) 新生現場登記要帶哪些證件？
• 學區查詢：北門里/新雅里19鄰算竹光學區嗎？
• 改分發：如果沒有錄取會改分發到哪所國中？
• 在線提問：請輸入「#提問 [問題內容]」，小幫手將為您立案送交註冊組查核！

📞 人工諮詢電話：竹光國中教務處註冊組 ${CONFIG.PHONE_INFO}`;
}

// ======================= LINE API 工具 =======================
function replyLineMessage(replyToken, messageText) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const payload = {
    replyToken: replyToken,
    messages: [{ type: 'text', text: messageText }]
  };

  UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + CONFIG.LINE_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function sendLoadingAnimation(chatId) {
  try {
    const url = 'https://api.line.me/v2/bot/chat/loading/start';
    UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.LINE_ACCESS_TOKEN
      },
      payload: JSON.stringify({ chatId: chatId, loadingSeconds: 5 }),
      muteHttpExceptions: true
    });
  } catch (e) {}
}

// ============================================================================
// 🚀 一鍵初始化 Google 試算表資料庫 (執行此函式即自動建立 7 大專業工作表)
// ============================================================================
function initQuotaKnowledgeBaseSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('請於 Google 試算表容器內的 Apps Script 執行此函式！');
    return;
  }

  const styleHeader = (ws, n) => {
    ws.getRange(1, 1, 1, n).setBackground('#047857').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
    ws.setFrozenRows(1);
  };

  // 1. Q&A 工作表：重灌官方種子，但保留同仁用「#記住」新增的列
  let ws1 = ss.getSheetByName(CONFIG.SHEET_QA);
  if (!ws1) ws1 = ss.insertSheet(CONFIG.SHEET_QA, 0);
  const kept = loadQaRows().filter(r => r.category === 'LINE前端新增');
  ws1.clear();
  ws1.getRange(1, 1, 1, 7).setValues([['編號', '主題分類', '觸發關鍵字 (逗號分隔；a+b=同時出現；-詞=排除)', '家長常見諮詢問題', '小幫手標準回覆內容 (支援LINE格式)', '法規與依據備註', '啟用狀態']]);
  styleHeader(ws1, 7);
  const qas = KB_SEED.qa.map(r => [r.id, r.category, r.keywords, r.question, r.answer, r.note, r.status]);
  kept.forEach((r, i) => qas.push([KB_SEED.qa.length + i + 1, r.category, r.keywords, r.question, r.answer, r.note, r.status]));
  ws1.getRange(2, 1, qas.length, 7).setValues(qas);

  // 2. 資料型工作表：整表重灌（矩陣、學區、日程、門檻）
  const dataSheets = [
    { name: CONFIG.SHEET_MATRIX, data: KB_SEED.matrix },
    { name: CONFIG.SHEET_DISTRICT, data: KB_SEED.district },
    { name: CONFIG.SHEET_SCHEDULE, data: KB_SEED.schedule },
    { name: CONFIG.SHEET_HISTORY, data: KB_SEED.history }
  ];
  dataSheets.forEach(cfg => {
    let ws = ss.getSheetByName(cfg.name);
    if (!ws) ws = ss.insertSheet(cfg.name);
    ws.clear();
    const n = cfg.data.headers.length;
    ws.getRange(1, 1, 1, n).setValues([cfg.data.headers]);
    styleHeader(ws, n);
    if (cfg.data.rows.length) ws.getRange(2, 1, cfg.data.rows.length, n).setValues(cfg.data.rows);
  });

  // 3. 紀錄型工作表：只補標題，不清既有紀錄
  const logSheets = [
    { name: CONFIG.SHEET_INQUIRY, headers: ['提問時間', '諮詢單號', '家長LINE識別碼', '學生畢業國小', '家長提問內容', '小幫手AI回覆摘要', '處理狀態', '承辦同仁備註'] },
    { name: CONFIG.SHEET_UNANSWERED, headers: ['收集時間', '家長原句提問', '觸發模式', '提問者辨識碼', '出現次數', '建議增修處室', '註冊組擬定官方答案', '納入知識庫狀態'] }
  ];
  logSheets.forEach(cfg => {
    let ws = ss.getSheetByName(cfg.name);
    if (!ws) ws = ss.insertSheet(cfg.name);
    if (ws.getLastRow() === 0) {
      ws.appendRow(cfg.headers);
      styleHeader(ws, cfg.headers.length);
    }
  });

  SpreadsheetApp.flush();
  Logger.log(`🎉 初始化完成：Q&A ${KB_SEED.qa.length} 題官方種子 + 保留 ${kept.length} 題 #記住 新增列。`);
}

// ======================= 內建知識庫種子（由 build_site.py 從 knowledge_base.json 注入，勿手改） =======================
// __KB_SEED_START__
const KB_SEED = {
  "qa": [
    {
      "id": 1,
      "category": "順位總覽",
      "keywords": "哪些順位,幾個順位,順位有哪些,所有順位,全部順位,順位總覽,六大順位,六個順位,順位介紹,順位說明,順位怎麼分,順位分幾,順位是什麼,什麼是順位,順位有幾,順位的定義,順位一覽,各順位,-一順位,-二順位,-三順位,-四順位,-五順位,-六順位,-1順位,-2順位,-3順位,-4順位,-5順位,-6順位",
      "question": "總量管制有哪些順位？六大順位分別是什麼？",
      "answer": "📚【115學年度竹光國中 錄取順位總覽】\n━━━━━━━━━━━━━━\n先決條件：學生設籍並實際居住學區內，且戶籍內至少有一位直系尊親屬（父母／祖父母／外祖父母）或法定監護人同戶。戶籍不符者連順位都沒有。\n\n• 第一順位：少年保護個案、列冊低收入戶子女、父母雙亡學童、本校編制內教職員工子女、市府鑑定安置之資源生\n• 第二順位：新竹市國小畢業生＋完整居住證明（自有權狀／115房屋稅籍證明，或法院公證租約）＋家訪同意書\n• 第三順位：外縣市國小畢業生＋完整居住證明＋家訪同意書\n• 第四順位：僅提供「未經法院公證」的租約（租期涵蓋 115/3/14～9/1）＋家訪同意書\n• 第五順位：戶籍符合但無法提供居住證明（或文件不符規定）＋家訪同意書\n• 第六順位（最後順位）：無法簽具家訪同意書，或經查為空戶／非實際居住者\n\n排序規則：先比順位，同順位再比戶籍遷入學區時間先後。\n想知道自己是第幾順位？直接輸入「我有權狀」「租約沒公證」「沒有租約」等描述即可試算！",
      "note": "作業規定伍、一～三；簡報「錄取順位」",
      "status": "Y"
    },
    {
      "id": 2,
      "category": "順位判定",
      "keywords": "一順位,第1順位,低收,低收入,教職員,老師的小孩,父母雙亡,安置,資源生,少年保護,特殊身分",
      "question": "第一順位是哪些人？教職員子女、低收入戶算第一順位嗎？",
      "answer": "🥇【第一順位：法定特殊身分】\n依 115 作業規定，下列身分且設籍本校學區者列為第一順位：\n1. 經縣市政府轉介安置之少年保護個案\n2. 設籍本市且居住學區內、經市府列冊之低收入戶子女\n3. 設籍本市且居住學區內而父母雙亡者\n4. 本校現職編制內教職員工之子女、受監護人（隨父母或監護人就讀所服務學校；名單公告後新聘者採外加名額）\n5. 經市府鑑定並安置之資源生\n※ 除教職員子女外，學校會實地訪查是否有居住事實。",
      "note": "作業規定伍、三、1；簡報「錄取順位」第一順位",
      "status": "Y"
    },
    {
      "id": 3,
      "category": "順位判定",
      "keywords": "自有,權狀,所有權狀,房屋稅,稅籍,自用住宅,自己的房子,二順位,第2順位,買房",
      "question": "我們在學區內有自用住宅（有房屋所有權狀），算第幾順位？",
      "answer": "🎯【判定結果：第二順位（本市國小）／第三順位（外縣市國小）】\n依 115 作業規定：設籍並實際居住本校學區內、戶籍與直系尊親屬同戶，檢附「登記於直系尊親屬或法定監護人名下」的房屋所有權狀（或 115 年度房屋稅籍證明），並簽具家訪同意書者：\n• 新竹市國小應屆畢業生 ➔【第二順位】\n• 外縣市國小應屆畢業生 ➔【第三順位】\n※ 自有住宅與公證租約在排序上完全相同，都是第二（或第三）順位。",
      "note": "作業規定伍、三、2 & 3；簡報 Q2-2",
      "status": "Y"
    },
    {
      "id": 4,
      "category": "順位判定",
      "keywords": "公證,法院公證,租賃公證,公證租約,有公證,已公證,-未公證,-沒公證,-沒有公證,-無公證,-不公證,-沒去公證,-還沒公證,-尚未公證,-未經公證",
      "question": "租屋若有辦理「法院公證租賃契約」，可以排第幾順位？",
      "answer": "⚖️【判定結果：第二順位（本市）／第三順位（外縣市）】\n租屋家庭若能提供「經法院公證之房屋租賃契約」（租賃期間須涵蓋 115/3/14 新生登記日至 115/9/1 開學日，承租人須為學生的直系尊親屬或法定監護人），並簽具家訪同意書：\n• 新竹市國小畢業生 ➔【第二順位】\n• 外縣市國小畢業生 ➔【第三順位】\n公證租約與自有權狀在排序上效力相同。",
      "note": "作業規定伍、三、2 & 3；Q&A Q8",
      "status": "Y"
    },
    {
      "id": 5,
      "category": "順位判定",
      "keywords": "未公證,沒公證,沒有公證,無公證,不公證,沒去公證,還沒公證,尚未公證,未經公證,一般租約,普通租約,四順位,第4順位,租約沒有公證,-沒有租約,-沒租約,-無租約,-沒有租賃",
      "question": "在學區內租屋但「租約沒有經過法院公證」，還可以登記嗎？排第幾順位？",
      "answer": "📋【判定結果：第四順位】\n依 115 作業規定：只要戶籍符合（設籍學區且與直系尊親屬同戶），就可以參加新生登記！\n若僅能提供「未經法院公證的房屋租賃契約」（租期須涵蓋 115/3/14～115/9/1，承租人為直系尊親屬），並簽具家訪同意書，列為【第四順位】。\n💡 提示：若能在 3/14 登記前補辦法院公證，即可提升為第二順位（外縣市國小為第三順位）。",
      "note": "作業規定伍、三、4；Q&A Q8；簡報「錄取順位(新增)」",
      "status": "Y"
    },
    {
      "id": 6,
      "category": "順位判定",
      "keywords": "五順位,第5順位,沒有租約,沒租約,無租約,沒有租賃,沒有簽約,沒簽約,口頭租,沒有租屋證明,沒有居住證明,無居住證明,沒有證明,沒證明,無證明,沒有文件,沒有權狀,無權狀,提不出,拿不出,住親戚家,住爺爺家,住阿公家,住外公家,住娘家,住公司宿舍,居住文件不符",
      "question": "我是租房子但沒有租約（或沒有任何居住證明），算第幾順位？",
      "answer": "📌【判定結果：第五順位】\n依 115 作業規定：只要戶籍符合（學生設籍學區，且戶籍內有直系尊親屬或法定監護人同戶），即使無法提供任何居住證明文件（沒有權狀、沒有租約），或提供的文件不符規定（例如承租人不是直系尊親屬、租期未涵蓋 3/14～9/1），只要簽具家訪同意書，仍可列為【第五順位】參加排序。\n\n💡 想提升順位：\n• 補一份「未公證」租約（租期涵蓋 115/3/14～9/1、承租人為直系尊親屬）➔ 第四順位\n• 租約再去法院公證 ➔ 第二順位（外縣市國小為第三順位）",
      "note": "作業規定伍、三、5；簡報 Q7「沒有居住證明文件會列為第四或五順位」",
      "status": "Y"
    },
    {
      "id": 7,
      "category": "順位判定",
      "keywords": "順位的差別,順位差別,順位有什麼不同,順位差異,順位不同,順位不一樣,差別+順位,差異+順位,不同+順位,四跟五,四和五,四與五,4跟5,4和5,四五順位,第四第五,二跟四,二和四,公證跟未公證,公證與未公證,公證和未公證",
      "question": "第四順位跟第五順位的差別是什麼？第二、第四、第五怎麼分？",
      "answer": "🔍【第二／第四／第五順位 差別一次看懂】\n三者戶籍條件都一樣（設籍學區＋直系尊親屬同戶＋簽家訪同意書），差別只在「居住證明文件」：\n\n• 第二順位（外縣市國小為第三）：有「完整」居住證明 ➔ 自有房屋所有權狀／115 房屋稅籍證明，或「經法院公證」的租約\n• 第四順位：只有「未經法院公證」的租約（租期涵蓋 115/3/14～9/1，承租人為直系尊親屬）\n• 第五順位：完全沒有居住證明（沒權狀、沒租約），或文件不符規定\n\n一句話：有公證租約＝第二、租約沒公證＝第四、連租約都沒有＝第五。\n同一順位內再依戶籍遷入學區時間先後排序。",
      "note": "作業規定伍、三、2～5；Q&A Q8",
      "status": "Y"
    },
    {
      "id": 8,
      "category": "順位判定",
      "keywords": "六順位,第6順位,最後順位,末順位,家訪同意書,不簽,拒簽,不同意家訪,空戶,人籍分離,沒有住,非實際居住,不是真的住,查核,實地訪查",
      "question": "第六順位（最後順位）是什麼情況？不簽家訪同意書會怎樣？",
      "answer": "⚠️【第六順位（最後順位）】\n依 115 作業規定，下列情形列為第六順位（最後順位）錄取：\n1. 符合入學資格，但無法簽具（或不同意）家訪同意書者\n2. 經學校訪查發現已遷居學區外、非實際居住或為「空戶」（人籍分離）者 ➔ 列第六順位並勸導轉入實際居住學區的學校\n\n※ 家訪同意書在黃單背面，請務必簽名；學校得視需求不定期查核居住事實。\n※ 若戶籍內沒有直系尊親屬同戶，則「無法參加新生登記」，連順位都沒有（這不是第六順位）。",
      "note": "作業規定伍、三、6 & 伍、五；簡報「最後順位」",
      "status": "Y"
    },
    {
      "id": 9,
      "category": "順位判定",
      "keywords": "怎麼排,怎麼排序,排序,先比,誰先,優先順序,先後順序,排序原則,排序規則,錄取標準,錄取原則,怎麼錄取,如何錄取,依據什麼",
      "question": "錄取排序原則是什麼？先比什麼？",
      "answer": "📐【錄取排序原則】\n1. 先比「順位」：第一順位全部排完，才輪到第二順位，依此類推。\n2. 同順位再比「戶籍遷入學區時間」：越早設籍越優先。\n3. 最後一名若有二人以上同日遷入：有兄姊就讀本校者優先；條件相同則公開抽籤。\n4. 最後一名若為多胞胎之一：其多胞胎手足以外加名額隨同就讀。\n5. 超出核定名額者依序列為備取。\n※ 共同學區與單一學區的排序基準完全一樣；自有住宅與公證租約也一樣（皆第二順位）。",
      "note": "作業規定伍、四；Q&A Q2；簡報「錄取標準」",
      "status": "Y"
    },
    {
      "id": 10,
      "category": "門檻分析",
      "keywords": "幾年,幾歲,門檻,排得上,排的上,排得到,排不排得,多久,歷年,往年,去年,大班,小二,小三,小五,設籍多久,設籍幾年,要住多久,錄取線",
      "question": "設籍大約要滿幾年才排得上竹光國中？",
      "answer": "📊【歷年第四順位設籍門檻參考】\n• 111學年：設籍滿 5 年（約國小二年級設籍）\n• 112學年：設籍滿 4 年（約國小三年級設籍）\n• 113學年：設籍滿 8 年（約幼兒園大班設籍）\n• 114學年：設籍滿 2 年（約國小五年級設籍）\n\n每年登記人數不同，無法事先保證；一切須待 3/14（六）現場登記後排序才能確定。先比順位、同順位再比設籍先後。",
      "note": "Q&A Q4；簡報 Q1",
      "status": "Y"
    },
    {
      "id": 11,
      "category": "設籍計算",
      "keywords": "累計,搬家,搬遷,學區內遷移,遷出,遷入,金雅里,重算,重新計算,設籍時間怎麼算,設籍日,從哪天算,怎麼算設籍,設籍怎麼算,曾經搬",
      "question": "之前在學區內搬家設籍時間可以累計嗎？中途遷出學區怎麼算？",
      "answer": "🏡【設籍時間計算原則】\n以「學生本人」戶籍遷入學區的時間起算：\n1. 學區內遷移 ➔ 可連續累計：同一學區內里鄰間搬遷（例如境福里 ➔ 民富里），設籍時間得以累計。\n2. 中途遷出學區 ➔ 重新起算：若曾遷出本校學區（例如遷到金雅里）再遷回，則以「最後一次遷入本學區的日期」為設籍日。\n※ 戶籍資料若提供「省略記事」版本，將視為登記當天才入籍，請務必提供含詳細記事的謄本或戶口名簿。",
      "note": "作業規定伍、二；Q&A Q3；簡報「設籍時間的計算」",
      "status": "Y"
    },
    {
      "id": 12,
      "category": "現場登記",
      "keywords": "3/14,314,帶什麼,要帶,攜帶,文件,證件,黃單,戶籍謄本,戶口名簿,謄本,登記當天,現場登記,幾點,要本人,本人到,委託,親友代",
      "question": "3/14（六）新生入學現場登記要帶哪些文件？一定要本人到場嗎？",
      "answer": "🎒【3/14（六）現場登記應備文件】\n時間：115年3月14日（六）上午 08:00–11:00\n地點：竹光國中\n\n1. 📄 新生入學通知單（黃單）：背面「入學登記表」與「家訪同意書」填妥並簽名\n2. 👥 戶籍資料（必要，二擇一）：\n   • 三個月內核發之戶籍謄本正本\n   • 新式戶口名簿正本＋影本（須含現住人口及詳細記事；正本驗畢歸還）\n3. 🏠 居住證明（非必要，但影響順位）：自有權狀／115 房屋稅籍證明／公證租約／未公證租約\n\n※ 可事先備妥資料委託親友到校送件，不一定要家長本人。\n※ 未參加登記者視同放棄入學資格！",
      "note": "簡報「新生入學登記」Q6/Q7/Q8",
      "status": "Y"
    },
    {
      "id": 13,
      "category": "戶籍規定",
      "keywords": "直系,寄居,戶籍不符,爸爸媽媽,爺爺奶奶,阿公阿嬤,外公外婆,監護人,同一戶,同戶,只有小孩,小孩自己,戶籍條件,戶籍要件,一定要戶籍,戶籍一定",
      "question": "學生戶籍內一定要有直系尊親屬同戶嗎？只有小孩設籍可以嗎？",
      "answer": "⚠️【戶籍必要條件】\n學生戶籍內「必須至少有一位直系尊親屬或法定監護人」同一戶籍：爸爸、媽媽、爺爺、奶奶、外公、外婆（或法定監護人）。\n若只有學生一人設籍，或寄居在非直系親屬（如叔叔、阿姨）戶內，則【無法參加新生登記，連順位都沒有】。請儘速辦理直系尊親屬遷入。\n※ 兩位以上非兄弟姊妹的新生設籍同一戶籍，學校會進行居住事實查核。",
      "note": "作業規定伍、一；Q&A Q7；簡報「入學資格-戶籍」",
      "status": "Y"
    },
    {
      "id": 14,
      "category": "學區查詢",
      "keywords": "學區,里鄰,哪些里,民富,磐石,北門,境福,新雅,客雅,南勢,中雅,文雅,長和,新民,算不算學區,是學區嗎,在學區內嗎,單一學區,共同學區",
      "question": "請問竹光國中的學區有哪些里別？北門里算學區嗎？",
      "answer": "🗺️【竹光國中 115學年度學區劃分】\n• 單一學區：民富里、磐石里（全里）、新雅里 1-18 及 20-27 鄰、南勢里 1-6 及 8-9 鄰\n• 共同學區：\n  - 北門里 1-5、7-10、12、13、16、17 鄰 ➔ 竹光／光華／建華（115 新增）\n  - 新雅里 19 鄰 ➔ 竹光／虎林\n  - 南勢里 10 鄰 ➔ 竹光／虎林／成德\n  - 客雅里 1-2 鄰 ➔ 竹光／成德；3-7 鄰 ➔ 竹光／虎林／成德\n  - 境福里 ➔ 竹光／光華\n  - 文雅里 ➔ 竹光／成德／光華\n  - 長和里、新民里 ➔ 竹光／育賢／光華\n  - 中雅里 1-11 鄰 ➔ 竹光／成德；12-16 鄰 ➔ 竹光／虎林／成德\n※ 共同學區與單一學區的排序標準完全一致。以教育處 115 學年度學區劃分表為準。",
      "note": "作業規定肆；簡報「學區範圍」",
      "status": "Y"
    },
    {
      "id": 15,
      "category": "共同學區",
      "keywords": "兩所登記,兩所都,兩校,雙重登記,同時登記,3/12,312,北門里雙登記,也登記光華,也登記建華,也登記虎林,另一所總量",
      "question": "北門里是共同學區，可以同時登記竹光國中跟光華國中嗎？",
      "answer": "⚖️【共同學區同時登記兩所總量管制國中】\n可以！若共同學區內包含另一所總量管制學校（如光華、建華），家長務必於【115年3月12日（四）前】自行向另一所總量國中提出登記申請；逾期將無法同時登記兩校。\n共同學區未獲錄取者，依家長意願改分發至該共同學區之他校。",
      "note": "簡報 Q9；作業規定伍、七",
      "status": "Y"
    },
    {
      "id": 16,
      "category": "改分發",
      "keywords": "沒錄取,未錄取,沒有錄取,落榜,沒上,改分發,轉分發,分發到哪,分到哪,去哪間,哪所國中,虎林,成德,育賢,建華,備取,候補",
      "question": "如果沒有被竹光國中錄取，後續會改分發到哪所學校？",
      "answer": "🏫【未錄取改分發規定】\n1. 單一學區學生：依家長意願改分發至「虎林、成德、光華、育賢、建華國中」（黃單背面入學登記表有轉分發勾選欄）。\n2. 共同學區學生：改分發至該共同學區之他校。\n\n時程：4/15（三）前備取遞補（電話通知）➔ 4/17（一）前本校函送改分發名冊 ➔ 4/20（一）前改分發國中寄送入學通知書 ➔ 5/3（六）一般學校新生報到。\n※ 超出名額者先列備取，有缺額依序遞補。",
      "note": "作業規定伍、六～七；簡報 Q3",
      "status": "Y"
    },
    {
      "id": 17,
      "category": "同日遷入",
      "keywords": "抽籤,雙胞胎,同日設籍,同一天,兄姊,哥哥姊姊在,多胞胎,外加名額",
      "question": "如果最後一名同日遷入如何排序？雙胞胎怎麼處理？",
      "answer": "👥【同日遷入與多胞胎規定】\n1. 最後一名若有二人以上同日遷入學區：以【有兄姊就讀本校者優先】；條件相同者採【公開抽籤】決定。\n2. 最後一名錄取學生若為多胞胎之一：其多胞胎手足【隨同該生以外加名額就讀本校】。",
      "note": "作業規定伍、四",
      "status": "Y"
    },
    {
      "id": 18,
      "category": "轉學規定",
      "keywords": "轉入,轉學,學期中,缺額,補實,出國,國外,保留學籍,休學,復學,中途",
      "question": "學期中可以轉學進竹光國中嗎？出國可以保留學籍嗎？",
      "answer": "🔄【轉出轉入規定】\n1. 總量限制學校學期中各年級「僅得轉出，不得轉入」（特殊理由經入學審查委員會或市府核准者除外）。\n2. 學生赴國外或大陸地區就學應辦理轉出，無法保留學籍。\n3. 學期中轉出產生的缺額，於【寒假及暑假】辦理補實作業，志願轉入學生按戶籍遷入居住時間先後公開分發。\n4. 中輟生學籍保留原校，得依規定復學。",
      "note": "作業規定陸",
      "status": "Y"
    },
    {
      "id": 19,
      "category": "重要時程",
      "keywords": "放榜,公布,公告錄取,錄取名單,線上報到,實體報到,報到,學力測驗,入學測驗,測驗,考試,重要日程,時程,什麼時候,哪一天,幾號,日期",
      "question": "錄取放榜日與新生報到日期是什麼時候？",
      "answer": "📅【115學年度重要時程】\n• 03/06（五）前：透過國小寄發新生入學通知單（黃單）\n• 03/12（四）前：共同學區欲同時登記另一所總量國中者提出申請\n• 03/14（六）08:00–11:00：新生入學現場登記（資格審核）⭐\n• 03/23（一）16:00：公布錄取名冊、候補名冊（註明順位）、未錄取名冊（校網首頁及警衛室）\n• 03/30（一）–04/04（六）：正取生線上報到\n• 04/07（二）–04/08（三）：未線上報到者至警衛室實體報到（擇一即可）\n• 04/15（三）前：缺額候補遞補（電話通知）\n• 04/17（一）前：函送改分發名冊；04/20（一）前改分發國中寄通知\n• 05/30（六）09:00–11:30：新生入學測驗（創意樓，當日發暑假作業）",
      "note": "作業規定柒；簡報「重要日程統整」",
      "status": "Y"
    },
    {
      "id": 20,
      "category": "基本資訊",
      "keywords": "幾班,班級數,招生人數,招幾,名額,地址,電話,分機,註冊組,聯絡,人工,真人,找誰問,總量管制是什麼,什麼是總量,總量管制的意思,為什麼要總量,為什麼總量,總量限制是",
      "question": "什麼是總量管制？今年招收幾班？註冊組電話與地址？",
      "answer": "ℹ️【竹光國中 115學年度總量管制基本資訊】\n• 什麼是總量管制：本校入學需求遠超過校舍容量，依市府核定實施「班級總量限制」，新生依順位與設籍時間排序錄取，額滿者改分發他校。\n• 核定招生：115學年度預計招收 12 班\n• 承辦單位：教務處註冊組\n• 諮詢專線：(03) 524-6683 分機 613\n• 學校地址：新竹市北區和平路 1 號\n• 官方網站：https://www.zgjh.hc.edu.tw",
      "note": "作業規定貳、參；Q&A Q4",
      "status": "Y"
    }
  ],
  "matrix": {
    "headers": [
      "順位代碼",
      "順位階層名稱",
      "適用身分資格",
      "戶籍條件要求",
      "居住證明文件要件",
      "家訪同意書",
      "同順位排序規則",
      "備註與特別說明"
    ],
    "rows": [
      [
        "第一順位",
        "法定特殊身分優先安置",
        "1.少年保護個案 2.列冊低收入戶子女 3.父母雙亡學童 4.本校編制內教職員工子女、受監護人 5.市府鑑定安置之資源生",
        "設籍本學區（教職員子女隨同就讀）",
        "經主管機關核定公文或列冊證明文件",
        "須配合家訪",
        "依特殊身分依序分發",
        "除教職員子女外，均會實地查訪居住事實；名單公告後新聘教職員子女得外加名額。"
      ],
      [
        "第二順位",
        "本市國小畢業生 × 完整居住證明",
        "新竹市轄內國民小學應屆畢業生",
        "設籍並實際居住學區內，至少一名直系尊親屬或法定監護人同戶",
        "自有：建物所有權狀 或 115年度房屋稅籍證明；租屋：法院公證租賃契約（涵蓋115/3/14~9/1，承租人為直系尊親屬）",
        "必須簽具",
        "依戶籍遷入學區時間先後排序",
        "權狀或租約承租人須為直系尊親屬（父、母、祖父母、外祖父母）或法定監護人名下。自有與公證租約排序效力相同。"
      ],
      [
        "第三順位",
        "外縣市國小畢業生 × 完整居住證明",
        "非本市（外縣市）國民小學應屆畢業生",
        "設籍並實際居住學區內，直系尊親屬同戶",
        "自有：建物所有權狀 或 115年度房屋稅籍證明；租屋：法院公證租賃契約（涵蓋115/3/14~9/1）",
        "必須簽具",
        "依戶籍遷入學區時間先後排序",
        "外縣市國小畢業返回學區就讀，只要居住證明符合即列第三順位。"
      ],
      [
        "第四順位",
        "戶籍符合 × 未公證租約",
        "設籍本學區之國民小學應屆畢業生（不分本市／外縣市）",
        "設籍並實際居住學區內，直系尊親屬同戶",
        "僅提供「未經法院公證之房屋租賃契約」（租期涵蓋115/3/14~115/9/1，承租人為直系尊親屬）",
        "必須簽具",
        "依戶籍遷入學區時間先後排序",
        "115 新增順位。租約補辦公證即可提升為第二（或第三）順位。"
      ],
      [
        "第五順位",
        "戶籍符合 × 無居住證明",
        "設籍本學區之國民小學應屆畢業生（不分本市／外縣市）",
        "設籍並實際居住學區內，直系尊親屬同戶",
        "無法提供居住證明文件（沒有權狀、沒有租約），或居住文件不符規定者",
        "必須簽具",
        "依戶籍遷入學區時間先後排序",
        "只要戶籍符合（有直系同戶）並簽家訪同意書，即便無任何居住證明仍列第五順位。"
      ],
      [
        "第六順位（最後順位）",
        "未簽家訪同意書 / 空戶",
        "符合入學資格但無法簽具家訪同意書者；或經查訪為已遷居學區外、非實際居住、空戶者",
        "設籍本學區",
        "不論有無",
        "無法簽具或拒簽",
        "列於最末順位錄取",
        "空戶或非實際居住者列第六順位並勸導轉入實際居住學區學校。※ 戶籍內無直系尊親屬同戶者無法登記，連順位都沒有。"
      ]
    ]
  },
  "district": {
    "headers": [
      "項次",
      "學區類別",
      "里別名稱",
      "涵蓋鄰別",
      "共同學區學校",
      "未獲錄取之改分發學校清單",
      "115學年度異動備註"
    ],
    "rows": [
      [
        1,
        "單一學區",
        "民富里",
        "全里",
        "無（竹光單一學區）",
        "依家長意願改分發：虎林、成德、光華、育賢、建華國中",
        "竹光核心單一學區"
      ],
      [
        2,
        "單一學區",
        "磐石里",
        "全里",
        "無（竹光單一學區）",
        "依家長意願改分發：虎林、成德、光華、育賢、建華國中",
        "竹光核心單一學區"
      ],
      [
        3,
        "單一學區",
        "新雅里",
        "1-18鄰、20-27鄰",
        "無（竹光單一學區）",
        "依家長意願改分發：虎林、成德、光華、育賢、建華國中",
        "19鄰除外"
      ],
      [
        4,
        "單一學區",
        "南勢里",
        "1-6鄰、8-9鄰",
        "無（竹光單一學區）",
        "依家長意願改分發：虎林、成德、光華、育賢、建華國中",
        "作業規定肆、四"
      ],
      [
        5,
        "共同學區",
        "南勢里",
        "10鄰",
        "竹光、虎林、成德",
        "依家長意願改分發至虎林國中或成德高中(國中部)",
        "共同學區"
      ],
      [
        6,
        "共同學區",
        "北門里",
        "1-5、7-10、12、13、16、17鄰",
        "竹光、光華、建華",
        "依家長意願改分發至光華或建華國中",
        "115學年度新增共同學區！"
      ],
      [
        7,
        "共同學區",
        "新雅里",
        "19鄰",
        "竹光、虎林",
        "改分發至虎林國中",
        "共同學區"
      ],
      [
        8,
        "共同學區",
        "客雅里",
        "1-2鄰",
        "竹光、成德",
        "改分發至成德高中(國中部)",
        "共同學區"
      ],
      [
        9,
        "共同學區",
        "客雅里",
        "3-7鄰",
        "竹光、虎林、成德",
        "依家長意願改分發至虎林或成德",
        "共同學區"
      ],
      [
        10,
        "共同學區",
        "境福里",
        "全里",
        "竹光、光華",
        "改分發至光華國中",
        "共同學區"
      ],
      [
        11,
        "共同學區",
        "文雅里",
        "全里",
        "竹光、成德、光華",
        "依家長意願改分發至成德或光華國中",
        "共同學區"
      ],
      [
        12,
        "共同學區",
        "長和里",
        "全里",
        "竹光、育賢、光華",
        "依家長意願改分發至育賢或光華國中",
        "共同學區"
      ],
      [
        13,
        "共同學區",
        "新民里",
        "全里",
        "竹光、育賢、光華",
        "依家長意願改分發至育賢或光華國中",
        "共同學區"
      ],
      [
        14,
        "共同學區",
        "中雅里",
        "1-11鄰",
        "竹光、成德",
        "改分發至成德高中(國中部)",
        "共同學區"
      ],
      [
        15,
        "共同學區",
        "中雅里",
        "12-16鄰",
        "竹光、虎林、成德",
        "依家長意願改分發至虎林或成德",
        "共同學區"
      ]
    ]
  },
  "schedule": {
    "headers": [
      "項次",
      "作業項目",
      "法定/實施時程",
      "地點/管道",
      "主辦與承辦單位",
      "重要作業要點與家長須知"
    ],
    "rows": [
      [
        1,
        "社區宣導",
        "自市府核定總量限制日起",
        "校網公告/公文",
        "教務處註冊組",
        "公告作業規定、學區劃分表與宣導資料。"
      ],
      [
        2,
        "成立入學作業委員會",
        "114.12.31 前",
        "本校會議室",
        "校長室/教務處",
        "成立新生入學作業委員會，審議作業計畫。"
      ],
      [
        3,
        "新生入學作業說明會",
        "115.02.26 (四)",
        "竹光國中",
        "教務處註冊組",
        "向國小端與學區家長說明總量管制與審查要點。"
      ],
      [
        4,
        "國小確認升學狀況",
        "115.02.26 (四) 前",
        "學籍系統線上",
        "各學區國小端",
        "各國小於學籍系統上確認畢業生就讀國中意向。"
      ],
      [
        5,
        "寄發新生通知單(黃單)",
        "115.03.06 (五) 前",
        "各國小轉發",
        "各國小 / 竹光國中",
        "黃單正面：入學資格通知單＋作業規定；背面：入學登記表＋家訪同意書。"
      ],
      [
        6,
        "共同學區雙總量申請",
        "115.03.12 (四) 前",
        "另一所總量國中",
        "家長自行辦理",
        "共同學區欲同時登記另一所總量國中，家長須於 3/12 前提出申請。"
      ],
      [
        7,
        "辦理新生現場登記審核 ⭐",
        "115.03.14 (六) 08:00-11:00",
        "竹光國中",
        "教務處註冊組審查小組",
        "攜帶黃單、戶籍謄本或戶口名簿正影本、居住證明。未登記者視同放棄！"
      ],
      [
        8,
        "呈報入學作業委員會核定",
        "115.03.20 (五)",
        "本校會議室",
        "入學作業委員會",
        "彙整資格審查與居住事實訪查結果，完成排序核定。"
      ],
      [
        9,
        "公布新生錄取結果 ⭐",
        "115.03.23 (一) 16:00",
        "學校首頁及警衛室",
        "教務處註冊組",
        "公布錄取名冊、候補名冊（註明順位）與未錄取名冊（註明改分發學校）。"
      ],
      [
        10,
        "正取生線上報到 ⭐",
        "115.03.30 (一) - 04.04 (六)",
        "新竹市新生報到系統",
        "新生家長",
        "線上報到或實體報到擇一即可。"
      ],
      [
        11,
        "正取生實體報到",
        "115.04.07 (二) - 04.08 (三)",
        "竹光國中警衛室",
        "新生家長 / 警衛室",
        "未於線上報到者，至警衛室填寫實體報到資料。未報到視同放棄。"
      ],
      [
        12,
        "未報到學生訪視勸導",
        "115.04.10 (五) 前",
        "電訪/家訪",
        "註冊組",
        "針對未報到之正取生進行追蹤確認。"
      ],
      [
        13,
        "缺額候補遞補作業",
        "115.04.15 (三) 前",
        "電話個別通知",
        "教務處註冊組",
        "依候補名冊序位電話通知備取生到校辦理遞補報到。"
      ],
      [
        14,
        "函送改分發名冊",
        "115.04.17 (一) 前",
        "公文系統函送",
        "教務處註冊組",
        "將未錄取學生名冊依家長志願函送至各改分發國中。"
      ],
      [
        15,
        "改分發國中寄發通知",
        "115.04.20 (一) 前",
        "郵寄入學通知書",
        "各改分發國中端",
        "由改分發國中寄送新生入學通知書。"
      ],
      [
        16,
        "一般學校新生報到",
        "115.05.03 (六)",
        "各改分發國中",
        "各改分發學校",
        "本校正取生已於 4/8 前完成報到。"
      ],
      [
        17,
        "新生入學測驗 ⭐",
        "115.05.30 (六) 09:00-11:30",
        "竹光國中創意樓",
        "教務處",
        "當日發放暑假作業與營隊通知；考場當日公告。"
      ]
    ]
  },
  "history": {
    "headers": [
      "學年度",
      "核定班級數",
      "最低錄取順位",
      "第四順位設籍年限門檻",
      "約當設籍就讀年級",
      "錄取情況說明"
    ],
    "rows": [
      [
        "111 學年度",
        "12 班",
        "第四順位",
        "設籍滿 5 年",
        "約國小二年級設籍",
        "111學年錄取至第四順位，最後一名遷入時間為入學前5年。"
      ],
      [
        "112 學年度",
        "12 班",
        "第四順位",
        "設籍滿 4 年",
        "約國小三年級設籍",
        "112學年第四順位設籍滿4年者錄取。"
      ],
      [
        "113 學年度",
        "12 班",
        "第四順位",
        "設籍滿 8 年",
        "約幼兒園大班設籍",
        "113學年學區適齡人口高峰，第四順位設籍門檻達8年。"
      ],
      [
        "114 學年度",
        "12 班",
        "第四順位",
        "設籍滿 2 年",
        "約國小五年級設籍",
        "114學年第四順位設籍滿2年即錄取。"
      ],
      [
        "115 學年度",
        "12 班（預計）",
        "待 3/14 登記後核定",
        "待審核排序公開",
        "視 3/14 實際登記人數",
        "115學年新增北門里共同學區；實際門檻待 3/23 放榜公告。"
      ]
    ]
  }
};
// __KB_SEED_END__
