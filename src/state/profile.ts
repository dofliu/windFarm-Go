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
