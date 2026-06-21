# 雲端排行榜設定（Google 表單 + 試算表，免費）

本遊戲用 **Google 表單收分數、Google 試算表當資料庫、發布的 CSV 當排行榜來源**。
完全免費、不需伺服器、不需信用卡、學生免登入。只有教師需做一次設定。

設定完成後，編輯 [`src/cloud/sheet.ts`](../src/cloud/sheet.ts) 的 `SHEET_CONFIG`，把 `enabled` 改成 `true`、填入下列三項資訊，重新 build/部署即啟用。

---

## 步驟 1：建立 Google 表單
1. 到 https://forms.google.com 新增空白表單，命名如「風場運維排行榜」。
2. 依**這個順序**新增 6 個「簡答」題（題目名稱建議照下表，程式靠關鍵字辨識欄位）：

| 題目（建議名稱） | 對應 | 關鍵字（程式辨識用） |
|---|---|---|
| 暱稱 | nickname | 暱稱 / name |
| 班級碼 | classCode | 班級 / class |
| 績效分 | score | 績效 / score / 分 |
| 可用率 | availability | — |
| 發電量 | generation | — |
| 天數 | day | — |

3. 右上「⋮」→「取得預先填入的連結」，隨意填值後按「取得連結」、複製連結。
   連結裡每題會出現 `entry.1234567=...`，**記下每題的 `entry.數字`**，對應上表 6 個欄位。

## 步驟 2：取得送出網址
- 把表單的「傳送 → 連結」網址 `https://docs.google.com/forms/d/e/XXXX/viewform`
  結尾的 `viewform` 改成 **`formResponse`**，即為 `formAction`。

## 步驟 3：連動試算表並發布 CSV
1. 表單「回覆」分頁 → 點試算表圖示，建立連動的 Google 試算表。
2. 在試算表：「檔案 → 共用 → 發布到網路」→ 選該工作表、格式選 **CSV** → 發布。
3. 複製產生的 CSV 網址，即為 `csvUrl`。

## 步驟 4：填入設定
編輯 `src/cloud/sheet.ts`：
```ts
export const SHEET_CONFIG = {
  enabled: true,                       // ← 改成 true
  formAction: "https://docs.google.com/forms/d/e/XXXX/formResponse",
  entries: {
    nickname:     "entry.1111111",
    classCode:    "entry.2222222",
    score:        "entry.3333333",
    availability: "entry.4444444",
    generation:   "entry.5555555",
    day:          "entry.6666666",
  },
  csvUrl: "https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv",
};
```
然後 `npm run build` 並 push（GitHub Actions 自動部署）。

---

## 運作方式
- **學生**：開場填暱稱+班級碼（存在瀏覽器）。每完成一個任務，遊戲背景自動把成績送到表單。
- **排行榜**：遊戲內「績效排行」會讀 CSV，依績效分排序，同一人只留最高分，標示自己。
- **教師**：打開連動試算表即可看全班所有成績，可依班級碼篩選。

## 注意
- 表單採無驗證提交（理論上有連結即可填），課堂使用足夠；班級碼可用於分班過濾。
- CSV 發布有快取，排行榜更新可能延遲數分鐘。
- 未設定（`enabled:false`）時，遊戲照常運作，排行榜顯示本機 KPI。
