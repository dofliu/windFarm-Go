import { useState } from "react";
import { C, FONT_SERIF, primaryBg } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { Sfx } from "../audio/sfx";
import { pendingMistakes } from "../state/mastery";
import { DISC } from "./disc";
import { CAT_LABEL } from "../state/tasks";
import type { I18n } from "../game/systems/types";

// 錯題本(#mistake-log):複習答錯的情境/正解/教訓,並寫「維修檢討」反思(形成性評量)。
function topicLabel(topic: string): I18n {
  const [kind, key] = topic.split(":");
  if (kind === "disc" && DISC[key as keyof typeof DISC]) return DISC[key as keyof typeof DISC];
  if (kind === "cat" && CAT_LABEL[key as keyof typeof CAT_LABEL]) return CAT_LABEL[key as keyof typeof CAT_LABEL];
  return { zh: topic, en: topic };
}

export default function MistakeLog() {
  useLang();
  const { data, dispatch } = useGame();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const list = [...(data.mistakes ?? [])].reverse(); // 最新在上
  const pending = pendingMistakes(data.mistakes ?? []);

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: C.goldText, fontSize: 13.5, fontWeight: 900, fontFamily: FONT_SERIF }}>📒 {t({ zh: "錯題本", en: "Mistake Log" })}</span>
        {pending > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(220,100,80,.16)", border: "1px solid rgba(220,100,80,.4)", color: C.redText }}>{t({ zh: `待複習 ${pending}`, en: `${pending} to review` })}</span>}
      </div>
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: C.mist }}>{t({ zh: "目前沒有錯題 —— 維修診斷或營運任務答錯時,會自動收進這裡供複習。", en: "No mistakes yet — wrong answers in repair quizzes or Ops tasks land here for review." })}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((mk) => {
            const draft = drafts[mk.id] ?? "";
            const canSave = draft.trim().length >= 4;
            return (
              <div key={mk.id} style={{ padding: "9px 11px", borderRadius: 6, background: "rgba(255,255,255,.04)", border: `1px solid ${mk.reviewed ? "rgba(127,206,142,.4)" : "rgba(220,100,80,.32)"}`, opacity: mk.reviewed ? 0.92 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 999, background: "rgba(214,167,84,.14)", border: "1px solid rgba(214,167,84,.4)", color: C.goldText }}>{t(topicLabel(mk.topic))}</span>
                  {mk.reviewed && <span style={{ fontSize: 10.5, color: C.green }}>✓ {t({ zh: "已複習", en: "Reviewed" })}</span>}
                  <span style={{ marginLeft: "auto", fontSize: 10.5, color: C.mist2 }}>Day {mk.day}</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.cream, lineHeight: 1.5, marginBottom: 5 }}>{t(mk.question)}</div>
                <div style={{ fontSize: 12, color: C.redText, marginBottom: 2 }}>✗ {t({ zh: "你的選擇", en: "Your answer" })}：{t(mk.chosen)}</div>
                <div style={{ fontSize: 12, color: C.green, marginBottom: mk.lesson ? 4 : 0 }}>✓ {t({ zh: "正解", en: "Correct" })}：{t(mk.correct)}</div>
                {mk.lesson && <div style={{ fontSize: 11.5, color: "#cfe0e6", lineHeight: 1.5, padding: "6px 8px", borderRadius: 4, background: "rgba(95,168,217,.08)", border: "1px solid rgba(95,168,217,.22)" }}>{t(mk.lesson)}</div>}
                {mk.reviewed ? (
                  mk.reflection ? <div style={{ marginTop: 6, fontSize: 11.5, color: C.mist }}><b style={{ color: C.gold }}>{t({ zh: "我的檢討", en: "My note" })}：</b>{mk.reflection}</div> : null
                ) : (
                  <div style={{ marginTop: 7 }}>
                    <textarea
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [mk.id]: e.target.value }))}
                      placeholder={t({ zh: "寫下維修檢討:下次遇到會怎麼判斷?(至少 4 字)", en: "Write a short review: how would you handle it next time? (min 4 chars)" })}
                      rows={2}
                      style={{ width: "100%", resize: "vertical", fontSize: 12, padding: "6px 8px", borderRadius: 4, background: "rgba(0,0,0,.25)", border: "1px solid rgba(214,167,84,.3)", color: C.cream, fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                    <button
                      disabled={!canSave}
                      onClick={() => { Sfx.success(); dispatch({ type: "REVIEW_MISTAKE", id: mk.id, reflection: draft.trim() }); }}
                      style={{ marginTop: 5, padding: "6px 14px", borderRadius: 5, border: "1px solid rgba(255,236,196,.6)", background: canSave ? primaryBg() : "rgba(255,255,255,.08)", color: canSave ? C.ink : C.mist, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 12, cursor: canSave ? "pointer" : "not-allowed" }}
                    >
                      {t({ zh: "標記已複習", en: "Mark reviewed" })}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
