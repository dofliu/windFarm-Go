import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import { useGame } from "../state/GameContext";
import { FARMS } from "../state/farms";

// 60° 斜俯瞰的單台風機：塔筒直立 + 機艙 + 旋翼平面以 scaleY 壓扁模擬傾斜視角
function ObliqueTurbine({ x, y, sz, op, spin, base, z }: { x: number; y: number; sz: number; op: number; spin: number; base: number; z: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${sz})`, transformOrigin: "bottom center", opacity: op, zIndex: z }}>
      {/* 基礎 */}
      <div style={{ position: "absolute", left: -5, bottom: -4, width: 10, height: 7, background: "linear-gradient(180deg,#e8c45a,#b8902f)", borderRadius: "2px 2px 1px 1px", boxShadow: "0 2px 3px rgba(0,0,0,.4)" }} />
      {/* 漸縮塔筒 */}
      <div style={{ position: "absolute", left: -2, bottom: 0, width: 4, height: 30, background: "linear-gradient(90deg,#b3c1c6,#f2f6f7,#9fb0b6)", clipPath: "polygon(30% 0,70% 0,62% 100%,38% 100%)" }} />
      {/* 機艙 */}
      <div style={{ position: "absolute", left: -6, bottom: 27, width: 13, height: 5, background: "linear-gradient(180deg,#eef3f4,#a3b3b9)", borderRadius: 2 }} />
      {/* 傾斜旋翼（scaleY 壓扁 → 約 60° 視角的橢圓盤面） */}
      <div style={{ position: "absolute", left: 0, bottom: 30, transform: "scaleY(0.5)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, animation: `spin ${spin}s linear infinite` }}>
          {[0, 120, 240].map((d) => (
            <div key={d} style={{ position: "absolute", left: -1.5, top: 0, width: 3, height: 17, background: "linear-gradient(180deg,#f4f8f9,#aebbc0)", clipPath: "polygon(34% 0,66% 0,55% 100%,45% 100%)", transformOrigin: "1.5px 0", transform: `rotate(${base + d}deg)` }} />
          ))}
        </div>
        <div style={{ position: "absolute", left: -2, top: -2, width: 4, height: 4, borderRadius: "50%", background: "#fff" }} />
      </div>
    </div>
  );
}

function ObliqueOSS({ x, y, sz, z }: { x: number; y: number; sz: number; z: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${sz})`, transformOrigin: "bottom center", zIndex: z }}>
      <div style={{ position: "absolute", left: -16, bottom: 6, width: 34, height: 18, background: "linear-gradient(180deg,#edca60,#bf922c)", borderRadius: 3, boxShadow: "0 3px 6px rgba(0,0,0,.45)" }} />
      <div style={{ position: "absolute", left: -12, bottom: 18, width: 12, height: 12, background: "linear-gradient(180deg,#e2dccb,#b8b1a0)", borderRadius: 2 }} />
      <div style={{ position: "absolute", left: 6, bottom: 20, width: 9, height: 9, borderRadius: "50%", border: "2px solid #2a2a2a", color: "#2a2a2a", fontSize: 7, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>H</div>
      <div style={{ position: "absolute", left: -12, bottom: -6, width: 3, height: 14, background: "#cda63f", transform: "skewX(12deg)" }} />
      <div style={{ position: "absolute", right: -12, bottom: -6, width: 3, height: 14, background: "#cda63f", transform: "skewX(-12deg)" }} />
    </div>
  );
}

function ObliqueVessel({ x, y, sz, z }: { x: number; y: number; sz: number; z: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${sz})`, transformOrigin: "bottom center", zIndex: z }}>
      <div style={{ position: "absolute", left: -34, bottom: 5, width: 32, height: 2, background: "linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.5))" }} />
      <div style={{ position: "relative", width: 26, height: 9, background: "linear-gradient(180deg,#5a6c7a,#26323b)", borderRadius: "3px 5px 5px 4px" }}>
        <div style={{ position: "absolute", top: -5, left: 4, width: 8, height: 6, background: "#eef2f3", borderRadius: "2px 2px 0 0" }} />
        <div style={{ position: "absolute", top: 4, left: 0, right: 0, height: 1.5, background: "#e0a83e" }} />
      </div>
    </div>
  );
}

// 俯瞰風場全景（#32, 60° 斜角 + 遠近透視）：rows×cols 機組陣列向地平線收斂。
export default function AerialFarm() {
  const { data } = useGame();
  const rows = 6; // 深度（遠→近）
  const cols = 7 + data.farmsOwned; // 寬度，隨營運風場數增加
  const cx = 800;
  const cells: { x: number; y: number; sz: number; op: number; spin: number; base: number; z: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const td = r / (rows - 1); // 0 遠 → 1 近
    const sz = 0.55 + td * 1.15;
    const y = 168 + Math.pow(td, 1.35) * 470; // 遠列偏上、近列偏下
    const op = 0.5 + td * 0.5;
    const width = 300 + td * 880; // 遠列窄、近列寬（透視收斂）
    for (let c = 0; c < cols; c++) {
      const fx = cols === 1 ? 0 : c / (cols - 1) - 0.5;
      cells.push({ x: cx + fx * width, y, sz, op, spin: 9 + ((r + c) % 5), base: (r * 47 + c * 31) % 360, z: 10 + r });
    }
  }
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      {/* 60° 視角：上方仍可見天空與地平線 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "22%", background: "linear-gradient(180deg,#8fb6cf 0%,#bcd3dd 70%,#d6e2dd 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "22%", bottom: 0, background: "linear-gradient(180deg,#2e7d94 0%,#1c5d72 30%,#11455a 65%,#082530 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "21.6%", height: 1, background: "rgba(255,255,255,.4)" }} />
      {/* 海面紋理（近大遠小用兩層） */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "22%", bottom: 0, background: "repeating-linear-gradient(180deg, rgba(255,255,255,.04) 0 2px, rgba(255,255,255,0) 2px 24px)" }} />

      {cells.map((c, i) => (
        <ObliqueTurbine key={i} {...c} />
      ))}
      <ObliqueOSS x={cx + 0.42 * (300 + 0.5 * 880)} y={168 + Math.pow(0.5, 1.35) * 470} sz={0.9} z={16} />
      <ObliqueVessel x={cx - 0.3 * (300 + 0.8 * 880)} y={168 + Math.pow(0.8, 1.35) * 470 + 20} sz={1.0 + 0.8 * 0.6} z={19} />

      {/* 全景資訊 */}
      <div style={{ position: "absolute", left: "50%", bottom: 92, transform: "translateX(-50%)", textAlign: "center", textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>
        <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 18, color: C.goldText }}>{t({ zh: "風場全景（60° 斜俯瞰）", en: "Wind Farm — Aerial (60°)" })}</div>
        <div style={{ fontSize: 13, color: C.cream, marginTop: 2 }}>{rows}×{cols} {t({ zh: "機組陣列", en: "turbine array" })} · {t({ zh: "營運風場", en: "Farms" })} {data.farmsOwned}/{FARMS.length}</div>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(6,18,24,0) 62%, rgba(6,18,24,.5) 100%)", pointerEvents: "none" }} />
    </div>
  );
}
