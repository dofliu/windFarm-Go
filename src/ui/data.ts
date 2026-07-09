import type { I18n } from "../game/systems/types";

// 備品交易所：零件行情（行情百分比 ≥100 綠、<100 橘）
export interface Part {
  id: string;
  n: I18n;
  stars: number;
  idx: number; // 行情百分比
  qty: number;
  price: string; // 顯示用；數值見 priceNum()
  minTier?: number; // 解鎖層級（#76 Tier）：≤ 當前 tier 才在交易所/倉儲呈現。預設 1
}

// 價格 ◎（≈ NT$）採真實量級：耗材數萬、組件數十～數百萬、大型組件（葉片/主軸承）數百～近千萬。
// minTier（#76）：耗材/入門備品 Tier 1 即可購；中組件 Tier 2；較大組件 Tier 3；最大組件 Tier 4。
export const PARTS: Part[] = [
  // ── 大型組件（重吊/安裝船級）──
  { id: "gfrp_blade", n: { zh: "GFRP 葉片", en: "GFRP Blade" }, stars: 3, idx: 124, qty: 65, price: "9,000,000", minTier: 4 },
  { id: "main_bearing", n: { zh: "主軸承", en: "Main Bearing" }, stars: 3, idx: 118, qty: 24, price: "3,500,000", minTier: 4 },
  { id: "converter", n: { zh: "變流器模組", en: "Converter Module" }, stars: 3, idx: 106, qty: 81, price: "2,600,000", minTier: 2 },
  { id: "pitch_bearing", n: { zh: "變槳軸承", en: "Pitch Bearing" }, stars: 3, idx: 122, qty: 65, price: "1,800,000", minTier: 3 },
  { id: "drive_bearing", n: { zh: "傳動軸承組(發電機/主軸)", en: "Drivetrain Bearing Set (gen/main-shaft)" }, stars: 3, idx: 110, qty: 30, price: "1,300,000", minTier: 3 }, // 傳動鏈滾動軸承(發電機/主軸振動維修級);與 Tier4 主軸承全換(main_bearing)區隔
  { id: "igbt_module", n: { zh: "IGBT 功率模組", en: "IGBT Power Module" }, stars: 3, idx: 112, qty: 40, price: "1,200,000", minTier: 3 },
  // ── 中型組件（數十～數百萬）──
  { id: "main_controller", n: { zh: "主控制器 PLC", en: "Main Controller (PLC)" }, stars: 3, idx: 99, qty: 28, price: "900,000", minTier: 2 },
  { id: "cable_joint", n: { zh: "海纜接頭", en: "Subsea Cable Joint" }, stars: 2, idx: 105, qty: 243, price: "900,000", minTier: 3 },
  { id: "transformer_bushing", n: { zh: "變壓器套管", en: "Transformer Bushing" }, stars: 2, idx: 97, qty: 26, price: "350,000", minTier: 3 },
  { id: "yaw_motor", n: { zh: "偏航電機", en: "Yaw Motor" }, stars: 2, idx: 70, qty: 6, price: "700,000", minTier: 1 }, // 修:原 qty 0 讓 Tier1 必需品看似缺貨(qty 僅展示)
  { id: "yaw_gear", n: { zh: "偏航齒輪組", en: "Yaw Gear Set" }, stars: 2, idx: 92, qty: 18, price: "600,000", minTier: 2 },
  { id: "pitch_controller", n: { zh: "變槳控制器", en: "Pitch Controller" }, stars: 2, idx: 101, qty: 30, price: "500,000", minTier: 2 },
  { id: "slip_ring", n: { zh: "集電環", en: "Slip Ring" }, stars: 2, idx: 88, qty: 22, price: "400,000", minTier: 2 },
  { id: "pitch_battery", n: { zh: "變槳後備電池", en: "Pitch Backup Battery" }, stars: 2, idx: 109, qty: 54, price: "250,000", minTier: 2 },
  { id: "cooling_pump", n: { zh: "冷卻泵", en: "Coolant Pump" }, stars: 2, idx: 103, qty: 47, price: "220,000", minTier: 2 },
  { id: "hydraulic_valve", n: { zh: "液壓閥組", en: "Hydraulic Valve Block" }, stars: 2, idx: 98, qty: 60, price: "180,000", minTier: 2 },
  { id: "lift_part", n: { zh: "塔內升降機組件", en: "Service Lift Part" }, stars: 1, idx: 100, qty: 33, price: "110,000", minTier: 2 },
  { id: "contactor", n: { zh: "主接觸器", en: "Main Contactor" }, stars: 1, idx: 102, qty: 88, price: "120,000", minTier: 2 },
  // ── 小件/耗材（數萬）──
  { id: "brake_pad", n: { zh: "偏航煞車片", en: "Yaw Brake Pad" }, stars: 1, idx: 96, qty: 120, price: "90,000", minTier: 1 },
  { id: "transformer_oil", n: { zh: "變壓器油", en: "Transformer Oil" }, stars: 1, idx: 104, qty: 140, price: "90,000", minTier: 2 },
  { id: "gearbox_oil", n: { zh: "齒輪箱齒輪油", en: "Gearbox Oil" }, stars: 2, idx: 96, qty: 68, price: "80,000", minTier: 1 },
  { id: "anemometer", n: { zh: "風速計", en: "Anemometer" }, stars: 1, idx: 90, qty: 75, price: "60,000", minTier: 1 },
  { id: "hydraulic_oil", n: { zh: "液壓油", en: "Hydraulic Oil" }, stars: 2, idx: 107, qty: 195, price: "60,000", minTier: 2 },
  { id: "bolt_m36", n: { zh: "螺栓組 M36", en: "Bolt Set M36" }, stars: 1, idx: 103, qty: 73, price: "50,000", minTier: 2 },
  { id: "corrosion_anode", n: { zh: "犧牲陽極(防蝕)", en: "Sacrificial Anode" }, stars: 1, idx: 100, qty: 90, price: "55,000", minTier: 2 },
  { id: "seal_kit", n: { zh: "油封組", en: "Seal Kit" }, stars: 1, idx: 99, qty: 160, price: "45,000", minTier: 1 },
  { id: "gen_brush", n: { zh: "發電機碳刷", en: "Generator Brush" }, stars: 1, idx: 81, qty: 24, price: "40,000", minTier: 1 }, // 修:原 qty 0 讓 Tier1 必需品看似缺貨(qty 僅展示)
  { id: "leading_edge_tape", n: { zh: "葉片前緣保護帶", en: "Leading-edge Tape" }, stars: 1, idx: 100, qty: 210, price: "35,000", minTier: 2 },
  { id: "gearbox_filter", n: { zh: "齒輪箱濾芯", en: "Gearbox Filter" }, stars: 1, idx: 98, qty: 130, price: "30,000", minTier: 1 },
  { id: "coolant", n: { zh: "冷卻液", en: "Coolant" }, stars: 1, idx: 101, qty: 180, price: "25,000", minTier: 1 },
  { id: "grease", n: { zh: "潤滑脂", en: "Grease" }, stars: 1, idx: 100, qty: 240, price: "20,000", minTier: 1 },
  // ── 工安/HSE 耗材（#2 HSE 科別加厚）──
  { id: "fall_arrest_kit", n: { zh: "墜落防護組(安全帶/SRL)", en: "Fall-arrest Kit (harness/SRL)" }, stars: 1, idx: 100, qty: 64, price: "45,000", minTier: 2 },
  { id: "comms_radio", n: { zh: "防爆對講機組", en: "ATEX Comms Radio Set" }, stars: 1, idx: 100, qty: 70, price: "35,000", minTier: 2 },
  { id: "loto_kit", n: { zh: "上鎖掛牌組(LOTO)", en: "Lockout/Tagout Kit" }, stars: 1, idx: 100, qty: 96, price: "28,000", minTier: 2 },
];
// 取 ≤ tier 的備品子集（#76）：交易所/倉儲漸進揭露
export const partsForTier = (tier: number): Part[] => PARTS.filter((p) => (p.minTier ?? 1) <= tier);

export const priceNum = (p: Part) => Number(p.price.replace(/,/g, ""));
export const fmt = (n: number) => n.toLocaleString();

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
