// 學習歷程與成就（階段 3）：以遊戲狀態為單一來源,評估成就解鎖、累積個人最佳紀錄。
// 紀錄存於每位使用者專屬 localStorage（recordKeyFor）,雲端為主時由 RecordsTracker 與後端同步。
// 紀錄只增不減（high-water mark）→ 即使重玩(RESET)仍保留學習軌跡。
import type { GameData } from "./game";
import { computeScore } from "./game";
import { getProfile, recordKeyFor, type Profile } from "./profile";
import type { I18n } from "../game/systems/types";

export interface Achievement {
  id: string;
  icon: string;
  name: I18n;
  desc: I18n;
  test: (d: GameData, score: number) => boolean;
}

// 成就型錄：條件取自既有 GameData 欄位(任務/戰役/番外篇/圖鑑/發電/戰情室/風場/安全/SLA/船隊/資金/績效)。
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_mission", icon: "🔧", name: { zh: "初次出勤", en: "First Job" }, desc: { zh: "完成第一筆維修工單", en: "Complete your first work order" }, test: (d) => d.missionsDone >= 1 },
  { id: "ten_missions", icon: "🛠️", name: { zh: "維運老手", en: "Seasoned Tech" }, desc: { zh: "累積完成 10 筆工單", en: "Complete 10 work orders" }, test: (d) => d.missionsDone >= 10 },
  { id: "campaign_done", icon: "🏆", name: { zh: "戰役通關", en: "Campaign Clear" }, desc: { zh: "完成主線戰役全部關卡", en: "Finish the main campaign" }, test: (d) => d.campaignDone },
  { id: "build_done", icon: "🏗️", name: { zh: "風場落成", en: "Farm Built" }, desc: { zh: "完成風場建置番外篇", en: "Complete the construction side-story" }, test: (d) => d.buildDone },
  { id: "catalog_3", icon: "📖", name: { zh: "故障入門", en: "Fault Spotter" }, desc: { zh: "圖鑑收錄 3 種故障", en: "Log 3 fault types" }, test: (d) => (d.seenFaults?.length ?? 0) >= 3 },
  { id: "catalog_6", icon: "📚", name: { zh: "故障通", en: "Fault Expert" }, desc: { zh: "圖鑑收錄 6 種故障", en: "Log 6 fault types" }, test: (d) => (d.seenFaults?.length ?? 0) >= 6 },
  { id: "gen_1000", icon: "⚡", name: { zh: "千度發電", en: "1 GWh" }, desc: { zh: "累積發電達 1,000 MWh", en: "Generate 1,000 MWh total" }, test: (d) => d.generationMWh >= 1000 },
  { id: "gen_5000", icon: "🔋", name: { zh: "綠電主力", en: "Green Powerhouse" }, desc: { zh: "累積發電達 5,000 MWh", en: "Generate 5,000 MWh total" }, test: (d) => d.generationMWh >= 5000 },
  { id: "fleet_master", icon: "🎯", name: { zh: "戰情室高手", en: "Ops Master" }, desc: { zh: "戰情室累積修復 20 台機組", en: "Resolve 20 turbines in Ops Center" }, test: (d) => (d.fleetResolved ?? 0) >= 20 },
  { id: "multi_farm", icon: "🌊", name: { zh: "拓展版圖", en: "Fleet Expansion" }, desc: { zh: "同時營運 2 座以上風場", en: "Operate 2+ wind farms" }, test: (d) => d.farmsOwned >= 2 },
  { id: "two_vessels", icon: "🚢", name: { zh: "多元船隊", en: "Diverse Fleet" }, desc: { zh: "擁有 2 種以上作業船", en: "Own 2+ vessel types" }, test: (d) => (d.ownedVessels?.length ?? 0) >= 2 },
  { id: "safety_clean", icon: "🦺", name: { zh: "零事故 30 天", en: "30 Days Incident-Free" }, desc: { zh: "營運滿 30 天且零安全事件", en: "30+ days operated with zero safety incidents" }, test: (d) => d.day - 21 >= 30 && (d.safetyIncidents ?? 0) <= 0 }, // <=0 防禦:舊存檔若殘留負值不致永久卡死成就
  { id: "sla_keeper", icon: "📈", name: { zh: "達標守門員", en: "SLA Keeper" }, desc: { zh: "撐過一季且無 SLA 違約", en: "Clear a quarter with no SLA breach" }, test: (d) => d.quarter >= 2 && (d.slaPenalties ?? 0) === 0 },
  { id: "score_500", icon: "⭐", name: { zh: "績效新星", en: "Rising Star" }, desc: { zh: "綜合績效分達 500", en: "Reach a performance score of 500" }, test: (_d, s) => s >= 500 },
  { id: "score_1500", icon: "🌟", name: { zh: "績效王者", en: "Performance Ace" }, desc: { zh: "綜合績效分達 1,500", en: "Reach a performance score of 1,500" }, test: (_d, s) => s >= 1500 },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;

// 學習紀錄（high-water mark；只增不減）
export interface RecordData {
  unlocked: Record<string, number>; // 成就 id -> 解鎖時間(epoch ms)
  bestScore: number;
  bestDay: number; // 最高達到的營運天數
  bestGeneration: number; // 最高累積發電
  bestMissions: number; // 最多完成任務數
  bestCatalog: number; // 最多圖鑑數
  bestResolved: number; // 最多戰情室修復
  bestExam?: number; // 獨立測驗最佳成績(%)(#exam);選填→舊存檔相容
  updatedAt: number;
}

export const emptyRecord = (): RecordData => ({ unlocked: {}, bestScore: 0, bestDay: 0, bestGeneration: 0, bestMissions: 0, bestCatalog: 0, bestResolved: 0, bestExam: 0, updatedAt: 0 });

// 目前狀態下「已滿足」的成就 id（純函式）
export function evaluateAchievements(d: GameData): string[] {
  const s = computeScore(d);
  return ACHIEVEMENTS.filter((a) => {
    try {
      return a.test(d, s);
    } catch {
      return false;
    }
  }).map((a) => a.id);
}

// 把目前狀態併入紀錄（純函式,便於測試）：更新最佳值、補上新解鎖成就。回新紀錄與本次新解鎖清單。
export function mergeRecord(prev: RecordData, d: GameData, now: number): { rec: RecordData; newly: string[] } {
  const satisfied = evaluateAchievements(d);
  const newly = satisfied.filter((id) => !(id in prev.unlocked));
  const unlocked = { ...prev.unlocked };
  for (const id of newly) unlocked[id] = now;
  const score = computeScore(d);
  const rec: RecordData = {
    unlocked,
    bestScore: Math.max(prev.bestScore, score),
    bestDay: Math.max(prev.bestDay, d.day),
    bestGeneration: Math.max(prev.bestGeneration, d.generationMWh),
    bestMissions: Math.max(prev.bestMissions, d.missionsDone),
    bestCatalog: Math.max(prev.bestCatalog, d.seenFaults?.length ?? 0),
    bestResolved: Math.max(prev.bestResolved, d.fleetResolved ?? 0),
    bestExam: prev.bestExam ?? 0, // 測驗成績非源自 GameData → 沿用既有紀錄(由 ExamModal 直接更新)
    updatedAt: newly.length || score > prev.bestScore ? now : prev.updatedAt,
  };
  return { rec, newly };
}

// 合併兩份紀錄（雲端為主同步用,只增不減）：成就取聯集(較早解鎖時間為準)、最佳值取大。
export function unionRecord(a: RecordData, b: RecordData): RecordData {
  const unlocked: Record<string, number> = { ...a.unlocked };
  for (const id of Object.keys(b.unlocked)) {
    unlocked[id] = id in unlocked ? Math.min(unlocked[id], b.unlocked[id]) : b.unlocked[id];
  }
  return {
    unlocked,
    bestScore: Math.max(a.bestScore, b.bestScore),
    bestDay: Math.max(a.bestDay, b.bestDay),
    bestGeneration: Math.max(a.bestGeneration, b.bestGeneration),
    bestMissions: Math.max(a.bestMissions, b.bestMissions),
    bestCatalog: Math.max(a.bestCatalog, b.bestCatalog),
    bestResolved: Math.max(a.bestResolved, b.bestResolved),
    bestExam: Math.max(a.bestExam ?? 0, b.bestExam ?? 0),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

// ── localStorage（每位使用者獨立）──
export function loadRecord(p: Profile | null = getProfile()): RecordData {
  try {
    const raw = localStorage.getItem(recordKeyFor(p));
    if (!raw) return emptyRecord();
    return { ...emptyRecord(), ...(JSON.parse(raw) as Partial<RecordData>) } as RecordData;
  } catch {
    return emptyRecord();
  }
}
export function persistRecord(rec: RecordData, p: Profile | null = getProfile()): void {
  try {
    localStorage.setItem(recordKeyFor(p), JSON.stringify(rec));
  } catch {
    // 忽略寫入失敗（隱私模式）
  }
}
