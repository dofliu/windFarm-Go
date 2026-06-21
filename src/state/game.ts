import type { I18n } from "../game/systems/types";

// ───────── 全域遊戲狀態模型（A1 工單系統 / A2 採購 / A3 結算 / D1 存檔）─────────
export type SeaState = "workable" | "caution" | "closed";
export type QuestStage = "available" | "active" | "done";

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
}

export const DOWNTIME_PER_DAY = 30_000; // 機組停機每日損失（C）

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
};

// 推進 N 天：交付到貨的備品 + 扣除停機成本（C）
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
  return { day, pendingOrders: pend, inventory: inv, cargoUsed: cargo, budget: Math.max(0, s.budget - downtime) };
}

export type Action =
  | { type: "ACCEPT_QUEST" }
  | { type: "BUY"; partId: string; qty: number; cost: number; leadDays: number }
  | { type: "SELL"; partId: string; gain: number } // 賣出 1 件（#18）
  | { type: "FINISH_REPAIR"; quest: Quest; part?: string } // 維修完成 → 結算（A3）+ 消耗備品
  | { type: "DO_ROUTINE"; budget: number; xp: number } // 調度中心例行小任務（#21）
  | { type: "UPGRADE"; kind: "vessel" | "tech" | "tool"; cost: number } // 設施升級（A）
  | { type: "FAIL_REPAIR" } // 天氣窗關閉、撤離（#17）
  | { type: "REST" } // 靠港休整：進日 + 重新擲海象（#18）
  | { type: "NEXT_QUEST"; poolSize: number } // 下一關（#20 主線推進）
  | { type: "RESTART_CAMPAIGN" } // 重玩戰役（#20）
  | { type: "ASSIGN_QUEST"; quest: Quest } // 課程模式臨時指派（#6）
  | { type: "RESET" };

// 擲海象：約 6 成可作業、3 成警戒、1 成停航
function rollSea(): SeaState {
  const r = Math.random();
  return r < 0.6 ? "workable" : r < 0.9 ? "caution" : "closed";
}

export function reducer(s: GameData, a: Action): GameData {
  switch (a.type) {
    case "ACCEPT_QUEST":
      return { ...s, questStage: "active", repairDone: false, seaState: rollSea() };
    case "FAIL_REPAIR":
      return { ...s, availability: Math.max(0, s.availability - 4) };
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
      return { ...s, repairDone: true, questStage: "done", budget: s.budget + a.quest.rewardBudget, xp: s.xp + a.quest.rewardXp, availability: Math.min(100, s.availability + 8 + s.techLevel * 2), inventory: inv, cargoUsed: cargo, seenFaults: seen, missionsDone: s.missionsDone + 1 };
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
      return { ...s, ...advance(s, 1), customQuest: null, campaignIndex: s.campaignIndex + 1, questStage: "available", repairDone: false, seaState: rollSea() };
    }
    case "RESTART_CAMPAIGN":
      return { ...s, campaignIndex: 0, campaignDone: false, customQuest: null, questStage: "available", repairDone: false };
    case "ASSIGN_QUEST":
      return { ...s, customQuest: a.quest, questStage: "available", repairDone: false, seaState: rollSea() };
    case "RESET":
      return { ...INITIAL };
    default:
      return s;
  }
}

// 頂部列預算顯示（◎ → 萬）
export const toWan = (n: number) => Math.round(n / 10000).toLocaleString();
