import { HubTurbines } from "./Turbine";

// 共用背景場景（母港天空＋海面＋風機＋碼頭），永遠在 z0。
export default function SceneBackground({ showTurbines = true }: { showTurbines?: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      {/* sky */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: "58%",
          background: "linear-gradient(180deg,#9dc0d6 0%, #bcd2da 28%, #ddd5c1 50%, #f0e2c4 60%)",
        }}
      />
      {/* sun glow */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: "62%",
          background: "radial-gradient(circle at 50% 88%, rgba(255,243,212,.95), rgba(255,243,212,0) 42%)",
        }}
      />
      {/* cliff haze */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "44%",
          height: "12%",
          background: "linear-gradient(180deg, rgba(150,170,180,.28), rgba(150,170,180,0))",
          filter: "blur(2px)",
        }}
      />
      {/* sea */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "44%",
          background: "linear-gradient(180deg,#5e97a2 0%, #347683 32%, #1d5160 72%, #143f4c 100%)",
        }}
      />
      {/* sea reflection */}
      <div
        style={{
          position: "absolute",
          left: "42%",
          right: "42%",
          top: "54%",
          bottom: 0,
          background: "linear-gradient(180deg, rgba(255,236,196,.5), rgba(255,236,196,0) 60%)",
          filter: "blur(8px)",
        }}
      />
      {/* horizon */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "55.7%", height: 1, background: "rgba(255,255,255,.35)" }} />

      {showTurbines && <HubTurbines />}

      {/* pier */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 64,
          background: "linear-gradient(180deg,#6b4f33,#4a3621)",
          borderTop: "2px solid rgba(0,0,0,.25)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 64,
          background: "repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 78px, rgba(0,0,0,.22) 78px 80px)",
          opacity: 0.7,
        }}
      />
      {/* vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 42%, rgba(6,18,24,0) 52%, rgba(6,18,24,.5) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
