import { C } from "./tokens";
import { t } from "../game/systems/i18n";
import { SEA_LABEL, SEA_ICON, type SeaState } from "../state/game";

// 微觀天氣預報條（#2）：顯示未來三日海象，支援預防性排程決策。
const SEA_COLOR: Record<SeaState, string> = { workable: C.green, caution: C.amber, closed: C.red };
const DAY_LABEL = [
  { zh: "明日", en: "D+1" },
  { zh: "後天", en: "D+2" },
  { zh: "三日後", en: "D+3" },
];

export function ForecastStrip({ forecast, compact = false }: { forecast: SeaState[]; compact?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {forecast.map((s, i) => (
        <div
          key={i}
          title={t(SEA_LABEL[s])}
          style={{
            flex: 1,
            textAlign: "center",
            padding: compact ? "3px 0" : "5px 2px",
            borderRadius: 4,
            background: "rgba(255,255,255,.04)",
            border: `1px solid ${SEA_COLOR[s]}55`,
          }}
        >
          <div style={{ fontSize: 10, color: C.mist2 }}>{t(DAY_LABEL[i] ?? { zh: `+${i + 1}`, en: `+${i + 1}` })}</div>
          <div style={{ fontSize: compact ? 13 : 16, lineHeight: 1.3 }}>{SEA_ICON[s]}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: SEA_COLOR[s] }}>{t(SEA_LABEL[s])}</div>
        </div>
      ))}
    </div>
  );
}

// 預報中第一個「停航」日的索引（-1 表示三日內無風暴），供風暴警示文案使用。
export function stormDayIndex(forecast: SeaState[]): number {
  return forecast.findIndex((s) => s === "closed");
}

// 風暴警示橫幅：預報三日內出現停航時提醒提前搶修。
export function StormWarning({ forecast }: { forecast: SeaState[] }) {
  const idx = stormDayIndex(forecast);
  if (idx < 0) return null;
  const when = t(DAY_LABEL[idx] ?? { zh: `+${idx + 1}`, en: `D+${idx + 1}` });
  return (
    <div style={{ marginTop: 8, padding: "7px 9px", borderRadius: 4, background: "rgba(220,100,80,.12)", border: "1px solid rgba(220,100,80,.32)" }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.red }}>🌀 {t({ zh: "風暴警報", en: "Storm warning" })}</div>
      <div style={{ color: "#cfe0e6", fontSize: 11.5, marginTop: 2 }}>
        {t({ zh: `預報 ${when} 停航，建議在天氣窗關閉前完成搶修。`, en: `Forecast shows closed seas (${when}) — finish repairs before the window shuts.` })}
      </div>
    </div>
  );
}
