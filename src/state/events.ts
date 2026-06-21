import type { I18n } from "../game/systems/types";
import type { GameData } from "./game";

// 突發隨機事件（#34）：日推進時依機率觸發，套用效果並記錄到 lastEvent。
// 純資料驅動：apply 回傳要覆蓋的欄位（已在呼叫端夾值/合併）。
export interface GameEvent {
  id: string;
  name: I18n;
  desc: I18n;
  good?: boolean; // 正面事件（UI 用綠色）
  weight: number; // 相對權重
  apply: (s: GameData) => Partial<GameData>;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const EVENTS: GameEvent[] = [
  {
    id: "crew_shortage", weight: 3,
    name: { zh: "人員短缺", en: "Crew shortage" },
    desc: { zh: "技師請假，可出勤人力下降。", en: "Engineers on leave — available crew down." },
    apply: (s) => ({ techAvail: clamp(s.techAvail - 3, 0, s.techTotal) }),
  },
  {
    id: "strike", weight: 1,
    name: { zh: "技師罷工", en: "Engineer strike" },
    desc: { zh: "勞資爭議，今日大量人力停擺。", en: "Labour dispute — much of the crew is off today." },
    apply: (s) => ({ techAvail: clamp(s.techAvail - 6, 0, s.techTotal) }),
  },
  {
    id: "delivery_delay", weight: 3,
    name: { zh: "供應商交貨延遲", en: "Supplier delay" },
    desc: { zh: "海象/物流問題，在途備品到貨延後 2 天。", en: "Logistics hit — incoming parts delayed by 2 days." },
    apply: (s) => ({ pendingOrders: s.pendingOrders.map((o) => ({ ...o, arriveDay: o.arriveDay + 2 })) }),
  },
  {
    id: "overhaul", weight: 2,
    name: { zh: "定期大修", en: "Scheduled overhaul" },
    desc: { zh: "排程大修暫時拉低可用率並產生成本。", en: "A planned overhaul temporarily lowers availability and costs budget." },
    apply: (s) => ({ availability: clamp(s.availability - 5, 0, 100), budget: Math.max(0, s.budget - 2_000_000) }),
  },
  {
    id: "sudden_fault", weight: 3,
    name: { zh: "突發設備故障", en: "Sudden equipment fault" },
    desc: { zh: "其他機組突發故障，全場可用率下降。", en: "Another unit faults unexpectedly — fleet availability drops." },
    apply: (s) => ({ availability: clamp(s.availability - 6, 0, 100) }),
  },
  {
    id: "rival_win", weight: 2,
    name: { zh: "競爭運維商搶單", en: "Rival wins a contract" },
    desc: { zh: "對手低價搶單，本季營收受影響。", en: "A rival undercuts you — revenue takes a hit this quarter." },
    apply: (s) => ({ budget: Math.max(0, s.budget - 1_000_000) }),
  },
  {
    id: "firmware_push", weight: 2, good: true,
    name: { zh: "原廠韌體更新", en: "OEM firmware update" },
    desc: { zh: "原廠推送修補，全場稼動提升。", en: "OEM pushes a patch — fleet performance improves." },
    apply: (s) => ({ availability: clamp(s.availability + 3, 0, 100) }),
  },
  {
    id: "calm_spell", weight: 3, good: true,
    name: { zh: "風平浪靜", en: "Calm spell" },
    desc: { zh: "天候穩定，運維順利、稼動小幅提升。", en: "Steady weather — smooth ops, slight availability gain." },
    apply: (s) => ({ availability: clamp(s.availability + 2, 0, 100) }),
  },
];

const TOTAL_WEIGHT = EVENTS.reduce((a, e) => a + e.weight, 0);

// 約 35% 機率觸發一個事件（依權重），否則回 null（平靜的一天）。
export function rollEvent(): GameEvent | null {
  if (Math.random() > 0.35) return null;
  let r = Math.random() * TOTAL_WEIGHT;
  for (const e of EVENTS) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return null;
}

export interface EventStamp {
  id: string;
  name: I18n;
  desc: I18n;
  good: boolean;
  day: number;
}
