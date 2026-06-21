import { useState, type CSSProperties } from "react";
import { C, FONT_SERIF, primaryBg, panel, panelHeader, panelTitle } from "../tokens";
import { t } from "../../game/systems/i18n";
import { useLang } from "../useLang";
import { AdvisorPopup, Avatar } from "../Portrait";
import { useGame } from "../../state/GameContext";
import { useDialogue } from "../../state/DialogueContext";
import { S } from "../../i18n/strings";
import { Sfx } from "../../audio/sfx";
import { exprUrl } from "../characters";
import { FAULTS, LOCATION_LABEL, locationOf, isMajorFault } from "../faults";
import RepairScene from "../RepairScene";
import { vesselWindowPenalty } from "../../state/game";
import Vessel, { vesselTypeOf } from "../Vessel";
import { PARTS } from "../data";
import { missionAt } from "../campaign";
import type { Screen } from "../../App";

export default function RepairScreen({ setScreen, mode = "sim" }: { setScreen: (s: Screen) => void; mode?: "sim" | "real" | "comic" }) {
  useLang();
  const { data, dispatch } = useGame();
  const { say } = useDialogue();
  const quest = data.customQuest ?? missionAt(data.campaignIndex);
  const fault = FAULTS[quest.targetFault] ?? FAULTS.gearbox_overheat;
  const q = fault.quiz;

  const [pick, setPick] = useState<number | null>(null);
  // 前兩步預設完成；步驟 3~5 可點擊完成
  const [steps, setSteps] = useState<boolean[]>(fault.sop.map((_, i) => i < 2));
  // 作業窗（#17）：海象越差，可用時段越少；船隊升級加窗；船舶磨耗扣窗（#7）
  const windowMax = Math.max(4, (data.seaState === "closed" ? 6 : data.seaState === "caution" ? 8 : 10) + data.vesselLevel * 2 - vesselWindowPenalty(data.vesselWear));
  const [win, setWin] = useState(windowMax);

  // #33 登船事件 + 作業地點
  const location = locationOf(fault.id);
  const fleetType = isMajorFault(fault.id) ? "jackup" : vesselTypeOf(data.ownsSOV);
  const roughBoarding = data.seaState !== "workable"; // 浪高 → 登船延誤
  const [boarded, setBoarded] = useState(false);

  const need = fault.part; // 必備備品
  const needPart = PARTS.find((p) => p.id === need);
  const hasPart = (data.inventory[need] ?? 0) > 0;

  const quizCorrect = pick === q.correct;
  const allSteps = steps.every(Boolean);
  const complete = quizCorrect && allSteps;
  const failed = win <= 0 && !complete; // 窗內未完成 → 撤離
  const ready = complete && hasPart && data.questStage === "active" && !data.repairDone && !failed;

  const spend = (c: number) => setWin((w) => Math.max(0, w - c));

  const completeStep = (i: number) => {
    if (i < 2 || steps[i] || failed) return; // 前兩步固定、已完成、已撤離不可再動
    setSteps((s) => s.map((v, idx) => (idx === i ? true : v)));
    spend(Math.max(1, 2 - data.toolLevel)); // 工坊升級降低每步耗時
  };

  const retreat = () => {
    Sfx.error();
    dispatch({ type: "FAIL_REPAIR" });
    say({ speaker: "veteran_sailor", line: { zh: "海象變差、作業窗關了！先撤離，擇日再來。", en: "Weather's turned — window's shut. Retreat and try another day." } });
    setScreen("hub");
  };

  // #33 登船 / 返航改期
  const board = () => {
    Sfx.click();
    if (roughBoarding) setWin((w) => Math.max(3, w - 3)); // 登船延誤：耗去部分作業窗
    setBoarded(true);
  };
  const abortBoarding = () => {
    Sfx.error();
    dispatch({ type: "FAIL_REPAIR" }); // 返航改期：回辦公室、可用率小扣
    say({ speaker: "veteran_sailor", line: { zh: "浪太大、登船風險高，先返航改期吧。", en: "Seas too rough to board safely — return and reschedule." } });
    setScreen("sail");
  };

  const finish = () => {
    // 重大故障（大組件更換）：拆檢完成後轉入多回合大修（#4），需於母港逐日推進
    if (isMajorFault(fault.id)) {
      Sfx.success();
      dispatch({ type: "START_OVERHAUL", quest, part: need, discipline: fault.discipline });
      say([
        { speaker: "repair_eng", expr: "confident", line: { zh: `${quest.unit} 拆檢完成、大組件已定位。接下來要吊裝更換，需連續 ${3} 個可作業天氣窗。`, en: `${quest.unit} stripped down and the major component is located. The swap needs ${3} consecutive workable weather windows.` } },
        { speaker: "veteran_sailor", expr: "talking", line: { zh: "回母港看三日預報、逐日推進大修。惡劣海象只能停滯，安裝船還是得付待命費！", en: "Back to port — watch the 3-day forecast and push the overhaul daily. Bad weather only stalls it, and the jack-up still bills standby!" } },
      ]);
      setScreen("hub");
      return;
    }
    Sfx.success();
    dispatch({ type: "FINISH_REPAIR", quest, part: need, discipline: fault.discipline });
    const m = data.customQuest ? null : missionAt(data.campaignIndex);
    say(
      m
        ? m.outro
        : [
            { speaker: "repair_eng", expr: "confident", line: { zh: `${quest.unit} 修復完成、已回報 SCADA，幹得漂亮！`, en: `${quest.unit} repaired and reported to SCADA — nicely done!` } },
            { speaker: "narrator_girl", expr: "wink", line: { zh: "工單完成！預算與妥善率都進帳囉，要不要再接下一筆？", en: "Order complete! Budget & availability up — fancy another?" } },
          ]
    );
    setScreen("hub");
  };

  // #25 出勤就緒閘門：未抵達機組不可維修
  if (data.jobPhase !== "onsite") {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#34435e 0%,#5a5d72 38%,#1c4151 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...panel, padding: "26px 30px", textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 900, color: C.cream, marginBottom: 8 }}>{t({ zh: "尚未出勤抵達機組", en: "Not on site yet" })}</div>
            <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.6, marginBottom: 16 }}>{t({ zh: "維修需先在「出海航行」完成出勤就緒檢查並航行抵達機組。", en: "Complete the mobilization check in Set Sail and travel to the unit before repairing." })}</div>
            <button onClick={() => setScreen("sail")} style={{ padding: "10px 24px", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
              {t({ zh: "前往出海航行", en: "Go to Set Sail" })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // #33 登船事件：抵達後、開工前的登船場景（浪高可能延誤）
  if (!boarded) {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#3a4a63 0%, #587089 40%, #2a6173 70%, #143f4c 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", background: "repeating-linear-gradient(178deg, rgba(255,255,255,.05) 0 2px, rgba(255,255,255,0) 2px 26px)" }} />
        {/* 風機基礎（登船平台） */}
        <div style={{ position: "absolute", left: "50%", bottom: "30%", transform: "translateX(-50%)", width: 40, height: 260, background: "linear-gradient(90deg,#c9a23a,#e8c45a 50%,#a8801f)", borderRadius: 3, opacity: 0.92 }} />
        <div style={{ position: "absolute", left: "calc(50% - 70px)", bottom: "31%", width: 140, height: 16, background: "#caa83e", borderRadius: 2 }} />
        {/* 登靠船隻（依船型）隨浪起伏 */}
        <div style={{ position: "absolute", left: "calc(50% - 150px)", bottom: "24%", transform: "scale(1.3)", animation: roughBoarding ? "bob 1.1s ease-in-out infinite" : "bob 3.2s ease-in-out infinite" }}>
          <Vessel type={fleetType} />
        </div>

        <div style={{ position: "absolute", right: 26, top: 92, width: 360 }}>
          <div style={{ ...panel }}>
            <div style={{ ...panelHeader }}>
              <span style={panelTitle}>{t({ zh: "登船登塔", en: "Boarding" })}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: C.goldText }}>{quest.unit} · {t(LOCATION_LABEL[location])}</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 13, color: C.mist, marginBottom: 4 }}>{t({ zh: "海象", en: "Sea" })}：<span style={{ color: roughBoarding ? C.amber2 : C.green, fontWeight: 700 }}>{t(S.status[data.seaState])}</span></div>
              <div style={{ fontSize: 13.5, color: C.cream, lineHeight: 1.6, marginBottom: 14 }}>
                {roughBoarding
                  ? t({ zh: "浪高使船隻上下起伏，登船困難、需抓準浪間空檔——登船延誤將耗去部分作業窗。", en: "Swell makes the vessel heave; boarding is hard and timing the gap costs part of the work window." })
                  : t({ zh: "海象平穩，可安全登船，前往作業地點。", en: "Calm seas — board safely and proceed to the work area." })}
              </div>
              <div style={{ fontSize: 12, color: C.mist, marginBottom: 12 }}>{t({ zh: "作業地點", en: "Work area" })}：<b style={{ color: C.cream }}>{t(LOCATION_LABEL[location])}</b></div>
              <button onClick={board} style={{ width: "100%", padding: "12px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
                {roughBoarding ? t({ zh: "頂浪登船（延誤 −3 時段）", en: "Board in swell (−3 slots)" }) : t({ zh: "登船登塔，開始作業", en: "Board & start work" })}
              </button>
              {roughBoarding && (
                <button onClick={abortBoarding} style={{ width: "100%", marginTop: 8, padding: "9px 0", borderRadius: 6, border: "1px solid rgba(220,100,80,.5)", background: "rgba(220,100,80,.14)", color: C.redText, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {t({ zh: "返航改期（可用率小扣）", en: "Return & reschedule (avail. penalty)" })}
                </button>
              )}
            </div>
          </div>
        </div>

        <AdvisorPopup id="veteran_sailor" src={exprUrl("veteran_sailor", roughBoarding ? "alert" : "talking")} line={roughBoarding ? { zh: "抓浪間空檔上！手要穩，別硬跳。", en: "Step across on the lull — steady, don't jump." } : { zh: "海面平穩，登船吧。", en: "Calm water — let's board." }} style={{ left: 372, bottom: 12 }} portraitH={300} bubbleSide="left" />
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
      {/* 模擬模式：CSS 黃昏背景＋地點機械場景；實境/漫畫由背景圖呈現 */}
      {mode === "sim" && (
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "56%", background: "linear-gradient(180deg,#34435e 0%, #5a5d72 38%, #b08a6a 64%, #d8b487 75%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "60%", background: "radial-gradient(circle at 62% 90%, rgba(255,214,160,.7), rgba(255,214,160,0) 42%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "44%", background: "linear-gradient(180deg,#2b5566 0%, #1c4151 40%, #122f3b 100%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "44%", background: "repeating-linear-gradient(178deg, rgba(255,255,255,.04) 0 2px, rgba(255,255,255,0) 2px 30px)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 40%, rgba(6,16,22,0) 50%, rgba(6,16,22,.55) 100%)", pointerEvents: "none" }} />
        </div>
      )}

      {/* 作業地點標籤（#33） */}
      <div style={{ position: "absolute", left: 40, top: 92, padding: "7px 14px", borderRadius: 20, background: "rgba(10,28,36,.75)", border: "1px solid rgba(214,167,84,.4)", color: C.cream, fontSize: 13, fontWeight: 700, zIndex: 3 }}>
        <span style={{ color: C.gold }}>📍</span> {t({ zh: "作業地點", en: "Work area" })}：{t(LOCATION_LABEL[location])} · {quest.unit}
      </div>

      {/* 依作業地點變化的場景（#5）：機艙內/塔架內/輪轂/甲板（僅模擬模式） */}
      {mode === "sim" && <RepairScene location={location} alarm={fault.name} />}

      {/* left bottom cards */}
      <div style={{ position: "absolute", left: 40, bottom: 28, width: 300, display: "flex", gap: 12 }}>
        <div style={{ ...panel, flex: 1, padding: "12px 14px", borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: C.mist }}>{t(S.panel.availability)}</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: C.amber2, fontFamily: FONT_SERIF, lineHeight: 1.1 }}>
            {data.availability}<span style={{ fontSize: 15 }}>%</span>
          </div>
          <div style={{ marginTop: 6, height: 6, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
            <div style={{ width: `${data.availability}%`, height: "100%", background: "linear-gradient(90deg,#e89a5b,#cf6b3a)" }} />
          </div>
        </div>
        <div style={{ ...panel, flex: 1, padding: "12px 14px", borderRadius: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Avatar id="safety_officer" src={exprUrl("safety_officer", "neutral")} size={22} headShot />
            <span style={{ fontSize: 11, color: C.mist }}>{t(S.panel.workWindow)}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: C.mist }}>{t({ zh: "海象", en: "Sea" })}: {t(S.status[data.seaState])}</span>
          </div>
          {(() => {
            const pct = (win / windowMax) * 100;
            const col = failed ? C.red : pct > 40 ? C.greenBright : C.amber;
            return (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: col, fontFamily: FONT_SERIF }}>{win}</span>
                  <span style={{ fontSize: 12, color: C.mist }}>/ {windowMax} {t({ zh: "時段", en: "slots" })}</span>
                </div>
                <div style={{ marginTop: 6, height: 6, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: col, transition: "width .2s" }} />
                </div>
                <div style={{ fontSize: 11, color: failed ? C.red : C.mist, marginTop: 6 }}>
                  {failed ? t({ zh: "⚠ 作業窗已關閉", en: "⚠ Window closed" }) : t({ zh: "答錯 / 每步驟會消耗作業窗", en: "Wrong answers & each step cost time" })}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* right column */}
      <div style={{ position: "absolute", right: 26, top: 92, bottom: 28, width: 392, display: "flex", flexDirection: "column", gap: 13 }}>
        {/* SCADA alarm */}
        <div style={{ ...panel, border: "1px solid rgba(220,100,80,.5)", boxShadow: "0 12px 30px rgba(0,0,0,.45)" }}>
          <div style={{ ...panelHeader, background: "linear-gradient(180deg, rgba(220,100,80,.25), rgba(220,100,80,.06))", borderBottom: "1px solid rgba(220,100,80,.4)" }}>
            <Avatar id="scada_eng" src={exprUrl("scada_eng", "neutral")} size={26} headShot />
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.red, boxShadow: `0 0 8px ${C.red}`, animation: "shimmer 1.2s ease-in-out infinite" }} />
            <span style={panelTitle}>{t(S.panel.scada)}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: C.mist }}>{quest.unit} · 14:32</span>
          </div>
          <div style={{ padding: "11px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ padding: "3px 8px", borderRadius: 3, background: C.red, color: "#fff", fontSize: 11, fontWeight: 700 }}>{t(S.status.crit)}</span>
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
            <Avatar id="elec_eng" src={exprUrl("elec_eng", "neutral")} size={26} headShot />
            <span style={panelTitle}>{t(S.panel.quiz)}</span>
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
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (pick !== null || failed) return;
                    (i === q.correct ? Sfx.success : Sfx.error)();
                    spend(i === q.correct ? 1 : 3); // 答錯多耗作業窗
                    setPick(i);
                  }}
                  style={s}
                >
                  {t(opt)}
                </div>
              );
            })}
            <div style={{ minHeight: 18, marginTop: 4, fontSize: 12.5, lineHeight: 1.5, color: pick === null ? C.mist : quizCorrect ? C.green : C.amber2 }}>
              {pick === null ? "" : t(quizCorrect ? q.ok : q.no)}
            </div>
          </div>
        </div>

        {/* SOP checklist (interactive) */}
        <div style={{ ...panel, flex: 1, boxShadow: "0 12px 30px rgba(0,0,0,.45)", display: "flex", flexDirection: "column" }}>
          <div style={panelHeader}>
            <span style={panelTitle}>{t(S.panel.sop)}</span>
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
                <div key={i} onClick={() => completeStep(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: fixed || done ? "default" : "pointer" }}>
                  <span style={{ width: 18, height: 18, flex: "none", borderRadius: 4, background: box.background, color: box.color, border: box.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: done ? 12 : 11, fontWeight: 900 }}>{box.content}</span>
                  <span style={{ fontSize: 13, color: done ? C.mist3 : C.cream, fontWeight: done ? 400 : 700, textDecoration: done ? "line-through" : "none" }}>{t(step)}</span>
                </div>
              );
            })}
          </div>
          {/* 完成/結算按鈕（A3） */}
          <div style={{ padding: "0 14px 14px" }}>
            {data.questStage === "active" && !failed && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12, color: hasPart ? C.green : C.amber2 }}>
                <span>{hasPart ? "✔" : "✖"}</span>
                <span>{t({ zh: "必備備品", en: "Required part" })}：{t(needPart?.n ?? { zh: need, en: need })}</span>
                {!hasPart && <span style={{ color: C.mist }}>（{t({ zh: "去交易所購買", en: "buy at Market" })}）</span>}
              </div>
            )}
            {data.questStage !== "active" ? (
              <div style={{ textAlign: "center", fontSize: 12, color: C.mist }}>{t({ zh: "（請先在母港接單）", en: "(Accept an order in port first)" })}</div>
            ) : failed ? (
              <button
                onClick={retreat}
                style={{ width: "100%", padding: "11px 0", borderRadius: 6, border: "1px solid rgba(220,100,80,.6)", background: "rgba(220,100,80,.18)", color: C.redText, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 15, letterSpacing: ".06em", cursor: "pointer" }}
              >
                🌧️ {t({ zh: "天氣窗關閉 · 撤離", en: "Window closed · Retreat" })}
              </button>
            ) : (
              <button
                disabled={!ready}
                onClick={finish}
                style={{ width: "100%", padding: "11px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: ready ? primaryBg() : "rgba(255,255,255,.08)", color: ready ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 15, letterSpacing: ".08em", cursor: ready ? "pointer" : "not-allowed" }}
              >
                {isMajorFault(fault.id) ? t({ zh: "拆檢完成 · 啟動大修", en: "Stripdown done · Start overhaul" }) : t(S.btn.finishRepair)}
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
