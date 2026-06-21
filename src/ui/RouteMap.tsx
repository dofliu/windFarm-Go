import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import type { VesselType } from "./Vessel";

// 出海動態航線俯瞰圖（Phase A #1）：港口 → 風場的俯瞰路線，船隻沿航線移動（取代純進度條）。
// progress 0-100 由 SailScreen 的 enroute 動畫驅動。
type P = { x: number; y: number };
const P0: P = { x: 60, y: 196 }; // 母港
const P1: P = { x: 292, y: 64 }; // 航線控制點
const P2: P = { x: 496, y: 110 }; // 風場
const bez = (u: number, a: number, b: number, c: number) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
const bezTan = (u: number, a: number, b: number, c: number) => 2 * (1 - u) * (b - a) + 2 * u * (c - b);

function TopTurbine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r={9} fill="none" stroke="rgba(244,248,249,.35)" strokeWidth={1.2} />
      <circle r={2} fill="#eef3f4" />
      {[0, 120, 240].map((d) => (
        <line key={d} x1={0} y1={0} x2={9 * Math.cos((d * Math.PI) / 180)} y2={9 * Math.sin((d * Math.PI) / 180)} stroke="#dfe9ea" strokeWidth={1.6} strokeLinecap="round" />
      ))}
    </g>
  );
}

export default function RouteMap({ progress, unit, vessel = "ctv" }: { progress: number; unit: string; vessel?: VesselType }) {
  const u = Math.max(0, Math.min(1, progress / 100));
  const ship: P = { x: bez(u, P0.x, P1.x, P2.x), y: bez(u, P0.y, P1.y, P2.y) };
  const ang = (Math.atan2(bezTan(u, P0.y, P1.y, P2.y), bezTan(u, P0.x, P1.x, P2.x)) * 180) / Math.PI;
  const wake = [0.05, 0.1, 0.16].map((d) => ({ x: bez(Math.max(0, u - d), P0.x, P1.x, P2.x), y: bez(Math.max(0, u - d), P0.y, P1.y, P2.y), o: 0.4 - d * 1.6 }));
  const hull = vessel === "jackup" ? "#6b5a3a" : vessel === "sov" ? "#3a5566" : "#41525c";
  const etaH = Math.max(0, Math.round((100 - progress) / 25));

  return (
    <div style={{ width: 560, maxWidth: "82vw", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(214,167,84,.5)", boxShadow: "0 18px 48px rgba(0,0,0,.55)", background: "linear-gradient(180deg,#10465a 0%,#0c3547 55%,#082734 100%)" }}>
      <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(180deg,#e8c074,#cf9a35)", color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900 }}>
        <span>🧭</span>{t({ zh: "航線圖 · 航行中", en: "Route Map · En route" })}
        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700 }}>{Math.round(progress)}% · ETA ~{etaH}h</span>
      </div>
      <svg viewBox="0 0 560 252" style={{ width: "100%", display: "block" }}>
        {/* 海面格線 */}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={30 + i * 34} x2={560} y2={30 + i * 34} stroke="rgba(255,255,255,.05)" />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 56} y1={0} x2={i * 56} y2={252} stroke="rgba(255,255,255,.05)" />
        ))}

        {/* 航線（虛線）+ 航點 */}
        <path d={`M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`} fill="none" stroke="rgba(232,192,116,.55)" strokeWidth={2} strokeDasharray="7 6" />
        {[0.25, 0.5, 0.75].map((wp) => (
          <circle key={wp} cx={bez(wp, P0.x, P1.x, P2.x)} cy={bez(wp, P0.y, P1.y, P2.y)} r={2.4} fill="rgba(232,192,116,.7)" />
        ))}

        {/* 母港 */}
        <g transform={`translate(${P0.x} ${P0.y})`}>
          <rect x={-26} y={-2} width={30} height={16} rx={2} fill="#9a7b3f" />
          <rect x={-22} y={-12} width={7} height={11} fill="#c69a45" />
          <rect x={-12} y={-9} width={7} height={8} fill="#b98e3c" />
          <line x1={4} y1={6} x2={16} y2={6} stroke="#caa341" strokeWidth={2} />
          <circle r={3.5} fill="#e8c074" />
        </g>
        <text x={P0.x - 24} y={P0.y + 30} fill={C.cream} fontSize={12} fontWeight={700}>{t({ zh: "母港", en: "Port" })}</text>

        {/* 風場 */}
        <TopTurbine x={P2.x} y={P2.y} s={1.05} />
        <TopTurbine x={P2.x + 26} y={P2.y - 18} s={0.85} />
        <TopTurbine x={P2.x + 22} y={P2.y + 22} s={0.85} />
        <TopTurbine x={P2.x - 24} y={P2.y - 24} s={0.8} />
        <text x={P2.x - 18} y={P2.y + 44} fill={C.goldText} fontSize={12} fontWeight={700}>{t({ zh: "風場", en: "Farm" })} · {unit}</text>

        {/* 船跡 */}
        {wake.map((w, i) => (
          <circle key={i} cx={w.x} cy={w.y} r={5 - i} fill="#bfe6ef" opacity={Math.max(0, w.o)} />
        ))}
        {/* 船（俯瞰） */}
        <g transform={`translate(${ship.x} ${ship.y}) rotate(${ang})`}>
          <ellipse cx={0} cy={0} rx={12} ry={5.5} fill={hull} stroke="#0d1f27" strokeWidth={0.8} />
          <path d={`M 12 0 L 5 -4.5 L 5 4.5 Z`} fill="#dfe9ea" />
          <rect x={-5} y={-3} width={7} height={6} rx={1} fill="#eef3f4" />
        </g>
      </svg>
    </div>
  );
}
