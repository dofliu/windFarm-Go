import { useEffect, useRef, useState } from "react";
import { C, FONT_SERIF } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { onToast } from "./toast";
import type { I18n } from "../game/systems/types";

export default function Toaster() {
  useLang();
  const [msg, setMsg] = useState<I18n | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () =>
      onToast((m) => {
        setMsg(m);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setMsg(null), 1800);
      }),
    []
  );

  if (!msg) return null;
  return (
    <div style={{ position: "absolute", left: "50%", top: 84, transform: "translateX(-50%)", zIndex: 55, pointerEvents: "none" }}>
      <div style={{ background: "rgba(10,28,36,.92)", border: "1px solid rgba(214,167,84,.5)", borderRadius: 20, padding: "8px 20px", color: C.cream, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 14, boxShadow: "0 8px 22px rgba(0,0,0,.5)" }}>
        {t(msg)}
      </div>
    </div>
  );
}
