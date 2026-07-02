import { useEffect, useState } from "react";

// 無障礙：尊重使用者「減少動態」偏好（prefers-reduced-motion），
// 並支援遊戲內手動開啟（localStorage 覆寫，供無法改作業系統設定的裝置/教室環境）。
// 用於關閉自動播放的場景影片與非必要動畫，對前庭敏感／暈動使用者更友善。
const KEY = "wfg-reduced-motion"; // "1" = 手動強制開啟；未設 = 跟隨系統
const EVT = "wfg-rm-change";

export const getReducedOverride = (): boolean => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};
export const setReducedOverride = (on: boolean) => {
  try { on ? localStorage.setItem(KEY, "1") : localStorage.removeItem(KEY); } catch { /* ignore */ }
  syncBodyClass();
  window.dispatchEvent(new Event(EVT));
};

// 手動覆寫時在 body 加 class,讓 index.css 的「停用動畫」規則也生效(與系統偏好等效)
export const syncBodyClass = () => {
  try { document.body.classList.toggle("wfg-reduced", getReducedOverride()); } catch { /* ignore */ }
};

const systemReduced = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => systemReduced() || getReducedOverride());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setReduced(systemReduced() || getReducedOverride());
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    mq?.addEventListener?.("change", on);
    window.addEventListener(EVT, on);
    return () => { mq?.removeEventListener?.("change", on); window.removeEventListener(EVT, on); };
  }, []);
  return reduced;
}
