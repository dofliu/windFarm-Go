import { useState } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { getProfile } from "../state/profile";
import { Sfx } from "../audio/sfx";
import { cloudEnabled, fetchClassProgress, type ClassRow } from "../cloud/api";

type Status = "form" | "loading" | "ok" | "error";

// 教師檢視（階段 4）：輸入班級碼 + 教師碼 → 雲端唯讀拉取全班進度。教師碼於後端(Code.gs)驗證。
export default function TeacherModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLang();
  const profile = getProfile();
  const [classCode, setClassCode] = useState(profile?.classCode || "");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("form");
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [err, setErr] = useState("");
  if (!open) return null;

  const reset = () => { setStatus("form"); setRows([]); setErr(""); };
  const close = () => { reset(); setCode(""); onClose(); };

  const submit = async () => {
    if (!classCode.trim() || !code.trim()) { setErr(t({ zh: "請輸入班級碼與教師碼", en: "Enter class code & teacher code" })); return; }
    if (!cloudEnabled()) { setErr(t({ zh: "尚未設定雲端後端,無法檢視。", en: "Cloud backend not configured." })); return; }
    Sfx.click();
    setStatus("loading"); setErr("");
    const r = await fetchClassProgress(classCode.trim(), code.trim());
    if (!r) { setStatus("error"); setErr(t({ zh: "連線失敗,請稍後再試。", en: "Connection failed, try again." })); return; }
    if (!r.ok) { setStatus("error"); setErr(r.err === "bad-code" ? t({ zh: "教師碼不正確。", en: "Incorrect teacher code." }) : t({ zh: "查詢失敗。", en: "Query failed." })); return; }
    setRows(r.rows || []);
    setStatus("ok");
  };

  const fmtDate = (ms: number): string => {
    if (!ms) return "—";
    try {
      return new Date(ms).toLocaleString();
    } catch {
      return "—";
    }
  };

  const th: React.CSSProperties = { textAlign: "left", padding: "7px 8px", color: C.gold, fontSize: 11.5, fontWeight: 700, borderBottom: "1px solid rgba(214,167,84,.4)", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "7px 8px", color: C.cream, fontSize: 12.5, borderBottom: "1px solid rgba(255,255,255,.06)", fontVariantNumeric: "tabular-nums" };

  return (
    <div onClick={close} style={{ position: "absolute", inset: 0, zIndex: 65, background: "rgba(6,16,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panel, width: status === "ok" ? 720 : 460, maxHeight: 760, overflow: "auto", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "linear-gradient(180deg, rgba(217,164,65,.22), rgba(217,164,65,.05))", borderBottom: "1px solid rgba(214,167,84,.35)" }}>
          <span style={{ fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, color: C.cream }}>👩‍🏫 {t({ zh: "教師檢視 · 班級進度", en: "Instructor · Class Progress" })}</span>
          <span style={{ marginLeft: "auto", cursor: "pointer", color: C.mist, fontSize: 18 }} onClick={close}>✕</span>
        </div>

        <div style={{ padding: "16px" }}>
          {status !== "ok" && (
            <>
              <div style={{ fontSize: 12.5, color: C.mist, lineHeight: 1.6, marginBottom: 12 }}>
                {t({ zh: "輸入班級碼與教師碼,即可唯讀檢視該班每位學生的最新進度(分數、天數、可用率、發電量)。", en: "Enter the class code and teacher code to view each student's latest progress (read-only)." })}
              </div>
              <label style={{ fontSize: 13, color: C.cream, fontWeight: 700, display: "block" }}>{t({ zh: "班級碼", en: "Class code" })}</label>
              <input value={classCode} onChange={(e) => { setClassCode(e.target.value); setErr(""); }} maxLength={12} style={{ width: "100%", padding: "10px 12px", marginTop: 6, borderRadius: 6, background: "rgba(8,22,28,.8)", border: "1px solid rgba(214,167,84,.4)", color: C.cream, fontSize: 15, outline: "none" }} />
              <label style={{ fontSize: 13, color: C.cream, fontWeight: 700, display: "block", marginTop: 14 }}>{t({ zh: "教師碼", en: "Teacher code" })}</label>
              <input value={code} type="password" onChange={(e) => { setCode(e.target.value); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} style={{ width: "100%", padding: "10px 12px", marginTop: 6, borderRadius: 6, background: "rgba(8,22,28,.8)", border: "1px solid rgba(214,167,84,.4)", color: C.cream, fontSize: 15, outline: "none" }} />
              {err && <div style={{ color: C.redText, fontSize: 12.5, marginTop: 10 }}>{err}</div>}
              <button disabled={status === "loading"} onClick={submit} style={{ width: "100%", marginTop: 18, padding: "12px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(C.gold), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, cursor: status === "loading" ? "wait" : "pointer", opacity: status === "loading" ? 0.7 : 1 }}>
                {status === "loading" ? t({ zh: "查詢中…", en: "Loading…" }) : t({ zh: "查詢班級進度", en: "View progress" })}
              </button>
            </>
          )}

          {status === "ok" && (
            <>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <div style={{ color: C.goldText, fontWeight: 900, fontFamily: FONT_SERIF, fontSize: 15 }}>{t({ zh: "班級", en: "Class" })} {classCode} · {rows.length} {t({ zh: "位學生", en: "students" })}</div>
                <button onClick={reset} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 5, border: "1px solid rgba(214,167,84,.5)", background: "rgba(15,40,50,.82)", color: C.cream, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t({ zh: "← 重新查詢", en: "← New query" })}</button>
              </div>
              {rows.length === 0 ? (
                <div style={{ color: C.mist, fontSize: 13, padding: "24px 0", textAlign: "center" }}>{t({ zh: "此班尚無學生存檔資料。", en: "No student saves for this class yet." })}</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      <th style={th}>{t({ zh: "學號", en: "ID" })}</th>
                      <th style={th}>{t({ zh: "暱稱", en: "Name" })}</th>
                      <th style={{ ...th, textAlign: "right" }}>{t({ zh: "績效分", en: "Score" })}</th>
                      <th style={{ ...th, textAlign: "right" }}>{t({ zh: "天數", en: "Days" })}</th>
                      <th style={{ ...th, textAlign: "right" }}>{t({ zh: "可用率", en: "Avail." })}</th>
                      <th style={{ ...th, textAlign: "right" }}>{t({ zh: "發電(MWh)", en: "Gen (MWh)" })}</th>
                      <th style={th}>{t({ zh: "更新時間", en: "Updated" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.studentId + i}>
                        <td style={{ ...td, color: C.mist }}>{i + 1}</td>
                        <td style={td}>{r.studentId}</td>
                        <td style={td}>{r.nickname || "—"}</td>
                        <td style={{ ...td, textAlign: "right", color: C.goldText, fontWeight: 800 }}>{(r.score || 0).toLocaleString()}</td>
                        <td style={{ ...td, textAlign: "right" }}>{Math.max(0, (r.day || 0) - 21)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{r.availability || 0}%</td>
                        <td style={{ ...td, textAlign: "right" }}>{(r.generation || 0).toLocaleString()}</td>
                        <td style={{ ...td, color: C.mist2, fontSize: 11 }}>{fmtDate(r.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
