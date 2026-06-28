import { useEffect, useState, type ReactNode } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { Sfx } from "../audio/sfx";
import { toWan } from "../state/game";
import { BUILD_STAGES, BUILD_STAGE_COUNT, BUILD_MAX_SCORE, BUILD_REWARD_BASE, BUILD_REWARD_PER_SCORE, buildGrade } from "../state/construction";

function shell(title: string, onClose: () => void, body: ReactNode) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="wfg-modal-panel" style={{ ...panel, width: 580, maxHeight: 780, overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)" }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>{title}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>
        <div style={{ padding: "14px 16px" }}>{body}</div>
      </div>
    </div>
  );
}

// 階段進度條：每個 phase 一個圓點，完成=綠、目前=金、未到=灰
function PhaseTrack({ stage, done }: { stage: number; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
      {BUILD_STAGES.map((s, i) => {
        const passed = i < stage || done;
        const current = i === stage && !done;
        const col = passed ? C.green : current ? C.gold : "rgba(255,255,255,.18)";
        return (
          <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div title={t(s.title)} style={{ width: "100%", height: 5, borderRadius: 3, background: col }} />
            <span style={{ fontSize: 12, opacity: current ? 1 : passed ? 0.85 : 0.4 }}>{s.icon}</span>
          </div>
        );
      })}
    </div>
  );
}

// 風場建置番外篇短戰役（#1）：帶玩家走一遍 EPC 建置流程，決策影響品質/聲望與成本/工期。
export default function ConstructionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLang();
  const { data, dispatch } = useGame();
  const [pick, setPick] = useState<number | null>(null);
  // 階段推進後清除選擇
  useEffect(() => { setPick(null); }, [data.buildStage, data.buildDone]);
  if (!open) return null;

  const title = `🏗️ ${t({ zh: "風場建置 · 番外篇短戰役", en: "Farm Construction · Side Campaign" })}`;

  // 完工總結
  if (data.buildDone) {
    const grade = buildGrade(data.buildScore);
    const reward = BUILD_REWARD_BASE + Math.max(0, data.buildScore) * BUILD_REWARD_PER_SCORE;
    return shell(title, onClose, (
      <div style={{ textAlign: "center", padding: "10px 6px" }}>
        <div style={{ fontSize: 46, marginBottom: 6 }}>🎉</div>
        <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 20, color: C.cream, marginBottom: 6 }}>{t({ zh: "風場建置完工 · 移交運維！", en: "Farm built & handed over to O&M!" })}</div>
        <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.6, marginBottom: 14 }}>{t({ zh: "從場址調查到試運轉併網，你完整走過一座離岸風場的 EPC 建置流程。", en: "From site survey to grid connection, you've run the full EPC build of an offshore wind farm." })}</div>
        <div style={{ display: "inline-flex", flexDirection: "column", gap: 8, padding: "14px 22px", borderRadius: 8, background: "rgba(127,206,142,.1)", border: "1px solid rgba(127,206,142,.35)", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.mist }}>{t({ zh: "建置品質/聲望", en: "Build quality / reputation" })}</div>
          <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 26, color: C.goldText }}>{data.buildScore} / {BUILD_MAX_SCORE}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{t(grade)}</div>
          <div style={{ fontSize: 12.5, color: C.cream, borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 8 }}>{t({ zh: "完工獎勵", en: "Completion reward" })}：<b style={{ color: C.goldText }}>◎ {toWan(reward)} {t({ zh: "萬", en: "M" })}</b> + 300 XP</div>
        </div>
        <button onClick={() => { Sfx.click(); dispatch({ type: "BUILD_RESET" }); }} style={{ display: "block", width: "100%", padding: "11px 0", borderRadius: 6, border: "1px solid rgba(214,167,84,.5)", background: "rgba(15,40,50,.82)", color: C.cream, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          🔁 {t({ zh: "再建一座（重玩番外篇）", en: "Build another (replay)" })}
        </button>
      </div>
    ));
  }

  const stage = BUILD_STAGES[data.buildStage];
  const chosen = pick !== null ? stage.choices[pick] : null;

  return shell(title, onClose, (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: C.mist }}>{t({ zh: "依工程決策影響品質、成本與工期。沿真實 EPC 流程逐階段推進。", en: "Engineering decisions affect quality, cost & schedule along a real EPC sequence." })}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.goldText, fontWeight: 700 }}>{t({ zh: "品質分", en: "Quality" })} {data.buildScore}</span>
      </div>
      <PhaseTrack stage={data.buildStage} done={data.buildDone} />

      {/* 階段卡 */}
      <div style={{ borderRadius: 8, border: "1px solid rgba(214,167,84,.35)", background: "rgba(255,255,255,.03)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(217,164,65,.14)", borderBottom: "1px solid rgba(214,167,84,.3)" }}>
          <span style={{ fontSize: 17 }}>{stage.icon}</span>
          <span style={{ color: C.cream, fontSize: 14.5, fontWeight: 800, fontFamily: FONT_SERIF }}>{t({ zh: `階段 ${stage.phase}/${BUILD_STAGE_COUNT}`, en: `Phase ${stage.phase}/${BUILD_STAGE_COUNT}` })} · {t(stage.title)}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.mist2, whiteSpace: "nowrap" }}>🚢 {t(stage.vessel)}</span>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ color: C.cream, fontSize: 13.5, lineHeight: 1.6, marginBottom: stage.narration ? 8 : 12 }}>{t(stage.scenario)}</div>
          {stage.narration && <div style={{ fontSize: 12.5, color: C.mist2, fontStyle: "italic", lineHeight: 1.5, marginBottom: 12, paddingLeft: 10, borderLeft: "2px solid rgba(214,167,84,.4)" }}>{t(stage.narration)}</div>}

          {stage.choices.map((c, i) => {
            const isPick = pick === i;
            let bd = "rgba(214,167,84,.3)", bg = "rgba(255,255,255,.04)";
            if (pick !== null) {
              if (c.good) { bd = C.green; bg = "rgba(127,206,142,.14)"; }
              else if (isPick) { bd = C.red; bg = "rgba(220,100,80,.14)"; }
            }
            return (
              <div key={i} onClick={() => { if (pick !== null) return; (c.good ? Sfx.success : Sfx.error)(); setPick(i); }} style={{ padding: "10px 12px", marginBottom: 8, borderRadius: 5, border: `1px solid ${bd}`, background: bg, cursor: pick === null ? "pointer" : "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.cream, fontSize: 13.5, fontWeight: 600, flex: 1 }}>{t(c.label)}</span>
                  <span style={{ fontSize: 11, color: C.mist2, whiteSpace: "nowrap" }}>⏱{c.days}d · ◎{toWan(c.cost)}{t({ zh: "萬", en: "M" })}</span>
                </div>
                {pick !== null && (
                  <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5, color: c.good ? C.green : isPick ? C.amber2 : C.mist }}>
                    {t(c.feedback)} <span style={{ color: c.score >= 0 ? C.green : C.red }}>（{t({ zh: "品質", en: "quality" })} {c.score >= 0 ? "+" : ""}{c.score}）</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {chosen && (
        <button onClick={() => { Sfx.click(); dispatch({ type: "BUILD_RESOLVE", stage: data.buildStage, choiceIdx: pick! }); }} style={{ width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
          {data.buildStage + 1 >= BUILD_STAGE_COUNT ? t({ zh: "完工移交 →", en: "Complete & hand over →" }) : t({ zh: "確認並推進下一階段 →", en: "Confirm & advance →" })}
        </button>
      )}
      <div style={{ fontSize: 11, color: C.mist, marginTop: 10, textAlign: "center" }}>{t({ zh: "工程決策多有取捨：省成本/搶工期常埋下風險。完工後依品質分評等與發獎。", en: "Decisions trade off: cutting cost/time often buries risk. Graded & rewarded by quality at completion." })}</div>
    </div>
  ));
}
