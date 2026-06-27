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
