import { useEffect, useRef, useState } from "react";
import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useDialogue } from "../state/DialogueContext";
import { useTutorial } from "../state/TutorialContext";
import { CHARACTERS, portraitUrl, exprUrl } from "./characters";
import { S } from "../i18n/strings";
import { Sfx } from "../audio/sfx";

// 底部中央對話框（#7）+ 逐字字幕（#B）：文字慢慢浮現，點一下補完、再點下一句。
export default function DialogueLayer() {
  useLang();
  const { current, next } = useDialogue();
  const { running: tutorialRunning } = useTutorial();
  const full = current ? t(current.line) : "";
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!current) return;
    setShown("");
    setDone(false);
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setShown(full.slice(0, i));
      if (i >= full.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, 26);
    return () => window.clearInterval(id);
  }, [current, full]);

  const rootRef = useRef<HTMLDivElement>(null);
  const active = !!current && !tutorialRunning;
  // 對話出現時把焦點移到對話層(鍵盤/螢幕閱讀器可操作),結束後還給原本的元素
  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => {
      if (prev && prev !== document.body && document.contains(prev)) prev.focus();
    };
  }, [active]);

  if (!current || tutorialRunning) return null; // 教學進行中暫停一般對話框，改由導覽覆蓋層主導
  const ch = CHARACTERS[current.speaker];
  const img = current.expr ? exprUrl(current.speaker, current.expr) : portraitUrl(current.speaker);

  const handle = () => {
    if (!done) {
      setShown(full);
      setDone(true);
    } else {
      Sfx.click();
      next();
    }
  };

  return (
    <div ref={rootRef} data-testid="dialogue-layer" role="dialog" aria-label={`${ch ? t(ch.name) : current.speaker}`} tabIndex={-1}
      onClick={handle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
          e.preventDefault();
          handle();
        }
      }}
      style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 24, cursor: "pointer", outline: "none" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <img src={img} alt={current.speaker} style={{ height: 200, width: "auto", objectFit: "contain", objectPosition: "bottom center", filter: "drop-shadow(0 10px 20px rgba(0,0,0,.6))" }} />
        <div style={{ width: 560, maxWidth: "92vw", background: "linear-gradient(180deg, rgba(20,50,63,.97), rgba(13,36,46,.98))", border: "1px solid rgba(214,167,84,.6)", borderRadius: 10, padding: "14px 18px", boxShadow: "0 16px 40px rgba(0,0,0,.6)" }}>
          <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.goldText, marginBottom: 6 }}>{ch ? t(ch.name) : current.speaker}</div>
          {/* 逐字動畫對螢幕閱讀器隱藏,另以整句 live region 一次朗讀 */}
          <div role="status" aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{full}</div>
          <div aria-hidden="true" style={{ fontSize: 15, lineHeight: 1.6, color: C.cream, minHeight: 48 }}>
            {shown}
            {!done && <span style={{ opacity: 0.6 }}>▌</span>}
          </div>
          <div style={{ marginTop: 6, textAlign: "right", fontSize: 12, color: C.mist, opacity: done ? 1 : 0.4 }}>{done ? t(S.btn.continue) : t({ zh: "點擊快轉", en: "Tap to skip" })}</div>
        </div>
      </div>
    </div>
  );
}
