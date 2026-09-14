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
  return ContentService.createTextOutput('竹光國中 115學年度新生入學總量管制 LINE Bot 服務正常運作中！');
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
function findAnswerFromGoogleSheet(query) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return null;
    
    const ws = ss.getSheetByName(CONFIG.SHEET_QA);
    if (!ws) return null;

    const data = ws.getDataRange().getValues();
    if (data.length <= 1) return null;

    const q = query.toLowerCase();

    // 比對關鍵字 (Column 2: keywords) 與 問題 (Column 3: question)
    for (let i = 1; i < data.length; i++) {
      const isEnabled = String(data[i][6] || 'Y').toUpperCase().trim();
      if (isEnabled !== 'Y') continue;

      const keywords = String(data[i][2] || '').toLowerCase().split(',');
      const question = String(data[i][3] || '').toLowerCase();
      const answer = data[i][4];

      // 若使用者輸入包含完整題目或任一關鍵字
      if (q.includes(question) || question.includes(q)) {
        return answer;
      }

      for (let k = 0; k < keywords.length; k++) {
        const kw = keywords[k].trim();
        if (kw && q.includes(kw)) {
          return answer;
        }
      }
    }
    return null;
  } catch (err) {
    console.error('findAnswerFromGoogleSheet error:', err);
    return null;
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
    
    // 從試算表中撈取最新順位與學區資訊作為 context
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetSummary = '';
    if (ss) {
      const qaSheet = ss.getSheetByName(CONFIG.SHEET_QA);
      if (qaSheet) {
        const rows = qaSheet.getDataRange().getValues();
        sheetSummary = rows.slice(1, 10).map(r => `問：${r[3]}\n答：${r[4]}`).join('\n\n');
      }
    }

    const systemPrompt = `你是由${CONFIG.SCHOOL_NAME}教務處註冊組指派的「115學年度新生總量管制智慧諮詢小幫手」。
請一律使用台灣繁體中文、親切溫暖、條理分明回覆。
【法規核心】：
1. 115學年度核定招生 12 班。
2. 六大順位：
   - 第一順位：少年安置、低收入戶、父母雙亡、教職員隨同子女、市府安置特教生。
   - 第二順位：新竹市轄內國小畢業生＋自有權狀/115稅籍證明或法院公證租約(涵蓋115/3/14~9/1)＋家訪同意書。
   - 第三順位：外縣市國小畢業生＋自有權狀或法院公證租約＋家訪同意書。
   - 第四順位：本學區國小畢業生＋「未公證」房屋租賃契約(涵蓋115/3/14~9/1)＋家訪同意書。
   - 第五順位：本學區國小畢業生＋無法提供居住證明＋家訪同意書。
   - 第六順位：無法簽家訪同意書或經查為空戶/非實際居住者。
3. 設籍累計：學區內搬家可連續累計；中途曾遷出學區以最後遷入日重算。
4. 共同學區：北門里(115新增)、新雅里19鄰若欲登記他校總量國中，須於3/12前申請。
5. 重要時程：3/14(六)現場登記、3/23(一)公布錄取、3/30-4/4線上報到、5/30(六)新生測驗。
6. 諮詢電話：${CONFIG.PHONE_INFO}。

【試算表知識庫參考片段】：
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
• 順位試算：我有房屋所有權狀算第幾順位？租屋未公證算第幾順位？
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

  // 1. 初始化 Q&A 工作表
  let ws1 = ss.getSheetByName(CONFIG.SHEET_QA);
  if (!ws1) ws1 = ss.insertSheet(CONFIG.SHEET_QA, 0);
  ws1.clear();
  ws1.getRange(1, 1, 1, 7).setValues([['編號', '主題分類', '觸發關鍵字 (逗號分隔)', '家長常見諮詢問題', '小幫手標準回覆內容 (支援LINE格式)', '法規與依據備註', '啟用狀態']]);
  ws1.getRange(1, 1, 1, 7).setBackground('#047857').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
  
  const qas = [
    [1, '順位判定', '自有,權狀,房屋稅,二順位,自用住宅', '我們在學區內有自用住宅，小孩是民富國小畢業，算第幾順位？', '🎯【判定結果：第二順位】\n依 115 作業規定：設籍並實際居住本校學區內之「新竹市」國小畢業生，且戶籍與直系親屬同戶，檢附自有房屋所有權狀（或當年度房屋稅籍證明）並簽具家訪同意書者，列為【第二順位】！', '作業規定伍、三、2', 'Y'],
    [2, '順位判定', '未公證,租約,四順位,沒公證,租屋未公證', '在學區內租屋但「沒有經過法院公證」，還可以登記嗎？排第幾順位？', '📋【判定結果：第四順位】\n依 115 作業規定：只要戶籍符合（與直系親屬同戶），即可參加新生登記！若僅提供「未經法院公證之房屋租賃契約」（租期須涵蓋 115/3/14~115/9/1，承租人為直系尊親屬）並簽具家訪同意書者，列為【第四順位】！', '作業規定伍、三、4', 'Y'],
    [3, '門檻分析', '幾年,幾歲,門檻,排得上嗎,大班,小二,歷史數據', '設籍大約要滿幾年才排得上竹光國中？', '📊【歷年第四順位設籍門檻參考】：\n• 111學年：設籍滿 5 年 (約國小二年級設籍)\n• 112學年：設籍滿 4 年 (約國小三年級設籍)\n• 113學年：設籍滿 8 年 (約幼兒園大班設籍)\n• 114學年：設籍滿 2 年 (約國小五年級設籍)\n每年人數不同，需待 3/14 現場登記排序後方能確定。先比順位，同順位再比設籍先後決定！', '新生簡報 P.27', 'Y'],
    [4, '設籍計算', '累計,搬家,學區內遷移,遷出,金雅里,重算', '之前在學區內搬家設籍時間可以累計嗎？中途遷出新竹市怎麼算？', '🏡【設籍時間計算原則】：\n1. 【學區內遷移 ➔ 時間可連續累計】：同一學區內搬遷（如境福里遷到磐石里），設籍時間得以累計！\n2. 【中途遷出學區 ➔ 重新起算】：若中途曾遷出學區（如遷至金雅里），再遷回竹光學區，則以最後一次遷入學區之日期為設籍日！', '作業規定伍、二', 'Y'],
    [5, '現場登記', '3/14,帶什麼,文件,證件,黃單,戶籍謄本,戶口名簿', '3/14 (六) 新生入學現場登記要帶哪些文件？一定要本人到場嗎？', '🎒【3/14 (六) 現場審核應備文件清單】：\n時間：115年3月14日(六) 上午 08:00 - 11:00\n地點：竹光國中\n應備文件：\n1. 📄 新生入學通知單（黃單，背面填妥簽名）\n2. 👥 戶籍證明（二擇一）：3個月內全戶謄本正本 或 新式戶口名簿正本＋影本\n3. 🏠 居住證明（自有權狀 / 稅籍證明 / 公證租約 / 未公證租約）\n※ 可委託親友到校送件。未參加登記者視同放棄！', '新生簡報 P.21', 'Y'],
    [6, '共同學區', '兩所登記,光華,雙重登記,3/12,北門里雙登記', '北門里是共同學區，如果想同時登記竹光國中跟光華國中可以嗎？', '⚖️【共同學區雙總量國中登記手續】：\n可以！但家長務必於【115年3月12日(四)前】，自行向另一所總量限制國中（如光華國中）提出登記申請手續！逾期將無法同時登記兩校。', '新生簡報 P.37', 'Y'],
    [7, '改分發', '沒錄取,未錄取,落榜,改分發學校,虎林,成德,光華,育賢,建華', '如果沒有被竹光國中錄取，後續會改分發到哪所學校？', '🏫【未錄取改分發規定】：\n1. 【單一學區學生】：依家長意願改分發至「虎林、成德、光華、育賢、建華國中」。（黃單背面有勾選欄）\n2. 【共同學區學生】：改分發至該共同學區之他校。\n本校將於 4/17 前統一函送名冊，改分發國中將於 4/20 前寄送入學通知書。', '作業規定伍、七', 'Y']
  ];
  ws1.getRange(2, 1, qas.length, 7).setValues(qas);
  ws1.setFrozenRows(1);

  // 2. 初始化其他工作表 (矩陣、學區、日程、門檻、留言、未解)
  const sheetsConfig = [
    { name: CONFIG.SHEET_MATRIX, headers: ['順位代碼', '順位階層名稱', '適用身分資格', '戶籍條件要求', '居住證明文件要件', '家訪同意書', '同順位排序規則', '備註說明'] },
    { name: CONFIG.SHEET_DISTRICT, headers: ['項次', '學區類別', '里別名稱', '涵蓋鄰別', '共同學區學校', '未獲錄取之改分發學校清單', '115學年度異動備註'] },
    { name: CONFIG.SHEET_SCHEDULE, headers: ['項次', '作業項目', '法定/實施時程', '地點/管道', '主辦與承辦單位', '重要作業要點與家長須知'] },
    { name: CONFIG.SHEET_HISTORY, headers: ['學年度', '核定班級數', '最低錄取順位', '第四順位設籍年限門檻', '約當設籍就讀年級', '錄取情況與大數據分析說明'] },
    { name: CONFIG.SHEET_INQUIRY, headers: ['提問時間', '諮詢單號', '家長LINE識別碼', '學生畢業國小', '家長提問內容', '小幫手AI回覆摘要', '處理狀態', '承辦同仁備註'] },
    { name: CONFIG.SHEET_UNANSWERED, headers: ['收集時間', '家長原句提問', '觸發模式', '提問者辨識碼', '出現次數', '建議增修處室', '註冊組擬定官方答案', '納入知識庫狀態'] }
  ];

  sheetsConfig.forEach(cfg => {
    let ws = ss.getSheetByName(cfg.name);
    if (!ws) ws = ss.insertSheet(cfg.name);
    if (ws.getLastRow() === 0) {
      ws.appendRow(cfg.headers);
      ws.getRange(1, 1, 1, cfg.headers.length).setBackground('#047857').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
      ws.setFrozenRows(1);
    }
  });

  SpreadsheetApp.flush();
  Logger.log('🎉 恭喜！竹光國中 115 總量管制 Google 試算表資料庫已全部初始化完成！');
}
