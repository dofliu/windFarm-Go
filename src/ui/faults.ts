import type { I18n } from "../game/systems/types";
import type { Quest, Discipline } from "../state/game";

// 故障題庫（B1/B2）：每個故障 = SCADA 告警 + 診斷測驗 + SOP 步驟
export interface Fault {
  id: string;
  name: I18n; // 主告警名稱
  severityTemp: I18n; // 紅色嚴重告警文字
  warns: [I18n, I18n]; // 兩個琥珀警戒 chip
  quiz: { question: I18n; options: I18n[]; correct: number; ok: I18n; no: I18n };
  sop: I18n[]; // 5 步驟（前兩步預設完成）
  knowledge_point: string;
  part: string; // 完成維修所需的必備備品 id（對應 data.ts PARTS）
  discipline: Discipline; // 需對應科別的技師（#27）
}

export const FAULTS: Record<string, Fault> = {
  gearbox_overheat: {
    id: "gearbox_overheat",
    name: { zh: "齒輪箱油溫過高", en: "Gearbox oil overheat" },
    severityTemp: { zh: "齒輪箱油溫過高 78°C", en: "Gearbox oil temp 78°C" },
    warns: [
      { zh: "警戒 · 發電機振動", en: "Warn · Gen vibration" },
      { zh: "警戒 · 濾芯壓差", en: "Warn · Filter ΔP" },
    ],
    quiz: {
      question: { zh: "齒輪箱油溫持續升高，下列何者應「最先」排查？", en: "Gearbox oil temp keeps rising — what should you check FIRST?" },
      options: [
        { zh: "A. 變槳軸承潤滑脂量", en: "A. Pitch bearing grease level" },
        { zh: "B. 潤滑油油位與油質", en: "B. Lube oil level & condition" },
        { zh: "C. 塔筒地腳螺栓扭力", en: "C. Tower foundation bolt torque" },
        { zh: "D. 偏航煞車片間隙", en: "D. Yaw brake pad clearance" },
      ],
      correct: 1,
      ok: { zh: "✓ 正確！油位過低或油質劣化使潤滑與散熱下降，是首要排查項。", en: "✓ Correct! Low level / degraded oil reduces lubrication & cooling — check first." },
      no: { zh: "✗ 再想想：齒輪箱油溫異常，應先從潤滑與散熱系統著手。", en: "✗ Think again: for gearbox overheat, start with lubrication & cooling." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "檢查潤滑油位與油質", en: "Check lube oil level & quality" },
      { zh: "更換濾芯並補充齒輪油", en: "Replace filter & top up gear oil" },
      { zh: "復歸測試並回報 SCADA", en: "Reset test & report to SCADA" },
    ],
    knowledge_point: "gearbox_thermal",
    part: "gearbox_oil",
    discipline: "mechanical",
  },
  yaw_misalign: {
    id: "yaw_misalign",
    name: { zh: "偏航失準告警", en: "Yaw misalignment" },
    severityTemp: { zh: "偏航位置偏差 +12°", en: "Yaw position error +12°" },
    warns: [
      { zh: "警戒 · 偏航電機電流高", en: "Warn · Yaw motor current" },
      { zh: "警戒 · 風向標跳動", en: "Warn · Vane jitter" },
    ],
    quiz: {
      question: { zh: "風機無法迎風、偏航回授偏差，最可能原因為？", en: "Turbine won't face wind, yaw feedback off — most likely cause?" },
      options: [
        { zh: "A. 偏航煞車未完全釋放", en: "A. Yaw brake not fully released" },
        { zh: "B. 葉片表面結冰", en: "B. Blade surface icing" },
        { zh: "C. 變流器過溫", en: "C. Converter overtemp" },
        { zh: "D. 塔筒螺栓鬆動", en: "D. Loose tower bolts" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確！煞車未釋放使齒盤卡滯，回授與指令產生偏差。", en: "✓ Correct! An unreleased brake jams the ring gear, causing the deviation." },
      no: { zh: "✗ 偏航回授偏差，應先檢查偏航煞車與齒盤定位。", en: "✗ For yaw deviation, check the yaw brake & ring-gear alignment first." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "確認偏航煞車液壓完全洩除", en: "Confirm yaw brake hydraulic released" },
      { zh: "釋放卡滯煞車片並潤滑齒盤", en: "Free stuck pads & lube ring gear" },
      { zh: "複歸定位並回報 SCADA", en: "Re-home position & report to SCADA" },
    ],
    knowledge_point: "yaw_brake",
    part: "yaw_motor",
    discipline: "control",
  },
  gen_vibration: {
    id: "gen_vibration",
    name: { zh: "發電機振動異常", en: "Generator vibration" },
    severityTemp: { zh: "發電機振動 RMS 超標", en: "Generator vibration RMS high" },
    warns: [
      { zh: "警戒 · 軸承溫度上升", en: "Warn · Bearing temp rising" },
      { zh: "警戒 · 噪音增加", en: "Warn · Noise up" },
    ],
    quiz: {
      question: { zh: "發電機振動 FFT 在 BPFI 特徵頻率出現突波，指向？", en: "Vibration FFT spikes at BPFI frequency — indicates?" },
      options: [
        { zh: "A. 軸承內環故障", en: "A. Bearing inner-race fault" },
        { zh: "B. 葉片不平衡", en: "B. Blade imbalance" },
        { zh: "C. 電網諧波", en: "C. Grid harmonics" },
        { zh: "D. 偏航誤動作", en: "D. Yaw malfunction" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確！BPFI 特徵頻率突波是軸承內環故障的典型指紋。", en: "✓ Correct! A BPFI spike is the classic signature of an inner-race fault." },
      no: { zh: "✗ BPFI = Ball Pass Frequency Inner，對應軸承內環。", en: "✗ BPFI = Ball Pass Frequency Inner — it maps to the bearing inner race." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "採集振動頻譜定位故障軸承", en: "Capture vibration spectrum to locate bearing" },
      { zh: "更換軸承並校正對心", en: "Replace bearing & re-align" },
      { zh: "復歸測試並回報 SCADA", en: "Reset test & report to SCADA" },
    ],
    knowledge_point: "vibration_bpfi",
    part: "pitch_bearing",
    discipline: "mechanical",
  },
  pitch_fault: {
    id: "pitch_fault",
    name: { zh: "變槳系統故障", en: "Pitch system fault" },
    severityTemp: { zh: "變槳無法作動", en: "Pitch inoperative" },
    warns: [
      { zh: "警戒 · 後備電池電壓低", en: "Warn · Backup battery low" },
      { zh: "警戒 · 轉速偏高", en: "Warn · Overspeed" },
    ],
    quiz: {
      question: { zh: "強風下變槳無法順槳停機，最該優先確認？", en: "Pitch can't feather to stop in high wind — check first?" },
      options: [
        { zh: "A. 變槳後備電池/超級電容", en: "A. Pitch backup battery / supercap" },
        { zh: "B. 海纜接頭", en: "B. Subsea cable joint" },
        { zh: "C. 齒輪箱油位", en: "C. Gearbox oil level" },
        { zh: "D. 偏航電機", en: "D. Yaw motor" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確！失電時靠後備電源順槳，電池失效將無法安全停機。", en: "✓ Correct! Feathering relies on backup power; a dead battery prevents safe stop." },
      no: { zh: "✗ 變槳安全停機依賴後備電源，先查電池/超級電容。", en: "✗ Safe feathering depends on backup power — check the battery/supercap." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "量測變槳後備電池電壓", en: "Measure pitch backup battery voltage" },
      { zh: "更換電池模組並自檢", en: "Replace battery module & self-test" },
      { zh: "順槳測試並回報 SCADA", en: "Feather test & report to SCADA" },
    ],
    knowledge_point: "pitch_backup",
    part: "hydraulic_oil",
    discipline: "control",
  },
  converter_fault: {
    id: "converter_fault",
    name: { zh: "變流器過溫跳脫", en: "Converter overtemp trip" },
    severityTemp: { zh: "變流器 IGBT 過溫", en: "Converter IGBT overtemp" },
    warns: [
      { zh: "警戒 · 冷卻水流量低", en: "Warn · Coolant flow low" },
      { zh: "警戒 · 輸出功率受限", en: "Warn · Power curtailed" },
    ],
    quiz: {
      question: { zh: "變流器反覆過溫跳脫，最可能的根因？", en: "Converter repeatedly trips on overtemp — root cause?" },
      options: [
        { zh: "A. 冷卻系統流量不足/堵塞", en: "A. Cooling flow insufficient / blocked" },
        { zh: "B. 葉片裂紋", en: "B. Blade crack" },
        { zh: "C. 偏航齒盤磨損", en: "C. Yaw gear wear" },
        { zh: "D. 風速計故障", en: "D. Anemometer fault" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確！IGBT 過溫多源於冷卻流量不足或散熱阻塞。", en: "✓ Correct! IGBT overtemp usually stems from low coolant flow or blocked cooling." },
      no: { zh: "✗ 變流器過溫先查冷卻系統流量與散熱。", en: "✗ For converter overtemp, check the cooling flow & heat path first." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "檢查冷卻泵與管路流量", en: "Check coolant pump & loop flow" },
      { zh: "清理散熱器/更換濾網", en: "Clean radiator / replace filter" },
      { zh: "復歸測試並回報 SCADA", en: "Reset test & report to SCADA" },
    ],
    knowledge_point: "converter_cooling",
    part: "converter",
    discipline: "electrical",
  },

  // ───────── 擴充故障型錄：同一元件可有不同根因，正解分散，避免「答案都差不多」 ─────────
  gearbox_bearing_wear: {
    id: "gearbox_bearing_wear",
    name: { zh: "齒輪箱軸承磨耗", en: "Gearbox bearing wear" },
    severityTemp: { zh: "齒輪箱金屬碎屑警報", en: "Gearbox metal-particle alarm" },
    warns: [
      { zh: "警戒 · 油液金屬含量高", en: "Warn · Oil metal content" },
      { zh: "警戒 · 高頻振動", en: "Warn · HF vibration" },
    ],
    quiz: {
      question: { zh: "齒輪箱油溫正常，但線上油液監測金屬碎屑驟增、伴隨高頻振動，最可能？", en: "Gearbox oil temp normal but online debris count spikes with HF vibration — most likely?" },
      options: [
        { zh: "A. 潤滑油位過低", en: "A. Low lube oil level" },
        { zh: "B. 偏航煞車卡滯", en: "B. Yaw brake stuck" },
        { zh: "C. 內部軸承/齒面剝離磨耗", en: "C. Internal bearing / gear-tooth spalling" },
        { zh: "D. 變流器諧波", en: "D. Converter harmonics" },
      ],
      correct: 2,
      ok: { zh: "✓ 正確！金屬碎屑＋高頻振動是齒面/軸承剝離的指紋,需停機更換。", en: "✓ Correct! Debris + HF vibration is the signature of gear/bearing spalling — stop and replace." },
      no: { zh: "✗ 油溫正常排除散熱問題;金屬碎屑指向內部機械磨耗。", en: "✗ Normal temp rules out cooling; debris points to internal mechanical wear." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "採集油樣與振動頻譜定位", en: "Sample oil & capture spectrum to locate" },
      { zh: "更換受損軸承並沖洗油路", en: "Replace damaged bearing & flush oil loop" },
      { zh: "復歸測試並回報 SCADA", en: "Reset test & report to SCADA" },
    ],
    knowledge_point: "gearbox_wear",
    part: "main_bearing",
    discipline: "mechanical",
  },
  yaw_gear_wear: {
    id: "yaw_gear_wear",
    name: { zh: "偏航齒盤磨損", en: "Yaw gear wear" },
    severityTemp: { zh: "偏航時異音與背隙過大", en: "Yaw noise & excessive backlash" },
    warns: [
      { zh: "警戒 · 偏航異音", en: "Warn · Yaw noise" },
      { zh: "警戒 · 齒面金屬屑", en: "Warn · Gear swarf" },
    ],
    quiz: {
      question: { zh: "偏航可動但有明顯異音與背隙,煞車液壓正常,最該檢查?", en: "Yaw moves but with loud noise & backlash, brake hydraulics normal — check what?" },
      options: [
        { zh: "A. 後備電池電壓", en: "A. Backup battery voltage" },
        { zh: "B. 偏航齒輪/齒盤磨損與潤滑", en: "B. Yaw gear / ring-gear wear & lubrication" },
        { zh: "C. IGBT 散熱", en: "C. IGBT heat sink" },
        { zh: "D. 葉片角度", en: "D. Blade pitch angle" },
      ],
      correct: 1,
      ok: { zh: "✓ 正確!煞車正常時的異音/背隙多為齒盤磨損與潤滑不足,屬機械維修。", en: "✓ Correct! With brakes fine, noise/backlash points to ring-gear wear & poor lubrication — a mechanical fix." },
      no: { zh: "✗ 此為偏航的機械磨損面(齒盤),與控制/煞車問題不同。", en: "✗ This is the mechanical wear path of yaw (ring gear), distinct from a control/brake issue." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "檢查齒盤齒面磨損與背隙", en: "Inspect ring-gear teeth & backlash" },
      { zh: "更換偏航齒輪組並重新潤滑", en: "Replace yaw gear set & re-grease" },
      { zh: "校正定位並回報 SCADA", en: "Re-align & report to SCADA" },
    ],
    knowledge_point: "yaw_gear",
    part: "yaw_gear",
    discipline: "mechanical",
  },
  gen_brush_wear: {
    id: "gen_brush_wear",
    name: { zh: "發電機碳刷/集電環異常", en: "Generator brush / slip-ring fault" },
    severityTemp: { zh: "集電環火花與碳粉堆積", en: "Slip-ring sparking & carbon dust" },
    warns: [
      { zh: "警戒 · 激磁電流跳動", en: "Warn · Excitation current jitter" },
      { zh: "警戒 · 碳粉堆積", en: "Warn · Carbon dust" },
    ],
    quiz: {
      question: { zh: "發電機激磁不穩、集電環有火花與碳粉,最先處理?", en: "Unstable excitation with slip-ring sparking & carbon dust — address first?" },
      options: [
        { zh: "A. 更換磨耗碳刷、清潔集電環", en: "A. Replace worn brushes & clean slip-ring" },
        { zh: "B. 補充齒輪油", en: "B. Top up gear oil" },
        { zh: "C. 鎖緊塔基螺栓", en: "C. Torque tower bolts" },
        { zh: "D. 更換風速計", en: "D. Replace anemometer" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確!火花/碳粉＋激磁跳動是碳刷磨耗與集電環髒污的典型表現。", en: "✓ Correct! Sparking/dust + excitation jitter is classic brush wear & dirty slip-ring." },
      no: { zh: "✗ 集電環火花與激磁不穩,先從碳刷與集電環著手。", en: "✗ For slip-ring sparking & unstable excitation, start with brushes & slip-ring." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "檢查碳刷磨耗量與彈簧壓力", en: "Check brush wear & spring pressure" },
      { zh: "更換碳刷並清潔集電環", en: "Replace brushes & clean slip-ring" },
      { zh: "復歸測試並回報 SCADA", en: "Reset test & report to SCADA" },
    ],
    knowledge_point: "generator_brush",
    part: "gen_brush",
    discipline: "electrical",
  },
  gen_overtemp: {
    id: "gen_overtemp",
    name: { zh: "發電機繞組過溫", en: "Generator winding overtemp" },
    severityTemp: { zh: "發電機繞組溫度過高", en: "Generator winding temp high" },
    warns: [
      { zh: "警戒 · 冷卻風扇異常", en: "Warn · Cooling fan fault" },
      { zh: "警戒 · 輸出降載", en: "Warn · Output derate" },
    ],
    quiz: {
      question: { zh: "發電機繞組過溫但振動正常、激磁正常,最可能根因?", en: "Generator winding overtemp with normal vibration & excitation — root cause?" },
      options: [
        { zh: "A. 軸承內環故障", en: "A. Bearing inner-race fault" },
        { zh: "B. 碳刷磨耗", en: "B. Brush wear" },
        { zh: "C. 塔基螺栓鬆動", en: "C. Loose tower bolts" },
        { zh: "D. 冷卻系統(泵/風扇/水路)效能不足", en: "D. Cooling system (pump/fan/loop) underperforming" },
      ],
      correct: 3,
      ok: { zh: "✓ 正確!振動與激磁正常時,過溫指向冷卻系統效能不足。", en: "✓ Correct! With vibration & excitation normal, overtemp points to the cooling system." },
      no: { zh: "✗ 排除機械與激磁後,過溫的根因在散熱/冷卻迴路。", en: "✗ Ruling out mechanical & excitation, overtemp traces to the cooling loop." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "檢查冷卻泵流量與風扇運轉", en: "Check coolant flow & cooling fan" },
      { zh: "更換冷卻泵並補充冷卻液", en: "Replace coolant pump & top up coolant" },
      { zh: "降溫復歸並回報 SCADA", en: "Cool down, reset & report to SCADA" },
    ],
    knowledge_point: "generator_cooling",
    part: "cooling_pump",
    discipline: "electrical",
  },
  pitch_hydraulic_leak: {
    id: "pitch_hydraulic_leak",
    name: { zh: "變槳液壓洩漏", en: "Pitch hydraulic leak" },
    severityTemp: { zh: "變槳液壓壓力下降", en: "Pitch hydraulic pressure drop" },
    warns: [
      { zh: "警戒 · 油位下降", en: "Warn · Oil level dropping" },
      { zh: "警戒 · 變槳反應遲鈍", en: "Warn · Sluggish pitch" },
    ],
    quiz: {
      question: { zh: "變槳能動但反應遲鈍、液壓壓力與油位下降,後備電池正常,根因?", en: "Pitch works but sluggish, pressure & oil level dropping, backup battery OK — cause?" },
      options: [
        { zh: "A. 後備電池失效", en: "A. Backup battery failure" },
        { zh: "B. 液壓閥/油封洩漏", en: "B. Hydraulic valve / seal leak" },
        { zh: "C. 海纜絕緣劣化", en: "C. Cable insulation degradation" },
        { zh: "D. 風向標跳動", en: "D. Wind-vane jitter" },
      ],
      correct: 1,
      ok: { zh: "✓ 正確!電池正常時,壓力/油位下降與遲鈍是液壓閥或油封洩漏。", en: "✓ Correct! With battery fine, falling pressure/level + sluggishness means a valve/seal leak." },
      no: { zh: "✗ 此為變槳的『液壓』根因(漏油),不同於『失電無法順槳』。", en: "✗ This is the hydraulic (leak) cause of pitch, distinct from a power-loss feather failure." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "定位液壓洩漏點與壓力測試", en: "Locate leak & pressure-test" },
      { zh: "更換液壓閥組/油封並補油", en: "Replace valve block / seals & refill" },
      { zh: "變槳行程測試並回報 SCADA", en: "Pitch travel test & report to SCADA" },
    ],
    knowledge_point: "pitch_hydraulic",
    part: "hydraulic_valve",
    discipline: "mechanical",
  },
  converter_igbt: {
    id: "converter_igbt",
    name: { zh: "變流器 IGBT 模組故障", en: "Converter IGBT module fault" },
    severityTemp: { zh: "IGBT 驅動故障跳脫", en: "IGBT gate-drive fault trip" },
    warns: [
      { zh: "警戒 · 模組溫差異常", en: "Warn · Module ΔT abnormal" },
      { zh: "警戒 · 短路保護動作", en: "Warn · Desat protection" },
    ],
    quiz: {
      question: { zh: "變流器冷卻流量正常,但單一橋臂反覆短路保護跳脫,最可能?", en: "Converter coolant flow normal, but one bridge leg keeps tripping on desat — most likely?" },
      options: [
        { zh: "A. 冷卻水流量不足", en: "A. Insufficient coolant flow" },
        { zh: "B. 葉片不平衡", en: "B. Blade imbalance" },
        { zh: "C. 該橋臂 IGBT 功率模組劣化/失效", en: "C. That leg's IGBT power module degraded/failed" },
        { zh: "D. 偏航齒盤磨損", en: "D. Yaw ring-gear wear" },
      ],
      correct: 2,
      ok: { zh: "✓ 正確!冷卻正常卻單臂跳脫,指向該 IGBT 模組本身劣化,需更換模組。", en: "✓ Correct! Cooling fine but one leg trips → that IGBT module itself is failing; replace it." },
      no: { zh: "✗ 這是變流器的『模組』根因(非冷卻),單臂跳脫即指標。", en: "✗ This is the module-level cause (not cooling); a single-leg trip is the tell." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "讀取故障碼定位故障橋臂", en: "Read fault codes to locate the leg" },
      { zh: "更換 IGBT 功率模組與導熱介面", en: "Replace IGBT module & thermal interface" },
      { zh: "低壓測試並回報 SCADA", en: "Low-voltage test & report to SCADA" },
    ],
    knowledge_point: "converter_igbt",
    part: "igbt_module",
    discipline: "electrical",
  },
  blade_crack: {
    id: "blade_crack",
    name: { zh: "葉片裂紋", en: "Blade crack" },
    severityTemp: { zh: "葉片結構裂紋擴展", en: "Blade structural crack growing" },
    warns: [
      { zh: "警戒 · 葉片異音", en: "Warn · Blade noise" },
      { zh: "警戒 · 振動不平衡", en: "Warn · Imbalance" },
    ],
    quiz: {
      question: { zh: "葉片殼體出現可見裂紋並伴隨不平衡振動,正確處置?", en: "Visible shell crack with imbalance vibration — correct action?" },
      options: [
        { zh: "A. 停機並安排大組件級結構修復/更換", en: "A. Stop & schedule major structural repair/replacement" },
        { zh: "B. 直接遠端重啟即可", en: "B. Just remote-reset" },
        { zh: "C. 補充齒輪油後續轉", en: "C. Top up gear oil and keep running" },
        { zh: "D. 調高轉速測試", en: "D. Test at higher rpm" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確!結構裂紋會擴展、危及安全,須停機走重吊級修復/更換。", en: "✓ Correct! Structural cracks propagate and risk safety — stop and do a heavy-lift repair/replacement." },
      no: { zh: "✗ 結構裂紋不可帶病運轉,屬重大作業(安裝船級)。", en: "✗ Never run on a structural crack — this is a major (jack-up) job." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "目視/敲擊檢測裂紋範圍", en: "Visual/tap test the crack extent" },
      { zh: "安裝船吊裝更換葉片", en: "Jack-up lift & replace blade" },
      { zh: "動平衡校正並回報 SCADA", en: "Balance & report to SCADA" },
    ],
    knowledge_point: "blade_structure",
    part: "gfrp_blade",
    discipline: "structural",
  },
  blade_erosion: {
    id: "blade_erosion",
    name: { zh: "葉片前緣侵蝕", en: "Blade leading-edge erosion" },
    severityTemp: { zh: "前緣塗層剝落", en: "Leading-edge coating loss" },
    warns: [
      { zh: "警戒 · 功率曲線下滑", en: "Warn · Power curve drop" },
      { zh: "警戒 · 氣動噪音", en: "Warn · Aero noise" },
    ],
    quiz: {
      question: { zh: "葉片無結構裂紋,但前緣塗層剝落、功率略降,最適處置?", en: "No structural crack, but leading-edge coating worn with slight power loss — best action?" },
      options: [
        { zh: "A. 更換整支葉片", en: "A. Replace the whole blade" },
        { zh: "B. 更換主軸承", en: "B. Replace main bearing" },
        { zh: "C. 提高轉速補償", en: "C. Raise rpm to compensate" },
        { zh: "D. 修補前緣並貼前緣保護帶", en: "D. Repair & apply leading-edge tape" },
      ],
      correct: 3,
      ok: { zh: "✓ 正確!無結構問題的前緣侵蝕,修補加保護帶即可,成本遠低於換葉片。", en: "✓ Correct! Without structural damage, repair + leading-edge tape suffices — far cheaper than a new blade." },
      no: { zh: "✗ 這是葉片的『侵蝕』(輕度)根因,與『裂紋』(重大)不同。", en: "✗ This is the erosion (minor) cause of blade issues, unlike a crack (major)." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "繩索進場檢查前緣侵蝕範圍", en: "Rope-access inspect erosion extent" },
      { zh: "打磨修補並貼前緣保護帶", en: "Sand, fill & apply leading-edge tape" },
      { zh: "確認氣動外形並回報 SCADA", en: "Verify aero profile & report to SCADA" },
    ],
    knowledge_point: "blade_erosion",
    part: "leading_edge_tape",
    discipline: "structural",
  },
  cable_insulation: {
    id: "cable_insulation",
    name: { zh: "海纜絕緣劣化", en: "Subsea cable insulation fault" },
    severityTemp: { zh: "對地絕緣電阻下降", en: "Insulation resistance dropping" },
    warns: [
      { zh: "警戒 · 局部放電", en: "Warn · Partial discharge" },
      { zh: "警戒 · 接地電流上升", en: "Warn · Ground current up" },
    ],
    quiz: {
      question: { zh: "對地絕緣電阻持續下降並偵測到局部放電,最該?", en: "Insulation resistance dropping with partial discharge detected — what to do?" },
      options: [
        { zh: "A. 提高輸出功率", en: "A. Raise output power" },
        { zh: "B. 定位劣化段並更換海纜接頭/段", en: "B. Locate the degraded section & replace cable joint/segment" },
        { zh: "C. 更換碳刷", en: "C. Replace brushes" },
        { zh: "D. 補充液壓油", en: "D. Top up hydraulic oil" },
      ],
      correct: 1,
      ok: { zh: "✓ 正確!絕緣下降＋局放是海纜/接頭劣化,須定位並更換,避免擊穿。", en: "✓ Correct! Falling insulation + PD means cable/joint degradation — locate & replace before breakdown." },
      no: { zh: "✗ 絕緣電阻與局部放電指向海纜絕緣系統。", en: "✗ Insulation resistance & PD point to the cable insulation system." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "絕緣電阻/局放量測定位", en: "IR / PD test to locate" },
      { zh: "更換海纜接頭並做端接", en: "Replace cable joint & re-terminate" },
      { zh: "耐壓測試並回報 SCADA", en: "Hi-pot test & report to SCADA" },
    ],
    knowledge_point: "cable_insulation",
    part: "cable_joint",
    discipline: "electrical",
  },
  tower_bolt_loose: {
    id: "tower_bolt_loose",
    name: { zh: "塔基/法蘭螺栓鬆動", en: "Tower flange bolt loosening" },
    severityTemp: { zh: "螺栓預拉力下降", en: "Bolt preload loss" },
    warns: [
      { zh: "警戒 · 法蘭縫隙位移", en: "Warn · Flange gap movement" },
      { zh: "警戒 · 結構低頻振動", en: "Warn · LF structural vibration" },
    ],
    quiz: {
      question: { zh: "塔基法蘭偵測到低頻振動與縫隙位移,最先?", en: "Tower flange shows LF vibration & gap movement — check first?" },
      options: [
        { zh: "A. 量測並重新施加螺栓扭力/預拉力", en: "A. Check & re-torque bolt preload" },
        { zh: "B. 更換變流器", en: "B. Replace converter" },
        { zh: "C. 清潔集電環", en: "C. Clean slip-ring" },
        { zh: "D. 校正偏航", en: "D. Re-align yaw" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確!法蘭位移＋低頻振動是螺栓預拉力流失,需扭力複檢/更換。", en: "✓ Correct! Flange movement + LF vibration means lost bolt preload — re-torque/replace." },
      no: { zh: "✗ 這是結構連接(螺栓)問題,先做扭力複檢。", en: "✗ This is a structural-joint (bolt) issue — start with a torque check." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "標記並量測螺栓扭力/伸長量", en: "Mark & measure bolt torque/elongation" },
      { zh: "更換失效螺栓並依規範鎖付", en: "Replace failed bolts & torque to spec" },
      { zh: "複檢縫隙並回報 SCADA", en: "Re-check gap & report to SCADA" },
    ],
    knowledge_point: "tower_bolt",
    part: "bolt_m36",
    discipline: "structural",
  },
  anemometer_fault: {
    id: "anemometer_fault",
    name: { zh: "風速計/風向標故障", en: "Anemometer / vane fault" },
    severityTemp: { zh: "風速風向訊號異常", en: "Wind signal abnormal" },
    warns: [
      { zh: "警戒 · 風速凍結", en: "Warn · Wind speed frozen" },
      { zh: "警戒 · 偏航誤動作", en: "Warn · Yaw hunting" },
    ],
    quiz: {
      question: { zh: "機組偏航頻繁誤動作、功率波動,但機械與電氣均正常,最可能?", en: "Frequent yaw hunting & power swings, but mechanical & electrical fine — most likely?" },
      options: [
        { zh: "A. 主軸承磨耗", en: "A. Main-bearing wear" },
        { zh: "B. IGBT 模組失效", en: "B. IGBT module failure" },
        { zh: "C. 機艙頂風速計/風向標訊號故障", en: "C. Nacelle anemometer / wind-vane signal fault" },
        { zh: "D. 海纜絕緣劣化", en: "D. Cable insulation fault" },
      ],
      correct: 2,
      ok: { zh: "✓ 正確!錯誤的風向/風速量測會讓控制器誤判,造成偏航誤動作。", en: "✓ Correct! Bad wind measurement misleads the controller, causing yaw hunting." },
      no: { zh: "✗ 機械電氣正常時,先懷疑量測源(風速計/風向標)。", en: "✗ With mechanics & electrics fine, suspect the measurement source first." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "比對風速/風向感測訊號", en: "Cross-check wind sensor signals" },
      { zh: "更換風速計並校正", en: "Replace anemometer & calibrate" },
      { zh: "復歸測試並回報 SCADA", en: "Reset test & report to SCADA" },
    ],
    knowledge_point: "met_sensor",
    part: "anemometer",
    discipline: "control",
  },
  controller_comm: {
    id: "controller_comm",
    name: { zh: "主控制器通訊中斷", en: "Main controller comms loss" },
    severityTemp: { zh: "PLC 與 SCADA 失聯", en: "PLC–SCADA link lost" },
    warns: [
      { zh: "警戒 · 心跳訊號遺失", en: "Warn · Heartbeat lost" },
      { zh: "警戒 · 遠端無法控制", en: "Warn · No remote control" },
    ],
    quiz: {
      question: { zh: "單台機組與 SCADA 失聯、遠端無法控制,但鄰機正常,最可能?", en: "One unit lost SCADA link & remote control, neighbors fine — most likely?" },
      options: [
        { zh: "A. 全場電網故障", en: "A. Farm-wide grid fault" },
        { zh: "B. 該機主控制器/通訊模組故障", en: "B. That unit's main controller / comms module" },
        { zh: "C. 葉片侵蝕", en: "C. Blade erosion" },
        { zh: "D. 偏航齒盤磨損", en: "D. Yaw gear wear" },
      ],
      correct: 1,
      ok: { zh: "✓ 正確!僅單機失聯而鄰機正常,指向該機主控制器/通訊模組。", en: "✓ Correct! Only one unit offline while neighbors are fine → its own controller/comms module." },
      no: { zh: "✗ 鄰機正常即可排除全場性問題,聚焦該機控制器。", en: "✗ Healthy neighbors rule out a farm-wide issue — focus on that unit's controller." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "檢查通訊鏈路與控制器狀態燈", en: "Check comms link & controller status LEDs" },
      { zh: "更換主控制器並回載參數", en: "Replace controller & restore parameters" },
      { zh: "連線測試並回報 SCADA", en: "Link test & report to SCADA" },
    ],
    knowledge_point: "controller_comm",
    part: "main_controller",
    discipline: "control",
  },
  transformer_overtemp: {
    id: "transformer_overtemp",
    name: { zh: "機組變壓器過溫", en: "Turbine transformer overtemp" },
    severityTemp: { zh: "變壓器油溫過高", en: "Transformer oil temp high" },
    warns: [
      { zh: "警戒 · 油溫上升", en: "Warn · Oil temp rising" },
      { zh: "警戒 · 負載受限", en: "Warn · Load limited" },
    ],
    quiz: {
      question: { zh: "機組變壓器油溫過高、需降載,風機機械正常,最先排查?", en: "Turbine transformer oil overtemp forcing derate, mechanicals fine — check first?" },
      options: [
        { zh: "A. 變壓器油位/油質與散熱", en: "A. Transformer oil level/quality & cooling" },
        { zh: "B. 葉片角度", en: "B. Blade pitch" },
        { zh: "C. 偏航煞車", en: "C. Yaw brake" },
        { zh: "D. 風速計", en: "D. Anemometer" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確!變壓器過溫先查油位/油質與散熱風道,必要時換油。", en: "✓ Correct! For transformer overtemp, check oil level/quality & cooling ducts; change oil if needed." },
      no: { zh: "✗ 變壓器過溫的根因在油與散熱,而非風機機械。", en: "✗ Transformer overtemp traces to oil & cooling, not turbine mechanicals." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "檢查油位/油質與散熱風道", en: "Check oil level/quality & cooling ducts" },
      { zh: "更換變壓器油並清理散熱", en: "Replace transformer oil & clean cooling" },
      { zh: "負載測試並回報 SCADA", en: "Load test & report to SCADA" },
    ],
    knowledge_point: "transformer_thermal",
    part: "transformer_oil",
    discipline: "electrical",
  },
  lift_fault: {
    id: "lift_fault",
    name: { zh: "塔內升降機/安全系統故障", en: "Service lift / safety fault" },
    severityTemp: { zh: "升降機制動異常", en: "Lift brake abnormal" },
    warns: [
      { zh: "警戒 · 過載保護", en: "Warn · Overload trip" },
      { zh: "警戒 · 限位開關異常", en: "Warn · Limit switch fault" },
    ],
    quiz: {
      question: { zh: "塔內升降機制動異常、限位開關報錯,技師安全上的正確做法?", en: "Service lift brake abnormal & limit switch error — the safe course of action?" },
      options: [
        { zh: "A. 照常搭乘升降機上機艙", en: "A. Ride the lift up as usual" },
        { zh: "B. 邊修邊載人測試", en: "B. Carry crew while testing" },
        { zh: "C. 忽略警報先發電", en: "C. Ignore and keep generating" },
        { zh: "D. 停用升降機、改爬梯並先修復制動/限位", en: "D. Lock out the lift, use the ladder, fix brake/limit first" },
      ],
      correct: 3,
      ok: { zh: "✓ 正確!安全第一——升降機故障須停用上鎖,修好制動/限位再復用。", en: "✓ Correct! Safety first — lock out the faulty lift, fix the brake/limit before reuse." },
      no: { zh: "✗ HSE 原則:故障的升降機不得載人,須先停用修復。", en: "✗ HSE rule: never carry crew on a faulty lift — lock out and repair first." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "升降機停用上鎖(LOTO)、改用爬梯", en: "Lock out the lift (LOTO); use the ladder" },
      { zh: "檢查制動、限位開關與鋼索", en: "Inspect brake, limit switches & wire rope" },
      { zh: "更換升降機組件並做載重測試", en: "Replace lift parts & load-test" },
      { zh: "復用前最終安全檢查並回報", en: "Final safety check before reuse & report" },
    ],
    knowledge_point: "service_lift_hse",
    part: "lift_part",
    discipline: "hse",
  },

  // ───────── #82 分層擴充:結構防蝕、變壓器套管、海纜接頭過熱（皆有完整測驗+SOP+圖鑑）─────────
  tower_corrosion: {
    id: "tower_corrosion",
    name: { zh: "基礎/塔基防蝕劣化", en: "Foundation corrosion" },
    severityTemp: { zh: "犧牲陽極耗盡、鏽蝕擴展", en: "Sacrificial anode depleted, rust spreading" },
    warns: [
      { zh: "警戒 · 陽極電位異常", en: "Warn · Anode potential" },
      { zh: "警戒 · 塗層剝離", en: "Warn · Coating loss" },
    ],
    quiz: {
      question: { zh: "飛濺區出現鏽蝕擴展、陰極保護電位不足,最該優先處理?", en: "Rust spreading in the splash zone with low cathodic-protection potential — address first?" },
      options: [
        { zh: "A. 鎖緊塔基螺栓", en: "A. Re-torque tower bolts" },
        { zh: "B. 更換犧牲陽極並補修防蝕塗層", en: "B. Replace sacrificial anodes & repair coating" },
        { zh: "C. 更換變壓器油", en: "C. Change transformer oil" },
        { zh: "D. 校正偏航", en: "D. Re-align yaw" },
      ],
      correct: 1,
      ok: { zh: "✓ 正確!陽極耗盡使陰極保護失效,須補陽極+修塗層,阻止鏽蝕擴展。", en: "✓ Correct! Depleted anodes lose cathodic protection — replace anodes & repair coating to stop corrosion." },
      no: { zh: "✗ 飛濺區鏽蝕屬防蝕系統(陽極/塗層)問題,與螺栓預拉力不同。", en: "✗ Splash-zone rust is a corrosion-protection (anode/coating) issue, not bolt preload." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "量測陰極保護電位、檢查鏽蝕範圍", en: "Measure CP potential & survey corrosion" },
      { zh: "更換犧牲陽極並補修防蝕塗層", en: "Replace sacrificial anodes & repair coating" },
      { zh: "複測電位並回報 SCADA", en: "Re-measure potential & report to SCADA" },
    ],
    knowledge_point: "foundation_corrosion",
    part: "corrosion_anode",
    discipline: "structural",
  },
  transformer_bushing: {
    id: "transformer_bushing",
    name: { zh: "變壓器套管絕緣劣化", en: "Transformer bushing degradation" },
    severityTemp: { zh: "套管局部放電、介損上升", en: "Bushing partial discharge, tan-δ rising" },
    warns: [
      { zh: "警戒 · 介質損耗 tanδ 高", en: "Warn · High tan-δ" },
      { zh: "警戒 · 套管局放", en: "Warn · Bushing PD" },
    ],
    quiz: {
      question: { zh: "變壓器油溫正常,但套管介損 tanδ 上升並偵測到局部放電,根因?", en: "Transformer oil temp normal, but bushing tan-δ rises with partial discharge — root cause?" },
      options: [
        { zh: "A. 散熱風道阻塞", en: "A. Blocked cooling ducts" },
        { zh: "B. 油位過低", en: "B. Low oil level" },
        { zh: "C. 套管絕緣劣化(需更換套管)", en: "C. Bushing insulation degradation (replace bushing)" },
        { zh: "D. 偏航誤動作", en: "D. Yaw hunting" },
      ],
      correct: 2,
      ok: { zh: "✓ 正確!油溫正常排除散熱/油位;tanδ+局放指向套管絕緣劣化,須更換套管。", en: "✓ Correct! Normal temp rules out cooling/oil; tan-δ + PD point to bushing insulation — replace the bushing." },
      no: { zh: "✗ 這是變壓器的『套管』根因(絕緣),與『過溫』(油/散熱)不同。", en: "✗ This is the bushing (insulation) cause, distinct from the overtemp (oil/cooling) case." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "量測 tanδ/局放定位劣化套管", en: "Measure tan-δ/PD to locate the bushing" },
      { zh: "更換套管並做端接與耐壓測試", en: "Replace bushing, re-terminate & hi-pot test" },
      { zh: "送電測試並回報 SCADA", en: "Energize-test & report to SCADA" },
    ],
    knowledge_point: "transformer_bushing",
    part: "transformer_bushing",
    discipline: "electrical",
  },
  cable_joint_heat: {
    id: "cable_joint_heat",
    name: { zh: "海纜接頭過熱", en: "Cable joint overheat" },
    severityTemp: { zh: "接頭接觸電阻過高、局部過熱", en: "Joint contact resistance high, local hotspot" },
    warns: [
      { zh: "警戒 · 接頭溫升", en: "Warn · Joint temp rise" },
      { zh: "警戒 · 接觸電阻高", en: "Warn · High contact resistance" },
    ],
    quiz: {
      question: { zh: "海纜接頭出現局部過熱、接觸電阻升高,但對地絕緣電阻正常,根因?", en: "Cable joint shows a hotspot with rising contact resistance, but insulation resistance is normal — cause?" },
      options: [
        { zh: "A. 接頭壓接不良/接觸電阻過高", en: "A. Poor crimp / high contact resistance" },
        { zh: "B. 絕緣劣化局部放電", en: "B. Insulation degradation / PD" },
        { zh: "C. 變流器過溫", en: "C. Converter overtemp" },
        { zh: "D. 葉片不平衡", en: "D. Blade imbalance" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確!絕緣正常卻過熱→接觸電阻問題(壓接不良),須重做端接降低電阻。", en: "✓ Correct! Normal insulation but overheating → a contact-resistance (crimp) problem; re-terminate to cut resistance." },
      no: { zh: "✗ 絕緣正常排除『絕緣劣化』;過熱+接觸電阻指向接頭壓接,屬不同根因。", en: "✗ Normal insulation rules out degradation; heat + contact resistance points to the crimp — a distinct cause." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "熱影像/接觸電阻量測定位過熱接頭", en: "Thermal-image / measure resistance to locate the joint" },
      { zh: "重做接頭端接、更換接頭", en: "Re-terminate / replace the joint" },
      { zh: "通電溫升測試並回報 SCADA", en: "Load-heat test & report to SCADA" },
    ],
    knowledge_point: "cable_joint_thermal",
    part: "cable_joint",
    discipline: "electrical",
  },

  // ───────── #2 HSE 科別加厚:LOTO 能量隔離 / 高處墜落防護 / SIMOPS 同時作業 ─────────
  // 工安情境的「正確處置」不是修零件,而是判斷安全程序——安全永遠優先於發電。
  loto_violation: {
    id: "loto_violation",
    name: { zh: "能量隔離(LOTO)缺失", en: "LOTO isolation gap" },
    severityTemp: { zh: "未上鎖掛牌即進場 · 帶電/儲能風險", en: "Entry before lockout · live/stored-energy risk" },
    warns: [
      { zh: "警戒 · 隔離點未驗電", en: "Warn · Isolation not verified" },
      { zh: "警戒 · 個人鎖未上", en: "Warn · Personal lock missing" },
    ],
    quiz: {
      question: { zh: "準備進入機艙更換組件,發現隔離開關僅『關閉』但未上鎖掛牌、也未驗電,正確做法?", en: "About to enter the nacelle for a part swap — the isolator is OFF but not locked/tagged and not verified. Correct action?" },
      options: [
        { zh: "A. 既然已關閉,直接進場作業", en: "A. It's off — just go in and work" },
        { zh: "B. 完成上鎖+掛牌+驗電確認零能量後再進場", en: "B. Lock + tag + verify zero energy, then enter" },
        { zh: "C. 請同事站在開關旁看著別人誤動", en: "C. Have a colleague guard the switch" },
        { zh: "D. 加快作業以縮短暴露時間", en: "D. Work faster to cut exposure" },
      ],
      correct: 1,
      ok: { zh: "✓ 正確!LOTO 須『上鎖+掛牌+驗電』確認零能量,任何人不得繞過——能量會傷人。", en: "✓ Correct! LOTO requires lock + tag + verify zero energy; no one bypasses it — stored energy kills." },
      no: { zh: "✗ HSE 鐵則:未完成上鎖掛牌與驗電前,絕不進入帶電或儲能設備作業。", en: "✗ HSE rule: never enter live/stored-energy work before lockout, tagout and verification are complete." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "辨識所有能量來源(電/液壓/彈簧/儲能)", en: "Identify all energy sources (elec/hydraulic/spring/stored)" },
      { zh: "逐一隔離、上個人鎖並掛牌", en: "Isolate each, apply personal lock & tag" },
      { zh: "驗電/洩壓確認零能量狀態", en: "Verify zero energy (test dead / bleed pressure)" },
      { zh: "作業後依序解鎖並回報 SCADA", en: "Remove locks in order & report to SCADA" },
    ],
    knowledge_point: "loto_isolation",
    part: "loto_kit",
    discipline: "hse",
  },
  fall_protection: {
    id: "fall_protection",
    name: { zh: "高處作業墜落防護失效", en: "Fall-protection failure" },
    severityTemp: { zh: "高處墜落風險 · 防墜系統不合格", en: "Fall-from-height risk · arrest system unfit" },
    warns: [
      { zh: "警戒 · 安全帶織帶磨損", en: "Warn · Harness webbing worn" },
      { zh: "警戒 · 合規錨點不足", en: "Warn · No rated anchor" },
    ],
    quiz: {
      question: { zh: "機艙頂高處作業,發現安全帶織帶磨損、附近找不到合規錨點,該怎麼做?", en: "Working at height on the nacelle roof — harness webbing is worn and no rated anchor is reachable. What do you do?" },
      options: [
        { zh: "A. 作業時間短,可不繫安全帶", en: "A. It's quick — skip the harness" },
        { zh: "B. 把掛鉤繫在管路或欄杆上將就", en: "B. Clip to a pipe or handrail to make do" },
        { zh: "C. 停止作業,更換合規防墜裝備並設合格錨點後再進行", en: "C. Stop; replace gear & set a rated anchor before proceeding" },
        { zh: "D. 由同事在旁徒手拉著保護", en: "D. Have a colleague hold you by hand" },
      ],
      correct: 2,
      ok: { zh: "✓ 正確!裝備或錨點不合格即停工,更換/設置合格系統,全程 100% 繫掛雙鉤接續。", en: "✓ Correct! If gear or anchor is unfit, stop — replace/set a rated system and stay 100% tied-off with twin lanyards." },
      no: { zh: "✗ 高處作業『100% 繫掛、合格錨點、雙鉤接續』缺一不可,絕不可將就。", en: "✗ At height, 100% tie-off, a rated anchor and twin-lanyard transfer are non-negotiable — never improvise." },
    },
    sop: [
      { zh: "確認天氣作業窗與風速限值", en: "Confirm weather window & wind limit" },
      { zh: "檢查安全帶/SRL 織帶與扣件", en: "Inspect harness/SRL webbing & connectors" },
      { zh: "確認合格錨點與雙鉤接續路徑", en: "Confirm rated anchors & twin-lanyard route" },
      { zh: "更換不合格防墜裝備", en: "Replace any unfit fall-arrest gear" },
      { zh: "全程 100% 繫掛並備妥墜落救援預案", en: "Stay 100% tied-off; have a rescue plan ready" },
    ],
    knowledge_point: "fall_protection",
    part: "fall_arrest_kit",
    discipline: "hse",
  },
  simops_conflict: {
    id: "simops_conflict",
    name: { zh: "SIMOPS 同時作業衝突", en: "SIMOPS conflict" },
    severityTemp: { zh: "吊裝與人員作業未隔離 · 路徑重疊", en: "Lift & crew work not segregated · overlapping zones" },
    warns: [
      { zh: "警戒 · 吊重通過人員上方", en: "Warn · Load over personnel" },
      { zh: "警戒 · 作業許可衝突", en: "Warn · Permit-to-work clash" },
    ],
    quiz: {
      question: { zh: "同一機組甲板正進行吊裝,另一組要同時登塔維修,兩作業區域重疊,正確協調方式?", en: "A deck lift is underway while another crew wants to climb the same turbine — the zones overlap. Correct way to coordinate?" },
      options: [
        { zh: "A. 兩組各做各的,效率優先", en: "A. Both proceed independently — efficiency first" },
        { zh: "B. 暫停其一/設淨空隔離區,經作業許可協調後分時分區執行", en: "B. Pause one; set an exclusion zone; sequence by permit after coordination" },
        { zh: "C. 登塔組戴好安全帽即可在吊重下通過", en: "C. Climbers just wear helmets and pass under the load" },
        { zh: "D. 加快吊裝先做完再說", en: "D. Rush the lift to finish first" },
      ],
      correct: 1,
      ok: { zh: "✓ 正確!SIMOPS 須以作業許可協調、設淨空/隔離區,嚴禁人員處於吊重下方或路徑重疊。", en: "✓ Correct! SIMOPS needs permit-led coordination and exclusion zones; never put people under a suspended load or in overlapping paths." },
      no: { zh: "✗ 同時作業的核心是隔離與許可協調——人員絕不可停留吊重下方,作業不可路徑重疊。", en: "✗ The core of SIMOPS is segregation and permit coordination — never under the load, never overlapping paths." },
    },
    sop: [
      { zh: "盤點同時段所有作業與其危害", en: "List all concurrent jobs & their hazards" },
      { zh: "召開 SIMOPS 協調會與作業許可審查", en: "Hold a SIMOPS meeting & permit review" },
      { zh: "設置淨空/隔離區與警示標示", en: "Set exclusion zones & warning signage" },
      { zh: "以對講機建立統一指揮與停工訊號", en: "Use radios for a single command & stop signal" },
      { zh: "確認無重疊後分時/分區執行並記錄", en: "Sequence by time/zone with no overlap & log it" },
    ],
    knowledge_point: "simops_coordination",
    part: "comms_radio",
    discipline: "hse",
  },
};

// ───────── 知識圖鑑解說（圖鑑擴充）：每個故障的深度排查知識 ─────────
// 同一元件可由不同根因造成不同故障，differential 點出「如何與同元件其他根因區分」。
export interface CodexEntry {
  mechanism: I18n;    // 成因機制 / 原理
  symptom: I18n;      // 典型症狀（SCADA 告警 + 現場徵兆）
  differential: I18n; // 鑑別重點：如何與同元件的其他根因區分
  consequence: I18n;  // 若不處理的後果
  tip: I18n;          // 維修 / 安全提示
}

export const CODEX: Record<string, CodexEntry> = {
  gearbox_overheat: {
    mechanism: { zh: "潤滑油位過低或油質劣化，使潤滑膜與散熱能力下降，摩擦熱累積導致油溫攀升。", en: "Low oil level or degraded oil thins the lubricating film and cuts heat removal, so friction heat builds up and oil temp climbs." },
    symptom: { zh: "油溫紅色告警（如 78°C）、濾芯壓差升高、發電機振動警戒同步出現。", en: "Red oil-temp alarm (e.g. 78°C), rising filter ΔP, and a concurrent generator-vibration warning." },
    differential: { zh: "油溫高但金屬碎屑正常 → 散熱/潤滑問題（本症）；若油溫正常卻碎屑驟增 → 屬『軸承磨耗』。", en: "High temp with normal debris → cooling/lubrication (this); normal temp but debris spike → it's 'bearing wear'." },
    consequence: { zh: "持續過熱會加速齒面與軸承劣化，最終演變為金屬剝離的大修。", en: "Sustained overheating accelerates gear/bearing wear, eventually escalating to a spalling overhaul." },
    tip: { zh: "先補油/換濾芯與齒輪油即可復歸，屬例行可作業範圍。", en: "Top up oil, replace filter & gear oil to reset — a routine workable job." },
  },
  gearbox_bearing_wear: {
    mechanism: { zh: "內部軸承或齒面長期疲勞剝離（spalling），金屬顆粒進入油路、高頻振動上升。", en: "Long-term fatigue spalling of internal bearings/gear teeth sheds metal particles into the oil and raises HF vibration." },
    symptom: { zh: "線上油液監測金屬碎屑驟增、高頻振動超標，但油溫可正常。", en: "Online oil-debris count spikes and HF vibration exceeds limits, while oil temp may be normal." },
    differential: { zh: "關鍵是『碎屑＋高頻振動』而油溫正常，可與『油溫過高』散熱問題區分。", en: "The tell is debris + HF vibration with normal temp — distinguishing it from the cooling-related overheat." },
    consequence: { zh: "剝離擴展會打齒、咬死傳動鏈，須重吊/安裝船級大修。", en: "Spreading spall can strip teeth and seize the drivetrain — a heavy-lift / jack-up overhaul." },
    tip: { zh: "重大故障：拆檢後轉多回合大修，需連續可作業天氣窗。", en: "Major fault: strip down then run a multi-day overhaul needing consecutive workable windows." },
  },
  yaw_misalign: {
    mechanism: { zh: "偏航煞車液壓未完全洩除，齒盤卡滯，使指令與回授位置產生偏差。", en: "Yaw brake hydraulics not fully released jam the ring gear, creating a gap between commanded and feedback position." },
    symptom: { zh: "偏航位置偏差（如 +12°）、偏航電機電流偏高、風向標跳動、無法迎風。", en: "Yaw position error (e.g. +12°), high yaw-motor current, vane jitter, and failure to face the wind." },
    differential: { zh: "煞車未釋放屬『控制/煞車』面；若可動但有異音與背隙則屬『齒盤磨損』機械面。", en: "An unreleased brake is the control/brake path; movable but noisy with backlash is the mechanical ring-gear-wear path." },
    consequence: { zh: "長期失準使機組偏離最佳迎風角，發電量下滑、載荷不均。", en: "Chronic misalignment keeps the rotor off optimal yaw, cutting output and unevenly loading the structure." },
    tip: { zh: "確認煞車液壓完全洩除、釋放卡滯片並潤滑齒盤後複歸定位。", en: "Confirm full hydraulic release, free the stuck pads, re-grease the ring gear, then re-home." },
  },
  yaw_gear_wear: {
    mechanism: { zh: "偏航齒輪/齒盤齒面長期磨損、潤滑不足，造成背隙過大與運轉異音。", en: "Long-term wear and poor lubrication of the yaw gear/ring teeth cause excessive backlash and running noise." },
    symptom: { zh: "偏航可動但明顯異音、背隙過大、齒面出現金屬屑，而煞車液壓正常。", en: "Yaw moves but is loud with large backlash and gear swarf, while brake hydraulics are normal." },
    differential: { zh: "煞車液壓正常是關鍵——排除『偏航失準』的控制面，指向齒盤機械磨損。", en: "Normal brake hydraulics is key — it rules out the control-side misalignment and points to mechanical ring-gear wear." },
    consequence: { zh: "背隙惡化會打齒、定位漂移，最終須更換整組偏航齒輪。", en: "Worsening backlash strips teeth and drifts positioning, ending in a full yaw-gear-set replacement." },
    tip: { zh: "檢查齒面磨損與背隙，更換齒輪組並重新潤滑後校正定位。", en: "Inspect teeth & backlash, replace the gear set, re-grease, then re-align." },
  },
  gen_vibration: {
    mechanism: { zh: "發電機軸承內環疲勞剝落，滾動體通過缺陷時在 BPFI 特徵頻率激發振動突波。", en: "Generator bearing inner-race fatigue spalling excites a vibration spike at the BPFI characteristic frequency as rollers pass the defect." },
    symptom: { zh: "振動 RMS 超標、FFT 在 BPFI 頻率出現突波、軸承溫度上升、噪音增加。", en: "Vibration RMS over limit, an FFT spike at BPFI, rising bearing temp and increasing noise." },
    differential: { zh: "BPFI 突波＝軸承內環，與『繞組過溫』（冷卻）、『碳刷』（激磁火花）截然不同。", en: "A BPFI spike = bearing inner race — quite different from winding overtemp (cooling) or brush wear (excitation sparking)." },
    consequence: { zh: "軸承失效會損及轉子與定子，演變為發電機級大修。", en: "Bearing failure can damage rotor and stator, escalating to a generator-level overhaul." },
    tip: { zh: "重大故障：採頻譜定位後須重吊更換軸承並重新對心。", en: "Major fault: locate via spectrum, then heavy-lift replace the bearing and re-align." },
  },
  gen_brush_wear: {
    mechanism: { zh: "碳刷磨耗、彈簧壓力不足或集電環髒污，接觸不良造成激磁電流跳動與火花。", en: "Worn brushes, weak spring pressure or a dirty slip-ring make poor contact, causing excitation-current jitter and sparking." },
    symptom: { zh: "集電環火花、碳粉堆積、激磁電流跳動。", en: "Slip-ring sparking, carbon-dust build-up and excitation-current jitter." },
    differential: { zh: "『火花＋碳粉＋激磁跳動』指向碳刷/集電環，與振動（軸承）或過溫（冷卻）無關。", en: "Sparking + dust + excitation jitter points to brushes/slip-ring — unrelated to vibration (bearing) or overtemp (cooling)." },
    consequence: { zh: "持續火花會燒蝕集電環、使激磁失穩甚至跳機。", en: "Continued sparking erodes the slip-ring and destabilises excitation, risking a trip." },
    tip: { zh: "檢查碳刷磨耗量與彈簧壓力，更換碳刷並清潔集電環即可。", en: "Check brush wear & spring pressure, replace brushes and clean the slip-ring." },
  },
  gen_overtemp: {
    mechanism: { zh: "冷卻系統（泵/風扇/水路）效能不足，繞組散熱不良導致溫度過高、被迫降載。", en: "An underperforming cooling system (pump/fan/loop) fails to dissipate winding heat, forcing overtemp and derate." },
    symptom: { zh: "繞組溫度過高、冷卻風扇異常、輸出降載，但振動與激磁正常。", en: "High winding temp, cooling-fan fault and output derate, while vibration and excitation are normal." },
    differential: { zh: "振動正常排除軸承、激磁正常排除碳刷——剩下的根因就是冷卻系統。", en: "Normal vibration rules out the bearing, normal excitation rules out brushes — leaving the cooling system." },
    consequence: { zh: "長期過溫使絕緣老化、縮短繞組壽命。", en: "Prolonged overtemp ages insulation and shortens winding life." },
    tip: { zh: "檢查冷卻泵流量與風扇，更換冷卻泵並補充冷卻液後降溫復歸。", en: "Check coolant flow & fan, replace the pump, top up coolant, then cool down and reset." },
  },
  pitch_fault: {
    mechanism: { zh: "失電時變槳依賴後備電池/超級電容順槳停機，電池失效將無法安全順槳。", en: "On power loss, pitch relies on a backup battery/supercap to feather; a dead battery prevents safe feathering." },
    symptom: { zh: "強風下無法順槳停機、後備電池電壓低、轉速偏高（過速）。", en: "Can't feather to stop in high wind, low backup-battery voltage and overspeed." },
    differential: { zh: "後備電池『失電』面——與『液壓洩漏』（壓力/油位下降、反應遲鈍）的機械面不同。", en: "This is the power-loss path — distinct from the hydraulic-leak path (falling pressure/level, sluggish motion)." },
    consequence: { zh: "無法順槳將使轉子過速，是危及結構安全的重大風險。", en: "Failure to feather lets the rotor overspeed — a serious structural-safety risk." },
    tip: { zh: "量測後備電池電壓，更換電池模組並自檢後做順槳測試。", en: "Measure backup-battery voltage, replace the module, self-test, then run a feather test." },
  },
  pitch_hydraulic_leak: {
    mechanism: { zh: "液壓閥或油封洩漏使系統壓力與油位下降，變槳作動力道不足、反應遲鈍。", en: "A leaking hydraulic valve or seal drops system pressure and oil level, leaving pitch underpowered and sluggish." },
    symptom: { zh: "變槳能動但反應遲鈍、液壓壓力與油位下降，後備電池正常。", en: "Pitch works but is sluggish, with falling pressure and oil level — backup battery OK." },
    differential: { zh: "電池正常是關鍵：排除『失電無法順槳』，指向液壓漏油的機械根因。", en: "A healthy battery is key: it rules out the power-loss failure and points to the hydraulic-leak mechanical cause." },
    consequence: { zh: "壓力持續流失將使變槳完全失能，喪失調節與停機能力。", en: "Continued pressure loss disables pitch entirely, losing both regulation and shutdown capability." },
    tip: { zh: "定位洩漏點並做壓力測試，更換閥組/油封並補油後行程測試。", en: "Locate the leak, pressure-test, replace the valve block/seals, refill, then travel-test." },
  },
  converter_fault: {
    mechanism: { zh: "冷卻系統流量不足或堵塞，IGBT 散熱不良反覆觸發過溫保護跳脫。", en: "Insufficient or blocked coolant flow starves IGBT cooling, repeatedly tripping overtemp protection." },
    symptom: { zh: "變流器 IGBT 過溫、冷卻水流量低、輸出功率受限、反覆跳脫。", en: "Converter IGBT overtemp, low coolant flow, curtailed output and repeated trips." },
    differential: { zh: "『冷卻流量不足』影響整體散熱；若冷卻正常卻單一橋臂跳脫則屬『IGBT 模組劣化』。", en: "Low coolant flow affects overall cooling; if cooling is fine but one bridge leg trips, it's IGBT-module degradation." },
    consequence: { zh: "反覆過溫加速功率模組老化，最終演變為模組級故障。", en: "Repeated overtemp ages the power modules, eventually becoming a module-level failure." },
    tip: { zh: "檢查冷卻泵與管路流量，清理散熱器/更換濾網後復歸測試。", en: "Check coolant pump & loop flow, clean the radiator / replace filters, then reset-test." },
  },
  converter_igbt: {
    mechanism: { zh: "單一橋臂 IGBT 功率模組劣化/失效，即使冷卻正常也反覆觸發短路（desat）保護。", en: "A single bridge-leg IGBT power module degrades/fails and keeps tripping desat protection even with cooling normal." },
    symptom: { zh: "模組溫差異常、單一橋臂反覆短路保護跳脫，冷卻流量卻正常。", en: "Abnormal module ΔT and one bridge leg repeatedly tripping on desat, while coolant flow is normal." },
    differential: { zh: "『單臂跳脫＋冷卻正常』是關鍵，與整體『冷卻流量不足』的過溫不同。", en: "Single-leg trip with normal cooling is the tell — unlike the overall low-coolant-flow overtemp." },
    consequence: { zh: "模組徹底失效將使該相無法輸出，整機停機。", en: "Total module failure loses that phase's output and stops the whole turbine." },
    tip: { zh: "讀故障碼定位故障橋臂，更換 IGBT 模組與導熱介面後低壓測試。", en: "Read fault codes to locate the leg, replace the IGBT module & thermal interface, then low-voltage test." },
  },
  blade_crack: {
    mechanism: { zh: "葉片殼體結構性裂紋在循環載荷下擴展，危及整支葉片結構完整性。", en: "A structural shell crack propagates under cyclic loading, threatening the whole blade's integrity." },
    symptom: { zh: "可見結構裂紋、葉片異音、不平衡振動。", en: "Visible structural crack, blade noise and imbalance vibration." },
    differential: { zh: "『結構裂紋』屬重大（不可帶病運轉）；僅前緣塗層剝落、無裂紋則屬輕度『侵蝕』。", en: "A structural crack is major (never run on it); coating loss without a crack is the minor 'erosion' case." },
    consequence: { zh: "裂紋擴展可能導致葉片斷裂、飛擲碎片，屬最高安全風險。", en: "A growing crack can fracture the blade and throw debris — the highest safety risk." },
    tip: { zh: "重大故障：須停機並以安裝船吊裝更換葉片，再做動平衡。", en: "Major fault: stop and jack-up replace the blade, then re-balance." },
  },
  blade_erosion: {
    mechanism: { zh: "雨蝕/砂蝕使前緣塗層剝落，破壞氣動外形、造成功率略降與氣動噪音。", en: "Rain/sand erosion strips the leading-edge coating, spoiling the aero profile and causing slight power loss and aero noise." },
    symptom: { zh: "前緣塗層剝落、功率曲線下滑、氣動噪音，但無結構裂紋。", en: "Leading-edge coating loss, a drooping power curve and aero noise, but no structural crack." },
    differential: { zh: "無結構裂紋是關鍵：屬輕度可修補，與須吊裝更換的『裂紋』重大故障不同。", en: "No structural crack is key: a minor repairable case, unlike the major crack needing a lift replacement." },
    consequence: { zh: "侵蝕擴大會持續吃掉發電量，並可能往結構層發展。", en: "Spreading erosion keeps eating output and can progress into the structure." },
    tip: { zh: "繩索進場檢查範圍，打磨修補並貼前緣保護帶即可，成本遠低於換葉片。", en: "Rope-access inspect, sand/fill and apply leading-edge tape — far cheaper than a new blade." },
  },
  cable_insulation: {
    mechanism: { zh: "海纜或接頭絕緣劣化，對地絕緣電阻下降並出現局部放電，趨向擊穿。", en: "Subsea cable/joint insulation degrades, dropping insulation resistance and showing partial discharge — heading toward breakdown." },
    symptom: { zh: "對地絕緣電阻持續下降、偵測到局部放電、接地電流上升。", en: "Falling insulation resistance, detected partial discharge and rising ground current." },
    differential: { zh: "『絕緣電阻＋局放』明確指向海纜絕緣系統，非機組內部元件。", en: "Insulation resistance + PD clearly points to the cable insulation system, not an in-turbine component." },
    consequence: { zh: "絕緣擊穿會造成接地故障停電，修復海纜成本高、停機久。", en: "Insulation breakdown causes a ground-fault outage — cable repair is costly and downtime is long." },
    tip: { zh: "以絕緣電阻/局放量測定位劣化段，更換接頭/段並做耐壓測試。", en: "Use IR/PD testing to locate the bad section, replace the joint/segment and hi-pot test." },
  },
  tower_bolt_loose: {
    mechanism: { zh: "法蘭螺栓預拉力流失，連接面出現微動與縫隙位移，激發結構低頻振動。", en: "Loss of flange-bolt preload lets the joint micro-move and the gap shift, exciting low-frequency structural vibration." },
    symptom: { zh: "螺栓預拉力下降、法蘭縫隙位移、結構低頻振動。", en: "Reduced bolt preload, flange-gap movement and low-frequency structural vibration." },
    differential: { zh: "低頻結構振動＋法蘭位移指向螺栓預拉力，與旋轉件高頻振動完全不同。", en: "LF structural vibration + flange movement points to bolt preload — unlike rotating-part HF vibration." },
    consequence: { zh: "預拉力持續流失會使連接失效，危及塔架整體結構安全。", en: "Continued preload loss can fail the joint, endangering the tower's structural safety." },
    tip: { zh: "標記並量測螺栓扭力/伸長量，更換失效螺栓並依規範鎖付。", en: "Mark and measure bolt torque/elongation, replace failed bolts and torque to spec." },
  },
  anemometer_fault: {
    mechanism: { zh: "機艙頂風速計/風向標訊號故障，錯誤量測讓控制器誤判，造成偏航誤動作。", en: "A faulty nacelle anemometer/vane feeds bad measurements, misleading the controller into yaw hunting." },
    symptom: { zh: "偏航頻繁誤動作、功率波動、風速凍結，但機械與電氣均正常。", en: "Frequent yaw hunting, power swings and frozen wind speed, while mechanics and electrics are fine." },
    differential: { zh: "機械電氣皆正常時優先懷疑量測源（感測器），而非執行機構。", en: "With mechanics & electrics fine, suspect the measurement source (sensor) first, not the actuators." },
    consequence: { zh: "持續誤動作浪費發電並增加偏航系統磨耗。", en: "Continuous hunting wastes generation and adds wear to the yaw system." },
    tip: { zh: "比對風速/風向感測訊號，更換風速計並校正後復歸測試。", en: "Cross-check wind signals, replace the anemometer, calibrate, then reset-test." },
  },
  controller_comm: {
    mechanism: { zh: "該機主控制器/通訊模組故障，PLC 與 SCADA 失聯、心跳訊號遺失。", en: "That unit's main controller / comms module fails, losing the PLC–SCADA link and heartbeat." },
    symptom: { zh: "單台機組與 SCADA 失聯、遠端無法控制，但鄰機正常。", en: "One unit loses its SCADA link and remote control, while neighbours are fine." },
    differential: { zh: "鄰機正常排除全場性電網問題，聚焦該機自身控制器/通訊模組。", en: "Healthy neighbours rule out a farm-wide grid issue — focus on that unit's own controller/comms module." },
    consequence: { zh: "失聯期間無法遠端控制與監測，故障難以及時發現。", en: "While offline, no remote control or monitoring — faults go undetected." },
    tip: { zh: "檢查通訊鏈路與控制器狀態燈，更換控制器並回載參數後連線測試。", en: "Check the comms link & status LEDs, replace the controller, restore parameters, then link-test." },
  },
  transformer_overtemp: {
    mechanism: { zh: "機組變壓器油位/油質不良或散熱風道阻塞，油溫過高被迫降載。", en: "Poor transformer oil level/quality or blocked cooling ducts push oil temp high, forcing a derate." },
    symptom: { zh: "變壓器油溫過高、負載受限，而風機機械正常。", en: "High transformer oil temp and limited load, while the turbine mechanicals are normal." },
    differential: { zh: "根因在『油與散熱』而非風機機械，先查油位/油質與散熱風道。", en: "The cause is oil & cooling, not turbine mechanics — check oil level/quality and cooling ducts first." },
    consequence: { zh: "長期過溫使變壓器絕緣劣化，存在跳機與火災風險。", en: "Prolonged overtemp degrades transformer insulation, risking a trip or fire." },
    tip: { zh: "檢查油位/油質與散熱風道，必要時換油並清理散熱後負載測試。", en: "Check oil level/quality & cooling ducts, change oil if needed, clean cooling, then load-test." },
  },
  lift_fault: {
    mechanism: { zh: "塔內升降機制動或限位開關故障，載人運轉有墜落風險，屬工安停用情境。", en: "A faulty service-lift brake or limit switch makes crewed operation a fall risk — an HSE lock-out situation." },
    symptom: { zh: "升降機制動異常、過載保護動作、限位開關報錯。", en: "Abnormal lift brake, overload trips and limit-switch errors." },
    differential: { zh: "這是『工安/HSE』情境而非發電性能問題：安全永遠優先於發電。", en: "This is an HSE situation, not a generation-performance one: safety always comes before output." },
    consequence: { zh: "若帶病載人，制動失效將造成人員墜落的重大工安事故。", en: "Carrying crew on a faulty lift risks a brake failure and a fatal fall — a major HSE incident." },
    tip: { zh: "停用升降機上鎖（LOTO）、改爬梯，先修復制動/限位再載重測試復用。", en: "Lock out the lift (LOTO), use the ladder, fix brake/limit, then load-test before reuse." },
  },
  tower_corrosion: {
    mechanism: { zh: "海上鹽霧/飛濺區腐蝕,犧牲陽極耗盡後陰極保護失效,鋼結構鏽蝕擴展。", en: "Marine salt-spray/splash-zone corrosion: once sacrificial anodes deplete, cathodic protection fails and steel rust spreads." },
    symptom: { zh: "陰極保護電位不足、塗層剝離、飛濺區鏽蝕擴展,而螺栓預拉力正常。", en: "Low cathodic-protection potential, coating loss and spreading splash-zone rust, while bolt preload is fine." },
    differential: { zh: "鏽蝕/陽極電位指向『防蝕系統』;與『螺栓鬆動』(低頻振動+法蘭位移)截然不同。", en: "Rust / anode potential points to the corrosion-protection system — quite distinct from bolt loosening (LF vibration + flange movement)." },
    consequence: { zh: "鏽蝕持續會減薄壁厚、危及基礎/塔架結構壽命與安全。", en: "Ongoing corrosion thins the wall and threatens foundation/tower life and safety." },
    tip: { zh: "量測陰極保護電位,更換犧牲陽極並補修防蝕塗層後複測。", en: "Measure CP potential, replace sacrificial anodes, repair coating, then re-measure." },
  },
  transformer_bushing: {
    mechanism: { zh: "變壓器套管絕緣老化,介質損耗 tanδ 上升並出現局部放電,趨向絕緣擊穿。", en: "Transformer bushing insulation ages: tan-δ rises with partial discharge, heading toward breakdown." },
    symptom: { zh: "套管 tanδ 上升、局部放電,而變壓器油溫與油位正常。", en: "Rising bushing tan-δ and partial discharge, while transformer oil temp and level are normal." },
    differential: { zh: "油溫/油位正常排除『過溫』(散熱);tanδ+局放專指套管絕緣劣化。", en: "Normal temp/level rules out the overtemp (cooling) case; tan-δ + PD specifically indicate bushing insulation." },
    consequence: { zh: "套管擊穿會造成變壓器故障停電,甚至引發火災。", en: "Bushing breakdown causes a transformer outage and can trigger a fire." },
    tip: { zh: "以 tanδ/局放定位劣化套管,更換並做端接與耐壓測試。", en: "Locate the bad bushing via tan-δ/PD, replace it, re-terminate and hi-pot test." },
  },
  cable_joint_heat: {
    mechanism: { zh: "海纜接頭壓接不良使接觸電阻升高,負載電流下局部過熱形成熱點。", en: "A poor cable-joint crimp raises contact resistance, creating a local hotspot under load current." },
    symptom: { zh: "接頭溫升、接觸電阻升高,而對地絕緣電阻正常。", en: "Joint temperature rise and rising contact resistance, while insulation resistance is normal." },
    differential: { zh: "絕緣電阻正常是關鍵:排除『絕緣劣化(局放)』,指向接頭接觸電阻(壓接)。", en: "Normal insulation resistance is key: it rules out insulation degradation (PD) and points to contact resistance (crimp)." },
    consequence: { zh: "持續過熱會燒損接頭、最終演變成接地故障停電。", en: "Sustained overheating burns the joint and eventually escalates to a ground-fault outage." },
    tip: { zh: "以熱影像/接觸電阻定位過熱接頭,重做端接或更換後做溫升測試。", en: "Use thermal imaging / resistance to locate the hot joint, re-terminate or replace, then load-heat test." },
  },
  loto_violation: {
    mechanism: { zh: "設備殘留電能、液壓、彈簧或重力等儲能;未上鎖掛牌與驗電即作業,儲能可能突然釋放傷人。", en: "Equipment retains electrical, hydraulic, spring or gravitational energy; working before lockout/tagout and verification risks a sudden release." },
    symptom: { zh: "隔離點未上個人鎖/未掛牌、未驗電確認零能量,作業許可缺 LOTO 簽核。", en: "No personal lock/tag at the isolation point, no zero-energy verification, and the permit lacks LOTO sign-off." },
    differential: { zh: "這是『程序』缺失而非硬體故障——關鍵在隔離與驗電是否完成,不靠換零件解決。", en: "This is a procedural gap, not a hardware fault — the tell is whether isolation & verification are done, not a part swap." },
    consequence: { zh: "意外送電/洩壓會造成電擊、夾傷或噴濺,屬可致命的重大工安事故。", en: "An unexpected re-energization/release causes shock, crushing or spray — a potentially fatal HSE incident." },
    tip: { zh: "辨識所有能量源→逐一隔離上鎖掛牌→驗電/洩壓確認零能量→作業後依序解鎖。", en: "Identify all energy sources → isolate, lock & tag each → verify zero energy → remove locks in order afterwards." },
  },
  fall_protection: {
    mechanism: { zh: "高處作業的防墜系統(安全帶/SRL/錨點)磨損或不合格,一旦墜落無法有效制動。", en: "At height, a worn or unfit fall-arrest system (harness/SRL/anchor) cannot arrest a fall." },
    symptom: { zh: "安全帶織帶磨損、扣件變形、附近無合規額定錨點,卻仍計畫高處作業。", en: "Worn harness webbing, deformed connectors, no rated anchor nearby — yet work at height is planned." },
    differential: { zh: "屬人員防護(PPE/錨點)問題,與『升降機』機械故障不同——這裡風險是墜落而非載具失效。", en: "A personal-protection (PPE/anchor) issue, distinct from a service-lift mechanical fault — the risk here is falling, not a lift failure." },
    consequence: { zh: "高處墜落多為致命或重傷,且常牽連二次傷害與救援風險。", en: "A fall from height is usually fatal or severe, often with secondary harm and rescue risk." },
    tip: { zh: "檢查並更換不合格裝備、設置合格錨點,全程 100% 繫掛雙鉤接續,並備墜落救援預案。", en: "Inspect/replace unfit gear, set rated anchors, stay 100% tied-off with twin lanyards, and keep a rescue plan." },
  },
  simops_conflict: {
    mechanism: { zh: "同一時段、同一區域有多項作業(如吊裝＋登塔)互相干擾,缺乏協調即產生交叉危害。", en: "Multiple jobs in the same place and time (e.g. lifting + climbing) interfere; without coordination they create cross-hazards." },
    symptom: { zh: "吊重通過人員上方、作業許可衝突、無淨空/隔離區、無統一指揮。", en: "Loads pass over people, permits clash, no exclusion zone, and no single point of command." },
    differential: { zh: "這是『作業協調』問題而非單一設備故障——靠許可、隔離區與分時分區化解,不是換零件。", en: "This is a coordination problem, not a single-equipment fault — resolved by permits, exclusion zones and sequencing, not a part swap." },
    consequence: { zh: "交叉作業易釀落物打擊、夾擠或連鎖事故,後果可能波及多人。", en: "Cross-operations invite dropped-object strikes, crushing or chain incidents that can harm several people." },
    tip: { zh: "開 SIMOPS 協調會、審查作業許可、設淨空隔離區並以對講機統一指揮,分時分區執行。", en: "Run a SIMOPS meeting, review permits, set exclusion zones, command via radio, and sequence by time/zone." },
  },
};

// ───────── 元件分組（多重根因題組）：同一元件可由多種根因造成不同故障 ─────────
export interface ComponentGroup {
  id: string;
  name: I18n;
  icon: string;
  faultIds: string[]; // 該元件的多種根因故障（≥2 即可做鑑別診斷練習）
}

export const COMPONENTS: ComponentGroup[] = [
  { id: "gearbox", name: { zh: "齒輪箱 / 傳動鏈", en: "Gearbox / Drivetrain" }, icon: "⚙️", faultIds: ["gearbox_overheat", "gearbox_bearing_wear"] },
  { id: "yaw", name: { zh: "偏航系統", en: "Yaw System" }, icon: "🧭", faultIds: ["yaw_misalign", "yaw_gear_wear"] },
  { id: "generator", name: { zh: "發電機", en: "Generator" }, icon: "🔌", faultIds: ["gen_vibration", "gen_brush_wear", "gen_overtemp"] },
  { id: "pitch", name: { zh: "變槳系統", en: "Pitch System" }, icon: "🌀", faultIds: ["pitch_fault", "pitch_hydraulic_leak"] },
  { id: "converter", name: { zh: "變流器 / 電力電子", en: "Converter / Power Electronics" }, icon: "⚡", faultIds: ["converter_fault", "converter_igbt"] },
  { id: "blade", name: { zh: "葉片", en: "Blade" }, icon: "🛩️", faultIds: ["blade_crack", "blade_erosion"] },
  { id: "cable", name: { zh: "海纜 / 電氣連接", en: "Cable / Electrical" }, icon: "🪢", faultIds: ["cable_insulation", "cable_joint_heat"] },
  { id: "tower", name: { zh: "塔架 / 結構", en: "Tower / Structure" }, icon: "🏗️", faultIds: ["tower_bolt_loose", "tower_corrosion"] },
  { id: "transformer", name: { zh: "機組變壓器", en: "Turbine Transformer" }, icon: "🔋", faultIds: ["transformer_overtemp", "transformer_bushing"] },
  { id: "sensor", name: { zh: "量測 / 控制", en: "Sensors / Control" }, icon: "📡", faultIds: ["anemometer_fault", "controller_comm"] },
  { id: "lift", name: { zh: "升降機 / 工安 HSE", en: "Service Lift / HSE" }, icon: "🚧", faultIds: ["lift_fault", "loto_violation", "fall_protection", "simops_conflict"] },
];

// 具多重根因（≥2 種故障）的元件——可生成鑑別診斷題組
export const MULTI_CAUSE_COMPONENTS = COMPONENTS.filter((c) => c.faultIds.length >= 2);

// 作業地點（#33）：故障 → 維修場景。資料驅動，可擴充更多場景。
export type RepairLocation = "nacelle" | "hub" | "tower" | "deck";
export const LOCATION_LABEL: Record<RepairLocation, I18n> = {
  nacelle: { zh: "機艙內", en: "Nacelle" },
  hub: { zh: "輪轂/葉根", en: "Hub" },
  tower: { zh: "塔架內", en: "Tower" },
  deck: { zh: "甲板/基礎", en: "Deck" },
};
export const FAULT_LOCATION: Record<string, RepairLocation> = {
  gearbox_overheat: "nacelle",
  yaw_misalign: "nacelle",
  gen_vibration: "nacelle",
  pitch_fault: "hub",
  converter_fault: "tower",
  // 擴充
  gearbox_bearing_wear: "nacelle",
  yaw_gear_wear: "nacelle",
  gen_brush_wear: "nacelle",
  gen_overtemp: "nacelle",
  pitch_hydraulic_leak: "hub",
  converter_igbt: "tower",
  blade_crack: "hub",
  blade_erosion: "hub",
  cable_insulation: "deck",
  tower_bolt_loose: "tower",
  anemometer_fault: "nacelle",
  controller_comm: "nacelle",
  transformer_overtemp: "tower",
  lift_fault: "tower",
  tower_corrosion: "deck",
  transformer_bushing: "tower",
  cable_joint_heat: "deck",
  loto_violation: "tower",
  fall_protection: "nacelle",
  simops_conflict: "deck",
};
export const locationOf = (faultId: string): RepairLocation => FAULT_LOCATION[faultId] ?? "nacelle";

// 重大作業（需重吊／安裝船 jack-up 出動）：大型組件更換，如發電機軸承、主軸承、葉片。
export const MAJOR_FAULTS: string[] = ["gen_vibration", "gearbox_bearing_wear", "blade_crack"];
export const isMajorFault = (faultId: string): boolean => MAJOR_FAULTS.includes(faultId);

// 故障型錄的運維層級（#76）：依嚴重度/組件大小分層，供圖鑑與 UI 漸進揭露（入門只見 Tier 1 故障）。
// 與 incidents.ts 的 minTier 同調：耗材小修=1、中組件=2、較大組件=3、最大組件更換=4。
export const FAULT_TIER: Record<string, number> = {
  // Tier 1：入門耗材級小修
  gearbox_overheat: 1, anemometer_fault: 1, yaw_misalign: 1, gen_brush_wear: 1,
  // Tier 2：中組件
  pitch_fault: 2, yaw_gear_wear: 2, pitch_hydraulic_leak: 2, converter_fault: 2,
  blade_erosion: 2, tower_bolt_loose: 2, controller_comm: 2, transformer_overtemp: 2,
  lift_fault: 2, gen_overtemp: 2,
  // Tier 2：結構防蝕
  tower_corrosion: 2,
  // Tier 2：HSE 工安情境（LOTO / 墜落防護 / SIMOPS）
  loto_violation: 2, fall_protection: 2, simops_conflict: 2,
  // Tier 3：較大組件
  gen_vibration: 3, converter_igbt: 3, cable_insulation: 3, transformer_bushing: 3, cable_joint_heat: 3,
  // Tier 4：最大組件更換（重吊/安裝船）
  gearbox_bearing_wear: 4, blade_crack: 4,
};
export const faultTier = (faultId: string): number => FAULT_TIER[faultId] ?? 1;

// 工單池（#4）：每筆工單對應一種故障，完成後輪替到下一筆。
export const QUEST_POOL: Quest[] = [
  {
    id: "q_ch12",
    title: { zh: "齒輪箱搶修 · CH-12 號機組", en: "Gearbox repair · CH-12" },
    brief: { zh: "前往「彰化外海・CH-12」，於浪高 1.5m 內排除齒輪箱過熱告警並回報 SCADA。", en: "Sail to Changhua CH-12; clear the gearbox overheat alarm within 1.5m wave height." },
    unit: "CH-12", targetFault: "gearbox_overheat", rewardBudget: 180_000, rewardXp: 120,
  },
  {
    id: "q_ch07",
    title: { zh: "偏航校正 · CH-07 號機組", en: "Yaw service · CH-07" },
    brief: { zh: "CH-07 偏航失準、無法迎風，登塔排除並複歸定位。", en: "CH-07 yaw misaligned; restore homing and report." },
    unit: "CH-07", targetFault: "yaw_misalign", rewardBudget: 800_000, rewardXp: 110,
  },
  {
    id: "q_ch21",
    title: { zh: "發電機診斷 · CH-21 號機組", en: "Generator check · CH-21" },
    brief: { zh: "CH-21 發電機振動超標，採頻譜定位並更換軸承。", en: "CH-21 generator vibration high; locate via spectrum and replace bearing." },
    unit: "CH-21", targetFault: "gen_vibration", rewardBudget: 1_900_000, rewardXp: 140,
  },
  {
    id: "q_ch03",
    title: { zh: "變槳檢修 · CH-03 號機組", en: "Pitch service · CH-03" },
    brief: { zh: "CH-03 強風下無法順槳，檢查後備電源並排除。", en: "CH-03 can't feather in high wind; check backup power." },
    unit: "CH-03", targetFault: "pitch_fault", rewardBudget: 160_000, rewardXp: 130,
  },
  {
    id: "q_ch18",
    title: { zh: "變流器搶修 · CH-18 號機組", en: "Converter repair · CH-18" },
    brief: { zh: "CH-18 變流器反覆過溫跳脫，檢查冷卻系統。", en: "CH-18 converter trips on overtemp; inspect cooling." },
    unit: "CH-18", targetFault: "converter_fault", rewardBudget: 2_700_000, rewardXp: 125,
  },
];

export const questAt = (i: number): Quest => QUEST_POOL[i % QUEST_POOL.length];
