import type { I18n } from "../game/systems/types";

// 集中管理的介面字串字典（#14）。供翻譯校對與一致性的單一來源。
// 領域內容（故障/備品/工單/對話台詞）仍各自存於 faults.ts / data.ts / 元件中，依領域就近維護。
export const S = {
  nav: {
    title: { zh: "離岸風場 · 運維傳說", en: "Offshore O&M Legend" },
    home: { zh: "母港大廳", en: "Home Port" },
    market: { zh: "備品交易所", en: "Parts Market" },
    sail: { zh: "出海航行", en: "Set Sail" },
    repair: { zh: "維修作業", en: "Repair" },
  },
  hud: {
    sea: { zh: "海象", en: "Sea" },
    seaSub: { zh: "浪 1.2m · 風 8m/s · ENE", en: "1.2m · 8m/s · ENE" },
    day: { zh: "Day 21 · 晴", en: "Day 21 · Clear" },
    techs: { zh: "技師", en: "Techs" },
    wan: { zh: "萬", en: "M" },
  },
  status: {
    workable: { zh: "可作業", en: "Workable" },
    caution: { zh: "警戒", en: "Caution" },
    closed: { zh: "停航", en: "Closed" },
    available: { zh: "可接", en: "Available" },
    active: { zh: "進行中", en: "Active" },
    done: { zh: "已完成", en: "Done" },
    crit: { zh: "嚴重", en: "CRIT" },
  },
  btn: {
    accept: { zh: "接單", en: "Accept" },
    nextOrder: { zh: "下一筆工單", en: "Next Order" },
    confirm: { zh: "確 認 採 購", en: "CONFIRM" },
    addPrompt: { zh: "點選備品加入採購", en: "Tap parts to add" },
    finishRepair: { zh: "回報 SCADA · 完成維修", en: "Report SCADA · Finish" },
    continue: { zh: "▶ 點擊繼續", en: "▶ Click to continue" },
    setSail: { zh: "出 海 作 業", en: "SET SAIL" },
    routeMap: { zh: "航線圖", en: "Route Map" },
    restPort: { zh: "靠港休整", en: "Rest in Port" },
    dockClimb: { zh: "靠泊登塔", en: "Dock & Climb" },
    buy: { zh: "買入", en: "Buy" },
    sell: { zh: "賣出", en: "Sell" },
  },
  panel: {
    workOrder: { zh: "工單 · 風場經理", en: "Work Order · Manager" },
    scada: { zh: "SCADA 即時告警", en: "SCADA Live Alarms" },
    quiz: { zh: "故障診斷 · 隨堂測驗", en: "Diagnosis · Quiz" },
    sop: { zh: "維修 SOP 作業步驟", en: "Repair SOP Steps" },
    availability: { zh: "機組妥善率", en: "Availability" },
    workWindow: { zh: "作業安全窗", en: "Work Window" },
    cargo: { zh: "貨艙", en: "Cargo" },
  },
  market: {
    stock: { zh: "庫存", en: "Stock" },
    nextRestock: { zh: "下次到貨", en: "Next restock" },
    tax: { zh: "稅率", en: "Tax" },
    subtotal: { zh: "稅前", en: "Subtotal" },
    total: { zh: "應付（含稅）", en: "Total (tax incl.)" },
    director: { zh: "交易所主管", en: "Market Director" },
  },
} satisfies Record<string, Record<string, I18n>>;
