import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import { useGame } from "../state/GameContext";
import { FARMS } from "../state/farms";

// 俯瞰角度的單台風機（從上往下看：基礎環 + 三葉旋轉）
function TopTurbine({ x, y, spin, base, active }: { x: number; y: number; spin: number; base: number; active: boolean }) {
  const blade = active ? "rgba(244,248,249,.95)" : "rgba(150,170,178,.5)";
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ position: "absolute", left: -6, top: -6, width: 12, height: 12, borderRadius: "50%", background: active ? "radial-gradient(circle,#e6eef0,#7f969d)" : "radial-gradient(circle,#5f7178,#3a484e)", border: "1px solid rgba(0,0,0,.3)", boxShadow: "0 2px 4px rgba(0,0,0,.4)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, animation: active ? `spin ${spin}s linear infinite` : undefined }}>
        {[0, 120, 240].map((d) => (
          <div key={d} style={{ position: "absolute", left: -1.5, top: -1.5, width: 3, height: 24, background: `linear-gradient(180deg, ${blade}, rgba(180,195,200,.25))`, borderRadius: 2, transformOrigin: "1.5px 1.5px", transform: `rotate(${base + d}deg)` }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: -2.5, top: -2.5, width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
    </div>
  );
}

// 俯瞰變電站（OSS，黃色方塊 + 直升機坪）
function TopOSS({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ position: "absolute", left: -16, top: -12, width: 32, height: 24, background: "linear-gradient(180deg,#e8c45a,#bf922c)", borderRadius: 3, border: "1px solid rgba(0,0,0,.3)", boxShadow: "0 3px 6px rgba(0,0,0,.45)" }} />
      <div style={{ position: "absolute", left: -8, top: -8, width: 16, height: 16, borderRadius: "50%", border: "2px solid #2a2a2a", color: "#2a2a2a", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>H</div>
    </div>
  );
}

// 俯瞰運維船（航跡中）
function TopVessel({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ position: "absolute", left: -30, top: 3, width: 30, height: 2, background: "linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.4))" }} />
      <div style={{ width: 10, height: 22, background: "linear-gradient(180deg,#5a6c7a,#26323b)", borderRadius: "5px 5px 3px 3px", boxShadow: "0 2px 4px rgba(0,0,0,.4)" }} />
    </div>
  );
}

// 俯瞰風場全景（#32）：rows×cols 機組陣列；隨營運風場數擴增欄數。
export default function AerialFarm() {
  const { data } = useGame();
  const rows = 5;
  const cols = 6 + data.farmsOwned * 2; // 風場越多、陣列越大（1 座=8 欄；4 座=14 欄）
  const x0 = 360;
  const y0 = 200;
  const dx = Math.min(96, (1180 - x0) / (cols - 1));
  const dy = 96;
  const cells: { x: number; y: number; spin: number; base: number; active: boolean }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const stagger = (r % 2) * (dx / 2); // 交錯排列更自然
      cells.push({ x: x0 + c * dx + stagger, y: y0 + r * dy, spin: 9 + ((r + c) % 5), base: (r * 37 + c * 53) % 360, active: c < cols - 1 });
    }
  }
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      {/* 深海俯視底色 */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 42%, #1d586c 0%, #103d4d 55%, #082530 100%)" }} />
      {/* 海面紋理 */}
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(118deg, rgba(255,255,255,.035) 0 2px, rgba(255,255,255,0) 2px 26px)" }} />
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(62deg, rgba(0,0,0,.05) 0 2px, rgba(0,0,0,0) 2px 30px)" }} />

      {cells.map((c, i) => (
        <TopTurbine key={i} {...c} />
      ))}
      <TopOSS x={x0 + (cols - 1) * dx} y={y0 + 2 * dy} />
      <TopVessel x={x0 + 2 * dx + 40} y={y0 + dy + 30} />

      {/* 全景資訊標籤 */}
      <div style={{ position: "absolute", left: "50%", bottom: 110, transform: "translateX(-50%)", textAlign: "center", textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>
        <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 18, color: C.goldText }}>{t({ zh: "風場全景（俯瞰）", en: "Wind Farm — Aerial" })}</div>
        <div style={{ fontSize: 13, color: C.cream, marginTop: 2 }}>{rows}×{cols} {t({ zh: "機組陣列", en: "turbine array" })} · {t({ zh: "營運風場", en: "Farms" })} {data.farmsOwned}/{FARMS.length}</div>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 45%, rgba(6,18,24,0) 60%, rgba(6,18,24,.5) 100%)", pointerEvents: "none" }} />
    </div>
  );
}
