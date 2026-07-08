# 交接紀錄 — Session Handoff

> 給下一個開發 session 的快速接手筆記。最後更新:**2026-07-08**。
> 完整藍圖見 [ROADMAP.md](ROADMAP.md);設計權威版見 [GAME_DESIGN.md](GAME_DESIGN.md) §17;專案現況見 `../STATUS.yaml`;測試紀錄見 [TEST_REPORT.md](TEST_REPORT.md)(注意:該檔測試數為較早快照,以 `npm test` 實跑為準)。

## 目前狀態
- `main` 為最新;所有功能皆已合併(最新:PR #114)。`npm test` = **154 全綠**,typecheck / build 乾淨。
- `npm run sim`(平衡)、`npm run stress`(併發)皆通過;`npm run sim` 建議在下次改動經濟數值後重跑一次(本輪修正了 sensor/pitch 備品與每日任務發獎時機)。
- 開發分支:`claude/screen-loading-after-update-1wnuss`(每次 PR 合併後從最新 `main` reset 同步)。
- GitHub Pages 部署來源已鎖定為 **GitHub Actions**(`deploy.yml` 內 `actions/configure-pages`,`enablement: true`);若日後又被誤切回「Deploy from a branch」,下次部署會自動修正回來。**切勿用 Actions 頁面的「Re-run」重跑 Pages 部署**——會觸發「重複 github-pages artifact」錯誤,要重部署請用 `Run workflow` 開新的一次。

## 本階段(本輪)已完成

### A. 出海決策支援(讓玩家判斷「出不出海」「要不要撤」)
1. **出海前工期預估 vs 天氣窗**(`SailScreen`):航線/登船/檢查/維修的預估耗時 vs `workWindowMax()`(與現場維修共用同一公式),算出「保留餘裕」;附磨耗/疲勞/天氣窗擇日的判斷提醒。
2. **半途成果保留(#carry,`REPLAN_RETURN`)**:審慎返港 = 進 1 天、不計安全事件、已完成的診斷/SOP 進度保留(擇日續修)。與「作業窗關閉才撤離」(`FAIL_REPAIR` = 進度全失+計安全事件)明確區隔。
3. **加班搶修(#rush,`RUSH_SOP`)**:維修不利時第三選項——剩餘 SOP 一次趕完、耗時減半,但 25%(`RUSH_RISK`)機率安全近失事件。「搶修(快、險)vs 續作(穩)vs 返港(慢、保進度)」三選一。

### B. 學習迴路收斂
4. **任務復盤(#debrief)**:完工給星級(依餘裕/答錯扣星)+ 量化摘要 + 一句 takeaway。
5. **診斷連對 streak(#streak)**:`GameData.answerStreak`,首次作答連對 +1、答錯歸零,每次答對加 XP(封頂 10);維修診斷與營運中心皆顯示 🔥 徽章。
6. **錯題本主動回想**:複習前先自我測驗(隱藏正解、二選一),答完才揭曉正解+教訓再寫檢討——比只看反思更利記憶保留。

### C. 無障礙 + 遊戲手感
7. **減少動態**:`useReducedMotion()` 尊重系統 `prefers-reduced-motion`,個人檔案頁也可手動開關(localStorage 覆寫 + body class);場景影片改靜態首幀、CSS 動畫停用。
8. **色覺友善雙重編碼**:海象預報改圖示(☀/⛅/🌀)、戰情室故障格加 ⚠ 徽章,不只靠顏色。
9. **Juice**:完工/連對里程碑 toast、Toaster 改小佇列(不再互相蓋掉)、TopBar 預算增減短暫變色。
10. **戰情室 SLA 季末風險 + 母港預算續航**提醒(inline,取代純輪播)。

### D. 內容系統全面查核與修正(事件/案例/任務/故障 × 消費端交叉驗證)
11. **每日任務改為日結算**(`DailyDef.deferred`):「零安全事件/健康度/妥善率」等維持型任務原本在 `ROLL_DAILY` 當下即可能為真 → 立即發獎(開局白拿);改為僅在隔日 roll **前**結算,須撐過一整天。
12. **安全事件數夾 0**:`RESOLVE_TASK` 的 `dSafety` 負值(改善型選項)原本可把 `safetyIncidents` 打成負數 → `computeScore` 反向加分,可重複刷分。已夾底。
13. **備品資料修正**:`sensor` 誤耗發電機碳刷→改風速計;`pitch`/`pitch_fault`(quiz/SOP 都在講後備電池)誤耗液壓油→改變槳後備電池。
14. **主線防卡**:交易所預設依 Tier 過濾,但進行中工單的必備備品**永遠可見**。
15. **移除 3 組重複任務模板**(`b_harmonics`/`g_medical_evac`/`c_dehumidify`);1 則案例研究「正解」誤植安全事件已修正;`yaw_motor`/`gen_brush` 展示庫存 0 的誤導修正。
16. **已查核確認乾淨**:quiz 索引、跨檔 id 引用(incidents/faults/cases/parts)、i18n 完整性(zh/en 皆有)、Tier 閘門(無「故障出現但備品鎖住」)、派工守衛一致性、事件權重加總、案例去重。

### E. 部署基礎設施
17. **Pages 部署硬化**:`deploy.yml` 加 `actions/configure-pages`(`enablement: true`)鎖定發佈來源;`concurrency.cancel-in-progress` 改 `false`。修復了「Pages 來源被切回分支模式,線上端出未 build 原始碼(index.html 指向 /src/main.tsx、整頁 404)」的事故。

## 下一步候選(未做,依需要程度排序)

### B1. 設計決定後即可做(免後端)
- **bearing 類故障備品命名/Tier 重新設計** — `bearing`(主軸承振動)與 `gen_vibration`(發電機軸承磨損)目前共用 `pitch_bearing`(變槳軸承,權宜規避 Tier 閘門)。建議新增 Tier 3「發電機/主軸軸承」備品並重新指派 `part`;需確認對 Tier 3 經濟平衡的影響。
- **crew_shortage / strike 事件實效化** — 目前只調整展示用 `techAvail`,`OPS_DISPATCH` 並不讀取此值,事件形同純展示。建議接上技師疲勞加成,或在派工時檢查可用人力上限。
- **文件內殘留的舊統計數字** — `docs/TEST_REPORT.md`(140 項測試)、`docs/MANUAL.zh-TW.md`/`docs/WALKTHROUGH.md`(151 題判斷任務)為較早版本快照,本輪只更新了 README/ROADMAP/GAME_DESIGN/STATUS,這幾份文件下次一併校正為 `npm test`(154)/`TASKS.length`(192)實跑值。
- **平衡回測**——本輪重跑 `npm run sim` 後,`active` 策略的妥善率數字與先前記錄不同(83%→67%)。已確認**非數值失衡**:`advance()` 的倉儲折舊迴圈依 `Object.entries(inventory)` 的**插入順序**逐一擲骰(`Math.random() < SPOIL_CHANCE`),而 sensor/pitch 的備品 id 變更改變了 inventory 物件的 key 順序,連帶讓固定種子(`mulberry32(20260622)`)重播出的隨機序列整段分岔(蝴蝶效應)。三策略排序(passive ≪ active ≪ full-crew)與健康度仍正常,判定為模擬器對「內容資料變更」的已知副作用,非迴歸;下次調整故障/備品資料後,預期 `npm run sim` 的絕對數字仍會因同樣原因跳動,只需確認**相對排序與梯度健康**,不必追求絕對數字穩定。

### 需後端(要先重新部署 Apps Script `docs/leaderboard-appsscript/Code.gs`)
- **教師端個別學生能力雷達鑽取** — 把 `GameData.mastery` 隨送分/存檔上雲(`src/cloud/sheet.ts` payload + `Code.gs` 多存一欄)→ `TeacherModal.tsx` 點學生展開 → 重用 `RadarChart.tsx`。建議只存彙整(各 disc 的 n/ok)而非整包。
- **獨立測驗模式 Exam Mode** — 教師發布測驗、作答中隱藏即時回饋、結束生成診斷報告並同步教師端;動態參數(數值/價格隨帳號種子變動)防抄襲(可重用 `accountSeed()`)。

### 免後端、較小
- 母港 `PortScene` 疊到母港實景背景(目前僅在 PortModal 預覽)。
- 戰情室停機折抵「現金」收入的設定開關(目前只折抵淨發電)。
- 無障礙延伸:鍵盤操作、更全面的色盲友善配色審查、對話/音效字幕。

## 開發備忘
- **每次改版請把 `public/sw.js` 的 `CACHE = "wfg-cache-vN"` 版本號 +1**(避免更新後舊快取殘留造成空白;目前 **v6**)。
- 新功能務必在 `test/run.mjs` 補對應測試(純資料/reducer 為主);新 reducer action 記得也加進 `test/run.mjs` 的 fuzz 動作池(`randomAction`)。
- 視覺驗證:`npm run build` → 將 `dist/` 放到 `serve/windFarm-Go/` 以 `python3 -m http.server` 提供 → 用 `playwright-core` + 預裝 Chromium 截圖;guest 存檔 key = `windfarm-go-save::/guest1`。
- 指令:`npm test`(單元 154)、`npm run sim`(平衡)、`npm run stress`(併發)、`npm run build`、`npm run live-check`(線上後端,需本機跑;沙盒代理擋 script.google.com)。
- 內容資料若新增/修改故障(`incidents.ts`/`faults.ts`)、備品(`data.ts`)或任務模板(`tasks.ts`),務必交叉檢查:`part` 是否存在於 `PARTS`、`discipline` 是否與 UI 呈現一致、`minTier` 是否形成「故障可見但備品鎖住」的閘門矛盾——本輪查核就是靠這套交叉驗證抓到多筆歷史資料誤植。
