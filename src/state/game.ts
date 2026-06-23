import type { I18n } from "../game/systems/types";
import { FARMS } from "./farms";
import { rollEvent, type EventStamp } from "./events";
import { incidentAt, randomIncidentId } from "./incidents";

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

// 依擁有風場建立機組陣列（每座 farm.units 台，發電佔比 = genPerDay/units）
export function buildFleetForFarm(f: number): Turbine[] {
  const farm = FARMS[f];
  if (!farm) return [];
  const share = Math.round((farm.genPerDay / farm.units) * 10) / 10;
  return Array.from({ length: farm.units }, (_, i) => ({ id: `${farm.code}${String(i + 1).padStart(2, "0")}`, farm: f, status: "ok" as TurbineStatus, gen: share }));
}
export function buildFleet(farmsOwned: number): Turbine[] {
  let out: Turbine[] = [];
  for (let f = 0; f < Math.min(farmsOwned, FARMS.length); f++) out = out.concat(buildFleetForFarm(f));
  // 開局植入數台故障，讓戰情室一開始就有事件可處理
  for (let k = 0; k < FLEET_INIT_FAULTS && k < out.length; k++) {
    const i = Math.floor((out.length / FLEET_INIT_FAULTS) * k) + k;
    if (out[i]) out[i] = { ...out[i], status: "fault", faultId: randomIncidentId() };
  }
  return out;
}
export const fleetUptime = (fleet: Turbine[]): number => (fleet.length ? Math.round((fleet.filter((t) => t.status === "ok").length / fleet.length) * 100) : 100);
export const engineerBusy = (jobs: OpsJob[], id: string): boolean => jobs.some((j) => j.engineerId === id);

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

export interface GameData {
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
  ownsSOV: boolean; // 是否擁有 SOV（#26，可在高海象出航）
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

export const OVERHAUL_NEED = 3; // 大修所需的可作業工日（#4）
export const DEMURRAGE_PER_DAY = 400_000; // 大修因惡劣海象停滯的船舶待命費／日（#4）
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

// 多風場每日基準發電總和（owned 座風場的 genPerDay 加總）
function ownedFarmGen(farmsOwned: number): number {
  let g = 0;
  for (let i = 0; i < Math.min(farmsOwned, FARMS.length); i++) g += FARMS[i].genPerDay;
  return g;
}

// 綜合績效分（單一真實來源，#28/#34/#3/Phase C）：
// 綜合績效分：發電量(已為淨值，停機損失已於 advance 折抵) + 可用率×5 + 完成任務×30 − 安全×20 + 風場×10 − SLA違約×25 + 戰情室修復×8
export function computeScore(d: GameData): number {
  return Math.max(0, d.generationMWh + d.availability * 5 + d.missionsDone * 30 - d.safetyIncidents * 20 + d.farmsOwned * 10 - (d.slaPenalties ?? 0) * 25 + (d.fleetResolved ?? 0) * 8);
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

export const INITIAL: GameData = {
  budget: 84_200_000,
  xp: 0,
  day: 21,
  techAvail: 24,
  techTotal: 30,
  availability: 86,
  seaState: "workable",
  questStage: "available",
  questIndex: 0,
  campaignIndex: 0,
  campaignDone: false,
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
  fleet: buildFleet(1),
  opsJobs: [],
  fleetLostMWh: 0,
  fleetResolved: 0,
  inspectBuffDays: 0,
};

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// 推進 N 天：交付到貨備品 + 扣停機成本 + 多風場發電 + 人力回復 + 突發事件（C / #34）
function advance(s: GameData, days = 1): Partial<GameData> {
  const day = s.day + days;
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
  // 售電收入改由「實際運轉的機組」計算（見下方機隊推進後加計），此處先扣固定支出。
  let patch: Partial<GameData> = {
    day,
    pendingOrders: pend,
    inventory: inv,
    cargoUsed: cargo,
    lastSpoil,
    budget: Math.max(0, s.budget - downtime - storage - payroll),
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
  if (s.overhaul) patch.budget = Math.max(0, (patch.budget ?? s.budget) - DEMURRAGE_PER_DAY * days);
  // 健康度越低 → 突發事件機率越高、且偏向壞事件（連鎖故障）
  const riskBoost = ((100 - health) / 100) * 0.4;
  const ev = rollEvent(riskBoost, health);
  if (ev) {
    const evPatch = ev.apply({ ...s, ...patch } as GameData);
    patch = { ...patch, ...evPatch, lastEvent: { id: ev.id, name: ev.name, desc: ev.desc, good: !!ev.good, day } };
  }
  // 活體戰情層（Phase C）：每日推進並行工單、隨機新增故障、累計停機發電損失
  if (s.fleet.length) {
    let fleet = s.fleet.map((tt) => ({ ...tt }));
    let jobs = s.opsJobs.map((j) => ({ ...j }));
    let resolved = s.fleetResolved;
    let engs = patch.engineers ?? s.engineers;
    let fixPay = 0;
    let buffDays = s.inspectBuffDays; // 預防性定檢生效天數（Phase C2）
    let healthBoost = 0;
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
      const faultProb = Math.min(0.4, FAULT_RATE_BASE + ((100 - health) / 100) * 0.15) * (buffDays > 0 ? INSPECT_FAULT_MULT : 1) * okFrac;
      if (oks.length && Math.random() < faultProb) {
        const pick = oks[Math.floor(Math.random() * oks.length)];
        const fi = fleet.findIndex((t) => t.id === pick.id);
        fleet[fi] = { ...fleet[fi], status: "fault", faultId: randomIncidentId() };
      }
      if (buffDays > 0) buffDays -= 1;
    }
    patch.inspectBuffDays = buffDays;
    if (healthBoost) patch.fleetHealth = clampN((patch.fleetHealth ?? s.fleetHealth) + healthBoost, 0, 100);
    // 實際運轉發電（售電收入主體）與停機損失（KPI）：以推進後的機組狀態 × 天數估算
    const produced = Math.round(fleet.filter((t) => t.status === "ok").reduce((a, t) => a + t.gen, 0) * days);
    const lost = Math.round(fleet.filter((t) => t.status !== "ok").reduce((a, t) => a + t.gen, 0) * days);
    patch.fleet = fleet;
    patch.opsJobs = jobs;
    patch.fleetResolved = resolved;
    patch.fleetLostMWh = s.fleetLostMWh + lost;
    patch.engineers = engs;
    if (fixPay > 0) patch.budget = Math.max(0, (patch.budget ?? s.budget) + fixPay);
    // 售電收入 = 實際運轉發電 × 單價（只計運轉中的機組，不再用「可用率上限再扣停機」的減法 → 不會重複計到歸零）。
    patch.budget = Math.max(0, (patch.budget ?? s.budget) + produced * ELECTRICITY_PRICE);
    patch.generationMWh = (patch.generationMWh ?? s.generationMWh) + produced;
  } else {
    // 無機組模型（理論上不會發生）：退回以可用率估算發電與售電
    const avail = patch.availability ?? s.availability;
    const produced = Math.round((avail / 100) * ownedFarmGen(s.farmsOwned) * days);
    patch.budget = Math.max(0, (patch.budget ?? s.budget) + produced * ELECTRICITY_PRICE);
    patch.generationMWh = (patch.generationMWh ?? s.generationMWh) + produced;
  }
  // 合約 SLA（#3）：每日累計可用率，跨季結算；平均低於底線 → 扣違約金
  const avail = patch.availability ?? s.availability;
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
    patch.budget = Math.max(0, (patch.budget ?? s.budget) - penalty);
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
  | { type: "BUY_DIAGNOSTICS"; cost: number } // 解鎖進階檢測（#scada）
  | { type: "DO_ROUTINE"; budget: number; xp: number } // 調度中心例行小任務（#21）
  | { type: "UPGRADE"; kind: "vessel" | "tech" | "tool"; cost: number } // 設施升級（A）
  | { type: "HIRE"; engineer: Engineer; cost: number } // 招募技師（#27）
  | { type: "FIRE"; id: string } // 解僱技師（出勤中不可解僱）
  | { type: "BUY_SOV"; cost: number } // 購置 SOV（#26）
  | { type: "UNLOCK_FARM"; cost: number } // 拓展新風場（#34）
  | { type: "DEPART" } // 出航 → enroute（#25）
  | { type: "ARRIVE" } // 抵達 → onsite（#25）
  | { type: "FAIL_REPAIR" } // 天氣窗關閉、撤離（#17）
  | { type: "REST" } // 靠港休整：進日 + 重新擲海象（#18）
  | { type: "REMOTE_CHECK" } // 每日遠端 SCADA 巡檢（Phase A #2）：消耗 1 天、累積 XP、早期偵測微幅回復健康度
  | { type: "OPS_DISPATCH"; turbine: string; engineerId: string } // 戰情室派工：指派技師維修某故障機組（Phase C）
  | { type: "OPS_RESET"; turbine: string } // 戰情室遠端重啟：清除可重啟的軟性故障（免技師、較快）
  | { type: "OPS_INSPECT"; engineerId: string } // 戰情室預防性定檢（Phase C2）：派一組人巡檢，降低未來故障率
  | { type: "OPS_ADVANCE" } // 戰情室推進一天（Phase C）：並行工單前進、隨機新增故障
  | { type: "NEXT_QUEST"; poolSize: number } // 下一關（#20 主線推進）
  | { type: "RESTART_CAMPAIGN" } // 重玩戰役（#20）
  | { type: "ASSIGN_QUEST"; quest: Quest } // 課程模式臨時指派（#6）
  | { type: "RESOLVE_TASK"; dAvail: number; dBudget: number; dSafety: number; dGen: number; dHealth: number; xp: number } // 自由營運沙盒任務結算
  | { type: "LOAD_STATE"; state: Partial<GameData> } // 雲端存檔載入（#31）
  | { type: "GRANT_FUNDS"; amount: number } // 測試加值：直接注資（沙盒/測試用，便於試玩各項採購）
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
      return { ...s, questStage: "active", repairDone: false, jobPhase: "office" };
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
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), ownsSOV: true };
    }
    case "UNLOCK_FARM": {
      if (a.cost > s.budget || s.farmsOwned >= FARMS.length) return s;
      const adv = advance(s, 2); // 拓展/動員新風場耗時 2 天
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), farmsOwned: s.farmsOwned + 1, fleet: [...(adv.fleet ?? s.fleet), ...buildFleetForFarm(s.farmsOwned)] };
    }
    case "DEPART":
      // 出航累積船舶磨耗（#7）
      return { ...s, jobPhase: "enroute", vesselWear: clampN(s.vesselWear + VESSEL_WEAR_PER_SORTIE, 0, 100) };
    case "SERVICE_VESSEL": {
      if (a.cost > s.budget || s.vesselWear === 0) return s;
      const adv = advance(s, 1); // 進廠保養耗時 1 天
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), vesselWear: 0 };
    }
    case "BUY_DIAGNOSTICS": {
      if (a.cost > s.budget || s.diagLevel > 0) return s;
      const adv = advance(s, 1); // 進階檢測建置耗時 1 天
      return { ...s, ...adv, budget: Math.max(0, (adv.budget ?? s.budget) - a.cost), diagLevel: 1 };
    }
    case "ARRIVE":
      return { ...s, jobPhase: "onsite" };
    case "FAIL_REPAIR": {
      // 撤離/返航改期 = 安全近失事件（#34）+ 空耗 1 天（Phase B）
      const adv = advance(s, 1);
      return { ...s, ...adv, jobPhase: "office", availability: Math.max(0, (adv.availability ?? s.availability) - 4), safetyIncidents: s.safetyIncidents + 1 };
    }
    case "REST": {
      const adv = advance(s, 1);
      // 基於 advance 後的值（保留當日事件對可用率/健康度的影響）再加休整回復
      return { ...s, ...adv, availability: Math.min(100, (adv.availability ?? s.availability) + 1), fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + 1.5, 0, 100) };
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
      if (onsiteJobCount(s.opsJobs) >= vesselJobCap(s.ownsSOV, s.vesselLevel)) return s; // 船舶現場工單已達上限（#7/C2）
      if (SEA_INDEX[s.seaState] > vesselSeaTol(s.ownsSOV)) return s; // 海象過劣，無法派船（可改遠端重啟或等天氣窗）
      if ((s.inventory[inc.part] ?? 0) <= 0) return s; // 缺必備備品，無法現場維修（接上真實備品價格）
      const inv = { ...s.inventory, [inc.part]: (s.inventory[inc.part] ?? 0) - 1 };
      const fleet = s.fleet.map((x) => (x.id === tb.id ? { ...x, status: "repair" as TurbineStatus } : x));
      const job: OpsJob = { id: "job_" + Math.random().toString(36).slice(2, 9), turbine: tb.id, engineerId: eng.id, discipline: eng.discipline, daysLeft: inc.repairDays };
      // 出海動員費：僅當「目前沒有船在海上」時收（同一趟出海可同時派多台維修 → 分攤成本，鼓勵批次）
      const newSortie = onsiteJobCount(s.opsJobs) === 0;
      return { ...s, fleet, opsJobs: [...s.opsJobs, job], inventory: inv, cargoUsed: Math.max(0, s.cargoUsed - 1), budget: newSortie ? Math.max(0, s.budget - SORTIE_COST) : s.budget, vesselWear: newSortie ? clampN(s.vesselWear + VESSEL_WEAR_PER_SORTIE, 0, 100) : s.vesselWear };
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
      if (onsiteJobCount(s.opsJobs) >= vesselJobCap(s.ownsSOV, s.vesselLevel)) return s; // 船舶現場工單上限
      if (SEA_INDEX[s.seaState] > vesselSeaTol(s.ownsSOV)) return s; // 海象過劣無法派船
      const job: OpsJob = { id: "ins_" + Math.random().toString(36).slice(2, 9), turbine: "__sweep__", engineerId: eng.id, discipline: eng.discipline, daysLeft: INSPECT_DAYS, kind: "inspect" };
      const newSortie = onsiteJobCount(s.opsJobs) === 0; // 定檢也算一趟出海
      return { ...s, opsJobs: [...s.opsJobs, job], budget: newSortie ? Math.max(0, s.budget - SORTIE_COST) : s.budget, vesselWear: newSortie ? clampN(s.vesselWear + VESSEL_WEAR_PER_SORTIE, 0, 100) : s.vesselWear };
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
      return { ...s, ...adv, repairDone: true, questStage: "done", jobPhase: "office", budget: (adv.budget ?? s.budget) + a.quest.rewardBudget, xp: s.xp + a.quest.rewardXp, availability: Math.min(100, (adv.availability ?? s.availability) + 8 + s.techLevel * 2), fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + 8, 0, 100), inventory: inv, cargoUsed: cargo, seenFaults: seen, missionsDone: s.missionsDone + 1, engineers: engs };
    }
    case "START_OVERHAUL": {
      if (s.questStage !== "active" || s.overhaul) return s;
      const inv = { ...s.inventory };
      let cargo = s.cargoUsed;
      if (a.part && (inv[a.part] ?? 0) > 0) {
        inv[a.part] = (inv[a.part] ?? 0) - 1; // 拆檢即消耗必備備品（大組件）
        cargo = Math.max(0, cargo - 1);
      }
      return {
        ...s,
        jobPhase: "office",
        inventory: inv,
        cargoUsed: cargo,
        overhaul: { questId: a.quest.id, unit: a.quest.unit, fault: a.quest.targetFault, discipline: a.discipline ?? "mechanical", progress: 0, need: OVERHAUL_NEED, demurrageDays: 0, rewardBudget: a.quest.rewardBudget, rewardXp: a.quest.rewardXp },
      };
    }
    case "ADVANCE_OVERHAUL": {
      if (!s.overhaul) return s;
      const adv = advance(s, 1); // 天氣/天數推進、停機成本、健康度、SLA 累計
      const sea = (adv.seaState ?? s.seaState) as SeaState;
      const oh = s.overhaul;
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
            availability: Math.min(100, (adv.availability ?? s.availability) + 10 + s.techLevel * 2),
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
      return { ...s, ...adv, budget: (adv.budget ?? s.budget) + a.budget, xp: s.xp + a.xp, availability: Math.min(100, (adv.availability ?? s.availability) + 1), missionsDone: s.missionsDone + 1 };
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
      return { ...s, ...advance(s, 1), customQuest: null, campaignIndex: s.campaignIndex + 1, questStage: "available", repairDone: false, jobPhase: "office" };
    }
    case "RESTART_CAMPAIGN":
      return { ...s, campaignIndex: 0, campaignDone: false, customQuest: null, questStage: "available", repairDone: false, jobPhase: "office" };
    case "ASSIGN_QUEST":
      return { ...s, customQuest: a.quest, questStage: "available", repairDone: false, jobPhase: "office" };
    case "RESOLVE_TASK": {
      // 自由營運沙盒：推進一天（含突發事件）後套用選擇效果，計入績效（沙盒，衝排行）
      const adv = advance(s, 1);
      return {
        ...s,
        ...adv,
        availability: Math.max(0, Math.min(100, (adv.availability ?? s.availability) + a.dAvail)),
        budget: Math.max(0, (adv.budget ?? s.budget) + a.dBudget),
        generationMWh: Math.max(0, (adv.generationMWh ?? s.generationMWh) + a.dGen),
        safetyIncidents: s.safetyIncidents + a.dSafety,
        fleetHealth: clampN((adv.fleetHealth ?? s.fleetHealth) + a.dHealth, 0, 100),
        xp: s.xp + a.xp,
        missionsDone: s.missionsDone + 1,
      };
    }
    case "GRANT_FUNDS":
      return { ...s, budget: s.budget + Math.max(0, a.amount) };
    case "LOAD_STATE":
      return { ...INITIAL, ...a.state };
    case "RESET":
      return { ...INITIAL };
    default:
      return s;
  }
}

// 頂部列預算顯示（◎ → 萬）
export const toWan = (n: number) => Math.round(n / 10000).toLocaleString();
