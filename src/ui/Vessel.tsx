import type { CSSProperties } from "react";

// 不同船型（#5）：CTV 人員運輸船 / SOV 運維母船 / Jack-up 安裝船。純 CSS 側視圖。
export type VesselType = "ctv" | "sov" | "jackup";

export const vesselTypeOf = (ownsSOV: boolean): VesselType => (ownsSOV ? "sov" : "ctv");
export const VESSEL_LABEL: Record<VesselType, { zh: string; en: string }> = {
  ctv: { zh: "CTV 人員運輸船", en: "CTV" },
  sov: { zh: "SOV 運維母船", en: "SOV" },
  jackup: { zh: "安裝船 (Jack-up)", en: "Jack-up" },
};

function Ctv() {
  return (
    <div style={{ position: "relative", width: 92, height: 40 }}>
      {/* 雙體船身 */}
      <div style={{ position: "absolute", bottom: 0, left: 4, width: 84, height: 14, background: "linear-gradient(180deg,#54657a,#212c36)", borderRadius: "6px 10px 14px 14px/6px 6px 20px 20px" }} />
      {/* 甲板 */}
      <div style={{ position: "absolute", bottom: 12, left: 10, width: 72, height: 8, background: "linear-gradient(180deg,#7c8a96,#4a555f)", borderRadius: 2 }} />
      {/* 駕駛艙（前） */}
      <div style={{ position: "absolute", bottom: 18, left: 52, width: 24, height: 14, background: "linear-gradient(180deg,#eef3f4,#b6c4c9)", borderRadius: "3px 4px 0 0" }}>
        <div style={{ position: "absolute", top: 3, left: 3, right: 3, height: 5, background: "#37596b" }} />
      </div>
      {/* 桅杆 */}
      <div style={{ position: "absolute", bottom: 32, left: 62, width: 2, height: 9, background: "#cdd4d8" }} />
      {/* 橘色撞墊艏（登塔頂靠） */}
      <div style={{ position: "absolute", bottom: 12, left: 2, width: 10, height: 10, background: "#e0892e", borderRadius: "3px 0 0 4px" }} />
      <div style={{ position: "absolute", bottom: 13, left: 10, width: 74, height: 3, background: "#e0a83e" }} />
    </div>
  );
}

function Sov() {
  return (
    <div style={{ position: "relative", width: 132, height: 58 }}>
      {/* 船身 */}
      <div style={{ position: "absolute", bottom: 0, left: 2, width: 128, height: 20, background: "linear-gradient(180deg,#516374,#1c2730)", borderRadius: "6px 12px 10px 10px/6px 8px 18px 18px" }} />
      <div style={{ position: "absolute", bottom: 11, left: 4, width: 124, height: 3, background: "#e0a83e" }} />
      {/* 後段高層上部結構 + 駕駛台 */}
      <div style={{ position: "absolute", bottom: 18, left: 78, width: 46, height: 30, background: "linear-gradient(180deg,#eef3f4,#aebbc0)", borderRadius: "3px 4px 0 0" }}>
        {[0, 1, 2].map((r) => (
          <div key={r} style={{ position: "absolute", top: 4 + r * 7, left: 4, right: 4, height: 4, background: "#43677a" }} />
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 48, left: 92, width: 18, height: 8, background: "#d7dee1", borderRadius: "2px 2px 0 0" }} />
      {/* 直升機坪（前） */}
      <div style={{ position: "absolute", bottom: 20, left: 14, width: 26, height: 6, background: "#6b7782", borderRadius: 2 }} />
      <div style={{ position: "absolute", bottom: 22, left: 22, width: 9, height: 9, borderRadius: "50%", border: "1.5px solid #e8e2d2" }} />
      {/* 運動補償舷梯（伸向風機） */}
      <div style={{ position: "absolute", bottom: 30, left: -22, width: 44, height: 4, background: "#d9b24a", borderRadius: 2, transform: "rotate(-8deg)", transformOrigin: "right" }} />
      <div style={{ position: "absolute", bottom: 30, left: 8, width: 4, height: 18, background: "#cdd4d8" }} />
      {/* 甲板吊車 */}
      <div style={{ position: "absolute", bottom: 24, left: 58, width: 3, height: 26, background: "#cdd4d8" }} />
      <div style={{ position: "absolute", bottom: 50, left: 58, width: 26, height: 3, background: "#cdd4d8", transform: "rotate(24deg)", transformOrigin: "left" }} />
    </div>
  );
}

function Jackup() {
  return (
    <div style={{ position: "relative", width: 140, height: 96 }}>
      {/* 四支自升式樁腿（穿越船身、插入海床） */}
      {[14, 50, 90, 126].map((x, i) => (
        <div key={i} style={{ position: "absolute", bottom: -6, left: x, width: 6, height: 96, background: "repeating-linear-gradient(180deg,#d9b24a 0 5px,#8a6e22 5px 8px)" }} />
      ))}
      {/* 駁船船身（高於水面） */}
      <div style={{ position: "absolute", bottom: 30, left: 0, width: 140, height: 22, background: "linear-gradient(180deg,#6a7782,#39424a)", borderRadius: 3, boxShadow: "0 4px 8px rgba(0,0,0,.4)" }} />
      <div style={{ position: "absolute", bottom: 30, left: 0, width: 140, height: 4, background: "#e0a83e" }} />
      {/* 上部模塊/居住艙 */}
      <div style={{ position: "absolute", bottom: 52, left: 8, width: 34, height: 22, background: "linear-gradient(180deg,#eef3f4,#aebbc0)", borderRadius: "3px 3px 0 0" }}>
        {[0, 1].map((r) => (
          <div key={r} style={{ position: "absolute", top: 5 + r * 8, left: 4, right: 4, height: 4, background: "#43677a" }} />
        ))}
      </div>
      {/* 大型晶格吊車 */}
      <div style={{ position: "absolute", bottom: 52, left: 92, width: 5, height: 40, background: "#caa83e" }} />
      <div style={{ position: "absolute", bottom: 90, left: 60, width: 70, height: 4, background: "#caa83e", transform: "rotate(-22deg)", transformOrigin: "right" }} />
      <div style={{ position: "absolute", bottom: 64, left: 116, width: 2, height: 26, background: "#cdd4d8" }} />
    </div>
  );
}

export default function Vessel({ type, scale = 1, opacity = 1, style }: { type: VesselType; scale?: number; opacity?: number; style?: CSSProperties }) {
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: "bottom center", opacity, ...style }}>
      {type === "ctv" && <Ctv />}
      {type === "sov" && <Sov />}
      {type === "jackup" && <Jackup />}
    </div>
  );
}
