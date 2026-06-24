import { useState } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { useTutorial } from "../state/TutorialContext";
import { Sfx } from "../audio/sfx";
import { COURSE_WEEKS } from "./courseMap";
import { FAULTS } from "./faults";
import { WEEKS_TOTAL, MISSIONS_PER_WEEK } from "../state/course";
import type { Quest } from "../state/game";
import type { I18n } from "../game/systems/types";

function toI18n(v: unknown, fallback: I18n): I18n {
  if (v && typeof v === "object" && "zh" in v && "en" in v) return v as I18n;
  if (typeof v === "string") return { zh: v, en: v };
  return fallback;
}

// 課程模式（#6）：一鍵把某週故障指派為下一筆工單，或匯入自訂任務 JSON。
export default function CourseModal({ open, onClose, week = 1, onSetWeek }: { open: boolean; onClose: () => void; week?: number; onSetWeek?: (w: number) => void }) {
  useLang();
  const { dispatch } = useGame();
  const { start: startTutorial } = useTutorial();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  if (!open) return null;

  const assignWeek = (faultId: string, title: I18n) => {
    Sfx.click();
    const f = FAULTS[faultId];
    const q: Quest = {
      id: "course_" + faultId,
      title,
      brief: { zh: `課程任務：排除「${f ? f.name.zh : faultId}」並回報 SCADA。`, en: `Course task: clear "${f ? f.name.en : faultId}" and report to SCADA.` },
      unit: "課程",
      targetFault: faultId,
      rewardBudget: 150_000,
      rewardXp: 100,
    };
    dispatch({ type: "ASSIGN_QUEST", quest: q });
    onClose();
  };

  const importJson = () => {
    try {
      const o = JSON.parse(text) as Record<string, unknown>;
      const fid = String(o.targetFault ?? "");
      if (!FAULTS[fid]) {
        setErr(t({ zh: `targetFault 無效，須為：${Object.keys(FAULTS).join(", ")}`, en: `Invalid targetFault. Must be one of: ${Object.keys(FAULTS).join(", ")}` }));
        return;
      }
      const q: Quest = {
        id: String(o.id ?? "import_" + fid),
        title: toI18n(o.title, { zh: "匯入任務", en: "Imported Task" }),
        brief: toI18n(o.brief, { zh: "教師臨時指派的維修任務。", en: "Ad-hoc task assigned by the instructor." }),
        unit: String(o.unit ?? "課程"),
        targetFault: fid,
        rewardBudget: Number(o.rewardBudget ?? 150_000),
        rewardXp: Number(o.rewardXp ?? 100),
      };
      Sfx.success();
      dispatch({ type: "ASSIGN_QUEST", quest: q });
      onClose();
    } catch {
      setErr(t({ zh: "JSON 解析失敗，請檢查格式。", en: "Failed to parse JSON." }));
    }
  };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panel, width: 560, maxHeight: 720, overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)" }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>📚 {t({ zh: "課程模式", en: "Course Mode" })}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        <div style={{ padding: "14px 16px" }}>
          {/* 新手教學：重新播放莉莉互動導覽 */}
          <button
            onClick={() => { Sfx.click(); onClose(); startTutorial(); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, background: "rgba(95,168,217,.12)", border: "1px solid rgba(95,168,217,.4)", color: C.cream, cursor: "pointer", marginBottom: 14, textAlign: "left" }}
          >
            <span style={{ fontSize: 20 }}>🎓</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.goldText, fontWeight: 900, fontFamily: FONT_SERIF, fontSize: 14 }}>{t({ zh: "重新播放新手教學", en: "Replay tutorial" })}</div>
              <div style={{ color: C.mist, fontSize: 11.5, marginTop: 2 }}>{t({ zh: "由莉莉手把手帶你走一遍工單流程。", en: "Lily walks you through the work-order loop step by step." })}</div>
            </div>
            <span style={{ color: C.mist2, fontSize: 14 }}>▶</span>
          </button>

          {/* 教師端：目前開放週次（鎖定計分主線；沙盒不受限） */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, background: "rgba(217,164,65,.1)", border: "1px solid rgba(214,167,84,.4)", marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.goldText, fontWeight: 900, fontFamily: FONT_SERIF, fontSize: 14 }}>{t({ zh: "教師 · 開放週次", en: "Instructor · Open week" })}</div>
              <div style={{ color: C.mist, fontSize: 11.5, marginTop: 2 }}>{t({ zh: `目前開放計分主線至第 ${week} 週（每週 ${MISSIONS_PER_WEEK} 關）。沙盒『自由營運中心』不受限。`, en: `Graded campaign open through week ${week} (${MISSIONS_PER_WEEK}/wk). Sandbox is always open.` })}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => { Sfx.click(); onSetWeek?.(Math.max(1, week - 1)); }} style={{ width: 30, height: 30, borderRadius: 5, border: "1px solid rgba(214,167,84,.5)", background: "rgba(15,40,50,.82)", color: C.cream, fontSize: 18, fontWeight: 900, cursor: "pointer" }}>−</button>
              <span style={{ minWidth: 56, textAlign: "center", color: C.goldText, fontWeight: 900, fontFamily: FONT_SERIF, fontSize: 16 }}>{t({ zh: `第 ${week} 週`, en: `Wk ${week}` })}</span>
              <button onClick={() => { Sfx.click(); onSetWeek?.(Math.min(WEEKS_TOTAL, week + 1)); }} style={{ width: 30, height: 30, borderRadius: 5, border: "1px solid rgba(214,167,84,.5)", background: "rgba(15,40,50,.82)", color: C.cream, fontSize: 18, fontWeight: 900, cursor: "pointer" }}>＋</button>
            </div>
          </div>

          <div style={{ fontSize: 12, color: C.mist, marginBottom: 10 }}>{t({ zh: "選一週的主題，一鍵指派為下一筆工單（不影響原本的工單池）。", en: "Pick a week to assign its fault as the next work order (the main pool is untouched)." })}</div>
          {COURSE_WEEKS.map((w) => (
            <div key={w.week} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 5, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.25)", marginBottom: 8 }}>
              <span style={{ width: 64, flex: "none", color: C.goldText, fontWeight: 700, fontFamily: FONT_SERIF, fontSize: 13 }}>{t({ zh: `第 ${w.week} 週`, en: `Week ${w.week}` })}</span>
              <span style={{ flex: 1, color: C.cream, fontSize: 13 }}>{t(w.title)}</span>
              <button onClick={() => assignWeek(w.faultId, w.title)} style={{ padding: "5px 14px", borderRadius: 4, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 12, cursor: "pointer" }}>
                {t({ zh: "指派", en: "Assign" })}
              </button>
            </div>
          ))}

          <div style={{ marginTop: 14, fontSize: 12, color: C.mist, marginBottom: 6 }}>
            {t({ zh: "或臨時匯入自訂任務（JSON）：", en: "Or import a custom task (JSON):" })}
            <span style={{ color: C.mist3 }}> {"{ targetFault, title?, brief?, unit?, rewardBudget?, rewardXp? }"}</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setErr(""); }}
            placeholder={'{ "targetFault": "yaw_misalign", "title": "週五實作：偏航搶修", "unit": "CH-99" }'}
            style={{ width: "100%", height: 84, resize: "vertical", borderRadius: 5, border: "1px solid rgba(214,167,84,.35)", background: "rgba(0,0,0,.3)", color: C.cream, fontFamily: "monospace", fontSize: 12, padding: 8 }}
          />
          {err && <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{err}</div>}
          <button onClick={importJson} style={{ marginTop: 8, width: "100%", padding: "10px 0", borderRadius: 5, border: "1px solid rgba(214,167,84,.5)", background: "rgba(15,40,50,.82)", color: C.cream, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {t({ zh: "匯入並指派", en: "Import & Assign" })}
          </button>
        </div>
      </div>
    </div>
  );
}
