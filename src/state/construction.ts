import type { I18n } from "../game/systems/types";

// 風場建置番外篇短戰役（#1）：帶玩家走一遍離岸風場 EPC 建置流程
// 調查 → 基礎型式 → 海事動員 → 基礎安裝 → 海纜 → 變電站 → 風機吊裝 → 試運轉併網。
// 每階段 = 一個工程決策（取捨型），good 決策推高「建置品質/聲望」分數,差決策扣分並增加成本/工期。
export interface BuildChoice {
  label: I18n;
  feedback: I18n; // 教學回饋（為什麼）
  good: boolean;
  days: number; // 工期（天）
  cost: number; // 成本 ◎
  score: number; // 建置品質/聲望分 Δ
}

export interface BuildStage {
  id: string;
  phase: number; // 1..N 顯示用
  icon: string;
  title: I18n;
  vessel: I18n; // 該階段主力船機（教學）
  scenario: I18n; // 工程情境
  narration?: I18n; // 旁白/說書（選用）
  choices: BuildChoice[];
}

export const BUILD_STAGES: BuildStage[] = [
  {
    id: "survey", phase: 1, icon: "🛰️",
    title: { zh: "場址調查與選址", en: "Site Survey & Selection" },
    vessel: { zh: "調查船 · 地質鑽探", en: "Survey vessel · geotech" },
    scenario: { zh: "新風場開發起步:需先掌握海床地質、風況與海象,才能定出基礎型式與機組佈局。", en: "A new farm begins: you need seabed geology, wind & metocean data before fixing the foundation type and layout." },
    narration: { zh: "「沒有可靠的地質與風況資料,後面每一步都是賭注。」", en: "\"Without solid geotech & wind data, every later step is a gamble.\"" },
    choices: [
      { label: { zh: "完整地質鑽探＋一年風況實測", en: "Full geotech borings + 1-yr wind campaign" }, good: true, days: 3, cost: 4_000_000, score: 3, feedback: { zh: "✓ 紮實的前期調查降低後續設計與施工風險,是最划算的投資。", en: "✓ Thorough up-front surveys cut design & construction risk — the best-value investment." } },
      { label: { zh: "只做最低限度抽樣、趕開工", en: "Minimal sampling, rush to start" }, good: false, days: 1, cost: 1_000_000, score: -3, feedback: { zh: "✗ 資料不足會在基礎與海纜階段付出更大代價(設計變更/沉樁異常)。", en: "✗ Thin data costs far more later (design changes, pile refusal)." } },
    ],
  },
  {
    id: "foundation_type", phase: 2, icon: "📐",
    title: { zh: "基礎型式選定", en: "Foundation Type" },
    vessel: { zh: "設計階段", en: "Design phase" },
    scenario: { zh: "依據水深與地質選定基礎:淺水砂質常用單樁(monopile);深水或軟弱地質可用套筒式(jacket)。", en: "Pick a foundation by depth & soil: monopile for shallow sand; jacket for deeper or weak soils." },
    choices: [
      { label: { zh: "依地質數據選最適型式", en: "Choose the type that fits the geotech" }, good: true, days: 2, cost: 2_000_000, score: 3, feedback: { zh: "✓ 型式與地質匹配,承載與疲勞壽命才有保障。", en: "✓ Matching type to soil secures bearing capacity & fatigue life." } },
      { label: { zh: "全場統一用最便宜的單樁", en: "Force the cheapest monopile everywhere" }, good: false, days: 1, cost: 1_200_000, score: -2, feedback: { zh: "✗ 軟弱地質硬用單樁,沉樁/穩定性風險高、恐返工。", en: "✗ Monopiles in weak soil risk pile instability & rework." } },
    ],
  },
  {
    id: "mobilize", phase: 3, icon: "⚓",
    title: { zh: "海事工程動員", en: "Marine Spread Mobilisation" },
    vessel: { zh: "安裝船 · 重吊 · 鋪纜船", en: "Jack-up · heavy-lift · cable-lay" },
    scenario: { zh: "安裝船與重吊船檔期緊、租金高。要在有限的施工季把船機調度到位。", en: "Installation & heavy-lift vessels are scarce and pricey; mobilise the spread within the build season." },
    narration: { zh: "「離岸工程,船機檔期就是命脈;一天待命費都是天文數字。」", en: "\"Offshore, the vessel schedule is everything — a single standby day is astronomical.\"" },
    choices: [
      { label: { zh: "整合船期、依施工季窗口排程", en: "Bundle charters around the build-season window" }, good: true, days: 2, cost: 6_000_000, score: 3, feedback: { zh: "✓ 善用施工季與整合船期,把昂貴船機的待命浪費降到最低。", en: "✓ Using the season & bundling charters minimises costly vessel standby." } },
      { label: { zh: "各工項臨時分別租船", en: "Charter ad-hoc per work item" }, good: false, days: 3, cost: 9_000_000, score: -2, feedback: { zh: "✗ 零散租賃使待命費與檔期風險暴增。", en: "✗ Piecemeal charters explode standby cost & schedule risk." } },
    ],
  },
  {
    id: "foundation_install", phase: 4, icon: "🔨",
    title: { zh: "基礎安裝 · 打樁", en: "Foundation Install · Piling" },
    vessel: { zh: "安裝船 · 打樁錘", en: "Jack-up · hydraulic hammer" },
    scenario: { zh: "打樁噪音會傷害海洋哺乳動物,環評要求噪音抑制。同時須嚴控垂直度與貫入深度。", en: "Pile-driving noise harms marine mammals; the permit requires noise mitigation. Verticality & penetration must be controlled." },
    choices: [
      { label: { zh: "佈設氣泡幕降噪、依環評施工", en: "Deploy a bubble curtain, pile per permit" }, good: true, days: 4, cost: 7_000_000, score: 3, feedback: { zh: "✓ 氣泡幕降噪兼顧生態與法遵,維護社會許可。", en: "✓ A bubble curtain protects wildlife & compliance, keeping social licence." } },
      { label: { zh: "省略降噪、全速打樁", en: "Skip mitigation, hammer at full speed" }, good: false, days: 2, cost: 4_000_000, score: -4, feedback: { zh: "✗ 違反環評恐遭停工重罰,得不償失。", en: "✗ Breaching the permit risks a stop-work order & heavy fines." } },
    ],
  },
  {
    id: "cable", phase: 5, icon: "🪢",
    title: { zh: "海纜鋪設與埋設", en: "Cable Lay & Burial" },
    vessel: { zh: "鋪纜船 · 埋設犁/ROV", en: "Cable-lay vessel · plough/ROV" },
    scenario: { zh: "陣列海纜與輸出海纜須鋪設並埋設至足夠深度,避免漁業與走錨勾損。", en: "Array & export cables must be laid and buried deep enough to avoid fishing & anchor damage." },
    narration: { zh: "「海纜故障是離岸最貴的停電——埋設深度不能省。」", en: "\"Cable faults are the costliest offshore outage — never skimp on burial depth.\"" },
    choices: [
      { label: { zh: "達標埋設深度＋路由避讓", en: "Bury to spec depth + route avoidance" }, good: true, days: 3, cost: 5_000_000, score: 3, feedback: { zh: "✓ 足夠埋深與良好路由大幅降低未來海纜故障。", en: "✓ Adequate burial & good routing slash future cable faults." } },
      { label: { zh: "淺埋搶工期", en: "Shallow-bury to save time" }, good: false, days: 2, cost: 3_500_000, score: -3, feedback: { zh: "✗ 淺埋海纜易遭勾損,營運期故障代價極高。", en: "✗ Shallow cables get snagged — hugely costly faults in operation." } },
    ],
  },
  {
    id: "substation", phase: 6, icon: "🏭",
    title: { zh: "海上變電站吊裝", en: "Offshore Substation Lift" },
    vessel: { zh: "重吊船 (heavy-lift)", en: "Heavy-lift vessel" },
    scenario: { zh: "數千噸的變電站上部結構需在合適海象窗以重吊船一次吊裝就位。", en: "The multi-thousand-tonne substation topside must be lifted into place in a suitable weather window." },
    choices: [
      { label: { zh: "等合適海象窗、精準吊裝", en: "Wait for the window, lift precisely" }, good: true, days: 3, cost: 8_000_000, score: 3, feedback: { zh: "✓ 重吊作業海象敏感,等窗口是安全與品質的保證。", en: "✓ Heavy lifts are weather-sensitive; waiting for the window ensures safety & quality." } },
      { label: { zh: "海象邊緣硬吊趕進度", en: "Lift in marginal seas to keep schedule" }, good: false, days: 2, cost: 6_000_000, score: -4, feedback: { zh: "✗ 邊緣海象吊裝風險極高,碰撞/掉落代價無法承受。", en: "✗ Lifting in marginal seas risks an unaffordable collision/drop." } },
    ],
  },
  {
    id: "turbine", phase: 7, icon: "🏗️",
    title: { zh: "風機吊裝", en: "Turbine Erection" },
    vessel: { zh: "安裝船 (Jack-up)", en: "Jack-up vessel" },
    scenario: { zh: "以自升式安裝船逐台吊裝塔筒、機艙與葉片。葉片單葉吊裝對風速極敏感。", en: "Erect tower, nacelle & blades unit by unit with a jack-up. Single-blade lifts are very wind-sensitive." },
    narration: { zh: "「葉片吊裝是整個工程最看天吃飯的一刻。」", en: "\"Blade lifts are the most weather-dependent moment of the whole build.\"" },
    choices: [
      { label: { zh: "依風速限值分段吊裝、確實鎖固", en: "Lift within wind limits, torque to spec" }, good: true, days: 5, cost: 9_000_000, score: 3, feedback: { zh: "✓ 遵守吊裝風速限值與鎖固規範,確保結構完整與安全。", en: "✓ Respecting wind limits & bolt torque ensures structural integrity & safety." } },
      { label: { zh: "搶風速空檔連續硬吊", en: "Push continuous lifts through gusts" }, good: false, days: 3, cost: 7_000_000, score: -4, feedback: { zh: "✗ 超限吊裝葉片擺盪、碰撞與人員風險俱高。", en: "✗ Over-limit lifts cause blade sway, collisions & crew risk." } },
    ],
  },
  {
    id: "commission", phase: 8, icon: "⚡",
    title: { zh: "試運轉與併網", en: "Commissioning & Grid Connection" },
    vessel: { zh: "CTV · 試運轉團隊", en: "CTV · commissioning team" },
    scenario: { zh: "逐台試運轉、通過併網規範(電網法規)測試,再正式移交運維(O&M)團隊。", en: "Commission each unit, pass grid-code tests, then hand over to the O&M team." },
    narration: { zh: "「建得好,只是開始;交得穩,運維才接得住。」", en: "\"Building it well is just the start — a clean handover is what O&M needs.\"" },
    choices: [
      { label: { zh: "完整試運轉＋併網測試＋文件移交", en: "Full commissioning + grid tests + doc handover" }, good: true, days: 3, cost: 3_000_000, score: 3, feedback: { zh: "✓ 完整測試與文件移交讓運維期妥善率有保障——番外篇完美收官!", en: "✓ Full testing & documentation secure operational availability — a perfect finish!" } },
      { label: { zh: "草草點交、文件後補", en: "Rushed handover, docs later" }, good: false, days: 1, cost: 1_500_000, score: -3, feedback: { zh: "✗ 文件與測試不全,運維期才發現缺陷,代價更高。", en: "✗ Incomplete docs/tests surface as defects in operation — costlier later." } },
    ],
  },
];

export const BUILD_STAGE_COUNT = BUILD_STAGES.length;
// 滿分（全程最佳決策）
export const BUILD_MAX_SCORE = BUILD_STAGES.reduce((sum, s) => sum + Math.max(...s.choices.map((c) => c.score)), 0);

// 完成獎勵（基礎 + 依品質分加成）：EPC 建置完成、移交運維。
export const BUILD_REWARD_BASE = 6_000_000;
export const BUILD_REWARD_PER_SCORE = 300_000;
export const BUILD_REWARD_XP = 300;

// 依品質分給評等
export function buildGrade(score: number): { zh: string; en: string } {
  const r = BUILD_MAX_SCORE > 0 ? score / BUILD_MAX_SCORE : 0;
  if (r >= 0.95) return { zh: "S · 標竿工程", en: "S · Benchmark build" };
  if (r >= 0.7) return { zh: "A · 優良交付", en: "A · Strong delivery" };
  if (r >= 0.4) return { zh: "B · 順利完工", en: "B · Completed" };
  if (r >= 0) return { zh: "C · 勉強過關", en: "C · Scraped through" };
  return { zh: "D · 問題重重", en: "D · Troubled" };
}
