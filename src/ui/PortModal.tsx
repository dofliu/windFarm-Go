import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { toWan } from "../state/game";
import { Sfx } from "../audio/sfx";
import { toast } from "./toast";
import PortScene, { type PortBgMode } from "./PortScene";
import { PORT_FACILITIES, portFacLevel, nextPortCost, portLevel, PORT_MAX_LEVEL } from "../state/port";

// 母港建設(#port):用獲利升級母港設施,即時預覽視覺成長。永遠開放(沙盒)。
// mode 跟隨全域背景切換(模擬/實境/漫畫):實境/漫畫時建設成果疊在母港實景照片上。
export default function PortModal({ open, onClose, mode = "sim" }: { open: boolean; onClose: () => void; mode?: PortBgMode }) {
  useLang();
  const { data, dispatch } = useGame();
  if (!open) return null;
  const u = data.portUpgrades ?? {};
  const lv = portLevel(u);

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="wfg-modal-panel" style={{ ...panel, width: 560, maxHeight: 760, overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)" }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>🏗 {t({ zh: "母港建設", en: "Port Development" })}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: C.mist, lineHeight: 1.6, marginBottom: 10 }}>
            {t({ zh: "用營運獲利美化、擴建母港 —— 每次升級都會讓港區畫面成長,把數值變成看得見的成就。", en: "Reinvest your profits to expand and beautify the home port — each upgrade visibly grows the harbour, turning numbers into achievement." })}
          </div>

          {/* 即時預覽:會隨升級長大;實境/漫畫背景模式時疊在母港照片上 */}
          <PortScene u={u} mode={mode} />
          <div style={{ fontSize: 10.5, color: C.mist2, marginTop: 5, textAlign: "right" }}>
            {t({ zh: `背景：${mode === "real" ? "實境" : mode === "comic" ? "漫畫" : "模擬"}(於母港右上「🎬 背景」切換)`, en: `Backdrop: ${mode === "real" ? "Realistic" : mode === "comic" ? "Comic" : "Simulated"} (toggle via 🎬 on the Hub)` })}
          </div>

          <div style={{ display: "flex", alignItems: "center", margin: "12px 0 8px" }}>
            <span style={{ color: C.gold, fontSize: 12.5, fontWeight: 700, letterSpacing: ".06em" }}>{t({ zh: "母港等級", en: "Port level" })}</span>
            <span style={{ marginLeft: "auto", color: C.goldText, fontWeight: 900 }}>Lv {lv}/{PORT_MAX_LEVEL}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.1)", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ width: `${(lv / PORT_MAX_LEVEL) * 100}%`, height: "100%", background: primaryBg() }} />
          </div>

          {/* 升級清單 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PORT_FACILITIES.map((f) => {
              const cur = portFacLevel(u, f.id);
              const cost = nextPortCost(u, f.id);
              const maxed = cost == null;
              const afford = cost != null && data.budget >= cost;
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.18)" }}>
                  <span style={{ fontSize: 22, flex: "none" }}>{f.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: C.cream, fontSize: 14, fontWeight: 700, fontFamily: FONT_SERIF }}>{t(f.name)}</span>
                      {/* 等級點 */}
                      <span style={{ display: "flex", gap: 3 }}>
                        {Array.from({ length: f.max }, (_, i) => (
                          <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < cur ? C.gold : "rgba(255,255,255,.15)" }} />
                        ))}
                      </span>
                    </div>
                    <div style={{ color: C.mist, fontSize: 11.5, marginTop: 2 }}>{t(f.blurb)}</div>
                  </div>
                  {maxed ? (
                    <span style={{ flex: "none", fontSize: 12, color: C.green, fontWeight: 700 }}>✓ {t({ zh: "已滿級", en: "Max" })}</span>
                  ) : (
                    <button
                      disabled={!afford}
                      onClick={() => { Sfx.cash(); dispatch({ type: "UPGRADE_PORT", id: f.id, cost: cost! }); toast({ zh: `🏗 ${t(f.name)}升級至 Lv ${cur + 1}!`, en: `🏗 ${t(f.name)} upgraded to Lv ${cur + 1}!` }); }}
                      style={{ flex: "none", padding: "8px 12px", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: afford ? primaryBg() : "rgba(255,255,255,.08)", color: afford ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 12.5, cursor: afford ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}
                    >
                      ◎{toWan(cost!)}{t({ zh: "萬", en: "M" })}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 11, color: C.mist2, marginTop: 12, textAlign: "center" }}>
            {t({ zh: "母港建設為視覺成長(不影響計分),純粹是經營有成的獎勵。", en: "Port development is cosmetic growth (no score impact) — a reward for running a profitable operation." })}
          </div>
        </div>
      </div>
    </div>
  );
}
