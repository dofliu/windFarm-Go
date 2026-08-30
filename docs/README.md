# 文件索引 — Documentation Index

> 依讀者分類的文件地圖。遊戲現況的單一真實來源是 [GAME_DESIGN.md](GAME_DESIGN.md) 與 `src/` 原始碼;
> 各文件開頭皆註明最後更新日期,統計數字(測試數/題數/故障數/備品數)以 `npm test` 與原始碼實跑值為準。

## 給玩家／學生 — For players

| 文件 | 內容 |
|---|---|
| [MANUAL.zh-TW.md](MANUAL.zh-TW.md) | **遊戲使用說明手冊**:介面導覽、完整工單循環、經濟/戰情室/測驗模式玩法 |
| [WALKTHROUGH.md](WALKTHROUGH.md) | 攻略與教學說明:主線 7 關攻略、修課評量建議 |
| [CASE_STUDIES.md](CASE_STUDIES.md) | 真實風場案例研究(24 則)的設計原則與出處查核 |

## 給教師 — For instructors

| 文件 | 內容 |
|---|---|
| [CLOUD_SETUP.md](CLOUD_SETUP.md) | **雲端為主帳號/存檔/教師檢視部署指南**(Apps Script v2 後端,含 v2.2 掌握度鑽取) |
| [LEADERBOARD_SETUP.md](LEADERBOARD_SETUP.md) | 雲端班級排行榜設定(免費、免後端伺服器,約 5 分鐘) |
| [leaderboard-appsscript/Code.gs](leaderboard-appsscript/Code.gs) | 後端程式本體(Google Apps Script Web App) |
| [scenario-pack-example.json](scenario-pack-example.json) | 情境包(教師自訂題組)匯入格式範例 |

## 給開發者 — For developers

| 文件 | 內容 |
|---|---|
| [GAME_DESIGN.md](GAME_DESIGN.md) | **遊戲設計文件(權威版)**:出勤就緒閘門、經濟、KPI、擬真系統的單一真實來源 |
| [ROADMAP.md](ROADMAP.md) | 未來藍圖:已完成里程碑、後續接續工作、待決策事項 |
| [HANDOFF.md](HANDOFF.md) | Session 交接紀錄:目前狀態、開發備忘、驗證流程 |
| [TEST_REPORT.md](TEST_REPORT.md) | 全系統測試報告(typecheck / test / build / sim / stress) |
| [STRESS_TEST.md](STRESS_TEST.md) | 後端併發壓力測試報告(`npm run stress`) |

## 素材與歷史 — Assets & history

| 文件 | 內容 |
|---|---|
| [SCENE_ASSETS.md](SCENE_ASSETS.md) | 場景影片/情境圖製作規格與 AI 提示詞 |
| [CHARACTERS.md](CHARACTERS.md) | 人物立繪素材交付規格 |
| [screenshots/](screenshots/) | README 用遊戲截圖 |
| [GDD.md](GDD.md) | 歷史概念文件(tile-RPG 舊構想,**已不採用**,僅供追溯) |
| [design_handoff_offshore_om_game/](design_handoff_offshore_om_game/) | 最初 UI 設計交付(設計畫布原稿與截圖,歷史參考) |
