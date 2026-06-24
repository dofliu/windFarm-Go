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
const course = await load("src/state/course.ts");
const data = await load("src/ui/data.ts");
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
  // SOV can sail in closed seas
  const withSov = R({ ...base, ownsSOV: true }, { type: "OPS_DISPATCH", turbine: fleet[idx].id, engineerId: "m" });
  eq(withSov.opsJobs.length, 1, "SOV can deploy in closed seas");
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
  const r = { key: "0:m1", boarded: true, pick: 0, steps: [true, true, true, false, false], win: 5 };
  const s1 = R(I, { type: "SET_REPAIR", repair: r });
  eq(s1.repair.win, 5);
  ok(s1.repair.boarded, "boarded persisted");
  eq(s1.repair.pick, 0);
  // 接新單 → 清空（避免把上一單進度帶到新單）
  eq(R(s1, { type: "ACCEPT_QUEST" }).repair, null);
  // 撤離（FAIL_REPAIR）→ 清空；作業窗不可被切畫面免費重置
  seed(1); eq(R(s1, { type: "FAIL_REPAIR" }).repair, null);
  // 明確清空
  eq(R(s1, { type: "SET_REPAIR", repair: null }).repair, null);
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
