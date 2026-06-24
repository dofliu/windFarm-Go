import type { I18n } from "../game/systems/types";
import type { GameData } from "../state/game";
import type { Screen } from "../App";
import { FAULTS } from "./faults";
import { missionInstance } from "./campaign";

// 互動導覽單一步驟：
// - target：要高亮（聚光）的元件 key（見各畫面 useCoachTarget）；未提供則置中說明。
// - screen：本步驟預期所在畫面（提示用；實際以 gate 判定完成）。
// - gate：給定時為「行動步驟」，當回傳 true 即自動前進（false→true 轉變時）；未提供則為「閱讀步驟」，點『下一步』前進。
// - expr：莉莉表情（characters.ts 的 NARRATOR_EXPR 名稱）。
export interface CoachStep {
  id: string;
  target?: string;
  screen?: Screen;
  text: I18n;
  expr?: string;
  gate?: (d: GameData, screen: Screen) => boolean;
}

const currentFault = (d: GameData) => {
  const quest = d.customQuest ?? missionInstance(d.campaignIndex);
  return FAULTS[quest.targetFault];
};

export const TUTORIAL_STEPS: CoachStep[] = [
  {
    id: "welcome",
    expr: "smile",
    text: {
      zh: "嗨船長！我是助理莉莉～第一次來,我帶你親手走一遍「接工單 → 出海 → 維修 → 完工」的完整流程吧!",
      en: "Hi Captain! I'm Lily, your assistant. First time here — let me walk you hand-in-hand through one full work order: accept → sail → repair → done!",
    },
  },
  {
    id: "accept",
    target: "accept",
    screen: "hub",
    expr: "happy",
    text: {
      zh: "先接單!點這顆「接單」鈕,接下你的第一張工單(齒輪箱過熱)。",
      en: "Let's accept a job! Tap this 'Accept' button to take your first work order (gearbox overheat).",
    },
    gate: (d) => d.questStage === "active",
  },
  {
    id: "market",
    target: "market",
    screen: "hub",
    expr: "wink",
    text: {
      zh: "備品都在「備品交易所」買——高階故障要對應備品才修得好。這次我已經幫你備好需要的備品,專心走流程就好!",
      en: "Spares are bought at the 'Parts Market' — big faults need the right part. I've prepped the part you need this time, so just follow along!",
    },
  },
  {
    id: "setsail",
    target: "setsail",
    screen: "hub",
    expr: "surprise",
    text: {
      zh: "接著點中央的「出海航行」,前往故障機組!",
      en: "Now tap 'SET SAIL' in the center to head out to the faulty turbine!",
    },
    gate: (_d, screen) => screen === "sail",
  },
  {
    id: "depart",
    target: "depart",
    screen: "sail",
    expr: "happy",
    text: {
      zh: "出航前會做「出勤就緒檢查」:船、人、料、天氣。都備齊了,點「出航」!",
      en: "Before sailing there's a mobilization check: vessel, crew, parts, weather. All set — tap 'DEPART'!",
    },
    gate: (d) => d.jobPhase !== "office",
  },
  {
    id: "startrepair",
    target: "startrepair",
    screen: "sail",
    expr: "smile",
    text: {
      zh: "航行中…抵達機組後,點「登塔開始維修」。",
      en: "Sailing… once you arrive, tap 'Start Repair' to climb the tower.",
    },
    gate: (_d, screen) => screen === "repair",
  },
  {
    id: "board",
    target: "board",
    screen: "repair",
    expr: "happy",
    text: {
      zh: "海象平穩,可安全登船。點「登船登塔,開始作業」!",
      en: "Calm seas — board safely. Tap 'Board & start work'!",
    },
    gate: (d) => !!d.repair?.boarded,
  },
  {
    id: "quiz",
    target: "quiz",
    screen: "repair",
    expr: "thinking",
    text: {
      zh: "先看右上 SCADA 告警判讀,再從「診斷測驗」選出正確原因。選錯會多耗作業窗,但可以重選喔!",
      en: "Read the SCADA alarm, then pick the right cause in the diagnosis quiz. Wrong answers cost work-window time, but you can retry!",
    },
    gate: (d) => {
      const f = currentFault(d);
      return !!f && d.repair?.pick === f.quiz.correct;
    },
  },
  {
    id: "sop",
    target: "sop",
    screen: "repair",
    expr: "happy",
    text: {
      zh: "答對了!接著把「標準作業程序 SOP」剩下的步驟逐一點完。",
      en: "Correct! Now tick off the remaining 'SOP' checklist steps one by one.",
    },
    gate: (d) => !!d.repair?.steps?.length && d.repair.steps.every(Boolean),
  },
  {
    id: "finish",
    target: "finish",
    screen: "repair",
    expr: "surprise",
    text: {
      zh: "全部就緒!點下方按鈕結算回報 SCADA。(若是大型組件,會轉為『大修』,需回母港逐日推進——一樣算完成這一步!)",
      en: "All set! Tap the button below to report to SCADA. (Major components switch to a multi-day 'overhaul' back at port — that still counts here!)",
    },
    // 一般工單 → questStage done；重大故障 → 轉入大修(overhaul)。兩種結果都視為走完這一步,避免卡關。
    gate: (d) => d.questStage === "done" || !!d.overhaul || d.repairDone,
  },
  {
    id: "done",
    expr: "wink",
    text: {
      zh: "太棒了,船長!你已經走完一張工單的核心流程 🎉 接下來多接工單、到「風場戰情室」管理機隊、衝排行榜吧!想再看一次教學,可從右上齒輪⚙設定重新播放~",
      en: "Brilliant, Captain! You've completed the core work-order loop 🎉 Take on more jobs, manage the fleet in 'Fleet Ops', and climb the leaderboard! Replay this tutorial anytime from the ⚙ settings.",
    },
  },
];
