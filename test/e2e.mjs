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
