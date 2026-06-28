import { useEffect, useState } from "react";

// 手機(窄螢幕)偵測:直向手機寬度通常 < 760px → 切換到「手機精簡版面」(單欄、加大字體)。
// 桌機與橫向平板維持原本 1600×900 等比舞台。以 matchMedia 監聽,旋轉/縮放即時更新。
export const MOBILE_MAX_WIDTH = 760;

export function useIsMobile(maxWidth = MOBILE_MAX_WIDTH): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [mobile, setMobile] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return mobile;
}
