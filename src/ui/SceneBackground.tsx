import { HubTurbines } from "./Turbine";
import { sceneById } from "./scenes";

// 海上變電站 OSS（黃色平台 + 套管腳 + 上部模塊），純 CSS 遠景
function Substation({ left, bottom, scale = 1 }: { left: string; bottom: string; scale?: number }) {
  return (
    <div style={{ position: "absolute", left, bottom, transform: `scale(${scale})`, transformOrigin: "bottom center", opacity: 0.6 }}>
      <div style={{ position: "relative", width: 54, height: 26, background: "linear-gradient(180deg,#e8c45a,#c89a2f)", borderRadius: 2, boxShadow: "0 2px 6px rgba(0,0,0,.3)" }}>
        <div style={{ position: "absolute", top: -10, left: 6, width: 14, height: 12, background: "#d9d2c4" }} />
        <div style={{ position: "absolute", top: -14, left: 30, width: 8, height: 16, background: "#c4ccd0" }} />
      </div>
      {/* jacket legs */}
      <div style={{ position: "absolute", left: 4, top: 24, width: 3, height: 30, background: "#d9b24a", transform: "skewX(10deg)" }} />
      <div style={{ position: "absolute", right: 4, top: 24, width: 3, height: 30, background: "#d9b24a", transform: "skewX(-10deg)" }} />
    </div>
  );
}

// 遠方船隻（運維船）
function FleetShip({ left, bottom, scale = 1, opacity = 0.55 }: { left: string; bottom: string; scale?: number; opacity?: number }) {
  return (
    <div style={{ position: "absolute", left, bottom, transform: `scale(${scale})`, opacity }}>
      <div style={{ position: "relative", width: 40, height: 13, background: "linear-gradient(180deg,#46586a,#1c2730)", borderRadius: "4px 5px 11px 11px/4px 4px 16px 16px", boxShadow: "0 3px 6px rgba(0,0,0,.3)" }}>
        <div style={{ position: "absolute", top: -7, left: "44%", width: 8, height: 8, background: "#eef2f3", borderRadius: "2px 2px 0 0" }} />
        <div style={{ position: "absolute", top: 4, left: 0, right: 0, height: 2, background: "#e0a83e" }} />
      </div>
    </div>
  );
}

// 共用背景場景（可切換海域主題 #32），永遠在 z0。
export default function SceneBackground({ showTurbines = true, sceneId = "changhua_dawn" }: { showTurbines?: boolean; sceneId?: string }) {
  const s = sceneById(sceneId);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "58%", background: s.sky }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "62%", background: s.sunGlow }} />
      {/* cliff haze */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "44%", height: "12%", background: "linear-gradient(180deg, rgba(150,170,180,.28), rgba(150,170,180,0))", filter: "blur(2px)" }} />
      {/* sea */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "44%", background: s.sea }} />
      {/* sea reflection */}
      <div style={{ position: "absolute", left: "42%", right: "42%", top: "54%", bottom: 0, background: `linear-gradient(180deg, ${s.reflection}, rgba(255,236,196,0) 60%)`, filter: "blur(8px)" }} />
      {/* horizon */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "55.7%", height: 1, background: "rgba(255,255,255,.35)" }} />

      {s.showSubstation && <Substation left="62%" bottom="46.5%" scale={0.9} />}
      {showTurbines && <HubTurbines layout={s.turbines} />}
      {s.showFleet && (
        <>
          <FleetShip left="28%" bottom="40%" scale={0.8} opacity={0.5} />
          <FleetShip left="72%" bottom="38%" scale={0.95} opacity={0.6} />
        </>
      )}

      {/* pier（部分海域為開放海域無碼頭） */}
      {s.pier && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64, background: "linear-gradient(180deg,#6b4f33,#4a3621)", borderTop: "2px solid rgba(0,0,0,.25)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64, background: "repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 78px, rgba(0,0,0,.22) 78px 80px)", opacity: 0.7 }} />
        </>
      )}
      {/* vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 42%, rgba(6,18,24,0) 52%, rgba(6,18,24,.5) 100%)", pointerEvents: "none" }} />
    </div>
  );
}
