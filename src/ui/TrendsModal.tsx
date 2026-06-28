import { C, FONT_SERIF, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { toWan } from "../state/game";
import { summarizeHistory, type TrendPoint } from "../state/trends";
import type { I18n } from "../game/systems/types";

// 零相依 SVG 折線圖:多序列、共用 y 軸、0 基線(供帶號序列)。
function Chart({ pts, series, title, fmtY }: { pts: TrendPoint[]; series: { key: keyof TrendPoint; color: string; label: I18n }[]; title: I18n; fmtY?: (n: number) => string }) {
  const W = 520, H = 120, padL = 8, padR = 8, padT = 10, padB = 16;
  const xs = pts.map((p) => p.day);
  const xmin = xs[0], xmax = xs[xs.length - 1] || xmin + 1;
  const vals = series.flatMap((s) => pts.map((p) => p[s.key] as number));
  let ymin = Math.min(0, ...vals), ymax = Math.max(1, ...vals);
  if (ymin === ymax) ymax = ymin + 1;
  const X = (d: number) => padL + ((d - xmin) / Math.max(1, xmax - xmin)) * (W - padL - padR);
  const Y = (v: number) => padT + (1 - (v - ymin) / (ymax - ymin)) * (H - padT - padB);
  const zeroY = Y(0);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{t(title)}</span>
        {series.map((s, i) => (
          <span key={i} style={{ fontSize: 10.5, color: s.color }}>● {t(s.label)} {fmtY ? fmtY(pts[pts.length - 1][s.key] as number) : (pts[pts.length - 1][s.key] as number)}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", background: "rgba(255,255,255,.03)", border: "1px solid rgba(214,167,84,.16)", borderRadius: 5 }}>
        {ymin < 0 && <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="rgba(255,255,255,.18)" strokeDasharray="3 3" />}
        {series.map((s, i) => (
          <polyline key={i} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinejoin="round"
            points={pts.map((p) => `${X(p.day).toFixed(1)},${Y(p[s.key] as number).toFixed(1)}`).join(" ")} />
        ))}
      </svg>
    </div>
  );
}

const card = (label: I18n, value: string, color: string, lang: () => void) => { void lang; return (
  <div style={{ flex: "1 1 30%", minWidth: 120, padding: "8px 10px", borderRadius: 5, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.18)" }}>
    <div style={{ fontSize: 10.5, color: C.mist }}>{t(label)}</div>
    <div style={{ fontSize: 16, fontWeight: 900, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
  </div>
); };

// 營運趨勢 / 賽後復盤(#5):把每日 KPI 歷史畫成趨勢圖 + 期間摘要,作教學覆盤工具。
export default function TrendsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLang();
  const { data } = useGame();
  if (!open) return null;
  const h = data.history ?? [];
  const sum = summarizeHistory(h);
  const wan = (n: number) => `◎${toWan(n)} ${t({ zh: "萬", en: "M" })}`;

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 62, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="wfg-modal-panel" style={{ ...panel, width: 600, maxHeight: 780, overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)", position: "sticky", top: 0 }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>📈 {t({ zh: "營運趨勢 · 賽後復盤", en: "Operations Trends · After-Action" })}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        <div style={{ padding: "14px 16px" }}>
          {!sum || h.length < 2 ? (
            <div style={{ color: C.mist, fontSize: 13, padding: "26px 0", textAlign: "center" }}>{t({ zh: "尚無足夠資料 —— 推進幾天(出海/休整/戰情室/任務)後再回來看趨勢與復盤。", en: "Not enough data yet — advance a few days (sail/rest/fleet ops/tasks) and come back for trends & review." })}</div>
          ) : (
            <>
              {/* 期間摘要(復盤) */}
              <div style={{ fontSize: 11.5, color: C.mist2, marginBottom: 8 }}>
                {t({ zh: `期間:第 ${sum.fromDay}–${sum.toDay} 天(${sum.days} 天 · ${sum.n} 筆紀錄)`, en: `Window: day ${sum.fromDay}–${sum.toDay} (${sum.days}d · ${sum.n} records)` })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {card({ zh: "平均妥善率", en: "Avg availability" }, `${sum.avgAvail}%`, sum.avgAvail >= 90 ? C.green : sum.avgAvail >= 80 ? C.amber2 : C.red, useLang)}
                {card({ zh: "最低妥善率", en: "Min availability" }, `${sum.minAvail}%`, sum.minAvail >= 85 ? C.green : C.amber2, useLang)}
                {card({ zh: "末段健康度", en: "End fleet health" }, `${sum.endHealth}%`, sum.endHealth >= 70 ? C.green : sum.endHealth >= 40 ? C.amber2 : C.red, useLang)}
                {card({ zh: "期間發電增量", en: "Generation Δ" }, `${sum.genDelta.toLocaleString()} MWh`, C.cream, useLang)}
                {card({ zh: "期間總收入", en: "Total revenue" }, wan(sum.totalRevenue), C.green, useLang)}
                {card({ zh: "期間總支出", en: "Total OPEX" }, wan(sum.totalOpex), C.amber2, useLang)}
                {card({ zh: "期間淨額", en: "Net total" }, wan(sum.netTotal), sum.netTotal >= 0 ? C.goldText : C.red, useLang)}
              </div>

              {/* 趨勢圖 */}
              <Chart pts={h} title={{ zh: "妥善率 %", en: "Availability %" }} series={[{ key: "avail", color: C.green, label: { zh: "妥善率", en: "Avail" } }]} fmtY={(n) => `${n}%`} />
              <Chart pts={h} title={{ zh: "機組健康度 %", en: "Fleet health %" }} series={[{ key: "health", color: "#5fa8d9", label: { zh: "健康度", en: "Health" } }]} fmtY={(n) => `${n}%`} />
              <Chart pts={h} title={{ zh: "當日收入 vs 支出", en: "Daily revenue vs OPEX" }} series={[{ key: "revenue", color: C.green, label: { zh: "收入", en: "Revenue" } }, { key: "opex", color: C.amber2, label: { zh: "支出", en: "OPEX" } }]} fmtY={(n) => wan(n)} />
              <Chart pts={h} title={{ zh: "當日淨額(含 0 基線)", en: "Daily net (with 0 line)" }} series={[{ key: "net", color: C.goldText, label: { zh: "淨額", en: "Net" } }]} fmtY={(n) => wan(n)} />
              <Chart pts={h} title={{ zh: "累積發電量 MWh", en: "Cumulative generation MWh" }} series={[{ key: "gen", color: "#e8c074", label: { zh: "累積發電", en: "Gen" } }]} fmtY={(n) => n.toLocaleString()} />
              <div style={{ fontSize: 11, color: C.mist2, marginTop: 4 }}>
                {t({ zh: "覆盤提示:可用率掉的那幾天對照支出/淨額,找出是停機損失、待命費還是 SLA 違約所致 → 下次提早處置。", en: "Review tip: cross-reference the days availability dipped with OPEX/net to see if it was downtime, standby (demurrage) or SLA penalty — act earlier next time." })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
