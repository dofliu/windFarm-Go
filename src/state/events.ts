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
  // 機隊效果（#3 單一真實來源）：以「使機組故障/修復」實作可用率變化,而非調整獨立純量。
  // 由 advance() 在機隊推進前套用,故會真實反映在當日發電、SLA 與績效。
  fault?: number; // 使 n 台運轉中機組故障
  restore?: number; // 修復 n 台故障機組
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
    id: "overhaul", weight: 2, fault: 1,
    name: { zh: "定期大修", en: "Scheduled overhaul" },
    desc: { zh: "排程大修使一台機組停機檢修並產生成本。", en: "A planned overhaul takes a unit offline and costs budget." },
    apply: (s) => ({ budget: Math.max(0, s.budget - 2_000_000) }),
  },
  {
    id: "sudden_fault", weight: 3, fault: 1,
    name: { zh: "突發設備故障", en: "Sudden equipment fault" },
    desc: { zh: "另一台機組突發故障停機，全場可用率下降。", en: "Another unit faults unexpectedly — fleet availability drops." },
    apply: () => ({}),
  },
  {
    id: "rival_win", weight: 2,
    name: { zh: "競爭運維商搶單", en: "Rival wins a contract" },
    desc: { zh: "對手低價搶單，本季營收受影響。", en: "A rival undercuts you — revenue takes a hit this quarter." },
    apply: (s) => ({ budget: Math.max(0, s.budget - 1_000_000) }),
  },
  {
    id: "firmware_push", weight: 2, good: true, restore: 1,
    name: { zh: "原廠韌體更新", en: "OEM firmware update" },
    desc: { zh: "原廠推送修補，一台軟性故障機組自動復歸。", en: "OEM pushes a patch — a soft-faulted unit recovers." },
    apply: () => ({}),
  },
  {
    id: "calm_spell", weight: 3, good: true, restore: 1,
    name: { zh: "風平浪靜", en: "Calm spell" },
    desc: { zh: "天候穩定，運維順利，一台機組提前修復併網。", en: "Steady weather — smooth ops bring a unit back online." },
    apply: () => ({}),
  },

  // ───────── 戲劇性(非技術)事件(#2.2)：增加張力與代入感,不需新機制,以聲望/合規成本呈現 ─────────
  {
    id: "eco_protest", weight: 2,
    name: { zh: "環保團體抗議", en: "Environmental protest" },
    desc: { zh: "團體質疑工程對生態的影響,公關與暫緩作業產生額外成本。", en: "A group questions the ecological impact — PR and a brief work pause add cost." },
    apply: (s) => ({ budget: Math.max(0, s.budget - 1_500_000) }),
  },
  {
    id: "bad_press", weight: 2,
    name: { zh: "負面媒體報導", en: "Negative press" },
    desc: { zh: "一則停機事故報導見報,商譽受損、季度營收承壓。", en: "A downtime incident makes the news — reputation and quarterly revenue take a hit." },
    apply: (s) => ({ budget: Math.max(0, s.budget - 1_000_000) }),
  },
  {
    id: "media_spotlight", weight: 2, good: true,
    name: { zh: "正面媒體曝光", en: "Positive media spotlight" },
    desc: { zh: "高可用率獲產業媒體報導,招商與形象加分,挹注一筆收入。", en: "High availability earns industry coverage — image & investment up, a revenue boost." },
    apply: (s) => ({ budget: s.budget + 1_500_000 }),
  },
  {
    id: "community_support", weight: 2, good: true,
    name: { zh: "地方社區支持", en: "Community support" },
    desc: { zh: "與漁會/社區關係良好,作業協調順暢,獲地方回饋金。", en: "Good ties with the fishing community smooth operations — a local goodwill grant." },
    apply: (s) => ({ budget: s.budget + 800_000 }),
  },
  {
    id: "regulator_audit", weight: 1,
    name: { zh: "主管機關稽查", en: "Regulator audit" },
    desc: { zh: "主管機關進場稽查安全與環評承諾,合規應對產生成本。", en: "Regulators audit safety & permit compliance — handling it costs budget." },
    apply: (s) => ({ budget: Math.max(0, s.budget - 700_000) }),
  },
];

const TOTAL_WEIGHT = EVENTS.reduce((a, e) => a + e.weight, 0);
const BAD = EVENTS.filter((e) => !e.good);

// 觸發機率隨健康度下降而上升（#1 連鎖反應）；健康度過低時偏向壞事件。
// riskBoost：0~0.4 由 advance 依健康度算出；health：目前機組健康度。
export function rollEvent(riskBoost = 0, health = 100): GameEvent | null {
  const prob = Math.min(0.85, 0.35 + riskBoost);
  if (Math.random() > prob) return null;
  // 健康度低（<40）時，較高機率直接觸發壞事件（連鎖故障）
  const pool = health < 40 && Math.random() < 0.65 ? BAD : EVENTS;
  const total = pool.reduce((a, e) => a + e.weight, 0) || TOTAL_WEIGHT;
  let r = Math.random() * total;
  for (const e of pool) {
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
