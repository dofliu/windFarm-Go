// 平衡模擬器（可重複使用）：以幾種玩家策略推進固定天數，輸出妥善率/經濟/績效，
// 用來在調整數值（故障率、電價、報酬、船舶上限…）後快速檢查手感。
// 執行：npm run sim  （node test/sim.mjs [days] [seed]）
import { build } from "esbuild";

const DAYS = Number(process.argv[2] || 120);
const SEED = Number(process.argv[3] || 20260622);
function mulberry32(s) { return function () { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const load = async (e) => import("data:text/javascript," + encodeURIComponent((await build({ entryPoints: [e], bundle: true, format: "esm", write: false, logLevel: "silent", external: ["react"] })).outputFiles[0].text));

const g = await load("src/state/game.ts");
const inc = await load("src/state/incidents.ts");
const data = await load("src/ui/data.ts");
const R = g.reducer;
const wan = (n) => Math.round(n / 10000);

// 積極管理：可重啟者遠端重啟、其餘派對應科別且未過勞的閒置技師（受船舶並行上限）
function manage(s) {
  let changed = true;
  while (changed) {
    changed = false;
    if (g.onsiteJobCount(s.opsJobs) >= g.vesselJobCap(s.ownsSOV, s.vesselLevel)) break;
    for (const f of s.fleet.filter((t) => t.status === "fault")) {
      if (g.onsiteJobCount(s.opsJobs) >= g.vesselJobCap(s.ownsSOV, s.vesselLevel)) break;
      const ic = inc.incidentAt(f.faultId);
      if (ic?.resettable) { const b = s.opsJobs.length; s = R(s, { type: "OPS_RESET", turbine: f.id }); if (s.opsJobs.length > b) { changed = true; continue; } }
      const e = s.engineers.find((e) => e.discipline === ic?.discipline && !g.engineerBusy(s.opsJobs, e.id) && g.fatigueOf(e) < g.FATIGUE_LIMIT);
      if (e) {
        // 派工需備品 → 缺料就先即買（cheap 才買，避免無止境砸大型組件；大型組件留給「值不值得修」決策）
        if ((s.inventory[ic.part] ?? 0) < 1) {
          const p = data.PARTS.find((pp) => pp.id === ic.part);
          if (p && data.priceNum(p) <= 1_000_000) s = R(s, { type: "BUY", partId: ic.part, qty: 1, cost: data.priceNum(p), leadDays: 0 });
        }
        if ((s.inventory[ic.part] ?? 0) >= 1) { const b = s.opsJobs.length; s = R(s, { type: "OPS_DISPATCH", turbine: f.id, engineerId: e.id }); if (s.opsJobs.length > b) changed = true; }
      }
    }
  }
  return s;
}

function run(strategy) {
  Math.random = mulberry32(SEED); // 每策略相同種子 → 可比較
  let s = g.INITIAL;
  if (strategy === "full-crew") for (const d of ["electrical", "control", "structural", "hse"]) s = R(s, { type: "HIRE", engineer: { id: "h" + d, name: d, discipline: d, level: 2, fatigue: 0 }, cost: 3_000_000 });
  const b0 = s.budget; let sumUp = 0, minUp = 100, n = 0;
  for (let day = 0; day < DAYS; day++) {
    if (strategy !== "passive") s = manage(s);
    s = R(s, day % 4 === 0 ? { type: "REMOTE_CHECK" } : { type: "OPS_ADVANCE" });
    const up = g.fleetUptime(s.fleet); sumUp += up; minUp = Math.min(minUp, up); n++;
  }
  return { strategy, dUp: s.fleet.filter((t) => t.status === "ok").length, up: g.fleetUptime(s.fleet), avgUp: Math.round(sumUp / n), minUp, faults: s.fleet.filter((t) => t.status === "fault").length, resolved: s.fleetResolved, lost: s.fleetLostMWh, dBudget: wan(s.budget - b0), score: g.computeScore(s), health: Math.round(s.fleetHealth) };
}

console.log(`Balance sim — ${DAYS} days, seed ${SEED}\n`);
console.log("strategy".padEnd(12), "uptime(now/avg/min)".padEnd(22), "faults", "resolved", "lostMWh", "ΔbudgetWan", "health", "score");
for (const st of ["passive", "active", "full-crew"]) {
  const r = run(st);
  console.log(st.padEnd(12), `${r.up}% / ${r.avgUp}% / ${r.minUp}%`.padEnd(22), String(r.faults).padEnd(6), String(r.resolved).padEnd(8), String(r.lost).padEnd(7), String(r.dBudget).padEnd(10), String(r.health).padEnd(6), r.score);
}
console.log("\nGuide: passive = ignore fleet; active = manage with starting crew; full-crew = hire all disciplines first.");
