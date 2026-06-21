import type { I18n } from "../game/systems/types";
import type { Quest } from "../state/game";
import type { DlgMsg } from "../state/DialogueContext";

// 精簡主線戰役（#20）：7 關、四幕，串起「離岸風場系統性故障」的懸疑主線。
// 每關 = 一個 Quest + 接單(intro)/完成(outro) 對話。故障沿用 faults.ts。
export interface Mission extends Quest {
  act: number;
  chapter: I18n;
  intro: DlgMsg[];
  outro: DlgMsg[];
}

export const CAMPAIGN: Mission[] = [
  {
    id: "m1", act: 1, chapter: { zh: "序章 · 走馬上任", en: "Prologue · First Day" },
    title: { zh: "齒輪箱搶修 · CH-12", en: "Gearbox Repair · CH-12" },
    brief: { zh: "新人首役：CH-12 齒輪箱過熱，登塔排除並回報。", en: "Rookie's first job: clear CH-12 gearbox overheat." },
    unit: "CH-12", targetFault: "gearbox_overheat", rewardBudget: 150_000, rewardXp: 100,
    intro: [
      { speaker: "manager", expr: "neutral", line: { zh: "新來的技師啊，CH-12 齒輪箱過熱了，先拿這筆練手。", en: "Rookie — CH-12's gearbox is overheating. Start with this one." } },
      { speaker: "narrator_girl", expr: "happy", line: { zh: "第一筆工單！我陪你出海～", en: "Our first work order! I'll sail with you." } },
    ],
    outro: [{ speaker: "narrator_girl", expr: "wink", line: { zh: "漂亮！第一台搞定，手感不錯嘛～", en: "Nice! First one done — you've got the touch." } }],
  },
  {
    id: "m2", act: 1, chapter: { zh: "序章 · 異狀漸起", en: "Prologue · Strange Signs" },
    title: { zh: "偏航校正 · CH-07", en: "Yaw Service · CH-07" },
    brief: { zh: "CH-07 偏航失準、無法迎風，登塔複歸。", en: "CH-07 yaw misaligned — restore homing." },
    unit: "CH-07", targetFault: "yaw_misalign", rewardBudget: 160_000, rewardXp: 110,
    intro: [{ speaker: "veteran_sailor", expr: "talking", line: { zh: "又一台？這陣子告警有點密集，怪。", en: "Another one? Alarms have been awfully frequent lately." } }],
    outro: [{ speaker: "veteran_sailor", expr: "confident", line: { zh: "修好了。不過…我總覺得沒這麼單純。", en: "Fixed. But… I don't think it's this simple." } }],
  },
  {
    id: "m3", act: 2, chapter: { zh: "第二幕 · 數據疑雲", en: "Act II · Data Clouds" },
    title: { zh: "發電機診斷 · CH-21", en: "Generator Check · CH-21" },
    brief: { zh: "CH-21 發電機振動超標，採頻譜定位。", en: "CH-21 generator vibration high — locate via spectrum." },
    unit: "CH-21", targetFault: "gen_vibration", rewardBudget: 200_000, rewardXp: 140,
    intro: [{ speaker: "scada_eng", expr: "thinking", line: { zh: "等等…多台機組幾乎同時告警，這不像巧合。", en: "Wait… many units alarming almost simultaneously. That's no coincidence." } }],
    outro: [{ speaker: "scada_eng", expr: "alert", line: { zh: "我把資料留著比對。背後可能有共同原因。", en: "I'll keep the data to cross-check. There may be a common cause." } }],
  },
  {
    id: "m4", act: 2, chapter: { zh: "第二幕 · 安全警鐘", en: "Act II · Safety Alarm" },
    title: { zh: "變槳檢修 · CH-03", en: "Pitch Service · CH-03" },
    brief: { zh: "CH-03 強風下無法順槳停機，極度危險。", en: "CH-03 can't feather in high wind — dangerous." },
    unit: "CH-03", targetFault: "pitch_fault", rewardBudget: 190_000, rewardXp: 130,
    intro: [{ speaker: "safety_officer", expr: "alert", line: { zh: "變槳失效＝無法安全停機！務必先確認後備電源。", en: "Pitch failure = no safe shutdown! Verify backup power first." } }],
    outro: [{ speaker: "safety_officer", expr: "confident", line: { zh: "安全停機恢復。幹得好，沒讓它失速。", en: "Safe shutdown restored. Well done — no overspeed." } }],
  },
  {
    id: "m5", act: 3, chapter: { zh: "第三幕 · 線索浮現", en: "Act III · The Lead" },
    title: { zh: "變流器搶修 · CH-18", en: "Converter Repair · CH-18" },
    brief: { zh: "CH-18 變流器反覆過溫跳脫，檢查冷卻。", en: "CH-18 converter trips on overtemp — inspect cooling." },
    unit: "CH-18", targetFault: "converter_fault", rewardBudget: 175_000, rewardXp: 125,
    intro: [{ speaker: "elec_eng", expr: "talking", line: { zh: "連電力電子也來？監控工程師說他快查到了。", en: "Power electronics too? SCADA says they're close to an answer." } }],
    outro: [{ speaker: "scada_eng", expr: "alert", line: { zh: "找到了——這些機組共用同一版控制韌體！", en: "Got it — these units share the same control-firmware version!" } }],
  },
  {
    id: "m6", act: 3, chapter: { zh: "第三幕 · 真相", en: "Act III · The Truth" },
    title: { zh: "回溯比對 · CH-12", en: "Trace-back · CH-12" },
    brief: { zh: "回到 CH-12 驗證：同一韌體缺陷在特定海象下誤動作。", en: "Back to CH-12 to confirm: a firmware flaw misfires under certain sea states." },
    unit: "CH-12", targetFault: "gearbox_overheat", rewardBudget: 220_000, rewardXp: 160,
    intro: [
      { speaker: "scada_eng", expr: "confident", line: { zh: "不是天災——是跨場共用韌體的邏輯缺陷。回 CH-12 驗證！", en: "Not a disaster — a shared firmware logic flaw. Verify on CH-12!" } },
      { speaker: "manager", expr: "alert", line: { zh: "若屬實，全場機組都有風險。拜託你了。", en: "If true, the whole farm is at risk. We're counting on you." } },
    ],
    outro: [{ speaker: "manager", expr: "confident", line: { zh: "證實了！我已通報原廠推送修補。最後一哩交給你。", en: "Confirmed! I've notified the OEM to push a patch. The last mile is yours." } }],
  },
  {
    id: "m7", act: 4, chapter: { zh: "終章 · 核心機組", en: "Finale · The Core Unit" },
    title: { zh: "終章搶修 · 核心機組", en: "Finale · Core Unit" },
    brief: { zh: "韌體修補前，搶修核心機組、穩住全場併網。", en: "Before the patch lands, repair the core unit and keep the farm on-grid." },
    unit: "CORE", targetFault: "gen_vibration", rewardBudget: 300_000, rewardXp: 240,
    intro: [{ speaker: "manager", expr: "alert", line: { zh: "核心機組撐住，全場就穩。離岸守護者，靠你了！", en: "Hold the core unit and the whole farm holds. Offshore Guardian — it's on you!" } }],
    outro: [
      { speaker: "narrator_girl", expr: "happy", line: { zh: "成功了！亂流氣旋的真相解開，全場恢復併網 🎉", en: "We did it! The mystery's solved and the farm is back on-grid 🎉" } },
      { speaker: "manager", expr: "confident", line: { zh: "你已是獨當一面的離岸守護者。戰役完成！", en: "You're a full-fledged Offshore Guardian now. Campaign complete!" } },
    ],
  },
];

export const missionAt = (i: number): Mission => CAMPAIGN[Math.min(i, CAMPAIGN.length - 1)];

// ───────── 每帳號機組隨機化（Phase B #3b）─────────
// 同風場、同週故障種類（保留懸疑主線與計分公平），但「哪一台機組」依帳號決定性隨機，
// 各學員面對的基主不同、難度相近。以 baseUnit 為 key → m1/m6 對同一台機組的回扣仍一致。
import { getProfile } from "../state/profile";

function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function accountSeed(): string {
  const p = getProfile();
  return p ? `${p.classCode}/${p.nickname}` : "guest";
}
// 把基準機組編號（如 CH-12）依帳號映射到 1..50 的決定性新編號
function mapUnit(baseUnit: string, seed: string): string {
  const m = baseUnit.match(/^([A-Za-z]+-?)(\d+)$/);
  const prefix = m ? m[1] : "CH-";
  const n = 1 + (hashStr(`${seed}:${baseUnit}`) % 50);
  return prefix + String(n).padStart(2, "0");
}
const swapI18n = (s: I18n, from: string, to: string): I18n => ({ zh: s.zh.split(from).join(to), en: s.en.split(from).join(to) });
const swapDlg = (arr: DlgMsg[], from: string, to: string): DlgMsg[] => arr.map((d) => ({ ...d, line: swapI18n(d.line, from, to) }));

// 取得「本帳號版本」的關卡：機組編號隨帳號替換（含 title/brief/對話），故障與獎勵不變。
export function missionInstance(i: number, seed = accountSeed()): Mission {
  const m = missionAt(i);
  const u = mapUnit(m.unit, seed);
  if (u === m.unit) return m;
  return { ...m, unit: u, title: swapI18n(m.title, m.unit, u), brief: swapI18n(m.brief, m.unit, u), intro: swapDlg(m.intro, m.unit, u), outro: swapDlg(m.outro, m.unit, u) };
}
