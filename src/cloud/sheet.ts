// 免費・免後端的雲端排行榜：Google Apps Script Web App。
// doPost 寫入試算表、doGet 回排行榜 JSON。繞開 Google 表單的登入限制。
// 教師部署後把 /exec 網址填入 webAppUrl 並把 enabled 改 true。設定見 docs/LEADERBOARD_SETUP.md。
export const SHEET_CONFIG = {
  enabled: true,
  // Apps Script Web App 的 /exec 網址（部署為「任何人皆可存取」）
  webAppUrl: "https://script.google.com/macros/s/AKfycbxgy2ugDT1IRSE1vrYSpG-MH8uYm1ZMJbOm5_DSMSf6fcGDYO3nQ2qS-32IPvCwU-wexw/exec",
};

// 與後端共用的弱簽章密鑰（純前端無法真正保密，僅提高偽造門檻；搭配後端合理性驗證 #35）
const SIGN_SECRET = "wfg-2026-oandm";
// djb2 字串雜湊（前後端需一致）
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function sign(p: ScorePayload): string {
  return djb2(`${p.nickname}|${p.classCode}|${p.score}|${p.availability}|${p.generation}|${p.day}|${SIGN_SECRET}`);
}

export interface ScorePayload {
  nickname: string;
  classCode: string;
  score: number;
  availability: number;
  generation: number;
  day: number;
}

const clampInt = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

// 前端合理性夾值（#35）：擋住明顯異常，避免把壞資料送上雲端
function sanitize(p: ScorePayload): ScorePayload | null {
  const nickname = String(p.nickname ?? "").trim().slice(0, 16);
  if (!nickname) return null;
  const classCode = String(p.classCode ?? "").trim().slice(0, 12);
  const day = clampInt(p.day, 0, 3650);
  const availability = clampInt(p.availability, 0, 100);
  const generation = clampInt(p.generation, 0, 130 * Math.max(1, day)); // 100%≈120MWh/日，留 130 緩衝
  const score = clampInt(p.score, 0, generation + 100 * 5 + day * 30 + 1000); // 與 KPI 公式一致的上界
  return { nickname, classCode, score, availability, generation, day };
}

// 送分：POST JSON 到 Web App。用 no-cors + 純字串 body（text/plain 安全清單）避免 CORS preflight。
export async function submitScore(raw: ScorePayload): Promise<void> {
  if (!SHEET_CONFIG.enabled || !SHEET_CONFIG.webAppUrl) return;
  const p = sanitize(raw);
  if (!p) return;
  try {
    await fetch(SHEET_CONFIG.webAppUrl, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ ...p, sig: sign(p) }), // 預設 Content-Type text/plain，不觸發 preflight
    });
  } catch {
    // 靜默失敗（離線/網路問題不影響遊戲）
  }
}

export interface Row {
  nickname: string;
  classCode: string;
  score: number;
}

// 讀排行榜：GET Web App，回傳已排序的分數列（Apps Script ContentService 允許跨來源讀取）。
export async function fetchLeaderboard(): Promise<Row[]> {
  if (!SHEET_CONFIG.enabled || !SHEET_CONFIG.webAppUrl) return [];
  try {
    const res = await fetch(SHEET_CONFIG.webAppUrl);
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((r) => ({
        nickname: String(r.nickname ?? "—") || "—",
        classCode: String(r.classCode ?? ""),
        score: Number(r.score ?? 0) || 0,
      }))
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}
