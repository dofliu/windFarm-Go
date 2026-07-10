import { useState } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { useGame } from "../state/GameContext";
import { Sfx } from "../audio/sfx";
import { toast } from "./toast";
import { CAT_LABEL, type TaskTemplate } from "../state/tasks";
import { buildExam, gradeExam, isCorrect, goodChoiceOf, EXAM_LENGTHS, type ExamResult } from "../state/exam";
import { loadRecord, persistRecord } from "../state/records";

type Phase = "intro" | "quiz" | "result";

// 獨立測驗模式(#exam):固定題數、無提示、單次作答的正式評量。結束才揭曉總分/各類別對錯與錯題覆盤。
// 答題計入知識點掌握度(RECORD_EXAM,不動 xp/streak);錯題收入錯題本供主動回想;最佳成績存學習紀錄。
export default function ExamModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLang();
  const { data, dispatch } = useGame();
  const [phase, setPhase] = useState<Phase>("intro");
  const [items, setItems] = useState<TaskTemplate[]>([]);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [best, setBest] = useState<number>(() => loadRecord().bestExam ?? 0);
  if (!open) return null;

  const start = (n: number) => {
    Sfx.click();
    const qs = buildExam(Date.now(), n);
    setItems(qs);
    setPicks(new Array(qs.length).fill(-1));
    setIdx(0);
    setResult(null);
    setPhase("quiz");
  };

  const finish = (finalPicks: number[]) => {
    const res = gradeExam(items, finalPicks);
    setResult(res);
    setPhase("result");
    (res.pct >= 60 ? Sfx.success : Sfx.error)();
    // 計入掌握度 + 錯題本(批次;不動 xp/streak → 評量不干擾遊戲經濟)
    const answers = items.map((tpl, i) => ({ keys: [`cat:${tpl.cat}`], correct: isCorrect(tpl, finalPicks[i] ?? -1) }));
    const mistakes = res.wrong.map((w) => {
      const good = goodChoiceOf(w.tpl);
      return {
        topic: `cat:${w.tpl.cat}`,
        question: w.tpl.scenario,
        chosen: w.picked >= 0 ? w.tpl.choices[w.picked].label : { zh: "(未作答)", en: "(skipped)" },
        correct: good?.label ?? { zh: "—", en: "—" },
        lesson: good?.feedback,
        day: data.day,
      };
    });
    dispatch({ type: "RECORD_EXAM", answers, mistakes });
    // 最佳測驗成績(只增不減)→ 學習紀錄
    if (res.pct > best) {
      const rec = loadRecord();
      persistRecord({ ...rec, bestExam: Math.max(rec.bestExam ?? 0, res.pct), updatedAt: Date.now() });
      setBest(res.pct);
      toast({ zh: `📈 測驗新高 ${res.pct}%!`, en: `📈 New exam best ${res.pct}%!` });
    }
  };

  const answer = (choiceIdx: number) => {
    Sfx.click();
    const next = [...picks];
    next[idx] = choiceIdx;
    setPicks(next);
    if (idx + 1 < items.length) setIdx(idx + 1);
    else finish(next);
  };

  const cur = items[idx];

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 66, background: "rgba(6,16,22,.62)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="wfg-modal-panel" style={{ ...panel, width: 560, maxHeight: 780, overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)" }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>📝 {t({ zh: "獨立測驗模式", en: "Exam Mode" })}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        <div style={{ padding: "16px" }}>
          {/* ── 開始頁 ── */}
          {phase === "intro" && (
            <>
              <div style={{ fontSize: 12.5, color: C.mist, lineHeight: 1.7, marginBottom: 14 }}>
                {t({ zh: "從判斷型題庫抽出跨科別考題,做一次正式評量:", en: "A formal assessment drawing cross-discipline judgment questions:" })}
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  <li>{t({ zh: "作答當下不給提示、不揭示對錯", en: "No hints or feedback while answering" })}</li>
                  <li>{t({ zh: "每題單次作答,答完自動進下一題", en: "One attempt per question, auto-advances" })}</li>
                  <li>{t({ zh: "結束才公布總分、各類別對錯與錯題覆盤", en: "Score, per-category breakdown & review at the end" })}</li>
                  <li>{t({ zh: "計入知識點掌握度與錯題本(不影響遊戲分數)", en: "Feeds mastery & mistake log (no game-score impact)" })}</li>
                </ul>
              </div>
              {best > 0 && <div style={{ fontSize: 12, color: C.goldText, marginBottom: 12 }}>🏅 {t({ zh: "目前最佳", en: "Best so far" })}: {best}%</div>}
              <div style={{ fontSize: 12.5, color: C.cream, fontWeight: 700, marginBottom: 8 }}>{t({ zh: "選擇題數", en: "Choose length" })}</div>
              <div style={{ display: "flex", gap: 10 }}>
                {EXAM_LENGTHS.map((n) => (
                  <button key={n} onClick={() => start(n)} style={{ flex: 1, padding: "14px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
                    {n} {t({ zh: "題", en: "Qs" })}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── 作答頁 ── */}
          {phase === "quiz" && cur && (
            <>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: C.gold, fontWeight: 800 }}>{t({ zh: "第", en: "Q" })} {idx + 1} / {items.length}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: C.mist2, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(214,167,84,.3)" }}>{t(CAT_LABEL[cur.cat])}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,.1)", overflow: "hidden", marginBottom: 14 }}>
                <div style={{ width: `${(idx / items.length) * 100}%`, height: "100%", background: primaryBg() }} />
              </div>
              <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 15, color: C.cream, marginBottom: 6 }}>{t(cur.title)}</div>
              <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.6, marginBottom: 14 }}>{t(cur.scenario)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cur.choices.map((c, i) => (
                  <button key={i} onClick={() => answer(i)} style={{ textAlign: "left", padding: "11px 13px", borderRadius: 6, border: "1px solid rgba(214,167,84,.3)", background: "rgba(255,255,255,.04)", color: C.cream, fontSize: 13.5, lineHeight: 1.5, cursor: "pointer" }}>
                    <span style={{ color: C.gold, fontWeight: 900, marginRight: 8 }}>{String.fromCharCode(65 + i)}</span>{t(c.label)}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── 結果頁 ── */}
          {phase === "result" && result && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: `1px solid ${result.grade.color}55`, marginBottom: 14 }}>
                <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 34, color: result.grade.color, lineHeight: 1 }}>{result.pct}%</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: result.grade.color }}>{t(result.grade.label)}</div>
                  <div style={{ fontSize: 12, color: C.mist, marginTop: 2 }}>{t({ zh: "答對", en: "Correct" })} {result.correct} / {result.total}{result.pct >= best ? ` · 🏅 ${t({ zh: "個人最佳", en: "personal best" })}` : ""}</div>
                </div>
              </div>

              {/* 各類別對錯(掌握度覆盤) */}
              <div style={{ fontSize: 12.5, color: C.cream, fontWeight: 700, marginBottom: 8 }}>{t({ zh: "各類別表現", en: "By category" })}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {Object.keys(result.byCat).map((cat) => {
                  const cell = result.byCat[cat];
                  const pct = cell.n ? Math.round((cell.correct / cell.n) * 100) : 0;
                  const col = pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red;
                  return (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 92, flex: "none", fontSize: 12, color: C.mist }}>{t(CAT_LABEL[cat as keyof typeof CAT_LABEL] ?? { zh: cat, en: cat })}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: col }} />
                      </div>
                      <span style={{ width: 54, flex: "none", textAlign: "right", fontSize: 11.5, color: col, fontVariantNumeric: "tabular-nums" }}>{cell.correct}/{cell.n}</span>
                    </div>
                  );
                })}
              </div>

              {/* 錯題覆盤:揭示正解與教訓(已同步收入錯題本) */}
              {result.wrong.length > 0 && (
                <>
                  <div style={{ fontSize: 12.5, color: C.cream, fontWeight: 700, marginBottom: 8 }}>📕 {t({ zh: "錯題覆盤", en: "Review misses" })} ({result.wrong.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                    {result.wrong.map((w, i) => {
                      const good = goodChoiceOf(w.tpl);
                      return (
                        <div key={i} style={{ padding: "9px 11px", borderRadius: 6, background: "rgba(220,100,80,.08)", border: "1px solid rgba(220,100,80,.25)" }}>
                          <div style={{ fontSize: 12.5, color: C.cream, fontWeight: 700, marginBottom: 3 }}>{t(w.tpl.title)}</div>
                          <div style={{ fontSize: 11.5, color: C.mist, lineHeight: 1.5, marginBottom: 4 }}>{t(w.tpl.scenario)}</div>
                          <div style={{ fontSize: 11.5, color: C.green, lineHeight: 1.5 }}>✓ {t({ zh: "正解", en: "Correct" })}: {t(good?.label ?? { zh: "—", en: "—" })}</div>
                          {good?.feedback && <div style={{ fontSize: 11, color: C.mist2, lineHeight: 1.5, marginTop: 2 }}>{t(good.feedback)}</div>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <div style={{ fontSize: 11, color: C.mist2, marginBottom: 12 }}>{t({ zh: "錯題已收入「錯題本」,可到個人檔案主動回想複習。", en: "Missed items were added to your Mistake Log for active-recall review in your profile." })}</div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setPhase("intro")} style={{ flex: 1, padding: "12px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 14, cursor: "pointer" }}>{t({ zh: "再測一次", en: "Retake" })}</button>
                <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 6, border: "1px solid rgba(214,167,84,.5)", background: "rgba(15,40,50,.82)", color: C.cream, fontFamily: FONT_SERIF, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{t({ zh: "關閉", en: "Close" })}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
