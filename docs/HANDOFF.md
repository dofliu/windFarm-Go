# 交接紀錄 — Session Handoff

> 給下一個開發 session 的快速接手筆記。最後更新:**2026-06-29**。
> 完整藍圖見 [ROADMAP.md](ROADMAP.md);專案現況見 `../STATUS.yaml`;測試紀錄見 [TEST_REPORT.md](TEST_REPORT.md)。

## 目前狀態
- `main` 為最新;所有功能皆已合併。`npm test` = **148 全綠**,typecheck / build 乾淨。
- 開發分支:`claude/beautiful-thompson-nz0uxo`(每次 PR 後 reset 同步至 origin)。

## 本階段(近期)已完成
1. **故事/內容**:7 issue(A–G)、真實+擬真案例 **24 則**(可在自由營運中心任務清單以「案例演練」自然出現、略過 Tier)、HSE 科別加厚(LOTO/墜落防護/SIMOPS)、直升機進場/電網限電權衡任務(判斷任務共 **159**)。
2. **手機**:全 App 手機直向專屬精簡版面(母港+交易所+出海+維修+所有彈窗),`useIsMobile()` 自動偵測;桌機/橫向維持原 1600×900 舞台。頂列導覽分頁。
3. **穩定性**:PWA 防更新後空白 —— SW 快取版本化(目前 **v5**)、ErrorBoundary、index.html 啟動安全網。
4. **WM3 評估報告建議(免後端部分全數完成)**:
   - 能力雷達圖(個人檔案頁,3.1)
   - 錯題本 + 維修檢討反思(3.3)
   - 母港建設・視覺成長(🏗 設施,2.2)
   - 漸進式揭露強化(Tier 1 隱藏三日預報/技師疲勞,1.2)
   - 生活化比喻(圖鑑 💡,1.2)
   - 戲劇性非技術事件(環團/媒體/社區/稽查,2.2)

## 下一步候選(未做)
### A. 需後端(要先重新部署 Apps Script `docs/leaderboard-appsscript/Code.gs`)
- **教師端個別學生能力雷達鑽取(報告 3.1)**
  - 作法:把 `GameData.mastery` 隨「送分/存檔」一併上雲(`src/cloud/sheet.ts` 的 payload + `Code.gs` 多存一欄 mastery JSON)→ `TeacherModal.tsx` 點學生展開 → 重用 `src/ui/RadarChart.tsx` 畫各科別雷達。
  - 注意:`mastery` 可能偏大,建議只存彙整(各 disc 的 n/ok)而非整包。
- **獨立測驗模式 Exam Mode(報告 3.2)** — 較大里程碑
  - 教師發布測驗(指定情境集)、作答中隱藏即時回饋、結束生成診斷報告並同步教師端;動態參數(數值/價格隨帳號種子變動)防抄襲(已有 `accountSeed()` 可重用)。

### B. 免後端(隨時可做)
- 母港 `PortScene` 疊到母港實景背景(目前僅在 PortModal 預覽)。
- 教學對話加入更多生活化比喻(目前在圖鑑);更多戲劇事件/限時挑戰。

## 開發備忘
- **每次改版請把 `public/sw.js` 的 `CACHE = "wfg-cache-vN"` 版本號 +1**(避免更新後舊快取殘留造成空白)。
- 新功能務必在 `test/run.mjs` 補對應測試(純資料/reducer 為主);UI 可用無頭瀏覽器截圖驗證(見下)。
- 視覺驗證:`npm run build` → 將 `dist/` 放到 `serve/windFarm-Go/` 以 `python3 -m http.server` 提供 → 用 `playwright-core` + 預裝 Chromium(`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`)截圖(390×844 模擬手機);guest 存檔 key = `windfarm-go-save::/guest1`。
- 指令:`npm test`(單元 148)、`npm run sim`(平衡)、`npm run stress`(併發)、`npm run build`、`npm run live-check`(線上後端,需本機跑;沙盒代理擋 script.google.com)。
