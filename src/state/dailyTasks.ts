// 每日任務系統（#78）：綁「遊戲內日曆」(GameData.day)，每個遊戲內日給一組小目標，
// 達成自動發獎(XP+現金)並計連續達成(streak)，強化長線動機。
// 設計取捨：週期綁遊戲內日(已與設計者確認)→ 教學一致、可重現、跨裝置不混亂。
// 純資料/純函式集中於此；reducer 僅存 DailyState 與發獎(見 game.ts ROLL_DAILY/CLAIM_DAILY)，
// 由 DailyTracker 元件在日推進時 roll、達成時 claim。
import type { I18n } from "../game/systems/types";
import type { GameData, DailyState } from "./game";
import { fleetUptime } from "./game";

export interface DailyDef {
  id: string;
  desc: I18n;
  xp: number;
  cash: number; // 達成獎勵 ◎
  // 是否達成：以「自今日起始的增量(base)」或「當前狀態」判定
  met: (d: GameData, base: DailyState["base"]) => boolean;
}

export const DAILY_GEN_TARGET = 100; // 今日淨發電增量目標 (MWh)
export const DAILY_PER_DAY = 3; // 每日開放的小目標數

// 任務池：條件取自既有 GameData 欄位的「當日增量」或「當前狀態」，全部可由 state 推導(可測)。
export const DAILY_DEFS: DailyDef[] = [
  { id: "resolve2", desc: { zh: "今日於戰情室修復 2 台機組", en: "Resolve 2 turbines in Fleet Ops today" }, xp: 30, cash: 200_000, met: (d, b) => (d.fleetResolved ?? 0) - b.resolved >= 2 },
  { id: "mission1", desc: { zh: "今日完成 1 件工單／任務", en: "Complete 1 work order/task today" }, xp: 25, cash: 150_000, met: (d, b) => d.missionsDone - b.missions >= 1 },
  { id: "gen", desc: { zh: `今日淨發電 ≥ ${DAILY_GEN_TARGET} MWh`, en: `Generate ≥ ${DAILY_GEN_TARGET} MWh today` }, xp: 25, cash: 150_000, met: (d, b) => d.generationMWh - b.gen >= DAILY_GEN_TARGET },
  { id: "noincident", desc: { zh: "今日零安全事件", en: "Zero safety incidents today" }, xp: 20, cash: 120_000, met: (d, b) => (d.safetyIncidents ?? 0) - b.safety <= 0 },
  { id: "health", desc: { zh: "維持機組健康度 ≥ 60%", en: "Keep fleet health ≥ 60%" }, xp: 20, cash: 120_000, met: (d) => d.fleetHealth >= 60 },
  { id: "uptime", desc: { zh: "維持機隊妥善率 ≥ 85%", en: "Keep fleet uptime ≥ 85%" }, xp: 25, cash: 150_000, met: (d) => fleetUptime(d.fleet) >= 85 },
];

export const dailyDef = (id: string): DailyDef | undefined => DAILY_DEFS.find((x) => x.id === id);

// FNV-1a 字串雜湊（與 campaign.ts 一致風格）
function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// 依 seed+day 決定性抽 DAILY_PER_DAY 個不重複任務 id（可重現）
export function pickDailyIds(day: number, seed: string): string[] {
  const pool = DAILY_DEFS.map((x) => x.id);
  const out: string[] = [];
  let h = hashStr(`${seed}:day:${day}`);
  for (let k = 0; k < DAILY_PER_DAY && pool.length; k++) {
    h = (Math.imul(h ^ (h >>> 15), 2246822519)) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out;
}

// 為某遊戲內日建立每日任務狀態（baseline = 當前累積值）；prev 用於延續/重置 streak。
export function rollDailyState(day: number, seed: string, d: GameData, prev: DailyState | null): DailyState {
  const prevFull = !!prev && prev.claimed.length >= prev.ids.length;
  return {
    day,
    ids: pickDailyIds(day, seed),
    base: { resolved: d.fleetResolved ?? 0, missions: d.missionsDone, gen: d.generationMWh, safety: d.safetyIncidents ?? 0 },
    claimed: [],
    streak: prevFull && prev ? prev.streak : 0, // 前一組全完成 → 延續連勝，否則歸零
  };
}

// 目前「已達成但尚未發獎」的任務 id（DailyTracker 據此自動 claim）
export function dueDailyClaims(d: GameData): string[] {
  const dl = d.daily;
  if (!dl) return [];
  return dl.ids.filter((id) => !dl.claimed.includes(id) && (dailyDef(id)?.met(d, dl.base) ?? false));
}

// 全部完成？
export const dailyAllDone = (dl: DailyState | null): boolean => !!dl && dl.claimed.length >= dl.ids.length;
