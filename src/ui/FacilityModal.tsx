import { useState, type ReactNode } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { toWan, type Discipline, type Engineer } from "../state/game";
import { Sfx } from "../audio/sfx";
import { FAULTS } from "./faults";
import { DISC } from "./disc";
import type { I18n } from "../game/systems/types";

export type Facility = "vessel" | "tech" | "tool" | "codex" | "ranking";

const NAMES = ["阿傑", "小林", "志明", "美玲", "建宏", "淑芬", "俊傑", "雅婷", "宗翰", "怡君"];
const DISCS: Discipline[] = ["mechanical", "electrical", "control", "structural", "hse"];
function genCandidates(): Engineer[] {
  return Array.from({ length: 3 }, () => ({
    id: "c" + Math.floor(Math.random() * 1e9),
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    discipline: DISCS[Math.floor(Math.random() * DISCS.length)],
    level: 1 + Math.floor(Math.random() * 2),
  }));
}
const hireFee = (e: Engineer) => e.level * 3_000_000; // 300萬 * 等級

function shell(title: string, onClose: () => void, body: ReactNode, width = 540) {
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
  const [cands, setCands] = useState<Engineer[]>(genCandidates);
  if (!kind) return null;

  // 機具工坊（工具升級）
  if (kind === "tool") {
    const cost = (data.toolLevel + 1) * 1_000_000;
    const can = data.budget >= cost;
    return shell(`🛠 ${t({ zh: "機具工坊 · 工具升級", en: "Workshop · Tool Upgrade" })}`, onClose, (
      <>
        <div style={{ fontSize: 14, color: C.cream, marginBottom: 6 }}>{t({ zh: "目前等級", en: "Level" })}：<span style={{ color: C.goldText, fontWeight: 900 }}>Lv.{data.toolLevel}</span></div>
        <div style={{ fontSize: 13, color: C.mist, marginBottom: 14 }}>{t({ zh: "每級：SOP 每步驟 -1 時段（最低 1）", en: "-1 slot per SOP step per level" })}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: C.mist }}>{t({ zh: "費用", en: "Cost" })}：◎ {toWan(cost)} {t({ zh: "萬", en: "M" })}</span>
          <button disabled={!can} onClick={() => { Sfx.cash(); dispatch({ type: "UPGRADE", kind: "tool", cost }); }} style={{ marginLeft: "auto", padding: "9px 22px", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: can ? primaryBg() : "rgba(255,255,255,.08)", color: can ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 14, cursor: can ? "pointer" : "not-allowed" }}>{t({ zh: "升級", en: "Upgrade" })} → Lv.{data.toolLevel + 1}</button>
        </div>
      </>
    ));
  }

  // CTV 整備廠（船隊）
  if (kind === "vessel") {
    const lvCost = (data.vesselLevel + 1) * 1_000_000;
    const sovCost = 30_000_000;
    return shell(`🚢 ${t({ zh: "CTV 整備廠 · 船隊", en: "CTV Yard · Fleet" })}`, onClose, (
      <>
        <div style={{ fontSize: 13, color: C.mist, marginBottom: 10 }}>{t({ zh: "目前船舶", en: "Fleet" })}：CTV{data.ownsSOV ? " + SOV" : ""}　·　{t({ zh: "整備等級", en: "Level" })} Lv.{data.vesselLevel}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ flex: 1 }}><div style={{ color: C.cream, fontSize: 13, fontWeight: 700 }}>{t({ zh: "整備升級", en: "Refit" })}</div><div style={{ fontSize: 11, color: C.mist }}>{t({ zh: "每級 +2 作業窗", en: "+2 work-window per level" })}</div></div>
          <button disabled={data.budget < lvCost} onClick={() => { Sfx.cash(); dispatch({ type: "UPGRADE", kind: "vessel", cost: lvCost }); }} style={{ padding: "7px 16px", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: data.budget >= lvCost ? primaryBg() : "rgba(255,255,255,.08)", color: data.budget >= lvCost ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13, cursor: data.budget >= lvCost ? "pointer" : "not-allowed" }}>◎ {toWan(lvCost)}萬</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ flex: 1 }}><div style={{ color: C.cream, fontSize: 13, fontWeight: 700 }}>{t({ zh: "購置 SOV", en: "Buy SOV" })}</div><div style={{ fontSize: 11, color: C.mist }}>{t({ zh: "可在高海象(警戒/停航)出航", en: "Sail in rough/closed seas" })}</div></div>
          {data.ownsSOV ? (
            <span style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>{t({ zh: "已擁有", en: "Owned" })}</span>
          ) : (
            <button disabled={data.budget < sovCost} onClick={() => { Sfx.cash(); dispatch({ type: "BUY_SOV", cost: sovCost }); }} style={{ padding: "7px 16px", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: data.budget >= sovCost ? primaryBg() : "rgba(255,255,255,.08)", color: data.budget >= sovCost ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13, cursor: data.budget >= sovCost ? "pointer" : "not-allowed" }}>◎ {toWan(sovCost)}萬</button>
          )}
        </div>
      </>
    ));
  }

  // 技師公會（招募）
  if (kind === "tech") {
    return shell(`👷 ${t({ zh: "技師公會 · 招募", en: "Tech Guild · Hiring" })}`, onClose, (
      <>
        <div style={{ fontSize: 12, color: C.gold, marginBottom: 6 }}>{t({ zh: "現有技師", en: "Crew" })}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {data.engineers.map((e) => (
            <span key={e.id} style={{ padding: "4px 10px", borderRadius: 4, background: "rgba(127,206,142,.12)", border: "1px solid rgba(127,206,142,.3)", color: C.greenLight, fontSize: 12 }}>{e.name}·{t(DISC[e.discipline])} Lv.{e.level}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.gold }}>{t({ zh: "可招募", en: "Candidates" })}</span>
          <button onClick={() => { Sfx.click(); setCands(genCandidates()); }} style={{ marginLeft: "auto", fontSize: 11, color: C.mist, background: "none", border: "none", cursor: "pointer" }}>🔄 {t({ zh: "換一批", en: "Refresh" })}</button>
        </div>
        {cands.map((e) => {
          const fee = hireFee(e);
          const can = data.budget >= fee;
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 5, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.25)", marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.cream, fontSize: 14, fontWeight: 700 }}>{e.name} · {t(DISC[e.discipline])} <span style={{ color: C.goldText }}>Lv.{e.level}</span></div>
                <div style={{ fontSize: 11, color: C.mist }}>{t({ zh: "招募費", en: "Fee" })} ◎ {toWan(fee)} {t({ zh: "萬", en: "M" })}</div>
              </div>
              <button disabled={!can} onClick={() => { Sfx.cash(); dispatch({ type: "HIRE", engineer: e, cost: fee }); setCands((c) => c.filter((x) => x.id !== e.id)); }} style={{ padding: "7px 16px", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: can ? primaryBg() : "rgba(255,255,255,.08)", color: can ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13, cursor: can ? "pointer" : "not-allowed" }}>{t({ zh: "招募", en: "Hire" })}</button>
            </div>
          );
        })}
      </>
    ));
  }

  if (kind === "codex") {
    return shell(`📖 ${t({ zh: "故障圖鑑", en: "Fault Codex" })}`, onClose, (
      <div>
        <div style={{ fontSize: 12, color: C.mist, marginBottom: 10 }}>{t({ zh: "完成維修後解鎖該故障的排查知識。", en: "Complete a repair to unlock that fault's knowledge." })}</div>
        {Object.values(FAULTS).map((f) => {
          const seen = data.seenFaults.includes(f.id);
          return (
            <div key={f.id} style={{ padding: "9px 10px", borderRadius: 5, background: "rgba(255,255,255,.04)", border: `1px solid ${seen ? "rgba(127,206,142,.4)" : "rgba(214,167,84,.2)"}`, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: seen ? C.green : C.mist }}>{seen ? "✓" : "🔒"}</span>
                <span style={{ color: C.cream, fontSize: 14, fontWeight: 700, fontFamily: FONT_SERIF }}>{t(f.name)}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: C.mist }}>{t(DISC[f.discipline])}</span>
              </div>
              {seen && <div style={{ fontSize: 12, color: C.mist, marginTop: 5, lineHeight: 1.5 }}>{t(f.quiz.ok)}</div>}
            </div>
          );
        })}
      </div>
    ), 560);
  }

  // ranking
  const score = data.generationMWh + data.availability * 5 + data.missionsDone * 30;
  const rows: [I18n, string][] = [
    [{ zh: "綜合績效分", en: "Score" }, String(score)],
    [{ zh: "機組可用率", en: "Availability" }, `${data.availability}%`],
    [{ zh: "累積發電量", en: "Generation" }, `${data.generationMWh} MWh`],
    [{ zh: "完成任務", en: "Missions" }, String(data.missionsDone)],
    [{ zh: "預算", en: "Budget" }, `◎ ${toWan(data.budget)} 萬`],
    [{ zh: "天數", en: "Day" }, String(data.day)],
  ];
  return shell(`🏆 ${t({ zh: "績效排行", en: "Ranking" })}`, onClose, (
    <div>
      {rows.map(([label, val], i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 4px", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: i === 0 ? 16 : 14 }}>
          <span style={{ color: i === 0 ? C.goldText : C.mist, fontWeight: i === 0 ? 900 : 400, fontFamily: i === 0 ? FONT_SERIF : undefined }}>{t(label)}</span>
          <span style={{ color: i === 0 ? C.goldText : C.cream, fontWeight: i === 0 ? 900 : 700, fontVariantNumeric: "tabular-nums" }}>{val}</span>
        </div>
      ))}
      <div style={{ fontSize: 11, color: C.mist, marginTop: 10 }}>{t({ zh: "（班級雲端排行待登入系統；目前為本機）", en: "(Cloud leaderboard pending login; local for now)" })}</div>
    </div>
  ));
}
