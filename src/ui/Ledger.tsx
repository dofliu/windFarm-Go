import { useEffect, useRef } from "react";
import { C } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { toast } from "./toast";
import type { Ledger } from "../state/game";
import type { I18n } from "../game/systems/types";

// 帶正負號的金額（精確到 ◎，方便對帳除錯）
const sign = (n: number) => (n >= 0 ? "+" : "−") + Math.abs(Math.round(n)).toLocaleString();

// 一行式莉莉財報（toast 用）：售電 / 支出 / 淨額
export function ledgerToastMsg(l: Ledger): I18n {
  const spend = -(l.payroll + l.storage + l.downtime + l.demurrage + l.slaPenalty + Math.min(0, l.event)); // 各項支出（正值）
  const d = l.days > 1 ? `（${l.days} 天）` : "";
  const dEn = l.days > 1 ? ` (${l.days}d)` : "";
  return {
    zh: `🧾 莉莉財報 Day ${l.day}${d}：售電 +${Math.round(l.revenue).toLocaleString()}，支出 −${Math.round(spend).toLocaleString()} → 淨 ${sign(l.net)} ◎`,
    en: `🧾 Lili's books · Day ${l.day}${dEn}: power +${Math.round(l.revenue).toLocaleString()}, costs −${Math.round(spend).toLocaleString()} → net ${sign(l.net)} ◎`,
  };
}

// 掛在 App（GameProvider 內，只一份）：每次推進日子 → 由莉莉跳出當日收支 toast。
// 以 ref 記住上次顯示的天數，避免掛載時對既有財報重複跳。
export function LedgerToaster() {
  const { data } = useGame();
  const lastDay = useRef<number>(data.lastLedger?.day ?? -1);
  useEffect(() => {
    const l = data.lastLedger;
    if (l && l.day !== lastDay.current) {
      lastDay.current = l.day;
      toast(ledgerToastMsg(l));
    }
  }, [data.lastLedger]);
  return null;
}

function Row({ label, amount, color }: { label: I18n; amount: number; color: string }) {
  if (!amount) return null; // 0 的項目不顯示，保持精簡
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
      <span style={{ color: C.mist }}>{t(label)}</span>
      <span style={{ color, fontWeight: 700 }}>◎ {sign(amount)}</span>
    </div>
  );
}

// 當日收支明細面板：列出各項收入/支出與淨額，幫玩家看懂錢的去向。
export function LedgerView({ ledger }: { ledger: Ledger | null }) {
  useLang();
  if (!ledger) return <div style={{ fontSize: 12, color: C.mist }}>{t({ zh: "推進一天後顯示當日收支", en: "Advance a day to see the daily ledger" })}</div>;
  const allZero = !ledger.revenue && !ledger.fixPay && !ledger.payroll && !ledger.storage && !ledger.downtime && !ledger.demurrage && !ledger.slaPenalty && !ledger.event;
  const netCol = ledger.net >= 0 ? C.green : C.red;
  return (
    <div>
      <Row label={{ zh: "售電收入", en: "Power sales" }} amount={ledger.revenue} color={C.green} />
      <Row label={{ zh: "修復報酬", en: "Repair pay" }} amount={ledger.fixPay} color={C.green} />
      <Row label={{ zh: "突發事件", en: "Event" }} amount={ledger.event} color={ledger.event >= 0 ? C.green : C.amber2} />
      <Row label={{ zh: "技師薪資", en: "Payroll" }} amount={ledger.payroll} color={C.amber2} />
      <Row label={{ zh: "倉儲維持", en: "Storage" }} amount={ledger.storage} color={C.amber2} />
      <Row label={{ zh: "任務停機", en: "Quest downtime" }} amount={ledger.downtime} color={C.amber2} />
      <Row label={{ zh: "大修待命", en: "Demurrage" }} amount={ledger.demurrage} color={C.amber2} />
      <Row label={{ zh: "SLA 違約", en: "SLA penalty" }} amount={ledger.slaPenalty} color={C.red} />
      {allZero && <div style={{ fontSize: 12, color: C.mist }}>{t({ zh: "今日無進出帳", en: "No cash flows today" })}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0 0", marginTop: 3, borderTop: "1px solid rgba(255,255,255,.1)" }}>
        <span style={{ color: C.cream, fontWeight: 700 }}>{t({ zh: `當日淨變動${ledger.days > 1 ? `（${ledger.days} 天）` : ""}`, en: `Net${ledger.days > 1 ? ` (${ledger.days}d)` : ""}` })}</span>
        <span style={{ color: netCol, fontWeight: 900 }}>◎ {sign(ledger.net)}</span>
      </div>
    </div>
  );
}
