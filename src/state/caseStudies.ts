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
export type CaseCategory = "foundation" | "gearbox_bearing" | "blade" | "cable" | "electrical_fire" | "vessel" | "bolt" | "ice" | "yaw" | "pitch" | "lightning" | "grid" | "transformer";

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

  // ───────── 第二批(去識別技術重現:皆為業界公認、文獻充分的真實現象,以中性代稱呈現)─────────
  {
    id: "cs_tp_coating_corrosion", framing: "anonymized-technical", category: "foundation", discipline: "structural", minTier: 2,
    title: { zh: "過渡段塗層劣化與飛濺區腐蝕(去識別)", en: "Transition-piece coating breakdown & splash-zone corrosion (anonymized)" },
    scenario: { zh: "某北海風場數年後檢查發現,多支過渡段在飛濺/浪花區的防蝕塗層因鹽霧、紫外線與機械磨損大面積剝落,鋼材開始鏽蝕;陰極保護不涵蓋大氣/飛濺區,該區僅靠塗層。", en: "A North Sea fleet's inspection found the protective coating on many transition pieces had failed across the splash zone (salt spray, UV, abrasion), exposing steel to rust; cathodic protection doesn't cover the atmospheric/splash zone — coating is the only barrier there." },
    lesson: { zh: "飛濺區是全結構腐蝕最嚴酷處:設計時就要加強該區塗層等級;運維定期做近接目視/塗層厚度量測,及早局部修補遠比整段重塗便宜;確認 CP 涵蓋範圍與飛濺區防護分工。", en: "The splash zone is the harshest corrosion environment: specify a higher coating spec there by design; do recurring close-visual/coating-thickness surveys and patch early — far cheaper than a full re-coat; confirm what CP covers vs what coating must." },
    choices: [
      { label: { zh: "定期塗層檢查 + 早期局部修補,確認 CP 涵蓋", en: "Recurring coating surveys + early patch repair; verify CP coverage" }, good: true, feedback: { zh: "✓ 飛濺區靠塗層,趨勢檢查 + 早修才不會演成結構性腐蝕。", en: "✓ The splash zone relies on coating — survey & early patch before it becomes structural." }, eff: { a: 2, b: -300000 } },
      { label: { zh: "等大面積生鏽再一次處理", en: "Wait until widespread rust, then deal with it" }, good: false, feedback: { zh: "✗ 屆時可能已危及結構,需昂貴的繩索/平台整段重塗。", en: "✗ By then it may threaten the structure — an expensive full re-coat." }, eff: { a: -3, s: 1 } },
    ],
    relatesTo: { faultId: "tower_corrosion", incidentId: "corrosion" },
    sources: ["業界公認現象:飛濺區腐蝕與塗層維護(去識別技術重現) / Well-documented industry phenomenon (anonymized)"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_ice_throw", framing: "anonymized-technical", category: "ice", discipline: "hse", minTier: 2,
    title: { zh: "結冰甩冰公安風險(去識別)", en: "Ice throw / ice-fall hazard (anonymized)" },
    scenario: { zh: "某寒冷氣候風場冬季葉片結冰:運轉時冰塊可被甩出達數百公尺,停機時也可能自塔上墜落,危及人員、車輛與鄰近設施。功率曲線異常與振動是結冰的早期訊號。", en: "At a cold-climate site, winter blade icing means ice can be thrown hundreds of metres while running, or fall from the tower when stopped — endangering people, vehicles and nearby assets. Power-curve deviation and vibration are early icing tells." },
    lesson: { zh: "結冰是可預期的季節風險:以結冰偵測(功率/振動異常或結冰感測器)觸發自動停機/降載;設管制半徑與警示;考慮葉片加熱/疏冰塗層;運維人員冬季進場前先確認無結冰。安全永遠優先於發電。", en: "Icing is a predictable seasonal risk: trigger auto stop/derate via ice detection (power/vibration anomaly or ice sensors); set a signed exclusion radius; consider blade heating / ice-phobic coatings; verify ice-free before winter access. Safety always before output." },
    choices: [
      { label: { zh: "裝結冰偵測 → 自動停機/降載 + 設管制半徑警示", en: "Add ice detection → auto stop/derate + signed exclusion radius" }, good: true, feedback: { zh: "✓ 安全優先:偵測結冰即停機、劃管制區,冬季進場先確認無結冰。", en: "✓ Safety first: detect icing → stop, mark an exclusion zone, verify ice-free before winter access." }, eff: { a: 1, s: -1 } },
      { label: { zh: "照常運轉,進場也不特別管結冰", en: "Keep running; don't manage icing during access" }, good: false, feedback: { zh: "✗ 甩冰/墜冰是真實傷亡風險,且結冰運轉增加載荷與磨損。", en: "✗ Thrown/falling ice is a real injury risk, and iced operation adds loads & wear." }, eff: { a: -2, s: 2 } },
    ],
    relatesTo: {},
    sources: ["業界公認現象:冷氣候結冰甩冰風險與停機策略(去識別) / Cold-climate ice-throw guidance (anonymized)"],
    weight: 1, sensitivity: "low",
  },
  {
    id: "cs_export_cable_outage", framing: "anonymized-technical", category: "cable", discipline: "electrical", minTier: 3,
    title: { zh: "出口海纜單點故障 → 長期停電(去識別)", en: "Export-cable single-point failure → long outage (anonymized)" },
    scenario: { zh: "某風場唯一出口海纜發生故障,整場併網中斷。海纜維修需專業敷纜船 + 備纜 + 天氣窗,停電長達數月;在 OFTO/可用率制度下另遭收入調整重罰。", en: "A farm's sole export cable failed, cutting the whole site off-grid. Subsea cable repair needs a specialist cable-lay vessel + spare cable + weather window, so the outage ran for months; under an availability/OFTO regime it also drew a heavy revenue adjustment." },
    lesson: { zh: "出口海纜是單點故障風險最高的資產:備援(N-1/雙迴路)、備纜庫存、與敷纜船的框架合約、快速定位(TDR/分散式測溫)都是縮短停電的關鍵;把『長停電損失』計入設計與保險取捨。", en: "The export cable is the highest single-point-of-failure risk: redundancy (N-1), spare-cable stock, a framework agreement with a cable-lay vessel, and fast fault location (TDR/DTS) all cut outage time; price the long-outage loss into design & insurance." },
    choices: [
      { label: { zh: "備纜 + 敷纜船框架合約 + 快速定位能力", en: "Spare cable + cable-vessel framework + fast fault-location" }, good: true, feedback: { zh: "✓ 縮短停電靠事前準備:備纜、船期、定位手段缺一不可。", en: "✓ Shorter outages come from preparation: spare, vessel access, locating tools." }, eff: { a: 3, b: -1000000 } },
      { label: { zh: "不做備援,出事再臨時找船", en: "No redundancy; find a vessel only after it fails" }, good: false, feedback: { zh: "✗ 敷纜船與備纜前置期長,臨時找=數月停電與重罰。", en: "✗ Cable vessels & spares have long lead times — improvising means months offline." }, eff: { a: -6, s: 1, g: -120 } },
    ],
    relatesTo: { faultId: "cable_insulation", incidentId: "cable" },
    sources: ["業界公認風險:出口海纜單點故障與長停電(去識別) / Export-cable single-point-failure risk (anonymized)"],
    weight: 1, sensitivity: "low",
  },
  {
    id: "cs_ctv_transfer_collision", framing: "anonymized-technical", category: "vessel", discipline: "hse", minTier: 3,
    title: { zh: "CTV 頂靠/人員轉移碰撞(去識別)", en: "CTV bump-on / crew-transfer collision (anonymized)" },
    scenario: { zh: "某人員轉移船(CTV)在頂靠基礎登乘平台時,因海象偏高、操作或 SIMOPS 協調不良發生碰撞,造成人員受傷與結構/船艏損傷。", en: "A crew-transfer vessel (CTV) collided while bumping onto the boat-landing — driven by marginal sea state, handling, or poor SIMOPS coordination — injuring crew and damaging the structure/bow fender." },
    lesson: { zh: "人員轉移是離岸傷害熱點:嚴守作業海象限值(Hs)、標準頂靠程序、三點接觸登乘、SIMOPS 協調與船員訓練不可省;安全限值不可為趕工而放寬。", en: "Crew transfer is an injury hotspot: respect the sea-state (Hs) limit, standard bump-on procedure, three-points-of-contact, SIMOPS coordination and crew training — never relax limits to save time." },
    choices: [
      { label: { zh: "遵守 Hs 限值 + SIMOPS 協調 + 標準登乘程序", en: "Respect Hs limit + SIMOPS coordination + standard transfer SOP" }, good: true, feedback: { zh: "✓ 轉移安全靠限值與程序,海象超標就改期或遠端處理。", en: "✓ Transfer safety is limits + procedure; over-limit → reschedule or go remote." }, eff: { s: -1 } },
      { label: { zh: "海象超標仍硬頂趕工", en: "Bump on over-limit to keep the schedule" }, good: false, feedback: { zh: "✗ 趕工放寬限值是傷亡與停工的直接成因。", en: "✗ Relaxing limits to chase schedule directly causes injuries & downtime." }, eff: { s: 2, a: -2 } },
    ],
    relatesTo: {},
    sources: ["業界公認風險:CTV 人員轉移作業安全(去識別) / CTV crew-transfer safety (anonymized)"],
    weight: 1, sensitivity: "medium",
  },
  {
    id: "cs_cable_burial_depth", framing: "anonymized-technical", category: "cable", discipline: "electrical", minTier: 3,
    title: { zh: "海纜埋設深度不足 → 外露風險(去識別)", en: "Insufficient cable burial depth → exposure risk (anonymized)" },
    scenario: { zh: "某風場部分海纜因海床條件與敷設工法,埋設深度不足甚至外露,易受拋錨、拖網與沖刷威脅,事後需拋石/加套管的補救工程,成本高昂。", en: "Owing to seabed conditions and the lay method, parts of a farm's cable ended up under-buried or exposed — vulnerable to anchors, trawling and scour — needing costly rock-dump / mattress remediation later." },
    lesson: { zh: "埋設深度(DoL)應依海床移動性與漁業/航運風險評估(CBRA/BAS)決定;敷後以 ROV/測深驗證『實際』DoL,不足處及早補救;外露海纜屬高風險,主動巡檢勝過被動等故障。", en: "Depth-of-lowering should follow a cable burial risk assessment (seabed mobility + fishing/shipping); verify AS-LAID depth by ROV/survey, remediate shortfalls early; exposed cable is high-risk — proactive survey beats waiting for a fault." },
    choices: [
      { label: { zh: "敷後驗證實際埋深 + 不足段及早補救", en: "Verify as-laid burial + remediate shortfalls early" }, good: true, feedback: { zh: "✓ 信任但要驗證:ROV 量實際 DoL,外露段趁未受損先保護。", en: "✓ Trust but verify: ROV-measure actual DoL; protect exposed runs before damage." }, eff: { a: 2, b: -700000 } },
      { label: { zh: "相信敷設程序,不另行驗證", en: "Trust the lay procedure; don't survey" }, good: false, feedback: { zh: "✗ 實際埋深常與計畫有落差,外露段遲早被勾損跳機。", en: "✗ As-laid depth often differs from plan — exposed runs eventually get snagged." }, eff: { a: -4, s: 1 } },
    ],
    relatesTo: { faultId: "cable_insulation", incidentId: "cable" },
    sources: ["業界公認風險:海纜埋設深度與外露(去識別) / Cable burial-depth & exposure risk (anonymized)"],
    weight: 1, sensitivity: "low",
  },
  {
    id: "cs_jackup_tow_stability", framing: "anonymized-technical", category: "vessel", discipline: "hse", minTier: 4,
    title: { zh: "自升船拖航/就位穩定性事故(去識別)", en: "Jack-up tow & positioning stability incident (anonymized)" },
    scenario: { zh: "某自升式作業船在拖航或就位過程,因壓載計畫、天氣窗判斷或海床評估不足,發生觸底/傾斜事故,造成延誤與損失。", en: "During tow or positioning, a jack-up vessel suffered a grounding/listing incident from inadequate ballast planning, weather-window judgment or seabed assessment — causing delay and loss." },
    lesson: { zh: "與『spudcan 穿刺』案例互補:下海與在海上都要把海床與海象當主要安全系統。海事作業檢驗(MWS)、拖航穩定性與天氣窗、壓載計畫、就位海床評估缺一不可。", en: "Complements the spudcan punch-through case: at sea and on station, treat seabed & metocean as primary safety systems. Marine warranty survey (MWS), tow stability & weather windows, ballast planning and on-station geotech are all essential." },
    choices: [
      { label: { zh: "MWS 審查 + 拖航穩定性/天氣窗 + 壓載計畫", en: "MWS review + tow stability/weather window + ballast plan" }, good: true, feedback: { zh: "✓ 海事作業靠審查與計畫,別賭天氣與海床。", en: "✓ Marine ops rely on review & planning — don't gamble weather or seabed." }, eff: { a: 2, b: -500000 } },
      { label: { zh: "趕天氣窗略過海事審查", en: "Skip the marine survey to chase the window" }, good: false, feedback: { zh: "✗ 略過 MWS 是觸底/傾覆與重大損失的常見前因。", en: "✗ Skipping MWS is a common precursor to grounding/capsize and major loss." }, eff: { a: -6, s: 2 } },
    ],
    relatesTo: { incidentId: "lift" },
    sources: ["業界公認風險:自升船拖航/就位穩定性(去識別) / Jack-up tow & positioning stability (anonymized)"],
    weight: 1, sensitivity: "low",
  },

  // ───────── 第三批(更多真實/擬真案例):涵蓋偏航、變槳軸承、雷擊、電網、變壓器、螺栓、次結構、潤滑 ─────────
  {
    id: "cs_yaw_static_misalignment", framing: "named-with-sources", category: "yaw", discipline: "control", minTier: 2, year: "2019-2021",
    title: { zh: "系統性偏航靜態誤差吃掉發電量(光達量測普遍發現)", en: "Systematic static yaw misalignment silently costs AEP (LiDAR field findings)" },
    scenario: { zh: "以機艙光達/前視光達量測的多項研究普遍發現:風機存在數度的『靜態偏航誤差』(風向標安裝/校正偏差累積),長期偏離最佳迎風角。功率隨對風偏差約以 cos² 下滑,系統性 3–8° 誤差可使單機 AEP 少約 1–3%,並增加不對稱載荷與疲勞。", en: "Nacelle/forward-looking LiDAR campaigns widely find a multi-degree 'static yaw error' (accumulated vane install/calibration bias) keeping turbines off the optimal wind heading. Power falls roughly with cos² of the error, so a systematic 3–8° bias can cut a turbine's AEP by ~1–3% and add asymmetric loads & fatigue." },
    lesson: { zh: "偏航靜態誤差是『看不到卻持續漏電』的隱性損失:以光達/SCADA 長期統計診斷對風準度,定期校正風向標零點與偏航控制邏輯,並把『對風準度』納入績效指標。修正成本低、回收快——常是 CP 最高的優化之一。", en: "Static yaw error is invisible-but-constant lost output: diagnose pointing accuracy with LiDAR/SCADA statistics, periodically re-zero the vane & yaw control logic, and make pointing accuracy a KPI. The fix is cheap with fast payback — often one of the highest-ROI optimisations." },
    choices: [
      { label: { zh: "以光達/SCADA 統計診斷並定期校正風向標零點", en: "Diagnose via LiDAR/SCADA stats & re-zero the vane periodically" }, good: true, feedback: { zh: "✓ 系統性偏差非隨機散布,校正零點直接回收 AEP。", en: "✓ A systematic bias isn't random scatter — re-zeroing recovers AEP directly." }, eff: { g: 120, b: -100000 } },
      { label: { zh: "認為風向標出廠已校正、不再追蹤", en: "Assume the vane was factory-calibrated, never track it" }, good: false, feedback: { zh: "✗ 安裝/漂移會累積誤差,長年 AEP 持續流失。", en: "✗ Install/drift accumulate; AEP keeps leaking for years." }, eff: { g: -120 } },
    ],
    relatesTo: { faultId: "yaw_misalign", incidentId: "yaw" },
    sources: ["https://www.nrel.gov/wind/", "https://wes.copernicus.org/"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_pitch_bearing_wear", framing: "anonymized-technical", category: "pitch", discipline: "mechanical", minTier: 3,
    title: { zh: "變槳/葉根軸承漸增磨耗與裂紋(去識別)", en: "Pitch/blade-root bearing progressive wear & cracking (anonymized)" },
    scenario: { zh: "某大型機隊隨運轉年限增加,變槳(葉根)軸承出現滾道磨耗、裂紋與潤滑劣化,變槳力矩上升、偶發卡澀。葉根軸承一旦失效屬大組件級維修(常需吊裝),且早期徵兆隱晦,易被當成偶發變槳錯誤。", en: "As an aging fleet accumulates hours, pitch (blade-root) bearings develop raceway wear, cracks and grease degradation — pitch torque rises with occasional stiction. A blade-bearing failure is a major-component repair (often a crane job), and early signs are subtle, easily dismissed as random pitch faults." },
    lesson: { zh: "變槳軸承是逐漸浮現的高成本失效:監測變槳力矩/電流趨勢、自動潤滑系統健康、軸承游隙與滾道內視鏡;依狀態提前在天氣窗安排再潤滑或更換,別等卡死才反應。", en: "Pitch bearings are a slowly emerging high-cost failure: trend pitch torque/current, auto-lube health, bearing clearance and raceway borescope; plan re-greasing or replacement in a weather window on condition — don't wait for seizure." },
    choices: [
      { label: { zh: "監測變槳力矩/潤滑趨勢並依狀態提前處理", en: "Trend pitch torque/lube & act early on condition" }, good: true, feedback: { zh: "✓ 提前在天氣窗處理遠比卡死後緊急吊裝便宜。", en: "✓ Acting early in a window beats an emergency crane job after seizure." }, eff: { a: 3, b: -500000 } },
      { label: { zh: "當成偶發變槳錯誤、復歸了事", en: "Treat as a random pitch fault and just reset" }, good: false, feedback: { zh: "✗ 軸承劣化會惡化成卡死/裂紋,演成大修。", en: "✗ Bearing degradation worsens to seizure/cracking — a major overhaul." }, eff: { a: -5, s: 1 } },
    ],
    relatesTo: { faultId: "pitch_hydraulic_leak", incidentId: "pitch" },
    sources: ["業界公認現象:變槳/葉根軸承漸進失效(去識別技術重現) / Pitch-bearing progressive failure (anonymized)"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_blade_lightning_lps", framing: "anonymized-technical", category: "lightning", discipline: "structural", minTier: 2,
    title: { zh: "雷擊葉片損傷與接閃系統失效(去識別)", en: "Blade lightning damage & LPS failure (anonymized)" },
    scenario: { zh: "雷擊造成的葉片損傷在風機保險理賠中佔很高比例。當接閃接收器/down-conductor 失效或電位連接不良時,雷電能量會在葉片內部閃絡,造成分層、爆裂甚至起火;離岸高聳機組尤其暴露。某機雷後出現葉片異音與接閃系統電阻異常。", en: "Lightning-caused blade damage is a large share of turbine insurance claims. When receptors/down-conductors fail or bonding is poor, the strike arcs inside the blade, causing delamination, blow-out or even fire; tall offshore units are especially exposed. After a storm one unit shows blade noise and abnormal LPS resistance." },
    lesson: { zh: "把雷電防護系統(LPS)當定期維護項目而非碰運氣:依 IEC 61400-24 量測 down-conductor 連續性與接收器電阻、雷後即查受擊葉片;裝雷擊計數/定位有助鎖定受擊機組優先檢查。早抓導通失效可避免整支葉片報廢。", en: "Treat the lightning-protection system (LPS) as scheduled maintenance, not luck: per IEC 61400-24, measure down-conductor continuity & receptor resistance, inspect struck blades right after storms; lightning counters/location help prioritise hit units. Catching a broken conduction path early can save a whole blade." },
    choices: [
      { label: { zh: "定期量測 LPS 連續性、雷後優先檢查受擊葉片", en: "Periodically test LPS continuity; inspect struck blades after storms" }, good: true, feedback: { zh: "✓ 導通完好才能把雷電安全導走;雷後即查防止損傷擴大。", en: "✓ An intact conduction path safely diverts the strike; post-storm checks limit damage." }, eff: { a: 2, b: -200000 } },
      { label: { zh: "把雷擊當隨機天災、不維護接閃系統", en: "Treat lightning as random fate, don't maintain the LPS" }, good: false, feedback: { zh: "✗ 接閃系統失效會把可修小傷變成整支葉片報廢甚至起火。", en: "✗ A failed LPS turns a repairable hit into a scrapped blade or a fire." }, eff: { a: -4, s: 1 } },
    ],
    relatesTo: { faultId: "blade_crack", incidentId: "blade" },
    sources: ["業界標準:IEC 61400-24 風機雷電防護(去識別技術重現) / IEC 61400-24 lightning protection (anonymized)"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_grid_frequency_mass_trip", framing: "anonymized-technical", category: "grid", discipline: "electrical", minTier: 3,
    title: { zh: "電網頻率擾動引發機組大量同時跳脫(去識別)", en: "Grid frequency disturbance triggers mass simultaneous trips (anonymized)" },
    scenario: { zh: "某次電網事故造成頻率/電壓擾動,一座大型離岸風場因保護設定與故障穿越(FRT/LVRT)參數未完全契合電網規範,大量機組在擾動中同時跳脫離網,反而加深了系統不平衡、擴大停電。", en: "During a grid event, frequency/voltage disturbed the system; at a large offshore farm, protection settings and fault-ride-through (FRT/LVRT) parameters weren't fully aligned with grid code, so many units tripped offline simultaneously — deepening the imbalance and widening the outage." },
    lesson: { zh: "故障穿越是併網責任而非選項:確認 LVRT/FRT 與頻率/電壓保護設定符合最新電網規範並定期複測;避免『一擾動就全跳』的同時性失效。大量同時掉網會把局部事故放大成系統事件。", en: "Ride-through is a grid obligation, not an option: verify LVRT/FRT and frequency/voltage protection meet current grid code and re-test periodically; avoid a 'one disturbance trips all' common-mode failure. Mass simultaneous disconnection amplifies a local fault into a system event." },
    choices: [
      { label: { zh: "校驗 FRT/LVRT 與保護設定符合電網規範並定期複測", en: "Verify FRT/LVRT & protection meet grid code; re-test periodically" }, good: true, feedback: { zh: "✓ 正解:設定契合規範才能穿越擾動、支撐而非惡化電網。", en: "✓ Code-aligned settings ride through and support — not worsen — the grid." }, eff: { a: 2, b: -300000 } },
      { label: { zh: "保護從嚴、一有擾動就全場跳脫最安全", en: "Set protection aggressive — trip the whole farm on any disturbance" }, good: false, feedback: { zh: "✗ 同時大量掉網違反規範且放大系統事故,恐受罰。", en: "✗ Mass tripping breaches code, amplifies the event, and risks penalties." }, eff: { a: -4, s: 1, g: -120 } },
    ],
    relatesTo: { faultId: "converter_fault", incidentId: "converter" },
    sources: ["業界公認風險:電網擾動下的故障穿越與同時跳脫(去識別) / Grid ride-through & mass-trip risk (anonymized)"],
    weight: 1, sensitivity: "medium",
  },
  {
    id: "cs_oss_transformer_failure", framing: "anonymized-technical", category: "transformer", discipline: "electrical", minTier: 3,
    title: { zh: "海上變電站主變壓器失效→長期降容(去識別)", en: "Offshore substation main-transformer failure → prolonged derate (anonymized)" },
    scenario: { zh: "某海上變電站(OSS)一台主變壓器因絕緣劣化/套管或分接開關故障失效,全場輸出受限數月;大型電力變壓器交期極長、需特殊重吊船更換,期間僅能以剩餘容量降容運轉,收入大減。", en: "At an offshore substation (OSS), a main transformer failed (insulation degradation / bushing or tap-changer fault), capping farm output for months; large power transformers have very long lead times and need a heavy-lift vessel to replace, forcing reduced-capacity operation and a big revenue hit meanwhile." },
    lesson: { zh: "OSS 主變壓器是單點高衝擊資產:落實油中溶解氣體(DGA)與套管/分接開關監測、紅外線熱影像;評估備援容量或備品策略(共用備援變壓器、框架運輸合約),並把『長交期+重吊更換』計入風險與保險。", en: "An OSS main transformer is a single-point, high-impact asset: run DGA, bushing/tap-changer monitoring and IR thermography; evaluate redundancy or a spare strategy (shared spare transformer, framework transport contracts), and price the long-lead + heavy-lift replacement into risk and insurance." },
    choices: [
      { label: { zh: "DGA/套管監測 + 備援容量或備品策略", en: "DGA/bushing monitoring + redundancy or spare strategy" }, good: true, feedback: { zh: "✓ 提早抓內部劣化、預先安排備品,縮短數月降容。", en: "✓ Catch internal degradation early & pre-arrange a spare to cut months of derate." }, eff: { a: 3, b: -900000 } },
      { label: { zh: "變壓器很可靠,不監測也不備援", en: "Transformers are reliable — no monitoring, no spare" }, good: false, feedback: { zh: "✗ 一旦失效=數月降容+超長交期+重吊,代價極高。", en: "✗ A failure means months of derate, a very long lead time and a heavy lift — hugely costly." }, eff: { a: -6, s: 1, g: -120 } },
    ],
    relatesTo: { faultId: "transformer_bushing", incidentId: "bushing" },
    sources: ["業界公認風險:海上變電站主變壓器失效與備援(去識別) / OSS main-transformer failure & redundancy (anonymized)"],
    weight: 1, sensitivity: "medium",
  },
  {
    id: "cs_flange_bolt_fatigue", framing: "anonymized-technical", category: "bolt", discipline: "structural", minTier: 2,
    title: { zh: "塔段/法蘭螺栓預拉力流失與疲勞裂紋(去識別)", en: "Tower/flange bolt preload loss & fatigue cracking (anonymized)" },
    scenario: { zh: "某機隊例行檢查發現多處塔段法蘭螺栓預拉力衰減,個別出現疲勞裂紋;循環彎矩下若預緊不足,螺栓承受過大應力幅而加速疲勞,鬆動會引發法蘭縫隙位移與低頻振動,嚴重時危及連接。", en: "Routine checks across a fleet find reduced preload on many tower-flange bolts, with isolated fatigue cracks; under cyclic bending, insufficient preload exposes bolts to large stress ranges that accelerate fatigue, and loosening drives flange-gap movement and low-frequency vibration — in severe cases threatening the joint." },
    lesson: { zh: "螺栓連接靠『預拉力』而非『鎖緊感』:依規範用張力法/超音波量測伸長量設定並複檢預緊,定期抽檢扭力/伸長趨勢與裂紋;鬆動是結構安全前兆,發現一處應擴大同型抽查。", en: "Bolted joints rely on preload, not 'feel-tight': set and re-check preload by tensioning/ultrasonic elongation per spec, trend torque/elongation and inspect for cracks; loosening is a structural-safety precursor — one finding should widen the sampling on same-type joints." },
    choices: [
      { label: { zh: "用張力/超音波量測設定預緊,定期複檢趨勢", en: "Set preload by tensioning/ultrasonic; re-check trend periodically" }, good: true, feedback: { zh: "✓ 量測伸長量才確認真實預緊;趨勢複檢早抓鬆動與疲勞。", en: "✓ Measuring elongation confirms real preload; trending catches loosening & fatigue early." }, eff: { a: 2, b: -150000 } },
      { label: { zh: "目視沒鬆就好,不量測不複檢", en: "Looks tight — no measurement, no re-check" }, good: false, feedback: { zh: "✗ 預拉力衰減肉眼看不出,疲勞裂紋會在無聲中擴展。", en: "✗ Preload loss is invisible; fatigue cracks grow silently." }, eff: { a: -4, s: 1 } },
    ],
    relatesTo: { faultId: "tower_bolt_loose", incidentId: "tower_bolt" },
    sources: ["業界公認現象:法蘭螺栓預拉力與疲勞(去識別技術重現) / Flange-bolt preload & fatigue (anonymized)"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_secondary_steel_cracks", framing: "anonymized-technical", category: "foundation", discipline: "structural", minTier: 2,
    title: { zh: "登靠平台/次結構鋼疲勞裂紋(去識別)", en: "Boat-landing / secondary-steel fatigue cracks (anonymized)" },
    scenario: { zh: "某風場登靠平台、爬梯、纜線托架等『次結構』焊接處出現疲勞裂紋:CTV 反覆頂靠衝擊與波浪載荷集中於這些附屬鋼件,常因被視為非主結構而巡檢不足,卻直接關係到人員登乘安全。", en: "At one farm, welds on 'secondary steel' (boat-landing, ladders, cable brackets) develop fatigue cracks: repeated CTV bump-on impacts and wave loads concentrate on these appurtenances, which are often under-inspected as 'non-primary' — yet they directly affect crew-access safety." },
    lesson: { zh: "次結構不是次要:把登靠平台/爬梯/托架納入定期近接目視與焊道檢查,特別是高衝擊的 CTV 頂靠點;早期裂紋補焊/補強便宜,且攸關登乘安全。安全與結構完整性並重。", en: "Secondary steel isn't secondary: include boat-landings/ladders/brackets in recurring close-visual and weld inspections, especially high-impact CTV bump points; early crack repair/reinforcement is cheap and crew-access-critical. Safety and integrity go together." },
    choices: [
      { label: { zh: "把次結構納入定期焊道檢查,早期補強", en: "Include secondary steel in recurring weld inspections; reinforce early" }, good: true, feedback: { zh: "✓ 高衝擊點優先檢查;早補焊便宜又保登乘安全。", en: "✓ Prioritise high-impact points; early repair is cheap and keeps access safe." }, eff: { a: 1, b: -120000, s: -1 } },
      { label: { zh: "次結構非主結構,巡檢時略過", en: "Skip it — secondary steel isn't primary structure" }, good: false, feedback: { zh: "✗ 登靠平台裂紋直接威脅人員登乘安全,不可輕忽。", en: "✗ Boat-landing cracks directly threaten crew-transfer safety — don't ignore." }, eff: { s: 2, a: -2 } },
    ],
    relatesTo: { faultId: "tower_corrosion", incidentId: "corrosion" },
    sources: ["業界公認現象:次結構/登靠平台疲勞(去識別技術重現) / Secondary-steel fatigue (anonymized)"],
    weight: 2, sensitivity: "low",
  },
  {
    id: "cs_gearbox_lube_contamination", framing: "anonymized-technical", category: "gearbox_bearing", discipline: "mechanical", minTier: 2,
    title: { zh: "齒輪箱潤滑油劣化/進水/過濾失效(去識別)", en: "Gearbox lube degradation / water ingress / filtration failure (anonymized)" },
    scenario: { zh: "某機隊齒輪箱油液分析顯示含水量與顆粒數上升、添加劑耗盡。進水與污染會破壞油膜、誘發軸承微點蝕與白蝕裂紋(WEC)前期損傷,卻常因『還沒到換油里程』而被延後。", en: "A fleet's gearbox oil analysis shows rising water content and particle counts with depleted additives. Water and contamination break down the oil film and seed bearing micro-pitting and early white-etching-crack (WEC) damage — yet it's often deferred because 'the oil-change interval isn't up yet'." },
    lesson: { zh: "依『油況』而非『里程』管理潤滑:線上顆粒/含水監測 + 定期油液分析,維護離線過濾與除水系統、呼吸器乾燥劑與油封;乾淨乾燥的油是齒輪箱壽命最便宜的保險。", en: "Manage lube by condition, not calendar: online particle/water monitoring + periodic oil analysis, maintain offline filtration/dewatering, breather desiccant and seals; clean dry oil is the cheapest insurance for gearbox life." },
    choices: [
      { label: { zh: "依油況監測管理潤滑,維護過濾與除水", en: "Manage lube by condition; maintain filtration & dewatering" }, good: true, feedback: { zh: "✓ 乾淨乾燥的油保住油膜,直接延後昂貴的軸承失效。", en: "✓ Clean dry oil preserves the film and defers costly bearing failures." }, eff: { a: 2, b: -120000 } },
      { label: { zh: "照里程換油就好,不看油況", en: "Just change oil on the calendar, ignore condition" }, good: false, feedback: { zh: "✗ 進水/污染不等里程,期間已誘發軸承次表層損傷。", en: "✗ Water/contamination don't wait for the interval — subsurface bearing damage sets in meanwhile." }, eff: { a: -3, s: 1 } },
    ],
    relatesTo: { faultId: "gearbox_overheat", incidentId: "gearbox" },
    sources: ["業界公認現象:齒輪箱潤滑污染與油況管理(去識別技術重現) / Gearbox lube contamination & condition-based management (anonymized)"],
    weight: 2, sensitivity: "low",
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

// 自由營運中心「案例演練」抽題:**略過 Tier 解鎖限制**(教師/玩家進中心即可練),
// 優先抽本局未演練過的案例(weighted),全部練過後才允許重複,讓案例自然出現在任務清單。
export function randomCaseDrill(seen: string[] = []): CaseStudy {
  const seenSet = new Set(seen);
  const fresh = CASE_STUDIES.filter((c) => !seenSet.has(c.id));
  const pool = fresh.length ? fresh : CASE_STUDIES;
  const total = pool.reduce((a, c) => a + c.weight, 0);
  let r = Math.random() * total;
  for (const c of pool) { r -= c.weight; if (r <= 0) return c; }
  return pool[0];
}
