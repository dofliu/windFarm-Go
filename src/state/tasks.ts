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
