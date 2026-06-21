import type { ReactNode } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { toWan } from "../state/game";
import { Sfx } from "../audio/sfx";
import { FAULTS } from "./faults";
import type { I18n } from "../game/systems/types";

export type Facility = "vessel" | "tech" | "tool" | "codex" | "ranking";

const UPGRADES: Record<"vessel" | "tech" | "tool", { icon: string; title: I18n; field: "vesselLevel" | "techLevel" | "toolLevel"; effect: I18n }> = {
  vessel: { icon: "🚢", title: { zh: "CTV 整備廠 · 船隊升級", en: "CTV Yard · Fleet Upgrade" }, field: "vesselLevel", effect: { zh: "每級 +2 作業窗（更耐海象）", en: "+2 work-window slots per level" } },
  tech: { icon: "👷", title: { zh: "技師公會 · 訓練", en: "Tech Guild · Training" }, field: "techLevel", effect: { zh: "每級 +2 妥善率回復、+2 技師", en: "+2 availability gain & +2 techs per level" } },
  tool: { icon: "🛠", title: { zh: "機具工坊 · 工具升級", en: "Workshop · Tool Upgrade" }, field: "toolLevel", effect: { zh: "每級 SOP 每步驟 -1 時段", en: "-1 slot per SOP step per level" } },
};

function shell(title: string, onClose: () => void, body: ReactNode, width = 520) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panel, width, maxHeight: 720, overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)" }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>{title}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>
        <div style={{ padding: "14px 16px" }}>{body}</div>
      </div>
    </div>
  );
}

export default function FacilityModal({ kind, onClose }: { kind: Facility | null; onClose: () => void }) {
  useLang();
  const { data, dispatch } = useGame();
  if (!kind) return null;

  if (kind === "vessel" || kind === "tech" || kind === "tool") {
    const u = UPGRADES[kind];
    const level = data[u.field];
    const cost = (level + 1) * 1_000_000; // ◎；= (level+1)*100萬
    const can = data.budget >= cost;
    return shell(
      `${u.icon} ${t(u.title)}`,
      onClose,
      <>
        <div style={{ fontSize: 14, color: C.cream, marginBottom: 6 }}>{t({ zh: "目前等級", en: "Level" })}：<span style={{ color: C.goldText, fontWeight: 900 }}>Lv.{level}</span></div>
        <div style={{ fontSize: 13, color: C.mist, marginBottom: 14 }}>{t(u.effect)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: C.mist }}>{t({ zh: "升級費用", en: "Cost" })}：◎ {toWan(cost)} {t({ zh: "萬", en: "M" })}</span>
          <button
            disabled={!can}
            onClick={() => { Sfx.cash(); dispatch({ type: "UPGRADE", kind, cost }); }}
            style={{ marginLeft: "auto", padding: "9px 22px", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: can ? primaryBg() : "rgba(255,255,255,.08)", color: can ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 14, cursor: can ? "pointer" : "not-allowed" }}
          >
            {t({ zh: "升級", en: "Upgrade" })} → Lv.{level + 1}
          </button>
        </div>
      </>
    );
  }

  if (kind === "codex") {
    return shell(
      `📖 ${t({ zh: "故障圖鑑", en: "Fault Codex" })}`,
      onClose,
      <div>
        <div style={{ fontSize: 12, color: C.mist, marginBottom: 10 }}>{t({ zh: "完成維修後解鎖該故障的排查知識。", en: "Complete a repair to unlock that fault's diagnosis knowledge." })}</div>
        {Object.values(FAULTS).map((f) => {
          const seen = data.seenFaults.includes(f.id);
          return (
            <div key={f.id} style={{ padding: "9px 10px", borderRadius: 5, background: "rgba(255,255,255,.04)", border: `1px solid ${seen ? "rgba(127,206,142,.4)" : "rgba(214,167,84,.2)"}`, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: seen ? C.green : C.mist, fontWeight: 700 }}>{seen ? "✓" : "🔒"}</span>
                <span style={{ color: C.cream, fontSize: 14, fontWeight: 700, fontFamily: FONT_SERIF }}>{t(f.name)}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: C.mist }}>{f.knowledge_point}</span>
              </div>
              {seen && <div style={{ fontSize: 12, color: C.mist, marginTop: 5, lineHeight: 1.5 }}>{t(f.quiz.ok)}</div>}
            </div>
          );
        })}
      </div>,
      560
    );
  }

  // ranking
  const score = data.availability * 10 + data.missionsDone * 50 + data.xp;
  const rows: [I18n, string][] = [
    [{ zh: "綜合評分", en: "Score" }, String(score)],
    [{ zh: "機組妥善率", en: "Availability" }, `${data.availability}%`],
    [{ zh: "完成任務", en: "Missions done" }, String(data.missionsDone)],
    [{ zh: "資歷", en: "XP" }, String(data.xp)],
    [{ zh: "預算", en: "Budget" }, `◎ ${toWan(data.budget)} 萬`],
    [{ zh: "天數", en: "Day" }, String(data.day)],
  ];
  return shell(
    `🏆 ${t({ zh: "績效排行", en: "Ranking" })}`,
    onClose,
    <div>
      {rows.map(([label, val], i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 4px", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: i === 0 ? 16 : 14 }}>
          <span style={{ color: i === 0 ? C.goldText : C.mist, fontWeight: i === 0 ? 900 : 400, fontFamily: i === 0 ? FONT_SERIF : undefined }}>{t(label)}</span>
          <span style={{ color: i === 0 ? C.goldText : C.cream, fontWeight: i === 0 ? 900 : 700, fontVariantNumeric: "tabular-nums" }}>{val}</span>
        </div>
      ))}
      <div style={{ fontSize: 11, color: C.mist, marginTop: 10 }}>{t({ zh: "（班級雲端排行待登入系統；目前為本機）", en: "(Cloud leaderboard pending login; local for now)" })}</div>
    </div>
  );
}
