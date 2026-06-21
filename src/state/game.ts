import type { I18n } from "../game/systems/types";
import { FARMS } from "./farms";
import { rollEvent, type EventStamp } from "./events";

// ───────── 全域遊戲狀態模型（A1 工單系統 / A2 採購 / A3 結算 / D1 存檔）─────────
export type SeaState = "workable" | "caution" | "closed";
export type QuestStage = "available" | "active" | "done";
export type JobPhase = "office" | "enroute" | "onsite"; // 出勤階段（#25）
export type Discipline = "mechanical" | "electrical" | "control" | "structural" | "hse";

export interface Engineer {
  id: string;
  name: string;
  discipline: Discipline;
  level: number;
}

export const SEA_INDEX: Record<SeaState, number> = { workable: 0, caution: 1, closed: 2 };
export const vesselSeaTol = (ownsSOV: boolean) => (ownsSOV ? 2 : 1); // CTV 可到 caution；SOV 可到 closed
export const BASE_GEN_PER_DAY = 120; // 100% 可用率每日發電量 (MWh)

// 海象標籤 / 圖示（單一真實來源，供各畫面與三日預報共用，#2）
export const SEA_LABEL: Record<SeaState, I18n> = {
  workable: { zh: "可作業", en: "Workable" },
  caution: { zh: "警戒", en: "Caution" },
  closed: { zh: "停航", en: "Closed" },
};
export const SEA_ICON: Record<SeaState, string> = { workable: "☀", caution: "⛅", closed: "🌀" };
export const FORECAST_DAYS = 3; // 微觀天氣預報展望天數（#2）

export interface Quest {
  id: string;
  title: I18n;
  brief: I18n;
  unit: string; // 機組編號（顯示）
  targetFault: string; // 對應 faults.ts 的故障 id（決定維修測驗）
  rewardBudget: number; // ◎
  rewardXp: number;
}

export interface GameData {
  budget: number; // ◎（頂部列顯示為「萬」）
  xp: number;
  day: number;
  techAvail: number;
  techTotal: number;
  availability: number; // 機組妥善率 %
  seaState: SeaState;
  questStage: QuestStage;
  questIndex: number; // 舊：工單池索引（保留相容）
  campaignIndex: number; // 主線戰役關卡索引（#20）
  campaignDone: boolean; // 戰役是否通關
  customQuest: Quest | null; // 課程模式臨時指派的任務（#6），非 null 時覆蓋主線
  repairDone: boolean; // 本工單維修是否完成
  cargoUsed: number;
  cargoCap: number;
  inventory: Record<string, number>; // partId -> 數量
  vesselLevel: number; // 船隊：每級 +2 作業窗（耐海象/效率）
  techLevel: number; // 技師公會：每級 +2 妥善率回復、+2 技師
  toolLevel: number; // 機具工坊：每級 SOP 步驟 -1 時段（最低 1）
  seenFaults: string[]; // 圖鑑：已修復過的故障
  missionsDone: number; // 排行榜 KPI
  pendingOrders: { partId: string; arriveDay: number; qty: number }[]; // 備品在途（lead time，C）
  engineers: Engineer[]; // 已招募技師（#27）
  ownsSOV: boolean; // 是否擁有 SOV（#26，可在高海象出航）
  jobPhase: JobPhase; // 出勤階段（#25）：office→enroute→onsite
  generationMWh: number; // 累積發電量（#28 KPI）
  farmsOwned: number; // 營運中的風場數（#34，預設 1）
  safetyIncidents: number; // 安全事件次數（#34，扣績效分）
  lastEvent: EventStamp | null; // 最近一次突發事件（#34）
  fleetHealth: number; // 機組健康度 0-100（#1）：忽略預兆/未修故障會衰退，提高連鎖故障機率
  forecast: SeaState[]; // 微觀天氣預報（#2）：未來 N 日海象預測，支援預防性排程
  overhaul: Overhaul | null; // 進行中的多回合大修（#4）：需連續可作業天氣窗，惡劣海象停滯+待命費
  quarter: number; // 目前合約季度（#3，自 1 起）
  quarterStartDay: number; // 本季起始日（#3）
  slaAvailSum: number; // 本季可用率每日累計（#3，用於平均）
  slaSamples: number; // 本季取樣天數（#3）
  slaPenalties: number; // 累計 SLA 違約次數（#3，扣績效分）
  lastSla: SlaResult | null; // 最近一次季度結算（#3）
}

// 多回合大修（#4）：重大組件更換需多個「可作業天氣窗」工日才完成。
export interface Overhaul {
  questId: string;
  unit: string; // 機組編號（顯示）
  fault: string; // 故障 id（完成後計入圖鑑）
  progress: number; // 已完成的可作業工日
  need: number; // 需要的可作業工日
  demurrageDays: number; // 因惡劣海象停滯（已付待命費）的天數
  rewardBudget: number; // 完成時發放
  rewardXp: number;
}

// 季度 SLA 結算結果（#3）
export interface SlaResult {
  quarter: number;
  avg: number; // 本季平均可用率 %
  floor: number; // 底線 %
  breached: boolean; // 是否違約
  penalty: number; // 違約金 ◎
  day: number;
}

export const OVERHAUL_NEED = 3; // 大修所需的可作業工日（#4）
export const DEMURRAGE_PER_DAY = 400_000; // 大修因惡劣海象停滯的船舶待命費／日（#4）
export const QUARTER_DAYS = 90; // 一季天數（#3）
export const SLA_FLOOR = 90; // 季度可用率底線 %（#3）
export const SLA_PENALTY = 5_000_000; // 違約金 ◎（#3）

export const DOWNTIME_PER_DAY = 30_000; // 機組停機每日損失（C）

// 多風場每日基準發電總和（owned 座風場的 genPerDay 加總）
function ownedFarmGen(farmsOwned: number): number {
  let g = 0;
  for (let i = 0; i < Math.min(farmsOwned, FARMS.length); i++) g += FARMS[i].genPerDay;
  return g;
}

// 綜合績效分（單一真實來源，#28/#34/#3）：發電量 + 可用率×5 + 完成任務×30 − 安全事件×20 + 風場×10 − SLA違約×25
export function computeScore(d: GameData): number {
  return Math.max(0, d.generationMWh + d.availability * 5 + d.missionsDone * 30 - d.safetyIncidents * 20 + d.farmsOwned * 10 - (d.slaPenalties ?? 0) * 25);
}

export const INITIAL: GameData = {
  budget: 84_200_000,
  xp: 0,
  day: 21,
  techAvail: 24,
  techTotal: 30,
  availability: 86,
  seaState: "workable",
  questStage: "available",
  questIndex: 0,
  campaignIndex: 0,
  campaignDone: false,
  customQuest: null,
  repairDone: false,
  cargoUsed: 620,
  cargoCap: 1000,
  inventory: {},
  vesselLevel: 0,
  techLevel: 0,
  toolLevel: 0,
  seenFaults: [],
  missionsDone: 0,
  pendingOrders: [],
  engineers: [{ id: "eng_start", name: "阿銘", discipline: "mechanical", level: 1 }], // 起始機械技師
  ownsSOV: false,
  jobPhase: "office",
  generationMWh: 0,
  farmsOwned: 1,
  safetyIncidents: 0,
  lastEvent: null,
  fleetHealth: 88,
  forecast: ["workable", "caution", "closed"], // 三日後有風暴：開局即示範預防性排程（#2）
  overhaul: null,
  quarter: 1,
  quarterStartDay: 21, // = INITIAL.day，本季自開局起算（#3）
  slaAvailSum: 0,
  slaSamples: 0,
  slaPenalties: 0,
  lastSla: null,
};

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// 推進 N 天：交付到貨備品 + 扣停機成本 + 多風場發電 + 人力回復 + 突發事件（C / #34）
function advance(s: GameData, days = 1): Partial<GameData> {
  const day = s.day + days;
  let inv = s.inventory;
  let cargo = s.cargoUsed;
  const pend: GameData["pendingOrders"] = [];
  for (const o of s.pendingOrders) {
    if (o.arriveDay <= day) {
      inv = { ...inv, [o.partId]: (inv[o.partId] ?? 0) + o.qty };
      cargo = Math.min(s.cargoCap, cargo + o.qty);
    } else pend.push(o);
  }
  const downtime = s.questStage === "active" && !s.repairDone ? DOWNTIME_PER_DAY * days : 0;
  const gen = s.generationMWh + Math.round((s.availability / 100) * ownedFarmGen(s.farmsOwned) * days); // 多風場發電累積（#28/#34）
  let patch: Partial<GameData> = {
    day,
    pendingOrders: pend,
    inventory: inv,
    cargoUsed: cargo,
    budget: Math.max(0, s.budget - downtime),
    generationMWh: gen,
    techAvail: Math.min(s.techTotal, s.techAvail + days), // 人力每日緩慢回復
  };
  // 機組健康度衰退（#1）：自然磨耗；未修故障加速劣化（連鎖反應的根源）
  const neglect = s.questStage === "active" && !s.repairDone ? 1.5 : 0;
  const health = clampN(s.fleetHealth - (0.5 + neglect) * days, 0, 100);
  patch.fleetHealth = health;
  // 天氣隨日推進（#2）：昨日預報實現為今日海象，並滾動更新三日預報
  const w = advanceWeather(s.seaState, s.forecast, days);
  patch.seaState = w.seaState;
  patch.forecast = w.forecast;
  // 大修進行中：安裝船每日待命費（demurrage，#4）。惡劣海象拉長工期 → 待命天數變多 → 總成本上升。
  if (s.overhaul) patch.budget = Math.max(0, (patch.budget ?? s.budget) - DEMURRAGE_PER_DAY * days);
  // 健康度越低 → 突發事件機率越高、且偏向壞事件（連鎖故障）
  const riskBoost = ((100 - health) / 100) * 0.4;
  const ev = rollEvent(riskBoost, health);
  if (ev) {
    const evPatch = ev.apply({ ...s, ...patch } as GameData);
    patch = { ...patch, ...evPatch, lastEvent: { id: ev.id, name: ev.name, desc: ev.desc, good: !!ev.good, day } };
  }
  // 合約 SLA（#3）：每日累計可用率，跨季結算；平均低於底線 → 扣違約金
  const avail = patch.availability ?? s.availability;
  let qStart = s.quarterStartDay;
  let quarter = s.quarter;
  let sum = s.slaAvailSum + avail * days;
  let samples = s.slaSamples + days;
  let penalties = s.slaPenalties;
  let lastSla = s.lastSla;
  if (day - qStart >= QUARTER_DAYS) {
    const avg = samples > 0 ? sum / samples : avail;
    const breached = avg < SLA_FLOOR;
    const penalty = breached ? SLA_PENALTY : 0;
    patch.budget = Math.max(0, (patch.budget ?? s.budget) - penalty);
    lastSla = { quarter, avg: Math.round(avg * 10) / 10, floor: SLA_FLOOR, breached, penalty, day };
    if (breached) penalties += 1;
    quarter += 1;
    qStart = day;
    sum = 0;
    samples = 0;
  }
  patch.quarter = quarter;
  patch.quarterStartDay = qStart;
  patch.slaAvailSum = sum;
  patch.slaSamples = samples;
  patch.slaPenalties = penalties;
  patch.lastSla = lastSla;
  return patch;
}

export type Action =
  | { type: "ACCEPT_QUEST" }
  | { type: "BUY"; partId: string; qty: number; cost: number; leadDays: number }
  | { type: "SELL"; partId: string; gain: number } // 賣出 1 件（#18）
  | { type: "FINISH_REPAIR"; quest: Quest; part?: string } // 維修完成 → 結算（A3）+ 消耗備品
  | { type: "START_OVERHAUL"; quest: Quest; part?: string } // 重大故障：拆檢完成後啟動多回合大修（#4）
  | { type: "ADVANCE_OVERHAUL" } // 推進大修一天（#4）：可作業窗 → 進度+1；惡劣海象 → 停滯+待命費
  | { type: "DO_ROUTINE"; budget: number; xp: number } // 調度中心例行小任務（#21）
  | { type: "UPGRADE"; kind: "vessel" | "tech" | "tool"; cost: number } // 設施升級（A）
  | { type: "HIRE"; engineer: Engineer; cost: number } // 招募技師（#27）
  | { type: "BUY_SOV"; cost: number } // 購置 SOV（#26）
  | { type: "UNLOCK_FARM"; cost: number } // 拓展新風場（#34）
  | { type: "DEPART" } // 出航 → enroute（#25）
  | { type: "ARRIVE" } // 抵達 → onsite（#25）
  | { type: "FAIL_REPAIR" } // 天氣窗關閉、撤離（#17）
  | { type: "REST" } // 靠港休整：進日 + 重新擲海象（#18）
  | { type: "NEXT_QUEST"; poolSize: number } // 下一關（#20 主線推進）
  | { type: "RESTART_CAMPAIGN" } // 重玩戰役（#20）
  | { type: "ASSIGN_QUEST"; quest: Quest } // 課程模式臨時指派（#6）
  | { type: "RESOLVE_TASK"; dAvail: number; dBudget: number; dSafety: number; dGen: number; dHealth: number; xp: number } // 自由營運沙盒任務結算
  | { type: "LOAD_STATE"; state: Partial<GameData> } // 雲端存檔載入（#31）
  | { type: "RESET" };

// ───────── 微觀天氣模型（#2）─────────
// 天氣有慣性（風暴成群出現）：用簡化的馬可夫轉移由前一日推算次日海象。
const SEA_ORDER: SeaState[] = ["workable", "caution", "closed"];
function nextSeaFrom(prev: SeaState): SeaState {
  const r = Math.random();
  switch (prev) {
    case "workable": return r < 0.62 ? "workable" : r < 0.9 ? "caution" : "closed";
    case "caution": return r < 0.42 ? "workable" : r < 0.8 ? "caution" : "closed";
    default /* closed */: return r < 0.22 ? "workable" : r < 0.62 ? "caution" : "closed";
  }
}
// 預報誤差：把預測值上/下移動一級（教學：預報不是百分百準確）
function jitterSea(s: SeaState): SeaState {
  const i = SEA_ORDER.indexOf(s);
  const dir = Math.random() < 0.5 ? -1 : 1;
  return SEA_ORDER[clampN(i + dir, 0, 2)];
}
// 由前一日海象產生未來 N 日預報
export function makeForecast(prev: SeaState, n = FORECAST_DAYS): SeaState[] {
  const out: SeaState[] = [];
  let cur = prev;
  for (let i = 0; i < n; i++) { cur = nextSeaFrom(cur); out.push(cur); }
  return out;
}
// 推進 days 天：每日「昨日預報」實現為今日海象（含 ~18% 預報誤差），並滾動補上新的尾日預報
function advanceWeather(today: SeaState, forecast: SeaState[], days: number): { seaState: SeaState; forecast: SeaState[] } {
  let cur = today;
  let fc = forecast.length ? [...forecast] : makeForecast(today);
  for (let d = 0; d < days; d++) {
    const predicted = fc[0] ?? nextSeaFrom(cur);
    cur = Math.random() < 0.18 ? jitterSea(predicted) : predicted;
    const rest = fc.slice(1);
    fc = [...rest, nextSeaFrom(rest[rest.length - 1] ?? cur)];
  }
  return { seaState: cur, forecast: fc };
}

export function reducer(s: GameData, a: Action): GameData {
  switch (a.type) {
    case "ACCEPT_QUEST":
      return { ...s, questStage: "active", repairDone: false, jobPhase: "office" };
    case "HIRE":
      if (a.cost > s.budget) return s;
      return { ...s, budget: s.budget - a.cost, engineers: [...s.engineers, a.engineer] };
    case "BUY_SOV":
      if (a.cost > s.budget || s.ownsSOV) return s;
      return { ...s, budget: s.budget - a.cost, ownsSOV: true };
    case "UNLOCK_FARM":
      if (a.cost > s.budget || s.farmsOwned >= FARMS.length) return s;
      return { ...s, budget: s.budget - a.cost, farmsOwned: s.farmsOwned + 1 };
    case "DEPART":
      return { ...s, jobPhase: "enroute" };
    case "ARRIVE":
      return { ...s, jobPhase: "onsite" };
    case "FAIL_REPAIR":
      // 撤離/返航改期 = 安全近失事件（#34），可用率小扣 + 安全計分
      return { ...s, jobPhase: "office", availability: Math.max(0, s.availability - 4), safetyIncidents: s.safetyIncidents + 1 };
    case "REST": {
      const adv = advance(s, 1);
      return { ...s, ...adv, availability: Math.min(100, s.availability + 1), fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + 1.5, 0, 100) };
    }
    case "BUY": {
      if (a.cost > s.budget) return s;
      if (a.leadDays > 0) {
        // 在途訂單：N 天後到貨
        return { ...s, budget: s.budget - a.cost, pendingOrders: [...s.pendingOrders, { partId: a.partId, arriveDay: s.day + a.leadDays, qty: a.qty }] };
      }
      const inv = { ...s.inventory, [a.partId]: (s.inventory[a.partId] ?? 0) + a.qty };
      return { ...s, budget: s.budget - a.cost, inventory: inv, cargoUsed: Math.min(s.cargoCap, s.cargoUsed + a.qty) };
    }
    case "SELL": {
      const have = s.inventory[a.partId] ?? 0;
      if (have <= 0) return s;
      return { ...s, budget: s.budget + a.gain, inventory: { ...s.inventory, [a.partId]: have - 1 }, cargoUsed: Math.max(0, s.cargoUsed - 1) };
    }
    case "FINISH_REPAIR": {
      if (s.questStage !== "active") return s;
      const inv = { ...s.inventory };
      let cargo = s.cargoUsed;
      if (a.part && (inv[a.part] ?? 0) > 0) {
        inv[a.part] = (inv[a.part] ?? 0) - 1; // 消耗 1 件必備備品
        cargo = Math.max(0, cargo - 1);
      }
      const seen = s.seenFaults.includes(a.quest.targetFault) ? s.seenFaults : [...s.seenFaults, a.quest.targetFault];
      return { ...s, repairDone: true, questStage: "done", jobPhase: "office", budget: s.budget + a.quest.rewardBudget, xp: s.xp + a.quest.rewardXp, availability: Math.min(100, s.availability + 8 + s.techLevel * 2), fleetHealth: clampN(s.fleetHealth + 8, 0, 100), inventory: inv, cargoUsed: cargo, seenFaults: seen, missionsDone: s.missionsDone + 1 };
    }
    case "START_OVERHAUL": {
      if (s.questStage !== "active" || s.overhaul) return s;
      const inv = { ...s.inventory };
      let cargo = s.cargoUsed;
      if (a.part && (inv[a.part] ?? 0) > 0) {
        inv[a.part] = (inv[a.part] ?? 0) - 1; // 拆檢即消耗必備備品（大組件）
        cargo = Math.max(0, cargo - 1);
      }
      return {
        ...s,
        jobPhase: "office",
        inventory: inv,
        cargoUsed: cargo,
        overhaul: { questId: a.quest.id, unit: a.quest.unit, fault: a.quest.targetFault, progress: 0, need: OVERHAUL_NEED, demurrageDays: 0, rewardBudget: a.quest.rewardBudget, rewardXp: a.quest.rewardXp },
      };
    }
    case "ADVANCE_OVERHAUL": {
      if (!s.overhaul) return s;
      const adv = advance(s, 1); // 天氣/天數推進、停機成本、健康度、SLA 累計
      const sea = (adv.seaState ?? s.seaState) as SeaState;
      const oh = s.overhaul;
      if (sea === "workable") {
        const progress = oh.progress + 1;
        if (progress >= oh.need) {
          const seen = s.seenFaults.includes(oh.fault) ? s.seenFaults : [...s.seenFaults, oh.fault];
          return {
            ...s,
            ...adv,
            overhaul: null,
            repairDone: true,
            questStage: "done",
            jobPhase: "office",
            budget: (adv.budget ?? s.budget) + oh.rewardBudget,
            xp: s.xp + oh.rewardXp,
            availability: Math.min(100, s.availability + 10 + s.techLevel * 2),
            fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + 12, 0, 100),
            seenFaults: seen,
            missionsDone: s.missionsDone + 1,
          };
        }
        return { ...s, ...adv, overhaul: { ...oh, progress } };
      }
      // 惡劣海象：大修停滯（進度不前），待命費已於 advance() 計入；累計停滯天數供顯示
      return { ...s, ...adv, overhaul: { ...oh, demurrageDays: oh.demurrageDays + 1 } };
    }
    case "DO_ROUTINE": {
      const adv = advance(s, 1);
      return { ...s, ...adv, budget: (adv.budget ?? s.budget) + a.budget, xp: s.xp + a.xp, availability: Math.min(100, s.availability + 1), missionsDone: s.missionsDone + 1 };
    }
    case "UPGRADE": {
      if (a.cost > s.budget) return s;
      const patch =
        a.kind === "vessel" ? { vesselLevel: s.vesselLevel + 1 } : a.kind === "tech" ? { techLevel: s.techLevel + 1, techTotal: s.techTotal + 2 } : { toolLevel: s.toolLevel + 1 };
      return { ...s, budget: s.budget - a.cost, ...patch };
    }
    case "NEXT_QUEST": {
      if (s.questStage !== "done") return s;
      const last = a.poolSize - 1;
      if (s.campaignIndex >= last) return { ...s, campaignDone: true, customQuest: null };
      return { ...s, ...advance(s, 1), customQuest: null, campaignIndex: s.campaignIndex + 1, questStage: "available", repairDone: false, jobPhase: "office" };
    }
    case "RESTART_CAMPAIGN":
      return { ...s, campaignIndex: 0, campaignDone: false, customQuest: null, questStage: "available", repairDone: false, jobPhase: "office" };
    case "ASSIGN_QUEST":
      return { ...s, customQuest: a.quest, questStage: "available", repairDone: false, jobPhase: "office" };
    case "RESOLVE_TASK": {
      // 自由營運沙盒：推進一天（含突發事件）後套用選擇效果，計入績效（沙盒，衝排行）
      const adv = advance(s, 1);
      return {
        ...s,
        ...adv,
        availability: Math.max(0, Math.min(100, (adv.availability ?? s.availability) + a.dAvail)),
        budget: Math.max(0, (adv.budget ?? s.budget) + a.dBudget),
        generationMWh: Math.max(0, (adv.generationMWh ?? s.generationMWh) + a.dGen),
        safetyIncidents: s.safetyIncidents + a.dSafety,
        fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + a.dHealth, 0, 100),
        xp: s.xp + a.xp,
        missionsDone: s.missionsDone + 1,
      };
    }
    case "LOAD_STATE":
      return { ...INITIAL, ...a.state };
    case "RESET":
      return { ...INITIAL };
    default:
      return s;
  }
}

// 頂部列預算顯示（◎ → 萬）
export const toWan = (n: number) => Math.round(n / 10000).toLocaleString();
