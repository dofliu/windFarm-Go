// 線上後端冒煙測試(手動執行,需正常對外網路;CI/`npm test` 不會跑這支)。
// 用途:每次重新部署 Apps Script(Code.gs)後,驗證部署有上線 + 併發鎖(v2.1)真的生效。
//
// 執行:
//   node test/live-check.mjs            # 只做唯讀檢查(GET 排行/教師碼)— 不寫任何資料
//   node test/live-check.mjs --write    # 加做寫入 + 併發鎖測試(會在試算表建少量「測試列」)
//   node test/live-check.mjs --write "https://script.google.com/macros/s/XXX/exec"  # 指定網址
//
// 併發鎖證明:同時發 8 個「註冊同一新帳號」→ 應只有 1 個 ok:true,其餘 err:exists。
// 若沒鎖,常會出現多個 ok:true / 試算表重複帳號列(這正是 v2.1 要根治的)。
// 測試資料用班級碼 "ZZLOCKTEST",事後可在試算表 accounts/saves/Sheet1 篩此碼刪除。

const ARGV = process.argv.slice(2);
const WRITE = ARGV.includes("--write");
const URL = ARGV.find((a) => a.startsWith("http")) ||
  "https://script.google.com/macros/s/AKfycbxgy2ugDT1IRSE1vrYSpG-MH8uYm1ZMJbOm5_DSMSf6fcGDYO3nQ2qS-32IPvCwU-wexw/exec";
const SIGN_SECRET = "wfg-2026-oandm"; // 與 src/cloud/sheet.ts 一致

// ── 與 src/cloud/sheet.ts 完全一致的簽章/夾值 ──
function djb2(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = (((h << 5) + h + s.charCodeAt(i)) >>> 0); return h.toString(36); }
const clampInt = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));
function sanitizeScore(p) {
  const nickname = String(p.nickname ?? "").trim().slice(0, 16);
  const classCode = String(p.classCode ?? "").trim().slice(0, 12);
  const day = clampInt(p.day, 0, 3650);
  const availability = clampInt(p.availability, 0, 100);
  const generation = clampInt(p.generation, 0, 130 * Math.max(1, day));
  const score = clampInt(p.score, 0, generation + 100 * 5 + day * 30 + 1000);
  return { nickname, classCode, score, availability, generation, day };
}
const sign = (p) => djb2(`${p.nickname}|${p.classCode}|${p.score}|${p.availability}|${p.generation}|${p.day}|${SIGN_SECRET}`);

const qs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
async function getJson(params) { const r = await fetch(`${URL}?${qs(params)}`); return r.json(); }
async function postJson(body) { const r = await fetch(URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) }); return r.json(); }

let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name} ${extra}`); } };

async function main() {
  console.log(`線上後端測試 → ${URL}`);
  console.log(`模式:${WRITE ? "唯讀 + 寫入/併發鎖" : "只唯讀(加 --write 測鎖)"}\n`);

  // 1) 部署存活:GET 排行榜應回陣列
  console.log("[1] 部署存活 / 排行榜(GET)");
  try { const lb = await getJson({}); ok(Array.isArray(lb), "GET /exec 回排行榜陣列(部署上線)", `got: ${JSON.stringify(lb).slice(0, 120)}`); }
  catch (e) { ok(false, "GET /exec 連線", String(e)); }

  // 2) 教師碼防護:錯誤教師碼應 bad-code(唯讀)
  console.log("[2] 教師檢視防護(GET, 錯誤教師碼)");
  try { const t = await getJson({ do: "teacher", classCode: "ZZLOCKTEST", code: "definitely-wrong-code" }); ok(t && t.ok === false && t.err === "bad-code", "錯誤教師碼被拒(bad-code)", `got: ${JSON.stringify(t)}`); }
  catch (e) { ok(false, "teacher 端點", String(e)); }

  if (!WRITE) { console.log(`\n${pass} 通過, ${fail} 失敗。加 --write 可測「併發鎖」與寫入。`); process.exit(fail ? 1 : 0); }

  // 3) 併發鎖證明:同時註冊同一新帳號 → 只應 1 個 ok:true
  console.log("[3] 併發鎖:同時 8 個註冊同一新帳號 → 應只有 1 個成功");
  const sid = "BOT" + Date.now();
  const cls = "ZZLOCKTEST";
  const pinHash = "h_livecheck";
  const regs = await Promise.all(Array.from({ length: 8 }, () =>
    getJson({ do: "register", studentId: sid, classCode: cls, nickname: "鎖測試", pinHash }).catch((e) => ({ ok: false, err: String(e) }))));
  const wins = regs.filter((r) => r && r.ok === true).length;
  const exists = regs.filter((r) => r && r.err === "exists").length;
  ok(wins === 1, `恰好 1 個註冊成功(LockService 生效)`, `wins=${wins}, exists=${exists}, raw=${JSON.stringify(regs)}`);
  ok(wins + exists === 8, "其餘皆回 exists(無重複建號)", `wins=${wins} exists=${exists}`);

  // 4) 登入驗證:正確 pin ok / 錯誤 pin bad-pin
  console.log("[4] 登入驗證");
  const li = await getJson({ do: "login", studentId: sid, classCode: cls, pinHash });
  ok(li && li.ok === true, "正確通關碼登入成功", `got: ${JSON.stringify(li)}`);
  const lbad = await getJson({ do: "login", studentId: sid, classCode: cls, pinHash: "wrong" });
  ok(lbad && lbad.ok === false && lbad.err === "bad-pin", "錯誤通關碼被拒(bad-pin)", `got: ${JSON.stringify(lbad)}`);

  // 5) 存檔 upsert 往返(authed + 鎖):save 後 load 應取回相同 state
  console.log("[5] 存檔 upsert 往返(authed,寫入路徑含鎖)");
  const stamp = "LIVECHECK-" + Date.now();
  const savedAt = Date.now();
  await postJson({ kind: "save", studentId: sid, classCode: cls, pinHash, state: stamp, savedAt, score: 123, day: 30, availability: 95, generation: 3000 });
  await new Promise((r) => setTimeout(r, 1500)); // 給寫入完成
  const ld = await getJson({ do: "load", studentId: sid, classCode: cls, pinHash });
  ok(ld && ld.ok === true && ld.state === stamp, "save→load 取回相同存檔(upsert 正確)", `got: ${JSON.stringify(ld).slice(0, 160)}`);

  // 6) 排行送分:正確簽章 ok / 立即重送 throttled(8 秒節流)
  console.log("[6] 排行送分(簽章 + 節流)");
  const raw = sanitizeScore({ nickname: "鎖測試", classCode: cls, day: 30, availability: 95, generation: 3300, score: 3700 });
  const s1 = await postJson({ ...raw, sig: sign(raw), studentId: sid });
  ok(s1 && s1.ok === true, "正確簽章送分成功", `got: ${JSON.stringify(s1)}`);
  const s2 = await postJson({ ...raw, sig: sign(raw), studentId: sid });
  ok(s2 && s2.ok === false && s2.err === "throttled", "立即重送被 8 秒節流擋下(throttled)", `got: ${JSON.stringify(s2)}`);
  const sbad = await postJson({ ...raw, sig: "tampered", studentId: sid });
  ok(sbad && sbad.ok === false && sbad.err === "bad-sig", "竄改簽章被拒(bad-sig)", `got: ${JSON.stringify(sbad)}`);

  console.log(`\n${pass} 通過, ${fail} 失敗。`);
  console.log(`測試資料建在班級碼「${cls}」(accounts/saves/Sheet1),可於試算表篩此碼刪除。`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error("測試執行失敗:", e); process.exit(1); });
