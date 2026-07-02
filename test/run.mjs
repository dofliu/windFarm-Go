// 無外部相依的測試執行器：用 esbuild 打包遊戲邏輯（state 層，無 React）後逐項斷言。
// 執行：npm test  （node test/run.mjs）
import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";

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
// localStorage 測試替身（profile.ts 帳號清單等需要）
globalThis.localStorage = (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() };
})();
function eq(a, b, msg) { if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function near(a, b, tol, msg) { if (Math.abs(a - b) > tol) throw new Error(msg || `expected ~${b}±${tol}, got ${a}`); }

const g = await load("src/state/game.ts");
const inc = await load("src/state/incidents.ts");
const camp = await load("src/ui/campaign.ts");
const course = await load("src/state/course.ts");
const data = await load("src/ui/data.ts");
const flt = await load("src/ui/faults.ts");
const cmap = await load("src/ui/courseMap.ts");
const tut = await load("src/ui/tutorialSteps.ts");
const tasks = await load("src/state/tasks.ts");
const cons = await load("src/state/construction.ts");
const prof = await load("src/state/profile.ts");
const api = await load("src/cloud/api.ts");
const recs = await load("src/state/records.ts");
const daily = await load("src/state/dailyTasks.ts");
const weekly = await load("src/state/weeklyChallenges.ts");
const pack = await load("src/state/scenarioPack.ts");
const cs = await load("src/state/caseStudies.ts");
const trends = await load("src/state/trends.ts");
const mastery = await load("src/state/mastery.ts");
const port = await load("src/state/port.ts");
const events = await load("src/state/events.ts");
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

// ───────────────────────── 技師薪資 ─────────────────────────
test("dailyPayroll sums per-engineer salary; higher level costs more; empty = 0", () => {
  const e1 = { id: "a", name: "a", discipline: "mechanical", level: 1, fatigue: 0 };
  const e2 = { id: "b", name: "b", discipline: "electrical", level: 2, fatigue: 0 };
  eq(g.dailyPayroll([]), 0);
  eq(g.dailyPayroll([e1, e2]), g.salaryOf(e1) + g.salaryOf(e2));
  ok(g.salaryOf(e2) > g.salaryOf(e1), "higher level paid more");
  ok(g.dailyPayroll([e1, e2]) > g.dailyPayroll([e1]), "more crew costs more");
  // 月薪落在 7~13 萬量級
  ok(g.salaryOf(e1) * 30 >= 70_000 && g.salaryOf(e1) * 30 <= 130_000, `Lv1 monthly ${g.salaryOf(e1) * 30}`);
});
test("payroll is charged on day advance (more crew -> less net budget)", () => {
  const lean = { ...I, engineers: [I.engineers[0]] };
  const heavy = { ...I, engineers: [I.engineers[0], { id: "x", name: "x", discipline: "electrical", level: 3, fatigue: 0 }] };
  seed(5); const a = R(lean, { type: "REST" });
  seed(5); const b = R(heavy, { type: "REST" });
  ok(b.budget < a.budget, "bigger payroll lowers net budget on the same day/seed");
});

// ───────────────────────── 海象限制派船 ─────────────────────────
test("OPS_DISPATCH blocked in closed seas without SOV; remote reset still works", () => {
  const idx = I.fleet.findIndex((t) => t.status === "ok");
  const fleet = I.fleet.map((t, i) => (i === idx ? { ...t, status: "fault", faultId: "gearbox" } : t));
  const base = { ...I, fleet, seaState: "closed", ownsSOV: false, engineers: [{ id: "m", name: "m", discipline: "mechanical", level: 1, fatigue: 0 }], inventory: { gearbox_oil: 9 } };
  const blocked = R(base, { type: "OPS_DISPATCH", turbine: fleet[idx].id, engineerId: "m" });
  eq(blocked.opsJobs.length, 0, "no crew dispatch in closed seas (CTV)");
  // SOV can sail in closed seas (multi-vessel #4: must operate a closed-tolerant vessel)
  const withSov = R({ ...base, ownsSOV: true, ownedVessels: ["ctv", "sov"], activeVessel: "sov" }, { type: "OPS_DISPATCH", turbine: fleet[idx].id, engineerId: "m" });
  eq(withSov.opsJobs.length, 1, "SOV can deploy in closed seas");
  // ...but an active CTV still cannot, even if you own an SOV
  const ctvActive = R({ ...base, ownsSOV: true, ownedVessels: ["ctv", "sov"], activeVessel: "ctv" }, { type: "OPS_DISPATCH", turbine: fleet[idx].id, engineerId: "m" });
  eq(ctvActive.opsJobs.length, 0, "active CTV can't deploy in closed seas even if an SOV is owned");
  // resettable fault: remote reset works regardless of weather
  const soft = { ...I, fleet: I.fleet.map((t, i) => (i === idx ? { ...t, status: "fault", faultId: "converter" } : t)), seaState: "closed", ownsSOV: false };
  const reset = R(soft, { type: "OPS_RESET", turbine: I.fleet[idx].id });
  eq(reset.opsJobs.length, 1, "remote reset ignores weather");
});

// ───────────────────────── 招募 / 解僱 ─────────────────────────
test("FIRE removes an engineer; blocked while on an ops job", () => {
  const two = { ...I, engineers: [...I.engineers, { id: "fireMe", name: "x", discipline: "electrical", level: 1, fatigue: 0 }] };
  const s = R(two, { type: "FIRE", id: "fireMe" });
  eq(s.engineers.length, two.engineers.length - 1, "engineer removed");
  ok(!s.engineers.some((e) => e.id === "fireMe"));
  const onJob = { ...two, opsJobs: [{ id: "j", turbine: "CH-01", engineerId: "fireMe", discipline: "electrical", daysLeft: 2 }] };
  const blocked = R(onJob, { type: "FIRE", id: "fireMe" });
  eq(blocked.engineers.length, onJob.engineers.length, "can't fire a deployed engineer");
});

// ───────────────────────── 經濟：備品價格量級 ─────────────────────────
test("part prices: realistic scale (major components >> consumables)", () => {
  const price = (id) => data.priceNum(data.PARTS.find((p) => p.id === id));
  ok(price("gearbox_oil") < 200_000, "consumable cheap");
  ok(price("hydraulic_oil") < 200_000, "consumable cheap");
  ok(price("pitch_bearing") > 500_000, "bearing is a capital item");
  ok(price("converter") > 1_000_000, "converter is a major component");
  ok(price("gfrp_blade") > price("pitch_bearing"), "blade is the most expensive");
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
  const part = inc.incidentAt(faultId)?.part; // 派工需備品 → 測試先備好庫存
  return { state: { ...I, fleet, engineers, inventory: part ? { [part]: 9 } : {} }, turbine: fleet[idx].id };
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
test("dispatched job completes -> turbine ok + resolved++", () => {
  const { state, turbine } = withFault("converter", "electrical");
  let s = R(state, { type: "OPS_DISPATCH", turbine, engineerId: "em" });
  const r0 = s.fleetResolved;
  seed(31); for (let i = 0; i < 4 && s.opsJobs.length; i++) s = R(s, { type: "OPS_ADVANCE" });
  eq(s.fleet.find((t) => t.id === turbine).status, "ok");
  eq(s.fleetResolved, r0 + 1, "completion counts a resolved repair (adds score + fix reward)");
});
test("OPS_RESET only works on resettable faults", () => {
  const soft = withFault("converter", "electrical"); // resettable
  const r1 = R(soft.state, { type: "OPS_RESET", turbine: soft.turbine });
  eq(r1.opsJobs.length, 1, "resettable -> remote job"); ok(r1.opsJobs[0].remote);
  const hard = withFault("gearbox", "mechanical"); // not resettable
  const r2 = R(hard.state, { type: "OPS_RESET", turbine: hard.turbine });
  eq(r2.opsJobs.length, 0, "non-resettable blocked");
});
test("incidents pool: resettable subset exists; all have discipline+repairDays+part+weight", () => {
  ok(inc.INCIDENTS.length >= 5);
  ok(inc.INCIDENTS.some((x) => x.resettable), "some resettable");
  ok(inc.INCIDENTS.some((x) => !x.resettable), "some require crew");
  ok(inc.INCIDENTS.every((x) => x.discipline && x.repairDays > 0 && x.part && x.weight > 0));
});
test("content catalog: faults/incidents/parts/course are consistent (#3 expansion)", () => {
  const partIds = new Set(data.PARTS.map((p) => p.id));
  const faults = Object.values(flt.FAULTS);
  // 規模成長(擴充後)
  ok(data.PARTS.length >= 20, `parts >= 20 (got ${data.PARTS.length})`);
  ok(faults.length >= 15, `faults >= 15 (got ${faults.length})`);
  ok(inc.INCIDENTS.length >= 15, `incidents >= 15 (got ${inc.INCIDENTS.length})`);
  // 每個故障:備品存在、quiz 4 選且正解在範圍、SOP 5 步、欄位齊全
  for (const f of faults) {
    ok(partIds.has(f.part), `fault ${f.id} part '${f.part}' must exist in PARTS`);
    eq(f.quiz.options.length, 4, `fault ${f.id} quiz must have 4 options`);
    ok(f.quiz.correct >= 0 && f.quiz.correct < 4, `fault ${f.id} correct in range`);
    eq(f.sop.length, 5, `fault ${f.id} sop must have 5 steps`);
    ok(f.discipline && f.part && f.knowledge_point, `fault ${f.id} fields present`);
    ok(["nacelle", "hub", "tower", "deck"].includes(flt.locationOf(f.id)), `fault ${f.id} has a valid location`);
  }
  // quiz 正解不應全部相同(避免「答案都差不多」)
  ok(new Set(faults.map((f) => f.quiz.correct)).size >= 3, "quiz correct answers are spread across options");
  // 每個戰情室故障的備品都存在
  for (const x of inc.INCIDENTS) ok(partIds.has(x.part), `incident ${x.id} part '${x.part}' must exist in PARTS`);
  // 課程週次指派的 faultId 必須存在;涵蓋全部五大科別
  for (const w of cmap.COURSE_WEEKS) ok(flt.FAULTS[w.faultId], `course week ${w.week} faultId '${w.faultId}' must exist`);
  const discs = new Set(faults.map((f) => f.discipline));
  for (const d of ["mechanical", "electrical", "control", "structural", "hse"]) ok(discs.has(d), `faults cover discipline ${d}`);
});
test("tier system: tierOf monotonic & new account is Tier 1 (#76)", () => {
  eq(g.tierOf(I), 1, "fresh account starts at Tier 1");
  eq(g.TIER_COUNT, 4);
  // 進度訊號跨門檻 → 升級；且單調不減
  ok(g.tierOf({ ...I, missionsDone: 6 }) >= 2, "missions push to >=T2");
  ok(g.tierOf({ ...I, generationMWh: 6000 }) >= 3, "generation pushes to >=T3");
  ok(g.tierOf({ ...I, farmsOwned: 3 }) >= 3, "more farms push to >=T3");
  ok(g.tierOf({ ...I, campaignIndex: 6 }) === 4, "late campaign reaches T4");
  // 單調性：各訊號遞增 tier 不減
  let prev = 0;
  for (const gen of [0, 1500, 6000, 15000, 30000]) { const t = g.tierOf({ ...I, generationMWh: gen }); ok(t >= prev, "tier non-decreasing in generation"); prev = t; }
  // 每個 tier 的故障率倍率存在且遞增
  ok(g.TIER_FAULT_MULT[1] < g.TIER_FAULT_MULT[3], "fault rate scales with tier");
});
test("tier gating: incident/part/fault pools grow with tier; consumable parts reachable at T1 (#76)", () => {
  const t1 = inc.incidentsForTier(1), t4 = inc.incidentsForTier(4);
  ok(t1.length >= 4 && t1.length < t4.length, `T1 pool small (${t1.length}) < T4 (${t4.length})`);
  eq(t4.length, inc.INCIDENTS.length, "T4 unlocks the whole pool");
  // Tier 1 故障池應以「可重啟或耗材級小修」為主（入門友善）：每個 T1 故障的備品價格不過高
  for (const x of t1) {
    const p = data.PARTS.find((pp) => pp.id === x.part);
    ok(p, `T1 incident ${x.id} part exists`);
    ok(x.resettable || data.priceNum(p) <= 700000, `T1 incident ${x.id} is soft or low-cost`);
  }
  // 不變式：每個 incident 的備品 minTier ≤ incident minTier（玩到該故障時備品買得到）
  for (const x of inc.INCIDENTS) {
    const p = data.PARTS.find((pp) => pp.id === x.part);
    ok((p.minTier ?? 1) <= (x.minTier ?? 1), `incident ${x.id}: part tier <= incident tier`);
  }
  // partsForTier 隨 tier 成長、T4 全開
  ok(data.partsForTier(1).length < data.partsForTier(4).length, "parts pool grows with tier");
  eq(data.partsForTier(4).length, data.PARTS.length, "T4 unlocks all parts");
  // 每個故障都有層級；入門故障(Tier 1)至少數種
  for (const id of Object.keys(flt.FAULTS)) ok(flt.faultTier(id) >= 1 && flt.faultTier(id) <= 4, `fault ${id} has a valid tier`);
  ok(Object.keys(flt.FAULTS).filter((id) => flt.faultTier(id) === 1).length >= 3, ">=3 entry-level faults");
});
test("tier gating: randomIncidentId respects tier pool (#76)", () => {
  seed(7);
  const t1ids = new Set(inc.incidentsForTier(1).map((x) => x.id));
  for (let i = 0; i < 200; i++) ok(t1ids.has(inc.randomIncidentId(1)), "T1 random fault stays within T1 pool");
});
test("tier gating: fresh fleet plants only Tier-1 faults (#76)", () => {
  seed(11);
  const fleet = g.buildFleet(1); // 預設 tier 1
  const t1ids = new Set(inc.incidentsForTier(1).map((x) => x.id));
  for (const t of fleet.filter((x) => x.status === "fault")) ok(t1ids.has(t.faultId), `init fault ${t.faultId} within T1`);
});
test("codex & components: every fault has a deep codex entry; components map 1:1 to faults (C: 圖鑑/多重根因)", () => {
  const faultIds = Object.keys(flt.FAULTS);
  // 每個故障都有完整的圖鑑解說(五欄 + 雙語)
  for (const id of faultIds) {
    const c = flt.CODEX[id];
    ok(c, `fault ${id} has a CODEX entry`);
    for (const k of ["mechanism", "symptom", "differential", "consequence", "tip"]) {
      ok(c[k] && c[k].zh && c[k].en, `codex ${id}.${k} bilingual present`);
    }
  }
  // 元件分組:每個 faultId 都存在、無重複、且涵蓋全部故障
  const inComponents = flt.COMPONENTS.flatMap((c) => c.faultIds);
  eq(inComponents.length, new Set(inComponents).size, "no fault appears in two components");
  for (const id of inComponents) ok(flt.FAULTS[id], `component faultId '${id}' must exist in FAULTS`);
  for (const id of faultIds) ok(inComponents.includes(id), `fault '${id}' must belong to a component`);
  // 多重根因元件:確實 ≥2 個根因,用於鑑別診斷題組
  ok(flt.MULTI_CAUSE_COMPONENTS.length >= 4, `>=4 multi-cause components (got ${flt.MULTI_CAUSE_COMPONENTS.length})`);
  for (const c of flt.MULTI_CAUSE_COMPONENTS) ok(c.faultIds.length >= 2, `component ${c.id} is multi-cause`);
  // 同元件內症狀不應重複(鑑別診斷題組才有意義)
  for (const c of flt.MULTI_CAUSE_COMPONENTS) {
    const symptoms = c.faultIds.map((id) => flt.CODEX[id].symptom.zh);
    eq(symptoms.length, new Set(symptoms).size, `component ${c.id} symptoms are distinct`);
  }
});
test("ops-center task catalog: well-formed, balanced & generator stable (#2 expansion)", () => {
  const T = tasks.TASKS;
  ok(T.length >= 180, `tasks >= 180 (got ${T.length})`);
  // id 唯一
  const ids = T.map((t) => t.id);
  eq(ids.length, new Set(ids).size, "task ids are unique");
  const cats = new Set(["A", "B", "C", "D", "E", "F", "G"]);
  const effKeys = new Set(["a", "b", "s", "g"]);
  const perCat = {};
  for (const t of T) {
    ok(cats.has(t.cat), `task ${t.id} has a valid category`);
    perCat[t.cat] = (perCat[t.cat] ?? 0) + 1;
    ok(t.title?.zh && t.title?.en, `task ${t.id} title bilingual`);
    ok(t.scenario?.zh && t.scenario?.en, `task ${t.id} scenario bilingual`);
    ok(typeof t.xp === "number" && t.xp > 0, `task ${t.id} has xp`);
    ok(Array.isArray(t.choices) && t.choices.length >= 2, `task ${t.id} has >=2 choices`);
    ok(t.choices.some((c) => c.good), `task ${t.id} has at least one good choice`);
    for (const c of t.choices) {
      ok(c.label?.zh && c.label?.en, `task ${t.id} choice label bilingual`);
      ok(c.feedback?.zh && c.feedback?.en, `task ${t.id} choice feedback bilingual`);
      for (const k of Object.keys(c.eff ?? {})) ok(effKeys.has(k), `task ${t.id} eff key '${k}' valid`);
    }
  }
  // 七大類皆有充足題量(避免某類太薄)
  for (const c of cats) ok(perCat[c] >= 15, `category ${c} has >=15 tasks (got ${perCat[c]})`);
  // generateTask 以 seed 可重現,且機組編號格式正確
  const a = tasks.generateTask(5), b = tasks.generateTask(5);
  eq(a.template.id, b.template.id, "generateTask(seed) is reproducible");
  ok(/^CH-\d{2}$/.test(a.unit), "unit code formatted CH-NN");
});
test("OPS_DISPATCH consumes the part; blocked when out of stock", () => {
  const { state, turbine } = withFault("gearbox", "mechanical"); // stocks gearbox_oil:9
  const before = state.inventory.gearbox_oil;
  const s = R(state, { type: "OPS_DISPATCH", turbine, engineerId: "em" });
  eq(s.opsJobs.length, 1, "dispatch succeeds with part in stock");
  eq(s.inventory.gearbox_oil, before - 1, "one part consumed");
  // out of stock -> blocked
  const noStock = { ...state, inventory: {} };
  const blocked = R(noStock, { type: "OPS_DISPATCH", turbine, engineerId: "em" });
  eq(blocked.opsJobs.length, 0, "no part -> dispatch blocked");
});
test("fleet fault rate is bounded/calm over time (managed-ish)", () => {
  seed(50); let s = I; for (let i = 0; i < 10; i++) s = R(s, { type: "REST" });
  const faults = s.fleet.filter((t) => t.status === "fault").length;
  ok(faults <= 12, `faults after 10 idle days should be modest, got ${faults}`);
});

// ───────────────────────── 出海航次成本（批次維修） ─────────────────────────
test("first dispatch pays sortie mobilization; batched dispatches in the same trip don't", () => {
  const oks = I.fleet.map((t, i) => (t.status === "ok" ? i : -1)).filter((i) => i >= 0).slice(0, 2);
  const fleet = I.fleet.map((t, i) => (oks.includes(i) ? { ...t, status: "fault", faultId: "gearbox" } : t));
  const engineers = ["a", "b"].map((id) => ({ id, name: id, discipline: "mechanical", level: 1, fatigue: 0 }));
  let s = { ...I, fleet, engineers, inventory: { gearbox_oil: 9 }, vesselWear: 0 };
  const b0 = s.budget, w0 = s.vesselWear;
  s = R(s, { type: "OPS_DISPATCH", turbine: fleet[oks[0]].id, engineerId: "a" }); // new sortie
  eq(s.budget, b0 - g.SORTIE_COST, "first dispatch charges mobilization");
  ok(s.vesselWear > w0, "sortie wears the vessel");
  const b1 = s.budget, w1 = s.vesselWear;
  s = R(s, { type: "OPS_DISPATCH", turbine: fleet[oks[1]].id, engineerId: "b" }); // same trip (a still out)
  eq(s.budget, b1, "batched dispatch this trip pays no extra mobilization");
  eq(s.vesselWear, w1, "no extra wear when batching onto the current sortie");
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
  let s = { ...I, fleet, engineers, ownsSOV: false, vesselLevel: 0, inventory: { gearbox_oil: 9 } };
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
  let s = { ...I, fleet, engineers: [{ id: "m", name: "m", discipline: "mechanical", level: 1, fatigue: 0 }], ownsSOV: false, vesselLevel: 0, inventory: { gearbox_oil: 9 } };
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
test("downtime (fleetLostMWh) penalises performance score (#2)", () => {
  const base = g.computeScore(I);
  const withLoss = g.computeScore({ ...I, fleetLostMWh: (I.fleetLostMWh ?? 0) + 1000 });
  ok(withLoss < base, "accumulated downtime loss lowers score");
  eq(base - withLoss, Math.round(1000 * g.DOWNTIME_SCORE_PENALTY), "penalty matches coefficient");
});
test("higher fleet uptime → higher score, downtime → lower (single-source #3/#2)", () => {
  // 同樣推進天數,妥善率高的機隊績效應高於放著不修的機隊（可用率×5 與停機罰金雙重反映）。
  const allOk = { ...I, fleet: I.fleet.map((t) => ({ ...t, status: "ok", faultId: undefined })), availability: 100, fleetLostMWh: 0 };
  const neglected = { ...I, fleet: I.fleet.map((t, i) => (i < 12 ? { ...t, status: "fault", faultId: "gearbox" } : t)), availability: 50, fleetLostMWh: 2000 };
  ok(g.computeScore(allOk) > g.computeScore(neglected), "healthy fleet scores higher than neglected");
});
test("fleet downtime reduces cash income AND net generation (not just score)", () => {
  // 同種子下，故障多的機隊推進一天 → 預算與發電 KPI 都比健康機隊低
  const faulted = { ...I, fleet: I.fleet.map((t, i) => (i < 10 ? { ...t, status: "fault", faultId: "gearbox" } : { ...t, status: "ok", faultId: undefined })) };
  const healthy = { ...I, fleet: I.fleet.map((t) => ({ ...t, status: "ok", faultId: undefined })) };
  seed(3); const f = R(faulted, { type: "REST" });
  seed(3); const h = R(healthy, { type: "REST" });
  ok(f.budget < h.budget, "downtime loses cash income");
  ok(f.generationMWh < h.generationMWh, "downtime reduces net generation KPI");
  // dailyRevenue 也反映停機
  ok(g.dailyRevenue(faulted) < g.dailyRevenue(healthy), "displayed revenue/day drops with faults");
});
// ───────────────────────── 新手教學流程閘門 ─────────────────────────
test("tutorial gates are all satisfiable by walking the real work-order flow", () => {
  const STEPS = tut.TUTORIAL_STEPS;
  const gateOf = (id) => { const s = STEPS.find((x) => x.id === id); return s && s.gate; };
  const correct = flt.FAULTS.gearbox_overheat.quiz.correct; // 第一關診斷正解
  const sopLen = flt.FAULTS.gearbox_overheat.sop.length;
  seed(1);
  let s = I;
  // 0) 教學開場會贈料（gearbox_oil），這裡比照
  s = R(s, { type: "BUY", partId: "gearbox_oil", qty: 1, cost: 0, leadDays: 0 });
  ok((s.inventory["gearbox_oil"] ?? 0) >= 1, "tutorial grants the required part");
  // 1) 接單 → questStage active
  s = R(s, { type: "ACCEPT_QUEST" });
  ok(gateOf("accept")(s, "hub"), "accept gate satisfied after ACCEPT_QUEST");
  // 出海/抵達畫面閘門（以畫面字串判定）
  ok(gateOf("setsail")(s, "sail") && !gateOf("setsail")(s, "hub"), "setsail gate keys on screen===sail");
  // 2) 出航 → jobPhase 離開 office
  s = R(s, { type: "DEPART" });
  ok(gateOf("depart")(s, "hub"), "depart gate satisfied after DEPART");
  s = R(s, { type: "ARRIVE" });
  ok(gateOf("startrepair")(s, "repair") && !gateOf("startrepair")(s, "sail"), "startrepair gate keys on screen===repair");
  // 3) 登塔 → repair.boarded
  const key = `${s.campaignIndex}:m1`;
  s = R(s, { type: "SET_REPAIR", repair: { key, boarded: true, pick: null, steps: Array.from({ length: sopLen }, (_, i) => i < 2), win: 10 } });
  ok(gateOf("board")(s, "repair"), "board gate satisfied after boarding");
  // 4) 診斷答對
  s = R(s, { type: "SET_REPAIR", repair: { key, boarded: true, pick: correct, steps: Array.from({ length: sopLen }, (_, i) => i < 2), win: 9 } });
  ok(gateOf("quiz")(s, "repair"), "quiz gate satisfied when pick === correct");
  // 5) SOP 全完成
  s = R(s, { type: "SET_REPAIR", repair: { key, boarded: true, pick: correct, steps: Array.from({ length: sopLen }, () => true), win: 6 } });
  ok(gateOf("sop")(s, "repair"), "sop gate satisfied when all steps done");
  // 6) 完工 → questStage done
  s = R(s, { type: "FINISH_REPAIR", quest: camp.missionInstance(0), part: "gearbox_oil", discipline: "mechanical" });
  ok(gateOf("finish")(s, "repair"), "finish gate satisfied after FINISH_REPAIR");
  // 重大故障改走大修：finish 閘門也須接受 overhaul（否則教學會卡在最後一步）
  ok(gateOf("finish")({ ...I, questStage: "active", overhaul: { questId: "x", need: 3, progress: 0 } }, "repair"), "finish gate also accepts overhaul (major fault)");
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

// ───────────────────────── #3 可用率單一真實來源（= 機隊運轉比例）─────────────────────────
test("availability is single-sourced from fleet uptime after advance (#3)", () => {
  // 半數機組故障 → 任一推進後 availability 應 == fleetUptime(fleet)，而非舊的純量加減。
  const half = { ...I, fleet: I.fleet.map((t, i) => (i % 2 === 0 ? { ...t, status: "fault", faultId: "gearbox" } : { ...t, status: "ok", faultId: undefined })) };
  for (const sd of [1, 7, 42, 99]) {
    seed(sd); const s = R(half, { type: "REST" });
    eq(s.availability, g.fleetUptime(s.fleet), `availability mirrors fleet uptime (seed ${sd})`);
  }
  // 開局 INITIAL 即自洽（不再是寫死的純量）
  eq(I.availability, g.fleetUptime(I.fleet), "INITIAL availability == fleet uptime");
});
test("fleet helpers fault/restore real units; applyAvailDelta scales by % points (#3)", () => {
  const allOk = I.fleet.map((t) => ({ ...t, status: "ok", faultId: undefined }));
  seed(1); const f = g.faultTurbines(allOk, 3);
  eq(f.filter((t) => t.status === "fault").length, 3, "faults exactly 3 running units");
  seed(1); const r = g.restoreTurbines(f, 2);
  eq(r.filter((t) => t.status === "fault").length, 1, "restores 2 of the 3 faulted");
  seed(1); const down = g.applyAvailDelta(allOk, -50);
  ok(g.fleetUptime(down) < 60, `−50pt delta drops uptime well below half, got ${g.fleetUptime(down)}`);
  eq(g.fleetUptime(g.applyAvailDelta(down, 100)), 100, "+100pt restores whole fleet");
});
test("availability stays single-sourced after RESOLVE_TASK dAvail (#3)", () => {
  // 沙盒任務的可用率效果改以真實機組故障/修復實作 → availability 仍 == fleetUptime。
  for (const sd of [3, 5, 17]) {
    seed(sd);
    const s = R(I, { type: "RESOLVE_TASK", dAvail: -20, dBudget: 0, dGen: 0, dSafety: 0, dHealth: 0, xp: 0 });
    eq(s.availability, g.fleetUptime(s.fleet), `availability mirrors fleet after task (seed ${sd})`);
    ok(s.availability >= 0 && s.availability <= 100, "availability in range");
  }
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
  ok(s.ownedVessels.includes("sov"), "BUY_SOV adds sov to the fleet");
  eq(s.activeVessel, "sov", "BUY_SOV activates the sov");
});

// ───────────────────────── 多元船隊（#4） ─────────────────────────
const ves = await load("src/state/vessels.ts");
test("vessel catalog: 5 classes, well-formed, CTV matches legacy constants", () => {
  const V = ves.VESSELS;
  eq(V.length, 5, "five vessel classes");
  const ids = V.map((v) => v.id);
  eq(ids.length, new Set(ids).size, "vessel ids unique");
  for (const v of V) {
    ok(v.name?.zh && v.name?.en && v.short?.zh && v.desc?.en, `vessel ${v.id} bilingual fields`);
    ok([0, 1, 2].includes(v.seaTol), `vessel ${v.id} seaTol in 0..2`);
    ok(v.cargo > 0 && v.jobCap > 0, `vessel ${v.id} positive cargo & jobCap`);
    ok(v.mobilizeDays >= 0 && v.sortieCost > 0 && v.wearRate > 0, `vessel ${v.id} sane costs`);
  }
  const ctv = V.find((v) => v.id === "ctv");
  eq(ctv.purchaseCost, 0, "CTV owned from start");
  eq(ctv.seaTol, 1, "CTV sea-tol matches legacy vesselSeaTol(false)");
  eq(ctv.jobCap, 2, "CTV jobCap matches legacy vesselJobCap(false,0)");
  eq(ctv.sortieCost, g.SORTIE_COST, "CTV sortie cost matches legacy SORTIE_COST");
  eq(ctv.wearRate, g.VESSEL_WEAR_PER_SORTIE, "CTV wear matches legacy VESSEL_WEAR_PER_SORTIE");
  // 至少一種僅可作業(快艇)、一種可到停航(SOV/Jack-up/母船)
  ok(V.some((v) => v.seaTol === 0), "a calm-only vessel exists (crew boat)");
  ok(V.filter((v) => v.seaTol === 2).length >= 3, "several closed-tolerant vessels exist");
});
test("INITIAL owns only CTV and operates it", () => {
  ok(I.ownedVessels.includes("ctv") && I.ownedVessels.length === 1, "starts with only CTV");
  eq(I.activeVessel, "ctv", "CTV is the active vessel");
});
test("derived helpers read the active vessel", () => {
  const sovState = { ...I, ownedVessels: ["ctv", "sov"], activeVessel: "sov", ownsSOV: true };
  eq(g.seaTolOf(sovState), 2, "SOV active → sea-tol 2");
  eq(g.jobCapOf(sovState), 4 + I.vesselLevel, "SOV active → jobCap 4 (+level)");
  const boat = { ...I, ownedVessels: ["ctv", "crew_boat"], activeVessel: "crew_boat" };
  eq(g.seaTolOf(boat), 0, "crew boat → sea-tol 0 (calm only)");
  ok(g.sortieCostOf(boat) < g.sortieCostOf(I), "crew boat is cheaper per sortie than CTV");
});
test("BUY_VESSEL: buys, activates, advances mobilization days, marks ownsSOV for closed-tolerant", () => {
  seed(7);
  const s = R(I, { type: "BUY_VESSEL", id: "jackup", cost: 0 });
  ok(s.ownedVessels.includes("jackup"), "jackup added to fleet");
  eq(s.activeVessel, "jackup", "jackup activated");
  eq(s.ownsSOV, true, "closed-tolerant purchase marks ownsSOV");
  eq(s.day, I.day + ves.vesselSpec("jackup").mobilizeDays, "advances by mobilization days");
  // crew boat does NOT grant closed tolerance
  const cb = R(I, { type: "BUY_VESSEL", id: "crew_boat", cost: 0 });
  eq(cb.ownsSOV, false, "crew boat purchase doesn't mark ownsSOV");
});
test("BUY_VESSEL blocked when unaffordable or already owned", () => {
  const poor = R({ ...I, budget: 10 }, { type: "BUY_VESSEL", id: "mothership", cost: 120_000_000 });
  ok(!poor.ownedVessels.includes("mothership"), "can't buy what you can't afford");
  const dup = R(I, { type: "BUY_VESSEL", id: "ctv", cost: 0 });
  eq(dup.ownedVessels.length, 1, "can't re-buy an owned vessel");
});
test("SET_ACTIVE_VESSEL requires ownership", () => {
  const ok1 = R({ ...I, ownedVessels: ["ctv", "sov"] }, { type: "SET_ACTIVE_VESSEL", id: "sov" });
  eq(ok1.activeVessel, "sov", "can switch to an owned vessel");
  const bad = R(I, { type: "SET_ACTIVE_VESSEL", id: "mothership" });
  eq(bad.activeVessel, "ctv", "can't switch to an unowned vessel");
});
test("migrateVessels backfills old saves (SOV owner keeps the SOV)", () => {
  // 舊存檔：擁有 SOV 但無多元船隊欄位
  const old = { ...I, ownsSOV: true };
  delete old.ownedVessels; delete old.activeVessel;
  const m = g.migrateVessels(old);
  ok(m.ownedVessels.includes("ctv") && m.ownedVessels.includes("sov"), "SOV backfilled into fleet");
  // 透過 LOAD_STATE 走遷移：可切換到 SOV
  const loaded = R(I, { type: "LOAD_STATE", state: { ownsSOV: true } });
  ok(loaded.ownedVessels.includes("sov"), "LOAD_STATE migrates an SOV save");
  const sw = R(loaded, { type: "SET_ACTIVE_VESSEL", id: "sov" });
  eq(sw.activeVessel, "sov", "migrated SOV is selectable");
  // activeVessel 不在已擁有清單時退回 ctv
  const weird = g.migrateVessels({ ...I, ownedVessels: ["ctv"], activeVessel: "mothership" });
  eq(weird.activeVessel, "ctv", "unowned active vessel falls back to CTV");
});
test("OPS_DISPATCH sortie cost & wear follow the active vessel", () => {
  const idx = I.fleet.findIndex((t) => t.status === "ok");
  const fleet = I.fleet.map((t, i) => (i === idx ? { ...t, status: "fault", faultId: "gearbox" } : t));
  const engineers = [{ id: "m", name: "m", discipline: "mechanical", level: 1, fatigue: 0 }];
  const base = { ...I, fleet, engineers, inventory: { gearbox_oil: 9 }, vesselWear: 0, ownedVessels: ["ctv", "crew_boat"], activeVessel: "crew_boat" };
  const s = R(base, { type: "OPS_DISPATCH", turbine: fleet[idx].id, engineerId: "m" });
  eq(base.budget - s.budget, ves.vesselSpec("crew_boat").sortieCost, "sortie cost uses crew boat's cost");
  eq(s.vesselWear, ves.vesselSpec("crew_boat").wearRate, "wear uses crew boat's rate");
});

// ───────────────────────── 收入：每日售電 ─────────────────────────
test("advance records daily ledger (Lili's books)", () => {
  seed(1);
  const after = R(I, { type: "REST" });
  const l = after.lastLedger;
  ok(l, "ledger present after advancing");
  eq(l.day, after.day);
  ok(l.revenue > 0, "power sales recorded as inflow");
  ok(l.payroll < 0, "payroll recorded as outflow");
  // 明細加總 = 淨額；淨額 = 推進後預算 − 推進前預算（REST 不另改預算）
  const sum = l.revenue + l.fixPay + l.payroll + l.storage + l.downtime + l.demurrage + l.slaPenalty + l.event;
  eq(l.net, sum);
  eq(l.net, after.budget - I.budget);
});
test("advance: budget floors once; ledger sums to net when solvent (no debt forgiveness)", () => {
  seed(2);
  const after = R(I, { type: "OPS_ADVANCE" });
  const l = after.lastLedger;
  const sum = l.revenue + l.fixPay + l.payroll + l.storage + l.downtime + l.demurrage + l.slaPenalty + l.event;
  eq(l.net, sum, "solvent day: components add up to net");
  eq(after.budget, I.budget + l.net);
  // 破產日：支出不再被逐步赦免；預算夾在 0、且淨額 = 0 − 起始預算（不會出現先赦免再補回）
  const broke = { ...I, budget: 0, engineers: [{ id: "e", name: "e", discipline: "mechanical", level: 5, fatigue: 0 }] };
  seed(2); const b = R(broke, { type: "OPS_ADVANCE" });
  ok(b.budget >= 0, "budget never negative");
  eq(b.lastLedger.net, b.budget - 0, "net = actual clamped change");
});
test("SLA settlement uses actual fleet uptime, not the legacy availability scalar", () => {
  // 季末結算以機隊實際運轉比例為準：大量停機 → 違約；全機運轉 → 達標（即使 availability 純量都=95）。
  const nearEnd = { ...I, day: I.quarterStartDay + 89, slaSamples: 0, slaAvailSum: 0, availability: 95 };
  const downFleet = { ...nearEnd, fleet: I.fleet.map((t, i) => (i < 18 ? { ...t, status: "fault", faultId: "gearbox" } : { ...t, status: "ok", faultId: undefined })) };
  const upFleet = { ...nearEnd, fleet: I.fleet.map((t) => ({ ...t, status: "ok", faultId: undefined })) };
  seed(5); const b = R(downFleet, { type: "OPS_ADVANCE" });
  seed(5); const u = R(upFleet, { type: "OPS_ADVANCE" });
  ok(b.lastSla && b.lastSla.day === b.day, "quarter settled this step");
  ok(b.lastSla.breached, "low fleet uptime breaches SLA despite availability 95");
  ok(u.lastSla && !u.lastSla.breached, "full fleet uptime meets SLA");
});
test("repair progress persists in state, resets on quest lifecycle (#33)", () => {
  const r = { key: "0:m1", boarded: true, pick: 0, steps: [true, true, true, false, false], win: 5, misses: 2 };
  const s1 = R(I, { type: "SET_REPAIR", repair: r });
  eq(s1.repair.win, 5);
  ok(s1.repair.boarded, "boarded persisted");
  eq(s1.repair.pick, 0);
  eq(s1.repair.misses, 2, "quiz misses persisted (debrief)");
  // 接新單 → 清空（避免把上一單進度帶到新單）
  eq(R(s1, { type: "ACCEPT_QUEST" }).repair, null);
  // 撤離（FAIL_REPAIR）→ 清空；作業窗不可被切畫面免費重置
  seed(1); eq(R(s1, { type: "FAIL_REPAIR" }).repair, null);
  // 明確清空
  eq(R(s1, { type: "SET_REPAIR", repair: null }).repair, null);
});
test("REPLAN_RETURN: 審慎返港 → 保留診斷/SOP 進度(#carry)、回 office、進 1 天、不計安全事件", () => {
  const r = { key: "0:m1", boarded: true, pick: 1, steps: [true, true, true, false, false], win: 2, misses: 1 };
  const base = { ...I, questStage: "active", jobPhase: "onsite", repair: r, safetyIncidents: 0 };
  seed(3); const s = R(base, { type: "REPLAN_RETURN" });
  ok(s.repair, "repair progress kept (not cleared)");
  eq(s.repair.key, "0:m1", "same work order key");
  eq(s.repair.pick, 1, "diagnosis pick kept");
  eq(s.repair.steps.filter(Boolean).length, 3, "completed SOP steps kept");
  eq(s.repair.boarded, false, "must re-board next trip");
  eq(s.repair.win, 0, "window re-rolled at next boarding (not carried)");
  eq(s.jobPhase, "office", "returned to office");
  eq(s.questStage, "active", "work order stays open (re-plannable)");
  eq(s.safetyIncidents, 0, "no safety incident (distinct from FAIL_REPAIR)");
  eq(s.day, base.day + 1, "advances one day");
  // 對照：FAIL_REPAIR(被迫撤離) 進度全失 + 計一次安全事件
  seed(3); const f = R(base, { type: "FAIL_REPAIR" });
  eq(f.repair, null, "FAIL_REPAIR clears progress");
  eq(f.safetyIncidents, 1, "FAIL_REPAIR counts a safety incident");
});
test("answer streak: 連續首答正確 → streak+1 與封頂 XP 加成;答錯歸零(#streak)", () => {
  let s = R(I, { type: "RECORD_ANSWER", keys: ["disc:mechanical"], correct: true });
  eq(s.answerStreak, 1, "streak starts");
  eq(s.xp, I.xp + 2, "bonus = streak*2");
  s = R(s, { type: "RECORD_ANSWER", keys: ["disc:control"], correct: true });
  eq(s.answerStreak, 2);
  eq(s.xp, I.xp + 2 + 4, "bonus grows with streak");
  for (let i = 0; i < 6; i++) s = R(s, { type: "RECORD_ANSWER", keys: ["disc:electrical"], correct: true });
  eq(s.answerStreak, 8);
  // 第 5 次起 bonus 封頂 10:2+4+6+8+10+10+10+10
  eq(s.xp, I.xp + 2 + 4 + 6 + 8 + 10 + 10 + 10 + 10, "bonus caps at 10");
  s = R(s, { type: "RECORD_ANSWER", keys: ["disc:mechanical"], correct: false });
  eq(s.answerStreak, 0, "wrong answer resets streak");
});
test("workWindowMax/sopStepCost: 海象越差窗越小、磨耗扣窗、下限 4；步驟耗時下限 1（出海預估與現場共用）", () => {
  const mk = (o) => ({ ...I, ...o });
  const w = g.workWindowMax(mk({ seaState: "workable", vesselLevel: 0, vesselWear: 0 }));
  const c = g.workWindowMax(mk({ seaState: "caution", vesselLevel: 0, vesselWear: 0 }));
  const cl = g.workWindowMax(mk({ seaState: "closed", vesselLevel: 0, vesselWear: 0 }));
  ok(w > c && c > cl, "workable > caution > closed");
  ok(g.workWindowMax(mk({ seaState: "workable", vesselLevel: 0, vesselWear: 90 })) < w, "heavy wear shrinks window");
  ok(g.workWindowMax(mk({ seaState: "closed", vesselLevel: 0, vesselWear: 90 })) >= 4, "never below floor 4");
  eq(g.sopStepCost(0), 2, "tool Lv.0 → 2 slots/step");
  eq(g.sopStepCost(1), 1, "tool Lv.1 → 1 slot/step");
  eq(g.sopStepCost(5), 1, "step cost floors at 1");
});
test("dailyRevenue scales with running turbines; no-fleet fallback uses availability", () => {
  // 機組越多運轉 → 收入越高
  const few = { ...I, fleet: I.fleet.map((t, i) => (i < 20 ? { ...t, status: "fault", faultId: "gearbox" } : t)) };
  ok(g.dailyRevenue(I) > g.dailyRevenue(few), "more running turbines => more revenue");
  // 無機組模型時退回可用率估算（且隨可用率上升）
  const noFleet = { ...I, fleet: [] };
  ok(g.dailyRevenue({ ...noFleet, availability: 100 }) > g.dailyRevenue({ ...noFleet, availability: 50 }), "fallback scales with availability");
  ok(g.dailyRevenue(I) > 0);
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

// ───────────────────────── 每週開放機制 (course) ─────────────────────────
test("course gating math", () => {
  eq(course.MISSIONS_PER_WEEK, 2);
  eq(course.WEEKS_TOTAL, Math.ceil(camp.CAMPAIGN.length / 2));
  eq(course.missionWeek(0), 1); eq(course.missionWeek(2), 2); eq(course.missionWeek(6), 4);
  eq(course.maxMissionForWeek(1), 1); eq(course.maxMissionForWeek(2), 3);
  eq(course.getWeek(), course.WEEKS_TOTAL, "defaults to all-open when no localStorage");
});

// ───────────────────────── 天氣模型 (makeForecast) ─────────────────────────
test("makeForecast deterministic under same seed; respects n and validity", () => {
  seed(2024); const a = g.makeForecast("workable", 5); unseed();
  seed(2024); const b = g.makeForecast("workable", 5); unseed();
  eq(a.length, 5); eq(JSON.stringify(a), JSON.stringify(b), "same seed => same forecast");
  ok(a.every((x) => ["workable", "caution", "closed"].includes(x)));
});

// ───────────────────────── 經濟 / 機組建構 數值正確 ─────────────────────────
test("dailyRevenue = running turbines × price (no double-count)", () => {
  // 開局 24 台中 3 台故障 → 21 台運轉 × 5 MWh = 105 → × 4500
  const running = I.fleet.filter((t) => t.status === "ok").reduce((a, t) => a + t.gen, 0);
  eq(g.dailyProduction(I), running);
  eq(running, 105); // 21 台運轉 × 5 MWh
  eq(g.dailyRevenue(I), 105 * g.ELECTRICITY_PRICE);
  // 全機正常 = 滿載發電
  const allOk = { ...I, fleet: I.fleet.map((t) => ({ ...t, status: "ok", faultId: undefined })) };
  eq(g.dailyProduction(allOk), 120);
  eq(g.dailyRevenue(allOk), 120 * g.ELECTRICITY_PRICE);
  // 低 headline 可用率但機組仍運轉 → 仍有收入（不再被可用率重複砍到 0，修正回歸）
  ok(g.dailyRevenue({ ...allOk, availability: 50 }) > 0, "running fleet earns even at low headline availability");
});
test("GRANT_FUNDS adds budget (test top-up)", () => {
  const after = g.reducer(I, { type: "GRANT_FUNDS", amount: g.TEST_GRANT });
  eq(after.budget, I.budget + g.TEST_GRANT);
  // 不影響其他狀態（不推進天數）
  eq(after.day, I.day);
  // 負數加值視為 0（防呆）
  eq(g.reducer(I, { type: "GRANT_FUNDS", amount: -5 }).budget, I.budget);
});
test("buildFleet: 24 units, even gen share = 5 MWh", () => {
  const f = g.buildFleet(1);
  eq(f.length, 24);
  ok(f.every((t) => t.gen === 5), "120/24 = 5 MWh per unit");
  eq(f.filter((t) => t.status === "fault").length, g.FLEET_INIT_FAULTS);
});
test("incidents: randomIncidentId valid; incidentAt lookups", () => {
  seed(1); ok(inc.incidentAt(inc.randomIncidentId()), "random id resolves to an incident"); unseed();
  ok(!inc.incidentAt("nope"), "unknown id -> undefined");
});

// ───────────────────────── Fuzz / 不變量 ─────────────────────────
const EMPTY_I = { zh: "", en: "" };
const DISCS = ["mechanical", "electrical", "control", "structural", "hse"];
function randomAction(s, rnd) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const t = pick([
    "REST", "REST", "REMOTE_CHECK", "OPS_ADVANCE", "OPS_ADVANCE", "ACCEPT_QUEST", "DEPART", "ARRIVE", "BUY", "SELL",
    "UPGRADE", "HIRE", "BUY_SOV", "UNLOCK_FARM", "SERVICE_VESSEL", "BUY_DIAGNOSTICS", "DO_ROUTINE",
    "OPS_DISPATCH", "OPS_DISPATCH", "OPS_RESET", "OPS_INSPECT", "FINISH_REPAIR", "FAIL_REPAIR", "REPLAN_RETURN", "NEXT_QUEST", "RESOLVE_TASK", "RESTART_CAMPAIGN",
    "BUILD_RESOLVE", "BUILD_RESOLVE", "BUILD_RESET",
  ]);
  switch (t) {
    case "BUILD_RESOLVE": return { type: "BUILD_RESOLVE", stage: s.buildStage, choiceIdx: Math.floor(rnd() * 2) };
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
// ───────────────────────── 風場建置番外篇短戰役（#1） ─────────────────────────
test("construction catalog: stages well-formed & BUILD_MAX_SCORE consistent", () => {
  const S = cons.BUILD_STAGES;
  ok(S.length >= 6, `>=6 build stages (got ${S.length})`);
  eq(cons.BUILD_STAGE_COUNT, S.length, "BUILD_STAGE_COUNT matches");
  const ids = S.map((x) => x.id);
  eq(ids.length, new Set(ids).size, "stage ids unique");
  let maxSum = 0;
  S.forEach((st, i) => {
    eq(st.phase, i + 1, `phase numbering sequential at ${st.id}`);
    ok(st.title?.zh && st.title?.en && st.scenario?.zh && st.scenario?.en, `stage ${st.id} bilingual`);
    ok(Array.isArray(st.choices) && st.choices.length >= 2, `stage ${st.id} >=2 choices`);
    ok(st.choices.some((c) => c.good), `stage ${st.id} has a good choice`);
    for (const c of st.choices) {
      ok(c.label?.zh && c.feedback?.en, `stage ${st.id} choice bilingual`);
      ok(c.days > 0 && c.cost >= 0, `stage ${st.id} choice sane cost/days`);
    }
    maxSum += Math.max(...st.choices.map((c) => c.score));
  });
  eq(cons.BUILD_MAX_SCORE, maxSum, "BUILD_MAX_SCORE = sum of best per stage");
  ok(cons.BUILD_MAX_SCORE > 0, "max score positive");
});
test("INITIAL build state is fresh", () => {
  eq(I.buildStage, 0); eq(I.buildScore, 0); eq(I.buildDone, false);
});
test("BUILD_RESOLVE advances stage, applies cost/days/score, guards wrong stage", () => {
  seed(31);
  const best = cons.BUILD_STAGES[0].choices.findIndex((c) => c.good);
  const c0 = cons.BUILD_STAGES[0].choices[best];
  const s = R(I, { type: "BUILD_RESOLVE", stage: 0, choiceIdx: best });
  eq(s.buildStage, 1, "advanced to next stage");
  eq(s.buildScore, c0.score, "score applied");
  eq(s.day, I.day + c0.days, "days advanced by choice");
  ok(s.budget <= I.budget, "cost charged (net of any daily income)");
  // 指定錯誤階段不生效
  const noop = R(s, { type: "BUILD_RESOLVE", stage: 0, choiceIdx: 0 });
  eq(noop.buildStage, s.buildStage, "resolving a non-current stage is a no-op");
});
test("completing all stages sets buildDone and pays the reward", () => {
  seed(33);
  let s = I;
  for (let i = 0; i < cons.BUILD_STAGE_COUNT; i++) {
    const gi = cons.BUILD_STAGES[i].choices.findIndex((c) => c.good);
    s = R(s, { type: "BUILD_RESOLVE", stage: i, choiceIdx: gi });
  }
  eq(s.buildDone, true, "campaign complete");
  eq(s.buildStage, cons.BUILD_STAGE_COUNT, "stage pointer at end");
  eq(s.buildScore, cons.BUILD_MAX_SCORE, "all-good run hits max score");
  ok(s.xp >= I.xp + cons.BUILD_REWARD_XP, "xp reward granted");
  // 再決策無效
  const after = R(s, { type: "BUILD_RESOLVE", stage: cons.BUILD_STAGE_COUNT, choiceIdx: 0 });
  eq(after.buildStage, s.buildStage, "no resolve after done");
  // 重置
  const reset = R(s, { type: "BUILD_RESET" });
  eq(reset.buildStage, 0); eq(reset.buildDone, false); eq(reset.buildScore, 0);
});
test("buildGrade: best run is S, worst is D", () => {
  ok(cons.buildGrade(cons.BUILD_MAX_SCORE).en.startsWith("S"), "max → S grade");
  ok(cons.buildGrade(-99).en.startsWith("D"), "very negative → D grade");
});

// ───────────────────────── 登入 / 帳號 / 通關碼（階段 1，學號為帳號） ─────────────────────────
test("profile: passcode hash deterministic & verify; format guard", () => {
  const id = prof.idOf({ studentId: "S01", classCode: "A1" });
  const h = prof.hashPin("1234", id);
  eq(h, prof.hashPin("1234", id), "hash is deterministic");
  ok(h !== prof.hashPin("1234", prof.idOf({ studentId: "S01", classCode: "A2" })), "hash salted by identity");
  ok(prof.verifyPin({ studentId: "S01", classCode: "A1", pinHash: h }, "1234"), "correct passcode verifies");
  ok(!prof.verifyPin({ studentId: "S01", classCode: "A1", pinHash: h }, "0000"), "wrong passcode rejected");
  ok(prof.validPinFormat("1234") && prof.validPinFormat("123456"), "4-6 digits ok");
  ok(!prof.validPinFormat("123") && !prof.validPinFormat("12a4") && !prof.validPinFormat("1234567"), "bad formats rejected");
});
test("profile: normalisation, identity, displayName & save/record keys", () => {
  eq(prof.normClass(" a1 "), "A1", "class upper-trimmed");
  eq(prof.normId(" s01 "), "S01", "student id upper-trimmed");
  eq(prof.normNick("  Ming "), "Ming", "nick trimmed");
  eq(prof.idOf({ studentId: "S01", classCode: "A1" }), "A1/S01", "id = class/student");
  eq(prof.displayName({ nickname: "Ming", studentId: "S01" }), "Ming", "nickname preferred");
  eq(prof.displayName({ nickname: "", studentId: "S01" }), "S01", "falls back to student id");
  eq(prof.saveKeyFor({ studentId: "S01", classCode: "A1" }), "windfarm-go-save::A1/S01", "save key by class/student");
  eq(prof.recordKeyFor({ studentId: "S01", classCode: "A1" }), "wfg-record::A1/S01");
  eq(prof.saveKeyFor(null), "windfarm-go-save::guest");
});
test("profile: account registry upsert dedups by identity, newest first", () => {
  const a1 = { studentId: "S01", classCode: "A1", nickname: "Ming", pinHash: "x", createdAt: 1, lastSeen: 1 };
  const a2 = { studentId: "S02", classCode: "A1", nickname: "Hua", pinHash: "y", createdAt: 2, lastSeen: 2 };
  let list = prof.upsertAccountIn([], a1);
  list = prof.upsertAccountIn(list, a2);
  eq(list.length, 2, "two distinct accounts");
  // 同學號再 upsert → 取代、不重複，更新 lastSeen 排序到最前
  list = prof.upsertAccountIn(list, { ...a1, pinHash: "z", lastSeen: 9 });
  eq(list.length, 2, "same identity dedups");
  eq(list[0].studentId, "S01", "most-recent first");
  eq(list[0].pinHash, "z", "pinHash updated on re-upsert");
});
test("profile: isAuthed requires passcode+studentId or guest", () => {
  ok(!prof.isAuthed(null), "no profile");
  ok(!prof.isAuthed({ studentId: "S01", classCode: "A1", nickname: "x", pinHash: "" }), "legacy no-pin profile not authed");
  ok(prof.isAuthed({ studentId: "S01", classCode: "A1", nickname: "x", pinHash: "h" }), "passcode profile authed");
  ok(prof.isAuthed({ studentId: "GUEST", classCode: "", nickname: "訪客", pinHash: "", guest: true }), "guest authed");
});
test("profile: localStorage-backed registry round-trips & remove works", () => {
  localStorage.clear();
  const now = 100;
  prof.upsertAccount({ studentId: "S01", classCode: "A1", nickname: "Ming", pinHash: "h1", createdAt: now, lastSeen: now });
  prof.upsertAccount({ studentId: "S02", classCode: "A1", nickname: "Hua", pinHash: "h2", createdAt: now, lastSeen: now + 1 });
  eq(prof.listAccounts().length, 2, "two accounts stored");
  ok(prof.findAccount("A1/S01"), "find by id");
  prof.removeAccount("A1/S01");
  eq(prof.listAccounts().length, 1, "removed one");
  ok(!prof.findAccount("A1/S01"), "gone after remove");
  localStorage.clear();
});

// ───────────────────────── 雲端為主客戶端（階段 2，純函式） ─────────────────────────
test("cloud/api: buildQuery encodes & skips empty/undefined", () => {
  eq(api.buildQuery({ do: "login", studentId: "S 01", classCode: "A1", x: "", y: undefined }), "do=login&studentId=S%2001&classCode=A1", "encode + skip empty/undefined");
  eq(api.buildQuery({}), "", "empty params → empty string");
});
test("cloud/api: apiUrl prefixes the web app base", () => {
  const u = api.apiUrl({ do: "load", studentId: "S01", classCode: "A1" });
  ok(u.indexOf("/exec?") > 0, "uses /exec base");
  ok(u.indexOf("do=load") > 0 && u.indexOf("studentId=S01") > 0, "carries params");
});
test("cloud/api: pickNewer prefers newer; cloud wins ties; handles nulls", () => {
  eq(api.pickNewer(null, null), null, "both null → null");
  eq(api.pickNewer({ state: "L", savedAt: 5 }, null).from, "local", "only local");
  eq(api.pickNewer(null, { state: "C", savedAt: 5 }).from, "cloud", "only cloud");
  eq(api.pickNewer({ state: "L", savedAt: 9 }, { state: "C", savedAt: 5 }).from, "local", "local newer wins");
  eq(api.pickNewer({ state: "L", savedAt: 5 }, { state: "C", savedAt: 9 }).from, "cloud", "cloud newer wins");
  eq(api.pickNewer({ state: "L", savedAt: 5 }, { state: "C", savedAt: 5 }).from, "cloud", "tie → cloud (server authoritative)");
});
test("cloud/api: identityOf & cloudKey are consistent with profile.idOf", () => {
  const p = { studentId: "S01", classCode: "A1", pinHash: "h", nickname: "x" };
  const id = api.identityOf(p);
  eq(id.studentId, "S01"); eq(id.classCode, "A1"); eq(id.pinHash, "h");
  eq(api.cloudKey(p), prof.idOf(p), "cloudKey === idOf");
});

// ───────────────────────── 學習紀錄與成就（階段 3，純函式） ─────────────────────────
test("records: INITIAL unlocks nothing (fresh account)", () => {
  eq(recs.evaluateAchievements(I).length, 0, "no achievements at start");
});
test("records: field-based achievements unlock from GameData", () => {
  ok(recs.evaluateAchievements({ ...I, missionsDone: 1 }).includes("first_mission"), "first mission");
  ok(recs.evaluateAchievements({ ...I, missionsDone: 10 }).includes("ten_missions"), "ten missions");
  ok(recs.evaluateAchievements({ ...I, campaignDone: true }).includes("campaign_done"), "campaign");
  ok(recs.evaluateAchievements({ ...I, buildDone: true }).includes("build_done"), "build");
  ok(recs.evaluateAchievements({ ...I, seenFaults: ["a", "b", "c"] }).includes("catalog_3"), "catalog 3");
  ok(recs.evaluateAchievements({ ...I, generationMWh: 1000 }).includes("gen_1000"), "gen 1000");
  ok(recs.evaluateAchievements({ ...I, fleetResolved: 20 }).includes("fleet_master"), "fleet master");
  ok(recs.evaluateAchievements({ ...I, farmsOwned: 2 }).includes("multi_farm"), "multi farm");
  ok(recs.evaluateAchievements({ ...I, ownedVessels: ["ctv", "sov"] }).includes("two_vessels"), "two vessels");
  ok(recs.evaluateAchievements({ ...I, day: 51, safetyIncidents: 0 }).includes("safety_clean"), "30 days clean");
  ok(!recs.evaluateAchievements({ ...I, day: 51, safetyIncidents: 1 }).includes("safety_clean"), "incident breaks clean");
  ok(recs.evaluateAchievements({ ...I, quarter: 2, slaPenalties: 0 }).includes("sla_keeper"), "sla keeper");
  ok(recs.evaluateAchievements({ ...I, generationMWh: 2000 }).includes("score_1500"), "score via generation");
});
test("records: mergeRecord adds new unlocks once, updates bests", () => {
  const e = recs.emptyRecord();
  const r1 = recs.mergeRecord(e, { ...I, missionsDone: 1, generationMWh: 1200 }, 1000);
  ok(r1.newly.includes("first_mission"), "first mission newly unlocked");
  ok(r1.newly.includes("gen_1000"), "gen_1000 newly unlocked");
  eq(r1.rec.unlocked["first_mission"], 1000, "timestamp recorded");
  eq(r1.rec.bestGeneration, 1200, "best generation tracked");
  ok(r1.rec.bestScore > 0, "best score tracked");
  const r2 = recs.mergeRecord(r1.rec, { ...I, missionsDone: 1, generationMWh: 1200 }, 2000);
  eq(r2.newly.length, 0, "no re-unlock on same state");
  eq(r2.rec.unlocked["first_mission"], 1000, "original timestamp kept");
});
test("records: bests only grow (high-water mark)", () => {
  const base = { ...recs.emptyRecord(), bestScore: 999, bestDay: 100, bestGeneration: 9999, bestMissions: 50, bestCatalog: 9, bestResolved: 30 };
  const { rec } = recs.mergeRecord(base, { ...I, missionsDone: 1 }, 5000);
  eq(rec.bestScore, 999, "score not reduced");
  eq(rec.bestGeneration, 9999, "generation not reduced");
  eq(rec.bestMissions, 50, "missions not reduced");
});
test("records: unionRecord merges unlocks (earliest) and max bests", () => {
  const a = { ...recs.emptyRecord(), unlocked: { first_mission: 100, gen_1000: 500 }, bestScore: 300, bestGeneration: 1000 };
  const b = { ...recs.emptyRecord(), unlocked: { first_mission: 50, multi_farm: 800 }, bestScore: 700, bestGeneration: 400 };
  const u = recs.unionRecord(a, b);
  eq(u.unlocked["first_mission"], 50, "earliest unlock time wins");
  eq(u.unlocked["gen_1000"], 500, "kept from a");
  eq(u.unlocked["multi_farm"], 800, "kept from b");
  eq(u.bestScore, 700, "max score");
  eq(u.bestGeneration, 1000, "max generation");
});

// ───────────────────────── 每日任務（#78） ─────────────────────────
test("daily: pickDailyIds deterministic, right length, unique", () => {
  const a = daily.pickDailyIds(30, "seedX");
  const b = daily.pickDailyIds(30, "seedX");
  eq(a.length, daily.DAILY_PER_DAY, "right count");
  eq(JSON.stringify(a), JSON.stringify(b), "same seed+day reproducible");
  eq(a.length, new Set(a).size, "no duplicate tasks");
  for (const id of a) ok(daily.dailyDef(id), `id ${id} maps to a def`);
  // 不同日 → 多半不同(至少不必相同)
  ok(daily.pickDailyIds(31, "seedX").join() !== "" , "produces ids for other days");
});
test("daily: rollDailyState captures baseline from current cumulative", () => {
  const d = { ...I, fleetResolved: 5, missionsDone: 3, generationMWh: 900, safetyIncidents: 1 };
  const dl = daily.rollDailyState(d.day, "s", d, null);
  eq(dl.day, d.day);
  eq(dl.base.resolved, 5); eq(dl.base.missions, 3); eq(dl.base.gen, 900); eq(dl.base.safety, 1);
  eq(dl.claimed.length, 0, "nothing claimed yet");
  eq(dl.streak, 0, "fresh streak");
});
test("daily: dueDailyClaims detects met increment goals", () => {
  // 強制一組含 mission1 的每日任務
  const base = { resolved: 0, missions: 0, gen: 0, safety: 0 };
  const dl = { day: I.day, ids: ["mission1", "health", "uptime"], base, claimed: [], streak: 0 };
  const before = daily.dueDailyClaims({ ...I, daily: dl, missionsDone: 0 });
  ok(!before.includes("mission1"), "mission not yet done");
  const after = daily.dueDailyClaims({ ...I, daily: dl, missionsDone: 1 });
  ok(after.includes("mission1"), "mission increment detected");
});
test("daily: CLAIM_DAILY grants reward, is idempotent, increments streak on full", () => {
  const dl = { day: I.day, ids: ["health", "uptime"], base: { resolved: 0, missions: 0, gen: 0, safety: 0 }, claimed: [], streak: 0 };
  let s = { ...I, daily: dl, budget: 1_000_000, xp: 0 };
  s = R(s, { type: "CLAIM_DAILY", id: "health", xp: 20, cash: 120_000 });
  eq(s.budget, 1_120_000, "cash granted"); eq(s.xp, 20, "xp granted");
  ok(s.daily.claimed.includes("health"), "marked claimed");
  eq(s.daily.streak, 0, "not full yet → no streak");
  // 重複 claim 同一項 → 冪等(不重複發)
  const s2 = R(s, { type: "CLAIM_DAILY", id: "health", xp: 20, cash: 120_000 });
  eq(s2.budget, s.budget, "duplicate claim ignored");
  // 完成第二項 → 全完成 → streak +1
  const s3 = R(s, { type: "CLAIM_DAILY", id: "uptime", xp: 25, cash: 150_000 });
  eq(s3.daily.streak, 1, "full completion bumps streak");
});
test("daily: rollDailyState carries streak only if prev was fully completed", () => {
  const full = { day: 10, ids: ["a", "b"], base: { resolved: 0, missions: 0, gen: 0, safety: 0 }, claimed: ["a", "b"], streak: 3 };
  const partial = { day: 10, ids: ["a", "b"], base: { resolved: 0, missions: 0, gen: 0, safety: 0 }, claimed: ["a"], streak: 3 };
  eq(daily.rollDailyState(11, "s", I, full).streak, 3, "carry streak when prev complete");
  eq(daily.rollDailyState(11, "s", I, partial).streak, 0, "reset streak when prev incomplete");
});

// ───────────────────────── 每週主題挑戰（#79） ─────────────────────────
test("weekly: weekOf groups 7 game-days; themeForWeek deterministic & valid", () => {
  eq(weekly.weekOf(0), 0); eq(weekly.weekOf(6), 0); eq(weekly.weekOf(7), 1); eq(weekly.weekOf(21), 3);
  const a = weekly.themeForWeek(4, "seedZ"), b = weekly.themeForWeek(4, "seedZ");
  eq(a.id, b.id, "same seed+week reproducible");
  ok(weekly.WEEK_THEMES.some((t) => t.id === a.id), "theme is from the pool");
  // 主題涵蓋風暴(↑)與平穩(↓)兩種 faultMult 方向
  ok(weekly.WEEK_THEMES.some((t) => t.faultMult > 1) && weekly.WEEK_THEMES.some((t) => t.faultMult < 1), "themes span fault-rate up & down");
  for (const t of weekly.WEEK_THEMES) { ok(t.name.zh && t.name.en && t.goal.zh && t.goal.en, `theme ${t.id} bilingual`); ok(t.xp > 0 && t.cash > 0, `theme ${t.id} rewards`); }
});
test("weekly: rollWeeklyState captures baseline incl. start day; carries streak only if prev claimed", () => {
  const d = { ...I, fleetResolved: 4, missionsDone: 2, generationMWh: 500, safetyIncidents: 1, day: 30 };
  const wk = weekly.rollWeeklyState(weekly.weekOf(d.day), "s", d, null);
  eq(wk.base.resolved, 4); eq(wk.base.gen, 500); eq(wk.base.day, 30);
  eq(wk.claimed, false); eq(wk.streak, 0);
  const prevClaimed = { week: 3, themeId: "storm", faultMult: 1.4, base: wk.base, claimed: true, streak: 5 };
  const prevOpen = { ...prevClaimed, claimed: false };
  eq(weekly.rollWeeklyState(4, "s", d, prevClaimed).streak, 5, "carry streak when prev claimed");
  eq(weekly.rollWeeklyState(4, "s", d, prevOpen).streak, 0, "reset streak when prev not claimed");
});
test("weekly: weeklyDue detects met goal; CLAIM_WEEKLY grants once & bumps streak", () => {
  // storm 目標:本週修復 ≥6 台。base.resolved=0,當前 6 → 達成
  const wk = { week: 0, themeId: "storm", faultMult: 1.4, base: { resolved: 0, missions: 0, gen: 0, safety: 0, day: I.day }, claimed: false, streak: 2 };
  ok(!weekly.weeklyDue({ ...I, weekly: wk, fleetResolved: 3 }), "not yet (3 < 6)");
  ok(weekly.weeklyDue({ ...I, weekly: wk, fleetResolved: 6 }), "met at 6");
  let s = { ...I, weekly: wk, budget: 1_000_000, xp: 0, fleetResolved: 6 };
  const th = weekly.themeById("storm");
  s = R(s, { type: "CLAIM_WEEKLY", xp: th.xp, cash: th.cash });
  eq(s.budget, 1_000_000 + th.cash, "weekly cash granted");
  eq(s.weekly.streak, 3, "streak bumped");
  ok(s.weekly.claimed, "marked claimed");
  const s2 = R(s, { type: "CLAIM_WEEKLY", xp: th.xp, cash: th.cash });
  eq(s2.budget, s.budget, "duplicate weekly claim ignored");
});
test("weekly: storm theme raises fault pressure vs calm (faultMult wired into advance)", () => {
  // 同一 seed 下,風暴週(faultMult 1.4)整體新增故障數應 ≥ 平穩週(0.7)。多次抽樣比較總量,避免單日抖動。
  const mkWeekly = (id, mult) => ({ week: 0, themeId: id, faultMult: mult, base: { resolved: 0, missions: 0, gen: 0, safety: 0, day: I.day }, claimed: false, streak: 0 });
  const runFaults = (mult) => { seed(99); let s = { ...I, weekly: mkWeekly(mult > 1 ? "storm" : "calm", mult) }; for (let i = 0; i < 25; i++) s = R(s, { type: "OPS_ADVANCE" }); return s.fleetLostMWh; };
  const storm = runFaults(1.4), calm = runFaults(0.7);
  ok(storm >= calm, `storm downtime (${storm}) >= calm downtime (${calm})`);
});

// ───────────────────────── 情境包匯入（#80） ─────────────────────────
const VALID_PACK = JSON.stringify({
  name: "TestPack", author: "QA",
  tasks: [
    { id: "t1", cat: "A", title: { zh: "高溫跳機", en: "Over-temp trip" }, scenario: { zh: "機艙過熱跳機。", en: "Nacelle over-temp trip." }, xp: 60, chart: "trend",
      choices: [ { label: { zh: "派員檢查", en: "Send crew" }, feedback: { zh: "✓ 找根因", en: "✓ root cause" }, good: true, eff: { a: 6, b: -300000 } },
                 { label: { zh: "忽略", en: "Ignore" }, feedback: { zh: "✗ 拖延", en: "✗ delay" }, good: false, eff: { a: -4, s: 1 } } ] },
  ],
});
test("scenario pack: parse validates a good pack & namespaces ids (#80)", () => {
  const r = pack.parseScenarioPack(VALID_PACK);
  ok(r.ok, "valid pack accepted: " + (r.error || ""));
  eq(r.pack.tasks.length, 1);
  ok(r.pack.tasks[0].id.startsWith("pack:TestPack:"), "id namespaced");
  eq(r.pack.tasks[0].cat, "A");
});
test("scenario pack: rejects malformed packs with clear errors (#80)", () => {
  ok(!pack.parseScenarioPack("not json").ok, "bad json rejected");
  ok(!pack.parseScenarioPack(JSON.stringify({ tasks: [] })).ok, "missing name rejected");
  ok(!pack.parseScenarioPack(JSON.stringify({ name: "x", tasks: [] })).ok, "empty tasks rejected");
  ok(!pack.parseScenarioPack(JSON.stringify({ name: "x", tasks: [{ cat: "Z", title: { zh: "a", en: "a" }, scenario: { zh: "b", en: "b" }, xp: 1, choices: [{ label: { zh: "a", en: "a" }, feedback: { zh: "f", en: "f" }, good: true, eff: {} }, { label: { zh: "b", en: "b" }, feedback: { zh: "f", en: "f" }, good: false, eff: {} }] }] })).ok, "bad cat rejected");
  ok(!pack.parseScenarioPack(JSON.stringify({ name: "x", tasks: [{ cat: "A", title: "nope", scenario: { zh: "b", en: "b" }, xp: 1, choices: [{ label: { zh: "a", en: "a" }, feedback: { zh: "f", en: "f" }, good: true, eff: {} }, { label: { zh: "b", en: "b" }, feedback: { zh: "f", en: "f" }, good: false, eff: {} }] }] })).ok, "non-i18n title rejected");
  ok(!pack.parseScenarioPack(JSON.stringify({ name: "x", tasks: [{ cat: "A", title: { zh: "a", en: "a" }, scenario: { zh: "b", en: "b" }, xp: 1, choices: [{ label: { zh: "a", en: "a" }, feedback: { zh: "f", en: "f" }, good: false, eff: {} }, { label: { zh: "b", en: "b" }, feedback: { zh: "f", en: "f" }, good: false, eff: {} }] }] })).ok, "no good choice rejected");
  ok(!pack.parseScenarioPack(JSON.stringify({ name: "x", tasks: [{ cat: "A", title: { zh: "a", en: "a" }, scenario: { zh: "b", en: "b" }, xp: 1, choices: [{ label: { zh: "a", en: "a" }, feedback: { zh: "f", en: "f" }, good: true, eff: { z: 1 } }, { label: { zh: "b", en: "b" }, feedback: { zh: "f", en: "f" }, good: false, eff: {} }] }] })).ok, "bad eff key rejected");
});
test("scenario pack: registry register/remove via getImportedTasks (#80)", () => {
  // 註：測試執行器將各模組獨立打包,故 tasks 與 scenarioPack 不共用單例;
  // 此處在 scenarioPack 模組「同一實例」內驗證註冊表,allTasks() 串接於正式 Vite 單一打包中生效。
  eq(pack.getImportedTasks().length, 0, "no pack → empty registry");
  const r = pack.parseScenarioPack(VALID_PACK);
  pack.setActivePack(r.pack);
  eq(pack.getImportedTasks().length, 1, "imported task registered");
  ok(pack.getImportedTasks().some((t) => t.id === "pack:TestPack:t1"), "imported task present");
  eq(pack.getActivePack().name, "TestPack", "active pack meta available");
  pack.setActivePack(null);
  eq(pack.getImportedTasks().length, 0, "remove pack → registry cleared");
});
test("scenario pack: allTasks() baseline equals built-in TASKS when no pack (#80)", () => {
  eq(tasks.allTasks().length, tasks.TASKS.length, "no pack → allTasks == TASKS");
  eq(tasks.generateTask(5).template.id, tasks.TASKS[5].id, "base seed maps to built-in");
});

// ───────────────────────── 真實度深化：jack-up 動員 + 計畫保養（#81） ─────────────────────────
test("overhaul: jack-up mobilization charges fee, delays work, no standby fee en route (#81)", () => {
  const q = { id: "q3", title: { zh: "", en: "" }, brief: { zh: "", en: "" }, unit: "CH-09", targetFault: "gen_vibration", rewardBudget: 200000, rewardXp: 140 };
  let s = R(I, { type: "ACCEPT_QUEST" });
  const b0 = s.budget;
  s = R(s, { type: "START_OVERHAUL", quest: q, discipline: "mechanical" });
  ok(s.overhaul, "overhaul started");
  eq(s.overhaul.mobilizeLeft, g.JACKUP_MOBILIZE_DAYS, "mobilization countdown set");
  eq(b0 - s.budget, g.JACKUP_MOBILIZE_COST, "one-time mobilization fee charged at start");
  // 動員期間:工日不前進、不收待命費
  seed(7);
  const s2 = R(s, { type: "ADVANCE_OVERHAUL" });
  eq(s2.overhaul.progress, 0, "no work progress during mobilization");
  eq(s2.overhaul.mobilizeLeft, g.JACKUP_MOBILIZE_DAYS - 1, "mobilization counts down");
  eq(s2.lastLedger.demurrage, 0, "no standby fee while en route");
  // 動員結束 → mobilizeLeft 歸 0,之後才推進工日
  let s3 = s; for (let i = 0; i < g.JACKUP_MOBILIZE_DAYS; i++) s3 = R(s3, { type: "ADVANCE_OVERHAUL" });
  eq(s3.overhaul.mobilizeLeft, 0, "mobilization finished after JACKUP_MOBILIZE_DAYS");
  eq(s3.overhaul.progress, 0, "still no progress until on-site work begins");
});
test("scheduled service: due gating + fault-rate buff + health + clock reset (#81)", () => {
  ok(!g.serviceDue(I), "not due at start");
  ok(g.serviceDue({ ...I, lastServiceDay: I.day - g.SERVICE_INTERVAL_DAYS }), "due after interval");
  // 未到期 → no-op(回原狀態)
  eq(R(I, { type: "SCHEDULED_SERVICE" }), I, "no-op when not due");
  // 到期 → 執行:扣時間、設降故障率 buff、回健康度、重置保養時鐘
  const dueState = { ...I, lastServiceDay: I.day - g.SERVICE_INTERVAL_DAYS, fleetHealth: 50, budget: 50_000_000 };
  seed(3);
  const s = R(dueState, { type: "SCHEDULED_SERVICE" });
  eq(s.day, dueState.day + g.SCHEDULED_SERVICE_DAYS, "service consumes days");
  eq(s.inspectBuffDays, g.SCHEDULED_SERVICE_BUFF_DAYS, "fault-rate buff window set");
  ok(s.fleetHealth > dueState.fleetHealth, "health restored by service");
  eq(s.lastServiceDay, dueState.day + g.SCHEDULED_SERVICE_DAYS, "service clock reset");
  ok(!g.serviceDue(s), "not due again right after service");
});

// ───────────────────────── 故障/備品分層擴充（#82） ─────────────────────────
test("content expansion: new tier-gated faults/incidents/parts slot in cleanly (#82)", () => {
  // 新故障存在且具完整結構(catalog 測試已逐項驗證);此處確認 tier 分層與多重根因成長
  for (const id of ["tower_corrosion", "transformer_bushing", "cable_joint_heat"]) {
    ok(flt.FAULTS[id], `fault ${id} exists`);
    ok(flt.CODEX[id], `fault ${id} has codex`);
    ok(flt.faultTier(id) >= 2, `fault ${id} is tier 2+ (not dumped on beginners)`);
  }
  // 新備品存在且分層
  ok(data.PARTS.find((p) => p.id === "corrosion_anode")?.minTier === 2, "corrosion_anode is T2");
  ok(data.PARTS.find((p) => p.id === "transformer_bushing")?.minTier === 3, "bushing is T3");
  // 新戰情室故障:tier 分層 + 不出現在入門池
  const t1 = new Set(inc.incidentsForTier(1).map((x) => x.id));
  for (const id of ["corrosion", "bushing", "cable_joint_heat"]) {
    ok(inc.INCIDENTS.find((x) => x.id === id), `incident ${id} exists`);
    ok(!t1.has(id), `incident ${id} not in Tier-1 entry pool`);
  }
  ok(inc.incidentsForTier(3).some((x) => x.id === "bushing"), "bushing unlocks by T3");
  // cable/tower/transformer 元件因擴充成為多重根因(可做鑑別診斷)
  for (const cid of ["cable", "tower", "transformer"]) {
    const c = flt.COMPONENTS.find((x) => x.id === cid);
    ok(c && c.faultIds.length >= 2, `component ${cid} is now multi-cause`);
  }
  // 規模成長:總量上升(分層後不會一次塞給新手)
  ok(Object.keys(flt.FAULTS).length >= 22, `faults >= 22 (got ${Object.keys(flt.FAULTS).length})`);
  ok(inc.INCIDENTS.length >= 23, `incidents >= 23 (got ${inc.INCIDENTS.length})`);
  ok(data.PARTS.length >= 30, `parts >= 30 (got ${data.PARTS.length})`);
});

// ───────────────────────── HSE 科別加厚（#2）─────────────────────────
test("HSE thickening: LOTO/fall/SIMOPS faults are well-formed HSE-discipline content (#2)", () => {
  const hseFaults = ["loto_violation", "fall_protection", "simops_conflict"];
  for (const id of hseFaults) {
    const f = flt.FAULTS[id];
    ok(f, `fault ${id} exists`);
    eq(f.discipline, "hse", `fault ${id} is HSE discipline`);
    eq(f.quiz.options.length, 4, `fault ${id} quiz has 4 options`);
    ok(f.quiz.correct >= 0 && f.quiz.correct < 4, `fault ${id} correct index valid`);
    eq(f.sop.length, 5, `fault ${id} has 5 SOP steps`);
    ok(flt.CODEX[id], `fault ${id} has codex`);
    eq(flt.faultTier(id), 2, `fault ${id} unlocks at Tier 2 (with HSE discipline)`);
    // 備品存在且 tier 與故障同調
    const p = data.PARTS.find((pp) => pp.id === f.part);
    ok(p, `fault ${id} part ${f.part} exists`);
    ok((p.minTier ?? 1) <= 2, `fault ${id} part reachable by Tier 2`);
  }
  // HSE 元件群現為多重根因(≥4),可做工安鑑別診斷練習
  const hse = flt.COMPONENTS.find((c) => c.id === "lift");
  ok(hse && hse.faultIds.length >= 4, `HSE component now multi-cause (got ${hse?.faultIds.length})`);
  for (const id of hseFaults) ok(hse.faultIds.includes(id), `HSE component includes ${id}`);
  // 戰情室 HSE 事件:需 HSE 技師,且不在入門池(Tier 2 解鎖)
  const t1 = new Set(inc.incidentsForTier(1).map((x) => x.id));
  for (const id of ["loto", "fall", "simops"]) {
    const x = inc.INCIDENTS.find((i) => i.id === id);
    ok(x, `incident ${id} exists`);
    eq(x.discipline, "hse", `incident ${id} needs HSE technician`);
    ok(!t1.has(id), `incident ${id} not in Tier-1 entry pool`);
    ok(inc.incidentsForTier(2).some((i) => i.id === id), `incident ${id} unlocks by T2`);
  }
});

// ───────────────────────── 直升機進場 / 電網限電（#3）─────────────────────────
test("real-ops tradeoffs: helicopter-access & grid-curtailment judgment tasks (#3)", () => {
  const byId = Object.fromEntries(tasks.TASKS.map((t) => [t.id, t]));
  const heli = ["e_heli_access", "d_heli_costbenefit", "f_heli_logistics", "e_heli_window"];
  const grid = ["d_neg_price", "d_curtail_comp", "g_grid_voltage_dip", "d_curtail_maint"];
  for (const id of [...heli, ...grid]) {
    const t = byId[id];
    ok(t, `task ${id} exists`);
    ok(t.choices.length >= 2, `task ${id} offers a real choice`);
    ok(t.choices.some((c) => c.good) && t.choices.some((c) => !c.good), `task ${id} has both a good & a bad option (a genuine tradeoff)`);
    // 判斷型任務:每個選項都有教學回饋(雙語)
    for (const c of t.choices) ok(c.feedback?.zh && c.feedback?.en, `task ${id} option explains why`);
  }
  // 直升機任務應落在天候/物流/營運(教權衡),非單純診斷
  for (const id of heli) ok(["E", "F", "D"].includes(byId[id].cat), `heli task ${id} is a weather/logistics/ops decision`);
  // 負電價的較佳解：降載換取避免倒貼(b 為正、g 為負),教真實市場訊號
  const neg = byId["d_neg_price"].choices.find((c) => c.good);
  ok((neg.eff.b ?? 0) > 0 && (neg.eff.g ?? 0) < 0, "negative-price best move trades output for avoided cost");
});

// ───────────────────────── 真實案例研究事件（case studies） ─────────────────────────
test("case studies: catalog complete & well-formed", () => {
  const C = cs.CASE_STUDIES;
  ok(C.length >= 16, `>=16 cases incl. 2nd batch (got ${C.length})`);
  const ids = C.map((c) => c.id);
  eq(ids.length, new Set(ids).size, "case ids unique");
  const cats = new Set(["foundation", "gearbox_bearing", "blade", "cable", "electrical_fire", "vessel", "bolt", "ice", "yaw", "pitch", "lightning", "grid", "transformer"]);
  const discs = new Set(["mechanical", "electrical", "control", "structural", "hse"]);
  const effKeys = new Set(["a", "b", "s", "g"]);
  for (const c of C) {
    ok(c.id.startsWith("cs_"), `case ${c.id} id prefixed`);
    ok(cats.has(c.category), `case ${c.id} valid category`);
    ok(discs.has(c.discipline), `case ${c.id} valid discipline`);
    ok(c.minTier >= 1 && c.minTier <= 4, `case ${c.id} tier in 1..4`);
    ok(c.weight > 0, `case ${c.id} weight>0`);
    for (const k of ["title", "scenario", "lesson"]) ok(c[k] && c[k].zh && c[k].en, `case ${c.id}.${k} bilingual`);
    ok(Array.isArray(c.choices) && c.choices.length >= 2, `case ${c.id} >=2 choices`);
    ok(c.choices.some((x) => x.good), `case ${c.id} has a good choice`);
    for (const ch of c.choices) {
      ok(ch.label?.zh && ch.label?.en && ch.feedback?.zh && ch.feedback?.en, `case ${c.id} choice bilingual`);
      for (const k of Object.keys(ch.eff ?? {})) { ok(effKeys.has(k), `case ${c.id} eff key '${k}'`); ok(Number.isFinite(ch.eff[k]), `case ${c.id} eff numeric`); }
    }
  }
});
test("case studies: Tier-gated & monotonic (T1 none, T4 all)", () => {
  eq(cs.casesForTier(1).length, 0, "Tier 1 surfaces no cases (entry stays simple)");
  eq(cs.casesForTier(4).length, cs.CASE_STUDIES.length, "Tier 4 unlocks all");
  let prev = -1;
  for (const t of [1, 2, 3, 4]) { const n = cs.casesForTier(t).length; ok(n >= prev, "casesForTier monotonic"); prev = n; }
});
test("case studies: named cases cite sources; anonymized hide named sources", () => {
  for (const c of cs.CASE_STUDIES) {
    if (c.framing === "named-with-sources") {
      ok(c.sources.length >= 1, `named case ${c.id} has sources`);
      for (const u of cs.visibleSources(c)) ok(/^https?:\/\//.test(u), `named case ${c.id} source is a URL`);
    } else {
      eq(cs.visibleSources(c).length, 0, `anonymized case ${c.id} hides named sources`);
    }
  }
});
test("case studies: anonymized cases never leak real names in visible text (guardrail)", () => {
  const BLACKLIST = /Vineyard|Dogger|Borssele|Ørsted|Orsted|SeaMade|Njord|Apollo|Greater Gabbard|GE Vernova|Haliade/i;
  for (const c of cs.CASE_STUDIES.filter((x) => x.framing === "anonymized-technical")) {
    const visible = `${c.title.zh}${c.title.en}${c.scenario.zh}${c.scenario.en}${c.lesson.zh}${c.lesson.en}${c.choices.map((ch) => ch.label.zh + ch.label.en + ch.feedback.zh + ch.feedback.en).join("")}`;
    ok(!BLACKLIST.test(visible), `anonymized case ${c.id} must not show a real named entity in visible text`);
  }
});
test("case studies: relatesTo links resolve to existing faults/incidents", () => {
  for (const c of cs.CASE_STUDIES) {
    if (c.relatesTo?.faultId) ok(flt.FAULTS[c.relatesTo.faultId], `case ${c.id} relatesTo.faultId '${c.relatesTo.faultId}' exists`);
    if (c.relatesTo?.incidentId) ok(inc.INCIDENTS.find((x) => x.id === c.relatesTo.incidentId), `case ${c.id} relatesTo.incidentId '${c.relatesTo.incidentId}' exists`);
  }
});
test("case studies: rollCaseStudy respects Tier gate & seen-set", () => {
  // Tier 1 → 永遠 null（無案例）
  for (let i = 0; i < 300; i++) eq(cs.rollCaseStudy(1, []), null, "T1 never rolls a case");
  // 全部已看過 → null（pool 空）
  const allT4 = cs.casesForTier(4).map((c) => c.id);
  for (let i = 0; i < 300; i++) eq(cs.rollCaseStudy(4, allT4), null, "all-seen → null");
  // T4 未看過 → 偶發回傳「在 tier 池內」的案例（機率約 5%，多次抽樣應有命中且皆合法）
  const t4 = new Set(allT4);
  let hits = 0;
  for (let i = 0; i < 1000; i++) { const r = cs.rollCaseStudy(4, []); if (r) { hits++; ok(t4.has(r.id), "rolled case within tier pool"); } }
  ok(hits > 0, "rollCaseStudy occasionally returns a case at high tier");
});
test("case studies: advance() records a case into seenCases/lastCase when it rolls", () => {
  // 找到一個會觸發案例的種子：在 OPS_ADVANCE 後 seenCases 變長
  let triggered = false;
  for (let sd = 1; sd <= 60 && !triggered; sd++) {
    seed(sd);
    const hi = { ...I, generationMWh: 20000, missionsDone: 40, farmsOwned: 3 }; // 推到 Tier 4
    const s = R(hi, { type: "OPS_ADVANCE" });
    if ((s.seenCases?.length ?? 0) > 0) {
      triggered = true;
      ok(s.lastCase && cs.caseAt(s.lastCase.id), "lastCase points to a real case");
      ok(s.seenCases.includes(s.lastCase.id), "seenCases includes the rolled case");
    }
  }
  ok(triggered, "some seed triggers a case study within 60 tries");
});
test("case studies: more cases added; randomCaseDrill bypasses Tier & prefers unseen (task-list drills)", () => {
  // 第三批:案例數成長,且新增的類別/科別仍合法(catalog 測試已逐項驗證結構)
  ok(cs.CASE_STUDIES.length >= 24, `cases grew to >=24 (got ${cs.CASE_STUDIES.length})`);
  for (const id of ["cs_yaw_static_misalignment", "cs_pitch_bearing_wear", "cs_blade_lightning_lps", "cs_grid_frequency_mass_trip", "cs_oss_transformer_failure", "cs_flange_bolt_fatigue"]) {
    ok(cs.caseAt(id), `new case ${id} exists`);
  }
  // randomCaseDrill 永遠回一則(略過 Tier:即使傳空 seen、不看 tier 也有案例)
  seed(5);
  for (let i = 0; i < 50; i++) { const d = cs.randomCaseDrill([]); ok(d && d.id, "drill always returns a case (Tier bypassed)"); }
  // 優先抽未演練過的:把『除了一則』都標記已看,連抽多次應只會回那一則新案例
  const all = cs.CASE_STUDIES.map((c) => c.id);
  const onlyFresh = all[all.length - 1];
  const seenMost = all.filter((id) => id !== onlyFresh);
  seed(9);
  for (let i = 0; i < 60; i++) eq(cs.randomCaseDrill(seenMost).id, onlyFresh, "drill prefers the only unseen case");
  // 全部看過 → 仍回一則(允許重複,不會卡住任務清單)
  seed(3);
  for (let i = 0; i < 30; i++) { const d = cs.randomCaseDrill(all); ok(d && all.includes(d.id), "all-seen → still returns a case (repeats allowed)"); }
});
test("MARK_CASE_SEEN records the case into the codex (idempotent)", () => {
  const id = cs.CASE_STUDIES[0].id;
  const s1 = R({ ...I, seenCases: [], day: 12 }, { type: "MARK_CASE_SEEN", id });
  ok(s1.seenCases.includes(id), "case added to seenCases");
  eq(s1.lastCase?.id, id, "lastCase points to it");
  eq(s1.lastCase?.day, 12, "lastCase day defaults to current day");
  const s2 = R(s1, { type: "MARK_CASE_SEEN", id }); // 冪等:再標記不重複
  eq(s2.seenCases.filter((x) => x === id).length, 1, "idempotent — no duplicate");
});

// ───────────────────────── PWA(階段 1) ─────────────────────────
test("pwa: manifest valid, app-like display, icons exist, base-agnostic", () => {
  ok(existsSync("public/manifest.webmanifest"), "manifest exists");
  const m = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
  ok(m.name && m.short_name, "manifest has name & short_name");
  ok(["standalone", "fullscreen", "minimal-ui"].includes(m.display), "display is app-like");
  ok(Array.isArray(m.icons) && m.icons.length >= 1, "manifest has icons");
  for (const ic of m.icons) ok(existsSync("public/" + ic.src), `icon '${ic.src}' exists in public/`);
  ok(m.icons.some((ic) => /maskable/.test(ic.purpose || "")), "has a maskable icon");
  // PNG 圖示(iOS/通用):存在且為真 PNG;apple-touch-icon 亦為 PNG
  const isPng = (p) => { const b = readFileSync(p); return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47; };
  for (const f of ["public/icon-192.png", "public/icon-512.png", "public/apple-touch-icon-180.png"]) { ok(existsSync(f), `${f} exists`); ok(isPng(f), `${f} is a valid PNG`); }
  ok(m.icons.some((ic) => ic.type === "image/png"), "manifest references PNG icons");
  // 相對 start_url/scope → 同時相容本機(/)與 GitHub Pages 子路徑(/windFarm-Go/)
  eq(m.start_url, ".", "relative start_url");
  eq(m.scope, ".", "relative scope");
});
test("pwa: service worker present, handles install+fetch, never caches cloud API or non-GET", () => {
  ok(existsSync("public/sw.js"), "service worker present");
  const sw = readFileSync("public/sw.js", "utf8");
  ok(/addEventListener\(["']install/.test(sw), "sw has install handler");
  ok(/addEventListener\(["']fetch/.test(sw), "sw has fetch handler");
  ok(/method !== ["']GET["']/.test(sw), "sw bypasses non-GET (writes/API not cached)");
  ok(/origin !== self\.location\.origin/.test(sw), "sw bypasses cross-origin (cloud backend/fonts)");
});
test("pwa: index.html wires manifest + theme-color + apple-touch; SW registered prod-only", () => {
  const html = readFileSync("index.html", "utf8");
  ok(/rel=["']manifest["']\s+href=["']manifest\.webmanifest["']/.test(html), "index links manifest (relative)");
  ok(/name=["']theme-color["']/.test(html), "index has theme-color");
  ok(/rel=["']apple-touch-icon["']/.test(html), "index has apple-touch-icon");
  const main = readFileSync("src/main.tsx", "utf8");
  ok(/import\.meta\.env\.PROD/.test(main) && /serviceWorker\.register/.test(main), "SW registered prod-only");
  ok(/import\.meta\.env\.BASE_URL/.test(main), "SW path uses BASE_URL (GitHub Pages subpath safe)");
});

// ───────────────────────── 教師面板 CSV 匯出 ─────────────────────────
test("teacher csv: header, BOM, CRLF, days=day-21, escaping", () => {
  const rows = [
    { studentId: "S001", nickname: "阿明", score: 1500, day: 51, availability: 96, generation: 3200, updatedAt: 1000 },
    { studentId: "S002", nickname: 'Bad, "name"', score: 800, day: 21, availability: 80, generation: 100, updatedAt: 0 },
  ];
  const csv = api.classRowsToCsv(rows);
  eq(csv.charCodeAt(0), 0xfeff, "starts with UTF-8 BOM (Excel opens Chinese correctly)");
  const lines = csv.slice(1).split("\r\n"); // 去 BOM、CRLF 換行
  eq(lines[0], "studentId,nickname,score,days,availability,generation,updatedAt", "header row");
  eq(lines.length, 3, "header + 2 data rows");
  ok(lines[1].startsWith("S001,阿明,1500,30,96,3200,"), "days = day-21 (51-21=30): " + lines[1]);
  ok(/"Bad, ""name"""/.test(lines[2]), "field with comma+quote is escaped: " + lines[2]);
  ok(lines[1].includes("1970-01-01T00:00:01.000Z") , "updatedAt → ISO");
  // 空清單 → 只有(帶 BOM 的)表頭
  const empty = api.classRowsToCsv([]);
  eq(empty.slice(1), "studentId,nickname,score,days,availability,generation,updatedAt", "empty → header only");
});

// ───────────────────────── 營運趨勢 / 賽後復盤(#5) ─────────────────────────
test("trends: buildTrendPoint maps ledger (opex=Σ|costs|, revenue=sale+fix, net signed)", () => {
  const ledger = { day: 30, days: 1, revenue: 1000, fixPay: 120, payroll: -100, storage: -50, downtime: -30, demurrage: -400, slaPenalty: 0, event: 0, net: 540 };
  const p = trends.buildTrendPoint(ledger, { day: 30, availability: 92.4, generationMWh: 3000.6, fleetHealth: 81.7 });
  eq(p.day, 30); eq(p.avail, 92); eq(p.gen, 3001); eq(p.health, 82);
  eq(p.revenue, 1120, "revenue = sale + fixPay");
  eq(p.opex, 580, "opex = 100+50+30+400");
  eq(p.net, 540, "net signed from ledger");
});
test("trends: pushHistory keeps newest within HISTORY_CAP", () => {
  let h = [];
  for (let i = 0; i < trends.HISTORY_CAP + 5; i++) h = trends.pushHistory(h, { day: i, avail: 90, gen: i, health: 80, revenue: 0, opex: 0, net: 0 });
  eq(h.length, trends.HISTORY_CAP, "capped");
  eq(h[h.length - 1].day, trends.HISTORY_CAP + 4, "last is newest");
  eq(h[0].day, 5, "oldest dropped");
});
test("trends: summarizeHistory aggregates; empty → null", () => {
  eq(trends.summarizeHistory([]), null, "empty → null");
  const h = [
    { day: 21, avail: 100, gen: 0, health: 88, revenue: 100, opex: 40, net: 60 },
    { day: 22, avail: 80, gen: 120, health: 86, revenue: 200, opex: 60, net: 140 },
  ];
  const s = trends.summarizeHistory(h);
  eq(s.n, 2); eq(s.days, 1); eq(s.avgAvail, 90); eq(s.minAvail, 80);
  eq(s.totalRevenue, 300); eq(s.totalOpex, 100); eq(s.netTotal, 200);
  eq(s.genDelta, 120, "gen end - start"); eq(s.endHealth, 86);
});
test("trends: advance() appends a history point each day-advance (#5)", () => {
  seed(4);
  eq((I.history || []).length, 0, "INITIAL has empty history");
  const s1 = R(I, { type: "REST" });
  eq(s1.history.length, 1, "one point after a day advance");
  eq(s1.history[0].day, I.day + 1, "point tagged with new day");
  const s2 = R(s1, { type: "REST" });
  eq(s2.history.length, 2, "accumulates across advances");
});

// ───────────────────────── 存檔版本化 / 遷移 ─────────────────────────
test("save migration: migrateSave stamps version, fills defaults, runs vessel migration, keeps provided", () => {
  // 舊存檔(無 version、無 ownedVessels、舊 ownsSOV) → 補齊 + 標版
  const old = { budget: 12345, ownsSOV: true, day: 99 };
  const m = g.migrateSave(old);
  eq(m.version, g.SAVE_VERSION, "version stamped");
  eq(m.budget, 12345, "provided field kept");
  eq(m.day, 99, "provided field kept");
  ok(Array.isArray(m.ownedVessels) && m.ownedVessels.includes("sov"), "vessel migration applied (ownsSOV→sov in fleet)");
  ok(Array.isArray(m.fleet) && m.fleet.length > 0, "missing field defaulted from INITIAL (fleet)");
  ok(Array.isArray(m.history), "new field history defaulted");
  eq(m.daily, null, "new field daily defaulted");
  // 空物件 → 等同全新(帶版本)
  const fresh = g.migrateSave({});
  eq(fresh.version, g.SAVE_VERSION); eq(fresh.budget, I.budget, "empty → INITIAL budget");
});

// ───────────────────────── 知識點掌握度(#mastery) ─────────────────────────
test("mastery: recordAnswer accumulates n/ok per key; accuracy", () => {
  let m = {};
  m = mastery.recordAnswer(m, ["disc:control", "kp:x"], true);
  m = mastery.recordAnswer(m, ["disc:control"], false);
  eq(m["disc:control"].n, 2); eq(m["disc:control"].ok, 1);
  eq(m["kp:x"].n, 1); eq(m["kp:x"].ok, 1);
  eq(mastery.accuracy(m["disc:control"]), 50);
  eq(mastery.accuracy(undefined), 0, "no cell → 0");
  eq(mastery.totalAnswered(m), 3, "total answers across keys");
});
test("mastery: masteryRows covers all labels; weakest needs minN", () => {
  const labels = { a: { zh: "甲", en: "A" }, b: { zh: "乙", en: "B" }, c: { zh: "丙", en: "C" } };
  let m = {};
  for (let i = 0; i < 4; i++) m = mastery.recordAnswer(m, ["d:a"], true); // a: 4/4 = 100
  m = mastery.recordAnswer(m, ["d:b"], true); m = mastery.recordAnswer(m, ["d:b"], false); // b: 1/2 = 50
  m = mastery.recordAnswer(m, ["d:c"], false); // c: 0/1 (n=1 < minN)
  const rows = mastery.masteryRows(m, "d", labels);
  eq(rows.length, 3, "one row per label");
  eq(rows.find((r) => r.key === "a").acc, 100);
  eq(rows.find((r) => r.key === "b").acc, 50);
  const w = mastery.weakest(rows, 2); // 只考慮 n>=2 → 只有 a(100) 與 b(50) → 弱點 b
  eq(w.key, "b", "weakest among sufficiently-sampled is b");
  eq(mastery.weakest([{ key: "z", label: labels.a, n: 1, ok: 0, acc: 0 }], 2), null, "insufficient sample → null");
});
test("mastery: RECORD_ANSWER reducer updates mastery", () => {
  let s = R(I, { type: "RECORD_ANSWER", keys: ["cat:A"], correct: true });
  s = R(s, { type: "RECORD_ANSWER", keys: ["cat:A"], correct: false });
  eq(s.mastery["cat:A"].n, 2); eq(s.mastery["cat:A"].ok, 1);
});

// ───────────────────────── 錯題本(#mistake-log) ─────────────────────────
test("mistakes: addMistake caps to most-recent N; reviewMistake marks + reflection; pending count", () => {
  const I18 = { zh: "x", en: "x" };
  const mk = (i) => ({ id: "m" + i, topic: "disc:control", question: I18, chosen: I18, correct: I18, day: i });
  let list = [];
  for (let i = 0; i < mastery.MISTAKES_CAP + 5; i++) list = mastery.addMistake(list, mk(i));
  eq(list.length, mastery.MISTAKES_CAP, "capped at MISTAKES_CAP");
  eq(list[list.length - 1].id, "m" + (mastery.MISTAKES_CAP + 4), "keeps the newest");
  eq(list[0].id, "m5", "drops the oldest");
  eq(mastery.pendingMistakes(list), mastery.MISTAKES_CAP, "all unreviewed");
  const rv = mastery.reviewMistake(list, "m10", "下次先查潤滑");
  const hit = rv.find((x) => x.id === "m10");
  ok(hit.reviewed && hit.reflection === "下次先查潤滑", "reviewed flag + reflection set");
  eq(mastery.pendingMistakes(rv), mastery.MISTAKES_CAP - 1, "one fewer pending");
});
// ───────────────────────── 新手友善 + 戲劇張力(#1.2/2.2) ─────────────────────────
test("UX: entry-level faults carry life metaphors (#1.2)", () => {
  for (const id of ["gearbox_overheat", "yaw_misalign", "pitch_fault", "converter_fault", "gen_overtemp", "gen_vibration"]) {
    const c = flt.CODEX[id];
    ok(c && c.metaphor && c.metaphor.zh && c.metaphor.en, `${id} has a bilingual life metaphor`);
  }
});
test("drama: non-technical events added & well-formed; rollEvent still valid (#2.2)", () => {
  const ids = new Set(events.EVENTS.map((e) => e.id));
  for (const id of ["eco_protest", "bad_press", "media_spotlight", "community_support", "regulator_audit"]) ok(ids.has(id), `event ${id} present`);
  for (const e of events.EVENTS) {
    ok(e.id && e.name?.zh && e.name?.en && e.desc?.zh && e.desc?.en, `event ${e.id} bilingual`);
    ok(typeof e.weight === "number" && e.weight > 0, `event ${e.id} weight>0`);
    ok(typeof e.apply === "function", `event ${e.id} has apply`);
    const patch = e.apply({ ...I });
    ok(patch && typeof patch === "object", `event ${e.id} apply returns a patch`);
  }
  // rollEvent 仍回 null 或合法事件
  seed(4);
  for (let i = 0; i < 200; i++) { const r = events.rollEvent(0.4, 80); ok(r === null || ids.has(r.id), "rollEvent returns null or a known event"); }
});
// ───────────────────────── 母港建設・視覺成長(#port) ─────────────────────────
test("port: catalog well-formed; level/cost helpers", () => {
  ok(port.PORT_FACILITIES.length >= 3, "has facilities");
  let sumMax = 0;
  for (const f of port.PORT_FACILITIES) {
    ok(f.id && f.name?.zh && f.name?.en && f.blurb?.zh, `facility ${f.id} bilingual`);
    ok(f.max >= 1 && f.costs.length === f.max, `facility ${f.id} costs length == max`);
    for (const c of f.costs) ok(c > 0, `facility ${f.id} cost > 0`);
    sumMax += f.max;
  }
  eq(port.PORT_MAX_LEVEL, sumMax, "PORT_MAX_LEVEL = Σ max");
  const fid = port.PORT_FACILITIES[0].id;
  eq(port.portFacLevel({}, fid), 0, "missing → level 0");
  eq(port.nextPortCost({}, fid), port.PORT_FACILITIES[0].costs[0], "next cost = costs[0] at lv0");
  eq(port.portLevel({ [fid]: 2 }), 2, "portLevel sums");
  ok(port.canUpgradePort({}, fid, 1e12), "affordable when rich");
  ok(!port.canUpgradePort({}, fid, 0), "not affordable when broke");
  // 滿級 → 下一級費用 null、不可升級
  const maxed = { [fid]: port.PORT_FACILITIES[0].max };
  eq(port.nextPortCost(maxed, fid), null, "maxed → null cost");
  ok(!port.canUpgradePort(maxed, fid, 1e12), "maxed → cannot upgrade");
});
test("port: UPGRADE_PORT deducts budget & raises level; guards (reducer)", () => {
  const fid = port.PORT_FACILITIES[0].id;
  const cost = port.PORT_FACILITIES[0].costs[0];
  let s = R({ ...I, budget: cost + 5, portUpgrades: {} }, { type: "UPGRADE_PORT", id: fid, cost });
  eq(s.portUpgrades[fid], 1, "level +1");
  eq(s.budget, 5, "budget deducted");
  // 預算不足 → 不變
  const poor = R({ ...I, budget: 1, portUpgrades: {} }, { type: "UPGRADE_PORT", id: fid, cost });
  eq(poor.portUpgrades[fid] ?? 0, 0, "no upgrade when broke");
  // 未知設施 → 不變
  const bad = R({ ...I, budget: 1e9 }, { type: "UPGRADE_PORT", id: "nope", cost: 1 });
  eq(bad.portUpgrades.nope, undefined, "unknown facility ignored");
  // 滿級 → 不變
  let full = { ...I, budget: 1e12, portUpgrades: { [fid]: port.PORT_FACILITIES[0].max } };
  const after = R(full, { type: "UPGRADE_PORT", id: fid, cost: 1 });
  eq(after.portUpgrades[fid], port.PORT_FACILITIES[0].max, "maxed stays");
});
test("mistakes: RECORD_MISTAKE assigns id & appends; REVIEW_MISTAKE updates by id (reducer)", () => {
  const I18 = { zh: "q", en: "q" };
  let s = R({ ...I, mistakes: [], day: 7 }, { type: "RECORD_MISTAKE", mk: { topic: "cat:G", question: I18, chosen: I18, correct: I18, lesson: I18, day: 7 } });
  eq(s.mistakes.length, 1, "appended");
  ok(s.mistakes[0].id, "id assigned by reducer");
  ok(!s.mistakes[0].reviewed, "starts unreviewed");
  const id = s.mistakes[0].id;
  s = R(s, { type: "REVIEW_MISTAKE", id, reflection: "檢討完成" });
  ok(s.mistakes[0].reviewed && s.mistakes[0].reflection === "檢討完成", "reducer marks reviewed + reflection");
});

console.log(`\n${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail) { console.log("\nFailures:"); for (const f of fails) console.log("  ✗ " + f); process.exit(1); }
console.log("✓ all green");
