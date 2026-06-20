import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { INITIAL, reducer, type Action, type GameData } from "./game";

const KEY = "windfarm-go-save";

function load(): GameData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...INITIAL, ...JSON.parse(raw) };
  } catch {
    // 忽略損壞存檔
  }
  return INITIAL;
}

const Ctx = createContext<{ data: GameData; dispatch: React.Dispatch<Action> } | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load);

  // D1：狀態變更即存檔
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
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
