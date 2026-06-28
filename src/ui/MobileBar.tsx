import { useState } from "react";
import { C, FONT_SERIF } from "./tokens";
import { Sfx } from "../audio/sfx";
import { Bgm } from "../audio/bgm";
import { t, getLang, toggleLang } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { toWan, type SeaState } from "../state/game";
import { getProfile } from "../state/profile";
import { S } from "../i18n/strings";

const SEA_COLOR: Record<SeaState, string> = { workable: C.greenBright, caution: C.amber, closed: C.red };

// 手機精簡頂列:標題 + 海象/天數/技師/預算 晶片(自動換行) + 語言/靜音/設定/個人檔/登出。
// 取代桌機版固定寬的 TopBar,改用可換行、加大字體的版面。
export default function MobileBar({ onGear, onProfile, onLogout }: { onGear?: () => void; onProfile?: () => void; onLogout?: () => void }) {
  useLang();
  const { data } = useGame();
  const profile = getProfile();
  const [muted, setMuted] = useState(Sfx.isMuted());
  const seaC = SEA_COLOR[data.seaState as SeaState];
  const seaLabel = data.seaState === "workable" ? S.status.workable : data.seaState === "caution" ? S.status.caution : S.status.closed;

  const chip = (bg: string, border: string): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 18, background: bg, border: `1px solid ${border}`, fontSize: 14, fontWeight: 700, color: C.cream, whiteSpace: "nowrap" });
  const iconBtn: React.CSSProperties = { width: 38, height: 38, flex: "none", borderRadius: "50%", background: "rgba(10,28,36,.7)", border: "1px solid rgba(214,167,84,.4)", display: "flex", alignItems: "center", justifyContent: "center", color: C.cream, fontSize: 15, cursor: "pointer" };

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 30, background: "linear-gradient(180deg, rgba(8,24,31,.98) 0%, rgba(8,24,31,.92) 100%)", borderBottom: "1px solid rgba(214,167,84,.3)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 9, paddingTop: "max(10px, env(safe-area-inset-top))" }}>
      {/* 第一列:Logo/標題 + 功能鈕 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: "radial-gradient(circle at 50% 35%, #1d4d5d, #0c2731)", border: `2px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 900, color: C.goldText }}>風</div>
        <div style={{ flex: 1, minWidth: 0, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 17, color: C.cream, letterSpacing: ".04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(S.nav.title)}</div>
        <div style={iconBtn} onClick={() => toggleLang()}>{getLang() === "zh" ? "中" : "EN"}</div>
        <div style={iconBtn} onClick={() => { const nm = !muted; setMuted(nm); Sfx.setMuted(nm); Bgm.setMuted(nm); }}>{muted ? "🔇" : "🔊"}</div>
        <div style={iconBtn} onClick={() => { Sfx.click(); onGear?.(); }}>⚙</div>
        <div style={iconBtn} onClick={() => { Sfx.click(); onLogout?.(); }}>⎋</div>
      </div>
      {/* 第二列:狀態晶片(可換行) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        <div style={chip("rgba(10,28,36,.7)", "rgba(214,167,84,.3)")}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: seaC, boxShadow: `0 0 8px ${seaC}` }} />
          {t(S.hud.sea)} {t(seaLabel)}
        </div>
        <div style={chip("rgba(10,28,36,.7)", "rgba(214,167,84,.3)")}><span style={{ color: C.gold }}>◷</span> {t(S.hud.day)}</div>
        <div style={chip("rgba(10,28,36,.7)", "rgba(214,167,84,.3)")}><span style={{ color: C.greenLight }}>人</span> {t(S.hud.techs)} {data.techAvail}/{data.techTotal}</div>
        <div style={chip("linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.06))", "rgba(214,167,84,.5)")}>
          <span style={{ color: C.gold, fontSize: 15 }}>◎</span>
          <span style={{ color: C.goldText, fontWeight: 900 }}>{toWan(data.budget)} {t(S.hud.wan)}</span>
        </div>
        {profile && (
          <div onClick={() => { Sfx.click(); onProfile?.(); }} style={{ ...chip("rgba(10,28,36,.7)", "rgba(214,167,84,.3)"), cursor: "pointer" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle at 50% 35%, #2a6275, #103039)", border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.goldText, fontWeight: 900 }}>{(profile.nickname || profile.studentId || "?").slice(0, 1)}</span>
            <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.nickname || profile.studentId}</span>
          </div>
        )}
      </div>
    </div>
  );
}
