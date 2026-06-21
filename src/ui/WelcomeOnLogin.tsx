import { useEffect } from "react";
import { useDialogue } from "../state/DialogueContext";
import { getProfile } from "../state/profile";

// 登入後莉莉的歡迎詞：本元件在登入後掛載一次 → useEffect([]) 只觸發一次。
// 隨機從罐頭句挑一句，帶入使用者暱稱。
const WELCOMES: ((n: string) => { zh: string; en: string })[] = [
  (n) => ({ zh: `${n} 你好～準備好開始今天的風場冒險了嗎？`, en: `Hi ${n}! Ready for today's wind-farm adventure?` }),
  (n) => ({ zh: `歡迎回來，${n}！海象不等人，我們出發吧～`, en: `Welcome back, ${n}! The sea won't wait — let's go!` }),
  (n) => ({ zh: `${n}！港口的工單已經在等你囉～`, en: `${n}! There are work orders waiting at the port~` }),
  (n) => ({ zh: `早安 ${n}！今天也要守護好每一台風機喔！`, en: `Morning, ${n}! Let's keep every turbine spinning today!` }),
  (n) => ({ zh: `${n} 船長，風場交給你了，加油！`, en: `Captain ${n}, the farm is in your hands — good luck!` }),
];

export default function WelcomeOnLogin() {
  const { say } = useDialogue();
  useEffect(() => {
    const p = getProfile();
    const name = p?.nickname || "船長";
    // 用名字長度當穩定索引，避免每次重繪變動（Math.random 在此非必要）
    const pick = WELCOMES[(name.length + (p?.classCode?.length ?? 0)) % WELCOMES.length];
    say({ speaker: "narrator_girl", expr: "happy", line: pick(name) });
  }, [say]);
  return null;
}
