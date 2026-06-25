// 每週主題挑戰（#79）：綁「遊戲內週」(每 7 個遊戲內日)，每週一個主題 + 一個挑戰目標。
// 主題會影響戰情室隨機故障率(faultMult，落實「綁事件池」)，並給較大獎勵 + 連續完成週(streak)。
// 與每日任務(#78)共用「baseline + 自動發獎」框架,但在週尺度。純資料/純函式集中於此。
import type { I18n } from "../game/systems/types";
import type { GameData, WeeklyState } from "./game";
import { fleetUptime } from "./game";

export const WEEK_DAYS = 7; // 一個遊戲內週的天數
export const weekOf = (day: number): number => Math.floor(day / WEEK_DAYS);
const MIN_DAYS = 4; // 「維持型」目標需經過的天數，避免一開週就被判定達成

export interface WeekTheme {
  id: string;
  icon: string;
  name: I18n;
  desc: I18n; // 主題說明
  goal: I18n; // 本週挑戰目標描述
  xp: number;
  cash: number; // 達成獎勵 ◎
  faultMult: number; // 對戰情室隨機故障率的影響(風暴>1、平穩<1、其餘=1)→ 綁事件池
  met: (d: GameData, base: WeeklyState["base"]) => boolean;
}

export const WEEK_THEMES: WeekTheme[] = [
  {
    id: "storm", icon: "🌀", name: { zh: "風暴週", en: "Storm Week" },
    desc: { zh: "風暴頻繁、故障率上升——把握可作業窗搶修。", en: "Frequent storms raise fault rates — seize workable windows." },
    goal: { zh: "本週於戰情室修復 ≥ 6 台機組", en: "Resolve ≥ 6 turbines in Fleet Ops this week" },
    xp: 120, cash: 1_200_000, faultMult: 1.4, met: (d, b) => (d.fleetResolved ?? 0) - b.resolved >= 6,
  },
  {
    id: "supply", icon: "📦", name: { zh: "斷料週", en: "Supply Crunch" },
    desc: { zh: "供應鏈吃緊、備品昂貴——精打細算仍要完成任務。", en: "Supply chain tight — be frugal and still deliver." },
    goal: { zh: "本週完成 ≥ 3 件工單／任務", en: "Complete ≥ 3 work orders/tasks this week" },
    xp: 100, cash: 1_000_000, faultMult: 1.0, met: (d, b) => d.missionsDone - b.missions >= 3,
  },
  {
    id: "crew", icon: "🦺", name: { zh: "人力短缺週", en: "Crew Shortage" },
    desc: { zh: "人力吃緊——別硬撐,安全第一、輪班排程。", en: "Short-handed — don't push your luck; safety first." },
    goal: { zh: "本週維持零安全事件(至少 4 天)", en: "Zero safety incidents this week (≥4 days)" },
    xp: 100, cash: 1_000_000, faultMult: 1.1, met: (d, b) => d.day - b.day >= MIN_DAYS && (d.safetyIncidents ?? 0) - b.safety <= 0,
  },
  {
    id: "overhaul", icon: "🛠", name: { zh: "大修週", en: "Overhaul Week" },
    desc: { zh: "大組件排程——穩住產出、累積發電。", en: "Major component scheduling — keep output up." },
    goal: { zh: "本週累積發電 ≥ 600 MWh", en: "Generate ≥ 600 MWh this week" },
    xp: 110, cash: 1_100_000, faultMult: 1.0, met: (d, b) => d.generationMWh - b.gen >= 600,
  },
  {
    id: "calm", icon: "☀", name: { zh: "平穩週", en: "Calm Week" },
    desc: { zh: "海象平穩、故障較少——把握時間做預防保養。", en: "Calm seas, fewer faults — invest in prevention." },
    goal: { zh: "本週維持機隊妥善率 ≥ 90%(至少 4 天)", en: "Keep uptime ≥ 90% this week (≥4 days)" },
    xp: 90, cash: 900_000, faultMult: 0.7, met: (d, b) => d.day - b.day >= MIN_DAYS && fleetUptime(d.fleet) >= 90,
  },
];

export const themeById = (id: string): WeekTheme | undefined => WEEK_THEMES.find((t) => t.id === id);

function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// 依 seed+week 決定性挑一個主題(可重現)
export function themeForWeek(week: number, seed: string): WeekTheme {
  return WEEK_THEMES[hashStr(`${seed}:week:${week}`) % WEEK_THEMES.length];
}

// 為某遊戲內週建立挑戰狀態(baseline = 當前累積值)；prev 用於延續/重置 streak。
export function rollWeeklyState(week: number, seed: string, d: GameData, prev: WeeklyState | null): WeeklyState {
  const theme = themeForWeek(week, seed);
  const prevDone = !!prev && prev.claimed;
  return {
    week,
    themeId: theme.id,
    faultMult: theme.faultMult,
    base: { resolved: d.fleetResolved ?? 0, missions: d.missionsDone, gen: d.generationMWh, safety: d.safetyIncidents ?? 0, day: d.day },
    claimed: false,
    streak: prevDone && prev ? prev.streak : 0,
  };
}

// 本週挑戰是否「已達成但未領獎」
export function weeklyDue(d: GameData): boolean {
  const wk = d.weekly;
  if (!wk || wk.claimed) return false;
  const theme = themeById(wk.themeId);
  return !!theme && theme.met(d, wk.base);
}
