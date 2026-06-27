// 營運趨勢 / 賽後復盤(#5):把每次「推進日」的當日 KPI 累積成歷史時間序列,
// 供趨勢圖與通關/每週總結(復盤)使用。純資料/純函式集中於此,便於測試。
import type { Ledger } from "./game";

export const HISTORY_CAP = 200; // 歷史點上限(環狀,超過丟最舊)→ 控制存檔大小

export interface TrendPoint {
  day: number; // 推進後的絕對天數
  avail: number; // 當日機隊妥善率 %
  gen: number; // 累積發電量 MWh(畫累積曲線用)
  health: number; // 機組健康度 %
  revenue: number; // 當日收入(售電 + 戰情室修復報酬)◎
  opex: number; // 當日營運支出(薪資+倉儲+停機+待命+SLA 違約)◎,正值
  net: number; // 當日淨額 ◎(帶號)
}

// 從莉莉財報(Ledger)+ 當日快照組一個趨勢點(純函式)。
// Ledger 中支出項以負值儲存,opex 取其絕對總和為正。
export function buildTrendPoint(ledger: Ledger, snap: { day: number; availability: number; generationMWh: number; fleetHealth: number }): TrendPoint {
  const opex = -((ledger.payroll || 0) + (ledger.storage || 0) + (ledger.downtime || 0) + (ledger.demurrage || 0) + (ledger.slaPenalty || 0));
  const revenue = (ledger.revenue || 0) + Math.max(0, ledger.fixPay || 0);
  return {
    day: snap.day,
    avail: Math.round(snap.availability),
    gen: Math.round(snap.generationMWh),
    health: Math.round(snap.fleetHealth),
    revenue: Math.round(revenue),
    opex: Math.round(Math.max(0, opex)),
    net: Math.round(ledger.net || 0),
  };
}

// 追加一點並維持上限(純函式)。
export function pushHistory(history: TrendPoint[], point: TrendPoint): TrendPoint[] {
  const h = history ? [...history, point] : [point];
  return h.length > HISTORY_CAP ? h.slice(h.length - HISTORY_CAP) : h;
}

export interface TrendSummary {
  n: number; // 點數
  fromDay: number;
  toDay: number;
  days: number; // 涵蓋天數
  avgAvail: number; // 平均妥善率 %
  minAvail: number; // 最低妥善率 %
  totalRevenue: number; // 期間總收入 ◎
  totalOpex: number; // 期間總支出 ◎
  netTotal: number; // 期間總淨額 ◎
  genDelta: number; // 期間發電增量 MWh(末 − 首)
  endHealth: number; // 末段健康度 %
}

// 彙整歷史成復盤摘要(純函式);無資料回 null。
export function summarizeHistory(h: TrendPoint[]): TrendSummary | null {
  if (!h || !h.length) return null;
  const n = h.length;
  const avgAvail = Math.round(h.reduce((a, p) => a + p.avail, 0) / n);
  const minAvail = h.reduce((a, p) => Math.min(a, p.avail), 100);
  const totalRevenue = h.reduce((a, p) => a + p.revenue, 0);
  const totalOpex = h.reduce((a, p) => a + p.opex, 0);
  const netTotal = h.reduce((a, p) => a + p.net, 0);
  return {
    n, fromDay: h[0].day, toDay: h[n - 1].day, days: h[n - 1].day - h[0].day,
    avgAvail, minAvail, totalRevenue, totalOpex, netTotal,
    genDelta: h[n - 1].gen - h[0].gen, endHealth: h[n - 1].health,
  };
}
