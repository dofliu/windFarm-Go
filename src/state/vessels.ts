import type { I18n } from "../game/systems/types";

// 多元船隊（#4）：每種船型在「耐海象 / 載量 / 同時工單 / 動員天數 / 成本 / 作業窗 / 磨耗」上各有取捨。
// seaTol 對應 SEA_INDEX：0 = 僅可作業(workable)、1 = 可到警戒(caution)、2 = 可到停航(closed)。
export type VesselClass = "crew_boat" | "ctv" | "sov" | "jackup" | "mothership";

export interface VesselSpec {
  id: VesselClass;
  name: I18n;
  short: I18n; // 短標籤（HUD 用）
  icon: string;
  seaTol: 0 | 1 | 2; // 耐海象
  cargo: number; // 載量（每趟可帶備品數，數值化作展示與比較）
  jobCap: number; // 同時可支援的現場工單基數（再 + 整備等級）
  mobilizeDays: number; // 動員/購置就緒天數
  sortieCost: number; // 每趟出航動員成本 ◎
  windowBonus: number; // 維修作業窗加成（時段）
  wearRate: number; // 每趟磨耗
  purchaseCost: number; // 購置成本 ◎（0 = 開局即擁有）
  desc: I18n;
}

// 注意：CTV 的 jobCap(2)/seaTol(1)/sortieCost(250k)/wearRate(16) 與既有常數一致，確保行為相容。
export const VESSELS: VesselSpec[] = [
  {
    id: "crew_boat",
    name: { zh: "快艇（Crew Boat）", en: "Crew Boat" },
    short: { zh: "快艇", en: "Crew Boat" },
    icon: "🚤",
    seaTol: 0, cargo: 1, jobCap: 1, mobilizeDays: 0, sortieCost: 120_000, windowBonus: 0, wearRate: 22, purchaseCost: 3_000_000,
    desc: { zh: "輕快便宜、當日可出，但僅能在平穩海象作業，載量與同時工單最少。適合緊急小修。", en: "Fast & cheap, same-day sortie, but calm seas only with the least cargo & job capacity. Good for quick small fixes." },
  },
  {
    id: "ctv",
    name: { zh: "CTV 人員運輸船", en: "CTV (Crew Transfer Vessel)" },
    short: { zh: "CTV", en: "CTV" },
    icon: "⛴️",
    seaTol: 1, cargo: 2, jobCap: 2, mobilizeDays: 1, sortieCost: 250_000, windowBonus: 0, wearRate: 16, purchaseCost: 0,
    desc: { zh: "日常運維主力，可在警戒海象作業，成本均衡。開局即擁有。", en: "The day-to-day workhorse; works up to caution seas at balanced cost. Owned from the start." },
  },
  {
    id: "sov",
    name: { zh: "SOV 運維母船", en: "SOV (Service Operation Vessel)" },
    short: { zh: "SOV", en: "SOV" },
    icon: "🚢",
    seaTol: 2, cargo: 4, jobCap: 4, mobilizeDays: 2, sortieCost: 500_000, windowBonus: 2, wearRate: 10, purchaseCost: 30_000_000,
    desc: { zh: "可在停航海象出航的運維母船，運動補償舷梯延長作業窗、同時支援多組工單。動員 2 天。", en: "Sails even in closed seas; a motion-compensated gangway extends the work window and supports many jobs. 2-day mobilisation." },
  },
  {
    id: "jackup",
    name: { zh: "安裝船（Jack-up）", en: "Jack-up Vessel" },
    short: { zh: "安裝船", en: "Jack-up" },
    icon: "🏗️",
    seaTol: 2, cargo: 6, jobCap: 3, mobilizeDays: 3, sortieCost: 900_000, windowBonus: 1, wearRate: 8, purchaseCost: 80_000_000,
    desc: { zh: "自升式重吊平台，大組件更換（葉片/主軸承/齒輪箱）的唯一選擇；載量大但動員慢、待命費高。", en: "Self-elevating heavy-lift platform — the only option for major component swaps (blade/main-bearing/gearbox). Huge cargo but slow to mobilise & costly on standby." },
  },
  {
    id: "mothership",
    name: { zh: "母船（W2W 母船）", en: "Mothership (W2W)" },
    short: { zh: "母船", en: "Mothership" },
    icon: "🛳️",
    seaTol: 2, cargo: 8, jobCap: 6, mobilizeDays: 2, sortieCost: 700_000, windowBonus: 3, wearRate: 6, purchaseCost: 120_000_000,
    desc: { zh: "頂級駐場母船,搭載子船與直升機坪,最大載量與同時工單、最長作業窗、最低磨耗。遠海大場的旗艦。", en: "Top-tier on-field mothership with daughter craft & helideck: max cargo & jobs, longest work window, lowest wear. Flagship for large far-shore farms." },
  },
];

export const vesselSpec = (id: VesselClass): VesselSpec => VESSELS.find((v) => v.id === id) ?? VESSELS[1];
