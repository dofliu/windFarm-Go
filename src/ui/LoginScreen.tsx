import { useState } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { setProfile } from "../state/profile";
import { Sfx } from "../audio/sfx";

// 開場登入：輸入暱稱 + 班級碼即建立身分（供排行榜辨識）。可選「訪客」單機試玩。
export default function LoginScreen({ onDone }: { onDone: () => void }) {
  useLang();
  const [nickname, setNickname] = useState("");
  const [classCode, setClassCode] = useState("");

  const enter = (nick: string, cls: string) => {
    Sfx.click();
    setProfile({ nickname: nick.trim() || "訪客", classCode: cls.trim().toUpperCase() });
    onDone();
  };
  const canEnter = nickname.trim().length > 0;

  const field: React.CSSProperties = {
    width: "100%", padding: "11px 14px", marginTop: 6, borderRadius: 6,
    background: "rgba(8,22,28,.8)", border: "1px solid rgba(214,167,84,.4)",
    color: C.cream, fontSize: 15, outline: "none",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 40%, #14242d, #070d11 80%)", fontFamily: "'Noto Sans TC', sans-serif" }}>
      <div style={{ ...panel, width: 420, padding: 0, overflow: "hidden" }}>
        <div style={{ textAlign: "center", padding: "16px 0", background: "linear-gradient(180deg,#e8c074,#cf9a35)", color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 20 }}>
          {t({ zh: "離岸風場・運維傳說", en: "Offshore O&M Legend" })}
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.6, marginBottom: 14 }}>
            {t({ zh: "輸入暱稱與班級碼開始遊戲，你的成績將登上班級排行榜。", en: "Enter a nickname and class code to start — your score joins the class leaderboard." })}
          </div>

          <label style={{ fontSize: 13, color: C.cream, fontWeight: 700 }}>{t({ zh: "暱稱", en: "Nickname" })}</label>
          <input style={field} value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={16} placeholder={t({ zh: "例如：阿明", en: "e.g. Ming" })} onKeyDown={(e) => { if (e.key === "Enter" && canEnter) enter(nickname, classCode); }} />

          <label style={{ fontSize: 13, color: C.cream, fontWeight: 700, display: "block", marginTop: 14 }}>{t({ zh: "班級碼", en: "Class code" })}</label>
          <input style={field} value={classCode} onChange={(e) => setClassCode(e.target.value)} maxLength={12} placeholder={t({ zh: "教師提供（選填）", en: "from teacher (optional)" })} onKeyDown={(e) => { if (e.key === "Enter" && canEnter) enter(nickname, classCode); }} />

          <button disabled={!canEnter} onClick={() => enter(nickname, classCode)} style={{ width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: canEnter ? primaryBg(C.gold) : "rgba(255,255,255,.08)", color: canEnter ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 17, letterSpacing: ".06em", cursor: canEnter ? "pointer" : "not-allowed" }}>
            {t({ zh: "開 始", en: "START" })}
          </button>
          <div onClick={() => enter("訪客", "")} style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.mist, cursor: "pointer", textDecoration: "underline" }}>
            {t({ zh: "訪客單機試玩", en: "Play as guest" })}
          </div>
        </div>
      </div>
    </div>
  );
}
