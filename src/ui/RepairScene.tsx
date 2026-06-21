import type { CSSProperties } from "react";
import { C } from "./tokens";
import { t } from "../game/systems/i18n";
import type { RepairLocation } from "./faults";
import type { I18n } from "../game/systems/types";

// 維修作業的「不同地點場景」（#5）：機艙內 / 塔架內 / 輪轂 / 甲板，各自視角與設備。
// 純 CSS 繪製，放在維修畫面左側；右側診斷/SOP 面板不變。

function Alarm({ left, top, label }: { left: number; top: number; label: I18n }) {
  return (
    <div style={{ position: "absolute", left, top, display: "flex", alignItems: "center", gap: 6, zIndex: 4 }}>
      <span style={{ width: 13, height: 13, borderRadius: "50%", background: C.red, boxShadow: `0 0 8px ${C.red}`, animation: "shimmer 1.2s ease-in-out infinite" }} />
      <div style={{ padding: "3px 9px", borderRadius: 3, background: "rgba(40,16,14,.92)", border: `1px solid ${C.red}`, color: C.redText, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{t(label)}</div>
    </div>
  );
}

const beam: CSSProperties = { position: "absolute", background: "linear-gradient(180deg,#4a5560,#2a333b)", borderRadius: 2 };

// 閃爍狀態燈（#4 動態細節）
function Led({ left, top, color, rate = 1.4 }: { left: number; top: number; color: string; rate?: number }) {
  return <span style={{ position: "absolute", left, top, width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}`, animation: `shimmer ${rate}s ease-in-out infinite` }} />;
}

// 機艙內：齒輪箱 + 發電機 + 傳動軸 + 結構樑 + 採光窗
function Nacelle({ alarm }: { alarm: I18n }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#2b3640 0%,#39454f 40%,#222a31 100%)" }} />
      {/* 採光窗 */}
      <div style={{ position: "absolute", left: 40, top: 70, width: 90, height: 60, background: "linear-gradient(180deg,#bcd6e2,#7fa6b6)", borderRadius: 4, opacity: 0.6, boxShadow: "0 0 40px rgba(180,214,226,.4)" }} />
      {/* 結構樑 */}
      <div style={{ ...beam, left: 0, top: 40, right: 0, height: 10 }} />
      <div style={{ ...beam, left: 60, top: 40, width: 10, height: 300 }} />
      <div style={{ ...beam, left: 360, top: 40, width: 10, height: 320 }} />
      {/* 發電機（左方塊） */}
      <div style={{ position: "absolute", left: 70, top: 210, width: 120, height: 130, background: "linear-gradient(180deg,#6a7782,#3c454d)", borderRadius: 8, boxShadow: "inset 0 2px 0 rgba(255,255,255,.12), 0 6px 14px rgba(0,0,0,.4)" }}>
        <div style={{ position: "absolute", top: 12, left: 12, right: 12, height: 6, background: "repeating-linear-gradient(90deg,#2c343b 0 4px,#525c64 4px 8px)" }} />
        <div style={{ position: "absolute", bottom: 14, left: 12, right: 12, height: 6, background: "repeating-linear-gradient(90deg,#2c343b 0 4px,#525c64 4px 8px)" }} />
      </div>
      {/* 傳動軸 */}
      <div style={{ position: "absolute", left: 190, top: 262, width: 90, height: 24, background: "linear-gradient(180deg,#8b97a0,#4b555d)", borderRadius: 12 }} />
      {/* 齒輪箱（右大圓柱，內部齒輪轉動） */}
      <div style={{ position: "absolute", left: 270, top: 200, width: 150, height: 150, background: "radial-gradient(circle at 40% 35%,#7c8893,#39424a)", borderRadius: "50%", boxShadow: "0 8px 18px rgba(0,0,0,.45)" }}>
        <div style={{ position: "absolute", inset: 28, borderRadius: "50%", border: "3px solid rgba(0,0,0,.3)" }} />
        <div style={{ position: "absolute", inset: 52, borderRadius: "50%", background: "linear-gradient(180deg,#9aa6af,#5b656d)", animation: "spin 5s linear infinite" }}>
          {[0, 45, 90, 135].map((d) => (
            <div key={d} style={{ position: "absolute", top: "50%", left: "50%", width: "100%", height: 3, background: "rgba(0,0,0,.35)", transformOrigin: "center", transform: `translate(-50%,-50%) rotate(${d}deg)` }} />
          ))}
        </div>
      </div>
      {/* 傳動軸聯軸器轉動 */}
      <div style={{ position: "absolute", left: 250, top: 256, width: 30, height: 30, borderRadius: "50%", background: "radial-gradient(circle,#9aa6af,#4b555d)", animation: "spin 5s linear infinite" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 2, background: "rgba(0,0,0,.4)", transform: "translateY(-50%)" }} />
      </div>
      {/* 冷卻管路 */}
      <div style={{ position: "absolute", left: 120, top: 350, width: 280, height: 6, background: "#c98a3a", borderRadius: 3 }} />
      {/* 警示地貼 */}
      <div style={{ position: "absolute", left: 0, bottom: 60, width: "100%", height: 10, background: "repeating-linear-gradient(45deg,#d9a441 0 10px,#2a333b 10px 20px)", opacity: 0.7 }} />
      <Led left={92} top={232} color="#7fce8e" rate={2} />
      <Led left={104} top={232} color="#7fce8e" rate={2.6} />
      <Led left={300} top={206} color="#e3ad42" rate={1} />
      <Alarm left={300} top={185} label={alarm} />
    </>
  );
}

// 塔架內：筒身環肋 + 中央爬梯 + 電纜束 + 頂部採光
function Tower({ alarm }: { alarm: I18n }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, #4a5560 0%, #2c343c 45%, #1b2127 100%)" }} />
      {/* 透視環肋（上小下大） */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const w = 120 + i * 48;
        return <div key={i} style={{ position: "absolute", left: 215 - w / 2, top: 70 + i * 95, width: w, height: 26, border: "2px solid rgba(150,165,175,.4)", borderRadius: "50%" }} />;
      })}
      {/* 頂部採光（微微明滅） */}
      <div style={{ position: "absolute", left: 175, top: 30, width: 80, height: 40, background: "radial-gradient(ellipse,#cfe2ea,#7fa6b6)", borderRadius: "50%", opacity: 0.7, filter: "blur(2px)", animation: "shimmer 5s ease-in-out infinite" }} />
      <Led left={211} top={56} color="#dc6450" rate={1.6} />
      <Led left={206} top={300} color="#7fce8e" rate={2.2} />
      <Led left={318} top={150} color="#e3ad42" rate={1.2} />
      {/* 中央爬梯 */}
      <div style={{ position: "absolute", left: 200, top: 80, width: 30, height: 500 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: "100%", background: "#9aa6af" }} />
        <div style={{ position: "absolute", right: 0, top: 0, width: 4, height: "100%", background: "#9aa6af" }} />
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, top: i * 46, width: 30, height: 4, background: "#7c8893" }} />
        ))}
      </div>
      {/* 電纜束 */}
      <div style={{ position: "absolute", left: 300, top: 70, width: 12, height: 510, background: "linear-gradient(90deg,#1c2228,#3a444c,#1c2228)", borderRadius: 6 }} />
      <Alarm left={250} top={300} label={alarm} />
    </>
  );
}

// 輪轂內：彎曲艙壁 + 變槳軸承大環 + 葉根開口 + 液壓蓄能器
function Hub({ alarm }: { alarm: I18n }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 55% 45%, #3a444e 0%, #262d34 55%, #181d22 100%)" }} />
      {/* 變槳軸承大環（內環緩慢轉動） */}
      <div style={{ position: "absolute", left: 90, top: 120, width: 250, height: 250, borderRadius: "50%", border: "16px solid #5b656d", boxShadow: "inset 0 0 24px rgba(0,0,0,.5), 0 8px 18px rgba(0,0,0,.4)" }}>
        <div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: "3px dashed rgba(150,165,175,.45)", animation: "spin 18s linear infinite" }} />
      </div>
      <Led left={104} top={300} color="#7fce8e" rate={2.4} />
      <Led left={120} top={300} color="#e3ad42" rate={1.3} />
      {/* 葉根開口 */}
      <div style={{ position: "absolute", left: 150, top: 180, width: 130, height: 130, borderRadius: "50%", background: "radial-gradient(circle,#222a31,#10151a)" }} />
      {/* 液壓蓄能器 */}
      <div style={{ position: "absolute", left: 50, top: 360, width: 26, height: 90, background: "linear-gradient(180deg,#8b97a0,#48525a)", borderRadius: 13 }} />
      <div style={{ position: "absolute", left: 86, top: 380, width: 26, height: 70, background: "linear-gradient(180deg,#8b97a0,#48525a)", borderRadius: 13 }} />
      {/* 液壓管 */}
      <div style={{ position: "absolute", left: 60, top: 360, width: 200, height: 5, background: "#c98a3a", borderRadius: 3, transform: "rotate(-12deg)", transformOrigin: "left" }} />
      <Alarm left={150} top={110} label={alarm} />
    </>
  );
}

// 甲板/基礎：黃色過渡段平台 + 欄杆 + 登船梯 + 塔基 + 海面
function Deck({ alarm }: { alarm: I18n }) {
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "52%", background: "linear-gradient(180deg,#8fb4cc,#b9d2dc)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "48%", background: "linear-gradient(180deg,#2e7d92,#114457)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "51%", height: "10%", background: "repeating-linear-gradient(178deg, rgba(255,255,255,.06) 0 2px, rgba(255,255,255,0) 2px 18px)" }} />
      {/* 黃色過渡段平台 */}
      <div style={{ position: "absolute", left: 70, top: 330, width: 300, height: 120, background: "linear-gradient(180deg,#edca60,#bf922c)", borderRadius: 6, boxShadow: "0 8px 16px rgba(0,0,0,.4)" }} />
      {/* 塔基 */}
      <div style={{ position: "absolute", left: 190, top: 90, width: 60, height: 250, background: "linear-gradient(90deg,#b3c1c6,#f2f6f7 45%,#9fb0b6)", borderRadius: "4px 4px 0 0" }} />
      {/* 欄杆 */}
      <div style={{ position: "absolute", left: 70, top: 300, width: 300, height: 3, background: "#e8e2d2" }} />
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: 80 + i * 36, top: 300, width: 3, height: 30, background: "#e8e2d2" }} />
      ))}
      {/* 登船梯 */}
      <div style={{ position: "absolute", left: 120, top: 440, width: 8, height: 70, background: "#caa83e" }} />
      <div style={{ position: "absolute", left: 150, top: 440, width: 8, height: 70, background: "#caa83e" }} />
      {/* 助航燈號明滅 */}
      <Led left={84} top={322} color="#e3ad42" rate={1.1} />
      <Led left={352} top={322} color="#dc6450" rate={1.5} />
      <Alarm left={250} top={150} label={alarm} />
    </>
  );
}

export default function RepairScene({ location, alarm }: { location: RepairLocation; alarm: I18n }) {
  return (
    <div style={{ position: "absolute", left: 90, top: 96, width: 460, height: 600 }}>
      {location === "nacelle" && <Nacelle alarm={alarm} />}
      {location === "tower" && <Tower alarm={alarm} />}
      {location === "hub" && <Hub alarm={alarm} />}
      {location === "deck" && <Deck alarm={alarm} />}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 40% 40%, rgba(6,16,22,0) 55%, rgba(6,16,22,.5) 100%)", pointerEvents: "none" }} />
    </div>
  );
}
