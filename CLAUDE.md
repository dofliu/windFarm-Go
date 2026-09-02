# CLAUDE.md — 專案慣例速查

> 給在此專案工作的 Claude Code session。**先讀 [docs/HANDOFF.md](docs/HANDOFF.md)**(目前狀態、自動化排程、開發備忘),再讀 [docs/ROADMAP.md](docs/ROADMAP.md)(待辦與優先序)。設計權威版是 [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md),文件地圖見 [docs/README.md](docs/README.md)。

## 專案是什麼
離岸風場・運維(O&M)教學遊戲,《大航海時代》風格。React 18 + TypeScript + Vite 6 + Tailwind,純 DOM/CSS(無遊戲引擎)。遊戲狀態是純 reducer(`src/state/game.ts`),localStorage 存檔 + 選配 Google Apps Script 雲端。部署於 GitHub Pages。

## 常用指令
```bash
npm run dev        # 開發伺服器 http://localhost:5173
npm run typecheck  # tsc --noEmit
npm test           # 免相依的遊戲邏輯測試(test/run.mjs)
npm run build      # 型別檢查 + 正式打包
npm run e2e        # Playwright UI 迴歸測試(需先 npm run build)
npm run sim        # 平衡模擬器(passive/active/full-crew)
npm run stress     # 雲端後端併發壓測
npm run live-check # 線上後端冒煙測試(沙盒代理擋 script.google.com,需本機跑)
```
**提交前必過**:`npm run typecheck && npm test && npm run build`。動到 UI 互動/焦點行為時,再跑 `npm run e2e`(CI 有獨立 `e2e` job,合併前也必須綠)。

## 硬性規則
- **禁止修改** `src/cloud/sheet.ts` 的 `CLOUD_FIRST` 與 `TEACHER_CODE` — 屬專案擁有者的部署決策。
- **禁止**刪除遠端分支或其他破壞性 git 操作(分支清理已備妥 `scripts/cleanup-merged-branches.sh`,由擁有者自行執行)。
- **禁止**為了讓 CI 變綠而跳過、停用或隔離測試。
- 改動 app 程式碼或資產時,**把 `public/sw.js` 的 `CACHE = "wfg-cache-vN"` 版本號 +1**(避免更新後殘留舊快取造成空白畫面)。純文件變更不用動。

## 開發慣例
- **分支**:從最新 `main` 開短命分支(如 `claude/routine-YYYYMMDD-主題`),PR 進 `main`,合併後即刪。不要長期沿用同一條分支。
- **測試**:新增 reducer action 或純函式邏輯,務必在 `test/run.mjs` 補對應測試;新 action 也加進 fuzz 動作池(`randomAction`)。純函式引擎(如 `exam.ts`)給可決定性種子測試。
- **內容資料交叉驗證**:新增/修改故障(`src/state/incidents.ts`、`src/ui/faults.ts`)、備品(`src/ui/data.ts`)、任務(`src/state/tasks.ts`)時必查:`part` 存在於 `PARTS`、每個備品都有消費端(不留孤兒)、`discipline` 與 UI 一致、`minTier` 不形成「故障可見但備品鎖住」的閘門矛盾。`test/run.mjs` 已含這套不變式測試。
- **模擬器蝴蝶效應(已知、非迴歸)**:`npm run sim` 的**絕對數字**會隨備品 id 集合/順序變動而整段跳動(倉儲折舊迴圈依 `inventory` 插入順序擲骰)。回測只看**相對排序**(passive ≪ active < full-crew)與梯度健康,不要追求絕對值穩定。

## 文件同步義務
程式改動後一併更新(這是專案的硬性要求,不是選配):

| 變動類型 | 要更新的文件 |
|---|---|
| 任何一輪工作 | `docs/ROADMAP.md`(標 ✅、更新 Last reviewed)、`docs/HANDOFF.md`(目前狀態/本輪成果/下次接續) |
| 玩家看得到的功能 | `docs/MANUAL.zh-TW.md`(必要時 `docs/WALKTHROUGH.md`) |
| 測試數/題數/故障數/備品數變動 | `README.md`、`README.zh-TW.md`、`docs/TEST_REPORT.md` |
| 里程碑級變動 | `STATUS.yaml` |

統計數字一律以實跑值為準:`npm test`、`TASKS.length`、`FAULTS`、`PARTS`,不要沿用文件裡的舊快照。

## 視覺驗證流程(需要看實際畫面時)
`npm run build` → 把 `dist/` 以 symlink 掛成 `<serve>/windFarm-Go/`(base 是 `/windFarm-Go/`)→ `python3 -m http.server` 提供(比 `vite preview` 在無頭瀏覽器下穩)→ 用 `playwright-core` + 預裝 Chromium(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`)截圖,並用 `newContext({ serviceWorkers: "block" })` 避免 SW 干擾。登入頁點「訪客試玩」;背景模式存於 `localStorage['wfg-mode']`(sim/real/comic)。

## 部署
- push 到 `main` 會觸發 CI(typecheck/test/build)與 GitHub Pages 部署。
- Pages 發佈來源已鎖定 GitHub Actions(`deploy.yml` 的 `actions/configure-pages`)。**切勿用 Actions 頁面的「Re-run」重跑 Pages 部署**(會觸發「重複 github-pages artifact」錯誤);要重部署請用 `Run workflow` 開新的一次。
