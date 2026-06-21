/**
 * 風場運維・班級排行榜 — Google Apps Script Web App
 * 綁定在排行榜試算表（擴充功能 → Apps Script）後貼上本檔，部署為 Web App。
 *
 * 試算表第一列標題建議：時間戳記 | 暱稱 | 班級碼 | 績效分 | 可用率 | 發電量 | 天數
 * （程式以欄位「位置」寫入：A時間 B暱稱 C班級碼 D績效分 E可用率 F發電量 G天數）
 */

// doPost：遊戲送分時呼叫，附加一列。
function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sh.appendRow([
      new Date(),
      p.nickname || '',
      p.classCode || '',
      Number(p.score) || 0,
      Number(p.availability) || 0,
      Number(p.generation) || 0,
      Number(p.day) || 0,
    ]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, err: String(err) });
  }
}

// doGet：遊戲讀排行榜時呼叫，回傳每人最高分、依績效分排序（前 50）。
function doGet(e) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var values = sh.getDataRange().getValues();
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

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
