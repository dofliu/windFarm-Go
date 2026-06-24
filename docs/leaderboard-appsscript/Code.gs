/**
 * 風場運維・雲端後端 v2 — Google Apps Script Web App
 * 帳號(學號)＋通關碼登入、雲端存檔、學習紀錄、教師檢視、班級排行。前端在 GitHub Pages。
 *
 * 部署：擴充功能 → Apps Script → 貼上本檔 → 部署 → 新增部署作業 → 類型「網頁應用程式」
 *   執行身分：我；存取對象：「所有人」。改檔後務必「管理部署作業 → 編輯 → 版本：新版本」。
 *
 * 安全層級（教室用）：通關碼以前端弱雜湊(pinHash)傳輸、後端比對；pinHash 會出現在
 *   GET 網址與執行記錄中，足以防隨手冒名，非銀行級。詳見 docs/CLOUD_SETUP.md。
 *
 * 分頁（自動建立）：
 *   accounts: key | studentId | classCode | nickname | pinHash | createdAt
 *   saves:    key | savedAt | state | score | day | availability | generation | nickname
 *   records:  key | updatedAt | record
 *   Sheet1（排行，沿用）：時間 | 暱稱 | 班級碼 | 績效分 | 可用率 | 發電量 | 天數 | 學號
 */

var SIGN_SECRET = 'wfg-2026-oandm'; // 與前端 src/cloud/sheet.ts 一致（排行送分簽章）
var TEACHER_CODE = 'CHANGE-ME-教師碼'; // ★教師檢視用：請改成你的教師碼，並通知前端設定相同值

function djb2(str) {
  var h = 5381;
  for (var i = 0; i < str.length; i++) h = (((h << 5) + h + str.charCodeAt(i)) >>> 0);
  return h.toString(36);
}
function clampInt(n, lo, hi) { n = Math.round(Number(n) || 0); return Math.max(lo, Math.min(hi, n)); }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function sheet(name) { var ss = SpreadsheetApp.getActiveSpreadsheet(); return ss.getSheetByName(name) || ss.insertSheet(name); }
function normId(s) { return String(s || '').trim().toUpperCase().slice(0, 20); }
function normCls(s) { return String(s || '').trim().toUpperCase().slice(0, 12); }
function keyOf(cls, sid) { return cls + '/' + sid; }

// 尋找列：回 1-based 列號，找不到回 -1
function findRow(sh, key) {
  var data = sh.getDataRange().getValues();
  for (var r = 0; r < data.length; r++) if (String(data[r][0]) === key) return r + 1;
  return -1;
}
function getAccount(cls, sid) {
  var sh = sheet('accounts');
  var row = findRow(sh, keyOf(cls, sid));
  if (row < 0) return null;
  var v = sh.getRange(row, 1, 1, 6).getValues()[0];
  return { key: v[0], studentId: v[1], classCode: v[2], nickname: v[3], pinHash: String(v[4] || ''), createdAt: v[5], row: row };
}
// 驗證通關碼；回帳號或 null
function authed(cls, sid, pinHash) {
  var a = getAccount(cls, sid);
  if (!a) return null;
  return a.pinHash && a.pinHash === String(pinHash || '') ? a : null;
}

// ───────────────────────── doGet：讀取與小型寫入 ─────────────────────────
function doGet(e) {
  var q = (e && e.parameter) || {};
  var op = q['do'];

  if (op === 'register') {
    var cls = normCls(q.classCode), sid = normId(q.studentId);
    if (!sid || !cls) return json({ ok: false, err: 'bad-input' });
    if (getAccount(cls, sid)) return json({ ok: false, err: 'exists' });
    var nick = String(q.nickname || '').trim().slice(0, 16);
    sheet('accounts').appendRow([keyOf(cls, sid), sid, cls, nick, String(q.pinHash || ''), new Date()]);
    return json({ ok: true, nickname: nick });
  }

  if (op === 'login') {
    var a = authed(normCls(q.classCode), normId(q.studentId), q.pinHash);
    if (!getAccount(normCls(q.classCode), normId(q.studentId))) return json({ ok: false, err: 'no-account' });
    if (!a) return json({ ok: false, err: 'bad-pin' });
    return json({ ok: true, nickname: a.nickname });
  }

  if (op === 'load') {
    if (!authed(normCls(q.classCode), normId(q.studentId), q.pinHash)) return json({ ok: false, err: 'bad-pin' });
    var sh = sheet('saves');
    var row = findRow(sh, keyOf(normCls(q.classCode), normId(q.studentId)));
    if (row < 0) return json({ ok: true, state: null });
    var rec = sh.getRange(row, 1, 1, 3).getValues()[0];
    return json({ ok: true, state: String(rec[2] || ''), savedAt: Number(rec[1]) || 0 });
  }

  if (op === 'record-get') {
    if (!authed(normCls(q.classCode), normId(q.studentId), q.pinHash)) return json({ ok: false, err: 'bad-pin' });
    var rsh = sheet('records');
    var rrow = findRow(rsh, keyOf(normCls(q.classCode), normId(q.studentId)));
    if (rrow < 0) return json({ ok: true, record: null });
    return json({ ok: true, record: String(rsh.getRange(rrow, 3).getValue() || '') });
  }

  if (op === 'teacher') {
    if (String(q.code || '') !== TEACHER_CODE) return json({ ok: false, err: 'bad-code' });
    var cls2 = normCls(q.classCode);
    var ssh = sheet('saves');
    var all = ssh.getDataRange().getValues();
    var out = [];
    for (var r = 0; r < all.length; r++) {
      var row2 = all[r];
      var key = String(row2[0] || '');
      if (key.indexOf(cls2 + '/') !== 0) continue;
      out.push({
        studentId: key.slice(cls2.length + 1),
        nickname: String(row2[7] || ''),
        savedAt: Number(row2[1]) || 0, updatedAt: Number(row2[1]) || 0,
        score: Number(row2[3]) || 0, day: Number(row2[4]) || 0,
        availability: Number(row2[5]) || 0, generation: Number(row2[6]) || 0
      });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return json({ ok: true, rows: out });
  }

  // 沿用：?load=班級/學號（舊版相容，無驗證）省略；預設回排行榜（Sheet1）
  return leaderboard();
}

function leaderboard() {
  var values = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getDataRange().getValues();
  var best = {};
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var nickname = String(r[1] || ''); var classCode = String(r[2] || ''); var score = Number(r[3]) || 0;
    if (!nickname) continue;
    var key = classCode + '/' + nickname;
    if (!best[key] || score > best[key].score) best[key] = { nickname: nickname, classCode: classCode, score: score };
  }
  var arr = Object.keys(best).map(function (k) { return best[k]; });
  arr.sort(function (a, b) { return b.score - a.score; });
  return json(arr.slice(0, 50));
}

// ───────────────────────── doPost：大型寫入（存檔/紀錄）與排行送分 ─────────────────────────
function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);

    if (p.kind === 'save') {
      var cls = normCls(p.classCode), sid = normId(p.studentId);
      if (!authed(cls, sid, p.pinHash)) return json({ ok: false, err: 'bad-pin' });
      var sh = sheet('saves');
      var key = keyOf(cls, sid);
      var nick = (getAccount(cls, sid) || {}).nickname || '';
      var state = String(p.state || '').slice(0, 90000);
      var rowVals = [key, Number(p.savedAt) || (new Date()).getTime(), state,
        clampInt(p.score, 0, 9e8), clampInt(p.day, 0, 3650), clampInt(p.availability, 0, 100), clampInt(p.generation, 0, 9e8), nick];
      var row = findRow(sh, key);
      if (row > 0) sh.getRange(row, 1, 1, 8).setValues([rowVals]);
      else sh.appendRow(rowVals);
      return json({ ok: true });
    }

    if (p.kind === 'record') {
      var c2 = normCls(p.classCode), s2 = normId(p.studentId);
      if (!authed(c2, s2, p.pinHash)) return json({ ok: false, err: 'bad-pin' });
      var rsh = sheet('records');
      var k2 = keyOf(c2, s2);
      var rec = String(p.record || '').slice(0, 90000);
      var rr = findRow(rsh, k2);
      if (rr > 0) rsh.getRange(rr, 1, 1, 3).setValues([[k2, (new Date()).getTime(), rec]]);
      else rsh.appendRow([k2, (new Date()).getTime(), rec]);
      return json({ ok: true });
    }

    // 沿用：排行送分（簽章驗證 + 節流）
    var nickname = String(p.nickname || '').trim().slice(0, 16);
    var classCode = normCls(p.classCode);
    var studentId = normId(p.studentId);
    var day = clampInt(p.day, 0, 3650);
    var availability = clampInt(p.availability, 0, 100);
    var generation = clampInt(p.generation, 0, 130 * Math.max(1, day));
    var score = clampInt(p.score, 0, generation + 100 * 5 + day * 30 + 1000);
    if (!nickname) return json({ ok: false, err: 'no-nickname' });
    var expect = djb2(nickname + '|' + classCode + '|' + score + '|' + availability + '|' + generation + '|' + day + '|' + SIGN_SECRET);
    if (String(p.sig || '') !== expect) return json({ ok: false, err: 'bad-sig' });
    var cache = CacheService.getScriptCache();
    var rlk = 'rl_' + classCode + '/' + nickname;
    if (cache.get(rlk)) return json({ ok: false, err: 'throttled' });
    cache.put(rlk, '1', 8);
    SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
      .appendRow([new Date(), nickname, classCode, score, availability, generation, day, studentId]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, err: String(err) });
  }
}
