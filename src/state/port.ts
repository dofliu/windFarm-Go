// 母港建設・視覺成長(#port):用獲利升級母港設施,把數值成長轉化為視覺成就感(WM3 報告建議 2.2)。
// 純資料/純函式;升級為「外觀成長」(視覺)為主,不改動經濟平衡。
import type { I18n } from "../game/systems/types";

export type PortUpgrades = Record<string, number>; // facilityId → 等級(0 起)

export interface PortFacility {
  id: string;
  name: I18n;
  icon: string;
  max: number;
  costs: number[]; // costs[lv] = 由 lv 升到 lv+1 的費用(◎);長度 = max
  blurb: I18n;      // 視覺成長說明
}

export const PORT_FACILITIES: PortFacility[] = [
  { id: "quay", name: { zh: "碼頭擴建", en: "Quay" }, icon: "⚓", max: 3, costs: [3_000_000, 8_000_000, 18_000_000],
    blurb: { zh: "延伸碼頭、停泊更多運維船。", en: "Extend the quay; berth more vessels." } },
  { id: "warehouse", name: { zh: "倉儲升級", en: "Warehouse" }, icon: "🏬", max: 3, costs: [2_500_000, 7_000_000, 16_000_000],
    blurb: { zh: "加大倉庫、堆疊更多貨櫃備品。", en: "Bigger warehouse; more stacked containers." } },
  { id: "crane", name: { zh: "起重機", en: "Cranes" }, icon: "🏗", max: 3, costs: [4_000_000, 10_000_000, 22_000_000],
    blurb: { zh: "增設更高的港區起重機。", en: "Add taller harbour cranes." } },
  { id: "beacon", name: { zh: "燈塔招牌", en: "Beacon" }, icon: "🗼", max: 3, costs: [1_500_000, 4_000_000, 9_000_000],
    blurb: { zh: "點亮燈塔與港區照明招牌。", en: "Light up the beacon & harbour signage." } },
];

export const portFacility = (id: string): PortFacility | undefined => PORT_FACILITIES.find((f) => f.id === id);
export const portFacLevel = (u: PortUpgrades, id: string): number => (u || {})[id] ?? 0;

// 母港總等級 = 各設施等級加總(0 ~ Σmax)
export const portLevel = (u: PortUpgrades): number => PORT_FACILITIES.reduce((a, f) => a + portFacLevel(u, f.id), 0);
export const PORT_MAX_LEVEL = PORT_FACILITIES.reduce((a, f) => a + f.max, 0);

// 下一級費用;已滿級回 null
export function nextPortCost(u: PortUpgrades, id: string): number | null {
  const f = portFacility(id);
  if (!f) return null;
  const lv = portFacLevel(u, id);
  return lv >= f.max ? null : f.costs[lv];
}
// 是否可升級(在預算內且未滿級)
export function canUpgradePort(u: PortUpgrades, id: string, budget: number): boolean {
  const c = nextPortCost(u, id);
  return c != null && budget >= c;
}
