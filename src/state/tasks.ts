import type { I18n } from "../game/systems/types";
import { getImportedTasks } from "./scenarioPack";

// ───────── 自由營運層：無限任務模板引擎（沙盒，衝排行績效分）─────────
// 七大類，多為「判斷型」任務（教決策，不只診斷）。少量模板 × 隨機機組/參數 → 上百種狀況。
// 效果：a=可用率Δ b=預算Δ(◎) s=安全事件Δ g=發電量Δ(MWh)
export interface TaskEffect {
  a?: number;
  b?: number;
  s?: number;
  g?: number;
}
export interface TaskChoice {
  label: I18n;
  feedback: I18n; // 教學回饋（為什麼）
  good: boolean; // 是否為較佳決策（UI 標示）
  eff: TaskEffect;
}
export type TaskCat = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type ChartKind = "trend" | "spectrum" | "radar" | "bars";
export interface TaskTemplate {
  id: string;
  cat: TaskCat;
  title: I18n;
  scenario: I18n;
  xp: number;
  choices: TaskChoice[];
  chart?: ChartKind; // 判斷型任務的輔助圖（#4）：趨勢/頻譜/天氣雷達/長條
}

export const CAT_LABEL: Record<TaskCat, I18n> = {
  A: { zh: "故障搶修", en: "Corrective" },
  B: { zh: "監控判讀", en: "Predictive" },
  C: { zh: "預防保養", en: "Preventive" },
  D: { zh: "營運決策", en: "Operational" },
  E: { zh: "天候處置", en: "Weather" },
  F: { zh: "供應鏈/人力", en: "Logistics" },
  G: { zh: "突發事件", en: "Incident" },
};

export const TASKS: TaskTemplate[] = [
  // ── A 故障搶修 ──
  {
    id: "a_overtemp_trip", cat: "A", xp: 60,
    title: { zh: "高溫跳機", en: "Over-temp trip" },
    scenario: { zh: "機艙溫度過高觸發保護跳機，機組停轉。", en: "Nacelle over-temperature tripped the unit offline." },
    choices: [
      { label: { zh: "派員登塔檢查冷卻、復歸", en: "Send crew to check cooling & reset" }, good: true, feedback: { zh: "✓ 正解：找出過熱根因再復歸，避免反覆跳機。", en: "✓ Find the root cause before reset to avoid repeat trips." }, eff: { a: 6, b: -300000 } },
      { label: { zh: "遠端強制復歸、繼續運轉", en: "Remote force-reset and keep running" }, good: false, feedback: { zh: "✗ 未排除根因強制復歸，恐再跳機甚至損壞。", en: "✗ Forcing reset without fixing the cause risks damage." }, eff: { a: -4, s: 1 } },
      { label: { zh: "等溫度自然下降再說", en: "Wait for it to cool down" }, good: false, feedback: { zh: "△ 拖延使停機損失擴大。", en: "△ Delay increases downtime losses." }, eff: { a: -2, g: -120 } },
    ],
  },
  {
    id: "a_blade_lightning", cat: "A", xp: 70,
    title: { zh: "葉片雷擊損傷", en: "Blade lightning damage" },
    scenario: { zh: "雷擊後葉片接閃系統告警、表面疑似受損。", en: "Post-lightning alarm; blade surface possibly damaged." },
    choices: [
      { label: { zh: "停機、繩索作業檢修接閃導線", en: "Stop & rope-access inspect the receptor" }, good: true, feedback: { zh: "✓ 接閃系統失效會擴大損傷，應優先檢修。", en: "✓ A failed receptor worsens damage — inspect first." }, eff: { a: 5, b: -500000 } },
      { label: { zh: "降載續轉、列入下次定檢", en: "Derate and defer to next service" }, good: false, feedback: { zh: "△ 視損傷程度，可能使裂紋擴展。", en: "△ Cracks may propagate depending on severity." }, eff: { a: -3, s: 1 } },
    ],
  },
  // ── B 監控判讀 / 預兆 ──
  {
    id: "b_gearbox_trend", cat: "B", xp: 80, chart: "trend",
    title: { zh: "齒輪箱溫度緩升", en: "Gearbox temp creeping up" },
    scenario: { zh: "SCADA 顯示齒輪箱油溫近兩週呈緩升趨勢，尚未告警。", en: "SCADA shows gearbox oil temp slowly rising over 2 weeks, no alarm yet." },
    choices: [
      { label: { zh: "提前安排換油與濾芯檢查", en: "Schedule oil change & filter check early" }, good: true, feedback: { zh: "✓ 預知保養：趨勢即介入，避免演變成停機。", en: "✓ Predictive: act on the trend before it becomes downtime." }, eff: { a: 3, b: -200000 } },
      { label: { zh: "持續監控、設更嚴告警門檻", en: "Keep monitoring with tighter alarm" }, good: true, feedback: { zh: "✓ 可接受：成本低，但需確實追蹤。", en: "✓ Acceptable: low cost, but must track diligently." }, eff: { a: 1 } },
      { label: { zh: "忽略，還沒告警", en: "Ignore — no alarm yet" }, good: false, feedback: { zh: "✗ 錯失預兆，後續恐釀大修。", en: "✗ Missing the precursor can lead to a major overhaul." }, eff: { a: -5, s: 1 } },
    ],
  },
  {
    id: "b_vib_bpfi", cat: "B", xp: 80, chart: "spectrum",
    title: { zh: "振動頻譜異常", en: "Vibration spectrum drift" },
    scenario: { zh: "發電機振動 FFT 在 BPFI 頻率出現微幅突起。", en: "Generator FFT shows a small rise at BPFI frequency." },
    choices: [
      { label: { zh: "安排軸承內視鏡檢查", en: "Schedule bearing borescope" }, good: true, feedback: { zh: "✓ BPFI＝軸承內環特徵，宜及早確認。", en: "✓ BPFI maps to inner-race — confirm early." }, eff: { a: 2, b: -150000 } },
      { label: { zh: "當雜訊忽略", en: "Dismiss as noise" }, good: false, feedback: { zh: "✗ 早期軸承故障常被當雜訊而錯過。", en: "✗ Early bearing faults are often dismissed as noise." }, eff: { a: -4, s: 1 } },
    ],
  },
  // ── C 預防保養 ──
  {
    id: "c_annual_service", cat: "C", xp: 60,
    title: { zh: "年度定檢到期", en: "Annual service due" },
    scenario: { zh: "多台機組年度定檢到期，需排程停機保養。", en: "Annual service is due on several units — schedule downtime." },
    choices: [
      { label: { zh: "依排程停機定檢", en: "Take scheduled downtime for service" }, good: true, feedback: { zh: "✓ 預防保養維持長期可用率與保固。", en: "✓ Preventive service sustains availability & warranty." }, eff: { a: 4, b: -400000, g: -120 } },
      { label: { zh: "延後定檢、先保發電", en: "Defer service to keep generating" }, good: false, feedback: { zh: "✗ 跳過定檢可能失保固、增故障率。", en: "✗ Skipping service risks warranty & raises failure rate." }, eff: { a: -3, s: 1 } },
    ],
  },
  {
    id: "c_bolt_torque", cat: "C", xp: 50,
    title: { zh: "螺栓扭力複檢", en: "Bolt torque re-check" },
    scenario: { zh: "塔筒/基礎連接螺栓到了扭力複檢週期。", en: "Tower/foundation bolts are due for torque re-check." },
    choices: [
      { label: { zh: "安排登塔扭力複檢", en: "Schedule torque re-check" }, good: true, feedback: { zh: "✓ 鬆動螺栓是結構風險，按期複檢。", en: "✓ Loose bolts are a structural risk — check on schedule." }, eff: { a: 2, b: -120000 } },
      { label: { zh: "目視正常就跳過", en: "Skip — looks fine" }, good: false, feedback: { zh: "✗ 預緊力衰減肉眼看不出。", en: "✗ Preload loss isn't visible to the eye." }, eff: { s: 1 } },
    ],
  },
  // ── D 營運決策 ──
  {
    id: "d_low_avail", cat: "D", xp: 90,
    title: { zh: "全場可用率偏低", en: "Fleet availability low" },
    scenario: { zh: "全場可用率掉到約 72%，多台帶病運轉。", en: "Fleet availability is ~72% with several units running degraded." },
    choices: [
      { label: { zh: "安排集中大修（高成本、大幅回升）", en: "Major overhaul (costly, big recovery)" }, good: true, feedback: { zh: "✓ 根治：一次拉回可用率，長期最划算。", en: "✓ Root-fix: restores availability; best long-term." }, eff: { a: 12, b: -1500000, g: -240 } },
      { label: { zh: "限載運轉、逐步檢修", en: "Derate & repair gradually" }, good: true, feedback: { zh: "✓ 折衷：成本低、回升慢，現金吃緊時可行。", en: "✓ Trade-off: cheaper, slower — fine when cash is tight." }, eff: { a: 5, b: -400000 } },
      { label: { zh: "維持現狀、先衝發電", en: "Keep as-is, chase output" }, good: false, feedback: { zh: "✗ 帶病運轉故障率升、恐連鎖停機。", en: "✗ Running degraded raises failure & cascade risk." }, eff: { a: -6, s: 1 } },
    ],
  },
  {
    id: "d_grid_curtail", cat: "D", xp: 70,
    title: { zh: "電網要求降載", en: "Grid curtailment order" },
    scenario: { zh: "電網調度要求風場降載，避免饋線過載。", en: "Grid operator orders curtailment to avoid feeder overload." },
    choices: [
      { label: { zh: "配合降載、回報可調度容量", en: "Comply & report dispatchable capacity" }, good: true, feedback: { zh: "✓ 併網規範優先，維持併網資格。", en: "✓ Grid compliance keeps your connection rights." }, eff: { g: -120, b: 100000 } },
      { label: { zh: "無視指令維持滿載", en: "Ignore and stay at full output" }, good: false, feedback: { zh: "✗ 違反併網規範恐受罰、跳脫。", en: "✗ Violating grid code risks penalties & trips." }, eff: { b: -800000, s: 1 } },
    ],
  },
  // ── E 天候處置 ──
  {
    id: "e_typhoon", cat: "E", xp: 100, chart: "radar",
    title: { zh: "颱風警報", en: "Typhoon warning" },
    scenario: { zh: "強烈颱風逼近，預估陣風遠超切出風速。", en: "A strong typhoon approaches; gusts will far exceed cut-out." },
    choices: [
      { label: { zh: "提前順槳停機、鎖定偏航", en: "Feather, shut down & lock yaw early" }, good: true, feedback: { zh: "✓ 安全第一：超切出風速應停機保護機組。", en: "✓ Safety first: shut down above cut-out to protect units." }, eff: { a: 2, g: -240 } },
      { label: { zh: "限轉降載、邊觀察", en: "Derate & watch" }, good: false, feedback: { zh: "△ 風速突增來不及反應，風險高。", en: "△ Gust spikes may outpace reaction — risky." }, eff: { a: -4, s: 1 } },
      { label: { zh: "維持滿載搶發電", en: "Stay at full output for revenue" }, good: false, feedback: { zh: "✗ 超速/結構受損風險極高，得不償失。", en: "✗ Overspeed/structural damage risk far outweighs revenue." }, eff: { a: -10, s: 2, b: -1000000 } },
    ],
  },
  {
    id: "e_thunderstorm", cat: "E", xp: 60, chart: "radar",
    title: { zh: "雷雨來襲", en: "Thunderstorm" },
    scenario: { zh: "雷雨胞接近，現場有登塔作業進行中。", en: "A thunderstorm cell nears while crews are aloft." },
    choices: [
      { label: { zh: "立即停止登塔、人員撤離", en: "Stop aloft work & evacuate crew" }, good: true, feedback: { zh: "✓ 雷雨期間嚴禁高處作業。", en: "✓ No work at height during lightning risk." }, eff: { a: -1 } },
      { label: { zh: "趕工完成再撤", en: "Rush to finish first" }, good: false, feedback: { zh: "✗ 拿人命賭進度，安全大忌。", en: "✗ Gambling lives for schedule — a cardinal safety sin." }, eff: { s: 2 } },
    ],
  },
  // ── F 供應鏈 / 人力 ──
  {
    id: "f_part_lead", cat: "F", xp: 70,
    title: { zh: "關鍵備品交期延長", en: "Critical part lead-time spike" },
    scenario: { zh: "變流器模組原廠交期從 2 週拉長到 8 週。", en: "Converter module lead-time jumps from 2 to 8 weeks." },
    choices: [
      { label: { zh: "空運加價、縮短交期", en: "Air-freight at premium" }, good: true, feedback: { zh: "✓ 關鍵件停機成本高，加價換工期常划算。", en: "✓ For critical parts, paying to cut downtime often pays off." }, eff: { a: 4, b: -600000 } },
      { label: { zh: "改用合格替代件", en: "Use a qualified alternative" }, good: true, feedback: { zh: "✓ 有合格替代件時的務實選擇。", en: "✓ Pragmatic when a qualified alternative exists." }, eff: { a: 2, b: -200000 } },
      { label: { zh: "乾等原廠交貨", en: "Just wait for the OEM" }, good: false, feedback: { zh: "✗ 長交期＝長停機，發電大量流失。", en: "✗ Long lead-time = long downtime & lost generation." }, eff: { a: -5, g: -240 } },
    ],
  },
  {
    id: "f_cert_expired", cat: "F", xp: 60,
    title: { zh: "技師證照到期", en: "Technician cert expired" },
    scenario: { zh: "排定出勤的技師 GWO 證照剛好過期。", en: "A scheduled technician's GWO cert just expired." },
    choices: [
      { label: { zh: "安排補訓、改派合格人員", en: "Arrange refresher / send certified crew" }, good: true, feedback: { zh: "✓ 合規與保險要求，無證不得上工。", en: "✓ Compliance & insurance: no work without valid certs." }, eff: { b: -150000 } },
      { label: { zh: "讓他帶證上工就好", en: "Let them work anyway" }, good: false, feedback: { zh: "✗ 違規上工，出事保險不理賠。", en: "✗ Non-compliant work voids insurance if anything happens." }, eff: { s: 2 } },
    ],
  },
  // ── G 突發 ──
  {
    id: "g_comms_loss", cat: "G", xp: 70,
    title: { zh: "通訊中斷", en: "Comms loss" },
    scenario: { zh: "數台機組 SCADA 通訊中斷，狀態未知。", en: "SCADA comms lost on several units; status unknown." },
    choices: [
      { label: { zh: "派船現場確認、檢查光纖", en: "Send vessel to check fibre on site" }, good: true, feedback: { zh: "✓ 狀態未知時，現場確認最穩妥。", en: "✓ When blind, on-site verification is safest." }, eff: { a: 3, b: -250000 } },
      { label: { zh: "遠端重連、暫不派員", en: "Try remote reconnect only" }, good: true, feedback: { zh: "✓ 可先試，但持續失聯仍需派船。", en: "✓ Worth trying, but persistent loss needs a vessel." }, eff: { a: 1 } },
      { label: { zh: "當作沒事繼續", en: "Assume all is fine" }, good: false, feedback: { zh: "✗ 失聯期間故障無法察覺。", en: "✗ Faults go unnoticed while blind." }, eff: { a: -3, s: 1 } },
    ],
  },
  {
    id: "g_cable_alarm", cat: "G", xp: 80,
    title: { zh: "海纜故障警報", en: "Subsea cable alarm" },
    scenario: { zh: "陣列海纜絕緣監測告警，疑似受損。", en: "Array cable insulation monitor alarms — possible damage." },
    choices: [
      { label: { zh: "隔離該段、安排海纜檢測", en: "Isolate section & schedule cable survey" }, good: true, feedback: { zh: "✓ 海纜故障擴大代價極高，先隔離。", en: "✓ Cable faults escalate expensively — isolate first." }, eff: { a: 2, b: -700000, g: -120 } },
      { label: { zh: "維持送電觀察", en: "Keep energised and watch" }, good: false, feedback: { zh: "✗ 絕緣劣化恐釀短路、全列停電。", en: "✗ Insulation breakdown can short the whole array." }, eff: { a: -6, s: 1 } },
    ],
  },

  // ── A 故障搶修（擴充） ──
  { id: "a_yaw_stuck", cat: "A", xp: 60, title: { zh: "偏航卡死", en: "Yaw jammed" }, scenario: { zh: "偏航系統卡死，機組無法迎風、功率下降。", en: "Yaw jammed; the unit can't track wind and power drops." }, choices: [
    { label: { zh: "登塔釋放偏航煞車、潤滑齒盤", en: "Release yaw brake & lube ring gear" }, good: true, feedback: { zh: "✓ 多為煞車未釋放或齒盤卡滯。", en: "✓ Usually an unreleased brake or jammed ring gear." }, eff: { a: 5, b: -200000 } },
    { label: { zh: "強制偏航馬達硬轉", en: "Force the yaw motors" }, good: false, feedback: { zh: "✗ 硬轉恐燒馬達、損齒盤。", en: "✗ Forcing it can burn motors and damage the gear." }, eff: { a: -4, s: 1 } } ] },
  { id: "a_pitch_runaway", cat: "A", xp: 80, title: { zh: "變槳失控", en: "Pitch runaway" }, scenario: { zh: "單支葉片變槳角異常、轉速攀升。", en: "One blade's pitch is off and rotor speed is climbing." }, choices: [
    { label: { zh: "啟動緊急順槳、安全停機", en: "Emergency feather & safe stop" }, good: true, feedback: { zh: "✓ 超速風險，安全停機優先。", en: "✓ Overspeed risk — safe stop first." }, eff: { a: 3 } },
    { label: { zh: "維持併網等遠端排除", en: "Stay on-grid, fix remotely" }, good: false, feedback: { zh: "✗ 超速可能飛車解體。", en: "✗ Overspeed can destroy the rotor." }, eff: { a: -8, s: 2 } } ] },
  { id: "a_transformer_oil", cat: "A", xp: 70, title: { zh: "機艙變壓器漏油", en: "Nacelle transformer oil leak" }, scenario: { zh: "機艙變壓器偵測到漏油與溫升。", en: "Nacelle transformer shows an oil leak and temperature rise." }, choices: [
    { label: { zh: "停機隔離、止漏並補油", en: "Stop, isolate, seal & top up" }, good: true, feedback: { zh: "✓ 漏油＝失冷與火災風險，須停機處理。", en: "✓ Oil loss = cooling failure & fire risk — stop and fix." }, eff: { a: 4, b: -350000 } },
    { label: { zh: "降載續轉", en: "Derate and keep running" }, good: false, feedback: { zh: "✗ 溫升失控恐釀火災。", en: "✗ Runaway heat risks a fire." }, eff: { a: -5, s: 2 } } ] },
  { id: "a_brake_fault", cat: "A", xp: 60, title: { zh: "機械煞車異常", en: "Mechanical brake fault" }, scenario: { zh: "高速軸煞車壓力不足告警。", en: "Low brake pressure alarm on the high-speed shaft." }, choices: [
    { label: { zh: "停機檢修液壓與來令片", en: "Stop & service hydraulics/pads" }, good: true, feedback: { zh: "✓ 煞車是最後安全防線，必修。", en: "✓ The brake is the last safety line — must fix." }, eff: { a: 4, b: -180000 } },
    { label: { zh: "靠氣動煞車先頂著", en: "Rely on aero-braking for now" }, good: false, feedback: { zh: "✗ 失去機械煞車冗餘，風險高。", en: "✗ Losing brake redundancy is risky." }, eff: { s: 1, a: -2 } } ] },

  // ── B 監控判讀（擴充） ──
  { id: "b_power_curve", cat: "B", xp: 80, chart: "trend", title: { zh: "功率曲線偏移", en: "Power curve drift" }, scenario: { zh: "某機組實測功率曲線持續低於理論值。", en: "A unit's measured power curve sits below the reference." }, choices: [
    { label: { zh: "檢查葉片污染/結冰與槳距校正", en: "Check blade soiling/icing & pitch calibration" }, good: true, feedback: { zh: "✓ 功率虧損常源於葉片狀態或槳距偏差。", en: "✓ Power loss often comes from blade state or pitch offset." }, eff: { a: 3, b: -150000 } },
    { label: { zh: "視為風況差異不處理", en: "Blame wind conditions, do nothing" }, good: false, feedback: { zh: "✗ 持續偏移代表機組問題，非風況。", en: "✗ Persistent drift is the machine, not the wind." }, eff: { a: -3 } } ] },
  { id: "b_temp_rise_gen", cat: "B", xp: 70, chart: "trend", title: { zh: "發電機軸承溫升", en: "Generator bearing temp rising" }, scenario: { zh: "發電機軸承溫度趨勢緩升，潤滑可能不足。", en: "Generator bearing temperature is trending up; lubrication may be low." }, choices: [
    { label: { zh: "安排補脂與測溫複查", en: "Re-grease & re-check temps" }, good: true, feedback: { zh: "✓ 早期補脂可避免軸承燒毀。", en: "✓ Early greasing prevents bearing burnout." }, eff: { a: 3, b: -120000 } },
    { label: { zh: "等到告警再說", en: "Wait for an alarm" }, good: false, feedback: { zh: "✗ 等告警常已造成損傷。", en: "✗ By alarm time, damage is often done." }, eff: { a: -4, s: 1 } } ] },
  { id: "b_oil_particle", cat: "B", xp: 80, chart: "bars", title: { zh: "油液金屬顆粒上升", en: "Oil debris count rising" }, scenario: { zh: "齒輪箱油液檢測金屬顆粒數明顯增加。", en: "Gearbox oil analysis shows rising metal particle counts." }, choices: [
    { label: { zh: "內視鏡檢查齒面與軸承", en: "Borescope gears & bearings" }, good: true, feedback: { zh: "✓ 金屬屑增加＝磨損惡化的早期指標。", en: "✓ More debris = early sign of worsening wear." }, eff: { a: 2, b: -200000 } },
    { label: { zh: "只換油不檢查", en: "Just change oil, skip inspection" }, good: false, feedback: { zh: "△ 換油治標，未找出磨損源。", en: "△ Oil change treats symptoms, not the source." }, eff: { a: -2 } } ] },
  { id: "b_scada_anomaly", cat: "B", xp: 70, chart: "trend", title: { zh: "AI 異常偵測示警", en: "AI anomaly flag" }, scenario: { zh: "資料模型對某機組變流器標記異常型態。", en: "The data model flags an anomalous pattern on a converter." }, choices: [
    { label: { zh: "派員實地驗證模型判斷", en: "Verify the model's flag on site" }, good: true, feedback: { zh: "✓ 模型示警需現場確認，避免誤/漏報。", en: "✓ Verify model flags on site to handle false/missed alarms." }, eff: { a: 2, b: -150000 } },
    { label: { zh: "完全相信模型自動停機", en: "Trust model, auto-stop blindly" }, good: false, feedback: { zh: "△ 全信模型可能因誤報而誤停。", en: "△ Blind trust can cause false-alarm shutdowns." }, eff: { g: -120 } } ] },

  // ── C 預防保養（擴充） ──
  { id: "c_blade_clean", cat: "C", xp: 50, title: { zh: "葉片清潔巡檢", en: "Blade cleaning & inspection" }, scenario: { zh: "葉片前緣積污與鹽霧影響氣動效率。", en: "Leading-edge soiling & salt reduce aerodynamic efficiency." }, choices: [
    { label: { zh: "安排繩索清潔與前緣保護", en: "Rope-access clean & LEP" }, good: true, feedback: { zh: "✓ 前緣保護延壽、回復功率。", en: "✓ Leading-edge protection restores power & extends life." }, eff: { a: 2, b: -150000 } },
    { label: { zh: "不影響運轉、略過", en: "Skip — still running" }, good: false, feedback: { zh: "△ 長期累積侵蝕、功率持續流失。", en: "△ Erosion accumulates; power keeps leaking." }, eff: { a: -2 } } ] },
  { id: "c_filter_change", cat: "C", xp: 40, title: { zh: "濾芯更換週期", en: "Filter change due" }, scenario: { zh: "液壓/潤滑濾芯壓差升高、到期。", en: "Hydraulic/lube filters show high ΔP and are due." }, choices: [
    { label: { zh: "依期更換濾芯", en: "Replace filters on schedule" }, good: true, feedback: { zh: "✓ 濾芯堵塞會傷泵與軸承。", en: "✓ Clogged filters harm pumps & bearings." }, eff: { a: 2, b: -60000 } },
    { label: { zh: "延長使用省成本", en: "Stretch service life" }, good: false, feedback: { zh: "✗ 省小錢、賠大修。", en: "✗ Pennywise, pound-foolish." }, eff: { s: 1 } } ] },
  { id: "c_grease_auto", cat: "C", xp: 40, title: { zh: "自動潤滑系統檢查", en: "Auto-lube check" }, scenario: { zh: "自動潤滑系統油量偏低告警。", en: "Auto-lubrication system reports low grease." }, choices: [
    { label: { zh: "補充潤滑脂、檢查管路", en: "Refill grease & check lines" }, good: true, feedback: { zh: "✓ 潤滑斷供將快速磨損軸承。", en: "✓ Loss of lube rapidly wears bearings." }, eff: { a: 2, b: -50000 } },
    { label: { zh: "下次定檢再補", en: "Top up at next service" }, good: false, feedback: { zh: "△ 期間軸承乾摩擦風險。", en: "△ Risk of dry-running bearings meanwhile." }, eff: { a: -2 } } ] },
  { id: "c_corrosion", cat: "C", xp: 60, title: { zh: "基礎防蝕巡檢", en: "Foundation corrosion check" }, scenario: { zh: "過渡段與基礎陰極防蝕系統需巡檢。", en: "Transition piece & cathodic protection need inspection." }, choices: [
    { label: { zh: "檢查犧牲陽極與塗層", en: "Inspect anodes & coatings" }, good: true, feedback: { zh: "✓ 防蝕失效危及結構壽命。", en: "✓ Corrosion control failure threatens structural life." }, eff: { a: 2, b: -200000 } },
    { label: { zh: "水下看不到、略過", en: "Skip — it's underwater" }, good: false, feedback: { zh: "✗ 看不到不代表沒問題。", en: "✗ Out of sight isn't out of risk." }, eff: { s: 1 } } ] },

  // ── D 營運決策（擴充） ──
  { id: "d_life_extension", cat: "D", xp: 90, title: { zh: "機組延役評估", en: "Life-extension call" }, scenario: { zh: "一批機組屆滿設計年限，需決定延役或汰換。", en: "A batch nears end of design life — extend or replace?" }, choices: [
    { label: { zh: "結構評估後有條件延役", en: "Conditional extension after assessment" }, good: true, feedback: { zh: "✓ 以檢測數據支撐延役最務實。", en: "✓ Data-backed extension is the pragmatic call." }, eff: { a: 3, b: -300000 } },
    { label: { zh: "立即全部汰換", en: "Replace all immediately" }, good: false, feedback: { zh: "△ 資本支出龐大，未必划算。", en: "△ Huge capex; not always worth it." }, eff: { b: -3000000, a: 6 } } ] },
  { id: "d_spares_policy", cat: "D", xp: 70, title: { zh: "關鍵備品庫存策略", en: "Critical spares policy" }, scenario: { zh: "關鍵大件備品庫存為零，交期又長。", en: "Zero stock of critical big-ticket spares with long lead-times." }, choices: [
    { label: { zh: "建立關鍵備品安全庫存", en: "Hold safety stock of critical spares" }, good: true, feedback: { zh: "✓ 關鍵件備庫存可大幅降停機。", en: "✓ Safety stock on critical parts slashes downtime." }, eff: { a: 4, b: -800000 } },
    { label: { zh: "全部即時叫貨省倉儲", en: "Pure just-in-time to save storage" }, good: false, feedback: { zh: "✗ 大件交期長，JIT 風險高。", en: "✗ JIT is risky for long-lead big parts." }, eff: { a: -3 } } ] },
  { id: "d_derate_heat", cat: "D", xp: 70, title: { zh: "高溫日降載", en: "Hot-day derating" }, scenario: { zh: "連日高溫使多台機組逼近溫度上限。", en: "A heatwave pushes many units near temperature limits." }, choices: [
    { label: { zh: "主動降載、保護電力電子", en: "Proactively derate to protect electronics" }, good: true, feedback: { zh: "✓ 小幅降載換取避免跳機與壽命損失。", en: "✓ Slight derate avoids trips & component aging." }, eff: { g: -120, a: 2 } },
    { label: { zh: "維持滿載拚發電", en: "Stay at full output" }, good: false, feedback: { zh: "✗ 過熱跳機反而損失更多。", en: "✗ Overheat trips lose even more." }, eff: { a: -4, s: 1 } } ] },
  { id: "d_contract_kpi", cat: "D", xp: 60, title: { zh: "可用率合約門檻", en: "Availability contract threshold" }, scenario: { zh: "本季可用率逼近合約罰款門檻。", en: "Quarterly availability nears the contractual penalty line." }, choices: [
    { label: { zh: "集中資源搶修拉高可用率", en: "Concentrate repairs to lift availability" }, good: true, feedback: { zh: "✓ 守住合約門檻避免罰款。", en: "✓ Hold the threshold to avoid penalties." }, eff: { a: 5, b: -400000 } },
    { label: { zh: "接受罰款不調整", en: "Accept the penalty" }, good: false, feedback: { zh: "✗ 罰款與商譽雙輸。", en: "✗ Penalty plus reputation loss." }, eff: { b: -1000000 } } ] },

  // ── E 天候處置（擴充） ──
  { id: "e_cold_icing", cat: "E", xp: 70, chart: "radar", title: { zh: "寒潮結冰", en: "Cold-snap icing" }, scenario: { zh: "寒潮來襲，葉片結冰風險升高。", en: "A cold snap raises blade-icing risk." }, choices: [
    { label: { zh: "啟動防冰、必要時停機", en: "Run de-icing; stop if needed" }, good: true, feedback: { zh: "✓ 結冰致功率虧損且有甩冰風險。", en: "✓ Icing cuts power and risks ice throw." }, eff: { a: 2, g: -60 } },
    { label: { zh: "照常運轉", en: "Operate as usual" }, good: false, feedback: { zh: "✗ 甩冰危及人船、不平衡傷軸承。", en: "✗ Ice throw endangers crews; imbalance harms bearings." }, eff: { a: -3, s: 1 } } ] },
  { id: "e_fog", cat: "E", xp: 50, chart: "radar", title: { zh: "濃霧能見度低", en: "Dense fog" }, scenario: { zh: "濃霧使能見度過低，影響船舶航行安全。", en: "Dense fog drops visibility, risking vessel transit." }, choices: [
    { label: { zh: "延後出勤、等能見度改善", en: "Delay sortie until visibility improves" }, good: true, feedback: { zh: "✓ 低能見度航行碰撞風險高。", en: "✓ Low-visibility transit risks collision." }, eff: {} },
    { label: { zh: "照樣派船", en: "Sail anyway" }, good: false, feedback: { zh: "✗ 賭運氣拿安全冒險。", en: "✗ Gambling safety on luck." }, eff: { s: 1 } } ] },
  { id: "e_high_wave", cat: "E", xp: 60, chart: "radar", title: { zh: "長浪湧浪", en: "Heavy swell" }, scenario: { zh: "湧浪超過登靠限制，無法安全登塔。", en: "Swell exceeds access limits; boarding is unsafe." }, choices: [
    { label: { zh: "改期、等待作業窗", en: "Reschedule for a weather window" }, good: true, feedback: { zh: "✓ 超過登靠限制不可硬上。", en: "✓ Don't force access beyond limits." }, eff: {} },
    { label: { zh: "頂浪硬登", en: "Force the transfer" }, good: false, feedback: { zh: "✗ 人員落海風險極高。", en: "✗ Very high man-overboard risk." }, eff: { s: 2 } } ] },

  // ── F 供應鏈 / 人力（擴充） ──
  { id: "f_vessel_clash", cat: "F", xp: 60, title: { zh: "船班衝突", en: "Vessel scheduling clash" }, scenario: { zh: "兩件急修同時搶同一艘運維船。", en: "Two urgent jobs need the same vessel at once." }, choices: [
    { label: { zh: "依停機損失排優先序", en: "Prioritise by downtime cost" }, good: true, feedback: { zh: "✓ 以損失最大者優先最合理。", en: "✓ Tackle the costliest downtime first." }, eff: { a: 2 } },
    { label: { zh: "先到先做", en: "First come first served" }, good: false, feedback: { zh: "△ 未必使整體損失最小。", en: "△ Doesn't minimise total loss." }, eff: { a: -1 } } ] },
  { id: "f_strike_short", cat: "F", xp: 60, title: { zh: "人力短缺調度", en: "Crew shortfall" }, scenario: { zh: "流感季多名技師請假，人力吃緊。", en: "Flu season — several techs out; crew is short." }, choices: [
    { label: { zh: "外包合格承商支援", en: "Bring in qualified contractors" }, good: true, feedback: { zh: "✓ 維持出勤量能、確保合規。", en: "✓ Keeps capacity up while staying compliant." }, eff: { a: 2, b: -250000 } },
    { label: { zh: "讓現有人員加班硬撐", en: "Push overtime on remaining crew" }, good: false, feedback: { zh: "✗ 疲勞作業＝安全事故溫床。", en: "✗ Fatigue work breeds accidents." }, eff: { s: 1 } } ] },
  { id: "f_fuel_cost", cat: "F", xp: 50, title: { zh: "船用燃油上漲", en: "Marine fuel price spike" }, scenario: { zh: "船用燃油大漲，運維航次成本上升。", en: "Marine fuel spikes; sortie costs rise." }, choices: [
    { label: { zh: "整併航次、優化航線", en: "Bundle sorties & optimise routes" }, good: true, feedback: { zh: "✓ 整併可攤平成本、減少航次。", en: "✓ Bundling spreads cost & cuts trips." }, eff: { b: 100000 } },
    { label: { zh: "照舊頻繁出勤", en: "Keep sortie frequency" }, good: false, feedback: { zh: "△ 成本侵蝕利潤。", en: "△ Costs erode margin." }, eff: { b: -200000 } } ] },

  // ── G 突發（擴充） ──
  { id: "g_man_overboard", cat: "G", xp: 90, title: { zh: "人員落海", en: "Man overboard" }, scenario: { zh: "登塔作業時一名技師落海！", en: "A technician falls into the sea during transfer!" }, choices: [
    { label: { zh: "啟動 MOB 程序、全力搶救", en: "Activate MOB procedure, rescue" }, good: true, feedback: { zh: "✓ 人命至上，立即執行落海搶救。", en: "✓ Life first — execute MOB rescue at once." }, eff: { a: -1 } },
    { label: { zh: "先完成手上作業", en: "Finish the task first" }, good: false, feedback: { zh: "✗ 任何情況人命優先，絕不可拖延。", en: "✗ Life always comes first — never delay." }, eff: { s: 3 } } ] },
  { id: "g_fire_nacelle", cat: "G", xp: 90, title: { zh: "機艙起火", en: "Nacelle fire" }, scenario: { zh: "機艙偵煙器告警、疑似電氣起火。", en: "Nacelle smoke detector alarms — suspected electrical fire." }, choices: [
    { label: { zh: "遠端停機斷電、人員撤離", en: "Remote stop, de-energise, evacuate" }, good: true, feedback: { zh: "✓ 斷電與撤離優先，勿貿然登塔。", en: "✓ De-energise & evacuate first; don't rush aloft." }, eff: { a: -3, b: -400000 } },
    { label: { zh: "立刻派人上塔滅火", en: "Send crew up to fight it" }, good: false, feedback: { zh: "✗ 機艙火場貿然登塔極危險。", en: "✗ Climbing into a nacelle fire is extremely dangerous." }, eff: { s: 3 } } ] },
  { id: "g_vessel_breakdown", cat: "G", xp: 70, title: { zh: "運維船故障", en: "Vessel breakdown" }, scenario: { zh: "運維船主機故障，技師受困機組平台。", en: "The vessel's engine fails; techs are stranded on the platform." }, choices: [
    { label: { zh: "調派備援船接駁", en: "Dispatch a backup vessel" }, good: true, feedback: { zh: "✓ 受困人員須儘速接駁。", en: "✓ Stranded crew need prompt recovery." }, eff: { a: -1, b: -300000 } },
    { label: { zh: "等原船修好", en: "Wait for the vessel to be fixed" }, good: false, feedback: { zh: "✗ 海上受困過久危及人員。", en: "✗ Prolonged stranding endangers crew." }, eff: { s: 2 } } ] },
  { id: "g_bird_strike", cat: "G", xp: 50, title: { zh: "生態監測警示", en: "Eco-monitoring alert" }, scenario: { zh: "鳥類遷徙期雷達偵測大量鳥群接近。", en: "Migration radar detects a large flock approaching." }, choices: [
    { label: { zh: "依生態協議短暫降速/停機", en: "Curtail per eco-protocol briefly" }, good: true, feedback: { zh: "✓ 履行環評承諾、維護社會許可。", en: "✓ Honour the eco-commitment & social licence." }, eff: { g: -60 } },
    { label: { zh: "無視繼續滿載", en: "Ignore, full output" }, good: false, feedback: { zh: "✗ 違反環評恐挨罰、損商譽。", en: "✗ Breaching the eco-permit risks fines & reputation." }, eff: { b: -300000, s: 1 } } ] },

  // ════════ 擴充至 100+（第二批） ════════
  // ── A 故障搶修 ──
  { id: "a_slipring", cat: "A", xp: 60, title: { zh: "集電環打火", en: "Slip-ring arcing" }, scenario: { zh: "發電機集電環打火、碳刷磨耗告警。", en: "Generator slip-ring arcing; brush-wear alarm." }, choices: [
    { label: { zh: "停機更換碳刷、清潔集電環", en: "Stop, replace brushes, clean rings" }, good: true, feedback: { zh: "✓ 打火會燒蝕集電環，及早處理。", en: "✓ Arcing erodes the rings — address early." }, eff: { a: 4, b: -150000 } },
    { label: { zh: "降載續轉", en: "Derate and continue" }, good: false, feedback: { zh: "✗ 持續打火恐燒毀集電環。", en: "✗ Continued arcing can destroy the rings." }, eff: { a: -3, s: 1 } } ] },
  { id: "a_anemometer", cat: "A", xp: 40, title: { zh: "風速計故障", en: "Anemometer fault" }, scenario: { zh: "機艙頂風速計讀值凍結，控制誤判風況。", en: "Nacelle-top anemometer reading is frozen; control misjudges wind." }, choices: [
    { label: { zh: "登機艙頂更換風速計", en: "Replace anemometer on nacelle roof" }, good: true, feedback: { zh: "✓ 風速回授錯誤會誤動作，須更換。", en: "✓ Bad wind feedback misfires control — replace it." }, eff: { a: 3, b: -60000 } },
    { label: { zh: "用相鄰機組風速代用", en: "Borrow a neighbour's wind signal" }, good: false, feedback: { zh: "△ 暫可，但本機控制仍失準。", en: "△ Stopgap, but this unit's control stays off." }, eff: { a: -1 } } ] },
  { id: "a_pitch_motor", cat: "A", xp: 60, title: { zh: "變槳馬達過載", en: "Pitch motor overload" }, scenario: { zh: "單一葉片變槳馬達過載跳脫。", en: "One blade's pitch motor trips on overload." }, choices: [
    { label: { zh: "檢查變槳軸承阻力與馬達", en: "Check pitch-bearing drag & motor" }, good: true, feedback: { zh: "✓ 軸承卡澀常使馬達過載。", en: "✓ A stiff bearing often overloads the motor." }, eff: { a: 4, b: -200000 } },
    { label: { zh: "反覆復歸硬推", en: "Keep resetting and pushing" }, good: false, feedback: { zh: "✗ 反覆過載會燒馬達。", en: "✗ Repeated overload burns the motor." }, eff: { a: -3, s: 1 } } ] },
  { id: "a_hyd_leak", cat: "A", xp: 50, title: { zh: "液壓系統洩漏", en: "Hydraulic leak" }, scenario: { zh: "液壓站壓力下降、油位告警。", en: "Hydraulic pressure drops; low-oil alarm." }, choices: [
    { label: { zh: "停機找漏點、修復補油", en: "Stop, find leak, repair & refill" }, good: true, feedback: { zh: "✓ 液壓失壓影響變槳/煞車安全。", en: "✓ Loss of hydraulics hits pitch/brake safety." }, eff: { a: 4, b: -120000 } },
    { label: { zh: "持續補油撐著", en: "Keep topping up oil" }, good: false, feedback: { zh: "✗ 漏點未修終將失壓。", en: "✗ Unfixed leak will eventually fail." }, eff: { a: -2, s: 1 } } ] },
  { id: "a_cool_pump", cat: "A", xp: 50, title: { zh: "冷卻泵故障", en: "Cooling pump failure" }, scenario: { zh: "變流器冷卻泵停止，溫度快速上升。", en: "Converter coolant pump stops; temperature climbs fast." }, choices: [
    { label: { zh: "立即降載並更換冷卻泵", en: "Derate immediately & swap pump" }, good: true, feedback: { zh: "✓ 失冷會迅速過溫跳脫。", en: "✓ Lost cooling rapidly trips on overtemp." }, eff: { a: 3, b: -150000 } },
    { label: { zh: "維持滿載觀察", en: "Hold full output, watch" }, good: false, feedback: { zh: "✗ 過溫恐損 IGBT。", en: "✗ Overheat can destroy IGBTs." }, eff: { a: -4, s: 1 } } ] },
  { id: "a_main_bearing", cat: "A", xp: 90, title: { zh: "主軸承異音", en: "Main bearing noise" }, scenario: { zh: "主軸承溫升伴隨明顯異音。", en: "Main bearing runs hot with loud noise." }, choices: [
    { label: { zh: "停機檢查、評估大修", en: "Stop, inspect, plan overhaul" }, good: true, feedback: { zh: "✓ 主軸承失效是大修等級，勿硬撐。", en: "✓ Main-bearing failure is a major job — don't push it." }, eff: { a: 3, b: -800000 } },
    { label: { zh: "降載拖到下次定檢", en: "Derate until next service" }, good: false, feedback: { zh: "✗ 主軸承抱死代價極高。", en: "✗ A seized main bearing is extremely costly." }, eff: { a: -6, s: 1 } } ] },
  { id: "a_ups_dead", cat: "A", xp: 50, title: { zh: "後備電源失效", en: "Backup power dead" }, scenario: { zh: "變槳後備電池/UPS 自檢失敗。", en: "Pitch backup battery / UPS fails self-test." }, choices: [
    { label: { zh: "更換電池模組、復測", en: "Replace battery & re-test" }, good: true, feedback: { zh: "✓ 失電時靠它安全順槳，必修。", en: "✓ It feathers safely on power loss — must fix." }, eff: { a: 3, b: -100000 } },
    { label: { zh: "晴天無風先擱置", en: "Defer — calm weather now" }, good: false, feedback: { zh: "✗ 無後備電源＝無法安全停機。", en: "✗ No backup = no safe shutdown." }, eff: { s: 2 } } ] },
  { id: "a_busbar", cat: "A", xp: 70, title: { zh: "匯流排過熱", en: "Busbar hotspot" }, scenario: { zh: "紅外線檢測發現開關櫃匯流排接點過熱。", en: "Thermography finds a hot busbar joint in the switchgear." }, choices: [
    { label: { zh: "停電鎖定、重鎖接點", en: "De-energise, LOTO, re-torque joint" }, good: true, feedback: { zh: "✓ 鬆接點過熱是電氣火災前兆。", en: "✓ A loose hot joint is a fire precursor." }, eff: { a: 3, b: -150000 } },
    { label: { zh: "帶電觀察", en: "Watch it live" }, good: false, feedback: { zh: "✗ 帶電作業與火災雙風險。", en: "✗ Live work plus fire risk." }, eff: { s: 2 } } ] },
  { id: "a_blade_crack", cat: "A", xp: 80, title: { zh: "葉片裂紋", en: "Blade crack found" }, scenario: { zh: "巡檢發現葉片殼體出現裂紋。", en: "Inspection finds a crack in the blade shell." }, choices: [
    { label: { zh: "停機、評估結構修補", en: "Stop & assess structural repair" }, good: true, feedback: { zh: "✓ 裂紋會在載荷下擴展，須停機。", en: "✓ Cracks propagate under load — stop." }, eff: { a: 3, b: -400000 } },
    { label: { zh: "繼續運轉到旺風期後", en: "Run through the windy season" }, good: false, feedback: { zh: "✗ 葉片斷裂風險與飛擊危險。", en: "✗ Risk of blade failure and debris throw." }, eff: { a: -5, s: 2 } } ] },

  // ── B 監控判讀（皆預設趨勢圖） ──
  { id: "b_yaw_trend", cat: "B", xp: 70, title: { zh: "偏航誤差上升", en: "Yaw error rising" }, scenario: { zh: "偏航對風誤差統計值持續上升。", en: "Yaw misalignment statistics keep rising." }, choices: [
    { label: { zh: "校正風向標/光達對風", en: "Calibrate vane/LiDAR alignment" }, good: true, feedback: { zh: "✓ 對風誤差直接吃掉發電量。", en: "✓ Misalignment directly costs generation." }, eff: { a: 2, b: -100000 } },
    { label: { zh: "視為正常波動", en: "Treat as normal scatter" }, good: false, feedback: { zh: "✗ 系統性偏移非隨機波動。", en: "✗ A systematic bias isn't random scatter." }, eff: { a: -2 } } ] },
  { id: "b_tower_shm", cat: "B", xp: 80, title: { zh: "塔筒振動異常", en: "Tower oscillation anomaly" }, scenario: { zh: "結構監測顯示塔筒固有頻率偏移。", en: "SHM shows the tower's natural frequency shifting." }, choices: [
    { label: { zh: "檢查地腳螺栓與基礎", en: "Check foundation bolts & base" }, good: true, feedback: { zh: "✓ 頻率偏移常代表連接鬆動。", en: "✓ A frequency shift often means loosening." }, eff: { a: 2, b: -200000 } },
    { label: { zh: "忽略，塔還站著", en: "Ignore — tower's still standing" }, good: false, feedback: { zh: "✗ 結構問題不會自己好。", en: "✗ Structural issues don't self-heal." }, eff: { s: 1 } } ] },
  { id: "b_pitch_asym", cat: "B", xp: 70, title: { zh: "三葉載荷不平衡", en: "Rotor load imbalance" }, scenario: { zh: "三支葉片載荷/槳距出現不對稱。", en: "Blade loads/pitch show asymmetry across the three blades." }, choices: [
    { label: { zh: "重新校正槳距零點", en: "Re-zero the pitch angles" }, good: true, feedback: { zh: "✓ 不平衡增加疲勞與振動。", en: "✓ Imbalance adds fatigue & vibration." }, eff: { a: 2, b: -120000 } },
    { label: { zh: "不影響出力，略過", en: "Skip — output is fine" }, good: false, feedback: { zh: "✗ 長期不平衡傷軸承與主軸。", en: "✗ Long-term imbalance harms bearings & shaft." }, eff: { a: -2 } } ] },
  { id: "b_dga_gas", cat: "B", xp: 80, chart: "bars", title: { zh: "變壓器溶解氣體上升", en: "Transformer DGA gas rising" }, scenario: { zh: "變壓器油中溶解氣體(DGA)乙炔升高。", en: "Transformer dissolved-gas (DGA) acetylene is rising." }, choices: [
    { label: { zh: "排程停機、油中氣體診斷", en: "Schedule outage & DGA diagnosis" }, good: true, feedback: { zh: "✓ 乙炔升高指向內部放電。", en: "✓ Rising acetylene points to internal arcing." }, eff: { a: 2, b: -300000 } },
    { label: { zh: "繼續送電", en: "Keep energised" }, good: false, feedback: { zh: "✗ 變壓器內部故障恐爆裂。", en: "✗ Internal faults can rupture the transformer." }, eff: { a: -5, s: 2 } } ] },
  { id: "b_conv_temp", cat: "B", xp: 60, title: { zh: "變流器溫升趨勢", en: "Converter temp trend" }, scenario: { zh: "變流器模組溫度逐週升高、冷卻效率下降。", en: "Converter module temperatures creep up weekly." }, choices: [
    { label: { zh: "清洗熱交換器、檢查冷卻液", en: "Clean heat exchanger & check coolant" }, good: true, feedback: { zh: "✓ 散熱衰退是過溫跳脫前兆。", en: "✓ Declining cooling precedes overtemp trips." }, eff: { a: 2, b: -120000 } },
    { label: { zh: "等跳機再修", en: "Wait for a trip" }, good: false, feedback: { zh: "✗ 屆時停機損失更大。", en: "✗ Downtime then costs more." }, eff: { a: -3 } } ] },
  { id: "b_gen_ir", cat: "B", xp: 80, title: { zh: "發電機絕緣下降", en: "Generator insulation drop" }, scenario: { zh: "發電機繞組絕緣電阻(IR)趨勢下降。", en: "Generator winding insulation resistance is declining." }, choices: [
    { label: { zh: "安排乾燥/絕緣檢測", en: "Schedule drying & IR test" }, good: true, feedback: { zh: "✓ 受潮絕緣下降，及早乾燥可救。", en: "✓ Moisture lowers IR; early drying saves it." }, eff: { a: 2, b: -150000 } },
    { label: { zh: "照常運轉", en: "Operate as usual" }, good: false, feedback: { zh: "✗ 絕緣崩潰＝繞組燒毀。", en: "✗ Insulation breakdown burns the winding." }, eff: { a: -4, s: 1 } } ] },
  { id: "b_scour_sonar", cat: "B", xp: 70, chart: "bars", title: { zh: "基礎沖刷加劇", en: "Foundation scour worsening" }, scenario: { zh: "聲納顯示單樁基礎周邊沖刷坑擴大。", en: "Sonar shows the scour pit around the monopile growing." }, choices: [
    { label: { zh: "補拋防沖刷護甲", en: "Place scour protection rock" }, good: true, feedback: { zh: "✓ 沖刷會降低基礎承載與穩定。", en: "✓ Scour undermines foundation stability." }, eff: { a: 2, b: -400000 } },
    { label: { zh: "等下次潛水再看", en: "Wait for next dive survey" }, good: false, feedback: { zh: "✗ 沖刷惡化危及整支基礎。", en: "✗ Worsening scour endangers the whole foundation." }, eff: { s: 1 } } ] },
  { id: "b_curtail_loss", cat: "B", xp: 60, title: { zh: "棄風損失偏高", en: "Curtailment loss high" }, scenario: { zh: "資料顯示某時段棄風(限電)損失異常偏高。", en: "Data shows abnormally high curtailment losses in a period." }, choices: [
    { label: { zh: "與電網協調、調整運轉策略", en: "Coordinate with grid & adjust strategy" }, good: true, feedback: { zh: "✓ 分析棄風成因可挽回發電。", en: "✓ Diagnosing curtailment recovers generation." }, eff: { g: 120 } },
    { label: { zh: "接受損失", en: "Accept the loss" }, good: false, feedback: { zh: "△ 未追因＝持續流失。", en: "△ No root-cause = ongoing loss." }, eff: { g: -60 } } ] },
  { id: "b_ice_signal", cat: "B", xp: 60, title: { zh: "結冰偵測訊號", en: "Icing detection signal" }, scenario: { zh: "功率與振動聯合判讀疑似葉片結冰。", en: "Power + vibration signatures suggest blade icing." }, choices: [
    { label: { zh: "啟動防冰、必要時停機", en: "Activate de-icing; stop if needed" }, good: true, feedback: { zh: "✓ 早判結冰可避免甩冰與失衡。", en: "✓ Early icing calls avoid ice throw & imbalance." }, eff: { a: 2, g: -60 } },
    { label: { zh: "等目視確認", en: "Wait for visual confirmation" }, good: false, feedback: { zh: "✗ 海上難目視，常已甩冰。", en: "✗ Hard to see offshore — ice may already throw." }, eff: { s: 1 } } ] },
  { id: "b_rul_model", cat: "B", xp: 80, title: { zh: "剩餘壽命預測", en: "Remaining-life forecast" }, scenario: { zh: "模型預測某批齒輪箱剩餘壽命將在數月內到底。", en: "A model forecasts a gearbox batch nearing end of life within months." }, choices: [
    { label: { zh: "提前排程預防性更換", en: "Pre-schedule proactive replacement" }, good: true, feedback: { zh: "✓ 計畫性更換遠優於突發停機。", en: "✓ Planned swaps beat sudden failures." }, eff: { a: 3, b: -500000 } },
    { label: { zh: "等真的壞再換", en: "Run to failure" }, good: false, feedback: { zh: "✗ 突發停機＋連帶損壞代價高。", en: "✗ Run-to-failure brings costly collateral damage." }, eff: { a: -5, s: 1 } } ] },

  // ── C 預防保養 ──
  { id: "c_oil_sample", cat: "C", xp: 40, title: { zh: "齒輪油定期取樣", en: "Gear-oil sampling due" }, scenario: { zh: "齒輪箱油液到了定期取樣分析週期。", en: "Gearbox oil is due for scheduled sampling." }, choices: [
    { label: { zh: "取樣送驗、建立趨勢", en: "Sample & trend the results" }, good: true, feedback: { zh: "✓ 油液分析是低成本的早期診斷。", en: "✓ Oil analysis is cheap early diagnostics." }, eff: { a: 2, b: -40000 } },
    { label: { zh: "跳過這次", en: "Skip this round" }, good: false, feedback: { zh: "△ 失去一次趨勢資料點。", en: "△ You lose a trend data point." }, eff: {} } ] },
  { id: "c_fire_test", cat: "C", xp: 50, title: { zh: "滅火系統測試", en: "Fire-suppression test" }, scenario: { zh: "機艙滅火系統到期須功能測試。", en: "Nacelle fire-suppression system is due for a functional test." }, choices: [
    { label: { zh: "依規測試並記錄", en: "Test & log per regulation" }, good: true, feedback: { zh: "✓ 滅火系統失效後果嚴重，必測。", en: "✓ A dead suppression system is catastrophic — test it." }, eff: { a: 1, b: -50000 } },
    { label: { zh: "延後測試", en: "Defer the test" }, good: false, feedback: { zh: "✗ 不合規且失火無保護。", en: "✗ Non-compliant and unprotected in a fire." }, eff: { s: 1 } } ] },
  { id: "c_loler", cat: "C", xp: 50, title: { zh: "吊裝設備檢驗", en: "Lifting-gear inspection" }, scenario: { zh: "機艙吊車與吊索具到期須法定檢驗(LOLER)。", en: "Nacelle crane & slings are due for statutory (LOLER) inspection." }, choices: [
    { label: { zh: "完成法定檢驗與標記", en: "Complete inspection & tagging" }, good: true, feedback: { zh: "✓ 未檢吊具吊重作業極危險。", en: "✓ Uninspected gear is dangerous for lifts." }, eff: { a: 1, b: -60000 } },
    { label: { zh: "先用著、之後補檢", en: "Use now, inspect later" }, good: false, feedback: { zh: "✗ 吊重失效會砸傷人。", en: "✗ A failed lift can kill." }, eff: { s: 2 } } ] },
  { id: "c_rescue_drill", cat: "C", xp: 40, title: { zh: "高處救援演練", en: "Rescue drill due" }, scenario: { zh: "團隊到期須進行塔上高處救援演練。", en: "The team is due for at-height rescue drills." }, choices: [
    { label: { zh: "安排演練、複習程序", en: "Run the drill & refresh procedures" }, good: true, feedback: { zh: "✓ 演練是出事時能救命的本錢。", en: "✓ Drills are what save lives when it counts." }, eff: { b: -40000 } },
    { label: { zh: "忙碌延後", en: "Postpone — too busy" }, good: false, feedback: { zh: "✗ 緊急時程序生疏會出人命。", en: "✗ Rusty procedures cost lives in emergencies." }, eff: { s: 1 } } ] },
  { id: "c_hv_switchgear", cat: "C", xp: 60, title: { zh: "高壓開關櫃保養", en: "HV switchgear maintenance" }, scenario: { zh: "高壓開關櫃到期須保養與保護電驛測試。", en: "HV switchgear is due for maintenance & protection-relay testing." }, choices: [
    { label: { zh: "停電保養、測試保護電驛", en: "De-energise, service, test relays" }, good: true, feedback: { zh: "✓ 保護失靈會擴大事故。", en: "✓ Failed protection escalates faults." }, eff: { a: 2, b: -200000 } },
    { label: { zh: "保持供電省停機", en: "Skip to avoid downtime" }, good: false, feedback: { zh: "✗ 保護未測＝故障無保障。", en: "✗ Untested protection = no fault coverage." }, eff: { s: 1 } } ] },
  { id: "c_anem_cal", cat: "C", xp: 40, title: { zh: "風速計校正", en: "Anemometer calibration" }, scenario: { zh: "機艙風速/風向計到期須校正。", en: "Nacelle wind sensors are due for calibration." }, choices: [
    { label: { zh: "校正風速風向感測", en: "Calibrate wind sensors" }, good: true, feedback: { zh: "✓ 準確風況回授攸關出力與安全停機。", en: "✓ Accurate wind feedback drives output & safe stops." }, eff: { a: 1, b: -40000 } },
    { label: { zh: "看起來還準、略過", en: "Looks fine — skip" }, good: false, feedback: { zh: "△ 漂移看不出，卻吃發電。", en: "△ Drift is invisible yet costs output." }, eff: { a: -1 } } ] },
  { id: "c_lps_test", cat: "C", xp: 50, title: { zh: "防雷系統導通測試", en: "Lightning-protection continuity test" }, scenario: { zh: "葉片接閃與引下導線到期須導通量測。", en: "Blade receptors & down-conductors are due for continuity testing." }, choices: [
    { label: { zh: "量測導通、修復斷點", en: "Measure continuity & fix breaks" }, good: true, feedback: { zh: "✓ 防雷失效雷擊將直接損葉片。", en: "✓ A broken LPS lets lightning destroy the blade." }, eff: { a: 2, b: -80000 } },
    { label: { zh: "雷季前再說", en: "Wait until lightning season" }, good: false, feedback: { zh: "✗ 雷不等人。", en: "✗ Lightning won't wait." }, eff: { s: 1 } } ] },
  { id: "c_retension", cat: "C", xp: 50, title: { zh: "螺栓再鎖緊作業", en: "Bolt re-tension campaign" }, scenario: { zh: "首年運轉後須執行連接螺栓再鎖緊。", en: "Post first-year, connection bolts need a re-tension campaign." }, choices: [
    { label: { zh: "依扭矩規範再鎖緊", en: "Re-tension to torque spec" }, good: true, feedback: { zh: "✓ 初期沉降後再鎖緊是標準工序。", en: "✓ Re-tensioning after bedding-in is standard." }, eff: { a: 2, b: -120000 } },
    { label: { zh: "認為一次鎖好就好", en: "Assume once is enough" }, good: false, feedback: { zh: "✗ 預緊力會隨沉降衰減。", en: "✗ Preload relaxes after settlement." }, eff: { s: 1 } } ] },
  { id: "c_lep_inspect", cat: "C", xp: 50, title: { zh: "葉片前緣侵蝕巡檢", en: "Leading-edge erosion inspection" }, scenario: { zh: "葉片前緣保護層到期須巡檢補強。", en: "Blade leading-edge protection is due for inspection." }, choices: [
    { label: { zh: "巡檢並修補前緣保護", en: "Inspect & repair LEP" }, good: true, feedback: { zh: "✓ 前緣侵蝕逐年吃掉年發電量。", en: "✓ LE erosion quietly eats annual yield." }, eff: { a: 2, b: -100000 } },
    { label: { zh: "外觀還行、略過", en: "Looks ok — skip" }, good: false, feedback: { zh: "△ 侵蝕累積、效率續降。", en: "△ Erosion accumulates; efficiency falls." }, eff: { a: -1 } } ] },

  // ── D 營運決策（皆預設長條圖） ──
  { id: "d_ppa", cat: "D", xp: 80, title: { zh: "售電合約談判", en: "PPA negotiation" }, scenario: { zh: "售電合約(PPA)到期，須決定續約條件。", en: "The power purchase agreement is up for renewal." }, choices: [
    { label: { zh: "以可用率數據爭取較佳費率", en: "Leverage availability data for a better rate" }, good: true, feedback: { zh: "✓ 良好運維績效是談判籌碼。", en: "✓ Strong O&M performance is leverage." }, eff: { b: 800000 } },
    { label: { zh: "草率簽低價長約", en: "Lock a low long-term price hastily" }, good: false, feedback: { zh: "✗ 低估價值、長期吃虧。", en: "✗ Undervalues output for years." }, eff: { b: -500000 } } ] },
  { id: "d_repower", cat: "D", xp: 90, title: { zh: "增容改造評估", en: "Repowering study" }, scenario: { zh: "舊風場考慮換大型機組增容(repower)。", en: "An old farm considers repowering to larger turbines." }, choices: [
    { label: { zh: "做技術經濟評估再決定", en: "Run a techno-economic study first" }, good: true, feedback: { zh: "✓ 增容資本大，需數據支撐。", en: "✓ Repowering is capital-heavy — need data." }, eff: { b: -200000, a: 2 } },
    { label: { zh: "跟風直接全換", en: "Just replace everything" }, good: false, feedback: { zh: "✗ 未評估恐血本無歸。", en: "✗ Unassessed, it can lose a fortune." }, eff: { b: -2000000 } } ] },
  { id: "d_cbm_switch", cat: "D", xp: 70, title: { zh: "維護策略轉型", en: "Maintenance strategy shift" }, scenario: { zh: "考慮從定期保養轉為狀態基礎維護(CBM)。", en: "Consider shifting from time-based to condition-based maintenance." }, choices: [
    { label: { zh: "導入感測+數據做 CBM", en: "Adopt sensors + data for CBM" }, good: true, feedback: { zh: "✓ CBM 可降成本並減非計畫停機。", en: "✓ CBM cuts cost & unplanned downtime." }, eff: { a: 3, b: -300000 } },
    { label: { zh: "維持純定期保養", en: "Stay purely time-based" }, good: false, feedback: { zh: "△ 過度或不足保養兩頭空。", en: "△ Risks over- or under-maintaining." }, eff: { a: -1 } } ] },
  { id: "d_insurance", cat: "D", xp: 60, title: { zh: "保險理賠決策", en: "Insurance claim call" }, scenario: { zh: "一筆大型損壞，理賠自負額高。", en: "A major failure occurs; the deductible is high." }, choices: [
    { label: { zh: "評估自負額後理性申請", en: "Assess deductible, then claim if worth it" }, good: true, feedback: { zh: "✓ 超過自負額才申請較划算。", en: "✓ Claim only when above the deductible." }, eff: { b: 600000 } },
    { label: { zh: "小損也申請", en: "Claim even small losses" }, good: false, feedback: { zh: "✗ 拉高保費、不一定划算。", en: "✗ Raises premiums; not always worth it." }, eff: { b: -200000 } } ] },
  { id: "d_warranty", cat: "D", xp: 60, title: { zh: "保固求償 vs 自修", en: "Warranty claim vs self-repair" }, scenario: { zh: "故障落在保固範圍，但原廠處理較慢。", en: "A fault is under warranty, but the OEM is slow." }, choices: [
    { label: { zh: "走保固求償、保留證據", en: "Claim under warranty, keep evidence" }, good: true, feedback: { zh: "✓ 保固內由原廠負擔成本。", en: "✓ Under warranty, the OEM bears the cost." }, eff: { b: 300000, a: -1 } },
    { label: { zh: "自行搶修不留證", en: "Self-repair without records" }, good: false, feedback: { zh: "✗ 喪失求償權、自吞成本。", en: "✗ Loses the claim; you eat the cost." }, eff: { b: -400000 } } ] },
  { id: "d_layup", cat: "D", xp: 60, title: { zh: "停役不佳機組", en: "Lay up a poor unit" }, scenario: { zh: "一台老機組維修成本已超過發電收益。", en: "An old unit's repair cost now exceeds its revenue." }, choices: [
    { label: { zh: "評估後保留停役/汰換", en: "Lay up / retire after assessment" }, good: true, feedback: { zh: "✓ 賠錢機組止血是理性決策。", en: "✓ Stopping the bleed is rational." }, eff: { b: 200000 } },
    { label: { zh: "繼續無止境修", en: "Keep repairing endlessly" }, good: false, feedback: { zh: "✗ 無底洞拖垮整體營運。", en: "✗ A money pit drags the whole operation." }, eff: { b: -300000 } } ] },
  { id: "d_contractor_renew", cat: "D", xp: 60, title: { zh: "運維承包續約", en: "O&M contractor renewal" }, scenario: { zh: "運維承包商合約到期、績效平平。", en: "The O&M contractor's deal is up; performance is mediocre." }, choices: [
    { label: { zh: "綁 KPI 與獎懲再續約", en: "Renew with KPI incentives/penalties" }, good: true, feedback: { zh: "✓ 績效綁約能驅動改善。", en: "✓ KPI-linked deals drive improvement." }, eff: { a: 2 } },
    { label: { zh: "原條件照舊續", en: "Renew on old terms" }, good: false, feedback: { zh: "△ 缺乏改善誘因。", en: "△ No incentive to improve." }, eff: { a: -1 } } ] },
  { id: "d_storage_add", cat: "D", xp: 70, title: { zh: "加裝儲能評估", en: "Add energy storage?" }, scenario: { zh: "為減少棄風考慮加裝電池儲能。", en: "Consider adding battery storage to cut curtailment." }, choices: [
    { label: { zh: "試算回收年限再決定", en: "Model payback before committing" }, good: true, feedback: { zh: "✓ 儲能效益需依電價/棄風試算。", en: "✓ Storage value depends on price & curtailment." }, eff: { b: -100000, g: 60 } },
    { label: { zh: "立刻大規模建置", en: "Build large-scale at once" }, good: false, feedback: { zh: "✗ 未試算恐回收無期。", en: "✗ Without modelling, payback may never come." }, eff: { b: -1500000 } } ] },
  { id: "d_night_repair", cat: "D", xp: 60, title: { zh: "避開尖峰維修", en: "Off-peak repair timing" }, scenario: { zh: "某維修可選在發電價值較低的時段執行。", en: "A repair can be timed to low-value generation periods." }, choices: [
    { label: { zh: "排在低電價/低風時段停機", en: "Schedule downtime in low-value hours" }, good: true, feedback: { zh: "✓ 把停機放在價值低的時段最省。", en: "✓ Take downtime when generation is worth least." }, eff: { a: 2 } },
    { label: { zh: "隨到隨修不挑時段", en: "Repair whenever, ignore timing" }, good: false, feedback: { zh: "△ 可能犧牲高價發電。", en: "△ May sacrifice high-value output." }, eff: { g: -60 } } ] },
  { id: "d_weather_routing", cat: "D", xp: 60, title: { zh: "天氣窗排程", en: "Weather-window planning" }, scenario: { zh: "未來一週多項作業須搶有限天氣窗。", en: "Several jobs must share limited weather windows next week." }, choices: [
    { label: { zh: "依預報排序、預留緩衝", en: "Sequence by forecast with buffers" }, good: true, feedback: { zh: "✓ 善用天氣窗是離岸效率關鍵。", en: "✓ Window planning is the offshore efficiency key." }, eff: { a: 2 } },
    { label: { zh: "排好排滿無緩衝", en: "Pack the schedule, no buffer" }, good: false, feedback: { zh: "✗ 一變天就全盤延誤。", en: "✗ One bad day derails everything." }, eff: { a: -2 } } ] },

  // ── E 天候處置（皆預設雷達圖） ──
  { id: "e_monsoon", cat: "E", xp: 70, title: { zh: "東北季風季", en: "Monsoon season" }, scenario: { zh: "東北季風季來臨，可作業天數驟減。", en: "The monsoon season cuts workable days sharply." }, choices: [
    { label: { zh: "提前完成季前必要維修", en: "Front-load critical pre-season repairs" }, good: true, feedback: { zh: "✓ 把握季前窗口是台灣海峽的常識。", en: "✓ Pre-season windows are precious in the Strait." }, eff: { a: 3, b: -200000 } },
    { label: { zh: "拖到季風季再修", en: "Defer into the monsoon" }, good: false, feedback: { zh: "✗ 季風季幾乎無法出海。", en: "✗ Almost no access during the monsoon." }, eff: { a: -4 } } ] },
  { id: "e_tidal", cat: "E", xp: 50, title: { zh: "強潮流登靠", en: "Strong tidal current" }, scenario: { zh: "大潮期潮流強，影響船舶頂靠穩定。", en: "Spring-tide currents make vessel approach unstable." }, choices: [
    { label: { zh: "依潮汐表挑平潮時段登靠", en: "Board at slack water per tide table" }, good: true, feedback: { zh: "✓ 平潮頂靠最安全。", en: "✓ Slack water is the safest approach." }, eff: { a: 1 } },
    { label: { zh: "強流硬頂", en: "Push against the current" }, good: false, feedback: { zh: "✗ 頂靠失穩、人員落海風險。", en: "✗ Unstable approach risks man-overboard." }, eff: { s: 1 } } ] },
  { id: "e_heat_demand", cat: "E", xp: 60, title: { zh: "熱浪用電尖峰", en: "Heatwave demand peak" }, scenario: { zh: "熱浪使電力需求飆升、電價走高。", en: "A heatwave spikes demand and prices." }, choices: [
    { label: { zh: "確保高可用率搶高電價發電", en: "Maximise availability for high prices" }, good: true, feedback: { zh: "✓ 高價時段穩定併網收益最大。", en: "✓ Staying online in peak prices maximises revenue." }, eff: { g: 120, b: 100000 } },
    { label: { zh: "照常排停機維修", en: "Take routine downtime anyway" }, good: false, feedback: { zh: "△ 在高價時段停機代價高。", en: "△ Downtime in peak hours is costly." }, eff: { g: -120 } } ] },
  { id: "e_seafog_comms", cat: "E", xp: 50, title: { zh: "海霧通訊衰減", en: "Sea-fog comms degradation" }, scenario: { zh: "濃海霧使船岸通訊與定位變差。", en: "Heavy sea fog degrades ship-shore comms & positioning." }, choices: [
    { label: { zh: "提高航行戒備、降速保守航行", en: "Heighten watch, slow & conservative transit" }, good: true, feedback: { zh: "✓ 能見度差時保守航行為上。", en: "✓ Go conservative when visibility drops." }, eff: {} },
    { label: { zh: "維持正常船速", en: "Keep normal speed" }, good: false, feedback: { zh: "✗ 霧中高速＝碰撞風險。", en: "✗ Speed in fog = collision risk." }, eff: { s: 1 } } ] },
  { id: "e_king_tide", cat: "E", xp: 50, title: { zh: "大潮高水位", en: "King tide" }, scenario: { zh: "大潮高水位影響登靠平台高度差。", en: "A king tide changes the access-platform height gap." }, choices: [
    { label: { zh: "重算登靠高度、調整作業", en: "Recompute access height & adjust" }, good: true, feedback: { zh: "✓ 高差錯估易發生踏空。", en: "✓ Misjudging the gap risks missteps." }, eff: { a: 1 } },
    { label: { zh: "照平常高度登靠", en: "Board at the usual height" }, good: false, feedback: { zh: "✗ 高差過大有墜落風險。", en: "✗ A large gap risks a fall." }, eff: { s: 1 } } ] },
  { id: "e_squall", cat: "E", xp: 60, title: { zh: "突發強陣風", en: "Sudden squall" }, scenario: { zh: "陣風線快速逼近，現場有作業中人員。", en: "A squall line nears fast while crews are working." }, choices: [
    { label: { zh: "提前收工、人員返船", en: "Wrap up early, crew back to vessel" }, good: true, feedback: { zh: "✓ 陣風來得快，提前撤最安全。", en: "✓ Squalls hit fast — pull back early." }, eff: { a: -1 } },
    { label: { zh: "搶最後一道工序", en: "Squeeze the last task in" }, good: false, feedback: { zh: "✗ 被陣風困在塔上極危險。", en: "✗ Getting caught aloft is dangerous." }, eff: { s: 2 } } ] },
  { id: "e_winter_window", cat: "E", xp: 60, title: { zh: "冬季作業窗稀少", en: "Scarce winter windows" }, scenario: { zh: "冬季作業窗稀少，多項維修排隊。", en: "Winter windows are scarce with a repair backlog." }, choices: [
    { label: { zh: "依停機損失與安全排序", en: "Prioritise by downtime cost & safety" }, good: true, feedback: { zh: "✓ 稀缺窗口要用在刀口上。", en: "✓ Spend scarce windows where they matter most." }, eff: { a: 2 } },
    { label: { zh: "先做簡單的", en: "Do the easy ones first" }, good: false, feedback: { zh: "△ 重大停機被延後。", en: "△ Major downtime gets deferred." }, eff: { a: -2 } } ] },
  { id: "e_lightning_season", cat: "E", xp: 50, title: { zh: "雷季作業規劃", en: "Lightning-season ops" }, scenario: { zh: "進入雷季，午後雷暴頻繁。", en: "Lightning season brings frequent afternoon storms." }, choices: [
    { label: { zh: "作業集中上午、午後留守", en: "Work mornings, stand down afternoons" }, good: true, feedback: { zh: "✓ 配合雷暴時間分布降風險。", en: "✓ Aligning to storm timing cuts risk." }, eff: { a: 1 } },
    { label: { zh: "全天照常排程", en: "Schedule all day as usual" }, good: false, feedback: { zh: "✗ 午後高處作業遭雷擊風險。", en: "✗ Afternoon at-height work risks strikes." }, eff: { s: 1 } } ] },

  // ── F 供應鏈 / 人力 ──
  { id: "f_port_congestion", cat: "F", xp: 50, title: { zh: "港口壅塞", en: "Port congestion" }, scenario: { zh: "運維母港壅塞，船舶進出受阻。", en: "The O&M port is congested; vessel turnaround slows." }, choices: [
    { label: { zh: "協調船席、改備援碼頭", en: "Coordinate berths / use backup quay" }, good: true, feedback: { zh: "✓ 維持出勤節奏避免連鎖延誤。", en: "✓ Keep sortie cadence to avoid cascades." }, eff: { b: -100000 } },
    { label: { zh: "排隊乾等", en: "Just queue and wait" }, good: false, feedback: { zh: "△ 出勤延誤、停機拉長。", en: "△ Delays stretch downtime." }, eff: { a: -1 } } ] },
  { id: "f_customs", cat: "F", xp: 50, title: { zh: "備品通關延遲", en: "Customs clearance delay" }, scenario: { zh: "進口大件備品卡在海關。", en: "An imported big-ticket spare is stuck in customs." }, choices: [
    { label: { zh: "委報關行加速、補齊文件", en: "Use a broker & complete paperwork" }, good: true, feedback: { zh: "✓ 文件齊全是最快的捷徑。", en: "✓ Complete docs are the fastest path." }, eff: { a: 1, b: -50000 } },
    { label: { zh: "被動等通知", en: "Passively wait" }, good: false, feedback: { zh: "△ 通關拖延＝維修延後。", en: "△ Clearance delay defers the repair." }, eff: { a: -1 } } ] },
  { id: "f_obsolescence", cat: "F", xp: 70, title: { zh: "零件停產", en: "Part obsolescence" }, scenario: { zh: "關鍵控制板原廠停產、無現貨。", en: "A key control board is discontinued with no stock." }, choices: [
    { label: { zh: "尋替代/逆向工程合格件", en: "Qualify an alternative / reverse-engineer" }, good: true, feedback: { zh: "✓ 老風場零件停產要超前部署。", en: "✓ Obsolescence on old farms needs foresight." }, eff: { a: 2, b: -300000 } },
    { label: { zh: "全球到處找原廠庫存", en: "Scour the globe for OEM stock" }, good: false, feedback: { zh: "△ 治標、遲早再缺。", en: "△ A stopgap; it'll run out again." }, eff: { a: -1 } } ] },
  { id: "f_contractor_quality", cat: "F", xp: 60, title: { zh: "承包品質不良", en: "Contractor quality issue" }, scenario: { zh: "外包維修返工率偏高、品質堪憂。", en: "A contractor's rework rate is high; quality is poor." }, choices: [
    { label: { zh: "加強監工與驗收標準", en: "Tighten supervision & acceptance" }, good: true, feedback: { zh: "✓ 品質把關省下返工與故障。", en: "✓ Quality control saves rework & failures." }, eff: { a: 2 } },
    { label: { zh: "便宜就好不計較", en: "Tolerate it — they're cheap" }, good: false, feedback: { zh: "✗ 劣質維修引發後續故障。", en: "✗ Poor work seeds future failures." }, eff: { a: -3, s: 1 } } ] },
  { id: "f_fatigue_rotation", cat: "F", xp: 50, title: { zh: "人員疲勞管理", en: "Crew fatigue management" }, scenario: { zh: "趕工期間技師連續長工時。", en: "Crews are working long consecutive hours in a push." }, choices: [
    { label: { zh: "落實輪班與休息規範", en: "Enforce rotation & rest rules" }, good: true, feedback: { zh: "✓ 疲勞是離岸事故主因之一。", en: "✓ Fatigue is a top offshore accident cause." }, eff: {} },
    { label: { zh: "趕完再休", en: "Rest after the push" }, good: false, feedback: { zh: "✗ 疲勞作業＝高事故率。", en: "✗ Fatigued work = high incident rate." }, eff: { s: 2 } } ] },
  { id: "f_safety_brief", cat: "F", xp: 40, title: { zh: "新進承商安全簡報", en: "New contractor safety briefing" }, scenario: { zh: "新承商首次上場，不熟現場規範。", en: "A new contractor starts, unfamiliar with site rules." }, choices: [
    { label: { zh: "完整工安簡報與帶場", en: "Full HSE briefing & site induction" }, good: true, feedback: { zh: "✓ 熟悉規範是零事故的前提。", en: "✓ Knowing the rules underpins zero-harm." }, eff: { b: -20000 } },
    { label: { zh: "直接上工省時間", en: "Skip it to save time" }, good: false, feedback: { zh: "✗ 不熟規範易釀事故。", en: "✗ Unfamiliarity breeds accidents." }, eff: { s: 1 } } ] },
  { id: "f_cannibalize", cat: "F", xp: 50, title: { zh: "拆東補西", en: "Cannibalise a spare?" }, scenario: { zh: "急修缺件，考慮從停役機組拆件。", en: "Urgent repair lacks a part; consider cannibalising a laid-up unit." }, choices: [
    { label: { zh: "記錄追蹤後暫拆停役件", en: "Cannibalise the laid-up unit, log it" }, good: true, feedback: { zh: "✓ 救急可行，但須追蹤補回。", en: "✓ OK as a stopgap if tracked & replenished." }, eff: { a: 2 } },
    { label: { zh: "從運轉機組拆件", en: "Pull from a running unit" }, good: false, feedback: { zh: "✗ 製造第二台停機，治絲益棼。", en: "✗ Creates a second outage — counterproductive." }, eff: { a: -3 } } ] },
  { id: "f_currency", cat: "F", xp: 40, title: { zh: "匯率與報價波動", en: "FX & price escalation" }, scenario: { zh: "進口備品因匯率與通膨報價大漲。", en: "Imported spares jump on FX & inflation." }, choices: [
    { label: { zh: "簽長約鎖價/分散供應", en: "Lock prices via long deals / diversify" }, good: true, feedback: { zh: "✓ 鎖價與分散降低波動風險。", en: "✓ Locking & diversifying cut volatility risk." }, eff: { b: -50000 } },
    { label: { zh: "波動時臨時搶買", en: "Panic-buy on spikes" }, good: false, feedback: { zh: "△ 高點進貨成本最差。", en: "△ Buying at peaks is the worst cost." }, eff: { b: -200000 } } ] },

  // ── G 突發 ──
  { id: "g_collision", cat: "G", xp: 80, title: { zh: "船舶接近風場", en: "Vessel intrusion" }, scenario: { zh: "一艘漁船偏航駛入風場、逼近機組。", en: "A fishing boat strays into the farm, nearing a turbine." }, choices: [
    { label: { zh: "VTS 警告、通報海巡", en: "Warn via VTS & alert coast guard" }, good: true, feedback: { zh: "✓ 及早警告避免撞擊基礎。", en: "✓ Early warning prevents an allision." }, eff: {} },
    { label: { zh: "等它自己離開", en: "Wait for it to leave" }, good: false, feedback: { zh: "✗ 撞擊基礎/海纜後果嚴重。", en: "✗ Striking a foundation/cable is severe." }, eff: { s: 1, a: -2 } } ] },
  { id: "g_oil_spill", cat: "G", xp: 80, title: { zh: "油品洩漏入海", en: "Oil spill to sea" }, scenario: { zh: "作業中少量液壓油不慎洩漏入海。", en: "A small hydraulic-oil spill enters the sea during work." }, choices: [
    { label: { zh: "啟動圍油、依法通報", en: "Deploy boom & report per law" }, good: true, feedback: { zh: "✓ 環境事件須立即圍堵與通報。", en: "✓ Environmental spills require immediate response & reporting." }, eff: { b: -100000 } },
    { label: { zh: "量少不通報", en: "Small amount — don't report" }, good: false, feedback: { zh: "✗ 隱匿環境事件重罰且失信。", en: "✗ Hiding spills brings heavy fines & distrust." }, eff: { b: -500000, s: 1 } } ] },
  { id: "g_dropped_object", cat: "G", xp: 70, title: { zh: "高處落物", en: "Dropped object" }, scenario: { zh: "機艙作業有工具自高處墜落。", en: "A tool falls from the nacelle during work." }, choices: [
    { label: { zh: "停工檢討、落實工具繫繩", en: "Stop, review, enforce tool tethering" }, good: true, feedback: { zh: "✓ 落物傷人，繫繩是基本防護。", en: "✓ Dropped objects injure — tethering is basic." }, eff: {} },
    { label: { zh: "沒砸到人就繼續", en: "No one hit — carry on" }, good: false, feedback: { zh: "✗ 不檢討下次可能砸中人。", en: "✗ Without review, next time it hits someone." }, eff: { s: 2 } } ] },
  { id: "g_security_drone", cat: "G", xp: 50, title: { zh: "不明無人機", en: "Unknown drone" }, scenario: { zh: "不明無人機在風場上空盤旋拍攝。", en: "An unidentified drone hovers over the farm." }, choices: [
    { label: { zh: "記錄通報、評估資安風險", en: "Record, report & assess security risk" }, good: true, feedback: { zh: "✓ 關鍵基礎設施須留意保全。", en: "✓ Critical infrastructure warrants security vigilance." }, eff: {} },
    { label: { zh: "不理會", en: "Ignore it" }, good: false, feedback: { zh: "△ 可能是偵察或干擾前奏。", en: "△ Could precede recon or interference." }, eff: { s: 1 } } ] },
  { id: "g_medical", cat: "G", xp: 90, title: { zh: "海上醫療急症", en: "Offshore medical emergency" }, scenario: { zh: "技師在機組上突發疑似心臟不適。", en: "A technician has a suspected cardiac event on a turbine." }, choices: [
    { label: { zh: "啟動醫療後送、就近急救", en: "Activate medevac & first aid" }, good: true, feedback: { zh: "✓ 黃金時間搶救，立即後送。", en: "✓ Act in the golden hour — medevac now." }, eff: { a: -1 } },
    { label: { zh: "等下班船一起回", en: "Wait for the scheduled boat" }, good: false, feedback: { zh: "✗ 延誤急症恐致命。", en: "✗ Delaying an emergency can be fatal." }, eff: { s: 3 } } ] },
  { id: "g_gangway_fail", cat: "G", xp: 70, title: { zh: "舷梯系統失效", en: "Gangway failure" }, scenario: { zh: "運動補償舷梯故障，人員轉移受阻。", en: "The motion-compensated gangway fails mid-transfer." }, choices: [
    { label: { zh: "停止轉移、改安全方式撤回", en: "Halt transfer & recover safely" }, good: true, feedback: { zh: "✓ 轉移中失效須立即停止。", en: "✓ Stop transfers immediately on failure." }, eff: { a: -1 } },
    { label: { zh: "手動硬撐完成轉移", en: "Force the transfer manually" }, good: false, feedback: { zh: "✗ 失效舷梯轉移＝墜海風險。", en: "✗ Transferring on a failed gangway risks a fall." }, eff: { s: 2 } } ] },
  { id: "g_uxo", cat: "G", xp: 70, title: { zh: "發現未爆彈", en: "UXO discovered" }, scenario: { zh: "海床作業意外發現疑似未爆彈(UXO)。", en: "Seabed work uncovers a suspected unexploded ordnance." }, choices: [
    { label: { zh: "停工、劃設禁區、通報專業處理", en: "Stop, cordon off, call EOD experts" }, good: true, feedback: { zh: "✓ UXO 須由專業排除，嚴禁自行處理。", en: "✓ UXO must be handled by EOD — never DIY." }, eff: { a: -1, b: -100000 } },
    { label: { zh: "移開繼續作業", en: "Move it and carry on" }, good: false, feedback: { zh: "✗ 擾動 UXO 可能致命。", en: "✗ Disturbing UXO can be lethal." }, eff: { s: 3 } } ] },
  { id: "g_marine_mammal", cat: "G", xp: 50, title: { zh: "海洋哺乳類進入工區", en: "Marine mammal in worksite" }, scenario: { zh: "打樁/噪音作業前發現鯨豚進入警戒區。", en: "Cetaceans enter the exclusion zone before noisy work." }, choices: [
    { label: { zh: "暫停作業、待其離開", en: "Pause work until they leave" }, good: true, feedback: { zh: "✓ 遵守鯨豚觀察與緩啟動規範。", en: "✓ Follow MMO & soft-start protocols." }, eff: { g: -30 } },
    { label: { zh: "照常打樁", en: "Pile-drive anyway" }, good: false, feedback: { zh: "✗ 違反生態規範、傷害海洋生物。", en: "✗ Violates eco-rules and harms wildlife." }, eff: { b: -300000, s: 1 } } ] },

  // ════════ 擴充至 150+（第三批） ════════
  // A
  { id: "a_chiller", cat: "A", xp: 50, title: { zh: "機艙空調失效", en: "Nacelle HVAC failure" }, scenario: { zh: "機艙空調故障，電控櫃溫度上升。", en: "Nacelle HVAC fails; control-cabinet temperature rises." }, choices: [
    { label: { zh: "降載並修復空調", en: "Derate & repair HVAC" }, good: true, feedback: { zh: "✓ 電控過熱會誤動作甚至跳機。", en: "✓ Overheated electronics misfire or trip." }, eff: { a: 3, b: -100000 } },
    { label: { zh: "開艙門通風硬撐", en: "Open hatches and push on" }, good: false, feedback: { zh: "✗ 鹽霧進入更傷電控。", en: "✗ Salt air harms electronics further." }, eff: { a: -3, s: 1 } } ] },
  { id: "a_crane_fault", cat: "A", xp: 50, title: { zh: "機艙吊車故障", en: "Nacelle crane fault" }, scenario: { zh: "機艙服務吊車故障，零件無法吊運。", en: "The service crane fails; parts can't be hoisted." }, choices: [
    { label: { zh: "先修吊車再進行維修", en: "Fix the crane before repairs" }, good: true, feedback: { zh: "✓ 無吊車無法安全吊裝。", en: "✓ No crane, no safe lifting." }, eff: { a: 2, b: -80000 } },
    { label: { zh: "人力硬抬零件", en: "Manhandle the parts" }, good: false, feedback: { zh: "✗ 人力吊重＝傷害風險。", en: "✗ Manual lifting risks injury." }, eff: { s: 2 } } ] },
  { id: "a_encoder", cat: "A", xp: 50, title: { zh: "編碼器訊號異常", en: "Encoder signal fault" }, scenario: { zh: "轉速/位置編碼器訊號跳動，控制不穩。", en: "Speed/position encoder signal jitters; control unstable." }, choices: [
    { label: { zh: "檢查接線與更換編碼器", en: "Check wiring & replace encoder" }, good: true, feedback: { zh: "✓ 回授不準會導致誤動作。", en: "✓ Bad feedback causes misoperation." }, eff: { a: 3, b: -70000 } },
    { label: { zh: "忽略偶發跳動", en: "Ignore the occasional jitter" }, good: false, feedback: { zh: "✗ 間歇故障常演變成停機。", en: "✗ Intermittent faults grow into outages." }, eff: { a: -2 } } ] },
  { id: "a_brake_resistor", cat: "A", xp: 50, title: { zh: "煞車電阻過熱", en: "Brake resistor overheat" }, scenario: { zh: "變流器煞車電阻過熱告警。", en: "Converter brake-resistor overheat alarm." }, choices: [
    { label: { zh: "檢查散熱與電阻箱", en: "Check cooling & resistor bank" }, good: true, feedback: { zh: "✓ 過熱可能起火，須處理。", en: "✓ Overheat can ignite — address it." }, eff: { a: 3, b: -90000 } },
    { label: { zh: "復歸續用", en: "Reset and continue" }, good: false, feedback: { zh: "✗ 反覆過熱風險高。", en: "✗ Repeated overheat is risky." }, eff: { a: -2, s: 1 } } ] },
  { id: "a_grease_pump", cat: "A", xp: 40, title: { zh: "潤滑泵故障", en: "Lube pump failure" }, scenario: { zh: "主軸/變槳潤滑泵停止運作。", en: "Main-shaft/pitch lube pump stops." }, choices: [
    { label: { zh: "停機更換潤滑泵", en: "Stop & replace the pump" }, good: true, feedback: { zh: "✓ 潤滑斷供快速磨損軸承。", en: "✓ Lube loss rapidly wears bearings." }, eff: { a: 3, b: -80000 } },
    { label: { zh: "手動補脂頂著", en: "Hand-grease for now" }, good: false, feedback: { zh: "△ 治標、軸承仍受損。", en: "△ Stopgap; bearings still wear." }, eff: { a: -2 } } ] },
  { id: "a_sensor_drift", cat: "A", xp: 40, title: { zh: "溫度感測漂移", en: "Temp sensor drift" }, scenario: { zh: "多支溫度感測讀值明顯不一致。", en: "Several temperature sensors disagree noticeably." }, choices: [
    { label: { zh: "校正/更換故障感測", en: "Calibrate / replace faulty sensors" }, good: true, feedback: { zh: "✓ 錯誤讀值會誤導保護動作。", en: "✓ Wrong readings mislead protection." }, eff: { a: 2, b: -40000 } },
    { label: { zh: "取平均值湊合", en: "Just average them" }, good: false, feedback: { zh: "✗ 掩蓋真實過熱風險。", en: "✗ Masks real overheating risk." }, eff: { s: 1 } } ] },
  { id: "a_cabinet_water", cat: "A", xp: 60, title: { zh: "電控櫃進水", en: "Cabinet water ingress" }, scenario: { zh: "塔基電控櫃發現滲水痕跡。", en: "Water ingress found in the tower-base control cabinet." }, choices: [
    { label: { zh: "斷電除濕、修復密封", en: "De-energise, dry, re-seal" }, good: true, feedback: { zh: "✓ 進水＋帶電＝短路與觸電。", en: "✓ Water + live = short & shock risk." }, eff: { a: 2, b: -120000 } },
    { label: { zh: "擦乾繼續用", en: "Wipe it and continue" }, good: false, feedback: { zh: "✗ 未修密封會持續進水。", en: "✗ Unsealed, water keeps coming." }, eff: { s: 2 } } ] },

  // B
  { id: "b_power_dip", cat: "B", xp: 70, title: { zh: "出力間歇下挫", en: "Intermittent power dips" }, scenario: { zh: "某機組出力曲線出現規律性瞬間下挫。", en: "A unit shows regular momentary power dips." }, choices: [
    { label: { zh: "比對運轉資料找根因", en: "Correlate operating data for root cause" }, good: true, feedback: { zh: "✓ 規律性下挫多有明確機械/電氣因。", en: "✓ Regular dips usually have a clear cause." }, eff: { a: 2, b: -80000 } },
    { label: { zh: "當作正常波動", en: "Call it normal scatter" }, good: false, feedback: { zh: "✗ 規律≠隨機，恐錯失故障。", en: "✗ Regular isn't random — may miss a fault." }, eff: { a: -2 } } ] },
  { id: "b_harmonic", cat: "B", xp: 70, chart: "spectrum", title: { zh: "諧波超標趨勢", en: "Harmonic distortion rising" }, scenario: { zh: "併網點諧波(THD)趨勢升高。", en: "Grid-point harmonic distortion (THD) is rising." }, choices: [
    { label: { zh: "檢查濾波器與變流器", en: "Check filters & converters" }, good: true, feedback: { zh: "✓ 諧波超標違反併網規範。", en: "✓ Excess harmonics breach grid code." }, eff: { a: 2, b: -150000 } },
    { label: { zh: "在限值邊緣不理", en: "Leave it near the limit" }, good: false, feedback: { zh: "✗ 超標恐受罰並擾鄰近設備。", en: "✗ Exceeding it brings penalties & interference." }, eff: { a: -2 } } ] },
  { id: "b_blade_noise", cat: "B", xp: 60, title: { zh: "葉片異音趨勢", en: "Blade noise trend" }, scenario: { zh: "聲學監測顯示某葉片異音逐漸增加。", en: "Acoustic monitoring shows a blade's noise rising." }, choices: [
    { label: { zh: "安排葉片內視鏡檢查", en: "Schedule a blade borescope" }, good: true, feedback: { zh: "✓ 異音可能是結構或雷擊損傷。", en: "✓ Noise can signal structural or LPS damage." }, eff: { a: 2, b: -100000 } },
    { label: { zh: "忽略", en: "Ignore it" }, good: false, feedback: { zh: "✗ 葉片問題不容忽視。", en: "✗ Blade issues mustn't be ignored." }, eff: { a: -2, s: 1 } } ] },
  { id: "b_fatigue_load", cat: "B", xp: 80, title: { zh: "疲勞載荷累積", en: "Fatigue load accrual" }, scenario: { zh: "載荷監測顯示某機組疲勞消耗快於預期。", en: "Load monitoring shows fatigue consumed faster than expected." }, choices: [
    { label: { zh: "調整運轉策略降載荷", en: "Adjust operation to cut loads" }, good: true, feedback: { zh: "✓ 主動降載可延長結構壽命。", en: "✓ Load-reducing operation extends life." }, eff: { a: 1, g: -30 } },
    { label: { zh: "繼續滿載運轉", en: "Keep running at full load" }, good: false, feedback: { zh: "✗ 提早達疲勞極限。", en: "✗ Reaches the fatigue limit sooner." }, eff: { a: -2, s: 1 } } ] },
  { id: "b_transformer_temp", cat: "B", xp: 70, title: { zh: "變壓器溫升趨勢", en: "Transformer temp trend" }, scenario: { zh: "主變壓器繞組溫度趨勢偏高。", en: "Main transformer winding temperature trends high." }, choices: [
    { label: { zh: "檢查冷卻與負載分配", en: "Check cooling & load sharing" }, good: true, feedback: { zh: "✓ 溫升縮短變壓器壽命。", en: "✓ Heat shortens transformer life." }, eff: { a: 2, b: -120000 } },
    { label: { zh: "提高跳脫門檻", en: "Raise the trip threshold" }, good: false, feedback: { zh: "✗ 調高門檻是掩耳盜鈴。", en: "✗ Raising the limit just hides the risk." }, eff: { s: 1 } } ] },
  { id: "b_soil_trend", cat: "B", xp: 50, title: { zh: "葉片污染趨勢", en: "Blade soiling trend" }, scenario: { zh: "功率係數隨季節下降、疑似葉片污染。", en: "Power coefficient falls seasonally — suspected soiling." }, choices: [
    { label: { zh: "排程清潔回復效率", en: "Schedule cleaning to restore efficiency" }, good: true, feedback: { zh: "✓ 清潔回收的發電常大於成本。", en: "✓ Cleaning gains usually beat the cost." }, eff: { a: 1, g: 60 } },
    { label: { zh: "等雨自然洗", en: "Wait for rain to wash it" }, good: false, feedback: { zh: "△ 不可靠、效率持續流失。", en: "△ Unreliable; efficiency keeps leaking." }, eff: { g: -30 } } ] },
  { id: "b_anomaly_cluster", cat: "B", xp: 70, title: { zh: "多機同型告警", en: "Fleet-wide same alarm" }, scenario: { zh: "同型號多台機組出現相同間歇告警。", en: "Many units of one model show the same intermittent alarm." }, choices: [
    { label: { zh: "視為系統性問題、通報原廠", en: "Treat as systemic; notify OEM" }, good: true, feedback: { zh: "✓ 同型同症狀多為設計/韌體共因。", en: "✓ Same model & symptom often shares a root cause." }, eff: { a: 2 } },
    { label: { zh: "逐台分別處理", en: "Handle each separately" }, good: false, feedback: { zh: "△ 忽略共因、重工又難根治。", en: "△ Misses the common cause; rework-prone." }, eff: { a: -1 } } ] },

  // C
  { id: "c_oil_flush", cat: "C", xp: 50, title: { zh: "齒輪箱換油沖洗", en: "Gearbox oil flush" }, scenario: { zh: "齒輪箱到期須換油與系統沖洗。", en: "Gearbox is due for an oil change & system flush." }, choices: [
    { label: { zh: "依規換油並沖洗", en: "Change oil & flush per spec" }, good: true, feedback: { zh: "✓ 乾淨潤滑大幅延長齒輪壽命。", en: "✓ Clean lube greatly extends gear life." }, eff: { a: 2, b: -150000 } },
    { label: { zh: "只補油不沖洗", en: "Top up without flushing" }, good: false, feedback: { zh: "△ 舊油雜質殘留繼續磨損。", en: "△ Old contaminants keep grinding." }, eff: { a: -1 } } ] },
  { id: "c_seal_inspect", cat: "C", xp: 40, title: { zh: "主軸油封巡檢", en: "Main-shaft seal check" }, scenario: { zh: "主軸油封到期須巡檢漏油。", en: "Main-shaft seals are due for a leak inspection." }, choices: [
    { label: { zh: "巡檢並更換劣化油封", en: "Inspect & replace worn seals" }, good: true, feedback: { zh: "✓ 漏油污染並降低潤滑。", en: "✓ Leaks contaminate & reduce lubrication." }, eff: { a: 2, b: -90000 } },
    { label: { zh: "沒滴油就略過", en: "Skip if not dripping" }, good: false, feedback: { zh: "△ 微滲不易見卻持續惡化。", en: "△ Weeping is subtle but worsens." }, eff: { a: -1 } } ] },
  { id: "c_davit_test", cat: "C", xp: 50, title: { zh: "逃生吊救裝置測試", en: "Davit/rescue device test" }, scenario: { zh: "逃生與吊救裝置到期須功能測試。", en: "Escape & rescue devices are due for testing." }, choices: [
    { label: { zh: "依規測試與保養", en: "Test & service per regulation" }, good: true, feedback: { zh: "✓ 緊急時這是保命裝置。", en: "✓ These are life-saving in emergencies." }, eff: { b: -40000 } },
    { label: { zh: "延後測試", en: "Defer the test" }, good: false, feedback: { zh: "✗ 失效時無法救援。", en: "✗ If failed, no rescue when needed." }, eff: { s: 2 } } ] },
  { id: "c_ladder_inspect", cat: "C", xp: 40, title: { zh: "爬梯/防墜系統檢查", en: "Ladder/fall-arrest check" }, scenario: { zh: "塔內爬梯與防墜系統到期須檢查。", en: "Tower ladder & fall-arrest system are due for inspection." }, choices: [
    { label: { zh: "檢查防墜軌與安全裝置", en: "Inspect fall-arrest rail & gear" }, good: true, feedback: { zh: "✓ 防墜是登塔作業的命脈。", en: "✓ Fall-arrest is the lifeline for climbing." }, eff: { b: -30000 } },
    { label: { zh: "看起來沒問題", en: "Looks fine" }, good: false, feedback: { zh: "✗ 防墜失效＝致命墜落。", en: "✗ Fall-arrest failure = fatal fall." }, eff: { s: 2 } } ] },
  { id: "c_battery_capacity", cat: "C", xp: 50, title: { zh: "後備電池容量測試", en: "Backup battery capacity test" }, scenario: { zh: "變槳/UPS 後備電池到期須容量測試。", en: "Pitch/UPS backup batteries are due for a capacity test." }, choices: [
    { label: { zh: "做容量測試、汰換衰退電池", en: "Capacity-test & replace weak cells" }, good: true, feedback: { zh: "✓ 容量衰退會在斷電時誤事。", en: "✓ Degraded capacity fails you on power loss." }, eff: { a: 1, b: -60000 } },
    { label: { zh: "看電壓正常就好", en: "Just check the voltage" }, good: false, feedback: { zh: "✗ 電壓正常不代表容量足。", en: "✗ Good voltage ≠ good capacity." }, eff: { s: 1 } } ] },
  { id: "c_thermography", cat: "C", xp: 50, title: { zh: "電氣紅外線巡檢", en: "Electrical thermography" }, scenario: { zh: "高壓設備到期須紅外線熱影像巡檢。", en: "HV equipment is due for a thermographic survey." }, choices: [
    { label: { zh: "做熱影像找熱點", en: "Run thermography to find hotspots" }, good: true, feedback: { zh: "✓ 提早抓鬆接點避免火災。", en: "✓ Catch loose joints before fires." }, eff: { a: 2, b: -50000 } },
    { label: { zh: "省下這次", en: "Skip this round" }, good: false, feedback: { zh: "△ 失去一次早期診斷。", en: "△ Lose an early-warning check." }, eff: { s: 1 } } ] },
  { id: "c_dehumidifier", cat: "C", xp: 40, title: { zh: "除濕系統保養", en: "Dehumidifier service" }, scenario: { zh: "機艙/塔內除濕系統到期須保養。", en: "Nacelle/tower dehumidifiers are due for service." }, choices: [
    { label: { zh: "保養除濕、控制濕度", en: "Service units & control humidity" }, good: true, feedback: { zh: "✓ 控濕防鏽蝕與電氣故障。", en: "✓ Humidity control fights corrosion & faults." }, eff: { a: 1, b: -30000 } },
    { label: { zh: "海上本來就濕、略過", en: "It's the sea — skip it" }, good: false, feedback: { zh: "△ 高濕加速設備老化。", en: "△ High humidity ages equipment." }, eff: { a: -1 } } ] },

  // D
  { id: "d_route_optimize", cat: "D", xp: 60, title: { zh: "維運航次最佳化", en: "Sortie optimisation" }, scenario: { zh: "多項維修可重排以減少航次。", en: "Several jobs could be re-sequenced to cut sorties." }, choices: [
    { label: { zh: "整合航次、共用窗口", en: "Bundle jobs into shared windows" }, good: true, feedback: { zh: "✓ 減少航次直接降成本。", en: "✓ Fewer sorties cut cost directly." }, eff: { b: 200000 } },
    { label: { zh: "各別出勤不整合", en: "Run each job separately" }, good: false, feedback: { zh: "△ 航次與成本上升。", en: "△ More sorties, more cost." }, eff: { b: -150000 } } ] },
  { id: "d_inventory_audit", cat: "D", xp: 50, title: { zh: "備品庫存盤點", en: "Spares inventory audit" }, scenario: { zh: "庫存帳實不符，部分關鍵件數量不明。", en: "Stock records don't match; some critical counts are unclear." }, choices: [
    { label: { zh: "全面盤點、更新最低庫存", en: "Audit & reset min stock levels" }, good: true, feedback: { zh: "✓ 準確庫存避免急修缺料。", en: "✓ Accurate stock prevents stockouts." }, eff: { a: 2, b: -50000 } },
    { label: { zh: "缺了再買", en: "Buy when short" }, good: false, feedback: { zh: "✗ 急單交期長、停機久。", en: "✗ Rush orders mean long downtime." }, eff: { a: -2 } } ] },
  { id: "d_green_cert", cat: "D", xp: 50, title: { zh: "綠電憑證申辦", en: "Green certificate filing" }, scenario: { zh: "可申辦綠電憑證提升收益。", en: "Renewable energy certificates can be filed for extra revenue." }, choices: [
    { label: { zh: "完成查證申辦憑證", en: "Verify & file certificates" }, good: true, feedback: { zh: "✓ 憑證是額外收益來源。", en: "✓ Certificates add revenue." }, eff: { b: 300000 } },
    { label: { zh: "嫌麻煩不辦", en: "Skip — too much hassle" }, good: false, feedback: { zh: "△ 放棄一筆穩定收入。", en: "△ Forgoes steady income." }, eff: {} } ] },
  { id: "d_data_invest", cat: "D", xp: 60, title: { zh: "數位監診投資", en: "Digital diagnostics investment" }, scenario: { zh: "考慮投資進階監診平台。", en: "Consider investing in an advanced diagnostics platform." }, choices: [
    { label: { zh: "導入監診、提升預知維護", en: "Adopt diagnostics for predictive O&M" }, good: true, feedback: { zh: "✓ 預知維護長期降本增益。", en: "✓ Predictive O&M pays off long-term." }, eff: { a: 3, b: -500000 } },
    { label: { zh: "維持人工巡檢", en: "Stick to manual inspection" }, good: false, feedback: { zh: "△ 錯失早期預警。", en: "△ Misses early warnings." }, eff: { a: -1 } } ] },
  { id: "d_subcontract", cat: "D", xp: 50, title: { zh: "尖峰外包決策", en: "Peak-load subcontracting" }, scenario: { zh: "維修積壓，自有人力不足。", en: "Repair backlog exceeds in-house capacity." }, choices: [
    { label: { zh: "短期外包消化積壓", en: "Subcontract to clear backlog" }, good: true, feedback: { zh: "✓ 積壓越久發電損失越大。", en: "✓ Backlog left to grow loses generation." }, eff: { a: 3, b: -400000 } },
    { label: { zh: "慢慢自己做", en: "Do it all in-house slowly" }, good: false, feedback: { zh: "△ 停機拖長、損失累積。", en: "△ Downtime lingers; losses pile up." }, eff: { a: -2 } } ] },
  { id: "d_bench_kpi", cat: "D", xp: 50, title: { zh: "同業標竿比較", en: "Benchmark vs peers" }, scenario: { zh: "本場可用率落後同業標竿。", en: "Your availability lags the industry benchmark." }, choices: [
    { label: { zh: "分析差距、訂改善計畫", en: "Analyse the gap & plan improvements" }, good: true, feedback: { zh: "✓ 標竿管理驅動持續改善。", en: "✓ Benchmarking drives improvement." }, eff: { a: 2 } },
    { label: { zh: "認為條件不同不比", en: "Dismiss — conditions differ" }, good: false, feedback: { zh: "△ 失去改善動力。", en: "△ Loses the improvement drive." }, eff: { a: -1 } } ] },
  { id: "d_capex_plan", cat: "D", xp: 60, title: { zh: "大型零件汰換預算", en: "Major-component capex plan" }, scenario: { zh: "未來兩年多台齒輪箱可能須更換。", en: "Several gearboxes may need replacing over two years." }, choices: [
    { label: { zh: "編列預算、分批汰換", en: "Budget & phase the replacements" }, good: true, feedback: { zh: "✓ 提前編預算避免現金衝擊。", en: "✓ Pre-budgeting avoids cash shocks." }, eff: { a: 2, b: -300000 } },
    { label: { zh: "壞一台才想一台", en: "React one at a time" }, good: false, feedback: { zh: "△ 突發支出與停機難控。", en: "△ Surprise costs & downtime." }, eff: { a: -2 } } ] },

  // E
  { id: "e_typhoon_path", cat: "E", xp: 80, title: { zh: "颱風路徑不確定", en: "Uncertain typhoon track" }, scenario: { zh: "颱風路徑預報不確定，可能擦邊或直撲。", en: "Typhoon track is uncertain — glancing or direct hit." }, choices: [
    { label: { zh: "保守備災、提前準備停機", en: "Prepare conservatively for shutdown" }, good: true, feedback: { zh: "✓ 路徑不確定時以安全為先。", en: "✓ When track is uncertain, err safe." }, eff: { a: 1 } },
    { label: { zh: "賭它轉向照常運轉", en: "Bet it veers, run as usual" }, good: false, feedback: { zh: "✗ 賭天氣是危險的賭注。", en: "✗ Betting on weather is a dangerous gamble." }, eff: { a: -4, s: 2 } } ] },
  { id: "e_storm_surge", cat: "E", xp: 60, title: { zh: "暴潮影響登靠", en: "Storm surge affects access" }, scenario: { zh: "暴潮使水位異常，登靠平台高差大變。", en: "A storm surge skews water level & access height." }, choices: [
    { label: { zh: "暫停登靠、重新評估", en: "Suspend access & re-assess" }, good: true, feedback: { zh: "✓ 異常水位下登靠極危險。", en: "✓ Access in abnormal levels is dangerous." }, eff: {} },
    { label: { zh: "照常登靠", en: "Board as usual" }, good: false, feedback: { zh: "✗ 高差劇變易釀墜落。", en: "✗ Sudden gaps risk falls." }, eff: { s: 2 } } ] },
  { id: "e_wind_lull", cat: "E", xp: 40, title: { zh: "無風期維修良機", en: "Wind lull repair window" }, scenario: { zh: "預報數日低風，發電本就低。", en: "Forecast shows days of low wind; output is low anyway." }, choices: [
    { label: { zh: "把握低風期集中維修", en: "Concentrate repairs in the lull" }, good: true, feedback: { zh: "✓ 低風期停機機會成本最低。", en: "✓ Downtime in a lull costs the least." }, eff: { a: 3 } },
    { label: { zh: "等有風再排", en: "Wait until it's windy" }, good: false, feedback: { zh: "✗ 等於把停機排在高發電時段。", en: "✗ That puts downtime in high-output hours." }, eff: { g: -60 } } ] },
  { id: "e_temp_inversion", cat: "E", xp: 50, title: { zh: "大氣穩定低風切", en: "Stable atmosphere shear" }, scenario: { zh: "大氣穩定造成異常風切與尾流。", en: "A stable atmosphere causes abnormal shear & wake." }, choices: [
    { label: { zh: "調整尾流控制策略", en: "Tune wake-control strategy" }, good: true, feedback: { zh: "✓ 尾流管理可回收場級發電。", en: "✓ Wake steering recovers farm-level output." }, eff: { g: 60 } },
    { label: { zh: "不調整", en: "Leave settings as-is" }, good: false, feedback: { zh: "△ 尾流損失持續。", en: "△ Wake losses persist." }, eff: { g: -30 } } ] },
  { id: "e_visibility", cat: "E", xp: 40, title: { zh: "夜航能見度", en: "Night-transit visibility" }, scenario: { zh: "需夜間出勤、能見度與疲勞風險升高。", en: "A night sortie raises visibility & fatigue risk." }, choices: [
    { label: { zh: "評估必要性、加強戒護", en: "Assess necessity & add safeguards" }, good: true, feedback: { zh: "✓ 夜航風險高，須審慎。", en: "✓ Night transits are higher risk." }, eff: {} },
    { label: { zh: "照常夜航", en: "Night-sail routinely" }, good: false, feedback: { zh: "✗ 夜間事故率較高。", en: "✗ Night incident rates are higher." }, eff: { s: 1 } } ] },
  { id: "e_gust_front", cat: "E", xp: 50, title: { zh: "陣風鋒面通過", en: "Gust front passing" }, scenario: { zh: "陣風鋒面通過，風速短時劇烈變動。", en: "A gust front brings sharp short-term wind swings." }, choices: [
    { label: { zh: "提高保護裕度、暫緩高處作業", en: "Raise margins, pause at-height work" }, good: true, feedback: { zh: "✓ 劇烈變動下作業風險高。", en: "✓ Sharp swings make work risky." }, eff: { a: -1 } },
    { label: { zh: "照常作業", en: "Work as usual" }, good: false, feedback: { zh: "✗ 陣風易致失衡與落物。", en: "✗ Gusts cause imbalance & dropped objects." }, eff: { s: 1 } } ] },
  { id: "e_heat_cable", cat: "E", xp: 50, title: { zh: "高溫海纜降容", en: "Heat cable derating" }, scenario: { zh: "高水溫使海纜輸送容量下降。", en: "High sea temperature derates cable capacity." }, choices: [
    { label: { zh: "依降容限制調整輸出", en: "Adjust output to derated limit" }, good: true, feedback: { zh: "✓ 過載海纜會加速老化。", en: "✓ Overloading the cable ages it fast." }, eff: { g: -30 } },
    { label: { zh: "維持滿載輸送", en: "Keep full transmission" }, good: false, feedback: { zh: "✗ 海纜過熱故障代價極高。", en: "✗ Cable overheating is very costly." }, eff: { a: -3, s: 1 } } ] },

  // F
  { id: "f_warehouse", cat: "F", xp: 50, title: { zh: "倉儲容量不足", en: "Warehouse capacity" }, scenario: { zh: "備品倉儲空間不足以容納關鍵大件。", en: "Warehouse space can't hold critical big parts." }, choices: [
    { label: { zh: "擴充/租用合適倉儲", en: "Expand / rent suitable storage" }, good: true, feedback: { zh: "✓ 大件就近備儲縮短停機。", en: "✓ Nearby big-part storage cuts downtime." }, eff: { a: 2, b: -100000 } },
    { label: { zh: "露天堆放將就", en: "Store outdoors for now" }, good: false, feedback: { zh: "✗ 大件露天受潮鏽蝕。", en: "✗ Outdoor storage corrodes parts." }, eff: { a: -1 } } ] },
  { id: "f_oem_support", cat: "F", xp: 60, title: { zh: "原廠技術支援延遲", en: "OEM support delay" }, scenario: { zh: "原廠工程師到場支援需數週。", en: "OEM engineers can't attend for weeks." }, choices: [
    { label: { zh: "遠距支援＋自有團隊先行", en: "Remote support + in-house first response" }, good: true, feedback: { zh: "✓ 培養自主能力降低依賴。", en: "✓ In-house capability cuts dependence." }, eff: { a: 2, b: -100000 } },
    { label: { zh: "乾等原廠", en: "Wait for the OEM" }, good: false, feedback: { zh: "✗ 停機隨等待延長。", en: "✗ Downtime grows with the wait." }, eff: { a: -3 } } ] },
  { id: "f_spares_pool", cat: "F", xp: 50, title: { zh: "共用備品庫", en: "Shared spares pool" }, scenario: { zh: "鄰近風場提議共用關鍵備品庫。", en: "A neighbouring farm proposes a shared critical-spares pool." }, choices: [
    { label: { zh: "加入共用庫分攤成本", en: "Join the pool to share cost" }, good: true, feedback: { zh: "✓ 共用降低單方備庫成本。", en: "✓ Pooling cuts each party's stocking cost." }, eff: { a: 1, b: 100000 } },
    { label: { zh: "堅持各自備庫", en: "Keep separate stocks" }, good: false, feedback: { zh: "△ 成本較高、彈性較差。", en: "△ Higher cost, less flexibility." }, eff: { b: -100000 } } ] },
  { id: "f_training_gap", cat: "F", xp: 50, title: { zh: "技能落差", en: "Skills gap" }, scenario: { zh: "新機型導入，團隊缺乏對應技能。", en: "A new turbine model arrives; the team lacks the skills." }, choices: [
    { label: { zh: "安排原廠訓練與認證", en: "Arrange OEM training & certification" }, good: true, feedback: { zh: "✓ 技能到位才能安全維修。", en: "✓ Skills enable safe, correct repairs." }, eff: { a: 2, b: -150000 } },
    { label: { zh: "邊做邊學", en: "Learn on the job" }, good: false, feedback: { zh: "✗ 不熟新機易誤修受傷。", en: "✗ Unfamiliarity risks errors & injury." }, eff: { s: 1 } } ] },
  { id: "f_local_content", cat: "F", xp: 50, title: { zh: "在地化供應要求", en: "Local-content requirement" }, scenario: { zh: "政策要求提高在地供應比例。", en: "Policy requires higher local-content sourcing." }, choices: [
    { label: { zh: "扶植在地供應鏈、確保品質", en: "Develop local supply with QA" }, good: true, feedback: { zh: "✓ 符合政策又縮短供應鏈。", en: "✓ Meets policy & shortens the supply chain." }, eff: { a: 1, b: -100000 } },
    { label: { zh: "全進口忽視規範", en: "Import all, ignore the rule" }, good: false, feedback: { zh: "✗ 違反政策恐影響許可。", en: "✗ Breaching policy can hit your permit." }, eff: { b: -300000 } } ] },
  { id: "f_vessel_charter", cat: "F", xp: 60, title: { zh: "重吊船租期決策", en: "Heavy-lift charter timing" }, scenario: { zh: "重吊安裝船檔期緊、租金高。", en: "The heavy-lift vessel is in demand & pricey." }, choices: [
    { label: { zh: "整合多項大修共用船期", en: "Bundle major works into one charter" }, good: true, feedback: { zh: "✓ 重吊船昂貴，整合最省。", en: "✓ Heavy-lift is costly — bundle works." }, eff: { a: 3, b: -600000 } },
    { label: { zh: "各別臨時租", en: "Charter ad-hoc each time" }, good: false, feedback: { zh: "✗ 多次租金與檔期風險高。", en: "✗ Repeated charters cost more & risk delays." }, eff: { b: -800000 } } ] },
  { id: "f_quay_crane", cat: "F", xp: 40, title: { zh: "碼頭吊掛資源", en: "Quayside crane resource" }, scenario: { zh: "碼頭吊掛資源排程衝突。", en: "Quayside crane scheduling conflicts arise." }, choices: [
    { label: { zh: "提前預約、錯峰作業", en: "Pre-book & stagger operations" }, good: true, feedback: { zh: "✓ 提前協調避免船等岸。", en: "✓ Pre-coordination avoids vessels waiting." }, eff: { b: -30000 } },
    { label: { zh: "現場再喬", en: "Sort it out on the day" }, good: false, feedback: { zh: "△ 臨時衝突拖延出勤。", en: "△ Last-minute clashes delay sorties." }, eff: { a: -1 } } ] },

  // G
  { id: "g_grid_fault", cat: "G", xp: 70, title: { zh: "電網事故跳脫", en: "Grid fault trip" }, scenario: { zh: "電網側事故造成全場低電壓跳脫。", en: "A grid-side fault trips the whole farm on low voltage." }, choices: [
    { label: { zh: "依 LVRT 程序安全復電", en: "Restore safely per LVRT procedure" }, good: true, feedback: { zh: "✓ 依序復電避免二次衝擊。", en: "✓ Sequenced restart avoids re-stress." }, eff: { a: 2 } },
    { label: { zh: "一次全部併回", en: "Reconnect everything at once" }, good: false, feedback: { zh: "✗ 突波恐再跳脫或損設備。", en: "✗ Inrush can re-trip or damage gear." }, eff: { a: -3, s: 1 } } ] },
  { id: "g_blackstart", cat: "G", xp: 70, title: { zh: "全黑復電", en: "Black-start recovery" }, scenario: { zh: "區域停電，風場須配合黑啟動程序。", en: "A regional blackout requires black-start coordination." }, choices: [
    { label: { zh: "依電網調度逐步併網", en: "Re-energise stepwise with the operator" }, good: true, feedback: { zh: "✓ 與調度協調是復電關鍵。", en: "✓ Coordinating with the operator is key." }, eff: { a: 1 } },
    { label: { zh: "自行搶併", en: "Reconnect on your own" }, good: false, feedback: { zh: "✗ 未協調復電危及電網穩定。", en: "✗ Uncoordinated restart risks the grid." }, eff: { s: 1 } } ] },
  { id: "g_anchor_drag", cat: "G", xp: 70, title: { zh: "船舶走錨", en: "Vessel anchor dragging" }, scenario: { zh: "錨泊船走錨，逼近海纜路由。", en: "An anchored vessel is dragging toward the cable route." }, choices: [
    { label: { zh: "通報並警示船舶移離", en: "Alert authorities & warn the vessel" }, good: true, feedback: { zh: "✓ 走錨勾損海纜後果嚴重。", en: "✓ A dragged anchor can sever cables." }, eff: {} },
    { label: { zh: "觀望", en: "Wait and see" }, good: false, feedback: { zh: "✗ 海纜受損全列停電。", en: "✗ Cable damage blacks out the array." }, eff: { a: -3, s: 1 } } ] },
  { id: "g_debris", cat: "G", xp: 50, title: { zh: "海漂物纏繞", en: "Floating debris" }, scenario: { zh: "大型海漂物纏繞基礎/登靠區。", en: "Large debris tangles the foundation/access area." }, choices: [
    { label: { zh: "清除後再作業", en: "Clear it before working" }, good: true, feedback: { zh: "✓ 纏繞物危及登靠安全。", en: "✓ Debris endangers safe access." }, eff: {} },
    { label: { zh: "繞過直接登靠", en: "Board around it" }, good: false, feedback: { zh: "✗ 暗藏勾掛與滑倒風險。", en: "✗ Hidden snag & slip hazards." }, eff: { s: 1 } } ] },
  { id: "g_near_miss", cat: "G", xp: 60, title: { zh: "虛驚事件回報", en: "Near-miss reporting" }, scenario: { zh: "現場發生一起未致傷的虛驚事件。", en: "A near-miss occurs on site with no injury." }, choices: [
    { label: { zh: "據實通報並檢討改善", en: "Report honestly & improve" }, good: true, feedback: { zh: "✓ 虛驚通報能預防真正事故。", en: "✓ Near-miss reporting prevents real accidents." }, eff: {} },
    { label: { zh: "沒受傷就不報", en: "No injury — don't report" }, good: false, feedback: { zh: "✗ 隱匿讓風險再次發生。", en: "✗ Hiding it lets the risk recur." }, eff: { s: 1 } } ] },
  { id: "g_pollution_report", cat: "G", xp: 50, title: { zh: "環境通報義務", en: "Environmental reporting duty" }, scenario: { zh: "作業產生少量廢棄物需妥善處理。", en: "Work generates waste needing proper disposal." }, choices: [
    { label: { zh: "依規分類回收處理", en: "Sort & dispose per regulation" }, good: true, feedback: { zh: "✓ 合規處理維護環境與商譽。", en: "✓ Compliant disposal protects environment & reputation." }, eff: { b: -20000 } },
    { label: { zh: "就地丟海", en: "Dump it at sea" }, good: false, feedback: { zh: "✗ 海拋廢棄物重罰且違法。", en: "✗ Dumping at sea is illegal & heavily fined." }, eff: { b: -400000, s: 1 } } ] },
  { id: "g_evacuation", cat: "G", xp: 70, title: { zh: "緊急全員撤離", en: "Emergency evacuation" }, scenario: { zh: "天候急轉直下，須全員緊急撤離。", en: "Weather turns fast; full evacuation is required." }, choices: [
    { label: { zh: "依撤離程序有序撤回", en: "Evacuate orderly per procedure" }, good: true, feedback: { zh: "✓ 有序撤離是保命關鍵。", en: "✓ Orderly evacuation saves lives." }, eff: { a: -1 } },
    { label: { zh: "搶完工再撤", en: "Finish the job, then go" }, good: false, feedback: { zh: "✗ 拖延撤離極度危險。", en: "✗ Delaying evacuation is extremely dangerous." }, eff: { s: 3 } } ] },

  // ════════ 擴充批次（第三批）：強調「鑑別判斷」與「取捨型」決策 ════════
  // ── A 故障搶修 ──
  { id: "a_yaw_motor_burn", cat: "A", xp: 60, title: { zh: "偏航馬達燒損", en: "Yaw motor burnout" }, scenario: { zh: "一具偏航馬達冒煙跳脫，其餘馬達仍可動作。", en: "One yaw motor smokes and trips; the others still drive." }, choices: [
    { label: { zh: "隔離故障馬達、更換後校正", en: "Isolate the failed motor, replace & re-align" }, good: true, feedback: { zh: "✓ 帶病續轉會讓其餘馬達過載連鎖燒損。", en: "✓ Running degraded overloads the rest into a cascade." }, eff: { a: 4, b: -200000 } },
    { label: { zh: "減少偏航次數硬撐", en: "Limit yawing and push on" }, good: false, feedback: { zh: "✗ 對風不良吃發電，且風險未除。", en: "✗ Poor tracking costs output and the risk remains." }, eff: { a: -3, s: 1 } } ] },
  { id: "a_conv_leg_trip", cat: "A", xp: 70, title: { zh: "變流器單臂跳脫", en: "Converter single-leg trip" }, scenario: { zh: "冷卻流量正常,但同一橋臂反覆短路保護跳脫。", en: "Coolant flow is normal, yet one bridge leg keeps tripping on desat." }, choices: [
    { label: { zh: "判定為 IGBT 模組劣化、更換模組", en: "Diagnose IGBT module failure & replace it" }, good: true, feedback: { zh: "✓ 冷卻正常卻單臂跳脫,根因在模組本身而非散熱。", en: "✓ Cooling fine but one leg trips → the module itself, not cooling." }, eff: { a: 4, b: -600000 } },
    { label: { zh: "當成冷卻問題清洗散熱器", en: "Treat as cooling, clean the radiator" }, good: false, feedback: { zh: "✗ 誤判根因:單臂跳脫不是整體散熱不足。", en: "✗ Wrong root cause — a single-leg trip isn't a cooling shortfall." }, eff: { a: -3 } } ] },
  { id: "a_gen_winding_heat", cat: "A", xp: 60, title: { zh: "發電機繞組過溫", en: "Generator winding overtemp" }, scenario: { zh: "繞組過溫被迫降載,但振動與激磁均正常。", en: "Winding overtemp forces a derate, but vibration & excitation are normal." }, choices: [
    { label: { zh: "檢修冷卻系統(泵/風扇/水路)", en: "Service the cooling system (pump/fan/loop)" }, good: true, feedback: { zh: "✓ 振動與激磁正常,過溫根因在冷卻。", en: "✓ With vibration & excitation fine, overtemp traces to cooling." }, eff: { a: 3, b: -150000 } },
    { label: { zh: "更換碳刷試試", en: "Swap brushes and see" }, good: false, feedback: { zh: "✗ 碳刷對應激磁火花,與此過溫無關。", en: "✗ Brushes relate to excitation sparking, not this overtemp." }, eff: { a: -2 } } ] },
  { id: "a_cable_pd_arc", cat: "A", xp: 80, title: { zh: "海纜局部放電", en: "Cable partial discharge" }, scenario: { zh: "陣列海纜某段絕緣電阻驟降並偵測到局部放電。", en: "One array-cable section shows a sharp IR drop with partial discharge." }, choices: [
    { label: { zh: "隔離該段、定位並更換接頭", en: "Isolate, locate & replace the joint" }, good: true, feedback: { zh: "✓ 局放是擊穿前兆,先隔離避免全列停電。", en: "✓ PD precedes breakdown — isolate before the array blacks out." }, eff: { a: 2, b: -700000, g: -120 } },
    { label: { zh: "維持送電再觀察", en: "Keep it energised and watch" }, good: false, feedback: { zh: "✗ 絕緣擊穿將釀短路、全列停電。", en: "✗ Breakdown shorts and blacks out the whole array." }, eff: { a: -6, s: 1 } } ] },
  { id: "a_lift_brake_hse", cat: "A", xp: 60, title: { zh: "塔內升降機制動異常", en: "Service-lift brake fault" }, scenario: { zh: "升降機制動異常、限位開關報錯,技師正要上機艙。", en: "Lift brake abnormal & limit-switch error, just as crew prepare to ride up." }, choices: [
    { label: { zh: "停用升降機上鎖、改爬梯,先修復", en: "Lock out the lift, use the ladder, fix first" }, good: true, feedback: { zh: "✓ 安全第一:故障升降機不得載人。", en: "✓ Safety first — never carry crew on a faulty lift." }, eff: { a: -1, b: -110000 } },
    { label: { zh: "照常搭乘上塔趕工", en: "Ride it up anyway to save time" }, good: false, feedback: { zh: "✗ 制動失效＝墜落致命風險。", en: "✗ Brake failure means a fatal fall risk." }, eff: { s: 3 } } ] },

  // ── B 監控判讀（鑑別） ──
  { id: "b_gb_debris_vs_temp", cat: "B", xp: 80, chart: "bars", title: { zh: "齒輪箱:碎屑升、油溫正常", en: "Gearbox: debris up, temp normal" }, scenario: { zh: "齒輪箱油溫正常,但線上監測金屬碎屑驟增、高頻振動上升。", en: "Gearbox oil temp is normal, but online debris spikes with rising HF vibration." }, choices: [
    { label: { zh: "判為內部軸承/齒面磨耗,排程拆檢", en: "Call it internal bearing/gear wear, plan a stripdown" }, good: true, feedback: { zh: "✓ 碎屑＋高頻振動而油溫正常 → 機械磨耗,非散熱。", en: "✓ Debris + HF vibration with normal temp → mechanical wear, not cooling." }, eff: { a: 3, b: -300000 } },
    { label: { zh: "當成散熱問題只換油換濾芯", en: "Treat as cooling, just change oil & filter" }, good: false, feedback: { zh: "✗ 油溫正常即非散熱問題,換油治標不治本。", en: "✗ Normal temp rules out cooling — an oil change misses the cause." }, eff: { a: -3 } } ] },
  { id: "b_thermo_drift", cat: "B", xp: 70, chart: "trend", title: { zh: "熱像接點溫升", en: "Thermography joint heating" }, scenario: { zh: "定期紅外線熱像顯示某電氣接點溫度逐月升高。", en: "Routine thermography shows one electrical joint heating month over month." }, choices: [
    { label: { zh: "停電重鎖接點、檢查氧化", en: "De-energise, re-torque & check oxidation" }, good: true, feedback: { zh: "✓ 鬆接點過熱是電氣火災前兆。", en: "✓ A loose, hot joint is a fire precursor." }, eff: { a: 2, b: -100000 } },
    { label: { zh: "溫度沒破表先不管", en: "Below limit — leave it" }, good: false, feedback: { zh: "✗ 趨勢上升終會失控起火。", en: "✗ A rising trend eventually runs away into a fire." }, eff: { a: -3, s: 1 } } ] },
  { id: "b_acoustic_emission", cat: "B", xp: 70, chart: "spectrum", title: { zh: "聲射監測異常", en: "Acoustic-emission anomaly" }, scenario: { zh: "主軸承聲射(AE)能量上升,潤滑或早期剝離可疑。", en: "Main-bearing acoustic-emission energy rises — lubrication or early spalling suspected." }, choices: [
    { label: { zh: "先補脂,無改善再內視鏡檢查", en: "Re-grease first; borescope if no change" }, good: true, feedback: { zh: "✓ 由簡到繁:先排除潤滑,再查機械損傷。", en: "✓ Simple-to-complex: rule out lube, then inspect for damage." }, eff: { a: 2, b: -120000 } },
    { label: { zh: "直接排大修更換主軸承", en: "Jump straight to a main-bearing overhaul" }, good: false, feedback: { zh: "△ 未先排除潤滑就大修,成本過高。", en: "△ Overhauling before ruling out lube is overkill." }, eff: { b: -800000 } } ] },
  { id: "b_data_gap", cat: "B", xp: 60, title: { zh: "SCADA 資料缺漏", en: "SCADA data gaps" }, scenario: { zh: "某機組 SCADA 資料出現大量缺漏,趨勢無法判讀。", en: "A unit's SCADA data is full of gaps; trends can't be read." }, choices: [
    { label: { zh: "修復資料採集與通訊鏈路", en: "Fix data acquisition & comms link" }, good: true, feedback: { zh: "✓ 沒有可信資料就沒有預知保養。", en: "✓ No trustworthy data, no predictive maintenance." }, eff: { a: 2, b: -80000 } },
    { label: { zh: "用其他機組資料推估", en: "Estimate from other units" }, good: false, feedback: { zh: "△ 代用資料掩蓋本機真實狀態。", en: "△ Proxy data hides this unit's true state." }, eff: { a: -1 } } ] },
  // (b_harmonics 已移除:與 b_harmonic 情境重複,避免同題雙倍抽中率)

  // ── C 預防保養 ──
  { id: "c_torque_audit", cat: "C", xp: 50, title: { zh: "螺栓抽驗稽核", en: "Bolt torque audit" }, scenario: { zh: "品保要求對連接螺栓做抽樣扭力稽核。", en: "QA requires a sample torque audit on connection bolts." }, choices: [
    { label: { zh: "依抽樣計畫稽核並記錄", en: "Audit per sampling plan & record" }, good: true, feedback: { zh: "✓ 抽驗能及早發現系統性鬆動。", en: "✓ Sampling catches systematic loosening early." }, eff: { a: 1, b: -50000 } },
    { label: { zh: "上次沒問題就免了", en: "Skip — last time was fine" }, good: false, feedback: { zh: "✗ 預緊力會隨運轉持續衰減。", en: "✗ Preload keeps relaxing with operation." }, eff: { s: 1 } } ] },
  // (c_dehumidify 已移除:與 c_dehumidifier 情境重複,避免同題雙倍抽中率)
  { id: "c_escape_kit", cat: "C", xp: 40, title: { zh: "逃生與緊急照明檢查", en: "Escape & emergency-light check" }, scenario: { zh: "塔內緊急照明與逃生裝備到期須檢查。", en: "Tower emergency lighting & escape kit are due for inspection." }, choices: [
    { label: { zh: "逐項檢查並更換失效件", en: "Check each item & replace failures" }, good: true, feedback: { zh: "✓ 緊急時刻這些是保命裝備。", en: "✓ In an emergency these are life-saving kit." }, eff: { b: -40000 } },
    { label: { zh: "外觀完好就跳過", en: "Looks ok — skip" }, good: false, feedback: { zh: "✗ 失效要到逃生時才發現就太遲。", en: "✗ Finding failures during an escape is too late." }, eff: { s: 1 } } ] },
  { id: "c_yaw_grease", cat: "C", xp: 40, title: { zh: "偏航齒盤潤滑保養", en: "Yaw ring-gear lubrication" }, scenario: { zh: "偏航齒盤潤滑到期,異音輕微。", en: "Yaw ring-gear lube is due with slight noise." }, choices: [
    { label: { zh: "清潔齒面並重新潤滑", en: "Clean teeth & re-grease" }, good: true, feedback: { zh: "✓ 潤滑不足會加速齒盤磨損與背隙。", en: "✓ Poor lube accelerates ring-gear wear & backlash." }, eff: { a: 1, b: -50000 } },
    { label: { zh: "還能轉就先不保養", en: "Still turns — defer" }, good: false, feedback: { zh: "△ 乾磨將提前報廢齒盤。", en: "△ Dry running prematurely kills the ring gear." }, eff: { a: -1 } } ] },
  { id: "c_conv_filter", cat: "C", xp: 40, title: { zh: "變流器濾網清潔", en: "Converter filter cleaning" }, scenario: { zh: "變流器進氣濾網阻塞、散熱效率下降。", en: "Converter intake filters are clogging; cooling efficiency drops." }, choices: [
    { label: { zh: "清潔/更換濾網,恢復散熱", en: "Clean/replace filters to restore cooling" }, good: true, feedback: { zh: "✓ 散熱衰退是過溫跳脫前兆。", en: "✓ Declining cooling precedes overtemp trips." }, eff: { a: 2, b: -40000 } },
    { label: { zh: "等過溫告警再清", en: "Wait for an overtemp alarm" }, good: false, feedback: { zh: "✗ 屆時已被迫降載或跳機。", en: "✗ By then you're derated or tripped." }, eff: { a: -2 } } ] },

  // ── D 營運決策（取捨） ──
  { id: "d_drone_inspect", cat: "D", xp: 70, title: { zh: "無人機巡檢導入", en: "Drone inspection rollout" }, scenario: { zh: "考慮以無人機取代部分繩索葉片巡檢。", en: "Consider drones to replace some rope-access blade inspections." }, choices: [
    { label: { zh: "導入無人機做例行巡檢、繩索做修補", en: "Drones for routine surveys, rope-access for repairs" }, good: true, feedback: { zh: "✓ 無人機降低高處作業風險與成本。", en: "✓ Drones cut at-height risk and cost." }, eff: { a: 2, b: -100000, s: -1 } },
    { label: { zh: "全面取消人工巡檢", en: "Scrap all manual inspection" }, good: false, feedback: { zh: "△ 無人機看不到細微/內部缺陷。", en: "△ Drones miss fine/internal defects." }, eff: { a: -1 } } ] },
  { id: "d_oem_vs_isp", cat: "D", xp: 80, title: { zh: "原廠 vs 獨立服務商", en: "OEM vs independent service" }, scenario: { zh: "保固期滿,須決定運維由原廠或獨立服務商(ISP)承接。", en: "Post-warranty, choose OEM or an independent service provider (ISP)." }, choices: [
    { label: { zh: "比較成本/響應/備件後綁 KPI 簽約", en: "Compare cost/response/parts, sign with KPIs" }, good: true, feedback: { zh: "✓ 以數據與績效條款選擇最務實。", en: "✓ Data plus KPI terms is the pragmatic choice." }, eff: { a: 2, b: 100000 } },
    { label: { zh: "為省錢直接選最低價", en: "Just pick the cheapest bid" }, good: false, feedback: { zh: "✗ 最低價常伴隨響應慢、備件缺。", en: "✗ The cheapest often means slow response & no parts." }, eff: { a: -2 } } ] },
  { id: "d_battery_eol", cat: "D", xp: 60, title: { zh: "退役電池處理", en: "End-of-life battery disposal" }, scenario: { zh: "大量變槳後備電池達壽命,須妥善處置。", en: "Many pitch backup batteries reach end of life and need disposal." }, choices: [
    { label: { zh: "委合格廠回收、留存紀錄", en: "Recycle via a licensed vendor with records" }, good: true, feedback: { zh: "✓ 合規回收兼顧環境與法遵。", en: "✓ Compliant recycling covers environment & law." }, eff: { b: -80000 } },
    { label: { zh: "堆置倉庫之後再說", en: "Pile them in storage for later" }, good: false, feedback: { zh: "✗ 老化電池有起火與環保風險。", en: "✗ Aging cells pose fire & environmental risk." }, eff: { s: 1 } } ] },
  { id: "d_data_platform", cat: "D", xp: 70, title: { zh: "數據平台投資", en: "Data-platform investment" }, scenario: { zh: "考慮投資集中式運維數據分析平台。", en: "Consider investing in a centralised O&M analytics platform." }, choices: [
    { label: { zh: "先試點驗證效益再擴大", en: "Pilot to prove value, then scale" }, good: true, feedback: { zh: "✓ 試點降低投資風險、驗證 ROI。", en: "✓ A pilot de-risks the spend & proves ROI." }, eff: { a: 2, b: -200000 } },
    { label: { zh: "一次全面導入最新系統", en: "Roll out the newest system everywhere at once" }, good: false, feedback: { zh: "△ 未驗證即全面導入風險高。", en: "△ Org-wide rollout unproven is risky." }, eff: { b: -800000 } } ] },
  { id: "d_hybrid_solar", cat: "D", xp: 60, title: { zh: "風光共構評估", en: "Wind-solar hybrid study" }, scenario: { zh: "考慮在併網點加設太陽能共用饋線。", en: "Consider adding solar sharing the same grid connection." }, choices: [
    { label: { zh: "試算併網容量與互補性再決定", en: "Model capacity & complementarity first" }, good: true, feedback: { zh: "✓ 共用饋線可提高併網利用率。", en: "✓ Sharing the feeder can raise connection use." }, eff: { b: -100000, g: 60 } },
    { label: { zh: "不評估直接擴建", en: "Just build it without analysis" }, good: false, feedback: { zh: "✗ 容量衝突恐互相棄電。", en: "✗ Capacity clashes can curtail both." }, eff: { b: -600000 } } ] },

  // ── E 天候處置 ──
  { id: "e_wind_shear", cat: "E", xp: 60, chart: "radar", title: { zh: "強風切變", en: "Strong wind shear" }, scenario: { zh: "雷達與光達顯示高度間風速梯度劇增,葉片載荷不對稱攀升。", en: "Radar/LiDAR show a steep vertical shear; asymmetric blade loads are climbing." }, choices: [
    { label: { zh: "啟用降載/個別變槳抑制載荷", en: "Derate / use individual-pitch to shed loads" }, good: true, feedback: { zh: "✓ 風切造成不對稱疲勞,抑制載荷可保護結構。", en: "✓ Shear drives asymmetric fatigue — shedding loads protects the structure." }, eff: { a: 1, g: -60 } },
    { label: { zh: "維持滿載拚發電", en: "Stay at full output for revenue" }, good: false, feedback: { zh: "✗ 持續不對稱載荷加速主軸與軸承疲勞。", en: "✗ Sustained asymmetric loads fatigue the shaft & bearings." }, eff: { a: -4, s: 1 } } ] },
  { id: "e_biofouling", cat: "E", xp: 50, title: { zh: "海生物附著", en: "Marine biofouling" }, scenario: { zh: "暖季海生物附著基礎與登靠梯,影響檢測與止滑。", en: "Warm-season fouling coats the foundation & access ladder." }, choices: [
    { label: { zh: "安排清除並檢查防蝕", en: "Schedule cleaning & check corrosion protection" }, good: true, feedback: { zh: "✓ 附著層遮蔽腐蝕、增登靠滑倒風險。", en: "✓ Fouling hides corrosion and makes access slippery." }, eff: { a: 1, b: -80000 } },
    { label: { zh: "不影響發電先不管", en: "No output impact — leave it" }, good: false, feedback: { zh: "△ 滑倒與腐蝕風險被忽視。", en: "△ Slip & corrosion risks get ignored." }, eff: { s: 1 } } ] },
  { id: "e_low_wind_spell", cat: "E", xp: 50, title: { zh: "長期小風期", en: "Prolonged low-wind spell" }, scenario: { zh: "預報連日小風,發電低、海象平穩。", en: "Forecast shows days of low wind: low output, calm seas." }, choices: [
    { label: { zh: "把握平穩海象集中保養", en: "Use the calm window to batch maintenance" }, good: true, feedback: { zh: "✓ 低發電期停機代價最小,正好保養。", en: "✓ Low-output days are the cheapest time to take downtime." }, eff: { a: 3, b: -150000 } },
    { label: { zh: "全員待命等風來", en: "Idle everyone, wait for wind" }, good: false, feedback: { zh: "△ 浪費難得的可作業窗。", en: "△ Wastes a rare workable window." }, eff: { a: -1 } } ] },
  { id: "e_swell_resonance", cat: "E", xp: 60, chart: "radar", title: { zh: "長週期湧浪共振", en: "Long-period swell resonance" }, scenario: { zh: "遠方風暴傳來長週期湧浪,接近運維船的共振週期,頂靠劇烈起伏。", en: "Long-period swell from a distant storm nears the vessel's resonant period; heave at the boat-landing is violent." }, choices: [
    { label: { zh: "暫停登靠,等湧浪週期改變", en: "Suspend access until the swell period shifts" }, good: true, feedback: { zh: "✓ 共振起伏使登靠落差難以掌握,極危險。", en: "✓ Resonant heave makes the access gap unpredictable — very dangerous." }, eff: { a: -1 } },
    { label: { zh: "趁浪間空檔硬登", en: "Time the gaps and board anyway" }, good: false, feedback: { zh: "✗ 長湧浪空檔短且不規則,落海風險高。", en: "✗ Lulls in long swell are short & irregular — high man-overboard risk." }, eff: { s: 2 } } ] },
  { id: "e_drone_wind_limit", cat: "E", xp: 40, title: { zh: "無人機風速上限", en: "Drone wind limit" }, scenario: { zh: "原訂無人機巡檢日,風速接近機型上限。", en: "On a planned drone-survey day, wind nears the airframe limit." }, choices: [
    { label: { zh: "改期至風速合規時段", en: "Reschedule to within wind limits" }, good: true, feedback: { zh: "✓ 超限飛行恐墜機傷及設備。", en: "✓ Flying over-limit risks a crash into equipment." }, eff: {} },
    { label: { zh: "冒風搶飛完成巡檢", en: "Fly anyway to finish the survey" }, good: false, feedback: { zh: "✗ 失控墜機損失大於延期。", en: "✗ A crash costs more than a delay." }, eff: { b: -80000 } } ] },

  // ── F 供應鏈 / 人力 ──
  { id: "f_fx_swing", cat: "F", xp: 50, title: { zh: "匯率波動採購", en: "FX-swing procurement" }, scenario: { zh: "進口大件以外幣計價,匯率劇烈波動。", en: "Big-ticket imports are priced in forex amid sharp swings." }, choices: [
    { label: { zh: "對關鍵採購做匯率避險", en: "Hedge forex on key purchases" }, good: true, feedback: { zh: "✓ 避險穩定成本、利於預算控管。", en: "✓ Hedging stabilises cost & budgeting." }, eff: { b: 100000 } },
    { label: { zh: "賭匯率往有利方向", en: "Bet the rate moves your way" }, good: false, feedback: { zh: "✗ 賭匯率使成本失控。", en: "✗ Betting on FX makes cost uncontrollable." }, eff: { b: -300000 } } ] },
  { id: "f_apprentice", cat: "F", xp: 50, title: { zh: "學徒培訓計畫", en: "Apprenticeship programme" }, scenario: { zh: "資深技師將退休,接班人力不足。", en: "Senior techs are retiring; the succession pipeline is thin." }, choices: [
    { label: { zh: "建立學徒制與師徒傳承", en: "Set up apprenticeships & mentoring" }, good: true, feedback: { zh: "✓ 培訓接班是長期能量的根本。", en: "✓ Training successors secures long-term capacity." }, eff: { a: 1, b: -120000 } },
    { label: { zh: "缺人再臨時外包", en: "Just outsource when short" }, good: false, feedback: { zh: "△ 長期依賴外包成本高、知識外流。", en: "△ Chronic outsourcing is costly & leaks know-how." }, eff: { b: -150000 } } ] },
  { id: "f_handover_gap", cat: "F", xp: 50, title: { zh: "交接班落差", en: "Shift handover gap" }, scenario: { zh: "交接班資訊不全,造成重複作業與遺漏。", en: "Incomplete handovers cause rework and missed items." }, choices: [
    { label: { zh: "導入標準化交接清單", en: "Adopt a standard handover checklist" }, good: true, feedback: { zh: "✓ 結構化交接減少遺漏與重工。", en: "✓ Structured handovers cut omissions & rework." }, eff: { a: 2 } },
    { label: { zh: "口頭交接照舊", en: "Keep verbal handovers" }, good: false, feedback: { zh: "△ 資訊遺漏風險持續。", en: "△ Information keeps falling through the cracks." }, eff: { a: -1 } } ] },
  { id: "f_single_source", cat: "F", xp: 70, title: { zh: "單一供應商風險", en: "Single-source risk" }, scenario: { zh: "關鍵零件僅一家供應商,且交期不穩。", en: "A critical part has just one supplier with shaky lead-times." }, choices: [
    { label: { zh: "開發第二供應源/合格替代件", en: "Qualify a second source / alternative" }, good: true, feedback: { zh: "✓ 雙源化降低斷料停機風險。", en: "✓ Dual-sourcing cuts stock-out downtime risk." }, eff: { a: 2, b: -150000 } },
    { label: { zh: "維持單一來源省事", en: "Stick with the single source" }, good: false, feedback: { zh: "✗ 一旦斷供整場受制。", en: "✗ One disruption holds the whole farm hostage." }, eff: { a: -3 } } ] },
  { id: "f_ppe_shortage", cat: "F", xp: 40, title: { zh: "防護具短缺", en: "PPE shortage" }, scenario: { zh: "個人防護與墜落防護裝備庫存不足。", en: "Personal & fall-protection equipment stock runs low." }, choices: [
    { label: { zh: "暫停受影響作業、優先補齊 PPE", en: "Pause affected work & restock PPE first" }, good: true, feedback: { zh: "✓ 無合格防護不得作業。", en: "✓ No work without proper protection." }, eff: { a: -1, b: -40000 } },
    { label: { zh: "共用湊合先上工", en: "Share gear and get going" }, good: false, feedback: { zh: "✗ 防護不足＝直接安全事故。", en: "✗ Inadequate protection invites accidents." }, eff: { s: 2 } } ] },

  // ── G 突發 ──
  { id: "g_lightning_hit", cat: "G", xp: 70, title: { zh: "運轉中遭雷擊", en: "Lightning strike in operation" }, scenario: { zh: "一台運轉中機組剛遭雷擊,接閃系統告警、可能起火或損傷。", en: "An operating unit just took a lightning strike; the LPS alarms and fire/damage is possible." }, choices: [
    { label: { zh: "遠端停機、確認無火後派員檢查", en: "Remote-stop, confirm no fire, then inspect" }, good: true, feedback: { zh: "✓ 先確保無火再進場,避免人員涉險。", en: "✓ Confirm no fire before entry to keep crews safe." }, eff: { a: 1, b: -100000 } },
    { label: { zh: "立即派員登塔查看", en: "Send crew up immediately" }, good: false, feedback: { zh: "✗ 雷擊後恐有殘餘起火與帶電風險。", en: "✗ Post-strike there may be residual fire & live hazards." }, eff: { s: 2 } } ] },
  // (g_medical_evac 已移除:與 g_medical 情境重複,避免同題雙倍抽中率)
  { id: "g_unauth_vessel", cat: "G", xp: 50, title: { zh: "不明船舶闖入", en: "Unauthorised vessel intrusion" }, scenario: { zh: "不明船舶進入風場安全區、逼近作業船。", en: "An unknown vessel enters the safety zone near work boats." }, choices: [
    { label: { zh: "通報海巡並廣播警示", en: "Notify the coastguard & broadcast a warning" }, good: true, feedback: { zh: "✓ 安全區管制須即時通報。", en: "✓ Safety-zone control requires prompt reporting." }, eff: {} },
    { label: { zh: "自行驅離", en: "Chase it off yourself" }, good: false, feedback: { zh: "✗ 自行處置恐釀碰撞與衝突。", en: "✗ Confronting it risks collision & escalation." }, eff: { s: 1 } } ] },
  { id: "g_confined_gas", cat: "G", xp: 70, title: { zh: "輪轂密閉空間氣體警報", en: "Hub confined-space gas alarm" }, scenario: { zh: "技師於輪轂內作業時個人氣體偵測器警報。", en: "A technician's personal gas detector alarms while working inside the hub." }, choices: [
    { label: { zh: "立即撤離、通風後重測再進入", en: "Evacuate at once, ventilate & re-test before re-entry" }, good: true, feedback: { zh: "✓ 密閉空間氣體警報必須先撤離。", en: "✓ A confined-space gas alarm means evacuate first." }, eff: { a: -1 } },
    { label: { zh: "忍一下把工序做完", en: "Tough it out to finish the task" }, good: false, feedback: { zh: "✗ 缺氧/毒氣在密閉空間會快速致命。", en: "✗ Oxygen deficiency / toxic gas kills fast in confined spaces." }, eff: { s: 3 } } ] },
  { id: "g_subsea_snag", cat: "G", xp: 70, title: { zh: "海底纜線勾掛", en: "Subsea cable snag" }, scenario: { zh: "施工船作業時疑似勾掛到陣列海纜。", en: "A work vessel may have snagged an array cable during operations." }, choices: [
    { label: { zh: "停止動作、檢測海纜完整性", en: "Halt, then survey cable integrity" }, good: true, feedback: { zh: "✓ 勾掛恐傷絕緣,先檢測再續作。", en: "✓ A snag may harm insulation — survey before continuing." }, eff: { a: -1, b: -200000 } },
    { label: { zh: "繼續作業之後再查", en: "Keep working, check later" }, good: false, feedback: { zh: "✗ 帶傷海纜恐短路全列停電。", en: "✗ A damaged cable can short the whole array." }, eff: { a: -4, s: 1 } } ] },
  { id: "g_cyber_alert", cat: "G", xp: 70, title: { zh: "控制系統資安警示", en: "Control-system cyber alert" }, scenario: { zh: "SCADA/控制網路偵測到異常存取嘗試。", en: "The SCADA/control network detects anomalous access attempts." }, choices: [
    { label: { zh: "隔離受影響網段、啟動資安程序", en: "Isolate affected segments & invoke IR plan" }, good: true, feedback: { zh: "✓ 關鍵基礎設施須即時隔離應變。", en: "✓ Critical infrastructure needs immediate isolation & response." }, eff: { a: -1 } },
    { label: { zh: "先觀察不動作", en: "Just watch for now" }, good: false, feedback: { zh: "✗ 拖延使入侵者擴大控制。", en: "✗ Delay lets intruders expand control." }, eff: { a: -3, s: 1 } } ] },

  // ════════ #3 直升機進場 / 電網限電(真實運維權衡判斷) ════════
  // ── 直升機進場(Helicopter access):封船海象/遠海/關鍵停機時的唯一進場手段,但成本高、天候/日照/人數受限 ──
  { id: "e_heli_access", cat: "E", xp: 90, chart: "radar", title: { zh: "直升機吊掛進場", en: "Helicopter hoist access" }, scenario: { zh: "連日大浪超過 CTV/SOV 登靠限值,一台關鍵大型機組已停機數日,發電損失持續累積。", en: "Days of heavy swell exceed CTV/SOV access limits while a critical large unit has been down for days, bleeding generation." }, choices: [
    { label: { zh: "動用直升機吊掛運送技師進場搶修", en: "Hoist technicians in by helicopter to repair" }, good: true, feedback: { zh: "✓ 封船時直升機是唯一進場手段,關鍵停機值得這筆成本。", en: "✓ When boats are grounded, a helicopter is the only way in — worth the cost for a critical outage." }, eff: { a: 6, b: -1_200_000 } },
    { label: { zh: "等海象改善再以 CTV 進場", en: "Wait for calmer seas, access by CTV" }, good: false, feedback: { zh: "△ 省成本但持續累積停機損失,關鍵機組不宜久拖。", en: "△ Saves cost but downtime losses pile up — a critical unit shouldn't wait." }, eff: { g: -240 } },
    { label: { zh: "強行派 CTV 頂浪登靠", en: "Force a CTV transfer in the swell" }, good: false, feedback: { zh: "✗ 超過登靠限值硬上,人員落海風險極高。", en: "✗ Forcing access beyond limits risks a man-overboard." }, eff: { s: 2, a: -2 } } ] },
  { id: "d_heli_costbenefit", cat: "D", xp: 80, title: { zh: "直升機 vs 停機損失", en: "Helicopter vs downtime cost" }, scenario: { zh: "評估是否包直升機:單次成本高昂,但可省下數日停機的發電損失。", en: "Decide whether to charter a helicopter: a high one-off cost, but it saves days of lost generation." }, choices: [
    { label: { zh: "比較直升機成本與停機損失再決定", en: "Compare charter cost against downtime loss first" }, good: true, feedback: { zh: "✓ 成本效益分析:損失大於包機費才動用,是專業決策。", en: "✓ Cost-benefit: charter only when the loss outweighs the fee — the professional call." }, eff: { a: 2, b: -300_000 } },
    { label: { zh: "不論成本一律包直升機求快", en: "Always charter to go fast, cost aside" }, good: false, feedback: { zh: "✗ 連小故障都包機,運維成本將失控。", en: "✗ Chartering even for minor faults blows the O&M budget." }, eff: { b: -1_500_000 } },
    { label: { zh: "一律拒用直升機、只靠船", en: "Never use helicopters — boats only" }, good: false, feedback: { zh: "✗ 忽略關鍵停機的機會成本,封船期將大失血。", en: "✗ Ignoring the opportunity cost bleeds you dry when boats are grounded." }, eff: { g: -180 } } ] },
  { id: "f_heli_logistics", cat: "F", xp: 70, title: { zh: "關鍵備品空運上工", en: "Airlift a critical spare" }, scenario: { zh: "遠海風場關鍵備品缺料,海路運補需數日,直升機可當日吊運。", en: "A far-shore farm lacks a critical spare; sea resupply takes days, but a helicopter can sling it in today." }, choices: [
    { label: { zh: "關鍵停機件直升機吊運、非急件併船運", en: "Airlift the outage-critical part; bundle the rest by boat" }, good: true, feedback: { zh: "✓ 分級調度:急件空運、常備件船運,效率與成本兼顧。", en: "✓ Tiered logistics: airlift the urgent, ship the routine — efficient and economical." }, eff: { a: 3, b: -400_000 } },
    { label: { zh: "所有備品全改直升機運補", en: "Switch all resupply to helicopter" }, good: false, feedback: { zh: "✗ 全空運成本爆炸,常備件不需如此。", en: "✗ Airlifting everything explodes cost — routine stock doesn't need it." }, eff: { b: -1_200_000 } },
    { label: { zh: "全部等船運就好", en: "Just wait for the boat for everything" }, good: false, feedback: { zh: "✗ 關鍵停機被拉長,發電損失遠超空運費。", en: "✗ The critical outage drags on; lost output dwarfs the airlift fee." }, eff: { a: -3, g: -180 } } ] },
  { id: "e_heli_window", cat: "E", xp: 70, chart: "radar", title: { zh: "直升機作業限值", en: "Helicopter operating limits" }, scenario: { zh: "直升機吊掛/降落受風速、能見度、日照與亂流限值約束,今日天候逼近上限。", en: "Helicopter hoist/landing is bound by wind, visibility, daylight and turbulence limits — today's weather is near the ceiling." }, choices: [
    { label: { zh: "嚴格按作業限值,逾限即取消改期", en: "Hold the limits strictly; cancel & reschedule if exceeded" }, good: true, feedback: { zh: "✓ 直升機作業的安全紅線不可逾越,改期是正解。", en: "✓ The safety envelope is a hard line — rescheduling is correct." }, eff: { a: -1 } },
    { label: { zh: "風速逼近上限仍照飛趕工", en: "Fly anyway with wind near the limit" }, good: false, feedback: { zh: "✗ 直升機海上事故後果極嚴重,絕不可賭限值。", en: "✗ Offshore heli accidents are catastrophic — never gamble the envelope." }, eff: { s: 2 } },
    { label: { zh: "天黑後打燈硬飛搶完", en: "Push past dusk under lights to finish" }, good: false, feedback: { zh: "✗ 逾越日照限值作業,風險不可接受。", en: "✗ Operating past the daylight limit is an unacceptable risk." }, eff: { s: 1 } } ] },
  // ── 電網限電 / 市場訊號(Grid curtailment):併網規範、負電價、低電壓穿越的真實權衡 ──
  { id: "d_neg_price", cat: "D", xp: 70, chart: "trend", title: { zh: "負電價時段", en: "Negative price period" }, scenario: { zh: "即時電力市場出現負電價,此時併網滿發反而要付費上網。", en: "The spot market goes negative — generating at full load now means paying to export." }, choices: [
    { label: { zh: "依市場訊號主動降載/暫停併網", en: "Curtail or pause export per the market signal" }, good: true, feedback: { zh: "✓ 負電價時停發避免倒貼,順市場訊號才划算。", en: "✓ Curtailing in negative prices avoids paying to generate — follow the signal." }, eff: { g: -60, b: 150_000 } },
    { label: { zh: "維持滿載硬發", en: "Hold full output regardless" }, good: false, feedback: { zh: "✗ 負電價滿發等於倒貼上網費,虧損最大。", en: "✗ Full output at negative prices means paying the most to export — maximum loss." }, eff: { b: -500_000 } } ] },
  { id: "d_curtail_comp", cat: "D", xp: 70, title: { zh: "限電補償申請", en: "Curtailment compensation" }, scenario: { zh: "電網因線路檢修要求風場限電,併網合約載有補償條款。", en: "The grid orders curtailment for line maintenance; the connection deal has a compensation clause." }, choices: [
    { label: { zh: "配合限電並依約留證申請補償", en: "Comply, document, and claim per contract" }, good: true, feedback: { zh: "✓ 合規限電＋依約求償,把外部限電的損失要回來。", en: "✓ Comply and claim — recover the loss the curtailment imposed on you." }, eff: { g: -120, b: 250_000 } },
    { label: { zh: "配合限電但未留證、不申請", en: "Comply but keep no records, file nothing" }, good: false, feedback: { zh: "△ 喪失應得補償,白白吸收損失。", en: "△ Forfeits the compensation you were owed." }, eff: { g: -120 } },
    { label: { zh: "拒絕限電、維持滿載", en: "Refuse curtailment, stay at full output" }, good: false, feedback: { zh: "✗ 違反電網調度指令恐受罰、甚至被斷併網資格。", en: "✗ Defying dispatch risks penalties and even losing grid access." }, eff: { b: -800_000, s: 1 } } ] },
  { id: "g_grid_voltage_dip", cat: "G", xp: 80, title: { zh: "電網電壓驟降(FRT)", en: "Grid voltage dip (FRT)" }, scenario: { zh: "電網側事故造成併接點電壓瞬間驟降,機組面臨保護跳脫風險。", en: "A grid-side fault sags the point-of-connection voltage; units risk protective trips." }, choices: [
    { label: { zh: "確認 LVRT/FRT 設定符合併網規範、維持併網", en: "Verify LVRT/FRT settings meet grid code; ride through" }, good: true, feedback: { zh: "✓ 故障穿越支撐電網、避免全場同時掉網惡化事故。", en: "✓ Fault ride-through supports the grid and avoids a mass disconnection." }, eff: { a: 1 } },
    { label: { zh: "讓全場立即跳脫離網最安全", en: "Let the whole farm trip offline to be safe" }, good: false, feedback: { zh: "✗ 大量機組同時離網會惡化電網擾動,違反併網規範。", en: "✗ Mass simultaneous disconnection worsens the disturbance and breaches grid code." }, eff: { g: -120, s: 1 } },
    { label: { zh: "調鬆保護門檻避免跳脫", en: "Loosen protection thresholds to avoid trips" }, good: false, feedback: { zh: "✗ 擅改保護設定恐損壞電力電子、危及安全。", en: "✗ Tampering with protection can destroy power electronics and endanger safety." }, eff: { b: -500_000, s: 1 } } ] },
  { id: "d_curtail_maint", cat: "D", xp: 60, title: { zh: "順勢限電維修", en: "Maintenance during curtailment" }, scenario: { zh: "電網預告明日某時段限電,正好有數件待排維修。", en: "The grid pre-announces a curtailment window tomorrow, and several repairs are queued." }, choices: [
    { label: { zh: "把停機維修排進限電時段執行", en: "Schedule the downtime into the curtailment window" }, good: true, feedback: { zh: "✓ 限電本就少發,順勢維修幾乎零額外發電損失。", en: "✓ Output is already curtailed — repairing then costs almost no extra generation." }, eff: { a: 3 } },
    { label: { zh: "限電時段照常發電、維修另找時段", en: "Keep exporting during curtailment; repair elsewhere" }, good: false, feedback: { zh: "△ 浪費了一個免費的停機窗,維修還要再吃別的發電。", en: "△ Wastes a free downtime window and spends real output later." }, eff: { a: -1, g: -60 } } ] },
];

export interface TaskInstance {
  template: TaskTemplate;
  unit: string; // 隨機機組編號
}

// 內建 + 匯入情境包(#80)的完整任務池。無匯入時 === TASKS（行為與測試不變）。
export function allTasks(): TaskTemplate[] {
  const imported = getImportedTasks();
  return imported.length ? TASKS.concat(imported) : TASKS;
}

// 產生一筆任務（隨機模板 + 機組編號）。可傳入 seed 索引以利重現。
export function generateTask(seed?: number): TaskInstance {
  const pool = allTasks();
  const idx = seed === undefined ? Math.floor(Math.random() * pool.length) : seed % pool.length;
  const n = 1 + Math.floor(Math.random() * 40);
  const unit = "CH-" + String(n).padStart(2, "0");
  return { template: pool[idx], unit };
}
