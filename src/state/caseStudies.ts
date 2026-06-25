// 真實案例研究事件（#case-studies）：把過去真實風場「踩過的坑」做成可學習的特殊事件。
// 設計(經研究+雙重事實/敏感度查核後採用):
//  - framing="named-with-sources":系統性/公開紀錄/業界統計案例 → 遊戲內具名 + 附出處連結。
//  - framing="anonymized-technical":可能涉特定在世公司過失/進行中爭議者 → 保留真實技術情境與教訓,
//    但用中性代稱;sources 仍存於資料(供維護者查證),UI 不顯示具名連結(visibleSources 回空)。
//  - 永久收錄於圖鑑「案例檔」,依運維層級 Tier(#76)漸進解鎖;由 advance() 以極低機率偶發快報。
//  - 事實安全:只陳述已驗證的技術機制與 O&M 教訓;未公開根因以「據報/調查指出/典型而言」限定,不寫成定論。
import type { I18n } from "../game/systems/types";
import type { Discipline } from "./game";

export type CaseFraming = "named-with-sources" | "anonymized-technical";
export type CaseCategory = "foundation" | "gearbox_bearing" | "blade" | "cable" | "electrical_fire" | "vessel" | "bolt" | "ice";

export interface CaseChoice {
  label: I18n;
  feedback: I18n; // 教學回饋:為什麼(含正解的 O&M lesson)
  good: boolean;
  eff: { a?: number; b?: number; s?: number; g?: number }; // 與沙盒 TaskEffect 同構(僅作教學標示,案例檔不改變主存檔數值)
}

export interface CaseStudy {
  id: string; // 'cs_' 前綴,全域唯一
  framing: CaseFraming;
  category: CaseCategory;
  discipline: Discipline;
  minTier: number; // 解鎖層級(#76):複雜/敏感者排到高 tier
  year?: string;
  title: I18n;
  scenario: I18n; // 事件當下視角(2–4 句)
  lesson: I18n; // 事後復盤的 O&M 教訓
  choices: CaseChoice[]; // ≥2 且 ≥1 good
  relatesTo: { faultId?: string; incidentId?: string }; // 連回既有圖鑑/故障池,不重建
  sources: string[]; // named 必填非空;anonymized 仍存但 UI 不顯示
  weight: number; // 偶發抽樣權重(極低,避免洗版)
  sensitivity: "low" | "medium" | "high";
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "cs_monopile_grout_slip", framing: "named-with-sources", category: "foundation", discipline: "structural", minTier: 3, year: "2009-2010",
    title: { zh: "歐洲單樁灌漿連接滑移潮(OWEZ 等,2009–2010)", en: "Europe-wide monopile grouted-connection slippage (OWEZ et al., 2009–2010)" },
    scenario: { zh: "例行檢查發現過渡段相對單樁向下滑移最多約 90mm,全歐約 700/1000 支光面圓柱灌漿連接受影響。摩擦式接合在動態彎矩下被反覆磨蝕、灌漿壓碎,軸向承載悄悄失效。你的風場用的是同型無剪力鍵連接。", en: "Inspections found transition pieces sliding down piles by up to ~90mm; ~700 of ~1,000 European plain cylindrical grouted connections were affected. Under cyclic bending the friction joint abrades and the grout crushes, silently losing axial capacity. Your fleet uses the same shear-key-free connection." },
    lesson: { zh: "把『TP 相對沉降』當作完整性領先指標:交機時建立基準、定期量測滑移與傾斜趨勢。光面圓柱灌漿連接不可假設能承載 20–25 年軸向載重,需加裝機械托架/楔塊/橡膠支承或改錐形/加剪力鍵。", en: "Treat TP relative settlement as a leading integrity metric: baseline at commissioning, trend slip & tilt. Plain cylindrical grout joints can't be assumed to carry axial load for 20–25 yr — add brackets/wedges/elastomeric bearings or re-engineer to conical/shear-keyed connections." },
    choices: [
      { label: { zh: "建立沉降基準並定期趨勢追蹤＋規劃加裝軸向止擋", en: "Baseline settlement, trend it & plan a positive axial restraint" }, good: true, feedback: { zh: "✓ 正解:此為漸進、無聲的失效,趨勢監測＋補強載重路徑才治本。", en: "✓ Progressive silent failure — trending plus a retrofitted load path is the real fix." }, eff: { a: 4, b: -800000 } },
      { label: { zh: "通過設計規範就視為安全,不額外監測", en: "It passed code at design — assume it's safe" }, good: false, feedback: { zh: "✗ 規範(DNV-OS-J101)當時高估了承載,合規不等於適用。", en: "✗ The code (DNV-OS-J101) overestimated capacity — compliance ≠ fitness." }, eff: { a: -6, s: 1 } },
    ],
    relatesTo: { incidentId: "corrosion", faultId: "tower_corrosion" },
    sources: ["https://www.windpowermonthly.com/article/1011507/offshore-monopile-failure-solution-may-sight", "https://www.sciencedirect.com/science/article/abs/pii/S0951833913000191"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_robin_rigg_code_error", framing: "named-with-sources", category: "foundation", discipline: "structural", minTier: 3, year: "2010-2017",
    title: { zh: "Robin Rigg 與 DNV-OS-J101 規範錯誤(2010–2017)", en: "Robin Rigg & the DNV-OS-J101 code error (2010–2017)" },
    scenario: { zh: "Robin Rigg 基礎安裝後不久灌漿連接失能、TP 下滑。後查出設計規範的參數式有約 10 倍誤差,使全業界高估灌漿軸向承載。英國最高法院 2017 判承包商雖『依規範』仍須負 20 年壽命的『適用性』責任。", en: "Soon after install, Robin Rigg's grouted connections lost capacity and TPs slipped. A ~factor-of-10 error in the design code led the industry to overestimate grout axial capacity. In 2017 the UK Supreme Court held the contractor liable for a 20-yr fitness-for-purpose duty despite following the code." },
    lesson: { zh: "合規不保證適用:資產完整性方案須獨立驗證關鍵連接真能達到設計壽命,並把規範/共用設計假設的缺陷視為『機隊級』風險,發現一支就全機隊普查。釐清『適用性 vs 僅合規』的責任歸屬決定誰付改造費。", en: "Compliance isn't fitness: independently verify critical connections meet design life, treat a code/shared-assumption defect as a fleet-level risk (one flag → inspect all), and pin down who owns design-life risk." },
    choices: [
      { label: { zh: "視為機隊級系統性缺陷,全數同型基礎普查", en: "Treat as systemic — inspect all same-type foundations" }, good: true, feedback: { zh: "✓ 根因在規範本身,非單一基礎,須 portfolio 級處理。", en: "✓ Root cause is the code itself, not one foundation — handle at portfolio level." }, eff: { a: 3, b: -1000000 } },
      { label: { zh: "當成單一基礎個案修一修就好", en: "Fix the one slipping foundation as a one-off" }, good: false, feedback: { zh: "✗ 同型全機隊都有相同隱患,逐案處理會漏。", en: "✗ Every same-type unit shares the flaw — case-by-case misses it." }, eff: { a: -5, s: 1 } },
    ],
    relatesTo: { faultId: "tower_bolt_loose" },
    sources: ["https://www.offshorewind.biz/2017/08/03/e-on-wins-robin-rigg-dispute-against-mt-hojgaard/"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_scour_protection_two_modes", framing: "named-with-sources", category: "foundation", discipline: "structural", minTier: 3, year: "2002-2016",
    title: { zh: "沖刷的兩種面貌:Scroby Sands 開放沖刷 vs Horns Rev 防護下沉", en: "Two faces of scour: Scroby Sands open scour vs Horns Rev protection sinking" },
    scenario: { zh: "Scroby Sands 強潮流細砂床,無/不足防護的單樁出現約 1.4 倍樁徑深的沖刷坑;Horns Rev 1 的塊石防護則因砂粒穿過濾層被淘空,整層約三年內下沉達 1.5m、海纜外露。兩者都改變基礎勁度與固有頻率。", en: "At Scroby Sands' strong-tide fine-sand bed, under-protected monopiles scoured to ~1.4× pile diameter; at Horns Rev 1 the rock protection itself sank ~1.5m in ~3 years as sand winnowed up through the filter, exposing cables. Both shift foundation stiffness and natural frequency." },
    lesson: { zh: "沖刷是單樁在動砂床的首要、反覆 O&M 威脅,且『裝了防護不等於沒事』。定期測深以樁徑(D)為單位追蹤坑深、監測固有頻率;依實際海床(波浪 vs 潮流)選防護,動砂床塊石易被淘空,需用足夠厚度級配濾層,並把補石列為生命週期成本。", en: "Scour is the primary recurring monopile threat in mobile beds — and placing protection doesn't end it. Trend pit depth in pile diameters (D), watch natural frequency, size protection to the real driver (waves vs current), and budget rock top-ups as a lifecycle cost." },
    choices: [
      { label: { zh: "定期測深＋頻率監測,並依海床選對防護型式", en: "Repeat bathymetry + frequency monitoring; match protection to the seabed" }, good: true, feedback: { zh: "✓ 開放沖刷與防護下沉都靠測深趨勢早抓;選型要對驅動力。", en: "✓ Both modes are caught by bathymetric trending; pick protection for the real driver." }, eff: { a: 3, b: -600000 } },
      { label: { zh: "拋一次塊石就當永久解決", en: "Dump rock once and call it solved" }, good: false, feedback: { zh: "✗ 塊石會被淘空/下沉,坑也會重新形成。", en: "✗ Rock can sink/winnow away and pits reform." }, eff: { a: -4, s: 1 } },
    ],
    relatesTo: { incidentId: "corrosion", faultId: "tower_corrosion" },
    sources: ["https://www.offshorewind.biz/2016/02/04/norfolk-marines-tfn-scour-remediation-system-installed-at-scroby-sands/"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_gearbox_bearing_wec_grc", framing: "named-with-sources", category: "gearbox_bearing", discipline: "mechanical", minTier: 3, year: "2007-ongoing",
    title: { zh: "齒輪箱軸承才是頭號殺手:NREL GRC 與白蝕裂紋(WEC)", en: "Bearings are the No.1 killer: NREL GRC & White Etching Cracks (WEC)" },
    scenario: { zh: "NREL 齒輪箱可靠度資料庫指出:失效主因是『軸承』而非齒輪,高速/中速級的軸向裂紋最常見,常在額定 L10 壽命的 5–20% 就失效。WEC 由擴散氫脆化＋微滑/電流等多因耦合促成。你手上一台齒輪箱油液金屬屑與高頻振動同步上升。", en: "NREL's gearbox database shows bearings — not gears — are the dominant failure origin; HSS/IMS axial cracks are most common, often failing at 5–20% of rated L10. WEC is a coupled chemo-mechanical mechanism. One of your gearboxes shows rising oil debris and HF vibration together." },
    lesson: { zh: "別信銘牌 L10 壽命:假設早期風險並據此布置監測與備品。以振動 CMS(軸承特徵頻率)＋油液碎屑/含水監測提早抓住次表層損傷;源頭緩解選 WEC 抗性軸承、驗證過的潤滑添加劑、控制進水、消除軸電流。用訊號規劃在天氣窗換軸承,而非等失效。", en: "Don't trust nameplate L10: assume early-life risk. Use vibration CMS at bearing frequencies + oil-debris/water monitoring; mitigate at root (WEC-resistant bearings, validated lubricants, water control, shaft grounding). Plan swaps in weather windows, don't react to failure." },
    choices: [
      { label: { zh: "停機內視鏡確認＋換軸承,並導入 CMS/油液監測", en: "Borescope & replace bearing; add CMS + oil-debris monitoring" }, good: true, feedback: { zh: "✓ 金屬屑＋高頻振動是剝離指紋;提早換比飛車剝落便宜得多。", en: "✓ Debris + HF vibration is the spalling signature — early swap beats catastrophic spalling." }, eff: { a: 3, b: -700000 } },
      { label: { zh: "只換油、相信原廠 L10 壽命繼續轉", en: "Just change oil and trust the rated L10 life" }, good: false, feedback: { zh: "✗ L10 嚴重高估實際壽命;換油不治次表層裂紋。", en: "✗ L10 overstates field life; oil change won't stop subsurface cracks." }, eff: { a: -5, s: 1 } },
    ],
    relatesTo: { incidentId: "bearing", faultId: "gearbox_bearing_wear" },
    sources: ["https://www.energy.gov/cmei/systems/articles/statistics-show-bearing-problems-cause-majority-wind-turbine-gearbox-failures", "https://evolution.skf.com/premature-bearing-failures-in-wind-gearboxes-and-white-etching-cracks-wec/"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_bearing_currents_fluting", framing: "named-with-sources", category: "gearbox_bearing", discipline: "electrical", minTier: 3, year: "2010s-ongoing",
    title: { zh: "軸電流 / 電蝕(EDM)與軸承搓板紋(fluting)", en: "Bearing currents / EDM & fluting" },
    scenario: { zh: "變流器供電機組的發電機與高速軸軸承出現 EDM 電蝕:PWM 共模電壓在軸上累積、擊穿油膜對地放電,刻出搓板狀『fluting』並劣化潤滑、誘發 WEC。某機高頻振動在約 2–4kHz 出現能量團、軸對地電壓偏高。", en: "On converter-fed turbines, generator/HSS bearings suffer EDM damage: PWM common-mode voltage builds on the shaft, breaks down the oil film and discharges to ground, cutting a washboard 'fluting' pattern, degrading lubricant and seeding WEC. One unit shows HF vibration energy near 2–4kHz and high shaft-to-ground voltage." },
    lesson: { zh: "要『電氣式』診斷:fluting 在高頻頻譜與軸對地電壓/電流上現形,須與純機械磨耗區分。源頭預防是提供繞過軸承的低阻抗路徑:軸接地環/碳刷、絕緣/陶瓷混合軸承、共模扼流/濾波、主軸接地;定檢要驗接地完整性。", en: "Diagnose electrically: fluting shows in HF spectra and shaft-to-ground voltage — distinguish from mechanical wear. Prevent at source with a low-impedance bypass: grounding rings/brushes, insulated/ceramic hybrid bearings, common-mode chokes, shaft grounding — and verify grounding integrity at service." },
    choices: [
      { label: { zh: "量軸對地電壓確認電蝕,加裝軸接地環/混合軸承", en: "Confirm via shaft-to-ground voltage; fit grounding ring/hybrid bearing" }, good: true, feedback: { zh: "✓ 對因處理:先區分電 vs 機,再給電流一條繞過軸承的路。", en: "✓ Fix the real cause: separate electrical vs mechanical, then bypass the bearing." }, eff: { a: 3, b: -400000 } },
      { label: { zh: "當成一般機械磨耗只換軸承", en: "Treat as ordinary mechanical wear, just swap the bearing" }, good: false, feedback: { zh: "✗ 不除軸電流,新軸承會再被電蝕。", en: "✗ Without removing the current, the new bearing flutes again." }, eff: { a: -4, s: 1 } },
    ],
    relatesTo: { incidentId: "brush", faultId: "gen_brush_wear" },
    sources: ["https://www.windpowerengineering.com/a-better-way-to-protect-generator-bearings/", "https://www.mdpi.com/1996-1073/11/5/1305/htm"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_blade_bonding_quality_escape", framing: "anonymized-technical", category: "blade", discipline: "structural", minTier: 4, year: "2024",
    title: { zh: "某 ~107m 葉片膠合不足斷裂(製造品質逃逸)", en: "A ~107m blade fractures from insufficient bonding (manufacturing quality escape)" },
    scenario: { zh: "某北美外海風場一支約 107m 大型葉片在『高振動』警報停機約六小時後斷裂解體,玻纖與泡棉碎片入海漂上岸。事後回溯安裝葉片的製程數據,找出更多膠合不足的同廠葉片,主管機關要求移除該廠所有葉片。據調查屬製造/NDT 檢驗逃逸,非設計缺陷。", en: "At a North American offshore site, a ~107m blade fractured ~6 hours after a 'high vibration' alarm tripped the unit, scattering fiberglass and foam into the sea and onto beaches. Re-mining factory process data found more under-bonded blades from the same plant; the regulator ordered removal of all that factory's blades. Per the investigation, a manufacturing/NDT quality escape, not a design flaw." },
    lesson: { zh: "製造品質逃逸會潛伏到在役才以災難性失效現形;高振動警報確實正確跳機,驗證 CMS 是最後防線,但無法阻止碎片入海。正解是用『全機隊製程數據鑑識』(依工廠/序號回溯)界定系列缺陷,並在葉片出廠前加嚴並獨立稽核 NDT/膠合線驗收;事前備妥外海碎片圍堵與環境應變程序。", en: "Quality escapes lie dormant until catastrophic in-service failure; the high-vibration trip validated CMS as a last line of defense but can't prevent debris release. The fix: fleet-wide manufacturing-data forensics (by factory/serial) to scope a serial defect, tightened & independently audited NDT/bond-line acceptance before blades ship, and pre-planned offshore debris containment." },
    choices: [
      { label: { zh: "依製程數據回溯全機隊同廠葉片並停機檢查", en: "Re-mine process data; ground & inspect all same-factory blades" }, good: true, feedback: { zh: "✓ 系列缺陷要用製程鑑識界定範圍,不是逐台等壞。", en: "✓ A serial defect is scoped by process forensics, not by waiting unit-by-unit." }, eff: { a: 4, b: -1500000, s: 1 } },
      { label: { zh: "視為單一葉片偶發,換掉就好", en: "Treat as a one-off blade and just replace it" }, good: false, feedback: { zh: "✗ 同廠序號可能共享膠合不足,漏掉會再斷。", en: "✗ Same-factory serials may share the defect — missing them means another break." }, eff: { a: -6, s: 2 } },
    ],
    relatesTo: { incidentId: "blade", faultId: "blade_crack" },
    sources: ["https://www.utilitydive.com/news/ge-vernova-blade-vineyard-wind-manufacturing-failure/722345/"],
    weight: 1, sensitivity: "high",
  },
  {
    id: "cs_leading_edge_erosion_campaign", framing: "anonymized-technical", category: "blade", discipline: "structural", minTier: 2, year: "2018",
    title: { zh: "離岸葉片前緣侵蝕的大規模修復改裝(去識別)", en: "Offshore leading-edge erosion retrofit campaign (anonymized)" },
    scenario: { zh: "某數座離岸風場的 3.6MW 機隊前緣侵蝕嚴重:雨、冰雹、海鹽噴霧在約 80–90 m/s 葉尖速反覆撞擊,剝除膠衣與層板,粗糙化擾流增阻降升,每台 AEP 可少達約 5%。常拖到保固到期巡檢才發現,屆時大量葉片已受影響。", en: "Across several offshore sites, a 3.6MW fleet suffered severe leading-edge erosion: rain, hail and salt spray at ~80–90 m/s tip speed strip the gel-coat, roughening the edge, raising drag and cutting lift — up to ~5% AEP loss per turbine. Often found only at end-of-warranty inspection, by which time many blades are affected." },
    lesson: { zh: "把前緣侵蝕當『可預期的漸進劣化』而非意外:定期無人機/繩索巡檢並做嚴重度分級,趁修復便宜、AEP 損失小時就介入;依場址雨蝕氣候指定/加裝前緣保護(膠帶/外殼/塗層),考慮雨天降葉尖速的『侵蝕安全模式』;把修復＋保護殼＋氣動升級綁進同一次外海作業攤平船舶成本。", en: "Treat erosion as predictable progressive degradation: schedule recurring drone/rope inspections with severity grading, intervene early when repair is cheap; specify/retrofit leading-edge protection sized to the site rain climate, consider erosion-safe-mode tip-speed curtailment, and bundle repair+shell+aero-upgrade in one access campaign." },
    choices: [
      { label: { zh: "排定分級巡檢、早期修補並加裝前緣保護", en: "Schedule graded inspections, early repair & leading-edge protection" }, good: true, feedback: { zh: "✓ 早修便宜又保住 AEP;保護帶/殼可延緩劣化。", en: "✓ Early repair is cheap and saves AEP; tape/shell slows the damage." }, eff: { a: 2, b: -300000, g: 60 } },
      { label: { zh: "等保固到期巡檢再一次處理", en: "Wait for the end-of-warranty inspection to deal with it" }, good: false, feedback: { zh: "✗ 屆時大批葉片已侵蝕、AEP 已長期流失。", en: "✗ By then a fleet-share is eroded and AEP has been leaking for years." }, eff: { a: -3, g: -120 } },
    ],
    relatesTo: { incidentId: "blade_erosion", faultId: "blade_erosion" },
    sources: ["https://energy.sandia.gov/programs/renewable-energy/wind-power/leading-edge-erosion/"],
    weight: 2, sensitivity: "medium",
  },
  {
    id: "cs_cps_abrasion_serial", framing: "anonymized-technical", category: "cable", discipline: "electrical", minTier: 3, year: "2021",
    title: { zh: "海纜防護系統(CPS)磨損—跨約 10 座風場的系列缺陷(去識別)", en: "Cable protection system (CPS) abrasion — a serial defect across ~10 farms (anonymized)" },
    scenario: { zh: "某大型開發商在一座風場首次發現陣列海纜的 CPS(海纜出單樁、跨塊石堤入埋設溝的彎曲限制段)在塊石上反覆摩擦磨穿,最壞已傷及海纜跳機。問題源於一種跨十座專案採用的安裝法:省略了把海纜/CPS 鎖固的『第二層上覆塊石』,CPS 在水動力下自由擺動。初估曝險上看數億歐元。", en: "A large developer first found at one site that the array-cable CPS (the bend stiffener where the cable exits the monopile and crosses the rock berm into the trench) was abrading against the rock and wearing through, in the worst cases damaging the cable. Root cause: an installation method used across ~10 projects omitted the second top rock layer that locks the cable/CPS down, leaving it free to oscillate. Initial exposure estimated in the hundreds of millions of euros." },
    lesson: { zh: "海纜出口介面(CPS/彎曲限制器/塊石堤過渡)是全場最高風險點,必須針對場址流/浪做機械穩固設計與安裝,別假設『拋石圍樁後 CPS 就自穩』。以 ROV 驗收實際就位與上覆塊石,而非只信安裝程序。因屬同法系列缺陷,單站一發現就應全機隊普查並與供應商做系列缺陷調查。", en: "The cable-exit interface (CPS/bend stiffener/rock-berm transition) is the single highest-risk point and must be mechanically stabilized for site currents/waves — don't assume a CPS self-stabilizes once rock is placed. Verify as-installed seating by ROV, not by procedure. As a same-method serial defect, one finding triggers fleet-wide inspection and a supplier investigation." },
    choices: [
      { label: { zh: "首站一發現即全機隊 ROV 普查並補上覆塊石", en: "On first finding, ROV-survey the whole fleet & add the top rock layer" }, good: true, feedback: { zh: "✓ 同安裝法＝系列缺陷,先穩固再修纜,趁磨穿前處理。", en: "✓ Same method = serial defect; stabilize then repair, before it wears through." }, eff: { a: 3, b: -900000 } },
      { label: { zh: "當成首站個案、出問題再修纜", en: "Treat as a single-site issue, repair cables when they fault" }, good: false, feedback: { zh: "✗ 十座同法風場都在磨損,等跳機代價極高。", en: "✗ Ten same-method farms are all abrading — waiting for faults is far costlier." }, eff: { a: -5, s: 1, g: -120 } },
    ],
    relatesTo: { incidentId: "cable", faultId: "cable_insulation" },
    sources: ["https://www.offshorewind.biz/2021/04/30/orsted-points-at-possible-reason-for-eur-403-million-cable-problem/"],
    weight: 2, sensitivity: "medium",
  },
  {
    id: "cs_converter_cabinet_fire", framing: "named-with-sources", category: "electrical_fire", discipline: "electrical", minTier: 3, year: "2015",
    title: { zh: "變流器/電容櫃電氣火災是機艙首要火源(GCube『Towering Inferno』)", en: "Converter/capacitor-cabinet fires are the leading nacelle fire mode (GCube 'Towering Inferno')" },
    scenario: { zh: "保險業者 GCube 分析約 50 起風機火災:電氣故障是首要起火主因,最常見起火位置是機艙內的變流器與電容櫃;約 90% 機艙火災導致整機全損,平均損失約 450 萬美元/起。源於短路、過載、接點鬆動/劣化、絕緣破壞造成的弧光,在富燃料密閉機艙快速蔓延。", en: "Insurer GCube analyzed ~50 turbine fires: electrical faults are the leading cause, the most common ignition point is the nacelle converter/capacitor cabinet, ~90% of nacelle fires are total losses, and average loss is ~USD 4.5m/event. Short circuits, overloads, loose/degraded connections and insulation breakdown arc and spread fast in the fuel-rich nacelle." },
    lesson: { zh: "把變流器/電容櫃與機艙變壓器當最高優先火險資產:例行紅外線熱影像＋接點扭力複查抓熱點與鬆動,櫃體與變壓器做局放/絕緣電阻測試,變流器區裝弧光偵測＋自動滅火,維持櫃內整潔與纜線管理,並落實去能隔離程序。因 ~90% 是全損,重點在預防與早期偵測,而非滅火。", en: "Treat the converter/capacitor cabinet and nacelle transformer as top fire-risk assets: routine IR thermography + connection-torque checks for hotspots/loose terminals, PD/insulation testing, arc-fault detection plus automatic suppression zoned to the converter, good housekeeping and de-energize procedures. Since ~90% are total losses, prevention and early detection — not firefighting — is where effort pays." },
    choices: [
      { label: { zh: "排定櫃體熱影像/扭力複查並裝弧光偵測＋滅火", en: "Schedule cabinet IR/torque checks; add arc-fault detection + suppression" }, good: true, feedback: { zh: "✓ 熱點與鬆動接點是弧光前兆;預防＋早偵測勝過事後滅火。", en: "✓ Hotspots & loose terminals precede arcing — prevention + early detection beats firefighting." }, eff: { a: 2, b: -350000 } },
      { label: { zh: "機艙裝個滅火器就好,平常不查櫃體", en: "Just put an extinguisher in the nacelle, skip cabinet checks" }, good: false, feedback: { zh: "✗ 90% 機艙火災全損,等起火幾乎來不及。", en: "✗ ~90% of nacelle fires are total losses — once it ignites it's almost too late." }, eff: { a: -6, s: 2 } },
    ],
    relatesTo: { incidentId: "transformer", faultId: "converter_fault" },
    sources: ["https://www.offshorewind.biz/2015/11/17/gcube-launches-report-on-wind-turbine-fires/", "https://www.firetrace.com/fire-protection-blog/why-wind-turbines-catch-fire"],
    weight: 1, sensitivity: "low",
  },
  {
    id: "cs_jackup_punch_through", framing: "named-with-sources", category: "vessel", discipline: "hse", minTier: 4, year: "2017",
    title: { zh: "自升式安裝船 spudcan 穿刺與拔樁失效(系統性)", en: "Jack-up/WTIV spudcan punch-through & extraction failures (systemic)" },
    scenario: { zh: "離岸安裝常見一類事故:自升式船腿的 spudcan 在預壓時於『硬層覆蓋軟層』穿刺,腿急速下陷、可能壓垮腿或翻船——HSE 資料顯示穿刺佔自升船結構崩塌事故約 53%。鏡像問題是在硬/軟黏土過度貫入＋拔樁吸附阻力極大,導致昂貴延誤。", en: "A recurring offshore-installation hazard: during preload a spudcan punches through a stiff-over-soft layer, the leg runs down fast and can overload/collapse the leg or topple the vessel — HSE data attribute ~53% of jack-up structural-collapse accidents to punch-through. The mirror problem is deep penetration and high suction-bound extraction in stiff/soft clays, causing costly delays." },
    lesson: { zh: "把海床當主要安全系統:每個樁位做場址專屬地工調查(CPT/鑽探),同時預測『貫入』與『拔樁』,明確篩查穿刺、擠出、高吸附拔樁;用分階受控預壓、單腿穿刺結構冗餘檢核、必要時做海床改善(預鑽)。把拔樁時間與天氣窗餘裕納入計畫,別假設下得去就拔得起來。", en: "Treat the seabed as a primary safety system: per-location site-specific geotech (CPTs/borings), predict both penetration AND extraction, screen for punch-through/squeezing/high pull-out; use staged controlled preload, one-leg punch-through redundancy checks, and seabed remediation (pre-drilling) where stiff-over-soft is found. Build extraction time & weather-window margin into the plan." },
    choices: [
      { label: { zh: "每樁位做地工調查並同時預測貫入與拔樁", en: "Do per-location geotech; predict both penetration & extraction" }, good: true, feedback: { zh: "✓ 多層海床不能靠簡化兩層法;穿刺與拔樁都要先算。", en: "✓ Layered seabeds defeat simple two-layer methods — model both punch-through and pull-out." }, eff: { a: 2, b: -500000 } },
      { label: { zh: "沿用鄰站地質假設、趕天氣窗直接架腿", en: "Reuse a neighbor's soil assumptions and jack up to chase the window" }, good: false, feedback: { zh: "✗ 穿刺佔自升船崩塌約 53%,賭海床代價是翻船。", en: "✗ Punch-through is ~53% of jack-up collapses — gambling the seabed risks the vessel." }, eff: { a: -8, s: 2 } },
    ],
    relatesTo: { incidentId: "lift" },
    sources: ["https://www.mdpi.com/2077-1312/11/6/1153", "https://www.dnv.com/expert-story/maritime-impact/Offshore-wind-JIP-lays-ground-for-jack-up-installation-standards-as-industry-expands/"],
    weight: 1, sensitivity: "low",
  },
];

export const caseAt = (id: string | undefined): CaseStudy | undefined => CASE_STUDIES.find((c) => c.id === id);
// 取 ≤ tier 的案例子集(#76 漸進解鎖)
export const casesForTier = (tier: number): CaseStudy[] => CASE_STUDIES.filter((c) => c.minTier <= tier);
// 出處顯示規則(單一真實來源,UI 共用):去識別案例不顯示具名出處連結
export const visibleSources = (c: CaseStudy): string[] => (c.framing === "named-with-sources" ? c.sources : []);

// 偶發抽一則「當前 tier 內、本局未看過」的案例研究(極低機率,避免洗版)。
// prob 由呼叫端控制(advance 以固定低值);回 null 表示本次不觸發。
export const CASE_ROLL_PROB = 0.05;
export function rollCaseStudy(tier: number, seen: string[]): CaseStudy | null {
  if (Math.random() > CASE_ROLL_PROB) return null;
  const seenSet = new Set(seen);
  const pool = casesForTier(tier).filter((c) => !seenSet.has(c.id));
  if (!pool.length) return null;
  const total = pool.reduce((a, c) => a + c.weight, 0);
  let r = Math.random() * total;
  for (const c of pool) { r -= c.weight; if (r <= 0) return c; }
  return pool[0];
}
