import { C, FONT_SERIF } from "./tokens";

// 能力雷達圖(#radar):各維度 0–100 的多邊形雷達。零相依、純 SVG。
// axes: [{ label, value(0~100), n(作答數,選填) }]
export interface RadarAxis { label: string; value: number; n?: number }

export default function RadarChart({ axes, size = 220, accent = C.gold }: { axes: RadarAxis[]; size?: number; accent?: string }) {
  const N = axes.length;
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 30; // 半徑
  const padX = 52; // 左右留白,避免水平方向標籤(如「工安 100%」)被裁切
  const ang = (i: number) => (-90 + (i * 360) / N) * (Math.PI / 180);
  const pt = (i: number, r: number) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))] as const;
  const poly = (r: number) => Array.from({ length: N }, (_, i) => pt(i, r).join(",")).join(" ");
  const dataPoly = axes.map((a, i) => pt(i, (Math.max(0, Math.min(100, a.value)) / 100) * R).join(",")).join(" ");
  const rings = [0.25, 0.5, 0.75, 1];
  const col = (v: number) => (v >= 80 ? C.green : v >= 50 ? C.amber2 : C.red);

  return (
    <svg viewBox={`${-padX} 0 ${size + padX * 2} ${size}`} style={{ width: "100%", maxWidth: size + padX * 2, height: "auto", display: "block", margin: "0 auto" }}>
      {/* 格線環 */}
      {rings.map((rr, k) => (
        <polygon key={k} points={poly(R * rr)} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={1} />
      ))}
      {/* 軸線 */}
      {axes.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.12)" strokeWidth={1} />; })}
      {/* 資料多邊形 */}
      <polygon points={dataPoly} fill={`${accent}33`} stroke={accent} strokeWidth={2} />
      {/* 資料點 */}
      {axes.map((a, i) => { const [x, y] = pt(i, (Math.max(0, Math.min(100, a.value)) / 100) * R); return <circle key={i} cx={x} cy={y} r={3} fill={col(a.value)} />; })}
      {/* 標籤 + 百分比 */}
      {axes.map((a, i) => {
        const [lx, ly] = pt(i, R + 16);
        const anchor = Math.abs(lx - cx) < 6 ? "middle" : lx > cx ? "start" : "end";
        return (
          <text key={i} x={lx} y={ly} textAnchor={anchor as "start" | "middle" | "end"} dominantBaseline="middle" fontFamily={FONT_SERIF} fontSize={11} fill={C.cream}>
            {a.label} <tspan fill={col(a.value)} fontWeight={900}>{a.n ? `${a.value}%` : "—"}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
