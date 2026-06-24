import { useState, type CSSProperties } from "react";

const B = import.meta.env.BASE_URL;

// 滿版循環場景影片:附 poster 首幀,載入/解碼失敗自動隱藏(回退到底層 CSS/圖,不破畫面)。
export function SceneVideo({ file, poster, style }: { file: string; poster?: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <video
      key={file}
      src={`${B}assets/scenes/${file}`}
      poster={poster ? `${B}assets/scenes/${poster}` : undefined}
      autoPlay
      loop
      muted
      playsInline
      onError={() => setFailed(true)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }}
    />
  );
}

// 情境圖:載入失敗自動隱藏。
export function FallbackImg({ file, alt, style }: { file: string; alt?: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={`${B}assets/scenes/${file}`} alt={alt ?? ""} onError={() => setFailed(true)} style={style} />;
}
