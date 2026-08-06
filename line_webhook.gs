/**
 * line_webhook.gs — Bot LINE trả lời /số cho cụm 14285 (ảnh trên SUPABASE STORAGE)
 * =========================================================================
 * Ai gõ "/số" trong nhóm → bot trả ẢNH MỚI NHẤT của siêu thị nhóm đó, đọc thẳng
 * từ Supabase Storage bucket 'bc' (userscript ghi đè bc/<mã>.jpg mỗi lần cập nhật).
 * Dùng REPLY API → MIỄN PHÍ (không tính quota).
 *
 * CẬP NHẬT KHI SỬA: Deploy → Manage deployments → bút chì → Version: New version → Deploy.
 * (LINE "Verify webhook" báo 302 là bình thường với Apps Script — cứ bật Use webhook.)
 *
 * Script Properties cần: LINE_TOKEN = channel access token.
 */

var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
var BUCKET = 'bc';

// Nhóm LINE → siêu thị (mã = tên file trên Supabase: bc/396.jpg, bc/142.jpg).
var GROUP_TO_STORE = {
  'Cd6981bde07d3c222623f363b8f5739bf': { key: '396', label: '396 Nguyễn Văn Cừ' },
  'Cd16f4cb26203b273afd91895cc10b66f': { key: '142', label: 'Ngọc Thụy' }
};

function pub(path) { return SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + path; }
function bust(url) { return url + '?t=' + Date.now(); }

function doGet() { return ContentService.createTextOutput('OK — bot /số cụm 14285 (Supabase) đang chạy.'); }

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
      '• /số — ảnh báo cáo doanh thu mới nhất của siêu thị nhóm này.\n' +
      '• /bcnv — báo cáo nhân viên + thi đua ngành hàng của siêu thị nhóm này.');
    return;
  }
  if (cmd === 'số' || cmd === 'so' || cmd === 'sô') {
    if (!groupId) { replyText(ev.replyToken, 'Lệnh /số chỉ dùng trong NHÓM đã gắn siêu thị.'); return; }
    var store = GROUP_TO_STORE[groupId];
    if (!store) { replyText(ev.replyToken, 'Nhóm này chưa được gắn siêu thị.\n(groupId: ' + groupId + ')'); return; }
    replyImage(ev.replyToken, bust(pub(store.key + '.jpg')), bust(pub(store.key + '_preview.jpg')));
    return;
  }
  // /bcnv — bộ ảnh báo cáo nhân viên + thi đua ngành hàng (do userscript dựng từ nv.html
  // và đẩy lên Storage, ghi manifest bc/nv_cards.json). Dùng Reply nên MIỄN PHÍ.
  if (cmd === 'bcnv' || cmd === 'bc nv' || cmd === 'nv' || cmd === 'nhanvien' || cmd === 'nhan vien' || cmd === 'bcnhanvien') {
    if (!groupId) { replyText(ev.replyToken, 'Lệnh /bcnv chỉ dùng trong NHÓM đã gắn siêu thị.'); return; }
    var st2 = GROUP_TO_STORE[groupId];
    if (!st2) { replyText(ev.replyToken, 'Nhóm này chưa được gắn siêu thị.\n(groupId: ' + groupId + ')'); return; }
    var man = readNvManifest();
    var entry = man && man[st2.key];
    if (!entry || !entry.images || !entry.images.length) {
      replyText(ev.replyToken, 'Chưa có báo cáo nhân viên cho ' + st2.label + '. Chạy cào số (nv.html) hôm nay trước nhé.');
      return;
    }
    var msgs = entry.images.slice(0, 5).map(function (u) {
      return { type: 'image', originalContentUrl: bust(u), previewImageUrl: bust(u) };
    });
    reply(ev.replyToken, msgs);
    return;
  }
  // Lệnh lạ: im lặng.
}

// Đọc manifest ảnh báo cáo nhân viên (bc/nv_cards.json) trên Supabase Storage.
function readNvManifest() {
  try {
    var res = UrlFetchApp.fetch(pub('nv_cards.json') + '?t=' + Date.now(), { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
  } catch (e) { console.error('readNvManifest lỗi: ' + e); }
  return null;
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
