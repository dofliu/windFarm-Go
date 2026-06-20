import type { CSSProperties } from "react";
import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { CHARACTERS, portraitUrl } from "./characters";
import type { I18n } from "../game/systems/types";

// 立繪：等比 contain，預設貼底。可用 src 覆蓋（例如表情圖）
export function Portrait({ id, src, style }: { id: string; src?: string; style?: CSSProperties }) {
  return <img src={src ?? portraitUrl(id)} alt={id} style={{ objectFit: "contain", objectPosition: "bottom center", ...style }} />;
}

// 圓形頭像：用立繪/表情裁出頭部。headShot=true 時用於頭肩構圖（少縮放）
export function Avatar({ id, src, size = 44, headShot = false }: { id: string; src?: string; size?: number; headShot?: boolean }) {
  const s: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    backgroundImage: `url(${src ?? portraitUrl(id)})`,
    backgroundSize: headShot ? "135%" : "190%",
    backgroundPosition: headShot ? "50% 16%" : "50% 6%",
    backgroundRepeat: "no-repeat",
    border: `2px solid ${C.gold}`,
    boxShadow: "0 3px 10px rgba(0,0,0,.45)",
    flex: "none",
  };
  return <div style={s} />;
}

// 側邊跳出顧問：立繪 + 對話泡泡（含頭像、名稱、台詞）
export function AdvisorPopup({
  id,
  line,
  style,
  portraitH = 300,
  bubbleSide = "left",
  src,
  onClick,
}: {
  id: string;
  line: I18n;
  style?: CSSProperties;
  portraitH?: number;
  bubbleSide?: "left" | "right"; // 泡泡在立繪的哪一側
  src?: string; // 覆蓋立繪圖（例如表情）
  onClick?: () => void;
}) {
  useLang();
  const ch = CHARACTERS[id];
  const bubble = (
    <div style={{ maxWidth: 270, background: "linear-gradient(180deg, rgba(20,50,63,.96), rgba(13,36,46,.97))", border: "1px solid rgba(214,167,84,.55)", borderRadius: 8, padding: "10px 13px", boxShadow: "0 10px 26px rgba(0,0,0,.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Avatar id={id} src={src} size={34} headShot={!!src} />
        <span style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 14, color: C.goldText }}>{t(ch.name)}</span>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: C.cream }}>{t(line)}</div>
    </div>
  );
  const portrait = <Portrait id={id} src={src} style={{ height: portraitH, width: "auto", filter: "drop-shadow(0 8px 18px rgba(0,0,0,.5))" }} />;
  return (
    <div onClick={onClick} style={{ position: "absolute", display: "flex", alignItems: "flex-end", gap: 6, zIndex: 4, cursor: onClick ? "pointer" : undefined, ...style }}>
      {bubbleSide === "left" ? (
        <>
          {bubble}
          {portrait}
        </>
      ) : (
        <>
          {portrait}
          {bubble}
        </>
      )}
    </div>
  );
}
