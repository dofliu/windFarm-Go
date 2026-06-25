// 情境包匯入（#80）：把現有的「課程匯入單筆任務」一般化為可匯入「一組沙盒判斷型任務」的情境包(JSON)，
// 讓教師不必改程式碼即可新增活動/題組。嚴格驗證(純函式,可測)後註冊進自由營運中心的任務池。
// 設計：與內建內容並存、可隨時移除;匯入任務 id 自動加 "pack:" 前綴避免碰撞。
import type { TaskTemplate, TaskCat, ChartKind } from "./tasks";
import type { I18n } from "../game/systems/types";

export const SCENARIO_PACK_VERSION = 1;
const STORE_KEY = "wfg-scenario-pack";
const CATS: TaskCat[] = ["A", "B", "C", "D", "E", "F", "G"];
const CHARTS: ChartKind[] = ["trend", "spectrum", "radar", "bars"];
const EFF_KEYS = ["a", "b", "s", "g"];

export interface ScenarioPack {
  version: number;
  name: string;
  author?: string;
  tasks: TaskTemplate[];
}

export interface ParseResult {
  ok: boolean;
  pack?: ScenarioPack;
  error?: string;
}

const isI18n = (v: unknown): v is I18n =>
  !!v && typeof v === "object" && typeof (v as I18n).zh === "string" && typeof (v as I18n).en === "string";

// 嚴格驗證並正規化一個情境包。回 {ok, pack?} 或 {ok:false, error}（中英訊息，UI 直接顯示 zh）。
export function parseScenarioPack(json: string): ParseResult {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "JSON 解析失敗，請檢查格式。 / Failed to parse JSON." };
  }
  if (!o || typeof o !== "object") return { ok: false, error: "情境包必須是物件。 / Pack must be an object." };
  const name = String(o.name ?? "").trim();
  if (!name) return { ok: false, error: "缺少 name（情境包名稱）。 / Missing pack name." };
  if (!Array.isArray(o.tasks) || o.tasks.length === 0) return { ok: false, error: "tasks 必須是非空陣列。 / tasks must be a non-empty array." };

  const tasks: TaskTemplate[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < o.tasks.length; i++) {
    const raw = o.tasks[i] as Record<string, unknown>;
    const where = `tasks[${i}]`;
    if (!raw || typeof raw !== "object") return { ok: false, error: `${where} 不是物件。 / not an object.` };
    const baseId = String(raw.id ?? `t${i}`).trim() || `t${i}`;
    const id = `pack:${name}:${baseId}`;
    if (seen.has(id)) return { ok: false, error: `${where} id 重複：${baseId} / duplicate id.` };
    seen.add(id);
    const cat = raw.cat as TaskCat;
    if (!CATS.includes(cat)) return { ok: false, error: `${where} cat 無效(須為 A–G)。 / invalid cat.` };
    if (!isI18n(raw.title)) return { ok: false, error: `${where} title 須為 {zh,en}。 / title must be {zh,en}.` };
    if (!isI18n(raw.scenario)) return { ok: false, error: `${where} scenario 須為 {zh,en}。 / scenario must be {zh,en}.` };
    const xp = Number(raw.xp);
    if (!Number.isFinite(xp) || xp <= 0) return { ok: false, error: `${where} xp 須為正數。 / xp must be > 0.` };
    if (raw.chart !== undefined && !CHARTS.includes(raw.chart as ChartKind)) return { ok: false, error: `${where} chart 無效。 / invalid chart.` };
    if (!Array.isArray(raw.choices) || raw.choices.length < 2) return { ok: false, error: `${where} choices 至少 2 項。 / needs ≥2 choices.` };
    const choices = [];
    let hasGood = false;
    for (let j = 0; j < raw.choices.length; j++) {
      const c = raw.choices[j] as Record<string, unknown>;
      const cw = `${where}.choices[${j}]`;
      if (!c || typeof c !== "object") return { ok: false, error: `${cw} 不是物件。 / not an object.` };
      if (!isI18n(c.label)) return { ok: false, error: `${cw} label 須為 {zh,en}。 / label must be {zh,en}.` };
      if (!isI18n(c.feedback)) return { ok: false, error: `${cw} feedback 須為 {zh,en}。 / feedback must be {zh,en}.` };
      if (typeof c.good !== "boolean") return { ok: false, error: `${cw} good 須為布林。 / good must be boolean.` };
      const effRaw = (c.eff ?? {}) as Record<string, unknown>;
      if (typeof effRaw !== "object") return { ok: false, error: `${cw} eff 須為物件。 / eff must be object.` };
      const eff: Record<string, number> = {};
      for (const k of Object.keys(effRaw)) {
        if (!EFF_KEYS.includes(k)) return { ok: false, error: `${cw} eff key '${k}' 無效(須為 a/b/s/g)。 / invalid eff key.` };
        const val = Number(effRaw[k]);
        if (!Number.isFinite(val)) return { ok: false, error: `${cw} eff.${k} 須為數字。 / eff value must be a number.` };
        eff[k] = val;
      }
      if (c.good) hasGood = true;
      choices.push({ label: c.label as I18n, feedback: c.feedback as I18n, good: c.good as boolean, eff });
    }
    if (!hasGood) return { ok: false, error: `${where} 至少要有一個 good 選項。 / needs ≥1 good choice.` };
    tasks.push({ id, cat, title: raw.title as I18n, scenario: raw.scenario as I18n, xp, ...(raw.chart ? { chart: raw.chart as ChartKind } : {}), choices });
  }
  return { ok: true, pack: { version: Number(o.version) || SCENARIO_PACK_VERSION, name, author: o.author ? String(o.author) : undefined, tasks } };
}

// ── 已匯入情境包的記憶體註冊表（自由營運中心任務池讀取）+ localStorage 持久化 ──
let activePack: ScenarioPack | null = loadPack();

function loadPack(): ScenarioPack | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORE_KEY) : null;
    if (!raw) return null;
    const r = parseScenarioPack(raw);
    return r.ok ? r.pack! : null;
  } catch {
    return null;
  }
}
export function getImportedTasks(): TaskTemplate[] {
  return activePack ? activePack.tasks : [];
}
export function getActivePack(): ScenarioPack | null {
  return activePack;
}
export function setActivePack(pack: ScenarioPack | null): void {
  activePack = pack;
  try {
    if (typeof localStorage === "undefined") return;
    if (pack) localStorage.setItem(STORE_KEY, JSON.stringify(pack));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    // 忽略寫入失敗
  }
}
