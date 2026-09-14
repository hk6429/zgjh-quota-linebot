# -*- coding: utf-8 -*-
"""
新竹市立竹光國中 115學年度新生總量管制 LINE Bot 智慧小幫手
專案靜態導覽網站生成腳本 (build.py)
精確處理 HTML/CSS/JS 標籤與全量前後端代碼注入，保證無 JS 語法錯誤
"""

import os
import html
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CODE_GS_PATH = os.path.join(BASE_DIR, 'Code.gs')
GAS_INDEX_PATH = os.path.join(BASE_DIR, 'gas_index.html')
OUTPUT_PATH = os.path.join(BASE_DIR, 'index.html')

KB_PATH = os.path.join(BASE_DIR, 'knowledge_base.json')
MATCHER_PATH = os.path.join(BASE_DIR, 'kb_matcher.js')

with open(KB_PATH, 'r', encoding='utf-8') as f:
    KB = json.load(f)
with open(MATCHER_PATH, 'r', encoding='utf-8') as f:
    matcher_js = f.read()
# GAS 不需要 module.exports 那行
matcher_js_gas = '\n'.join(l for l in matcher_js.splitlines() if not l.startswith('if (typeof module'))

def inject_between(text, start_marker, end_marker, payload):
    a = text.index(start_marker) + len(start_marker)
    b = text.index(end_marker)
    return text[:a] + '\n' + payload + '\n' + text[b:]

# 把共用引擎與知識庫種子灌進 Code.gs（Code.gs 是要貼進 GAS 的成品，所以直接回寫檔案）
with open(CODE_GS_PATH, 'r', encoding='utf-8') as f:
    code_gs_content = f.read()
seed_js = 'const KB_SEED = ' + json.dumps(
    {k: KB[k] for k in ('qa', 'matrix', 'district', 'schedule', 'history')},
    ensure_ascii=False, indent=2) + ';'
code_gs_content = inject_between(code_gs_content, '// __KB_MATCHER_START__', '// __KB_MATCHER_END__', matcher_js_gas)
code_gs_content = inject_between(code_gs_content, '// __KB_SEED_START__', '// __KB_SEED_END__', seed_js)
with open(CODE_GS_PATH, 'w', encoding='utf-8') as f:
    f.write(code_gs_content)

with open(GAS_INDEX_PATH, 'r', encoding='utf-8') as f:
    gas_index_content = f.read()

# 轉義用於 pre/code 標籤與 hidden textarea 內安全顯示
escaped_code_gs = html.escape(code_gs_content)
escaped_gas_index = html.escape(gas_index_content)

html_template = """<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>竹光國中 115學年度新生總量管制 LINE Bot 智慧小幫手｜家長資格試算 × 註冊組法規查核導覽專站</title>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- FontAwesome 6 -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <!-- Canvas Confetti -->
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>

  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            lineGreen: {
              50: '#F0FDF4',
              100: '#DCFCE7',
              500: '#06C755',
              600: '#05B34C',
              700: '#048C3B',
            },
            zgjhBlue: {
              50: '#EFF6FF',
              100: '#DBEAFE',
              500: '#3B82F6',
              600: '#2563EB',
              700: '#1D4ED8',
              800: '#1E40AF',
              900: '#1E3A8A',
            },
            amberBrand: {
              50: '#FFFBEB',
              100: '#FEF3C7',
              500: '#F59E0B',
              600: '#D97706',
            }
          }
        }
      }
    };
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
    body {
      font-family: 'Noto Sans TC', 'Plus Jakarta Sans', sans-serif;
      -webkit-tap-highlight-color: transparent;
    }
    .chat-bubble-received {
      position: relative;
      background-color: #FFFFFF;
      border-radius: 18px 18px 18px 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .chat-bubble-sent {
      position: relative;
      background-color: #D2F8D2;
      border-radius: 18px 18px 4px 18px;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #0f172a;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
    .phone-mockup-shadow {
      box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col selection:bg-emerald-100 selection:text-emerald-900">

  <!-- 頂部導航 -->
  <header class="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 transition shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#06C755] to-emerald-600 flex items-center justify-center text-white text-xl shadow-md">
            <i class="fa-brands fa-line"></i>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-black text-slate-900 text-base sm:text-lg tracking-tight">竹光國中 115 總量管制小幫手</span>
              <span class="hidden sm:inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">115學年度專版</span>
            </div>
            <p class="text-[11px] text-slate-500 hidden md:block">教務處註冊組 · 家長資格試算 × 審核法規查核導覽</p>
          </div>
        </div>

        <div class="flex items-center space-x-2 sm:space-x-3">
          <a href="#simulator" class="px-3 sm:px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border border-emerald-200">
            <i class="fa-solid fa-mobile-screen"></i>
            <span>對話模擬體驗</span>
          </a>
          <a href="#deepdive" class="px-3 sm:px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition hidden md:flex items-center space-x-1.5">
            <i class="fa-solid fa-sitemap"></i>
            <span>六大順位架構</span>
          </a>
          <a href="#database" class="px-3 sm:px-3.5 py-2 bg-emerald-100/70 hover:bg-emerald-200/70 text-emerald-800 rounded-xl text-xs font-bold transition hidden sm:flex items-center space-x-1.5">
            <i class="fa-solid fa-table"></i>
            <span>Google 試算表大腦</span>
          </a>
          <a href="#deploy" class="px-3 sm:px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm">
            <i class="fa-solid fa-code text-emerald-400"></i>
            <span>前後端完整程式碼</span>
          </a>
        </div>
      </div>
    </div>
  </header>

  <!-- Hero Banner 區塊 -->
  <section class="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-16 sm:py-24">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(6,199,85,0.15),transparent_50%)] pointer-events-none"></div>
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.12),transparent_50%)] pointer-events-none"></div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <div class="lg:col-span-7 space-y-6 text-left">
          <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-emerald-300 text-xs font-semibold backdrop-blur-md">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>新竹市立竹光國民中學 115 學年度新生入學法規同步</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.2] text-white">
            竹光國中新生總量管制<br>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
              LINE Bot 智慧諮詢小幫手
            </span>
          </h1>

          <p class="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            將註冊組繁複的總量管制法規（包含六大錄取順位判定、自有所有權狀查驗、公證與未公證租賃契約審查、歷年設籍年限門檻、共同學區選填、未錄取改分發等），轉化為 24 小時在線的 LINE 智慧應答機器人，並以 <strong>Google 試算表作為雲端知識庫與在線工單系統</strong>，支援前端以 <code>#記住 [題目] [回答]</code> 即時動態新增擴充知識庫！
          </p>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div class="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xs text-center">
              <div class="text-2xl font-black text-emerald-400">12 班</div>
              <div class="text-[11px] text-slate-400 mt-1 font-medium">115學年核定班級數</div>
            </div>
            <div class="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xs text-center">
              <div class="text-2xl font-black text-blue-400">6 大</div>
              <div class="text-[11px] text-slate-400 mt-1 font-medium">嚴謹法定分發順位</div>
            </div>
            <div class="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xs text-center">
              <div class="text-2xl font-black text-amber-400">7 張</div>
              <div class="text-[11px] text-slate-400 mt-1 font-medium">Google 試算表大腦</div>
            </div>
            <div class="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xs text-center">
              <div class="text-2xl font-black text-purple-400">0 秒</div>
              <div class="text-[11px] text-slate-400 mt-1 font-medium">#記住 即時寫入生效</div>
            </div>
          </div>

          <div class="flex flex-wrap gap-4 pt-4">
            <a href="#simulator" class="px-6 py-3 rounded-xl bg-gradient-to-r from-[#06C755] to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white font-bold text-sm transition shadow-lg shadow-emerald-900/40 flex items-center space-x-2">
              <i class="fa-solid fa-play"></i>
              <span>立即試玩對話模擬器</span>
            </a>
            <a href="#deploy" class="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition border border-white/15 backdrop-blur-md flex items-center space-x-2">
              <i class="fa-solid fa-code"></i>
              <span>查看與複製前後端代碼</span>
            </a>
          </div>
        </div>

        <!-- 右側手機模型預覽 -->
        <div class="lg:col-span-5 flex justify-center">
          <div class="relative w-full max-w-[340px]">
            <div class="relative bg-slate-950 rounded-[44px] p-3 border-4 border-slate-800 phone-mockup-shadow">
              <div class="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-5 bg-slate-800 rounded-b-2xl z-30 flex items-center justify-center">
                <div class="w-12 h-1 bg-slate-700 rounded-full"></div>
              </div>

              <!-- 手機螢幕內部 -->
              <div class="bg-[#8C9DAE] rounded-[36px] overflow-hidden flex flex-col h-[520px] text-xs">
                <div class="bg-[#243443] text-white px-4 pt-7 pb-3 flex items-center justify-between shrink-0 shadow-md">
                  <div class="flex items-center space-x-2">
                    <i class="fa-solid fa-chevron-left text-xs opacity-70"></i>
                    <span class="font-bold text-sm">竹光115總量管制小幫手</span>
                    <span class="w-2 h-2 rounded-full bg-[#06C755]"></span>
                  </div>
                  <div class="flex items-center space-x-3 text-slate-300">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <i class="fa-solid fa-bars"></i>
                  </div>
                </div>

                <!-- 模擬對話內容 -->
                <div class="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                  <div class="text-center my-1">
                    <span class="bg-black/20 text-white/90 text-[10px] px-2.5 py-0.5 rounded-full">上午 09:30</span>
                  </div>

                  <div class="flex items-start space-x-2">
                    <div class="w-7 h-7 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs font-bold">
                      <i class="fa-brands fa-line"></i>
                    </div>
                    <div class="max-w-[80%]">
                      <div class="chat-bubble-received p-2.5 text-slate-800 text-[11px] leading-relaxed">
                        家長您好！我是竹光國中 115學年度新生總量管制諮詢小幫手 🎓<br><br>
                        請直接輸入您的疑慮（例如：「租約未公證算第幾順位？」或「設籍大約幾年能排到？」），我將即時為您查核法規！
                      </div>
                      <span class="text-[9px] text-white/70 ml-1 mt-0.5 block">09:30</span>
                    </div>
                  </div>

                  <div class="flex items-end justify-end space-x-1">
                    <span class="text-[9px] text-white/70 mb-1">已讀</span>
                    <div class="max-w-[80%] chat-bubble-sent p-2.5 text-slate-900 text-[11px] leading-relaxed">
                      老師好，我們是租房子只有一般租約沒公證，能登記嗎？排在第幾順位？
                    </div>
                  </div>

                  <div class="flex items-start space-x-2">
                    <div class="w-7 h-7 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs font-bold">
                      <i class="fa-brands fa-line"></i>
                    </div>
                    <div class="max-w-[85%]">
                      <div class="chat-bubble-received p-2.5 text-slate-800 text-[11px] leading-relaxed space-y-1">
                        <div class="font-bold text-emerald-800 border-b border-emerald-100 pb-1">
                          📋 判定結果：第四順位
                        </div>
                        <p>依竹光 115 作業規定：</p>
                        <p>• 設籍學區之國小畢業生且與直系親屬同戶</p>
                        <p>• 僅提供「未經法院公證之房屋租賃契約」並簽具家訪同意書</p>
                        <p class="text-amber-800 font-semibold">➔ 列為【第四順位】！</p>
                        <p class="text-slate-500 text-[10px]">💡 提示：若能在 3/14 登記前至法院補辦租約公證，即可升級為【第二順位】喔！</p>
                      </div>
                      <span class="text-[9px] text-white/70 ml-1 mt-0.5 block">09:31</span>
                    </div>
                  </div>
                </div>

                <!-- 手機底部輸入列 -->
                <div class="bg-[#F6F6F6] px-3 py-2 flex items-center space-x-2 border-t border-slate-300 shrink-0">
                  <i class="fa-solid fa-plus text-slate-500 text-sm"></i>
                  <i class="fa-solid fa-camera text-slate-500 text-sm"></i>
                  <div class="flex-1 bg-white rounded-full px-3 py-1.5 text-slate-400 text-[11px] border border-slate-200">
                    輸入「#記住」或問題...
                  </div>
                  <i class="fa-solid fa-paper-plane text-emerald-600 text-sm"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- 互動模擬器區塊 (#simulator) -->
  <section id="simulator" class="py-16 sm:py-24 bg-slate-900 text-white relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div class="text-center max-w-3xl mx-auto mb-12 space-y-3">
        <div class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>Live Interactive Simulator</span>
        </div>
        <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black">
          LINE Bot 雙視角對話體驗模擬器
        </h2>
        <p class="text-slate-400 text-xs sm:text-sm">
          點選左側經典題目，或直接在下方輸入關鍵字；支援家長「資格試算」與註冊組「法規查核」雙視角！
        </p>

        <!-- 視角切換器 -->
        <div class="inline-flex p-1.5 rounded-2xl bg-slate-800 border border-slate-700 shadow-inner mt-4">
          <button 
            id="simTabParent"
            onclick="switchSimMode('parent')"
            class="px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 bg-[#06C755] text-white shadow-md"
          >
            <i class="fa-solid fa-user-group"></i>
            <span>新生家長諮詢視角</span>
          </button>
          <button 
            id="simTabAdmin"
            onclick="switchSimMode('admin')"
            class="px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 text-slate-400 hover:text-white"
          >
            <i class="fa-solid fa-shield-halved"></i>
            <span>註冊組法規查核視角</span>
          </button>
        </div>
      </div>

      <!-- 模擬器主畫面 -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- 左側快捷題目列表 -->
        <div class="lg:col-span-5 space-y-4">
          <div class="bg-slate-800/80 backdrop-blur-md rounded-3xl p-5 border border-slate-700/80 shadow-lg">
            <h3 id="promptTitle" class="text-sm font-bold text-white flex items-center mb-3">
              <i class="fa-solid fa-circle-question text-emerald-400 mr-2"></i>
              點選測試 家長常見諮詢情境：
            </h3>
            <p id="promptDesc" class="text-[11px] text-slate-400 mb-4">
              針對新生家長每年最容易焦慮、打爆總機的 4 大核心問題，點擊即時體驗回答：
            </p>

            <div id="promptButtonsContainer" class="space-y-2.5">
              <!-- JS 動態渲染題庫按鈕 -->
            </div>

            <!-- 熱門關鍵字標籤 -->
            <div class="pt-5 mt-4 border-t border-slate-700/70">
              <div class="text-[11px] font-bold text-slate-400 mb-2">快速點選關鍵字：</div>
              <div class="flex flex-wrap gap-1.5">
                <button onclick="triggerCustomKeyword('未公證租約算第幾順位？')" class="text-[10px] px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white transition">#未公證租約</button>
                <button onclick="triggerCustomKeyword('自有房屋權狀需要帶什麼？')" class="text-[10px] px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white transition">#房屋所有權狀</button>
                <button onclick="triggerCustomKeyword('設籍大約幾年排得上？')" class="text-[10px] px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white transition">#歷年設籍門檻</button>
                <button onclick="triggerCustomKeyword('北門里算竹光學區嗎？')" class="text-[10px] px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white transition">#115新增北門里</button>
                <button onclick="triggerCustomKeyword('如果沒錄取會改分發去哪裡？')" class="text-[10px] px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white transition">#改分發五校</button>
                <button onclick="triggerCustomKeyword('3/14審核要帶什麼文件？')" class="text-[10px] px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white transition">#應備文件黃單</button>
              </div>
            </div>

            <!-- 動態擴充提示卡 -->
            <div class="mt-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-start space-x-2.5">
              <i class="fa-solid fa-lightbulb text-emerald-400 mt-0.5 shrink-0"></i>
              <div>
                <span class="font-bold text-white">支援 #記住 動態寫入：</span><br>
                在下方輸入框輸入 <code>#記住 [題目] [答案]</code>（例如：<code>#記住 雙胞胎同班 3/14現場登記時於登記表背面勾選即可</code>），小幫手將直接寫入試算表，下一次直接能回答！
              </div>
            </div>
          </div>
        </div>

        <!-- 右側手機對話模擬窗 -->
        <div class="lg:col-span-7 flex justify-center">
          <div class="w-full max-w-md bg-slate-950 rounded-[44px] p-3.5 border-4 border-slate-700 shadow-2xl">
            
            <div class="bg-[#8C9DAE] rounded-[34px] overflow-hidden flex flex-col h-[580px] text-xs">
              
              <!-- 聊天頂欄 -->
              <div class="bg-[#243443] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
                <div class="flex items-center space-x-2.5">
                  <div id="simAvatar" class="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-white text-sm shadow-xs font-bold">
                    <i class="fa-brands fa-line"></i>
                  </div>
                  <div>
                    <div id="simBotName" class="font-bold text-xs">竹光 115 總量管制諮詢助手</div>
                    <div class="text-[9px] text-emerald-400 flex items-center space-x-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>已即時連線 Google Sheets 資料庫</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center space-x-2">
                  <button onclick="resetChatMessages()" title="清空對話" class="text-slate-300 hover:text-white p-1 text-xs">
                    <i class="fa-solid fa-rotate-right"></i>
                  </button>
                </div>
              </div>

              <!-- 聊天歷史視窗 -->
              <div id="chatMessages" class="flex-1 p-3.5 space-y-3 overflow-y-auto custom-scrollbar">
                <!-- 預設歡迎氣泡 -->
              </div>

              <!-- 打字中指示器 -->
              <div id="typingIndicator" class="hidden px-4 py-1.5 flex items-center space-x-1.5 text-white/80 text-[10px]">
                <div class="w-2 h-2 rounded-full bg-white/70 animate-bounce"></div>
                <div class="w-2 h-2 rounded-full bg-white/70 animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 rounded-full bg-white/70 animate-bounce" style="animation-delay: 0.4s"></div>
                <span class="ml-1 text-white/90">小幫手正在查核總量管制法規中...</span>
              </div>

              <!-- 聊天輸入區 -->
              <div class="bg-[#F6F6F6] p-2.5 border-t border-slate-300 shrink-0">
                <form onsubmit="event.preventDefault(); handleUserInput();" class="flex items-center space-x-2">
                  <input 
                    type="text" 
                    id="simInputText"
                    placeholder="輸入問題或以「#記住 題目 答案」新增..."
                    class="flex-1 bg-white rounded-full px-4 py-2 text-slate-800 text-xs border border-slate-300 focus:outline-hidden focus:border-emerald-500 shadow-inner"
                  >
                  <button 
                    type="submit"
                    class="w-8 h-8 rounded-full bg-[#06C755] hover:bg-emerald-600 text-white flex items-center justify-center transition shadow-sm active:scale-95 shrink-0"
                  >
                    <i class="fa-solid fa-paper-plane text-xs"></i>
                  </button>
                </form>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  </section>

  <!-- 六大順位深度架構解析 (#deepdive) -->
  <section id="deepdive" class="py-16 sm:py-24 bg-white border-y border-slate-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div class="text-center max-w-3xl mx-auto mb-16 space-y-3">
        <span class="text-emerald-700 bg-emerald-100 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
          Decision Matrix
        </span>
        <h2 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          115學年度總量管制「六大順位」判定矩陣
        </h2>
        <p class="text-slate-600 text-sm">
          依據新竹市立竹光國民中學 115學年度新生登記入學作業規定，審查分發順位層次清晰透明：
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <!-- 順位一 -->
        <div class="rounded-3xl p-6 border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50/50 to-white shadow-sm hover:shadow-md transition">
          <div class="flex items-center justify-between mb-4">
            <span class="px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs">第一順位</span>
            <span class="text-emerald-700 font-bold text-xs"><i class="fa-solid fa-check-double mr-1"></i>法定特殊身分</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">少年保護、低收、父母雙亡、教職員子女、資源生</h3>
          <p class="text-xs text-slate-600 leading-relaxed space-y-1 mb-4">
            • 經縣市政府轉介安置之少年保護個案<br>
            • 設籍本市且居住學區內之列冊低收入戶子女、父母雙亡學童<br>
            • 本校現職編制內教職員工子女、受監護人（隨父母就讀所服務學校）<br>
            • 經市府鑑定並安置之資源生
          </p>
          <div class="pt-3 border-t border-emerald-100 text-[11px] text-slate-500">
            <strong>審驗要點：</strong>主管機關核定公文或列冊證明；除教職員子女外均實地查訪居住事實。
          </div>
        </div>

        <!-- 順位二 -->
        <div class="rounded-3xl p-6 border-2 border-blue-500/40 bg-gradient-to-b from-blue-50/50 to-white shadow-sm hover:shadow-md transition">
          <div class="flex items-center justify-between mb-4">
            <span class="px-3 py-1 rounded-xl bg-blue-600 text-white font-black text-xs">第二順位</span>
            <span class="text-blue-700 font-bold text-xs"><i class="fa-solid fa-house-chimney mr-1"></i>竹市國小 + 權狀/公證租約</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">本市畢業生且具自有權狀或公證租約</h3>
          <p class="text-xs text-slate-600 leading-relaxed space-y-1 mb-4">
            • 學生設籍學區且與直系尊親屬或法定監護人同戶<br>
            • 具新竹市公私立國小畢業資格<br>
            • 檢附自有房屋所有權狀（或稅籍證明）或公證租賃契約並簽具家訪同意書
          </p>
          <div class="pt-3 border-t border-blue-100 text-[11px] text-slate-500">
            <strong>排序標準：</strong>符合資格者直接入學；人數超額時比設籍日。
          </div>
        </div>

        <!-- 順位三 -->
        <div class="rounded-3xl p-6 border border-slate-200 bg-white shadow-sm hover:shadow-md transition">
          <div class="flex items-center justify-between mb-4">
            <span class="px-3 py-1 rounded-xl bg-slate-800 text-white font-black text-xs">第三順位</span>
            <span class="text-slate-600 font-bold text-xs"><i class="fa-solid fa-plane-departure mr-1"></i>外縣市國小 + 權狀/公證租約</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">外縣市畢業生具自有權狀或公證租約</h3>
          <p class="text-xs text-slate-600 leading-relaxed space-y-1 mb-4">
            • 設籍本校學區且與直系親屬同戶<br>
            • 畢業於外縣市公私立國小<br>
            • 檢附自有權狀或經法院公證租賃契約證明，簽具家訪同意書
          </p>
          <div class="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <strong>排序標準：</strong>第二順位分發後如有餘額，按設籍時間排序分發。
          </div>
        </div>

        <!-- 順位四 -->
        <div class="rounded-3xl p-6 border-2 border-amber-500/40 bg-gradient-to-b from-amber-50/50 to-white shadow-sm hover:shadow-md transition">
          <div class="flex items-center justify-between mb-4">
            <span class="px-3 py-1 rounded-xl bg-amber-600 text-white font-black text-xs">第四順位</span>
            <span class="text-amber-800 font-bold text-xs"><i class="fa-solid fa-file-contract mr-1"></i>最常比設籍之主戰場</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">未公證租約 / 居住事實證明者</h3>
          <p class="text-xs text-slate-600 leading-relaxed space-y-1 mb-4">
            • 設籍本校學區且直系尊親屬同戶之國小畢業生<br>
            • 僅能檢附「未經法院公證之房屋租賃契約」<br>
            • 簽具家訪同意書（租約需涵蓋 115/3/14~9/1，承租人為直系尊親屬）
          </p>
          <div class="pt-3 border-t border-amber-100 text-[11px] text-slate-500">
            <strong>排序標準：</strong>依設籍時間早晚排序分發至額滿為止。
          </div>
        </div>

        <!-- 順位五 -->
        <div class="rounded-3xl p-6 border border-slate-200 bg-white shadow-sm hover:shadow-md transition">
          <div class="flex items-center justify-between mb-4">
            <span class="px-3 py-1 rounded-xl bg-slate-700 text-white font-black text-xs">第五順位</span>
            <span class="text-slate-500 font-bold text-xs"><i class="fa-solid fa-file-circle-xmark mr-1"></i>戶籍符合、無居住證明</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">戶籍符合但無法提供居住證明文件</h3>
          <p class="text-xs text-slate-600 leading-relaxed space-y-1 mb-4">
            • 設籍本校學區且與直系尊親屬或法定監護人同戶之國小畢業生<br>
            • 沒有權狀、沒有租約，或居住文件不符規定（承租人非直系、租期未涵蓋 3/14～9/1）<br>
            • 簽具家訪同意書即可參加排序
          </p>
          <div class="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <strong>排序標準：</strong>依戶籍遷入學區時間先後排序；補未公證租約可升第四順位。
          </div>
        </div>

        <!-- 順位六 -->
        <div class="rounded-3xl p-6 border border-slate-200 bg-white shadow-sm hover:shadow-md transition">
          <div class="flex items-center justify-between mb-4">
            <span class="px-3 py-1 rounded-xl bg-slate-700 text-white font-black text-xs">第六順位（最後順位）</span>
            <span class="text-slate-500 font-bold text-xs"><i class="fa-solid fa-user-xmark mr-1"></i>未簽家訪同意書 / 空戶</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">無法簽具家訪同意書，或經查為空戶</h3>
          <p class="text-xs text-slate-600 leading-relaxed space-y-1 mb-4">
            • 符合入學資格但無法簽具（或不同意）家訪同意書者<br>
            • 經訪查已遷居學區外、非實際居住或為空戶（人籍分離）者<br>
            • ※ 戶籍內無直系尊親屬同戶者「無法登記」，連順位都沒有
          </p>
          <div class="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <strong>處理方式：</strong>列最後順位錄取，空戶者勸導轉入實際居住學區之學校。
          </div>
        </div>

      </div>

    </div>
  </section>

  <!-- Google 試算表資料庫架構 (#database) -->
  <section id="database" class="py-16 sm:py-24 bg-slate-100/70 border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div class="text-center max-w-3xl mx-auto mb-16 space-y-3">
        <span class="text-emerald-800 bg-emerald-200/60 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
          Database Architecture
        </span>
        <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
          7 大工作表：Google Sheets 雲端資料庫大腦
        </h2>
        <p class="text-slate-600 text-sm">
          免架設後端資料庫，教務處同仁直接在 Google 試算表日常維護，LINE Bot 透過 Apps Script 零延遲即時讀取！
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black mb-3">1</div>
          <h4 class="font-bold text-slate-900 text-sm">總量管制Q&A知識庫</h4>
          <p class="text-slate-500 text-xs mt-1 leading-relaxed">
            核心 RAG 問答大腦，含題目、關鍵字群、權威標準回覆、依據條文及啟用開關；支援前端 <code>#記住</code> 即時新增。
          </p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black mb-3">2</div>
          <h4 class="font-bold text-slate-900 text-sm">六大順位判定矩陣</h4>
          <p class="text-slate-500 text-xs mt-1 leading-relaxed">
            順位代碼、適用身分、戶籍條件、居住證明文件（權狀/公證/未公證）及同順位排序規準。
          </p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black mb-3">3</div>
          <h4 class="font-bold text-slate-900 text-sm">學區劃分與改分發學校</h4>
          <p class="text-slate-500 text-xs mt-1 leading-relaxed">
            含民富、磐石、新雅單一學區，及 115 新增之北門里共同學區與虎林、成德、光華等改分發學校清單。
          </p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black mb-3">4</div>
          <h4 class="font-bold text-slate-900 text-sm">115學年度重要日程表</h4>
          <p class="text-slate-500 text-xs mt-1 leading-relaxed">
            3/14 現場資格審查、3/23 放榜、3/30~4/4 線上報到、4/15 備取遞補、5/30 學力測驗之完整時程。
          </p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black mb-3">5</div>
          <h4 class="font-bold text-slate-900 text-sm">歷年設籍門檻數據</h4>
          <p class="text-slate-500 text-xs mt-1 leading-relaxed">
            收錄 111~114 各學年核定班級數、最低錄取順位、第四順位設籍年限與歷年就讀年級大數據。
          </p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-black mb-3">6</div>
          <h4 class="font-bold text-slate-900 text-sm">家長在線提問紀錄簿</h4>
          <p class="text-slate-500 text-xs mt-1 leading-relaxed">
            自動收集家長以 <code>#提問</code> 送出之諮詢工單、諮詢單號、提問時間、LINE 辨識碼與承辦人處理狀態。
          </p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black mb-3">7</div>
          <h4 class="font-bold text-slate-900 text-sm">待補充問題庫</h4>
          <p class="text-slate-500 text-xs mt-1 leading-relaxed">
            自動記錄機器人無法判別之問題或高頻率諮詢原句，提供註冊組作為每週擴充知識庫依據。
          </p>
        </div>

        <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div class="text-xs font-bold text-emerald-400 mb-1">本機 Excel 實體檔案</div>
            <h4 class="font-bold text-white text-sm">已生成 XLSX 格式</h4>
            <p class="text-slate-300 text-xs mt-1">
              已同步存放至雲端硬碟「總量管制相關資料」與專案根目錄，可直接上傳建立 Google 試算表。
            </p>
          </div>
          <div class="pt-3 text-[10px] text-slate-400 flex items-center space-x-1">
            <i class="fa-solid fa-file-excel text-emerald-400"></i>
            <span>竹光國中115學年度總量管制知識庫.xlsx</span>
          </div>
        </div>

      </div>

    </div>
  </section>

  <!-- 前後端完整程式碼展示與雙切換複製區塊 (#deploy) -->
  <section id="deploy" class="py-16 sm:py-24 bg-slate-900 text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 mb-2">
            <i class="fa-solid fa-code"></i>
            <span>100% Full Production Source Code</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black">前後端完整代碼與雙頁籤一鍵複製</h2>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            提供 Google Apps Script 後端（Code.gs）與管理控制台前端（index.html）完整原始碼，絕無省略符號，點擊按鈕即可完整複製到剪貼簿！
          </p>
        </div>

        <!-- 雙切換頁籤按鈕群 -->
        <div class="flex items-center space-x-2 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
          <button 
            id="tabBtnBackend"
            onclick="switchCodeTab('backend')"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 bg-emerald-600 text-white shadow-xs"
          >
            <i class="fa-brands fa-google"></i>
            <span>後端核心 Code.gs (468行)</span>
          </button>
          <button 
            id="tabBtnFrontend"
            onclick="switchCodeTab('frontend')"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <i class="fa-brands fa-html5"></i>
            <span>前端控制台 index.html (184行)</span>
          </button>
        </div>
      </div>

      <!-- 程式碼外框容器 -->
      <div class="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        
        <!-- 頂部操作控制列 -->
        <div class="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center space-x-3">
            <div class="flex space-x-1.5">
              <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span id="codeFileBadge" class="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
              Code.gs (Google Apps Script)
            </span>
            <span id="codeStatusNotice" class="text-[11px] text-emerald-400 hidden sm:inline-block">
              <i class="fa-solid fa-circle-check mr-1"></i>全量 468 行完整代碼（含 RAG、自動建表、#記住 動態寫入）
            </span>
          </div>

          <!-- 一鍵複製功能按鈕組 -->
          <div class="flex items-center space-x-2">
            <button 
              id="copyCurrentBtn"
              onclick="copyActiveCode()"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <i class="fa-regular fa-copy"></i>
              <span id="copyBtnLabel">一鍵複製完整 Code.gs</span>
            </button>
          </div>
        </div>

        <!-- 代碼內容滾動展示區塊 (後端 Code.gs) -->
        <div id="codeBlockBackend" class="p-6 max-h-[500px] overflow-y-auto custom-scrollbar font-mono text-xs text-slate-300 bg-[#0b0f19]">
          <pre class="whitespace-pre"><code>__ESCAPED_CODE_GS__</code></pre>
        </div>

        <!-- 代碼內容滾動展示區塊 (前端 index.html) -->
        <div id="codeBlockFrontend" class="p-6 max-h-[500px] overflow-y-auto custom-scrollbar font-mono text-xs text-slate-300 bg-[#0b0f19] hidden">
          <pre class="whitespace-pre"><code>__ESCAPED_GAS_INDEX__</code></pre>
        </div>

      </div>

      <!-- GAS 部署三步指引 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div class="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl">
          <div class="flex items-center space-x-2 text-emerald-400 text-xs font-bold mb-2">
            <span class="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">1</span>
            <span>建立 Google Apps Script</span>
          </div>
          <p class="text-slate-300 text-xs leading-relaxed">
            前往 script.google.com 建立新專案，將 <code>Code.gs</code> 原始碼完整貼入，填入您的 LINE Channel Access Token 與 Google Sheet 試算表 ID。
          </p>
        </div>
        <div class="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl">
          <div class="flex items-center space-x-2 text-blue-400 text-xs font-bold mb-2">
            <span class="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">2</span>
            <span>一鍵自動初始化資料庫</span>
          </div>
          <p class="text-slate-300 text-xs leading-relaxed">
            在 GAS 編輯器上方函式選取 <code>initQuotaKnowledgeBaseSheet</code> 並點擊執行，系統將自動在您的 Google 試算表中建立全部 7 大工作表並預填完整法規與題庫！
          </p>
        </div>
        <div class="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl">
          <div class="flex items-center space-x-2 text-amber-400 text-xs font-bold mb-2">
            <span class="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">3</span>
            <span>部署為 Web 應用程式</span>
          </div>
          <p class="text-slate-300 text-xs leading-relaxed">
            點擊「部署」➔「新增部署作業」➔ 選取「網路應用程式」，存取權限設為「所有人 (Anyone)」，產出的網址即為 LINE Developers 中的 Webhook URL。
          </p>
        </div>
      </div>

    </div>
  </section>

  <!-- 頁尾宣告 -->
  <footer class="bg-slate-950 text-slate-500 py-12 border-t border-slate-800 text-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
      <div class="flex items-center justify-center space-x-2 text-slate-400 font-medium">
        <span>新竹市立竹光國民中學 教務處註冊組 115學年度總量管制專用</span>
        <span>•</span>
        <span>電話：(03) 524-6683 分機 613</span>
      </div>
      <p class="text-slate-600 max-w-xl mx-auto">
        本專案由 陳乃誠（大乃老師）設計架構 · 專為全台教育現場打造之招生總量限制諮詢模版。
        資料庫支援 Google 試算表 (Google Sheets) 零快取即時更新，支援前端以 #記住 動態寫入擴充。
      </p>
      <div class="pt-2 text-slate-700">
        MIT License · Powered by Google Apps Script & Netlify
      </div>
    </div>
  </footer>

  <!-- 提示 Toast -->
  <div id="toast" class="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center space-x-2.5 transition-all duration-300 opacity-0 pointer-events-none translate-y-2">
    <i class="fa-solid fa-circle-check text-emerald-400 text-base"></i>
    <span id="toastMsg" class="text-xs font-semibold">已成功複製到剪貼簿！</span>
  </div>

  <!-- 隱藏原生代碼存放區 (避免 JS script 標籤與 </script> 衝突，並保留 100% 原始格式) -->
  <textarea id="rawCodeGsStorage" style="display:none;">__ESCAPED_CODE_GS__</textarea>
  <textarea id="rawGasIndexStorage" style="display:none;">__ESCAPED_GAS_INDEX__</textarea>

  <!-- 模擬器與互動邏輯 JS -->
  <script>
    let activeCodeTab = 'backend';

    function getActiveCodeText() {
      if (activeCodeTab === 'backend') {
        return document.getElementById('rawCodeGsStorage').value;
      } else {
        return document.getElementById('rawGasIndexStorage').value;
      }
    }

    function switchCodeTab(tab) {
      activeCodeTab = tab;
      const btnBackend = document.getElementById('tabBtnBackend');
      const btnFrontend = document.getElementById('tabBtnFrontend');
      const blockBackend = document.getElementById('codeBlockBackend');
      const blockFrontend = document.getElementById('codeBlockFrontend');
      const fileBadge = document.getElementById('codeFileBadge');
      const label = document.getElementById('copyBtnLabel');
      const notice = document.getElementById('codeStatusNotice');

      if (tab === 'backend') {
        btnBackend.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 bg-emerald-600 text-white shadow-xs';
        btnFrontend.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300';
        blockBackend.classList.remove('hidden');
        blockFrontend.classList.add('hidden');
        fileBadge.textContent = 'Code.gs (Google Apps Script)';
        label.textContent = '一鍵複製完整 Code.gs';
        notice.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i>全量 468 行完整代碼（含 RAG、自動建表、#記住 動態寫入）';
      } else {
        btnBackend.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300';
        btnFrontend.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 bg-blue-600 text-white shadow-xs';
        blockBackend.classList.add('hidden');
        blockFrontend.classList.remove('hidden');
        fileBadge.textContent = 'index.html (GAS 前端管理介面)';
        label.textContent = '一鍵複製完整 index.html';
        notice.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i>全量 184 行完整代碼（含即時搜尋、分類篩選、GAS 橋接）';
      }
    }

    function copyActiveCode() {
      const textToCopy = getActiveCodeText();
      const fileName = activeCodeTab === 'backend' ? 'Code.gs' : 'index.html';
      
      // 複製功能相容支援
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast('已成功複製完整 ' + fileName + ' 原始碼！');
          temporarilyChangeCopyBtnText('已複製！');
        }).catch(() => {
          fallbackCopyText(textToCopy, fileName);
        });
      } else {
        fallbackCopyText(textToCopy, fileName);
      }
    }

    function fallbackCopyText(text, fileName) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        showToast('已成功複製完整 ' + fileName + ' 原始碼！');
        temporarilyChangeCopyBtnText('已複製！');
      } catch (err) {
        showToast('複製失敗，請手動全選複製區塊');
      }
      document.body.removeChild(textArea);
    }

    function temporarilyChangeCopyBtnText(text) {
      const label = document.getElementById('copyBtnLabel');
      const origin = activeCodeTab === 'backend' ? '一鍵複製完整 Code.gs' : '一鍵複製完整 index.html';
      label.textContent = text;
      setTimeout(() => {
        label.textContent = origin;
      }, 2500);
    }

    // 預設的情境劇本
    const SCENARIOS = {
      parent: {
        title: '點選測試 家長常見諮詢情境：',
        desc: '針對新生家長每年最容易焦慮、打爆總機的 4 大核心問題，點擊即時體驗回答：',
        botName: '竹光 115 總量管制諮詢助手',
        prompts: [
          {
            btnText: '順位試算：我有自有房屋所有權狀，算第幾順位？',
            userText: '老師您好，我們家住在民富里，房子是我們夫妻自有的，有房屋所有權狀，小孩是民富國小畢業，請問這樣是第幾順位？',
            botReply: '您好！為您試算錄取順位：\\n\\n🎯【判定結果：第二順位】\\n━━━━━━━━━━━━━━\\n• 學生為新竹市轄內國小畢業生\\n• 設籍於竹光學區（民富里）且與直系親屬同戶\\n• 檢附自有房屋所有權狀（或當年度房屋稅籍證明）\\n• 簽具家訪同意書\\n\\n依規定列為【第二順位】！3/14 (六) 現場審核登記請備妥全戶戶籍謄本正本、房屋權狀影本與黃單登記表。'
          },
          {
            btnText: '租屋規定：只有「未經公證的租約」，算第幾順位？能登記嗎？',
            userText: '請問我們是在竹光學區租房子，房東不願意去法院公證，只有一般的租賃契約，這樣可以登記嗎？會排在第幾順位？',
            botReply: '家長您好，請放心！\\n\\n📋【判定結果：第四順位】\\n━━━━━━━━━━━━━━\\n依本校 115 學年度總量管制入學作業規定：\\n• 只要戶籍符合規定（學生設籍學區且直系親屬同戶），即可進行新生登記！\\n• 若僅提供「未經法院公證之租賃契約」（租期須涵蓋 115/3/14 至 115/9/1 開學日，承租人為直系尊親屬），並簽具家訪同意書，將列為【第四順位】！\\n\\n💡 提示：若能補辦「法院公證租約」，順位即可升級為【第二順位】喔！'
          },
          {
            btnText: '設籍門檻：設籍大約要滿幾年才排得上？（歷年數據）',
            userText: '請問註冊組，我家小孩大約要設籍滿幾年才排得上竹光國中？很擔心排不進去！',
            botReply: '家長您好！每年報名人數與學區新生人數不同，實際錄取截止日需待 3/14 登記審查排序後才能確定。\\n\\n📊【提供歷年第四順位設籍門檻參考】：\\n• 111 學年度：錄取至設籍 5 年 (約國小二年級設籍)\\n• 112 學年度：錄取至設籍 4 年 (約國小三年級設籍)\\n• 113 學年度：錄取至設籍 8 年 (約幼兒園大班設籍)\\n• 114 學年度：錄取至設籍 2 年 (約國小五年級設籍)\\n\\n先比順位，同順位再比設籍時間早晚！若最後一名同日遷入者，以有兄姊在校者優先，條件相同則公開抽籤。'
          },
          {
            btnText: '設籍計算：之前學區內搬家能累計嗎？中途遷出怎麼算？',
            userText: '我們以前住在境福里，前年搬到磐石里，這樣設籍時間可以合併算嗎？如果是搬去金雅里再搬回來呢？',
            botReply: '設籍時間計算標準如下：\\n\\n🏡【學區內搬家 ➔ 時間可連續累計】：\\n境福里與磐石里皆屬竹光學區，同一學區內之遷移，居住時間「得以累計」！\\n\\n⚠️【中途遷出學區 ➔ 設籍日重新計算】：\\n若中途曾遷出學區（如遷至金雅里），再遷回本學區，則依規定「以最後一次遷入本學區日期為設籍日」（無法累計前段時間）！'
          }
        ]
      },
      admin: {
        title: '點選測試 註冊組法規與行政處置情境：',
        desc: '審查現場常見的爭議查核、法規條文與行政流程 SOP：',
        botName: '竹光 總量管制法規查核助手',
        prompts: [
          {
            btnText: '⚡ 前端動態新增：#記住 [問題] [回答] (直接寫入試算表)',
            userText: '#記住 雙胞胎同班申請 可以在3/14現場資格審核登記時，於入學登記表黃單背面直接勾選申請同班或不同班！',
            botReply: '✅【已成功為您記住並寫入 Google 試算表！】\\n━━━━━━━━━━━━━━\\n• 題目關鍵字：雙胞胎同班申請\\n• 回覆內容：可以在3/14現場資格審核登記時，於入學登記表黃單背面直接勾選申請同班或不同班！\\n• 儲存位置：Google 試算表「總量管制Q&A知識庫」\\n\\n💡 下次家長或同仁在 LINE 提問「雙胞胎同班申請」，小幫手將即時採用此內容回答！'
          },
          {
            btnText: '共同學區：北門里/新雅里19鄰想同時登記兩校之規定？',
            userText: '同仁請教：家長戶籍在北門里（竹光、光華、建華共同學區），如果想同時去光華國中和竹光國中登記，規定是怎樣？',
            botReply: '⚖️【共同學區雙總量國中登記作業要點】：\\n━━━━━━━━━━━━━━\\n1. 本校與光華、建華為共同學區（北門里 115 新增），排序基準點與單一學區完全相同（先比順位，同順位比設籍時間）。\\n2. 若共同學區包含另一所總量管制學校，家長【可以兩所都登記】！\\n3. ⚠️ 關鍵時效：家長必須在【115年3月12日(四)前】，自行向另一所總量國中提出登記申請！\\n4. 共同學區未獲錄取者，依家長意願改分發至該共同學區之他校。'
          },
          {
            btnText: '同日遷入：同日設籍抽籤與多胞胎錄取規定？',
            userText: '註冊組請示：若剛好第12班最後一名錄取生，有2位以上學生同日遷入學區，排序標準？如果是雙胞胎呢？',
            botReply: '📌【同順位同日遷入與多胞胎作業規定】：\\n━━━━━━━━━━━━━━\\n• 同日排序依據：最後一名如有二人以上同日遷入學區者，以【有兄姊就讀本校者為優先】；若條件仍相同，採【公開抽籤】決定！\\n\\n👥【多胞胎手足保障條款】：\\n若最後一名錄取學生為多胞胎之一者，其多胞胎手足【隨同該生以外加名額就讀本校】！保障家庭手足同校就讀權利。'
          },
          {
            btnText: '審查查驗：3/14 現場資格審核應備證件與查驗要點？',
            userText: '審查委員您好，3/14 上午現場收件審核時，我們針對戶籍與居住證明需查核哪些核心要件？',
            botReply: '📋【3/14 現場審查查驗核心 SOP】：\\n━━━━━━━━━━━━━━\\n1. 黃單檢查：背面入學登記表各欄、家訪同意書須完成簽名。\\n2. 戶籍查驗（必要）：\\n   • 必須具備三個月內全戶謄本正本 或 新式戶口名簿正影本。\\n   • 檢視是否具【詳細記事】、學生是否與【直系尊親屬同戶】。無直系同戶者連順位都沒有！\\n3. 居住證明（順位判定）：\\n   • 自有：建物所有權狀 或 115房屋稅籍證明（第2/3順位）。\\n   • 租賃：公證租約（第2/3順位）或未公證租約（第4順位），租期須涵蓋 115/3/14～9/1，承租人須為直系尊親屬。\\n4. 空戶查訪標記：若同址設籍兩位以上非親屬新生，送入學委員會列為居住事實查核名單！'
          },
          {
            btnText: '未錄取改分發：未錄取名冊後續函送學校與時程？',
            userText: '註冊組行政處置：未錄取學生名冊何時函送各改分發學校？改分發學校包含哪些？',
            botReply: '🏫【未錄取改分發行政處置時程】：\\n━━━━━━━━━━━━━━\\n1. 改分發學校清單：\\n   • 單一學區未錄取生：依家長於黃單登記表勾選之意願，改分發至【虎林、成德、光華、育賢、建華國中】。\\n   • 共同學區未錄取生：改分發至該共同學區之他校。\\n2. 行政作業時程：\\n   • 115/4/17(一)前：竹光國中函送改分發名冊至各改分發國中。\\n   • 115/4/20(一)前：由各改分發國中端主動寄發新生入學通知書。\\n   • 115/5/03(六)：一般國中新生報到日。'
          }
        ]
      }
    };

    let currentMode = 'parent';

    function switchSimMode(mode) {
      currentMode = mode;
      const data = SCENARIOS[mode];

      document.getElementById('promptTitle').innerHTML = `
        <i class="fa-solid fa-circle-question ${mode === 'parent' ? 'text-emerald-400' : 'text-blue-400'} mr-2"></i>
        ${data.title}
      `;
      document.getElementById('promptDesc').textContent = data.desc;
      document.getElementById('simBotName').textContent = data.botName;

      // 標籤樣式切換
      if (mode === 'parent') {
        document.getElementById('simTabParent').className = 'px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 bg-[#06C755] text-white shadow-md';
        document.getElementById('simTabAdmin').className = 'px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 text-slate-400 hover:text-white';
        document.getElementById('simAvatar').className = 'w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-white text-sm shadow-xs font-bold';
      } else {
        document.getElementById('simTabParent').className = 'px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 text-slate-400 hover:text-white';
        document.getElementById('simTabAdmin').className = 'px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 bg-blue-600 text-white shadow-md';
        document.getElementById('simAvatar').className = 'w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shadow-xs font-bold';
      }

      renderPromptButtons();
      resetChatMessages();
    }

    function renderPromptButtons() {
      const container = document.getElementById('promptButtonsContainer');
      container.innerHTML = '';
      const data = SCENARIOS[currentMode];

      data.prompts.forEach((p) => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/50 text-xs text-white transition flex items-center justify-between group active:scale-[0.99]';
        btn.innerHTML = `
          <span class="font-medium text-slate-200 group-hover:text-white flex items-center">
            <i class="fa-regular fa-comment-dots mr-2.5 ${currentMode === 'parent' ? 'text-emerald-400' : 'text-blue-400'}"></i>${p.btnText}
          </span>
          <i class="fa-solid fa-chevron-right text-slate-500 text-[10px] group-hover:translate-x-1 transition"></i>
        `;
        btn.onclick = () => triggerChatMessage(p.userText, p.botReply);
        container.appendChild(btn);
      });
    }

    function resetChatMessages() {
      const chat = document.getElementById('chatMessages');
      chat.innerHTML = `
        <div class="text-center my-2">
          <span class="bg-black/20 backdrop-blur-xs text-white/90 text-[10px] px-3 py-1 rounded-full">
            115 年 3 月 14 日 星期六
          </span>
        </div>
        <div class="flex items-start space-x-2">
          <div class="w-7 h-7 rounded-full ${currentMode === 'parent' ? 'bg-[#06C755]' : 'bg-blue-600'} text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs font-bold">
            <i class="fa-brands fa-line"></i>
          </div>
          <div class="max-w-[82%]">
            <div class="chat-bubble-received p-3 text-slate-800 space-y-2 leading-relaxed text-[11px] shadow-sm">
              <p class="font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                🏫 ${currentMode === 'parent' ? '家長您好！我是竹光國中 115學年度總量管制智慧諮詢小幫手。' : '同仁您好！我是註冊組 115 總量管制法規查核與審查指引助手。'}
              </p>
              <p>
                已成功連線 Google 試算表雲端大腦！您可點選左側範例，或直接在下方輸入關鍵字或以「#提問」諮詢！
              </p>
            </div>
            <span class="text-[9px] text-white/70 ml-1 mt-0.5 block">09:41</span>
          </div>
        </div>
      `;
    }

    function triggerChatMessage(userText, botReply) {
      const chat = document.getElementById('chatMessages');

      // 1. 新增使用者訊息氣泡
      const userBubble = document.createElement('div');
      userBubble.className = 'flex items-end justify-end space-x-1';
      userBubble.innerHTML = `
        <span class="text-[9px] text-white/70 mb-1">已讀</span>
        <div class="max-w-[80%] chat-bubble-sent p-3 text-slate-900 leading-relaxed text-[11px] shadow-sm">
          ${userText.replace(/\\n/g, '<br>')}
        </div>
      `;
      chat.appendChild(userBubble);
      chat.scrollTop = chat.scrollHeight;

      // 2. 顯示打字中動畫
      const indicator = document.getElementById('typingIndicator');
      indicator.classList.remove('hidden');

      // 3. 模擬機器人 600ms 後回覆
      setTimeout(() => {
        indicator.classList.add('hidden');

        const botBubble = document.createElement('div');
        botBubble.className = 'flex items-start space-x-2';
        botBubble.innerHTML = `
          <div class="w-7 h-7 rounded-full ${currentMode === 'parent' ? 'bg-[#06C755]' : 'bg-blue-600'} text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs font-bold">
            <i class="fa-brands fa-line"></i>
          </div>
          <div class="max-w-[85%]">
            <div class="chat-bubble-received p-3 text-slate-800 leading-relaxed text-[11px] shadow-sm space-y-1.5 whitespace-pre-line">
              ${botReply.replace(/\\n/g, '<br>')}
            </div>
            <span class="text-[9px] text-white/70 ml-1 mt-0.5 block">剛剛</span>
          </div>
        `;
        chat.appendChild(botBubble);
        chat.scrollTop = chat.scrollHeight;

        // 灑花特效
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 25,
            spread: 60,
            origin: { y: 0.85 }
          });
        }
      }, 650);
    }

    function triggerCustomKeyword(kw) {
      document.getElementById('simInputText').value = kw;
      handleUserInput();
    }

    function handleUserInput() {
      const input = document.getElementById('simInputText');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      // 智慧比對回答
      const reply = generateSmartAnswer(text);
      triggerChatMessage(text, reply);
    }

    // 動態記憶庫 (支援前端 #記住 即時寫入並即時生效)
    const dynamicMemory = [];

    // 共用比對引擎與知識庫（build_site.py 從 kb_matcher.js / knowledge_base.json 注入，與 Code.gs 完全同一份）
__KB_MATCHER_JS__
    const KB_ROWS = __KB_QA_JSON__;

    function generateSmartAnswer(text) {
      const t = text.trim();

      // 1. #記住 / #新增 / #記憶：即時寫入前端記憶（模擬試算表 appendRow）
      if (/^[#＃](記住|新增|記憶)/.test(t)) {
        const rawContent = t.replace(/^[#＃](記住|新增|記憶)\\s*/, '').trim();
        if (!rawContent) {
          return '💡【#記住 指令使用說明】：\\n請輸入「#記住 [問題或關鍵字] [回答內容]」\\n\\n例如：\\n#記住 雙胞胎同班申請 可以在3/14現場登記時於黃單背面直接勾選同班或不同班！\\n\\n小幫手將為您同步寫入 Google 試算表，隨後家長提問即可秒速解答！';
        }
        let question = '', answer = '';
        if (rawContent.includes('\\n')) {
          const parts = rawContent.split('\\n');
          question = parts[0].trim();
          answer = parts.slice(1).join('\\n').trim();
        } else {
          const spaceIdx = rawContent.search(/[\\s　]+/);
          if (spaceIdx > 0) {
            question = rawContent.substring(0, spaceIdx).trim();
            answer = rawContent.substring(spaceIdx).trim();
          } else {
            return '⚠️ 請以「空格」或「換行」分開問題與回答內容！\\n例如：#記住 制服去哪買 開學前可至合作社或特約門市購買。';
          }
        }
        if (!question || !answer) return '⚠️ 請確認已輸入「問題」與「回答內容」！\\n格式：#記住 [問題] [回答]';
        dynamicMemory.push({ id: 'M' + (dynamicMemory.length + 1), category: 'LINE前端新增', keywords: question, question: question, answer: answer, status: 'Y' });
        return '✅【已成功為您記住並寫入 Google 試算表！】\\n━━━━━━━━━━━━━━\\n• 題目關鍵字：' + question + '\\n• 回覆內容：' + answer + '\\n• 儲存位置：Google 試算表「總量管制Q&A知識庫」\\n\\n💡 現在您可以直接在輸入框輸入「' + question + '」，小幫手已經學會並會立即回答這題囉！';
      }

      // 2. #提問 / #留言 / #諮詢
      if (/^[#＃](提問|留言|諮詢)/.test(t)) {
        const query = t.replace(/^[#＃](提問|留言|諮詢)\\s*/, '').trim();
        const randomNo = 'Q' + Math.floor(100000 + Math.random() * 900000);
        return '📝【已為您登錄家長在線諮詢工單】\\n━━━━━━━━━━━━━━\\n• 諮詢單號：' + randomNo + '\\n• 提問內容：' + (query || '個人戶籍審查諮詢') + '\\n• 記錄位置：Google 試算表「家長在線提問紀錄簿」\\n• 處理狀態：待查覆 (已同步通知註冊組同仁)\\n\\n同仁將儘速為您查核法規，您亦可於上班時間致電：(03) 524-6683 #613 洽詢！';
      }

      // 3. 官方知識庫 + #記住 新增列，同一套加權比對（與 Code.gs findAnswerFromGoogleSheet 一致）
      const hit = kbMatch(t, KB_ROWS.concat(dynamicMemory));
      if (hit) return hit.answer;

      return '您好！我是【竹光國中 115學年度總量管制智慧小幫手】。\\n\\n您可嘗試詢問：\\n• 「總量管制有哪些順位？」\\n• 「租約沒公證算第幾順位？」「沒有租約算第幾順位？」\\n• 「第四跟第五順位差在哪？」\\n• 「設籍大約幾年能錄取？」\\n• 「3/14 登記要帶什麼證件？」\\n• 「北門里算竹光學區嗎？」\\n• 「沒錄取會改分發去哪裡？」\\n• 或輸入「#記住 [題目] [回答]」新增知識庫！\\n• 或輸入「#提問 [內容]」登記在線諮詢！\\n\\n亦可致電註冊組：(03) 524-6683 #613 洽詢！';
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
      toast.classList.add('opacity-100', 'translate-y-0');

      setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
      }, 3000);
    }

    // 初始化載入
    document.addEventListener('DOMContentLoaded', () => {
      renderPromptButtons();
      resetChatMessages();
    });
  </script>
</body>
</html>
"""

# 安全替換佔位符
final_html = html_template.replace('__ESCAPED_CODE_GS__', escaped_code_gs)
final_html = final_html.replace('__ESCAPED_GAS_INDEX__', escaped_gas_index)
# 模擬器：注入共用引擎與 Q&A（</script> 防呆：JSON 內不可出現 "</"）
sim_rows = [{k: r[k] for k in ('id', 'category', 'keywords', 'question', 'answer', 'status')} for r in KB['qa']]
kb_json = json.dumps(sim_rows, ensure_ascii=False).replace('</', '<\\/')
final_html = final_html.replace('__KB_MATCHER_JS__', matcher_js_gas)
final_html = final_html.replace('__KB_QA_JSON__', kb_json)

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    f.write(final_html)

print(f"✅ 成功生成 index.html！Q&A {len(KB['qa'])} 題已同步注入 Code.gs 與模擬器")
print(f"   後端代碼長度：{len(code_gs_content)} 字元 ({len(code_gs_content.splitlines())} 行)")
print(f"   前端代碼長度：{len(gas_index_content)} 字元 ({len(gas_index_content.splitlines())} 行)")
print(f"   產出 index.html 檔案大小：{len(final_html)} 位元組")
