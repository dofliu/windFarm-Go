// 每週開放機制（教師端設定目前週次 → 鎖定計分主線任務；沙盒永遠開放）
import { CAMPAIGN } from "../ui/campaign";

const KEY = "wfg-week";
export const MISSIONS_PER_WEEK = 2; // 每週開放 2 關計分任務
export const WEEKS_TOTAL = Math.ceil(CAMPAIGN.length / MISSIONS_PER_WEEK);

export function getWeek(): number {
  try {
    const v = parseInt(localStorage.getItem(KEY) || "1", 10);
    return isNaN(v) ? 1 : Math.max(1, Math.min(WEEKS_TOTAL, v));
  } catch {
    return 1;
  }
}
export function setWeek(w: number): void {
  try {
    localStorage.setItem(KEY, String(Math.max(1, Math.min(WEEKS_TOTAL, w))));
  } catch {
    // 忽略
  }
}

// 第 i 關（0-based）所屬週次
export const missionWeek = (i: number): number => Math.floor(i / MISSIONS_PER_WEEK) + 1;
// 某週次下，計分任務開放到第幾關（含）
export const maxMissionForWeek = (week: number): number => week * MISSIONS_PER_WEEK - 1;
