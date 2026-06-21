import { useEffect, useState, type ReactNode } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { getLang } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { toWan, DIAG_COST } from "../state/game";
import { Sfx } from "../audio/sfx";
import { CAT_LABEL, generateTask, type TaskChoice, type TaskInstance } from "../state/tasks";

const CAT_COLOR: Record<string, string> = { A: "#dc6450", B: "#5fa8d9", C: "#7fce8e", D: "#e3ad42", E: "#b08adf", F: "#e89a5b", G: "#d98ac0" };

// 動態時鐘：驅動 SCADA 即時饋送動畫（#scada）
function useTick(ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return tick;
}

// 判斷型任務輔助圖（#scada）：隨時間變化的即時曲線；diag=true 解鎖進階檢測（投影/門檻/讀數）
function TaskChart({ kind, diag }: { kind: string; diag: boolean }) {
  const tick = useTick(160);
  const zh = getLang() === "zh";
  const W = 500, H = 96;
  const ALARM = 56; // 告警門檻值（trend 用）
  let body: ReactNode = null;

  if (kind === "trend") {
    const N = 26;
    const val = (i: number) => { const x = i + tick * 0.6; return 9 + i * 1.55 + Math.sin(x * 0.5) * 3.2 + Math.sin(x * 0.16) * 2.4; };
    const xAt = (i: number) => 20 + (i * (W - 40)) / (N - 1);
    const yAt = (v: number) => H - 12 - v * 1.05;
    const pts = Array.from({ length: N }, (_, i) => val(i));
    const d = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
    const last = pts[N - 1];
    // 線性外插：估計多少步後越過門檻
    const slope = (pts[N - 1] - pts[N - 6]) / 5;
    const eta = slope > 0 ? Math.max(0, Math.round((ALARM - last) / slope)) : 99;
    body = (
      <>
        <line x1={20} y1={H - 12} x2={W - 8} y2={H - 12} stroke="rgba(255,255,255,.2)" />
        <path d={d} fill="none" stroke="#5fa8d9" strokeWidth={2.5} />
        <circle cx={xAt(N - 1)} cy={yAt(last)} r={3} fill="#dc6450" />
        {diag && <>
          <line x1={20} y1={yAt(ALARM)} x2={W - 8} y2={yAt(ALARM)} stroke="#dc6450" strokeWidth={1} strokeDasharray="5 4" opacity={0.8} />
          <path d={`M ${xAt(N - 1)} ${yAt(last)} L ${xAt(N - 1) + 70} ${yAt(last + slope * 8)}`} stroke="#e3ad42" strokeWidth={2} strokeDasharray="4 3" fill="none" />
          <text x={W - 150} y={yAt(ALARM) - 4} fill="#e6a64f" fontSize={10}>{zh ? "告警門檻" : "alarm threshold"}</text>
          <text x={26} y={16} fill="#ffd98a" fontSize={11}>{zh ? `🔬 進階檢測：投影約 ${eta} 步後達門檻（風險${eta < 10 ? "高" : "中"}）` : `🔬 Diag: ~${eta} steps to threshold (${eta < 10 ? "high" : "med"} risk)`}</text>
        </>}
        {!diag && <text x={26} y={16} fill="#9fb9c2" fontSize={11}>{zh ? "即時趨勢上升 ↑" : "live trend rising ↑"}</text>}
      </>
    );
  } else if (kind === "spectrum") {
    const peak = 5;
    const bars = Array.from({ length: 14 }, (_, i) => (i === peak ? 32 + Math.sin(tick * 0.4) * 8 : 5 + ((i * 7 + tick * 3) % 11)));
    body = (
      <>
        {bars.map((v, i) => (
          <rect key={i} x={22 + i * 33} y={H - 12 - v * 1.6} width={20} height={v * 1.6} fill={i === peak ? "#dc6450" : "#5fa8d9"} opacity={0.85} />
        ))}
        {diag && <>
          <text x={22 + peak * 33 - 6} y={H - 12 - (40) * 1.6 - 4} fill="#ffd98a" fontSize={10}>BPFI</text>
          <text x={26} y={16} fill="#ffd98a" fontSize={11}>{zh ? "🔬 進階檢測：軸承內環特徵頻率突起、振幅升高" : "🔬 Diag: inner-race (BPFI) spike, amplitude rising"}</text>
        </>}
        {!diag && <text x={26} y={16} fill="#9fb9c2" fontSize={11}>{zh ? "頻譜即時更新" : "live spectrum"}</text>}
      </>
    );
  } else if (kind === "radar") {
    const drift = (tick * 2) % 60;
    body = (
      <>
        {[16, 30, 44].map((r) => (<circle key={r} cx={W / 2} cy={H / 2} r={r} fill="none" stroke="rgba(255,255,255,.18)" />))}
        <line x1={W / 2} y1={H / 2} x2={W / 2 + 44 * Math.cos(tick * 0.1)} y2={H / 2 + 44 * Math.sin(tick * 0.1)} stroke="#7fce8e" strokeWidth={2} />
        <ellipse cx={W / 2 - 90 + drift} cy={H / 2} rx={18} ry={11} fill="#dc6450" opacity={0.6} />
        {diag ? (
          <text x={26} y={16} fill="#ffd98a" fontSize={11}>{zh ? `🔬 進階檢測：胞向本場移動，ETA ~${Math.max(1, 8 - Math.round(drift / 8))}h` : `🔬 Diag: cell inbound, ETA ~${Math.max(1, 8 - Math.round(drift / 8))}h`}</text>
        ) : (
          <text x={26} y={16} fill="#9fb9c2" fontSize={11}>{zh ? "天氣雷達：胞接近" : "radar: cell approaching"}</text>
        )}
      </>
    );
  } else {
    const bars = Array.from({ length: 5 }, (_, i) => 10 + i * 7 + ((tick + i * 2) % 6));
    body = (
      <>
        {bars.map((v, i) => (<rect key={i} x={40 + i * 90} y={H - 12 - v * 1.6} width={48} height={v * 1.6} fill="#e3ad42" opacity={0.85} />))}
        {diag ? (
          <text x={26} y={16} fill="#ffd98a" fontSize={11}>{zh ? "🔬 進階檢測：顆粒數月增率上升、磨損惡化" : "🔬 Diag: monthly debris growth rising — wear worsening"}</text>
        ) : (
          <text x={26} y={16} fill="#9fb9c2" fontSize={11}>{zh ? "顆粒數逐月上升" : "rising counts"}</text>
        )}
      </>
    );
  }
  return (
    <div style={{ marginBottom: 10, borderRadius: 6, background: "rgba(8,20,26,.6)", border: `1px solid ${diag ? "rgba(255,217,138,.4)" : "rgba(214,167,84,.2)"}`, padding: 6 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 90, display: "block" }}>{body}</svg>
    </div>
  );
}

function shell(title: string, onClose: () => void, body: ReactNode) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panel, width: 560, maxHeight: 760, overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)" }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>{title}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>
        <div style={{ padding: "14px 16px" }}>{body}</div>
      </div>
    </div>
  );
}

// 自由營運中心（沙盒）：無限生成的判斷型任務，結算進排行榜績效分。永遠開放。
export default function OpsCenterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLang();
  const { data, dispatch } = useGame();
  const [task, setTask] = useState<TaskInstance>(() => generateTask());
  const [picked, setPicked] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  if (!open) return null;

  const tpl = task.template;
  // #4 接圖：B/D/E 類預設帶輔助圖（個別 template.chart 可覆寫）
  const DEFAULT_CHART: Record<string, string> = { B: "trend", D: "bars", E: "radar" };
  const chart = tpl.chart ?? DEFAULT_CHART[tpl.cat];
  const resolve = (ci: number, c: TaskChoice) => {
    if (picked !== null) return;
    (c.good ? Sfx.success : Sfx.error)();
    setPicked(ci);
    // 健康度：好的預防/監控決策回復較多；壞決策加速劣化（#1）
    const dHealth = c.good ? (tpl.cat === "C" || tpl.cat === "B" ? 3 : 1) : -3;
    dispatch({ type: "RESOLVE_TASK", dAvail: c.eff.a ?? 0, dBudget: c.eff.b ?? 0, dSafety: c.eff.s ?? 0, dGen: c.eff.g ?? 0, dHealth, xp: tpl.xp });
  };
  const nextTask = () => { Sfx.click(); setTask(generateTask()); setPicked(null); setCount((n) => n + 1); };

  const effLabel = (c: TaskChoice) => {
    const parts: string[] = [];
    if (c.eff.a) parts.push(`${t({ zh: "可用率", en: "Avail" })} ${c.eff.a > 0 ? "+" : ""}${c.eff.a}`);
    if (c.eff.b) parts.push(`◎ ${c.eff.b > 0 ? "+" : ""}${Math.round(c.eff.b / 10000)}萬`);
    if (c.eff.g) parts.push(`${c.eff.g > 0 ? "+" : ""}${c.eff.g} MWh`);
    if (c.eff.s) parts.push(`${t({ zh: "安全", en: "Safety" })} +${c.eff.s}`);
    return parts.join(" · ");
  };

  return shell(`🛰 ${t({ zh: "自由營運中心（永遠開放）", en: "Ops Center (always open)" })}`, onClose, (
    <div>
      <div style={{ fontSize: 12, color: C.mist, marginBottom: 12, lineHeight: 1.6 }}>
        {t({ zh: "風場日常各種狀況的判斷練習，結算計入排行榜績效分（不影響計分週任務）。本場次已處理：", en: "Judgment practice on day-to-day farm situations; results count toward leaderboard score (not the graded weekly tasks). Resolved this session: " })}<b style={{ color: C.goldText }}>{count}</b>
      </div>

      {/* 進階檢測解鎖（#scada）：付費後 SCADA 圖顯示投影/門檻/讀數，判讀更清晰 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 12, borderRadius: 6, background: data.diagLevel > 0 ? "rgba(255,217,138,.1)" : "rgba(95,168,217,.1)", border: `1px solid ${data.diagLevel > 0 ? "rgba(255,217,138,.4)" : "rgba(95,168,217,.3)"}` }}>
        <span style={{ fontSize: 18 }}>🔬</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.cream, fontSize: 13, fontWeight: 700 }}>{t({ zh: "進階檢測", en: "Advanced Diagnostics" })}{data.diagLevel > 0 && <span style={{ color: C.green, fontWeight: 700 }}> · {t({ zh: "已啟用", en: "Active" })}</span>}</div>
          <div style={{ fontSize: 11, color: C.mist }}>{t({ zh: "SCADA 趨勢圖顯示投影曲線、告警門檻與風險讀數 · 建置耗時 1 天", en: "SCADA charts show projection, alarm threshold & risk readout · 1 day to set up" })}</div>
        </div>
        {data.diagLevel > 0 ? (
          <span style={{ color: C.green, fontSize: 16 }}>✔</span>
        ) : (
          <button disabled={data.budget < DIAG_COST} onClick={() => { Sfx.cash(); dispatch({ type: "BUY_DIAGNOSTICS", cost: DIAG_COST }); }} style={{ padding: "7px 14px", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: data.budget >= DIAG_COST ? primaryBg() : "rgba(255,255,255,.08)", color: data.budget >= DIAG_COST ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13, cursor: data.budget >= DIAG_COST ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>{t({ zh: "解鎖", en: "Unlock" })} ◎{toWan(DIAG_COST)}{t({ zh: "萬", en: "M" })}</button>
        )}
      </div>

      {/* 任務卡 */}
      <div style={{ borderRadius: 8, border: `1px solid ${CAT_COLOR[tpl.cat]}55`, background: "rgba(255,255,255,.03)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: `${CAT_COLOR[tpl.cat]}22`, borderBottom: `1px solid ${CAT_COLOR[tpl.cat]}44` }}>
          <span style={{ padding: "2px 8px", borderRadius: 3, background: CAT_COLOR[tpl.cat], color: "#10222b", fontSize: 11, fontWeight: 900 }}>{tpl.cat} · {t(CAT_LABEL[tpl.cat])}</span>
          <span style={{ color: C.cream, fontSize: 14, fontWeight: 700 }}>{t(tpl.title)}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.mist }}>{task.unit}</span>
        </div>
        <div style={{ padding: "12px 14px" }}>
          {chart && <TaskChart kind={chart} diag={data.diagLevel > 0} />}
          <div style={{ color: C.cream, fontSize: 13.5, lineHeight: 1.6, marginBottom: 12 }}>{t(tpl.scenario)}</div>
          {tpl.choices.map((c, i) => {
            const isPick = picked === i;
            let bd = "rgba(214,167,84,.3)", bg = "rgba(255,255,255,.04)";
            if (picked !== null) {
              if (c.good) { bd = C.green; bg = "rgba(127,206,142,.14)"; }
              else if (isPick) { bd = C.red; bg = "rgba(220,100,80,.14)"; }
            }
            return (
              <div key={i} onClick={() => resolve(i, c)} style={{ padding: "10px 12px", marginBottom: 8, borderRadius: 5, border: `1px solid ${bd}`, background: bg, cursor: picked === null ? "pointer" : "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.cream, fontSize: 13.5, fontWeight: 600, flex: 1 }}>{t(c.label)}</span>
                  {picked !== null && <span style={{ fontSize: 11, color: C.mist, whiteSpace: "nowrap" }}>{effLabel(c)}</span>}
                </div>
                {picked !== null && (
                  <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5, color: c.good ? C.green : isPick ? C.amber2 : C.mist }}>{t(c.feedback)}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {picked !== null && (
        <button onClick={nextTask} style={{ width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
          {t({ zh: "下一個狀況 →", en: "Next situation →" })}
        </button>
      )}
      <div style={{ fontSize: 11, color: C.mist, marginTop: 10, textAlign: "center" }}>{t({ zh: "判斷型任務：多數選項各有取捨，回饋說明「為什麼」。", en: "Judgment tasks: most options have trade-offs; feedback explains why." })}</div>
    </div>
  ));
}
