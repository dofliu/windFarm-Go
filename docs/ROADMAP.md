# 未來藍圖規劃 — Roadmap

> 以 zh-TW 為主、English secondary。本藍圖依現況（[STATUS.yaml](../STATUS.yaml)、[GAME_DESIGN.md](GAME_DESIGN.md)）盤點已完成與待辦，並提出**規劃方向**。
> ⚠ 標示為**規劃中／推測（speculative）**者尚未實作，請勿當成現況；本文為**規劃**而非承諾。
> Lead with zh-TW; English summaries follow. Last reviewed: 2026-09-23。

**✅ Playwright UI 迴歸測試擴充 · 獨立測驗模式(ExamModal)「20 題」長度樣本新增**(2026-09-23 例行 session):延續「2026-08-30 專案盤點」接續建議中「`FacilityModal` 6 種 kind 全數覆蓋後,可再挑剩餘的 `ExamModal` 的「20 題」長度/其他種子排列」。先前(2026-09-14)僅補上「10 題」長度、單一固定種子下的一組題目組合(8/10=80%「良好 B」),「20 題」長度自此一直列為已知限制。查核 `src/state/exam.ts` 後確認 `buildExam` 對同一種子是完全決定性的純函式(沿用 2026-09-14 已驗證有效的手法),鎖定 `window.Date.now` 為另一組固定時間戳(`1700000000123`,刻意與「10 題」樣本的 `1700000000000` 不同,避免兩者巧合抽到相同題序),離線用同一份 esbuild bundle 跑 `buildExam(固定種子, 20)` 算出全部 20 題與各選項對錯(20 題恰好各只有 2 個選項,索引 0 皆為正解),事先決定第 1、11 題故意選錯、其餘 18 題選正解 → 18/20=90%「優異 A」,補上先前「10 題」樣本(80%「良好 B」)之外尚未覆蓋過的等第。新增 1 項斷言,一次驗證鎖定種子後逐題題號/題目標題、依表作答直到自動進入結果頁、結果頁總分(90%)/等第(優異 A)/答對數(18/20)/各類別對錯列(7 類皆與離線算得的預期值精確相符)/錯題覆盤區塊(2 題、各自正解文字)、「再測一次」正確重置回開始頁、`Esc` 關閉卸載,合計 **38** 項全過。**已驗證測試有效性**:沿用 2026-09-14 同一手法,刻意暫時把 `gradeExam` 的計分公式改成 `Math.round((correct/total)*100) + 5`(模擬計分算錯)後重跑,新增的「20 題」斷言與既有「10 題」斷言如預期連鎖失敗(`28 passed, 10 failed`,兩則 `ExamModal` 斷言皆逾時、且卡在結果頁未關閉拖累後續多個彈窗測試逾時),證明非空跑,還原後 38 項全過。`npm test` = 167 全綠(純測試新增,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。**改動範圍**:僅 `test/e2e.mjs`(測試)+ `docs/ROADMAP.md`/`docs/HANDOFF.md`/`docs/TEST_REPORT.md`(文件),無 app 程式碼變動,`public/sw.js` 快取版本免動。至此 `ExamModal` 兩種題數長度(10/20 題)皆已覆蓋 e2e 樣本(各僅單一固定種子)。**已知限制**:`ExamModal` 其他種子排列(純資料層變化,優先序較低)、大型組件大修(`#overhaul`)/審慎返港再規劃(`#carry`,需處理跨日天氣重擲的非決定性)分支路徑仍待後續盤點。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 設施「技師公會」(FacilityModal kind="tech")focus trap 樣本新增**(2026-09-22 例行 session):延續「2026-08-30 專案盤點」接續建議中「`FacilityModal` 最後 1 種 kind『技師公會』(`kind="tech"`,需先解決候選名單隨機抽取導致可聚焦元素數量不穩定的問題,才能鎖定成決定性樣本)」。查核 `FacilityModal.tsx` 後確認此分支的「解僱」鈕、🔄「換一批」、各候選「招募」鈕同樣全是原生 `<button>`,無缺鍵盤操作的自訂卡片,純屬 e2e 覆蓋缺口。先前多輪盤點暫緩此 kind 的顧慮是候選名單 `genCandidates()` 每次開啟/換一批皆以 `Math.random()` 產生(姓名/科別/等級皆隨機),可聚焦元素數量看似不穩定。查核後發現這個顧慮其實不成立:候選名單固定長度 3,真正影響可聚焦元素數的只有既有技師「解僱」鈕的 `busy` 狀態與候選「招募」鈕的 `can`(`data.budget >= fee`,`fee` 上限僅 60 萬,本測試流程開局預算 8420 萬遠高於此門檻,全程不構成瓶頸)。解法沿用「船隊整備廠」(2026-09-20)示範的同一手法:不預先假設任一按鈕的 disabled 狀態、不鎖定 `Math.random()`,改為開啟當下直接讀取面板內實際渲染的可聚焦元素數(與 `a11y.ts` 的 `FOCUSABLE_SELECTOR` 同一份選擇器),據此動態決定 Tab 次數,徹底不受候選名單隨機內容影響、也不需鎖定 `Math.random()`。新增 1 項斷言,一次驗證「現有技師」顯示開局起始技師「阿銘」、「可招募」候選名單固定 3 名、focus trap(依即時查詢的可聚焦元素數動態驗算)、鍵盤 `Enter` 觸發 🔄「換一批」後仍固定 3 名(驗證互動確實有效)、`Esc` 關閉並歸還焦點,合計 **37** 項全過。**已驗證測試有效性**:沿用「績效排行」(2026-09-21)同一手法,刻意暫時把 `useFocusTrap.ts` 的 Tab 處理短路成必定 `return` 後重跑,新增斷言與其餘多項彈窗斷言如預期連鎖失敗(`locator.click: Timeout 30000ms exceeded`,因前面彈窗的 Esc 焦點歸還鏈斷裂、背景遮罩未卸載,擋住後續設施列點擊而逐一逾時),證明非空跑;還原後 37 項全過。`npm test` = 167 全綠(純測試新增,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。**改動範圍**:僅 `test/e2e.mjs`(測試)+ `docs/ROADMAP.md`/`docs/HANDOFF.md`/`docs/TEST_REPORT.md`(文件),無 app 程式碼變動,`public/sw.js` 快取版本免動。至此 `FacilityModal` 6 種 kind(`tool`/`codex`/`farms`/`vessel`/`ranking`/`tech`)全數覆蓋 e2e 樣本。**已知限制**:`ExamModal` 的「20 題」長度/其他種子排列、大型組件大修(`#overhaul`)/審慎返港再規劃(`#carry`)分支路徑仍待後續盤點。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 設施「績效排行」(FacilityModal kind="ranking")focus trap 樣本新增**(2026-09-21 例行 session):延續「2026-08-30 專案盤點」接續建議中「`FacilityModal` 剩餘 2 種 kind(技師公會/排行)中的代表性樣本」,這次挑選 `kind="ranking"`(績效排行)。查核 `FacilityModal.tsx` 後確認此分支的六項績效數據列(綜合績效分/機組可用率/累積發電量/完成任務/預算/天數)與雲端排行榜每列皆是純 `<div>` 展示,全無自訂互動卡片,不像 `codex`/`OpsCenterModal` 有缺鍵盤操作的自訂卡片問題,純屬 e2e 覆蓋缺口。`src/cloud/sheet.ts` 的 `SHEET_CONFIG.enabled=true`,`kind==="ranking"` 開啟時會呼叫 `fetchLeaderboard()`(GET `webAppUrl`,與 `TeacherModal` 的 `do=teacher` 端點不同);測試環境全域用 `context.route` 把 `script.google.com` 一律 `abort`(維持離線隔離),`fetchLeaderboard()` 對讀取失敗本有 `try/catch` 降級回傳 `[]`(見 `sheet.ts`),故雲端排行榜固定停在「尚無資料」提示——面板內可聚焦元素固定只有關閉✕ 這 1 個,與案例檔/營運趨勢/風場拓展同屬「單一可聚焦元素」邊界情境。新增 1 項斷言,一次驗證六項績效數據列皆正確渲染、「班級雲端排行」區塊標題出現、雲端讀取降級後顯示「尚無資料」、focus trap(開啟時 focus 落在面板內、連續 4 次 Tab 皆不逃逸)、`Esc` 關閉並歸還焦點給「排行」設施列,合計 **36** 項全過。**已驗證測試有效性**:此分支同樣無鍵盤操作缺口可還原,改為刻意暫時把 `useFocusTrap.ts` 的 Tab 處理短路成必定 `return`(`if (e.key === "Tab") return;` 插在 `onKeyDown` 開頭)後重跑,新增斷言與其餘多項彈窗斷言如預期連鎖失敗(`locator.click: Timeout 30000ms exceeded`,因前面彈窗的 Esc 焦點歸還鏈斷裂、背景遮罩未卸載,擋住後續設施列點擊而逐一逾時),證明新增斷言確實參與抓到這處全域迴歸而非獨立空跑;還原後 36 項全過。`npm test` = 167 全綠(純測試新增,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。**改動範圍**:僅 `test/e2e.mjs`(測試)+ `docs/ROADMAP.md`/`docs/HANDOFF.md`/`docs/TEST_REPORT.md`(文件),無 app 程式碼變動,`public/sw.js` 快取版本免動。至此 `FacilityModal` 6 種 kind 中已有 5 種(`tool`/`codex`/`farms`/`vessel`/`ranking`)覆蓋 e2e 樣本。**已知限制**:僅剩 `kind="tech"`(技師公會候選名單以 `Math.random()` 產生,可聚焦元素數量不穩定)需先鎖定 `Math.random()` 抽題分支才適合納入(`kind="vessel"` 已示範的「開啟當下動態查詢可聚焦元素數」解法同樣適用,只是還需額外鎖定候選名單本身);`ExamModal` 的「20 題」長度/其他種子排列、大型組件大修(`#overhaul`)/審慎返港再規劃(`#carry`)分支路徑仍待後續盤點。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 設施「船隊整備廠」(FacilityModal kind="vessel")focus trap 樣本新增**(2026-09-20 例行 session):延續「2026-08-30 專案盤點」接續建議中「`FacilityModal` 剩餘 3 種 kind(技師公會/船隊整備廠/排行,`tool` 已於 2026-09-07、`codex` 已於 2026-09-18、`farms` 已於 2026-09-19 覆蓋)中的代表性樣本」,這次挑選 `kind="vessel"`(船隊整備廠)。查核 `FacilityModal.tsx` 後確認此分支的購置/切換使用/進廠保養/整備升級鈕同樣全是原生 `<button>`,無缺鍵盤操作的自訂卡片,純屬 e2e 覆蓋缺口。先前(2026-09-19)盤點暫緩此 kind 的顧慮是:可聚焦元素數量取決於「當下預算」(每艘船 `purchaseCost` 對應的 `canBuy`)、「磨耗」(進廠保養 `can`)與「整備等級」(升級 `lvCost`)——這些會被測試流程中途累積的購買/花費影響,若固定寫死插入點當下的預期 disabled 狀態,插入點一旦挪動就可能失真。本輪解法:**不預先假設任何按鈕的 disabled 狀態**,改在彈窗開啟當下直接以 `a11y.ts` 的同一份 `FOCUSABLE_SELECTOR` 查詢面板內實際渲染的可聚焦元素數,再據此動態決定 Tab 次數(`focusableCount + 2`,多繞一輪涵蓋循環 wrap-around),使樣本不論插入在流程中哪個時間點、不論當下預算/磨耗/整備等級為何皆能正確驗證,徹底解決先前的插入點顧慮。插入點選在既有的「風場拓展」樣本之後(實測 `focusableCount = 6`,非邊界的單一元素情境),另附斷言確認船型型錄五種船型(快艇/CTV/SOV/安裝船/母船)與「進廠保養」「整備升級」區塊皆正確渲染,`Esc` 關閉並歸還焦點給「船隊整備廠」設施列,合計 **35** 項全過。`npm test` = 167 全綠(純測試新增,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。**改動範圍**:僅 `test/e2e.mjs`(測試)+ `docs/ROADMAP.md`/`docs/HANDOFF.md`/`docs/TEST_REPORT.md`(文件),無 app 程式碼變動,`public/sw.js` 快取版本免動。**已知限制**:`FacilityModal` 剩餘 2 種 kind(技師公會/排行)中,`kind="tech"`(技師公會候選名單以 `Math.random()` 產生,可聚焦元素數量不穩定)需先鎖定 `Math.random()` 才適合納入(本輪示範的「動態查詢可聚焦元素數」解法同樣適用,只是還需額外鎖定候選名單本身);`kind="ranking"`(績效排行)未查核;`ExamModal` 的「20 題」長度/其他種子排列、大型組件大修(`#overhaul`)/審慎返港再規劃(`#carry`)分支路徑仍待後續盤點。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 設施「風場拓展」(FacilityModal kind="farms")focus trap 樣本新增**(2026-09-19 例行 session):延續「2026-08-30 專案盤點」接續建議中「`FacilityModal` 剩餘 4 種 kind(技師公會/船隊整備廠/風場拓展/排行,`tool` 已於 2026-09-07、`codex` 已於 2026-09-18 覆蓋)中的代表性樣本」,這次挑選 `kind="farms"`(風場拓展)。查核 `FacilityModal.tsx` 後確認此分支與 `codex`/`OpsCenterModal` 不同——全部互動元素本就是原生 `<button>`,不存在缺鍵盤操作的自訂卡片,先前盤點誤判「內容隨機」而暫緩純屬 e2e 覆蓋缺口,不是無障礙缺陷。開局 `farmsOwned=1`、`day=21`(見 `state/game.ts` 初始狀態),`FARMS` 為靜態資料(4 座風場):第 2 座(雲林)`unlockDay=30 > 21`,「拓展」鈕 `disabled={!can}`(disabled 按鈕不進 tab 序,見 `a11y.ts` 的 `FOCUSABLE_SELECTOR`),第 3/4 座(苗栗/澎湖)顯示「需先拓展前一座」純文字(非按鈕)——面板內可聚焦元素固定只有關閉✕ 這 1 個,且門檻是 `day` 而非 `budget`,不受測試流程中途累積的購買/花費影響,與案例檔/營運趨勢同屬「單一可聚焦元素」邊界情境,但成因是 `unlockDay` 門檻而非 tier 過濾或資料量門檻。新增 1 項斷言,一次驗證面板內容(彰化已擁有/營運中、雲林顯示「需第 30 天」鎖定提示、苗栗/澎湖顯示「需先拓展前一座」)、focus trap(開啟時 focus 落在面板內、連續 4 次 Tab 皆不逃逸)、`Esc` 關閉並歸還焦點給「風場拓展」設施列。**已驗證測試有效性**:因此分支無鍵盤操作缺口可還原,改為驗證斷言確實依賴真實資料而非空跑——暫時把 `src/state/farms.ts` 雲林風場的 `unlockDay` 從 `30` 改成 `5`(模擬「拓展門檻資料被誤改」)後重跑,新增斷言如預期在「第 2 座(雲林)應顯示鎖定天數提示」失敗(該farm 此時已達成 `okDay`,鎖定文字不再出現),其餘 33 項不受影響,證明非空跑;還原後 34 項全過。`npm test` = 167 全綠(純測試新增,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。**改動範圍**:僅 `test/e2e.mjs`(測試)+ `docs/ROADMAP.md`/`docs/HANDOFF.md`/`docs/TEST_REPORT.md`(文件),無 app 程式碼變動,`public/sw.js` 快取版本免動。**已知限制**:`FacilityModal` 剩餘 3 種 kind(技師公會/船隊整備廠/排行)中,`kind="tech"`(技師公會候選名單以 `Math.random()` 產生,可聚焦元素數量不穩定)需先鎖定 `Math.random()` 才適合納入;`kind="vessel"`(船隊整備廠,全為原生 `<button>`)可聚焦元素數依賴開局 `budget` 與各船購置成本相對大小,若要納入需確認插入測試流程的時間點尚未被其他花費影響;`kind="ranking"`(績效排行)未查核;`ExamModal` 的「20 題」長度/其他種子排列、大型組件大修(`#overhaul`)/審慎返港再規劃(`#carry`)分支路徑仍待後續盤點。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · TeacherModal「查詢結果」狀態 + 個別學生掌握度鑽取鍵盤操作補完**(2026-09-17 例行 session):延續「2026-08-30 專案盤點」接續建議中列出的最後一個已知限制——先前(2026-09-09)的 `TeacherModal` e2e 樣本只覆蓋「表單」狀態,「查詢結果」狀態因先前盤點認定「表格列數/掌握度鑽取展開內容隨學生存檔資料變動」而暫緩。查核 `fetchClassProgress()` 後發現這個顧慮並不成立:它只是對雲端 `do=teacher` 端點的一次 GET(`getJson`),測試環境全域用 `context.route` 把 `script.google.com` 一律 `abort` 才是唯一擋住這個狀態的原因,並非後端本身不可測。本輪改用 `page.route`(頁面層級路由,優先權高於既有的全域 `context.route` 攔截)只針對 `do=teacher` 這支請求回傳一份固定假資料(2 位學生,1 位有掌握度摘要、1 位沒有),決定性地讓「查詢結果」狀態可被驗證,免鎖定 `Math.random()`、也不需真的重新部署後端。查核 `TeacherModal.tsx` 原始碼時,順帶發現一處系統性缺口的又一實例:個別學生掌握度鑽取列(`<tr onClick=...>`)只有滑鼠 `onClick`,未比照工單循環其餘卡片式互動補上 `role="button"`/`tabIndex`/`onKeyDown`,鍵盤玩家無法展開/收合個別學生的掌握度鑽取(能力雷達圖 + 科別/類別正確率長條 + 最弱項提示)——是 2026-08-31 兩輪無障礙工作遺漏的又一處系統性缺口,本輪一併補上。新增 1 項斷言,一次驗證:①查詢結果表格顯示 2 列(學號/暱稱/績效分/營運天數皆與假資料相符);②鍵盤 `Enter` 展開第 1 位學生(有掌握度資料)的鑽取列,確認能力雷達圖(`svg`)、「機械」科別 70%(7/10)正確率、標示「電氣」(1/4=25%)為最弱項皆正確渲染;③再次 `Enter` 收合;④展開第 2 位學生(尚無掌握度資料),確認顯示「此學生尚無作答資料」提示(合計 **32** 項全過)。**已驗證測試有效性**:刻意暫時把本輪新補的 `role="button"`/`tabIndex`/`onKeyDown` 還原(只留 `onClick`)後重跑,新增斷言在「掌握度鑽取列應可鍵盤聚焦(tabIndex=0)」如預期失敗,其餘 31 項不受影響、未發生連鎖逾時(新增樣本的 `finally` 區塊即使斷言失敗也會嘗試 `Esc` 關閉彈窗,避免遮罩殘留擋住後續測試的點擊),證明新增斷言確實依賴這個修正而非空跑;還原後 32 項全過。`npm test` = 167 全綠(純 UI 元件無障礙屬性變動,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。**改動範圍**:`src/ui/TeacherModal.tsx`(app 程式碼)+ `test/e2e.mjs`(測試)+ 本檔/`docs/HANDOFF.md`/`docs/TEST_REPORT.md`(文件),`public/sw.js` 快取版本 **v15→v16**。至此 `TeacherModal`/`ProfileModal`/`OpsCenterModal` 皆已覆蓋各自原列的已知限制狀態。**已知限制**:`ExamModal` 的「20 題」長度/其他種子排列、`FacilityModal` 剩餘 5 種 kind、`CaseFileModal` 若日後測試流程推進到 Tier≥2 的重新評估、大型組件大修(`#overhaul`)/審慎返港再規劃(`#carry`)分支路徑仍待後續盤點。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 個人檔案(ProfileModal)「已作答/有錯題」狀態 + 錯題本主動回想完整互動流程**(2026-09-16 例行 session):延續前幾輪(2026-09-11 起)明列的已知限制——先前的 `ProfileModal` e2e 樣本刻意插在測試流程「尚未接下工單前」,只覆蓋 `totalAnswered(m)===0` 的空狀態(面板固定 2 個可聚焦元素);「已作答/有錯題」狀態(知識點掌握度雷達圖/chips、錯題本 `MistakeLog` 的主動回想互動)自此一直未覆蓋。查核後發現測試流程走到尾聲時 `data.mastery`/`data.mistakes` 其實已非空:首筆工單診斷測驗「連續兩次故意答錯」的測試只有第一次(`A. 變槳軸承潤滑脂量`)會真的記錄(`RepairScreen.tsx` 的 `if (pick === null)` 只記第一次作答,第二次選 `C.` 時 `pick` 已非 null,不會重複觸發 `RECORD_MISTAKE`/`RECORD_ANSWER`),記下一筆 `disc:mechanical` 的錯題;自由營運中心判斷任務(`d_curtail_maint`,cat D)選中的是 `good:true` 的正解選項,記下一筆 `cat:D` 的正確作答。本輪把新樣本改插在測試流程**最後**(所有既有工單/判斷任務測試跑完後),重新用頂欄個人檔案晶片開啟 `ProfileModal`,一次驗證三件事:①掌握度區塊改顯示能力雷達圖 + 「機械」/「營運決策」正確率 chips,不再是「尚無作答資料」提示;②錯題本不再顯示「目前沒有錯題」,且能精準找到診斷測驗那筆錯題卡片;③**完整走一次錯題本的主動回想互動鏈路**——點選自我測驗的正解按鈕(原生 `<button>`)→ 揭曉「✓ 答對了」回饋與正解/原選擇文字 → 在 `<textarea>` 寫下檢討反思(≥4 字)→ 點擊「標記已複習」→ 確認卡片轉為「已複習」狀態並保留檢討內容,這是本專案錯題本(#mistake-log)功能第一次被端到端走過完整互動,而不只是先前樣本驗證過的靜態渲染。為精準鎖定特定錯題卡片(避免其餘可能同時存在的自由營運中心錯題卡片文字混淆),`MistakeLog.tsx` 新增 `data-testid="mistake-card"`(純測試用屬性,無行為變動)供測試以 `hasText` 精準定位。新增 1 項斷言(合計 **31** 項全過)。**已驗證測試有效性**:刻意暫時把新增的 `data-testid="mistake-card"` 改名為 `mistake-card-x`(模擬「測試定位屬性被誤刪/改名」)後重跑,新增斷言如預期在 `card.waitFor` 逾時失敗,其餘 30 項不受影響,證明新增斷言確實依賴這個定位機制而非空跑;改回後 31 項全過。`npm test` = 167 全綠(純測試新增,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。**改動範圍**:`src/ui/MistakeLog.tsx`(app 程式碼,僅新增一個測試用 `data-testid` 屬性)+ `test/e2e.mjs`(測試)+ 本檔/`docs/HANDOFF.md`/`docs/TEST_REPORT.md`(文件),`public/sw.js` 快取版本 **v14→v15**。**已知限制**:`TeacherModal` 的「查詢結果」狀態、`ExamModal` 的「20 題」長度/其他種子排列、`FacilityModal` 剩餘 5 種 kind、大型組件大修(`#overhaul`)/審慎返港再規劃(`#carry`)分支路徑仍待後續盤點。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 自由營運中心(OpsCenterModal)案例演練(`kind:"case"`)分支**(2026-09-15 例行 session):延續「2026-08-30 專案盤點」接續建議中列出的最後一個 `OpsCenterModal` 已知限制——先前一輪(2026-09-13)已補上「判斷任務(`kind:"task"`)」分支的鍵盤操作與 e2e 樣本,但「案例演練(`kind:"case"`)」分支仍完全未有樣本。查核 `src/state/caseStudies.ts` 的 `randomCaseDrill()` 後發現:抽題內容依 `data.seenCases`(本局已演練過的案例 id 清單)加權抽樣,而 `seenCases` 會隨局中「戰情室推進一天」等 `advance()` 呼叫以 `CASE_ROLL_PROB`(0.05)的**真實** `Math.random()` 偶發累積一則隨機案例(`rollCaseStudy`,與本測試無關的偶發快報機制),故無法像先前「判斷任務」樣本那樣鎖定成單一已知案例逐字斷言劇本內容——這也是先前多輪盤點(2026-09-05〜09-13)都把此分支列為「暫緩」的根本原因。本輪改採**不依賴特定案例內容**的結構性斷言:全部 20 則案例(`CASE_STUDIES`)皆恰有 2 個選項,故不論 `randomCaseDrill()` 實際抽到哪一則,面板的 Tab 序列(關閉✕→🔬進階檢測「解鎖」→選項 1→選項 2→循環回關閉✕,共 4 個可聚焦元素)與答題後才出現的案例專屬區塊(「📘 復盤教訓 O&M Lesson」「已收錄進母港「案例檔」圖鑑」,`isCase && picked !== null` 才渲染,判斷任務不會有)結構皆一致。覆寫 `Math.random` 為極小固定值(`1e-6`):`CASE_DRILL_PROB`(0.24)分支判斷恆為真,`randomCaseDrill` 的加權抽樣 `r = 1e-6 × total` 恆落在「本局未演練過的案例池」中第一筆的權重區間內,不受 `seenCases` 內容影響(除非那極低機率下第一筆恰好已被更早的 `advance()` 隨機標記為已演練,但仍會抽到另一則同樣恰有 2 個選項的案例,不影響斷言)。新增 1 項斷言(合計 **30** 項全過)。**已驗證測試有效性**:刻意暫時把 `resolve(i, c)` 對應選項卡的 `role`/`tabIndex`/`onKeyDown` 還原成先前(2026-09-13 之前)未補的樣子(判斷任務與案例演練共用同一段 render 邏輯)後重跑,新增斷言與前一則「判斷任務」斷言如預期連鎖失敗(`28 passed, 2 failed`:判斷任務斷言在「第 2 次 Tab 後應落在第一個選項」處失敗,案例演練斷言則因判斷任務測試逾時未正常關閉彈窗、阻擋後續點擊而 `locator.click` 逾時),證明新增斷言確實會參與抓到這處迴歸而非空跑,還原後 30 項全過。`npm test` = 167 全綠(純測試新增,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。**改動範圍**:僅 `test/e2e.mjs`(測試)+ 本檔/`docs/HANDOFF.md`(文件),無 app 程式碼變動(鍵盤操作已於上一輪補齊、選項卡渲染邏輯為判斷任務與案例演練共用),`public/sw.js` 快取版本免動。至此 `OpsCenterModal` 兩個分支皆已有 e2e 樣本。**已知限制**:仍未覆蓋「已作答後再抽到案例、且該案例先前已演練過(重複抽樣)」的狀態;`TeacherModal` 的「查詢結果」狀態、`ProfileModal` 的「已作答/有錯題」狀態、`ExamModal` 的「20 題」長度/其他種子排列、`FacilityModal` 剩餘 5 種 kind 中的代表性樣本、大型組件大修(`#overhaul`)/審慎返港再規劃(`#carry`)分支路徑仍待後續盤點。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ 平衡回測校正 + Playwright UI 迴歸測試擴充 · 獨立測驗模式(ExamModal)作答頁/結果頁**(2026-09-14 例行 session):依本文件「2026-08-30 專案盤點」P1 項下註記「`npm run sim` 完整平衡回測(內容修正後尚未重跑)」,先重跑 `npm run sim`(120 天 × 3 策略):passive(放任)8070 分 ≪ active(管理)13460 分 < full-crew(全配技師)14794 分,相對排序與梯度皆健康,**免校正**(絕對數字隨備品資料異動整段跳動,屬已知「模擬器蝴蝶效應」,非迴歸;結果已寫回 [TEST_REPORT.md](TEST_REPORT.md) 第 4 節)。確認回測健康後,挑選「獨立測驗模式(`ExamModal`)作答頁/結果頁」補上 e2e 樣本:先前兩輪(2026-09-07/09-10)都以「`buildExam(Date.now(), n)` 用真實時間戳記為種子,題目/選項內容不可預期」為由只補了「開始頁」。查核 `src/state/exam.ts` 後發現 `buildExam` 對「同一個種子」是完全決定性的純函式(已有單元測試佐證),故只要在點擊「10 題」前暫時鎖定 `window.Date.now` 為固定時間戳,離線用同一份 esbuild bundle 先算出抽到的 10 題與各選項對錯,即可預先決定每題要點哪個索引(第 1、6 題故意選錯、其餘 8 題選正解),讓最終成績(8/10=80%「良好 B」)、各類別對錯(7 類)、錯題覆盤(2 題,各自揭示正解文字)全部可預期並逐一斷言,新增 1 項斷言(合計 **29** 項全過)。答案按鈕本就是原生 `<button>`,鍵盤操作向來成立,故本輪純屬 e2e 覆蓋擴充,不涉及無障礙修正。**已驗證測試有效性**:刻意暫時把 `gradeExam` 的計分公式改成 `Math.round((correct/total)*100) + 5`(模擬計分算錯)後重跑,新增斷言如預期逾時失敗(等不到「80%」),並連鎖拖累下一項測試,證明非空跑,還原後 29 項全過。`npm test` = 167 全綠、`typecheck`/`build` 乾淨。純測試新增(`test/e2e.mjs`),無 app 程式碼變動,`public/sw.js` 快取版本免動。**已知限制**:僅覆蓋「10 題」長度、單一固定種子下的一組題目組合,「20 題」與其他種子排列尚未覆蓋。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 4/7 節。

**✅ 無障礙補完 · 自由營運中心(OpsCenterModal)判斷任務/案例演練選項卡鍵盤操作 + Playwright e2e 樣本新增**(2026-09-13 例行 session)：原計畫依「其餘尚無 e2e 樣本的彈窗中再挑代表性樣本」的接續建議在 `OpsCenterModal` 補樣本,先前多輪盤點(2026-09-05〜09-12)都以「判斷任務/案例演練隨機抽題,選項數隨模板變動,需先鎖定 `Math.random()`」為由暫緩。查核 `src/ui/OpsCenterModal.tsx` 原始碼時,發現一處比「鎖定 `Math.random()`」更根本的缺口:判斷任務/案例演練的選項卡(`resolve(i, c)` 對應的 `<div>`)全都只有滑鼠 `onClick`,未比照工單循環其餘卡片式互動補上 `role="button"`/`tabIndex`/`onKeyDown`——是 2026-08-31 兩輪無障礙工作(工單循環鍵盤操作、全部彈窗 focus trap)遺漏的又一處系統性缺口,鍵盤玩家完全無法在此彈窗作答(此彈窗永遠開放、無 Tier 限制,是最容易被學生使用的判斷練習入口之一)。本輪在該段選項卡一次補齊,手法與 `RepairScreen.tsx` 診斷測驗選項一致(`role="button"`、`tabIndex={picked === null ? 0 : -1}`、`aria-pressed`、`onKeyDown` 於未作答時才掛)。同時補上 e2e 樣本:`makeDraw()` 以 `Math.random() < CASE_DRILL_PROB(0.24)` 決定任務/案例,`generateTask()` 的模板索引/機組編號亦吃 `Math.random()`;暫時覆寫固定回傳 `0.999999`(恆落入判斷任務分支,且 `floor(0.999999 * TASKS.length)` 對任何合理長度恆為最後一個索引)鎖定抽到 TASKS 最後一筆模板「順勢限電維修」(cat D、2 個選項)。除錯過程中發現 `OpsCenterModal` 是 `lazy()` 元件,測試流程第一次開啟時要等動態 import 完成才真正掛載、呼叫 `makeDraw()`,比照既有 `rush()` 測試在 `click()` 後立刻還原 `Math.random` 會太早,改為撐到面板 `visible` 後才還原即穩定重現。驗證鍵盤 Tab 序列(關閉✕→🔬進階檢測解鎖鈕(原生 `<button>`,開局預算遠高於 `DIAG_COST` 未 disabled)→2 個選項→循環回關閉✕,共 4 個可聚焦元素)、鍵盤 `Enter` 選取正解、`Esc` 關閉歸還焦點,新增 1 項斷言(合計 **28** 項全過)。**已驗證測試有效性**:刻意暫時還原 `OpsCenterModal.tsx` 本輪新補的 `role`/`tabIndex`/`onKeyDown` 後重跑,新增斷言如預期失敗(Tab 序列變短、卡在第一個選項前一步),其餘 27 項不受影響,還原修正後 28 項全過。`npm test` = 167 全綠、`typecheck`/`build` 乾淨。`public/sw.js` 快取版本 v13→v14(隨 `OpsCenterModal.tsx` 改動遞增)。**已知限制**:目前僅覆蓋「判斷任務、尚未作答」狀態,案例演練(`kind:"case"`)分支與已作答後再抽題狀態未覆蓋。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 案例檔(CaseFileModal)彈窗 focus trap**(2026-09-12 例行 session)：延續「其餘尚無 e2e 樣本的彈窗中再挑代表性樣本」的接續建議,從剩餘 2 個(`OpsCenterModal`/`CaseFileModal`)中挑 `CaseFileModal`。先前多輪盤點(2026-09-05/06/07 等)都以「案例卡片依 Tier/隨機案例變動,可聚焦元素數量不穩定」為由暫緩納入此彈窗,本輪查核 `src/state/caseStudies.ts` 原始碼後發現這個顧慮並不成立:`casesForTier(tier)` 是純函式(`CASE_STUDIES.filter((c) => c.minTier <= tier)`),依 `tierOf()` 過濾而非隨機抽取;而全部 20 則案例的 `minTier` 最低為 2,本測試流程全程 `tierOf()` 皆為 1(開局 `generationMWh`/`missionsDone` 皆遠低於 Tier 2 門檻、`farmsOwned=1`、`campaignIndex<2`),故 `casesForTier(1)` 恆為空陣列,面板固定停在「目前層級尚無解鎖案例」提示,可聚焦元素只有關閉✕ 1 個——與「營運趨勢」彈窗同屬「單一可聚焦元素」邊界情境,但成因不同(前者是 `history` 長度未達門檻,此為 tier 過濾)。觸發元件為母港「設施」列的 `FacRowMini`「📁 案例檔」,一鍵開啟、無需前置遊戲狀態。沿用既有共用測試輔助函式 `checkModalFocusTrap()`,新增 1 項斷言(合計 **27** 項)。**已驗證測試有效性**:刻意暫時把 `useFocusTrap.ts` 的 Tab 處理短路成必定 `return` 後重跑,新增斷言與既有多項斷言如預期連鎖失敗(`4 passed, 23 failed`),證明非空跑,還原後 27 項全過。`npm test` = 167 全綠、`typecheck`/`build` 乾淨。純測試新增(`test/e2e.mjs`),無 app 程式碼變動,`public/sw.js` 快取版本免動。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 個人檔案(ProfileModal)彈窗 focus trap**(2026-09-11 例行 session)：延續「其餘尚無 e2e 樣本的彈窗中再挑代表性樣本」的接續建議,從剩餘 3 個(`OpsCenterModal`/`CaseFileModal`/`ProfileModal`)中挑 `ProfileModal`。此彈窗大部分內容隨作答資料變動(知識點掌握度 chips/雷達圖只在已作答時出現、`MistakeLog` 錯題本只在有錯題時才有可互動元素),但成就牆卡片與數據格皆是未補 `role="button"`/`tabIndex` 的純 `<div>`,本就不進 tab 序——查核後確認實際可聚焦元素數只取決於「是否已作答/答錯過」。把測試樣本插入在流程中「調度中心」彈窗驗證完畢、尚未接下首筆工單前(此時 `data.mastery`/`data.mistakes` 皆為初始空值),面板內可聚焦元素固定為:關閉✕ + 減少動態切換鈕 = 2 個。用鍵盤 `Enter` 觸發頂欄個人檔案晶片開啟(先前 2026-09-10 只驗證過該晶片鍵盤可達性,尚無彈窗內容樣本),驗證 focus trap 兩元素循環與 `Esc` 焦點歸還,新增 1 項斷言(合計 **26** 項)。**已驗證測試有效性**:刻意暫時把 `useFocusTrap.ts` 的 Tab 處理短路成必定 `return` 後重跑,新增斷言與既有斷言如預期連鎖失敗(`4 passed, 22 failed`),證明非空跑,還原後 26 項全過。純測試新增,無 app 程式碼變動(`ProfileModal` 本身無障礙屬性已完備,缺口只在於缺少 e2e 樣本)。`npm test` = 167 全綠、`typecheck`/`build` 乾淨;`public/sw.js` 快取版本免動(純測試檔變動)。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ 無障礙補完 · 頂欄(TopBar/MobileBar)鍵盤操作 + 修正串接開啟彈窗的焦點遺失迴歸**(2026-09-10 例行 session)：延續「其餘彈窗中再挑代表性樣本補 e2e」的接續建議,原想直接補 `ExamModal`「開始頁」的 e2e 樣本(可聚焦元素固定:關閉✕+10題+20題=3 個),但追查它「由 `CourseModal` 內『獨立測驗模式』鈕觸發、`App.tsx` 在同一事件處理常式內 `setShowCourse(false); setShowExam(true)` 兩彈窗串接卸載/掛載」的既有懸案(2026-09-07 盤點已列為「留待下次評估焦點歸還斷言如何調整」)時,發現一處比「補哪個彈窗樣本」更根本的缺口:**`TopBar.tsx`(桌機頂欄)與 `MobileBar.tsx`(手機頂列)的全部自訂互動——共用 `Btn` 元件(語言切換/靜音/⚙/登出)、導覽分頁(母港/交易所/出海/維修)、個人檔案晶片——都只是滑鼠 `onClick` 的 `<div>`,未比照工單循環其餘卡片式互動補上 `role="button"`/`tabIndex`/`onKeyDown`,連最基本的「滑鼠點擊後成為 `document.activeElement`」都不成立**(純 `<div>`、無 `tabindex` 的元素滑鼠點擊不會取得焦點)。這是 2026-08-31 兩輪無障礙工作(工單循環鍵盤操作、全部彈窗 focus trap)都聚焦於「彈窗內部」與「母港設施列」、完全遺漏「頂欄本身」的系統性缺口——鍵盤玩家原本完全無法從頂欄開啟課程模式、切換分頁、開個人檔案。更嚴重的是,這牽出一處**真實的焦點遺失迴歸**:由於 ⚙ 齒輪鈕滑鼠點擊不會取得焦點,`CourseModal` 的 `useFocusTrap` 記下的「開啟前焦點」其實是 `<body>`;串接開啟 `ExamModal` 並 `Esc` 關閉後,焦點便遺失回 `<body>`,鍵盤玩家會徹底失去游標位置(用 `HTMLElement.prototype.focus` 埋樁記錄呼叫序列實測證實:修復前 `Esc` 後只呼叫過 `body.focus()`,從未呼叫到 ⚙ 本身)。本輪在 `TopBar.tsx`(共用 `Btn`、4 個導覽分頁、個人檔案晶片)與 `MobileBar.tsx`(4 個 `iconBtn`、個人檔案晶片、4 個導覽分頁)一次補齊全部同類元素。新增 2 項 e2e 斷言:①鍵盤 `Enter` 觸發 ⚙ 開啟課程模式(驗證頂欄修復本身);②由課程模式「獨立測驗模式」鈕串接開啟 `ExamModal`,驗證開始頁 focus trap(關閉✕→10題→20題→循環回關閉✕)後 `Esc` 關閉,焦點精確歸還至 ⚙(用 `tagName`/`role`/`trim()` 後的 `textContent` 精確比對,刻意不沿用既有共用斷言慣用的 `textContent.includes(triggerText)` 寬鬆比對——若焦點真遺失到 `<body>`,`body.textContent` 幾乎必然仍「包含」觸發文字,會讓這處迴歸被寬鬆比對誤判為通過)(合計 **25** 項)。**已驗證測試有效性**:刻意暫時把 `TopBar.tsx`/`MobileBar.tsx` 本輪修正全數還原重跑,新增斷言如預期連鎖失敗(鍵盤 `Enter` 觸發 ⚙ 逾時,課程模式未開啟導致串接開啟 `ExamModal` 的斷言連帶逾時),其餘 23 項不受影響,還原修正後 25 項全過。`npm test` = 167 全綠(純 UI 元件無障礙屬性變動 + 修正焦點遺失,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。`public/sw.js` 快取版本 v12→v13(隨 `TopBar.tsx`/`MobileBar.tsx` 改動遞增)。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ 無障礙補完 · 登入畫面鍵盤操作 + TeacherModal Playwright UI 迴歸測試新增**(2026-09-09 例行 session)：延續「其餘彈窗中再挑代表性樣本補 e2e」的接續建議,盤點剩餘未有 e2e 樣本的彈窗(`OpsCenterModal`/`CaseFileModal`/`ProfileModal`/`TeacherModal`/`ExamModal`)時,發現一處比「挑哪個彈窗」更根本的缺口:2026-08-31 的兩輪無障礙工作(工單循環鍵盤操作、全部彈窗 focus trap)皆聚焦於**登入後**的母港/工單循環畫面,完全未觸及**登入畫面本身**(`LoginScreen.tsx`)。逐一檢視後發現 7 處自訂卡片式互動——帳號清單列(選擇既有帳號)、4 處模式切換連結(「我在別台登入過」「← 返回」×3)、「訪客試玩」、「教師檢視入口」——全都只有滑鼠 `onClick`,未比照工單循環其餘卡片式互動補上 `role="button"`/`tabIndex`/`onKeyDown`(`onKeyActivate`),鍵盤玩家完全無法從登入畫面選擇帳號、切換登入模式、以訪客身分進場,或(尤其)不必先登入即可用的「教師檢視入口」。本輪在 `LoginScreen.tsx` 一次補齊全部 7 處。新增 e2e 樣本挑「教師檢視入口」→ `TeacherModal`:此路徑不需任何前置遊戲狀態(登入畫面載入後即可觸發),且面板在「表單」狀態下可聚焦元素固定(關閉✕ + 班級碼輸入框 + 教師碼輸入框 + 查詢按鈕 = 4 個,不受雲端連線狀態或帳號資料影響)——同時補上 `TeacherModal` 先前完全缺乏的 e2e 覆蓋。刻意用鍵盤 `Enter`(而非滑鼠 `.click()`)觸發開啟,驗證新補的 `onKeyActivate` 確實可運作;開啟後驗證 focus 移入面板、連續 6 次 Tab 侷限循環於面板內、`Esc` 關閉並歸還焦點,新增 1 項斷言(合計 **23** 項)。**已驗證測試有效性**:刻意暫時把「教師檢視入口」改回還沒補 `role`/`tabIndex`/`onKeyDown` 的樣子重跑,確認新增斷言如預期逾時失敗(`locator.press` 逾時,因元素不再符合 `[role="button"]` 選擇器而找不到,其餘 22 項不受影響),還原後 23 項全過。`npm test` = 167 全綠(純 UI 元件無障礙屬性變動,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。`public/sw.js` 快取版本 v11→v12(隨 `LoginScreen.tsx` 改動遞增)。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ 無障礙補完 · 風場建置番外篇彈窗鍵盤操作 + Playwright UI 迴歸測試擴充**(2026-09-08 例行 session)：延續「其餘彈窗中再挑代表性樣本補 e2e」的接續建議,盤點剩餘無 e2e 樣本的彈窗時發現一處真實的無障礙缺口——「風場建置 · 番外篇」(`ConstructionModal`,每階段 2 選 1、共 8 階段)的階段選項卡只有滑鼠 `onClick`,未比照工單循環其餘卡片式互動(母港設施列/交易所備品卡/診斷測驗選項/SOP 步驟)補上 `role="button"`/`tabIndex`/`onKeyDown`(`onKeyActivate`),是 2026-08-31 那輪無障礙工作遺漏的一處,鍵盤玩家完全無法操作此番外篇短戰役。本輪先補上該缺口,再新增 e2e 樣本:由母港「設施」列開啟,開局停在階段 0、面板內可聚焦元素為關閉✕ + 2 個選項卡 = 3 個。刻意**不沿用**既有共用測試輔助函式 `checkModalFocusTrap()`——該輔助函式只驗證 focus 不逃逸出面板,若選項卡未加上 `tabIndex`,Tab 只會在唯一的關閉✕上打轉,一樣「不逃逸」而空綠通過、測不出這處迴歸;改為逐步比對 `document.activeElement`,確認 Tab 序列確實是「關閉✕→選項卡 1→選項卡 2→循環回關閉✕」,並用鍵盤 Enter 實際選取一張、確認回饋文字揭曉,新增 1 項斷言(合計 **22** 項)。**已驗證測試有效性**:刻意暫時把選項卡的 `role`/`tabIndex`/`onKeyDown` 改回還沒補的樣子重跑,確認新增斷言如預期失敗(非空跑,失敗於「第 1 次 Tab 後應落在第一張階段選項卡」)後才提交,還原後 22 項全過。`npm test` = 167 全綠(純 UI 元件無障礙屬性變動,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。`public/sw.js` 快取版本 v10→v11(隨 `ConstructionModal.tsx` 改動遞增)。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 機具工坊彈窗 focus trap**(2026-09-07 例行 session)：延續「其餘 7 個彈窗中再挑代表性樣本補 e2e」的接續建議。`FacilityModal` 是共用元件,依 `kind` 顯示 6 種不同內容(技師公會/機具工坊/船隊整備廠/風場拓展/圖鑑/排行);挑選 `kind="tool"`(機具工坊):由母港「設施」列一鍵開啟、無需前置遊戲狀態,面板內可聚焦元素為關閉✕ + 升級鈕 = **2 個**,開局預算(8420 萬)遠高於首級升級費(100 萬)故升級鈕未 disabled——補上先前樣本(1/3/4/5/28 個)之間尚未覆蓋的「雙元素」情境。沿用既有 `checkModalFocusTrap()`,新增 1 項斷言(合計 **21** 項)。刻意暫時讓 `useFocusTrap.ts` 的 Tab 處理短路成必定 `return` 後重跑,確認新增斷言會如預期連鎖失敗(非空跑,連鎖失敗 6 項)後才提交。純測試新增,無 app 程式碼變動。`FacilityModal` 其餘 5 種 kind 中,`kind="tech"`(技師公會)候選名單以 `Math.random()` 產生、可聚焦元素數量不穩定,暫緩納入,列入需先鎖定 `Math.random()` 才適合納入的清單。剩餘 6 個彈窗(`OpsCenterModal`/`ConstructionModal`/`CaseFileModal`/`ProfileModal`/`TeacherModal`/`ExamModal`)仍完全未有 e2e 樣本。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 課程模式彈窗 focus trap**(2026-09-06 例行 session)：延續「其餘 8 個彈窗中再挑代表性樣本補 e2e」的接續建議。挑選 `CourseModal`(課程模式):觸發鈕是頂欄「⚙」齒輪鈕,隨處可見、無需前置遊戲狀態;面板內可聚焦元素數量在開局狀態下固定(關閉✕+重播教學+獨立測驗模式+教師檢視+開放週次 −/＋(2)+`COURSE_WEEKS` 18 週各 1 個「指派」鈕+匯入任務文字框+匯入並指派+情境包文字框+匯入情境包 = **28** 個;e2e 測試環境全新 `localStorage`、無已匯入情境包,故不含「移除」鈕)。這是先前 3 個樣本(1/3/5 個可聚焦元素)之外刻意挑選的「元素數量遠多、Tab 序列較長」情境,驗證 trap 在 28 個焦點、30 次 Tab 下仍正確循環回頭。沿用既有 `checkModalFocusTrap()`,新增 1 項斷言(合計 **20** 項)。刻意暫時讓 `useFocusTrap.ts` 的 Tab 處理短路成必定 `return` 後重跑,確認新增斷言會如預期連鎖失敗(非空跑,連鎖失敗 5 項)後才提交。純測試新增,無 app 程式碼變動。剩餘 7 個彈窗(`OpsCenterModal`/`ConstructionModal`/`FacilityModal`/`CaseFileModal`/`ProfileModal`/`TeacherModal`/`ExamModal`)中,`OpsCenterModal` 因判斷任務/案例演練隨機抽題、選項數隨模板變動,一併列入需先鎖定 `Math.random()` 才適合納入的清單。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 營運趨勢彈窗 focus trap**(2026-09-05 例行 session)：延續「剩餘 9 個彈窗中再挑代表性樣本補 e2e」的接續建議。挑選 `TrendsModal`:由母港左側「風場動態」面板(預設展開)的「📈 營運趨勢 · 賽後復盤」按鈕一鍵開啟、無需前置遊戲狀態;且 e2e 流程走到這裡時只完成過 1 筆工單(`FINISH_REPAIR` 才會 `pushHistory`),`data.history.length` 未達門檻 2,畫面固定停在「尚無足夠資料」提示、面板內僅關閉✕ 1 個可聚焦元素——補上先前兩個樣本(3 個/5 個可聚焦元素)未覆蓋的「單一可聚焦元素」邊界情境。沿用既有 `checkModalFocusTrap()`,新增 1 項斷言(合計 **19** 項)。刻意暫時讓 `useFocusTrap.ts` 的 Tab 處理短路成必定 `return` 後重跑,確認新增斷言會如預期連鎖失敗(非空跑)後才提交。純測試新增,無 app 程式碼變動。`ProfileModal`(錯題本內容隨答題變動)、`CaseFileModal`(案例連結數隨 Tier/隨機抽案例變動)因可聚焦元素數量不穩定,暫緩納入,留待下次評估固定測試時間點。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 風場戰情室/母港建設彈窗 focus trap**(2026-09-04 例行 session)：延續「其餘 11 個彈窗中挑 1–2 個代表性樣本補 e2e」的接續建議——先前僅「調度中心」有端到端 focus trap 驗證,其餘皆只靠 `test/run.mjs` 的 `nextTrappedIndex`/`getFocusables` 單元測試涵蓋共用邏輯。挑選「風場戰情室」與「母港建設」:兩者皆可從母港「設施」列一鍵開啟、無需前置遊戲狀態,且面板內可聚焦元素數量在開局狀態下固定(風場戰情室=關閉✕+派員定檢+推進一天=3 個;母港建設=關閉✕+4 個設施升級鈕=5 個),Tab 圈數斷言穩定可預期。新增共用測試輔助函式 `checkModalFocusTrap()`,新增 2 項斷言(合計 **18** 項)。刻意暫時讓 `useFocusTrap.ts` 的 Tab 處理短路成必定 `return` 後重跑,確認新增斷言會如預期連鎖失敗(非空跑)後才提交。純測試新增,無 app 程式碼變動。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充 · 加班搶修(#rush)分支**(2026-09-03 例行 session)：延續 2026-09-02 的首筆工單全程測試,新增覆蓋先前 TEST_REPORT 明列的已知缺口——「作業窗吃緊」時的 Part B 三選一分支。在診斷測驗連續故意選錯兩個選項(各扣 3 時段,10 時段的作業窗耗到剩 4、低於估計所需 7),驗證「作業窗吃緊」提示如期出現;點擊 ⚡**加班搶修**,驗證剩餘 3 個 SOP 步驟一次趕完、吃緊提示解除,再答對診斷、完工按鈕轉為可點擊、完成整趟工單,新增 2 項斷言(合計 **16** 項)。`rush()` 的安全近失與否由前端 `Math.random() < RUSH_RISK`(25%)擲骰決定,測試以 `page.evaluate` 暫時覆寫 `Math.random` 鎖定「無事件」分支避免非決定性,用畢即還原。刻意暫時讓 `RUSH_SOP` reducer 不真的完成步驟後重跑,確認新增斷言會如預期連鎖失敗(非空跑)後才提交。純測試新增,無 app 程式碼變動。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試擴充**(2026-09-02 例行 session)：延續 2026-09-01 首批的 7 項,新增覆蓋交易所(`MarketScreen`)/出海(`SailScreen`)/維修(`RepairScreen`)——同一瀏覽器 session 內走完首筆工單「齒輪箱搶修 CH-12」全程:接單→交易所鍵盤 `Enter` 加入購物車並採購必備備品→出海就緒檢查通過並抵達機組→登船→**鍵盤 `Enter` 選擇診斷測驗正解**→**鍵盤 `Enter` 依序完成 3 個可互動 SOP 步驟**→完工回母港、原警報解除,共 7 項新斷言(合計 **14** 項)。把先前僅在 reducer 單元測試層級驗證的診斷/SOP 邏輯,與 PR #122 的 `onKeyActivate` 鍵盤觸發,延伸為端到端驗證「鍵盤真的能推進遊戲狀態、完成工單」。`DialogueLayer`(`say()` 對話框)新增 `data-testid` 供測試辨識與逐句點掉。刻意暫時拿掉診斷測驗選項的鍵盤觸發重跑,確認測試會如預期在該步驟逾時失敗(非空跑)後才提交。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ Playwright UI 迴歸測試**(2026-09-01 例行 session)：新增 `test/e2e.mjs`,以 `playwright`(chromium)對 `npm run build` 產物做端到端瀏覽器驗證——登入畫面載入、訪客登入進入母港、新手教學可跳過、開啟「調度中心」彈窗時 focus 移入面板、**連續 14 次 Tab + 1 次 Shift+Tab 皆侷限於彈窗內**、`Esc` 關閉並歸還焦點、整段流程無 console 錯誤,共 7 項斷言,把前兩輪無障礙工作(工單循環鍵盤操作、彈窗 focus trap)先前僅靠手動截圖驗證的行為沉澱為可重複執行的自動化迴歸測試。排行榜等雲端讀取一律攔截中止,測試不打正式後端、不受網路狀況影響。`.github/workflows/ci.yml` 新增獨立 `e2e` job(與既有 typecheck/test/build 並行),兩者皆須全綠才能合併。刻意暫時破壞 focus trap 邏輯重跑,確認測試會如預期抓到迴歸(非空跑)後才提交。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

**✅ 無障礙 · 彈窗 focus trap**（2026-08-31 例行 session）：新增 `src/ui/useFocusTrap.ts`(`useFocusTrap` hook,搭配 `src/ui/a11y.ts` 新增的純函式 `getFocusables`/`nextTrappedIndex`),套用到全部 12 個彈窗(調度中心、自由營運中心、風場戰情室、風場建置番外篇、母港設施(機具工坊/船隊整備廠/技師公會/故障圖鑑/風場拓展/績效排行)、案例檔、營運趨勢、母港建設、個人檔案、教師檢視、獨立測驗)——開啟時 focus 自動移入面板(無可聚焦子項則落在面板本身)、`Tab`/`Shift+Tab` 侷限循環於面板內(不再逃逸到背景頁面)、`Esc` 可隨時關閉並歸還先前焦點。順帶把先前只能滑鼠點擊的「✕」關閉鈕全數補上 `role="button"`/`tabIndex`/`onKeyDown`(沿用既有 `onKeyActivate`),並在 `index.css` 加上 `.wfg-modal-panel:focus-visible` 聚焦樣式。以無頭瀏覽器實測:鍵盤 Enter 開啟調度中心工單面板 → focus 落在關閉鈕 → 連續 10 次 Tab 與 1 次 Shift+Tab 皆未逃逸出面板 → Esc 關閉且焦點還給原本的設施列。此為上一輪「工單循環鍵盤操作」明確留下的已知限制的直接延續。

**✅ 無障礙 · 工單循環鍵盤操作**（2026-08-31 例行 session）：新增共用鍵盤觸發輔助 `src/ui/a11y.ts`（`onKeyActivate`：Enter/Space 觸發、其餘鍵不動作），套用到工單循環核心畫面的自訂卡片式互動（原本只有滑鼠 `onClick` 的 `<div>`/`<span>`)——母港設施導覽列（`FacRow`/`FacRowMini`/`SecBtn`/收合面板/視角切換/出海按鈕)、交易所買賣分頁與備品卡片、維修畫面的診斷測驗選項與 SOP 步驟清單、調度中心關閉鈕，皆補上 `role="button"`/`tabIndex`/`onKeyDown`；並在 `index.css` 加上 `[role="button"]:focus-visible` 聚焦樣式,讓 Tab 走過時看得到目前焦點。以無頭瀏覽器實測 Tab 依序走完母港設施列、Enter 開啟調度中心工單面板皆正常。原生 `<button>`(出航/登船/完工等)本就可鍵盤操作,未變動。

**✅ 教師端掌握度鑽取改雷達圖**（2026-08-30 例行 session）：`TeacherModal` 的個別學生鑽取（`MasteryDrill`）新增能力雷達圖（重用 `RadarChart.tsx`），與個人檔案頁一致；原本的科別/類別長條保留在雷達下方，兩者互補（雷達一眼看強弱形狀、長條看精確數字與樣本數）。純前端視覺變更，免後端部署即可生效。

**✅ Playwright UI 迴歸測試擴充 · 設施「圖鑑」(FacilityModal kind="codex")CodexCard 鍵盤操作補完**(2026-09-18 例行 session):延續「2026-08-30 專案盤點」接續建議中「`FacilityModal` 剩餘 5 種 kind(技師公會/船隊整備廠/風場拓展/圖鑑/排行)中的代表性樣本」——先前盤點以「內容依 `data.seenFaults`/隨機候選變動,可聚焦元素數量不穩定」為由暫緩。查核 `kind="codex"`(故障圖鑑)的 `FacilityModal.tsx` 原始碼後發現這其實是一處真實的無障礙缺口,而非單純「內容隨機」:`CodexCard`(元件展開/收合列)只有滑鼠 `onClick`,未比照工單循環其餘卡片式互動補上 `role="button"`/`tabIndex`/`onKeyDown`(僅在 `seen===true` 才該進 tab 序,locked 卡片本就不可互動)——鍵盤玩家完全無法展開已解鎖故障的深度排查知識(成因機制/典型症狀/鑑別重點/後果/處置提示),是 2026-08-31 兩輪無障礙工作遺漏的又一處系統性缺口。`DiffQuiz`(鑑別診斷練習分頁)的選項卡亦是同樣缺口,一併修正。本輪測試流程只完成過 1 筆工單(`seenFaults=["gearbox_overheat"]`),`COMPONENTS` 第一組「齒輪箱 / 傳動鏈」恰有 2 個根因故障(1 已解鎖、1 未解鎖),故整份圖鑑中唯一可聚焦的故障卡片就是這一張——可聚焦元素數固定:關閉✕ + 2 個分頁鈕(原生 `<button>`)+ 1 張已解鎖卡片 = 4 個。新增 1 項斷言,驗證「已解鎖 1/…」計數、Tab 序列、鍵盤 `Enter` 展開/收合深度知識、`Esc` 關閉歸還焦點。**已驗證測試有效性**:刻意暫時把本輪新補的 `role`/`tabIndex`/`onKeyDown` 還原後重跑,新增斷言如預期失敗,其餘 32 項不受影響,證明非空跑;還原後 33 項全過。`npm test` = 167 全綠(純 UI 元件無障礙屬性變動,無新增 reducer/純函式邏輯,故無新增單元測試)、`typecheck`/`build` 乾淨。**改動範圍**:`src/ui/FacilityModal.tsx`(app 程式碼)+ `test/e2e.mjs`(測試)+ 本檔/`docs/HANDOFF.md`/`docs/TEST_REPORT.md`(文件),`public/sw.js` 快取版本 **v16→v17**。**已知限制**:`DiffQuiz` 選項卡因目前測試流程僅解鎖 1 個根因(< pools 門檻 2)恆顯示鎖定提示,鍵盤修正暫無法端到端覆蓋,留待後續測試流程走到第 2 筆齒輪箱工單時再補;`FacilityModal` 其餘 4 種 kind(技師公會/船隊整備廠/風場拓展/排行)、`ExamModal` 的「20 題」長度/其他種子排列、大型組件大修(`#overhaul`)/審慎返港再規劃(`#carry`)分支路徑仍待後續盤點。詳見 [TEST_REPORT.md](TEST_REPORT.md) 第 7 節。

---

## 2026-09-02 文件對齊 — Docs catch-up

**使用說明手冊補上落後實作的功能**(`docs/MANUAL.zh-TW.md`,純文件):手冊自 2026-06 後未隨功能更新,本次盤點補齊——

- **新增章節**:§8 學習與評量工具(獨立測驗模式 A–F 等第/掌握度與能力雷達圖/錯題本主動回想/案例演練與案例檔)、§9 無障礙與個人化設定(**鍵盤操作**、減少動態、色覺友善雙重編碼、背景模式);原 FAQ 改編為 §10。
- **修正過時內容**:「返航改期」語意更正為**審慎決策**(耗 1 天、**不計安全事件**、進度保留),原文誤述為「記為安全近失」;母港設施表補**母港建設**與**案例檔**,「CTV 整備廠」正名為**船隊整備廠**;故障表「發電機振動異常」必備備品由主軸承更正為 **傳動軸承組(發電機/主軸)**(PR #116 軸承正名後的殘留),並加註三種軸承備品的區別;移除 HSE 列誤植的 ⚙(該符號僅代表重大故障)。
- **補入既有系統說明**:出海前工期預估、作業窗吃緊三選一(繼續/⚡加班搶修 25% 風險/回港再規劃)、任務復盤星級、診斷連對 🔥、運維層級 Tier 四級、每日任務(維持型日結算)、每週主題挑戰、人力短缺實效化。

**新增 `CLAUDE.md`**(根目錄):專案慣例速查——常用指令、硬性規則(禁改 `CLOUD_FIRST`/`TEACHER_CODE`、禁破壞性 git、`sw.js` 快取版本 +1)、分支與測試慣例、**文件同步義務表**、視覺驗證流程。Claude Code 會自動載入,讓每個新 session 一開始就知道專案規矩。

### 例行推進節奏 — Delivery cadence

自 2026-08-30 起,ROADMAP 的待辦由**自動化例行排程(Routine)**推進:**每週一/三/五**各觸發一次,每次只推進**一個**項目,並強制走完「開發 → `typecheck`+`test`+`build` 全綠 → 更新文件 → PR → CI 綠 → 合併」。上方 2026-08-30〜09-01 的四項 ✅ 即為排程產出(PR #121–#124)。排程會**跳過需擁有者親自處理的項目**(見下方決策事項),僅在報告中提醒。細節與暫停方式見 [HANDOFF.md](HANDOFF.md)「自動化例行排程」。

---

## 2026-08-30 專案盤點與整備 — Repo audit & cleanup

程式功能無變動,本輪為**倉庫健康度整理**(全數 120 個 PR 已合併、`npm test` 164 全綠):

- **分支稽核**:逐一驗證 45 個遠端分支——每個歷史分支的 tip 皆「是 main 的祖先」或「等於某個已合併 PR 的 head」(早期 PR 採 squash merge,SHA 不同但內容已進 main)。**43 個可安全刪除**,一鍵指令見 `scripts/cleanup-merged-branches.sh`。
- **文件整理**:新增 [docs/README.md](README.md) 文件索引(依玩家/教師/開發者分類);移除 2 個冗餘 zip(內容已解壓於 `design_handoff_offshore_om_game/`);校正本文備品/戰情室故障池統計為實跑值(34 備品 / 27 戰情室故障)。

### ⚠ 待專案擁有者決策 — Decisions needed

1. **`claude/cloud-first-accounts` 分支上的未合併部署設定**(commit `ff9d2f6`,2026-06-25 擁有者手動提交):把 `src/cloud/sheet.ts` 的 `CLOUD_FIRST` 改 `true`、`TEACHER_CODE` 填入實際教師碼。這是**全部 45 個分支中唯一未進 main 的內容**。合併它會讓正式站切換成「雲端為主帳號」,前提是後端 `Code.gs` 已重新部署為 v2+(建議直接部署 v2.2,順帶啟用教師掌握度鑽取);教師碼也會公開於 main(前端本來就藏不住,見 CLOUD_SETUP.md 安全層級說明,但請確認可接受)。**決定合併或棄用後,即可刪除該分支。**
2. **後端 v2.2 重新部署**(既有待辦,見下方「後續接續工作」):這是啟用教師端掌握度鑽取的唯一部署動作,與上一項可一次處理。

### 建議下一步優先序 — Proposed next steps (2026-08-30)

功能面已達可授課完成度(120 PR、164 測試全綠),建議把重心從「加功能」轉為「**部署上線 → 課堂實測 → 依數據迭代**」:

1. **P0・部署整備(開學前,一次做完)**:重新部署 `Code.gs` v2.2(新版本部署)→ 決策並處理 `CLOUD_FIRST`/教師碼(上方決策事項 1)→ `npm run live-check` 驗證線上後端 → 跑一次 `scripts/cleanup-merged-branches.sh` 完成分支清理。
2. **P1・課堂試用回饋循環(新學期)**:實際班級投放(學號帳號+班級碼),每週用教師面板 CSV/掌握度鑽取觀察學習成效;回饋開成 GitHub Issues 作為下一輪功能依據。~~搭配一次 `npm run sim` 完整平衡回測(內容修正後尚未重跑)~~ —— ✅ 已完成(2026-09-14,見上;相對排序/梯度健康,免校正)。
3. **P2・教學深化(依課堂數據擇一)**:每機獨立健康度/RUL 預測性維護(建議先出設計草案)、Exam 進階版(教師發布+雲端報告)、內容編輯器(教師資料驅動新增故障)。
4. **P2・無障礙延伸**:✅ 鍵盤操作走完工單循環、✅ 全部彈窗 focus trap(Tab 侷限循環 + Esc 關閉)均已完成(2026-08-31);尚待色盲配色全面審查、對話/音效字幕。
5. **持續・工程健康**:分支策略改「短命分支、合併即刪」;建議在 GitHub 設定 main 分支保護(要求 CI 綠才可合併);✅ Playwright UI 迴歸測試(`npm run e2e` + CI `e2e` job)首批(2026-09-01)+ 交易所/出海/維修畫面擴充(2026-09-02)+ 加班搶修分支(2026-09-03)+ 風場戰情室/母港建設彈窗 focus trap(2026-09-04)+ 營運趨勢彈窗 focus trap(2026-09-05)+ 課程模式彈窗 focus trap(2026-09-06)+ 機具工坊彈窗 focus trap(2026-09-07)+ 風場建置番外篇彈窗鍵盤操作補完(2026-09-08)+ 登入畫面鍵盤操作補完/`TeacherModal` 樣本新增(2026-09-09)+ 頂欄(TopBar/MobileBar)鍵盤操作補完/修正串接開啟彈窗焦點遺失迴歸(2026-09-10)+ 個人檔案(ProfileModal)彈窗 focus trap(2026-09-11)+ 案例檔(CaseFileModal)彈窗 focus trap(2026-09-12)+ 自由營運中心(OpsCenterModal)判斷任務選項卡鍵盤操作補完(2026-09-13)+ 獨立測驗模式(ExamModal)作答頁/結果頁(2026-09-14)+ 自由營運中心案例演練(`kind:"case"`)分支(2026-09-15)、個人檔案(ProfileModal)「已作答/有錯題」狀態 + 錯題本主動回想完整互動流程(2026-09-16)、TeacherModal「查詢結果」狀態 + 個別學生掌握度鑽取鍵盤操作補完(2026-09-17)、`FacilityModal` 設施「圖鑑」(kind="codex")CodexCard 鍵盤操作補完(2026-09-18)、`FacilityModal` 設施「風場拓展」(kind="farms")focus trap 樣本新增(2026-09-19)、`FacilityModal` 設施「船隊整備廠」(kind="vessel")focus trap 樣本新增(2026-09-20)、`FacilityModal` 設施「績效排行」(kind="ranking")focus trap 樣本新增(2026-09-21)、`FacilityModal` 設施「技師公會」(kind="tech")focus trap 樣本新增(2026-09-22)、獨立測驗模式(ExamModal)「20 題」長度樣本新增(2026-09-23)皆已完成,共 **38** 項,至此 `FacilityModal` 6 種 kind 全數覆蓋、`ExamModal` 兩種題數長度(10/20 題)皆已覆蓋——後續可再挑 `ExamModal` 其他種子排列(優先序較低),或涵蓋大型組件大修(#overhaul)/審慎返港再規劃(#carry,需處理跨日天氣重擲的非決定性)等目前尚未走過的分支路徑。

---

## 前輪已完成 — 出海決策支援・學習迴路收斂・無障礙・內容全面查核

對應 [GAME_DESIGN.md](GAME_DESIGN.md) §17：

- **出海前工期預估 vs 天氣窗**：出勤就緒檢查新增工期預估卡(航線/登船/檢查/維修 + 保留餘裕)，並附磨耗/疲勞/天氣窗擇日提醒。只提示、不擋出航。
- **半途成果保留（#carry）**：審慎返港再規劃 —— 進 1 天、不計安全事件、已完成的診斷/SOP 進度保留，與「作業窗關閉才撤離」(進度全失+計安全事件)明確區隔。
- **加班搶修（#rush）**：維修不利時的第三選項 —— 剩餘 SOP 一次趕完、耗時減半，但 25% 機率安全近失事件。「快 vs 穩」風險抉擇。
- **任務復盤 + 診斷連對 streak**：完工給星級復盤(依餘裕/答錯扣星)+一句 takeaway；診斷連對累積 🔥 徽章與封頂 XP 加成。
- **錯題本主動回想**：複習前先自我測驗(隱藏正解、二選一)，答完才揭曉正解與教訓，比只看反思更利記憶保留。
- **無障礙**：`prefers-reduced-motion` 系統偏好 + 個人檔案頁手動開關(影片改靜態首幀、動畫停用)；海象/故障狀態圖示化雙重編碼(不只靠顏色)。
- **遊戲手感**：完工/連對里程碑 toast、Toaster 佇列化(不再互相蓋掉)、TopBar 預算增減變色。
- **戰情室 SLA 季末風險 + 母港預算續航**提醒（inline，非母港輪播）。
- **內容系統全面查核與修正**（事件/案例/任務/故障 × 消費端交叉驗證）：
  - 每日任務「維持型」項目改為**日結算**(deferred)，修正開局即可白拿獎勵的問題。
  - `RESOLVE_TASK` 的安全事件數**夾 0**，堵住「降低事件」選項可刷成負值反向加分的漏洞。
  - 備品資料誤植修正：感測器誤報(sensor)誤耗發電機碳刷→改風速計；變槳故障(pitch)誤耗液壓油→改變槳後備電池。
  - 交易所預設 Tier 過濾下，進行中工單的必備備品**永遠可見**，避免主線卡關。
  - 移除 3 組重複任務模板；1 則真實案例研究「正解」誤植安全事件已修正。
  - 已查核確認乾淨：quiz 索引、跨檔 id 引用、i18n 完整性、Tier 閘門、派工守衛一致性、事件權重、案例去重。
- **Pages 部署硬化**：`deploy.yml` 新增 `actions/configure-pages`(鎖定發佈來源為 GitHub Actions，避免誤切回「Deploy from a branch」導致線上端出未 build 原始碼)；`concurrency.cancel-in-progress` 改 false。

**續作已完成（PR #116，原留待下次的兩項，見 §18）**：bearing 類故障備品正名（新增 Tier 3「傳動軸承組」`drive_bearing`，主軸承振動/發電機振動不再權宜共用「變槳軸承」，並補 `pitch_bearing_wear` 事件避免孤兒備品）；`crew_shortage`/`strike` 事件實效化（缺工直接折抵戰情室「可同時開的現場作業面」，滿編不懲罰、下限 1、可休整回復）。

**再一輪已完成（PR #117，收尾三項延伸候選，見 §19）**：**獨立測驗模式**（跨科別均衡抽題、無提示單次作答、A–F 等第＋各類別對錯＋錯題覆盤；`RECORD_EXAM` 計入掌握度與錯題本但不動遊戲分數）；**掌握度雲端同步・教師端個別鑽取**（存檔夾帶掌握度摘要、後端 `Code.gs` v2.2 存/回、教師面板點列展開各科別正確率，向後相容）；**母港建設疊實境/漫畫背景**（`PortScene` 依背景模式疊 `harbor.jpg`/`comic_harbor.jpg`）。

**文件校正已完成（issue #119）**：`docs/TEST_REPORT.md`／`docs/MANUAL.zh-TW.md` 內殘留較早快照的測試數/題數/故障種數/備品種數，校正為 `npm test`(164)／`TASKS.length`(192)／`FAULTS`(25)／`PARTS`(34) 實跑值；`docs/WALKTHROUGH.md` 查核後確認無殘留舊統計。純文件變更。

---

## 後續接續工作 — Next（給下一個 session 的接手清單）

> 依「立即可做 → 需後端 → 願景」排序；交接細節見 [HANDOFF.md](HANDOFF.md)。

**立即可做（免後端）**
- **Playwright UI 迴歸測試擴充** — ✅ 首批（2026-09-01，登入/訪客/教學跳過/調度中心彈窗 focus trap）、交易所/出海/維修畫面擴充（2026-09-02）、加班搶修（`#rush`）分支（2026-09-03）、風場戰情室/母港建設彈窗 focus trap（2026-09-04）、營運趨勢彈窗 focus trap（2026-09-05）、課程模式彈窗 focus trap（2026-09-06）、機具工坊彈窗 focus trap（2026-09-07）、風場建置番外篇彈窗鍵盤操作補完（2026-09-08）、登入畫面鍵盤操作補完 + `TeacherModal` 樣本新增（2026-09-09）、頂欄（TopBar/MobileBar）鍵盤操作補完 + 修正串接開啟彈窗焦點遺失迴歸（2026-09-10）、個人檔案（ProfileModal）彈窗 focus trap（2026-09-11）、案例檔（CaseFileModal）彈窗 focus trap（2026-09-12）、自由營運中心（OpsCenterModal）判斷任務選項卡鍵盤操作補完（2026-09-13）、獨立測驗模式（ExamModal）作答頁/結果頁（2026-09-14）、自由營運中心案例演練（`kind:"case"`）分支（2026-09-15）、個人檔案（ProfileModal）「已作答/有錯題」狀態 + 錯題本主動回想完整互動流程（2026-09-16）、TeacherModal「查詢結果」狀態（2026-09-17）、`FacilityModal` 6 種 kind 全數覆蓋（2026-09-18〜09-22）、獨立測驗模式（ExamModal）「20 題」長度樣本（2026-09-23）皆已完成，共 **38** 項（`npm run e2e` + CI `e2e` job）；後續可再挑 `ExamModal` 其他種子排列（優先序較低），或涵蓋大型組件大修/審慎返港再規劃（`#carry`，需處理跨日天氣重擲的非決定性）等分支路徑。
- **戰情室停機折抵「現金」收入的設定開關** — 目前停機只折抵淨發電；提供設定把戰情室層接入售電現金流（需確認經濟平衡）。
- **每機獨立健康度 / RUL 預測性維護** — 由全場 `fleetHealth` 延伸到每台機組健康指標與剩餘壽命建模，深化 CBM／預測性維護教學（中大型，建議先出設計草案）。
- **無障礙延伸（後續）** — ✅ 工單循環鍵盤操作、✅ 全部彈窗 focus trap（開啟時 focus 移入、Tab/Shift+Tab 侷限循環於面板內、Esc 關閉並歸還焦點）皆已完成（見上）；尚待：更全面色盲配色審查、對話／音效字幕與旁白。

**需後端（先重新部署 Apps Script `Code.gs`）**
- **⚠ 啟用教師端掌握度鑽取（唯一部署待辦）** — client 與 `Code.gs` v2.2 皆就緒且向後相容；要讓教師面板**顯示鑽取資料**，需把後端更新到 v2.2 並「**新版本**」重部署（見 [CLOUD_SETUP.md](CLOUD_SETUP.md)）。未部署時前端照舊、教師面板顯示「尚無掌握度資料」。
- **Exam Mode 進階版（教師發布＋雲端報告）** — 目前為本機評量；進階為教師發布指定測驗、結束生成報告並同步教師端、動態參數防抄襲。
- ~~**掌握度鑽取改雷達視覺**~~ — ✅ 已完成（2026-08-30 例行 session）。

**願景（未排程）**：多人／班級競賽賽季、CC0 音樂與各地點美術、內容編輯器（教師資料驅動新增故障）。

---

## 近期已完成里程碑摘要 — Recently shipped

以下為**已實作並驗證**的核心（對應 GAME_DESIGN §11/§14/§15/§17）：

- **核心玩法**：出勤就緒閘門、四畫面循環（母港/交易所/出海/維修）、診斷測驗 + SOP + 作業窗、出航航線俯瞰圖、登船延誤。
  *Mobilization-gated work-order loop, diagnosis quiz + SOP + work window.*
- **經濟單一真實來源**：售電收入與妥善率以機隊運轉比例 `fleetUptime` 計；停機直接折抵淨發電（少賺＋扣分）。季度合約 SLA、倉儲折舊、技師薪資/疲勞、船舶磨耗/保養、多回合大修＋待命費。
  *Single-source economy: revenue & availability from live fleet uptime; quarterly SLA, storage spoilage, fatigue, vessel wear, multi-turn overhaul.*
- **風場戰情室（活體營運層）**：4 風場 × 24 機組、並行工單派遣、遠端重啟、預防性定檢、船舶並行上限。
  *Live Fleet Ops: parallel dispatch, remote reset, preventive inspection.*
- **雙層架構**：主線 7 關（每週開放、計分）＋自由營運沙盒（192 題判斷型任務、7 類、即時輔助圖、付費進階檢測）。
- **擬真系統**：微觀天氣三日預報、機組健康度與連鎖反應、突發事件、安全 KPI、綜合績效分。
- **互動式新手教學（莉莉聚光燈導覽）**：首次進場由莉莉以手機遊戲式 coach-mark（高亮當下按鈕、其餘變暗）手把手帶完一次完整工單循環（接單→出海→出勤檢查→登塔→診斷→SOP→完工）；可跳過、可從 ⚙ 選單重新播放。
  *First-time interactive coach-mark onboarding by Lily; skippable & replayable.*
- **教學/教師**：圖鑑、課程模式、知識點標籤、雲端班級排行榜（Apps Script，含防作弊）。
- **帳號與雲端為主（學習歷程基礎）**：以**學號**為帳號、班級碼分群、**通關碼登入（後端 Apps Script 驗證）**；同台多帳號、跨裝置登入；存檔/學習紀錄**雲端為主＋離線快取（較新者為準）**。設定見 [CLOUD_SETUP.md](CLOUD_SETUP.md)。
  *Student-ID accounts + server-verified passcode; cloud-first saves/records with offline cache.*
- **學習歷程・成就・個人檔案頁**：15 項里程碑成就（任務/戰役/番外篇/圖鑑/發電/戰情室/風場/零事故/SLA/船隊/績效），個人最佳紀錄（只增不減）跨裝置同步；右上角頭像開啟個人檔案頁。
- **遊戲內教師檢視面板**：⚙ 課程模式 →「教師檢視」，輸入**班級碼＋教師碼**唯讀檢視全班績效/天數/可用率/發電量/更新時間。
- **故障型錄與備品擴充**：故障 25 種(涵蓋機械/電氣/控制/結構/HSE 五大科別、「同元件不同根因」)、備品 34 種、戰情室故障池 27 種,並串接課程週次。
  *Expanded to 25 faults across all 5 disciplines, 34 parts, 27 fleet incidents.*
- **HSE 科別加厚**：新增 LOTO 能量隔離、高處墜落防護、SIMOPS 同時作業三類工安情境(完整診斷測驗＋SOP＋圖鑑五欄＋戰情室事件＋需 HSE 技師);HSE 元件群成為多重根因,可做工安鑑別診斷練習。安全永遠優先於發電。
  *HSE depth: LOTO / fall-protection / SIMOPS scenarios with full quiz, SOP, codex & fleet incidents — safety before output.*
- **知識點掌握度**：統計學生各科別/各任務類型的答題正確率,於個人檔案頁顯示掌握度並給弱點補強建議(導向圖鑑複習/沙盒多練)。
  *Knowledge-point mastery: per-discipline/category accuracy with weakness-remediation hints.*
- **直升機進場 / 電網限電真實權衡任務**：自由營運沙盒新增 8 題真實運維判斷——直升機吊掛進場(封船海象/遠海急件/作業限值/成本效益)與電網限電(負電價降載/限電補償/低電壓穿越 FRT/順勢維修)。
  *Real-ops tradeoffs: helicopter access & grid-curtailment judgment tasks.*
- **呈現**：三模式背景（模擬/實境/漫畫）、60° 俯瞰、多場景登塔（機艙/塔架/輪轂/甲板，含實景/漫畫情境圖與出海/大修場景影片）、Web Audio 音效音樂、中英雙語。母港左側「設施／風場動態」面板可各自獨立收合，設施項目皆有專屬圖示（含技師人物立繪）。
- **工程**：自動化測試 `npm test`（167 項）、平衡模擬器 `npm run sim`、併發壓力測試 `npm run stress`、**Playwright UI 迴歸測試 `npm run e2e`（31 項）**、PR CI（typecheck/test/build + e2e，兩個 job 並行）。完整系統測試紀錄見 [TEST_REPORT.md](TEST_REPORT.md)（測試數為本文撰寫時的既有紀錄，隨版本增加，以 `npm test` 實跑結果為準）、壓測細節見 [STRESS_TEST.md](STRESS_TEST.md)。

---

## 進行中或下一步 — Next（短期）

聚焦「打磨現有體驗」與「教師可用性」，多數可在現有架構上漸進完成：

- **✅ 循序漸進難度（運維層級 Tier）** — 已完成（#76/#77）。依進度自動推進的 Tier 系統:故障/備品/經濟壓力隨累積發電/風場數/任務數/主線進度分層解鎖,入門只見可重啟軟故障+耗材級小修,規模大才解鎖中/大組件;Hub Tier 徽章+升級提示、交易所 tier 過濾、入門隱藏進階面板。
- **✅ 每日任務** — 已完成（#78）。綁遊戲內日曆的小目標(修復/任務/發電/零事故/健康度/妥善率),達成自動發獎 + 連勝。
- **✅ 每週主題挑戰（綁戰情室事件池）** — 已完成（#79）。風暴/斷料/人力/大修/平穩週,主題改變故障率,完成給較大獎勵 + 連續完成週。（即此前列的「每週主題化戰情室事件池」）
- **✅ 情境包匯入** — 已完成（#80）。一般化教師自訂任務匯入為「情境包(JSON)」,可一次匯入一組沙盒判斷型任務,與內建並存、可移除（見 docs/scenario-pack-example.json）。
- **✅ 真實度深化** — 已完成（#81）。jack-up 安裝船動員前置期+一次性動員費(待命費改為到場後才收);計畫性定期保養(降故障率+回健康度),補齊維護三分類。
- **✅ 故障/備品分層擴充** — 已完成（#82）。在 Tier 框架下新增防蝕/變壓器套管/海纜接頭過熱等故障(22 故障/30 備品),使海纜/塔架/變壓器成為多重根因。
- **✅ 併發壓力測試** — 已完成。`npm run stress` 忠實重現後端契約做併發負載,證實「多人同時送分」可負荷(見 docs/STRESS_TEST.md)。
- **✅ 真實案例研究事件** — 已完成並擴充至 **24 則**(具名+出處 / 去識別技術重現兩類,涵蓋基礎/齒輪箱/葉片/海纜/電氣火災/船舶/偏航/變槳/雷擊/電網/變壓器等)。除依 Tier 偶發快報外,**自由營運中心任務清單會以約 1/4 機率自然抽出「📁 案例演練」(略過 Tier、答後揭示 O&M 教訓並收錄母港「案例檔」、計入科別掌握度)**(見 docs/CASE_STUDIES.md)。
- **✅ 教師面板 CSV 匯出** — 已完成。教師檢視面板可一鍵「⬇ 匯出 CSV」全班績效/天數/可用率/發電量,前端產檔下載、不經雲端,方便登分與課後分析。
- **✅ 營運趨勢儀表板 / 賽後復盤** — 已完成。每次推進日累積 KPI 歷史,母港「📈 營運趨勢·賽後復盤」顯示妥善率/健康度/收入vs支出/淨額/累積發電的時間序列圖 + 期間摘要(平均/最低妥善率、總收入/支出/淨額、發電增量),作教學覆盤工具。
- **✅ 登入畫面教師入口** — 已完成。登入畫面提供教師入口(免先登入遊戲),輸入班級碼+教師碼即可開啟唯讀教師檢視。
- **✅ 出海決策支援・學習迴路收斂・無障礙** — 見上方「前輪已完成」與 [GAME_DESIGN.md](GAME_DESIGN.md) §17。
- **✅ bearing 類故障備品命名/Tier 重新設計** — 已完成。新增 Tier 3「傳動軸承組(發電機/主軸)」(`drive_bearing`, ◎130 萬),主軸承振動(`bearing`)與發電機振動(`gen_vibration`)改指專屬備品,與 Tier 4「主軸承」全換(`main_bearing`)語意區隔;並新增 `pitch_bearing_wear`(變槳軸承磨耗)事件,讓變槳軸承備品保有真實消費端(呼應 `cs_pitch_bearing_wear` 案例)、不成孤兒。見 [GAME_DESIGN.md](GAME_DESIGN.md) §18。
- **✅ crew_shortage / strike 事件實效化** — 已完成。缺工(`techTotal − techAvail`)直接折抵戰情室「可同時開的現場作業面」(`effectiveJobCapOf = max(1, jobCapOf − ⌈缺額/CREW_PER_JOB⌉)`):滿編不懲罰(以缺額計)、下限 1(短手仍可派一組、遠端重啟不占名額、主線不受限)、每日休整回復;開局改滿編 30/30、tech 升級同步 techAvail、戰情室顯示缺工折抵。事件從純展示變成「先遠端重啟軟故障/批次搶修/靠港補人」的真實取捨。見 [GAME_DESIGN.md](GAME_DESIGN.md) §18。
- **試玩微調與平衡回測** — 依 `npm run sim` 持續校正故障率/經濟手感;本輪修正備品資料與每日任務發獎時機後,建議重跑一次完整回測。
- **戰情室停機折抵「現金」收入的選項** — 目前停機已折抵淨發電；提供把戰情室層也接入售電現金的設定開關（需與設計者確認）。
- **文件持續對齊** — README / 手冊 / 攻略隨數值變動同步維護；`docs/TEST_REPORT.md`、`docs/MANUAL.zh-TW.md`、`docs/WALKTHROUGH.md` 內的測試數/任務題數等統計為較早版本快照，下次更新時一併校正為 `npm test`/`TASKS.length` 實跑值。

---

## 中期 — Mid-term（規劃中）

擴充內容深度與教學可衡量性：

- **更多故障型錄與科別** — ✅ 已完成(25 故障 / 33 備品 / 五大科別,含 HSE 加厚 LOTO・墜落防護・SIMOPS,見上「近期已完成」);後續可再擴充更細的子型錄與圖鑑解說、針對單一元件的多重根因題組。
- **教師後台與班級報表強化** — ✅ 已完成雲端為主帳號(學號+通關碼後端驗證)與**遊戲內教師檢視面板**(班級碼+教師碼,唯讀檢視全班績效/天數/可用率/發電量,見 docs/CLOUD_SETUP.md);後續可再加 SLA 達成彙整與 CSV 匯出。
- **成就 / 任務系統** — ✅ 首批里程碑成就(15 項:任務/戰役/番外篇/圖鑑/發電/戰情室/風場/零事故/SLA/船隊/績效)與**個人檔案頁**已完成,學習歷程跨裝置雲端同步;後續可再加每日/每週挑戰。
- **資料分析儀表板** — ✅ 首版已完成(見上「營運趨勢儀表板 / 賽後復盤」);後續可再加每週/每關自動復盤頁與教師端彙整。
- **新手友善・漸進式揭露強化** — ✅ 已完成(對應 WM3 報告建議 1.2)。Tier 1(見習運維員)隱藏進階資訊以專注核心循環:三日天氣預報、技師疲勞細節改於 Tier 2 解鎖(母港與出海畫面皆然),並附「Tier 2 解鎖」提示降低認知負荷。
- **生活化比喻** — ✅ 已完成(對應 WM3 報告建議 1.2)。圖鑑為入門常見故障(齒輪箱過熱/偏航/變槳/變流器/發電機過溫·振動)加上「💡 生活化比喻」(汽車引擎、腳踏車輪軸、電腦風扇等),幫無背景玩家秒懂。
- **戲劇性(非技術)事件** — ✅ 已完成(對應 WM3 報告建議 2.2)。事件池新增環保團體抗議、負面/正面媒體報導、地方社區支持、主管機關稽查,以聲望/合規成本呈現,增加張力與代入感(不需新機制)。
- **母港建設・視覺成長** — ✅ 已完成(對應 WM3 評估報告建議 2.2)。新增「🏗 母港建設」設施:用獲利升級碼頭/倉儲/起重機/燈塔(各 3 級),母港即時預覽畫面隨之長大(更多停泊船、貨櫃、起重機、點亮燈塔招牌),把數值成長轉化為視覺成就感(純視覺、不影響計分)。**✅ 後續已完成:PortScene 依全域背景模式疊到母港實境(`harbor.jpg`)/漫畫(`comic_harbor.jpg`)背景**(見 [GAME_DESIGN.md](GAME_DESIGN.md) §19)。
- **學習成效分析(能力雷達圖 + 錯題本)** — ✅ 已完成(對應 WM3 評估報告建議 3.1/3.3)。個人檔案頁新增**各科別能力雷達圖**(視覺化既有知識點掌握度),與**錯題本**:答錯自動收錄情境/你的選擇/正解/教訓,可寫「維修檢討」反思(形成性評量)後標記已複習。純本機,免後端。**✅ 後續已完成:掌握度同步雲端 → 教師端個別學生鑽取(#mastery-cloud,後端 v2.2)、以及獨立「測驗模式」(#exam,`exam.ts`/`ExamModal`,跨科別評量＋錯題覆盤,計入掌握度但不動遊戲分數)**(見 [GAME_DESIGN.md](GAME_DESIGN.md) §19)。
- **在地化擴充** — 介面字串抽離與第三語言（如英文以外）擴充流程整理；既有雙語架構已就緒。
- **效能與測試覆蓋率提升** — 擴大 state 層測試、加入關鍵 UI 流程的回歸測試，整理大型畫面元件。

---

## 長期願景 — Long-term（推測 / speculative）

⚠ 以下方向**尚未排程**，為願景探索，可行性與優先序待評估：

- **行動裝置 RWD** — 目前為 1600×900 等比舞台。**✅ 已先上 PWA(階段 1)**:可「加到主畫面」、離線可玩、橫向全螢幕、單一程式碼庫(網頁/手機並存),平板橫向現況即可用;後續可再做手機直向的響應式版面與(選配)Capacitor 商店包殼。
- **多人 / 班級競賽模式** — 在現有雲端排行榜之上，加入限時班級賽季、合作經營或對抗情境。
- **無障礙與音效字幕（部分已完成）** — ✅ 減少動態(`prefers-reduced-motion` + 手動開關)與海象/故障狀態圖示化雙重編碼已完成(見 [GAME_DESIGN.md](GAME_DESIGN.md) §17)；✅ 工單循環鍵盤操作、✅ 全部彈窗 focus trap 皆已完成(2026-08-31,見上「建議下一步優先序」);尚待規劃：更全面的色盲友善配色審查、對話/音效字幕與旁白。
- **CC0 實體音樂 / 各地點專屬場景美術** — 以授權乾淨的素材替換或補強現有合成音樂與場景（GAME_DESIGN §11 已列規劃）。
- **每機獨立健康度 / 更細的預測性維護** — 由全場健康度延伸到每台機組的健康指標與剩餘壽命（RUL）建模，深化預測性維護教學。
- **內容編輯器 / 教師自製故障** — 讓教師以資料驅動方式新增故障、題目與課程週次，無需改程式碼。

---

## 不在範圍 — Non-goals

- 重寫核心為遊戲引擎（維持純 DOM/CSS 的輕量、可教學可改的特性）。
- 走向商業化付費機制（本作定位為教學工具，採 MIT 授權）。

---

*工作項目於 [GitHub Issues](https://github.com/dofliu/windFarm-Go/issues) 追蹤。本藍圖為規劃方向，會隨課程回饋與試玩結果調整。*
