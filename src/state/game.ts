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
  questIndex: number; // 工單池索引（#4 多故障輪替）
  customQuest: Quest | null; // 課程模式臨時指派的任務（#6），非 null 時覆蓋工單池
  repairDone: boolean; // 本工單維修是否完成
  cargoUsed: number;
  cargoCap: number;
  inventory: Record<string, number>; // partId -> 數量
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
  customQuest: null,
  repairDone: false,
  cargoUsed: 620,
  cargoCap: 1000,
  inventory: {},
};

export type Action =
  | { type: "ACCEPT_QUEST" }
  | { type: "BUY"; partId: string; qty: number; cost: number }
  | { type: "SELL"; partId: string; gain: number } // 賣出 1 件（#18）
  | { type: "FINISH_REPAIR"; quest: Quest } // 維修完成 → 結算（A3）
  | { type: "FAIL_REPAIR" } // 天氣窗關閉、撤離（#17）
  | { type: "REST" } // 靠港休整：進日 + 重新擲海象（#18）
  | { type: "NEXT_QUEST"; poolSize: number } // 下一筆工單（#4 輪替到新故障）
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
      return { ...s, day: s.day + 1, seaState: rollSea(), availability: Math.min(100, s.availability + 1) };
    case "BUY": {
      if (a.cost > s.budget) return s;
      const inv = { ...s.inventory, [a.partId]: (s.inventory[a.partId] ?? 0) + a.qty };
      return { ...s, budget: s.budget - a.cost, inventory: inv, cargoUsed: Math.min(s.cargoCap, s.cargoUsed + a.qty) };
    }
    case "SELL": {
      const have = s.inventory[a.partId] ?? 0;
      if (have <= 0) return s;
      return { ...s, budget: s.budget + a.gain, inventory: { ...s.inventory, [a.partId]: have - 1 }, cargoUsed: Math.max(0, s.cargoUsed - 1) };
    }
    case "FINISH_REPAIR":
      if (s.questStage !== "active") return s;
      return {
        ...s,
        repairDone: true,
        questStage: "done",
        budget: s.budget + a.quest.rewardBudget,
        xp: s.xp + a.quest.rewardXp,
        availability: Math.min(100, s.availability + 8),
      };
    case "NEXT_QUEST":
      if (s.questStage !== "done") return s;
      return { ...s, customQuest: null, questIndex: (s.questIndex + 1) % a.poolSize, questStage: "available", repairDone: false, day: s.day + 1, seaState: rollSea() };
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
