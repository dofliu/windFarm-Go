import type { CSSProperties } from "react";

// 設計稿 design tokens（色彩、漸層、字型），集中管理避免散落
export const C = {
  gold: "#d9a441",
  goldBright: "#e8c074",
  goldDeep: "#b07d2a",
  goldText: "#f1d99a",
  cream: "#f4ead2",
  mist: "#9fb9c2",
  mist2: "#9fc2cc",
  mist3: "#8fb3bd",
  green: "#7fce8e",
  greenBright: "#62c281",
  greenLight: "#9be0a8",
  amber: "#e3ad42",
  amber2: "#e89a5b",
  red: "#dc6450",
  redText: "#f0cbc4",
  ink: "#3a2708",
};

export const FONT_SERIF = "'Noto Serif TC', serif";
export const FONT_SANS = "'Noto Sans TC', sans-serif";
export const FONT_CINZEL = "'Cinzel', serif";

export const goldBtnBg = "linear-gradient(180deg, #e8c074 0%, #d9a441 100%)";
export const primaryBg = (accent = C.gold) => `linear-gradient(180deg, ${accent} 0%, #b07d2a 100%)`;

// 深海面板
export const panel: CSSProperties = {
  background: "linear-gradient(180deg, rgba(20,50,63,.94), rgba(13,36,46,.96))",
  border: "1px solid rgba(214,167,84,.45)",
  borderRadius: 6,
  boxShadow: "0 12px 32px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)",
  overflow: "hidden",
};

// 面板金色標題列
export const panelHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 14px",
  background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))",
  borderBottom: "1px solid rgba(214,167,84,.35)",
};

export const panelTitle: CSSProperties = {
  fontFamily: FONT_SERIF,
  fontWeight: 700,
  fontSize: 15,
  color: C.cream,
  whiteSpace: "nowrap",
};

// 藥丸狀資源 chip
export const chip: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 13px",
  borderRadius: 20,
  background: "rgba(10,28,36,.7)",
  border: "1px solid rgba(214,167,84,.3)",
};

// 圓形徽章（地點標記、動作鈕、Logo）
export function circle(size: number, fontSize: number): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    background: "radial-gradient(circle at 50% 35%, #1d4d5d, #0f3140)",
    border: "2px solid #d9a441",
    boxShadow: "0 6px 16px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT_SERIF,
    fontSize,
    fontWeight: 900,
    color: C.goldText,
  };
}

export const stripe = "repeating-linear-gradient(45deg,#2a5562 0 6px,#244c58 6px 12px)";
