import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useDialogue } from "../state/DialogueContext";
import { CHARACTERS, portraitUrl, exprUrl } from "./characters";

// 底部中央對話框：播放 say() 佇列中的訊息（#7）
export default function DialogueLayer() {
  useLang();
  const { current, next } = useDialogue();
  if (!current) return null;
  const ch = CHARACTERS[current.speaker];
  const img = current.expr ? exprUrl(current.speaker, current.expr) : portraitUrl(current.speaker);

  return (
    <div onClick={next} style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 24, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <img src={img} alt={current.speaker} style={{ height: 200, width: "auto", objectFit: "contain", objectPosition: "bottom center", filter: "drop-shadow(0 10px 20px rgba(0,0,0,.6))" }} />
        <div style={{ width: 560, background: "linear-gradient(180deg, rgba(20,50,63,.97), rgba(13,36,46,.98))", border: "1px solid rgba(214,167,84,.6)", borderRadius: 10, padding: "14px 18px", boxShadow: "0 16px 40px rgba(0,0,0,.6)" }}>
          <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.goldText, marginBottom: 6 }}>{ch ? t(ch.name) : current.speaker}</div>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: C.cream, minHeight: 48 }}>{t(current.line)}</div>
          <div style={{ marginTop: 6, textAlign: "right", fontSize: 12, color: C.mist }}>{t({ zh: "▶ 點擊繼續", en: "▶ Click to continue" })}</div>
        </div>
      </div>
    </div>
  );
}
