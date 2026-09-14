/**
 * 新竹市立竹光國中 115學年度新生入學總量管制 LINE Bot 智慧諮詢小幫手
 * 核心引擎：Google Apps Script (GAS) + Gemini 2.5 Flash RAG + LINE Messaging API
 * 適用單位：教務處註冊組（電話：03-5246683 #613）
 * 依據法規：新竹市立國民中小學班級總量限制學校學生入學實施要點、竹光國中115學年度入學作業規定
 */

// ======================= 全域設定 =======================
const CONFIG = {
  LINE_ACCESS_TOKEN: 'YOUR_LINE_CHANNEL_ACCESS_TOKEN', // 於 LINE Developers 後台 Messaging API 取得
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',               // 於 Google AI Studio (aistudio.google.com) 取得
  GEMINI_MODEL: 'gemini-2.5-flash',
  SCHOOL_NAME: '新竹市立竹光國民中學',
  OFFICE_INFO: '教務處註冊組 (分機 613 / 專線 03-5246683)',
  APPROVED_CLASSES: '12班',
  REGISTRATION_DATE: '115年3月14日(六) 上午 08:00 - 11:00',
  RESULT_ANNOUNCE_DATE: '115年3月23日(一) 16:00',
  ONLINE_CHECKIN_DATE: '115年3月30日(一) 至 4月4日(六)',
  PHYSICAL_CHECKIN_DATE: '115年4月7日(二) 至 4月8日(三) 於警衛室',
  TEST_DATE: '115年5月30日(六) 09:00 - 11:30'
};

// ======================= Webhook 進入點 =======================
function doPost(e) {
  try {
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
  return ContentService.createTextOutput('竹光國中 115學年度總量管制 LINE Bot Webhook 服務正常運作中！');
}

// ======================= 訊息處理核心 =======================
function handleTextMessage(event) {
  const replyToken = event.replyToken;
  const userText = (event.message.text || '').trim();
  const userId = event.source ? event.source.userId : null;

  // 1. 發送 LINE 載入中（輸入中）動畫
  if (userId) {
    sendLoadingAnimation(userId);
  }

  // 2. 先透過精準關鍵字與規則庫比對（秒回，不耗 API）
  const fastReply = matchRuleBasedReply(userText);
  if (fastReply) {
    replyLineMessage(replyToken, fastReply);
    return;
  }

  // 3. 若無規則命中，調用 Gemini AI 根據總量管制知識庫回答
  let aiReply = '';
  if (CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
    aiReply = askGeminiRag(userText);
  }

  if (!aiReply) {
    aiReply = getDefaultHelpMessage(userText);
  }

  replyLineMessage(replyToken, aiReply);
}

// ======================= 規則引擎（總量管制知識庫） =======================
function matchRuleBasedReply(text) {
  const t = text.toLowerCase();

  // 1. 順位查詢 / 資格審查
  if (t.includes('順位') || t.includes('資格') || t.includes('第幾順位') || t.includes('排得上')) {
    if (t.includes('未公證') || t.includes('沒有公證')) {
      return `📋【115學年度 錄取順位判定：第四順位】\n━━━━━━━━━━━━━━\n依竹光國中 115 作業規定：\n• 設籍並實際居住本學區國小畢業生。\n• 僅提供「未經法院公證之租賃契約」（租期須涵蓋 115/3/14 至 115/9/1 開學日，承租人為直系尊親屬）。\n• 簽具家訪同意書。\n➔ 列為【第四順位】。\n\n💡 歷年第四順位設籍門檻參考：\n111年：設籍約5年 (小二)\n112年：設籍約4年 (小三)\n113年：設籍約8年 (大班)\n114年：設籍約2年 (小五)\n※ 同順位以戶籍遷入日先後排序。`;
    }
    if (t.includes('自有') || t.includes('權狀') || t.includes('公證') || t.includes('稅籍')) {
      return `🏠【115學年度 錄取順位判定：第二順位（本市）/ 第三順位（外縣市）】\n━━━━━━━━━━━━━━\n• 第二順位：設籍本校學區之「新竹市」國小畢業生，具自有房屋證明（權狀或當年度稅籍證明）或「法院公證租約」（租期涵蓋 115/3/14～9/1），並簽具家訪同意書。\n• 第三順位：同上述條件，但為「非新竹市（外縣市）」國小畢業生。\n\n⚠️ 提醒：房屋所有權人或公證租約承租人，必須為學生的「直系血親尊親屬」或「法定監護人」！`;
    }
    if (t.includes('教職員') || t.includes('低收') || t.includes('特教') || t.includes('安置') || t.includes('雙亡')) {
      return `🌟【115學年度 錄取順位判定：第一順位】\n━━━━━━━━━━━━━━\n第一順位資格對象：\n1. 縣市政府轉介安置之少年保護個案。\n2. 設籍本市且居住於學區內列冊之「低收入戶子女」。\n3. 設籍本市且居住於學區內之「父母雙亡者」。\n4. 本校現職編制內教職員工之子女或受監護人。\n5. 經市府鑑定並安置之身心障礙資源生。\n\n※ 第一順位除教職員子女外，均會實地訪查是否有居住事實。`;
    }
    return `🎯【竹光國中 115學年度入學六大順位一覽】\n━━━━━━━━━━━━━━\n• 第一順位：教職員子女、低收入戶、身障安置生、父母雙亡\n• 第二順位：本市國小畢業生 ＋ 自有權狀 / 法院公證租約 ＋ 家訪同意書\n• 第三順位：外縣市國小畢業生 ＋ 自有權狀 / 法院公證租約 ＋ 家訪同意書\n• 第四順位：本學區國小畢業生 ＋「未公證」房屋租賃契約 ＋ 家訪同意書\n• 第五順位：本學區國小畢業生 ＋「無法提供居住證明」＋ 家訪同意書\n• 最後順位：無法簽具家訪同意書者、或查訪為空戶者\n\n📌 排序原則：先比順位，同順位再依「戶籍遷入學區時間先後」排序！`;
  }

  // 2. 設籍時間累計計算
  if (t.includes('設籍') || t.includes('戶籍') || t.includes('累計') || t.includes('搬家') || t.includes('遷出') || t.includes('遷入')) {
    return `🏡【設籍時間計算與戶籍規定】\n━━━━━━━━━━━━━━\n1. 必要條件：\n• 學生須設籍本學區，且「至少一名直系尊親屬」（父、母、祖父母、外祖父母）在同一戶籍內！\n• 若無直系尊親屬同戶，連順位都沒有，無法參加登記。\n\n2. 累計設籍規則：\n• 【學區內搬家】：如從境福里遷到磐石里，居住時間「可以連續累計」！\n• 【中途遷出學區】：若曾遷出竹光學區（如遷到金雅里），再遷回學區，則「以最後一次遷入學區之日期重新起算」！\n\n3. 同日遷入者排序：\n最後一名同日遷入者，以「有兄姊就讀本校者」優先；條件相同者採公開抽籤。多胞胎手足隨同錄取（外加名額）。`;
  }

  // 3. 攜帶文件 / 黃單
  if (t.includes('文件') || t.includes('帶什麼') || t.includes('證件') || t.includes('黃單') || t.includes('戶口名簿') || t.includes('謄本')) {
    return `🎒【3/14 (六) 新生現場登記應備文件清單】\n━━━━━━━━━━━━━━\n【時間】：115年3月14日(六) 上午 08:00 - 11:00\n【地點】：竹光國中\n\n請備妥下列三項資料：\n1. 📄 新生入學通知單（黃單，國小轉發，正面資格單、背面登記表及家訪同意書填妥簽名）\n2. 👥 戶籍證明（二擇一，必要）：\n   • 3個月內全戶戶籍謄本正本（含詳細記事）\n   • 新式戶口名簿正本＋影本（含詳細記事，正本驗畢發還）\n3. 🏠 居住證明文件（提升順位用）：\n   • 自有：房屋所有權狀 或 115年房屋稅籍證明\n   • 租賃：法院公證租約（第2順位）或 未公證租約（第4順位），租期須涵蓋 115/3/14～9/1，承租人為直系親屬。\n\n※ 可委託親友到場送件。未參加登記者視同放棄！`;
  }

  // 4. 重要時程 / 日程 / 報到
  if (t.includes('日程') || t.includes('時程') || t.includes('報到') || t.includes('日期') || t.includes('放榜') || t.includes('考試') || t.includes('測驗')) {
    return `📅【竹光國中 115學年度總量管制重要日程表】\n━━━━━━━━━━━━━━\n• 03/06(五)前：各國小轉發新生入學通知單(黃單)\n• 03/12(四)前：共同學區欲登記他校總量國中者提出申請截止\n• 03/14(六) 08:00-11:00：【新生入學現場登記審核】\n• 03/16-03/20：居住事實查核、入學作業委員會審查\n• 03/23(一) 16:00：【公布錄取名單】(正取、候補、未錄取)\n• 03/30(一)-04/04(六)：【正取生 線上報到】\n• 04/07(二)-04/08(三)：正取生實體報到(警衛室)\n• 04/15(三)前：備取遞補報到作業(電話個別通知)\n• 04/17(五)前：函送改分發名冊至各改分發學校\n• 05/30(六) 09:00-11:30：【新生學力測驗】(發放暑假作業)`;
  }

  // 5. 學區里鄰 / 共同學區
  if (t.includes('學區') || t.includes('里') || t.includes('鄰') || t.includes('北門') || t.includes('民富') || t.includes('境福') || t.includes('客雅') || t.includes('新雅') || t.includes('長和') || t.includes('新民') || t.includes('中雅') || t.includes('文雅') || t.includes('磐石')) {
    return `🗺️【竹光國中 115學年度學區劃分】\n━━━━━━━━━━━━━━\n【單一學區】：\n• 民富里、磐石里、新雅里 1-18 及 20-27 鄰\n\n【共同學區】：\n• 新雅里 19 鄰 ➔ 竹光、虎林\n• 南勢里 1-6、8-10 鄰 ➔ 竹光、虎林、成德\n• 客雅里 1-2 鄰 ➔ 竹光、成德\n• 客雅里 3-7 鄰 ➔ 竹光、虎林、成德\n• 境福里 ➔ 竹光、光華\n• 文雅里 ➔ 竹光、成德、光華\n• 長和里 ➔ 竹光、育賢、光華\n• 新民里 ➔ 竹光、育賢、光華\n• 中雅里 1-11 鄰 ➔ 竹光、成德\n• 中雅里 12-16 鄰 ➔ 竹光、虎林、成德\n• 北門里 1-5、7-10、12、13、16、17 鄰 ➔ 竹光、光華、建華（115新增）\n\n※ 共同學區與單一學區之排序順位標準完全一致。`;
  }

  // 6. 未錄取 / 改分發
  if (t.includes('未錄取') || t.includes('沒錄取') || t.includes('改分發') || t.includes('轉分發') || t.includes('落榜') || t.includes('分發')) {
    return `🏫【未錄取新生改分發說明】\n━━━━━━━━━━━━━━\n若新生經審查排序未獲錄取：\n1. 【單一學區學生】：依家長意願改分發至「虎林國中」、「成德高中(國中部)」、「光華國中」、「育賢國中」或「建華國中」。（登記表黃單背面有勾選欄位）\n2. 【共同學區學生】：依家長意願改分發至該共同學區之他校。\n\n📌 學校會於 4/17 前統一函送改分發名冊，改分發國中將於 4/20 前寄發入學通知書，維護學生就學權益！`;
  }

  // 7. 轉學 / 學期中轉入
  if (t.includes('轉入') || t.includes('轉學') || t.includes('轉出') || t.includes('學期中') || t.includes('出國')) {
    return `🔄【轉出轉入與學期中缺額規定】\n━━━━━━━━━━━━━━\n• 總量限制學校「學期中各年級僅得轉出，不得轉入」！\n• 學生赴國外或大陸就讀應辦理轉出，無法辦理保留學籍。\n• 學期中轉出產生之缺額，一律於【寒假及暑假】統一辦理補實公告，志願轉入學生按戶籍遷入學區居住時間先後分發。`;
  }

  // 8. 招收班級數 / 電話
  if (t.includes('幾班') || t.includes('班級數') || t.includes('電話') || t.includes('分機') || t.includes('地址') || t.includes('聯絡')) {
    return `ℹ️【竹光國中 學校與招生基本資訊】\n━━━━━━━━━━━━━━\n• 核定新生班級數：115學年度預計招收 12 班\n• 學校地址：新竹市北區和平路 1 號\n• 承辦處室：教務處註冊組\n• 諮詢電話：(03) 524-6683 分機 613\n• 學校官方網站：https://www.zgjh.hc.edu.tw`;
  }

  return null;
}

// ======================= Gemini 2.5 Flash RAG =======================
function askGeminiRag(query) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    
    const systemPrompt = `你是由新竹市立竹光國民中學教務處註冊組設立的「115學年度新生入學總量管制 LINE Bot 智慧諮詢小幫手」。
請用台灣繁體中文、溫暖專業且精準條列的口氣回答家長或行政同仁。
核心法規知識庫如下：
1. 本校 115 學年度核定招收 12 班。
2. 六大錄取順位：
   - 第一順位：少年保護安置個案、設籍本市低收入戶、設籍本市父母雙亡、編制內教職員工子女、市府安置特教生。
   - 第二順位：本市國小畢業生，戶籍符合（與直系尊親屬同戶）且具自有權狀/115房屋稅籍證明或法院公證租約(租期涵蓋115/3/14~9/1)，簽家訪同意書。
   - 第三順位：非本市(外縣市)國小畢業生，戶籍符合且具自有權狀或法院公證租約，簽家訪同意書。
   - 第四順位：本學區國小畢業生，戶籍符合且僅具「未經法院公證之房屋租約」(涵蓋115/3/14~9/1)，簽家訪同意書。
   - 第五順位：本學區國小畢業生，戶籍符合但無法提供居住證明文件，簽家訪同意書。
   - 第六順位(最後順位)：無法簽具家訪同意書或經查為空戶/非實際居住者。
3. 排序規則：先比順位，同順位比「戶籍遷入日早晚」。同日同順位以有兄姊就讀優先，其餘抽籤。多胞胎一人錄取手足外加。
4. 設籍時間：學區內遷移可連續累計；中途曾遷出學區再遷回，以最後一次遷入日重新計算。
5. 共同學區：新雅里19鄰(虎林)、南勢里(虎林/成德)、客雅里(成德/虎林)、境福里(光華)、文雅里(成德/光華)、長和里(育賢/光華)、新民里(育賢/光華)、中雅里(成德/虎林)、北門里(光華/建華，115新增)。若共同學區含另一總量學校欲兩校登記，3/12前提出申請。
6. 未錄取改分發：單一學區改分發虎林、成德、光華、育賢、建華；共同學區改分發該學區他校。
7. 重要時程：
   - 3/06 前發入學通知單黃單
   - 3/14(六) 08:00-11:00 現場登記審查資格
   - 3/23(一) 16:00 公告錄取名單
   - 3/30-4/4 正取生線上報到，4/7-4/8 實體報到
   - 4/15 備取遞補
   - 5/30(六) 09:00-11:30 新生入學測驗
8. 諮詢窗口：教務處註冊組 03-5246683 #613。

若遇未定事項，提醒家長以學校官方公告與黃單為準。絕不捏造規定。`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n家長或同仁提問：${query}\n請給出親切、具體、繁體中文的回覆：` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800
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

// ======================= 預設導引訊息 =======================
function getDefaultHelpMessage(text) {
  return `您好！我是【竹光國中 115學年度總量管制智慧諮詢小幫手】🤖

您可以直接輸入關鍵字或點選下列常見提問：
1️⃣【順位試算】：租屋未公證算第幾順位？有房屋所有權狀是第幾順位？
2️⃣【攜帶文件】：3/14 新生登記當天要帶什麼證件？
3️⃣【錄取門檻】：歷年設籍大約幾年能錄取？
4️⃣【設籍計算】：之前學區內搬家設籍時間可以累計嗎？
5️⃣【學區查詢】：我家住在北門里/新雅里算學區嗎？
6️⃣【重要時程】：登記、放榜、線上報到與測驗日期？
7️⃣【改分發】：如果未錄取會改分發到哪所學校？

📞 人工諮詢窗口：竹光國中教務處註冊組 (03) 524-6683 分機 613`;
}

// ======================= LINE API 工具 =======================
function replyLineMessage(replyToken, messageText) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const payload = {
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: messageText
      }
    ]
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
    const payload = {
      chatId: chatId,
      loadingSeconds: 5
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
  } catch (e) {
    // 載入動畫如失敗不影響主回覆
  }
}
