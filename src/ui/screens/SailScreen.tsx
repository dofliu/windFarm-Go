import { useEffect, useState, type CSSProperties } from "react";
import { C, FONT_SERIF, primaryBg } from "../tokens";
import { t } from "../../game/systems/i18n";
import { useLang } from "../useLang";
import { SailTurbines } from "../Turbine";
import { AdvisorPopup } from "../Portrait";
import { exprUrl } from "../characters";
import { useGame } from "../../state/GameContext";
import { useCoachTarget } from "../../state/TutorialContext";
import { Sfx } from "../../audio/sfx";
import { SEA_INDEX, seaTolOf, activeVesselSpec, availableEngineer, tierOf, workWindowMax, sopStepCost } from "../../state/game";
import { FAULTS, isMajorFault } from "../faults";
import { missionInstance } from "../campaign";
import { DISC, hasEngineer } from "../disc";
import { PARTS } from "../data";
import Vessel, { type VesselType } from "../Vessel";
import RouteMap from "../RouteMap";
import { SceneVideo } from "../SceneVideo";
import { ForecastStrip, StormWarning } from "../Forecast";
import type { Screen } from "../../App";

function CtvShip({ left, top, scale, opacity, type }: { left: string; top: number; scale: number; opacity: number; type: VesselType }) {
  return (
    <div style={{ position: "absolute", left, top, transform: `scale(${scale})`, opacity }}>
      {/* 航跡 */}
      <div style={{ position: "absolute", left: "50%", top: 24, transform: "translateX(-50%)", width: 30, height: 90, background: "linear-gradient(180deg, rgba(255,255,255,.6), rgba(255,255,255,0))", clipPath: "polygon(36% 0,64% 0,100% 100%,0 100%)", filter: "blur(1px)" }} />
      <Vessel type={type} />
    </div>
  );
}

function Check({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13 }}>
      <span style={{ color: ok ? C.green : C.red, fontWeight: 900 }}>{ok ? "✔" : "✖"}</span>
      <span style={{ color: C.cream }}>{label}</span>
      {!ok && hint && <span style={{ color: C.amber2, fontSize: 12 }}>— {hint}</span>}
    </div>
  );
}

// 出海前工期預估的單列（左標籤、右數值）
function EstRow({ label, value, hint, muted, bold }: { label: string; value: string; hint?: string; muted?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "2px 0", fontSize: 12 }}>
      <span style={{ color: muted ? C.mist2 : C.cream, fontWeight: bold ? 700 : 400 }}>{label}</span>
      {hint && <span style={{ color: C.mist2, fontSize: 10.5 }}>({hint})</span>}
      <span style={{ marginLeft: "auto", color: muted ? C.mist2 : C.cream, fontWeight: bold ? 900 : 600 }}>{value}</span>
    </div>
  );
}

export default function SailScreen({ setScreen, accent, mode = "sim", mobile = false }: { setScreen: (s: Screen) => void; accent: string; mode?: "sim" | "real" | "comic"; mobile?: boolean }) {
  useLang();
  const { data, dispatch } = useGame();
  const active = data.questStage === "active";
  const quest = data.customQuest ?? missionInstance(data.campaignIndex);
  const fault = FAULTS[quest.targetFault];
  const part = PARTS.find((p) => p.id === fault?.part);
  // 重大作業出動安裝船(jack-up)，否則依目前作業船（#4）
  const spec = activeVesselSpec(data);
  const fleetType: VesselType = fault && isMajorFault(fault.id) ? "jackup" : data.activeVessel;

  // 出勤就緒檢查（#25）；技師需未超過輪班上限（#7 疲勞）
  const hasAnyEng = fault ? hasEngineer(data.engineers, fault.discipline) : false;
  const engOk = fault ? availableEngineer(data.engineers, fault.discipline) : false;
  const partOk = fault ? (data.inventory[fault.part] ?? 0) > 0 : false;
  const seaOk = SEA_INDEX[data.seaState] <= seaTolOf(data);
  const ready = active && engOk && partOk && seaOk;

  // Part A — 出海前工期預估 vs 天氣窗（與現場 RepairScreen 同一套公式 → 數字一致）。
  // 讓玩家在出航前判斷「是否保留足夠作業窗」；只提示、不擋出航（由玩家自行決定）。
  const winMax = workWindowMax(data);
  const roughSea = data.seaState !== "workable";
  const stepCost = sopStepCost(data.toolLevel);
  const sopClickable = fault ? Math.max(0, fault.sop.length - 2) : 3; // 前兩步預設完成、其餘需逐步完成
  const estBoard = roughSea ? 3 : 0; // 登船（頂浪 −3；平穩不耗窗）
  const estInspect = 1; // 診斷題（答對一次；答錯每次 −3）
  const estRepair = sopClickable * stepCost; // 維修 SOP
  const estOnsite = estBoard + estInspect + estRepair; // 上塔作業小計（耗天氣窗）
  const reserve = winMax - estOnsite; // 保留餘裕
  const transitH = 4; // 單程航程 ~4h（與航行 ETA 一致）
  const resCol = reserve >= 3 ? C.green : reserve >= 1 ? C.amber2 : C.redText;

  // 航行動畫（enroute → onsite）
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (data.jobPhase !== "enroute") return;
    let p = 0;
    setProgress(0);
    const id = window.setInterval(() => {
      p += 4;
      setProgress(p);
      if (p >= 100) {
        window.clearInterval(id);
        dispatch({ type: "ARRIVE" }); // 在回呼內 dispatch，非渲染期間
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [data.jobPhase, dispatch]);

  const depart = () => {
    Sfx.click();
    dispatch({ type: "DEPART" });
  };
  // 新手教學高亮目標
  const departRef = useCoachTarget("depart");
  const startRepairRef = useCoachTarget("startrepair");

  return (
    <div style={mobile ? { position: "relative", padding: "12px 12px 24px", display: "flex", flexDirection: "column", gap: 12 } : { position: "absolute", inset: 0, zIndex: 2 }}>
      {/* 模擬模式：CSS 海面＋風機＋船;手機精簡版隱藏裝飾場景 */}
      {!mobile && (mode === "sim" ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "34%", background: "linear-gradient(180deg,#a9cfe0 0%, #cfe1de 55%, #ece4cd 100%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "66%", background: "linear-gradient(180deg,#50b4c5 0%, #2f93ab 28%, #1f6f88 68%, #134e61 100%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "66%", background: "repeating-linear-gradient(178deg, rgba(255,255,255,.06) 0 2px, rgba(255,255,255,0) 2px 28px)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "33.6%", height: 1, background: "rgba(255,255,255,.45)" }} />
          <SailTurbines />
          <CtvShip left="47%" top={300} scale={0.66} opacity={0.9} type={fleetType} />
          <CtvShip left="43%" top={360} scale={0.9} opacity={0.96} type={fleetType} />
          <CtvShip left="38.5%" top={432} scale={1.18} opacity={1} type={fleetType} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 46%, rgba(6,18,24,0) 55%, rgba(6,18,24,.42) 100%)", pointerEvents: "none" }} />
        </div>
      ) : (
        <CtvShip left="42%" top={392} scale={1.25} opacity={1} type={fleetType} />
      ))}

      {/* 場景影片:出海航行(enroute)鋪底 —— 漫畫模式用大航海動畫版,其餘用寫實版;手機隱藏 */}
      {!mobile && data.jobPhase === "enroute" && <SceneVideo file={mode === "comic" ? "comic_sailing.mp4" : "sailing.mp4"} poster={mode === "comic" ? "comic_sailing.jpg" : "real_sailing.jpg"} />}
      {/* 大修進行中:安裝船吊裝場景鋪底 */}
      {!mobile && !!data.overhaul && data.jobPhase === "office" && <SceneVideo file="overhaul.mp4" poster="real_overhaul.jpg" />}

      {/* destination chip */}
      <div style={mobile ? { padding: "9px 14px", borderRadius: 6, background: "rgba(10,28,36,.82)", border: "1px solid rgba(214,167,84,.4)", display: "flex", alignItems: "center", gap: 10 } : { position: "absolute", left: 40, top: 96, padding: "9px 16px", borderRadius: 6, background: "rgba(10,28,36,.82)", border: "1px solid rgba(214,167,84,.4)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: accent, fontSize: 16 }}>⚑</span>
        <div>
          <div style={{ color: C.cream, fontSize: 14, fontWeight: 700 }}>{t({ zh: "航向", en: "Heading" })} · {active ? quest.unit : "—"}</div>
          <div style={{ color: C.mist, fontSize: 11 }}>{t({ zh: "船舶", en: "Vessel" })}: {fault && isMajorFault(fault.id) ? t({ zh: "安裝船", en: "Jack-up" }) : t(spec.short)} · {t({ zh: "耐海象", en: "sea-tol" })} {seaTolOf(data)} · {t({ zh: "動員", en: "mob." })} {spec.mobilizeDays}d</div>
        </div>
      </div>

      {/* 出海動態航線俯瞰圖（Phase A #1）：航行中顯示港口→風場的船隻移動 */}
      {data.jobPhase === "enroute" && (
        <div style={mobile ? { display: "flex", justifyContent: "center" } : { position: "absolute", left: "calc(50% - 30px)", top: "46%", transform: "translate(-50%,-50%)", zIndex: 3 }}>
          <RouteMap progress={progress} unit={quest.unit} vessel={fleetType} />
        </div>
      )}

      {/* 出勤就緒 / 航行 / 抵達 面板 */}
      <div style={mobile ? { width: "100%", background: "linear-gradient(180deg, rgba(20,50,63,.95), rgba(13,36,46,.97))", border: "1px solid rgba(214,167,84,.5)", borderRadius: 8, overflow: "hidden" } : { position: "absolute", right: 26, top: 92, width: 320, background: "linear-gradient(180deg, rgba(20,50,63,.95), rgba(13,36,46,.97))", border: "1px solid rgba(214,167,84,.5)", borderRadius: 8, boxShadow: "0 14px 36px rgba(0,0,0,.5)", overflow: "hidden" }}>
        <div style={{ textAlign: "center", padding: "9px 0", background: "linear-gradient(180deg,#e8c074,#cf9a35)", color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16 }}>
          {data.jobPhase === "office" ? t({ zh: "出勤就緒檢查", en: "Mobilization Check" }) : data.jobPhase === "enroute" ? t({ zh: "航行中…", en: "En route…" }) : t({ zh: "已抵達機組", en: "On site" })}
        </div>
        <div style={{ padding: "12px 16px" }}>
          {!active ? (
            <div style={{ color: C.mist, fontSize: 13, lineHeight: 1.6, textAlign: "center", padding: "10px 0" }}>{t({ zh: "請先在母港接下工單。", en: "Accept a work order at the port first." })}</div>
          ) : data.jobPhase === "office" && data.overhaul ? (
            <div style={{ padding: "8px 0" }}>
              <div style={{ fontSize: 13.5, color: C.goldText, fontWeight: 700, marginBottom: 6 }}>🛠 {t({ zh: "大修工程進行中", en: "Overhaul in progress" })} · {data.overhaul.unit}</div>
              <div style={{ fontSize: 12.5, color: C.cream, lineHeight: 1.6, marginBottom: 10 }}>{t({ zh: "安裝船已就位吊裝大組件，無需再次出航。請回母港「待處理工單」逐日推進大修——看準三日預報的可作業天氣窗。", en: "The jack-up is on station for the component swap — no need to sail again. Push the overhaul day-by-day from the port Work Order panel, timing the workable windows in the 3-day forecast." })}</div>
              <button onClick={() => { Sfx.click(); setScreen("hub"); }} style={{ width: "100%", padding: "11px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(accent), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 15, cursor: "pointer" }}>{t({ zh: "回母港推進大修", en: "Back to port" })}</button>
            </div>
          ) : data.jobPhase === "office" ? (
            <>
              <Check ok={true} label={`${t({ zh: "船舶", en: "Vessel" })}：${t(spec.short)}（${t({ zh: "耐海象", en: "sea-tol" })} ${spec.seaTol}）`} />
              <Check ok={engOk} label={`${t({ zh: "技師", en: "Engineer" })}（${t(fault ? DISC[fault.discipline] : { zh: "", en: "" })}）`} hint={t(hasAnyEng ? { zh: "技師過勞、需靠港休整", en: "crew fatigued — rest in port" } : { zh: "去技師公會招募", en: "hire at Tech Guild" })} />
              <Check ok={true} label={`${t({ zh: "工具", en: "Tools" })} Lv.${data.toolLevel}`} />
              <Check ok={partOk} label={`${t({ zh: "備品", en: "Part" })}：${t(part?.n ?? { zh: fault?.part ?? "", en: fault?.part ?? "" })}`} hint={t({ zh: "去交易所購買", en: "buy at Market" })} />
              <Check ok={seaOk} label={`${t({ zh: "天氣窗", en: "Weather" })}：${data.seaState === "workable" ? t({ zh: "可作業", en: "OK" }) : data.seaState === "caution" ? t({ zh: "警戒", en: "Caution" }) : t({ zh: "停航", en: "Closed" })}`} hint={t({ zh: "需 SOV 或靠港休整", en: "need SOV or rest" })} />
              {/* 微觀天氣預報（#2）：協助決定「現在出航」或「靠港等更好的天氣窗」。漸進揭露(#77):Tier 1 先看「今日海象」即可。 */}
              {tierOf(data) >= 2 && (<>
                <div style={{ fontSize: 11, color: C.mist2, margin: "6px 0 4px" }}>{t({ zh: "三日預報", en: "3-Day Forecast" })}</div>
                <ForecastStrip forecast={data.forecast} compact />
                <StormWarning forecast={data.forecast} />
              </>)}
              {/* Part A — 工期預估 vs 天氣窗：航線／登船／檢查／維修 估時 + 天氣窗允許 + 保留餘裕，供玩家判斷是否出航 */}
              {fault && (
                <div style={{ marginTop: 10, padding: "9px 10px", borderRadius: 6, background: "rgba(8,24,31,.6)", border: "1px solid rgba(214,167,84,.3)" }}>
                  <div style={{ fontSize: 11.5, color: C.goldText, fontWeight: 700, marginBottom: 6 }}>⏱ {t({ zh: "工期預估 vs 天氣窗", en: "Job Estimate vs Window" })}</div>
                  <EstRow label={t({ zh: "航線（單程／往返）", en: "Transit (1-way/round)" })} value={`~${transitH}h / ${transitH * 2}h`} muted />
                  <div style={{ height: 1, background: "rgba(214,167,84,.18)", margin: "5px 0" }} />
                  <div style={{ fontSize: 10.5, color: C.mist2, marginBottom: 3 }}>{t({ zh: "上塔作業（耗天氣窗 · 時段）", en: "On-site (spends window · slots)" })}</div>
                  <EstRow label={t({ zh: "登船", en: "Boarding" })} value={estBoard === 0 ? t({ zh: "0（海象平穩）", en: "0 (calm)" }) : `−${estBoard}`} />
                  <EstRow label={t({ zh: "檢查／診斷", en: "Inspection" })} value={`−${estInspect}`} hint={t({ zh: "答錯每次 −3", en: "−3 per wrong" })} />
                  <EstRow label={t({ zh: "維修 SOP", en: "Repair SOP" })} value={`−${estRepair}`} />
                  <div style={{ height: 1, background: "rgba(214,167,84,.18)", margin: "5px 0" }} />
                  <EstRow label={t({ zh: "作業小計", en: "Work subtotal" })} value={`${estOnsite} ${t({ zh: "時段", en: "slots" })}`} bold />
                  <EstRow label={t({ zh: "天氣窗允許", en: "Window allows" })} value={`${winMax} ${t({ zh: "時段", en: "slots" })}`} bold />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5, padding: "5px 7px", borderRadius: 4, background: reserve >= 3 ? "rgba(127,206,142,.14)" : reserve >= 1 ? "rgba(227,173,66,.14)" : "rgba(220,100,80,.16)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: resCol }}>{t({ zh: "保留餘裕", en: "Reserve" })}</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: resCol }}>{reserve >= 0 ? `+${reserve}` : reserve} · {reserve >= 3 ? t({ zh: "充足", en: "Ample" }) : reserve >= 1 ? t({ zh: "偏緊", en: "Tight" }) : t({ zh: "不足，恐中途撤離", en: "Short — may abort" })}</span>
                  </div>
                </div>
              )}
              <button
                ref={departRef}
                disabled={!ready}
                onClick={depart}
                style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: ready ? primaryBg(accent) : "rgba(255,255,255,.08)", color: ready ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, letterSpacing: ".08em", cursor: ready ? "pointer" : "not-allowed" }}
              >
                {t({ zh: "出 航", en: "DEPART" })}
              </button>
              {!ready && <div style={{ fontSize: 11, color: C.mist, marginTop: 6, textAlign: "center" }}>{t({ zh: "備齊上列項目才能出航", en: "All items required to depart" })}</div>}
            </>
          ) : data.jobPhase === "enroute" ? (
            <div style={{ padding: "8px 0" }}>
              <div style={{ fontSize: 13, color: C.cream, marginBottom: 8 }}>{t({ zh: "前往", en: "To" })} {quest.unit}　ETA ~{Math.max(0, Math.round((100 - progress) / 25))}h</div>
              <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: primaryBg(accent), transition: "width .08s linear" }} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: C.green, marginBottom: 10 }}>✔ {t({ zh: "已抵達並完成登塔，可開始維修。", en: "Arrived & boarded — ready to repair." })}</div>
              <button ref={startRepairRef} onClick={() => { Sfx.click(); setScreen("repair"); }} style={{ width: "100%", padding: "12px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(accent), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, cursor: "pointer" }}>
                {t({ zh: "登塔開始維修", en: "Start Repair" })}
              </button>
            </>
          )}
        </div>
      </div>

      {!mobile && active && data.jobPhase === "office" && (
        <AdvisorPopup id="veteran_sailor" src={exprUrl("veteran_sailor", "talking")} line={{ zh: "出海前再確認一次：船、人、料、天氣，缺一不可。", en: "Before sailing, double-check: vessel, crew, parts, weather — all of them." }} style={{ left: 600, bottom: 12 } as CSSProperties} portraitH={260} bubbleSide="right" />
      )}
    </div>
  );
}
