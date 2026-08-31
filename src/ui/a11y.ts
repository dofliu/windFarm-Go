import type { KeyboardEvent } from "react";

// 讓非原生 <button> 的可點擊元素(如 div/span 卡片)支援 Enter/Space 鍵盤觸發,
// 用於工單循環(母港設施導覽、交易所選品、診斷測驗、SOP 步驟)等自訂卡片式互動。
export function onKeyActivate(onActivate: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onActivate();
  };
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// 找出容器內目前可鍵盤聚焦的元素(供彈窗 focus trap 使用,見 useFocusTrap.ts)。
export function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

// Tab/Shift+Tab 循環索引;current=-1(目前焦點不在任何項目上)視同從第 0 項起算。
export function nextTrappedIndex(current: number, count: number, shiftKey: boolean): number {
  if (count <= 0) return -1;
  const base = current < 0 ? 0 : current;
  const step = shiftKey ? -1 : 1;
  return (base + step + count) % count;
}
