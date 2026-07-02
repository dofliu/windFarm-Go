import { useEffect, useMemo, useState } from "react";
import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { Portrait } from "./Portrait";
import { exprUrl, NARRATOR_EXPR } from "./characters";
import { Sfx } from "../audio/sfx";
import { SLA_FLOOR, fleetUptime, toWan, fatigueOf, type GameData } from "../state/game";
import type { I18n } from "../game/systems/types";

interface Tip { line: I18n; expr: string }

// 依目前營運狀態，動態組出莉莉的提示／建議（會隨遊戲進度變化，而非固定一句）。
function hubTips(d: GameData): Tip[] {
  const tips: Tip[] = [];
  // 工單階段
  if (d.questStage === "available") tips.push({ expr: "happy", line: { zh: "有新工單可接！從左側『調度中心』或右側『待處理工單』接單吧。", en: "A new order's up! Accept it via Dispatch or the Work Order panel." } });
  else if (d.questStage === "active") tips.push({ expr: "surprise", line: { zh: "工單進行中～備齊備品後點中央『出海作業』前往機組。", en: "Order active — stock the part, then hit Set Sail." } });
  else if (d.questStage === "done") tips.push({ expr: "wink", line: { zh: "幹得好！可以接下一張工單,或去『自由營運中心』衝排行。", en: "Nice! Take the next order, or hit the Ops Center for leaderboard points." } });

  // 機隊待修
  const faults = d.fleet.filter((f) => f.status === "fault").length;
  if (faults > 0) tips.push({ expr: "worried", line: { zh: `風場戰情室有 ${faults} 台待修——別讓妥善率(目前 ${fleetUptime(d.fleet)}%)往下掉。`, en: `${faults} unit(s) await repair in Fleet Ops — keep uptime (now ${fleetUptime(d.fleet)}%) from slipping.` } });

  // 合約 SLA 風險
  const avg = d.slaSamples > 0 ? d.slaAvailSum / d.slaSamples : d.availability;
  if (avg < SLA_FLOOR) tips.push({ expr: "worried", line: { zh: `本季平均可用率 ${avg.toFixed(0)}% 低於底線 ${SLA_FLOOR}%,季末會被扣違約金,盡快搶修!`, en: `Quarter avg availability ${avg.toFixed(0)}% is below the ${SLA_FLOOR}% floor — fix faults before quarter-end or pay a penalty!` } });

  // 預算偏低
  if (d.budget < 5_000_000) tips.push({ expr: "thinking", line: { zh: "預算有點吃緊~先接例行小任務、穩定售電現金流。", en: "Budget's tight — take routine jobs and keep electricity revenue flowing." } });

  // 船舶磨耗
  if (d.vesselWear >= 55) tips.push({ expr: "worried", line: { zh: `船舶磨耗 ${Math.round(d.vesselWear)}% 偏高,作業窗會縮短,去 CTV 整備廠保養吧。`, en: `Vessel wear at ${Math.round(d.vesselWear)}% shortens your work window — service at the CTV Yard.` } });

  // 機組健康度
  if (d.fleetHealth < 40) tips.push({ expr: "worried", line: { zh: "機組健康度偏低,突發故障機率上升——做點預防性定檢比較划算。", en: "Fleet health is low; failures get likelier — preventive inspections pay off." } });

  // 三日預報風暴
  if (d.forecast.includes("closed")) tips.push({ expr: "thinking", line: { zh: "三日內有風暴(停航),提早規劃出海與大修的可作業天氣窗。", en: "A storm (no-sail) is in the 3-day forecast — plan your weather windows early." } });

  // 過勞技師
  if (d.engineers.some((e) => fatigueOf(e) >= 80)) tips.push({ expr: "worried", line: { zh: "有技師快過勞了,適時『靠港休整』讓他們回復,別硬派。", en: "An engineer's near burnout — rest in port to recover before dispatching again." } });

  // 半途成果保留(#carry):有保留進度的工單 → 提醒出海續修
  if (d.questStage === "active" && d.repair && !d.repair.boarded) tips.push({ expr: "happy", line: { zh: "上次返港前的維修進度已保留!挑個好天氣窗出海,登塔就能續修。", en: "Your repair progress was saved! Pick a good weather window, sail out, and resume where you left off." } });

  // 常駐教學小提示（提供穩定可輪播的內容）
  tips.push(
    { expr: "smile", line: { zh: "小提醒:售電收入＝實際運轉的機組,管理好機隊就是賺錢。", en: "Tip: revenue = turbines actually running — managing the fleet is how you earn." } },
    { expr: "thinking", line: { zh: "一趟出海可同時派多台維修,分攤動員費——別一台一台跑。", en: "One voyage can repair several units, sharing the mobilization cost — don't go one-by-one." } },
    { expr: "smile", line: { zh: "答對診斷題、完成 SOP 才算修好;答錯會多耗作業窗喔。", en: "A correct diagnosis + full SOP completes a repair; wrong answers cost work-window time." } },
    { expr: "happy", line: { zh: `目前綜合績效分要靠:高可用率、完成任務、少安全事件。預算 ◎${toWan(d.budget)} 萬。`, en: `Score comes from high uptime, missions done, and few safety incidents. Budget ◎${toWan(d.budget)}M.` } },
    { expr: "smile", line: { zh: "缺料就先到『備品交易所』下單,注意有到貨前置期。", en: "Out of parts? Order at the Parts Market — mind the delivery lead time." } },
    { expr: "thinking", line: { zh: "作業窗吃緊時有三條路:繼續作業(穩)、加班搶修(快但有風險)、回港再規劃(保留進度)。", en: "When the window's tight: keep working (steady), rush (fast but risky), or return to port (progress kept)." } },
    { expr: "happy", line: { zh: "診斷第一次就答對會累積 🔥 連對,XP 加成越疊越高——出手前先想清楚!", en: "First-try correct diagnoses build a 🔥 streak with growing XP bonus — think before you answer!" } },
  );
  return tips;
}

// 母港常駐顧問莉莉：右下角立繪 + 動態提示氣泡。點立繪換下一則提示;可收起。
export default function HubAdvisor() {
  useLang();
  const { data } = useGame();
  const [hidden, setHidden] = useState(false);
  const [idx, setIdx] = useState(0);

  const tips = useMemo(() => hubTips(data), [data]);
  const tip = tips[idx % tips.length] ?? tips[0];

  // 自動輪播提示（玩家未操作時也會變化）。
  useEffect(() => {
    if (hidden) return;
    const id = window.setInterval(() => setIdx((i) => i + 1), 11000);
    return () => window.clearInterval(id);
  }, [hidden]);

  const nextTip = () => { Sfx.click(); setIdx((i) => i + 1); };

  // 收起狀態：右下角小頭像，點擊還原。
  if (hidden) {
    return (
      <div
        onClick={() => { Sfx.click(); setHidden(false); }}
        title={t({ zh: "顯示莉莉提示", en: "Show Lily's tips" })}
        style={{ position: "absolute", right: 14, bottom: 12, zIndex: 4, width: 52, height: 52, borderRadius: "50%", backgroundImage: `url(${exprUrl("narrator_girl", "smile")})`, backgroundSize: "150%", backgroundPosition: "50% 14%", border: `2px solid ${C.gold}`, boxShadow: "0 4px 14px rgba(0,0,0,.5)", cursor: "pointer" }}
      >
        <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: C.gold, color: C.ink, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>💡</span>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", right: 8, bottom: 2, zIndex: 4, display: "flex", alignItems: "flex-end", gap: 6 }}>
      {/* 提示泡泡（在立繪左側，朝畫面中央，不擋右側面板） */}
      <div style={{ maxWidth: 248, marginBottom: 14, background: "linear-gradient(180deg, rgba(20,50,63,.96), rgba(13,36,46,.97))", border: "1px solid rgba(214,167,84,.55)", borderRadius: 10, padding: "9px 12px", boxShadow: "0 10px 26px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 13.5, color: C.goldText }}>{t({ zh: "莉莉", en: "Lily" })}</span>
          <span style={{ fontSize: 10.5, color: C.mist2 }}>{t({ zh: "提示", en: "Tip" })}</span>
          <button onClick={() => { Sfx.click(); setHidden(true); }} title={t({ zh: "收起", en: "Hide" })} style={{ marginLeft: "auto", background: "transparent", border: "none", color: C.mist2, fontSize: 13, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: C.cream, minHeight: 36 }}>{t(tip.line)}</div>
        <div style={{ marginTop: 6, textAlign: "right" }}>
          <button onClick={nextTip} style={{ background: "transparent", border: "none", color: C.mist2, fontSize: 11.5, cursor: "pointer" }}>{t({ zh: "下一則 ▸", en: "Next ▸" })}</button>
        </div>
      </div>
      {/* 立繪（點擊換下一則提示與表情） */}
      <div onClick={nextTip} style={{ cursor: "pointer" }}>
        <Portrait id="narrator_girl" src={exprUrl("narrator_girl", tip.expr || NARRATOR_EXPR[idx % NARRATOR_EXPR.length])} style={{ height: 210, width: "auto", filter: "drop-shadow(0 8px 18px rgba(0,0,0,.5))" }} />
      </div>
    </div>
  );
}
