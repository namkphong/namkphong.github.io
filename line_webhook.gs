/**
 * line_webhook.gs — Bot LINE: CHỈ CÒN PHẦN CHECKLIST CÔNG VIỆC.
 * =========================================================================
 * Đã gỡ toàn bộ lệnh báo cáo/ảnh (/số /bc /bcnv /sieuthi /tuan /cum /rtcum
 * /tomtat /tonghop /nv /dangky…) và mọi kết nối máy chủ ngoài. Bot chỉ phục vụ:
 *   • /sang · /chieu  — checklist công việc theo ca, bấm "Hoàn tất".
 *   • /thongke        — thống kê checklist từ thứ Hai tới nay.
 *   • /qlst           — nút mở trang web chấm checklist QLST (Đạt/Không đạt).
 *   • /dangkyqlst · /huyqlst — nhận/ngừng checklist QLST tự động (7h30, 15h, 20h).
 *   • /so · /tonghop  — thẻ Flex số Realtime / Lũy kế do app DataSnap gửi lên.
 * Dữ liệu checklist lưu trong Script Properties của chính Apps Script này.
 * Số bán hàng KHÔNG lưu lâu: chỉ nằm trong CacheService tối đa 6 tiếng rồi tự xoá.
 *
 * CẬP NHẬT KHI SỬA: Deploy -> Manage deployments -> bút chì -> New version -> Deploy.
 * Script Properties cần: LINE_TOKEN = channel access token.
 * Hẹn giờ QLST: chạy hàm caiHenGioQlst MỘT LẦN trong trình soạn Apps Script.
 */

var NL = String.fromCharCode(10);
var BOT_VER = '2026-11-03.1-so-tonghop';

function doGet(e) {
  // API cho trang qlst.html (xem apiQlst). Không có ?api= thì trả chuỗi kiểm bản.
  if (e && e.parameter && /^qlst/.test(e.parameter.api || '')) {
    var kq;
    try { kq = apiQlst(e.parameter); } catch (err) { kq = { ok: false, loi: String(err) }; }
    return ContentService.createTextOutput(JSON.stringify(kq)).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(
    'OK — bot (/so /tonghop /sang /chieu /thongke /qlst /dangkyqlst /huyqlst) đang chạy. Bản: ' + BOT_VER);
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
  if (!ev || ev.type !== 'message' || !ev.message || ev.message.type !== 'text' || !ev.replyToken) return;
  var raw = (ev.message.text || '').normalize('NFC').trim();
  if (raw.charAt(0) !== '/') return;         // không có / thì bot im
  var cmd = raw.slice(1).trim().toLowerCase();

  if (cmd === 'help' || cmd === 'trợ giúp' || cmd === 'tro giup') {
    replyText(ev.replyToken,
      'Lệnh số (từ app DataSnap):' + NL +
      '• /so — số REALTIME hôm nay: tiến độ, thi đua đã bán, nhân viên.' + NL +
      '• /tonghop — số LŨY KẾ tháng: % HT, dự báo, thi đua, nhân viên.' + NL + NL +
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
 * SỐ BÁN HÀNG TỪ APP DATASNAP — /so (Realtime) · /tonghop (Lũy kế)
 * Trang doc-so.html (trong app) gửi BẢN TÓM TẮT đã lọc/xếp sẵn sau mỗi lần quét.
 * Giữ trong CacheService tối đa 6 tiếng (giới hạn của Google) rồi tự mất —
 * không lưu lâu, theo quy định không giữ số trên mây. Gõ lệnh = Reply, miễn phí.
 * Khoá: lần gửi đầu tiên đặt KHOA_SO (Script Properties); sau đó chỉ nhận đúng khoá đó.
 *   Đổi máy → xoá KHOA_SO trong Project Settings → Script Properties rồi gửi lại.
 * ===================================================================== */
var SO_GIU_GIAY = 21600;   // 6 tiếng — tối đa CacheService cho phép
// Nhóm LINE → mã siêu thị (MWG). Nhóm khác / chat riêng với bot: hiện mọi siêu thị.
var NHOM_SIEU_THI = {
  'Cd6981bde07d3c222623f363b8f5739bf': '14285',   // 396 Nguyễn Văn Cừ
  'Cd16f4cb26203b273afd91895cc10b66f': '8807'     // Ngọc Thụy
};
var TEN_KY_SO = { realtime: 'Realtime', luyke: 'Lũy kế' };

function nhanGoiSo(body) {
  var props = PropertiesService.getScriptProperties();
  var khoa = String(body.khoa || '');
  if (!/^[0-9a-f]{32}$/.test(khoa)) return { ok: false, loi: 'thiếu khoá' };
  var daCo = props.getProperty('KHOA_SO');
  if (!daCo) props.setProperty('KHOA_SO', khoa);
  else if (daCo !== khoa) return { ok: false, loi: 'sai khoá — máy khác đã đăng ký với bot' };
  var cache = CacheService.getScriptCache(), nhan = [];
  (body.goi || []).forEach(function (g) {
    if (!g || !TEN_KY_SO[g.ky] || !g.sieuThi) return;
    var s = JSON.stringify(g);
    if (s.length > 95000) return;            // CacheService chỉ nhận ≤100 KB/khoá
    cache.put('so|' + g.ky, s, SO_GIU_GIAY);
    nhan.push(g.ky);
  });
  return nhan.length ? { ok: true, ky: nhan, giu: '6 giờ' } : { ok: false, loi: 'gói rỗng' };
}

function docGoiSo(ky) {
  try { return JSON.parse(CacheService.getScriptCache().get('so|' + ky) || 'null'); } catch (e) { return null; }
}

function traLoiSo(ev, ky) {
  var goi = docGoiSo(ky);
  if (!goi || !(goi.sieuThi || []).length) {
    replyText(ev.replyToken, 'Chưa có số ' + TEN_KY_SO[ky] + ' (bot chỉ giữ số 6 tiếng).' + NL +
      'Mở app DataSnap → Quét cụm' + (ky === 'luyke' ? ' (chọn Lũy kế hoặc Cả hai)' : '') + ', số tự gửi lên bot.');
    return;
  }
  var ma = NHOM_SIEU_THI[(ev.source || {}).groupId || ''];
  var ds = goi.sieuThi.filter(function (s) { return !ma || s.ma === ma; });
  if (!ds.length) ds = goi.sieuThi;
  replyFlexAnToan(ev.replyToken, dungFlexSo(goi, ds, Date.now()));
}

/* ---------- dựng thẻ ---------- */
var SO_XANH = '#0B5ED7', SO_XAM = '#6B7A90';
function soMau(v) { return v == null ? SO_XAM : v >= 100 ? '#0F9D58' : v >= 80 ? '#E08E0B' : '#D93025'; }
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
function soTr(v) { return v == null ? '—' : soVN(v, Math.abs(v) >= 100 ? 0 : 1); }
function soChu(t, o) {
  var x = { type: 'text', text: (t == null || t === '') ? '—' : String(t) };
  for (var k in (o || {})) x[k] = o[k];
  return x;
}
function soThanh(pct, mau) {
  var w = Math.max(2, Math.min(100, Math.round(pct || 0)));
  return { type: 'box', layout: 'vertical', height: '8px', margin: 'sm', backgroundColor: '#E2E8F0', cornerRadius: '4px',
    contents: [{ type: 'box', layout: 'vertical', width: w + '%', height: '8px', backgroundColor: mau, cornerRadius: '4px', contents: [] }] };
}
function soDong(cot) { return { type: 'box', layout: 'horizontal', margin: 'sm', spacing: 'sm', contents: cot }; }
function soTieuDe(t) { return soChu(t, { size: 'xs', weight: 'bold', color: '#334155', margin: 'lg', wrap: true }); }

// Giờ cập nhật của DMXWork ("20:49:53 3/11/2026") → "20:49 3/11".
function soGio(s) {
  var m = /^(\d{1,2}):(\d\d)(?::\d\d)? (\d{1,2})\/(\d{1,2})/.exec(s || '');
  return m ? m[1] + ':' + m[2] + ' ' + m[3] + '/' + m[4] : (s || '—');
}

function dungFlexSo(goi, ds, bayGio) {
  var rt = goi.ky === 'realtime', luc = Date.parse(goi.luc || '');
  // Cũ: Realtime quá 90 phút; Lũy kế không phải của hôm nay (giờ VN).
  var ngayVN = function (t) { return new Date(t + 7 * 3600e3).toISOString().slice(0, 10); };
  var cu = !isNaN(luc) && (rt ? bayGio - luc > 90 * 60000 : ngayVN(luc) !== ngayVN(bayGio));
  var dung = function () {
    var b = ds.map(function (s) { return rt ? theRealtime(s, cu) : theLuyKe(s, cu); });
    if (b.length === 1) return b[0];
    b.forEach(function (x) { x.size = 'mega'; });   // carousel: cỡ mega như thẻ cũ
    return { type: 'carousel', contents: b };
  };
  var alt = TEN_KY_SO[goi.ky] + ': ' + ds.map(function (s) {
    var t = s.tong || {};
    return s.ten + ' ' + (rt ? soPct(t.ht) + ' target ngày' : soPct(t.duBao != null ? t.duBao : t.ht) + ' dự báo');
  }).join(' · ');
  var msg = { type: 'flex', altText: alt.slice(0, 390), contents: dung() };
  // LINE: bubble ≤30 KB, carousel ≤50 KB — quá thì bớt dòng nhân viên/thi đua.
  for (var lan = 0; lan < 6 && JSON.stringify(msg).length > 45000; lan++) {
    ds = ds.map(function (s) {
      var c = JSON.parse(JSON.stringify(s));
      c.nv = (c.nv || []).slice(0, Math.max(3, (c.nv || []).length - 3));
      c.thiDua = (c.thiDua || []).slice(0, Math.max(5, (c.thiDua || []).length - 4));
      return c;
    });
    msg.contents = dung();
  }
  return msg;
}

function soDau(s, tieuDe, nen, cu) {
  return { type: 'box', layout: 'vertical', backgroundColor: nen, paddingAll: 'lg', contents: [
    soChu('🏬 ' + s.ten, { color: '#FFFFFF', weight: 'bold', size: 'lg', wrap: true }),
    soChu(tieuDe + ' · cập nhật ' + soGio(s.capNhat), { color: '#DCE8FF', size: 'xs', wrap: true }),
    cu ? soChu('⚠ Số đã cũ — quét lại bằng DataSnap', { color: '#FFD7A8', size: 'xs', weight: 'bold', wrap: true }) : null
  ].filter(Boolean) };
}
function soO(nhan, giaTri, mau, canh) {
  return { type: 'box', layout: 'vertical', flex: 1, contents: [
    soChu(nhan, { size: 'xxs', color: SO_XAM, align: canh || 'start' }),
    soChu(giaTri, { size: 'xl', weight: 'bold', color: mau || '#111111', align: canh || 'start' }) ] };
}
function soNhanVien(nv, nhan) {
  if (!nv || !nv.length) return [];
  var ra = [{ type: 'separator', margin: 'lg' }, soTieuDe('👥 ' + nhan)], huy = ['🥇', '🥈', '🥉'];
  nv.forEach(function (n, i) {
    ra.push(soDong([
      soChu((huy[i] || (i + 1) + '.') + ' ' + n.ten, { size: 'xs', flex: 7, wrap: true, color: '#111111', weight: i < 3 ? 'bold' : 'regular' }),
      soChu(soTr(n.dtqd) + ' tr', { size: 'xs', flex: 3, align: 'end', weight: 'bold', color: SO_XANH })
    ]));
    var phu = (n.ng || []).map(function (g) { return g[0] + ' ' + soTr(g[1]); }).join(' · ');
    if (phu) ra.push(soChu(phu, { size: 'xxs', color: SO_XAM, wrap: true }));
  });
  return ra;
}

function theRealtime(s, cu) {
  var t = s.tong || {}, m = soMau(t.ht);
  var gop = (t.traGop != null && t.dtqd) ? t.traGop / t.dtqd * 100 : null;
  var thieu = (t.target != null && t.dtqd != null) ? Math.max(0, t.target - t.dtqd) : null;
  var than = [
    { type: 'box', layout: 'horizontal', contents: [ soO('DTQĐ hôm nay (tr)', soTr(t.dtqd)), soO('% HT target ngày', soPct(t.ht), m, 'end') ] },
    soThanh(t.ht, m),
    soChu('Target ngày ' + soTr(t.target) + ' tr' + (thieu ? ' · còn thiếu ' + soTr(thieu) : ' · ĐÃ ĐẠT') +
      ' · SL ' + soVN(t.sl) + (gop != null ? ' · trả góp ' + soPct(gop) : ''), { size: 'xxs', color: SO_XAM, wrap: true, margin: 'sm' }),
    { type: 'separator', margin: 'lg' }
  ];
  var td = s.thiDua || [];
  if (!td.length) than.push(soTieuDe('🏁 Chưa bán chương trình thi đua nào hôm nay'));
  else {
    var dat = td.filter(function (x) { return x.ht >= 100; }).length;
    than.push(soTieuDe('🏁 Thi đua đã bán hôm nay — ' + dat + '/' + td.length + ' đạt'));
    than.push(soDong([ soChu('Chương trình', { size: 'xxs', flex: 6, color: SO_XAM }),
      soChu('TH / target', { size: 'xxs', flex: 4, align: 'end', color: SO_XAM }),
      soChu('%HT', { size: 'xxs', flex: 3, align: 'end', color: SO_XAM }) ]));
    td.forEach(function (x) {
      than.push(soDong([ soChu(x.ten, { size: 'xs', flex: 6, wrap: true, color: '#111111' }),
        soChu(soTr(x.th) + '/' + soTr(x.target), { size: 'xxs', flex: 4, align: 'end', color: SO_XAM, gravity: 'center' }),
        soChu(soPct(x.ht), { size: 'xs', flex: 3, align: 'end', weight: 'bold', color: soMau(x.ht), gravity: 'center' }) ]));
    });
  }
  than = than.concat(soNhanVien(s.nv, 'Nhân viên — DTQĐ hôm nay'));
  return { type: 'bubble', size: 'giga', header: soDau(s, 'REALTIME', SO_XANH, cu),
    body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: than } };
}

function theLuyKe(s, cu) {
  var t = s.tong || {}, dbao = t.duBao != null ? t.duBao : t.ht, m = soMau(dbao);
  var thieu = (t.target != null && t.dtqd != null) ? Math.max(0, t.target - t.dtqd) : null;
  var than = [
    { type: 'box', layout: 'horizontal', contents: [ soO('DTQĐ tháng (tr)', soTr(t.dtqd)),
      soO('Đã đạt', soPct(t.ht), soMau(t.ht), 'center'), soO('Dự báo tháng', soPct(dbao), m, 'end') ] },
    soThanh(dbao, m),
    soChu('Target ' + soTr(t.target) + ' tr' + (thieu != null ? ' · còn thiếu ' + soTr(thieu) : '') +
      (t.duKienTien != null ? ' · dự kiến ' + soTr(t.duKienTien) + ' tr' : '') +
      (t.tienDo != null ? ' · thời gian đã qua ' + soPct(t.tienDo) : ''), { size: 'xxs', color: SO_XAM, wrap: true, margin: 'sm' }),
    { type: 'separator', margin: 'lg' }
  ];
  var td = s.thiDua || [], chuaCo = s.chuaCo || [];
  var dat = td.filter(function (x) { return (x.duBao != null ? x.duBao : x.ht) >= 100; }).length;
  than.push(soTieuDe('🏁 Thi đua — % HT giảm dần · ' + dat + '/' + (td.length + chuaCo.length) + ' dự báo đạt'));
  than.push(soDong([ soChu('Chương trình', { size: 'xxs', flex: 6, color: SO_XAM }),
    soChu('%HT', { size: 'xxs', flex: 3, align: 'end', color: SO_XAM }),
    soChu('Dự báo', { size: 'xxs', flex: 3, align: 'end', color: SO_XAM }) ]));
  td.forEach(function (x) {
    than.push(soDong([ soChu(x.ten, { size: 'xs', flex: 6, wrap: true, color: '#111111' }),
      soChu(soPct(x.ht), { size: 'xs', flex: 3, align: 'end', color: soMau(x.ht), gravity: 'center' }),
      soChu(soPct(x.duBao), { size: 'xs', flex: 3, align: 'end', weight: 'bold', color: soMau(x.duBao), gravity: 'center' }) ]));
  });
  if (chuaCo.length) {
    var ten = chuaCo.join(' · ');
    than.push(soChu('Chưa có số (' + chuaCo.length + '): ' + (ten.length > 400 ? ten.slice(0, 400) + '…' : ten),
      { size: 'xxs', color: SO_XAM, wrap: true, margin: 'md' }));
  }
  than = than.concat(soNhanVien(s.nv, 'Nhân viên — DTQĐ lũy kế'));
  return { type: 'bubble', size: 'giga', header: soDau(s, 'LŨY KẾ THÁNG', '#0A3D91', cu),
    body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: than } };
}
