// 免費・免後端的雲端排行榜：Google Apps Script Web App。
// doPost 寫入試算表、doGet 回排行榜 JSON。繞開 Google 表單的登入限制。
// 教師部署後把 /exec 網址填入 webAppUrl 並把 enabled 改 true。設定見 docs/LEADERBOARD_SETUP.md。
export const SHEET_CONFIG = {
  enabled: true,
  // Apps Script Web App 的 /exec 網址（部署為「任何人皆可存取」）
  webAppUrl: "https://script.google.com/macros/s/AKfycbxgy2ugDT1IRSE1vrYSpG-MH8uYm1ZMJbOm5_DSMSf6fcGDYO3nQ2qS-32IPvCwU-wexw/exec",
};

export interface ScorePayload {
  nickname: string;
  classCode: string;
  score: number;
  availability: number;
  generation: number;
  day: number;
}

// 送分：POST JSON 到 Web App。用 no-cors + 純字串 body（text/plain 安全清單）避免 CORS preflight。
export async function submitScore(p: ScorePayload): Promise<void> {
  if (!SHEET_CONFIG.enabled || !SHEET_CONFIG.webAppUrl) return;
  try {
    await fetch(SHEET_CONFIG.webAppUrl, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(p), // 預設 Content-Type 為 text/plain，不觸發 preflight
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
