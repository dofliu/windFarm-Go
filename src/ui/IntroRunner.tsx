import { useEffect } from "react";
import { useDialogue, type DlgMsg } from "../state/DialogueContext";

const KEY = "wfg-seen-intro";

// 開場教學（#B）：首次進入由莉莉介紹遊戲與循環，只跑一次。
const INTRO: DlgMsg[] = [
  { speaker: "narrator_girl", expr: "smile", line: { zh: "歡迎來到艾利歐離岸風場！我是你的助理莉莉～", en: "Welcome to the Aero offshore wind farm! I'm Lily, your assistant." } },
  { speaker: "narrator_girl", expr: "thinking", line: { zh: "這片海上的『巨神塔』供電全國，但最近故障頻傳…", en: "These offshore 'Titans' power the nation — but faults have been spiking lately…" } },
  { speaker: "narrator_girl", expr: "happy", line: { zh: "你的任務：調度船隊、排除故障，把機組妥善率拉回 100%！", en: "Your job: dispatch the fleet, clear faults, and push availability back to 100%!" } },
  { speaker: "narrator_girl", expr: "surprise", line: { zh: "先點右側『調度中心(調)』接例行小任務，穩穩賺預算 💰", en: "Tap the Dispatch hub (調) for quick routine jobs to bank some budget 💰" } },
  { speaker: "narrator_girl", expr: "happy", line: { zh: "有了預算就到『備品交易所』買備品——高階故障要對應備品才修得好喔！", en: "With budget, buy at the Parts Market — big faults need the right spare to fix!" } },
  { speaker: "narrator_girl", expr: "wink", line: { zh: "準備好了就接下工單、出海作業吧！我會一路提示你～", en: "Ready? Accept an order and set sail — I'll guide you along the way!" } },
];

export default function IntroRunner() {
  const { say } = useDialogue();
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      // 忽略
    }
    const id = window.setTimeout(() => {
      say(INTRO);
      try {
        localStorage.setItem(KEY, "1");
      } catch {
        // 忽略
      }
    }, 700);
    return () => window.clearTimeout(id);
  }, [say]);
  return null;
}
