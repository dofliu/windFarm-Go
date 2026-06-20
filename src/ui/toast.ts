import type { I18n } from "../game/systems/types";

// 極輕量 toast：單一監聽者（Toaster 掛在 App）。給尚未開放的按鈕一點回饋。
type Fn = (m: I18n) => void;
let fn: Fn | null = null;

export function toast(m: I18n) {
  fn?.(m);
}
export function onToast(f: Fn) {
  fn = f;
  return () => {
    if (fn === f) fn = null;
  };
}

export const SOON: I18n = { zh: "敬請期待", en: "Coming soon" };
