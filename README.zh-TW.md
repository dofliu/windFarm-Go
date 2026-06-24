# 離岸風場・運維傳說 — Offshore O&M Legend

[English](README.md) · **繁體中文**

一款《大航海時代》風格的**教學遊戲**，把離岸風場的**運維（O&M）**包裝成航海貿易冒險：駕駛 CTV 出海前往風場、管理備品與天氣窗、登上風機進行故障診斷，並透過遊戲內隨堂測驗學習真實運維知識——同時經營一支活體機隊，**售電收入與妥善率取決於你把多少機組維持在運轉狀態**。

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

## 主要特色

### 玩法循環
- **完整工單循環**：接單 → 備料 → 出勤就緒檢查 → 出海航行 → 登塔 → SCADA 診斷答題 → SOP 步驟 → 完工／多回合大修。
- **出勤就緒閘門** — 不能瞬移到風機：維修需先備妥船舶、對應科別技師、必備備品與天氣窗，並航行抵達（含航行時間、浪高登船延誤）。
- **雙層架構** — 計分的**主線 7 關**（教師按週開放）＋永遠開放的**自由營運沙盒**（無限判斷型狀況、衝排行榜）。
- **風場戰情室（即時營運層）** — 每座風場 **24 台個體機組**；即時派遣技師執行並行工單、遠端重啟軟性故障、執行預防性定檢。
- **首次互動式新手教學** — 助理**莉莉**以手機遊戲式的「聚光燈引導（coach-mark）」（高亮對應按鈕、其餘變暗）帶你走完一次完整工單循環；可跳過，並可從設定（⚙）選單重新播放。

### 經濟系統
- **售電收入與妥善率以同一真實來源計算**：戰情室機隊實際運轉比例 `fleetUptime`。故障／維修中的機組不發電——放著機組不修就是直接少賺錢。
- **季度合約 SLA** — 每季 90 天，平均可用率低於 90% 即罰違約金。
- **必須平衡的營運成本（OPEX）**：技師薪資、倉儲維持費與折舊、停機損失、安裝船待命費（demurrage）、SLA 違約金——對抗售電收入、工單報酬與每台修復報酬。
- **綜合績效分** = 發電量(淨值) + 可用率×5 + 完成任務×30 − 安全事件×20 + 風場×10 − SLA違約×25 + 戰情室修復×8 − 累積停機損失×0.3。
- **多風場拓展**（4 座風場、每座 24 機組）、技師疲勞、船舶磨耗與保養、備品在途／倉儲折舊、突發事件、微觀天氣三日預報、多回合大修等系統。

### 教學設計
- **故障診斷測驗 + SOP** 為學習核心：每個故障 = SCADA 告警 → 4 選 1「最先排查什麼」測驗 → 5 步 SOP（前兩步預設完成：確認天氣窗、LOTO 上鎖）。
- **151 題判斷型任務引擎**，七大類（故障搶修/監控判讀/預防保養/營運決策/天候處置/供應鏈人力/突發），多為取捨題＋教學回饋＋輔助圖（趨勢/頻譜/天氣雷達）。
- **圖鑑**（已修故障複習）、**課程模式**（教師指派某週故障、按週鎖計分主線）、知識點標籤，以及**雲端班級排行榜**（免費免後端，Google Apps Script Web App＋伺服端防作弊）；暱稱＋班級碼登入、每人存檔獨立。
- **中英雙語**、人物對話系統、Web Audio 合成音效音樂。

### 技術
- **三種背景模式** — 模擬（會動 CSS）、實境（照片）、漫畫（大航海插畫）；另有 60° **俯瞰全景**；風機、船舶與變電站逐場景繪製，1600×900 等比舞台。
- 介面為純 DOM/CSS（無遊戲引擎）；美術為 SVG/CSS 圖層加透明 PNG 立繪。

## 技術棧
React 18 + TypeScript + Vite 6 + Tailwind CSS。遊戲狀態為純 reducer（`src/state/game.ts`）；以 localStorage 存檔，可選雲端同步。

## 開發
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 型別檢查 + 正式打包
npm run typecheck  # tsc --noEmit
npm test           # 免相依的遊戲邏輯測試（test/run.mjs）
npm run sim        # 平衡模擬器：passive / active / full-crew 三策略（test/sim.mjs）
```
CI（`.github/workflows/ci.yml`）於每個 PR 對 `main` 跑 `typecheck` + `test` + `build`。

## 專案結構
```
src/
├─ App.tsx                       # 舞台 + 畫面路由
├─ state/
│  ├─ game.ts                    # 核心 reducer：經濟、SLA、機隊、計分
│  ├─ farms.ts                   # 4 座風場 × 每座 24 機組
│  ├─ events.ts / incidents.ts   # 突發事件與故障型錄（戰情室）
│  ├─ tasks.ts                   # 151 題判斷型任務引擎
│  └─ profile.ts / course.ts     # 登入、班級碼、每週開放
├─ ui/
│  ├─ campaign.ts                # 主線 7 關（四幕）
│  ├─ faults.ts                  # 5 種故障：測驗 + SOP + 備品 + 科別
│  ├─ data.ts                    # 交易所備品型錄
│  ├─ screens/                   # 母港 / 交易所 / 出海 / 維修
│  ├─ FleetOpsModal / OpsCenterModal / FacilityModal   # 戰情室、沙盒、設施
│  └─ IntroRunner / TopBar / Portrait / Forecast       # 新手教學、HUD、對話、天氣
├─ cloud/sheet.ts                # Apps Script 排行榜用戶端
public/assets/                   # 角色、場景、音訊
docs/                            # 設計、手冊、藍圖、攻略
```

## 文件
- **[遊戲使用說明手冊（繁中）](docs/MANUAL.zh-TW.md)** — 完整玩法手冊。
- **[未來藍圖規劃 Roadmap](docs/ROADMAP.md)** — 已完成與規劃中的項目。
- **[遊戲設計文件（權威版）](docs/GAME_DESIGN.md)** — 出勤就緒閘門、經濟、KPI、擬真系統。
- **[攻略／教學說明](docs/WALKTHROUGH.md)** — 主線攻略與建議修課評量。
- **[人物](docs/CHARACTERS.md)** · **[排行榜設定](docs/LEADERBOARD_SETUP.md)** · 歷史概念：[GDD.md](docs/GDD.md)。

## 後續工作
未來規劃見 **[docs/ROADMAP.md](docs/ROADMAP.md)**。日常工作項目於 [GitHub Issues](https://github.com/dofliu/windFarm-Go/issues) 追蹤。

## 授權與致謝
程式碼採 [MIT](LICENSE)。素材與字型出處見 [CREDITS.md](CREDITS.md)。
作者：**劉瑞弘（Juihung Liu）** · DOF Lab, NCUT · moredof@gmail.com
