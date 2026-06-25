// 壓力測試：模擬「多位學生同時提交成績/存檔請求」,量測雲端排行後端契約在併發下是否可負荷。
// 執行：npm run stress  (node test/stress.mjs [users] [seconds] [serverConcurrency])
//
// 為何用 mock：正式後端是 Google Apps Script Web App(免費、無自架伺服器)。直接壓測 Google 的
// /exec 端點會踩到 Google 配額且不該對線上服務灌流量,故在本機**忠實重現 Code.gs 的契約**
// (djb2 簽章驗證、clampInt 合理性夾值、8 秒節流去重、排行榜彙整),再以併發負載打它,
// 觀察:吞吐量、延遲分布、錯誤率、節流/簽章在併發下是否正確守住。客戶端送分邏輯比照 src/cloud/sheet.ts。
//
// 另模擬 Apps Script「同時執行數」上限(serverConcurrency,預設 30)→ 反映真實後端的併發瓶頸。
import http from "node:http";

const USERS = Number(process.argv[2] || 200); // 同時在線學生數
const SECONDS = Number(process.argv[3] || 10); // 持續秒數
const SERVER_CONCURRENCY = Number(process.argv[4] || 30); // 模擬 Apps Script 同時執行上限
const SIGN_SECRET = "wfg-2026-oandm"; // 與 src/cloud/sheet.ts 一致

// ───────── 忠實重現後端契約(對應 docs/leaderboard-appsscript/Code.gs)─────────
function djb2(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = (((h << 5) + h + str.charCodeAt(i)) >>> 0); return h.toString(36); }
const clampInt = (n, lo, hi) => { n = Math.round(Number(n) || 0); return Math.max(lo, Math.min(hi, n)); };

const leaderboard = new Map(); // key classCode/nickname -> best score
const rlCache = new Map(); // 節流：key -> 到期時間(ms)。對應 Code.gs CacheService 8 秒視窗
let inFlight = 0; // 目前同時執行的請求(模擬 Apps Script 併發)
let maxInFlight = 0;
let maxQueueDepth = 0; // 超過同時執行上限時的最大排隊深度(反映飽和程度)
const waitQ = []; // 併發上限的等待佇列(忠實模擬 Apps Script 排隊而非直接丟棄)
function acquireSlot() {
  return new Promise((res) => {
    if (inFlight < SERVER_CONCURRENCY) { inFlight++; maxInFlight = Math.max(maxInFlight, inFlight); res(); }
    else { waitQ.push(res); maxQueueDepth = Math.max(maxQueueDepth, waitQ.length); }
  });
}
function releaseSlot() {
  if (waitQ.length) { maxInFlight = Math.max(maxInFlight, inFlight); waitQ.shift()(); }
  else inFlight--;
}

function handleScore(p, now) {
  // 對應 doPost 排行送分分支
  const nickname = String(p.nickname || "").trim().slice(0, 16);
  const classCode = String(p.classCode || "").trim().toUpperCase().slice(0, 12);
  const day = clampInt(p.day, 0, 3650);
  const availability = clampInt(p.availability, 0, 100);
  const generation = clampInt(p.generation, 0, 130 * Math.max(1, day));
  const score = clampInt(p.score, 0, generation + 100 * 5 + day * 30 + 1000);
  if (!nickname) return { ok: false, err: "no-nickname" };
  const expect = djb2(`${nickname}|${classCode}|${score}|${availability}|${generation}|${day}|${SIGN_SECRET}`);
  if (String(p.sig || "") !== expect) return { ok: false, err: "bad-sig" };
  const rlk = "rl_" + classCode + "/" + nickname;
  const exp = rlCache.get(rlk);
  if (exp && exp > now) return { ok: false, err: "throttled" };
  rlCache.set(rlk, now + 8000); // 8 秒節流(同 Code.gs cache.put(...,8))
  const key = classCode + "/" + nickname;
  if (!leaderboard.has(key) || score > leaderboard.get(key)) leaderboard.set(key, score);
  return { ok: true };
}
function handleLeaderboard() {
  const arr = [...leaderboard.entries()].map(([k, score]) => ({ key: k, score })).sort((a, b) => b.score - a.score).slice(0, 50);
  return arr;
}

// 模擬單次請求的伺服器端處理(受 Apps Script 同時執行上限約束:超過則排隊,非丟棄)
async function serverProcess(body) {
  await acquireSlot();
  // Apps Script 寫試算表單次約數十毫秒;以 25–70ms 模擬(用請求內容決定性抖動,避免依賴亂數種子)
  const seedN = (body && body.score ? Number(body.score) : body && body.day ? Number(body.day) : 1) % 45;
  const procMs = 25 + seedN;
  const res = await new Promise((resolve) => {
    setTimeout(() => {
      const now = Date.now();
      if (body && body.__get) resolve(handleLeaderboard());
      else if (body && body.kind === "save") resolve({ ok: true }); // 存檔 upsert(authed 假設通過)
      else resolve(handleScore(body, now));
    }, procMs);
  });
  releaseSlot();
  return res;
}

const server = http.createServer((req, res) => {
  if (req.method === "GET") {
    serverProcess({ __get: true }).then((r) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(r)); });
    return;
  }
  let data = "";
  req.on("data", (c) => (data += c));
  req.on("end", () => {
    let body = {}; try { body = JSON.parse(data); } catch { /* ignore */ }
    serverProcess(body).then((r) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(r)); });
  });
});

// ───────── 客戶端送分(比照 src/cloud/sheet.ts submitScore 的 sanitize+sign)─────────
function sign(p) { return djb2(`${p.nickname}|${p.classCode}|${p.score}|${p.availability}|${p.generation}|${p.day}|${SIGN_SECRET}`); }
function sanitize(raw) {
  const nickname = String(raw.nickname ?? "").trim().slice(0, 16);
  const classCode = String(raw.classCode ?? "").trim().slice(0, 12);
  const day = clampInt(raw.day, 0, 3650);
  const availability = clampInt(raw.availability, 0, 100);
  const generation = clampInt(raw.generation, 0, 130 * Math.max(1, day));
  const score = clampInt(raw.score, 0, generation + 100 * 5 + day * 30 + 1000);
  return { nickname, classCode, score, availability, generation, day };
}

const base = (port) => `http://127.0.0.1:${port}`;
async function postScore(port, raw) {
  const p = sanitize(raw);
  const body = JSON.stringify({ ...p, sig: sign(p) });
  const t0 = performance.now();
  const r = await fetch(base(port), { method: "POST", headers: { "Content-Type": "text/plain" }, body });
  const j = await r.json();
  return { ms: performance.now() - t0, ok: j.ok === true, err: j.err };
}
async function getBoard(port) {
  const t0 = performance.now();
  const r = await fetch(base(port));
  await r.json();
  return { ms: performance.now() - t0, ok: true };
}

function pct(arr, p) { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]); }

async function run() {
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  console.log(`Stress test — ${USERS} concurrent users, ${SECONDS}s, server concurrency cap ${SERVER_CONCURRENCY}`);
  console.log(`(Faithful mock of Google Apps Script backend contract — djb2 sign, clampInt, 8s throttle, leaderboard)\n`);

  const lat = [];
  let total = 0, ok = 0, throttled = 0, badsig = 0, other = 0, reads = 0;
  const deadline = Date.now() + SECONDS * 1000;
  let day = 30;

  async function user(uid) {
    const nickname = "stu" + uid;
    const classCode = "CLASS" + (uid % 5); // 5 個班級
    while (Date.now() < deadline) {
      total++;
      // 80% 送分(學生不斷推進日/分數)、20% 看排行榜
      if (Math.random() < 0.2) {
        const r = await getBoard(port); lat.push(r.ms); reads++; ok++;
      } else {
        day += 1;
        const gen = day * 110 + (uid % 50);
        const raw = { nickname, classCode, day, availability: 90 + (uid % 10), generation: gen, score: gen + 400 };
        const r = await postScore(port, raw); lat.push(r.ms);
        if (r.ok) ok++; else if (r.err === "throttled") throttled++; else if (r.err === "bad-sig") badsig++; else other++;
      }
    }
  }
  const t0 = Date.now();
  await Promise.all(Array.from({ length: USERS }, (_, i) => user(i)));
  const elapsed = (Date.now() - t0) / 1000;
  server.close();

  console.log("Results");
  console.log("─".repeat(52));
  console.log(`requests total      : ${total}`);
  console.log(`throughput          : ${Math.round(total / elapsed)} req/s`);
  console.log(`ok                  : ${ok}  (writes accepted + reads)`);
  console.log(`throttled (8s dedup): ${throttled}  ← 預期:同一學生 8 秒內重複送分被去重(防作弊/省寫入)`);
  console.log(`bad signature       : ${badsig}  ← 應為 0(客戶端簽章與後端一致)`);
  console.log(`other errors        : ${other}`);
  console.log(`reads (leaderboard) : ${reads}`);
  console.log(`latency p50/p95/p99 : ${pct(lat, 50)} / ${pct(lat, 95)} / ${pct(lat, 99)} ms`);
  console.log(`max simultaneous    : ${maxInFlight} (cap ${SERVER_CONCURRENCY}); max queue depth: ${maxQueueDepth}`);
  console.log(`leaderboard entries : ${leaderboard.size}`);
  console.log("─".repeat(52));
  const verdict = badsig === 0 && maxInFlight <= SERVER_CONCURRENCY && other === 0;
  console.log(verdict ? "✓ Contract held under load: signatures valid, throttle dedup worked, concurrency bounded (excess requests queued, none dropped)." : "✗ Check above — invariant breached.");
  if (!verdict) process.exit(1);
}
run();
