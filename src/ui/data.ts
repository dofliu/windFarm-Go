import type { I18n } from "../game/systems/types";

// 備品交易所：零件行情（行情百分比 ≥100 綠、<100 橘）
export interface Part {
  n: I18n;
  stars: number;
  idx: number; // 行情百分比
  qty: number;
  price: string;
}

export const PARTS: Part[] = [
  { n: { zh: "GFRP 葉片", en: "GFRP Blade" }, stars: 3, idx: 124, qty: 65, price: "8,140" },
  { n: { zh: "齒輪箱齒輪油", en: "Gearbox Oil" }, stars: 2, idx: 96, qty: 68, price: "258" },
  { n: { zh: "變槳軸承", en: "Pitch Bearing" }, stars: 3, idx: 122, qty: 65, price: "1,055" },
  { n: { zh: "偏航電機", en: "Yaw Motor" }, stars: 2, idx: 70, qty: 0, price: "202" },
  { n: { zh: "發電機碳刷", en: "Generator Brush" }, stars: 1, idx: 81, qty: 0, price: "169" },
  { n: { zh: "變流器模組", en: "Converter Module" }, stars: 3, idx: 106, qty: 81, price: "3,990" },
  { n: { zh: "液壓油", en: "Hydraulic Oil" }, stars: 2, idx: 107, qty: 195, price: "1,036" },
  { n: { zh: "螺栓組 M36", en: "Bolt Set M36" }, stars: 1, idx: 103, qty: 73, price: "445" },
  { n: { zh: "海纜接頭", en: "Subsea Cable Joint" }, stars: 2, idx: 105, qty: 243, price: "2,520" },
];

export function stars(n: number): string {
  return "★★★★★".slice(0, n);
}

// 維修作業：故障診斷隨堂測驗
export interface Quiz {
  question: I18n;
  options: I18n[];
  correct: number;
  feedbackOk: I18n;
  feedbackNo: I18n;
}

export const REPAIR_QUIZ: Quiz = {
  question: {
    zh: "齒輪箱油溫持續升高，下列何者應「最先」排查？",
    en: "Gearbox oil temperature keeps rising — which should you check FIRST?",
  },
  options: [
    { zh: "A. 變槳軸承潤滑脂量", en: "A. Pitch bearing grease level" },
    { zh: "B. 潤滑油油位與油質", en: "B. Lube oil level & condition" },
    { zh: "C. 塔筒地腳螺栓扭力", en: "C. Tower foundation bolt torque" },
    { zh: "D. 偏航煞車片間隙", en: "D. Yaw brake pad clearance" },
  ],
  correct: 1,
  feedbackOk: {
    zh: "✓ 正確！油位過低或油質劣化使潤滑與散熱下降，是齒輪箱油溫升高的首要排查項。",
    en: "✓ Correct! Low level or degraded oil reduces lubrication & cooling — the first thing to check.",
  },
  feedbackNo: {
    zh: "✗ 再想想：齒輪箱油溫異常，應先從潤滑與散熱系統著手。",
    en: "✗ Think again: for abnormal gearbox oil temp, start with the lubrication & cooling system.",
  },
};
