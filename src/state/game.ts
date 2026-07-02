import type { I18n } from "../game/systems/types";
import { FARMS } from "./farms";
import { rollEvent, type EventStamp } from "./events";
import { incidentAt, randomIncidentId } from "./incidents";
import { rollCaseStudy } from "./caseStudies";
import { buildTrendPoint, pushHistory, type TrendPoint } from "./trends";
import { recordAnswer, addMistake, reviewMistake, type Mastery, type Mistake } from "./mastery";
import { portFacility } from "./port";
import { BUILD_STAGES, BUILD_STAGE_COUNT, BUILD_REWARD_BASE, BUILD_REWARD_PER_SCORE, BUILD_REWARD_XP } from "./construction";
import { VESSELS, vesselSpec, type VesselClass } from "./vessels";

// ───────── 全域遊戲狀態模型（A1 工單系統 / A2 採購 / A3 結算 / D1 存檔）─────────
export type SeaState = "workable" | "caution" | "closed";
export type QuestStage = "available" | "active" | "done";
export type JobPhase = "office" | "enroute" | "onsite"; // 出勤階段（#25）
export type Discipline = "mechanical" | "electrical" | "control" | "structural" | "hse";

export interface Engineer {
  id: string;
  name: string;
  discipline: Discipline;
  level: number;
  fatigue?: number; // 疲勞 0-100（#7）：出勤累積、休整回復；達上限不得派工（shift limit）
}

// 技師疲勞（#7）
export const FATIGUE_LIMIT = 80; // 輪班上限：達此值不得再派工
export const FATIGUE_PER_JOB = 34; // 完成一趟維修/大修工日累積的疲勞
export const FATIGUE_RECOVERY = 12; // 每日休整回復的疲勞
export const fatigueOf = (e: Engineer) => e.fatigue ?? 0;
// 技師薪資（O&M 經濟閉環）：每日計薪（自動按在職天數分攤；解僱即停），月薪約 9~13 萬。
export const SALARY_BASE_PER_DAY = 2_200; // 每日基本薪
export const SALARY_PER_LEVEL_PER_DAY = 700; // 每等級加給/日
export const salaryOf = (e: Engineer) => SALARY_BASE_PER_DAY + e.level * SALARY_PER_LEVEL_PER_DAY;
export const dailyPayroll = (engs: Engineer[]) => engs.reduce((a, e) => a + salaryOf(e), 0);
// 可派工：對應科別、等級足夠、且未超過輪班上限
export const availableEngineer = (engs: Engineer[], d: Discipline, lvl = 1) =>
  engs.some((e) => e.discipline === d && e.level >= lvl && fatigueOf(e) < FATIGUE_LIMIT);
// 讓該科別中「最不疲勞者」出勤並累積疲勞（回傳新陣列）
function deployFatigue(engs: Engineer[], d: Discipline, amount = FATIGUE_PER_JOB): Engineer[] {
  let id: string | null = null;
  let lowest = Infinity;
  for (const e of engs) if (e.discipline === d && fatigueOf(e) < lowest) { lowest = fatigueOf(e); id = e.id; }
  if (!id) return engs;
  return engs.map((e) => (e.id === id ? { ...e, fatigue: clampN(fatigueOf(e) + amount, 0, 100) } : e));
}

// ───────── 活體戰情層：機組個體模型 + 並行工單（Phase C）─────────
export type TurbineStatus = "ok" | "fault" | "repair"; // 正常 / 故障待派 / 維修中
export interface Turbine {
  id: string; // 機組編號（如 CH-07）
  farm: number; // 所屬風場索引
  status: TurbineStatus;
  faultId?: string; // 故障型錄 id（incidents.ts）
  gen: number; // 此機組每日發電佔比 (MWh, 100%)
}
export type OpsJobKind = "repair" | "inspect"; // 維修工單 / 預防性定檢（Phase C2）
export interface OpsJob {
  id: string;
  turbine: string; // 機組 id（定檢為 "__sweep__"）
  engineerId: string; // 派遣的技師（遠端重啟為 "__remote__"）
  discipline: Discipline;
  daysLeft: number; // 剩餘工日
  remote?: boolean; // 遠端重啟工單（免技師、不累積疲勞）
  kind?: OpsJobKind; // 預設 repair；inspect = 預防性定檢
}
// ───────── 運維層級 Tier（#76）：難度/複雜度隨規模循序漸進 ─────────
// 依「進度自動推進」(已與設計者確認)：由主線進度、累積發電、營運風場數、完成任務數推導，
// 不需玩家手動選。tier 越高 → 解鎖更多故障型錄/備品、故障率與經濟壓力上升。
export type Tier = 1 | 2 | 3 | 4;
export const TIER_COUNT = 4;
export const TIER_LABEL: Record<Tier, I18n> = {
  1: { zh: "見習運維員", en: "Trainee" },
  2: { zh: "運維技師", en: "Technician" },
  3: { zh: "運維主任", en: "Supervisor" },
  4: { zh: "區域運維經理", en: "Regional Manager" },
};
// 各 tier 的故障率倍率（入門較緩、規模大才吃滿）：index 1..4
export const TIER_FAULT_MULT: Record<Tier, number> = { 1: 0.6, 2: 0.85, 3: 1.0, 4: 1.1 };
export const FAULT_RATE_BASE = 0.09; // 每日新增故障的基礎機率（隨健康度上升、隨運轉比例縮放）
export const FLEET_INIT_FAULTS = 3; // 開局即有的故障數（給玩家可立即處理的事件）
export const REMOTE_RESET_DAYS = 1; // 遠端重啟工期（免技師、較短）
export const FLEET_FIX_REWARD = 120_000; // 每修復一台機組的維運報酬 ◎（Phase C 經濟）
export const ELECTRICITY_PRICE = 3_200; // 售電單價 ◎/MWh（每日發電量 → 收入；售電為營收主體，須穩定高於 O&M 開銷）
export const INSPECT_DAYS = 2; // 預防性定檢工期（Phase C2）
export const INSPECT_BUFF_DAYS = 8; // 定檢後降低故障率的持續天數
export const INSPECT_FAULT_MULT = 0.4; // 定檢生效期間的故障率倍率
// 船舶可同時支援的現場工單數（Phase C2）：CTV 基礎 2、SOV 4，每整備等級 +1（遠端重啟不占用）
export const vesselJobCap = (ownsSOV: boolean, vesselLevel: number): number => (ownsSOV ? 4 : 2) + vesselLevel;
export const onsiteJobCount = (jobs: OpsJob[]): number => jobs.filter((j) => !j.remote).length;

// 多元船隊（#4）：以「目前作業船(activeVessel)」的規格驅動派船能力與成本，取代二元 CTV/SOV。
// 取規格時容錯：舊狀態無 activeVessel 時退回 CTV/SOV 的等效規格，確保相容。
export function activeVesselSpec(s: { activeVessel?: VesselClass; ownsSOV?: boolean }) {
  if (s.activeVessel) return vesselSpec(s.activeVessel);
  return vesselSpec(s.ownsSOV ? "sov" : "ctv");
}
export const seaTolOf = (s: { activeVessel?: VesselClass; ownsSOV?: boolean }): number => activeVesselSpec(s).seaTol;
export const jobCapOf = (s: { activeVessel?: VesselClass; ownsSOV?: boolean; vesselLevel: number }): number => activeVesselSpec(s).jobCap + s.vesselLevel;
export const sortieCostOf = (s: { activeVessel?: VesselClass; ownsSOV?: boolean }): number => activeVesselSpec(s).sortieCost;
export const vesselWearOf = (s: { activeVessel?: VesselClass; ownsSOV?: boolean }): number => activeVesselSpec(s).wearRate;
export const windowBonusOf = (s: { activeVessel?: VesselClass; ownsSOV?: boolean }): number => activeVesselSpec(s).windowBonus;

// 存檔遷移（#4）：補齊多元船隊欄位。舊存檔可能無 ownedVessels/activeVessel；
// 已購 SOV(ownsSOV) 的舊存檔須把 sov 補進船隊，並確保 activeVessel 為已擁有船型。
export function migrateVessels(s: GameData): GameData {
  const owned = Array.isArray(s.ownedVessels) && s.ownedVessels.length ? [...s.ownedVessels] : ["ctv" as VesselClass];
  if (!owned.includes("ctv")) owned.unshift("ctv");
  if (s.ownsSOV && !owned.includes("sov")) owned.push("sov");
  const active = s.activeVessel && owned.includes(s.activeVessel) ? s.activeVessel : "ctv";
  return { ...s, ownedVessels: owned, activeVessel: active };
}

// 存檔遷移單一入口（#save-version）：補齊新欄位(以 INITIAL 為預設)、跑既有船隊遷移,並標記為現版。
// 未來破壞性改版時,在此依 parsed.version 做欄位轉換後再回傳。集中於此 → 載入路徑只有一處可信來源。
export function migrateSave(parsed: Partial<GameData>): GameData {
  // const from = parsed.version ?? 0;  // 預留:依來源版本做逐版升級
  const merged = migrateVessels({ ...INITIAL, ...parsed });
  return { ...merged, version: SAVE_VERSION };
}

// 依擁有風場建立機組陣列（每座 farm.units 台，發電佔比 = genPerDay/units）
export function buildFleetForFarm(f: number): Turbine[] {
  const farm = FARMS[f];
  if (!farm) return [];
  const share = Math.round((farm.genPerDay / farm.units) * 10) / 10;
  return Array.from({ length: farm.units }, (_, i) => ({ id: `${farm.code}${String(i + 1).padStart(2, "0")}`, farm: f, status: "ok" as TurbineStatus, gen: share }));
}
export function buildFleet(farmsOwned: number, tier = 1): Turbine[] {
  let out: Turbine[] = [];
  for (let f = 0; f < Math.min(farmsOwned, FARMS.length); f++) out = out.concat(buildFleetForFarm(f));
  // 開局植入數台故障，讓戰情室一開始就有事件可處理（限縮在當前 tier 的入門故障池，#76）
  for (let k = 0; k < FLEET_INIT_FAULTS && k < out.length; k++) {
    const i = Math.floor((out.length / FLEET_INIT_FAULTS) * k) + k;
    if (out[i]) out[i] = { ...out[i], status: "fault", faultId: randomIncidentId(tier) };
  }
  return out;
}
export const fleetUptime = (fleet: Turbine[]): number => (fleet.length ? Math.round((fleet.filter((t) => t.status === "ok").length / fleet.length) * 100) : 100);
export const engineerBusy = (jobs: OpsJob[], id: string): boolean => jobs.some((j) => j.engineerId === id);

// 妥善率單一真實來源（#3）：可用率 = 機隊運轉比例（fleetUptime）。任何「拉高/拉低可用率」的效果
// （突發事件、任務選擇…）都改以「使機組故障/修復」實作,讓變化真實反映在發電、SLA、績效,
// 不再維護一個會與機隊漂移的獨立純量。
export function faultTurbines(fleet: Turbine[], n: number, tier = 99): Turbine[] {
  const out = fleet.map((t) => ({ ...t }));
  const oks = out.filter((t) => t.status === "ok");
  for (let k = 0; k < n && oks.length; k++) {
    const pick = oks.splice(Math.floor(Math.random() * oks.length), 1)[0];
    const i = out.findIndex((t) => t.id === pick.id);
    out[i] = { ...out[i], status: "fault", faultId: randomIncidentId(tier) };
  }
  return out;
}
export function restoreTurbines(fleet: Turbine[], n: number): Turbine[] {
  const out = fleet.map((t) => ({ ...t }));
  const down = out.filter((t) => t.status === "fault"); // 僅復歸「故障待派」;維修中(repair)交由工單完工,避免干擾進行中的派工
  for (let k = 0; k < n && down.length; k++) {
    const pick = down.splice(Math.floor(Math.random() * down.length), 1)[0];
    const i = out.findIndex((t) => t.id === pick.id);
    out[i] = { ...out[i], status: "ok", faultId: undefined };
  }
  return out;
}
// 將「妥善率百分點變化」換算為機組台數並套用（任務／沙盒效果用，至少動 1 台以保留決策意義）。
export function applyAvailDelta(fleet: Turbine[], points: number): Turbine[] {
  if (!fleet.length || !points) return fleet;
  const n = Math.max(1, Math.round((Math.abs(points) / 100) * fleet.length));
  return points > 0 ? restoreTurbines(fleet, n) : faultTurbines(fleet, n);
}

export const SEA_INDEX: Record<SeaState, number> = { workable: 0, caution: 1, closed: 2 };
export const vesselSeaTol = (ownsSOV: boolean) => (ownsSOV ? 2 : 1); // CTV 可到 caution；SOV 可到 closed
export const BASE_GEN_PER_DAY = 120; // 100% 可用率每日發電量 (MWh)

// 海象標籤 / 圖示（單一真實來源，供各畫面與三日預報共用，#2）
export const SEA_LABEL: Record<SeaState, I18n> = {
  workable: { zh: "可作業", en: "Workable" },
  caution: { zh: "警戒", en: "Caution" },
  closed: { zh: "停航", en: "Closed" },
};
export const SEA_ICON: Record<SeaState, string> = { workable: "☀", caution: "⛅", closed: "🌀" };
export const FORECAST_DAYS = 3; // 微觀天氣預報展望天數（#2）

export interface Quest {
  id: string;
  title: I18n;
  brief: I18n;
  unit: string; // 機組編號（顯示）
  targetFault: string; // 對應 faults.ts 的故障 id（決定維修測驗）
  rewardBudget: number; // ◎
  rewardXp: number;
}

// 存檔結構版本（#save-version）：每次 GameData 形狀有破壞性變動時 +1,並在 migrateSave() 加對應遷移。
export const SAVE_VERSION = 1;

export interface GameData {
  version?: number; // 存檔結構版本(舊檔無 → 視為 0,由 migrateSave 補欄位並標記為現版)
  budget: number; // ◎（頂部列顯示為「萬」）
  xp: number;
  day: number;
  techAvail: number;
  techTotal: number;
  availability: number; // 機組妥善率 %
  seaState: SeaState;
  questStage: QuestStage;
  questIndex: number; // 舊：工單池索引（保留相容）
  campaignIndex: number; // 主線戰役關卡索引（#20）
  campaignDone: boolean; // 戰役是否通關
  buildStage: number; // 風場建置番外篇（#1）：目前階段索引（= BUILD_STAGE_COUNT 表示完工）
  buildScore: number; // 建置品質/聲望分（決策累積）
  buildDone: boolean; // 番外篇是否完工
  customQuest: Quest | null; // 課程模式臨時指派的任務（#6），非 null 時覆蓋主線
  repairDone: boolean; // 本工單維修是否完成
  cargoUsed: number;
  cargoCap: number;
  inventory: Record<string, number>; // partId -> 數量
  vesselLevel: number; // 船隊：每級 +2 作業窗（耐海象/效率）
  techLevel: number; // 技師公會：每級 +2 妥善率回復、+2 技師
  toolLevel: number; // 機具工坊：每級 SOP 步驟 -1 時段（最低 1）
  seenFaults: string[]; // 圖鑑：已修復過的故障
  missionsDone: number; // 排行榜 KPI
  pendingOrders: { partId: string; arriveDay: number; qty: number }[]; // 備品在途（lead time，C）
  engineers: Engineer[]; // 已招募技師（#27）
  ownsSOV: boolean; // 是否擁有 SOV（#26，可在高海象出航）；多元船隊下 = 擁有任一耐停航船型
  ownedVessels: VesselClass[]; // 多元船隊（#4）：已擁有船型
  activeVessel: VesselClass; // 目前作業船：驅動耐海象/載量/同時工單/成本/作業窗/磨耗
  jobPhase: JobPhase; // 出勤階段（#25）：office→enroute→onsite
  generationMWh: number; // 累積發電量（#28 KPI）
  farmsOwned: number; // 營運中的風場數（#34，預設 1）
  safetyIncidents: number; // 安全事件次數（#34，扣績效分）
  lastEvent: EventStamp | null; // 最近一次突發事件（#34）
  fleetHealth: number; // 機組健康度 0-100（#1）：忽略預兆/未修故障會衰退，提高連鎖故障機率
  forecast: SeaState[]; // 微觀天氣預報（#2）：未來 N 日海象預測，支援預防性排程
  overhaul: Overhaul | null; // 進行中的多回合大修（#4）：需連續可作業天氣窗，惡劣海象停滯+待命費
  quarter: number; // 目前合約季度（#3，自 1 起）
  quarterStartDay: number; // 本季起始日（#3）
  slaAvailSum: number; // 本季可用率每日累計（#3，用於平均）
  slaSamples: number; // 本季取樣天數（#3）
  slaPenalties: number; // 累計 SLA 違約次數（#3，扣績效分）
  lastSla: SlaResult | null; // 最近一次季度結算（#3）
  lastSpoil: { part: string; day: number } | null; // 最近一次備品折舊報廢（#warehouse）
  diagLevel: number; // 進階檢測等級 0/1（#scada）：付費解鎖更清晰的 SCADA 趨勢判讀
  vesselWear: number; // 船舶磨耗 0-100（#7）：每趟出勤累積，需定期保養，過高縮短作業窗
  fleet: Turbine[]; // 機組個體（Phase C 活體戰情層）
  opsJobs: OpsJob[]; // 進行中的並行維修工單（Phase C）
  fleetLostMWh: number; // 累積因停機損失的發電量（教學：差異化停機損失，回饋 #4）
  fleetResolved: number; // 累積在戰情室修復的機組數（績效加分）
  inspectBuffDays: number; // 預防性定檢生效剩餘天數（Phase C2，降低故障率）
  lastLedger: Ledger | null; // 最近一次推進的每日收支明細（莉莉財報）
  repair: RepairState | null; // 進行中的維修作業進度（存進 state → 切換畫面不丟失、作業窗不被免費重置）
  daily: DailyState | null; // 每日任務（#78）：綁遊戲內日，達成自動發獎；null = 尚未產生(掛載時 roll)
  weekly: WeeklyState | null; // 每週主題挑戰（#79）：綁遊戲內週，主題影響故障率 + 較大獎勵；null = 掛載時 roll
  lastServiceDay: number; // 上次計畫性定期保養的日（#81）：到期(間隔 SERVICE_INTERVAL_DAYS)才可再做
  seenCases: string[]; // 已解鎖/看過的真實案例研究 id（永久收錄於圖鑑案例檔）
  lastCase: { id: string; day: number } | null; // 最近偶發的案例快報（Hub 提示用）
  history: TrendPoint[]; // 營運趨勢歷史（#5）：每次推進日累積一點,供趨勢圖/賽後復盤
  mastery: Mastery; // 知識點掌握度（#mastery）：依科別/任務類型統計作答正確率,找弱點補強
  mistakes: Mistake[]; // 錯題本（#mistake-log）：答錯的情境/選擇/正解/教訓,供複習與反思
  answerStreak: number; // 診斷連對 streak(#streak):首次作答連續答對次數 → 小額 XP 加成,鼓勵出手前先思考
  portUpgrades: Record<string, number>; // 母港建設（#port）：各設施視覺成長等級
}

// 每日任務狀態（#78）：綁遊戲內日；baseline 記錄當日起始累積值，達成以增量/當前狀態判定。
export interface DailyState {
  day: number; // 對應的遊戲內日
  ids: string[]; // 今日開放的小目標 id（見 dailyTasks.ts）
  base: { resolved: number; missions: number; gen: number; safety: number }; // 當日起始累積值
  claimed: string[]; // 已發獎的小目標 id
  streak: number; // 連續「全部完成」天數
}

// 每週主題挑戰狀態（#79）：綁遊戲內週；themeId 決定主題與 faultMult(綁事件池),baseline 記錄週起始累積值。
export interface WeeklyState {
  week: number; // 對應的遊戲內週（見 weeklyChallenges.ts weekOf）
  themeId: string; // 本週主題 id
  faultMult: number; // 主題對戰情室隨機故障率的影響(advance 讀取)
  base: { resolved: number; missions: number; gen: number; safety: number; day: number }; // 週起始累積值
  claimed: boolean; // 本週挑戰是否已領獎
  streak: number; // 連續完成週數
}

// 維修作業進度（#33）：原本只存在 RepairScreen 的 local state，切到別的畫面就重置（丟進度＋免費重置作業窗）。
// 改存進 game state，以 key 綁定當前工單；接新單／完工／撤離時清空。
export interface RepairState {
  key: string; // 工單識別（campaignIndex/customQuest + quest.id），切單即失效
  boarded: boolean; // 是否已登塔開工
  pick: number | null; // 診斷題目前選擇（null = 未作答）
  steps: boolean[]; // SOP 各步驟完成狀態
  win: number; // 剩餘作業窗時段
  misses?: number; // 診斷答錯次數(供任務復盤/評分,#debrief)
}

// 多回合大修（#4）：重大組件更換需多個「可作業天氣窗」工日才完成。
export interface Overhaul {
  questId: string;
  unit: string; // 機組編號（顯示）
  fault: string; // 故障 id（完成後計入圖鑑）
  discipline: Discipline; // 出勤科別（#7 疲勞累積對象）
  progress: number; // 已完成的可作業工日
  need: number; // 需要的可作業工日
  demurrageDays: number; // 因惡劣海象停滯（已付待命費）的天數
  rewardBudget: number; // 完成時發放
  rewardXp: number;
  mobilizeLeft?: number; // 安裝船(jack-up)動員/航行剩餘天數（#81）：>0 期間尚未到場、不推進工日、不收待命費
}

// 季度 SLA 結算結果（#3）
export interface SlaResult {
  quarter: number;
  avg: number; // 本季平均可用率 %
  floor: number; // 底線 %
  breached: boolean; // 是否違約
  penalty: number; // 違約金 ◎
  day: number;
}

// 每日收支明細（莉莉財報）：推進一天後彙整當日各項現金流，幫玩家看懂錢的去向（收入/支出/淨額）。
export interface Ledger {
  day: number; // 推進後的絕對天數
  days: number; // 本次推進的天數
  revenue: number; // 售電收入（+）
  fixPay: number; // 戰情室修復報酬（+）
  payroll: number; // 技師薪資（−）
  storage: number; // 倉儲維持費（−）
  downtime: number; // 任務停機損失（−）
  demurrage: number; // 大修船舶待命費（−）
  slaPenalty: number; // 季度 SLA 違約金（−）
  event: number; // 突發事件現金影響（±）
  net: number; // 當日淨變動（= 推進後預算 − 推進前預算）
}

export const OVERHAUL_NEED = 3; // 大修所需的可作業工日（#4）
export const DEMURRAGE_PER_DAY = 400_000; // 大修因惡劣海象停滯的船舶待命費／日（#4）
// 安裝船(jack-up)動員（#81 真實度深化）：大型組件更換需提前數日動員/航行 + 高額動員費，
// 讓「現在換大組件 vs 接受停機損失」成為真實取捨。動員期間僅推進日期，不收待命費、不推進工日。
export const JACKUP_MOBILIZE_DAYS = 5; // 動員/航行前置期（天）
export const JACKUP_MOBILIZE_COST = 8_000_000; // 一次性動員費 ◎
// 計畫性定期保養（#81 scheduled service）：每隔固定天數可做一次定期保養 → 一段時間內降低故障率 + 回復健康度，
// 補齊維護三分類(計畫性 / 狀態式 CBM / 故障矯正)。為教學可達性,週期採壓縮的「定期」而非字面 365 天。
export const SERVICE_INTERVAL_DAYS = 90; // 兩次計畫保養的間隔（到期才可做）
export const SCHEDULED_SERVICE_COST = 1_500_000; // 計畫保養費用 ◎
export const SCHEDULED_SERVICE_DAYS = 2; // 計畫保養工期（天）
export const SCHEDULED_SERVICE_BUFF_DAYS = 30; // 保養後降低故障率的持續天數（沿用 inspectBuffDays 機制）
export const SCHEDULED_SERVICE_HEALTH = 15; // 保養後回復的機組健康度
export const QUARTER_DAYS = 90; // 一季天數（#3）
export const SLA_FLOOR = 90; // 季度可用率底線 %（#3）
export const SLA_PENALTY = 5_000_000; // 違約金 ◎（#3）

export const DOWNTIME_PER_DAY = 30_000; // 機組停機每日損失（C）

// 倉儲折舊（#warehouse）：持有備品每日維持費 + 折舊報廢機率
export const STORAGE_COST_PER_UNIT = 2_000; // 每件備品每日倉儲維持費 ◎
export const SPOIL_CHANCE = 0.04; // 每類備品每日折舊報廢 1 件的機率
export const inventoryUnits = (inv: Record<string, number>) => Object.values(inv).reduce((a, n) => a + Math.max(0, n ?? 0), 0);
export const dailyStorageCost = (inv: Record<string, number>) => inventoryUnits(inv) * STORAGE_COST_PER_UNIT;

// 進階檢測（#scada）
export const DIAG_COST = 8_000_000; // 解鎖進階檢測一次性費用 ◎

// 船舶保養（#7）
export const VESSEL_WEAR_PER_SORTIE = 16; // 每趟出航累積磨耗
export const SORTIE_COST = 250_000; // 每趟出海動員/油耗固定成本（鼓勵一趟修多台、勿一部一部修）
export const VESSEL_SERVICE_COST = 2_000_000; // 進廠保養費用 ◎
export const vesselWindowPenalty = (wear: number) => (wear >= 85 ? 2 : wear >= 55 ? 1 : 0); // 磨耗縮短作業窗時段

// 作業安全窗上限（時段）：海象越差窗越小；船隊等級/船型加窗；船舶磨耗扣窗。
// 出海前工期預估（SailScreen）與現場維修（RepairScreen）共用同一公式 → 兩處數字永遠一致。
export const workWindowMax = (s: { seaState: SeaState; vesselLevel: number; vesselWear: number; activeVessel?: VesselClass; ownsSOV?: boolean }): number =>
  Math.max(4, (s.seaState === "closed" ? 6 : s.seaState === "caution" ? 8 : 10) + s.vesselLevel * 2 + windowBonusOf(s) - vesselWindowPenalty(s.vesselWear));

// 每個可點擊 SOP 步驟耗費的作業窗時段（工坊等級越高越省，下限 1）。RepairScreen.completeStep 與出海預估共用。
export const sopStepCost = (toolLevel: number): number => Math.max(1, 2 - toolLevel);

// 加班搶修(#rush):作業窗吃緊時的風險取捨——剩餘 SOP 一次趕完、總耗時減半(無條件進位、下限 1),
// 但有 RUSH_RISK 機率發生安全近失事件(計入 safetyIncidents、扣績效)。「快」與「穩」的抉擇。
export const RUSH_RISK = 0.25;
export const rushCost = (remainingSteps: number, toolLevel: number): number =>
  Math.max(1, Math.ceil((remainingSteps * sopStepCost(toolLevel)) / 2));

// 多風場每日基準發電總和（owned 座風場的 genPerDay 加總）
function ownedFarmGen(farmsOwned: number): number {
  let g = 0;
  for (let i = 0; i < Math.min(farmsOwned, FARMS.length); i++) g += FARMS[i].genPerDay;
  return g;
}

// 每 MWh 停機損失的額外績效扣分（#2）：發電量已是淨值（停機那部分本就沒進帳），
// 這項是在「少賺」之外，再對累積停機損失課一筆績效罰金 → 讓「放著機組不修」直接傷排行分,
// 強化教學訊號(妥善率管理 = 績效核心)。係數刻意偏小,避免與淨發電量重複懲罰過重。
export const DOWNTIME_SCORE_PENALTY = 0.3;
// 綜合績效分（單一真實來源，#28/#34/#3/#2/Phase C）：
// 發電量(淨值) + 可用率×5 + 完成任務×30 − 安全×20 + 風場×10 − SLA違約×25 + 戰情室修復×8 − 停機損失×0.3
export function computeScore(d: GameData): number {
  return Math.max(
    0,
    d.generationMWh + d.availability * 5 + d.missionsDone * 30 - d.safetyIncidents * 20 + d.farmsOwned * 10 - (d.slaPenalties ?? 0) * 25 + (d.fleetResolved ?? 0) * 8 - Math.round((d.fleetLostMWh ?? 0) * DOWNTIME_SCORE_PENALTY),
  );
}

// 運維層級推導（#76，依進度自動推進）：由多個單調成長的進度訊號取最高達成層級。
// 任一訊號跨過門檻即升級（OR 條件、門檻遞增 → tier 單調不減）。新帳號（發電 0、單一風場）= Tier 1。
// 訊號：累積發電量 generationMWh、完成任務 missionsDone、營運風場數 farmsOwned、主線關卡 campaignIndex。
export function tierOf(d: Pick<GameData, "generationMWh" | "missionsDone" | "farmsOwned" | "campaignIndex">): Tier {
  const gen = d.generationMWh ?? 0;
  const missions = d.missionsDone ?? 0;
  const farms = d.farmsOwned ?? 1;
  const camp = d.campaignIndex ?? 0;
  let t: Tier = 1;
  if (gen >= 1500 || missions >= 6 || camp >= 2) t = 2;
  if (gen >= 6000 || missions >= 16 || farms >= 2 || camp >= 4) t = 3;
  if (gen >= 15000 || missions >= 30 || farms >= 3 || camp >= 6) t = 4;
  return t;
}

// 每日實際發電量（MWh）：以「運轉中的機組」為單一真實來源 —— 故障/維修中的機組不發電。
// 不再用「可用率上限再扣停機」的減法（會與機組停機重複計，造成明明有機組運轉、收入卻歸零）。
export function dailyProduction(d: GameData): number {
  const fleet = d.fleet ?? [];
  if (!fleet.length) return Math.max(0, Math.round((d.availability / 100) * ownedFarmGen(d.farmsOwned))); // 無機組模型時退回可用率估算
  return Math.round(fleet.reduce((a, t) => a + (t.status === "ok" ? t.gen : 0), 0));
}
// 預估每日售電收入（◎）：實際運轉發電 × 售電單價（管理機隊、減少停機 → 直接多賺）
export function dailyRevenue(d: GameData): number {
  return dailyProduction(d) * ELECTRICITY_PRICE;
}

const INITIAL_FLEET = buildFleet(1); // 建一次,供 fleet 與 availability 共用 → 開局妥善率即與機隊自洽（#3）
export const INITIAL: GameData = {
  version: SAVE_VERSION,
  budget: 84_200_000,
  xp: 0,
  day: 21,
  techAvail: 24,
  techTotal: 30,
  availability: fleetUptime(INITIAL_FLEET), // 妥善率 = 機隊運轉比例（單一真實來源，#3）
  seaState: "workable",
  questStage: "available",
  questIndex: 0,
  campaignIndex: 0,
  campaignDone: false,
  buildStage: 0,
  buildScore: 0,
  buildDone: false,
  customQuest: null,
  repairDone: false,
  cargoUsed: 620,
  cargoCap: 1000,
  inventory: {},
  vesselLevel: 0,
  techLevel: 0,
  toolLevel: 0,
  seenFaults: [],
  missionsDone: 0,
  pendingOrders: [],
  engineers: [{ id: "eng_start", name: "阿銘", discipline: "mechanical", level: 1, fatigue: 0 }], // 起始機械技師
  ownsSOV: false,
  ownedVessels: ["ctv"],
  activeVessel: "ctv",
  jobPhase: "office",
  generationMWh: 0,
  farmsOwned: 1,
  safetyIncidents: 0,
  lastEvent: null,
  fleetHealth: 88,
  forecast: ["workable", "caution", "closed"], // 三日後有風暴：開局即示範預防性排程（#2）
  overhaul: null,
  quarter: 1,
  quarterStartDay: 21, // = INITIAL.day，本季自開局起算（#3）
  slaAvailSum: 0,
  slaSamples: 0,
  slaPenalties: 0,
  lastSla: null,
  lastSpoil: null,
  diagLevel: 0,
  vesselWear: 0,
  fleet: INITIAL_FLEET,
  opsJobs: [],
  fleetLostMWh: 0,
  fleetResolved: 0,
  inspectBuffDays: 0,
  lastLedger: null,
  repair: null,
  daily: null,
  weekly: null,
  lastServiceDay: 21, // = INITIAL.day（首次保養於 21 + 間隔 後到期）
  seenCases: [],
  lastCase: null,
  history: [],
  mastery: {},
  mistakes: [],
  answerStreak: 0,
  portUpgrades: {},
};

// 計畫性定期保養是否到期（#81）：距上次保養 ≥ 間隔天數
export const serviceDue = (d: Pick<GameData, "day" | "lastServiceDay">): boolean => d.day - (d.lastServiceDay ?? 0) >= SERVICE_INTERVAL_DAYS;
export const serviceDueInDays = (d: Pick<GameData, "day" | "lastServiceDay">): number => Math.max(0, SERVICE_INTERVAL_DAYS - (d.day - (d.lastServiceDay ?? 0)));

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// 推進 N 天：交付到貨備品 + 扣停機成本 + 多風場發電 + 人力回復 + 突發事件（C / #34）
function advance(s: GameData, days = 1): Partial<GameData> {
  const day = s.day + days;
  const tier = tierOf(s); // 運維層級（#76）：限縮隨機故障池並縮放故障率
  let inv = s.inventory;
  let cargo = s.cargoUsed;
  const pend: GameData["pendingOrders"] = [];
  for (const o of s.pendingOrders) {
    if (o.arriveDay <= day) {
      inv = { ...inv, [o.partId]: (inv[o.partId] ?? 0) + o.qty };
      cargo = Math.min(s.cargoCap, cargo + o.qty);
    } else pend.push(o);
  }
  // 倉儲折舊（#warehouse）：備品逐日折舊，偶有報廢；持有量越大、維持費與耗損越高（考驗 JIT vs 安全庫存）
  let lastSpoil = s.lastSpoil;
  for (let d = 0; d < days; d++) {
    for (const [pid, qty] of Object.entries(inv)) {
      if ((qty ?? 0) > 0 && Math.random() < SPOIL_CHANCE) {
        inv = { ...inv, [pid]: qty - 1 };
        cargo = Math.max(0, cargo - 1);
        lastSpoil = { part: pid, day }; // 以本次推進後的絕對天數標記，供 UI 去重通知
      }
    }
  }
  const downtime = s.questStage === "active" && !s.repairDone ? DOWNTIME_PER_DAY * days : 0;
  const storage = dailyStorageCost(inv) * days; // 倉儲維持費（#warehouse）
  const payroll = dailyPayroll(s.engineers) * days; // 技師薪資（O&M 經濟閉環）
  // 莉莉財報：彙整當日各項現金流。所有進出帳先累計為「單一帶號淨額」，最後一次性夾到 ≥0，
  // 避免逐步 Math.max(0,…) 造成「破產時支出被赦免、收入又補回」的假象（也讓明細加總 == 淨額）。
  const ledger: Ledger = { day, days, revenue: 0, fixPay: 0, payroll: -payroll, storage: -storage, downtime: -downtime, demurrage: 0, slaPenalty: 0, event: 0, net: 0 };
  let cash = -downtime - storage - payroll; // 當日現金流累計（帶號）
  // 售電收入改由「實際運轉的機組」計算（見下方機隊推進後加計）。預算於本函式末一次性結算。
  let patch: Partial<GameData> = {
    day,
    pendingOrders: pend,
    inventory: inv,
    cargoUsed: cargo,
    lastSpoil,
    techAvail: Math.min(s.techTotal, s.techAvail + days), // 人力每日緩慢回復
    engineers: s.engineers.map((e) => ({ ...e, fatigue: clampN(fatigueOf(e) - FATIGUE_RECOVERY * days, 0, 100) })), // 技師休整回復疲勞（#7）
  };
  // 機組健康度衰退（#1）：自然磨耗；未修故障加速劣化（連鎖反應的根源）
  const neglect = s.questStage === "active" && !s.repairDone ? 1.5 : 0;
  const health = clampN(s.fleetHealth - (0.5 + neglect) * days, 0, 100);
  patch.fleetHealth = health;
  // 天氣隨日推進（#2）：昨日預報實現為今日海象，並滾動更新三日預報
  const w = advanceWeather(s.seaState, s.forecast, days);
  patch.seaState = w.seaState;
  patch.forecast = w.forecast;
  // 大修進行中：安裝船每日待命費（demurrage，#4）。惡劣海象拉長工期 → 待命天數變多 → 總成本上升。
  // 動員/航行期間（mobilizeLeft>0）安裝船尚未到場,不收待命費（#81）。
  if (s.overhaul && (s.overhaul.mobilizeLeft ?? 0) <= 0) { const dem = DEMURRAGE_PER_DAY * days; cash -= dem; ledger.demurrage = -dem; }
  // 健康度越低 → 突發事件機率越高、且偏向壞事件（連鎖故障）
  const riskBoost = ((100 - health) / 100) * 0.4;
  let startFleet = s.fleet; // 本次推進的起始機隊（事件的故障/修復先套用於此，再進入每日推進）
  const ev = rollEvent(riskBoost, health);
  if (ev) {
    // 事件以「起始預算」為基準算出現金影響（±），其餘欄位照常合併；預算本身於末段一次性結算。
    const evPatch = ev.apply({ ...s, ...patch, budget: s.budget } as GameData);
    if (evPatch.budget !== undefined) { ledger.event = evPatch.budget - s.budget; cash += ledger.event; delete evPatch.budget; }
    // 機隊效果（#3）：事件對可用率的影響改以真實機組故障/修復實作 → 同步反映在發電、SLA、績效。
    if (ev.fault) startFleet = faultTurbines(startFleet, ev.fault, tier);
    if (ev.restore) startFleet = restoreTurbines(startFleet, ev.restore);
    patch = { ...patch, ...evPatch, lastEvent: { id: ev.id, name: ev.name, desc: ev.desc, good: !!ev.good, day } };
  }
  // 真實案例研究偶發快報（case studies）：極低機率抽一則「當前 tier 內、本局未看過」的案例，
  // 永久收錄進圖鑑案例檔（不改變主存檔數值；選擇/效果只在案例檔作教學標示）。
  const rolledCase = rollCaseStudy(tier, s.seenCases);
  if (rolledCase) {
    patch.seenCases = [...s.seenCases, rolledCase.id];
    patch.lastCase = { id: rolledCase.id, day };
  }
  // 活體戰情層（Phase C）：每日推進並行工單、隨機新增故障、累計停機發電損失
  let slaUptime: number | null = null; // 本次推進每日平均妥善率（fleet 推進後填入，供 SLA 取真實值）
  if (startFleet.length) {
    let fleet = startFleet.map((tt) => ({ ...tt }));
    let jobs = s.opsJobs.map((j) => ({ ...j }));
    let resolved = s.fleetResolved;
    let engs = patch.engineers ?? s.engineers;
    let fixPay = 0;
    let buffDays = s.inspectBuffDays; // 預防性定檢生效天數（Phase C2）
    let healthBoost = 0;
    let producedAcc = 0, lostAcc = 0, uptimeAcc = 0; // 逐日累計（#4 多日推進精算，不再以最終機隊×天數近似）
    for (let dd = 0; dd < days; dd++) {
      // 並行工單推進；完工 → 維修(機組復歸+報酬) 或 定檢(啟動降故障 buff)；派工(非遠端)累積疲勞
      jobs = jobs.map((j) => ({ ...j, daysLeft: j.daysLeft - 1 }));
      for (const j of jobs.filter((j) => j.daysLeft <= 0)) {
        if (j.kind === "inspect") {
          buffDays = INSPECT_BUFF_DAYS; // 定檢完成 → 降低未來故障率
          healthBoost += 3;
        } else {
          const ti = fleet.findIndex((t) => t.id === j.turbine);
          if (ti >= 0) fleet[ti] = { ...fleet[ti], status: "ok", faultId: undefined };
          resolved += 1;
          fixPay += FLEET_FIX_REWARD;
        }
        if (!j.remote) engs = deployFatigue(engs, j.discipline);
      }
      jobs = jobs.filter((j) => j.daysLeft > 0);
      // 隨機新增故障（機率隨健康度下降而上升；定檢生效期間降低），鎖定一台正常且未在維修的機組。
      // 只有「運轉中」的機組會新故障 → 機率隨運轉比例縮放，形成穩定平衡而非死亡螺旋（不會全場掛掉）。
      const oks = fleet.filter((t) => t.status === "ok");
      const okFrac = fleet.length ? oks.length / fleet.length : 1;
      // 故障率依運維層級（#76）與每週主題（#79：風暴週↑、平穩週↓）縮放
      const weeklyMult = s.weekly?.faultMult ?? 1;
      const faultProb = Math.min(0.5, FAULT_RATE_BASE + ((100 - health) / 100) * 0.15) * (buffDays > 0 ? INSPECT_FAULT_MULT : 1) * okFrac * TIER_FAULT_MULT[tier] * weeklyMult;
      if (oks.length && Math.random() < faultProb) {
        const pick = oks[Math.floor(Math.random() * oks.length)];
        const fi = fleet.findIndex((t) => t.id === pick.id);
        fleet[fi] = { ...fleet[fi], status: "fault", faultId: randomIncidentId(tier) };
      }
      if (buffDays > 0) buffDays -= 1;
      // 當日結算（在當日修復/新故障處理後，以當日機隊狀態計）→ 多日推進更精確
      producedAcc += fleet.reduce((a, t) => a + (t.status === "ok" ? t.gen : 0), 0);
      lostAcc += fleet.reduce((a, t) => a + (t.status !== "ok" ? t.gen : 0), 0);
      uptimeAcc += fleet.length ? (fleet.filter((t) => t.status === "ok").length / fleet.length) * 100 : 100;
    }
    patch.inspectBuffDays = buffDays;
    if (healthBoost) patch.fleetHealth = clampN((patch.fleetHealth ?? s.fleetHealth) + healthBoost, 0, 100);
    // 實際運轉發電（售電收入主體）與停機損失（KPI）：逐日累計（#4）
    const produced = Math.round(producedAcc);
    const lost = Math.round(lostAcc);
    slaUptime = uptimeAcc / days; // 本次推進每日平均妥善率（供 SLA 取真實值，多日推進更精確）
    patch.fleet = fleet;
    patch.opsJobs = jobs;
    patch.fleetResolved = resolved;
    patch.fleetLostMWh = s.fleetLostMWh + lost;
    patch.engineers = engs;
    if (fixPay > 0) { cash += fixPay; ledger.fixPay = fixPay; }
    // 售電收入 = 實際運轉發電 × 單價（只計運轉中的機組，不再用「可用率上限再扣停機」的減法 → 不會重複計到歸零）。
    const revenue = produced * ELECTRICITY_PRICE;
    cash += revenue;
    patch.generationMWh = (patch.generationMWh ?? s.generationMWh) + produced;
    ledger.revenue = revenue;
  } else {
    // 無機組模型（理論上不會發生）：退回以可用率估算發電與售電
    const avail = patch.availability ?? s.availability;
    const produced = Math.round((avail / 100) * ownedFarmGen(s.farmsOwned) * days);
    const revenue = produced * ELECTRICITY_PRICE;
    cash += revenue;
    patch.generationMWh = (patch.generationMWh ?? s.generationMWh) + produced;
    ledger.revenue = revenue;
  }
  // 妥善率單一真實來源（#3）：可用率 = 機隊實際運轉比例。advance 後一律以機隊重算 availability，
  // 取代過去散落各 action／事件的 ±N 純量加減（會與機隊漂移）。無機組模型時退回原純量。
  const finalFleet = patch.fleet ?? startFleet;
  if (finalFleet.length) patch.availability = fleetUptime(finalFleet);
  // 合約 SLA（#3）：每日累計「實際可用率」，跨季結算；平均低於底線 → 扣違約金。
  // 取本次推進的每日平均妥善率（多日推進更精確）；無機組模型時退回 availability 純量。
  const avail = slaUptime ?? (finalFleet.length ? fleetUptime(finalFleet) : (patch.availability ?? s.availability));
  let qStart = s.quarterStartDay;
  let quarter = s.quarter;
  let sum = s.slaAvailSum + avail * days;
  let samples = s.slaSamples + days;
  let penalties = s.slaPenalties;
  let lastSla = s.lastSla;
  if (day - qStart >= QUARTER_DAYS) {
    const avg = samples > 0 ? sum / samples : avail;
    const breached = avg < SLA_FLOOR;
    const penalty = breached ? SLA_PENALTY : 0;
    cash -= penalty;
    ledger.slaPenalty = -penalty;
    lastSla = { quarter, avg: Math.round(avg * 10) / 10, floor: SLA_FLOOR, breached, penalty, day };
    if (breached) penalties += 1;
    quarter += 1;
    qStart = day;
    sum = 0;
    samples = 0;
  }
  patch.quarter = quarter;
  patch.quarterStartDay = qStart;
  patch.slaAvailSum = sum;
  patch.slaSamples = samples;
  patch.slaPenalties = penalties;
  patch.lastSla = lastSla;
  // 一次性結算預算（夾到 ≥0）：破產時支出不再被逐步赦免，明細加總在未觸底時即等於淨額。
  patch.budget = Math.max(0, s.budget + cash);
  ledger.net = patch.budget - s.budget;
  patch.lastLedger = ledger;
  // 營運趨勢(#5):每次推進日累積一個 KPI 點(供趨勢圖 / 賽後復盤)
  patch.history = pushHistory(s.history ?? [], buildTrendPoint(ledger, {
    day,
    availability: patch.availability ?? s.availability,
    generationMWh: patch.generationMWh ?? s.generationMWh,
    fleetHealth: patch.fleetHealth ?? s.fleetHealth,
  }));
  return patch;
}

export type Action =
  | { type: "ACCEPT_QUEST" }
  | { type: "BUY"; partId: string; qty: number; cost: number; leadDays: number }
  | { type: "SELL"; partId: string; gain: number } // 賣出 1 件（#18）
  | { type: "FINISH_REPAIR"; quest: Quest; part?: string; discipline?: Discipline } // 維修完成 → 結算（A3）+ 消耗備品
  | { type: "START_OVERHAUL"; quest: Quest; part?: string; discipline?: Discipline } // 重大故障：拆檢完成後啟動多回合大修（#4）
  | { type: "ADVANCE_OVERHAUL" } // 推進大修一天（#4）：可作業窗 → 進度+1；惡劣海象 → 停滯+待命費
  | { type: "SERVICE_VESSEL"; cost: number } // 船舶進廠保養：歸零磨耗（#7）
  | { type: "SCHEDULED_SERVICE" } // 計畫性定期保養（#81）：到期可做 → 降故障率一段時間 + 回復健康度
  | { type: "BUY_DIAGNOSTICS"; cost: number } // 解鎖進階檢測（#scada）
  | { type: "DO_ROUTINE"; budget: number; xp: number } // 調度中心例行小任務（#21）
  | { type: "UPGRADE"; kind: "vessel" | "tech" | "tool"; cost: number } // 設施升級（A）
  | { type: "HIRE"; engineer: Engineer; cost: number } // 招募技師（#27）
  | { type: "FIRE"; id: string } // 解僱技師（出勤中不可解僱）
  | { type: "BUY_SOV"; cost: number } // 購置 SOV（#26，相容保留）
  | { type: "BUY_VESSEL"; id: VesselClass; cost: number } // 購置船型（#4）
  | { type: "SET_ACTIVE_VESSEL"; id: VesselClass } // 切換目前作業船（#4）
  | { type: "UNLOCK_FARM"; cost: number } // 拓展新風場（#34）
  | { type: "DEPART" } // 出航 → enroute（#25）
  | { type: "ARRIVE" } // 抵達 → onsite（#25）
  | { type: "FAIL_REPAIR" } // 天氣窗關閉、撤離（#17）
  | { type: "REPLAN_RETURN" } // 審慎返港再規劃：維修中途、作業窗吃緊時的安全決策（進 1 天、不計安全事件、工單保留）
  | { type: "RUSH_SOP"; incident: boolean } // 加班搶修(#rush)：剩餘 SOP 一次趕完、耗時減半;風險由 UI 擲骰後傳入(reducer 保持可測)
  | { type: "REST" } // 靠港休整：進日 + 重新擲海象（#18）
  | { type: "REMOTE_CHECK" } // 每日遠端 SCADA 巡檢（Phase A #2）：消耗 1 天、累積 XP、早期偵測微幅回復健康度
  | { type: "OPS_DISPATCH"; turbine: string; engineerId: string } // 戰情室派工：指派技師維修某故障機組（Phase C）
  | { type: "OPS_RESET"; turbine: string } // 戰情室遠端重啟：清除可重啟的軟性故障（免技師、較快）
  | { type: "OPS_INSPECT"; engineerId: string } // 戰情室預防性定檢（Phase C2）：派一組人巡檢，降低未來故障率
  | { type: "OPS_ADVANCE" } // 戰情室推進一天（Phase C）：並行工單前進、隨機新增故障
  | { type: "NEXT_QUEST"; poolSize: number } // 下一關（#20 主線推進）
  | { type: "RESTART_CAMPAIGN" } // 重玩戰役（#20）
  | { type: "BUILD_RESOLVE"; stage: number; choiceIdx: number } // 風場建置番外篇：階段決策（#1）
  | { type: "BUILD_RESET" } // 重玩番外篇（#1）
  | { type: "ASSIGN_QUEST"; quest: Quest } // 課程模式臨時指派（#6）
  | { type: "RESOLVE_TASK"; dAvail: number; dBudget: number; dSafety: number; dGen: number; dHealth: number; xp: number } // 自由營運沙盒任務結算
  | { type: "LOAD_STATE"; state: Partial<GameData> } // 雲端存檔載入（#31）
  | { type: "GRANT_FUNDS"; amount: number } // 測試加值：直接注資（沙盒/測試用，便於試玩各項採購）
  | { type: "SET_REPAIR"; repair: RepairState | null } // 更新/清空進行中的維修進度（#33 持久化）
  | { type: "ROLL_DAILY"; daily: DailyState } // 產生當日每日任務（#78，由 DailyTracker 於日推進時派發）
  | { type: "CLAIM_DAILY"; id: string; xp: number; cash: number } // 發放某每日任務獎勵（#78）
  | { type: "ROLL_WEEKLY"; weekly: WeeklyState } // 產生當週主題挑戰（#79，由 WeeklyTracker 於週推進時派發）
  | { type: "CLAIM_WEEKLY"; xp: number; cash: number } // 發放本週挑戰獎勵（#79）
  | { type: "RECORD_ANSWER"; keys: string[]; correct: boolean } // 記錄一次作答(知識點掌握度 #mastery)
  | { type: "RECORD_MISTAKE"; mk: Omit<Mistake, "id" | "reviewed" | "reflection"> } // 答錯→記入錯題本
  | { type: "REVIEW_MISTAKE"; id: string; reflection: string } // 複習錯題並寫反思
  | { type: "UPGRADE_PORT"; id: string; cost: number } // 母港建設升級(#port):扣預算、設施 +1 級
  | { type: "MARK_CASE_SEEN"; id: string; day?: number } // 案例演練完成→收錄進圖鑑案例檔(冪等)
  | { type: "RESET" };

export const TEST_GRANT = 50_000_000; // 一次測試加值金額 ◎（測試/沙盒用）

// ───────── 微觀天氣模型（#2）─────────
// 天氣有慣性（風暴成群出現）：用簡化的馬可夫轉移由前一日推算次日海象。
const SEA_ORDER: SeaState[] = ["workable", "caution", "closed"];
function nextSeaFrom(prev: SeaState): SeaState {
  const r = Math.random();
  switch (prev) {
    case "workable": return r < 0.62 ? "workable" : r < 0.9 ? "caution" : "closed";
    case "caution": return r < 0.42 ? "workable" : r < 0.8 ? "caution" : "closed";
    default /* closed */: return r < 0.22 ? "workable" : r < 0.62 ? "caution" : "closed";
  }
}
// 預報誤差：把預測值上/下移動一級（教學：預報不是百分百準確）
function jitterSea(s: SeaState): SeaState {
  const i = SEA_ORDER.indexOf(s);
  const dir = Math.random() < 0.5 ? -1 : 1;
  return SEA_ORDER[clampN(i + dir, 0, 2)];
}
// 由前一日海象產生未來 N 日預報
export function makeForecast(prev: SeaState, n = FORECAST_DAYS): SeaState[] {
  const out: SeaState[] = [];
  let cur = prev;
  for (let i = 0; i < n; i++) { cur = nextSeaFrom(cur); out.push(cur); }
  return out;
}
// 推進 days 天：每日「昨日預報」實現為今日海象（含 ~18% 預報誤差），並滾動補上新的尾日預報
function advanceWeather(today: SeaState, forecast: SeaState[], days: number): { seaState: SeaState; forecast: SeaState[] } {
  let cur = today;
  let fc = forecast.length ? [...forecast] : makeForecast(today);
  for (let d = 0; d < days; d++) {
    const predicted = fc[0] ?? nextSeaFrom(cur);
    cur = Math.random() < 0.18 ? jitterSea(predicted) : predicted;
    const rest = fc.slice(1);
    fc = [...rest, nextSeaFrom(rest[rest.length - 1] ?? cur)];
  }
  return { seaState: cur, forecast: fc };
}

export function reducer(s: GameData, a: Action): GameData {
  switch (a.type) {
    case "ACCEPT_QUEST":
      return { ...s, questStage: "active", repairDone: false, jobPhase: "office", repair: null };
    case "SET_REPAIR":
      return { ...s, repair: a.repair };
    case "HIRE": {
      if (a.cost > s.budget) return s;
      const adv = advance(s, 1); // 招募/上工訓練耗時 1 天（Phase B 統一時間成本）
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), engineers: [...(adv.engineers ?? s.engineers), a.engineer] };
    }
    case "FIRE": {
      if (engineerBusy(s.opsJobs, a.id)) return s; // 戰情室出勤中不可解僱
      if (!s.engineers.some((e) => e.id === a.id)) return s;
      return { ...s, engineers: s.engineers.filter((e) => e.id !== a.id) };
    }
    case "BUY_SOV": {
      if (a.cost > s.budget || s.ownsSOV) return s;
      const adv = advance(s, 2); // 購置/動員 SOV 耗時 2 天
      const owned = s.ownedVessels.includes("sov") ? s.ownedVessels : [...s.ownedVessels, "sov" as VesselClass];
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), ownsSOV: true, ownedVessels: owned, activeVessel: "sov" };
    }
    case "BUY_VESSEL": {
      const spec = VESSELS.find((v) => v.id === a.id);
      if (!spec || a.cost > s.budget || s.ownedVessels.includes(a.id)) return s;
      const adv = advance(s, Math.max(1, spec.mobilizeDays)); // 購置/動員就緒耗時
      const ownsSOV = s.ownsSOV || spec.seaTol >= 2; // 取得耐停航船型 → 標記可高海象出航
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), ownedVessels: [...s.ownedVessels, a.id], activeVessel: a.id, ownsSOV };
    }
    case "SET_ACTIVE_VESSEL": {
      if (!s.ownedVessels.includes(a.id)) return s; // 僅能切換已擁有船型
      return { ...s, activeVessel: a.id };
    }
    case "UNLOCK_FARM": {
      if (a.cost > s.budget || s.farmsOwned >= FARMS.length) return s;
      const adv = advance(s, 2); // 拓展/動員新風場耗時 2 天
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), farmsOwned: s.farmsOwned + 1, fleet: [...(adv.fleet ?? s.fleet), ...buildFleetForFarm(s.farmsOwned)] };
    }
    case "DEPART":
      // 出航累積船舶磨耗（#7）；磨耗率依目前作業船（#4）
      return { ...s, jobPhase: "enroute", vesselWear: clampN(s.vesselWear + vesselWearOf(s), 0, 100) };
    case "SERVICE_VESSEL": {
      if (a.cost > s.budget || s.vesselWear === 0) return s;
      const adv = advance(s, 1); // 進廠保養耗時 1 天
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), vesselWear: 0 };
    }
    case "SCHEDULED_SERVICE": {
      // 計畫性定期保養（#81）：到期才可做;費用 + 工期,換取一段時間降低故障率 + 健康度回復。
      if (!serviceDue(s) || SCHEDULED_SERVICE_COST > s.budget) return s;
      const adv = advance(s, SCHEDULED_SERVICE_DAYS);
      return {
        ...s,
        ...adv,
        budget: Math.max(0, (adv.budget ?? s.budget) - SCHEDULED_SERVICE_COST),
        inspectBuffDays: Math.max(adv.inspectBuffDays ?? s.inspectBuffDays, SCHEDULED_SERVICE_BUFF_DAYS),
        fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + SCHEDULED_SERVICE_HEALTH, 0, 100),
        lastServiceDay: s.day + SCHEDULED_SERVICE_DAYS,
      };
    }
    case "BUY_DIAGNOSTICS": {
      if (a.cost > s.budget || s.diagLevel > 0) return s;
      const adv = advance(s, 1); // 進階檢測建置耗時 1 天
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), diagLevel: 1 };
    }
    case "ARRIVE":
      return { ...s, jobPhase: "onsite" };
    case "FAIL_REPAIR": {
      // 被迫撤離(作業窗關閉才離場) = 安全近失事件（#34）+ 空耗 1 天 + 進度全失（Phase B）
      // 註:審慎的「返航改期/回港再規劃」走 REPLAN_RETURN(不計事件、保留進度) —— 安全的選擇不受懲罰。
      const adv = advance(s, 1);
      // 可用率不再用純量 −4：撤離本身不直接使機組故障；安全近失以 safetyIncidents 計入績效（#3）。
      return { ...s, ...adv, jobPhase: "office", safetyIncidents: s.safetyIncidents + 1, repair: null };
    }
    case "REPLAN_RETURN": {
      // 審慎返港再規劃：維修中途、作業窗吃緊時的安全決策。空耗 1 天，但「不計」安全事件（與 FAIL_REPAIR 撤離區隔）；
      // questStage 維持 active；已完成的診斷/SOP 步驟「保留」（工作交接紀錄，#carry）——擇日再出海只需重新登塔、
      // 重擲作業窗續修。被迫撤離（FAIL_REPAIR）則進度全失＋計安全事件 → 獎勵「及時止損」勝過「硬撐到窗關」。
      const adv = advance(s, 1);
      const kept = s.repair ? { ...s.repair, boarded: false, win: 0 } : null;
      return { ...s, ...adv, jobPhase: "office", repair: kept };
    }
    case "RUSH_SOP": {
      // 加班搶修(#rush)：已登塔、有剩餘步驟、窗未關才可趕工;一次完成剩餘 SOP、耗 rushCost 時段;
      // incident=true 時計 1 次安全近失事件（趕工的代價 —— 教「快」不等於「好」）。
      const rp = s.repair;
      if (!rp || !rp.boarded || rp.win <= 0) return s;
      const remaining = rp.steps.filter((v) => !v).length;
      if (remaining === 0) return s;
      const cost = rushCost(remaining, s.toolLevel);
      return {
        ...s,
        repair: { ...rp, steps: rp.steps.map(() => true), win: Math.max(0, rp.win - cost) },
        safetyIncidents: s.safetyIncidents + (a.incident ? 1 : 0),
      };
    }
    case "REST": {
      const adv = advance(s, 1);
      // 可用率由機隊重算（#3，adv 已設定）；休整僅回復技師疲勞與機組健康度。
      return { ...s, ...adv, fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + 1.5, 0, 100) };
    }
    case "REMOTE_CHECK": {
      // 遠端巡檢：不派船、消耗 1 天，早期偵測微幅回復健康度並累積經驗
      const adv = advance(s, 1);
      return { ...s, ...adv, xp: s.xp + 15, fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + 2, 0, 100) };
    }
    case "OPS_ADVANCE":
      // 戰情室推進一天（並行工單前進、隨機新增故障皆於 advance() 內處理）
      return { ...s, ...advance(s, 1) };
    case "OPS_DISPATCH": {
      const tb = s.fleet.find((x) => x.id === a.turbine);
      if (!tb || tb.status !== "fault") return s;
      const eng = s.engineers.find((e) => e.id === a.engineerId);
      if (!eng) return s;
      const inc = incidentAt(tb.faultId);
      if (!inc || eng.discipline !== inc.discipline) return s; // 需對應科別技師
      if (fatigueOf(eng) >= FATIGUE_LIMIT) return s; // 過勞不可派
      if (engineerBusy(s.opsJobs, eng.id)) return s; // 該技師已在執行工單
      if (onsiteJobCount(s.opsJobs) >= jobCapOf(s)) return s; // 船舶現場工單已達上限（依目前作業船，#4）
      if (SEA_INDEX[s.seaState] > seaTolOf(s)) return s; // 海象超過目前作業船耐受度，無法派船（可改遠端重啟或等天氣窗）
      if ((s.inventory[inc.part] ?? 0) <= 0) return s; // 缺必備備品，無法現場維修（接上真實備品價格）
      const inv = { ...s.inventory, [inc.part]: (s.inventory[inc.part] ?? 0) - 1 };
      const fleet = s.fleet.map((x) => (x.id === tb.id ? { ...x, status: "repair" as TurbineStatus } : x));
      const job: OpsJob = { id: "job_" + Math.random().toString(36).slice(2, 9), turbine: tb.id, engineerId: eng.id, discipline: eng.discipline, daysLeft: inc.repairDays };
      // 出海動員費：僅當「目前沒有船在海上」時收（同一趟出海可同時派多台維修 → 分攤成本，鼓勵批次）；費用與磨耗依目前作業船
      const newSortie = onsiteJobCount(s.opsJobs) === 0;
      return { ...s, fleet, opsJobs: [...s.opsJobs, job], inventory: inv, cargoUsed: Math.max(0, s.cargoUsed - 1), budget: newSortie ? Math.max(0, s.budget - sortieCostOf(s)) : s.budget, vesselWear: newSortie ? clampN(s.vesselWear + vesselWearOf(s), 0, 100) : s.vesselWear };
    }
    case "OPS_RESET": {
      const tb = s.fleet.find((x) => x.id === a.turbine);
      if (!tb || tb.status !== "fault") return s;
      const inc = incidentAt(tb.faultId);
      if (!inc || !inc.resettable) return s; // 僅軟性故障可遠端重啟
      const fleet = s.fleet.map((x) => (x.id === tb.id ? { ...x, status: "repair" as TurbineStatus } : x));
      const job: OpsJob = { id: "rst_" + Math.random().toString(36).slice(2, 9), turbine: tb.id, engineerId: "__remote__", discipline: inc.discipline, daysLeft: REMOTE_RESET_DAYS, remote: true };
      return { ...s, fleet, opsJobs: [...s.opsJobs, job] };
    }
    case "OPS_INSPECT": {
      const eng = s.engineers.find((e) => e.id === a.engineerId);
      if (!eng) return s;
      if (fatigueOf(eng) >= FATIGUE_LIMIT) return s; // 過勞不可派
      if (engineerBusy(s.opsJobs, eng.id)) return s; // 已在執行工單
      if (onsiteJobCount(s.opsJobs) >= jobCapOf(s)) return s; // 船舶現場工單上限（依目前作業船，#4）
      if (SEA_INDEX[s.seaState] > seaTolOf(s)) return s; // 海象超過目前作業船耐受度，無法派船
      const job: OpsJob = { id: "ins_" + Math.random().toString(36).slice(2, 9), turbine: "__sweep__", engineerId: eng.id, discipline: eng.discipline, daysLeft: INSPECT_DAYS, kind: "inspect" };
      const newSortie = onsiteJobCount(s.opsJobs) === 0; // 定檢也算一趟出海
      return { ...s, opsJobs: [...s.opsJobs, job], budget: newSortie ? Math.max(0, s.budget - sortieCostOf(s)) : s.budget, vesselWear: newSortie ? clampN(s.vesselWear + vesselWearOf(s), 0, 100) : s.vesselWear };
    }
    case "BUY": {
      if (a.cost > s.budget) return s;
      if (a.leadDays > 0) {
        // 在途訂單：N 天後到貨
        return { ...s, budget: s.budget - a.cost, pendingOrders: [...s.pendingOrders, { partId: a.partId, arriveDay: s.day + a.leadDays, qty: a.qty }] };
      }
      const inv = { ...s.inventory, [a.partId]: (s.inventory[a.partId] ?? 0) + a.qty };
      return { ...s, budget: s.budget - a.cost, inventory: inv, cargoUsed: Math.min(s.cargoCap, s.cargoUsed + a.qty) };
    }
    case "SELL": {
      const have = s.inventory[a.partId] ?? 0;
      if (have <= 0) return s;
      return { ...s, budget: s.budget + a.gain, inventory: { ...s.inventory, [a.partId]: have - 1 }, cargoUsed: Math.max(0, s.cargoUsed - 1) };
    }
    case "FINISH_REPAIR": {
      if (s.questStage !== "active") return s;
      const adv = advance(s, 1); // 一趟出勤維修耗時 1 天（Phase B）
      const inv = { ...(adv.inventory ?? s.inventory) };
      let cargo = adv.cargoUsed ?? s.cargoUsed;
      if (a.part && (inv[a.part] ?? 0) > 0) {
        inv[a.part] = (inv[a.part] ?? 0) - 1; // 消耗 1 件必備備品
        cargo = Math.max(0, cargo - 1);
      }
      const seen = s.seenFaults.includes(a.quest.targetFault) ? s.seenFaults : [...s.seenFaults, a.quest.targetFault];
      const engs = a.discipline ? deployFatigue(adv.engineers ?? s.engineers, a.discipline) : (adv.engineers ?? s.engineers); // 出勤技師累積疲勞（#7）
      // 可用率改由機隊單一來源決定（#3）：完工獎勵維持 budget/xp/健康度/任務數；機隊妥善率回升須在戰情室實際修復機組。
      return { ...s, ...adv, repairDone: true, questStage: "done", jobPhase: "office", repair: null, budget: (adv.budget ?? s.budget) + a.quest.rewardBudget, xp: s.xp + a.quest.rewardXp, fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + 8, 0, 100), inventory: inv, cargoUsed: cargo, seenFaults: seen, missionsDone: s.missionsDone + 1, engineers: engs };
    }
    case "START_OVERHAUL": {
      if (s.questStage !== "active" || s.overhaul) return s;
      const inv = { ...s.inventory };
      let cargo = s.cargoUsed;
      if (a.part && (inv[a.part] ?? 0) > 0) {
        inv[a.part] = (inv[a.part] ?? 0) - 1; // 拆檢即消耗必備備品（大組件）
        cargo = Math.max(0, cargo - 1);
      }
      // 安裝船(jack-up)動員（#81）：拆檢確認需大組件更換 → 預收一次性動員費,並進入數日動員/航行前置期。
      return {
        ...s,
        jobPhase: "office",
        repair: null,
        inventory: inv,
        cargoUsed: cargo,
        budget: Math.max(0, s.budget - JACKUP_MOBILIZE_COST),
        overhaul: { questId: a.quest.id, unit: a.quest.unit, fault: a.quest.targetFault, discipline: a.discipline ?? "mechanical", progress: 0, need: OVERHAUL_NEED, demurrageDays: 0, rewardBudget: a.quest.rewardBudget, rewardXp: a.quest.rewardXp, mobilizeLeft: JACKUP_MOBILIZE_DAYS },
      };
    }
    case "ADVANCE_OVERHAUL": {
      if (!s.overhaul) return s;
      const oh = s.overhaul;
      // 動員/航行期間：安裝船尚未到場 → 僅推進日期(不收待命費、不推進工日)，倒數動員天數。
      if ((oh.mobilizeLeft ?? 0) > 0) {
        const adv = advance(s, 1);
        return { ...s, ...adv, overhaul: { ...oh, mobilizeLeft: (oh.mobilizeLeft ?? 0) - 1 } };
      }
      const adv = advance(s, 1); // 天氣/天數推進、停機成本、健康度、SLA 累計
      const sea = (adv.seaState ?? s.seaState) as SeaState;
      if (sea === "workable") {
        const workedEngs = deployFatigue(adv.engineers ?? s.engineers, oh.discipline); // 大修工日累積疲勞（#7）
        const progress = oh.progress + 1;
        if (progress >= oh.need) {
          const seen = s.seenFaults.includes(oh.fault) ? s.seenFaults : [...s.seenFaults, oh.fault];
          return {
            ...s,
            ...adv,
            overhaul: null,
            repairDone: true,
            questStage: "done",
            jobPhase: "office",
            budget: (adv.budget ?? s.budget) + oh.rewardBudget,
            xp: s.xp + oh.rewardXp,
            // 可用率由機隊單一來源決定（#3）；大修獎勵維持 budget/xp/健康度。
            fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + 12, 0, 100),
            seenFaults: seen,
            missionsDone: s.missionsDone + 1,
            engineers: workedEngs,
          };
        }
        return { ...s, ...adv, overhaul: { ...oh, progress }, engineers: workedEngs };
      }
      // 惡劣海象：大修停滯（進度不前），待命費已於 advance() 計入；累計停滯天數供顯示
      return { ...s, ...adv, overhaul: { ...oh, demurrageDays: oh.demurrageDays + 1 } };
    }
    case "DO_ROUTINE": {
      const adv = advance(s, 1);
      // 可用率由機隊重算（#3）；例行作業給予 budget/xp/任務數。
      return { ...s, ...adv, budget: (adv.budget ?? s.budget) + a.budget, xp: s.xp + a.xp, missionsDone: s.missionsDone + 1 };
    }
    case "UPGRADE": {
      if (a.cost > s.budget) return s;
      const adv = advance(s, 1); // 設施升級/訓練耗時 1 天（Phase B）
      const patch =
        a.kind === "vessel" ? { vesselLevel: s.vesselLevel + 1 } : a.kind === "tech" ? { techLevel: s.techLevel + 1, techTotal: s.techTotal + 2 } : { toolLevel: s.toolLevel + 1 };
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), ...patch };
    }
    case "NEXT_QUEST": {
      if (s.questStage !== "done") return s;
      const last = a.poolSize - 1;
      if (s.campaignIndex >= last) return { ...s, campaignDone: true, customQuest: null };
      return { ...s, ...advance(s, 1), customQuest: null, campaignIndex: s.campaignIndex + 1, questStage: "available", repairDone: false, jobPhase: "office", repair: null };
    }
    case "RESTART_CAMPAIGN":
      return { ...s, campaignIndex: 0, campaignDone: false, customQuest: null, questStage: "available", repairDone: false, jobPhase: "office", repair: null };
    case "BUILD_RESOLVE": {
      // 風場建置番外篇（#1）：僅能決策「目前階段」、完工後不再受理
      if (s.buildDone || a.stage !== s.buildStage) return s;
      const stage = BUILD_STAGES[s.buildStage];
      const choice = stage?.choices[a.choiceIdx];
      if (!stage || !choice) return s;
      const adv = advance(s, Math.max(1, choice.days)); // 工期推進（含天氣/經濟/隨機故障）
      const budget = Math.max(0, (adv.budget ?? s.budget) - choice.cost);
      const buildStage = s.buildStage + 1;
      const buildScore = s.buildScore + choice.score;
      const done = buildStage >= BUILD_STAGE_COUNT;
      // 完工獎勵：基礎 + 依品質分加成（最低 0）、經驗值
      const reward = done ? BUILD_REWARD_BASE + Math.max(0, buildScore) * BUILD_REWARD_PER_SCORE : 0;
      return { ...s, ...adv, budget: budget + reward, xp: s.xp + (done ? BUILD_REWARD_XP : 0), buildStage, buildScore, buildDone: done };
    }
    case "BUILD_RESET":
      return { ...s, buildStage: 0, buildScore: 0, buildDone: false };
    case "ASSIGN_QUEST":
      return { ...s, customQuest: a.quest, questStage: "available", repairDone: false, jobPhase: "office", repair: null };
    case "RESOLVE_TASK": {
      // 自由營運沙盒：推進一天（含突發事件）後套用選擇效果，計入績效（沙盒，衝排行）
      const adv = advance(s, 1);
      // 可用率效果（dAvail）改以真實機組故障/修復實作（#3 單一真實來源）→ 同步反映在發電、SLA、績效。
      const taskFleet = applyAvailDelta(adv.fleet ?? s.fleet, a.dAvail);
      return {
        ...s,
        ...adv,
        fleet: taskFleet,
        availability: fleetUptime(taskFleet),
        budget: Math.max(0, (adv.budget ?? s.budget) + a.dBudget),
        generationMWh: Math.max(0, (adv.generationMWh ?? s.generationMWh) + a.dGen),
        safetyIncidents: s.safetyIncidents + a.dSafety,
        fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + a.dHealth, 0, 100),
        xp: s.xp + a.xp,
        missionsDone: s.missionsDone + 1,
      };
    }
    case "ROLL_DAILY":
      return { ...s, daily: a.daily };
    case "CLAIM_DAILY": {
      const dl = s.daily;
      if (!dl || dl.claimed.includes(a.id) || !dl.ids.includes(a.id)) return s; // 無效/重複發獎 → 忽略(冪等)
      const claimed = [...dl.claimed, a.id];
      const wasFull = dl.claimed.length >= dl.ids.length;
      const nowFull = claimed.length >= dl.ids.length;
      const streak = nowFull && !wasFull ? dl.streak + 1 : dl.streak; // 全部完成 → 連勝 +1
      return { ...s, budget: s.budget + Math.max(0, a.cash), xp: s.xp + Math.max(0, a.xp), daily: { ...dl, claimed, streak } };
    }
    case "ROLL_WEEKLY":
      return { ...s, weekly: a.weekly };
    case "CLAIM_WEEKLY": {
      const wk = s.weekly;
      if (!wk || wk.claimed) return s; // 已領 → 忽略(冪等)
      return { ...s, budget: s.budget + Math.max(0, a.cash), xp: s.xp + Math.max(0, a.xp), weekly: { ...wk, claimed: true, streak: wk.streak + 1 } };
    }
    case "RECORD_ANSWER": {
      // 連對 streak(#streak):首次作答連續答對 → 小額 XP 加成(每次 = streak×2,上限 10),答錯歸零。
      const streak = a.correct ? (s.answerStreak ?? 0) + 1 : 0;
      const bonus = a.correct ? Math.min(streak * 2, 10) : 0;
      return { ...s, mastery: recordAnswer(s.mastery ?? {}, a.keys, a.correct), answerStreak: streak, xp: s.xp + bonus };
    }
    case "RECORD_MISTAKE": {
      const id = `${a.mk.day}_${(s.mistakes ?? []).length}`;
      return { ...s, mistakes: addMistake(s.mistakes ?? [], { ...a.mk, id }) };
    }
    case "REVIEW_MISTAKE":
      return { ...s, mistakes: reviewMistake(s.mistakes ?? [], a.id, a.reflection) };
    case "UPGRADE_PORT": {
      const u = s.portUpgrades ?? {};
      const f = portFacility(a.id);
      const lv = u[a.id] ?? 0;
      if (!f || lv >= f.max || s.budget < a.cost) return s; // 守門:設施存在、未滿級、預算足夠
      return { ...s, budget: s.budget - a.cost, portUpgrades: { ...u, [a.id]: lv + 1 } };
    }
    case "MARK_CASE_SEEN": {
      const seen = s.seenCases.includes(a.id) ? s.seenCases : [...s.seenCases, a.id];
      return { ...s, seenCases: seen, lastCase: { id: a.id, day: a.day ?? s.day } };
    }
    case "GRANT_FUNDS":
      return { ...s, budget: s.budget + Math.max(0, a.amount) };
    case "LOAD_STATE":
      return migrateSave(a.state);
    case "RESET":
      return { ...INITIAL };
    default:
      return s;
  }
}

// 頂部列預算顯示（◎ → 萬）
export const toWan = (n: number) => Math.round(n / 10000).toLocaleString();
