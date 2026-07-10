// 知識點掌握度(#mastery):記錄學生「答題」的對錯,依科別(診斷測驗)與任務類型(沙盒)統計正確率,
// 找出弱點並給補強建議 → 把「玩」變成可診斷的學習。純資料/純函式集中於此。
import type { I18n } from "../game/systems/types";

export interface MasteryCell { n: number; ok: number; } // 作答數 / 答對數
export type Mastery = Record<string, MasteryCell>; // key 形式:"disc:<科別>" / "cat:<任務類型>"

export const accuracy = (c?: MasteryCell): number => (c && c.n ? Math.round((c.ok / c.n) * 100) : 0);

// 記錄一次作答(可同時計多個維度的 key);回新 mastery(純函式)。
export function recordAnswer(m: Mastery, keys: string[], correct: boolean): Mastery {
  const out: Mastery = { ...(m || {}) };
  for (const k of keys) {
    const cur = out[k] || { n: 0, ok: 0 };
    out[k] = { n: cur.n + 1, ok: cur.ok + (correct ? 1 : 0) };
  }
  return out;
}

export interface MasteryRow { key: string; label: I18n; n: number; ok: number; acc: number; }

// 取某前綴(disc/cat)各項的統計列(依 labels 的全集,未作答者 n=0)。
export function masteryRows(m: Mastery, prefix: string, labels: Record<string, I18n>): MasteryRow[] {
  return Object.keys(labels).map((k) => {
    const c = (m || {})[`${prefix}:${k}`] || { n: 0, ok: 0 };
    return { key: k, label: labels[k], n: c.n, ok: c.ok, acc: accuracy(c) };
  });
}

// 弱點:作答數 ≥ minN 中正確率最低者;不足樣本回 null(避免一兩題就判定弱點)。
export function weakest(rows: MasteryRow[], minN = 2): MasteryRow | null {
  const cand = rows.filter((r) => r.n >= minN).sort((a, b) => a.acc - b.acc || b.n - a.n);
  return cand.length ? cand[0] : null;
}

// 總作答數(判斷是否已有足夠資料可顯示)。
export const totalAnswered = (m: Mastery): number => Object.values(m || {}).reduce((a, c) => a + (c.n || 0), 0);

// ───────── 掌握度雲端摘要(#mastery-cloud):隨存檔上傳,供教師端個別鑽取 ─────────
// 壓成精簡字串:只帶有作答(n>0)的格,值以 [n, ok] 元組節省長度(十來個格,體積極小)。
export function masterySummary(m: Mastery): string {
  const out: Record<string, [number, number]> = {};
  for (const k of Object.keys(m || {})) {
    const c = (m || {})[k];
    if (c && c.n > 0) out[k] = [c.n, c.ok];
  }
  return JSON.stringify(out);
}
// 解析雲端摘要回 Mastery(容錯:接受 [n,ok] 元組或 {n,ok} 物件;壞資料回 {})。
export function parseMasterySummary(s: string | undefined | null): Mastery {
  if (!s) return {};
  try {
    const raw = JSON.parse(s) as Record<string, [number, number] | { n?: number; ok?: number }>;
    const out: Mastery = {};
    for (const k of Object.keys(raw || {})) {
      const v = raw[k];
      if (Array.isArray(v)) out[k] = { n: Number(v[0]) || 0, ok: Number(v[1]) || 0 };
      else if (v && typeof v === "object") out[k] = { n: Number(v.n) || 0, ok: Number(v.ok) || 0 };
    }
    return out;
  } catch {
    return {};
  }
}

// ───────── 錯題本(#mistake-log):答錯即記錄情境/你的選擇/正解/教訓,供事後複習與反思 ─────────
export interface Mistake {
  id: string;        // 唯一 id(reducer 指派)
  topic: string;     // "disc:<科別>" / "cat:<任務類型>"
  question: I18n;    // 題目/情境
  chosen: I18n;      // 你的(錯誤)選擇
  correct: I18n;     // 正解
  lesson?: I18n;     // 為什麼 / O&M 教訓
  day: number;       // 遊戲內天數
  reviewed?: boolean;
  reflection?: string; // 學生的維修檢討/反思(形成性評量)
}
export const MISTAKES_CAP = 60; // 僅保留最近 N 筆,避免無限成長

export function addMistake(list: Mistake[], mk: Mistake, cap = MISTAKES_CAP): Mistake[] {
  const next = [...(list || []), mk];
  return next.length > cap ? next.slice(next.length - cap) : next;
}
export function reviewMistake(list: Mistake[], id: string, reflection: string): Mistake[] {
  return (list || []).map((x) => (x.id === id ? { ...x, reviewed: true, reflection } : x));
}
export const pendingMistakes = (list: Mistake[]): number => (list || []).filter((x) => !x.reviewed).length;
