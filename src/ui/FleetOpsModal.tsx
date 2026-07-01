import { useState, type ReactNode } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { Sfx } from "../audio/sfx";
import { FallbackImg } from "./SceneVideo";
import { DISC } from "./disc";
import { FARMS } from "../state/farms";
import { incidentAt } from "../state/incidents";
import { PARTS } from "./data";
import { fleetUptime, engineerBusy, fatigueOf, FATIGUE_LIMIT, jobCapOf, onsiteJobCount, INSPECT_DAYS, SEA_INDEX, seaTolOf, activeVesselSpec, SEA_LABEL, dailyPayroll, toWan, sortieCostOf, QUARTER_DAYS, SLA_FLOOR } from "../state/game";
import { LedgerView } from "./Ledger";

const STATUS_COLOR: Record<string, string> = { ok: "#3f7d52", fault: "#c0463a", repair: "#cf9a35" };

function shell(title: string, onClose: () => void, body: ReactNode) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="wfg-modal-panel" style={{ ...panel, width: 720, maxHeight: 800, overflow: "auto", padding: 0 }}>
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
  const cap = jobCapOf(data);
  const onsite = onsiteJobCount(data.opsJobs);
  const atCap = onsite >= cap;
  const vSpec = activeVesselSpec(data);
  const seaOk = SEA_INDEX[data.seaState] <= seaTolOf(data); // 海象是否允許派船（依目前作業船）
  const canDeploy = !atCap && seaOk;
  const idleCrew = data.engineers.filter((e) => !engineerBusy(data.opsJobs, e.id) && fatigueOf(e) < FATIGUE_LIMIT);
  // 判斷提醒：SLA 季末履約風險（決策點 inline，而非母港輪播）
  const daysLeftQ = Math.max(0, data.quarterStartDay + QUARTER_DAYS - data.day);
  const slaAvg = data.slaSamples > 0 ? data.slaAvailSum / data.slaSamples : data.availability;
  const slaBelow = slaAvg < SLA_FLOOR;

  const dispatchCrew = (engineerId: string) => {
    if (!selT) return;
    Sfx.success();
    dispatch({ type: "OPS_DISPATCH", turbine: selT.id, engineerId });
    setSel(null);
  };
  const inspect = () => { if (!idleCrew.length || !canDeploy) return; Sfx.success(); dispatch({ type: "OPS_INSPECT", engineerId: idleCrew[0].id }); };
  const nextDay = () => { Sfx.click(); dispatch({ type: "OPS_ADVANCE" }); };

  const farmsShown = Math.min(data.farmsOwned, FARMS.length);

  return shell(`🛰 ${t({ zh: "風場戰情室（即時機組狀態）", en: "Fleet Ops Room (live)" })}`, onClose, (
    <div>
      <FallbackImg file="scada.jpg" style={{ display: "block", width: "100%", height: 120, objectFit: "cover", borderRadius: 6, marginBottom: 10 }} />
      <div style={{ fontSize: 12, color: C.mist, marginBottom: 10, lineHeight: 1.6 }}>
        {t({ zh: "機組會隨時間隨機故障；指派對應科別技師並行搶修。停機越久、損失發電越多。每推進一天，工單前進、可能再有新故障。", en: "Turbines fault over time; dispatch matching-discipline crews to repair in parallel. The longer a unit is down, the more generation is lost. Each day advances jobs and may spawn new faults." })}
      </div>

      {/* 統計列 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Stat label={t({ zh: "機組妥善", en: "Uptime" })} value={`${uptime}%`} color={uptime >= 90 ? C.green : uptime >= 75 ? C.amber : C.red} />
        <Stat label={t({ zh: "待修故障", en: "Faults" })} value={String(faults)} color={faults > 0 ? C.red : C.green} />
        <Stat label={t({ zh: "現場工單", en: "On-site jobs" })} value={`${onsite}/${cap}`} color={atCap ? C.amber : C.goldText} />
        <Stat label={t({ zh: "可用技師", en: "Free crew" })} value={`${freeCrew}/${data.engineers.length}`} />
        <Stat label={t({ zh: "停機損失", en: "Lost gen" })} value={`${data.fleetLostMWh} MWh`} color={C.amber2} />
        <Stat label={t({ zh: "已修復", en: "Resolved" })} value={String(data.fleetResolved)} color={C.green} />
        <Stat label={t({ zh: "薪資/月", en: "Payroll/mo" })} value={`◎${toWan(dailyPayroll(data.engineers) * 30)}萬`} color={C.mist2} />
        <Stat label={t({ zh: "作業船", en: "Vessel" })} value={`${vSpec.icon} ${t(vSpec.short)}`} color={C.goldText} />
      </div>

      {/* 判斷提醒：SLA 季末履約風險 —— 平均妥善率 vs 底線 + 季末剩餘天數，低於底線時警示違約金 */}
      <div style={{ marginBottom: 12, padding: "7px 10px", borderRadius: 5, background: slaBelow ? "rgba(220,100,80,.12)" : daysLeftQ <= 14 ? "rgba(227,173,66,.1)" : "rgba(127,206,142,.08)", border: `1px solid ${slaBelow ? "rgba(220,100,80,.32)" : daysLeftQ <= 14 ? "rgba(227,173,66,.3)" : "rgba(127,206,142,.28)"}`, fontSize: 11.5, color: slaBelow ? C.redText : daysLeftQ <= 14 ? C.amber2 : C.mist, lineHeight: 1.55 }}>
        📑 {t({ zh: `本季 SLA：平均妥善率 ${slaAvg.toFixed(0)}%（底線 ${SLA_FLOOR}%）· 季末剩 ${daysLeftQ} 天`, en: `Quarter SLA: avg uptime ${slaAvg.toFixed(0)}% (floor ${SLA_FLOOR}%) · ${daysLeftQ}d left` })}
        {slaBelow
          ? t({ zh: " — ⚠ 低於底線,季末將扣違約金,盡快搶修拉高妥善率!", en: " — ⚠ below floor; fix faults before quarter-end to avoid a penalty!" })
          : daysLeftQ <= 14 && slaAvg < SLA_FLOOR + 3
            ? t({ zh: " — 逼近底線,留意違約風險。", en: " — near the floor; watch breach risk." })
            : ""}
      </div>

      {/* 海象限制派船（接上天氣預報） */}
      {!seaOk && (
        <div style={{ marginBottom: 12, padding: "7px 10px", borderRadius: 5, background: "rgba(220,100,80,.12)", border: "1px solid rgba(220,100,80,.32)", fontSize: 12, color: C.amber2 }}>
          🌊 {t({ zh: `海象「${SEA_LABEL[data.seaState].zh}」超出船舶耐受 → 無法派船。可改用遠端重啟，或等可作業天氣窗（看三日預報）。`, en: `Seas "${SEA_LABEL[data.seaState].en}" exceed vessel limit → can't deploy crews. Use remote restart or wait for a workable window (see the 3-day forecast).` })}
        </div>
      )}

      {/* 預防性定檢 + 船舶容量（Phase C2） */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", borderRadius: 6, background: data.inspectBuffDays > 0 ? "rgba(127,206,142,.1)" : "rgba(95,168,217,.08)", border: `1px solid ${data.inspectBuffDays > 0 ? "rgba(127,206,142,.32)" : "rgba(95,168,217,.28)"}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.cream }}>🛡 {t({ zh: "預防性定檢", en: "Preventive inspection" })}{data.inspectBuffDays > 0 && <span style={{ color: C.green }}> · {t({ zh: `生效中 ${data.inspectBuffDays} 天`, en: `active ${data.inspectBuffDays}d` })}</span>}</div>
          <div style={{ fontSize: 11, color: C.mist }}>{t({ zh: `派一組人巡檢（${INSPECT_DAYS} 天）→ 後續故障率下降；占用一個現場工單名額`, en: `Send a crew (${INSPECT_DAYS}d) → lowers fault rate after; uses one on-site slot` })}</div>
        </div>
        <button disabled={!idleCrew.length || !canDeploy} onClick={inspect} style={{ padding: "7px 14px", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: idleCrew.length && canDeploy ? primaryBg() : "rgba(255,255,255,.08)", color: idleCrew.length && canDeploy ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 12.5, cursor: idleCrew.length && canDeploy ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
          {!seaOk ? t({ zh: "海象停航", en: "Seas closed" }) : atCap ? t({ zh: "現場已滿", en: "At capacity" }) : !idleCrew.length ? t({ zh: "無閒置技師", en: "No idle crew" }) : t({ zh: "派員定檢", en: "Inspect" })}
        </button>
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

      {/* 出海航次提示（鼓勵批次維修） */}
      {faults > 0 && (
        <div style={{ fontSize: 11.5, color: onsite > 0 ? C.green : C.mist, marginBottom: 10 }}>
          🚢 {onsite > 0
            ? t({ zh: `船隊已在海上：本航次再派工免動員費（同趟批次維修分攤 ◎${toWan(sortieCostOf(data))}萬 出海成本）`, en: `Vessel already at sea: additional dispatches this trip are free of the ◎${toWan(sortieCostOf(data))}M mobilization` })
            : t({ zh: `下次派工將開新航次（${vSpec.icon}${t(vSpec.short)} 動員費 ◎${toWan(sortieCostOf(data))}萬）——一趟同時修多台最划算，別一部一部修`, en: `Next dispatch starts a new sortie (${vSpec.icon}${t(vSpec.short)} ◎${toWan(sortieCostOf(data))}M mobilization) — batch repairs in one trip rather than one-by-one` })}
        </div>
      )}

      {/* 派工面板 */}
      {selT && inc && (
        <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 6, background: "rgba(192,70,58,.1)", border: "1px solid rgba(192,70,58,.35)" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.cream }}>{selT.id} · {t(inc.name)} <span style={{ color: C.mist, fontWeight: 400, fontSize: 12 }}>（{t(DISC[inc.discipline])} · {t({ zh: "工期", en: "duration" })} {inc.repairDays} {t({ zh: "天", en: "d" })}）</span></div>
          <div style={{ fontSize: 11.5, color: C.amber2, margin: "4px 0 6px" }}>{t({ zh: "停機中每日損失約", en: "Losing ~" })} {selT.gen} MWh/{t({ zh: "天", en: "day" })}</div>
          {(() => {
            const p = PARTS.find((x) => x.id === inc.part);
            const stock = data.inventory[inc.part] ?? 0;
            return <div style={{ fontSize: 11.5, color: stock > 0 ? C.mist : C.red, marginBottom: 8 }}>{t({ zh: "派工需備品", en: "Crew repair needs" })}：{t(p?.n ?? { zh: inc.part, en: inc.part })}（{t({ zh: "庫存", en: "stock" })} {stock}）{stock <= 0 && <span style={{ color: C.red }}> · {t({ zh: "缺料，去交易所採購", en: "out of stock — buy at Market" })}</span>}</div>;
          })()}
          {inc.resettable && (
            <button onClick={() => { Sfx.success(); dispatch({ type: "OPS_RESET", turbine: selT.id }); setSel(null); }} style={{ width: "100%", marginBottom: 8, padding: "8px 0", borderRadius: 5, border: "1px solid rgba(95,168,217,.6)", background: "rgba(95,168,217,.18)", color: C.cream, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13, cursor: "pointer" }}>
              ⟳ {t({ zh: "遠端重啟（1 天・免技師）", en: "Remote restart (1 day, no crew)" })}
            </button>
          )}
          <div style={{ fontSize: 11, color: C.mist, marginBottom: 4 }}>{inc.resettable ? t({ zh: "或派技師現場處理：", en: "Or dispatch crew on site:" }) : t({ zh: "需派對應科別技師：", en: "Dispatch matching crew:" })}</div>
          {!seaOk ? (
            <div style={{ fontSize: 12, color: C.amber2 }}>{t({ zh: `海象「${SEA_LABEL[data.seaState].zh}」無法派船——等可作業天氣窗，或升級/購置 SOV（可在更高海象出航）。`, en: `Seas "${SEA_LABEL[data.seaState].en}" — can't deploy. Wait for a workable window or get an SOV.` })}</div>
          ) : atCap ? (
            <div style={{ fontSize: 12, color: C.amber2 }}>{t({ zh: `船舶現場工單已滿（${onsite}/${cap}）。等工單完成、升級整備或購置 SOV 以提高並行數。`, en: `On-site jobs full (${onsite}/${cap}). Wait, upgrade the vessel or buy an SOV to raise concurrency.` })}</div>
          ) : (data.inventory[inc.part] ?? 0) <= 0 ? (
            <div style={{ fontSize: 12, color: C.amber2 }}>{t({ zh: "缺必備備品，無法現場維修——先去備品交易所採購（或先遠端重啟可重啟的故障）。", en: "Missing the required part — buy it at the Parts Market first (or remote-restart resettable faults)." })}</div>
          ) : candidates.length === 0 ? (
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
            const isInspect = j.kind === "inspect";
            return (
              <div key={j.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 4, background: "rgba(255,255,255,.04)", marginBottom: 4, fontSize: 12.5 }}>
                <span style={{ color: C.goldText, fontWeight: 700 }}>{isInspect ? "🛡" : j.turbine}</span>
                <span style={{ color: C.cream }}>{isInspect ? t({ zh: "全場預防性定檢", en: "Fleet inspection" }) : ic ? t(ic.name) : ""}</span>
                <span style={{ color: C.mist }}>· {j.remote ? t({ zh: "遠端重啟", en: "Remote restart" }) : `${e?.name ?? "?"} (${t(DISC[j.discipline])})`}</span>
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

      {/* 今日收支（莉莉財報）：推進後看當日各項現金流 */}
      <div style={{ marginTop: 12, padding: "9px 11px", borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.18)" }}>
        <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, marginBottom: 5 }}>{t({ zh: "今日收支 · 莉莉財報", en: "Daily Ledger · Lili" })}</div>
        <LedgerView ledger={data.lastLedger} />
      </div>
    </div>
  ));
}
