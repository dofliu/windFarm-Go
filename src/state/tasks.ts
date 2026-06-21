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
export interface TaskTemplate {
  id: string;
  cat: TaskCat;
  title: I18n;
  scenario: I18n;
  xp: number;
  choices: TaskChoice[];
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
    id: "b_gearbox_trend", cat: "B", xp: 80,
    title: { zh: "齒輪箱溫度緩升", en: "Gearbox temp creeping up" },
    scenario: { zh: "SCADA 顯示齒輪箱油溫近兩週呈緩升趨勢，尚未告警。", en: "SCADA shows gearbox oil temp slowly rising over 2 weeks, no alarm yet." },
    choices: [
      { label: { zh: "提前安排換油與濾芯檢查", en: "Schedule oil change & filter check early" }, good: true, feedback: { zh: "✓ 預知保養：趨勢即介入，避免演變成停機。", en: "✓ Predictive: act on the trend before it becomes downtime." }, eff: { a: 3, b: -200000 } },
      { label: { zh: "持續監控、設更嚴告警門檻", en: "Keep monitoring with tighter alarm" }, good: true, feedback: { zh: "✓ 可接受：成本低，但需確實追蹤。", en: "✓ Acceptable: low cost, but must track diligently." }, eff: { a: 1 } },
      { label: { zh: "忽略，還沒告警", en: "Ignore — no alarm yet" }, good: false, feedback: { zh: "✗ 錯失預兆，後續恐釀大修。", en: "✗ Missing the precursor can lead to a major overhaul." }, eff: { a: -5, s: 1 } },
    ],
  },
  {
    id: "b_vib_bpfi", cat: "B", xp: 80,
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
    id: "e_typhoon", cat: "E", xp: 100,
    title: { zh: "颱風警報", en: "Typhoon warning" },
    scenario: { zh: "強烈颱風逼近，預估陣風遠超切出風速。", en: "A strong typhoon approaches; gusts will far exceed cut-out." },
    choices: [
      { label: { zh: "提前順槳停機、鎖定偏航", en: "Feather, shut down & lock yaw early" }, good: true, feedback: { zh: "✓ 安全第一：超切出風速應停機保護機組。", en: "✓ Safety first: shut down above cut-out to protect units." }, eff: { a: 2, g: -240 } },
      { label: { zh: "限轉降載、邊觀察", en: "Derate & watch" }, good: false, feedback: { zh: "△ 風速突增來不及反應，風險高。", en: "△ Gust spikes may outpace reaction — risky." }, eff: { a: -4, s: 1 } },
      { label: { zh: "維持滿載搶發電", en: "Stay at full output for revenue" }, good: false, feedback: { zh: "✗ 超速/結構受損風險極高，得不償失。", en: "✗ Overspeed/structural damage risk far outweighs revenue." }, eff: { a: -10, s: 2, b: -1000000 } },
    ],
  },
  {
    id: "e_thunderstorm", cat: "E", xp: 60,
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
