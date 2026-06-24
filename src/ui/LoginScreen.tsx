import { useMemo, useState } from "react";
import { C, FONT_SERIF, primaryBg, panel } from "./tokens";
import { t } from "../game/systems/i18n";
import { useLang } from "./useLang";
import { setProfile, listAccounts, upsertAccount, removeAccount, touchAccount, findAccount, verifyPin, hashPin, validPinFormat, normClass, normNick, idOf, type Account } from "../state/profile";
import { Sfx } from "../audio/sfx";

type Mode = "picker" | "pin" | "create";

// 開場登入（強制 PIN）：本機帳號清單 → 選擇帳號輸入 PIN，或新建帳號（暱稱+班級碼+PIN）。
// 同一台教室電腦可保有多位學生帳號，各自獨立存檔與紀錄。另保留「訪客」單機試玩（不計排行/紀錄）。
export default function LoginScreen({ onDone }: { onDone: () => void }) {
  useLang();
  const accounts = useMemo(() => listAccounts(), []);
  const [mode, setMode] = useState<Mode>(accounts.length ? "picker" : "create");
  const [sel, setSel] = useState<Account | null>(null);

  // 新建欄位
  const [nickname, setNickname] = useState("");
  const [classCode, setClassCode] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");

  const field: React.CSSProperties = {
    width: "100%", padding: "11px 14px", marginTop: 6, borderRadius: 6,
    background: "rgba(8,22,28,.8)", border: "1px solid rgba(214,167,84,.4)",
    color: C.cream, fontSize: 15, outline: "none",
  };
  const label: React.CSSProperties = { fontSize: 13, color: C.cream, fontWeight: 700, display: "block", marginTop: 14 };

  const finish = (p: { nickname: string; classCode: string; pinHash: string; guest?: boolean }) => {
    setProfile(p);
    onDone();
  };

  const enterGuest = () => { Sfx.click(); finish({ nickname: "訪客", classCode: "", pinHash: "", guest: true }); };

  // 選定帳號 → PIN 驗證
  const startPin = (a: Account) => { Sfx.click(); setSel(a); setPin(""); setErr(""); setMode("pin"); };
  const submitPin = () => {
    if (!sel) return;
    if (!verifyPin(sel, pin)) { Sfx.error(); setErr(t({ zh: "PIN 不正確", en: "Incorrect PIN" })); return; }
    Sfx.success();
    const now = Date.now();
    touchAccount(idOf(sel), now);
    finish({ nickname: sel.nickname, classCode: sel.classCode, pinHash: sel.pinHash });
  };

  // 新建帳號
  const submitCreate = () => {
    const nick = normNick(nickname), cls = normClass(classCode);
    if (!nick) { setErr(t({ zh: "請輸入暱稱", en: "Enter a nickname" })); return; }
    if (!cls) { setErr(t({ zh: "請輸入班級碼", en: "Enter a class code" })); return; }
    if (!validPinFormat(pin)) { setErr(t({ zh: "PIN 需為 4–6 位數字", en: "PIN must be 4–6 digits" })); return; }
    if (pin !== pin2) { setErr(t({ zh: "兩次 PIN 不一致", en: "PINs don't match" })); return; }
    const id = idOf({ nickname: nick, classCode: cls });
    const existing = findAccount(id);
    if (existing) { Sfx.error(); setErr(t({ zh: "此班級已有同名帳號，請改用「選擇帳號」登入", en: "That name already exists in this class — use it from the list" })); setMode("picker"); return; }
    Sfx.success();
    const now = Date.now();
    const acct: Account = { nickname: nick, classCode: cls, pinHash: hashPin(pin, id), createdAt: now, lastSeen: now };
    upsertAccount(acct);
    finish({ nickname: nick, classCode: cls, pinHash: acct.pinHash });
  };

  const del = (a: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t({ zh: `確定要從這台裝置移除「${a.nickname}」？（本機存檔保留，可重新登入取回）`, en: `Remove "${a.nickname}" from this device? (Local save is kept; re-login restores it.)` }))) return;
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
                    <div style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: "radial-gradient(circle at 50% 35%, #20586a, #0f3140)", border: "2px solid rgba(214,167,84,.7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SERIF, fontWeight: 900, color: C.goldText }}>{a.nickname.slice(0, 1)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: C.cream, fontSize: 14.5, fontWeight: 700 }}>{a.nickname}</div>
                      <div style={{ color: C.mist, fontSize: 11.5 }}>{t({ zh: "班級", en: "Class" })} {a.classCode} · 🔒 PIN</div>
                    </div>
                    <button title={t({ zh: "移除", en: "Remove" })} onClick={(e) => del(a, e)} style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(220,100,80,.4)", background: "rgba(220,100,80,.14)", color: C.redText, fontSize: 13, fontWeight: 900, cursor: "pointer", padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => { Sfx.click(); setNickname(""); setClassCode(""); setPin(""); setPin2(""); setErr(""); setMode("create"); }} style={{ width: "100%", padding: "12px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(C.gold), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 16, cursor: "pointer" }}>
                ＋ {t({ zh: "新建帳號", en: "New account" })}
              </button>
            </>
          )}

          {/* PIN 驗證 */}
          {mode === "pin" && sel && (
            <>
              <div style={{ fontSize: 14, color: C.cream, marginBottom: 4 }}>{t({ zh: "歡迎回來", en: "Welcome back" })}，<b style={{ color: C.goldText }}>{sel.nickname}</b></div>
              <div style={{ fontSize: 12, color: C.mist, marginBottom: 8 }}>{t({ zh: "班級", en: "Class" })} {sel.classCode}</div>
              <label style={label}>{t({ zh: "輸入 PIN", en: "Enter PIN" })}</label>
              <input style={field} type="password" inputMode="numeric" value={pin} autoFocus maxLength={6} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") submitPin(); }} placeholder="••••" />
              {err && <div style={{ color: C.redText, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
              <button onClick={submitPin} style={{ width: "100%", marginTop: 18, padding: "13px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(C.gold), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 17, cursor: "pointer" }}>{t({ zh: "登 入", en: "LOG IN" })}</button>
              <div onClick={() => { Sfx.click(); setErr(""); setMode("picker"); }} style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.mist, cursor: "pointer", textDecoration: "underline" }}>{t({ zh: "← 返回帳號清單", en: "← Back to accounts" })}</div>
            </>
          )}

          {/* 新建帳號 */}
          {mode === "create" && (
            <>
              <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.6, marginBottom: 6 }}>
                {t({ zh: "建立帳號：暱稱、班級碼與 PIN。PIN 用於登入與保護你的存檔/紀錄，請牢記（無找回機制）。", en: "Create an account: nickname, class code & PIN. The PIN guards your save/records — remember it (no recovery)." })}
              </div>
              <label style={label}>{t({ zh: "暱稱", en: "Nickname" })}</label>
              <input style={field} value={nickname} maxLength={16} onChange={(e) => { setNickname(e.target.value); setErr(""); }} placeholder={t({ zh: "例如：阿明", en: "e.g. Ming" })} />
              <label style={label}>{t({ zh: "班級碼", en: "Class code" })}</label>
              <input style={field} value={classCode} maxLength={12} onChange={(e) => { setClassCode(e.target.value); setErr(""); }} placeholder={t({ zh: "教師提供", en: "from teacher" })} />
              <label style={label}>{t({ zh: "設定 PIN（4–6 位數字）", en: "Set PIN (4–6 digits)" })}</label>
              <input style={field} type="password" inputMode="numeric" value={pin} maxLength={6} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }} placeholder="••••" />
              <label style={label}>{t({ zh: "再次輸入 PIN", en: "Confirm PIN" })}</label>
              <input style={field} type="password" inputMode="numeric" value={pin2} maxLength={6} onChange={(e) => { setPin2(e.target.value.replace(/\D/g, "")); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") submitCreate(); }} placeholder="••••" />
              {err && <div style={{ color: C.redText, fontSize: 12.5, marginTop: 8 }}>{err}</div>}
              <button onClick={submitCreate} style={{ width: "100%", marginTop: 18, padding: "13px 0", borderRadius: 6, border: "1px solid rgba(255,236,196,.6)", background: primaryBg(C.gold), color: C.ink, fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 17, cursor: "pointer" }}>{t({ zh: "建立並開始", en: "CREATE & START" })}</button>
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
