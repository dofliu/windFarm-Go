// 免費・免後端的雲端排行榜：透過 Google 表單送分、讀「發布為 CSV」的試算表。
// 教師建立表單後，把下列 4 處填好並將 enabled 改為 true 即啟用。設定步驟見 docs/LEADERBOARD_SETUP.md。
export const SHEET_CONFIG = {
  enabled: false, // ← 設定填好後改成 true
  // Google 表單送出網址（把 .../viewform 換成 .../formResponse）
  formAction: "",
  // 各題的 entry.xxxxx 欄位 id（用「取得預先填入的連結」取得）
  entries: {
    nickname: "entry.0",
    classCode: "entry.0",
    score: "entry.0",
    availability: "entry.0",
    generation: "entry.0",
    day: "entry.0",
  },
  // 連動試算表「發布到網路 → CSV」的網址
  csvUrl: "",
};

export interface ScorePayload {
  nickname: string;
  classCode: string;
  score: number;
  availability: number;
  generation: number;
  day: number;
}

// 送分：POST 到 Google 表單（no-cors，無回應但會寫入試算表）
export async function submitScore(p: ScorePayload): Promise<void> {
  if (!SHEET_CONFIG.enabled || !SHEET_CONFIG.formAction) return;
  const e = SHEET_CONFIG.entries;
  const fd = new FormData();
  fd.append(e.nickname, p.nickname);
  fd.append(e.classCode, p.classCode);
  fd.append(e.score, String(p.score));
  fd.append(e.availability, String(p.availability));
  fd.append(e.generation, String(p.generation));
  fd.append(e.day, String(p.day));
  try {
    await fetch(SHEET_CONFIG.formAction, { method: "POST", mode: "no-cors", body: fd });
  } catch {
    // 靜默失敗（離線/網路問題不影響遊戲）
  }
}

export interface Row {
  nickname: string;
  classCode: string;
  score: number;
}

// 讀排行榜：抓發布的 CSV，依欄位標題關鍵字解析，回傳分數列。
export async function fetchLeaderboard(): Promise<Row[]> {
  if (!SHEET_CONFIG.enabled || !SHEET_CONFIG.csvUrl) return [];
  try {
    const res = await fetch(SHEET_CONFIG.csvUrl);
    const text = await res.text();
    return parseCsv(text);
  } catch {
    return [];
  }
}

function splitCsvLine(line: string): string[] {
  // 簡易 CSV：處理引號包住的欄位
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const find = (keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const iName = find(["暱稱", "name", "nick"]);
  const iClass = find(["班級", "class"]);
  const iScore = find(["績效", "score", "分"]);
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = splitCsvLine(lines[i]);
    if (!c.length) continue;
    rows.push({
      nickname: (iName >= 0 ? c[iName] : c[1]) || "—",
      classCode: (iClass >= 0 ? c[iClass] : c[2]) || "",
      score: Number((iScore >= 0 ? c[iScore] : c[3]) || 0) || 0,
    });
  }
  // 同一暱稱只留最高分
  const best = new Map<string, Row>();
  for (const r of rows) {
    const k = r.classCode + "/" + r.nickname;
    if (!best.has(k) || r.score > best.get(k)!.score) best.set(k, r);
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}
