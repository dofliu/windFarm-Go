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
};

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
};
export const locationOf = (faultId: string): RepairLocation => FAULT_LOCATION[faultId] ?? "nacelle";

// 重大作業（需重吊／安裝船 jack-up 出動）：大型組件更換，如發電機軸承、主軸承、葉片。
export const MAJOR_FAULTS: string[] = ["gen_vibration", "gearbox_bearing_wear", "blade_crack"];
export const isMajorFault = (faultId: string): boolean => MAJOR_FAULTS.includes(faultId);

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
