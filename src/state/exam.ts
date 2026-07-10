// 獨立測驗模式(#exam):把既有「判斷型任務」抽成一份正式評量 —— 固定題數、無提示、單次作答,
// 結束才揭曉總分與各類別對錯。純資料/純函式集中於此(可決定性測試);UI 見 ui/ExamModal.tsx。
import { TASKS, type TaskTemplate, type TaskCat } from "./tasks";
import type { I18n } from "../game/systems/types";

export const EXAM_LENGTHS = [10, 20] as const;
export const DEFAULT_EXAM_LENGTH = 10;

// 測驗題池:引用判斷型任務,但排除「需輔助圖(chart)」者 → 確保純文字即可作答、對所有人公平。
export const EXAM_POOL: TaskTemplate[] = TASKS.filter((tk) => !tk.chart);

// 可重現的偽隨機(mulberry32):測試給固定種子可決定性驗證;實際遊玩以隨機種子開場 → 每次題目不同。
function rng(seed: number): () => number {
  let x = (seed || 1) >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], r: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 抽 n 題,盡量「跨類別均衡」:各類別各自洗牌後 round-robin 輪流取一題,湊滿 n。
// 回傳題目模板陣列(不足 n 時回全部可用題)。
export function buildExam(seed: number, n: number = DEFAULT_EXAM_LENGTH, pool: TaskTemplate[] = EXAM_POOL): TaskTemplate[] {
  const r = rng(seed);
  const byCat = new Map<TaskCat, TaskTemplate[]>();
  for (const tk of pool) {
    const g = byCat.get(tk.cat) ?? [];
    g.push(tk);
    byCat.set(tk.cat, g);
  }
  for (const g of byCat.values()) shuffle(g, r);
  const cats = shuffle([...byCat.keys()], r);
  const out: TaskTemplate[] = [];
  let progressed = true;
  while (out.length < n && progressed) {
    progressed = false;
    for (const c of cats) {
      const g = byCat.get(c)!;
      if (g.length) {
        out.push(g.pop()!);
        progressed = true;
        if (out.length >= n) break;
      }
    }
  }
  return out;
}

// 某題是否答對:所選選項為 good(可能有多個 good 皆算對)。pick = -1(未答)算錯。
export function isCorrect(tpl: TaskTemplate, pick: number): boolean {
  return pick >= 0 && pick < tpl.choices.length && !!tpl.choices[pick].good;
}
// 取某題的「正解」選項(第一個 good),供覆盤揭示。
export const goodChoiceOf = (tpl: TaskTemplate) => tpl.choices.find((c) => c.good);

export interface ExamGrade { key: string; label: I18n; color: string; }
export function examGrade(pct: number): ExamGrade {
  if (pct >= 90) return { key: "A", label: { zh: "優異 A", en: "Excellent A" }, color: "#7fce8e" };
  if (pct >= 80) return { key: "B", label: { zh: "良好 B", en: "Good B" }, color: "#8fc7a0" };
  if (pct >= 70) return { key: "C", label: { zh: "及格 C", en: "Pass C" }, color: "#e3ad42" };
  if (pct >= 60) return { key: "D", label: { zh: "待加強 D", en: "Marginal D" }, color: "#e0995a" };
  return { key: "F", label: { zh: "不及格 F", en: "Fail F" }, color: "#d96a5a" };
}

export interface ExamResult {
  total: number;
  correct: number;
  pct: number; // 0–100
  byCat: Record<string, { n: number; correct: number }>; // 各類別對錯(教學覆盤/掌握度)
  grade: ExamGrade;
  wrong: { tpl: TaskTemplate; picked: number }[]; // 錯題(供覆盤揭示正解)
}

// 判分(純函式):items = 抽出的題;picks = 每題所選選項索引(-1 未答)。
export function gradeExam(items: TaskTemplate[], picks: number[]): ExamResult {
  const byCat: Record<string, { n: number; correct: number }> = {};
  const wrong: { tpl: TaskTemplate; picked: number }[] = [];
  let correct = 0;
  items.forEach((tpl, i) => {
    const pick = picks[i] ?? -1;
    const ok = isCorrect(tpl, pick);
    const cell = byCat[tpl.cat] ?? { n: 0, correct: 0 };
    cell.n += 1;
    if (ok) cell.correct += 1;
    byCat[tpl.cat] = cell;
    if (ok) correct += 1;
    else wrong.push({ tpl, picked: pick });
  });
  const total = items.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  return { total, correct, pct, byCat, grade: examGrade(pct), wrong };
}
