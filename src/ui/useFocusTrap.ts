import { useEffect, useRef, type RefObject } from "react";
import { getFocusables, nextTrappedIndex } from "./a11y";

// 彈窗 focus trap:開啟時 focus 移入面板(無可聚焦子項則落在面板本身)、
// Tab/Shift+Tab 侷限循環於面板內(不逃逸到背景頁面)、Esc 觸發關閉;
// 關閉(卸載)時歸還開啟前的焦點。各 Modal 皆「開啟時掛載、關閉時卸載」,故只需掛載/卸載一次即可。
export function useFocusTrap(onClose: () => void): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const restore = document.activeElement as HTMLElement | null;
    const panelEl = ref.current;
    const focusables = panelEl ? getFocusables(panelEl) : [];
    (focusables[0] ?? panelEl)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelEl) return;
      const items = getFocusables(panelEl);
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      items[nextTrappedIndex(idx, items.length, e.shiftKey)].focus();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      restore?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}
