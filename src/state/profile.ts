// 本機身分與帳號系統（強制通關碼）：以「學號」為帳號、班級碼分群、暱稱為顯示名、通關碼(PIN)登入。
// 同一台教室電腦可保有多個學生帳號（帳號清單），各自獨立存檔與紀錄。
// 通關碼採弱雜湊（純前端無法真正保密；雲端階段會由後端再驗證）。localStorage 為離線快取。
export interface Profile {
  studentId: string; // 學號（帳號主鍵）
  classCode: string; // 班級碼（分群、排行、教師檢視）
  nickname: string; // 暱稱（顯示用；空則以學號代之）
  pinHash: string; // 通關碼雜湊（強制）；舊存檔可能無 → 視為需重新登入
  guest?: boolean; // 訪客：單機試玩，不計排行與紀錄、免通關碼
}

export interface Account {
  studentId: string;
  classCode: string;
  nickname: string;
  pinHash: string;
  createdAt: number;
  lastSeen: number;
}

const PROFILE_KEY = "wfg-profile"; // 目前登入身分
const ACCOUNTS_KEY = "wfg-accounts"; // 本機帳號清單

// ── 正規化與身分鍵 ──
export const normClass = (c: string): string => (c || "").trim().toUpperCase();
export const normId = (s: string): string => (s || "").trim().toUpperCase(); // 學號去空白、大寫（避免大小寫造成不同帳號）
export const normNick = (n: string): string => (n || "").trim();
// 身分鍵：班級碼/學號
export const idOf = (p: { studentId: string; classCode: string }): string => `${p.classCode}/${p.studentId}`;
// 顯示名：暱稱優先，否則學號
export const displayName = (p: { nickname?: string; studentId: string }): string => (p.nickname && p.nickname.trim()) || p.studentId;

// ── 通關碼弱雜湊（djb2，以身分為鹽）──
export function hashPin(pin: string, id: string): string {
  const s = `${id}|${pin}|wfg-pin-2026`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
export const validPinFormat = (pin: string): boolean => /^\d{4,6}$/.test(pin);
export function verifyPin(account: { pinHash: string; studentId: string; classCode: string }, pin: string): boolean {
  return !!account.pinHash && account.pinHash === hashPin(pin, idOf(account));
}

// ── localStorage 安全讀寫 ──
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 隱私模式可能無法寫入；忽略
  }
}

// ── 目前登入身分 ──
export function getProfile(): Profile | null {
  return read<Profile | null>(PROFILE_KEY, null);
}
export function setProfile(p: Profile): void {
  write(PROFILE_KEY, p);
}
export function clearProfile(): void {
  // 只清「目前登入」，不刪本機帳號清單（登出 ≠ 刪帳號）
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // 忽略
  }
}
// 是否為「已完成通關碼設定」的有效登入（舊無 PIN 存檔除外；訪客視為有效）
export const isAuthed = (p: Profile | null): boolean => !!p && (!!p.guest || (!!p.pinHash && !!p.studentId));

// ── 本機帳號清單 ──
export function listAccounts(): Account[] {
  const list = read<Account[]>(ACCOUNTS_KEY, []);
  return Array.isArray(list) ? list : [];
}
export function findAccount(id: string): Account | undefined {
  return listAccounts().find((a) => idOf(a) === id);
}
// 純函式：把帳號併入清單（依身分去重，最近登入優先）。便於測試。
export function upsertAccountIn(list: Account[], a: Account): Account[] {
  const id = idOf(a);
  const rest = list.filter((x) => idOf(x) !== id);
  return [...rest, a].sort((x, y) => y.lastSeen - x.lastSeen);
}
export function upsertAccount(a: Account): void {
  write(ACCOUNTS_KEY, upsertAccountIn(listAccounts(), a));
}
export function touchAccount(id: string, when: number): void {
  const list = listAccounts().map((a) => (idOf(a) === id ? { ...a, lastSeen: when } : a));
  write(ACCOUNTS_KEY, list.sort((x, y) => y.lastSeen - x.lastSeen));
}
export function removeAccount(id: string): void {
  write(ACCOUNTS_KEY, listAccounts().filter((a) => idOf(a) !== id));
}

// ── 存檔 / 紀錄命名空間（每位使用者獨立，依「班級/學號」）──
export function saveKeyFor(p: Profile | null): string {
  const id = p ? idOf(p) : "guest";
  return `windfarm-go-save::${id}`;
}
export function recordKeyFor(p: Profile | null): string {
  const id = p ? idOf(p) : "guest";
  return `wfg-record::${id}`;
}
