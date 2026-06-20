import type { CSSProperties } from "react";
import { C, FONT_SERIF } from "../tokens";
import { t } from "../../game/systems/i18n";
import { useLang } from "../useLang";
import { SailTurbines } from "../Turbine";
import { AdvisorPopup, Avatar } from "../Portrait";
import { exprUrl } from "../characters";
import { S } from "../../i18n/strings";
import { useGame } from "../../state/GameContext";
import { Sfx } from "../../audio/sfx";
import { toast, SOON } from "../toast";
import type { Screen } from "../../App";

function CtvShip({ left, top, scale, opacity, wakeH, hullW, hullH, cabinW, cabinH }: { left: string; top: number; scale: number; opacity: number; wakeH: number; hullW: number; hullH: number; cabinW: number; cabinH: number }) {
  return (
    <div style={{ position: "absolute", left, top, transform: `scale(${scale})`, opacity }}>
      <div style={{ position: "absolute", left: "50%", top: 14, transform: "translateX(-50%)", width: 30, height: wakeH, background: "linear-gradient(180deg, rgba(255,255,255,.6), rgba(255,255,255,0))", clipPath: "polygon(36% 0,64% 0,100% 100%,0 100%)", filter: "blur(1px)" }} />
      <div style={{ position: "relative", width: hullW, height: hullH, margin: "0 auto", background: "linear-gradient(180deg,#46586a,#1c2730)", borderRadius: "6px 6px 14px 14px/6px 6px 22px 22px", boxShadow: "0 4px 8px rgba(0,0,0,.35)" }}>
        <div style={{ position: "absolute", top: -cabinH + 1, left: "50%", transform: "translateX(-50%)", width: cabinW, height: cabinH, background: "linear-gradient(180deg,#f1f4f5,#c4ced2)", borderRadius: "3px 3px 0 0" }} />
        <div style={{ position: "absolute", top: 6, left: 0, right: 0, height: 3, background: "#e0a83e" }} />
      </div>
    </div>
  );
}

function StatRow({ icon, label, pct, value, color }: { icon: string; label: string; pct: number; value: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
      <div style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", background: "#16323d", border: "1px solid rgba(214,167,84,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SERIF, fontSize: 13, color: C.goldText }}>{icon}</div>
      <span style={{ width: 34, fontSize: 12, color: "#cfe0e6" }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <span style={{ width: 30, textAlign: "right", fontSize: 12, color: C.cream, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

const cmdBtn: CSSProperties = {
  padding: "11px 20px",
  borderRadius: 5,
  background: "linear-gradient(180deg, rgba(24,56,68,.92), rgba(14,38,48,.94))",
  border: "1px solid rgba(214,167,84,.45)",
  color: C.cream,
  fontFamily: FONT_SERIF,
  fontSize: 15,
  fontWeight: 700,
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow: "0 5px 14px rgba(0,0,0,.35)",
};

export default function SailScreen({ setScreen, accent }: { setScreen: (s: Screen) => void; accent: string }) {
  useLang();
  const { data } = useGame();
  const closed = data.seaState === "closed";
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
      {/* open sea bg */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "34%", background: "linear-gradient(180deg,#a9cfe0 0%, #cfe1de 55%, #ece4cd 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "42%", background: "radial-gradient(circle at 50% 96%, rgba(255,246,221,.9), rgba(255,246,221,0) 46%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "66%", background: "linear-gradient(180deg,#50b4c5 0%, #2f93ab 28%, #1f6f88 68%, #134e61 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "66%", background: "repeating-linear-gradient(178deg, rgba(255,255,255,.06) 0 2px, rgba(255,255,255,0) 2px 28px)" }} />
        <div style={{ position: "absolute", left: "36%", right: "36%", top: "33%", bottom: 0, background: "linear-gradient(180deg, rgba(255,240,205,.5), rgba(255,240,205,0) 55%)", filter: "blur(12px)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: "33.6%", height: 1, background: "rgba(255,255,255,.45)" }} />
        <SailTurbines />
        <CtvShip left="47%" top={300} scale={0.66} opacity={0.9} wakeH={88} hullW={46} hullH={18} cabinW={20} cabinH={9} />
        <CtvShip left="43%" top={360} scale={0.9} opacity={0.96} wakeH={92} hullW={46} hullH={18} cabinW={20} cabinH={9} />
        <CtvShip left="38.5%" top={432} scale={1.18} opacity={1} wakeH={96} hullW={48} hullH={19} cabinW={22} cabinH={10} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 46%, rgba(6,18,24,0) 55%, rgba(6,18,24,.42) 100%)", pointerEvents: "none" }} />
      </div>

      {/* destination chip */}
      <div style={{ position: "absolute", left: 40, top: 96, padding: "9px 16px", borderRadius: 6, background: "rgba(10,28,36,.82)", border: "1px solid rgba(214,167,84,.4)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: accent, fontSize: 16 }}>⚑</span>
        <div>
          <div style={{ color: C.cream, fontSize: 14, fontWeight: 700 }}>{t({ zh: "航向 · 彰化外海 CH-12", en: "Heading · Changhua CH-12" })}</div>
          <div style={{ color: C.mist, fontSize: 11 }}>{t({ zh: "距離 12.4 浬 · 預計抵達 00:42", en: "12.4 nm · ETA 00:42" })}</div>
        </div>
      </div>

      {/* ship status panel */}
      <div style={{ position: "absolute", right: 26, top: 92, width: 288, background: "linear-gradient(180deg, rgba(20,50,63,.94), rgba(13,36,46,.96))", border: "1px solid rgba(214,167,84,.5)", borderRadius: 6, boxShadow: "0 14px 36px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "linear-gradient(180deg,#e8c074,#cf9a35)", borderRadius: "6px 6px 0 0" }}>
          <Avatar id="captain" src={exprUrl("captain", "neutral")} size={32} headShot />
          <span style={{ flex: 1, textAlign: "center", color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, letterSpacing: ".06em" }}>{t({ zh: "海昌一號 · CTV", en: "Haichang-1 · CTV" })}</span>
          <div style={{ width: 32 }} />
        </div>
        <div style={{ padding: "13px 15px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Coord label={t({ zh: "緯度 N", en: "Lat N" })} value="24.0°" />
            <Coord label={t({ zh: "經度 E", en: "Lon E" })} value="120.1°" />
          </div>
          <StatRow icon="油" label={t({ zh: "燃油", en: "Fuel" })} pct={78} value="78%" color="linear-gradient(90deg,#e8c074,#d9a441)" />
          <StatRow icon="水" label={t({ zh: "飲水", en: "Water" })} pct={92} value="92%" color="linear-gradient(90deg,#6fb8d6,#3f93c4)" />
          <StatRow icon="員" label={t({ zh: "技師", en: "Crew" })} pct={60} value={t({ zh: "12 人", en: "12" })} color="linear-gradient(90deg,#7fce8e,#4f9e62)" />
          <div style={{ marginBottom: 4 }}>
            <StatRow icon="勞" label={t({ zh: "疲勞", en: "Fatigue" })} pct={18} value="18%" color="linear-gradient(90deg,#e89a5b,#cf6b3a)" />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Equip label={t({ zh: "導航儀", en: "GPS" })} />
              <Equip label={t({ zh: "對講機", en: "Radio" })} />
            </div>
            <div style={{ marginLeft: "auto", position: "relative", width: 58, height: 58, borderRadius: "50%", background: "radial-gradient(circle at 50% 40%,#16323d,#0d242d)", border: "2px solid rgba(214,167,84,.55)" }}>
              <div style={{ position: "absolute", top: 3, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: accent, fontWeight: 700 }}>N</div>
              <div style={{ position: "absolute", top: "50%", left: "50%", width: 3, height: 22, background: "linear-gradient(180deg,#dc6450 0 55%,#e6edef 55%)", transformOrigin: "bottom center", transform: "translate(-50%,-100%) rotate(38deg)", borderRadius: 2 }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", width: 6, height: 6, background: accent, borderRadius: "50%", transform: "translate(-50%,-50%)" }} />
            </div>
          </div>
          <div style={{ marginTop: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.mist, marginBottom: 4 }}>
              <span>{t({ zh: "航程進度", en: "Voyage" })}</span>
              <span>62%</span>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
              <div style={{ width: "62%", height: "100%", background: "linear-gradient(90deg,#e8c074,#d9a441)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* command bar */}
      <div style={{ position: "absolute", left: 40, bottom: 28, display: "flex", gap: 10 }}>
        <div style={cmdBtn} onClick={() => { Sfx.click(); toast(SOON); }}>{t(S.btn.routeMap)}</div>
        <div style={cmdBtn} onClick={() => { Sfx.click(); toast(SOON); }}>{t({ zh: "甲板", en: "Deck" })}</div>
        <div style={cmdBtn} onClick={() => { Sfx.click(); toast({ zh: `海象：${data.seaState === "workable" ? "可作業" : data.seaState === "caution" ? "警戒" : "停航"}`, en: `Sea: ${data.seaState}` }); }}>{t({ zh: "海象", en: "Sea" })}</div>
        <div style={cmdBtn} onClick={() => { Sfx.click(); toast(SOON); }}>{t({ zh: "派工", en: "Assign" })}</div>
        <div
          onClick={() => {
            if (closed) { Sfx.error(); return; }
            Sfx.click();
            setScreen("repair");
          }}
          style={{ ...cmdBtn, padding: "11px 28px", background: closed ? "rgba(255,255,255,.08)" : "linear-gradient(180deg, #d9a441 0%, #b07d2a 100%)", border: closed ? "1px solid rgba(220,100,80,.5)" : "1px solid rgba(255,236,196,.6)", color: closed ? C.mist : C.ink, fontWeight: 900, boxShadow: closed ? "none" : "0 6px 16px rgba(217,164,65,.32)", cursor: closed ? "not-allowed" : "pointer" }}
        >
          {closed ? t({ zh: "海象停航", en: "Sea Closed" }) : t(S.btn.dockClimb)}
        </div>
      </div>

      {/* 資深技師側邊提示 */}
      <AdvisorPopup
        id="veteran_sailor"
        line={{ zh: "前方海象作業窗正好，抓緊時間靠泊登塔！", en: "The weather window's open ahead — dock and climb while it lasts!" }}
        style={{ left: 600, bottom: 12 }}
        portraitH={280}
        bubbleSide="right"
      />
    </div>
  );
}

function Coord({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 4, background: "rgba(255,255,255,.05)", border: "1px solid rgba(214,167,84,.25)" }}>
      <div style={{ fontSize: 10, color: C.mist }}>{label}</div>
      <div style={{ fontSize: 15, color: C.cream, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function Equip({ label }: { label: string }) {
  return (
    <div style={{ width: 50, height: 50, borderRadius: 5, background: "repeating-linear-gradient(45deg,#244c58 0 6px,#1f4350 6px 12px)", border: "1px solid rgba(214,167,84,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#cfe0e6", textAlign: "center", lineHeight: 1.1 }}>{label}</div>
  );
}
