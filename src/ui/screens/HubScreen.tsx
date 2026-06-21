import { useState, type CSSProperties } from "react";
import { C, FONT_SERIF, primaryBg, circle, panel, panelHeader, panelTitle, stripe } from "../tokens";
import { t } from "../../game/systems/i18n";
import { useLang } from "../useLang";
import { AdvisorPopup, Avatar } from "../Portrait";
import { exprUrl, NARRATOR_EXPR } from "../characters";
import { useGame } from "../../state/GameContext";
import { useDialogue } from "../../state/DialogueContext";
import { S } from "../../i18n/strings";
import { Sfx } from "../../audio/sfx";
import { toast, SOON } from "../toast";
import { CAMPAIGN, missionAt } from "../campaign";
import type { I18n } from "../../game/systems/types";
import type { QuestStage } from "../../state/game";
import type { Screen } from "../../App";

// C1：莉莉台詞依工單階段
const STAGE_LINE: Record<QuestStage, I18n> = {
  available: { zh: "船長！CH-12 有新工單，先到左下角『接單』吧！", en: "Captain! New order on CH-12 — tap ACCEPT at the bottom-left!" },
  active: { zh: "工單進行中～點『出海作業』前往 CH-12！", en: "Order in progress — hit SET SAIL to reach CH-12!" },
  done: { zh: "幹得好，船長！工單完成 🎉（點我換表情）", en: "Well done, Captain! Order complete 🎉 (click me)" },
};
const STAGE_EXPR: Record<QuestStage, number> = { available: 0, active: 1, done: 5 };

const labelChip: CSSProperties = {
  display: "inline-block",
  marginTop: 7,
  padding: "3px 12px",
  background: "rgba(12,30,38,.9)",
  border: "1px solid rgba(214,167,84,.5)",
  borderRadius: 3,
  color: C.cream,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: ".04em",
  whiteSpace: "nowrap",
};

function Marker({
  char,
  label,
  left,
  top,
  bob,
  onClick,
}: {
  char: string;
  label: { zh: string; en: string };
  left: number;
  top: number;
  bob: number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left,
        top,
        width: 120,
        textAlign: "center",
        cursor: "pointer",
        animation: `bob ${bob}s ease-in-out infinite`,
      }}
    >
      <div style={{ ...circle(62, 28), margin: "0 auto" }}>{char}</div>
      <div style={labelChip}>{t(label)}</div>
    </div>
  );
}

function RailBtn({ char, label, onClick }: { char: string; label: { zh: string; en: string }; onClick?: () => void }) {
  useLang();
  return (
    <div onClick={onClick} style={{ textAlign: "center", cursor: "pointer" }}>
      <div style={{ ...circle(56, 24), border: "2px solid rgba(214,167,84,.7)", boxShadow: "0 5px 14px rgba(0,0,0,.4)", background: "radial-gradient(circle at 50% 35%, #20586a, #0f3140)" }}>
        {char}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: "#e4eef0", textShadow: "0 1px 3px #000" }}>{t(label)}</div>
    </div>
  );
}

function TickerRow({ stars, name, price, farm, pct, onClick }: { stars: string; name: string; price: string; farm: string; pct: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 4, background: "rgba(255,255,255,.04)", marginBottom: 7, cursor: "pointer" }}>
      <div style={{ width: 42, height: 42, flex: "none", borderRadius: 4, background: stripe, border: "1px solid rgba(214,167,84,.3)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#e2b24a", fontSize: 11, lineHeight: 1 }}>{stars}</div>
        <div style={{ color: C.cream, fontSize: 14, fontWeight: 700, margin: "2px 0" }}>{name}</div>
        <div style={{ color: C.mist3, fontSize: 11 }}>◎ {price} · {farm}</div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <span style={{ color: C.green, fontSize: 14, fontWeight: 900 }}>{pct}</span>
      </div>
    </div>
  );
}

export default function HubScreen({ setScreen, accent, onDispatch, onFacility }: { setScreen: (s: Screen) => void; accent: string; onDispatch?: () => void; onFacility?: (k: "vessel" | "tech" | "tool" | "codex" | "ranking") => void }) {
  useLang();
  const { data, dispatch } = useGame();
  const { say } = useDialogue();
  const stage = data.questStage;
  const mission = missionAt(data.campaignIndex);
  const quest = data.customQuest ?? mission;
  const goMarket = () => setScreen("market");
  const goSail = () => setScreen("sail");
  const [ei, setEi] = useState<number | null>(null); // null = 跟隨階段表情
  const exprIdx = ei ?? STAGE_EXPR[stage];

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
      {/* location markers */}
      <Marker char="備" label={{ zh: "備品交易所", en: "Parts Market" }} left={560} top={300} bob={4} onClick={() => { Sfx.click(); goMarket(); }} />
      <Marker char="工" label={{ zh: "機具工坊", en: "Workshop" }} left={760} top={230} bob={4.6} onClick={() => { Sfx.click(); onFacility?.("tool"); }} />
      <Marker char="調" label={{ zh: "調度中心", en: "Dispatch" }} left={940} top={296} bob={5.2} onClick={() => { Sfx.click(); onDispatch?.(); }} />
      <Marker char="師" label={{ zh: "技師公會", en: "Tech Guild" }} left={650} top={430} bob={4.2} onClick={() => { Sfx.click(); onFacility?.("tech"); }} />
      <Marker char="船" label={{ zh: "CTV 整備廠", en: "CTV Yard" }} left={880} top={452} bob={4.8} onClick={() => { Sfx.click(); onFacility?.("vessel"); }} />

      {/* LEFT: market ticker */}
      <div style={{ ...panel, position: "absolute", left: 28, top: 92, width: 312 }}>
        <div style={{ ...panelHeader, justifyContent: "space-between", padding: "9px 14px" }}>
          <span style={{ ...panelTitle, fontSize: 16, letterSpacing: ".06em" }}>{t({ zh: "風場行情", en: "Market" })}</span>
          <span style={{ fontSize: 13, color: C.mist2, fontVariantNumeric: "tabular-nums" }}>00:30:23</span>
        </div>
        <div style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: 12, color: accent, fontWeight: 700, letterSpacing: ".1em", marginBottom: 7 }}>{t({ zh: "熱門備品", en: "Hot Parts" })}</div>
          <TickerRow stars="★★★★" name={t({ zh: "變槳軸承", en: "Pitch Bearing" })} price="130,800" farm={t({ zh: "西島風場", en: "Xidao Farm" })} pct="↑300%" onClick={goMarket} />
          <TickerRow stars="★★★★★" name={t({ zh: "齒輪箱齒輪油", en: "Gearbox Oil" })} price="130,800" farm={t({ zh: "彰芳風場", en: "CFXF Farm" })} pct="↑350%" onClick={goMarket} />

          <div style={{ fontSize: 12, color: accent, fontWeight: 700, letterSpacing: ".1em", margin: "5px 0 7px" }}>{t({ zh: "行情快訊", en: "Flash" })}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, padding: "7px 8px", borderRadius: 4, background: "rgba(220,100,80,.12)", border: "1px solid rgba(220,100,80,.3)" }}>
              <div style={{ color: C.red, fontSize: 11, fontWeight: 700 }}>{t({ zh: "爆跌 · 耗材", en: "Crash · Consumable" })}</div>
              <div style={{ color: "#cfe0e6", fontSize: 12, marginTop: 3 }}>{t({ zh: "潤滑油", en: "Lube Oil" })} ◎2,380</div>
              <div style={{ color: C.red, fontSize: 12, fontWeight: 700 }}>↓ -89%</div>
            </div>
            <div style={{ flex: 1, padding: "7px 8px", borderRadius: 4, background: "rgba(127,206,142,.1)", border: "1px solid rgba(127,206,142,.28)" }}>
              <div style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>{t({ zh: "爆漲 · 金屬", en: "Surge · Metal" })}</div>
              <div style={{ color: "#cfe0e6", fontSize: 12, marginTop: 3 }}>{t({ zh: "海纜", en: "Cable" })} ◎6,688</div>
              <div style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>↑ +125%</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", borderTop: "1px solid rgba(214,167,84,.25)" }}>
          <div style={{ flex: 1, textAlign: "center", padding: "9px 0", fontSize: 13, fontWeight: 700, color: "#0f2630", background: "linear-gradient(180deg,#e8c074,#d9a441)" }}>{t({ zh: "世界行情", en: "World" })}</div>
          <div style={{ flex: 1, textAlign: "center", padding: "9px 0", fontSize: 13, color: C.mist2 }}>{t({ zh: "我的機組", en: "My Fleet" })}</div>
          <div style={{ flex: 1, textAlign: "center", padding: "9px 0", fontSize: 13, color: C.mist2 }}>{t({ zh: "分類", en: "Category" })}</div>
        </div>
      </div>

      {/* RIGHT: action rail */}
      <div style={{ position: "absolute", right: 26, top: 108, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
        <RailBtn char="任" label={{ zh: "任務", en: "Quests" }} onClick={() => { Sfx.click(); onDispatch?.(); }} />
        <RailBtn char="船" label={{ zh: "船隊", en: "Fleet" }} onClick={() => { Sfx.click(); onFacility?.("vessel"); }} />
        <RailBtn char="倉" label={{ zh: "倉庫", en: "Storage" }} onClick={() => { Sfx.click(); setScreen("market"); toast({ zh: "切到交易所「賣出」分頁可檢視庫存", en: "See inventory under the Market 'Sell' tab" }); }} />
        <RailBtn char="鑑" label={{ zh: "圖鑑", en: "Codex" }} onClick={() => { Sfx.click(); onFacility?.("codex"); }} />
        <RailBtn char="榜" label={{ zh: "排行", en: "Ranking" }} onClick={() => { Sfx.click(); onFacility?.("ranking"); }} />
      </div>

      {/* BOTTOM-LEFT: quest card（依工單階段動態） */}
      <div style={{ ...panel, position: "absolute", left: 28, bottom: 26, width: 372, boxShadow: "0 12px 30px rgba(0,0,0,.4)" }}>
        <div style={panelHeader}>
          <Avatar id="manager" src={exprUrl("manager", "neutral")} size={28} headShot />
          <span style={panelTitle}>{t(S.panel.workOrder)}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: stage === "done" ? C.green : C.mist2 }}>
            {t(stage === "available" ? S.status.available : stage === "active" ? S.status.active : S.status.done)}
          </span>
        </div>
        <div style={{ padding: "12px 14px" }}>
          {!data.customQuest && <div style={{ fontSize: 11, color: C.goldText, fontFamily: FONT_SERIF, marginBottom: 3 }}>{t(mission.chapter)}</div>}
          <div style={{ color: C.cream, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t(quest.title)}</div>
          <div style={{ color: C.mist, fontSize: 12.5, lineHeight: 1.5 }}>{t(quest.brief)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1, height: 7, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
              <div style={{ width: stage === "available" ? "0%" : stage === "done" ? "100%" : data.repairDone ? "100%" : "50%", height: "100%", background: "linear-gradient(90deg,#e8c074,#d9a441)" }} />
            </div>
            <span style={{ fontSize: 12, color: "#cfe0e6", fontVariantNumeric: "tabular-nums" }}>{stage === "done" ? "1 / 1" : "0 / 1"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <span style={{ padding: "4px 10px", borderRadius: 3, background: "rgba(217,164,65,.14)", border: "1px solid rgba(214,167,84,.4)", color: C.goldText, fontSize: 12 }}>{t({ zh: "預算", en: "Budget" })} +{Math.round(quest.rewardBudget / 10000)} {t({ zh: "萬", en: "M" })}</span>
            <span style={{ padding: "4px 10px", borderRadius: 3, background: "rgba(127,206,142,.12)", border: "1px solid rgba(127,206,142,.35)", color: C.greenLight, fontSize: 12 }}>{t({ zh: "資歷", en: "XP" })} +{quest.rewardXp}</span>
            {stage === "available" && (
              <button
                onClick={() => {
                  Sfx.click();
                  dispatch({ type: "ACCEPT_QUEST" });
                  if (data.customQuest) say({ speaker: "narrator_girl", expr: "happy", line: { zh: `工單已接下！前往 ${quest.unit}，從上方「出海航行」出發！`, en: `Accepted! Head to ${quest.unit} via "Set Sail".` } });
                  else say(mission.intro);
                }}
                style={{ marginLeft: "auto", padding: "5px 16px", borderRadius: 4, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(accent), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13, cursor: "pointer" }}
              >
                {t(S.btn.accept)}
              </button>
            )}
            {stage === "done" &&
              (data.campaignDone ? (
                <button onClick={() => { Sfx.success(); dispatch({ type: "RESTART_CAMPAIGN" }); }} style={{ marginLeft: "auto", padding: "5px 14px", borderRadius: 4, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(accent), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13, cursor: "pointer" }}>
                  🎉 {t({ zh: "戰役完成 · 重玩", en: "Clear · Replay" })}
                </button>
              ) : (
                <button onClick={() => { Sfx.click(); dispatch({ type: "NEXT_QUEST", poolSize: CAMPAIGN.length }); }} style={{ marginLeft: "auto", padding: "5px 14px", borderRadius: 4, border: "1px solid rgba(214,167,84,.5)", background: "rgba(15,40,50,.82)", color: C.cream, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  ✅ {t(S.btn.nextOrder)}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* BOTTOM-CENTER: primary actions */}
      <div style={{ position: "absolute", left: "50%", bottom: 34, transform: "translateX(-50%)", display: "flex", gap: 16, alignItems: "center" }}>
        <SecBtn icon="◷" label={t(S.btn.routeMap)} onClick={() => { Sfx.click(); toast(SOON); }} />
        <div onClick={() => { Sfx.click(); goSail(); }} style={{ padding: "16px 46px", borderRadius: 6, background: primaryBg(accent), border: "1px solid rgba(255,236,196,.6)", color: C.ink, fontFamily: FONT_SERIF, fontSize: 21, fontWeight: 900, letterSpacing: ".1em", whiteSpace: "nowrap", cursor: "pointer", boxShadow: "0 8px 22px rgba(217,164,65,.35), inset 0 1px 0 rgba(255,255,255,.4)" }}>
          {t(S.btn.setSail)}
        </div>
        <SecBtn
          icon="⚓"
          label={t(S.btn.restPort)}
          onClick={() => {
            Sfx.click();
            dispatch({ type: "REST" });
            say({ speaker: "narrator_girl", expr: "smile", line: { zh: "靠港休整一天，重新評估海象～", en: "Rested a day in port — sea state re-assessed." } });
          }}
        />
      </div>

      {/* 解說員少女：任務引導（點擊換表情/台詞） */}
      <AdvisorPopup
        id="narrator_girl"
        src={exprUrl("narrator_girl", NARRATOR_EXPR[exprIdx])}
        line={STAGE_LINE[stage]}
        style={{ left: 1300, bottom: 6 }}
        portraitH={260}
        bubbleSide="left"
        onClick={() => setEi((exprIdx + 1) % NARRATOR_EXPR.length)}
      />
    </div>
  );
}

function SecBtn({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ padding: "13px 22px", borderRadius: 5, background: "rgba(15,40,50,.82)", border: "1px solid rgba(214,167,84,.45)", color: C.cream, fontSize: 15, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
      <span style={{ color: C.gold, fontSize: 17 }}>{icon}</span> {label}
    </div>
  );
}
