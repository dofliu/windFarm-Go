import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { useTutorial } from "../state/TutorialContext";
import { TUTORIAL_STEPS } from "./tutorialSteps";
import { exprUrl } from "./characters";
import { Sfx } from "../audio/sfx";
import type { Screen } from "../App";

const STAGE_W = 1600;
const STAGE_H = 900;
const PAD = 10; // 聚光孔在目標四周外擴的留白

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// 互動導覽覆蓋層：聚光高亮目標元件、四周變暗（孔洞仍可點），莉莉於一側給提示。
// 行動步驟達成閘門即自動前進；閱讀步驟點「下一步」前進。可隨時跳過。
export default function TutorialOverlay({ screen }: { screen: Screen }) {
  useLang();
  const { data } = useGame();
  const { running, step, total, getTarget, version, advance, skip } = useTutorial();
  const [rect, setRect] = useState<Rect | null>(null);
  const [grace, setGrace] = useState(false); // 行動步驟等待逾時 → 顯示「跳過此步」安全網，避免任何存檔狀態硬卡住
  const cur = running ? TUTORIAL_STEPS[step] : null;

  // 進入步驟時，記錄閘門是否「已達成」（重看時可能一開始就成立 → 改為手動下一步，不自動略過）。
  const entrySatisfied = useRef(false);
  useLayoutEffect(() => {
    if (!cur) return;
    entrySatisfied.current = cur.gate ? cur.gate(data, screen) : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, running]);

  // 進入新步驟時重置安全網計時；行動步驟若等待逾時則顯示「跳過此步」。
  useEffect(() => {
    setGrace(false);
    if (!cur || !cur.gate) return;
    const id = window.setTimeout(() => setGrace(true), 7000);
    return () => window.clearTimeout(id);
  }, [cur, step]);

  // 行動步驟：閘門由未達成轉為達成 → 自動前進。
  useEffect(() => {
    if (!cur || !cur.gate) return;
    if (entrySatisfied.current) return; // 進入時已成立 → 等玩家手動下一步
    if (cur.gate(data, screen)) {
      const id = window.setTimeout(() => advance(), 280); // 給玩家看一眼動作結果
      return () => window.clearTimeout(id);
    }
  }, [cur, data, screen, advance]);

  // 量測目標位置（換算為 1600×900 舞台座標）；以 rAF 持續跟隨（抽屜捲動/航行動畫亦同步）。
  useEffect(() => {
    if (!cur) {
      setRect(null);
      return;
    }
    let raf = 0;
    const measure = () => {
      raf = window.requestAnimationFrame(measure);
      const el = cur.target ? getTarget(cur.target) : null;
      const stage = document.getElementById("wfg-stage");
      if (!el || !stage) {
        setRect((r) => (r === null ? r : null));
        return;
      }
      const sr = stage.getBoundingClientRect();
      const scale = sr.width / STAGE_W || 1;
      const r = el.getBoundingClientRect();
      const next: Rect = {
        x: (r.left - sr.left) / scale - PAD,
        y: (r.top - sr.top) / scale - PAD,
        w: r.width / scale + PAD * 2,
        h: r.height / scale + PAD * 2,
      };
      setRect((prev) => (prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5 && Math.abs(prev.w - next.w) < 0.5 && Math.abs(prev.h - next.h) < 0.5 ? prev : next));
    };
    measure();
    return () => window.cancelAnimationFrame(raf);
  }, [cur, getTarget, version, step]);

  if (!cur) return null;

  const gated = !!cur.gate;
  const manualNext = !gated || entrySatisfied.current; // 顯示「下一步」鈕的情形
  const hasHole = !!rect;

  // 氣泡位置：孔洞在上半 → 氣泡置於下方；在下半 → 置於上方；無孔洞 → 置中。
  const holeCenterY = rect ? rect.y + rect.h / 2 : STAGE_H / 2;
  const bubbleTop = !hasHole ? STAGE_H / 2 - 150 : holeCenterY < STAGE_H / 2 ? STAGE_H - 250 : 70;

  const dim = "rgba(6,14,18,.74)";
  const onDimClick = () => {
    if (manualNext) advance(); // 閱讀步驟：點暗區也可前進；行動步驟需實際操作
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none" }}>
      {/* 變暗遮罩：有孔洞 → 四片框住孔洞（孔洞可點）；無孔洞 → 整片（可點前進） */}
      {hasHole && rect ? (
        <>
          <div onClick={onDimClick} style={{ position: "absolute", left: 0, top: 0, width: STAGE_W, height: Math.max(0, rect.y), background: dim, pointerEvents: "auto" }} />
          <div onClick={onDimClick} style={{ position: "absolute", left: 0, top: rect.y + rect.h, width: STAGE_W, height: Math.max(0, STAGE_H - (rect.y + rect.h)), background: dim, pointerEvents: "auto" }} />
          <div onClick={onDimClick} style={{ position: "absolute", left: 0, top: rect.y, width: Math.max(0, rect.x), height: rect.h, background: dim, pointerEvents: "auto" }} />
          <div onClick={onDimClick} style={{ position: "absolute", left: rect.x + rect.w, top: rect.y, width: Math.max(0, STAGE_W - (rect.x + rect.w)), height: rect.h, background: dim, pointerEvents: "auto" }} />
          {/* 高亮框（不擋點擊） */}
          <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: 8, border: `2px solid ${C.gold}`, boxShadow: `0 0 0 2px rgba(214,167,84,.35), 0 0 22px 6px rgba(214,167,84,.45)`, pointerEvents: "none", animation: "shimmer 1.4s ease-in-out infinite" }} />
          {!manualNext && (
            <div style={{ position: "absolute", left: rect.x + rect.w / 2 - 60, top: rect.y + rect.h + 6, width: 120, textAlign: "center", color: C.goldText, fontSize: 12.5, fontWeight: 700, pointerEvents: "none", textShadow: "0 1px 4px rgba(0,0,0,.8)" }}>
              👆 {t({ zh: "點這裡", en: "Tap here" })}
            </div>
          )}
        </>
      ) : (
        <div onClick={onDimClick} style={{ position: "absolute", inset: 0, background: dim, pointerEvents: "auto" }} />
      )}

      {/* 莉莉 + 提示氣泡 */}
      <div style={{ position: "absolute", left: "50%", top: bubbleTop, transform: "translateX(-50%)", display: "flex", alignItems: "flex-end", gap: 10, pointerEvents: "none", maxWidth: 760 }}>
        <img src={exprUrl("narrator_girl", cur.expr ?? "smile")} alt="Lily" style={{ height: 168, width: "auto", objectFit: "contain", filter: "drop-shadow(0 10px 20px rgba(0,0,0,.6))" }} />
        <div style={{ pointerEvents: "auto", width: 520, background: "linear-gradient(180deg, rgba(20,50,63,.98), rgba(13,36,46,.99))", border: "1px solid rgba(214,167,84,.7)", borderRadius: 12, padding: "14px 18px", boxShadow: "0 16px 44px rgba(0,0,0,.6)" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.goldText }}>{t({ zh: "莉莉", en: "Lily" })}</span>
            <span style={{ marginLeft: 8, fontSize: 11, color: C.mist2 }}>{t({ zh: "新手教學", en: "Tutorial" })} {step + 1}/{total}</span>
            <button onClick={() => { Sfx.click(); skip(); }} style={{ marginLeft: "auto", background: "transparent", border: "none", color: C.mist2, fontSize: 12, cursor: "pointer" }}>
              {t({ zh: "跳過教學 ✕", en: "Skip ✕" })}
            </button>
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.65, color: C.cream, minHeight: 44 }}>{t(cur.text)}</div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
            {manualNext ? (
              <button onClick={() => { Sfx.click(); advance(); }} style={{ padding: "7px 20px", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: "linear-gradient(180deg,#e8c074,#d9a441)", color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 13.5, cursor: "pointer" }}>
                {step + 1 >= total ? t({ zh: "完成 ✓", en: "Done ✓" }) : t({ zh: "下一步 ▶", en: "Next ▶" })}
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: C.mist2 }}>{t({ zh: "（照著做即可繼續）", en: "(do the action to continue)" })}</span>
                {grace && (
                  <button onClick={() => { Sfx.click(); advance(); }} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(214,167,84,.5)", background: "rgba(15,40,50,.82)", color: C.cream, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
                    {t({ zh: "跳過此步 ▶", en: "Skip step ▶" })}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
