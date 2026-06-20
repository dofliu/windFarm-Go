import { C, FONT_SERIF, primaryBg, panel, stripe } from "../tokens";
import { t } from "../../game/systems/i18n";
import { useLang } from "../useLang";
import { PARTS, stars } from "../data";
import { Portrait } from "../Portrait";

export default function MarketScreen({ accent }: { accent: string }) {
  useLang();
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(7,20,26,.55)", backdropFilter: "blur(2px)" }} />

      <div style={{ position: "absolute", left: 40, right: 40, top: 90, bottom: 30, display: "flex", gap: 18 }}>
        {/* LEFT: parts grid */}
        <div style={{ ...panel, flex: 1, boxShadow: "0 16px 40px rgba(0,0,0,.5)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid rgba(214,167,84,.3)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ padding: "7px 20px", borderRadius: "4px 4px 0 0", background: "linear-gradient(180deg,#e8c074,#d9a441)", color: C.ink, fontWeight: 700, fontSize: 15 }}>{t({ zh: "買入", en: "Buy" })}</div>
              <div style={{ padding: "7px 20px", color: C.mist2, fontWeight: 500, fontSize: 15 }}>{t({ zh: "賣出", en: "Sell" })}</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 13, color: C.mist2 }}>
              {t({ zh: "下次到貨", en: "Next restock" })} <span style={{ color: C.cream, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>11:04</span>
            </div>
          </div>
          <div style={{ flex: 1, padding: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridAutoRows: "min-content", gap: 14, overflow: "auto" }}>
            {PARTS.map((p, i) => {
              const up = p.idx >= 100;
              return (
                <div key={i} style={{ background: "rgba(225,237,242,.07)", border: "1px solid rgba(214,167,84,.35)", borderRadius: 5, padding: "11px 12px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ color: C.cream, fontSize: 15, fontWeight: 700, fontFamily: FONT_SERIF }}>{t(p.n)}</span>
                  </div>
                  <div style={{ color: "#e2b24a", fontSize: 12, letterSpacing: 1, margin: "3px 0 8px" }}>{stars(p.stars)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 52, height: 52, flex: "none", borderRadius: 5, background: stripe, border: "1px solid rgba(214,167,84,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 9, color: C.mist3 }}>IMG</div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: up ? C.green : C.amber2, lineHeight: 1 }}>{p.idx}%</div>
                      <div style={{ fontSize: 12, color: C.mist, marginTop: 2 }}>{t({ zh: "庫存", en: "Stock" })} {p.qty}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.07)" }}>
                    <span style={{ color: accent, fontSize: 14 }}>◎</span>
                    <span style={{ color: C.cream, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{p.price}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: NPC + cargo/tax */}
        <div style={{ width: 392, flex: "none", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ flex: 1, position: "relative", borderRadius: 6, border: "1px solid rgba(214,167,84,.4)", background: "radial-gradient(circle at 50% 28%, #1c4f5f, #0e2a36)", overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,.5)" }}>
            <Portrait id="owner" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            <div style={{ position: "absolute", left: 14, top: 14, padding: "5px 12px", background: "rgba(12,30,38,.85)", border: "1px solid rgba(214,167,84,.45)", borderRadius: 3, color: C.cream, fontSize: 13, fontWeight: 700 }}>{t({ zh: "交易所主管", en: "Market Director" })}</div>
          </div>

          <div style={{ ...panel, padding: "14px 16px", boxShadow: "0 12px 30px rgba(0,0,0,.45)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ color: accent, fontSize: 18 }}>▣</span>
              <span style={{ color: C.cream, fontSize: 14, fontWeight: 700 }}>{t({ zh: "貨艙", en: "Cargo" })}</span>
              <div style={{ flex: 1, height: 9, borderRadius: 5, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                <div style={{ width: "62%", height: "100%", background: "linear-gradient(90deg,#e8c074,#d9a441)" }} />
              </div>
              <span style={{ fontSize: 12, color: "#cfe0e6", fontVariantNumeric: "tabular-nums" }}>620 / 1000</span>
            </div>
            <TaxRow label={t({ zh: "稅率", en: "Tax" })} value="12%" dashed />
            <TaxRow label={t({ zh: "稅前", en: "Pre-tax" })} value="◎ 1,250,000" />
            <TaxRow label={t({ zh: "稅後", en: "After-tax" })} value="◎ 1,100,000" green />
            <div style={{ marginTop: 12, textAlign: "center", padding: "13px 0", borderRadius: 5, background: primaryBg(accent), color: C.ink, fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 900, letterSpacing: ".12em", whiteSpace: "nowrap", cursor: "pointer", boxShadow: "0 6px 18px rgba(217,164,65,.3), inset 0 1px 0 rgba(255,255,255,.4)" }}>
              {t({ zh: "確 認 採 購", en: "CONFIRM" })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxRow({ label, value, green, dashed }: { label: string; value: string; green?: boolean; dashed?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: C.mist, borderTop: dashed ? "1px dashed rgba(255,255,255,.1)" : undefined }}>
      <span>{label}</span>
      <span style={{ color: green ? C.green : C.cream, fontWeight: green ? 700 : 400, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}
