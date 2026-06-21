import { useState } from "react";
import { C, FONT_SERIF, primaryBg, panel, stripe } from "../tokens";
import { t } from "../../game/systems/i18n";
import { useLang } from "../useLang";
import { PARTS, stars, priceNum, fmt } from "../data";
import { Portrait } from "../Portrait";
import { useGame } from "../../state/GameContext";
import { useDialogue } from "../../state/DialogueContext";
import { S } from "../../i18n/strings";
import { Sfx } from "../../audio/sfx";
import { toast } from "../toast";

const TAX = 0.12;
const SELL_RATE = 0.9; // 賣出 9 折回收
const leadOf = (p: { price: string }) => {
  const n = Number(p.price.replace(/,/g, ""));
  return n < 1000 ? 0 : n < 3000 ? 1 : n < 6000 ? 2 : 3; // 越貴前置期越長
};

export default function MarketScreen({ accent }: { accent: string }) {
  useLang();
  const { data, dispatch } = useGame();
  const { say } = useDialogue();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [cart, setCart] = useState<Record<string, number>>({});

  const subtotal = PARTS.reduce((s, p) => s + priceNum(p) * (cart[p.id] ?? 0), 0);
  const total = Math.round(subtotal * (1 + TAX));
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const canBuy = count > 0 && total <= data.budget;

  const owned = PARTS.filter((p) => (data.inventory[p.id] ?? 0) > 0);

  const add = (id: string) => {
    Sfx.click();
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  };
  const confirm = () => {
    Sfx.cash();
    let maxLead = 0;
    for (const p of PARTS) {
      const qty = cart[p.id] ?? 0;
      if (qty > 0) {
        const ld = leadOf(p);
        maxLead = Math.max(maxLead, ld);
        dispatch({ type: "BUY", partId: p.id, qty, cost: Math.round(priceNum(p) * qty * (1 + TAX)), leadDays: ld });
      }
    }
    setCart({});
    if (maxLead > 0) toast({ zh: `已下單，最久 ${maxLead} 天後到貨（先做小任務等貨）`, en: `Ordered — arrives in up to ${maxLead} day(s)` });
    say({ speaker: "owner", expr: "confident", line: { zh: "採購完成。大型備品需要前置期，會分批送達貨艙。", en: "Order placed. Large parts have a lead time and arrive in batches." } });
  };
  const sellOne = (id: string) => {
    Sfx.cash();
    const p = PARTS.find((x) => x.id === id)!;
    dispatch({ type: "SELL", partId: id, gain: Math.round(priceNum(p) * SELL_RATE) });
  };

  const switchMode = (mo: "buy" | "sell") => {
    Sfx.click();
    setMode(mo);
    setCart({});
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(7,20,26,.55)", backdropFilter: "blur(2px)" }} />

      <div style={{ position: "absolute", left: 40, right: 40, top: 90, bottom: 30, display: "flex", gap: 18 }}>
        {/* LEFT: parts grid */}
        <div style={{ ...panel, flex: 1, boxShadow: "0 16px 40px rgba(0,0,0,.5)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid rgba(214,167,84,.3)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {(["buy", "sell"] as const).map((mo) => (
                <div
                  key={mo}
                  onClick={() => switchMode(mo)}
                  style={
                    mode === mo
                      ? { padding: "7px 20px", borderRadius: "4px 4px 0 0", background: "linear-gradient(180deg,#e8c074,#d9a441)", color: C.ink, fontWeight: 700, fontSize: 15, cursor: "pointer" }
                      : { padding: "7px 20px", color: C.mist2, fontWeight: 500, fontSize: 15, cursor: "pointer" }
                  }
                >
                  {t(mo === "buy" ? S.btn.buy : S.btn.sell)}
                </div>
              ))}
            </div>
            <div style={{ marginLeft: "auto", fontSize: 13, color: C.mist2 }}>
              {mode === "buy" ? (
                <>
                  {t(S.market.nextRestock)} <span style={{ color: C.cream, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>11:04</span>
                </>
              ) : (
                t({ zh: "賣出回收價 = 行情 9 折", en: "Sell-back = 90% of price" })
              )}
            </div>
          </div>

          {mode === "buy" ? (
            <div style={{ flex: 1, padding: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridAutoRows: "min-content", gap: 14, overflow: "auto" }}>
              {PARTS.map((p) => {
                const up = p.idx >= 100;
                const inCart = cart[p.id] ?? 0;
                return (
                  <div key={p.id} onClick={() => add(p.id)} style={{ position: "relative", background: inCart ? "rgba(217,164,65,.14)" : "rgba(225,237,242,.07)", border: `1px solid ${inCart ? accent : "rgba(214,167,84,.35)"}`, borderRadius: 5, padding: "11px 12px", cursor: "pointer" }}>
                    {inCart > 0 && <div style={{ position: "absolute", top: -8, right: -8, minWidth: 22, height: 22, borderRadius: 11, background: primaryBg(accent), color: C.ink, fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", border: "1px solid rgba(255,236,196,.7)" }}>{inCart}</div>}
                    <div style={{ color: C.cream, fontSize: 15, fontWeight: 700, fontFamily: FONT_SERIF }}>{t(p.n)}</div>
                    <div style={{ color: "#e2b24a", fontSize: 12, letterSpacing: 1, margin: "3px 0 8px" }}>{stars(p.stars)}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 52, height: 52, flex: "none", borderRadius: 5, background: stripe, border: "1px solid rgba(214,167,84,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 9, color: C.mist3 }}>IMG</div>
                      <div style={{ flex: 1, textAlign: "right" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: up ? C.green : C.amber2, lineHeight: 1 }}>{p.idx}%</div>
                        <div style={{ fontSize: 12, color: C.mist, marginTop: 2 }}>{t(S.market.stock)} {p.qty}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.07)" }}>
                      <span style={{ color: accent, fontSize: 14 }}>◎</span>
                      <span style={{ color: C.cream, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{p.price}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10, color: leadOf(p) === 0 ? C.green : C.amber2 }}>{leadOf(p) === 0 ? t({ zh: "即到貨", en: "In stock" }) : t({ zh: `${leadOf(p)} 天到貨`, en: `${leadOf(p)}d lead` })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ flex: 1, padding: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridAutoRows: "min-content", gap: 14, overflow: "auto" }}>
              {owned.length === 0 && <div style={{ gridColumn: "1 / -1", textAlign: "center", color: C.mist, padding: 40 }}>{t({ zh: "貨艙中沒有可賣出的備品。", en: "No parts in cargo to sell." })}</div>}
              {owned.map((p) => (
                <div key={p.id} onClick={() => sellOne(p.id)} style={{ background: "rgba(225,237,242,.07)", border: "1px solid rgba(214,167,84,.35)", borderRadius: 5, padding: "11px 12px", cursor: "pointer" }}>
                  <div style={{ color: C.cream, fontSize: 15, fontWeight: 700, fontFamily: FONT_SERIF }}>{t(p.n)}</div>
                  <div style={{ color: "#e2b24a", fontSize: 12, letterSpacing: 1, margin: "3px 0 8px" }}>{stars(p.stars)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 52, height: 52, flex: "none", borderRadius: 5, background: stripe, border: "1px solid rgba(214,167,84,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 9, color: C.mist3 }}>IMG</div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: C.greenLight, lineHeight: 1 }}>×{data.inventory[p.id]}</div>
                      <div style={{ fontSize: 12, color: C.mist, marginTop: 2 }}>{t({ zh: "持有", en: "Owned" })}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.07)" }}>
                    <span style={{ color: C.green, fontSize: 13 }}>{t({ zh: "賣出 ◎", en: "Sell ◎" })}</span>
                    <span style={{ color: C.cream, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(Math.round(priceNum(p) * SELL_RATE))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: NPC + cargo/tax */}
        <div style={{ width: 392, flex: "none", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ flex: 1, position: "relative", borderRadius: 6, border: "1px solid rgba(214,167,84,.4)", background: "radial-gradient(circle at 50% 28%, #1c4f5f, #0e2a36)", overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,.5)" }}>
            <Portrait id="owner" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            <div style={{ position: "absolute", left: 14, top: 14, padding: "5px 12px", background: "rgba(12,30,38,.85)", border: "1px solid rgba(214,167,84,.45)", borderRadius: 3, color: C.cream, fontSize: 13, fontWeight: 700 }}>{t(S.market.director)}</div>
          </div>

          <div style={{ ...panel, padding: "14px 16px", boxShadow: "0 12px 30px rgba(0,0,0,.45)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ color: accent, fontSize: 18 }}>▣</span>
              <span style={{ color: C.cream, fontSize: 14, fontWeight: 700 }}>{t(S.panel.cargo)}</span>
              <div style={{ flex: 1, height: 9, borderRadius: 5, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                <div style={{ width: `${(data.cargoUsed / data.cargoCap) * 100}%`, height: "100%", background: "linear-gradient(90deg,#e8c074,#d9a441)" }} />
              </div>
              <span style={{ fontSize: 12, color: "#cfe0e6", fontVariantNumeric: "tabular-nums" }}>{data.cargoUsed} / {data.cargoCap}</span>
            </div>

            {mode === "buy" ? (
              <>
                <TaxRow label={t(S.market.tax)} value={`${Math.round(TAX * 100)}%`} dashed />
                <TaxRow label={t(S.market.subtotal)} value={`◎ ${fmt(subtotal)}`} />
                <TaxRow label={t(S.market.total)} value={`◎ ${fmt(total)}`} green={canBuy} />
                <button disabled={!canBuy} onClick={confirm} style={{ width: "100%", marginTop: 12, padding: "13px 0", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: canBuy ? primaryBg(accent) : "rgba(255,255,255,.08)", color: canBuy ? C.ink : C.mist, fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 900, letterSpacing: ".12em", whiteSpace: "nowrap", cursor: canBuy ? "pointer" : "not-allowed" }}>
                  {count > 0 ? t(S.btn.confirm) : t(S.btn.addPrompt)}
                </button>
              </>
            ) : (
              <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.6, padding: "4px 0" }}>{t({ zh: "點選左側庫存品即可賣出（每次 1 件，回收行情 9 折）。", en: "Tap an owned part to sell it (one at a time, at 90% of price)." })}</div>
            )}
            {data.pendingOrders.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed rgba(255,255,255,.1)" }}>
                <div style={{ fontSize: 11, color: C.gold, marginBottom: 4 }}>🚚 {t({ zh: "在途備品", en: "In transit" })}</div>
                {data.pendingOrders.map((o, i) => {
                  const pp = PARTS.find((x) => x.id === o.partId);
                  const left = Math.max(0, o.arriveDay - data.day);
                  return (
                    <div key={i} style={{ fontSize: 11, color: C.mist, display: "flex", justifyContent: "space-between" }}>
                      <span>{t(pp?.n ?? { zh: o.partId, en: o.partId })} ×{o.qty}</span>
                      <span>{t({ zh: `剩 ${left} 天`, en: `${left}d` })}</span>
                    </div>
                  );
                })}
              </div>
            )}
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
