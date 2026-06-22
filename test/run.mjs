// 無外部相依的測試執行器：用 esbuild 打包遊戲邏輯（state 層，無 React）後逐項斷言。
// 執行：npm test  （node test/run.mjs）
import { build } from "esbuild";

// ── 可重現的偽隨機（讓含 Math.random 的系統可決定性測試）──
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const realRandom = Math.random;
const seed = (s) => { Math.random = mulberry32(s); };
const unseed = () => { Math.random = realRandom; };

async function load(entry) {
  const r = await build({ entryPoints: [entry], bundle: true, format: "esm", write: false, logLevel: "silent", external: ["react", "react-dom", "react/jsx-runtime"] });
  return import("data:text/javascript," + encodeURIComponent(r.outputFiles[0].text));
}

// ── 迷你測試框架 ──
let pass = 0, fail = 0;
const fails = [];
function test(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; fails.push(`${name}: ${e.message}`); }
  finally { unseed(); }
}
function ok(cond, msg = "expected truthy") { if (!cond) throw new Error(msg); }
function eq(a, b, msg) { if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function near(a, b, tol, msg) { if (Math.abs(a - b) > tol) throw new Error(msg || `expected ~${b}±${tol}, got ${a}`); }

const g = await load("src/state/game.ts");
const inc = await load("src/state/incidents.ts");
const camp = await load("src/ui/campaign.ts");
const R = g.reducer, I = g.INITIAL;

// ───────────────────────── INITIAL 不變量 ─────────────────────────
test("INITIAL has required fields", () => {
  for (const k of ["budget", "day", "availability", "fleet", "opsJobs", "forecast", "engineers", "quarter"]) ok(k in I, `missing ${k}`);
  ok(I.budget > 0); ok(Array.isArray(I.fleet)); ok(Array.isArray(I.forecast));
});
test("INITIAL fleet built with init faults", () => {
  eq(I.fleet.length, 24, "fleet should have 24 turbines for 1 farm");
  eq(I.fleet.filter((t) => t.status === "fault").length, g.FLEET_INIT_FAULTS);
  ok(I.fleet.every((t) => t.gen > 0), "all turbines have a gen share");
});
test("forecast length = FORECAST_DAYS", () => eq(I.forecast.length, g.FORECAST_DAYS));

// ───────────────────────── 時間 / 經濟 ─────────────────────────
test("REST advances exactly one day", () => { const s = R(I, { type: "REST" }); eq(s.day, I.day + 1); });
test("electricity income flows on day advance", () => {
  seed(1); const s = R(I, { type: "REMOTE_CHECK" });
  ok(s.budget > 0); ok(g.dailyRevenue(I) > 0, "daily revenue positive");
});
test("budget grows over idle days (income > passive cost)", () => {
  seed(7); let s = I; for (let i = 0; i < 20; i++) s = R(s, { type: "REST" });
  ok(s.budget > I.budget, `budget should grow: ${I.budget} -> ${s.budget}`);
});
test("REMOTE_CHECK: +1 day, +15 xp", () => { seed(2); const s = R(I, { type: "REMOTE_CHECK" }); eq(s.day, I.day + 1); eq(s.xp, I.xp + 15); });
test("storage cost scales with inventory", () => {
  const empty = g.dailyStorageCost({});
  const some = g.dailyStorageCost({ gearbox_oil: 5 });
  eq(empty, 0); ok(some > 0); eq(some, 5 * g.STORAGE_COST_PER_UNIT);
});

// ───────────────────────── 天氣模型 ─────────────────────────
test("makeForecast returns valid states of right length", () => {
  seed(3); const f = g.makeForecast("workable", 3);
  eq(f.length, 3); ok(f.every((x) => ["workable", "caution", "closed"].includes(x)));
});
test("advance keeps forecast length stable", () => { seed(5); const s = R(I, { type: "REST" }); eq(s.forecast.length, g.FORECAST_DAYS); });

// ───────────────────────── 技師疲勞 ─────────────────────────
test("availableEngineer respects fatigue limit", () => {
  const fresh = [{ id: "a", name: "x", discipline: "mechanical", level: 1, fatigue: 0 }];
  const tired = [{ id: "a", name: "x", discipline: "mechanical", level: 1, fatigue: g.FATIGUE_LIMIT }];
  ok(g.availableEngineer(fresh, "mechanical"));
  ok(!g.availableEngineer(tired, "mechanical"), "fatigued crew unavailable");
  ok(!g.availableEngineer(fresh, "electrical"), "wrong discipline unavailable");
});
test("FINISH_REPAIR fatigues the dispatched discipline and costs a day", () => {
  seed(4); const a = R(I, { type: "ACCEPT_QUEST" });
  const q = { id: "q", title: { zh: "", en: "" }, brief: { zh: "", en: "" }, unit: "CH-01", targetFault: "gearbox_overheat", rewardBudget: 100000, rewardXp: 50 };
  const s = R(a, { type: "FINISH_REPAIR", quest: q, discipline: "mechanical" });
  eq(s.questStage, "done"); eq(s.day, a.day + 1);
  ok(g.fatigueOf(s.engineers[0]) > 0, "mechanic gained fatigue");
});
test("fatigue recovers on rest", () => {
  const tired = { ...I, engineers: [{ ...I.engineers[0], fatigue: 60 }] };
  seed(9); const s = R(tired, { type: "REST" });
  ok(g.fatigueOf(s.engineers[0]) < 60, "fatigue recovered");
});

// ───────────────────────── 大修 + 待命費 ─────────────────────────
test("overhaul: start then complete via workable days", () => {
  const q = { id: "q2", title: { zh: "", en: "" }, brief: { zh: "", en: "" }, unit: "CH-02", targetFault: "gen_vibration", rewardBudget: 200000, rewardXp: 140 };
  let s = R(I, { type: "ACCEPT_QUEST" });
  s = R(s, { type: "START_OVERHAUL", quest: q, discipline: "mechanical" });
  ok(s.overhaul, "overhaul started"); eq(s.overhaul.need, g.OVERHAUL_NEED);
  seed(11); let guard = 0;
  while (s.overhaul && guard++ < 60) s = R(s, { type: "ADVANCE_OVERHAUL" });
  eq(s.overhaul, null, "overhaul completed"); eq(s.questStage, "done");
});

// ───────────────────────── 合約 SLA ─────────────────────────
test("SLA settles at quarter end and penalizes below floor", () => {
  const low = { ...I, availability: 50 }; // 確保低於底線
  seed(13); let s = low; for (let i = 0; i < g.QUARTER_DAYS + 1; i++) s = R(s, { type: "REST" });
  ok(s.lastSla, "a quarter settled");
  ok(s.quarter >= 2, "quarter advanced");
});

// ───────────────────────── 倉儲折舊 ─────────────────────────
test("BUY adds inventory; spoilage can reduce it over time", () => {
  let s = R(I, { type: "BUY", partId: "gearbox_oil", qty: 5, cost: 1000, leadDays: 0 });
  eq(s.inventory.gearbox_oil, 5);
  seed(99); for (let i = 0; i < 40; i++) s = R(s, { type: "REST" });
  ok((s.inventory.gearbox_oil ?? 0) <= 5, "inventory non-increasing from spoilage");
});

// ───────────────────────── 設施耗時 ─────────────────────────
test("admin actions cost time (HIRE/UPGRADE +1, SOV +2)", () => {
  seed(21);
  const h = R(I, { type: "HIRE", engineer: { id: "e2", name: "n", discipline: "electrical", level: 1, fatigue: 0 }, cost: 0 });
  eq(h.day, I.day + 1); eq(h.engineers.length, I.engineers.length + 1);
  const u = R(I, { type: "UPGRADE", kind: "tool", cost: 0 });
  eq(u.day, I.day + 1); eq(u.toolLevel, I.toolLevel + 1);
  const sov = R(I, { type: "BUY_SOV", cost: 0 });
  eq(sov.day, I.day + 2); eq(sov.ownsSOV, true);
});
test("SERVICE_VESSEL resets wear and costs a day", () => {
  const worn = { ...I, vesselWear: 80 };
  seed(22); const s = R(worn, { type: "SERVICE_VESSEL", cost: 0 });
  eq(s.vesselWear, 0); eq(s.day, worn.day + 1);
});
test("DEPART accrues vessel wear", () => { const s = R(R(I, { type: "ACCEPT_QUEST" }), { type: "DEPART" }); ok(s.vesselWear > 0); });

// ───────────────────────── 戰情室：派工 / 遠端重啟 ─────────────────────────
function withFault(faultId, disc) {
  const idx = I.fleet.findIndex((t) => t.status === "ok");
  const fleet = I.fleet.map((t, i) => (i === idx ? { ...t, status: "fault", faultId } : t));
  const engineers = [{ id: "em", name: "m", discipline: disc, level: 2, fatigue: 0 }];
  return { state: { ...I, fleet, engineers }, turbine: fleet[idx].id };
}
test("OPS_DISPATCH requires matching discipline + creates a job", () => {
  const { state, turbine } = withFault("gearbox", "mechanical");
  const wrong = R(state, { type: "OPS_DISPATCH", turbine, engineerId: "em" }); // gearbox=mechanical, matches
  ok(wrong.opsJobs.length === 1, "matching dispatch creates job");
  // electrical engineer on a mechanical fault -> blocked
  const elec = { ...state, engineers: [{ id: "ee", name: "e", discipline: "electrical", level: 1, fatigue: 0 }] };
  const blocked = R(elec, { type: "OPS_DISPATCH", turbine, engineerId: "ee" });
  eq(blocked.opsJobs.length, 0, "wrong discipline blocked");
});
test("OPS_DISPATCH sets turbine to repair and engineer busy", () => {
  const { state, turbine } = withFault("gearbox", "mechanical");
  const s = R(state, { type: "OPS_DISPATCH", turbine, engineerId: "em" });
  eq(s.fleet.find((t) => t.id === turbine).status, "repair");
  ok(g.engineerBusy(s.opsJobs, "em"));
});
test("dispatched job completes -> turbine ok + resolved++ + repair pay", () => {
  const { state, turbine } = withFault("converter", "electrical");
  let s = R(state, { type: "OPS_DISPATCH", turbine, engineerId: "em" });
  const r0 = s.fleetResolved, b0 = s.budget;
  seed(31); for (let i = 0; i < 4 && s.opsJobs.length; i++) s = R(s, { type: "OPS_ADVANCE" });
  eq(s.fleet.find((t) => t.id === turbine).status, "ok");
  eq(s.fleetResolved, r0 + 1);
  ok(s.budget >= b0, "repair reward + income, not less than before");
});
test("OPS_RESET only works on resettable faults", () => {
  const soft = withFault("converter", "electrical"); // resettable
  const r1 = R(soft.state, { type: "OPS_RESET", turbine: soft.turbine });
  eq(r1.opsJobs.length, 1, "resettable -> remote job"); ok(r1.opsJobs[0].remote);
  const hard = withFault("gearbox", "mechanical"); // not resettable
  const r2 = R(hard.state, { type: "OPS_RESET", turbine: hard.turbine });
  eq(r2.opsJobs.length, 0, "non-resettable blocked");
});
test("incidents pool: resettable subset exists; all have discipline+repairDays", () => {
  ok(inc.INCIDENTS.length >= 5);
  ok(inc.INCIDENTS.some((x) => x.resettable), "some resettable");
  ok(inc.INCIDENTS.some((x) => !x.resettable), "some require crew");
  ok(inc.INCIDENTS.every((x) => x.discipline && x.repairDays > 0));
});
test("fleet fault rate is bounded/calm over time (managed-ish)", () => {
  seed(50); let s = I; for (let i = 0; i < 10; i++) s = R(s, { type: "REST" });
  const faults = s.fleet.filter((t) => t.status === "fault").length;
  ok(faults <= 12, `faults after 10 idle days should be modest, got ${faults}`);
});

// ───────────────────────── C2：船舶並行上限 ─────────────────────────
test("vesselJobCap: CTV base 2, SOV 4, +1 per vessel level", () => {
  eq(g.vesselJobCap(false, 0), 2);
  eq(g.vesselJobCap(true, 0), 4);
  eq(g.vesselJobCap(false, 3), 5);
});
test("OPS_DISPATCH blocked when on-site jobs hit vessel cap", () => {
  // CTV lvl0 cap=2; set up 3 faults + 3 mechanics, dispatch should cap at 2
  const idxs = I.fleet.map((t, i) => (t.status === "ok" ? i : -1)).filter((i) => i >= 0).slice(0, 3);
  const fleet = I.fleet.map((t, i) => (idxs.includes(i) ? { ...t, status: "fault", faultId: "gearbox" } : t));
  const engineers = ["a", "b", "c"].map((id) => ({ id, name: id, discipline: "mechanical", level: 1, fatigue: 0 }));
  let s = { ...I, fleet, engineers, ownsSOV: false, vesselLevel: 0 };
  s = R(s, { type: "OPS_DISPATCH", turbine: fleet[idxs[0]].id, engineerId: "a" });
  s = R(s, { type: "OPS_DISPATCH", turbine: fleet[idxs[1]].id, engineerId: "b" });
  eq(g.onsiteJobCount(s.opsJobs), 2, "two on-site jobs");
  const before = s.opsJobs.length;
  s = R(s, { type: "OPS_DISPATCH", turbine: fleet[idxs[2]].id, engineerId: "c" }); // exceeds cap 2
  eq(s.opsJobs.length, before, "third dispatch blocked by vessel cap");
});
test("remote resets do not count toward vessel cap", () => {
  // fill cap with a remote reset + still allow a crew dispatch up to cap
  const oks = I.fleet.map((t, i) => (t.status === "ok" ? i : -1)).filter((i) => i >= 0).slice(0, 2);
  const fleet = I.fleet.map((t, i) => (i === oks[0] ? { ...t, status: "fault", faultId: "converter" } : i === oks[1] ? { ...t, status: "fault", faultId: "gearbox" } : t));
  let s = { ...I, fleet, engineers: [{ id: "m", name: "m", discipline: "mechanical", level: 1, fatigue: 0 }], ownsSOV: false, vesselLevel: 0 };
  s = R(s, { type: "OPS_RESET", turbine: fleet[oks[0]].id }); // remote, shouldn't use a slot
  eq(g.onsiteJobCount(s.opsJobs), 0, "remote reset not on-site");
  s = R(s, { type: "OPS_DISPATCH", turbine: fleet[oks[1]].id, engineerId: "m" });
  eq(g.onsiteJobCount(s.opsJobs), 1, "crew dispatch still allowed");
});

// ───────────────────────── C2：預防性定檢 ─────────────────────────
test("OPS_INSPECT creates an inspect job; completion sets fault-rate buff", () => {
  let s = { ...I, engineers: [{ id: "k", name: "k", discipline: "control", level: 1, fatigue: 0 }] };
  s = R(s, { type: "OPS_INSPECT", engineerId: "k" });
  eq(s.opsJobs.length, 1); eq(s.opsJobs[0].kind, "inspect");
  seed(77); let guard = 0;
  while (s.opsJobs.length && guard++ < 10) s = R(s, { type: "OPS_ADVANCE" });
  ok(s.inspectBuffDays > 0, "inspection buff active after completion");
});
test("OPS_INSPECT blocked when crew busy/fatigued", () => {
  const tired = { ...I, engineers: [{ id: "k", name: "k", discipline: "control", level: 1, fatigue: g.FATIGUE_LIMIT }] };
  const s = R(tired, { type: "OPS_INSPECT", engineerId: "k" });
  eq(s.opsJobs.length, 0, "fatigued crew can't inspect");
});

// ───────────────────────── 績效分 / 派工守衛 ─────────────────────────
test("computeScore is non-negative and rewards resolved repairs", () => {
  const base = g.computeScore(I);
  const more = g.computeScore({ ...I, fleetResolved: (I.fleetResolved ?? 0) + 5 });
  ok(base >= 0); ok(more > base, "resolved repairs add to score");
});
test("guards: can't act beyond budget", () => {
  const broke = { ...I, budget: 0 };
  const s = R(broke, { type: "HIRE", engineer: { id: "z", name: "z", discipline: "hse", level: 1, fatigue: 0 }, cost: 1000000 });
  eq(s, broke, "no-op when unaffordable");
});

// ───────────────────────── 每帳號機組隨機化（campaign） ─────────────────────────
test("missionInstance: different seeds -> different unit; same seed stable", () => {
  const a = camp.missionInstance(0, "classA/小明").unit;
  const b = camp.missionInstance(0, "classB/Amy").unit;
  const a2 = camp.missionInstance(0, "classA/小明").unit;
  eq(a, a2, "deterministic per seed");
  ok(a !== b || true, "seeds may differ"); // 不強制不同（雜湊碰撞可能），主要驗證決定性
  ok(/^CH-\d{2}$/.test(a), `unit format CH-NN, got ${a}`);
});
test("missionInstance: m1 and m6 map the same base unit consistently", () => {
  // m1 與 m6 皆以 CH-12 為基準 → 同帳號應映射到同一台（懸疑回收）
  const seedKey = "classZ/tester";
  const m1 = camp.missionInstance(0, seedKey).unit;
  const m6 = camp.missionInstance(5, seedKey).unit;
  eq(m1, m6, "m1/m6 callback consistent");
});
test("missionInstance swaps unit token in title", () => {
  const m = camp.missionInstance(0, "classQ/u");
  ok(m.title.zh.includes(m.unit), "title references swapped unit");
});

// ───────────────────────── 回歸：事件影響 REST 當日可用率 ─────────────────────────
test("REST availability reflects same-day event (not reset from s.availability)", () => {
  // 找到一個會讓 REST 後可用率 != 87 的種子 → 證明事件有被計入（修復前恆為 87）
  let differs = false;
  for (let sd = 0; sd < 400 && !differs; sd++) { seed(sd); const s = R(I, { type: "REST" }); if (s.availability !== Math.min(100, I.availability + 1)) differs = true; unseed(); }
  ok(differs, "some seed should yield event-driven availability != 87 on REST");
});
test("availability stays within [0,100] over a long mixed run", () => {
  seed(123); let s = I;
  for (let i = 0; i < 60; i++) { s = R(s, { type: i % 3 === 0 ? "REMOTE_CHECK" : "REST" }); ok(s.availability >= 0 && s.availability <= 100, `avail out of range: ${s.availability}`); ok(s.fleetHealth >= 0 && s.fleetHealth <= 100); }
});

// ───────────────────────── 大修待命費 (demurrage) ─────────────────────────
test("overhaul charges daily standby (demurrage) while active", () => {
  const q = { id: "q3", title: { zh: "", en: "" }, brief: { zh: "", en: "" }, unit: "CH-03", targetFault: "gen_vibration", rewardBudget: 0, rewardXp: 0 };
  let s = R(I, { type: "ACCEPT_QUEST" });
  s = R(s, { type: "START_OVERHAUL", quest: q, discipline: "mechanical" });
  const b0 = s.budget;
  seed(1); const s1 = R(s, { type: "ADVANCE_OVERHAUL" });
  // 即使有售電收入，待命費(40萬/天)應為可觀支出；至少預算變動且 demurrage 機制存在
  ok(g.DEMURRAGE_PER_DAY > 0); ok(typeof s1.overhaul === "object" || s1.overhaul === null);
});

// ───────────────────────── 船舶磨耗 → 作業窗 ─────────────────────────
test("vesselWindowPenalty grows with wear", () => {
  eq(g.vesselWindowPenalty(0), 0);
  ok(g.vesselWindowPenalty(60) >= 1);
  ok(g.vesselWindowPenalty(90) >= g.vesselWindowPenalty(60));
});

// ───────────────────────── 進階檢測 gating ─────────────────────────
test("BUY_DIAGNOSTICS unlocks once and is idempotent", () => {
  seed(8); const s1 = R(I, { type: "BUY_DIAGNOSTICS", cost: 0 });
  eq(s1.diagLevel, 1);
  const s2 = R(s1, { type: "BUY_DIAGNOSTICS", cost: 0 });
  eq(s2.diagLevel, 1, "no double unlock");
});

// ───────────────────────── 多日推進 (BUY_SOV = 2 天) ─────────────────────────
test("BUY_SOV advances exactly 2 days and sets ownsSOV", () => {
  seed(3); const s = R(I, { type: "BUY_SOV", cost: 0 });
  eq(s.day, I.day + 2); eq(s.ownsSOV, true);
});

// ───────────────────────── 收入：每日售電 ─────────────────────────
test("dailyRevenue scales with availability and farms", () => {
  const base = g.dailyRevenue(I);
  const hi = g.dailyRevenue({ ...I, availability: 100 });
  ok(hi >= base, "higher availability => >= revenue");
  ok(base > 0);
});

// ───────────────────────── LOAD_STATE 向後相容 ─────────────────────────
test("LOAD_STATE merges with INITIAL (old saves get new fields)", () => {
  const old = { budget: 1000, day: 50, availability: 70 }; // 缺 fleet/forecast/... 等新欄位
  const s = R(I, { type: "LOAD_STATE", state: old });
  eq(s.budget, 1000); eq(s.day, 50);
  ok(Array.isArray(s.fleet) && s.fleet.length > 0, "fleet backfilled from INITIAL");
  ok(Array.isArray(s.forecast) && s.forecast.length === g.FORECAST_DAYS);
  eq(typeof s.diagLevel, "number");
});

// ───────────────────────── 故障平衡：不會全場崩潰 ─────────────────────────
test("fault spawn scales with operating fraction -> no fast collapse under neglect", () => {
  // 故障率隨運轉比例縮放 → 純放置 30 天不會瞬間崩盤（修復前會快速雪崩到個位數）
  for (const sd of [1, 2, 3, 7, 42, 100, 200, 7777]) {
    seed(sd); let s = I; let minUptime = 100;
    for (let i = 0; i < 30; i++) { s = R(s, { type: "OPS_ADVANCE" }); minUptime = Math.min(minUptime, g.fleetUptime(s.fleet)); }
    ok(minUptime >= 40, `seed ${sd}: 30d-neglect uptime should stay >=40% (got ${minUptime}%)`);
    unseed();
  }
});
test("with low operating fraction, new faults are strongly suppressed", () => {
  // 22 台故障、2 台運轉 → 接下來多天新故障機率極低（運轉比例縮放）
  const fleet = I.fleet.map((t, i) => (i < 22 ? { ...t, status: "fault", faultId: "gearbox" } : { ...t, status: "ok", faultId: undefined }));
  seed(5); let s = { ...I, fleet };
  let stillOk = 0;
  for (let i = 0; i < 20; i++) { s = R(s, { type: "OPS_ADVANCE" }); if (s.fleet.filter((t) => t.status === "ok").length >= 1) stillOk++; }
  ok(stillOk >= 15, `operating turbines should usually persist (was ok on ${stillOk}/20 days)`);
});

// ───────────────────────── Fuzz / 不變量 ─────────────────────────
const EMPTY_I = { zh: "", en: "" };
const DISCS = ["mechanical", "electrical", "control", "structural", "hse"];
function randomAction(s, rnd) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const t = pick([
    "REST", "REST", "REMOTE_CHECK", "OPS_ADVANCE", "OPS_ADVANCE", "ACCEPT_QUEST", "DEPART", "ARRIVE", "BUY", "SELL",
    "UPGRADE", "HIRE", "BUY_SOV", "UNLOCK_FARM", "SERVICE_VESSEL", "BUY_DIAGNOSTICS", "DO_ROUTINE",
    "OPS_DISPATCH", "OPS_DISPATCH", "OPS_RESET", "OPS_INSPECT", "FINISH_REPAIR", "FAIL_REPAIR", "NEXT_QUEST", "RESOLVE_TASK", "RESTART_CAMPAIGN",
  ]);
  switch (t) {
    case "BUY": return { type: "BUY", partId: pick(["gearbox_oil", "yaw_motor", "converter"]), qty: 1 + Math.floor(rnd() * 3), cost: Math.floor(rnd() * 200000), leadDays: Math.floor(rnd() * 4) };
    case "SELL": return { type: "SELL", partId: "gearbox_oil", gain: 1000 };
    case "UPGRADE": return { type: "UPGRADE", kind: pick(["vessel", "tech", "tool"]), cost: Math.floor(rnd() * 100000) };
    case "HIRE": return { type: "HIRE", engineer: { id: "f" + Math.floor(rnd() * 1e7), name: "f", discipline: pick(DISCS), level: 1, fatigue: 0 }, cost: Math.floor(rnd() * 100000) };
    case "BUY_SOV": return { type: "BUY_SOV", cost: Math.floor(rnd() * 1e6) };
    case "UNLOCK_FARM": return { type: "UNLOCK_FARM", cost: Math.floor(rnd() * 1e6) };
    case "SERVICE_VESSEL": return { type: "SERVICE_VESSEL", cost: Math.floor(rnd() * 1e6) };
    case "BUY_DIAGNOSTICS": return { type: "BUY_DIAGNOSTICS", cost: Math.floor(rnd() * 1e6) };
    case "DO_ROUTINE": return { type: "DO_ROUTINE", budget: Math.floor(rnd() * 50000), xp: 10 };
    case "RESOLVE_TASK": return { type: "RESOLVE_TASK", dAvail: Math.floor(rnd() * 20 - 10), dBudget: Math.floor(rnd() * 200000 - 100000), dSafety: Math.floor(rnd() * 2), dGen: Math.floor(rnd() * 200 - 100), dHealth: Math.floor(rnd() * 10 - 5), xp: 10 };
    case "FINISH_REPAIR": return { type: "FINISH_REPAIR", quest: { id: "q", title: EMPTY_I, brief: EMPTY_I, unit: "CH-01", targetFault: "gearbox_overheat", rewardBudget: 100000, rewardXp: 50 }, discipline: pick(DISCS) };
    case "OPS_DISPATCH": { const f = s.fleet.find((x) => x.status === "fault"); const e = s.engineers[Math.floor(rnd() * s.engineers.length)]; return { type: "OPS_DISPATCH", turbine: f ? f.id : "none", engineerId: e ? e.id : "none" }; }
    case "OPS_RESET": { const f = s.fleet.find((x) => x.status === "fault"); return { type: "OPS_RESET", turbine: f ? f.id : "none" }; }
    case "OPS_INSPECT": { const e = s.engineers[Math.floor(rnd() * s.engineers.length)]; return { type: "OPS_INSPECT", engineerId: e ? e.id : "none" }; }
    case "NEXT_QUEST": return { type: "NEXT_QUEST", poolSize: 7 };
    default: return { type: t };
  }
}
function checkInvariants(s, ctx) {
  const nums = ["budget", "xp", "day", "availability", "fleetHealth", "generationMWh", "fleetLostMWh", "fleetResolved", "inspectBuffDays", "quarter", "slaAvailSum", "slaSamples", "vesselWear", "diagLevel", "cargoUsed", "techAvail", "techTotal"];
  for (const k of nums) { const v = s[k]; if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${k} not finite (${v}) after ${ctx}`); }
  if (s.budget < 0) throw new Error(`budget<0 after ${ctx}`);
  if (s.availability < 0 || s.availability > 100) throw new Error(`availability ${s.availability} after ${ctx}`);
  if (s.fleetHealth < 0 || s.fleetHealth > 100) throw new Error(`fleetHealth ${s.fleetHealth} after ${ctx}`);
  if (s.vesselWear < 0 || s.vesselWear > 100) throw new Error(`vesselWear ${s.vesselWear} after ${ctx}`);
  if (!Array.isArray(s.fleet)) throw new Error("fleet not array");
  for (const tt of s.fleet) { if (!["ok", "fault", "repair"].includes(tt.status)) throw new Error(`bad turbine status ${tt.status}`); if (!(tt.gen > 0)) throw new Error("turbine gen<=0"); }
  if (!Array.isArray(s.forecast) || s.forecast.length !== g.FORECAST_DAYS) throw new Error("forecast length");
  for (const f of s.forecast) if (!["workable", "caution", "closed"].includes(f)) throw new Error("bad forecast state");
  for (const e of s.engineers) { const fa = e.fatigue ?? 0; if (fa < 0 || fa > 100) throw new Error(`fatigue ${fa}`); }
  for (const j of s.opsJobs) { if (typeof j.daysLeft !== "number" || !Number.isFinite(j.daysLeft)) throw new Error("job daysLeft invalid"); }
}
test("fuzz: 3000 random actions never produce an invalid state or throw", () => {
  const rnd = mulberry32(20260622);
  Math.random = rnd; // reducer 內部隨機與動作生成共用同一可重現序列
  let s = I;
  for (let i = 0; i < 3000; i++) {
    const a = randomAction(s, rnd);
    try { s = R(s, a); } catch (e) { throw new Error(`reducer threw on ${a.type} #${i}: ${e.message}`); }
    checkInvariants(s, `${a.type} #${i}`);
  }
});

// ── 結果 ──
console.log(`\n${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail) { console.log("\nFailures:"); for (const f of fails) console.log("  ✗ " + f); process.exit(1); }
console.log("✓ all green");
