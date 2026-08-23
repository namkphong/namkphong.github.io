/**
 * line_webhook.gs — Bot LINE cụm 14285. Lệnh: /số, /bc, /bcnv.
 * =========================================================================
 * Đọc MANIFEST rồi trả ảnh (Reply API → MIỄN PHÍ, không tính quota):
 *  • /số   → 1-2 ảnh:
 *            (a) bc/latest.json TRÊN GIT REPO (raw.githubusercontent.com) —
 *                ảnh doanh thu quy đổi, nguồn gốc — LUÔN gửi nếu có.
 *            (b) bc/latest.json TRÊN SUPABASE STORAGE (file CÙNG TÊN nhưng
 *                khác nơi, do dmx-line-publish.user.js ghi) — field rtUrl,
 *                ảnh ngành hàng + doanh thu tổng realtime (realtime.html) —
 *                gửi THÊM nếu đã có, không có thì bỏ qua, không báo lỗi.
 *  • /bc   → bc/nv_personal_cards.json trên Supabase — Trang Cá Nhân NV (nv.html),
 *            1 ảnh/nhân viên: đã gồm thẻ mục tiêu + thẻ NV + biểu đồ xu hướng.
 *  • /bcnv → bc/nv_cards.json trên Supabase — tab Nhập liệu & Phân tích (nv.html),
 *            thẻ NV theo thứ hạng (≤4/ảnh) + ảnh thi đua ngành hàng.
 *
 * Cả nv_personal_cards.json và nv_cards.json do userscript dmx.user.js tự đẩy
 * (window.NVSHARE.buildPersonalAll() / buildAll() trong nv.html) ngay sau khi
 * cào số xong cho từng siêu thị — không cần thao tác tay.
 *
 * ⚠ LINE giới hạn tối đa 5 ảnh/lượt gọi API (cả reply lẫn push). Quá 5 ảnh (ví
 * dụ /bc cho siêu thị >5 nhân viên) thì replyImagesBatched() tự CHIA 2 LƯỢT:
 *   lượt 1 = Reply 5 ảnh đầu (dùng replyToken, MIỄN PHÍ — token chỉ dùng được 1
 *            lần nên không thể reply lần thứ 2).
 *   lượt 2 = Push tối đa 5 ảnh tiếp theo vào nhóm (CÓ TỐN QUOTA theo số người
 *            trong nhóm — chỉ xảy ra khi thật sự vượt 5 ảnh). Ảnh thứ 11 trở
 *            đi bị cắt (chưa gặp trong thực tế, cụm chỉ 4-6 NV/siêu thị).
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
      '• /số — ảnh doanh thu quy đổi + ảnh ngành hàng/doanh thu tổng realtime (nếu có).\n' +
      '• /bc — Trang Cá Nhân từng nhân viên (thẻ mục tiêu + thẻ NV + xu hướng).\n' +
      '• /bcnv — báo cáo nhân viên theo thứ hạng + thi đua ngành hàng.\n' +
      '• /tuan — Mục Tiêu Tuần (AI) từng nhân viên: ảnh tiến độ + nhận xét tuần tới.');
    return;
  }

  // /số — ảnh doanh thu quy đổi (bc/latest.json trên git, KHÔNG đổi — nguồn đã
  // chạy ổn định) + ẢNH REALTIME ngành hàng/doanh thu tổng (rtUrl, manifest
  // CÙNG TÊN nhưng nằm trên Supabase Storage — xem ghi chú đầu file) nếu đã có.
  if (cmd === 'số' || cmd === 'so' || cmd === 'sô') {
    var st = requireStore(ev, groupId); if (!st) return;
    var man = readJson(GH_RAW + 'bc/latest.json');
    var e = man && man.stores && man.stores[st.key];
    if (!e || !e.url) { replyText(ev.replyToken, 'Chưa có ảnh /số cho ' + st.label + '.'); return; }
    var msgs = [imageToMessage({ url: e.url })];
    var manRT = readJson(pub('latest.json'));
    var eRT = manRT && manRT.stores && manRT.stores[st.key];
    if (eRT && eRT.rtUrl) msgs.push(imageToMessage({ url: eRT.rtUrl }));
    reply(ev.replyToken, msgs);
    return;
  }

  // /bc — Trang Cá Nhân NV (nv.html), 1 ảnh/nhân viên, từ Supabase bc/nv_personal_cards.json
  if (cmd === 'bc' || cmd === 'trang cá nhân' || cmd === 'trang ca nhan' || cmd === 'canhan' || cmd === 'ca nhan') {
    var st2 = requireStore(ev, groupId); if (!st2) return;
    var man2 = readJson(pub('nv_personal_cards.json'));
    var e2 = man2 && man2[st2.key];
    if (!e2 || !e2.images || !e2.images.length) { replyText(ev.replyToken, 'Chưa có Trang Cá Nhân /bc cho ' + st2.label + '. Chạy cào số (nv.html) hôm nay trước nhé.'); return; }
    replyImagesBatched(ev.replyToken, groupId, e2.images);
    return;
  }

  // /bcnv — tab Nhập liệu & Phân tích (nv.html): thẻ NV theo thứ hạng + thi đua
  // ngành hàng, từ Supabase bc/nv_cards.json
  if (cmd === 'bcnv' || cmd === 'bc nv' || cmd === 'nv' || cmd === 'nhanvien' || cmd === 'nhan vien' || cmd === 'bcnhanvien') {
    var st3 = requireStore(ev, groupId); if (!st3) return;
    var man3 = readJson(pub('nv_cards.json'));
    var e3 = man3 && man3[st3.key];
    if (!e3 || !e3.images || !e3.images.length) { replyText(ev.replyToken, 'Chưa có báo cáo nhân viên /bcnv cho ' + st3.label + '. Chạy cào số (nv.html) hôm nay trước nhé.'); return; }
    replyImagesBatched(ev.replyToken, groupId, e3.images);
    return;
  }

  // /tuan — MỤC TIÊU TUẦN (ảnh, gửi nhân viên — không hiện D), từ Supabase bc/nv_stram_week.json.
  // Ưu tiên ảnh (images); nếu manifest cũ chỉ có text thì vẫn trả text (tương thích ngược).
  if (cmd === 'tuan' || cmd === 'tuần' || cmd === 'stram' || cmd === 'tong ket tuan' || cmd === 'tổng kết tuần' || cmd === 'tuan nay' || cmd === 'tuần này') {
    var st4 = requireStore(ev, groupId); if (!st4) return;
    var man4 = readJson(pub('nv_stram_week.json'));
    var e4 = man4 && man4[st4.key];
    if (e4 && e4.images && e4.images.length) { replyImagesBatched(ev.replyToken, groupId, e4.images); return; }
    if (e4 && e4.text) { replyText(ev.replyToken, e4.text); return; }
    replyText(ev.replyToken, 'Chưa có Mục Tiêu Tuần /tuan cho ' + st4.label + '. Chạy cào số (nv.html) trước nhé.');
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

// 1 phần tử ảnh (là "url" hoặc {url[,preview]}) -> 1 message ảnh LINE.
function imageToMessage(im) {
  var u = (typeof im === 'string') ? im : im.url;
  var p = (im && im.preview) ? im.preview : u;
  return { type: 'image', originalContentUrl: bust(u), previewImageUrl: bust(p) };
}

// Gửi mảng ảnh, tự chia 2 lượt nếu > 5 ảnh (xem giải thích ở đầu file).
// to = groupId, dùng cho lượt 2 (push) khi cần.
function replyImagesBatched(replyToken, to, images) {
  var msgs = images.map(imageToMessage);
  reply(replyToken, msgs.slice(0, 5));
  if (msgs.length > 5 && to) push(to, msgs.slice(5, 10));
}

function lineToken() {
  var t = PropertiesService.getScriptProperties().getProperty('LINE_TOKEN');
  if (!t) throw new Error('Thiếu Script Property LINE_TOKEN');
  return t;
}
function replyText(replyToken, text) { reply(replyToken, [{ type: 'text', text: text }]); }
function reply(replyToken, messages) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + lineToken() },
    payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
    muteHttpExceptions: true
  });
}
// Push CÓ TỐN QUOTA (tính theo số người trong nhóm) — chỉ gọi khi thật sự cần
// gửi thêm ngoài giới hạn 5 ảnh/lượt của Reply. Xem ghi chú đầu file.
function push(to, messages) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + lineToken() },
    payload: JSON.stringify({ to: to, messages: messages }),
    muteHttpExceptions: true
  });
}
