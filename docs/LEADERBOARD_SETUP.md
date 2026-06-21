# 雲端排行榜設定（Google Apps Script Web App，免費）

排行榜用 **Google 試算表當資料庫 + Apps Script Web App 當讀寫介面**。
完全免費、不需伺服器、不需信用卡、**學生免登入**，且不受 Google 表單「強制登入」限制。
只有教師需做一次設定（約 5 分鐘）。

設定完成後，編輯 [`src/cloud/sheet.ts`](../src/cloud/sheet.ts) 的 `SHEET_CONFIG`：把 `enabled` 改 `true`、`webAppUrl` 填入部署網址，重新 build/部署即啟用。

---

## 步驟 1：建立試算表
1. 到 https://sheets.new 新增試算表，命名如「風場運維排行榜」。
2. 第一列填標題（順序固定）：
   `時間戳記` `暱稱` `班級碼` `績效分` `可用率` `發電量` `天數`

## 步驟 2：貼上 Apps Script
1. 試算表選單「**擴充功能 → Apps Script**」。
2. 刪掉預設內容，貼上 [`docs/leaderboard-appsscript/Code.gs`](leaderboard-appsscript/Code.gs) 全部內容，存檔。

## 步驟 3：部署為 Web App
1. 右上「**部署 → 新增部署作業**」。
2. 類型選「**網頁應用程式 (Web app)**」。
3. 設定：
   - 執行身分：**我 (your account)**
   - 具有存取權的使用者：**任何人 (Anyone)** ← 關鍵，這樣才免登入
4. 「部署」→ 第一次會要求授權，照流程允許（出現「Google 尚未驗證」→ 進階 → 前往…繼續）。
5. 複製「**網頁應用程式 URL**」（結尾是 `/exec`），即為 `webAppUrl`。

## 步驟 4：填入設定
編輯 `src/cloud/sheet.ts`：
```ts
export const SHEET_CONFIG = {
  enabled: true,                                  // ← 改成 true
  webAppUrl: "https://script.google.com/macros/s/XXXXXXXX/exec",
};
```
然後 `npm run build` 並 push（GitHub Actions 自動部署）。

---

## 運作方式
- **學生**：開場填暱稱+班級碼（存在瀏覽器）。每完成一個任務，遊戲背景自動把成績 POST 到 Web App，附加一列到試算表。
- **排行榜**：遊戲內「績效排行」GET Web App，取每人最高分、依績效分排序，標示自己。
- **教師**：打開試算表即可看全班所有成績，可依班級碼篩選/排序。

## 為什麼不用 Google 表單
Google 表單的「收集 email／限制回覆」一旦開啟（或機構帳號預設）會強制登入，學生就無法匿名送分。Apps Script Web App 部署為「任何人」即可完全匿名讀寫，最穩。

## 注意
- 送分用 `no-cors` POST（純字串 body，避免 CORS preflight）；讀榜用 GET（Apps Script 回應允許跨來源）。
- 改 Code.gs 後要「**部署 → 管理部署作業 → 編輯（鉛筆）→ 版本：新版本**」才會生效。
- 未設定（`enabled:false`）時，遊戲照常運作，排行榜顯示本機 KPI。
- 防作弊（#35）：`Code.gs` 內含合理性驗證、簽章驗證（`SIGN_SECRET` 需與 `src/cloud/sheet.ts` 一致）、8 秒節流。**改用此版 Code.gs 後務必重新部署新版本才生效。**

## （選配）完整存檔雲端同步 #31
讓學生存檔跨裝置、教師可備援。預設**關閉**，不影響現有設定。啟用：
1. `src/cloud/sheet.ts` 把 `export const SAVE_SYNC = false;` 改為 `true`，重新 build/部署。
2. Code.gs 已內建處理（`doPost` 的 `kind:'save'` upsert 到「saves」分頁；`doGet ?load=班級/暱稱` 回存檔）。沿用同一個 Web App，**重新部署新版本**即可。
3. 運作：登入時讀雲端存檔覆蓋本機；狀態變更去抖 1.5 秒上傳。試算表會多一個「saves」分頁（每人一列 JSON），教師可檢視/備援。

> 註：Google 帳號 OAuth 登入因受管理帳號限制且已採「班級碼+暱稱」零摩擦登入，**不採用**；教師後台＝直接看綁定的 Google 試算表（成績分頁 + 選配 saves 分頁）。
