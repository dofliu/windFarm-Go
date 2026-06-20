import { useState, type CSSProperties } from "react";
import { C, FONT_SERIF, primaryBg, circle, panel, panelHeader, panelTitle, stripe } from "../tokens";
import { t } from "../../game/systems/i18n";
import { useLang } from "../useLang";
import { AdvisorPopup } from "../Portrait";
import { exprUrl, NARRATOR_EXPR } from "../characters";
import type { I18n } from "../../game/systems/types";
import type { Screen } from "../../App";

// 對應 NARRATOR_EXPR 順序：smile / happy / surprise / thinking / worried / wink
const NARRATOR_LINES: I18n[] = [
  { zh: "歡迎回到母港，船長！", en: "Welcome back to port, Captain!" },
  { zh: "CH-12 號機組有新工單囉～準備好就點「出海作業」吧！", en: "New work order on Unit CH-12 — hit SET SAIL when you're ready!" },
  { zh: "咦？海象好像有變化，注意作業窗！", en: "Huh? The sea state's shifting — mind the work window!" },
  { zh: "嗯…這趟維修要帶足備品才行。", en: "Hmm… we should stock up on parts for this trip." },
  { zh: "颱風季快到了，天氣窗要抓緊喔…", en: "Typhoon season is near — watch the weather window…" },
  { zh: "導航交給我，包在身上！（點我換表情）", en: "Leave the navigation to me! (click to change mood)" },
];

const labelChip: CSSProperties = {
  display: "inline-block",
  marginTop: 7,
  padding: "3px 12px",
  background: "rgba(12,30,38,.9)",
  border: "1px solid rgba(214,167,84,.5)",
  borderRadius: 3,
  color: C.cream,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: ".04em",
  whiteSpace: "nowrap",
};

function Marker({
  char,
  label,
  left,
  top,
  bob,
  onClick,
}: {
  char: string;
  label: { zh: string; en: string };
  left: number;
  top: number;
  bob: number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left,
        top,
        width: 120,
        textAlign: "center",
        cursor: "pointer",
        animation: `bob ${bob}s ease-in-out infinite`,
      }}
    >
      <div style={{ ...circle(62, 28), margin: "0 auto" }}>{char}</div>
      <div style={labelChip}>{t(label)}</div>
    </div>
  );
}

function RailBtn({ char, label }: { char: string; label: { zh: string; en: string } }) {
  useLang();
  return (
    <div style={{ textAlign: "center", cursor: "pointer" }}>
      <div style={{ ...circle(56, 24), border: "2px solid rgba(214,167,84,.7)", boxShadow: "0 5px 14px rgba(0,0,0,.4)", background: "radial-gradient(circle at 50% 35%, #20586a, #0f3140)" }}>
        {char}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: "#e4eef0", textShadow: "0 1px 3px #000" }}>{t(label)}</div>
    </div>
  );
}

function TickerRow({ stars, name, price, farm, pct, onClick }: { stars: string; name: string; price: string; farm: string; pct: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 4, background: "rgba(255,255,255,.04)", marginBottom: 7, cursor: "pointer" }}>
      <div style={{ width: 42, height: 42, flex: "none", borderRadius: 4, background: stripe, border: "1px solid rgba(214,167,84,.3)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#e2b24a", fontSize: 11, lineHeight: 1 }}>{stars}</div>
        <div style={{ color: C.cream, fontSize: 14, fontWeight: 700, margin: "2px 0" }}>{name}</div>
        <div style={{ color: C.mist3, fontSize: 11 }}>◎ {price} · {farm}</div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <span style={{ color: C.green, fontSize: 14, fontWeight: 900 }}>{pct}</span>
      </div>
    </div>
  );
}

export default function HubScreen({ setScreen, accent }: { setScreen: (s: Screen) => void; accent: string }) {
  useLang();
  const goMarket = () => setScreen("market");
  const goSail = () => setScreen("sail");
  const [ei, setEi] = useState(1); // 解說員表情索引（預設 happy）

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
      {/* location markers */}
      <Marker char="備" label={{ zh: "備品交易所", en: "Parts Market" }} left={560} top={300} bob={4} onClick={goMarket} />
      <Marker char="工" label={{ zh: "機具工坊", en: "Workshop" }} left={760} top={230} bob={4.6} />
      <Marker char="調" label={{ zh: "調度中心", en: "Dispatch" }} left={940} top={296} bob={5.2} />
      <Marker char="師" label={{ zh: "技師公會", en: "Tech Guild" }} left={650} top={430} bob={4.2} />
      <Marker char="船" label={{ zh: "CTV 整備廠", en: "CTV Yard" }} left={880} top={452} bob={4.8} />

      {/* LEFT: market ticker */}
      <div style={{ ...panel, position: "absolute", left: 28, top: 92, width: 312 }}>
        <div style={{ ...panelHeader, justifyContent: "space-between", padding: "9px 14px" }}>
          <span style={{ ...panelTitle, fontSize: 16, letterSpacing: ".06em" }}>{t({ zh: "風場行情", en: "Market" })}</span>
          <span style={{ fontSize: 13, color: C.mist2, fontVariantNumeric: "tabular-nums" }}>00:30:23</span>
        </div>
        <div style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: 12, color: accent, fontWeight: 700, letterSpacing: ".1em", marginBottom: 7 }}>{t({ zh: "熱門備品", en: "Hot Parts" })}</div>
          <TickerRow stars="★★★★" name={t({ zh: "變槳軸承", en: "Pitch Bearing" })} price="130,800" farm={t({ zh: "西島風場", en: "Xidao Farm" })} pct="↑300%" onClick={goMarket} />
          <TickerRow stars="★★★★★" name={t({ zh: "齒輪箱齒輪油", en: "Gearbox Oil" })} price="130,800" farm={t({ zh: "彰芳風場", en: "CFXF Farm" })} pct="↑350%" onClick={goMarket} />

          <div style={{ fontSize: 12, color: accent, fontWeight: 700, letterSpacing: ".1em", margin: "5px 0 7px" }}>{t({ zh: "行情快訊", en: "Flash" })}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, padding: "7px 8px", borderRadius: 4, background: "rgba(220,100,80,.12)", border: "1px solid rgba(220,100,80,.3)" }}>
              <div style={{ color: C.red, fontSize: 11, fontWeight: 700 }}>{t({ zh: "爆跌 · 耗材", en: "Crash · Consumable" })}</div>
              <div style={{ color: "#cfe0e6", fontSize: 12, marginTop: 3 }}>{t({ zh: "潤滑油", en: "Lube Oil" })} ◎2,380</div>
              <div style={{ color: C.red, fontSize: 12, fontWeight: 700 }}>↓ -89%</div>
            </div>
            <div style={{ flex: 1, padding: "7px 8px", borderRadius: 4, background: "rgba(127,206,142,.1)", border: "1px solid rgba(127,206,142,.28)" }}>
              <div style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>{t({ zh: "爆漲 · 金屬", en: "Surge · Metal" })}</div>
              <div style={{ color: "#cfe0e6", fontSize: 12, marginTop: 3 }}>{t({ zh: "海纜", en: "Cable" })} ◎6,688</div>
              <div style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>↑ +125%</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", borderTop: "1px solid rgba(214,167,84,.25)" }}>
          <div style={{ flex: 1, textAlign: "center", padding: "9px 0", fontSize: 13, fontWeight: 700, color: "#0f2630", background: "linear-gradient(180deg,#e8c074,#d9a441)" }}>{t({ zh: "世界行情", en: "World" })}</div>
          <div style={{ flex: 1, textAlign: "center", padding: "9px 0", fontSize: 13, color: C.mist2 }}>{t({ zh: "我的機組", en: "My Fleet" })}</div>
          <div style={{ flex: 1, textAlign: "center", padding: "9px 0", fontSize: 13, color: C.mist2 }}>{t({ zh: "分類", en: "Category" })}</div>
        </div>
      </div>

      {/* RIGHT: action rail */}
      <div style={{ position: "absolute", right: 26, top: 108, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
        <RailBtn char="任" label={{ zh: "任務", en: "Quests" }} />
        <RailBtn char="船" label={{ zh: "船隊", en: "Fleet" }} />
        <RailBtn char="倉" label={{ zh: "倉庫", en: "Storage" }} />
        <RailBtn char="鑑" label={{ zh: "圖鑑", en: "Codex" }} />
        <RailBtn char="榜" label={{ zh: "排行", en: "Ranking" }} />
      </div>

      {/* BOTTOM-LEFT: quest card */}
      <div style={{ ...panel, position: "absolute", left: 28, bottom: 26, width: 372, boxShadow: "0 12px 30px rgba(0,0,0,.4)" }}>
        <div style={panelHeader}>
          <span style={panelTitle}>{t({ zh: "進行中工單", en: "Active Work Order" })}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: C.mist2 }}>3 / 5</span>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ color: C.cream, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t({ zh: "更換偏航電機 · CH-12 號機組", en: "Replace Yaw Motor · Unit CH-12" })}</div>
          <div style={{ color: C.mist, fontSize: 12.5, lineHeight: 1.5 }}>{t({ zh: "前往「彰化外海・CH-12」，於浪高 1.5m 內完成偏航電機更換並回報 SCADA。", en: "Sail to Changhua Offshore CH-12; replace the yaw motor within 1.5m wave height and report to SCADA." })}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1, height: 7, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
              <div style={{ width: "35%", height: "100%", background: "linear-gradient(90deg,#e8c074,#d9a441)" }} />
            </div>
            <span style={{ fontSize: 12, color: "#cfe0e6", fontVariantNumeric: "tabular-nums" }}>0 / 1</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <span style={{ padding: "4px 10px", borderRadius: 3, background: "rgba(217,164,65,.14)", border: "1px solid rgba(214,167,84,.4)", color: C.goldText, fontSize: 12 }}>{t({ zh: "預算 +18 萬", en: "Budget +180k" })}</span>
            <span style={{ padding: "4px 10px", borderRadius: 3, background: "rgba(127,206,142,.12)", border: "1px solid rgba(127,206,142,.35)", color: C.greenLight, fontSize: 12 }}>{t({ zh: "資歷 +120", en: "XP +120" })}</span>
          </div>
        </div>
      </div>

      {/* BOTTOM-CENTER: primary actions */}
      <div style={{ position: "absolute", left: "50%", bottom: 34, transform: "translateX(-50%)", display: "flex", gap: 16, alignItems: "center" }}>
        <SecBtn icon="◷" label={t({ zh: "航線圖", en: "Route Map" })} />
        <div onClick={goSail} style={{ padding: "16px 46px", borderRadius: 6, background: primaryBg(accent), border: "1px solid rgba(255,236,196,.6)", color: C.ink, fontFamily: FONT_SERIF, fontSize: 21, fontWeight: 900, letterSpacing: ".1em", whiteSpace: "nowrap", cursor: "pointer", boxShadow: "0 8px 22px rgba(217,164,65,.35), inset 0 1px 0 rgba(255,255,255,.4)" }}>
          {t({ zh: "出 海 作 業", en: "SET SAIL" })}
        </div>
        <SecBtn icon="⚓" label={t({ zh: "靠港休整", en: "Rest in Port" })} />
      </div>

      {/* 解說員少女：任務引導（點擊換表情/台詞） */}
      <AdvisorPopup
        id="narrator_girl"
        src={exprUrl("narrator_girl", NARRATOR_EXPR[ei])}
        line={NARRATOR_LINES[ei]}
        style={{ left: 1300, bottom: 6 }}
        portraitH={260}
        bubbleSide="left"
        onClick={() => setEi((ei + 1) % NARRATOR_EXPR.length)}
      />
    </div>
  );
}

function SecBtn({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ padding: "13px 22px", borderRadius: 5, background: "rgba(15,40,50,.82)", border: "1px solid rgba(214,167,84,.45)", color: C.cream, fontSize: 15, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
      <span style={{ color: C.gold, fontSize: 17 }}>{icon}</span> {label}
    </div>
  );
}
