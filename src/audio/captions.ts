// 無障礙:音效字幕。重要音效(成功/失敗/收支)除了發聲,另可在畫面上以文字呈現,
// 讓聽障或靜音環境的玩家不漏掉回饋。純邏輯、無 DOM 相依,便於測試。
import type { I18n } from "../game/systems/types";

export type CaptionKind = "success" | "error" | "cash";

// 單純的點擊音(click)太頻繁,字幕會變成噪音,刻意不提供。
export const SFX_CAPTIONS: Record<CaptionKind, I18n> = {
  success: { zh: "♪ 成功提示音(上行三音)", en: "♪ Success chime (rising)" },
  error: { zh: "♪ 失敗/錯誤提示音(低沉雙音)", en: "♪ Error buzz (low double tone)" },
  cash: { zh: "♪ 收支提示音(投幣聲)", en: "♪ Coin sound (cash change)" },
};

const KEY = "wfg-captions"; // "1" = 開啟;預設關閉
let enabled = false;
try {
  enabled = localStorage.getItem(KEY) === "1";
} catch {
  // 忽略
}

type Fn = (m: I18n) => void;
const listeners = new Set<Fn>();

export const Captions = {
  isEnabled: () => enabled,
  setEnabled(b: boolean) {
    enabled = b;
    try {
      localStorage.setItem(KEY, b ? "1" : "0");
    } catch {
      // 忽略
    }
  },
  // 音效函式呼叫:關閉時不做事。不受靜音影響——靜音者正是字幕的主要使用者。
  emit(kind: CaptionKind) {
    if (!enabled) return;
    const m = SFX_CAPTIONS[kind];
    listeners.forEach((f) => f(m));
  },
  subscribe(f: Fn) {
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  },
};
