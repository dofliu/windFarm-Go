import type { CSSProperties } from "react";

// 設施圖示（階段:介面）：以一致的金色線條 SVG 呈現各設施,於圓形徽章內顯示。
// 技師公會改用人物立繪(見 HubScreen,portraitUrl)。其餘以下列向量圖示,免外部素材、任意縮放清晰。
const base = (extra?: CSSProperties): CSSProperties => ({ width: 18, height: 18, display: "block", ...extra });
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export type FacIconName = "dispatch" | "ops" | "warroom" | "tool" | "parts" | "vessel" | "farms" | "build" | "codex" | "ranking";

// 調度中心：耳機/通訊
export const DispatchIcon = () => (
  <svg viewBox="0 0 24 24" style={base()}><path {...S} d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect {...S} x="2.5" y="13" width="3.5" height="6" rx="1.4" /><rect {...S} x="18" y="13" width="3.5" height="6" rx="1.4" /></svg>
);
// 自由營運中心：羅盤
export const OpsIcon = () => (
  <svg viewBox="0 0 24 24" style={base()}><circle {...S} cx="12" cy="12" r="9" /><path {...S} fill="currentColor" d="M12 6l2.4 5.6L12 18l-2.4-6.4z" /></svg>
);
// 風場戰情室：雷達
export const WarroomIcon = () => (
  <svg viewBox="0 0 24 24" style={base()}><circle {...S} cx="12" cy="12" r="9" /><circle {...S} cx="12" cy="12" r="4.5" /><path {...S} d="M12 12l6-3" /><circle cx="17.5" cy="8.5" r="1.4" fill="currentColor" /></svg>
);
// 機具工坊：扳手
export const ToolIcon = () => (
  <svg viewBox="0 0 24 24" style={base()}><path {...S} d="M15.6 6.4a3.6 3.6 0 0 0-4.7 4.6L4 17.9 6.1 20l6.9-6.9a3.6 3.6 0 0 0 4.6-4.7l-2.2 2.2-2.1-.6-.6-2.1z" /></svg>
);
// 備品交易所：貨箱
export const PartsIcon = () => (
  <svg viewBox="0 0 24 24" style={base()}><path {...S} d="M12 3l8 4v10l-8 4-8-4V7z" /><path {...S} d="M4 7l8 4 8-4M12 11v10" /></svg>
);
// 船隊整備廠：作業船
export const VesselIcon = () => (
  <svg viewBox="0 0 24 24" style={base()}><path {...S} d="M3 15h18l-2.2 4.2a1 1 0 0 1-.9.6H6.1a1 1 0 0 1-.9-.6z" /><path {...S} d="M6 15V9h7l3 6M9 9V6h3" /></svg>
);
// 風場拓展：風機
export const FarmsIcon = () => (
  <svg viewBox="0 0 24 24" style={base()}><path {...S} d="M12 12v9M9.5 21h5" /><circle cx="12" cy="11" r="1.5" fill="currentColor" /><path {...S} d="M12 9.5V3M12 12.4l5.5 3.2M12 12.4L6.5 15.6" /></svg>
);
// 風場建置（番外篇）：吊車
export const BuildIcon = () => (
  <svg viewBox="0 0 24 24" style={base()}><path {...S} d="M5 21V4h13M5 4l14 3M9 7v2M9 7l-4 3" /><path {...S} d="M18 4v4M18 8v3" /><rect {...S} x="16.5" y="11" width="3" height="2.4" rx="0.4" /></svg>
);
// 圖鑑：書
export const CodexIcon = () => (
  <svg viewBox="0 0 24 24" style={base({ width: 15, height: 15 })}><path {...S} d="M4 5.5A2 2 0 0 1 6 4h5v15H6a2 2 0 0 0-2 2z" /><path {...S} d="M20 5.5A2 2 0 0 0 18 4h-5v15h5a2 2 0 0 1 2 2z" /></svg>
);
// 排行：獎盃
export const RankingIcon = () => (
  <svg viewBox="0 0 24 24" style={base({ width: 15, height: 15 })}><path {...S} d="M7 4h10v4a5 5 0 0 1-10 0z" /><path {...S} d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M10 13h4M9 20h6M12 13v3" /></svg>
);

const MAP: Record<FacIconName, () => JSX.Element> = {
  dispatch: DispatchIcon, ops: OpsIcon, warroom: WarroomIcon, tool: ToolIcon, parts: PartsIcon,
  vessel: VesselIcon, farms: FarmsIcon, build: BuildIcon, codex: CodexIcon, ranking: RankingIcon,
};

export function FacGlyph({ name }: { name: FacIconName }) {
  const Cmp = MAP[name];
  return <Cmp />;
}
