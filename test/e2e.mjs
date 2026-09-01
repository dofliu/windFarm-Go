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
