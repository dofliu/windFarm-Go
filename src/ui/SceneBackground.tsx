import { HubTurbines } from "./Turbine";
import { sceneById } from "./scenes";
import AerialFarm from "./AerialFarm";

// 海上變電站 OSS（黃色平台 + 上部模塊 + 直升機坪 + 套管腳 + 吊臂），純 CSS
function Substation({ left, bottom, scale = 1 }: { left: string; bottom: string; scale?: number }) {
  return (
    <div style={{ position: "absolute", left, bottom, transform: `scale(${scale})`, transformOrigin: "bottom center", opacity: 0.72 }}>
      {/* 主平台 */}
      <div style={{ position: "relative", width: 64, height: 30, background: "linear-gradient(180deg,#edca60,#c89a2f)", borderRadius: 3, boxShadow: "0 3px 8px rgba(0,0,0,.4)", border: "1px solid rgba(0,0,0,.2)" }}>
        {/* 上部模塊 */}
        <div style={{ position: "absolute", top: -13, left: 6, width: 18, height: 15, background: "linear-gradient(180deg,#e2dccb,#b8b1a0)", borderRadius: 2 }} />
        <div style={{ position: "absolute", top: -20, left: 28, width: 10, height: 22, background: "linear-gradient(180deg,#cfd6da,#9aa6ab)" }} />
        {/* 直升機坪 */}
        <div style={{ position: "absolute", top: -9, right: 5, width: 13, height: 13, borderRadius: "50%", border: "2px solid #2a2a2a", color: "#2a2a2a", fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>H</div>
        {/* 吊臂 */}
        <div style={{ position: "absolute", top: -16, left: 44, width: 16, height: 2, background: "#7d8b91", transform: "rotate(-22deg)", transformOrigin: "left" }} />
      </div>
      {/* jacket 套管腳（4 斜撐） */}
      <div style={{ position: "absolute", left: 6, top: 28, width: 3, height: 36, background: "#cda63f", transform: "skewX(12deg)" }} />
      <div style={{ position: "absolute", left: 22, top: 28, width: 3, height: 36, background: "#b8902f", transform: "skewX(6deg)" }} />
      <div style={{ position: "absolute", right: 22, top: 28, width: 3, height: 36, background: "#b8902f", transform: "skewX(-6deg)" }} />
      <div style={{ position: "absolute", right: 6, top: 28, width: 3, height: 36, background: "#cda63f", transform: "skewX(-12deg)" }} />
      <div style={{ position: "absolute", left: 6, top: 44, right: 6, height: 2, background: "rgba(184,144,47,.7)" }} />
    </div>
  );
}

// 運維船（SOV/CSV：船體 + 駕駛艙 + 吊車 + 直升機坪 + 倒影）
function FleetShip({ left, bottom, scale = 1, opacity = 0.7 }: { left: string; bottom: string; scale?: number; opacity?: number }) {
  return (
    <div style={{ position: "absolute", left, bottom, transform: `scale(${scale})`, transformOrigin: "bottom center", opacity }}>
      {/* 船體 */}
      <div style={{ position: "relative", width: 72, height: 18, background: "linear-gradient(180deg,#516374,#202c35)", borderRadius: "4px 7px 14px 14px/4px 5px 22px 22px", boxShadow: "0 4px 8px rgba(0,0,0,.4)" }}>
        {/* 水線塗裝 */}
        <div style={{ position: "absolute", top: 9, left: 0, right: 0, height: 3, background: "#e0a83e" }} />
        {/* 駕駛艙 */}
        <div style={{ position: "absolute", top: -12, left: 6, width: 18, height: 13, background: "linear-gradient(180deg,#eef2f3,#b9c4c9)", borderRadius: "2px 2px 0 0" }} />
        <div style={{ position: "absolute", top: -9, left: 8, width: 14, height: 4, background: "#3a5566" }} />
        {/* 後甲板吊車 */}
        <div style={{ position: "absolute", top: -16, right: 16, width: 2, height: 16, background: "#cdd4d8" }} />
        <div style={{ position: "absolute", top: -16, right: 16, width: 18, height: 2, background: "#cdd4d8", transform: "rotate(28deg)", transformOrigin: "left" }} />
        {/* 船艏直升機坪 */}
        <div style={{ position: "absolute", top: -3, left: 30, width: 9, height: 9, borderRadius: "50%", border: "1.5px solid #cdd4d8" }} />
      </div>
      {/* 倒影 */}
      <div style={{ position: "absolute", left: 4, top: 18, width: 64, height: 8, background: "linear-gradient(180deg,rgba(40,55,65,.4),rgba(40,55,65,0))", filter: "blur(2px)", borderRadius: "50%" }} />
    </div>
  );
}

// 共用背景場景（可切換海域主題 #32 + 俯瞰 + 實境模式），永遠在 z0。
export default function SceneBackground({ showTurbines = true, sceneId = "changhua_dawn", aerial = false, realistic = false }: { showTurbines?: boolean; sceneId?: string; aerial?: boolean; realistic?: boolean }) {
  const s = sceneById(sceneId);
  if (aerial) return <AerialFarm />;
  // 實境模式：用實景照片當背景（照片本身已含風機/船/基礎）
  if (realistic) {
    const url = `${import.meta.env.BASE_URL}assets/scenes/${s.realImg}`;
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url("${url}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 42%, rgba(6,18,24,0) 56%, rgba(6,18,24,.45) 100%)", pointerEvents: "none" }} />
      </div>
    );
  }
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
