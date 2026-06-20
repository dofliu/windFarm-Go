import { useState, type CSSProperties } from "react";
import { C, FONT_SERIF, primaryBg, panel, panelHeader, panelTitle } from "../tokens";
import { t } from "../../game/systems/i18n";
import { useLang } from "../useLang";
import { AdvisorPopup, Avatar } from "../Portrait";
import { useGame } from "../../state/GameContext";
import { useDialogue } from "../../state/DialogueContext";
import { questAt, FAULTS } from "../faults";
import type { Screen } from "../../App";

function Hotspot({ left, top, label, color, alarm }: { left: number; top: number; label: { zh: string; en: string }; color: string; alarm?: boolean }) {
  const dot = <span style={{ width: alarm ? 13 : 11, height: alarm ? 13 : 11, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, animation: alarm ? "shimmer 1.2s ease-in-out infinite" : undefined }} />;
  const tag = (
    <div style={{ padding: "3px 9px", borderRadius: 3, background: alarm ? "rgba(40,16,14,.92)" : "rgba(12,30,38,.9)", border: `1px solid ${color}`, color: alarm ? C.redText : color === C.green ? "#cdeccf" : color === C.amber ? "#f4e0b4" : "#cdeccf", fontSize: 11, fontWeight: alarm ? 700 : 400, whiteSpace: "nowrap" }}>
      {t(label)}
    </div>
  );
  return (
    <div style={{ position: "absolute", left, top, display: "flex", alignItems: "center", gap: 6, zIndex: 3 }}>
      {alarm ? (<>{dot}{tag}</>) : (<>{tag}{dot}</>)}
    </div>
  );
}

export default function RepairScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  useLang();
  const { data, dispatch } = useGame();
  const { say } = useDialogue();
  const quest = questAt(data.questIndex);
  const fault = FAULTS[quest.targetFault];
  const q = fault.quiz;

  const [pick, setPick] = useState<number | null>(null);
  // 前兩步預設完成；步驟 3~5 可點擊完成
  const [steps, setSteps] = useState<boolean[]>(fault.sop.map((_, i) => i < 2));

  const quizCorrect = pick === q.correct;
  const allSteps = steps.every(Boolean);
  const ready = quizCorrect && allSteps && data.questStage === "active" && !data.repairDone;

  const toggleStep = (i: number) => {
    if (i < 2) return; // 前兩步固定完成
    setSteps((s) => s.map((v, idx) => (idx === i ? !v : v)));
  };

  const finish = () => {
    dispatch({ type: "FINISH_REPAIR", quest });
    say([
      { speaker: "repair_eng", line: { zh: `${quest.unit} 修復完成、已回報 SCADA，幹得漂亮！`, en: `${quest.unit} repaired and reported to SCADA — nicely done!` } },
      { speaker: "narrator_girl", expr: "wink", line: { zh: "工單完成！預算與妥善率都進帳囉，要不要再接下一筆？", en: "Order complete! Budget and availability are up — fancy another?" } },
    ]);
    setScreen("hub");
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
      {/* dusk bg */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "56%", background: "linear-gradient(180deg,#34435e 0%, #5a5d72 38%, #b08a6a 64%, #d8b487 75%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "60%", background: "radial-gradient(circle at 62% 90%, rgba(255,214,160,.7), rgba(255,214,160,0) 42%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "44%", background: "linear-gradient(180deg,#2b5566 0%, #1c4151 40%, #122f3b 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "44%", background: "repeating-linear-gradient(178deg, rgba(255,255,255,.04) 0 2px, rgba(255,255,255,0) 2px 30px)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 40%, rgba(6,16,22,0) 50%, rgba(6,16,22,.55) 100%)", pointerEvents: "none" }} />
      </div>

      {/* turbine schematic */}
      <div style={{ position: "absolute", left: 120, top: 110, width: 430, height: 680 }}>
        <div style={{ position: "absolute", left: 198, top: 472, width: 34, height: 120, background: "linear-gradient(90deg,#3d4a52,#566570,#2c363d)", borderRadius: 3 }} />
        <div style={{ position: "absolute", left: 175, top: 150, width: 80, height: 330, background: "linear-gradient(90deg,#5a6770,#8a98a0 45%,#4a565d)", clipPath: "polygon(40% 0,60% 0,72% 100%,28% 100%)" }} />
        <div style={{ position: "absolute", left: 150, top: 128, width: 130, height: 42, background: "linear-gradient(180deg,#e7edef,#aab7bd)", borderRadius: "10px 16px 16px 10px", boxShadow: "0 4px 10px rgba(0,0,0,.3)" }} />
        <div style={{ position: "absolute", left: 138, top: 135, width: 26, height: 26, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%,#f2f6f7,#9aa8ae)", border: "1px solid #7d8b91", zIndex: 2 }} />
        <div style={{ position: "absolute", left: 151, top: 148, width: 0, height: 0, animation: "spin 16s linear infinite", zIndex: 1 }}>
          {[0, 120, 240].map((d) => (
            <div key={d} style={{ position: "absolute", left: -8, top: 0, width: 16, height: 160, background: "linear-gradient(180deg,#eef3f4,#aebbc0)", clipPath: "polygon(22% 0,78% 0,56% 100%,44% 100%)", transformOrigin: "8px 0", transform: `rotate(${d}deg)` }} />
          ))}
        </div>
        <Hotspot left={96} top={128} label={{ zh: "變槳系統 · 正常", en: "Pitch · OK" }} color={C.green} />
        <Hotspot left={286} top={118} label={fault.name} color={C.red} alarm />
        <Hotspot left={286} top={152} label={{ zh: "發電機 · 注意", en: "Generator · Watch" }} color={C.amber} />
        <Hotspot left={262} top={196} label={{ zh: "偏航系統 · 正常", en: "Yaw · OK" }} color={C.green} />
        <Hotspot left={262} top={320} label={{ zh: "塔筒結構 · 正常", en: "Tower · OK" }} color={C.green} />
        <Hotspot left={248} top={500} label={{ zh: "基礎/海纜 · 正常", en: "Foundation · OK" }} color={C.green} />
      </div>

      {/* left bottom cards */}
      <div style={{ position: "absolute", left: 40, bottom: 28, width: 300, display: "flex", gap: 12 }}>
        <div style={{ ...panel, flex: 1, padding: "12px 14px", borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: C.mist }}>{t({ zh: "機組妥善率", en: "Availability" })}</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: C.amber2, fontFamily: FONT_SERIF, lineHeight: 1.1 }}>
            {data.availability}<span style={{ fontSize: 15 }}>%</span>
          </div>
          <div style={{ marginTop: 6, height: 6, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
            <div style={{ width: `${data.availability}%`, height: "100%", background: "linear-gradient(90deg,#e89a5b,#cf6b3a)" }} />
          </div>
        </div>
        <div style={{ ...panel, flex: 1, padding: "12px 14px", borderRadius: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Avatar id="safety_officer" size={22} />
            <span style={{ fontSize: 11, color: C.mist }}>{t({ zh: "作業安全窗", en: "Work Window" })}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: C.greenBright, boxShadow: `0 0 8px ${C.greenBright}` }} />
            <span style={{ fontSize: 17, fontWeight: 900, color: C.greenLight, fontFamily: FONT_SERIF }}>{t({ zh: "可作業", en: "Workable" })}</span>
          </div>
          <div style={{ fontSize: 11, color: C.mist, marginTop: 6 }}>{t({ zh: "浪高 1.2m · 風速 8m/s", en: "1.2m · 8m/s" })}</div>
        </div>
      </div>

      {/* right column */}
      <div style={{ position: "absolute", right: 26, top: 92, bottom: 28, width: 392, display: "flex", flexDirection: "column", gap: 13 }}>
        {/* SCADA alarm */}
        <div style={{ ...panel, border: "1px solid rgba(220,100,80,.5)", boxShadow: "0 12px 30px rgba(0,0,0,.45)" }}>
          <div style={{ ...panelHeader, background: "linear-gradient(180deg, rgba(220,100,80,.25), rgba(220,100,80,.06))", borderBottom: "1px solid rgba(220,100,80,.4)" }}>
            <Avatar id="scada_eng" size={26} />
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.red, boxShadow: `0 0 8px ${C.red}`, animation: "shimmer 1.2s ease-in-out infinite" }} />
            <span style={panelTitle}>{t({ zh: "SCADA 即時告警", en: "SCADA Live Alarms" })}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: C.mist }}>{quest.unit} · 14:32</span>
          </div>
          <div style={{ padding: "11px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ padding: "3px 8px", borderRadius: 3, background: C.red, color: "#fff", fontSize: 11, fontWeight: 700 }}>{t({ zh: "嚴重", en: "CRIT" })}</span>
              <span style={{ color: C.cream, fontSize: 14, fontWeight: 700 }}>{t(fault.severityTemp)}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 9 }}>
              {fault.warns.map((w, i) => (
                <span key={i} style={{ padding: "3px 8px", borderRadius: 3, background: "rgba(227,173,66,.16)", border: "1px solid rgba(227,173,66,.4)", color: "#f4e0b4", fontSize: 11, whiteSpace: "nowrap" }}>{t(w)}</span>
              ))}
            </div>
          </div>
        </div>

        {/* quiz */}
        <div style={{ ...panel, boxShadow: "0 12px 30px rgba(0,0,0,.45)" }}>
          <div style={panelHeader}>
            <Avatar id="elec_eng" size={26} />
            <span style={panelTitle}>{t({ zh: "故障診斷 · 隨堂測驗", en: "Diagnosis · Quiz" })}</span>
          </div>
          <div style={{ padding: "13px 14px" }}>
            <div style={{ color: C.cream, fontSize: 14, fontWeight: 700, lineHeight: 1.5, marginBottom: 11 }}>{t(q.question)}</div>
            {q.options.map((opt, i) => {
              let bd = "rgba(214,167,84,.3)", bg = "rgba(255,255,255,.04)", col = "#e4eef0";
              if (pick !== null) {
                if (i === q.correct) { bd = C.green; bg = "rgba(127,206,142,.16)"; col = "#cdeccf"; }
                else if (i === pick) { bd = C.red; bg = "rgba(220,100,80,.16)"; col = C.redText; }
                else { col = "#7f97a0"; }
              }
              const s: CSSProperties = { display: "block", width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 8, borderRadius: 4, border: `1px solid ${bd}`, background: bg, color: col, fontSize: 13.5, fontWeight: 500, cursor: "pointer" };
              return (<div key={i} onClick={() => setPick(i)} style={s}>{t(opt)}</div>);
            })}
            <div style={{ minHeight: 18, marginTop: 4, fontSize: 12.5, lineHeight: 1.5, color: pick === null ? C.mist : quizCorrect ? C.green : C.amber2 }}>
              {pick === null ? "" : t(quizCorrect ? q.ok : q.no)}
            </div>
          </div>
        </div>

        {/* SOP checklist (interactive) */}
        <div style={{ ...panel, flex: 1, boxShadow: "0 12px 30px rgba(0,0,0,.45)", display: "flex", flexDirection: "column" }}>
          <div style={panelHeader}>
            <span style={panelTitle}>{t({ zh: "維修 SOP 作業步驟", en: "Repair SOP Steps" })}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: C.mist }}>{steps.filter(Boolean).length}/{steps.length}</span>
          </div>
          <div style={{ padding: "9px 14px", flex: 1 }}>
            {fault.sop.map((step, i) => {
              const done = steps[i];
              const fixed = i < 2;
              const box = done
                ? { background: C.green, color: "#0f2630", border: "none" as const, content: "✓" }
                : { background: "rgba(255,255,255,.08)", color: C.mist, border: "1px solid rgba(255,255,255,.2)", content: String(i + 1) };
              return (
                <div key={i} onClick={() => toggleStep(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: fixed ? "default" : "pointer" }}>
                  <span style={{ width: 18, height: 18, flex: "none", borderRadius: 4, background: box.background, color: box.color, border: box.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: done ? 12 : 11, fontWeight: 900 }}>{box.content}</span>
                  <span style={{ fontSize: 13, color: done ? C.mist3 : C.cream, fontWeight: done ? 400 : 700, textDecoration: done ? "line-through" : "none" }}>{t(step)}</span>
                </div>
              );
            })}
          </div>
          {/* 完成/結算按鈕（A3） */}
          <div style={{ padding: "0 14px 14px" }}>
            {data.questStage !== "active" ? (
              <div style={{ textAlign: "center", fontSize: 12, color: C.mist }}>{t({ zh: "（請先在母港接單）", en: "(Accept an order in port first)" })}</div>
            ) : (
              <button
                disabled={!ready}
                onClick={finish}
                style={{ width: "100%", padding: "11px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: ready ? primaryBg() : "rgba(255,255,255,.08)", color: ready ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 15, letterSpacing: ".08em", cursor: ready ? "pointer" : "not-allowed" }}
              >
                {t({ zh: "回報 SCADA · 完成維修", en: "Report SCADA · Finish" })}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 維修工程師側邊跳出告警 */}
      <AdvisorPopup
        id="repair_eng"
        line={{ zh: "主機有異常震動！先答對診斷題、完成 SOP 再回報！", en: "Abnormal vibration! Answer the quiz, finish the SOP, then report!" }}
        style={{ left: 372, bottom: 12 }}
        portraitH={300}
        bubbleSide="left"
      />
    </div>
  );
}
