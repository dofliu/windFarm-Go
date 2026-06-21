import type { CSSProperties } from "react";

interface TurbineProps {
  left: string;
  bottom?: string;
  top?: string;
  w: number;
  h: number;
  opacity: number;
  scale: number;
  spin: number; // 轉速秒數
  base: number; // 葉片基準角
  poleH: number;
  bladeH: number;
  rotorTop: number;
  rotorLeft: number;
  poleLeft: number;
  hubTop: number;
  hubLeft: number;
}

// 純 CSS 風機（漸縮塔筒 + 機艙 + 成型葉片 + 輪轂），背景遠景／近景皆用
export default function Turbine(p: TurbineProps) {
  const wrap: CSSProperties = {
    position: "absolute",
    left: p.left,
    bottom: p.bottom,
    top: p.top,
    width: p.w,
    height: p.h,
    opacity: p.opacity,
    transform: `scale(${p.scale})`,
    transformOrigin: "bottom center",
  };
  return (
    <div style={wrap}>
      {/* 漸縮塔筒（底寬頂窄） */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: p.poleLeft - 2.5,
          width: 8,
          height: p.poleH,
          background: "linear-gradient(90deg,#b8c6cb,#f2f6f7 45%,#9fb0b6)",
          clipPath: "polygon(36% 0,64% 0,72% 100%,28% 100%)",
        }}
      />
      {/* 機艙（nacelle） */}
      <div
        style={{
          position: "absolute",
          top: p.hubTop - 3,
          left: p.hubLeft - 8,
          width: 19,
          height: 9,
          background: "linear-gradient(180deg,#eef3f4,#a3b3b9)",
          borderRadius: "3px 4px 4px 3px",
          boxShadow: "0 1px 2px rgba(0,0,0,.25)",
        }}
      />
      {/* 旋轉葉片（3 片成型） */}
      <div style={{ position: "absolute", top: p.rotorTop, left: p.rotorLeft, width: 0, height: 0, animation: `spin ${p.spin}s linear infinite` }}>
        {[0, 120, 240].map((d) => (
          <div
            key={d}
            style={{
              position: "absolute",
              left: -3,
              top: 0,
              width: 6,
              height: p.bladeH,
              background: "linear-gradient(180deg,#f4f8f9,#b6c4c9)",
              clipPath: "polygon(34% 0,66% 0,56% 100%,44% 100%)",
              transformOrigin: "3px 0",
              transform: `rotate(${p.base + d}deg)`,
            }}
          />
        ))}
      </div>
      {/* 輪轂 */}
      <div style={{ position: "absolute", top: p.hubTop, left: p.hubLeft, width: 8, height: 8, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%,#f4f8f9,#9fb0b6)", border: "1px solid #85959b", zIndex: 2 }} />
    </div>
  );
}

// 母港近景風機（放大、細節更多 #32）— 配置可由背景主題覆寫
const HUB_DEFAULT = [
  { left: "30%", bottom: "40%", opacity: 0.9, scale: 1.7, spin: 10, base: 0 },
  { left: "46%", bottom: "36%", opacity: 1, scale: 2.3, spin: 8.5, base: 40 },
  { left: "62%", bottom: "39%", opacity: 0.92, scale: 1.85, spin: 11, base: 20 },
  { left: "75%", bottom: "43%", opacity: 0.66, scale: 1.2, spin: 12.5, base: 60 },
];
export function HubTurbines({ layout }: { layout?: typeof HUB_DEFAULT } = {}) {
  const cfg = layout ?? HUB_DEFAULT;
  return (
    <>
      {cfg.map((c, i) => (
        <Turbine key={i} {...c} w={60} h={150} poleH={116} bladeH={66} rotorTop={28} rotorLeft={30} poleLeft={28} hubTop={24} hubLeft={26} />
      ))}
    </>
  );
}

// 出海畫面遠方 3 座風機
export function SailTurbines() {
  const cfg = [
    { left: "21%", top: "248px", opacity: 0.4, scale: 0.95, spin: 12, base: 0 },
    { left: "62%", top: "238px", opacity: 0.55, scale: 1.2, spin: 9, base: 40 },
    { left: "74%", top: "252px", opacity: 0.4, scale: 0.85, spin: 13, base: 20 },
  ];
  return (
    <>
      {cfg.map((c, i) => (
        <Turbine key={i} {...c} w={44} h={80} poleH={58} bladeH={32} rotorTop={12} rotorLeft={20} poleLeft={19} hubTop={9} hubLeft={17} />
      ))}
    </>
  );
}
