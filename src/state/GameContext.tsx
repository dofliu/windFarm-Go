import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { INITIAL, reducer, type Action, type GameData } from "./game";
import { getProfile, saveKeyFor } from "./profile";

// 依登入身分取得存檔 key —— 每位使用者資料獨立，互不沿用
function saveKey(): string {
  return saveKeyFor(getProfile());
}

function load(): GameData {
  try {
    const raw = localStorage.getItem(saveKey());
    if (raw) return { ...INITIAL, ...JSON.parse(raw) };
  } catch {
    // 忽略損壞存檔
  }
  return INITIAL;
}

const Ctx = createContext<{ data: GameData; dispatch: React.Dispatch<Action> } | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load);

  // D1：狀態變更即存檔（寫入該登入身分專屬 key）
  useEffect(() => {
    try {
      localStorage.setItem(saveKey(), JSON.stringify(data));
    } catch {
      // 忽略寫入失敗
    }
  }, [data]);

  return <Ctx.Provider value={{ data, dispatch }}>{children}</Ctx.Provider>;
}

export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGame must be used within GameProvider");
  return v;
}
