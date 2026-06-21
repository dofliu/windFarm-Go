# 離岸風場・運維傳說 — Offshore O&M Legend

[English](README.md) · **繁體中文**

一款《大航海時代》風格的**教學遊戲**，把離岸風場的**運維（O&M）**包裝成航海貿易冒險：駕駛 CTV 出海前往風場、管理備品與天氣窗、登上風機進行故障診斷，並透過遊戲內隨堂測驗學習真實運維知識。

> 由 **國立勤益科技大學（NCUT）DOF Lab** 製作的教學工具。

▶ **[線上試玩](https://dofliu.github.io/windFarm-Go/)**

![母港大廳](docs/screenshots/01-hub.png)

## 畫面
| | |
|---|---|
| ![交易所](docs/screenshots/02-market.png) | ![出海](docs/screenshots/03-sail.png) |
| **備品交易所** — 風機備品行情與買賣 | **出海航行** — CTV 航行與船況管理 |
| ![維修](docs/screenshots/04-repair.png) | |
| **維修作業** — 故障診斷測驗 + SOP 步驟 | |

## 特色
- **雙層架構** — 計分的**主線 7 關**（教師按週開放）＋永遠開放的**自由營運沙盒**（無限狀況、衝排行榜）。
- **四個互通畫面**：母港大廳、備品交易所、出海航行、維修作業。
- **出勤就緒閘門** — 不能瞬移到風機：維修需先備妥船舶、對應科別技師、必備備品與天氣窗，並航行抵達（含航行時間、浪高登船延誤）。
- **151 題判斷型任務引擎**，七大類（故障搶修/監控判讀/預防保養/營運決策/天候處置/供應鏈人力/突發），多為取捨題＋教學回饋＋輔助圖（趨勢/頻譜/天氣雷達）。
- **多風場營運與突發事件** — 可拓展至 4 座風場（資金＋資歷解鎖）；約 8 種突發事件日推進觸發；**安全 KPI**。
- **船隊/人力/經濟** — CTV／SOV／安裝船(jack-up，重大作業出動)、依科別招募技師、備品到貨前置期與停機成本。
- **三種背景模式** — 模擬（會動 CSS）、實境（照片）、漫畫（大航海插畫）；另有 60° **俯瞰全景**。
- **雲端班級排行榜**（免費免後端）— Google Apps Script Web App＋伺服端防作弊；**暱稱＋班級碼登入**、每人存檔獨立。
- **故障診斷測驗 + SOP**為教學核心、人物對話系統、中英雙語、課程模式、Web Audio 音效音樂、1600×900 等比舞台。

## 技術棧
React + TypeScript + Vite + Tailwind CSS。介面為純 DOM/CSS（無遊戲引擎）；美術為 SVG/CSS 圖層加透明 PNG 立繪。

## 開發
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 型別檢查 + 正式打包
npm run typecheck
```

## 專案結構
```
src/
├─ App.tsx                  # 舞台 + 畫面路由
├─ ui/
│  ├─ TopBar / SceneBackground / Turbine / Portrait   # 共用元件
│  ├─ tokens.ts             # 設計變數（色彩、面板、字型）
│  ├─ characters.ts         # 人物註冊表
│  ├─ data.ts               # 交易所零件 + 維修測驗
│  └─ screens/              # 母港 / 交易所 / 出海 / 維修
├─ game/systems/i18n.ts     # 雙語工具
public/assets/characters/   # 立繪 + 表情集
docs/                       # GDD、schema、設計交付、人物規格
```

## 人物
十位角色（維修／工安／電氣／監控工程師、風場經理與老闆、資深技師、CTV 船長、競爭運維商，以及嚮導少女「莉莉」）。詳見 [docs/CHARACTERS.md](docs/CHARACTERS.md)。

## 設計文件
完整遊戲設計（出勤就緒閘門、船隊/技師/備品、天氣與 KPI）見 **[docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)**。

## 後續工作
工作項目於 [GitHub Issues](https://github.com/dofliu/windFarm-Go/issues) 追蹤。重點：採購結算流程、工單／任務系統、劇情對話腳本、更多角色表情集、UI 轉向後的文件校正。

## 授權與致謝
程式碼採 [MIT](LICENSE)。素材與字型出處見 [CREDITS.md](CREDITS.md)。
作者：**劉瑞弘（Juihung Liu）** · DOF Lab, NCUT · moredof@gmail.com
