# 交接紀錄 — Session Handoff

> 給下一個開發 session 的快速接手筆記。最後更新:**2026-07-14**。
> 完整藍圖見 [ROADMAP.md](ROADMAP.md);設計權威版見 [GAME_DESIGN.md](GAME_DESIGN.md)(§17 出海決策/§18 人力・軸承/§19 測驗・掌握度・母港);專案現況見 `../STATUS.yaml`。
> 測試數以 `npm test` 實跑為準(目前 **164**);判斷任務題數以 `TASKS.length` 為準(**192**)。

## 目前狀態
- `main` 為最新;所有功能皆已合併(最新:**PR #117**)。`npm test` = **164 全綠**,`npm run typecheck` / `npm run build` 乾淨。
- `npm run sim`(平衡)、`npm run stress`(併發)皆通過。⚠ `npm run sim` 的**絕對數字**會隨故障/備品/任務資料變動而整段跳動(見下「模擬器蝴蝶效應」),回測時只需確認**相對排序**(passive ≪ active < full-crew)與梯度健康,不必追求絕對值穩定。
- 開發分支:**`claude/wind-farm-game-dev-ik3kt7`**(每次 PR 合併後從最新 `main` reset 同步,沿用同名分支)。
- GitHub Pages 部署來源已鎖定為 **GitHub Actions**(`deploy.yml` 內 `actions/configure-pages`,`enablement: true`);若日後又被誤切回「Deploy from a branch」,下次部署會自動修正。**切勿用 Actions 頁面的「Re-run」重跑 Pages 部署**(會觸發「重複 github-pages artifact」錯誤);要重部署請用 `Run workflow` 開新的一次。

## 最近兩輪已完成 — Recently shipped

### PR #116 — 邏輯完整性(把「純展示」事件接上機制)
1. **人力短缺/罷工事件實效化(#crew,`crewShortfallJobs`/`effectiveJobCapOf`)**:`crew_shortage`(−3)/`strike`(−6) 原本只調整展示用 `techAvail`,`OPS_DISPATCH`/`OPS_INSPECT` 不讀 → 事件形同純展示。現在缺工**直接折抵戰情室「可同時開的現場作業面」**:`effectiveJobCapOf = max(1, jobCapOf − ⌈(techTotal−techAvail)/CREW_PER_JOB⌉)`(`CREW_PER_JOB=4`)。滿編不懲罰、下限 1(短手仍可派一組、遠端重啟不占名額、主線不受限)、每日休整回復;開局改滿編 30/30、tech 升級同步 techAvail;`FleetOpsModal` 顯示缺工折抵。
2. **軸承備品正名(#bearing,`drive_bearing`)**:主軸承振動(`bearing`)與發電機振動(`gen_vibration`)原本權宜共用「變槳軸承」(`pitch_bearing`)。新增 Tier 3「傳動軸承組(發電機/主軸)」(`drive_bearing`, ◎130 萬)並重新指派,與 Tier 4 主軸承全換(`main_bearing`)語意區隔;新增 `pitch_bearing_wear` 事件讓 `pitch_bearing` 保有真實消費端(呼應 `cs_pitch_bearing_wear` 案例),不成孤兒。

### PR #117 — 三項延伸候選收尾
3. **獨立測驗模式(#exam,`state/exam.ts` + `ui/ExamModal.tsx`)**:跨類別均衡抽題(round-robin、排除需輔助圖者)、固定 10/20 題、**作答不給提示不揭示對錯**,結束才公布 A–F 等第/各類別對錯/錯題覆盤。純函式引擎 `buildExam`(可決定性種子)/`gradeExam`;作答經 **`RECORD_EXAM`** 批次計入掌握度與錯題本,但**不動 xp/answerStreak**(評量與遊戲經濟隔離);最佳成績 `bestExam` 存 records、個人檔案頁顯示。入口在 ⚙ 課程模式。
4. **掌握度雲端同步・教師端個別鑽取(#mastery-cloud)**:存檔上傳夾帶掌握度精簡摘要(`masterySummary`/`parseMasterySummary`,只帶 n>0 的格、`[n,ok]` 元組);`TeacherModal` 點學生列展開,沿用 `masteryRows(disc/cat)` 顯示各科別/類別正確率條。**向後相容**(舊後端不回傳 → 優雅降級)。⚠ **需重新部署後端**:`Code.gs` 已升級 v2.2(`saves` 第 9 欄 `mastery`,`teacher` 回傳),見「後續接續工作」與 [CLOUD_SETUP.md](CLOUD_SETUP.md)。
5. **母港建設疊實境/漫畫背景(#port)**:`PortScene` 依全域背景模式選底——實境→`harbor.jpg`、漫畫→`comic_harbor.jpg`,建設 sprite 疊其上+下半暗化保可讀;模擬維持原 CSS 漸層(向後相容)。App→PortModal→PortScene 傳遞背景模式並顯示提示。

> 驗證:兩輪皆 `npm test`(164)/typecheck/build 通過;PR #117 兩個視覺功能另以 **Playwright + 預裝 Chromium** 端到端截圖實測(測驗跑到結果頁、母港於實境模式疊 `harbor.jpg`)。

---

## 後續接續工作 — Next(給下一個 session)

依「立即可做 → 需後端 → 願景」排序。細節與設計脈絡見 [ROADMAP.md](ROADMAP.md)「後續接續工作」段與 [GAME_DESIGN.md](GAME_DESIGN.md)。

### 立即可做(免後端)
- **戰情室停機折抵「現金」收入的設定開關** — 目前停機只折抵淨發電(少賺+扣分);提供設定把戰情室層也接入售電現金流(需與設計者確認經濟平衡)。
- **每機獨立健康度 / RUL 預測性維護** — 由全場 `fleetHealth` 延伸到每台機組的健康指標與剩餘壽命(Remaining Useful Life)建模,深化 CBM/預測性維護教學。中大型工作,建議先出設計草案再動手。
- **無障礙延伸** — 鍵盤操作(Tab/Enter 走完工單循環)、更全面的色盲友善配色審查、對話/音效字幕與旁白。
- **文件內殘留舊統計校正** — `docs/TEST_REPORT.md`(舊記 140/154 項)、`docs/MANUAL.zh-TW.md`、`docs/WALKTHROUGH.md`(舊記 151 題)為較早快照;本輪已對齊 README/ROADMAP/GAME_DESIGN/STATUS/HANDOFF,這三份下次一併校正為 `npm test`(164)/`TASKS.length`(192)實跑值。

### 需後端(先重新部署 Apps Script `docs/leaderboard-appsscript/Code.gs`)
- **⚠ 啟用教師端掌握度鑽取(唯一的部署待辦)** — client 與 `Code.gs` v2.2 皆已就緒且向後相容,但要讓教師面板**看到鑽取資料**,需把後端更新到 v2.2 並在「管理部署作業 → 編輯 → 版本:**新版本**」重部署(見 [CLOUD_SETUP.md](CLOUD_SETUP.md) v2.2 段)。未部署時前端一切照舊、教師面板顯示「尚無掌握度資料」提示。
- **Exam Mode 進階版(教師發布 + 雲端報告)** — 目前為**本機評量**(不上雲、不影響遊戲分)。進階:教師發布指定測驗、結束生成診斷報告並同步教師端、動態參數(數值/價格隨帳號種子變動)防抄襲(可重用 `accountSeed()`)。
- **掌握度鑽取改雷達視覺** — 教師端目前以長條呈現各科別正確率;可重用 `RadarChart.tsx` 改成能力雷達(與個人檔案頁一致)。

### 願景(未排程 / speculative)
- 多人 / 班級競賽賽季(限時、合作或對抗)、CC0 實體音樂與各地點專屬美術、**內容編輯器**(教師以資料驅動新增故障/題目/週次,免改程式碼)。

---

## 開發備忘 — Dev memos
- **改動 app 程式碼/資產時,把 `public/sw.js` 的 `CACHE = "wfg-cache-vN"` 版本號 +1**(避免更新後舊快取殘留造成空白;目前 **v6**)。純文件變更不需動。
- 新功能務必在 `test/run.mjs` 補對應測試(以純資料/reducer 為主);新 reducer action 也加進 fuzz 動作池(`randomAction`)。純函式引擎(如 `exam.ts`)最好給可決定性種子測試。
- **視覺驗證流程**:`npm run build` → 把 `dist/` 以 symlink 掛成 `<serve>/windFarm-Go/`(base 是 `/windFarm-Go/`)→ `python3 -m http.server` 提供(比 `vite preview` 在無頭瀏覽器下穩) → 用 **`playwright-core`** + 預裝 Chromium(`executablePath: /opt/pw-browsers/chromium-1194/chrome-linux/chrome`,`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`)截圖;`newContext({ serviceWorkers: "block" })` 避免 SW 干擾。guest 登入點「訪客試玩」;背景模式存於 `localStorage['wfg-mode']`(sim/real/comic)。
- 指令:`npm test`(單元 164)、`npm run sim`(平衡)、`npm run stress`(併發)、`npm run build`、`npm run typecheck`、`npm run live-check`(線上後端;沙盒代理擋 script.google.com,需本機跑)。
- **內容資料交叉驗證**:新增/改故障(`incidents.ts`/`faults.ts`)、備品(`data.ts`)、任務(`tasks.ts`)時務必檢查:`part` 是否存在於 `PARTS`、每個備品是否有消費端(避免孤兒)、`discipline` 是否與 UI 一致、`minTier` 是否形成「故障可見但備品鎖住」的閘門矛盾——`test/run.mjs` 已含這套不變式測試(如 incident.part tier ≤ incident tier)。
- **模擬器蝴蝶效應(已知、非迴歸)**:`advance()` 的倉儲折舊迴圈依 `inventory` 物件的**插入順序**逐一擲骰;只要備品 id 集合或順序變,固定種子(`mulberry32(20260622)`)重播的隨機序列就整段分岔,`npm run sim` 絕對數字隨之跳動。回測看**相對排序與梯度**即可。
