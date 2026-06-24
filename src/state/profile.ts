// 本機身分與帳號系統（強制 PIN）：暱稱 + 班級碼 + PIN。
// 同一台教室電腦可保有多個學生帳號（帳號清單），各自獨立存檔與紀錄。
// PIN 為弱雜湊（純前端無法真正保密，僅提高冒名門檻；雲端另由後端再驗）。
export interface Profile {
  nickname: string;
  classCode: string;
  pinHash: string; // 強制 PIN；舊存檔可能無 → 視為需重新登入/設定
  guest?: boolean; // 訪客：單機試玩，不計排行與紀錄、免 PIN
}

export interface Account {
  nickname: string;
  classCode: string;
  pinHash: string;
  createdAt: number;
  lastSeen: number;
}

const PROFILE_KEY = "wfg-profile"; // 目前登入身分
const ACCOUNTS_KEY = "wfg-accounts"; // 本機帳號清單

// ── 正規化與身分鍵 ──
export const normClass = (c: string): string => (c || "").trim().toUpperCase();
export const normNick = (n: string): string => (n || "").trim();
// 身分鍵：班級碼/暱稱（與既有存檔命名相容；班級碼空字串維持舊行為）
export const idOf = (p: { nickname: string; classCode: string }): string => `${p.classCode}/${p.nickname}`;

// ── PIN 弱雜湊（djb2，以身分為鹽）──
export function hashPin(pin: string, id: string): string {
  const s = `${id}|${pin}|wfg-pin-2026`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
export const validPinFormat = (pin: string): boolean => /^\d{4,6}$/.test(pin);
export function verifyPin(account: { pinHash: string; nickname: string; classCode: string }, pin: string): boolean {
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
// 是否為「已完成 PIN 設定」的有效登入（舊無 PIN 存檔 / 訪客除外的判斷）
export const isAuthed = (p: Profile | null): boolean => !!p && (!!p.guest || !!p.pinHash);

// ── 本機帳號清單 ──
export function listAccounts(): Account[] {
  const list = read<Account[]>(ACCOUNTS_KEY, []);
  return Array.isArray(list) ? list : [];
}
export function findAccount(id: string): Account | undefined {
  return listAccounts().find((a) => idOf(a) === id);
}
// 純函式：把帳號併入清單（依身分去重，更新 pinHash/lastSeen）。便於測試。
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

// ── 存檔 / 紀錄命名空間（每位使用者獨立）──
export function saveKeyFor(p: Profile | null): string {
  const id = p ? idOf(p) : "guest";
  return `windfarm-go-save::${id}`;
}
export function recordKeyFor(p: Profile | null): string {
  const id = p ? idOf(p) : "guest";
  return `wfg-record::${id}`;
}
