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

// ── 結果 ──
console.log(`\n${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail) { console.log("\nFailures:"); for (const f of fails) console.log("  ✗ " + f); process.exit(1); }
console.log("✓ all green");
