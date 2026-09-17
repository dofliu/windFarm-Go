// Playwright UI 迴歸測試：對 `npm run build` 產物做端到端瀏覽器驗證(golden path + 無障礙迴歸),
// 補上先前僅在開發 session 手動用 playwright-core 截圖驗證、未沉澱為可重複執行測試的缺口。
// 執行：npm run build && npm run e2e   （node test/e2e.mjs）
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const BASE_PATH = "/windFarm-Go"; // vite.config.ts: build 走 GitHub Pages 子路徑

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4",
  ".woff2": "font/woff2", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
};

async function ensureBuilt() {
  try { await stat(join(DIST, "index.html")); }
  catch { console.error("✗ dist/index.html 不存在，請先執行 `npm run build`"); process.exit(1); }
}

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      let p = decodeURIComponent((req.url || "/").split("?")[0]);
      if (p.startsWith(BASE_PATH)) p = p.slice(BASE_PATH.length) || "/";
      if (p === "/") p = "/index.html";
      const filePath = normalize(join(DIST, p));
      if (!filePath.startsWith(normalize(DIST))) { res.writeHead(403); res.end(); return; }
      try {
        const data = await readFile(filePath);
        res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404); res.end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// ── 迷你非同步測試框架(呼應 test/run.mjs 的風格,但支援 async) ──
let pass = 0, fail = 0;
const fails = [];
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { fail++; fails.push(`${name}: ${e.message}`); console.log(`  ✗ ${name}: ${e.message}`); }
}
function ok(cond, msg = "expected truthy") { if (!cond) throw new Error(msg); }
function eq(a, b, msg) { if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

// 通用彈窗 focus trap 迴歸：全部 12 個彈窗共用同一個 `useFocusTrap` hook 與 `[role="dialog"].wfg-modal-panel`
// 結構(邏輯已由 test/run.mjs 的 nextTrappedIndex/getFocusables 單元測試涵蓋),此處只再抽驗 1–2 個
// 尚未有 e2e 樣本的彈窗(調度中心已由前面測試涵蓋),確認鍵盤操作在真實瀏覽器渲染下也成立。
async function checkModalFocusTrap(page, { triggerText, tabCount }) {
  await page.getByText(triggerText, { exact: true }).click();
  const dialog = page.locator('[role="dialog"].wfg-modal-panel');
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  const inPanel = () => page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"].wfg-modal-panel');
    return !!panel && panel.contains(document.activeElement);
  });
  ok(await inPanel(), "彈窗開啟後 focus 應落在面板內");
  for (let i = 0; i < tabCount; i++) {
    await page.keyboard.press("Tab");
    ok(await inPanel(), `第 ${i + 1} 次 Tab 後 focus 逃出了彈窗`);
  }
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  eq(await dialog.count(), 0, "Esc 後彈窗應已卸載");
  const restored = await page.evaluate(
    (txt) => document.activeElement?.textContent?.includes(txt) ?? false,
    triggerText,
  );
  ok(restored, `焦點應歸還給開啟彈窗前的「${triggerText}」設施列`);
}

// 逐句點掉底部對話框(DialogueLayer,全螢幕 zIndex:50 遮罩):第一下把逐字動畫補完、第二下換下一句，
// 直到對話框卸載或達到上限次數(保守抓 10 下,涵蓋目前劇本最長的 intro/outro + 復盤三則)。
async function dismissDialogue(page, maxClicks = 10) {
  const layer = page.locator('[data-testid="dialogue-layer"]');
  for (let i = 0; i < maxClicks; i++) {
    if (await layer.count() === 0) return;
    await layer.click();
    await page.waitForTimeout(120);
  }
}

async function main() {
  await ensureBuilt();
  const server = await startServer();
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}${BASE_PATH}/`;

  const browser = await chromium.launch();
  const consoleErrors = [];
  const pageErrors = [];

  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, serviceWorkers: "block" });
    // 測試維持離線隔離：排行榜/雲端讀取(script.google.com)一律擋下,不打真實正式後端,
    // 也避免測試環境本身的網路狀況(如出站代理白名單)造成非決定性失敗；app 對讀取失敗本就有離線降級。
    await context.route("**://script.google.com/**", (route) => route.abort());
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      if (msg.text().startsWith("Failed to load resource")) return; // 瀏覽器層級的資源載入失敗訊息,非程式擲出的錯誤
      consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(String(err)));

    await test("登入畫面正確載入", async () => {
      await page.goto(base, { waitUntil: "networkidle" });
      await page.getByText("離岸風場・運維傳說").waitFor({ state: "visible", timeout: 10_000 });
    });

    await test("登入畫面：教師檢視入口鍵盤 Enter 開啟、TeacherModal focus trap 正常", async () => {
      // 「教師檢視入口」(LoginScreen)原本是只有滑鼠 onClick 的 <div>，未比照工單循環其餘卡片式
      // 互動補上 role="button"/tabIndex/onKeyDown，鍵盤玩家完全無法從登入畫面開啟教師檢視——
      // 這是 2026-08-31「無障礙 · 工單循環鍵盤操作」與 2026-08-31「全部彈窗 focus trap」兩輪皆聚焦
      // 於登入後母港畫面、遺漏登入畫面本身的一處缺口。本輪一併補上登入畫面全部 7 個同類自訂
      // 卡片式互動(帳號清單列/切換模式連結/訪客試玩/教師檢視入口)。這裡用鍵盤 Enter 觸發(而非
      // 滑鼠點擊)驗證 onKeyActivate 真的可運作，並順帶補上 TeacherModal 先前完全未覆蓋的 e2e 樣本
      // (面板內可聚焦元素在「表單」狀態下固定：關閉✕+班級碼輸入框+教師碼輸入框+查詢按鈕=4 個，
      // 不受雲端連線狀態影響，是穩定可預期的情境)。
      const entry = page.locator('[role="button"]', { hasText: "教師檢視入口" }).first();
      await entry.press("Enter");
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      const inPanel = () => page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"].wfg-modal-panel');
        return !!panel && panel.contains(document.activeElement);
      });
      ok(await inPanel(), "教師檢視彈窗開啟後 focus 應落在面板內");
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        ok(await inPanel(), `第 ${i + 1} 次 Tab 後 focus 逃出了教師檢視彈窗`);
      }
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      eq(await dialog.count(), 0, "Esc 後教師檢視彈窗應已卸載");
      const restored = await page.evaluate(() => document.activeElement?.textContent?.includes("教師檢視入口") ?? false);
      ok(restored, "焦點應歸還給開啟彈窗前的「教師檢視入口」連結");
    });

    await test("TeacherModal「查詢結果」狀態 + 個別學生掌握度鑽取鍵盤操作(#mastery-cloud)", async () => {
      // 上一則測試只覆蓋「表單」狀態(2026-09-09)；`fetchClassProgress` 實際會打雲端 `do=teacher`
      // 端點，而測試環境全域用 context.route 把 script.google.com 一律 abort(維持離線隔離)，
      // 導致「查詢結果」狀態自此一直未被走過。這裡改用 page.route(優先權高於既有的全域
      // context.route 攔截)只針對 `do=teacher` 這支請求回傳一份固定假資料，讓查詢結果表格與
      // 個別學生掌握度鑽取可決定性地被驗證，免鎖定 Math.random()、也不需真的重新部署後端。
      // 查核 TeacherModal.tsx 原始碼時，順帶發現一處系統性缺口的又一實例：掌握度鑽取列
      // (`<tr onClick=...>`)只有滑鼠 onClick，未比照工單循環其餘卡片式互動補上
      // role="button"/tabIndex/onKeyDown，鍵盤玩家無法展開/收合個別學生鑽取——本輪一併補上。
      const isTeacherQuery = (url) => url.hostname === "script.google.com" && url.searchParams.get("do") === "teacher";
      const FAKE_ROWS = [
        {
          studentId: "S001", nickname: "阿明", score: 12345, day: 45, availability: 92, generation: 5200,
          updatedAt: Date.UTC(2026, 8, 15, 3, 0, 0),
          mastery: JSON.stringify({ "disc:mechanical": [10, 7], "disc:electrical": [4, 1], "cat:D": [6, 5] }),
        },
        { studentId: "S002", nickname: "小華", score: 8000, day: 30, availability: 80, generation: 3000, updatedAt: Date.UTC(2026, 8, 10, 1, 0, 0) },
      ];
      await page.route(isTeacherQuery, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, rows: FAKE_ROWS }) }));
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      try {
        const entry = page.locator('[role="button"]', { hasText: "教師檢視入口" }).first();
        await entry.click();
        await dialog.waitFor({ state: "visible", timeout: 5000 });
        await dialog.locator("input").first().fill("T1");
        await dialog.locator('input[type="password"]').fill("dummy");
        await dialog.getByText("查詢班級進度", { exact: true }).click();
        await dialog.locator("table").waitFor({ state: "visible", timeout: 5000 });
        const rows = dialog.locator("tbody tr");
        eq(await rows.count(), 2, "查詢結果應顯示 2 列學生資料(尚未展開任何鑽取)");
        const row0Text = await rows.nth(0).textContent();
        ok(row0Text?.includes("S001"), "第 1 列應顯示學號 S001");
        ok(row0Text?.includes("阿明"), "第 1 列應顯示暱稱阿明");
        ok(row0Text?.includes("12,345"), "第 1 列應顯示績效分 12,345");
        ok(row0Text?.includes("24"), "第 1 列應顯示營運天數 24(day 45 − 21)");
        const firstRow = rows.nth(0);
        eq(await firstRow.getAttribute("tabindex"), "0", "掌握度鑽取列應可鍵盤聚焦(tabIndex=0)");
        await firstRow.press("Enter");
        eq(await dialog.locator("tbody tr").count(), 3, "鍵盤 Enter 展開後應多一列掌握度鑽取內容");
        const drillText = await dialog.locator("tbody tr").nth(1).textContent();
        ok(drillText?.includes("機械"), "鑽取內容應顯示「機械」科別掌握度");
        ok(drillText?.includes("70%"), "「機械」科別正確率應為 70%(7/10)");
        ok(drillText?.includes("最弱項") && drillText?.includes("電氣"), "最弱項應標示為正確率較低的「電氣」(1/4=25%)");
        const radar = dialog.locator("tbody tr").nth(1).locator("svg");
        ok((await radar.count()) > 0, "應渲染能力雷達圖(svg)");
        await firstRow.press("Enter"); // 再次 Enter 應收合
        eq(await dialog.locator("tbody tr").count(), 2, "再次鍵盤 Enter 應收合鑽取內容,tbody tr 應變回 2");
        await rows.nth(1).press("Enter"); // 第 2 位學生尚無作答資料
        const noDataText = await dialog.locator("tbody tr").nth(2).textContent();
        ok(noDataText?.includes("尚無作答資料"), "尚無掌握度資料的學生展開後應顯示「此學生尚無作答資料」提示");
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
        eq(await dialog.count(), 0, "Esc 後彈窗應已卸載");
      } finally {
        await page.unroute(isTeacherQuery);
        // 保底清場：任何前面斷言失敗都不該讓彈窗殘留擋住後續測試的點擊(遮罩會讓後面每個測試
        // 的 click 都卡在 actionability 重試直到逾時，拖垮整個 suite)。
        if (await dialog.count() > 0) {
          await page.keyboard.press("Escape").catch(() => {});
          await dialog.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
        }
      }
    });

    await test("訪客登入進入母港畫面", async () => {
      await page.getByText("訪客試玩", { exact: false }).click();
      await page.getByText("調度中心", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    });

    await test("新手教學可跳過", async () => {
      const skipBtn = page.getByText("跳過教學 ✕", { exact: false });
      // 新手教學延遲 800ms 自動開場；若尚未出現則等一下再確認一次(非硬性存在,寬鬆處理)。
      if (await skipBtn.count() === 0) await page.waitForTimeout(1200);
      if (await skipBtn.count() > 0) await skipBtn.click();
      ok(await page.getByText("跳過教學 ✕", { exact: false }).count() === 0, "教學覆蓋層應已關閉");
    });

    await test("調度中心彈窗：開啟時 focus 移入面板", async () => {
      await page.getByText("調度中心", { exact: true }).click();
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      const focusedInPanel = await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"].wfg-modal-panel');
        return !!panel && panel.contains(document.activeElement);
      });
      ok(focusedInPanel, "彈窗開啟後 focus 應落在面板內");
    });

    await test("Tab/Shift+Tab 循環侷限於彈窗內(不逃逸到背景)", async () => {
      // 面板內可聚焦元素：關閉✕ + 4 個「執行」+ 1 個「重新整理工單」= 6 個；多按幾輪確保會繞回來。
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press("Tab");
        const inPanel = await page.evaluate(() => {
          const panel = document.querySelector('[role="dialog"].wfg-modal-panel');
          return !!panel && panel.contains(document.activeElement);
        });
        ok(inPanel, `第 ${i + 1} 次 Tab 後 focus 逃出了彈窗`);
      }
      await page.keyboard.press("Shift+Tab");
      const inPanel = await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"].wfg-modal-panel');
        return !!panel && panel.contains(document.activeElement);
      });
      ok(inPanel, "Shift+Tab 後 focus 逃出了彈窗");
    });

    await test("Esc 關閉彈窗並歸還焦點", async () => {
      await page.keyboard.press("Escape");
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      eq(await dialog.count(), 0, "Esc 後彈窗應已卸載");
      const restored = await page.evaluate(() => document.activeElement?.textContent?.includes("調度中心") ?? false);
      ok(restored, "焦點應歸還給開啟彈窗前的「調度中心」設施列");
    });

    await test("個人檔案彈窗（ProfileModal，由頂欄晶片開啟）：focus trap 迴歸（雙元素邊界情境）", async () => {
      // 盤點剩餘尚無 e2e 樣本的彈窗(OpsCenterModal/CaseFileModal/ProfileModal)之一。ProfileModal 內容
      // 大部分隨作答資料變動（知識點掌握度 chips/雷達圖只在 totalAnswered(m)>0 時出現、MistakeLog
      // 只在 data.mistakes 非空時出現互動元素）；但成就牆卡片（ACHIEVEMENTS.map）本身是純 <div>，
      // 未補 role="button"/tabIndex，不進 tab 序，數據格同理——故實際可聚焦元素數只取決於「是否已
      // 作答/答錯過」，而非成就解鎖進度。在此測試流程只驗證過「調度中心」彈窗、尚未接下工單前插入，
      // 此時 data.mastery/data.mistakes 皆為空（後面「連續故意答錯」等測試才會產生作答紀錄），
      // 面板內可聚焦元素固定為：關閉✕ + 減少動態切換鈕 = 2 個——補上先前樣本(1/2/3/5/28 個)之外
      // 的另一個「雙元素」情境，且觸發元件（頂欄個人檔案晶片）先前完全未被納入 e2e。
      const chip = page.locator('[role="button"]', { hasText: "訪客" }).first(); // TopBar 先掛載於 MobileBar
      await chip.press("Enter"); // 鍵盤觸發，驗證頂欄鍵盤操作補完（2026-09-10）確實可開啟此彈窗
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      ok((await dialog.textContent())?.includes("個人檔案") ?? false, "鍵盤 Enter 觸發個人檔案晶片應開啟 ProfileModal");
      const activeInfo = () => page.evaluate(() => {
        const el = document.activeElement;
        return { ariaLabel: el?.getAttribute("aria-label") ?? "", text: (el?.textContent ?? "").trim() };
      });
      eq((await activeInfo()).ariaLabel, "關閉", "彈窗開啟後 focus 應落在關閉✕");
      await page.keyboard.press("Tab");
      eq((await activeInfo()).text, "關閉", "第 1 次 Tab 後應落在「減少動態」切換鈕（預設 OFF，未開啟時文字為「關閉」）");
      await page.keyboard.press("Tab");
      eq((await activeInfo()).ariaLabel, "關閉", "第 2 次 Tab 應循環回關閉✕（僅 2 個可聚焦元素）");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      eq(await dialog.count(), 0, "Esc 後 ProfileModal 應已卸載");
      const restored = await page.evaluate(() => document.activeElement?.textContent?.includes("訪客") ?? false);
      ok(restored, "焦點應歸還給開啟彈窗前的個人檔案晶片");
    });

    // ── 交易所（MarketScreen）/ 出海（SailScreen）/ 維修（RepairScreen）核心互動流程 ──
    // 走完首筆工單「齒輪箱搶修 CH-12」全程：接單 → 交易所買齊必備備品 → 出海 → 登船 → 鍵盤作答診斷測驗 → 鍵盤完成 SOP → 完工。
    // 這把先前只有 reducer 單元測試覆蓋的邏輯，串成一次端到端的鍵盤操作迴歸。

    await test("母港：接下首筆工單（診斷/SOP 迴歸的前置）", async () => {
      await page.getByText("接單", { exact: true }).click();
      await dismissDialogue(page); // intro 對話（manager + narrator_girl 共 2 句）
    });

    await test("備品交易所：鍵盤 Enter 加入購物車並完成採購", async () => {
      await page.getByText("備品交易所", { exact: true }).first().click(); // 頂欄分頁；母港「備品交易所」設施列亦同名，取第一個(頂欄先掛載)
      const partCard = page.locator('[role="button"]', { hasText: "齒輪箱齒輪油" }).first();
      await partCard.waitFor({ state: "visible", timeout: 5000 });
      await partCard.press("Enter"); // 鍵盤觸發加入購物車（onKeyActivate）
      await page.getByText("確 認 採 購", { exact: true }).click();
      await dismissDialogue(page); // 採購完成對話（owner 1 句）
    });

    await test("出海航行：就緒檢查通過、出航並抵達機組", async () => {
      await page.getByText("出海航行", { exact: true }).click();
      const departBtn = page.getByText("出 航", { exact: true });
      await departBtn.waitFor({ state: "visible", timeout: 5000 });
      await departBtn.click(); // 備品/技師/天氣皆已就緒，出航按鈕應可點擊（disabled 則 Playwright 會擲錯）
      await page.getByText("登塔開始維修", { exact: true }).waitFor({ state: "visible", timeout: 8000 }); // 航行動畫跑完、抵達機組
      await page.getByText("登塔開始維修", { exact: true }).click();
    });

    await test("維修：海象平穩直接登船登塔", async () => {
      await page.getByText("登船登塔，開始作業", { exact: true }).click();
      await page.getByText("齒輪箱油溫持續升高", { exact: false }).waitFor({ state: "visible", timeout: 5000 });
    });

    // 作業窗吃緊 →「加班搶修(#rush)」分支：故意連續兩次答錯診斷測驗（各扣 3 時段），
    // 把作業窗從 10 消耗到 4（< 剩餘估計 7），觸發 Part B 的「維修不利」三選一提示。
    // 這是先前 e2e 只走過「一路順風」golden path 未覆蓋的分支——ROADMAP 明列的接續工作之一。
    await test("維修診斷測驗：連續兩次故意答錯，觸發作業窗吃緊提示", async () => {
      await page.locator('[role="button"]', { hasText: "A. 變槳軸承潤滑脂量" }).first().press("Enter");
      await page.locator('[role="button"]', { hasText: "C. 塔筒地腳螺栓扭力" }).first().press("Enter");
      await page.getByText("作業窗吃緊", { exact: false }).waitFor({ state: "visible", timeout: 3000 });
    });

    await test("加班搶修(#rush)：鍵盤/滑鼠觸發後一次趕完剩餘 SOP、吃緊提示解除", async () => {
      // rush() 的安全近失是否發生由 UI 端 Math.random() < RUSH_RISK 擲骰（reducer 只收布林值以保持可測）；
      // 暫時覆寫為必定回傳 0.99（> RUSH_RISK）鎖定「無事件」分支，避免 25% 機率造成測試非決定性，用畢立即還原。
      await page.evaluate(() => { window.__wfgOrigRandom = Math.random; Math.random = () => 0.99; });
      // 用 <button> 標籤限定，避免同時比對到吃緊提示文字內同樣含「加班搶修」四字的說明句。
      await page.locator("button", { hasText: "加班搶修" }).click();
      await page.evaluate(() => { Math.random = window.__wfgOrigRandom; delete window.__wfgOrigRandom; });
      await dismissDialogue(page); // rush() 觸發的「加班趕上了!」對話（repair_eng 1 句，無事件分支）
      ok(await page.getByText("作業窗吃緊", { exact: false }).count() === 0, "加班搶修完成剩餘步驟後，吃緊提示應解除");
      ok(await page.locator("button", { hasText: "加班搶修" }).count() === 0, "已無剩餘 SOP 步驟，加班搶修按鈕應隱藏");
    });

    await test("維修診斷測驗：鍵盤 Enter 選擇正解", async () => {
      const correctOption = page.locator('[role="button"]', { hasText: "B. 潤滑油油位與油質" }).first();
      await correctOption.press("Enter");
      await page.getByText("✓ 正確", { exact: false }).waitFor({ state: "visible", timeout: 3000 });
    });

    await test("維修完工按鈕：加班搶修已趕完 SOP、診斷答對後應可點擊", async () => {
      const finishBtn = page.getByText("回報 SCADA · 完成維修", { exact: true });
      await finishBtn.waitFor({ state: "visible", timeout: 3000 });
      ok(await finishBtn.isEnabled(), "診斷+SOP 皆完成、備品齊全時，完工按鈕應可點擊");
    });

    await test("維修完工：回母港、警報解除", async () => {
      await page.getByText("回報 SCADA · 完成維修", { exact: true }).click();
      await page.getByText("目前無作用中警報", { exact: false }).waitFor({ state: "visible", timeout: 8000 });
      await dismissDialogue(page); // 完工 outro + 復盤對話
    });

    // ── 其餘彈窗的 focus trap e2e 樣本擴充（調度中心已由上方涵蓋）──
    // 兩個選點皆為母港頂層「設施」列(FacRow)直接開啟、無需前置遊戲狀態，且面板內可聚焦元素數量
    // 在遊戲開局狀態下是固定的(不受隨機故障/成就等資料影響)，Tab 圈數才能穩定預期。

    await test("風場戰情室彈窗：focus trap 迴歸（Tab 循環 + Esc 關閉歸還焦點）", async () => {
      // 面板內可聚焦元素：關閉✕ + 派員定檢 + 推進一天 = 3 個；開局技師閒置且海象平穩,「派員定檢」按鈕未 disabled。
      await checkModalFocusTrap(page, { triggerText: "風場戰情室", tabCount: 5 });
    });

    await test("母港建設彈窗：focus trap 迴歸（Tab 循環 + Esc 關閉歸還焦點）", async () => {
      // 面板內可聚焦元素：關閉✕ + 4 個設施升級鈕(碼頭/倉儲/起重機/燈塔)= 5 個；開局預算皆負擔得起、無滿級,皆可聚焦。
      await checkModalFocusTrap(page, { triggerText: "母港建設", tabCount: 7 });
    });

    await test("營運趨勢彈窗：focus trap 迴歸（單一可聚焦元素邊界案例）", async () => {
      // 觸發鈕在左側「風場動態」面板(預設展開)內的「📈 營運趨勢 · 賽後復盤」按鈕，同樣無需前置遊戲狀態。
      // 面板內可聚焦元素：目前流程只完成 1 筆工單（FINISH_REPAIR 才會 pushHistory 一筆），history 長度未達 2,
      // 因此仍落在「尚無足夠資料」提示畫面，可聚焦元素只有關閉✕ 這 1 個——用來驗證 trap 在「單一可聚焦元素」
      // 邊界下 Tab/Shift+Tab 皆應停留原地、不逃逸的情形(先前兩個樣本皆為多元素,尚未覆蓋此邊界)。
      await checkModalFocusTrap(page, { triggerText: "📈 營運趨勢 · 賽後復盤", tabCount: 4 });
    });

    await test("課程模式彈窗：focus trap 迴歸（多元素/大面板情境）", async () => {
      // 觸發鈕為頂欄「⚙」齒輪鈕，隨處可見、無需前置遊戲狀態。
      // 面板內可聚焦元素：關閉✕ + 重播教學 + 獨立測驗模式 + 教師檢視 + 開放週次 −/＋ (2) +
      // COURSE_WEEKS 18 週各 1 個「指派」鈕 + 匯入任務文字框 + 匯入並指派 + 情境包文字框 + 匯入情境包
      // = 1+1+1+1+2+18+1+1+1+1 = 28 個；本輪測試環境全新 localStorage、無已匯入情境包，故不含「移除」鈕。
      // 刻意挑一個元素數量遠多於先前樣本(1/3/5 個)的大面板，驗證 trap 在較長 Tab 序列下仍正確循環回頭。
      await checkModalFocusTrap(page, { triggerText: "⚙", tabCount: 30 });
    });

    await test("機具工坊彈窗：focus trap 迴歸（雙元素情境）", async () => {
      // FacilityModal(kind="tool")：母港「設施」列一鍵開啟、無需前置遊戲狀態。
      // 面板內可聚焦元素：關閉✕ + 升級鈕 = 2 個；開局預算 8420 萬遠高於首級升級費 100 萬，
      // 升級鈕未 disabled(disabled 按鈕不進 tab 序，見 a11y.ts 的 FOCUSABLE_SELECTOR)。
      // 補上先前樣本(1/3/4/5/28 個)之間尚未覆蓋的「雙元素」情境。FacilityModal 另外幾種 kind
      // (如「技師公會」的候選名單用 Math.random() 產生)可聚焦元素數量不穩定，故選這個開局即
      // 固定的 kind 納入，其餘 kind 留待之後鎖定 Math.random() 或改採固定資料時再評估。
      await checkModalFocusTrap(page, { triggerText: "機具工坊", tabCount: 5 });
    });

    await test("案例檔彈窗：focus trap 迴歸（單一可聚焦元素邊界案例）", async () => {
      // CaseFileModal：母港「設施」列的 FacRowMini「📁 案例檔」一鍵開啟、無需前置遊戲狀態。
      // 內容 casesForTier(tier) 是純函式(依 tierOf 過濾 CASE_STUDIES，非隨機抽取)，先前盤點誤以為
      // 「案例卡片數量隨 Tier/隨機抽案例變動」而暫緩納入——查核 src/state/caseStudies.ts 後發現
      // 全部 20 則案例的 minTier 最低為 2，此測試流程全程 tier 皆為 1(gen<1500、missionsDone<6、
      // farmsOwned=1、campaignIndex<2，見 tierOf)，故 casesForTier(1) 恆為空陣列，面板固定停在
      // 「目前層級尚無解鎖案例」提示，可聚焦元素只有關閉✕ 這 1 個——與營運趨勢彈窗同屬「單一可聚焦
      // 元素」邊界情境，但觸發元件(FacRowMini)與內容來源(tier 過濾而非資料是否已產生)不同。
      await checkModalFocusTrap(page, { triggerText: "案例檔", tabCount: 4 });
    });

    await test("風場建置番外篇彈窗：階段選項卡可鍵盤 Tab 抵達並用 Enter 選取", async () => {
      // ConstructionModal：母港「設施」列一鍵開啟、無需前置遊戲狀態；開局停在階段 0、尚未選擇。
      // 本輪順手補上 2 個階段選項卡的 role="button"/tabIndex/onKeyDown(原本只有滑鼠 onClick，
      // 與工單循環其餘卡片式互動的既有無障礙慣例不一致)。checkModalFocusTrap 只驗證 focus 不逃逸出
      // 面板、不驗證確實走訪了哪些元素——若選項卡未加上 tabIndex，Tab 只會在唯一的關閉✕上打轉，
      // 一樣「不逃逸」而空綠通過,測不出迴歸。故這裡改為逐步比對 activeElement,確認 Tab 序列
      // 真的是「關閉✕ → 選項卡 1 → 選項卡 2 → (循環回)關閉✕」,並用鍵盤 Enter 實際選取一張選項卡
      // 驗證 onKeyActivate 真的推進了遊戲狀態(不只是聚焦得到)。
      await page.getByText("風場建置（番外篇）", { exact: true }).click();
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      const activeInfo = () => page.evaluate(() => {
        const el = document.activeElement;
        return { role: el?.getAttribute("role") ?? "", ariaLabel: el?.getAttribute("aria-label") ?? "", text: el?.textContent ?? "" };
      });
      eq((await activeInfo()).ariaLabel, "關閉", "彈窗開啟後 focus 應落在關閉✕");
      await page.keyboard.press("Tab");
      let info = await activeInfo();
      eq(info.role, "button", "第 1 次 Tab 後應落在第一張階段選項卡（role=button)");
      ok(info.text.includes("完整地質鑽探"), "第 1 次 Tab 後應落在第一張階段選項卡");
      await page.keyboard.press("Tab");
      info = await activeInfo();
      ok(info.text.includes("只做最低限度抽樣"), "第 2 次 Tab 後應落在第二張階段選項卡");
      await page.keyboard.press("Tab");
      eq((await activeInfo()).ariaLabel, "關閉", "第 3 次 Tab 應循環回關閉✕(僅 3 個可聚焦元素)");
      // 鍵盤 Enter 選取第一張選項卡：驗證 onKeyActivate 真的觸發 setPick、揭曉回饋文字。
      await page.keyboard.press("Tab"); // 回到第一張選項卡
      await page.keyboard.press("Enter");
      await page.getByText("紮實的前期調查降低後續設計與施工風險", { exact: false }).waitFor({ state: "visible", timeout: 3000 });
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      eq(await dialog.count(), 0, "Esc 後彈窗應已卸載");
      const restored = await page.evaluate(() => document.activeElement?.textContent?.includes("風場建置（番外篇）") ?? false);
      ok(restored, "焦點應歸還給開啟彈窗前的「風場建置（番外篇）」設施列");
    });

    await test("頂欄（TopBar）：⚙ 齒輪鈕改為可鍵盤操作（原只有滑鼠 onClick 的 <div>）", async () => {
      // 盤點剩餘無 e2e 樣本的彈窗(OpsCenterModal/CaseFileModal/ProfileModal/ExamModal)時，
      // 發現一處比「挑哪個彈窗」更根本的缺口：TopBar.tsx 的共用 Btn 元件(語言切換/靜音/⚙/登出)、
      // 導覽分頁(母港/交易所/出海/維修)、個人檔案晶片，全都只是滑鼠 onClick 的 <div>，未比照
      // 工單循環其餘卡片式互動補上 role="button"/tabIndex/onKeyDown——是先前兩輪無障礙工作
      // (2026-08-31 工單循環鍵盤操作、全部彈窗 focus trap)遺漏的另一處系統性缺口，鍵盤玩家完全
      // 無法從頂欄開啟課程模式、切換分頁、開個人檔案(MobileBar.tsx 手機版同類元件亦同)。
      // 本輪在兩個檔案一次補齊。這裡用鍵盤 Enter(而非滑鼠 .click())觸發 ⚙ 開啟課程模式，
      // 驗證新補的 onKeyActivate 確實可運作，而非只是加了屬性。
      const gearBtn = page.locator('[role="button"]', { hasText: "⚙" }).first();
      await gearBtn.press("Enter");
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      ok((await dialog.textContent())?.includes("課程模式") ?? false, "鍵盤 Enter 觸發 ⚙ 應開啟課程模式彈窗");
    });

    await test("獨立測驗模式彈窗（由課程模式串接開啟）：focus trap 正常，Esc 後焦點正確歸還至 ⚙（而非遺失到 body）", async () => {
      // ExamModal 由 CourseModal 內「獨立測驗模式」鈕觸發，App.tsx 在同一個事件處理常式內
      // `setShowCourse(false); setShowExam(true)`——CourseModal 卸載、ExamModal 掛載發生在同一次
      // React commit。這是先前盤點(2026-09-07)留下「觸發流程與 checkModalFocusTrap() 假設不同，
      // 需先評估焦點歸還斷言如何調整」的懸案，本輪追查後發現它牽出上面 TopBar 的真實缺口：
      // 在補上 ⚙ 的 role/tabIndex 之前，滑鼠點擊 ⚙ 根本不會讓它成為 document.activeElement
      // (純 <div>、無 tabindex 的元素滑鼠點擊不會取得焦點)，於是 CourseModal 的 useFocusTrap
      // 記下的「開啟前焦點」其實是 <body>；串接開啟 ExamModal、Esc 關閉後，焦點就遺失回 <body>
      // (而非回到玩家實際點的 ⚙)——鍵盤玩家會徹底迷失游標位置。用 outerHTML/role 精確比對
      // document.activeElement(而非上面沿用的 textContent.includes 寬鬆比對——body.textContent
      // 幾乎必然包含任何觸發文字，會讓這處迴歸被寬鬆比對誤判為通過)驗證修復後兩者一致。
      await page.getByText("獨立測驗模式", { exact: true }).click();
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      ok((await dialog.textContent())?.includes("獨立測驗模式") ?? false, "應已切換為獨立測驗模式彈窗");
      const activeInfo = () => page.evaluate(() => {
        const el = document.activeElement;
        return { tag: el?.tagName ?? "", role: el?.getAttribute("role") ?? "", text: (el?.textContent ?? "").trim() };
      });
      eq((await activeInfo()).text, "✕", "ExamModal 開啟後 focus 應落在關閉✕（開始頁：關閉✕+10題+20題=3 個可聚焦元素）");
      await page.keyboard.press("Tab");
      eq((await activeInfo()).text, "10 題", "第 1 次 Tab 後應落在「10 題」按鈕");
      await page.keyboard.press("Tab");
      eq((await activeInfo()).text, "20 題", "第 2 次 Tab 後應落在「20 題」按鈕");
      await page.keyboard.press("Tab");
      eq((await activeInfo()).text, "✕", "第 3 次 Tab 應循環回關閉✕（僅 3 個可聚焦元素）");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      eq(await dialog.count(), 0, "Esc 後 ExamModal 應已卸載");
      const restored = await activeInfo();
      eq(restored.role, "button", "焦點應歸還給一個 role=button 元素（而非遺失到 <body>）");
      eq(restored.text, "⚙", "焦點應精確歸還給串接開啟前唯一的真實觸發元件「⚙」，而非 CourseModal 內已卸載的「獨立測驗模式」鈕");
    });

    await test("獨立測驗模式：作答頁與結果頁——鎖定 Date.now() 種子跑完整份測驗，驗證計分/各類別覆盤/錯題覆盤渲染正確", async () => {
      // 前一項測試只驗證了「開始頁」的 focus trap，「作答頁」/「結果頁」先前多輪盤點(2026-09-07 起)
      // 都以「buildExam(Date.now(), n) 用真實時間戳記為種子，題目/選項內容不可預期」為由暫緩補樣本。
      // 查核 state/exam.ts 後發現 buildExam 對「同一個種子」是完全決定性的純函式(已由 test/run.mjs
      // 的單元測試證實)——只要在點擊「10 題」之前把 window.Date.now 暫時鎖定為固定時間戳，選出的
      // 10 題內容就完全可預期：離線用同一份 esbuild bundle 先跑一次 buildExam(固定種子, 10) 算出全部
      // 題目與選項(見開發備忘)，事先決定每題要點選哪個索引(第 1、6 題故意選錯，其餘皆選正解)，讓
      // 最終成績(8/10=80%「良好 B」、各類別對錯、2 題錯題覆盤)全部可預期，不必臆測抽到的內容。
      await page.locator('[role="button"]', { hasText: "⚙" }).first().click();
      const courseDialog = page.locator('[role="dialog"].wfg-modal-panel');
      await courseDialog.waitFor({ state: "visible", timeout: 5000 });
      await page.getByText("獨立測驗模式", { exact: true }).click();
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      ok((await dialog.textContent())?.includes("獨立測驗模式") ?? false, "應已切換為獨立測驗模式彈窗");

      const FIXED_NOW = 1700000000000; // 固定種子：離線算得抽出題序見下方 EXPECTED_TITLES
      await page.evaluate((ts) => { window.__wfgOrigDateNow = Date.now; Date.now = () => ts; }, FIXED_NOW);
      await dialog.getByRole("button", { name: "10 題" }).click();
      const EXPECTED_TITLES = [
        "葉片污染趨勢", "環境通報義務", "技師證照到期", "無人機風速上限", "加裝儲能評估",
        "葉片清潔巡檢", "風速計故障", "葉片異音趨勢", "海底纜線勾掛", "碼頭吊掛資源",
      ];
      await dialog.getByText(EXPECTED_TITLES[0], { exact: true }).waitFor({ state: "visible", timeout: 5000 });
      await page.evaluate(() => { Date.now = window.__wfgOrigDateNow; delete window.__wfgOrigDateNow; });

      // 固定種子下，第 1 題（cat B，索引 0）與第 6 題（cat C，索引 5）故意選第 2 個選項（錯），
      // 其餘 8 題皆選第 1 個選項（正解）→ 8/10 正確。
      const wrongAt = new Set([0, 5]);
      for (let i = 0; i < EXPECTED_TITLES.length; i++) {
        await dialog.getByText(EXPECTED_TITLES[i], { exact: true }).waitFor({ state: "visible", timeout: 5000 });
        const infoText = await dialog.textContent();
        ok(infoText?.includes(`${i + 1} / ${EXPECTED_TITLES.length}`) ?? false, `第 ${i + 1} 題應顯示題號 ${i + 1} / ${EXPECTED_TITLES.length}`);
        await dialog.locator("button").nth(wrongAt.has(i) ? 1 : 0).click();
      }

      // 結果頁：驗證計分、等第、各類別對錯（標籤與 correct/n 緊鄰無間隔，見 ExamModal.tsx byCat 列渲染）、錯題覆盤。
      await dialog.getByText("80%", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
      const resultText = await dialog.textContent();
      ok(resultText?.includes("良好 B"), "80% 應對應「良好 B」等第");
      ok(resultText?.includes("答對 8 / 10"), "應顯示「答對 8 / 10」");
      ok(resultText?.includes("監控判讀1/2"), "監控判讀（cat B，2 題對 1）各類別列應顯示 1/2");
      ok(resultText?.includes("突發事件2/2"), "突發事件（cat G，2 題對 2）各類別列應顯示 2/2");
      ok(resultText?.includes("供應鏈/人力2/2"), "供應鏈/人力（cat F，2 題對 2）各類別列應顯示 2/2");
      ok(resultText?.includes("天候處置1/1"), "天候處置（cat E，1 題對 1）各類別列應顯示 1/1");
      ok(resultText?.includes("營運決策1/1"), "營運決策（cat D，1 題對 1）各類別列應顯示 1/1");
      ok(resultText?.includes("預防保養0/1"), "預防保養（cat C，1 題對 0）各類別列應顯示 0/1");
      ok(resultText?.includes("故障搶修1/1"), "故障搶修（cat A，1 題對 1）各類別列應顯示 1/1");
      ok(resultText?.includes("錯題覆盤 (2)"), "錯題覆盤區塊應顯示 2 題");
      ok(resultText?.includes("葉片污染趨勢") && resultText?.includes("✓ 正解: 排程清潔回復效率"), "第 1 題錯題覆盤應揭示正解「排程清潔回復效率」");
      ok(resultText?.includes("葉片清潔巡檢") && resultText?.includes("✓ 正解: 安排繩索清潔與前緣保護"), "第 6 題錯題覆盤應揭示正解「安排繩索清潔與前緣保護」");

      // 「再測一次」應重置回開始頁（phase→intro），確認未卡在結果頁。
      await dialog.getByRole("button", { name: "再測一次" }).click();
      await dialog.getByText("選擇題數", { exact: true }).waitFor({ state: "visible", timeout: 3000 });
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      eq(await dialog.count(), 0, "Esc 後 ExamModal 應已卸載");
    });

    await test("自由營運中心彈窗：判斷任務選項卡改為可鍵盤操作（原只有滑鼠 onClick 的 <div>）", async () => {
      // OpsCenterModal 的判斷任務/案例演練選項卡（resolve 對應的 <div>）先前只有滑鼠 onClick，
      // 未比照工單循環其餘卡片式互動補上 role="button"/tabIndex/onKeyDown——先前多輪盤點
      // (2026-09-05〜09-12)都只以「案例演練/判斷任務隨機抽題，選項數不穩定」為由暫緩補 e2e 樣本，
      // 完全沒發現這處真正的鍵盤操作缺口，是 2026-08-31 兩輪無障礙工作（工單循環鍵盤操作、
      // 全部彈窗 focus trap）遺漏的又一處系統性缺口。本輪一併補上並新增樣本。
      // 抽題(makeDraw)以 Math.random() < 0.24 決定任務/案例，generateTask() 的模板索引/機組編號
      // 亦吃 Math.random()；暫時覆寫為固定回傳 0.999999（> 0.24 恆落入「判斷任務」分支，且
      // floor(0.999999 * TASKS.length) 對任何合理的 TASKS.length 恆為最後一個索引 length-1，
      // 即 TASKS 最後一筆模板)鎖定內容，開啟後立即還原，避免抽題非決定性（手法與 rush() 測試一致；
      // 刻意不沿用 rush() 用的 0.99——TASKS.length 已破百，floor(0.99 * length) 未必等於 length-1）。
      // OpsCenterModal 是 lazy(() => import(...)) 的第一次開啟，實際掛載/呼叫 makeDraw() 要等動態
      // import 的 chunk 載完才發生（晚於 click 這個 tick），故覆寫要撐到面板真的出現才還原
      // （不能像 rush() 測試那樣在 click 後立刻還原，component 早已掛載、reducer 同步觸發）。
      await page.evaluate(() => { window.__wfgOrigRandom = Math.random; Math.random = () => 0.999999; });
      await page.getByText("自由營運中心", { exact: true }).click();
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      await page.evaluate(() => { Math.random = window.__wfgOrigRandom; delete window.__wfgOrigRandom; });
      ok((await dialog.textContent())?.includes("順勢限電維修") ?? false, "固定種子下應抽到 TASKS 最後一筆模板「順勢限電維修」(cat D，2 個選項)");
      const activeInfo = () => page.evaluate(() => {
        const el = document.activeElement;
        return { tag: el?.tagName ?? "", role: el?.getAttribute("role") ?? "", ariaLabel: el?.getAttribute("aria-label") ?? "", text: (el?.textContent ?? "").trim() };
      });
      // 面板內可聚焦元素（尚未作答）：關閉✕ + 🔬進階檢測「解鎖」原生 <button>（開局預算遠高於
      // DIAG_COST，未 disabled）+ 2 個選項 = 4 個。
      eq((await activeInfo()).ariaLabel, "關閉", "彈窗開啟後 focus 應落在關閉✕");
      await page.keyboard.press("Tab");
      let info = await activeInfo();
      eq(info.tag, "BUTTON", "第 1 次 Tab 後應落在🔬進階檢測的「解鎖」原生 <button>");
      ok(info.text.includes("解鎖"), "第 1 次 Tab 後應落在「解鎖」按鈕");
      await page.keyboard.press("Tab");
      info = await activeInfo();
      eq(info.role, "button", "第 2 次 Tab 後應落在第一個判斷選項（role=button，本輪新補）");
      ok(info.text.includes("把停機維修排進限電時段執行"), "第 2 次 Tab 後應落在第一個選項");
      await page.keyboard.press("Tab");
      info = await activeInfo();
      eq(info.role, "button", "第 3 次 Tab 後應落在第二個判斷選項（role=button，本輪新補）");
      ok(info.text.includes("限電時段照常發電、維修另找時段"), "第 3 次 Tab 後應落在第二個選項");
      await page.keyboard.press("Tab");
      eq((await activeInfo()).ariaLabel, "關閉", "第 4 次 Tab 應循環回關閉✕（僅 4 個可聚焦元素）");
      // 鍵盤 Enter 選取第一個選項（正解）：驗證 onKeyActivate 真的觸發 resolve、推進遊戲狀態、揭曉回饋。
      await page.keyboard.press("Tab"); // 回到「解鎖」
      await page.keyboard.press("Tab"); // 回到第一個選項
      await page.keyboard.press("Enter");
      await page.getByText("順勢維修幾乎零額外發電損失", { exact: false }).waitFor({ state: "visible", timeout: 3000 });
      ok(await page.getByText("下一個狀況", { exact: false }).count() > 0, "答題後應出現「下一個狀況」按鈕");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      eq(await dialog.count(), 0, "Esc 後彈窗應已卸載");
      const restored = await page.evaluate(() => document.activeElement?.textContent?.includes("自由營運中心") ?? false);
      ok(restored, "焦點應歸還給開啟彈窗前的「自由營運中心」設施列");
    });

    await test("自由營運中心彈窗：案例演練（kind:\"case\"）分支選項卡改為可鍵盤操作", async () => {
      // 延續上一則測試補的「判斷任務(kind:"task")」樣本，這則補上先前多輪盤點(2026-09-05〜09-13)
      // 都列為已知限制、始終未覆蓋的另一分支：makeDraw() 以 Math.random() < CASE_DRILL_PROB(0.24)
      // 抽中「案例演練」時的 UI。resolve() 對應的選項卡與判斷任務共用同一段 render 邏輯，本輪已一併
      // 補上 role="button"/tabIndex/onKeyDown，鍵盤操作缺口已在上一則測試修正，此處純屬 e2e 覆蓋擴充。
      //
      // 抽題內容仍是非決定性的（randomCaseDrill 依 data.seenCases 過濾「本局未演練過」的案例後加權抽樣，
      // seenCases 會隨局中「戰情室推進一天」等 advance() 呼叫以 CASE_ROLL_PROB=0.05 的真實 Math.random()
      // 偶發累積，非本測試可控）——因此刻意**不**比照上一則鎖定成單一已知案例逐字斷言劇本內容，改為只驗證
      // 「案例演練」分支與一般判斷任務共用的結構性事實，任何一則案例都成立：
      //   1. 徽章文字含「案例演練」(isCase 分支才會顯示，區別於判斷任務)
      //   2. Tab 序列與判斷任務結構相同：關閉✕ → 🔬進階檢測「解鎖」原生 <button> → 選項1 → 選項2 → 循環回關閉✕
      //      （全部 20 則案例皆恰有 2 個選項，見 src/state/caseStudies.ts）
      //   3. 答題後才會出現的案例專屬區塊：「📘 復盤教訓 O&M Lesson」與「已收錄進母港「案例檔」圖鑑」
      //      （這兩段只在 isCase && picked !== null 時渲染，判斷任務不會有，用以確認真的走了案例分支）
      // 覆寫 Math.random 為極小固定值(1e-6)：CASE_DRILL_PROB 分支恆為真；randomCaseDrill 的加權抽樣
      // 對任何「本局未演練過的案例池」與其權重和，r = 1e-6 * total 恆落在池中第一筆(fresh[0])的
      // 權重區間內，故不受 seenCases 的非決定性影響，只有那一筆恰好被較早的 advance() 隨機標記為
      // 已演練這種機率極低的邊界情況(每次 advance() 觸發機率 0.05 × 命中該筆的加權機率，遠低於一般
      // 可接受的 CI 非決定性容忍度)才會改抽下一筆——兩者皆是恰有 2 個選項的案例，仍不影響本測試斷言。
      await page.evaluate(() => { window.__wfgOrigRandom = Math.random; Math.random = () => 1e-6; });
      await page.getByText("自由營運中心", { exact: true }).click();
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      await page.evaluate(() => { Math.random = window.__wfgOrigRandom; delete window.__wfgOrigRandom; });
      ok((await dialog.textContent())?.includes("案例演練") ?? false, "固定種子(Math.random 恆 < CASE_DRILL_PROB)下應抽到「案例演練」分支，而非判斷任務");
      const activeInfo = () => page.evaluate(() => {
        const el = document.activeElement;
        return { tag: el?.tagName ?? "", role: el?.getAttribute("role") ?? "", ariaLabel: el?.getAttribute("aria-label") ?? "", text: (el?.textContent ?? "").trim() };
      });
      eq((await activeInfo()).ariaLabel, "關閉", "彈窗開啟後 focus 應落在關閉✕");
      await page.keyboard.press("Tab");
      let info = await activeInfo();
      eq(info.tag, "BUTTON", "第 1 次 Tab 後應落在🔬進階檢測的「解鎖」原生 <button>");
      ok(info.text.includes("解鎖"), "第 1 次 Tab 後應落在「解鎖」按鈕");
      await page.keyboard.press("Tab");
      info = await activeInfo();
      eq(info.role, "button", "第 2 次 Tab 後應落在案例演練第一個選項（role=button，與判斷任務共用同一段 render）");
      await page.keyboard.press("Tab");
      info = await activeInfo();
      eq(info.role, "button", "第 3 次 Tab 後應落在案例演練第二個選項");
      await page.keyboard.press("Tab");
      eq((await activeInfo()).ariaLabel, "關閉", "第 4 次 Tab 應循環回關閉✕（案例演練恰有 2 個選項，與判斷任務同為 4 個可聚焦元素）");
      // 鍵盤 Enter 選取第一個選項：驗證 onKeyActivate 真的觸發 resolve、推進案例演練專屬流程
      // （RESOLVE_TASK + RECORD_ANSWER(disc:...) + MARK_CASE_SEEN，選錯再加 RECORD_MISTAKE）。
      await page.keyboard.press("Tab"); // 回到「解鎖」
      await page.keyboard.press("Tab"); // 回到第一個選項
      await page.keyboard.press("Enter");
      await page.getByText("復盤教訓", { exact: false }).waitFor({ state: "visible", timeout: 3000 });
      ok((await dialog.textContent())?.includes("已收錄進母港「案例檔」圖鑑") ?? false, "案例演練答題後應顯示「已收錄進母港「案例檔」圖鑑」（判斷任務不會有此區塊）");
      ok(await page.getByText("下一個狀況", { exact: false }).count() > 0, "答題後應出現「下一個狀況」按鈕");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      eq(await dialog.count(), 0, "Esc 後彈窗應已卸載");
      const restored = await page.evaluate(() => document.activeElement?.textContent?.includes("自由營運中心") ?? false);
      ok(restored, "焦點應歸還給開啟彈窗前的「自由營運中心」設施列");
    });

    await test("個人檔案彈窗（ProfileModal）：已作答/有錯題狀態——掌握度圖表出現、錯題本自我測驗→揭曉→標記已複習全流程", async () => {
      // 先前(2026-09-11)的 ProfileModal 樣本刻意插在「尚未接下工單前」，只覆蓋 totalAnswered(m)===0 的
      // 空狀態（面板固定 2 個可聚焦元素）。此時測試流程已走完首筆工單的診斷測驗（故意選錯 "A. 變槳軸承
      // 潤滑脂量" → RECORD_MISTAKE + RECORD_ANSWER(disc:mechanical, false)，見 RepairScreen.tsx 的
      // `if (pick === null)` 僅記第一次作答；隨後再選 "C." 因 pick 已非 null 不會重複記錄）與自由營運中心
      // 的判斷任務（選中 good:true 選項 → RECORD_ANSWER(cat:D, true)，見 tasks.ts 的 d_curtail_maint），
      // 故 data.mastery/data.mistakes 皆非空——這是先前多輪盤點列為已知限制、始終未覆蓋的「已作答/有
      // 錯題」狀態。重新用頂欄個人檔案晶片開啟，驗證：
      //   1. 知識點掌握度改顯示能力雷達圖 + 科別/類型正確率 chips（不再是「尚無作答資料」提示）。
      //   2. 錯題本不再是空狀態，且診斷測驗那筆錯題（topic disc:mechanical）確實被收錄。
      //   3. 錯題本的「主動回想」自我測驗→揭曉正解→寫檢討→標記已複習，完整互動鏈路皆可正常運作
      //     （先前樣本只驗證過 UI 靜態渲染，這是本專案錯題本功能首次端到端走過完整互動）。
      // 為了精準鎖定特定錯題卡片（避免其餘可能同時存在的自由營運中心錯題卡片文字混淆），MistakeLog.tsx
      // 本輪新增 data-testid="mistake-card" 供測試以 hasText 精準定位。
      const chip = page.locator('[role="button"]', { hasText: "訪客" }).first();
      await chip.press("Enter");
      const dialog = page.locator('[role="dialog"].wfg-modal-panel');
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      ok((await dialog.textContent())?.includes("個人檔案") ?? false, "應開啟 ProfileModal");

      ok(!(await dialog.textContent())?.includes("尚無作答資料"), "已有作答紀錄，掌握度區塊不應再顯示空狀態提示");
      ok((await dialog.textContent())?.includes("能力雷達"), "totalAnswered(m) > 0 時應顯示能力雷達圖區塊");
      ok((await dialog.textContent())?.includes("機械"), "診斷測驗的科別掌握度應包含「機械」（disc:mechanical）");
      ok((await dialog.textContent())?.includes("營運決策"), "自由營運中心判斷任務的類型掌握度應包含「營運決策」（cat:D）");

      ok(!(await dialog.textContent())?.includes("目前沒有錯題"), "已有錯題紀錄，錯題本不應再顯示空狀態提示");
      const card = dialog.locator('[data-testid="mistake-card"]', { hasText: "齒輪箱油溫持續升高" });
      await card.waitFor({ state: "visible", timeout: 3000 });
      ok((await card.textContent())?.includes("先自我測驗"), "尚未複習且尚未自我測驗的錯題應處於主動回想(quiz)階段");
      ok((await card.textContent())?.includes("機械"), "此錯題卡片的科別徽章應顯示「機械」");

      // 主動回想：兩個原生 <button> 選項之一是正解「B. 潤滑油油位與油質」，點下去驗證揭曉與回饋。
      await card.getByRole("button", { name: "B. 潤滑油油位與油質" }).click();
      ok((await card.textContent())?.includes("✓ 答對了"), "選中正解後應顯示「✓ 答對了」回饋");
      ok((await card.textContent())?.includes("你當時的選擇"), "揭曉階段應顯示「你當時的選擇」");
      ok((await card.textContent())?.includes("A. 變槳軸承潤滑脂量"), "應顯示錯題本記錄的原始錯誤選擇「A. 變槳軸承潤滑脂量」");
      ok((await card.textContent())?.includes("B. 潤滑油油位與油質"), "應揭曉正解「B. 潤滑油油位與油質」");

      // 寫檢討反思（至少 4 字）並標記已複習。
      await card.locator("textarea").fill("下次先查潤滑油油位");
      const markBtn = card.getByRole("button", { name: "標記已複習" });
      ok(await markBtn.isEnabled(), "反思已達最低 4 字，標記已複習按鈕應可點擊");
      await markBtn.click();
      ok((await card.textContent())?.includes("已複習"), "點擊後此錯題卡片應顯示「已複習」");
      ok((await card.textContent())?.includes("下次先查潤滑油油位"), "已複習後應顯示先前寫下的檢討內容");

      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
      eq(await dialog.count(), 0, "Esc 後 ProfileModal 應已卸載");
      const restored = await page.evaluate(() => document.activeElement?.textContent?.includes("訪客") ?? false);
      ok(restored, "焦點應歸還給開啟彈窗前的個人檔案晶片");
    });

    await test("整段流程無 console 錯誤或未捕捉例外", () => {
      eq(consoleErrors.length, 0, `console errors: ${consoleErrors.join(" | ")}`);
      eq(pageErrors.length, 0, `page errors: ${pageErrors.join(" | ")}`);
    });
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log(fails.map((f) => `  - ${f}`).join("\n")); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
