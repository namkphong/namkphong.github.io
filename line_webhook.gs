/**
 * line_webhook.gs — Bot LINE cụm 14285. Lệnh: /số, /bc, /bcnv.
 * =========================================================================
 * Đọc MANIFEST rồi trả ảnh (Reply API → MIỄN PHÍ, không tính quota):
 *  • /số   → bc/latest.json  (ảnh doanh thu realtime; url trỏ namkphong.github.io/bc/<mã>.jpg)
 *  • /bc   → bc/cards.json   (bộ thẻ mục tiêu; ảnh raw.githubusercontent .../bc/mt/<mã>_<n>.png)
 *  • /bcnv → bc/nv_cards.json trên Supabase Storage (báo cáo nhân viên + thi đua ngành hàng)
 *
 * latest.json & cards.json nằm trong REPO GitHub (đọc qua raw.githubusercontent cho tươi).
 * nv_cards.json nằm trên Supabase Storage (userscript dmx.user.js đẩy sau khi cào số).
 *
 * CẬP NHẬT KHI SỬA: Deploy → Manage deployments → bút chì → Version: New version → Deploy.
 * (LINE "Verify webhook" báo 302 là bình thường với Apps Script — cứ bật Use webhook.)
 * Script Properties cần: LINE_TOKEN = channel access token.
 */

var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
var BUCKET = 'bc';
var GH_RAW = 'https://raw.githubusercontent.com/namkphong/namkphong.github.io/main/';

// Nhóm LINE → siêu thị (key = mã dùng trong các manifest: 396 / 142).
var GROUP_TO_STORE = {
  'Cd6981bde07d3c222623f363b8f5739bf': { key: '396', label: '396 Nguyễn Văn Cừ' },
  'Cd16f4cb26203b273afd91895cc10b66f': { key: '142', label: 'Ngọc Thụy' }
};

function pub(path) { return SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + path; }
function bust(url) { return url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(); }

// Đọc JSON (thêm ?t= để tránh cache CDN). Trả object hoặc null.
function readJson(url) {
  try {
    var res = UrlFetchApp.fetch(bust(url), { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
  } catch (e) { console.error('readJson lỗi (' + url + '): ' + e); }
  return null;
}

function doGet() { return ContentService.createTextOutput('OK — bot cụm 14285 (/số /bc /bcnv) đang chạy.'); }

function doPost(e) {
  try { (JSON.parse(e.postData.contents).events || []).forEach(handleEvent); }
  catch (err) { console.error('doPost lỗi: ' + err); }
  return ContentService.createTextOutput('OK');
}

function handleEvent(ev) {
  if (!ev || ev.type !== 'message' || !ev.message || ev.message.type !== 'text' || !ev.replyToken) return;
  var cmd = (ev.message.text || '').normalize('NFC').trim().toLowerCase().replace(/^\//, '');
  var groupId = (ev.source && (ev.source.groupId || ev.source.roomId)) || null;

  if (cmd === 'help' || cmd === 'trợ giúp' || cmd === 'tro giup') {
    replyText(ev.replyToken,
      'Lệnh:\n' +
      '• /số — ảnh doanh thu realtime mới nhất.\n' +
      '• /bc — bộ thẻ mục tiêu nhân viên.\n' +
      '• /bcnv — báo cáo nhân viên + thi đua ngành hàng.');
    return;
  }

  // /số — ảnh doanh thu realtime, từ bc/latest.json
  if (cmd === 'số' || cmd === 'so' || cmd === 'sô') {
    var st = requireStore(ev, groupId); if (!st) return;
    var man = readJson(GH_RAW + 'bc/latest.json');
    var e = man && man.stores && man.stores[st.key];
    if (!e || !e.url) { replyText(ev.replyToken, 'Chưa có ảnh /số cho ' + st.label + '.'); return; }
    replyImage(ev.replyToken, bust(e.url), bust(e.url));
    return;
  }

  // /bc — bộ thẻ mục tiêu, từ bc/cards.json (nhiều ảnh)
  if (cmd === 'bc' || cmd === 'báo cáo' || cmd === 'bao cao') {
    var st2 = requireStore(ev, groupId); if (!st2) return;
    var man2 = readJson(GH_RAW + 'bc/cards.json');
    var e2 = man2 && man2.stores && man2.stores[st2.key];
    if (!e2 || !e2.images || !e2.images.length) { replyText(ev.replyToken, 'Chưa có thẻ mục tiêu /bc cho ' + st2.label + '.'); return; }
    reply(ev.replyToken, imagesToMessages(e2.images));
    return;
  }

  // /bcnv — báo cáo nhân viên + thi đua ngành hàng, từ Supabase bc/nv_cards.json
  if (cmd === 'bcnv' || cmd === 'bc nv' || cmd === 'nv' || cmd === 'nhanvien' || cmd === 'nhan vien' || cmd === 'bcnhanvien') {
    var st3 = requireStore(ev, groupId); if (!st3) return;
    var man3 = readJson(pub('nv_cards.json'));
    var e3 = man3 && man3[st3.key];
    if (!e3 || !e3.images || !e3.images.length) { replyText(ev.replyToken, 'Chưa có báo cáo nhân viên /bcnv cho ' + st3.label + '. Chạy cào số (nv.html) hôm nay trước nhé.'); return; }
    reply(ev.replyToken, imagesToMessages(e3.images));
    return;
  }
  // Lệnh lạ: im lặng.
}

// Lấy siêu thị theo nhóm; nếu không hợp lệ thì tự trả lời và return null.
function requireStore(ev, groupId) {
  if (!groupId) { replyText(ev.replyToken, 'Lệnh này chỉ dùng trong NHÓM đã gắn siêu thị.'); return null; }
  var st = GROUP_TO_STORE[groupId];
  if (!st) { replyText(ev.replyToken, 'Nhóm này chưa được gắn siêu thị.\n(groupId: ' + groupId + ')'); return null; }
  return st;
}

// Mảng ảnh (mỗi phần tử là "url" hoặc {url[,preview]}) -> tối đa 5 message ảnh LINE.
function imagesToMessages(images) {
  return images.slice(0, 5).map(function (im) {
    var u = (typeof im === 'string') ? im : im.url;
    var p = (im && im.preview) ? im.preview : u;
    return { type: 'image', originalContentUrl: bust(u), previewImageUrl: bust(p) };
  });
}

function lineToken() {
  var t = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  if (!t) throw new Error('Thiếu Script Property LINE_TOKEN');
  return t;
}
function replyText(replyToken, text) { reply(replyToken, [{ type: 'text', text: text }]); }
function replyImage(replyToken, originalUrl, previewUrl) { reply(replyToken, [{ type: 'image', originalContentUrl: originalUrl, previewImageUrl: previewUrl }]); }
function reply(replyToken, messages) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + lineToken() },
    payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
    muteHttpExceptions: true
  });
}
