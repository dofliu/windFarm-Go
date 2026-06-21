import { useState, type ReactNode } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { Sfx } from "../audio/sfx";
import { CAT_LABEL, generateTask, type TaskChoice, type TaskInstance } from "../state/tasks";

const CAT_COLOR: Record<string, string> = { A: "#dc6450", B: "#5fa8d9", C: "#7fce8e", D: "#e3ad42", E: "#b08adf", F: "#e89a5b", G: "#d98ac0" };

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
  const { dispatch } = useGame();
  const [task, setTask] = useState<TaskInstance>(() => generateTask());
  const [picked, setPicked] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  if (!open) return null;

  const tpl = task.template;
  const resolve = (ci: number, c: TaskChoice) => {
    if (picked !== null) return;
    (c.good ? Sfx.success : Sfx.error)();
    setPicked(ci);
    dispatch({ type: "RESOLVE_TASK", dAvail: c.eff.a ?? 0, dBudget: c.eff.b ?? 0, dSafety: c.eff.s ?? 0, dGen: c.eff.g ?? 0, xp: tpl.xp });
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

      {/* 任務卡 */}
      <div style={{ borderRadius: 8, border: `1px solid ${CAT_COLOR[tpl.cat]}55`, background: "rgba(255,255,255,.03)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: `${CAT_COLOR[tpl.cat]}22`, borderBottom: `1px solid ${CAT_COLOR[tpl.cat]}44` }}>
          <span style={{ padding: "2px 8px", borderRadius: 3, background: CAT_COLOR[tpl.cat], color: "#10222b", fontSize: 11, fontWeight: 900 }}>{tpl.cat} · {t(CAT_LABEL[tpl.cat])}</span>
          <span style={{ color: C.cream, fontSize: 14, fontWeight: 700 }}>{t(tpl.title)}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.mist }}>{task.unit}</span>
        </div>
        <div style={{ padding: "12px 14px" }}>
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
