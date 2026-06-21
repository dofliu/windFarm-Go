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
}

export const DOWNTIME_PER_DAY = 30_000; // 機組停機每日損失（C）

// 多風場每日基準發電總和（owned 座風場的 genPerDay 加總）
function ownedFarmGen(farmsOwned: number): number {
  let g = 0;
  for (let i = 0; i < Math.min(farmsOwned, FARMS.length); i++) g += FARMS[i].genPerDay;
  return g;
}

// 綜合績效分（單一真實來源，#28/#34）：發電量 + 可用率×5 + 完成任務×30 − 安全事件×20 + 風場×10
export function computeScore(d: GameData): number {
  return Math.max(0, d.generationMWh + d.availability * 5 + d.missionsDone * 30 - d.safetyIncidents * 20 + d.farmsOwned * 10);
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
};

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
  // 突發隨機事件（#34）
  const ev = rollEvent();
  if (ev) {
    const evPatch = ev.apply({ ...s, ...patch } as GameData);
    patch = { ...patch, ...evPatch, lastEvent: { id: ev.id, name: ev.name, desc: ev.desc, good: !!ev.good, day } };
  }
  return patch;
}

export type Action =
  | { type: "ACCEPT_QUEST" }
  | { type: "BUY"; partId: string; qty: number; cost: number; leadDays: number }
  | { type: "SELL"; partId: string; gain: number } // 賣出 1 件（#18）
  | { type: "FINISH_REPAIR"; quest: Quest; part?: string } // 維修完成 → 結算（A3）+ 消耗備品
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
  | { type: "RESOLVE_TASK"; dAvail: number; dBudget: number; dSafety: number; dGen: number; xp: number } // 自由營運沙盒任務結算
  | { type: "LOAD_STATE"; state: Partial<GameData> } // 雲端存檔載入（#31）
  | { type: "RESET" };

// 擲海象：約 6 成可作業、3 成警戒、1 成停航
function rollSea(): SeaState {
  const r = Math.random();
  return r < 0.6 ? "workable" : r < 0.9 ? "caution" : "closed";
}

export function reducer(s: GameData, a: Action): GameData {
  switch (a.type) {
    case "ACCEPT_QUEST":
      return { ...s, questStage: "active", repairDone: false, jobPhase: "office", seaState: rollSea() };
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
    case "REST":
      return { ...s, ...advance(s, 1), seaState: rollSea(), availability: Math.min(100, s.availability + 1) };
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
      return { ...s, repairDone: true, questStage: "done", jobPhase: "office", budget: s.budget + a.quest.rewardBudget, xp: s.xp + a.quest.rewardXp, availability: Math.min(100, s.availability + 8 + s.techLevel * 2), inventory: inv, cargoUsed: cargo, seenFaults: seen, missionsDone: s.missionsDone + 1 };
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
      return { ...s, ...advance(s, 1), customQuest: null, campaignIndex: s.campaignIndex + 1, questStage: "available", repairDone: false, jobPhase: "office", seaState: rollSea() };
    }
    case "RESTART_CAMPAIGN":
      return { ...s, campaignIndex: 0, campaignDone: false, customQuest: null, questStage: "available", repairDone: false, jobPhase: "office" };
    case "ASSIGN_QUEST":
      return { ...s, customQuest: a.quest, questStage: "available", repairDone: false, jobPhase: "office", seaState: rollSea() };
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
