import type { I18n } from "../game/systems/types";

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
];

export interface TaskInstance {
  template: TaskTemplate;
  unit: string; // 隨機機組編號
}

// 產生一筆任務（隨機模板 + 機組編號）。可傳入 seed 索引以利重現。
export function generateTask(seed?: number): TaskInstance {
  const idx = seed === undefined ? Math.floor(Math.random() * TASKS.length) : seed % TASKS.length;
  const n = 1 + Math.floor(Math.random() * 40);
  const unit = "CH-" + String(n).padStart(2, "0");
  return { template: TASKS[idx], unit };
}
