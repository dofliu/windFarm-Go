import { C, FONT_SERIF, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { tierOf } from "../state/game";
import { casesForTier, visibleSources, type CaseStudy, type CaseCategory } from "../state/caseStudies";
import { DISC } from "./disc";
import type { I18n } from "../game/systems/types";

const CAT_LABEL: Record<CaseCategory, I18n> = {
  foundation: { zh: "基礎/沖刷", en: "Foundation/Scour" },
  gearbox_bearing: { zh: "齒輪箱/軸承", en: "Gearbox/Bearing" },
  blade: { zh: "葉片", en: "Blade" },
  cable: { zh: "海纜", en: "Cable" },
  electrical_fire: { zh: "電氣/火災", en: "Electrical/Fire" },
  vessel: { zh: "船舶/作業", en: "Vessel/Ops" },
  bolt: { zh: "螺栓/結構", en: "Bolt/Structure" },
  ice: { zh: "結冰", en: "Ice" },
};

function CaseCard({ c, seen }: { c: CaseStudy; seen: boolean }) {
  const named = c.framing === "named-with-sources";
  const srcs = visibleSources(c);
  return (
    <div style={{ padding: "11px 13px", borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.22)", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: named ? C.green : C.amber2, border: `1px solid ${named ? "rgba(127,206,142,.4)" : "rgba(227,173,66,.4)"}`, borderRadius: 4, padding: "1px 6px" }}>
          {named ? t({ zh: "📚 真實案例 · 附出處", en: "📚 Real case · sourced" }) : t({ zh: "🔒 去識別技術重現", en: "🔒 Anonymized technical" })}
        </span>
        <span style={{ fontSize: 10.5, color: C.mist2 }}>{t(CAT_LABEL[c.category])} · {t(DISC[c.discipline])}{c.year ? ` · ${c.year}` : ""}</span>
        {seen && <span style={{ marginLeft: "auto", fontSize: 10.5, color: C.green }}>✓ {t({ zh: "遊戲中已遇到", en: "Seen in-game" })}</span>}
      </div>
      <div style={{ color: C.goldText, fontWeight: 900, fontFamily: FONT_SERIF, fontSize: 14, lineHeight: 1.35 }}>{t(c.title)}</div>
      <div style={{ color: "#cfe0e6", fontSize: 12.5, marginTop: 5, lineHeight: 1.55 }}>{t(c.scenario)}</div>
      {/* 決策選項 + 教學回饋 */}
      <div style={{ marginTop: 8 }}>
        {c.choices.map((ch, i) => (
          <div key={i} style={{ padding: "6px 8px", borderRadius: 4, background: ch.good ? "rgba(127,206,142,.08)" : "rgba(220,100,80,.07)", border: `1px solid ${ch.good ? "rgba(127,206,142,.25)" : "rgba(220,100,80,.22)"}`, marginBottom: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: ch.good ? C.green : C.redText }}>{ch.good ? "✔ " : "✗ "}{t(ch.label)}</div>
            <div style={{ fontSize: 11.5, color: C.mist, marginTop: 2 }}>{t(ch.feedback)}</div>
          </div>
        ))}
      </div>
      {/* O&M 教訓 */}
      <div style={{ marginTop: 6, padding: "6px 9px", borderRadius: 4, background: "rgba(95,168,217,.09)", border: "1px solid rgba(95,168,217,.25)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>🎓 {t({ zh: "O&M 教訓", en: "O&M lesson" })}</span>
        <div style={{ fontSize: 11.5, color: "#cfe0e6", marginTop: 2, lineHeight: 1.5 }}>{t(c.lesson)}</div>
      </div>
      {/* 出處(僅具名案例顯示) */}
      {named && srcs.length > 0 ? (
        <div style={{ marginTop: 6, fontSize: 10.5, color: C.mist2 }}>
          {t({ zh: "資料來源", en: "Sources" })}:{" "}
          {srcs.map((u, i) => (
            <span key={i}>
              {i > 0 ? " · " : ""}
              <a href={u} target="_blank" rel="noreferrer" style={{ color: C.gold, textDecoration: "underline", wordBreak: "break-all" }}>[{i + 1}]</a>
            </span>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 6, fontSize: 10.5, color: C.mist3 }}>{t({ zh: "（本案例為去識別技術重現,不標具名出處）", en: "(Anonymized technical reconstruction — named sources withheld)" })}</div>
      )}
    </div>
  );
}

// 圖鑑「案例檔」：瀏覽依運維層級解鎖的真實風場案例研究（#case-studies）。
export default function CaseFileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLang();
  const { data } = useGame();
  if (!open) return null;
  const tier = tierOf(data);
  const cases = casesForTier(tier);
  const seen = new Set(data.seenCases ?? []);

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panel, width: 620, maxHeight: 760, overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)", position: "sticky", top: 0 }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>📁 {t({ zh: "案例檔 · 真實風場事故", en: "Case Files · Real-World Incidents" })}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: C.mist, marginBottom: 10, lineHeight: 1.55 }}>
            {t({ zh: `過去真實風場「踩過的坑」——做中學的他山之石。隨運維層級解鎖更深的案例(目前 ${cases.length} 則)。具名案例附公開出處;敏感個案以去識別技術重現呈現。`, en: `Real-world incidents others have hit — learn from their lessons. More unlock as your ops tier rises (${cases.length} now). Named cases cite public sources; sensitive ones appear anonymized.` })}
          </div>
          {cases.length === 0 ? (
            <div style={{ color: C.mist, fontSize: 12.5, padding: "20px 0", textAlign: "center" }}>{t({ zh: "目前層級尚無解鎖案例,繼續經營以解鎖。", en: "No cases unlocked at this tier yet — keep operating to unlock." })}</div>
          ) : (
            cases.map((c) => <CaseCard key={c.id} c={c} seen={seen.has(c.id)} />)
          )}
        </div>
      </div>
    </div>
  );
}
