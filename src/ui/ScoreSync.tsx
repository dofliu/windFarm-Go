import { useEffect, useRef } from "react";
import { useGame } from "../state/GameContext";
import { computeScore } from "../state/game";
import { getProfile } from "../state/profile";
import { submitScore } from "../cloud/sheet";

// 結算同步：完成任務數變化時，把目前績效送到雲端排行榜（Google 表單）。
// 未設定雲端（SHEET_CONFIG.enabled=false）時 submitScore 直接 no-op，零成本。
export default function ScoreSync() {
  const { data } = useGame();
  const lastSent = useRef(-1);

  useEffect(() => {
    const profile = getProfile();
    if (!profile || profile.guest) return; // 訪客不計排行
    // 只在「完成任務數」推進時送分，避免洗版
    if (data.missionsDone === lastSent.current) return;
    lastSent.current = data.missionsDone;
    const score = computeScore(data);
    submitScore({
      nickname: profile.nickname,
      classCode: profile.classCode,
      score,
      availability: data.availability,
      generation: data.generationMWh,
      day: data.day,
    });
  }, [data.missionsDone, data.generationMWh, data.availability, data.day]);

  return null;
}
