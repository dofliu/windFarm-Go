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
- **四個互通畫面**：母港大廳、備品交易所、出海航行、維修作業。
- **七關主線戰役**（四幕）— 連串故障逐步揭露「共用韌體缺陷」真相，以角色對話推進。
- **天氣窗機制** — 海象動態變化；維修有作業窗倒數，答錯/步驟會消耗，窗關閉須撤離。
- **故障診斷隨堂測驗**為教學核心 — SCADA 告警 → 選出「最先排查項」→ 即時回饋。
- **人物／對話系統**：精緻立繪、對話泡泡、可切換表情。
- **中英雙語**：所有介面文字即時切換。
- **課程模式**（教師工具）— 一鍵把某週故障指派為任務，或臨時匯入自訂 JSON 任務。
- **Web Audio 合成音效** ＋靜音開關（無音檔）。
- **金色 × 深海設計系統**，1600×900 舞台等比縮放適應各種視窗。

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
