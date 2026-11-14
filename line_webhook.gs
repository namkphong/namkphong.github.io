/**
 * line_webhook.gs — Bot LINE: CHỈ CÒN PHẦN CHECKLIST CÔNG VIỆC.
 * =========================================================================
 * Đã gỡ toàn bộ lệnh báo cáo/ảnh (/số /bc /bcnv /sieuthi /tuan /cum /rtcum
 * /tomtat /tonghop /nv /dangky…) và mọi kết nối máy chủ ngoài. Bot chỉ phục vụ:
 *   • /sang · /chieu  — checklist công việc theo ca, bấm "Hoàn tất".
 *   • /thongke        — thống kê checklist từ thứ Hai tới nay.
 *   • /qlst           — nút mở trang web chấm checklist QLST (Đạt/Không đạt).
 *   • /dangkyqlst · /huyqlst — nhận/ngừng checklist QLST tự động (7h30, 15h, 20h).
 *   • /so · /tonghop  — thẻ Flex số Realtime / Lũy kế do app DataSnap gửi lên (mọi cụm).
 *   • /nv · /nvthang  — nhân viên (Realtime / Lũy kế): bảng xếp hạng + thẻ chi tiết từng người.
 *   • /dangky <mã ST> · /huydangky — gắn nhóm LINE với siêu thị để xem /so /tonghop.
 *   • /cp             — coupon Giờ vàng giá sốc: chọn ngành → Lấy mã → Sao chép (mã đã giao bị gỡ).
 * Dữ liệu checklist lưu trong Script Properties của chính Apps Script này.
 * Số bán hàng KHÔNG lưu lâu: chỉ nằm trong CacheService tối đa 6 tiếng rồi tự xoá.
 *
 * CẬP NHẬT KHI SỬA: Deploy -> Manage deployments -> bút chì -> New version -> Deploy.
 * Script Properties cần: LINE_TOKEN = channel access token.
 * Hẹn giờ QLST: chạy hàm caiHenGioQlst MỘT LẦN trong trình soạn Apps Script.
 */

var NL = String.fromCharCode(10);
var BOT_VER = '2026-11-14.1-chan-doan-so';

function doGet(e) {
  // API cho trang qlst.html (xem apiQlst). Không có ?api= thì trả chuỗi kiểm bản.
  if (e && e.parameter && /^qlst/.test(e.parameter.api || '')) {
    var kq;
    try { kq = apiQlst(e.parameter); } catch (err) { kq = { ok: false, loi: String(err) }; }
    return ContentService.createTextOutput(JSON.stringify(kq)).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(
    'OK — bot (/cp /so /tonghop /nv /nvthang /dangky /sang /chieu /thongke /qlst /dangkyqlst /huyqlst) đang chạy. Bản: ' + BOT_VER);
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return ContentService.createTextOutput('OK'); }
  // Gói tóm tắt từ trang doc-so.html (app DataSnap) — không phải sự kiện LINE.
  if (body && body.lenh === 'goiSo') {
    var kq;
    try { kq = nhanGoiSo(body); } catch (err) { kq = { ok: false, loi: String(err) }; }
    return ContentService.createTextOutput(JSON.stringify(kq)).setMimeType(ContentService.MimeType.JSON);
  }
  // Coupon Giờ vàng giá sốc từ userscript gvgs-coupon.user.js (portal mail).
  if (body && body.lenh === 'coupon') {
    var kqCp;
    try { kqCp = nhanCoupon(body); } catch (err) { kqCp = { ok: false, loi: String(err) }; }
    return ContentService.createTextOutput(JSON.stringify(kqCp)).setMimeType(ContentService.MimeType.JSON);
  }
  try { ((body && body.events) || []).forEach(handleEvent); }
  catch (err) { console.error('doPost lỗi: ' + err); }
  return ContentService.createTextOutput('OK');
}

function handleEvent(ev) {
  // Nút "Hoàn tất" trên thẻ /sang /chieu (postback ck=) và thẻ QLST cũ (ql=).
  if (ev && ev.type === 'postback' && ev.replyToken && ev.postback &&
      /^ck=/.test(ev.postback.data || '')) { bamHoanTat(ev); return; }
  if (ev && ev.type === 'postback' && ev.replyToken && ev.postback &&
      /^ql=/.test(ev.postback.data || '')) { bamQlst(ev); return; }
  if (ev && ev.type === 'postback' && ev.replyToken && ev.postback &&
      /^cp=/.test(ev.postback.data || '')) { bamCoupon(ev); return; }
  if (!ev || ev.type !== 'message' || !ev.message || ev.message.type !== 'text' || !ev.replyToken) return;
  var raw = (ev.message.text || '').normalize('NFC').trim();
  if (raw.charAt(0) !== '/') return;         // không có / thì bot im
  var cmd = raw.slice(1).trim().toLowerCase();

  if (cmd === 'help' || cmd === 'trợ giúp' || cmd === 'tro giup') {
    replyText(ev.replyToken,
      'Lệnh số (từ app DataSnap):' + NL +
      '• /so — số REALTIME hôm nay: tiến độ, thi đua, ngành hàng.' + NL +
      '• /tonghop — số LŨY KẾ tháng: % HT, dự báo, thi đua.' + NL +
      '• /nv — NHÂN VIÊN hôm nay: xếp hạng + thẻ chi tiết từng người (ngành đã bán, trả góp…).' + NL +
      '• /nvthang — nhân viên LŨY KẾ tháng (có target, % tiến độ, thi đua từng người). Nhóm nhiều siêu thị: /nv <mã>.' + NL +
      '• Đông người: xem tiếp trang /nvthang 2 (hoặc /nvthang 14285 2) · xem 1 người: /nv <tên>, vd /nvthang quỳnh.' + NL +
      '• /dangky <mã siêu thị> — gắn nhóm với siêu thị (vd /dangky 14285) · /huydangky để bỏ.' + NL + NL +
      'Coupon Giờ vàng giá sốc:' + NL +
      '• /cp — chọn ngành → bấm "Lấy mã" đúng model → bấm "Sao chép mã". Mã đã giao bị gỡ, người sau không lấy trùng.' + NL +
      '• /cp tivi — mở thẳng 1 ngành (hoặc gõ tên model) · /cp ls — ai đã lấy mã nào.' + NL + NL +
      'Lệnh checklist:' + NL +
      '• /sang · /chieu — checklist công việc ca sáng / ca chiều, bấm "Hoàn tất" khi làm xong.' + NL +
      '• /thongke — từ thứ Hai tới nay: ai làm bao nhiêu việc, việc trễ deadline, việc không hoàn thành.' + NL +
      '• /qlst — nút mở trang web chấm checklist QLST (Đạt / Không đạt).' + NL +
      '• /dangkyqlst — nhóm này nhận checklist QLST ~7h30 + tổng kết ~15h, ~20h · /huyqlst để ngừng.');
    return;
  }
  if (/^(?:sang|sáng|checklist|check list)$/.test(cmd)) {
    replyFlexAnToan(ev.replyToken, dungTheChecklist('sang', chatCua(ev.source)));
    return;
  }
  if (/^(?:chieu|chiều)$/.test(cmd)) {
    replyFlexAnToan(ev.replyToken, dungTheChecklist('chieu', chatCua(ev.source)));
    return;
  }
  if (/^(?:qlst|checklist qlst)$/.test(cmd)) {
    replyFlexAnToan(ev.replyToken, theMoQlst(chatCua(ev.source)));
    return;
  }
  if (/^(?:dang ?ky ?qlst|đăng ?ký ?qlst|đăng ?kí ?qlst)$/.test(cmd)) {
    var chatQ = chatCua(ev.source), dsQ = dsNhomQlst();
    if (dsQ.indexOf(chatQ) === -1) { dsQ.push(chatQ); luuNhomQlst(dsQ); }
    var henQ = coHenGioQlst();
    replyText(ev.replyToken,
      '✅ Đã đăng ký: nhóm này sẽ nhận CHECKLIST QLST tự động mỗi sáng khoảng 7h30,' + NL +
      'và TỔNG KẾT lúc khoảng 15h và 20h.' + NL +
      'Bấm nút "Mở checklist" để chấm Đạt / Không đạt trên trang web. Muốn mở ngay thì gõ /qlst.' + NL +
      'Ngừng nhận thì gõ /huyqlst.' +
      (henQ ? '' : NL + NL + '⚠ Bot CHƯA được hẹn giờ gửi. Người quản lý bot cần chạy hàm caiHenGioQlst một lần trong Apps Script.'));
    return;
  }
  if (/^(?:huy ?qlst|huỷ ?qlst|hủy ?qlst)$/.test(cmd)) {
    var chatH = chatCua(ev.source);
    luuNhomQlst(dsNhomQlst().filter(function (g) { return g !== chatH; }));
    replyText(ev.replyToken, 'Đã huỷ: nhóm này không nhận checklist QLST tự động nữa. Vẫn gõ /qlst để xem khi cần.');
    return;
  }
  if (/^(?:thongke|thống kê|thong ke|thốngkê)$/.test(cmd)) {
    replyText(ev.replyToken, dungThongKe(chatCua(ev.source)));
    return;
  }
  // /dangky <mã ST> — phải có số phía sau nên không đụng /dangkyqlst ở trên.
  var mDk = /^(?:dang ?ky|đăng ?ký|đăng ?kí)\s+([\d\s,;]+)$/.exec(cmd);
  if (mDk) { dangKySo(ev, mDk[1]); return; }
  if (/^(?:huy|huỷ|hủy) ?(?:dang ?ky|đăng ?ký|đăng ?kí)$/.test(cmd)) {
    PropertiesService.getScriptProperties().setProperty('nhomSo|' + chatCua(ev.source), ',');   // ',' = đã bỏ, không rơi về nhóm cũ
    replyText(ev.replyToken, 'Đã bỏ gắn: nhóm này không xem số siêu thị nào nữa. Gắn lại: /dangky <mã siêu thị>.');
    return;
  }
  // /nv · /nhanvien (Realtime) · /nvthang · /nv lk (Lũy kế), có thể kèm mã ST: /nv 14285
  // Thêm 08/11: /nvthang 2 (trang 2) · /nvthang 14285 2 · /nv quỳnh (tìm theo tên)
  var mNv = /^(?:nv|nhan ?vien|nhân ?viên)\s*(thang|tháng|lk|luyke|luy ke|lũy kế|luỹ kế|tonghop|tong hop|tổng hợp)?(?:\s+(.+))?$/.exec(cmd);
  if (mNv) {
    var kyNv = mNv[1] ? 'luyke' : 'realtime', thamSo = (mNv[2] || '').trim(), mMa;
    if (!thamSo) traLoiNV(ev, kyNv, '', 1);
    else if ((mMa = /^(\d{3,6})(?:\s+(\d{1,2}))?$/.exec(thamSo))) traLoiNV(ev, kyNv, mMa[1], +(mMa[2] || 1));
    else if (/^\d{1,2}$/.test(thamSo)) traLoiNV(ev, kyNv, '', +thamSo);
    else timNV(ev, kyNv, thamSo);
    return;
  }
  // /cp · /coupon — coupon Giờ vàng giá sốc; kèm từ khoá: /cp tivi · /cp ls (ai đã lấy mã)
  var mCp = /^(?:cp|coupon|coupons|cou pon)(?:\s+(.+))?$/.exec(cmd);
  if (mCp) { traLoiCoupon(ev, (mCp[1] || '').trim()); return; }
  if (/^(?:so|số|realtime|rt)$/.test(cmd)) { traLoiSo(ev, 'realtime'); return; }
  if (/^(?:tonghop|tong hop|tổng hợp|tổnghợp|luyke|luy ke|lũy kế|luỹ kế)$/.test(cmd)) { traLoiSo(ev, 'luyke'); return; }
  // Lệnh khác: bỏ qua.
}

/* ---------- Primitives LINE ---------- */
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
// Push TỐN QUOTA (tính theo số người trong nhóm) — chỉ dùng cho gửi QLST tự động.
function push(to, messages) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + lineToken() },
    payload: JSON.stringify({ to: to, messages: messages }),
    muteHttpExceptions: true
  });
}
function flexHopLe(msg) {
  try {
    var r = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/validate/reply', {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + lineToken() },
      payload: JSON.stringify({ messages: [msg] }), muteHttpExceptions: true
    });
    if (r.getResponseCode() === 200) return true;
    console.error('Flex không hợp lệ: ' + r.getContentText());
  } catch (e) { console.error('validate lỗi: ' + e); }
  return false;
}
function replyFlexAnToan(replyToken, msg) {
  var ds = Object.prototype.toString.call(msg) === '[object Array]' ? msg : [msg];
  if (!ds.length) return;
  var kiem = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/validate/reply', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + lineToken() },
    payload: JSON.stringify({ messages: ds }), muteHttpExceptions: true
  });
  if (kiem.getResponseCode() !== 200) {
    console.error('Flex không hợp lệ: ' + kiem.getContentText());
    replyText(replyToken, '⚠ Không dựng được thẻ (LINE từ chối định dạng).' + NL + String(kiem.getContentText()).slice(0, 200));
    return;
  }
  reply(replyToken, ds);
}

var CHECKLIST = {
  sang: { tieuDe: '✅ CHECKLIST CÔNG VIỆC CA SÁNG', mau: '#0A84FF', mauPhu: '#DCEBFF', lenh: '/sang', viec: [
    { id: 'ckonl', icon: '📦', ten: 'Check lệnh chuyển kho Online', han: '09:15' },
    { id: 'ghtk',  icon: '🚚', ten: 'Check đơn GHTK chuyển kho',    han: '09:30' },
    { id: 'tugia', icon: '🏷️', ten: 'Chạy tủ và thay giá (thứ 2 & thứ 5)', han: '10:00', thu: [2, 5] },
    { id: 'toke',  icon: '🧹', ten: 'Rà soát tốc kệ (hình ảnh báo cáo)', han: '11:30' },
    { id: 'cknk',  icon: '📄', ten: 'Check phiếu (CK & NK) quá 7 ngày', han: '11:30' },
    { id: 'tthai', icon: '🔧', ten: 'Đổ tồn hàng trạng thái lỗi',    han: '14:00' },
    { id: 'noptien', icon: '🏦', ten: 'Nộp tiền ngân hàng',         han: '14:00' },
    { id: 'bcnb',  icon: '📊', ten: 'Xử lý BCNB sáng',               han: '15:00' } ] },
  chieu: { tieuDe: '🌙 CHECKLIST CÔNG VIỆC CA CHIỀU', mau: '#2B3F6C', mauPhu: '#C9D4EE', lenh: '/chieu', viec: [
    { id: 'ckonl', icon: '📦', ten: 'Check lệnh online',            han: '15:15' },
    { id: 'ghtk',  icon: '🚚', ten: 'Check đơn GHTK',               han: '15:30' },
    { id: 'xepkho', icon: '📦🧹', ten: 'Sắp xếp hàng hóa kho',       han: '16:00' },
    { id: 'toke',  icon: '🖼️', ten: 'Rà soát tốc kệ (gia dụng/tivi)', han: '16:30' },
    { id: 'bcnb',  icon: '📊', ten: 'Xử lý BCNB chiều',             han: '17:30' },
    { id: 'tthai', icon: '🔧', ten: 'Đổ tồn hàng T.Thái (lỗi)',     han: '19:00' },
    { id: 'grab',  icon: '📦🚚', ten: 'Check GHTK / Grab',           han: '21:00' },
    { id: 'mayc',  icon: '📸', ten: 'Up hình máy cũ / trưng bày',   han: '21:30' },
    { id: 'kiemquy', icon: '💰', ten: 'Kiểm quỹ thu ngân và báo cáo (21h–22h)', han: '22:00' } ] }
};

// Thứ trong tuần theo giờ Việt Nam, đánh số kiểu VN: 2 = thứ Hai … 8 = Chủ nhật.
function thuVN(d) {
  return Number(Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'u')) + 1;
}

// VIỆC ĐÃ XONG của một nhóm, một ngày, một ca: { id: { ten, gio } }.
//
// Lưu ở Script Properties chứ không ở CacheService: cache sống tối đa 6 tiếng,
// mà ca chiều kéo từ 15h tới 21h30 — việc bấm lúc 15h sẽ "quên" mất trước khi
// ca kết thúc và thẻ lại hiện nút xanh.
function chatCua(src) { src = src || {}; return src.groupId || src.roomId || src.userId || 'x'; }
function khoaCa(chat, ngay, ca) { return 'ck|' + chat + '|' + ngay + '|' + ca; }
function docViecXong(chat, ngay, ca) {
  try {
    return JSON.parse(PropertiesService.getScriptProperties().getProperty(khoaCa(chat, ngay, ca)) || '{}');
  } catch (e) { console.error('docViecXong lỗi: ' + e); return {}; }
}
// Ghi thêm một việc. Trả về bản ghi CŨ nếu việc đó đã có người báo xong trước.
// Khoá để hai người bấm cùng lúc không ghi đè mất việc của nhau.
function ghiViecXong(chat, ngay, ca, id, ten, gio, kq) {
  var khoa = LockService.getScriptLock();
  try { khoa.waitLock(10000); } catch (e) { console.error('ghiViecXong không lấy được khoá: ' + e); }
  try {
    var p = PropertiesService.getScriptProperties();
    var xong = docViecXong(chat, ngay, ca);
    if (xong[id]) return xong[id];
    xong[id] = { ten: ten, gio: gio };
    if (kq) xong[id].kq = kq;   // checklist QLST: 'dat' / 'khong'
    p.setProperty(khoaCa(chat, ngay, ca), JSON.stringify(xong));
    // Dọn bản ghi cũ hơn 8 ngày, để kho Properties (500 KB) không đầy dần.
    // Giữ đủ 8 ngày vì /thongke tính từ thứ Hai đầu tuần.
    var han = ngayLui(ngay, 8);
    p.getKeys().forEach(function (k) {
      if (k.indexOf('ck|') === 0 && k.split('|')[2] < han) p.deleteProperty(k);
    });
    return null;
  } finally { try { khoa.releaseLock(); } catch (e) {} }
}

// Ngày 'yyyy-MM-dd' lùi n ngày (giờ VN không đổi theo mùa nên trừ thẳng 24h).
function ngayLui(ngay, n) {
  return Utilities.formatDate(new Date(Date.parse(ngay + 'T12:00:00+07:00') - n * 86400000),
    'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}

/* /thongke — THỐNG KÊ CHECKLIST từ thứ Hai đầu tuần tới hôm nay, cho nhóm này.
 *
 * Mỗi ca chỉ tính từ NGÀY ĐẦU TIÊN nhóm có người bấm ca đó: nhóm chưa từng
 * dùng /chieu thì không bị đếm cả ca chiều là "không hoàn thành", và mấy ngày
 * trước khi bắt đầu dùng bot cũng không bị tính.
 * Việc của hôm nay chỉ coi là "không hoàn thành" khi đã QUA deadline. */
function dungThongKe(chat) {
  var bay = new Date();
  var homNay = Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var gioNay = Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'HH:mm');
  var thuNay = thuVN(bay);
  var thu2 = ngayLui(homNay, thuNay - 2);
  var ngays = [];
  for (var n = thuNay - 2; n >= 0; n--) ngays.push(ngayLui(homNay, n));
  var props = PropertiesService.getScriptProperties();
  var nguoi = {}, tongViec = 0, tongXong = 0, tre = [], khong = [];
  var dd = function (d) { return d.slice(8, 10) + '/' + d.slice(5, 7); };
  Object.keys(CHECKLIST).forEach(function (ca) {
    var bo = CHECKLIST[ca];
    var duLieu = ngays.map(function (d) {
      var s = props.getProperty(khoaCa(chat, d, ca));
      try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
    });
    var batDau = -1;
    for (var i = 0; i < duLieu.length; i++) if (duLieu[i]) { batDau = i; break; }
    if (batDau < 0) return;
    var tenCa = ca === 'sang' ? 'sáng' : 'chiều';
    for (var j = batDau; j < ngays.length; j++) {
      var d = ngays[j], xong = duLieu[j] || {};
      var thuD = thuVN(new Date(Date.parse(d + 'T12:00:00+07:00')));
      bo.viec.forEach(function (v) {
        if (v.thu && v.thu.indexOf(thuD) === -1) return;
        var x = xong[v.id];
        if (!x && d === homNay && gioNay <= v.han) return;   // hôm nay, chưa tới hạn
        tongViec++;
        if (!x) { khong.push(d + v.han + '|' + dd(d) + ' ' + tenCa + ': ' + v.ten); return; }
        tongXong++;
        var nv = nguoi[x.ten] || (nguoi[x.ten] = { so: 0, tre: 0 });
        nv.so++;
        if (x.gio > v.han) {
          nv.tre++;
          tre.push(d + x.gio + '|' + dd(d) + ' ' + v.ten + ' — ' + x.ten + ' ' + x.gio + ' (hạn ' + v.han + ')');
        }
      });
    }
  });
  if (!tongViec && !Object.keys(nguoi).length) {
    return 'Tuần này (từ thứ Hai ' + dd(thu2) + ') nhóm chưa có ai bấm "Hoàn tất" việc nào.' + NL +
      'Gõ /sang hoặc /chieu để mở checklist.';
  }
  // Danh sách chi tiết cắt ở 15 dòng: tin chữ LINE tối đa 5.000 ký tự.
  var cat = function (ds) {
    // Phần trước dấu | chỉ để xếp theo ngày, giờ — bỏ đi khi in.
    ds = ds.slice().sort().map(function (s) { return s.slice(s.indexOf('|') + 1); });
    return ds.slice(0, 15).map(function (s) { return '  • ' + s; }).join(NL) +
      (ds.length > 15 ? NL + '  … và ' + (ds.length - 15) + ' việc nữa' : '');
  };
  var bang = Object.keys(nguoi).sort(function (a, b) { return nguoi[b].so - nguoi[a].so; })
    .map(function (t, i) {
      return (i + 1) + '. ' + t + ' — ' + nguoi[t].so + ' việc' + (nguoi[t].tre ? ' (' + nguoi[t].tre + ' trễ)' : '');
    });
  return '📊 THỐNG KÊ CHECKLIST' + NL +
    'Từ thứ Hai ' + dd(thu2) + ' đến ' + (thuNay === 8 ? 'Chủ nhật' : 'thứ ' + thuNay) + ' ' + dd(homNay) +
    ' (' + gioNay + ')' + NL + NL +
    '👤 Ai bấm bao nhiêu việc:' + NL + (bang.length ? bang.join(NL) : '  (chưa ai)') + NL + NL +
    '✅ Hoàn thành: ' + tongXong + '/' + tongViec + ' việc' + NL +
    '⏰ Trễ deadline: ' + tre.length + ' việc' + (tre.length ? NL + cat(tre) : '') + NL +
    '❌ Không hoàn thành: ' + khong.length + ' việc' + (khong.length ? NL + cat(khong) : '') + NL + NL +
    'Việc hôm nay chưa tới deadline thì chưa tính.';
}

function dungTheChecklist(ca, chat) {
  var bo = CHECKLIST[ca];
  var bay = new Date();
  var ngay = Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var thu = thuVN(bay);
  var viec = bo.viec.filter(function (v) { return !v.thu || v.thu.indexOf(thu) !== -1; });
  var xong = docViecXong(chat, ngay, ca);
  var dong = [];
  viec.forEach(function (v, i) {
    if (i) dong.push({ type: 'separator', margin: 'md' });
    var x = xong[v.id];
    // Việc xong: chữ xám gạch ngang, nút xám "✓ Xong" (hộp không bấm được),
    // kèm ai báo lúc mấy giờ. Chưa xong: như cũ, bấm luôn trên thẻ này.
    var hang2 = x
      ? { type: 'text', text: 'Deadline ' + v.han, size: 'sm', wrap: true, contents: [
          { type: 'span', text: 'Deadline ', color: '#9A9A9A' },
          { type: 'span', text: v.han, color: '#9A9A9A', weight: 'bold' },
          { type: 'span', text: '  · ' + x.ten + ' ' + x.gio, color: '#9A9A9A' } ] }
      : { type: 'text', text: 'Deadline ' + v.han, size: 'sm', contents: [
          { type: 'span', text: 'Deadline ', color: '#FF5551' },
          { type: 'span', text: v.han, color: '#FF3B30', weight: 'bold' } ] };
    var nut = x
      ? { type: 'box', layout: 'vertical', flex: 3, backgroundColor: '#CFCFCF', cornerRadius: '8px',
          paddingAll: '8px', justifyContent: 'center', contents: [
            { type: 'text', text: '✓ Xong', color: '#FFFFFF', align: 'center', size: 'md' } ] }
      : { type: 'button', style: 'primary', height: 'sm', color: '#06B050', flex: 3,
          action: { type: 'postback', label: 'Hoàn tất', data: 'ck=' + ca + '&d=' + ngay + '&i=' + v.id } };
    dong.push({ type: 'box', layout: 'horizontal', margin: 'md', spacing: 'md', alignItems: 'center', contents: [
      { type: 'text', text: v.icon, size: 'xl', flex: 0 },
      { type: 'box', layout: 'vertical', flex: 5, contents: [
        { type: 'text', text: v.ten, weight: 'bold', size: 'md', wrap: true,
          color: x ? '#9A9A9A' : '#111111', decoration: x ? 'line-through' : 'none' },
        hang2 ] },
      nut ] });
  });
  var soXong = viec.filter(function (v) { return xong[v.id]; }).length;
  dong.push({ type: 'text', text: soXong === viec.length ? '🎉 Đã xong hết ' + viec.length + ' việc!'
                                   : 'Đã xong ' + soXong + '/' + viec.length + ' việc',
    size: 'sm', color: '#666666', align: 'end', margin: 'lg' });
  var tenThu = thu === 8 ? 'Chủ nhật' : 'Thứ ' + thu;
  return { type: 'flex', altText: bo.tieuDe.replace(/^\S+\s/, ''), contents: {
    type: 'bubble', size: 'mega',
    header: { type: 'box', layout: 'vertical', backgroundColor: bo.mau, paddingAll: '16px', contents: [
      { type: 'text', text: bo.tieuDe, color: '#FFFFFF', weight: 'bold', size: 'lg', wrap: true },
      { type: 'text', text: tenThu + ', ' + Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'),
        color: bo.mauPhu, size: 'sm', margin: 'xs' } ] },
    body: { type: 'box', layout: 'vertical', paddingAll: '14px', contents: dong } } };
}

// Tên người bấm. Trong nhóm phải hỏi qua đường "thành viên nhóm" — người đó
// không cần kết bạn với bot. Hỏi không được thì gọi chung là "Có người".
function tenNguoiBam(src) {
  if (!src || !src.userId) return 'Có người';
  var duong = src.groupId ? 'group/' + src.groupId + '/member/' + src.userId
            : src.roomId ? 'room/' + src.roomId + '/member/' + src.userId
            : 'profile/' + src.userId;
  try {
    var r = UrlFetchApp.fetch('https://api.line.me/v2/bot/' + duong, {
      headers: { Authorization: 'Bearer ' + lineToken() }, muteHttpExceptions: true });
    if (r.getResponseCode() === 200) return JSON.parse(r.getContentText()).displayName || 'Có người';
  } catch (e) { console.error('tenNguoiBam lỗi: ' + e); }
  return 'Có người';
}

function bamHoanTat(ev) {
  var q = {};
  String(ev.postback.data).split('&').forEach(function (p) {
    var k = p.split('='); q[k[0]] = decodeURIComponent(k[1] || '');
  });
  var bo = CHECKLIST[q.ck] || CHECKLIST.sang;
  var v = bo.viec.filter(function (x) { return x.id === q.i; })[0];
  if (!v) { replyText(ev.replyToken, 'Việc này không còn trong checklist. Gõ ' + bo.lenh + ' để lấy thẻ mới.'); return; }
  var homNay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  if (q.d !== homNay) { replyText(ev.replyToken, 'Đây là thẻ của ngày cũ. Gõ ' + bo.lenh + ' để lấy checklist hôm nay.'); return; }
  var gio = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm');
  var ca = CHECKLIST[q.ck] ? q.ck : 'sang';
  var chat = chatCua(ev.source);
  var ten = tenNguoiBam(ev.source);
  // Hai người cùng bấm: chỉ người đầu được ghi, người sau nhận câu "đã xong rồi"
  // để nhóm khỏi tưởng việc làm hai lần.
  var cu = ghiViecXong(chat, homNay, ca, v.id, ten, gio);
  var tin = cu
    ? { type: 'text', text: '☑️ "' + v.ten + '" đã xong rồi — ' + cu.ten + ' báo lúc ' + cu.gio + '.' }
    : { type: 'text', text: '✅ Xong: ' + v.ten + NL + '👤 ' + ten + ' · ' + gio +
        (gio > v.han ? '  (trễ hạn ' + v.han + ')' : '') };
  // Kèm THẺ MỚI: việc xong hiện xám "✓ Xong", việc còn lại bấm luôn trên thẻ
  // này. LINE không cho sửa thẻ cũ nên đây là cách duy nhất cập nhật. Thẻ sai
  // khuôn thì vẫn gửi riêng câu "Xong" — không để mất cả hai.
  var the = dungTheChecklist(ca, chat);
  reply(ev.replyToken, flexHopLe(the) ? [tin, the] : [tin]);
}


/* CHECKLIST CÔNG VIỆC TRONG CA CỦA QUẢN LÝ SIÊU THỊ (QLST).
 *
 * Lấy từ file "THÁNG 10 - CHECK LIST CÔNG VIỆC TRONG CA.xls". Mỗi mục chấm
 * ĐẠT / KHÔNG ĐẠT như cột đánh giá trong file. Khác /sang, /chieu ở chỗ bot TỰ
 * GỬI vào những nhóm đã gõ /dangkyqlst: nút mở checklist ~7h30, tổng kết ~15h
 * và ~20h. Chấm trên TRANG WEB qlst.html (danh sách dọc) chứ không bấm nút
 * trong thẻ LINE — bản thẻ vuốt ngang bấm chậm và khó dùng.
 * id KHÔNG ĐỔI (kết quả đã chấm lưu theo id). */
var QLST = [
  { ten: 'TRIỂN KHAI ĐẦU NGÀY', icon: '📋', nhom: [
    { ten: 'Nhân sự - Triển khai', viec: [
      ['dd1', 'Điểm danh nhân sự có mặt đầu ca đúng giờ quy định'],
      ['dd2', 'Đổ số đầu ngày (Thi đua - luỹ kế NH - Doanh thu - kết quả NVST)'],
      ['dd3', 'Họp nhân viên đầu ca - nhận mục tiêu siêu thị - từng nhân viên'],
      ['dd4', 'Nhận thông tin, đọc hết các line đầu ngày của CỤM - MIỀN - NGÀNH HÀNG'],
      ['dd5', 'Đọc xử lý hết BCNB đầu ngày (đọc hết, đọc đủ các thông tin triển khai để nắm bắt)'],
      ['dd6', 'Nhận xét STRAM 2 nhân viên trong siêu thị ở ca làm việc'] ] } ] },
  { ten: 'BÊN NGOÀI SIÊU THỊ', icon: '🏪', nhom: [
    { ten: '', viec: [
      ['ng1', 'Banner chính + banner hông không trùng, các mép không bị rách, đúng nội dung'],
      ['ng2', 'Đèn bảng hiệu sáng đầy đủ (theo layout sole), bảng hiệu không bị cây vỉa hè che chắn'],
      ['ng3', 'Hộp đèn logo sạch, bóng đèn bên trong sáng'],
      ['ng4', 'Dù, bàn bảo vệ, loa sạch sẽ, không bám bụi'],
      ['ng5', 'Sân không rác, không bám nhiều đất cát'],
      ['ng6', 'Kính mặt tiền sạch, trong, không bám bụi và các vết dơ khác'] ] } ] },
  { ten: 'BÊN TRONG SIÊU THỊ (1/2)', icon: '🏬', nhom: [
    { ten: 'Tường và trần nhà', viec: [
      ['tr1', 'Kính mặt tiền sạch, trong, không bám bụi và các vết dơ khác'],
      ['tr2', 'Trần nhà và các góc trên trần không mạng nhện'],
      ['tr3', 'Bóng đèn trần sáng đầy đủ'],
      ['tr4', 'Vách tường sạch, không vết dơ'],
      ['tr5', 'Máy lạnh sạch, không chảy nước, tường bên dưới máy lạnh không bám các vết dơ'],
      ['tr6', 'Mọi ngóc ngách đều không có dao mổ của trang trí'] ] },
    { ten: 'Bàn tư vấn', viec: [
      ['bt1', 'Chân bàn chắc chắn, không bị chênh, không bám bụi, bám keo'],
      ['bt2', 'Mặt bàn sạch, không bám keo, A5 trên bàn không gãy, đúng nội dung'] ] },
    { ten: 'Quầy Thu ngân, HTKT, Trang trí', viec: [
      ['q1', 'Bên trong quầy gọn gàng, ngăn nắp, không vật dụng cá nhân'],
      ['q2', 'Bên trên mặt các quầy sạch sẽ, không bám các vết keo, không dán bất cứ thông tin nào khác'] ] } ] },
  { ten: 'BÊN TRONG SIÊU THỊ (2/2)', icon: '📱', nhom: [
    { ten: 'Tủ điện thoại mới, cũ', viec: [
      ['dt1', 'Kính tủ sạch, các góc bên trên tủ không mạng nhện'],
      ['dt2', 'Thanh đèn led không bám bụi, số trên led rõ ràng'],
      ['dt3', 'Chân tủ không vết keo, không dán bất kỳ thông tin nào lên cửa tủ'] ] },
    { ten: 'Tủ Tablet, bàn Laptop, bàn trải nghiệm', viec: [
      ['tb1', 'Kính tủ sạch, chân tủ, chân bàn không vết keo'],
      ['tb2', 'Mica bên trong tủ không bụi'] ] },
    { ten: 'Các vách phụ kiện', viec: [
      ['pk1', 'Chân vách, các thanh nhựa bên trên sạch, vách không bám keo'],
      ['pk2', 'Các hàng hóa PK không bám bụi và dính keo'],
      ['pk3', 'Các góc phía trên bên trong mica nhựa ngay bóng đèn không có mạng nhện'] ] },
    { ten: 'Khu vực điện tử, điện lạnh, gia dụng ĐMX', viec: [
      ['dm1', 'Hàng hoá tuyệt đối không bám bụi'],
      ['dm2', 'Chân tủ, vách, kệ sạch sẽ, không bám keo'],
      ['dm3', 'Topper trả góp, mica giá, bảng giá plastic đầy đủ, sạch, không dính keo và bụi'],
      ['dm4', 'Thùng hàng dưới các line hàng sạch sẽ, mới, đồng nhất, không bám keo và bụi'] ] } ] },
  { ten: 'KHO & NHÀ VỆ SINH', icon: '🧹', nhom: [
    { ten: 'Kho siêu thị - phòng nhân viên', viec: [
      ['kh1', 'Sạch sẽ, không rác, không đồ ăn thức uống, không vật dụng thừa'],
      ['kh2', 'Hàng hoá được sắp xếp đúng nơi quy định, gọn gàng, ngăn nắp'] ] },
    { ten: 'Nhà vệ sinh', viec: [
      ['wc1', 'Các thiết bị vòi nước, bồn rửa tay, bồn cầu sạch sẽ, không có các vết ố, vết bẩn, rỉ sét'],
      ['wc2', 'Lỗ thoát nước sạch, không bám đất cát, rác. Sàn sạch và khô ráo'],
      ['wc3', 'Tuyệt đối không có mùi hôi, không chứa các vật dụng thừa'] ] } ] }
];

function qlstMuc(id) {
  for (var i = 0; i < QLST.length; i++)
    for (var j = 0; j < QLST[i].nhom.length; j++)
      for (var k = 0; k < QLST[i].nhom[j].viec.length; k++)
        if (QLST[i].nhom[j].viec[k][0] === id) return QLST[i].nhom[j].viec[k][1];
  return null;
}

// Trang web chấm checklist (namkphong.github.io/qlst.html). Bot chỉ gửi NÚT
// MỞ TRANG — chấm trên web nhanh hơn hẳn bấm nút trong thẻ LINE (mỗi lần bấm
// thẻ là bot phải dựng và gửi lại cả thẻ, mất vài giây).
var TRANG_QLST = 'https://namkphong.github.io/qlst.html';

// CHỮ KÝ NHÓM: link mở trang mang id nhóm + chữ ký này. Không có chữ ký đúng
// thì API không cho đọc/ghi — người ngoài đoán id nhóm cũng không chấm bậy được.
function kyNhom(chat) {
  var b = Utilities.computeHmacSha256Signature('qlst|' + chat, lineToken());
  return b.slice(0, 8).map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('');
}
function linkQlst(chat) {
  return TRANG_QLST + '?g=' + encodeURIComponent(chat) + '&k=' + kyNhom(chat);
}

// Đếm tình trạng chấm hôm nay của một nhóm.
function demQlst(cham) {
  var r = { tong: 0, dat: [], khong: [], chua: [] };
  QLST.forEach(function (p) { p.nhom.forEach(function (n) { n.viec.forEach(function (v) {
    r.tong++;
    var x = cham[v[0]];
    if (!x) r.chua.push({ phan: p.ten, ten: v[1] });
    else (x.kq === 'khong' ? r.khong : r.dat).push({ phan: p.ten, ten: v[1], ai: x.ten, gio: x.gio });
  }); }); });
  return r;
}

// Thẻ NHỎ có nút mở trang chấm: gửi lúc ~7h30, khi gõ /qlst, và kèm tổng kết.
function theMoQlst(chat, tieuDe) {
  var bay = new Date();
  var ngay = Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var thu = thuVN(bay);
  var d = demQlst(docViecXong(chat, ngay, 'qlst'));
  var soCham = d.dat.length + d.khong.length;
  var tenThu = (thu === 8 ? 'Chủ nhật' : 'Thứ ' + thu) + ', ' + Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
  var o = function (nhan, so, mau) {
    return { type: 'box', layout: 'vertical', flex: 1, contents: [
      { type: 'text', text: String(so), size: 'xl', weight: 'bold', color: mau, align: 'center' },
      { type: 'text', text: nhan, size: 'xs', color: '#666666', align: 'center' } ] };
  };
  return { type: 'flex', altText: (tieuDe || 'Checklist QLST') + ' — đã chấm ' + soCham + '/' + d.tong,
    contents: { type: 'bubble', size: 'kilo',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#0A84FF', paddingAll: '14px', contents: [
        { type: 'text', text: tieuDe || '📋 CHECKLIST QLST', color: '#FFFFFF', weight: 'bold', size: 'md', wrap: true },
        { type: 'text', text: tenThu, color: '#DCEBFF', size: 'xs', margin: 'xs' } ] },
      body: { type: 'box', layout: 'vertical', paddingAll: '14px', contents: [
        { type: 'box', layout: 'horizontal', contents: [
          o('Đạt', d.dat.length, '#06B050'), o('Không đạt', d.khong.length, '#E53935'), o('Chưa chấm', d.chua.length, '#888888') ] } ] },
      footer: { type: 'box', layout: 'vertical', paddingAll: '10px', contents: [
        { type: 'button', style: 'primary', color: '#0A84FF', height: 'sm',
          action: { type: 'uri', label: soCham ? '📝 Mở checklist' : '📝 Bắt đầu chấm', uri: linkQlst(chat) } } ] } } };
}

// TỔNG KẾT gửi lúc 15h và 20h: tin chữ liệt kê mục không đạt + chưa chấm.
function tongKetQlst(chat) {
  var ngay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var gio = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm');
  var d = demQlst(docViecXong(chat, ngay, 'qlst'));
  var nguoi = {};
  d.dat.concat(d.khong).forEach(function (x) { nguoi[x.ai] = (nguoi[x.ai] || 0) + 1; });
  // Tối đa 20 dòng mỗi danh sách: tin chữ LINE giới hạn 5.000 ký tự.
  var ds = function (a, f) {
    return a.slice(0, 20).map(function (x) { return '  • ' + f(x); }).join(NL) +
      (a.length > 20 ? NL + '  … và ' + (a.length - 20) + ' mục nữa' : '');
  };
  return '📊 TỔNG KẾT CHECKLIST QLST — ' + gio + ' ' + ngay.slice(8, 10) + '/' + ngay.slice(5, 7) + NL + NL +
    '✅ Đạt: ' + d.dat.length + '/' + d.tong + NL +
    '❌ Không đạt: ' + d.khong.length + (d.khong.length ? NL + ds(d.khong, function (x) { return x.ten + ' (' + x.ai + ' ' + x.gio + ')'; }) : '') + NL +
    '⏳ Chưa chấm: ' + d.chua.length + (d.chua.length ? NL + ds(d.chua, function (x) { return x.ten; }) : '') + NL + NL +
    '👤 Người chấm: ' + (Object.keys(nguoi).length
      ? Object.keys(nguoi).map(function (t) { return t + ' ' + nguoi[t] + ' mục'; }).join(', ')
      : 'chưa có ai');
}

// Bấm nút trên THẺ CŨ (bản vuốt ngang đã gửi trước đây): vẫn ghi nhận, rồi
// đưa nút mở trang web để chấm tiếp.
function bamQlst(ev) {
  var q = {};
  String(ev.postback.data).split('&').forEach(function (p) {
    var k = p.split('='); q[k[0]] = decodeURIComponent(k[1] || '');
  });
  var ten0 = qlstMuc(q.i);
  var homNay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var chat = chatCua(ev.source);
  if (ten0 && q.d === homNay) {
    ghiViecXong(chat, homNay, 'qlst', q.i, tenNguoiBam(ev.source),
      Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm'), q.ql === 'khong' ? 'khong' : 'dat');
  }
  reply(ev.replyToken, [{ type: 'text', text: 'Checklist QLST nay chấm trên trang web — bấm nút bên dưới.' },
    theMoQlst(chat)]);
}

/* API CHO TRANG qlst.html — gọi qua doGet (?api=...). Trả JSON.
 *   api=qlst                      → danh sách mục + tình trạng chấm hôm nay
 *   api=qlst_cham&i=a,b&kq=dat|khong|bo&ten=…  → chấm (hoặc bỏ chấm) rồi trả như trên
 * Trên web cho CHẤM LẠI (bấm nhầm sửa được), khác nút trong thẻ LINE. */
function apiQlst(p) {
  var chat = p.g || '';
  if (!chat || p.k !== kyNhom(chat)) return { ok: false, loi: 'Link không hợp lệ. Gõ /qlst trong nhóm để lấy link mới.' };
  var bay = new Date();
  var ngay = Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  if (p.api === 'qlst_cham') {
    var ten = String(p.ten || '').trim().slice(0, 40) || 'Có người';
    var gio = Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'HH:mm');
    var kq = p.kq === 'khong' ? 'khong' : p.kq === 'bo' ? '' : 'dat';
    var ids = String(p.i || '').split(',').filter(function (id) { return qlstMuc(id); });
    chamQlstWeb(chat, ngay, ids, kq, ten, gio);
  }
  var thu = thuVN(bay);
  return { ok: true, ngay: ngay,
    tenNgay: (thu === 8 ? 'Chủ nhật' : 'Thứ ' + thu) + ', ' + Utilities.formatDate(bay, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'),
    phan: QLST, cham: docViecXong(chat, ngay, 'qlst') };
}

// Ghi nhiều mục một lượt (nút "Đạt hết phần này"), GHI ĐÈ được. kq rỗng = bỏ chấm.
function chamQlstWeb(chat, ngay, ids, kq, ten, gio) {
  var khoa = LockService.getScriptLock();
  try { khoa.waitLock(10000); } catch (e) { console.error('chamQlstWeb không lấy được khoá: ' + e); }
  try {
    var xong = docViecXong(chat, ngay, 'qlst');
    ids.forEach(function (id) {
      if (!kq) delete xong[id];
      else xong[id] = { ten: ten, gio: gio, kq: kq };
    });
    PropertiesService.getScriptProperties().setProperty(khoaCa(chat, ngay, 'qlst'), JSON.stringify(xong));
  } finally { try { khoa.releaseLock(); } catch (e) {} }
}

// Danh sách nhóm nhận checklist QLST tự động: mảng id nhóm, lưu ở Script Properties.
function dsNhomQlst() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('qlst_nhom') || '[]'); }
  catch (e) { return []; }
}
function luuNhomQlst(ds) {
  PropertiesService.getScriptProperties().setProperty('qlst_nhom', JSON.stringify(ds));
}

// HẸN GIỜ GỬI TỰ ĐỘNG. Chạy hàm này MỘT LẦN trong trình soạn Apps Script
// (chọn caiHenGioQlst → Chạy, cho phép quyền). Tạo 3 hẹn giờ mỗi ngày:
//   ~7h30 gửi nút mở checklist · ~15h và ~20h gửi tổng kết.
// Apps Script chỉ hẹn được "gần phút …" nên tin tới lệch khoảng ±15 phút.
// Chạy lại bao nhiêu lần cũng không bị trùng hẹn giờ.
var HAM_HEN_QLST = ['guiQlstHangNgay', 'guiTongKetQlst'];
function caiHenGioQlst() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (HAM_HEN_QLST.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  var hen = function (ham, gio, phut) {
    ScriptApp.newTrigger(ham).timeBased().atHour(gio).nearMinute(phut).everyDays(1)
      .inTimezone('Asia/Ho_Chi_Minh').create();
  };
  hen('guiQlstHangNgay', 7, 30);
  hen('guiTongKetQlst', 15, 0);
  hen('guiTongKetQlst', 20, 0);
  return 'Đã hẹn giờ: checklist QLST ~7h30, tổng kết ~15h và ~20h mỗi ngày.';
}
function coHenGioQlst() {
  try {
    var co = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
    return HAM_HEN_QLST.every(function (h) { return co.indexOf(h) !== -1; });
  } catch (e) { return null; }   // chưa cấp quyền hẹn giờ
}

// Push TỐN QUOTA theo số người trong nhóm: nhóm 2 người × 3 lần/ngày ≈ 180
// tin/tháng — sát mức 200 tin miễn phí. Thêm nhóm hay thêm giờ gửi là vượt.
function guiQlstHangNgay() {
  dsNhomQlst().forEach(function (g) {
    try { push(g, [theMoQlst(g)]); } catch (e) { console.error('guiQlstHangNgay ' + g + ': ' + e); }
  });
}
function guiTongKetQlst() {
  dsNhomQlst().forEach(function (g) {
    // Tin chữ + nút mở trang trong MỘT lần push: tính 1 tin mỗi người.
    try { push(g, [{ type: 'text', text: tongKetQlst(g) }, theMoQlst(g, '📊 TỔNG KẾT CHECKLIST QLST')]); }
    catch (e) { console.error('guiTongKetQlst ' + g + ': ' + e); }
  });
}

/* =====================================================================
 * SỐ BÁN HÀNG TỪ APP DATASNAP — /so (Realtime) · /tonghop (Lũy kế) — NHIỀU CỤM
 * Trang doc-so.html (trong app) gửi BẢN TÓM TẮT đã lọc/xếp sẵn sau mỗi lần quét.
 * Giữ trong CacheService tối đa 6 tiếng (giới hạn của Google) rồi tự mất —
 * không lưu lâu, theo quy định không giữ số trên mây. Gõ lệnh = Reply, miễn phí.
 *
 * Tách cụm — mọi thứ đi theo MÃ SIÊU THỊ (mã MWG, duy nhất toàn công ty):
 *   • Số: mỗi siêu thị 1 ô cache 'so|<mãST>|<kỳ>' — cụm này không ghi đè được ô của cụm kia.
 *   • NHIỀU MÁY / 1 siêu thị (10/11): mọi quản lý trong cụm đều gửi được — không còn khoá máy đầu tiên.
 *     Gói nào CHỤP MỚI HƠN (trường luc) thì giữ; gói chụp cũ hơn bản đang có bị bỏ (không đè số mới).
 *     Script Property 'mayST|<mã>' chỉ ghi số máy đã gửi trong ngày (để /so biết có mấy người đổ).
 *   • Nhóm LINE: gõ /dangky <mã ST> [mã ST…] → nhóm chỉ xem đúng các siêu thị đó.
 *     Chưa đăng ký thì /so không hiện số của ai cả.
 * Script Properties chỉ giữ CẤU HÌNH (khoá, nhóm ↔ mã ST, lần gửi cuối) — không giữ số bán.
 * ===================================================================== */
var SO_GIU_GIAY = 21600;   // 6 tiếng — tối đa CacheService cho phép
// Nhóm cũ của cụm 14285 (trước khi có /dangky) — /dangky trong nhóm sẽ đè lên.
var NHOM_SIEU_THI = {
  'Cd6981bde07d3c222623f363b8f5739bf': ['14285'],   // 396 Nguyễn Văn Cừ
  'Cd16f4cb26203b273afd91895cc10b66f': ['8807']     // Ngọc Thụy
};
var TEN_KY_SO = { realtime: 'Realtime', luyke: 'Lũy kế' };

function nhanGoiSo(body) {
  var props = PropertiesService.getScriptProperties();
  var khoa = String(body.khoa || '');
  if (!/^[0-9a-f]{32}$/.test(khoa)) return { ok: false, loi: 'thiếu khoá' };
  var cache = CacheService.getScriptCache(), bayGio = Date.now();
  var nhan = {}, tuChoi = {}, daXet = {};
  var homNay = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  (body.goi || []).forEach(function (g) {
    if (!g || !TEN_KY_SO[g.ky] || !Array.isArray(g.sieuThi)) return;
    var lucMoi = Date.parse(g.luc || '') || 0;
    g.sieuThi.forEach(function (s) {
      var ma = String((s && s.ma) || '');
      var kKy = ma + '|' + g.ky;
      if (!/^\d{2,6}$/.test(ma) || tuChoi[kKy]) return;
      if (!daXet[kKy]) {
        // Nhiều quản lý cùng đổ: giữ gói chụp MỚI HƠN, bỏ gói cũ hơn bản đang có.
        var dang = null; try { dang = JSON.parse(cache.get('so|' + ma + '|' + g.ky) || 'null'); } catch (e) {}
        var lucCu = dang ? (Date.parse(dang.luc || '') || 0) : 0;
        if (lucCu && lucMoi && lucMoi < lucCu) {
          tuChoi[kKy] = (s.ten || ma) + ' (' + TEN_KY_SO[g.ky] + '): bot đã có số chụp mới hơn của máy khác — giữ bản đó';
          return;
        }
        daXet[kKy] = 1;
        // Ghi nhận máy đã gửi hôm nay (chỉ mã ngẫu nhiên 8 ký tự, không phải số bán)
        try {
          var may = JSON.parse(props.getProperty('mayST|' + ma) || '{}');
          if (may.ngay !== homNay) may = { ngay: homNay, ds: [] };
          var k8 = khoa.slice(0, 8);
          if (may.ds.indexOf(k8) < 0) { may.ds.push(k8); props.setProperty('mayST|' + ma, JSON.stringify(may)); }
        } catch (e) {}
        props.setProperty('lanST|' + ma, String(bayGio));
        var cum = String(g.cum || '');
        if (/^\d{2,6}$/.test(cum) && cum !== ma) {
          try {
            var dsC = (props.getProperty('stCum|' + cum) || '').split(',').filter(Boolean);
            if (dsC.indexOf(ma) < 0) { dsC.push(ma); props.setProperty('stCum|' + cum, dsC.slice(-12).join(',')); }
          } catch (e) {}
        }
      }
      var chuoi = JSON.stringify({ ky: g.ky, luc: g.luc, cum: g.cum || '', st: s });
      if (chuoi.length > 95000) { tuChoi[kKy] = (s.ten || ma) + ': gói quá lớn'; return; }   // ≤100 KB/khoá
      cache.put('so|' + ma + '|' + g.ky + (s.phan ? '|p' + s.phan : ''), chuoi, SO_GIU_GIAY);   // gói to: doc-so chia NV thành nhiều phần
      nhan[ma] = s.ten || ma;
    });
  });
  var ds = Object.keys(nhan), loi = Object.keys(tuChoi).map(function (m) { return tuChoi[m]; });
  return ds.length ? { ok: true, sieuThi: nhan, giu: '6 giờ', tuChoi: loi }
                   : { ok: false, loi: loi.join('; ') || 'gói rỗng' };
}
var NHOM_LEGACY_MA = ['14285', '8807'];

/* NGƯỜI QUẢN LÝ BOT: mở khoá siêu thị khi máy gửi số bị đổi/gỡ app (báo "máy khác đang giữ siêu thị này").
 * Sửa danh sách mã bên dưới → chọn hàm moKhoaSieuThi → bấm Run trong Apps Script. Máy gửi kế tiếp sẽ giữ lại. */
function moKhoaSieuThi() {
  var MA_CAN_MO = ['14285', '8807'];
  var props = PropertiesService.getScriptProperties();
  MA_CAN_MO.forEach(function (ma) { props.deleteProperty('khoaST|' + ma); props.deleteProperty('lanST|' + ma); });
  if (MA_CAN_MO.some(function (m) { return NHOM_LEGACY_MA.indexOf(m) >= 0; })) props.deleteProperty('KHOA_SO');
  console.log('Đã mở khoá: ' + MA_CAN_MO.join(', '));
}

function maCuaNhom(chat) {
  var p = PropertiesService.getScriptProperties().getProperty('nhomSo|' + chat);
  if (p) return p.split(',').filter(Boolean);
  return NHOM_SIEU_THI[chat] || [];
}

function dangKySo(ev, chuoiMa) {
  var chat = chatCua(ev.source);
  var ds = (chuoiMa.match(/\d{2,6}/g) || []).filter(function (m, i, a) { return a.indexOf(m) === i; }).slice(0, 12);
  if (!ds.length) { replyText(ev.replyToken, 'Gõ kèm mã siêu thị, ví dụ: /dangky 14285 (nhiều siêu thị: /dangky 14285 8807).'); return; }
  PropertiesService.getScriptProperties().setProperty('nhomSo|' + chat, ds.join(','));
  var cache = CacheService.getScriptCache();
  var ten = ds.map(function (m) {
    var g = null; try { g = JSON.parse(cache.get('so|' + m + '|realtime') || cache.get('so|' + m + '|luyke') || 'null'); } catch (e) {}
    return m + (g && g.st && g.st.ten ? ' (' + g.st.ten + ')' : '');
  });
  replyText(ev.replyToken, '✅ Nhóm này xem số của: ' + ten.join(', ') + '.' + NL +
    'Gõ /so (Realtime) hoặc /tonghop (Lũy kế); nhân viên: /nv hoặc /nvthang. Số do app DataSnap của siêu thị gửi lên, bot giữ 6 tiếng rồi tự xoá.' + NL +
    'Đổi siêu thị: gõ lại /dangky <mã>. Bỏ: /huydangky.');
}

function docGoiSo(ma, ky) {
  var cache = CacheService.getScriptCache(), g;
  try { g = JSON.parse(cache.get('so|' + ma + '|' + ky) || 'null'); } catch (e) { return null; }
  // Siêu thị đông NV: doc-so gửi nhiều phần {phan, soPhan} → ghép NV các phần CÙNG lượt gửi (cùng luc).
  if (g && g.st && g.st.soPhan > 1) {
    var khoa = [];
    for (var i = 1; i < g.st.soPhan; i++) khoa.push('so|' + ma + '|' + ky + '|p' + i);
    var cac = cache.getAll(khoa);
    khoa.forEach(function (k) {
      var p = null; try { p = JSON.parse(cac[k] || 'null'); } catch (e) {}
      if (p && p.luc === g.luc && p.st && p.st.nv) g.st.nv = (g.st.nv || []).concat(p.st.nv);
      else g.st.thieuPhan = true;
    });
  }
  return g;
}

function goiCuaNhom(ev, ky) {
  var dsMa = maCuaNhom(chatCua(ev.source));
  if (!dsMa.length) {
    replyText(ev.replyToken, 'Nhóm này chưa gắn siêu thị nào.' + NL +
      'Gõ /dangky <mã siêu thị>, ví dụ: /dangky 14285 (nhiều siêu thị: /dangky 14285 8807).');
    return null;
  }
  // Nhóm gắn nhầm MÃ CỤM (vd /dangky 15885 mà app gửi theo mã từng siêu thị) → tự đổi sang các siêu thị của cụm đó.
  var props = PropertiesService.getScriptProperties();
  dsMa = [].concat.apply([], dsMa.map(function (m) {
    // Mã đã TỪNG gửi như một siêu thị (vd 14285 vừa là cụm vừa là siêu thị 396) → không bao giờ đổi, tránh hiện số siêu thị khác.
    if (docGoiSo(m, ky) || props.getProperty('lanST|' + m)) return [m];
    var c = (props.getProperty('stCum|' + m) || '').split(',').filter(Boolean);
    return c.length ? c : [m];
  })).filter(function (m, i, a) { return a.indexOf(m) === i; });
  var goi = dsMa.map(function (m) { return docGoiSo(m, ky); }).filter(Boolean);
  if (!goi.length) {
    replyText(ev.replyToken, 'Chưa có số ' + TEN_KY_SO[ky] + ' của ' + dsMa.join(', ') + ' (bot chỉ giữ số 6 tiếng).' + NL +
      dsMa.map(function (m) { return chanDoanSo(m, ky, props); }).join(NL));
    return null;
  }
  return goi;
}
// Vì sao chưa có số: bot chưa TỪNG nhận / nhận lâu rồi / chỉ có kỳ kia. Chỉ đọc giờ nhận + mã máy, không phải số bán.
function chanDoanSo(ma, ky, props) {
  var lan = +(props.getProperty('lanST|' + ma) || 0);
  var kia = ky === 'luyke' ? 'realtime' : 'luyke';
  if (!lan) return '• ' + ma + ': bot CHƯA TỪNG nhận số của mã này. Kiểm trên điện thoại: (1) DataSnap đã cập nhật bản mới nhất chưa — bản cũ bị khoá, không gửi bot; ' +
    '(2) trang Đọc số có bật Gửi bot LINE; (3) mã siêu thị trong app đúng là ' + ma + ' (nếu khác, gõ /dangky <mã trong app>).';
  var gio = Utilities.formatDate(new Date(lan), 'Asia/Ho_Chi_Minh', 'HH:mm dd/MM');
  if (docGoiSo(ma, kia)) return '• ' + ma + ': có số ' + TEN_KY_SO[kia] + ' (gửi lúc ' + gio + ') nhưng chưa có ' + TEN_KY_SO[ky] +
    ' → app DataSnap: Quét cụm, chọn ' + TEN_KY_SO[ky] + ' hoặc Cả hai.';
  return '• ' + ma + ': lần cuối app gửi số lúc ' + gio + ' — đã quá 6 tiếng nên bot xoá. Mở app DataSnap → Quét cụm' + (ky === 'luyke' ? ' (Lũy kế hoặc Cả hai)' : '') + ', số tự gửi lên bot.';
}
function traLoiSo(ev, ky) {
  var goi = goiCuaNhom(ev, ky); if (!goi) return;
  // Lúc chụp = lượt cũ nhất trong các siêu thị (để cảnh báo "số đã cũ" không bị che).
  var luc = goi.map(function (g) { return g.luc || ''; }).sort()[0];
  replyFlexAnToan(ev.replyToken, dungFlexSo({ ky: ky, luc: luc, cum: goi[0].cum }, goi.map(function (g) { return g.st; }), Date.now()));
}
// /nv <tên>: tìm theo tên (không dấu, chứa chuỗi) trong các siêu thị của nhóm → thẻ chi tiết (≤10 người).
function boDau(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim(); }
function timNV(ev, ky, q) {
  var goi = goiCuaNhom(ev, ky); if (!goi) return;
  var k = boDau(q), the = [], ten = [];
  var luc = goi.map(function (g) { return g.luc || ''; }).sort()[0], bayGio = Date.now();
  var meta = { ky: ky, luc: luc, cum: goi[0].cum };
  if (ky === 'luyke') ganDuKienNV(goi.map(function (g) { return g.st; }), luc);
  var cu = nvSoCu(meta, bayGio);
  goi.forEach(function (g) {
    (g.st.nv || []).forEach(function (n, i) {
      if (the.length < 10 && boDau(n.ten).indexOf(k) >= 0) { the.push(nvChiTiet(g.st, n, i, cu, meta)); ten.push(n.ten); }
    });
  });
  if (!the.length) {
    replyText(ev.replyToken, 'Không thấy nhân viên nào có tên "' + q + '" trong số ' + TEN_KY_SO[ky] + ' của nhóm này. Gõ /nv' + (ky === 'luyke' ? 'thang' : '') + ' để xem cả danh sách.');
    return;
  }
  replyFlexAnToan(ev.replyToken, nvGomTin(the, 'Nhân viên: ' + ten.join(', '), 5));
}
function nvSoCu(goi, bayGio) {
  var rt = goi.ky === 'realtime', luc = Date.parse(goi.luc || '');
  var ngayVN = function (t) { return new Date(t + 7 * 3600e3).toISOString().slice(0, 10); };
  return !isNaN(luc) && (rt ? bayGio - luc > 90 * 60000 : ngayVN(luc) !== ngayVN(bayGio));
}

function traLoiNV(ev, ky, maChon, trang) {
  var goi = goiCuaNhom(ev, ky); if (!goi) return;
  if (maChon) {
    var chon = goi.filter(function (g) { return g.st && String(g.st.ma) === maChon; });
    if (!chon.length) {
      replyText(ev.replyToken, 'Nhóm này không có số ' + TEN_KY_SO[ky] + ' của siêu thị ' + maChon + '. Có: ' +
        goi.map(function (g) { return g.st.ma + ' (' + g.st.ten + ')'; }).join(', ') + '.');
      return;
    }
    goi = chon;
  }
  var luc = goi.map(function (g) { return g.luc || ''; }).sort()[0];
  replyFlexAnToan(ev.replyToken, dungFlexNV({ ky: ky, luc: luc, cum: goi[0].cum }, goi.map(function (g) { return g.st; }), Date.now(), trang || 1));
}

/* ---------- dựng thẻ — theo thiết kế "Thẻ Realtime LINE" (Claude Design, 03/11/2026) ----------
 * Đầu xanh navy: tên ST + nhãn trạng thái, số to, thanh có vạch target; 3 ô số; khung cam
 * "ưu tiên đẩy"; thi đua chia nhóm Đạt / Sắp đạt (≥80%) / Cần đẩy; nhân viên có vòng hạng. */
// Mức gọn khi thẻ quá cỡ LINE: 0 đủ · 1 bỏ vạch nhỏ thi đua · 2 bỏ dòng ngành của NV · 3 bớt thi đua.
// KHÔNG bao giờ bớt nhân viên trước — quản lý cần đủ danh sách.
var SO_GON = 0;
var SO_NAVY = '#0A2E6E', SO_XANH = '#0B5ED7', SO_XAM = '#4B5563', SO_VIEN = '#EEF1F5';
var SO_NHOM = {
  dat: { nen: '#10B981', chu: '#047857', ten: 'ĐÃ ĐẠT', dau: '#6EE7B7', nhan: ['#34D399', '#053B2A'] },
  sap: { nen: '#F59E0B', chu: '#B45309', ten: 'SẮP ĐẠT (≥ 80%)', dau: '#FCD34D', nhan: ['#FBBF24', '#451A03'] },
  can: { nen: '#EF4444', chu: '#B91C1C', ten: 'CẦN ĐẨY (< 80%)', dau: '#FCA5A5', nhan: ['#F87171', '#450A0A'] }
};
function soLoai(v) { return v == null ? 'can' : v >= 100 ? 'dat' : v >= 80 ? 'sap' : 'can'; }

/* DỰ KIẾN HOÀN THÀNH (10/11, anh Phong chốt): DT lũy kế ÷ (ngày hiện tại − 1) × số ngày trong tháng ÷ target.
 * Ngày lấy theo lúc chụp gói (giờ VN). Ngày 01 chia cho 1. Không dùng % dự báo của DMX nữa. */
function soNgayDK(luc) {
  var t = Date.parse(luc || ''); if (isNaN(t)) t = Date.now();
  var d = new Date(t + 7 * 3600e3), ngay = d.getUTCDate();
  return { ngay: ngay, chia: Math.max(1, ngay - 1), so: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate() };
}
function duKienPct(th, target, nd) {
  if (!nd || !(target > 0) || th == null) return null;
  return Math.round((Number(th) || 0) / nd.chia * nd.so / target * 1000) / 10;
}
// Lũy kế: tính lại dự kiến tổng + từng chương trình theo công thức trên (bản sao, không sửa gói trong cache).
function apDuKienST(s, nd) {
  s = JSON.parse(JSON.stringify(s));
  var t = s.tong = s.tong || {};
  if (t.dtqd != null) t.duKienTien = Math.round(t.dtqd / nd.chia * nd.so * 10) / 10;
  var dk = duKienPct(t.dtqd, t.target, nd); if (dk != null) t.duBao = dk;
  t.tienDo = Math.round(nd.chia / nd.so * 1000) / 10;   // vạch trắng = phần tháng đã qua (cùng mẫu số với dự kiến)
  t.cachTinh = 'DT ÷ ' + nd.chia + ' ngày × ' + nd.so;
  (s.thiDua || []).forEach(function (x) { var v = duKienPct(x.th, x.target, nd); if (v != null) x.duBao = v; });
  return s;
}
// NV: dự kiến % so với target tháng của chính người đó (thẻ Sức khỏe DMXWork: sk.tg) → màu thẻ.
function ganDuKienNV(ds, luc) {
  var nd = soNgayDK(luc);
  ds.forEach(function (s) { (s.nv || []).forEach(function (n) {
    n._dk = n.sk && n.sk.tg > 0 ? duKienPct(n.dtqd || 0, n.sk.tg, nd) : null;
    if (n.sk && n._dk != null) n.sk.dk = n._dk;
  }); });
  return nd;
}
var NV_MAU = {   // màu thẻ NV theo dự kiến hoàn thành target tháng
  dat: { ten: 'THEO KỊP', nen: '#ECFDF5', vien: '#10B981', chu: '#047857', nhan: ['#34D399', '#053B2A'] },
  sap: { ten: 'SÁT NÚT', nen: '#FFFBEB', vien: '#F59E0B', chu: '#B45309', nhan: ['#FBBF24', '#451A03'] },
  can: { ten: 'CHẬM', nen: '#FEF2F2', vien: '#EF4444', chu: '#B91C1C', nhan: ['#F87171', '#450A0A'] }
};
// Kiểu Việt: 8.075 · 55,2
function soVN(v, le) {
  if (v == null || isNaN(v)) return '—';
  var p = Math.pow(10, le || 0), n = Math.round(Math.abs(Number(v)) * p) / p;
  var nguyen = Math.floor(n), du = Math.round((n - nguyen) * p);
  var s = String(nguyen).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (le && du) s += ',' + String(du);
  return (v < 0 && n ? '-' : '') + s;
}
function soPct(v) { return v == null ? '—' : soVN(v, 1) + '%'; }
function soPctGon(v) { return v == null ? '—' : soVN(v, Math.abs(v) >= 10 ? 0 : 1) + '%'; }   // dòng thi đua: 91% · 7,4%
function soTr(v) { return v == null ? '—' : soVN(v, Math.abs(v) >= 100 ? 0 : 1); }
function soChu(t, o) {
  var x = { type: 'text', text: (t == null || t === '') ? '—' : String(t) };
  for (var k in (o || {})) x[k] = o[k];
  return x;
}
function soHop(huong, ds, o) {
  var x = { type: 'box', layout: huong, contents: ds.filter(Boolean) };
  for (var k in (o || {})) x[k] = o[k];
  return x;
}
function soCham(mau, co) { return soHop('vertical', [], { width: co || '8px', height: co || '8px', cornerRadius: '4px', backgroundColor: mau, flex: 0 }); }
function soVach(pct, mau, cao) {
  cao = cao || '5px';
  var w = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return soHop('vertical', w ? [soHop('vertical', [], { width: w + '%', height: cao, backgroundColor: mau, cornerRadius: '3px' })] : [],
    { height: cao, backgroundColor: SO_VIEN, cornerRadius: '3px' });
}
function soNgan() { return { type: 'separator', color: SO_VIEN }; }

// "20:49:53 3/11/2026" → "20:49 · 03/11"
function soGio(s) {
  var m = /^(\d{1,2}):(\d\d)(?::\d\d)? (\d{1,2})\/(\d{1,2})/.exec(s || '');
  return m ? m[1] + ':' + m[2] + ' · ' + ('0' + m[3]).slice(-2) + '/' + ('0' + m[4]).slice(-2) : (s || '—');
}

function dungFlexSo(goi, ds, bayGio) {
  var rt = goi.ky === 'realtime', luc = Date.parse(goi.luc || '');
  // Cũ: Realtime quá 90 phút; Lũy kế không phải của hôm nay (giờ VN).
  var ngayVN = function (t) { return new Date(t + 7 * 3600e3).toISOString().slice(0, 10); };
  var cu = !isNaN(luc) && (rt ? bayGio - luc > 90 * 60000 : ngayVN(luc) !== ngayVN(bayGio));
  if (!rt) { var nd = soNgayDK(goi.luc); ds = ds.map(function (s) { return apDuKienST(s, nd); }); }
  var mot = function (s) { return rt ? theRealtime(s, cu, goi.cum) : theLuyKe(s, cu, goi.cum); };
  // LINE: bubble ≤30 KB, carousel ≤50 KB (cả cụm) — quá thì bớt dòng nhân viên/thi đua của thẻ đó.
  var tran = Math.min(28000, Math.floor(46000 / Math.max(1, ds.length)));
  var bubbles = ds.map(function (s) {
    var b;
    for (SO_GON = 0; SO_GON <= 2; SO_GON++) { b = mot(s); if (JSON.stringify(b).length <= tran) break; }
    SO_GON = 2;
    // Vẫn quá: bớt thi đua (giữ ≥6), cuối cùng mới bớt nhân viên (giữ ≥5).
    for (var lan = 0; lan < 20 && JSON.stringify(b).length > tran; lan++) {
      s = JSON.parse(JSON.stringify(s));
      if ((s.thiDua || []).length > 6) s.thiDua = s.thiDua.slice(2);   // bỏ chương trình % cao nhất (đã đạt), giữ chỗ cần đẩy
      else if ((s.nganh || []).length > 6) s.nganh = s.nganh.slice(0, s.nganh.length - 2);   // ngành thay thi đua: bớt ngành nhỏ nhất
      else if ((s.nv || []).length > 5) s.nv = s.nv.slice(0, s.nv.length - 1);
      else break;
      b = mot(s);
    }
    SO_GON = 0;
    return b;
  });
  var alt = TEN_KY_SO[goi.ky] + ': ' + ds.map(function (s) {
    var t = s.tong || {};
    return s.ten + ' ' + (rt ? soPct(t.ht) + ' target ngày' : soPct(t.duBao != null ? t.duBao : t.ht) + ' dự kiến');
  }).join(' · ');
  if (bubbles.length > 1) bubbles.forEach(function (b) { b.size = 'mega'; });   // carousel: cỡ mega như thẻ cũ
  return { type: 'flex', altText: alt.slice(0, 390),
    contents: bubbles.length === 1 ? bubbles[0] : { type: 'carousel', contents: bubbles.slice(0, 12) } };
}

/* Đầu thẻ: tên + chấm + giờ, nhãn trạng thái, số to trái/phải, thanh có vạch, nhãn dưới thanh. */
function soDau(o) {
  var nhom = SO_NHOM[soLoai(o.trangThai)];
  return soHop('vertical', [
    soHop('horizontal', [
      soHop('vertical', [
        soChu(o.ten, { size: 'lg', weight: 'bold', color: '#FFFFFF', wrap: true }),
        soHop('horizontal', [ soCham(o.cu ? '#FBBF24' : '#34D399', '7px'),
          soChu(o.phu + (o.cu ? ' · số đã cũ' : ''), { size: 'xs', color: '#C7D4EE', margin: 'sm', flex: 0 }) ],
          { alignItems: 'center', margin: 'xs' })
      ], { flex: 1 }),
      soHop('vertical', [ soChu(nhom.ten.replace(/ \(.*\)$/, ''), { size: 'xxs', weight: 'bold', color: nhom.nhan[1] }) ],
        { backgroundColor: nhom.nhan[0], cornerRadius: '999px', paddingStart: '10px', paddingEnd: '10px',
          paddingTop: '5px', paddingBottom: '5px', flex: 0 })
    ], { spacing: 'md' }),
    soHop('horizontal', [
      soHop('vertical', [ soChu(o.trai[0], { size: 'xs', color: '#C7D4EE' }),
        soHop('baseline', [ soChu(o.trai[1], { size: '4xl', weight: 'bold', color: '#FFFFFF', flex: 0 }),
          soChu(o.trai[2], { size: 'md', weight: 'bold', color: '#C7D4EE', margin: 'sm', flex: 0 }) ]) ], { flex: 1, justifyContent: 'flex-end' }),
      soHop('vertical', [ soChu(o.phai[0], { size: 'xs', color: '#C7D4EE', align: 'end' }),
        soChu(o.phai[1], { size: 'xxl', weight: 'bold', color: nhom.dau, align: 'end' }),
        o.phai[2] ? soChu(o.phai[2], { size: 'xs', color: '#C7D4EE', align: 'end' }) : null ], { flex: 1, justifyContent: 'flex-end' })
    ], { margin: 'lg' }),
    soThanhDau(o.day, o.vach, nhom.nen),
    soHop('horizontal', [ soChu(o.duoi[0], { size: 'xxs', color: '#C7D4EE', flex: 1, wrap: true }),
      soChu(o.duoi[1], { size: 'xxs', color: o.duoi[2] || '#C7D4EE', weight: 'bold', align: 'end', flex: 0 }) ], { margin: 'sm' })
  ], { backgroundColor: SO_NAVY, paddingAll: '20px' });
}
// Thanh đầu thẻ: phần đầy tới `day`%, vạch trắng ở `vach`% (vị trí target / thời gian đã qua).
function soThanhDau(day, vach, mau) {
  day = Math.max(0, Math.min(100, day || 0)); vach = Math.max(0, Math.min(100, vach == null ? 100 : vach));
  var o = function (w, nen) { return w > 0.4 ? soHop('vertical', [], { flex: Math.round(w * 10), height: '10px', backgroundColor: nen }) : null; };
  var vachBox = soHop('vertical', [], { width: '3px', height: '10px', backgroundColor: '#FFFFFF', flex: 0 });
  var ds = day >= vach
    ? [o(vach, mau), vach < 99.6 ? vachBox : null, o(day - vach, mau), o(100 - day, '#FFFFFF00')]
    : [o(day, mau), o(vach - day, '#FFFFFF00'), vach < 99.6 ? vachBox : null, o(100 - vach, '#FFFFFF00')];
  return soHop('horizontal', ds, { height: '10px', backgroundColor: '#FFFFFF29', cornerRadius: '5px', margin: 'lg' });
}
function soO(nhan, giaTri, phu) {
  return soHop('vertical', [ soChu(nhan, { size: 'xxs', color: SO_XAM }),
    soHop('baseline', [ soChu(giaTri, { size: 'xl', weight: 'bold', color: '#111827', flex: 0 }),
      phu ? soChu(phu, { size: 'sm', weight: 'bold', color: '#6B7280', flex: 0 }) : null ]) ],
    { backgroundColor: '#F3F6FB', cornerRadius: '12px', paddingAll: '10px', flex: 1 });
}
function soUuTien(tieuDe, ds) {
  if (!ds.length) return null;
  return soHop('vertical', [ soChu('↑ ' + tieuDe, { size: 'sm', weight: 'bold', color: '#7C2D12' }) ].concat(ds.map(function (d) {
    return soHop('horizontal', [ soChu(d[0], { size: 'sm', color: '#1F2937', flex: 1, wrap: true }),
      soChu(d[1], { size: 'sm', weight: 'bold', color: '#B91C1C', align: 'end', flex: 0 }) ], { margin: 'md' });
  })), { backgroundColor: '#FFF4EC', cornerRadius: '14px', paddingAll: '14px', margin: 'lg' });
}
// Danh sách thi đua chia nhóm. dong(x) → [tên, % thanh, chữ % to, chữ phụ, loại].
function soNhomThiDua(td, dong) {
  var ra = [], nhom = { dat: [], sap: [], can: [] };
  td.forEach(function (x) { var d = dong(x); nhom[d[4]].push(d); });
  ['dat', 'sap', 'can'].forEach(function (k) {
    if (!nhom[k].length) return;
    var n = SO_NHOM[k];
    ra.push(soHop('horizontal', [ soCham(n.nen), soChu(n.ten + ' · ' + nhom[k].length, { size: 'xxs', weight: 'bold', color: n.chu, margin: 'sm', flex: 0 }) ],
      { alignItems: 'center', margin: 'lg' }));
    nhom[k].forEach(function (d, i) {
      if (i) ra.push(soNgan());
      ra.push(soHop('horizontal', [
        soHop('vertical', [ soChu(d[0], { size: 'sm', color: '#1F2937', wrap: true }), SO_GON >= 1 ? null : soHop('vertical', [soVach(d[1], n.nen)], { margin: 'sm' }) ], { flex: 1 }),
        soHop('vertical', [ soChu(d[2], { size: 'md', weight: 'bold', color: n.chu, align: 'end' }),
          soChu(d[3], { size: 'xxs', color: SO_XAM, align: 'end' }) ], { width: '96px', flex: 0, justifyContent: 'center' })
      ], { spacing: 'lg', paddingTop: '8px', paddingBottom: '8px' }));
    });
  });
  return ra;
}
// CHỈ dùng khi thi đua bị ẩn (doc-so gửi thiDuaAn + nganh): báo cáo thi đua tắt/trống hoặc bỏ theo dõi hết.
// Có thi đua thì doc-so không gửi `nganh` → thẻ giữ khối thi đua như cũ. nganh = [[tên, DTQĐ, SL], …] DTQĐ giảm dần.
function soNganhThay(s, tieuDe) {
  var ng = s.nganh || [], tong = (s.tong || {}).dtqd;
  var ra = [ soHop('horizontal', [ soChu(tieuDe, { size: 'md', weight: 'bold', color: '#111827', flex: 1 }),
      soChu('Thi đua đang ẩn', { size: 'xxs', color: SO_XAM, align: 'end', flex: 0 }) ], { margin: 'xl', alignItems: 'flex-end' }) ];
  if (!ng.length) return ra.concat([ soChu('Chưa ngành quan tâm nào có số.', { size: 'sm', color: SO_XAM, margin: 'md' }) ]);
  var max = Math.max.apply(null, ng.map(function (g) { return g[1] || 0; }).concat([1]));
  ng.forEach(function (g, i) {
    if (i) ra.push(soNgan());
    ra.push(soHop('horizontal', [
      soHop('vertical', [ soChu(g[0], { size: 'sm', color: '#1F2937', wrap: true }),
        SO_GON >= 1 ? null : soHop('vertical', [soVach((g[1] || 0) / max * 100, SO_XANH)], { margin: 'sm' }) ], { flex: 1 }),
      soHop('vertical', [ soChu(soTr(g[1]) + ' tr', { size: 'md', weight: 'bold', color: SO_XANH, align: 'end' }),
        soChu('SL ' + soVN(g[2]) + (tong ? ' · ' + soPctGon((g[1] || 0) / tong * 100) : ''), { size: 'xxs', color: SO_XAM, align: 'end' }) ],
        { width: '96px', flex: 0, justifyContent: 'center' })
    ], { spacing: 'lg', paddingTop: '8px', paddingBottom: '8px' }));
  });
  return ra;
}
function soNhanVien(s, nhan, tu, den) {
  var nv = s.nv || [], tong = (s.tong || {}).dtqd;
  if (!nv.length) return [];
  tu = tu || 0; den = den == null ? nv.length : den;
  var max = Math.max.apply(null, nv.map(function (n) { return n.dtqd || 0; }).concat([1]));
  var top3 = nv.slice(0, 3).reduce(function (a, n) { return a + (n.dtqd || 0); }, 0);
  var chuaBan = nv.filter(function (n) { return !(n.dtqd > 0); }).length;
  var VONG = [['#F5C542', '#5B3D00'], ['#CBD5E1', '#1F2937'], ['#E8B48A', '#5A2A08']];
  var ra = [
    soHop('horizontal', [ soChu(nhan, { size: 'md', weight: 'bold', color: '#111827', flex: 1 }),
      soChu(nv.length + ' người', { size: 'xxs', color: SO_XAM, align: 'end', flex: 0 }) ], { margin: 'xxl', alignItems: 'flex-end' })
  ];
  if (!tu) ra.push(soHop('horizontal', [ soChu('Top 3 chiếm ' + (tong ? soPctGon(top3 / tong * 100) : '—') + ' DTQĐ', { size: 'xs', color: '#1E3A8A', flex: 1 }),
      soChu('Chưa bán: ' + chuaBan, { size: 'xs', color: '#1E3A8A', align: 'end', flex: 0 }) ],
      { backgroundColor: '#EEF3FC', cornerRadius: '12px', paddingAll: '10px', margin: 'md' }));
  nv.slice(tu, den).forEach(function (n, j) {
    var i = tu + j;
    var co = n.dtqd > 0, vong = !co ? ['#FEE2E2', '#B91C1C'] : (VONG[i] || ['#F1F5F9', SO_XAM]);
    var phu = 'Tỉ trọng ' + (tong && co ? soPctGon(n.dtqd / tong * 100) : '0%') + ' · SL ' + soVN(n.sl) +
      (n.traGop != null && co ? ' · Góp ' + soPctGon(n.traGop / n.dtqd * 100) : '') +
      (n.sk && n.sk.pt != null ? ' · ' + soPctGon(n.sk.pt) + ' target' : '');
    var nganh = (n.ng || []).map(function (g) { return g[0] + ' ' + soTr(g[1]); }).join(' · ');
    var mau = n._dk != null ? NV_MAU[soLoai(n._dk)] : null;
    if (mau) phu += ' · dự kiến ' + soPctGon(n._dk);
    if (j) ra.push(soNgan());
    ra.push(soHop('horizontal', [
      soHop('vertical', [ soChu(String(i + 1), { size: 'xs', weight: 'bold', color: vong[1], align: 'center' }) ],
        { width: '26px', height: '26px', cornerRadius: '13px', backgroundColor: vong[0], justifyContent: 'center', flex: 0 }),
      soHop('vertical', [
        soHop('horizontal', [ mau ? soCham(mau.vien) : null,
          soChu(n.ten, { size: 'sm', weight: i < 3 && co ? 'bold' : 'regular', color: '#111827', flex: 1, wrap: true, margin: mau ? 'sm' : 'none' }),
          soChu(co ? soTr(n.dtqd) + ' tr' : 'Chưa bán', { size: 'sm', weight: 'bold', color: mau ? mau.chu : co ? SO_XANH : '#B91C1C', align: 'end', flex: 0 }) ], { alignItems: 'center' }),
        soHop('vertical', [soVach(co ? n.dtqd / max * 100 : 0, mau ? mau.vien : SO_XANH)], { margin: 'sm' }),
        co ? soChu(phu, { size: 'xxs', color: SO_XAM, margin: 'sm', wrap: true }) : null,
        co && nganh && SO_GON < 2 ? soChu(nganh, { size: 'xxs', color: '#374151', wrap: true }) : null
      ], { flex: 1 })
    ], { spacing: 'md', paddingTop: '10px', paddingBottom: '10px', paddingStart: mau ? '6px' : '0px', paddingEnd: mau ? '6px' : '0px',
      backgroundColor: mau ? mau.nen : '#FFFFFF00', cornerRadius: mau ? '10px' : '0px' }));
  });
  if (!tu && nv.some(function (n) { return n._dk != null; })) ra.splice(2, 0, soChu('Màu theo dự kiến hoàn thành target tháng (DT ÷ (ngày−1) × số ngày): 🟢 ≥100% theo kịp · 🟡 80–99% sát nút · 🔴 <80% chậm',
    { size: 'xxs', color: SO_XAM, wrap: true, margin: 'md' }));
  return ra;
}
function soChan(cum, tenBc, capNhat) {
  return soHop('horizontal', [ soChu('Cụm ' + (cum || '') + ' · ' + tenBc, { size: 'xxs', color: SO_XAM, flex: 1 }),
    soChu('Cập nhật ' + soGio(capNhat).split(' · ')[0], { size: 'xxs', color: SO_XAM, align: 'end', flex: 0 }) ],
    { paddingAll: '14px', paddingStart: '16px', paddingEnd: '16px' });
}
function soBubble(dau, than, chan) {
  return { type: 'bubble', size: 'giga', header: dau,
    body: soHop('vertical', than, { paddingAll: '16px', paddingTop: '6px' }),
    footer: soHop('vertical', [soNgan(), chan], { paddingAll: '0px' }),
    styles: { header: { backgroundColor: SO_NAVY } } };
}

function theRealtime(s, cu, cum) {
  var t = s.tong || {}, td = s.thiDua || [];
  var dt = t.dtqd || 0, tg = t.target || 0;
  // Vượt target: thang = 1,5 × target (target nằm ở 2/3 thanh); chưa tới: target ở cuối thanh.
  var thang = tg ? (dt >= tg ? Math.max(tg * 1.5, dt) : tg) : Math.max(dt, 1);
  var gop = (t.traGop != null && dt) ? t.traGop / dt * 100 : null;
  var dat = td.filter(function (x) { return x.ht >= 100; }).length;
  var dau = soDau({ ten: s.ten, phu: 'Realtime · ' + soGio(s.capNhat), cu: cu, trangThai: t.ht,
    trai: ['DTQĐ hôm nay', soTr(t.dtqd), 'tr'], phai: ['% target ngày', soPct(t.ht)],
    day: dt / thang * 100, vach: tg ? tg / thang * 100 : null,
    duoi: ['Target ' + soTr(tg) + ' tr', !tg ? '' : dt >= tg ? '+' + soTr(dt - tg) + ' tr' : 'còn ' + soTr(tg - dt) + ' tr',
      dt >= tg ? '#6EE7B7' : '#FCA5A5'] });
  if (s.thiDuaAn) {   // thi đua bị ẩn → ngành hàng quan tâm thay chỗ thi đua
    var thanNg = [ soHop('horizontal', [ soO('Số lượng', soVN(t.sl)), soO('Trả góp', soPctGon(gop)) ], { spacing: 'sm', margin: 'lg' }) ]
      .concat(soNganhThay(s, 'Ngành hàng hôm nay'));
    thanNg.push(soGoiY('/nv', (s.nv || []).length));
    return soBubble(dau, thanNg, soChan(cum, 'Báo cáo realtime', s.capNhat));
  }
  var than = [
    soHop('horizontal', [ soO('Số lượng', soVN(t.sl)), soO('Trả góp', soPctGon(gop)), soO('Thi đua đạt', String(dat), '/' + td.length) ],
      { spacing: 'sm', margin: 'lg' }),
    soUuTien('Thiếu nhiều nhất – ưu tiên đẩy', td.filter(function (x) { return x.ht < 100 && x.target > 0; })
      .sort(function (a, b) { return (b.target - b.th) - (a.target - a.th); }).slice(0, 3)
      .map(function (x) { return [x.ten, 'còn ' + soTr(x.target - x.th)]; })),
    soHop('horizontal', [ soChu('Thi đua hôm nay', { size: 'md', weight: 'bold', color: '#111827', flex: 1 }),
      soChu('%HT · TH / target', { size: 'xxs', color: SO_XAM, align: 'end', flex: 0 }) ], { margin: 'xl', alignItems: 'flex-end' })
  ];
  if (!td.length) than.push(soChu('Chưa bán chương trình thi đua nào hôm nay.', { size: 'sm', color: SO_XAM, margin: 'md' }));
  than = than.concat(soNhomThiDua(td, function (x) {
    return [x.ten, x.ht, soPctGon(x.ht), soTr(x.th) + ' / ' + soTr(x.target), soLoai(x.ht)];
  }));
  than.push(soGoiY('/nv', (s.nv || []).length));
  return soBubble(dau, than, soChan(cum, 'Báo cáo realtime', s.capNhat));
}

function theLuyKe(s, cu, cum) {
  var t = s.tong || {}, td = s.thiDua || [], chuaCo = s.chuaCo || [];
  var dbao = t.duBao != null ? t.duBao : t.ht, tg = t.target || 0, dt = t.dtqd || 0;
  var dbTD = function (x) { return x.duBao != null ? x.duBao : x.ht; };
  var dat = td.filter(function (x) { return dbTD(x) >= 100; }).length;
  var dau = soDau({ ten: s.ten, phu: 'Lũy kế tháng · ' + soGio(s.capNhat), cu: cu, trangThai: dbao,
    trai: ['DTQĐ tháng', soTr(dt), 'tr'], phai: ['Dự kiến HT', soPct(dbao), t.duKienTien != null ? '≈ ' + soTr(t.duKienTien) + ' tr' : ''],
    day: tg ? dt / tg * 100 : 0, vach: t.tienDo,
    duoi: ['Đã đạt ' + soPct(t.ht) + (t.tienDo != null ? ' · vạch = thời gian ' + soPct(t.tienDo) : '') +
      (t.cachTinh ? ' · dự kiến = ' + t.cachTinh : ''), 'Target ' + soTr(tg) + ' tr'] });
  if (s.thiDuaAn) {   // thi đua bị ẩn → ngành hàng quan tâm thay chỗ thi đua
    var thanNg = [ soHop('horizontal', [ soO('Còn thiếu', soTr(tg ? Math.max(0, tg - dt) : null), ' tr'), soO('Số lượng', soVN(t.sl)) ],
      { spacing: 'sm', margin: 'lg' }) ].concat(soNganhThay(s, 'Ngành hàng tháng'));
    thanNg.push(soGoiY('/nvthang', (s.nv || []).length));
    return soBubble(dau, thanNg, soChan(cum, 'Báo cáo lũy kế', s.capNhat));
  }
  var than = [
    soHop('horizontal', [ soO('Còn thiếu', soTr(tg ? Math.max(0, tg - dt) : null), ' tr'), soO('Số lượng', soVN(t.sl)),
      soO('TĐ dự kiến đạt', String(dat), '/' + (td.length + chuaCo.length)) ], { spacing: 'sm', margin: 'lg' }),
    soUuTien('Dự kiến hụt nhiều nhất – ưu tiên đẩy', td.filter(function (x) { return dbTD(x) < 100 && x.target > 0; })
      .sort(function (a, b) { return b.target * (100 - dbTD(b)) - a.target * (100 - dbTD(a)); }).slice(0, 3)
      .map(function (x) { return [x.ten, 'dự kiến ' + soPctGon(dbTD(x))]; })),
    soHop('horizontal', [ soChu('Thi đua tháng', { size: 'md', weight: 'bold', color: '#111827', flex: 1 }),
      soChu('Dự kiến · HT · TH / target', { size: 'xxs', color: SO_XAM, align: 'end', flex: 0 }) ], { margin: 'xl', alignItems: 'flex-end' })
  ];
  than = than.concat(soNhomThiDua(td, function (x) {
    return [x.ten, dbTD(x), soPctGon(dbTD(x)), 'HT ' + soPctGon(x.ht) + ' · ' + soTr(x.th) + '/' + soTr(x.target), soLoai(dbTD(x))];
  }));
  if (chuaCo.length) {
    var ten = chuaCo.join(' · ');
    than.push(soChu('Chưa có số (' + chuaCo.length + '): ' + (ten.length > 400 ? ten.slice(0, 400) + '…' : ten),
      { size: 'xxs', color: SO_XAM, wrap: true, margin: 'lg' }));
  }
  than.push(soGoiY('/nvthang', (s.nv || []).length));
  return soBubble(dau, than, soChan(cum, 'Báo cáo lũy kế', s.capNhat));
}

// Dòng cuối thẻ siêu thị: nhân viên đã tách sang lệnh riêng.
function soGoiY(lenh, n) {
  return soHop('horizontal', [ soChu('👥 Nhân viên' + (n ? ' (' + n + ' người)' : '') + ': gõ ' + lenh, { size: 'sm', weight: 'bold', color: '#1E3A8A', flex: 1, wrap: true }) ],
    { backgroundColor: '#EEF3FC', cornerRadius: '12px', paddingAll: '12px', margin: 'xxl' });
}

/* ---------- /nv · /nvthang — NHÂN VIÊN ----------
 * 1 siêu thị : tin 1 = bảng xếp hạng; tin 2… = carousel thẻ chi tiết từng NV theo hạng (≤12 thẻ, ≤50 KB/tin, ≤5 tin).
 * Nhiều ST   : mỗi siêu thị 1 bảng xếp hạng; chi tiết từng người: /nv <mã ST>.
 * Dữ liệu NV (trang doc-so gửi): ten, dtqd, sl, traGop, tiTrong, traThang, vay, ng:[[ngành, dtqd, sl], …]. */
var NV_VONG = [['#F5C542', '#5B3D00'], ['#CBD5E1', '#1F2937'], ['#E8B48A', '#5A2A08']];
var NV_NGANH = 12, NV_VACH = true;   // mức gọn của thẻ chi tiết

/* Chia trang (08/11): LINE cho trả lời tối đa 5 tin; mỗi tin ≤12 thẻ / ≤50 KB; mỗi thẻ ≤30 KB.
 * Mỗi trang = 1 tin bảng xếp hạng NHỮNG NGƯỜI CỦA TRANG ĐÓ (thẻ ≤ NV_HANG người, vuốt ngang) + ≤4 tin thẻ chi tiết.
 * Ranh giới trang tính theo CỠ THẬT của thẻ chi tiết (cùng dữ liệu → cùng ranh giới), ≤ NV_TOI_DA người/trang
 * để bảng xếp hạng vừa 1 tin. Không bao giờ bỏ người: thiếu chỗ thì sang trang, cuối thẻ ghi "gõ /nvthang 2". */
var NV_HANG = 16, NV_TOI_DA = 32, NV_CT = 6;
function nvChiaTrang(the) {
  var trang = [], tu = 0;
  while (tu < the.length) {
    var tin = 1, dang = 0, co = 0, i = tu;
    for (; i < the.length && i - tu < NV_TOI_DA; i++) {
      var n = JSON.stringify(the[i]).length + 30;
      if (dang && (dang >= 12 || co + n > 47000)) { if (tin >= 4) break; tin++; dang = 0; co = 0; }
      dang++; co += n;
    }
    trang.push([tu, i]); tu = i;
  }
  return trang.length ? trang : [[0, 0]];
}
function dungFlexNV(goi, ds, bayGio, trang) {
  var rt = goi.ky === 'realtime', cu = nvSoCu(goi, bayGio);
  if (!rt) ganDuKienNV(ds, goi.luc);
  var ten = TEN_KY_SO[goi.ky], lenh = '/nv' + (rt ? '' : 'thang');
  trang = Math.max(1, trang || 1);
  if (ds.length > 1) {   // nhiều siêu thị: mỗi ST 1 thẻ xếp hạng (≤ NV_HANG người đầu), chi tiết bằng /nv <mã>
    if (trang > 1) return [{ type: 'text', text: 'Nhóm có ' + ds.length + ' siêu thị — xem trang theo từng siêu thị: ' +
      ds.map(function (s) { return lenh + ' ' + s.ma + ' ' + trang; }).join(' · ') }];
    var bx = ds.slice(0, 12).map(function (s) {
      var n = (s.nv || []).length;
      return nvXepHang(s, cu, goi, 0, true, 0, Math.min(n, NV_HANG), n > NV_HANG ? 'Còn ' + (n - NV_HANG) + ' người: gõ ' + lenh + ' ' + s.ma : '');
    });
    return nvGomTin(bx, 'Nhân viên (' + ten + '): ' + ds.map(function (s) { return s.ten + ' ' + (s.nv || []).length + ' người'; }).join(' · '), 5);
  }
  var s = ds[0], nv = s.nv || [];
  // Đông người (>12): thẻ gọn ~8,6 KB (6 ngành, không vạch, 4 thi đua) thay vì ~12,8 KB → ~20 người/trang thay vì 12.
  // Mức gọn theo SỐ NGƯỜI (không theo trang) để mọi trang cùng ranh giới.
  if (nv.length > 12) { NV_NGANH = 6; NV_VACH = false; NV_CT = 4; }
  var the = nv.map(function (n, i) { return nvChiTiet(s, n, i, cu, goi); });
  NV_NGANH = 12; NV_VACH = true; NV_CT = 6;
  var dsTrang = nvChiaTrang(the), soTrang = dsTrang.length;
  if (trang > soTrang) return [{ type: 'text', text: s.ten + ' có ' + nv.length + ' người (' + soTrang + ' trang). Gõ ' + lenh + ' để xem từ đầu.' }];
  var tu = dsTrang[trang - 1][0], den = dsTrang[trang - 1][1];
  var tiep = den < nv.length ? 'Còn ' + (nv.length - den) + ' người — gõ ' + lenh + ' ' + (trang + 1) + (trang + 1 === 2 ? '' : '') + ' để xem tiếp.' : '';
  var alt = 'Nhân viên ' + s.ten + ' (' + ten + ')' + (soTrang > 1 ? ' trang ' + trang + '/' + soTrang : '') + ': ' +
    nv.slice(tu, tu + 3).map(function (n, i) { return (tu + i + 1) + '. ' + n.ten + ' ' + soTr(n.dtqd) + ' tr'; }).join(' · ');
  var bx = [];
  for (var a = tu; a === tu || a < den; a += NV_HANG) {
    var b = Math.min(den, a + NV_HANG), cuoi = b >= den;
    bx.push(nvXepHang(s, cu, goi, den - tu, false, a, b, cuoi ? tiep : '', soTrang > 1 ? [trang, soTrang, tu, den] : null));
  }
  return nvGomTin(bx, alt, 1).concat(nvGomTin(the.slice(tu, den), 'Chi tiết nhân viên ' + s.ten, 4)).slice(0, 5);
}
// Xếp các bubble vào carousel: mỗi carousel ≤12 thẻ và ≤47 KB (LINE: 50 KB/tin, tối đa 5 tin/lần trả lời).
function nvGomTin(bubbles, alt, toiDa) {
  var tin = [], dang = [], co = 0;
  var dong = function () {
    if (!dang.length) return;
    tin.push({ type: 'flex', altText: alt.slice(0, 390), contents: dang.length === 1 ? dang[0] : { type: 'carousel', contents: dang } });
    dang = []; co = 0;
  };
  bubbles.forEach(function (b) {
    b.size = 'mega';
    var n = JSON.stringify(b).length;
    if (dang.length && (dang.length >= 12 || co + n > 47000)) dong();
    dang.push(b); co += n;
  });
  dong();
  return tin.slice(0, toiDa);
}

function nvDau(tieuDe, phu, cu, trai, phai) {
  return soHop('vertical', [
    soChu(tieuDe, { size: 'lg', weight: 'bold', color: '#FFFFFF', wrap: true }),
    soHop('horizontal', [ soCham(cu ? '#FBBF24' : '#34D399', '7px'),
      soChu(phu + (cu ? ' · số đã cũ' : ''), { size: 'xs', color: '#C7D4EE', margin: 'sm', flex: 0, wrap: true }) ], { alignItems: 'center', margin: 'xs' }),
    soHop('horizontal', [
      soHop('vertical', [ soChu(trai[0], { size: 'xs', color: '#C7D4EE' }),
        soHop('baseline', [ soChu(trai[1], { size: '3xl', weight: 'bold', color: '#FFFFFF', flex: 0 }),
          soChu(trai[2], { size: 'md', weight: 'bold', color: '#C7D4EE', margin: 'sm', flex: 0 }) ]) ], { flex: 1, justifyContent: 'flex-end' }),
      soHop('vertical', [ soChu(phai[0], { size: 'xs', color: '#C7D4EE', align: 'end' }),
        soChu(phai[1], { size: 'xl', weight: 'bold', color: '#6EE7B7', align: 'end' }),
        phai[2] ? soChu(phai[2], { size: 'xxs', color: '#C7D4EE', align: 'end' }) : null ], { flex: 1, justifyContent: 'flex-end' })
    ], { margin: 'lg' })
  ], { backgroundColor: SO_NAVY, paddingAll: '20px' });
}

// Bảng xếp hạng nhân viên của 1 siêu thị.
// tu–den: dải người của thẻ này; pg = [trang, sốTrang, đầuTrang, cuốiTrang] khi chia trang.
function nvXepHang(s, cu, goi, soChiTiet, nhieuST, tu, den, tiep, pg) {
  var nv = s.nv || [], rt = goi.ky === 'realtime';
  tu = tu || 0; den = den == null ? nv.length : den;
  var cuoiDai = pg ? pg[3] : (nhieuST ? den : nv.length);
  var tongNV = nv.reduce(function (a, n) { return a + (n.dtqd || 0); }, 0);
  var coBan = nv.filter(function (n) { return n.dtqd > 0; }).length;
  var dai = pg || tu || den < nv.length ? ' · người ' + (tu + 1) + '–' + den + '/' + nv.length : '';
  var dau = nvDau('Nhân viên · ' + s.ten, (rt ? 'Realtime · ' : 'Lũy kế tháng · ') + soGio(s.capNhat) + (pg ? ' · trang ' + pg[0] + '/' + pg[1] : '') + dai, cu,
    [rt ? 'DTQĐ NV chính hôm nay' : 'DTQĐ NV chính tháng', soTr(tongNV), 'tr'],
    ['Đã bán', coBan + '/' + nv.length, coBan ? 'BQ ' + soTr(tongNV / coBan) + ' tr/người' : '']);
  var giu = SO_GON; SO_GON = 2;   // bảng xếp hạng: bỏ dòng ngành (đã có ở thẻ chi tiết)
  var than = nv.length ? soNhanVien(s, rt ? 'Xếp hạng · DTQĐ hôm nay' : 'Xếp hạng · DTQĐ lũy kế', tu, den)
    : [soChu('Chưa có số nhân viên.', { size: 'sm', color: SO_XAM, margin: 'lg' })];
  SO_GON = giu;
  if (den < cuoiDai) than.push(soChu('👉 Vuốt sang thẻ bên cạnh: người ' + (den + 1) + '–' + Math.min(cuoiDai, den + NV_HANG), { size: 'xs', weight: 'bold', color: '#1E3A8A', margin: 'lg', wrap: true }));
  var goiY = nhieuST ? 'Chi tiết từng người: gõ /nv' + (rt ? '' : 'thang') + ' ' + s.ma
    : soChiTiet && den >= cuoiDai ? '👇 Thẻ chi tiết từng người ở tin nhắn bên dưới (vuốt ngang).' : '';
  if (goiY) than.push(soChu(goiY, { size: 'xs', weight: 'bold', color: '#1E3A8A', margin: 'lg', wrap: true }));
  if (tiep) than.push(soChu('📄 ' + tiep, { size: 'xs', weight: 'bold', color: '#B45309', margin: 'md', wrap: true }));
  if (s.thieuPhan) than.push(soChu('⚠ Thiếu một phần danh sách (gói gửi lên chưa đủ) — quét lại trên app.', { size: 'xxs', color: '#B91C1C', margin: 'md', wrap: true }));
  return soBubble(dau, than, soChan(goi.cum, rt ? 'Nhân viên realtime' : 'Nhân viên lũy kế', s.capNhat));
}

/* Khối "Target tháng" từ thẻ Sức khỏe nhân viên DMXWork (doc-so gửi n.sk, app DataSnap 5.8):
 * tg target (bản chỉnh trên nv.html nếu có, không thì DMX chia đều = mt), pt % theo tiến độ, dk % dự kiến,
 * ck cần mỗi ngày, d/dm điểm, h/hn hạng, td [đạt, tổng], ct [[chương trình, %, sao]] — số tới hết hôm qua (den). */
function nvSucKhoe(sk) {
  var ra = [
    soHop('horizontal', [ soChu('Target tháng', { size: 'md', weight: 'bold', color: '#111827', flex: 1 }),
      soChu('DMXWork · tới hết ' + (sk.den || 'hôm qua'), { size: 'xxs', color: SO_XAM, align: 'end', flex: 0 }) ], { margin: 'xl', alignItems: 'flex-end' }),
    soHop('horizontal', [ soO('Target', soTr(sk.tg), ' tr'), soO('% tiến độ', soPctGon(sk.pt)), soO('Cần/ngày', soTr(sk.ck), ' tr') ],
      { spacing: 'sm', margin: 'md' })
  ];
  var phu = [];
  if (sk.d != null) phu.push('Điểm ' + sk.d + '/' + (sk.dm || 27));
  if (sk.h != null) phu.push('hạng DMX ' + sk.h + '/' + (sk.hn || '?'));
  if (sk.dk != null) phu.push('dự kiến ' + soPctGon(sk.dk));
  if (sk.td) phu.push('thi đua đạt ' + sk.td[0] + '/' + sk.td[1]);
  if (sk.mt != null && sk.tg != null && Math.abs(sk.tg - sk.mt) > 0.05) phu.push('DMX chia đều ' + soTr(sk.mt) + ' tr');
  if (phu.length) ra.push(soChu(phu.join(' · '), { size: 'xxs', color: SO_XAM, margin: 'sm', wrap: true }));
  var ct = (sk.ct || []).slice(0, NV_CT);
  if (ct.length) {
    ra.push(soChu('Thi đua của bạn', { size: 'sm', weight: 'bold', color: '#111827', margin: 'lg' }));
    ct.forEach(function (c) {
      var nhom = SO_NHOM[soLoai(c[1])];
      ra.push({ type: 'box', layout: 'horizontal', margin: 'sm', contents: [
        { type: 'text', text: (c[2] ? '★ ' : '') + (c[0] || '—'), size: 'xs', color: '#1F2937', flex: 1, wrap: true },
        { type: 'text', text: soPctGon(c[1]), size: 'xs', weight: 'bold', color: nhom.chu, align: 'end', flex: 0, gravity: 'center' } ] });
    });
  }
  return ra;
}

// Thẻ chi tiết 1 nhân viên.
function nvChiTiet(s, n, i, cu, goi) {
  var rt = goi.ky === 'realtime', co = n.dtqd > 0, nv = s.nv || [];
  var tongST = (s.tong || {}).dtqd;
  var tiTrong = n.tiTrong != null ? n.tiTrong : (tongST && co ? n.dtqd / tongST * 100 : null);
  var gop = n.traGop != null && co ? n.traGop / n.dtqd * 100 : null;
  var vong = !co ? ['#FEE2E2', '#B91C1C'] : (NV_VONG[i] || ['#FFFFFF', SO_NAVY]);
  var mau = n._dk != null ? NV_MAU[soLoai(n._dk)] : null;
  var dau = soHop('vertical', [
    soHop('horizontal', [
      soHop('vertical', [ soChu(String(i + 1), { size: 'md', weight: 'bold', color: vong[1], align: 'center' }) ],
        { width: '36px', height: '36px', cornerRadius: '18px', backgroundColor: vong[0], justifyContent: 'center', flex: 0 }),
      soHop('vertical', [ soChu(n.ten, { size: 'lg', weight: 'bold', color: '#FFFFFF', wrap: true }),
        soChu(s.ten + ' · hạng ' + (i + 1) + '/' + nv.length + (cu ? ' · số đã cũ' : ''), { size: 'xxs', color: '#C7D4EE', wrap: true }) ],
        { flex: 1, margin: 'md', justifyContent: 'center' }),
      mau ? soHop('vertical', [ soChu(mau.ten, { size: 'xxs', weight: 'bold', color: mau.nhan[1] }) ],
        { backgroundColor: mau.nhan[0], cornerRadius: '999px', paddingStart: '10px', paddingEnd: '10px', paddingTop: '5px', paddingBottom: '5px', flex: 0 }) : null
    ], { alignItems: 'center' }),
    soHop('horizontal', [
      soHop('vertical', [ soChu(rt ? 'DTQĐ hôm nay' : 'DTQĐ tháng', { size: 'xs', color: '#C7D4EE' }),
        soHop('baseline', [ soChu(co ? soTr(n.dtqd) : '0', { size: '3xl', weight: 'bold', color: '#FFFFFF', flex: 0 }),
          soChu('tr', { size: 'md', weight: 'bold', color: '#C7D4EE', margin: 'sm', flex: 0 }) ]) ], { flex: 1, justifyContent: 'flex-end' }),
      mau ? soHop('vertical', [ soChu('Dự kiến HT target', { size: 'xs', color: '#C7D4EE', align: 'end' }),
        soChu(soPctGon(n._dk), { size: 'xl', weight: 'bold', color: mau.nhan[0], align: 'end' }),
        soChu('Tỉ trọng ST ' + soPctGon(tiTrong), { size: 'xxs', color: '#C7D4EE', align: 'end' }) ], { flex: 1, justifyContent: 'flex-end' })
      : soHop('vertical', [ soChu('Tỉ trọng siêu thị', { size: 'xs', color: '#C7D4EE', align: 'end' }),
        soChu(soPctGon(tiTrong), { size: 'xl', weight: 'bold', color: '#6EE7B7', align: 'end' }) ], { flex: 1, justifyContent: 'flex-end' })
    ], { margin: 'lg' })
  ], { backgroundColor: SO_NAVY, paddingAll: '18px' });
  var coVay = n.vay != null;
  var than = [
    soHop('horizontal', [ soO('Số lượng', soVN(n.sl)), soO('Trả góp', soPctGon(gop)),
      soO(coVay ? 'Khoản vay' : 'Trả thẳng', coVay ? soVN(n.vay) : soTr(n.traThang), coVay ? '' : ' tr') ],
      { spacing: 'sm', margin: 'lg' })
  ];
  if (n.traGop != null && co) than.push(soChu('Trả góp ' + soTr(n.traGop) + ' tr' + (n.traThang != null ? ' · trả thẳng ' + soTr(n.traThang) + ' tr' : ''),
    { size: 'xxs', color: SO_XAM, margin: 'sm', wrap: true }));
  if (n.sk) than = than.concat(nvSucKhoe(n.sk));
  var ng = (n.ng || []).slice(0, NV_NGANH);
  than.push(soHop('horizontal', [ soChu('Ngành hàng đã bán', { size: 'md', weight: 'bold', color: '#111827', flex: 1 }),
    soChu('SL · DTQĐ', { size: 'xxs', color: SO_XAM, align: 'end', flex: 0 }) ], { margin: 'xl', alignItems: 'flex-end' }));
  var caSTkhongNganh = !(nv.some(function (x) { return (x.ng || []).length; }));
  if (!ng.length) than.push(soChu(!co ? 'Chưa bán ngành nào.' : caSTkhongNganh ? 'Gói chưa có chi tiết ngành của nhân viên — cần app DataSnap 5.8.1 trở lên rồi Quét cụm lại.' : 'Không có chi tiết ngành.',
    { size: 'sm', color: co ? SO_XAM : '#B91C1C', margin: 'md', wrap: true }));
  var maxNg = Math.max.apply(null, ng.map(function (g) { return g[1] || 0; }).concat([0.1]));
  ng.forEach(function (g) {
    var w = Math.max(2, Math.round((g[1] || 0) / maxNg * 100));
    than.push({ type: 'box', layout: 'horizontal', margin: 'md', contents: [
      { type: 'text', text: g[0] || '—', size: 'sm', color: '#1F2937', flex: 1, wrap: true },
      { type: 'text', text: g[2] != null ? soVN(g[2]) : ' ', size: 'xs', color: SO_XAM, align: 'end', flex: 0, gravity: 'center' },
      { type: 'text', text: soTr(g[1]), size: 'sm', weight: 'bold', color: SO_XANH, align: 'end', flex: 0, margin: 'md', gravity: 'center' } ] });
    if (NV_VACH) than.push({ type: 'box', layout: 'vertical', contents: [], width: w + '%', height: '3px', backgroundColor: '#93B4F0', margin: 'xs' });
  });
  if ((n.ng || []).length > ng.length) than.push(soChu('+ ' + ((n.ng || []).length - ng.length) + ' ngành nhỏ khác', { size: 'xxs', color: SO_XAM, margin: 'sm' }));
  var b = soBubble(dau, than, soChan(goi.cum, rt ? 'Nhân viên realtime' : 'Nhân viên lũy kế', s.capNhat));
  if (mau) { b.styles.body = { backgroundColor: mau.nen }; b.styles.footer = { backgroundColor: mau.nen }; }
  return b;
}

/* =========================================================================
 * COUPON GIỜ VÀNG GIÁ SỐC (/cp) — thêm 13/11/2026
 * -------------------------------------------------------------------------
 * Nguồn: mail "MÃ COUPON … GIỜ VÀNG GIÁ SỐC" trên portal.thegioididong.com; userscript
 * gvgs-coupon.user.js đọc mail của siêu thị mình rồi POST {lenh:'coupon', khoa, st, tu, den, ds}.
 * Nhân viên gõ /cp → chọn ngành → bấm "Lấy mã" ở model cần bán → bot GIAO 1 mã cho người
 * bấm (kèm nút Sao chép) và gỡ mã đó khỏi danh sách ngay. Danh sách KHÔNG BAO GIỜ hiện mã,
 * chỉ hiện số mã còn lại ⇒ không ai lấy trùng.
 * Lưu trong Script Properties tới hết hạn coupon + 1 ngày rồi tự xoá (không lưu lâu).
 * Khoá gửi: máy gửi đầu tiên đặt KHOA_CP; đổi máy = xoá Script Property KHOA_CP.
 * ========================================================================= */
var CP_NGANH = [
  ['Tivi', /^(tivi|tv|smart tivi|google tivi)\b/, '📺'],
  ['Loa', /^loa\b/, '🔊'],
  ['Tủ lạnh', /^tu lanh\b/, '🧊'],
  ['Tủ đông · tủ mát', /^tu (dong|mat)\b/, '❄️'],
  ['Máy giặt · máy sấy', /^may (giat|say)\b/, '🧺'],
  ['Máy rửa bát', /^may rua (bat|chen)\b/, '🍽️'],
  ['Máy lọc nước', /^may loc nuoc\b/, '💧'],
  ['Máy lạnh', /^(may lanh|dieu hoa)\b/, '🌬️'],
  ['Máy lọc không khí', /^may loc khong khi\b/, '🍃'],
  ['Gia dụng', /^(noi|bep|lo|may xay|may ep|quat|binh|am|may hut)\b/, '🍳']
];
var CP_MAU = { navy: '#0B2A5B', xanh: '#0A7A3D', cam: '#C2410C', xam: '#6B7280', nen: '#F3F6FB' };

function cpNganhCua(ten, nhomMail) {
  var t = boDau(ten);
  for (var i = 0; i < CP_NGANH.length; i++) if (CP_NGANH[i][1].test(t)) return CP_NGANH[i][0];
  var nm = String(nhomMail || '').trim();
  return nm ? nm.charAt(0).toUpperCase() + nm.slice(1).toLowerCase() : 'Khác';
}
function cpIcon(nganh) {
  for (var i = 0; i < CP_NGANH.length; i++) if (CP_NGANH[i][0] === nganh) return CP_NGANH[i][2];
  return '🎟';
}
function cpHomNay() { return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd'); }
function cpNgayVN(yyyymmdd) { var s = String(yyyymmdd); return s.slice(6, 8) + '/' + s.slice(4, 6); }
function cpTien(v) { return v ? String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ' : ''; }

// Script Properties giới hạn ~9 KB/giá trị ⇒ cắt chuỗi thành nhiều mảnh.
function cpGhi(props, khoa, obj) {
  var s = JSON.stringify(obj), n = Math.ceil(s.length / 8000) || 1, cu = +(props.getProperty(khoa + '#n') || 0), m = {};
  for (var i = 0; i < n; i++) m[khoa + '#' + i] = s.slice(i * 8000, (i + 1) * 8000);
  m[khoa + '#n'] = String(n);
  props.setProperties(m);
  for (var j = n; j < cu; j++) props.deleteProperty(khoa + '#' + j);
}
function cpDocTho(props, khoa) {
  var n = +(props.getProperty(khoa + '#n') || 0), s = '';
  if (!n) return null;
  for (var i = 0; i < n; i++) s += props.getProperty(khoa + '#' + i) || '';
  try { return JSON.parse(s); } catch (e) { return null; }
}
function cpXoa(props, khoa) {
  var n = +(props.getProperty(khoa + '#n') || 0);
  for (var i = 0; i < n; i++) props.deleteProperty(khoa + '#' + i);
  props.deleteProperty(khoa + '#n');
}
function cpDsST(props) { return (props.getProperty('cpDs') || '').split(',').filter(Boolean); }
// Đọc bộ coupon của 1 siêu thị; quá hạn 1 ngày thì xoá luôn.
function cpDoc(props, st) {
  var cp = cpDocTho(props, 'cp|' + st);
  if (cp && Date.now() > cp.het + 86400000) {
    cpXoa(props, 'cp|' + st); cpXoa(props, 'cpD|' + st);
    props.setProperty('cpDs', cpDsST(props).filter(function (x) { return x !== st; }).join(','));
    return null;
  }
  return cp;
}

/* ---------- Nhận dữ liệu từ userscript ---------- */
function nhanCoupon(body) {
  var props = PropertiesService.getScriptProperties();
  var khoa = String(body.khoa || '');
  if (!/^[0-9a-f]{32}$/.test(khoa)) return { ok: false, loi: 'thiếu khoá' };
  var dang = props.getProperty('KHOA_CP');
  if (dang && dang !== khoa) return { ok: false, loi: 'Máy khác đang giữ quyền gửi coupon. Người quản lý bot xoá Script Property KHOA_CP để đổi máy.' };
  var st = String(body.st || '').replace(/\D/g, '');
  var tu = String(body.tu || ''), den = String(body.den || '');
  if (!/^\d{2,6}$/.test(st) || !/^\d{8}$/.test(tu) || !/^\d{8}$/.test(den)) return { ok: false, loi: 'thiếu siêu thị / kỳ' };
  var theoModel = {}, thuTu = [], soMa = 0, daCo = {};
  (body.ds || []).forEach(function (x) {
    var ma = String(x.ma || '').toUpperCase().trim(), ten = String(x.model || '').trim(), ngay = String(x.ngay || '');
    if (!/^[A-Z0-9]{6,30}$/.test(ma) || !ten || !/^\d{8}$/.test(ngay) || daCo[ma]) return;
    daCo[ma] = 1;
    if (!theoModel[ten]) { theoModel[ten] = { t: ten, n: cpNganhCua(ten, x.nhom), g: +x.gia || 0, y: +x.giaNY || 0, c: [] }; thuTu.push(ten); }
    theoModel[ten].c.push(ngay + ':' + ma);
    soMa++;
  });
  if (!soMa) return { ok: false, loi: 'không có mã nào' };
  var nganh = [];
  CP_NGANH.forEach(function (g) { if (thuTu.some(function (t) { return theoModel[t].n === g[0]; })) nganh.push(g[0]); });
  thuTu.forEach(function (t) { if (nganh.indexOf(theoModel[t].n) < 0) nganh.push(theoModel[t].n); });
  var m = [];
  nganh.forEach(function (g, i) {
    thuTu.forEach(function (t) {
      var x = theoModel[t];
      if (x.n !== g) return;
      x.c.sort();
      m.push({ n: i, t: x.t, g: x.g, y: x.y, c: x.c });
    });
  });
  var het = Date.parse(den.slice(0, 4) + '-' + den.slice(4, 6) + '-' + den.slice(6, 8) + 'T23:59:59+07:00');
  var cp = { st: st, id: st + '-' + tu, tu: tu, den: den, het: het, luc: new Date().toISOString(), nganh: nganh, m: m };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var cu = cpDocTho(props, 'cp|' + st);
    if (!cu || cu.id !== cp.id) cpGhi(props, 'cpD|' + st, {});   // kỳ mới: xoá sổ đã giao của kỳ cũ
    cpGhi(props, 'cp|' + st, cp);
    var ds = cpDsST(props); if (ds.indexOf(st) < 0) { ds.push(st); props.setProperty('cpDs', ds.join(',')); }
    if (!dang) props.setProperty('KHOA_CP', khoa);
  } finally { lock.releaseLock(); }
  var daGiao = cpDocTho(props, 'cpD|' + st) || {};
  return { ok: true, st: st, ky: cpNgayVN(tu) + '–' + cpNgayVN(den), model: m.length, ma: soMa,
           nganh: nganh, daGiao: Object.keys(daGiao).length };
}

/* ---------- Chọn siêu thị cho nhóm ---------- */
function cpCuaNhom(ev) {
  var props = PropertiesService.getScriptProperties();
  var coDl = cpDsST(props), nhom = maCuaNhom(chatCua(ev.source));
  var chon = nhom.filter(function (m) { return coDl.indexOf(m) >= 0; })[0];
  if (!chon && !nhom.length && coDl.length === 1) chon = coDl[0];   // chat riêng / nhóm chưa gắn: chỉ 1 ST có coupon
  if (!chon) return { props: props, cp: null, nhom: nhom };
  return { props: props, cp: cpDoc(props, chon), nhom: nhom };
}
function cpConLai(model, daGiao, homNay) {
  var hn = 0, truoc = 0, sau = 0;
  model.c.forEach(function (k) {
    var ma = k.slice(9), ngay = k.slice(0, 8);
    if (daGiao[ma]) return;
    if (ngay === homNay) hn++; else if (ngay < homNay) truoc++; else sau++;
  });
  return { hn: hn, truoc: truoc, sau: sau, dung: hn + truoc };
}
function cpHetMa(ev, kq) {
  if (kq.nhom.length) replyText(ev.replyToken, 'Chưa có coupon Giờ vàng giá sốc cho siêu thị ' + kq.nhom.join(', ') + '.' + NL +
    'Người quản lý mở portal (Mail đã nhận) để userscript gửi mã lên bot.');
  else replyText(ev.replyToken, 'Nhóm này chưa gắn siêu thị nên bot không biết lấy coupon của ai. Gõ /dangky <mã siêu thị>, ví dụ /dangky 14285.');
}

/* ---------- Thẻ Flex ---------- */
function cpDau(tieuDe, phu, mau) {
  return { type: 'box', layout: 'vertical', backgroundColor: mau || CP_MAU.navy, paddingAll: '16px', contents: [
    { type: 'text', text: tieuDe, color: '#FFFFFF', weight: 'bold', size: 'md', wrap: true },
    { type: 'text', text: phu, color: '#DBE4FF', size: 'xs', wrap: true, margin: 'sm' } ] };
}
function cpPhu(cp) {
  return cpNgayVN(cp.tu) + ' – ' + cpNgayVN(cp.den) + '/' + cp.den.slice(0, 4) + ' · Siêu thị ' + cp.st + ' · hạn 23h ' + cpNgayVN(cp.den);
}
function cpTheTongQuan(cp, daGiao) {
  var hn = cpHomNay(), nut = [], tong = 0;
  cp.nganh.forEach(function (g, i) {
    var con = 0, mdl = 0;
    cp.m.forEach(function (x) { if (x.n === i) { mdl++; con += cpConLai(x, daGiao, hn).dung; } });
    tong += con;
    var b = { type: 'button', style: con ? 'primary' : 'secondary', height: 'sm', margin: 'sm',
      action: { type: 'postback', label: (cpIcon(g) + ' ' + g + ' · còn ' + con + ' mã').slice(0, 40),
                data: 'cp=g&k=' + cp.id + '&n=' + i, displayText: 'Xem coupon ' + g } };
    if (con) b.color = CP_MAU.navy;
    nut.push(b);
  });
  return { type: 'flex', altText: '🎟 Coupon Giờ vàng giá sốc — chọn ngành hàng', contents: { type: 'bubble', size: 'mega',
    header: cpDau('🎟 COUPON GIỜ VÀNG GIÁ SỐC', cpPhu(cp)),
    body: { type: 'box', layout: 'vertical', paddingAll: '14px', contents: [
      { type: 'text', text: 'Chọn ngành hàng → bấm "Lấy mã" đúng model khách mua. Mỗi lần bấm bot giao 1 mã riêng cho bạn và gỡ mã đó khỏi danh sách.', size: 'xs', color: CP_MAU.xam, wrap: true },
      { type: 'text', text: 'Còn dùng được hôm nay: ' + tong + ' mã', size: 'sm', weight: 'bold', color: tong ? CP_MAU.xanh : CP_MAU.cam, margin: 'md' }
    ].concat(nut) } } };
}
function cpTheNganh(cp, daGiao, i) {
  var hn = cpHomNay(), dong = [];
  cp.m.forEach(function (x, idx) {
    if (x.n !== i) return;
    var c = cpConLai(x, daGiao, hn);
    var tinh = c.dung ? 'Còn ' + c.dung + ' mã dùng được' + (c.truoc ? ' (có ' + c.truoc + ' mã ngày trước)' : '')
             : c.sau ? 'Hết mã hôm nay · ' + c.sau + ' mã của ngày sau' : 'Đã hết mã';
    if (dong.length) dong.push({ type: 'separator', margin: 'md' });
    dong.push({ type: 'box', layout: 'horizontal', margin: 'md', spacing: 'md', contents: [
      { type: 'box', layout: 'vertical', flex: 1, contents: [
        { type: 'text', text: x.t, size: 'sm', weight: 'bold', color: '#111827', wrap: true },
        { type: 'text', text: x.g ? 'Giá sốc ' + cpTien(x.g) + (x.y ? ' · NY ' + cpTien(x.y) : '') : '—', size: 'xxs', color: CP_MAU.cam, wrap: true, margin: 'xs' },
        { type: 'text', text: tinh, size: 'xxs', color: c.dung ? CP_MAU.xanh : CP_MAU.xam, wrap: true, margin: 'xs' } ] },
      c.dung ? { type: 'button', style: 'primary', color: CP_MAU.xanh, height: 'sm', flex: 0, gravity: 'center',
          action: { type: 'postback', label: 'Lấy mã', data: 'cp=l&k=' + cp.id + '&m=' + idx } }
        : { type: 'text', text: 'Hết', size: 'xs', color: CP_MAU.xam, flex: 0, gravity: 'center' } ] });
  });
  var g = cp.nganh[i] || '';
  if (!dong.length) dong.push({ type: 'text', text: 'Ngành này không có model nào.', size: 'sm', color: CP_MAU.xam });
  return { type: 'flex', altText: '🎟 Coupon ' + g, contents: { type: 'bubble', size: 'giga',
    header: cpDau(cpIcon(g) + ' COUPON ' + g.toUpperCase(), cpPhu(cp)),
    body: { type: 'box', layout: 'vertical', paddingAll: '14px', contents: dong },
    footer: { type: 'box', layout: 'vertical', paddingAll: '8px', contents: [
      { type: 'button', style: 'link', height: 'sm', action: { type: 'postback', label: '← Các ngành khác', data: 'cp=t&k=' + cp.id } } ] } } };
}
function cpTheGiao(cp, x, ma, ngay, ten, conLai) {
  var homNay = cpHomNay();
  var than = [
    { type: 'text', text: 'DÙNG CHO MODEL', size: 'xxs', color: CP_MAU.xam, weight: 'bold' },
    { type: 'text', text: x.t, size: 'md', weight: 'bold', color: '#111827', wrap: true, margin: 'xs' } ];
  if (x.g) than.push({ type: 'text', text: 'Giá sốc ' + cpTien(x.g) + (x.y ? ' (niêm yết ' + cpTien(x.y) + ')' : ''), size: 'xs', color: CP_MAU.cam, wrap: true, margin: 'xs' });
  than.push(
    { type: 'box', layout: 'vertical', backgroundColor: CP_MAU.nen, cornerRadius: '8px', paddingAll: '12px', margin: 'lg', contents: [
      { type: 'text', text: 'MÃ COUPON', size: 'xxs', color: CP_MAU.xam, weight: 'bold' },
      { type: 'text', text: ma, size: 'xl', weight: 'bold', color: CP_MAU.navy, margin: 'xs', wrap: true } ] },
    { type: 'text', text: 'Mã của ngày ' + cpNgayVN(ngay) + (ngay < homNay ? ' (mã ngày trước còn dư)' : '') + ' · hạn 23h ' + cpNgayVN(cp.den) + '. Model này còn ' + conLai + ' mã.',
      size: 'xxs', color: CP_MAU.xam, wrap: true, margin: 'md' },
    { type: 'text', text: 'Chỉ dùng cho khách mua đúng model trên. Không add được thì gõ /cp lấy mã khác.', size: 'xxs', color: CP_MAU.xam, wrap: true, margin: 'xs' });
  return { type: 'flex', altText: '🎟 ' + ten + ' — mã cho ' + x.t + ': ' + ma, contents: { type: 'bubble', size: 'mega',
    header: cpDau('✅ MÃ COUPON CỦA ' + ten.toUpperCase(), 'Đã gỡ khỏi danh sách — người khác không nhận được mã này', CP_MAU.xanh),
    body: { type: 'box', layout: 'vertical', paddingAll: '16px', contents: than },
    footer: { type: 'box', layout: 'vertical', paddingAll: '10px', contents: [
      { type: 'button', style: 'primary', color: CP_MAU.navy, action: { type: 'clipboard', label: '📋 Sao chép mã', clipboardText: ma } } ] } } };
}

/* ---------- Lệnh & nút ---------- */
function traLoiCoupon(ev, thamSo) {
  var kq = cpCuaNhom(ev);
  if (!kq.cp) { cpHetMa(ev, kq); return; }
  var cp = kq.cp, daGiao = cpDocTho(kq.props, 'cpD|' + cp.st) || {};
  var q = boDau(thamSo || '');
  if (/^(ls|lich ?su|da giao|ai lay)$/.test(q)) { replyText(ev.replyToken, cpLichSu(cp, daGiao)); return; }
  if (q) {
    var iN = -1;
    cp.nganh.forEach(function (g, i) { if (iN < 0 && boDau(g).indexOf(q) >= 0) iN = i; });
    if (iN < 0) cp.m.forEach(function (x) { if (iN < 0 && boDau(x.t).indexOf(q) >= 0) iN = x.n; });
    if (iN >= 0) { replyFlexAnToan(ev.replyToken, cpTheNganh(cp, daGiao, iN)); return; }
    replyText(ev.replyToken, 'Không thấy ngành/model "' + thamSo + '". Các ngành có coupon: ' + cp.nganh.join(', ') + '.');
    return;
  }
  replyFlexAnToan(ev.replyToken, cpTheTongQuan(cp, daGiao));
}
function cpLichSu(cp, daGiao) {
  var ds = Object.keys(daGiao).map(function (ma) { var p = String(daGiao[ma]).split('|'); return { ma: ma, ten: p[0], luc: p[1] || '', mdl: p[2] || '' }; });
  if (!ds.length) return 'Kỳ ' + cpNgayVN(cp.tu) + '–' + cpNgayVN(cp.den) + ': chưa ai lấy mã.';
  ds.sort(function (a, b) { return a.luc < b.luc ? 1 : -1; });
  return '🎟 Mã đã giao (' + ds.length + ', mới nhất trước):' + NL + ds.slice(0, 40).map(function (x) {
    return '• ' + cpNgayVN(x.luc.slice(0, 8)) + ' ' + x.luc.slice(9) + ' ' + x.ten + ' — ' + x.mdl + ' — ' + x.ma;
  }).join(NL) + (ds.length > 40 ? NL + '… và ' + (ds.length - 40) + ' mã khác' : '');
}
function bamCoupon(ev) {
  var q = {};
  String(ev.postback.data).split('&').forEach(function (p) { var k = p.split('='); q[k[0]] = decodeURIComponent(k[1] || ''); });
  var kq = cpCuaNhom(ev), cp = kq.cp;
  if (!cp) { cpHetMa(ev, kq); return; }
  if (q.k !== cp.id) { replyText(ev.replyToken, 'Thẻ này của kỳ coupon cũ. Gõ /cp để xem coupon mới.'); return; }
  if (q.cp === 't') { replyFlexAnToan(ev.replyToken, cpTheTongQuan(cp, cpDocTho(kq.props, 'cpD|' + cp.st) || {})); return; }
  if (q.cp === 'g') { replyFlexAnToan(ev.replyToken, cpTheNganh(cp, cpDocTho(kq.props, 'cpD|' + cp.st) || {}, +q.n)); return; }
  if (q.cp !== 'l') return;
  var x = cp.m[+q.m];
  if (!x) { replyText(ev.replyToken, 'Không tìm thấy model. Gõ /cp để xem lại.'); return; }
  if (Date.now() > cp.het) { replyText(ev.replyToken, '⏰ Coupon kỳ này đã hết hạn (23h ' + cpNgayVN(cp.den) + ').'); return; }
  var ten = tenNguoiBam(ev.source), homNay = cpHomNay(), luc = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd HH:mm');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var chon = null, daGiao, c;
  try {
    daGiao = cpDocTho(kq.props, 'cpD|' + cp.st) || {};
    // Ưu tiên mã của HÔM NAY, rồi tới mã ngày trước còn dư (mới trước). Không lấy mã của ngày sau.
    var ung = x.c.filter(function (k) { return !daGiao[k.slice(9)] && k.slice(0, 8) <= homNay; });
    ung.sort(function (a, b) {
      var A = a.slice(0, 8), B = b.slice(0, 8);
      if (A === homNay && B !== homNay) return -1;
      if (B === homNay && A !== homNay) return 1;
      return A < B ? 1 : A > B ? -1 : 0;
    });
    if (ung.length) {
      chon = ung[0];
      daGiao[chon.slice(9)] = ten.replace(/\|/g, '/') + '|' + luc + '|' + x.t.replace(/\|/g, '/');
      cpGhi(kq.props, 'cpD|' + cp.st, daGiao);
    }
    c = cpConLai(x, daGiao, homNay);
  } finally { lock.releaseLock(); }
  if (!chon) {
    replyText(ev.replyToken, '❌ ' + x.t + ': hết mã dùng được hôm nay.' +
      (c.sau ? NL + 'Còn ' + c.sau + ' mã dành cho ngày sau — hỏi quản lý trước khi dùng sớm.' : ''));
    return;
  }
  var the = cpTheGiao(cp, x, chon.slice(9), chon.slice(0, 8), ten, c.dung);
  // Mã đã bị gỡ khỏi danh sách ⇒ thẻ lỗi thì vẫn phải đưa mã dạng chữ, không được mất mã.
  if (flexHopLe(the)) reply(ev.replyToken, [the]);
  else replyText(ev.replyToken, '✅ Mã coupon của ' + ten + NL + 'Model: ' + x.t + NL + 'Mã: ' + chon.slice(9) + NL + '(Nhấn giữ để sao chép)');
}
/* NGƯỜI QUẢN LÝ BOT: xoá ngay toàn bộ coupon đang giữ (chọn hàm này → Run). */
function xoaCoupon() {
  var props = PropertiesService.getScriptProperties();
  cpDsST(props).forEach(function (st) { cpXoa(props, 'cp|' + st); cpXoa(props, 'cpD|' + st); });
  props.deleteProperty('cpDs');
  console.log('Đã xoá coupon.');
}
