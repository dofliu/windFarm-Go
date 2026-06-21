import { useState, type ReactNode } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { Sfx } from "../audio/sfx";
import { DISC } from "./disc";
import { FARMS } from "../state/farms";
import { incidentAt } from "../state/incidents";
import { fleetUptime, engineerBusy, fatigueOf, FATIGUE_LIMIT } from "../state/game";

const STATUS_COLOR: Record<string, string> = { ok: "#3f7d52", fault: "#c0463a", repair: "#cf9a35" };

function shell(title: string, onClose: () => void, body: ReactNode) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panel, width: 720, maxHeight: 800, overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)" }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>{title}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>
        <div style={{ padding: "14px 16px" }}>{body}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "6px 4px", borderRadius: 5, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.18)" }}>
      <div style={{ fontSize: 17, fontWeight: 900, color: color ?? C.cream, fontFamily: FONT_SERIF }}>{value}</div>
      <div style={{ fontSize: 10.5, color: C.mist }}>{label}</div>
    </div>
  );
}

// 風場戰情室（Phase C 活體戰情層）：機組個體即時狀態 + 並行工單 + 多組人力派遣。
export default function FleetOpsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLang();
  const { data, dispatch } = useGame();
  const [sel, setSel] = useState<string | null>(null);
  if (!open) return null;

  const fleet = data.fleet;
  const uptime = fleetUptime(fleet);
  const faults = fleet.filter((t) => t.status === "fault").length;
  const freeCrew = data.engineers.filter((e) => !engineerBusy(data.opsJobs, e.id) && fatigueOf(e) < FATIGUE_LIMIT).length;
  const selT = sel ? fleet.find((t) => t.id === sel) : null;
  const inc = selT ? incidentAt(selT.faultId) : undefined;
  const candidates = inc ? data.engineers.filter((e) => e.discipline === inc.discipline && !engineerBusy(data.opsJobs, e.id) && fatigueOf(e) < FATIGUE_LIMIT) : [];

  const dispatchCrew = (engineerId: string) => {
    if (!selT) return;
    Sfx.success();
    dispatch({ type: "OPS_DISPATCH", turbine: selT.id, engineerId });
    setSel(null);
  };
  const nextDay = () => { Sfx.click(); dispatch({ type: "OPS_ADVANCE" }); };

  const farmsShown = Math.min(data.farmsOwned, FARMS.length);

  return shell(`🛰 ${t({ zh: "風場戰情室（即時機組狀態）", en: "Fleet Ops Room (live)" })}`, onClose, (
    <div>
      <div style={{ fontSize: 12, color: C.mist, marginBottom: 10, lineHeight: 1.6 }}>
        {t({ zh: "機組會隨時間隨機故障；指派對應科別技師並行搶修。停機越久、損失發電越多。每推進一天，工單前進、可能再有新故障。", en: "Turbines fault over time; dispatch matching-discipline crews to repair in parallel. The longer a unit is down, the more generation is lost. Each day advances jobs and may spawn new faults." })}
      </div>

      {/* 統計列 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Stat label={t({ zh: "機組妥善", en: "Uptime" })} value={`${uptime}%`} color={uptime >= 90 ? C.green : uptime >= 75 ? C.amber : C.red} />
        <Stat label={t({ zh: "待修故障", en: "Faults" })} value={String(faults)} color={faults > 0 ? C.red : C.green} />
        <Stat label={t({ zh: "進行工單", en: "Active jobs" })} value={String(data.opsJobs.length)} color={C.goldText} />
        <Stat label={t({ zh: "可用技師", en: "Free crew" })} value={`${freeCrew}/${data.engineers.length}`} />
        <Stat label={t({ zh: "停機損失", en: "Lost gen" })} value={`${data.fleetLostMWh} MWh`} color={C.amber2} />
        <Stat label={t({ zh: "已修復", en: "Resolved" })} value={String(data.fleetResolved)} color={C.green} />
      </div>

      {/* 機組陣列（依風場分區） */}
      {Array.from({ length: farmsShown }).map((_, f) => {
        const cells = fleet.filter((tt) => tt.farm === f);
        return (
          <div key={f} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, marginBottom: 5 }}>{t(FARMS[f].name)}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {cells.map((tt) => {
                const isSel = sel === tt.id;
                const clickable = tt.status === "fault";
                return (
                  <div
                    key={tt.id}
                    onClick={() => { if (clickable) { Sfx.click(); setSel(isSel ? null : tt.id); } }}
                    title={tt.id + (tt.faultId ? ` · ${t(incidentAt(tt.faultId)?.name ?? { zh: "", en: "" })}` : "")}
                    style={{ width: 40, height: 32, borderRadius: 4, background: STATUS_COLOR[tt.status], opacity: tt.status === "ok" ? 0.55 : 1, border: isSel ? "2px solid #ffe6b0" : "1px solid rgba(0,0,0,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", cursor: clickable ? "pointer" : "default", position: "relative" }}
                  >
                    {tt.id.replace(/^[A-Za-z-]+/, "")}
                    {tt.status === "repair" && <span style={{ position: "absolute", top: -2, right: -2, fontSize: 9 }}>🔧</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 圖例 */}
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: C.mist, margin: "4px 0 12px" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: STATUS_COLOR.ok, opacity: 0.55, borderRadius: 2, marginRight: 4 }} />{t({ zh: "正常", en: "OK" })}</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: STATUS_COLOR.fault, borderRadius: 2, marginRight: 4 }} />{t({ zh: "故障(可點擊派工)", en: "Fault (click to dispatch)" })}</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: STATUS_COLOR.repair, borderRadius: 2, marginRight: 4 }} />{t({ zh: "維修中", en: "In repair" })}</span>
      </div>

      {/* 派工面板 */}
      {selT && inc && (
        <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 6, background: "rgba(192,70,58,.1)", border: "1px solid rgba(192,70,58,.35)" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.cream }}>{selT.id} · {t(inc.name)} <span style={{ color: C.mist, fontWeight: 400, fontSize: 12 }}>（{t(DISC[inc.discipline])} · {t({ zh: "工期", en: "duration" })} {inc.repairDays} {t({ zh: "天", en: "d" })}）</span></div>
          <div style={{ fontSize: 11.5, color: C.amber2, margin: "4px 0 8px" }}>{t({ zh: "停機中每日損失約", en: "Losing ~" })} {selT.gen} MWh/{t({ zh: "天", en: "day" })}</div>
          {candidates.length === 0 ? (
            <div style={{ fontSize: 12, color: C.mist }}>{t({ zh: `無可用的「${DISC[inc.discipline].zh}」技師（過勞或不足）。可靠港休整或到技師公會招募同科別技師。`, en: `No available ${DISC[inc.discipline].en} crew (fatigued or none). Rest in port or hire one at the Tech Guild.` })}</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {candidates.map((e) => (
                <button key={e.id} onClick={() => dispatchCrew(e.id)} style={{ padding: "6px 12px", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 12.5, cursor: "pointer" }}>
                  {t({ zh: "派", en: "Send" })} {e.name} <span style={{ fontWeight: 400 }}>Lv.{e.level} · {t({ zh: "疲勞", en: "fat" })} {Math.round(fatigueOf(e))}%</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 進行中工單 */}
      {data.opsJobs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, marginBottom: 5 }}>{t({ zh: "進行中工單", en: "Active jobs" })}</div>
          {data.opsJobs.map((j) => {
            const e = data.engineers.find((x) => x.id === j.engineerId);
            const ic = incidentAt(data.fleet.find((tt) => tt.id === j.turbine)?.faultId);
            return (
              <div key={j.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 4, background: "rgba(255,255,255,.04)", marginBottom: 4, fontSize: 12.5 }}>
                <span style={{ color: C.goldText, fontWeight: 700 }}>{j.turbine}</span>
                <span style={{ color: C.cream }}>{ic ? t(ic.name) : ""}</span>
                <span style={{ color: C.mist }}>· {e?.name ?? "?"} ({t(DISC[j.discipline])})</span>
                <span style={{ marginLeft: "auto", color: C.amber2 }}>{t({ zh: "剩", en: "" })} {j.daysLeft} {t({ zh: "天", en: "d left" })}</span>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={nextDay} style={{ width: "100%", padding: "12px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
        {t({ zh: "推進一天 →", en: "Advance one day →" })}　<span style={{ fontWeight: 400, fontSize: 12 }}>Day {data.day}</span>
      </button>
      <div style={{ fontSize: 11, color: C.mist, marginTop: 8, textAlign: "center" }}>{t({ zh: "技師有限 → 多起故障需排優先序；停機損失計入學習指標，修復數計入績效分。", en: "Limited crew → prioritise among faults; lost generation is a learning metric, repairs add to your score." })}</div>
    </div>
  ));
}
