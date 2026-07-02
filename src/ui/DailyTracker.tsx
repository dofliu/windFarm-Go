import { useEffect, useRef } from "react";
import { useGame } from "../state/GameContext";
import { accountSeed } from "./campaign";
import { rollDailyState, dueDailyClaims, dueDeferredClaims, dailyDef } from "../state/dailyTasks";
import { toWan } from "../state/game";
import { toast } from "./toast";
import { Sfx } from "../audio/sfx";

// 每日任務追蹤（#78）：監看遊戲內日 →（1）日推進時「先結算昨日維持型任務、再產生當日任務」、
// （2）增量型任務達成時自動發獎並通知。與排行/紀錄追蹤同為 App 內常駐的 headless 元件。
export default function DailyTracker() {
  const { data, dispatch } = useGame();
  // 已排程發獎的去重鍵(day:id):效果會因 data 變動重跑,避免同一任務重複排 setTimeout → 重複音效/通知(#daily-fix)
  const scheduled = useRef<Set<string>>(new Set());

  // 日推進（或首次掛載）→ 先結算「昨日維持型任務」(撐過一整天才發獎),再產生當日任務
  useEffect(() => {
    if (!data.daily || data.daily.day !== data.day) {
      const settled: string[] = data.daily ? dueDeferredClaims(data) : [];
      for (const id of settled) {
        const def = dailyDef(id);
        if (!def) continue;
        dispatch({ type: "CLAIM_DAILY", id, xp: def.xp, cash: def.cash });
        Sfx.success();
        toast({
          zh: `✅ 每日任務達成：${def.desc.zh}（+◎${toWan(def.cash)} 萬 ・ +${def.xp} XP）`,
          en: `✅ Daily done: ${def.desc.en} (+◎${toWan(def.cash)}M ・ +${def.xp} XP)`,
        });
      }
      // 連勝判定要看「含剛結算」的完成數 → 用本地補丁後的 prev 再 roll
      const prev = data.daily ? { ...data.daily, claimed: [...data.daily.claimed, ...settled] } : null;
      dispatch({ type: "ROLL_DAILY", daily: rollDailyState(data.day, accountSeed(), data, prev) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.day]);

  // 狀態變更 → 自動發放已達成的「增量型」每日任務獎勵（reducer 冪等，重複派發不重複計）
  useEffect(() => {
    const due = dueDailyClaims(data);
    if (!due.length) return;
    due.forEach((id, i) => {
      const key = `${data.daily?.day}:${id}`;
      if (scheduled.current.has(key)) return; // 已排程過(效果重跑) → 不重複音效/通知
      scheduled.current.add(key);
      const def = dailyDef(id);
      if (!def) return;
      window.setTimeout(() => {
        dispatch({ type: "CLAIM_DAILY", id, xp: def.xp, cash: def.cash });
        Sfx.success();
        toast({
          zh: `✅ 每日任務達成：${def.desc.zh}（+◎${toWan(def.cash)} 萬 ・ +${def.xp} XP）`,
          en: `✅ Daily done: ${def.desc.en} (+◎${toWan(def.cash)}M ・ +${def.xp} XP)`,
        });
      }, i * 900);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
}
