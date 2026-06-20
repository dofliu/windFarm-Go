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

const bladeBase: CSSProperties = {
  position: "absolute",
  width: 3,
  background: "linear-gradient(180deg,#f1f6f7,#c2cfd3)",
  borderRadius: 2,
  transformOrigin: "1.5px 0",
};

// 純 CSS 風機（塔筒 + 旋轉葉片 + 輪轂），用於背景遠景
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
  };
  return (
    <div style={wrap}>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: p.poleLeft,
          width: 3,
          height: p.poleH,
          background: "linear-gradient(180deg,#eef4f5,#b6c4c9)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: p.rotorTop,
          left: p.rotorLeft,
          width: 0,
          height: 0,
          animation: `spin ${p.spin}s linear infinite`,
        }}
      >
        {[0, 120, 240].map((d) => (
          <div
            key={d}
            style={{ ...bladeBase, left: -1.5, top: 0, height: p.bladeH, transform: `rotate(${p.base + d}deg)` }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: p.hubTop,
          left: p.hubLeft,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#e6edef",
        }}
      />
    </div>
  );
}

// 母港水平線上的 6 座風機
export function HubTurbines() {
  const cfg = [
    { left: "16%", bottom: "45.5%", opacity: 0.32, scale: 0.75, spin: 13, base: 10 },
    { left: "33%", bottom: "46%", opacity: 0.45, scale: 0.95, spin: 11, base: 40 },
    { left: "51%", bottom: "45.2%", opacity: 0.5, scale: 1.1, spin: 9, base: 0 },
    { left: "67%", bottom: "46.3%", opacity: 0.4, scale: 0.85, spin: 12, base: 20 },
    { left: "80%", bottom: "45.6%", opacity: 0.3, scale: 0.7, spin: 14, base: 60 },
  ];
  return (
    <>
      {cfg.map((c, i) => (
        <Turbine
          key={i}
          {...c}
          w={46}
          h={78}
          poleH={56}
          bladeH={30}
          rotorTop={12}
          rotorLeft={24}
          poleLeft={22}
          hubTop={9}
          hubLeft={21}
        />
      ))}
    </>
  );
}

// 出海畫面遠方 3 座風機
export function SailTurbines() {
  const cfg = [
    { left: "21%", top: "248px", opacity: 0.4, scale: 0.8, spin: 12, base: 0 },
    { left: "62%", top: "240px", opacity: 0.5, scale: 1, spin: 9, base: 40 },
    { left: "74%", top: "252px", opacity: 0.36, scale: 0.75, spin: 13, base: 20 },
  ];
  return (
    <>
      {cfg.map((c, i) => (
        <Turbine
          key={i}
          {...c}
          w={40}
          h={64}
          poleH={46}
          bladeH={25}
          rotorTop={10}
          rotorLeft={20}
          poleLeft={19}
          hubTop={7}
          hubLeft={17}
        />
      ))}
    </>
  );
}
