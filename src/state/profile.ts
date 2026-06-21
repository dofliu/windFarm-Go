// 本機身分（暱稱 + 班級碼），供雲端排行榜辨識使用者。無密碼、零摩擦。
export interface Profile {
  nickname: string;
  classCode: string;
}

const KEY = "wfg-profile";

export function getProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function setProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // 隱私模式可能無法寫入；忽略
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 忽略
  }
}

// 每位使用者獨立存檔的 key（依班級碼 + 暱稱命名空間化）。
export function saveKeyFor(p: Profile | null): string {
  const id = p ? `${p.classCode}/${p.nickname}` : "guest";
  return `windfarm-go-save::${id}`;
}
