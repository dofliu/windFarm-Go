import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import { portFacLevel, portLevel, PORT_MAX_LEVEL, type PortUpgrades } from "../state/port";

// 母港視覺成長場景(#port):純 CSS,依各設施等級「長大」——碼頭/倉庫/貨櫃/起重機/燈塔。
export default function PortScene({ u, height = 200 }: { u: PortUpgrades; height?: number }) {
  const quay = portFacLevel(u, "quay");
  const wh = portFacLevel(u, "warehouse");
  const crane = portFacLevel(u, "crane");
  const beacon = portFacLevel(u, "beacon");
  const lv = portLevel(u);

  const deckW = [58, 72, 86, 100][quay]; // 碼頭延伸寬度(%)
  const whW = [34, 46, 58, 70][wh]; // 倉庫寬
  const whH = [26, 36, 46, 56][wh]; // 倉庫高
  const containers = wh * 2; // 貨櫃數
  const boats = quay; // 停泊船數
  const lit = beacon >= 1;
  const glow = [0, 0.35, 0.6, 0.9][beacon];

  const cont = ["#3f8f6e", "#c07a2e", "#8a5fb0", "#3f6f9f", "#b04a4a", "#6f8a3f"];

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(214,167,84,.35)", background: "linear-gradient(180deg,#2a3550 0%,#5a5d72 36%,#b88a5a 60%,#caa06a 66%)" }}>
      {/* 夕陽光暈 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "66%", background: "radial-gradient(circle at 64% 92%, rgba(255,214,160,.65), rgba(255,214,160,0) 46%)" }} />
      {/* 海 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", background: "linear-gradient(180deg,#2f6678 0%,#1c4858 45%,#123442 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", background: "repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0 2px, rgba(255,255,255,0) 2px 22px)" }} />

      {/* 燈塔(右) */}
      <div style={{ position: "absolute", right: "5%", bottom: "34%", width: 12, height: [28, 40, 50, 58][beacon] || 24, background: "linear-gradient(180deg,#e9e2d2,#b9b0a0)", borderRadius: "3px 3px 0 0" }}>
        <div style={{ position: "absolute", top: -7, left: -2, width: 16, height: 8, borderRadius: 3, background: lit ? "#ffe08a" : "#6b7378", boxShadow: lit ? `0 0 ${10 + beacon * 6}px rgba(255,224,138,${glow})` : "none" }} />
        {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 8 + i * 12, height: 4, background: "rgba(200,90,60,.5)" }} />)}
      </div>

      {/* 倉庫(左) */}
      <div style={{ position: "absolute", left: "5%", bottom: "30%", width: `${whW}px`, height: `${whH}px`, background: "linear-gradient(180deg,#d8cdb6,#9c917b)", borderRadius: "3px 3px 0 0", boxShadow: "0 3px 8px rgba(0,0,0,.35)" }}>
        <div style={{ position: "absolute", top: -8, left: -3, right: -3, height: 10, background: "linear-gradient(180deg,#b8902f,#8a6a22)", clipPath: "polygon(6% 100%, 50% 0, 94% 100%)" }} />
        {wh >= 1 && <div style={{ position: "absolute", inset: "30% 12% 12%", background: "repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 5px, rgba(0,0,0,0) 5px 11px)" }} />}
      </div>

      {/* 起重機(自碼頭升起) */}
      {Array.from({ length: crane }, (_, i) => {
        const left = 40 + i * 16; // %
        const h = [0, 44, 52, 60][crane] || 44;
        return (
          <div key={i} style={{ position: "absolute", left: `${left}%`, bottom: "30%", width: 3, height: h, background: "linear-gradient(180deg,#e0a83e,#a9791f)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 30, height: 3, background: "#d6a13a", transform: "rotate(-26deg)", transformOrigin: "left" }} />
            <div style={{ position: "absolute", top: 2, left: 22, width: 2, height: 12, background: "rgba(214,161,58,.8)" }} />
          </div>
        );
      })}

      {/* 貨櫃堆(倉庫前) */}
      {Array.from({ length: containers }, (_, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        return <div key={i} style={{ position: "absolute", left: `${10 + col * 7}%`, bottom: `${30 + row * 7}%`, width: 22, height: 12, background: cont[i % cont.length], borderRadius: 2, border: "1px solid rgba(0,0,0,.25)", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />;
      })}

      {/* 碼頭甲板 */}
      <div style={{ position: "absolute", left: 0, bottom: "28%", width: `${deckW}%`, height: 10, background: "linear-gradient(180deg,#7a5a38,#523c25)", borderTop: "2px solid rgba(0,0,0,.25)" }} />
      <div style={{ position: "absolute", left: 0, bottom: "24%", width: `${deckW}%`, height: "5%", background: "repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 18px, rgba(0,0,0,0) 18px 22px)", opacity: 0.5 }} />

      {/* 停泊運維船 */}
      {Array.from({ length: boats }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: `${30 + i * 20}%`, bottom: "20%", width: 40, height: 11, background: "linear-gradient(180deg,#52647a,#202c35)", borderRadius: "3px 6px 11px 11px/3px 4px 16px 16px", boxShadow: "0 3px 6px rgba(0,0,0,.4)" }}>
          <div style={{ position: "absolute", top: 5, left: 0, right: 0, height: 2, background: "#e0a83e" }} />
          <div style={{ position: "absolute", top: -7, left: 5, width: 11, height: 8, background: "#eef2f3", borderRadius: "2px 2px 0 0" }} />
        </div>
      ))}

      {/* 招牌燈(beacon 點亮港區) */}
      {beacon >= 2 && <div style={{ position: "absolute", left: "8%", bottom: "62%", color: "#ffe08a", fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 12, letterSpacing: ".1em", textShadow: `0 0 ${6 + beacon * 4}px rgba(255,224,138,.8)` }}>⚓ {t({ zh: "離岸母港", en: "O&M PORT" })}</div>}

      {/* 母港等級徽章 */}
      <div style={{ position: "absolute", left: 8, top: 8, padding: "3px 9px", borderRadius: 999, background: "rgba(10,28,36,.7)", border: "1px solid rgba(214,167,84,.5)", color: C.goldText, fontSize: 11.5, fontWeight: 900, fontFamily: FONT_SERIF }}>
        🏗 {t({ zh: "母港", en: "Port" })} Lv {lv}/{PORT_MAX_LEVEL}
      </div>

      {/* vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, rgba(6,16,22,0) 55%, rgba(6,16,22,.45) 100%)", pointerEvents: "none" }} />
    </div>
  );
}
