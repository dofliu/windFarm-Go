import { useEffect, useState } from "react";
import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { onToast } from "./toast";
import type { I18n } from "../game/systems/types";

export default function Toaster() {
  useLang();
  // 小佇列:多則通知(完工獎勵/每日任務/連對里程碑)依序各顯示 1.8 秒,不再互相蓋掉;上限 5 則防洪
  const [queue, setQueue] = useState<I18n[]>([]);
  const msg = queue[0] ?? null;

  useEffect(() => onToast((m) => setQueue((q) => (q.length >= 5 ? q : [...q, m]))), []);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setQueue((q) => q.slice(1)), 1800);
    return () => window.clearTimeout(id);
  }, [msg]);

  if (!msg) return null;
  return (
    <div style={{ position: "absolute", left: "50%", top: 84, transform: "translateX(-50%)", zIndex: 55, pointerEvents: "none" }}>
      <div style={{ background: "rgba(10,28,36,.92)", border: "1px solid rgba(214,167,84,.5)", borderRadius: 20, padding: "8px 20px", color: C.cream, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 14, boxShadow: "0 8px 22px rgba(0,0,0,.5)" }}>
        {t(msg)}
      </div>
    </div>
  );
}
