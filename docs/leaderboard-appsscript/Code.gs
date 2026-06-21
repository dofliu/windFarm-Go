/**
 * 風場運維・班級排行榜 — Google Apps Script Web App（含合理性驗證/簽章/節流 #35）
 * 綁定在排行榜試算表（擴充功能 → Apps Script）後貼上本檔，部署為 Web App。
 *
 * 試算表第一列標題建議：時間戳記 | 暱稱 | 班級碼 | 績效分 | 可用率 | 發電量 | 天數
 * （以欄位「位置」寫入：A時間 B暱稱 C班級碼 D績效分 E可用率 F發電量 G天數）
 *
 * 改完本檔後務必：部署 → 管理部署作業 → 編輯 → 版本：新版本，才會生效。
 */

// 與前端 src/cloud/sheet.ts 的 SIGN_SECRET 必須一致
var SIGN_SECRET = 'wfg-2026-oandm';

// djb2（需與前端一致）
function djb2(str) {
  var h = 5381;
  for (var i = 0; i < str.length; i++) h = (((h << 5) + h + str.charCodeAt(i)) >>> 0);
  return h.toString(36);
}

// doPost：送分（預設）或完整存檔同步（kind:'save'，#31 選配）。
function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);

    // #31 完整存檔同步：寫入/更新「saves」分頁，每人一列（upsert）
    if (p.kind === 'save') {
      var nick = String(p.nickname || '').trim().slice(0, 16);
      var cls = String(p.classCode || '').trim().slice(0, 12);
      if (!nick) return json({ ok: false, err: 'no-nickname' });
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName('saves') || ss.insertSheet('saves');
      var key = cls + '/' + nick;
      var data = sh.getDataRange().getValues();
      var rowIdx = -1;
      for (var r = 0; r < data.length; r++) { if (data[r][0] === key) { rowIdx = r + 1; break; } }
      var state = String(p.state || '').slice(0, 45000); // 試算表單格上限保護
      if (rowIdx > 0) sh.getRange(rowIdx, 1, 1, 3).setValues([[key, new Date(), state]]);
      else sh.appendRow([key, new Date(), state]);
      return json({ ok: true });
    }

    var nickname = String(p.nickname || '').trim().slice(0, 16);
    var classCode = String(p.classCode || '').trim().slice(0, 12);
    var day = clampInt(p.day, 0, 3650);
    var availability = clampInt(p.availability, 0, 100);
    var generation = clampInt(p.generation, 0, 130 * Math.max(1, day));
    var score = clampInt(p.score, 0, generation + 100 * 5 + day * 30 + 1000);

    if (!nickname) return json({ ok: false, err: 'no-nickname' });

    // 簽章驗證（擋裸 POST；純前端密鑰僅提高門檻）
    var expect = djb2(nickname + '|' + classCode + '|' + score + '|' + availability + '|' + generation + '|' + day + '|' + SIGN_SECRET);
    if (String(p.sig || '') !== expect) return json({ ok: false, err: 'bad-sig' });

    // 節流：同一人 8 秒內僅接受一次，擋洗榜
    var cache = CacheService.getScriptCache();
    var key = 'rl_' + classCode + '/' + nickname;
    if (cache.get(key)) return json({ ok: false, err: 'throttled' });
    cache.put(key, '1', 8);

    SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
      .appendRow([new Date(), nickname, classCode, score, availability, generation, day]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, err: String(err) });
  }
}

// doGet：?load=班級/暱稱 → 回該人雲端存檔（#31）；否則回排行榜。
function doGet(e) {
  if (e && e.parameter && e.parameter.load) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('saves');
    if (!sh) return json({ state: null });
    var rows = sh.getDataRange().getValues();
    for (var r = 0; r < rows.length; r++) {
      if (rows[r][0] === e.parameter.load) return json({ state: String(rows[r][2] || '') });
    }
    return json({ state: null });
  }
  var values = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getDataRange().getValues();
  var best = {};
  for (var i = 1; i < values.length; i++) { // 跳過標題列
    var r = values[i];
    var nickname = String(r[1] || '');
    var classCode = String(r[2] || '');
    var score = Number(r[3]) || 0;
    if (!nickname) continue;
    var key = classCode + '/' + nickname;
    if (!best[key] || score > best[key].score) {
      best[key] = { nickname: nickname, classCode: classCode, score: score };
    }
  }
  var out = Object.keys(best).map(function (k) { return best[k]; });
  out.sort(function (a, b) { return b.score - a.score; });
  return json(out.slice(0, 50));
}

function clampInt(n, lo, hi) {
  n = Math.round(Number(n) || 0);
  return Math.max(lo, Math.min(hi, n));
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
