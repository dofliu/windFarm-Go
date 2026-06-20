import { useEffect, useReducer } from "react";
import { onLangChange } from "../game/systems/i18n";

// 訂閱語言切換，強制元件重繪
export function useLang(): void {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => onLangChange(() => force()), []);
}
