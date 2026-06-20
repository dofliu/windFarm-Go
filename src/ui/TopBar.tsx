import { useState, type CSSProperties, type ReactNode } from "react";
import { C, FONT_SERIF, FONT_CINZEL, chip } from "./tokens";
import { Sfx } from "../audio/sfx";
import { t } from "../game/systems/i18n";
import { getLang, toggleLang } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { toWan, type SeaState } from "../state/game";
import { S } from "../i18n/strings";
import type { I18n } from "../game/systems/types";
import type { Screen } from "../App";

const TABS: { key: Screen; label: I18n }[] = [
  { key: "hub", label: S.nav.home },
  { key: "market", label: S.nav.market },
  { key: "sail", label: S.nav.sail },
  { key: "repair", label: S.nav.repair },
];

const SEA: Record<SeaState, { c: string; label: I18n }> = {
  workable: { c: C.greenBright, label: S.status.workable },
  caution: { c: C.amber, label: S.status.caution },
  closed: { c: C.red, label: S.status.closed },
};

export default function TopBar({
  screen,
  setScreen,
  accent,
  onGear,
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
  accent: string;
  onGear?: () => void;
}) {
  useLang();
  const { data } = useGame();
  const sea = SEA[data.seaState as SeaState];

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: 72,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        background: "linear-gradient(180deg, rgba(8,24,31,.95) 0%, rgba(8,24,31,.7) 70%, rgba(8,24,31,0) 100%)",
      }}
    >
      {/* logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 35%, #1d4d5d, #0c2731)",
            border: `2px solid ${accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT_SERIF,
            fontSize: 24,
            fontWeight: 900,
            color: C.goldText,
            boxShadow: "0 4px 12px rgba(0,0,0,.4)",
          }}
        >
          風
        </div>
        <div>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 900,
              fontSize: 20,
              color: C.cream,
              letterSpacing: ".06em",
              lineHeight: 1,
              textShadow: "0 1px 4px rgba(0,0,0,.5)",
            }}
          >
            {t(S.nav.title)}
          </div>
          <div style={{ fontFamily: FONT_CINZEL, fontSize: 11, color: C.gold, letterSpacing: ".34em", marginTop: 3 }}>
            OFFSHORE O&amp;M LEGEND
          </div>
        </div>
      </div>

      {/* center tabs */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 4,
          background: "rgba(10,28,36,.7)",
          border: "1px solid rgba(214,167,84,.3)",
          borderRadius: 6,
          padding: 4,
        }}
      >
        {TABS.map((tab) => (
          <div
            key={tab.key}
            onClick={() => {
              Sfx.click();
              setScreen(tab.key);
            }}
            style={{
              position: "relative",
              padding: "8px 26px",
              borderRadius: 4,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: FONT_SERIF,
              fontSize: 15,
              fontWeight: 700,
              color: C.cream,
            }}
          >
            {t(tab.label)}
            {screen === tab.key && (
              <div style={{ position: "absolute", left: 16, right: 16, bottom: 2, height: 3, borderRadius: 2, background: accent }} />
            )}
          </div>
        ))}
      </div>

      {/* right resources */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" }}>
        <div style={chip}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: sea.c, boxShadow: `0 0 8px ${sea.c}`, animation: "shimmer 2.4s ease-in-out infinite" }} />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ color: C.cream, fontSize: 13, fontWeight: 700 }}>
              {t(S.hud.sea)} {t(sea.label)}
            </div>
            <div style={{ color: C.mist, fontSize: 10 }}>{t(S.hud.seaSub)}</div>
          </div>
        </div>
        <div style={chip}>
          <span style={{ color: C.gold }}>◷</span>
          <span style={{ color: C.cream, fontSize: 13, fontWeight: 700 }}>{t(S.hud.day)}</span>
        </div>
        <div style={chip}>
          <span style={{ color: C.greenLight }}>人</span>
          <span style={{ color: C.cream, fontSize: 13, fontWeight: 700 }}>
            {t(S.hud.techs)} {data.techAvail}/{data.techTotal}
          </span>
        </div>
        <div style={{ ...chip, background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.06))", border: "1px solid rgba(214,167,84,.5)" }}>
          <span style={{ color: C.gold, fontSize: 16 }}>◎</span>
          <span style={{ color: C.goldText, fontSize: 15, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
            {toWan(data.budget)} {t(S.hud.wan)}
          </span>
        </div>
        <Btn onClick={() => toggleLang()}>{getLang() === "zh" ? "中" : "EN"}</Btn>
        <MuteBtn />
        <Btn onClick={onGear}>⚙</Btn>
      </div>
    </div>
  );
}

function MuteBtn() {
  const [m, setM] = useState(Sfx.isMuted());
  return <Btn onClick={() => setM(Sfx.toggle())}>{m ? "🔇" : "🔊"}</Btn>;
}

function Btn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const s: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "rgba(10,28,36,.7)",
    border: "1px solid rgba(214,167,84,.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: C.cream,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
  };
  return (
    <div style={s} onClick={onClick}>
      {children}
    </div>
  );
}
