import { useEffect } from "react";
import { useGame } from "../state/GameContext";
import { accountSeed } from "./campaign";
import { weekOf, rollWeeklyState, weeklyDue, themeById } from "../state/weeklyChallenges";
import { toWan } from "../state/game";
import { toast } from "./toast";
import { Sfx } from "../audio/sfx";

// 每週主題挑戰追蹤（#79，headless）：週推進時 roll 新主題(跳介紹)、達成時自動發獎。
export default function WeeklyTracker() {
  const { data, dispatch } = useGame();
  const wk = weekOf(data.day);

  // 週推進（或首次掛載）→ 產生當週主題挑戰並跳主題介紹
  useEffect(() => {
    if (!data.weekly || data.weekly.week !== wk) {
      const weekly = rollWeeklyState(wk, accountSeed(), data, data.weekly);
      dispatch({ type: "ROLL_WEEKLY", weekly });
      const theme = themeById(weekly.themeId);
      if (theme) {
        Sfx.click();
        toast({ zh: `📅 ${theme.icon} ${theme.name.zh}：${theme.desc.zh}`, en: `📅 ${theme.icon} ${theme.name.en}: ${theme.desc.en}` });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wk]);

  // 狀態變更 → 達成本週挑戰即自動發獎（reducer 冪等）
  useEffect(() => {
    if (!weeklyDue(data)) return;
    const theme = themeById(data.weekly!.themeId);
    if (!theme) return;
    dispatch({ type: "CLAIM_WEEKLY", xp: theme.xp, cash: theme.cash });
    Sfx.success();
    toast({
      zh: `🏆 每週挑戰達成：${theme.goal.zh}（+◎${toWan(theme.cash)} 萬 ・ +${theme.xp} XP）`,
      en: `🏆 Weekly challenge done: ${theme.goal.en} (+◎${toWan(theme.cash)}M ・ +${theme.xp} XP)`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
}
