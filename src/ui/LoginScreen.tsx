import { useMemo, useState } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { setProfile, listAccounts, upsertAccount, removeAccount, touchAccount, findAccount, verifyPin, hashPin, validPinFormat, normClass, normId, normNick, idOf, displayName, type Account } from "../state/profile";
import { Sfx } from "../audio/sfx";
import { CLOUD_FIRST } from "../cloud/sheet";
import { cloudEnabled, isOnline, registerAccount, loginAccount } from "../cloud/api";

type Mode = "picker" | "pin" | "create" | "remote";
const useCloud = (): boolean => CLOUD_FIRST && cloudEnabled();

// 開場登入（強制 PIN）：本機帳號清單 → 選擇帳號輸入 PIN，或新建帳號（暱稱+班級碼+PIN）。
// 同一台教室電腦可保有多位學生帳號，各自獨立存檔與紀錄。另保留「訪客」單機試玩（不計排行/紀錄）。
export default function LoginScreen({ onDone }: { onDone: () => void }) {
  useLang();
  const accounts = useMemo(() => listAccounts(), []);
  const [mode, setMode] = useState<Mode>(accounts.length ? "picker" : "create");
  const [sel, setSel] = useState<Account | null>(null);

  // 新建欄位
  const [studentId, setStudentId] = useState("");
  const [classCode, setClassCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const field: React.CSSProperties = {
    width: "100%", padding: "11px 14px", marginTop: 6, borderRadius: 6,
    background: "rgba(8,22,28,.8)", border: "1px solid rgba(214,167,84,.4)",
    color: C.cream, fontSize: 15, outline: "none",
  };
  const label: React.CSSProperties = { fontSize: 13, color: C.cream, fontWeight: 700, display: "block", marginTop: 14 };

  const finish = (p: { studentId: string; classCode: string; nickname: string; pinHash: string; guest?: boolean }) => {
    setProfile(p);
    onDone();
  };

  const enterGuest = () => { Sfx.click(); finish({ studentId: "GUEST", nickname: "訪客", classCode: "", pinHash: "", guest: true }); };

  // 選定本機帳號 → 通關碼驗證（雲端為主時由後端驗證，離線則退回本機）
  const startPin = (a: Account) => { Sfx.click(); setSel(a); setPin(""); setErr(""); setMode("pin"); };
  const submitPin = async () => {
    if (!sel || busy) return;
    const typedHash = hashPin(pin, idOf(sel));
    if (useCloud() && isOnline()) {
      setBusy(true);
      const r = await loginAccount({ studentId: sel.studentId, classCode: sel.classCode, pinHash: typedHash });
      setBusy(false);
      if (r) { // 後端給了明確結果
        if (!r.ok) { Sfx.error(); setErr(r.err === "no-account" ? t({ zh: "雲端查無此帳號", en: "Account not found in cloud" }) : t({ zh: "通關碼不正確", en: "Incorrect passcode" })); return; }
        const nick = r.nickname || sel.nickname;
        Sfx.success();
        const now = Date.now();
        upsertAccount({ ...sel, nickname: nick, pinHash: typedHash, lastSeen: now });
        finish({ studentId: sel.studentId, classCode: sel.classCode, nickname: nick, pinHash: typedHash });
        return;
      }
      // r === null → 連線失敗 → 退回本機離線驗證
    }
    if (!verifyPin(sel, pin)) { Sfx.error(); setErr(t({ zh: "通關碼不正確", en: "Incorrect passcode" })); return; }
    Sfx.success();
    const now = Date.now();
    touchAccount(idOf(sel), now);
    finish({ studentId: sel.studentId, classCode: sel.classCode, nickname: sel.nickname, pinHash: sel.pinHash });
  };

  // 跨裝置/新裝置登入：以學號+班級碼+通關碼向雲端驗證（不需本機快取）
  const submitRemote = async () => {
    if (busy) return;
    const sid = normId(studentId), cls = normClass(classCode);
    if (!sid || !cls || !pin) { setErr(t({ zh: "請輸入學號、班級碼與通關碼", en: "Enter student ID, class code & passcode" })); return; }
    const id = idOf({ studentId: sid, classCode: cls });
    const typedHash = hashPin(pin, id);
    if (!isOnline()) { setErr(t({ zh: "跨裝置登入需要連線", en: "Cross-device login needs a connection" })); return; }
    setBusy(true);
    const r = await loginAccount({ studentId: sid, classCode: cls, pinHash: typedHash });
    setBusy(false);
    if (!r) { Sfx.error(); setErr(t({ zh: "連線失敗，請稍後再試", en: "Connection failed, try again" })); return; }
    if (!r.ok) { Sfx.error(); setErr(r.err === "no-account" ? t({ zh: "查無此帳號，請改用「新建帳號」", en: "No such account — create one instead" }) : t({ zh: "通關碼不正確", en: "Incorrect passcode" })); return; }
    Sfx.success();
    const now = Date.now();
    const nick = r.nickname || "";
    upsertAccount({ studentId: sid, classCode: cls, nickname: nick, pinHash: typedHash, createdAt: now, lastSeen: now });
    finish({ studentId: sid, classCode: cls, nickname: nick, pinHash: typedHash });
  };

  // 新建帳號（雲端為主時向後端註冊；離線或未啟用則只建本機）
  const submitCreate = async () => {
    if (busy) return;
    const sid = normId(studentId), cls = normClass(classCode), nick = normNick(nickname);
    if (!sid) { setErr(t({ zh: "請輸入學號", en: "Enter a student ID" })); return; }
    if (!cls) { setErr(t({ zh: "請輸入班級碼", en: "Enter a class code" })); return; }
    if (!validPinFormat(pin)) { setErr(t({ zh: "通關碼需為 4–6 位數字", en: "Passcode must be 4–6 digits" })); return; }
    if (pin !== pin2) { setErr(t({ zh: "兩次通關碼不一致", en: "Passcodes don't match" })); return; }
    const id = idOf({ studentId: sid, classCode: cls });
    if (findAccount(id)) { Sfx.error(); setErr(t({ zh: "此班級已有相同學號，請改用「選擇帳號」登入", en: "That student ID already exists in this class — log in from the list" })); setMode("picker"); return; }
    const pinHash = hashPin(pin, id);
    if (useCloud()) {
      if (!isOnline()) { setErr(t({ zh: "建立帳號需要連線", en: "Creating an account needs a connection" })); return; }
      setBusy(true);
      const r = await registerAccount({ studentId: sid, classCode: cls, nickname: nick, pinHash });
      setBusy(false);
      if (!r) { Sfx.error(); setErr(t({ zh: "連線失敗，請稍後再試", en: "Connection failed, try again" })); return; }
      if (!r.ok) {
        Sfx.error();
        if (r.err === "exists") { setErr(t({ zh: "雲端已有此學號，請改用「我在別台登入過」", en: "That ID exists in cloud — use cross-device login" })); setMode("remote"); return; }
        setErr(t({ zh: "建立失敗，請稍後再試", en: "Create failed, try again" })); return;
      }
    }
    Sfx.success();
    const now = Date.now();
    const acct: Account = { studentId: sid, classCode: cls, nickname: nick, pinHash, createdAt: now, lastSeen: now };
    upsertAccount(acct);
    finish({ studentId: sid, classCode: cls, nickname: nick, pinHash });
  };

  const del = (a: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t({ zh: `確定要從這台裝置移除「${displayName(a)}」？（本機存檔保留，可重新登入取回）`, en: `Remove "${displayName(a)}" from this device? (Local save is kept; re-login restores it.)` }))) return;
    Sfx.click();
    removeAccount(idOf(a));
    setMode(listAccounts().length ? "picker" : "create");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 40%, #14242d, #070d11 80%)", fontFamily: "'Noto Sans TC', sans-serif" }}>
      <div style={{ ...panel, width: 420, padding: 0, overflow: "hidden" }}>
        <div style={{ textAlign: "center", padding: "16px 0", background: "linear-gradient(180deg,#e8c074,#cf9a35)", color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 20 }}>
          {t({ zh: "離岸風場・運維傳說", en: "Offshore O&M Legend" })}
        </div>
        <div style={{ padding: "20px 22px" }}>

          {/* 帳號清單 */}
          {mode === "picker" && (
            <>
              <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.6, marginBottom: 12 }}>
                {t({ zh: "選擇你的帳號並輸入 PIN，或新建帳號。每位使用者的存檔與學習紀錄各自獨立。", en: "Pick your account & enter your PIN, or create one. Each user's save & records are separate." })}
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 10 }}>
                {accounts.map((a) => (
                  <div key={idOf(a)} onClick={() => startPin(a)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(214,167,84,.25)", marginBottom: 8, cursor: "pointer" }}>
                    <div style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: "radial-gradient(circle at 50% 35%, #20586a, #0f3140)", border: "2px solid rgba(214,167,84,.7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SERIF, fontWeight: 900, color: C.goldText }}>{displayName(a).slice(0, 1)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: C.cream, fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName(a)}</div>
                      <div style={{ color: C.mist, fontSize: 11.5 }}>{t({ zh: "班級", en: "Class" })} {a.classCode} · {t({ zh: "學號", en: "ID" })} {a.studentId} · 🔒</div>
                    </div>
                    <button title={t({ zh: "移除", en: "Remove" })} onClick={(e) => del(a, e)} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(220,100,80,.4)", background: "rgba(220,100,80,.14)", color: C.redText, fontSize: 13, fontWeight: 900, cursor: "pointer", padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => { Sfx.click(); setStudentId(""); setClassCode(""); setNickname(""); setPin(""); setPin2(""); setErr(""); setMode("create"); }} style={{ width: "100%", padding: "12px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(C.gold), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, cursor: "pointer" }}>
                ＋ {t({ zh: "新建帳號", en: "New account" })}
              </button>
              {useCloud() && (
                <div onClick={() => { Sfx.click(); setStudentId(""); setClassCode(""); setPin(""); setErr(""); setMode("remote"); }} style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.mist, cursor: "pointer", textDecoration: "underline" }}>{t({ zh: "我在別台登入過 / 新裝置登入", en: "Logged in elsewhere / new device" })}</div>
              )}
            </>
          )}

          {/* 跨裝置/新裝置登入（雲端） */}
          {mode === "remote" && (
            <>
              <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.6, marginBottom: 6 }}>
                {t({ zh: "用學號、班級碼與通關碼從雲端登入（適用新裝置或換電腦）。", en: "Log in from the cloud with your student ID, class code & passcode (for a new device)." })}
              </div>
              <label style={label}>{t({ zh: "學號", en: "Student ID" })}</label>
              <input style={field} value={studentId} maxLength={20} onChange={(e) => { setStudentId(e.target.value); setErr(""); }} placeholder={t({ zh: "例如：S1090123", en: "e.g. S1090123" })} />
              <label style={label}>{t({ zh: "班級碼", en: "Class code" })}</label>
              <input style={field} value={classCode} maxLength={12} onChange={(e) => { setClassCode(e.target.value); setErr(""); }} placeholder={t({ zh: "教師提供", en: "from teacher" })} />
              <label style={label}>{t({ zh: "通關碼", en: "Passcode" })}</label>
              <input style={field} type="password" inputMode="numeric" value={pin} maxLength={6} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") submitRemote(); }} placeholder="••••" />
              {err && <div style={{ color: C.redText, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
              <button disabled={busy} onClick={submitRemote} style={{ width: "100%", marginTop: 18, padding: "13px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(C.gold), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 17, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>{busy ? t({ zh: "登入中…", en: "Logging in…" }) : t({ zh: "雲端登入", en: "CLOUD LOG IN" })}</button>
              <div onClick={() => { Sfx.click(); setErr(""); setMode(listAccounts().length ? "picker" : "create"); }} style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.mist, cursor: "pointer", textDecoration: "underline" }}>{t({ zh: "← 返回", en: "← Back" })}</div>
            </>
          )}

          {/* PIN 驗證 */}
          {mode === "pin" && sel && (
            <>
              <div style={{ fontSize: 14, color: C.cream, marginBottom: 4 }}>{t({ zh: "歡迎回來", en: "Welcome back" })}，<b style={{ color: C.goldText }}>{displayName(sel)}</b></div>
              <div style={{ fontSize: 12, color: C.mist, marginBottom: 8 }}>{t({ zh: "班級", en: "Class" })} {sel.classCode} · {t({ zh: "學號", en: "ID" })} {sel.studentId}</div>
              <label style={label}>{t({ zh: "輸入通關碼", en: "Enter passcode" })}</label>
              <input style={field} type="password" inputMode="numeric" value={pin} autoFocus maxLength={6} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") submitPin(); }} placeholder="••••" />
              {err && <div style={{ color: C.redText, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
              <button disabled={busy} onClick={submitPin} style={{ width: "100%", marginTop: 18, padding: "13px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(C.gold), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 17, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>{busy ? t({ zh: "登入中…", en: "Logging in…" }) : t({ zh: "登 入", en: "LOG IN" })}</button>
              <div onClick={() => { Sfx.click(); setErr(""); setMode("picker"); }} style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.mist, cursor: "pointer", textDecoration: "underline" }}>{t({ zh: "← 返回帳號清單", en: "← Back to accounts" })}</div>
            </>
          )}

          {/* 新建帳號 */}
          {mode === "create" && (
            <>
              <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.6, marginBottom: 6 }}>
                {t({ zh: "建立帳號：以學號為帳號、班級碼分群，可另取暱稱。通關碼用於登入與保護你的存檔/紀錄，請牢記（無找回機制）。", en: "Create an account: student ID as login, class code for grouping, optional nickname. The passcode guards your save/records — remember it (no recovery)." })}
              </div>
              <label style={label}>{t({ zh: "學號", en: "Student ID" })}</label>
              <input style={field} value={studentId} maxLength={20} onChange={(e) => { setStudentId(e.target.value); setErr(""); }} placeholder={t({ zh: "例如：S1090123", en: "e.g. S1090123" })} />
              <label style={label}>{t({ zh: "班級碼", en: "Class code" })}</label>
              <input style={field} value={classCode} maxLength={12} onChange={(e) => { setClassCode(e.target.value); setErr(""); }} placeholder={t({ zh: "教師提供", en: "from teacher" })} />
              <label style={label}>{t({ zh: "暱稱（選填）", en: "Nickname (optional)" })}</label>
              <input style={field} value={nickname} maxLength={16} onChange={(e) => { setNickname(e.target.value); setErr(""); }} placeholder={t({ zh: "顯示用，留空則用學號", en: "display name; defaults to ID" })} />
              <label style={label}>{t({ zh: "設定通關碼（4–6 位數字）", en: "Set passcode (4–6 digits)" })}</label>
              <input style={field} type="password" inputMode="numeric" value={pin} maxLength={6} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }} placeholder="••••" />
              <label style={label}>{t({ zh: "再次輸入通關碼", en: "Confirm passcode" })}</label>
              <input style={field} type="password" inputMode="numeric" value={pin2} maxLength={6} onChange={(e) => { setPin2(e.target.value.replace(/\D/g, "")); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") submitCreate(); }} placeholder="••••" />
              {err && <div style={{ color: C.redText, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
              <button disabled={busy} onClick={submitCreate} style={{ width: "100%", marginTop: 18, padding: "13px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(C.gold), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 17, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>{busy ? t({ zh: "處理中…", en: "Working…" }) : t({ zh: "建立並開始", en: "CREATE & START" })}</button>
              {listAccounts().length > 0 && (
                <div onClick={() => { Sfx.click(); setErr(""); setMode("picker"); }} style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.mist, cursor: "pointer", textDecoration: "underline" }}>{t({ zh: "← 返回帳號清單", en: "← Back to accounts" })}</div>
              )}
            </>
          )}

          {/* 訪客 */}
          <div onClick={enterGuest} style={{ textAlign: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)", fontSize: 12, color: C.mist2, cursor: "pointer" }}>
            {t({ zh: "訪客試玩（單機，不計排行與紀錄）", en: "Play as guest (local, no leaderboard/records)" })}
          </div>
        </div>
      </div>
    </div>
  );
}
