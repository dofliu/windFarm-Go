import { useEffect } from "react";
import { useGame } from "../state/GameContext";
import { accountSeed } from "./campaign";
import { rollDailyState, dueDailyClaims, dailyDef } from "../state/dailyTasks";
import { toWan } from "../state/game";
import { toast } from "./toast";
import { Sfx } from "../audio/sfx";

// 每日任務追蹤（#78）：監看遊戲內日 →（1）日推進時產生當日任務、（2）達成時自動發獎並通知。
// 與排行/紀錄追蹤同為 App 內常駐的 headless 元件。
export default function DailyTracker() {
  const { data, dispatch } = useGame();

  // 日推進（或首次掛載）→ 產生當日每日任務（baseline = 當前累積值）
  useEffect(() => {
    if (!data.daily || data.daily.day !== data.day) {
      dispatch({ type: "ROLL_DAILY", daily: rollDailyState(data.day, accountSeed(), data, data.daily) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.day]);

  // 狀態變更 → 自動發放已達成的每日任務獎勵（reducer 冪等，重複派發不重複計）
  useEffect(() => {
    const due = dueDailyClaims(data);
    if (!due.length) return;
    due.forEach((id, i) => {
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
