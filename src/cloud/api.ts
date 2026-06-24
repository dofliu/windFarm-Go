// 雲端為主的帳號/存檔/紀錄客戶端（Google Apps Script Web App，前端仍在 GitHub Pages）。
// 設計取捨（受 Apps Script + 靜態前端限制）：
//  - 讀取與「小型寫入」走 GET（Apps Script /exec 的 GET 回應可跨來源讀取）：
//    register / login / load / record-get / teacher。
//  - 大型寫入走 POST no-cors（無法讀回應，射後不理）：存檔 state、學習紀錄 record。
//    伺服器端會先以 pinHash 驗證通關碼再寫入。
//  - 通關碼以 #71 的弱雜湊(hashPin)在前端算好再傳 pinHash；伺服器比對儲存的 pinHash。
//    ⚠️ 教室等級安全：pinHash 會出現在網址/記錄中,足以防隨手冒名,非銀行級。詳見 docs/CLOUD_SETUP.md。
import { SHEET_CONFIG } from "./sheet";
import { idOf } from "../state/profile";

export interface CloudIdentity {
  studentId: string;
  classCode: string;
  pinHash: string;
}

const base = (): string => (SHEET_CONFIG.enabled && SHEET_CONFIG.webAppUrl) || "";
export const cloudEnabled = (): boolean => !!base();
export const isOnline = (): boolean => (typeof navigator === "undefined" ? true : navigator.onLine !== false);

// 組 GET 查詢字串（純函式，便於測試）
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const k of Object.keys(params)) {
    const v = params[k];
    if (v === undefined || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.join("&");
}
export function apiUrl(params: Record<string, string | number | undefined>): string {
  return `${base()}?${buildQuery(params)}`;
}

// 帶逾時的 GET JSON；任何錯誤回 null（呼叫端據此做離線降級）
async function getJson<T>(params: Record<string, string | number | undefined>, timeoutMs = 8000): Promise<T | null> {
  if (!cloudEnabled()) return null;
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const r = await fetch(apiUrl(params), ctrl ? { signal: ctrl.signal } : undefined);
    return (await r.json()) as T;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// 大型寫入：POST no-cors（射後不理）
async function postFire(body: unknown): Promise<void> {
  if (!cloudEnabled()) return;
  try {
    await fetch(base(), { method: "POST", mode: "no-cors", body: JSON.stringify(body) });
  } catch {
    // 靜默：離線時由本機快取保底
  }
}

// ── 帳號 ──
export interface AuthResult {
  ok: boolean;
  nickname?: string;
  err?: "exists" | "no-account" | "bad-pin" | string;
}
// 註冊（雲端為唯一真實來源；需連線）
export async function registerAccount(p: { studentId: string; classCode: string; nickname: string; pinHash: string }): Promise<AuthResult | null> {
  return getJson<AuthResult>({ do: "register", studentId: p.studentId, classCode: p.classCode, nickname: p.nickname, pinHash: p.pinHash });
}
// 登入（伺服器端驗證通關碼）。回 null = 連線失敗 → 呼叫端可離線降級。
export async function loginAccount(p: CloudIdentity): Promise<AuthResult | null> {
  return getJson<AuthResult>({ do: "login", studentId: p.studentId, classCode: p.classCode, pinHash: p.pinHash });
}

// ── 存檔（雲端為主 + 本機快取，較新者為準）──
export interface SaveEnvelope {
  state: string; // GameData 的 JSON 字串
  savedAt: number; // epoch ms
}
// 摘要：教師面板/排行所需的小欄位（隨存檔一併上傳，免在後端解析大 JSON）
export interface ProgressSummary {
  score: number;
  day: number;
  availability: number;
  generation: number;
}
export async function loadStateCloud(p: CloudIdentity): Promise<SaveEnvelope | null> {
  const j = await getJson<{ ok?: boolean; state?: string | null; savedAt?: number }>({ do: "load", studentId: p.studentId, classCode: p.classCode, pinHash: p.pinHash });
  if (!j || !j.state || typeof j.state !== "string") return null;
  return { state: j.state, savedAt: Number(j.savedAt) || 0 };
}
export async function saveStateCloud(p: CloudIdentity, env: SaveEnvelope, summary?: ProgressSummary): Promise<void> {
  await postFire({ kind: "save", studentId: p.studentId, classCode: p.classCode, pinHash: p.pinHash, state: env.state, savedAt: env.savedAt, ...(summary || {}) });
}

// 較新者為準（純函式，便於測試）：回傳該採用的一方，或 null（兩者皆無）
export function pickNewer(local: SaveEnvelope | null, cloud: SaveEnvelope | null): { use: SaveEnvelope; from: "local" | "cloud" } | null {
  if (!local && !cloud) return null;
  if (!cloud) return { use: local as SaveEnvelope, from: "local" };
  if (!local) return { use: cloud, from: "cloud" };
  return cloud.savedAt >= local.savedAt ? { use: cloud, from: "cloud" } : { use: local, from: "local" };
}

// ── 學習紀錄（#3 階段 3 使用；端點先就緒，免二次部署）──
export async function loadRecordCloud(p: CloudIdentity): Promise<string | null> {
  const j = await getJson<{ ok?: boolean; record?: string | null }>({ do: "record-get", studentId: p.studentId, classCode: p.classCode, pinHash: p.pinHash });
  return j && typeof j.record === "string" ? j.record : null;
}
export async function saveRecordCloud(p: CloudIdentity, recordJson: string): Promise<void> {
  await postFire({ kind: "record", studentId: p.studentId, classCode: p.classCode, pinHash: p.pinHash, record: recordJson });
}

// ── 教師檢視（班級碼 + 教師碼）──
export interface ClassRow {
  studentId: string;
  nickname: string;
  score: number;
  day: number;
  availability: number;
  generation: number;
  updatedAt: number;
}
export interface TeacherResult {
  ok: boolean;
  rows?: ClassRow[];
  err?: "bad-code" | string;
}
export async function fetchClassProgress(classCode: string, teacherCode: string): Promise<TeacherResult | null> {
  return getJson<TeacherResult>({ do: "teacher", classCode, code: teacherCode });
}

// 由 Profile 取出雲端身分（保證 idOf 一致）
export const identityOf = (p: { studentId: string; classCode: string; pinHash: string }): CloudIdentity => ({ studentId: p.studentId, classCode: p.classCode, pinHash: p.pinHash });
export const cloudKey = (p: { studentId: string; classCode: string }): string => idOf(p);
