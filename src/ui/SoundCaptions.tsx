import { useEffect, useState } from "react";
import { C } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { Captions } from "../audio/captions";
import type { I18n } from "../game/systems/types";

// 音效字幕:畫面底部小條,顯示剛播放的音效描述(role=status 也會被讀屏軟體朗讀)。
export default function SoundCaptions() {
  useLang();
  const [msg, setMsg] = useState<I18n | null>(null);
  useEffect(() => Captions.subscribe((m) => setMsg(m)), []);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 1600);
    return () => window.clearTimeout(id);
  }, [msg]);
  return (
    <div role="status" aria-live="polite" style={{ position: "absolute", left: "50%", bottom: 18, transform: "translateX(-50%)", zIndex: 56, pointerEvents: "none" }}>
      {msg && (
        <div style={{ background: "rgba(0,0,0,.82)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 6, padding: "5px 14px", color: C.cream, fontSize: 13, fontWeight: 700 }}>{t(msg)}</div>
      )}
    </div>
  );
}
