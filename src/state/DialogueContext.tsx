import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { I18n } from "../game/systems/types";

// 事件驅動對話：任何元件呼叫 say()，由底部中央對話框依序播放（#7）
export interface DlgMsg {
  speaker: string; // 角色 id（characters.ts）
  line: I18n;
  expr?: string; // 表情（narrator_girl 專用）
}

const Ctx = createContext<{ current: DlgMsg | null; say: (m: DlgMsg | DlgMsg[]) => void; next: () => void } | null>(null);

export function DialogueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DlgMsg[]>([]);
  const say = useCallback((m: DlgMsg | DlgMsg[]) => setQueue((q) => [...q, ...(Array.isArray(m) ? m : [m])]), []);
  const next = useCallback(() => setQueue((q) => q.slice(1)), []);
  return <Ctx.Provider value={{ current: queue[0] ?? null, say, next }}>{children}</Ctx.Provider>;
}

export function useDialogue() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDialogue must be used within DialogueProvider");
  return v;
}
