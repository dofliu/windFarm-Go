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
