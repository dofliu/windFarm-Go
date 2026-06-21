import { useState } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { Sfx } from "../audio/sfx";
import { toast } from "./toast";
import type { I18n } from "../game/systems/types";

interface Routine {
  name: I18n;
  unit: string;
  budget: number; // ◎
  xp: number;
}

const TEMPLATES: { name: I18n; budget: number; xp: number }[] = [
  { name: { zh: "例行巡檢", en: "Routine Inspection" }, budget: 50_000, xp: 20 },
  { name: { zh: "葉片表面清潔", en: "Blade Surface Cleaning" }, budget: 60_000, xp: 25 },
  { name: { zh: "濾網更換", en: "Filter Replacement" }, budget: 40_000, xp: 15 },
  { name: { zh: "緊固件扭力複檢", en: "Bolt Torque Re-check" }, budget: 55_000, xp: 20 },
];

function genJobs(): Routine[] {
  return TEMPLATES.map((tpl) => ({ ...tpl, unit: "CH-" + String(1 + Math.floor(Math.random() * 30)).padStart(2, "0") }));
}

// 調度中心（#21）：例行小任務看板，快速賺預算+資歷。
export default function DispatchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLang();
  const { dispatch } = useGame();
  const [jobs, setJobs] = useState<Routine[]>(genJobs);
  if (!open) return null;

  const run = (j: Routine) => {
    Sfx.cash();
    dispatch({ type: "DO_ROUTINE", budget: j.budget, xp: j.xp });
    toast({ zh: `完成「${j.name.zh}」 +${Math.round(j.budget / 10000)} 萬`, en: `Done: ${j.name.en} +${Math.round(j.budget / 10000)}M` });
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panel, width: 520, padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)" }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>🗂 {t({ zh: "調度中心 · 例行工單", en: "Dispatch · Routine Jobs" })}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: C.mist, marginBottom: 10 }}>{t({ zh: "快速小任務：穩定累積預算與資歷，用來購買備品與升級。", en: "Quick jobs: steady budget & XP to buy parts and upgrades." })}</div>
          {jobs.map((j, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 5, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.25)", marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.cream, fontSize: 14, fontWeight: 700 }}>{t(j.name)} · {j.unit}</div>
                <div style={{ fontSize: 11, color: C.greenLight, marginTop: 2 }}>💰 +{Math.round(j.budget / 10000)} {t({ zh: "萬", en: "M" })}　⭐ +{j.xp}</div>
              </div>
              <button onClick={() => run(j)} style={{ padding: "6px 16px", borderRadius: 4, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13, cursor: "pointer" }}>
                {t({ zh: "執行", en: "Run" })}
              </button>
            </div>
          ))}
          <button onClick={() => { Sfx.click(); setJobs(genJobs()); }} style={{ width: "100%", marginTop: 4, padding: "8px 0", borderRadius: 5, border: "1px solid rgba(214,167,84,.4)", background: "rgba(15,40,50,.82)", color: C.mist, fontSize: 13, cursor: "pointer" }}>
            🔄 {t({ zh: "重新整理工單", en: "Refresh jobs" })}
          </button>
        </div>
      </div>
    </div>
  );
}
