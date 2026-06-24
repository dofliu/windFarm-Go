import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useGame } from "./GameContext";
import { useDialogue } from "./DialogueContext";
import { FAULTS } from "../ui/faults";
import { missionInstance } from "../ui/campaign";
import { TUTORIAL_STEPS } from "../ui/tutorialSteps";
import type { Screen } from "../App";

// 首次進場互動導覽（莉莉手把手）：以 localStorage 記住是否已看過，可隨時跳過、可從設定重看。
const KEY = "wfg-tutorial-done";
const seen = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // 忽略（無痕模式等）
  }
};

interface TutorialCtx {
  running: boolean;
  step: number; // 目前步驟索引
  total: number;
  register: (key: string, el: HTMLElement | null) => void; // 元件註冊可高亮目標
  getTarget: (key: string) => HTMLElement | null;
  version: number; // 目標註冊/變動版本（觸發重新量測）
  start: () => void; // 開始/重看教學
  skip: () => void; // 跳過並標記已看
  advance: () => void; // 前進一步（手動或閘門達成）
}

const Ctx = createContext<TutorialCtx | null>(null);

export function TutorialProvider({ setScreen, children }: { setScreen: (s: Screen) => void; children: ReactNode }) {
  const { data, dispatch } = useGame();
  const { clear: clearDialogue } = useDialogue();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [version, setVersion] = useState(0);
  const targets = useRef<Map<string, HTMLElement>>(new Map());

  const register = useCallback((key: string, el: HTMLElement | null) => {
    if (el) targets.current.set(key, el);
    else targets.current.delete(key);
    setVersion((v) => v + 1); // 目標掛載/卸載 → 通知覆蓋層重新量測
  }, []);
  const getTarget = useCallback((key: string) => targets.current.get(key) ?? null, []);

  // 開始教學前先回到母港，並備妥第一關所需備品（避免卡在「缺料無法出航」，讓玩家專心走流程）。
  const dataRef = useRef(data);
  dataRef.current = data;
  const start = useCallback(() => {
    setScreen("hub");
    clearDialogue(); // 清掉登入歡迎詞等佇列，避免與導覽覆蓋層重疊
    const d = dataRef.current;
    const quest = d.customQuest ?? missionInstance(d.campaignIndex);
    const fault = FAULTS[quest.targetFault];
    if (fault && (d.inventory[fault.part] ?? 0) < 1) {
      dispatch({ type: "BUY", partId: fault.part, qty: 1, cost: 0, leadDays: 0 }); // 教學贈料（免費）
    }
    setStep(0);
    setRunning(true);
  }, [setScreen, dispatch, clearDialogue]);

  const skip = useCallback(() => {
    setRunning(false);
    markSeen();
    clearDialogue(); // 清掉教學期間累積但未顯示的對話
  }, [clearDialogue]);

  const advance = useCallback(() => {
    setStep((s) => {
      if (s + 1 >= TUTORIAL_STEPS.length) {
        setRunning(false);
        markSeen();
        clearDialogue();
        return s;
      }
      return s + 1;
    });
  }, [clearDialogue]);

  // 首次進入：延遲一下讓畫面就緒後自動開場（已看過則不觸發）。
  useEffect(() => {
    if (seen()) return;
    const id = window.setTimeout(() => start(), 800);
    return () => window.clearTimeout(id);
  }, [start]);

  const value = useMemo<TutorialCtx>(
    () => ({ running, step, total: TUTORIAL_STEPS.length, register, getTarget, version, start, skip, advance }),
    [running, step, register, getTarget, version, start, skip, advance],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTutorial() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTutorial must be used within TutorialProvider");
  return v;
}

// 元件用：取得綁定某高亮目標的 ref callback。
export function useCoachTarget(key: string) {
  const { register } = useTutorial();
  return useCallback((el: HTMLElement | null) => register(key, el), [register, key]);
}
