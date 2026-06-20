import type { I18n, Lang } from "./types";

// 全域語言狀態 + 取文字 helper。React 與 Phaser 共用同一份。
let currentLang: Lang = "zh";
const listeners = new Set<(lang: Lang) => void>();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  listeners.forEach((fn) => fn(lang));
}

export function toggleLang(): void {
  setLang(currentLang === "zh" ? "en" : "zh");
}

export function onLangChange(fn: (lang: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// 取雙語文字；找不到欄位時回退到另一語言，避免空白
export function t(text: I18n | undefined): string {
  if (!text) return "";
  return text[currentLang] || text.zh || text.en || "";
}

// 靜態 UI 字串（不放在資料 pack 裡的介面文字）
export const UI: Record<string, I18n> = {
  newVoyage: { zh: "開始新航程", en: "New Voyage" },
  accept: { zh: "接受派工單", en: "Accept" },
  later: { zh: "稍後再說", en: "Later" },
  diagnose: { zh: "診斷工具", en: "Diagnose" },
  sop: { zh: "維修 SOP", en: "Repair SOP" },
  skills: { zh: "AI 技能", en: "AI Skills" },
  item: { zh: "道具", en: "Item" },
  back: { zh: "返回", en: "Back" },
  repairProgress: { zh: "修復進度", en: "Repair" },
  weatherWindow: { zh: "天氣窗", en: "Weather Window" },
  newQuest: { zh: "新派工單", en: "New Quest" },
  report: { zh: "維修報告", en: "After-Action Report" },
  rootCause: { zh: "真因", en: "Root Cause" },
  learned: { zh: "學到了", en: "Knowledge" },
  rewards: { zh: "獎勵", en: "Rewards" },
  rating: { zh: "評等", en: "Rating" },
  returnPort: { zh: "返回母港", en: "Return to Port" },
  yourActions: { zh: "你的處置", en: "Your Actions" },
  fragments: { zh: "手冊碎片", en: "Manual Fragments" },
  win: { zh: "故障排除成功！", en: "Fault repaired!" },
  lose: { zh: "天氣窗關閉，被迫撤離…", en: "Weather window closed — forced retreat…" },
  noInfo: { zh: "沒有有用的資訊。", en: "No useful information." },
  exp: { zh: "經驗", en: "EXP" },
  budget: { zh: "預算", en: "Budget" },
  unlock: { zh: "解鎖", en: "Unlocked" },
  selectSop: { zh: "選擇要執行的 SOP：", en: "Choose a SOP to perform:" },
  loading: { zh: "載入資料片中…", en: "Loading content packs…" },
};
