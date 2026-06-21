import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { C, FONT_SERIF, primaryBg, panel, panelHeader, panelTitle } from "../tokens";
import { t } from "../../game/systems/i18n";
import { useLang } from "../useLang";
import { AdvisorPopup } from "../Portrait";
import { exprUrl, NARRATOR_EXPR } from "../characters";
import { useGame } from "../../state/GameContext";
import { useDialogue } from "../../state/DialogueContext";
import { S } from "../../i18n/strings";
import { Sfx } from "../../audio/sfx";
import { toast, SOON } from "../toast";
import { CAMPAIGN, missionAt } from "../campaign";
import { FAULTS } from "../faults";
import { PARTS } from "../data";
import { DISC } from "../disc";
import { toWan, computeScore, type QuestStage } from "../../state/game";
import { FARMS } from "../../state/farms";
import { fetchLeaderboard, type Row } from "../../cloud/sheet";
import { getProfile } from "../../state/profile";
import { MODE_LABEL, MODE_ICON, type SceneMode } from "../scenes";
import { missionWeek } from "../../state/course";
import type { I18n } from "../../game/systems/types";
import type { Screen } from "../../App";

// 莉莉台詞依工單階段
const STAGE_LINE: Record<QuestStage, I18n> = {
  available: { zh: "船長！有新工單，從左側『設施 · 調度中心』接單吧！", en: "Captain! New order — accept it via Facilities · Dispatch on the left!" },
  active: { zh: "工單進行中～點中央『出海航行』前往機組！", en: "Order in progress — hit SET SAIL in the center!" },
  done: { zh: "幹得好，船長！工單完成 🎉（點我換表情）", en: "Well done, Captain! Order complete 🎉 (click me)" },
};
const STAGE_EXPR: Record<QuestStage, number> = { available: 0, active: 1, done: 5 };

// 左側設施列
function FacRow({ char, label, stat, onClick }: { char: string; label: I18n; stat?: I18n; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 11, padding: "6px 10px", borderRadius: 5, background: "rgba(255,255,255,.04)", marginBottom: 5, cursor: "pointer", border: "1px solid rgba(214,167,84,.14)" }}>
      <div style={{ width: 32, height: 32, flex: "none", borderRadius: "50%", background: "radial-gradient(circle at 50% 35%, #20586a, #0f3140)", border: "2px solid rgba(214,167,84,.7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SERIF, fontWeight: 900, color: C.goldText, fontSize: 15 }}>{char}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.cream, fontSize: 14, fontWeight: 700 }}>{t(label)}</div>
        {stat && <div style={{ color: C.mist, fontSize: 11.5 }}>{t(stat)}</div>}
      </div>
      <span style={{ color: C.mist2, fontSize: 14 }}>›</span>
    </div>
  );
}

// 右側「我的營運」分區標題
function OpsBlock({ title, children }: { title: I18n; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, letterSpacing: ".08em", marginBottom: 5 }}>{t(title)}</div>
      {children}
    </div>
  );
}

const kvRow: CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 13, color: C.cream, padding: "3px 0" };

export default function HubScreen({ setScreen, accent, onDispatch, onFacility, sceneName, onCycleScene, aerial, onToggleView, mode = "sim", onCycleMode, onOps, week = 1 }: { setScreen: (s: Screen) => void; accent: string; onDispatch?: () => void; onFacility?: (k: "vessel" | "tech" | "tool" | "codex" | "ranking" | "farms") => void; sceneName?: I18n; onCycleScene?: () => void; aerial?: boolean; onToggleView?: () => void; mode?: SceneMode; onCycleMode?: () => void; onOps?: () => void; week?: number }) {
  useLang();
  const { data, dispatch } = useGame();
  const { say } = useDialogue();
  const stage = data.questStage;
  const mission = missionAt(data.campaignIndex);
  const quest = data.customQuest ?? mission;
  const fault = FAULTS[quest.targetFault];
  const goSail = () => setScreen("sail");
  const [ei, setEi] = useState<number | null>(null); // null = 跟隨階段表情
  const exprIdx = ei ?? STAGE_EXPR[stage];
  const [opsOpen, setOpsOpen] = useState(true); // #6 抽屜預設展開

  // #5 班級動態：讀排行榜，輪播其他使用者進度
  const [feed, setFeed] = useState<Row[]>([]);
  const [feedIdx, setFeedIdx] = useState(0);
  useEffect(() => {
    fetchLeaderboard().then(setFeed);
  }, []);
  useEffect(() => {
    if (feed.length === 0) return;
    const id = window.setInterval(() => setFeedIdx((i) => (i + 1) % feed.length), 4000);
    return () => window.clearInterval(id);
  }, [feed.length]);

  // #34 突發事件：lastEvent 變動時跳通知
  const lastEvtDay = useRef(-1);
  useEffect(() => {
    const e = data.lastEvent;
    if (e && e.day !== lastEvtDay.current) {
      lastEvtDay.current = e.day;
      (e.good ? Sfx.success : Sfx.error)();
      toast({ zh: `📣 ${e.name.zh}：${e.desc.zh}`, en: `📣 ${e.name.en}: ${e.desc.en}` });
    }
  }, [data.lastEvent]);

  const me = getProfile();
  // #3 每週開放：下一關屬下週時鎖定（沙盒不受限；課程臨時任務不鎖）
  const nextLocked = !data.customQuest && !data.campaignDone && missionWeek(data.campaignIndex + 1) > week;
  const invItems = Object.entries(data.inventory).filter(([, n]) => (n ?? 0) > 0);
  const seaLabel = data.seaState === "workable" ? { zh: "可作業", en: "Workable" } : data.seaState === "caution" ? { zh: "警戒", en: "Caution" } : { zh: "停航", en: "Closed" };
  const seaColor = data.seaState === "workable" ? C.green : data.seaState === "caution" ? C.amber : C.red;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
      {/* 中央：風場風景由 SceneBackground 提供，這裡僅放大型出海 CTA */}

      {/* ───── 左側：設施選單 ───── */}
      <div style={{ ...panel, position: "absolute", left: 26, top: 84, width: 286 }}>
        <div style={panelHeader}><span style={panelTitle}>{t({ zh: "設施", en: "Facilities" })}</span></div>
        <div style={{ padding: "10px 10px 6px" }}>
          <FacRow char="調" label={{ zh: "調度中心", en: "Dispatch" }} stat={stage === "available" ? { zh: "有新工單可接", en: "New order available" } : stage === "active" ? { zh: "工單進行中", en: "Order active" } : { zh: "本關已完成", en: "Stage done" }} onClick={() => { Sfx.click(); onDispatch?.(); }} />
          <FacRow char="營" label={{ zh: "自由營運中心", en: "Ops Center" }} stat={{ zh: "無限狀況・判斷決策（衝排行）", en: "Endless situations · judgment (leaderboard)" }} onClick={() => { Sfx.click(); onOps?.(); }} />
          <FacRow char="師" label={{ zh: "技師公會", en: "Tech Guild" }} stat={{ zh: `技師 ${data.engineers.length} 名 · 在勤 ${data.techAvail}/${data.techTotal}`, en: `${data.engineers.length} engineers · ${data.techAvail}/${data.techTotal} on duty` }} onClick={() => { Sfx.click(); onFacility?.("tech"); }} />
          <FacRow char="工" label={{ zh: "機具工坊", en: "Workshop" }} stat={{ zh: `工具 Lv.${data.toolLevel}`, en: `Tools Lv.${data.toolLevel}` }} onClick={() => { Sfx.click(); onFacility?.("tool"); }} />
          <FacRow char="備" label={{ zh: "備品交易所", en: "Parts Market" }} stat={{ zh: `庫存 ${invItems.length} 類`, en: `${invItems.length} part types in stock` }} onClick={() => { Sfx.click(); setScreen("market"); }} />
          <FacRow char="船" label={{ zh: "CTV 整備廠", en: "CTV Yard" }} stat={{ zh: `${data.ownsSOV ? "SOV" : "CTV"} · Lv.${data.vesselLevel}`, en: `${data.ownsSOV ? "SOV" : "CTV"} · Lv.${data.vesselLevel}` }} onClick={() => { Sfx.click(); onFacility?.("vessel"); }} />
          <FacRow char="場" label={{ zh: "風場拓展", en: "Expand Farms" }} stat={{ zh: `營運 ${data.farmsOwned}/${FARMS.length} 座風場`, en: `${data.farmsOwned}/${FARMS.length} farms operating` }} onClick={() => { Sfx.click(); onFacility?.("farms"); }} />
          <div style={{ display: "flex", gap: 6 }}>
            <FacRowMini char="鑑" label={{ zh: "圖鑑", en: "Codex" }} onClick={() => { Sfx.click(); onFacility?.("codex"); }} />
            <FacRowMini char="榜" label={{ zh: "排行", en: "Ranking" }} onClick={() => { Sfx.click(); onFacility?.("ranking"); }} />
          </div>
        </div>
      </div>

      {/* ───── 左側：風場動態 + 班級動態 ───── */}
      <div style={{ ...panel, position: "absolute", left: 26, top: 470, width: 286 }}>
        <div style={panelHeader}><span style={panelTitle}>{t({ zh: "風場動態", en: "Farm Status" })}</span></div>
        <div style={{ padding: "10px 12px" }}>
          <div style={kvRow}><span style={{ color: C.mist }}>{t({ zh: "海象", en: "Sea" })}</span><span style={{ color: seaColor, fontWeight: 700 }}>{t(seaLabel)}</span></div>
          <div style={kvRow}><span style={{ color: C.mist }}>{t({ zh: "營運風場", en: "Farms" })}</span><span style={{ fontWeight: 700 }}>{data.farmsOwned} / {FARMS.length}</span></div>
          <div style={kvRow}><span style={{ color: C.mist }}>{t({ zh: "可用率", en: "Availability" })}</span><span style={{ fontWeight: 700 }}>{data.availability}%</span></div>
          <div style={kvRow}><span style={{ color: C.mist }}>{t({ zh: "發電量", en: "Generation" })}</span><span style={{ fontWeight: 700 }}>{data.generationMWh} MWh</span></div>
          <div style={kvRow}><span style={{ color: C.mist }}>{t({ zh: "安全事件", en: "Safety incidents" })}</span><span style={{ fontWeight: 700, color: data.safetyIncidents > 0 ? C.red : C.green }}>{data.safetyIncidents}</span></div>
          {data.lastEvent && (
            <div style={{ marginTop: 8, padding: "7px 9px", borderRadius: 4, background: data.lastEvent.good ? "rgba(127,206,142,.1)" : "rgba(227,173,66,.12)", border: `1px solid ${data.lastEvent.good ? "rgba(127,206,142,.28)" : "rgba(227,173,66,.32)"}` }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: data.lastEvent.good ? C.green : C.amber2 }}>📣 {t({ zh: "最新事件", en: "Latest event" })} · {t(data.lastEvent.name)}</div>
              <div style={{ color: "#cfe0e6", fontSize: 11.5, marginTop: 2 }}>{t(data.lastEvent.desc)}</div>
            </div>
          )}
          {/* 警報 */}
          {stage === "active" && fault ? (
            <div style={{ marginTop: 8, padding: "7px 9px", borderRadius: 4, background: "rgba(220,100,80,.12)", border: "1px solid rgba(220,100,80,.32)" }}>
              <div style={{ color: C.red, fontSize: 11.5, fontWeight: 700 }}>⚠ {t({ zh: "警報", en: "Alarm" })} · {quest.unit}</div>
              <div style={{ color: "#cfe0e6", fontSize: 12, marginTop: 2 }}>{t(fault.name)}</div>
            </div>
          ) : (
            <div style={{ marginTop: 8, padding: "7px 9px", borderRadius: 4, background: "rgba(127,206,142,.1)", border: "1px solid rgba(127,206,142,.28)", color: C.green, fontSize: 12 }}>✔ {t({ zh: "目前無作用中警報", en: "No active alarms" })}</div>
          )}
          {/* 班級動態 feed */}
          <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, letterSpacing: ".08em", margin: "12px 0 5px" }}>{t({ zh: "班級動態", en: "Class Feed" })}</div>
          <div style={{ minHeight: 38, padding: "7px 9px", borderRadius: 4, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.14)", fontSize: 12.5 }}>
            {feed.length === 0 ? (
              <span style={{ color: C.mist }}>{t({ zh: "尚無其他玩家紀錄…", en: "No other players yet…" })}</span>
            ) : (
              (() => {
                const r = feed[feedIdx % feed.length];
                const mine = me && r.nickname === me.nickname && r.classCode === me.classCode;
                return (
                  <span style={{ color: mine ? C.goldText : C.cream }}>
                    <span style={{ color: C.mist2 }}>{r.classCode || "—"} · </span>
                    <b>{r.nickname}</b> {t({ zh: "績效分衝上", en: "score reached" })} <b style={{ color: C.goldText }}>{r.score}</b>{mine ? t({ zh: "（你）", en: " (you)" }) : ""}
                  </span>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* ───── 右側：我的營運（可收納抽屜 #6）───── */}
      <div style={{ position: "absolute", right: 26, top: 84, width: 300 }}>
        <div style={{ ...panel }}>
          <div style={{ ...panelHeader, justifyContent: "space-between", cursor: "pointer" }} onClick={() => { Sfx.click(); setOpsOpen((v) => !v); }}>
            <span style={panelTitle}>{t({ zh: "我的營運", en: "My Operations" })}</span>
            <span style={{ color: C.mist2, fontSize: 13 }}>{opsOpen ? "▾ " + t({ zh: "收合", en: "Hide" }) : "▸ " + t({ zh: "展開", en: "Show" })}</span>
          </div>
          {opsOpen && (
            <div style={{ padding: "12px 14px", maxHeight: 540, overflowY: "auto" }}>
              {/* 待處理工單 / 故障 */}
              <OpsBlock title={{ zh: "待處理工單", en: "Work Order" }}>
                {stage === "available" || stage === "active" || stage === "done" ? (
                  <div style={{ padding: "8px 10px", borderRadius: 5, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.18)" }}>
                    {!data.customQuest && <div style={{ fontSize: 11, color: C.goldText, fontFamily: FONT_SERIF }}>{t(mission.chapter)}</div>}
                    <div style={{ color: C.cream, fontSize: 13.5, fontWeight: 700, margin: "2px 0" }}>{t(quest.title)}</div>
                    <div style={{ color: C.mist, fontSize: 11.5 }}>{quest.unit} · {fault ? t(fault.name) : "—"} · <span style={{ color: stage === "done" ? C.green : C.amber2 }}>{t(stage === "available" ? S.status.available : stage === "active" ? S.status.active : S.status.done)}</span></div>
                    {stage === "active" && <div style={{ fontSize: 11, color: C.amber2, marginTop: 4 }}>{t({ zh: "⚠ 停機中：每天約損失 3 萬", en: "⚠ Down: ~30k/day lost" })}</div>}
                    {/* 接單 / 下一關 動作 */}
                    {stage === "available" && (
                      <button onClick={() => { Sfx.click(); dispatch({ type: "ACCEPT_QUEST" }); if (data.customQuest) say({ speaker: "narrator_girl", expr: "happy", line: { zh: `工單已接下！前往 ${quest.unit}，從中央「出海航行」出發！`, en: `Accepted! Head to ${quest.unit} via Set Sail.` } }); else say(mission.intro); }} style={{ width: "100%", marginTop: 8, padding: "7px 0", borderRadius: 4, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(accent), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13, cursor: "pointer" }}>{t(S.btn.accept)}</button>
                    )}
                    {stage === "done" && (data.campaignDone ? (
                      <button onClick={() => { Sfx.success(); dispatch({ type: "RESTART_CAMPAIGN" }); }} style={{ width: "100%", marginTop: 8, padding: "7px 0", borderRadius: 4, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(accent), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13, cursor: "pointer" }}>🎉 {t({ zh: "戰役完成 · 重玩", en: "Clear · Replay" })}</button>
                    ) : nextLocked ? (
                      <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 4, background: "rgba(95,168,217,.12)", border: "1px solid rgba(95,168,217,.32)", fontSize: 11.5, color: C.mist, lineHeight: 1.5 }}>
                        🔒 {t({ zh: `本週計分任務已完成，第 ${missionWeek(data.campaignIndex + 1)} 週開放後繼續。先去『自由營運中心』衝排行吧！`, en: `Weekly graded tasks done — resume when week ${missionWeek(data.campaignIndex + 1)} opens. Meanwhile, try the Ops Center!` })}
                      </div>
                    ) : (
                      <button onClick={() => { Sfx.click(); dispatch({ type: "NEXT_QUEST", poolSize: CAMPAIGN.length }); }} style={{ width: "100%", marginTop: 8, padding: "7px 0", borderRadius: 4, border: "1px solid rgba(214,167,84,.5)", background: "rgba(15,40,50,.82)", color: C.cream, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✅ {t(S.btn.nextOrder)}</button>
                    ))}
                  </div>
                ) : <div style={{ color: C.mist, fontSize: 12 }}>—</div>}
              </OpsBlock>

              {/* 船隊 */}
              <OpsBlock title={{ zh: "船隊", en: "Fleet" }}>
                <div style={kvRow}><span style={{ color: C.mist }}>{data.ownsSOV ? "SOV" : "CTV"}</span><span>Lv.{data.vesselLevel} · {t({ zh: "耐海象", en: "sea-tol" })} {data.ownsSOV ? 2 : 1}</span></div>
              </OpsBlock>

              {/* 技師 */}
              <OpsBlock title={{ zh: "技師", en: "Engineers" }}>
                {data.engineers.length === 0 ? <div style={{ color: C.mist, fontSize: 12 }}>{t({ zh: "尚無技師", en: "None" })}</div> : data.engineers.map((e) => (
                  <div key={e.id} style={kvRow}><span>{e.name}</span><span style={{ color: C.mist2 }}>{t(DISC[e.discipline])} · Lv.{e.level}</span></div>
                ))}
              </OpsBlock>

              {/* 備品庫存 */}
              <OpsBlock title={{ zh: "備品庫存", en: "Parts" }}>
                {invItems.length === 0 ? <div style={{ color: C.mist, fontSize: 12 }}>{t({ zh: "目前無庫存", en: "Empty" })}</div> : invItems.map(([id, n]) => {
                  const p = PARTS.find((x) => x.id === id);
                  return <div key={id} style={kvRow}><span>{t(p?.n ?? { zh: id, en: id })}</span><span style={{ color: C.goldText, fontWeight: 700 }}>× {n}</span></div>;
                })}
              </OpsBlock>

              {/* KPI */}
              <OpsBlock title={{ zh: "績效 KPI", en: "KPI" }}>
                <div style={kvRow}><span style={{ color: C.mist }}>{t({ zh: "綜合績效分", en: "Score" })}</span><span style={{ color: C.goldText, fontWeight: 900 }}>{computeScore(data)}</span></div>
                <div style={kvRow}><span style={{ color: C.mist }}>{t({ zh: "完成任務", en: "Missions" })}</span><span>{data.missionsDone}</span></div>
                <div style={kvRow}><span style={{ color: C.mist }}>{t({ zh: "預算", en: "Budget" })}</span><span>◎ {toWan(data.budget)} {t({ zh: "萬", en: "M" })}</span></div>
                <div style={kvRow}><span style={{ color: C.mist }}>{t({ zh: "天數", en: "Day" })}</span><span>{data.day}</span></div>
              </OpsBlock>
            </div>
          )}
        </div>
      </div>

      {/* 視角 / 海域背景切換（#32） */}
      <div style={{ position: "absolute", left: "50%", top: 92, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8 }}>
        <div onClick={() => { Sfx.click(); onToggleView?.(); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 15px", borderRadius: 20, background: aerial ? "linear-gradient(180deg,#e8c074,#d9a441)" : "rgba(10,28,36,.72)", border: "1px solid rgba(214,167,84,.5)", color: aerial ? C.ink : C.cream, fontSize: 13, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(3px)", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 15 }}>{aerial ? "🏝" : "🛰"}</span>
          {aerial ? t({ zh: "港景視角", en: "Port view" }) : t({ zh: "俯瞰全景", en: "Aerial view" })}
        </div>
        {!aerial && (
          <>
            <div onClick={() => { Sfx.click(); onCycleMode?.(); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 15px", borderRadius: 20, background: mode !== "sim" ? "linear-gradient(180deg,#e8c074,#d9a441)" : "rgba(10,28,36,.72)", border: "1px solid rgba(214,167,84,.45)", color: mode !== "sim" ? C.ink : C.cream, fontSize: 13, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(3px)", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 15 }}>{MODE_ICON[mode]}</span>
              {t(MODE_LABEL[mode])}
            </div>
            <div onClick={() => { Sfx.click(); onCycleScene?.(); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 15px", borderRadius: 20, background: "rgba(10,28,36,.72)", border: "1px solid rgba(214,167,84,.4)", color: C.cream, fontSize: 13, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(3px)", whiteSpace: "nowrap" }}>
              <span style={{ color: C.gold, fontSize: 15 }}>🎨</span>
              {sceneName ? t(sceneName) : "—"}
              <span style={{ color: C.mist2 }}>↻</span>
            </div>
          </>
        )}
      </div>

      {/* ───── 中央底部：主要動作 ───── */}
      <div style={{ position: "absolute", left: "50%", bottom: 36, transform: "translateX(-50%)", display: "flex", gap: 16, alignItems: "center" }}>
        <SecBtn icon="◷" label={t(S.btn.routeMap)} onClick={() => { Sfx.click(); toast(SOON); }} />
        <div onClick={() => { Sfx.click(); goSail(); }} style={{ padding: "16px 46px", borderRadius: 6, background: primaryBg(accent), border: "1px solid rgba(255,236,196,.6)", color: C.ink, fontFamily: FONT_SERIF, fontSize: 21, fontWeight: 900, letterSpacing: ".1em", whiteSpace: "nowrap", cursor: "pointer", boxShadow: "0 8px 22px rgba(217,164,65,.35), inset 0 1px 0 rgba(255,255,255,.4)" }}>
          {t(S.btn.setSail)}
        </div>
        <SecBtn icon="⚓" label={t(S.btn.restPort)} onClick={() => { Sfx.click(); dispatch({ type: "REST" }); say({ speaker: "narrator_girl", expr: "smile", line: { zh: "靠港休整一天，重新評估海象～", en: "Rested a day in port — sea state re-assessed." } }); }} />
      </div>

      {/* 解說員少女：任務引導（點擊換表情/台詞） */}
      <AdvisorPopup
        id="narrator_girl"
        src={exprUrl("narrator_girl", NARRATOR_EXPR[exprIdx])}
        line={STAGE_LINE[stage]}
        style={{ left: 980, bottom: 6 }}
        portraitH={250}
        bubbleSide="left"
        onClick={() => setEi((exprIdx + 1) % NARRATOR_EXPR.length)}
      />
    </div>
  );
}

function FacRowMini({ char, label, onClick }: { char: string; label: I18n; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "8px 0", borderRadius: 5, background: "rgba(255,255,255,.04)", cursor: "pointer", border: "1px solid rgba(214,167,84,.14)" }}>
      <span style={{ width: 26, height: 26, borderRadius: "50%", background: "radial-gradient(circle at 50% 35%, #20586a, #0f3140)", border: "1.5px solid rgba(214,167,84,.7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SERIF, fontWeight: 900, color: C.goldText, fontSize: 13 }}>{char}</span>
      <span style={{ color: C.cream, fontSize: 13, fontWeight: 700 }}>{t(label)}</span>
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
