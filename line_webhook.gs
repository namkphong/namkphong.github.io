/**
 * line_webhook.gs — Bot LINE, dùng chung cho NHIỀU CỤM. Lệnh: /số, /bc, /bcnv,
 * /sieuthi, /tuan, /dangky.
 * =========================================================================
 * ĐA CỤM: mỗi nhóm LINE gắn với 1 siêu thị của 1 cụm — cụm 14285 tra thẳng
 * GROUP_TO_STORE (cứng, dự phòng, không cần mạng); cụm KHÁC tự đăng ký bằng
 * lệnh /dangky <mã siêu thị>, lưu trên Supabase bảng "dmx_clusters" — xem
 * findStoresByGroup(). Quản lý gõ MÃ siêu thị (715, 396…) — số đứng đầu tên nhóm
 * LINE, dễ nhớ và không sợ sai dấu; gõ tên vẫn nhận. site_code và mã ngắn nội bộ
 * do script tự dò, không bao giờ hiện ra cho họ nên đừng bắt gõ.
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
 *  • /sieuthi → bc/sieuthi_cards.json trên Supabase — BÁO CÁO KINH DOANH của
 *            siêu thị (sieuthi.html): 4 thẻ tiến độ/cùng kỳ + 2 biểu đồ + 2 bảng
 *            thi đua ngành hàng. Ảnh do nv.html tự đẩy ở cuối chuỗi (iframe ẩn);
 *            trang đó cũng có nút đẩy tay khi cần làm lại riêng.
 *
 * Cả nv_personal_cards.json và nv_cards.json do userscript dmx.user.js tự đẩy
 * (window.NVSHARE.buildPersonalAll() / buildAll() trong nv.html) ngay sau khi
 * cào số xong cho từng siêu thị — không cần thao tác tay.
 *
 * ⚠ LINE cho tối đa 5 message mỗi lượt Reply. Reply MIỄN PHÍ; Push thì TỐN
 * QUOTA và tính theo SỐ NGƯỜI trong nhóm — gói miễn phí chỉ 500 tin/tháng.
 * Trước đây quá 5 ảnh là đẩy phần dư bằng Push: siêu thị 9 nhân viên gõ /bc một
 * lần đã tốn ~4 ảnh × ~10 người = ~40 tin. Giờ CHIA TRANG (replyImagesPaged):
 * mỗi lượt tối đa 4 ảnh + 1 dòng nhắc "gõ /bc2 xem tiếp" = vừa đủ 5 message,
 * và lệnh tiếp theo lại là một lượt Reply mới nên KHÔNG tốn gì. push() giữ lại
 * nhưng KHÔNG còn chỗ nào gọi — đừng dùng lại nếu không thật sự cần.
 *
 * CẬP NHẬT KHI SỬA: Deploy → Manage deployments → bút chì → Version: New version → Deploy.
 * (LINE "Verify webhook" báo 302 là bình thường với Apps Script — cứ bật Use webhook.)
 * Script Properties cần: LINE_TOKEN = channel access token.
 */

var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
var SB_KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C'; // khoá publishable công khai — cùng khoá các userscript DMX dùng
var BUCKET = 'bc';
var GH_RAW = 'https://raw.githubusercontent.com/namkphong/namkphong.github.io/main/';

// Nhóm LINE → siêu thị, cho CỤM 14285 — giữ NGUYÊN, không đổi, làm dự phòng
// (tra thẳng, không cần gọi mạng) để không ảnh hưởng bot đang chạy ổn định.
// Cụm KHÁC tự đăng ký qua lệnh /dangky (xem findStoreByGroup) — lưu trên
// Supabase bảng "dmx_clusters", không cần sửa file này mỗi lần thêm cụm.
var GROUP_TO_STORE = {
  'Cd6981bde07d3c222623f363b8f5739bf': { key: '396', mwgCode: '14285', label: '396 Nguyễn Văn Cừ' },
  'Cd16f4cb26203b273afd91895cc10b66f': { key: '142', mwgCode: '8807', label: 'Ngọc Thụy' }
};

// KHO ẢNH — Supabase (hiện tại) hoặc Cloudflare R2 (khi cần mở rộng).
// Supabase gói miễn phí chỉ 5 GB băng thông tải ra/tháng, đã vượt 134% với MỘT
// cụm; R2 không thu tiền băng thông tải ra. Xem cloudflare/HUONG-DAN.md.
// Điền R2_BASE (không có / ở cuối) là chuyển; để trống = chạy Supabase như cũ.
// ⚠ Bật ở đây thì phải bật cả dmx.user.js và dmx-line-publish.user.js, và
//   nhớ DEPLOY LẠI Apps Script (sửa file trong repo không tự chạy).
var R2_BASE = '';   // ví dụ: 'https://dmx-anh.<tên>.workers.dev'

function pub(path) {
  if (R2_BASE) return R2_BASE.replace(/\/+$/, '') + '/' + path;
  return SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + path;
}
function bust(url) { return url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(); }

// Chuỗi chống cache cho ẢNH — khác bust() ở chỗ KHÔNG dùng đồng hồ.
//
// bust() gắn ?t=Date.now() nên MỖI LẦN gõ lệnh là một URL khác nhau: CDN không
// bao giờ dùng lại được, ảnh phải tải thẳng từ Supabase mọi lượt. Đó là lý do
// băng thông vượt trần (6,71/5 GB) trong khi kho ảnh chỉ có 39 MB — cùng mấy
// tấm ảnh bị tải đi tải lại. Một lệnh /bc là 9 ảnh, gõ 5 lần trong ngày là 45
// lượt tải cho đúng 9 tấm ảnh y hệt nhau.
//
// Nay gắn theo NGÀY của ảnh ghi trong manifest: trong ngày URL đứng yên nên CDN
// phục vụ được, sang ngày mới ảnh đổi thì chuỗi cũng đổi nên không ai thấy ảnh
// cũ. Manifest không có ngày thì lùi về đồng hồ, tức đúng như cũ.
function bustAnh(url, phienBan) {
  var v = String(phienBan || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 14);
  if (!v) v = String(Date.now());
  return url + (url.indexOf('?') < 0 ? '?' : '&') + 'v=' + v;
}

// Toàn bộ cấu hình cụm (bảng dmx_clusters — site_code do Quản lý tự đặt trong
// dmx.user.js, config chứa danh sách siêu thị + groupToStore).
function fetchAllClusters() {
  try {
    var url = SB_URL + '/rest/v1/dmx_clusters?select=site_code,config';
    var res = UrlFetchApp.fetch(url, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }, muteHttpExceptions: true });
    if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
  } catch (e) { console.error('fetchAllClusters lỗi: ' + e); }
  return [];
}
function findClusterConfig(siteCode) {
  var rows = fetchAllClusters();
  for (var i = 0; i < rows.length; i++) if (rows[i].site_code === siteCode) return rows[i].config;
  return null;
}
function saveClusterConfig(siteCode, config) {
  UrlFetchApp.fetch(SB_URL + '/rest/v1/dmx_clusters', {
    method: 'post', contentType: 'application/json',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, Prefer: 'resolution=merge-duplicates,return=minimal' },
    payload: JSON.stringify({ site_code: siteCode, config: config, updated_at: new Date().toISOString() }),
    muteHttpExceptions: true
  });
}

// Nhóm LINE → siêu thị: 1) tra bảng cứng cụm 14285 trước (nhanh, khỏi cần
// mạng, không ảnh hưởng bot đang chạy). 2) không thấy thì tra Supabase — cụm
// khác tự /dangky vào đây (xem lệnh /dangky trong handleEvent).
// Tra ve DANH SACH — mot nhom co the gan nhieu sieu thi.
// MOT NHOM CO THE GAN NHIEU SIEU THI. Vd cum 14285 co 2 sieu thi con cung
// chung mot nhom LINE. Tra ca 2 sieu thi trong mot luot la vuot gioi han 5
// message cua Reply va ton quota, nen khi do bat buoc go kem MA sieu thi.
// Ban cu luu groupToStore[groupId] la MOT CHUOI — van doc duoc, coi nhu list 1.
function findStoresByGroup(groupId) {
  if (GROUP_TO_STORE[groupId]) return [GROUP_TO_STORE[groupId]];
  var rows = fetchAllClusters();
  for (var i = 0; i < rows.length; i++) {
    var cfg = rows[i].config;
    var g = cfg && cfg.groupToStore && cfg.groupToStore[groupId];
    if (!g) continue;
    var keys = Array.isArray(g) ? g : [g];
    var out = [];
    for (var k = 0; k < keys.length; k++) {
      var store = (cfg.stores || []).filter(function (s) { return String(s.key) === String(keys[k]); })[0];
      // Mang theo ca mwgCode: mot sieu thi co HAI ma (key ngan noi bo + ma MWG),
      // Quan ly nho ma nao cung phai goi duoc.
      if (store) out.push({ key: store.key, mwgCode: store.mwgCode || '', label: store.name });
    }
    if (out.length) return out;
  }
  return [];
}

// Bỏ dấu, bỏ ký tự đặc biệt, thường hoá — y hệt chuanHoaTen bên các userscript.
// Dùng để so tên/mã lỏng, không phụ thuộc dấu tiếng Việt hay hoa-thường.
function chuanHoaTen(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

// Tìm siêu thị theo TÊN, quét mọi cụm. Quản lý biết tên siêu thị của mình,
// nhưng KHÔNG biết (và không cần biết) site_code hay mã ngắn nội bộ — cả bộ
// script giờ tự dò hết, không bao giờ hiện 2 thứ đó ra cho họ nữa.
// Xuong dong trong tin nhan LINE. Dat thanh hang de khoi viet ky tu thoat
// lap di lap lai trong cac chuoi ghep ben duoi.
var NL = String.fromCharCode(10);

// Goi y ten GAN GIONG cai vua go. Truoc day cho hien MOI sieu thi cua MOI cum,
// ba cai dở:
//   1. Ro ri cheo cum — nhom LINE nay co ca nhan vien, ho thay ten sieu thi va
//      ma cum cua cum khac, thu ho khong lien quan gi.
//   2. Khong gioi han — cang nhieu cum thi cang thanh buc tuong chu, LINE cat bot.
//   3. Khong tra loi dung cau hoi — nguoi ta can biet "minh go sai cho nao",
//      60 sieu thi la khong giup gi.
// Gio chi hien nhung ten CO CHUNG TU KHOA voi cai ho go, toi da 6 dong, va
// KHONG kem ma cum.
function goiYGanGiong(text) {
  var am = String(text || '').split(/\s+/).map(chuanHoaTen)
    .filter(function (x) { return x.length > 0; });

  // Chi lay am tiet tu 3 chu tro len thi ten tieng Viet nhieu am 2 chu ("Uy No",
  // "Ky Anh", "Ha Dong") bi loc SACH, khong goi y noi gi ke ca khi sieu thi co
  // that trong bang. Nhung ha xuong 2 chu thi "uy" lai dinh ca "Ngoc Thuy".
  // Cach ra: ghep them TUNG CAP am tiet lien nhau ("uyno", "nodong", "donganh")
  // — vua du dai de dac trung, vua khong bo sot ten am ngan.
  var toks = [], i;
  for (i = 0; i < am.length; i++) if (am[i].length >= 3) toks.push(am[i]);
  for (i = 0; i + 1 < am.length; i++) toks.push(am[i] + am[i + 1]);
  if (!toks.length && am.length === 1) toks.push(am[0]);   // go dung 1 am tiet
  if (!toks.length) return [];
  var out = [], rows = fetchAllClusters();
  for (var i = 0; i < rows.length; i++) {
    var cfg = rows[i].config;
    if (!cfg || !cfg.stores) continue;
    // Bo cac hang danh dau khong dung (site_code bat dau bang "zz-").
    if (/^zz-/i.test(rows[i].site_code || '')) continue;
    for (var j = 0; j < cfg.stores.length; j++) {
      var ten = cfg.stores[j].name, n = chuanHoaTen(ten), diem = 0;
      for (var k = 0; k < toks.length; k++) if (n.indexOf(toks[k]) !== -1) diem++;
      if (diem) out.push({ ten: ten, diem: diem });
    }
  }
  out.sort(function (a, b) { return b.diem - a.diem; });
  return out.slice(0, 6).map(function (x) { return x.ten; });
}

// Chi dem, khong liet ke. Du de phan biet "he thong trong tron" voi "co roi
// nhung khong cai nao giong", ma khong lo ten cua cum khac ra.
function demSieuThi() {
  var n = 0, rows = fetchAllClusters();
  for (var i = 0; i < rows.length; i++) {
    var cfg = rows[i].config;
    if (!cfg || !cfg.stores) continue;
    if (/^zz-/i.test(rows[i].site_code || '')) continue;
    n += cfg.stores.length;
  }
  return n;
}

function findStoresByName(text) {
  var t = chuanHoaTen(text);
  if (!t || t.length < 2) return [];
  var out = [], rows = fetchAllClusters();
  for (var i = 0; i < rows.length; i++) {
    var cfg = rows[i].config;
    if (!cfg || !cfg.stores) continue;
    for (var j = 0; j < cfg.stores.length; j++) {
      var s = cfg.stores[j], n = chuanHoaTen(s.name);
      if (n && (n.indexOf(t) !== -1 || t.indexOf(n) !== -1)) {
        out.push({ siteCode: rows[i].site_code, config: cfg, store: s });
      }
    }
  }
  return out;
}

// Tim sieu thi theo MA (715, 396, 14285...). Ten nhom LINE gan nhu luon mo dau
// bang ma sieu thi ("715 UY NO...", "396 Nguyen Van Cu"), nen Quan ly nho ma de
// hon nho ten viet dung dau. Go ten van chay nhu cu; day chi la duong THU HAI.
//
// Lay MOI cum so trong cau go roi so KHIT voi key va mwgCode — khong so "chua
// nhau", vi "715" ma chua trong "14715" thi gan nham sieu thi khac.
function findStoresByCode(text) {
  var so = String(text || '').match(/\d+/g);
  if (!so || !so.length) return [];
  var out = [], rows = fetchAllClusters();
  for (var i = 0; i < rows.length; i++) {
    var cfg = rows[i].config;
    if (!cfg || !cfg.stores) continue;
    if (/^zz-/i.test(rows[i].site_code || '')) continue;
    for (var j = 0; j < cfg.stores.length; j++) {
      var s = cfg.stores[j];
      for (var k = 0; k < so.length; k++) {
        if (String(s.key) === so[k] || String(s.mwgCode) === so[k]) {
          out.push({ siteCode: rows[i].site_code, config: cfg, store: s });
          k = so.length;                      // moi sieu thi chi vao danh sach 1 lan
        }
      }
    }
  }
  return out;
}

// Dạng CŨ vẫn nhận: "<mã cụm> <mã siêu thị>". Mã cụm hay có DẤU CÁCH
// ("Cụm 14285" — do tự dò từ ô chọn cụm bên BI), nên KHÔNG tách bằng khoảng
// trắng đầu tiên được: lấy từ CUỐI làm mã siêu thị, phần còn lại là mã cụm.
// So khớp theo dạng chuẩn hoá vì lệnh chat đã bị hạ hết thành chữ thường.
function timTheoMaCu(arg) {
  var toks = arg.split(/\s+/);
  if (toks.length < 2) return null;
  var storeKey = toks[toks.length - 1];
  var siteCode = toks.slice(0, -1).join(' ');
  var rows = fetchAllClusters();
  for (var i = 0; i < rows.length; i++) {
    if (chuanHoaTen(rows[i].site_code) !== chuanHoaTen(siteCode)) continue;
    var cfg = rows[i].config, stores = (cfg && cfg.stores) || [];
    for (var j = 0; j < stores.length; j++) {
      if (chuanHoaTen(stores[j].key) === chuanHoaTen(storeKey)) {
        return { siteCode: rows[i].site_code, config: cfg, store: stores[j] };
      }
    }
  }
  return null;
}

// Mô tả một siêu thị trong danh sách trả lời, MÃ MWG đứng trước.
// Lý do giống dongChonSieuThi(): Quản lý gọi lệnh bằng mã MWG, không ai nhớ
// key nội bộ. store có thể là null (key lạc trong groupToStore) — vẫn phải in ra.
function moTaSieuThi(store, key) {
  if (!store) return '• ' + key + '  (không còn trong cụm)';
  var chinh = store.mwgCode ? store.mwgCode : store.key;
  var phu = (store.mwgCode && String(store.mwgCode) !== String(store.key)) ? ', nội bộ ' + store.key : '';
  return '• ' + store.name + '  (mã ' + chinh + phu + ')';
}

// Mã -> siêu thị, NHƯNG chỉ tìm trong cụm mà nhóm này đang thuộc về.
// Trả [] nếu nhóm chưa thuộc cụm nào, hoặc cụm đó không có mã này.
function timTrongCumCuaNhom(groupId, ma) {
  if (!groupId) return [];
  var t = chuanHoaTen(ma);
  var rows = fetchAllClusters();
  for (var i = 0; i < rows.length; i++) {
    var cfg = rows[i].config;
    if (!cfg || !cfg.groupToStore || !cfg.groupToStore[groupId]) continue;
    var kq = (cfg.stores || []).filter(function (s2) {
      return chuanHoaTen(s2.key) === t || (s2.mwgCode && chuanHoaTen(s2.mwgCode) === t);
    });
    return kq.map(function (s2) {
      return { siteCode: rows[i].site_code, config: cfg, store: s2 };
    });
  }
  return [];
}

// GAN THEM, khong ghi de: nhom dung chung cho 2 sieu thi thi go /dangky hai lan.
// Giu dang CHUOI khi chi co 1 sieu thi de ban script cu van doc duoc.
function ganNhomVaoSieuThi(ev, groupId, hit) {
  var cfg = hit.config;
  cfg.groupToStore = cfg.groupToStore || {};
  var g = cfg.groupToStore[groupId];
  var keys = g ? (Array.isArray(g) ? g.slice() : [g]) : [];
  if (keys.map(String).indexOf(String(hit.store.key)) === -1) keys.push(hit.store.key);
  cfg.groupToStore[groupId] = (keys.length === 1) ? keys[0] : keys;
  saveClusterConfig(hit.siteCode, cfg);

  var msg = '✅ Đã gắn nhóm này với "' + hit.store.name + '".' + NL;
  if (keys.length > 1) {
    var ten = keys.map(function (k) {
      var s = (cfg.stores || []).filter(function (x) { return String(x.key) === String(k); })[0];
      return moTaSieuThi(s, k);
    });
    msg += NL + 'Nhóm này giờ có ' + keys.length + ' siêu thị:' + NL + ten.join(NL) + NL + NL +
      'Vì có nhiều siêu thị nên xem báo cáo phải KÈM MÃ:' + NL +
      '   /số ' + keys[0] + NL + '   /bc ' + keys[0] + NL + '   /bcnv ' + keys[0];
  } else {
    msg += 'Thử ngay: /số · /bc · /bcnv · /sieuthi · /tuan' + NL + NL +
      '(Nhóm dùng chung cho siêu thị thứ hai thì gõ /dangky <mã> lần nữa.)';
  }
  replyText(ev.replyToken, msg);
}

// Đọc JSON (thêm ?t= để tránh cache CDN). Trả object hoặc null.
// Dau thoi gian ISO co phai HOM NAY (gio Viet Nam) khong. Khong co dau thoi
// gian thi tra false — an toan hon la doan bua rang anh con moi.
function laHomNay(iso) {
  if (!iso) return false;
  var t = Date.parse(iso);
  if (!t) return false;
  var tz = 'Asia/Ho_Chi_Minh';
  return Utilities.formatDate(new Date(t), tz, 'yyyy-MM-dd') ===
         Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
}

function readJson(url) {
  try {
    var res = UrlFetchApp.fetch(bust(url), { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
  } catch (e) { console.error('readJson lỗi (' + url + '): ' + e); }
  return null;
}

// Dấu phiên bản của CHÍNH file này. Apps Script không tự cập nhật theo repo —
// phải Deploy tay, và trước giờ không có cách nào kiểm bản đang chạy ngoài việc
// gõ lệnh thật trong nhóm LINE. Sửa file thì TĂNG số này, rồi sau khi Deploy mở
// URL /exec là biết ngay đã ăn bản mới hay chưa.
var BOT_VER = '2026-09-05.1-bat-buoc-dau-gach';

function doGet() {
  return ContentService.createTextOutput(
    'OK — bot đa cụm (/số /bc /bcnv /sieuthi /tuan /dangky /gonhom) đang chạy. Bản: ' + BOT_VER);
}

function doPost(e) {
  try { (JSON.parse(e.postData.contents).events || []).forEach(handleEvent); }
  catch (err) { console.error('doPost lỗi: ' + err); }
  return ContentService.createTextOutput('OK');
}

function handleEvent(ev) {
  if (!ev || ev.type !== 'message' || !ev.message || ev.message.type !== 'text' || !ev.replyToken) return;
  // BẮT BUỘC CÓ DẤU / ĐẦU CÂU.
  //
  // Trước đây dấu / bị cắt bỏ trước khi so, nên "/số" và "số" đều chạy như
  // nhau. Trong nhóm LINE người ta nhắn nhau bình thường — ai gõ "số 5263" hay
  // "bc" giữa câu chuyện là bot nhảy vào trả ảnh. Nay không có / thì bot im,
  // đúng như mọi bot lệnh khác.
  var raw = (ev.message.text || '').normalize('NFC').trim();
  if (raw.charAt(0) !== '/') return;
  var cmd = raw.slice(1).trim().toLowerCase();
  var groupId = (ev.source && (ev.source.groupId || ev.source.roomId)) || null;

  if (cmd === 'help' || cmd === 'trợ giúp' || cmd === 'tro giup') {
    replyText(ev.replyToken,
      'Lệnh:\n' +
      '• /số — ảnh doanh thu quy đổi + ảnh ngành hàng/doanh thu tổng realtime (nếu có).\n' +
      '• /bc — Trang Cá Nhân từng nhân viên (thẻ mục tiêu + thẻ NV + xu hướng).\n' +
      '• /bcnv — báo cáo nhân viên theo thứ hạng + thi đua ngành hàng.\n' +
      '• /sieuthi — BÁO CÁO KINH DOANH của siêu thị: tiến độ tháng, so cùng kỳ, thi đua ngành hàng.\n' +
      '• /tuan — Mục Tiêu Tuần (AI) từng nhân viên: ảnh tiến độ + nhận xét tuần tới.\n' +
      '• /dangky <mã siêu thị> — gắn nhóm này với siêu thị của bạn (làm 1 lần cho mỗi nhóm).\n\n' +
      'Nhóm gắn NHIỀU siêu thị thì gõ kèm mã: /số 14285 · /bc 8807 · /bcnv 14285\n' +
      'Nhiều ảnh quá thì bot chia trang — gõ /bc2, /bc3… để xem tiếp.');
    return;
  }

  // /gonhom <mã> — GỠ một siêu thị khỏi nhóm này. Đối trọng của /dangky.
  //
  // /dangky chỉ CỘNG THÊM, không bao giờ gỡ, và trước đây không có lệnh nào gỡ
  // được. Gõ nhầm một lần là nhóm mắc kẹt vĩnh viễn: có từ 2 siêu thị trở lên
  // thì /số trần không trả ảnh nữa mà hỏi lại mã — người dùng đọc thành "bot
  // hỏng". Ngày 04/09/2026 có 6 cụm đang mắc đúng như vậy (5263, 1902, 1122,
  // 1644, 5285, 10129).
  //
  // Chỉ gỡ được siêu thị của CHÍNH nhóm này, và phải đứng TRONG nhóm đó — Quản
  // lý mới biết nhóm nào của siêu thị nào, bot thì không. Đó cũng là lý do
  // không tự động dọn giúp: đoán sai là nhóm này xem số của siêu thị khác.
  var mGoNhom = /^(?:go ?nhom|gỡ ?nhóm|huy ?dang ?ky|huỷ ?đăng ?ký|huy ?đăng ?ký)\b\s*(.*)$/i.exec(cmd);
  if (mGoNhom) {
    if (!groupId) { replyText(ev.replyToken, 'Lệnh này chỉ dùng trong NHÓM.'); return; }
    var rowsG = fetchAllClusters(), cumG = null;
    for (var iG = 0; iG < rowsG.length; iG++) {
      var cfgG = rowsG[iG].config;
      if (cfgG && cfgG.groupToStore && cfgG.groupToStore[groupId]) { cumG = rowsG[iG]; break; }
    }
    if (!cumG) {
      replyText(ev.replyToken, 'Nhóm này chưa gắn siêu thị nào nên không có gì để gỡ.' + NL +
        'Muốn gắn thì gõ:  /dangky <mã siêu thị>');
      return;
    }
    var cfg2 = cumG.config;
    var gCur = cfg2.groupToStore[groupId];
    var dsKey = Array.isArray(gCur) ? gCur.slice() : [gCur];
    var stCua = function (k) {
      return (cfg2.stores || []).filter(function (x) { return String(x.key) === String(k); })[0] || null;
    };
    var tenCua = function (k) { var q = stCua(k); return q ? q.name : String(k); };
    var moTa = function (k) { return moTaSieuThi(stCua(k), k); };
    var argG = (mGoNhom[1] || '').trim();
    if (!argG) {
      replyText(ev.replyToken,
        'Nhóm này đang gắn ' + dsKey.length + ' siêu thị:' + NL +
        dsKey.map(function (k) { return moTa(k); }).join(NL) + NL + NL +
        'Gỡ bớt bằng:  /gonhom <mã>' + NL +
        'Ví dụ:  /gonhom ' + (function () { var q = stCua(dsKey[dsKey.length - 1]); return q && q.mwgCode ? q.mwgCode : dsKey[dsKey.length - 1]; })() + NL + NL +
        'Để lại ĐÚNG MỘT siêu thị thì /số · /bc · /bcnv gõ trần là ra ảnh luôn, khỏi kèm mã.');
      return;
    }
    var tG = chuanHoaTen(argG);
    var conLai = dsKey.filter(function (k) {
      var st4 = (cfg2.stores || []).filter(function (x) { return String(x.key) === String(k); })[0];
      return !(chuanHoaTen(k) === tG || (st4 && st4.mwgCode && chuanHoaTen(st4.mwgCode) === tG));
    });
    if (conLai.length === dsKey.length) {
      replyText(ev.replyToken, 'Nhóm này không gắn siêu thị nào mang mã "' + argG + '".' + NL + NL +
        'Đang gắn:' + NL + dsKey.map(function (k) { return moTa(k); }).join(NL));
      return;
    }
    // Không cho gỡ hết: nhóm trống thì mọi lệnh đều báo "chưa gắn siêu thị",
    // mà gắn lại phải nhớ mã — dễ thành hỏng nặng hơn lúc đầu.
    if (!conLai.length) {
      replyText(ev.replyToken, 'Không gỡ được siêu thị CUỐI CÙNG — nhóm trống thì mọi lệnh đều ngừng chạy.' + NL +
        'Muốn đổi sang siêu thị khác thì gõ /dangky <mã mới> trước, rồi mới /gonhom mã cũ.');
      return;
    }
    var daGo = dsKey.filter(function (k) { return conLai.indexOf(k) === -1; });
    cfg2.groupToStore[groupId] = (conLai.length === 1) ? conLai[0] : conLai;
    saveClusterConfig(cumG.site_code, cfg2);
    replyText(ev.replyToken,
      '✅ Đã gỡ ' + daGo.map(tenCua).join(', ') + ' khỏi nhóm này.' + NL + NL +
      'Còn lại:' + NL + conLai.map(function (k) { return moTa(k); }).join(NL) + NL + NL +
      (conLai.length === 1
        ? 'Giờ gõ /số · /bc · /bcnv trần là ra ảnh luôn, khỏi kèm mã.'
        : 'Vẫn còn nhiều siêu thị nên xem báo cáo phải kèm mã, vd /số ' + conLai[0] + '.'));
    return;
  }

  // /dangky — TỰ GẮN nhóm LINE này với 1 siêu thị của cụm (site_code đặt trong
  // dmx.user.js). Dùng cho cụm KHÁC cụm 14285 — khỏi phải sửa GROUP_TO_STORE
  // trong file này mỗi lần thêm quản lý mới. Chạy được ngay cả khi nhóm CHƯA
  // đăng ký (không gọi chonSieuThiChoLenh).
  var mDangKy = /^(?:dang ?ky|đăng ?ký)\b\s*(.*)$/i.exec(cmd);
  if (mDangKy) {
    if (!groupId) { replyText(ev.replyToken, 'Lệnh này chỉ dùng trong NHÓM.'); return; }
    var arg = (mDangKy[1] || '').trim();
    if (!arg) {
      replyText(ev.replyToken,
        'Gắn nhóm này với siêu thị của bạn — gõ:\n' +
        '   /dangky <mã siêu thị>\n\n' +
        'Ví dụ:  /dangky 715\n\n' +
        'Mã siêu thị là SỐ ĐỨNG ĐẦU tên nhóm này.\n' +
        'Gõ tên cũng được (vd /dangky Ngọc Thụy) nhưng mã thì chắc hơn.\n' +
        'Chỉ làm 1 lần cho mỗi nhóm.');
      return;
    }
    // Tra theo MÃ trước: "715" đặc trưng hơn tên, và tên nhóm LINE gần như luôn
    // mở đầu bằng mã nên Quản lý gõ mã là chắc ăn nhất.
    // Nhóm ĐÃ thuộc một cụm thì tra MÃ TRONG CỤM ĐÓ TRƯỚC.
    //
    // findStoresByCode() quét MỌI cụm, nên một hàng rác cũ còn sót lại là che mất
    // cụm thật: hàng "zz-bo-khong-dung" giữ nguyên mã 14285 và 8807 của cụm
    // 14285, khiến /dangky 8807 báo "mã khớp 2 siêu thị" và không gắn được gì.
    // Nhóm này đang ở cụm nào thì mã gõ vào gần như chắc chắn là của cụm đó —
    // tra trong nhà trước là hết nhập nhằng, mà không phải xóa dữ liệu của ai.
    var hitsMa = timTrongCumCuaNhom(groupId, arg);
    if (!hitsMa.length) hitsMa = findStoresByCode(arg);
    if (hitsMa.length === 1) { ganNhomVaoSieuThi(ev, groupId, hitsMa[0]); return; }
    if (hitsMa.length > 1) {
      replyText(ev.replyToken,
        'Mã này khớp ' + hitsMa.length + ' siêu thị:' + NL +
        hitsMa.map(function (h) { return '• ' + h.store.name + '  (mã ' + h.store.key + ')'; }).join(NL) +
        NL + NL + 'Gõ TÊN siêu thị thay vì mã:  /dangky <tên siêu thị>');
      return;
    }

    var hits = findStoresByName(arg);
    if (hits.length === 1) { ganNhomVaoSieuThi(ev, groupId, hits[0]); return; }
    if (hits.length > 1) {
      // Trùng tên giữa các cụm — KHÔNG tự chọn, vì chọn nhầm là nhóm này xem số
      // của cụm người khác. Bắt gõ rõ thêm mã cụm.
      replyText(ev.replyToken,
        'Có ' + hits.length + ' siêu thị trùng tên:\n' +
        hits.map(function (h) { return '• ' + h.store.name + '  (cụm ' + h.siteCode + ')'; }).join('\n') +
        '\n\nGõ rõ hơn:  /dangky <mã cụm> ' + hits[0].store.key);
      return;
    }
    var cu = timTheoMaCu(arg);          // vẫn nhận dạng cũ "<mã cụm> <mã siêu thị>"
    if (cu) { ganNhomVaoSieuThi(ev, groupId, cu); return; }
    var goiY = goiYGanGiong(arg);
    var TU_TAO =
      'Cách tự tạo cụm:' + NL +
      '1. Mở namkphong.github.io — mục Hướng Dẫn Lấy Số Hằng Ngày.' + NL +
      '2. Cài công cụ lấy số (2 phút, làm 1 lần).' + NL +
      '3. Mở baocao.dienmayxanh.com, bấm nút 📦 rồi bấm "Chạy cả chuỗi".' + NL +
      'Cụm tự tạo ngay lần chạy đó. Xong quay lại đây gõ /dangky lần nữa.';

    if (goiY.length) {
      replyText(ev.replyToken,
        'Chưa khớp "' + arg + '". Có phải bạn muốn gõ:' + NL +
        goiY.map(function (x) { return '• ' + x; }).join(NL) + NL + NL +
        'Gõ lại đúng một trong các tên trên.' + NL + NL +
        'Nếu siêu thị của bạn KHÔNG nằm trong danh sách này thì cụm chưa được tạo.' +
        NL + TU_TAO);
      return;
    }
    var tong = demSieuThi();
    replyText(ev.replyToken,
      'Không có siêu thị nào tên gần giống "' + arg + '".' + NL + NL +
      (tong
        // Nói cả hai khả năng thay vì đoán một cái. Người có cụm rồi mà gõ lệch
        // quá xa sẽ tự nhận ra ở vế đầu; người chưa có cụm thì làm theo vế sau.
        ? 'Hai khả năng:' + NL +
          '• Gõ sai — thử gõ MÃ siêu thị (số đứng đầu tên nhóm này), vd /dangky 715.' + NL +
          '• Cụm của bạn chưa được tạo.' + NL + NL + TU_TAO
        : 'Hệ thống chưa có cụm nào.' + NL + TU_TAO));
    return;
  }

  // /số — ảnh doanh thu quy đổi, kèm ảnh Realtime tổng cụm (rtUrl) NẾU CÒN MỚI.
  //
  // Ảnh Realtime tổng cụm dựng từ Ô1 (ngành hàng) + Ô2 (doanh thu tổng) của
  // bi.thegioididong.com. Trang đó đã ngừng hoạt động nên từ 30/08/2026 không
  // ai đẩy ảnh này nữa — nhưng file rt_<mã>.jpg cũ VẪN NẰM trong kho và rtUrl
  // vẫn còn trong manifest, nên bot cứ gửi kèm ảnh cũ mèm như thể là số hôm
  // nay. Đó là kiểu sai nguy hiểm nhất: người xem không có cách nào biết.
  // Nay chỉ gửi khi có dấu thời gian rtAt VÀ rtAt là NGÀY HÔM NAY. Bản ghi cũ
  // không có rtAt nên tự biến mất; sau này dựng lại được nguồn Ô1/Ô2 thì writer
  // ghi rtAt và ảnh tự hiện lại, không phải sửa bot lần nữa.
  //
  // CÓ HAI file "bc/latest.json" ở HAI NƠI khác nhau:
  //   · trên GIT  — di sản thời còn đẩy ảnh lên GitHub, CHỈ có cụm 14285;
  //   · trên SUPABASE — do dmx-line-publish.user.js ghi, nơi MỌI cụm đẩy vào.
  // Trước đây chỉ đọc bản trên git để lấy ảnh chính, nên cụm MỚI dù đã có ảnh
  // đầy đủ trên Supabase vẫn bị báo "chưa có ảnh /số" — không bao giờ chạy được.
  // Đã gặp thật với cụm 1359. Giờ: ưu tiên git (giữ nguyên đường đã chạy ổn định
  // cho cụm 14285), KHÔNG có thì lấy bản Supabase.
  var mSo = /^(?:số|so|sô)(?:\s+(.*))?$/.exec(cmd);
  if (mSo) {
    var rSo = chonSieuThiChoLenh(ev, groupId, mSo[1], 'số'); if (!rSo) return;
    var st = rSo.store;
    var man = readJson(GH_RAW + 'bc/latest.json');
    var e = man && man.stores && man.stores[st.key];
    var manRT = readJson(pub('latest.json'));
    var eRT = manRT && manRT.stores && manRT.stores[st.key];

    var chinh = (e && e.url) ? e : ((eRT && eRT.url) ? eRT : null);
    if (!chinh) {
      replyText(ev.replyToken, 'Chưa có ảnh /số cho ' + st.label +
        '.\nChạy Realtime (realtimenv.html → "Đẩy ảnh") rồi gõ lại.');
      return;
    }
    // Truyền cả object để dùng ảnh xem trước nhẹ nếu manifest có sẵn.
    var msgs = [imageToMessage(chinh, chinh.date || chinh.at)];
    if (eRT && eRT.rtUrl && laHomNay(eRT.rtAt)) msgs.push(imageToMessage({ url: eRT.rtUrl }, eRT.rtAt));
    reply(ev.replyToken, msgs);
    return;
  }

  // /bc — Trang Cá Nhân NV (nv.html), 1 ảnh/nhân viên, từ Supabase bc/nv_personal_cards.json
  // Nhận cả "/bc", "/bc2", "/bc 2" — số ở cuối là TRANG (xem replyImagesPaged).
  // CHỐT CHẶN (?![a-zà-ỹđ]): sau tên lệnh KHÔNG được là chữ cái.
  // Thiếu nó thì "bc" nuốt luôn "bcnv" — /bcnv rơi vào nhánh này với đuôi "nv",
  // đuôi đó không phải mã siêu thị cũng không phải số trang nên bị bỏ qua, và
  // nhóm nhận về ảnh /bc thay vì bảng tổng hợp. "bcsieuthi" cũng bị nuốt y vậy.
  // Số và dấu cách vẫn qua được nên /bc2 và /bc 8807 chạy như cũ.
  var mBc = /^(?:bc|trang cá nhân|trang ca nhan|canhan|ca nhan)(?![a-zà-ỹđ])\s*(.*)$/.exec(cmd);
  if (mBc) {
    var rBc = chonSieuThiChoLenh(ev, groupId, mBc[1], 'bc'); if (!rBc) return;
    var st2 = rBc.store;
    var man2 = readJson(pub('nv_personal_cards.json'));
    var e2 = man2 && man2[st2.key];
    if (!e2 || !e2.images || !e2.images.length) { replyText(ev.replyToken, 'Chưa có Trang Cá Nhân /bc cho ' + st2.label + '. Chạy cào số (nv.html) hôm nay trước nhé.'); return; }
    replyImagesPaged(ev.replyToken, e2.images, rBc.trang, 'bc', st2.label, e2.luc || e2.date);
    return;
  }

  // /bcnv — tab Nhập liệu & Phân tích (nv.html): thẻ NV theo thứ hạng + thi đua
  // ngành hàng, từ Supabase bc/nv_cards.json
  var mBcnv = /^(?:bcnv|bc nv|nv|nhanvien|nhan vien|bcnhanvien)(?![a-zà-ỹđ])\s*(.*)$/.exec(cmd);
  if (mBcnv) {
    var rBcnv = chonSieuThiChoLenh(ev, groupId, mBcnv[1], 'bcnv'); if (!rBcnv) return;
    var st3 = rBcnv.store;
    var man3 = readJson(pub('nv_cards.json'));
    var e3 = man3 && man3[st3.key];
    if (!e3 || !e3.images || !e3.images.length) { replyText(ev.replyToken, 'Chưa có báo cáo nhân viên /bcnv cho ' + st3.label + '. Chạy cào số (nv.html) hôm nay trước nhé.'); return; }
    replyImagesPaged(ev.replyToken, e3.images, rBcnv.trang, 'bcnv', st3.label, e3.luc || e3.date);
    return;
  }

  // /sieuthi — BÁO CÁO KINH DOANH của siêu thị (sieuthi.html), 1 ảnh/siêu thị,
  // từ Supabase bc/sieuthi_cards.json. Người đẩy: nút "📤 Đẩy ảnh cho /sieuthi"
  // trên trang sieuthi.html sau khi đã có gói số mới.
  var mSt = /^(?:sieuthi|siêu thị|sieu thi|bcsieuthi)(?![a-zà-ỹđ])\s*(.*)$/.exec(cmd);
  if (mSt) {
    var rSt = chonSieuThiChoLenh(ev, groupId, mSt[1], 'sieuthi'); if (!rSt) return;
    var st5 = rSt.store;
    var man5 = readJson(pub('sieuthi_cards.json'));
    var e5 = man5 && man5[st5.key];
    if (!e5 || !e5.images || !e5.images.length) {
      replyText(ev.replyToken, 'Chưa có báo cáo /sieuthi cho ' + st5.label +
        '.' + NL + 'Mở trang Báo Cáo Siêu Thị rồi bấm "📤 Đẩy ảnh cho /sieuthi".');
      return;
    }
    replyImagesPaged(ev.replyToken, e5.images, rSt.trang, 'sieuthi', st5.label, e5.luc || e5.date);
    return;
  }

  // /tuan — MỤC TIÊU TUẦN (ảnh, gửi nhân viên — không hiện D), từ Supabase bc/nv_stram_week.json.
  // Ưu tiên ảnh (images); nếu manifest cũ chỉ có text thì vẫn trả text (tương thích ngược).
  var mTuan = /^(?:tuan|tuần|stram|tong ket tuan|tổng kết tuần|tuan nay|tuần này)(?![a-zà-ỹđ])\s*(.*)$/.exec(cmd);
  if (mTuan) {
    var rTuan = chonSieuThiChoLenh(ev, groupId, mTuan[1], 'tuan'); if (!rTuan) return;
    var st4 = rTuan.store;
    var man4 = readJson(pub('nv_stram_week.json'));
    var e4 = man4 && man4[st4.key];
    if (e4 && e4.images && e4.images.length) { replyImagesPaged(ev.replyToken, e4.images, rTuan.trang, 'tuan', st4.label, e4.luc || e4.date); return; }
    if (e4 && e4.text) { replyText(ev.replyToken, e4.text); return; }
    replyText(ev.replyToken, 'Chưa có Mục Tiêu Tuần /tuan cho ' + st4.label + '. Chạy cào số (nv.html) trước nhé.');
    return;
  }
  // Lệnh lạ: im lặng.
}

// Doc phan dang sau lenh: co the la MA sieu thi, so TRANG, hoac ca hai.
//   /bc            -> nhom 1 sieu thi: chay luon
//   /bc 14285      -> chi sieu thi 14285
//   /bc2           -> trang 2
//   /bc 14285 2    -> sieu thi 14285, trang 2
// Phan biet ma voi trang bang cach DOI CHIEU VOI DANH SACH sieu thi cua nhom,
// khong doan theo so chu so — ma sieu thi cung la so nen doan la sai.
// Tra {store, trang} hoac null (da tu tra loi nguoi dung).
// Một dòng gợi ý "gõ lệnh này để xem siêu thị kia".
//
// ĐẶT MÃ MWG LÊN TRƯỚC. Một siêu thị có hai mã: key nội bộ ("396", "haiboi")
// và mã MWG ("14285", "1473"). Thực tế Quản lý gọi lệnh bằng MÃ MWG vì đó là số
// đứng đầu tên nhóm LINE — không ai nhớ key nội bộ. Trước đây bot liệt kê key
// trước nên hướng người ta gõ cái họ không dùng. Cả hai mã đều nhận được.
function dongChonSieuThi(baseCmd, x) {
  var chinh = x.mwgCode ? x.mwgCode : x.key;
  var phu = (x.mwgCode && String(x.mwgCode) !== String(x.key)) ? '  (hoặc ' + x.key + ')' : '';
  return '   /' + baseCmd + ' ' + chinh + '   → ' + x.label + phu;
}

function chonSieuThiChoLenh(ev, groupId, phanDuoi, baseCmd) {
  if (!groupId) { replyText(ev.replyToken, 'Lệnh này chỉ dùng trong NHÓM đã gắn siêu thị.'); return null; }
  var ds = findStoresByGroup(groupId);
  if (!ds.length) {
    replyText(ev.replyToken,
      'Nhóm này chưa được gắn siêu thị.' + NL + NL +
      'Gõ:  /dangky <mã siêu thị>' + NL +
      'Ví dụ:  /dangky 715' + NL +
      '(mã siêu thị là số đứng đầu tên nhóm này)');
    return null;
  }

  var toks = String(phanDuoi || '').trim().split(/\s+/).filter(function (x) { return x; });
  var store = null, trang = 0, laDuoc = [];
  for (var i = 0; i < toks.length; i++) {
    var t = chuanHoaTen(toks[i]);
    var kh = ds.filter(function (x) {
      return chuanHoaTen(x.key) === t || (x.mwgCode && chuanHoaTen(x.mwgCode) === t);
    });
    // Mot ma khop TU 2 SIEU THI tro len (key cua cai nay trung mwgCode cua cai
    // kia) — KHONG doan. Lay bua la nhom xem so cua sieu thi khac ma khong biet.
    if (kh.length > 1) {
      replyText(ev.replyToken,
        'Mã "' + toks[i] + '" khớp ' + kh.length + ' siêu thị trong nhóm này:' + NL +
        kh.map(function (x) { return moTaSieuThi({ name: x.label, key: x.key, mwgCode: x.mwgCode }, x.key); }).join(NL) +
        NL + NL + 'Gõ lại bằng mã ở trong ngoặc.');
      return null;
    }
    if (kh.length === 1 && !store) { store = kh[0]; continue; }
    if (/^\d{1,2}$/.test(toks[i]) && !trang) { trang = parseInt(toks[i], 10); continue; }
    laDuoc.push(toks[i]);
  }

  // Mã gõ vào KHÔNG thuộc nhóm này -> PHẢI BÁO, tuyệt đối không bỏ qua.
  //
  // Trước đây token không khớp bị bỏ qua lặng lẽ, rồi xuống dưới gặp
  // "ds.length === 1" là lấy luôn siêu thị duy nhất của nhóm. Kết quả: Quản lý
  // gõ "/số 8807" (mã MWG của Ngọc Thụy) trong nhóm chỉ gắn 396, và nhận về
  // ảnh của 396 NGUYỄN VĂN CỪ như thể đó là số của 8807 — không một lời cảnh báo.
  // Đó là kiểu sai nguy hiểm nhất: người xem không có cách nào biết mình đang đọc
  // số của siêu thị khác. Gặp thật ngày 04/09/2026.
  if (laDuoc.length) {
    var goiYThem = '';
    var ngoai = findStoresByCode(laDuoc[0]);
    if (ngoai.length === 1) {
      goiYThem = NL + NL + '“' + laDuoc[0] + '” là ' + ngoai[0].store.name +
        ', có thật nhưng CHƯA gắn vào nhóm này.' + NL +
        'Muốn xem cả siêu thị đó ở đây thì gõ:  /dangky ' + laDuoc[0] + NL +
        '(gắn thêm rồi thì /số gõ trần sẽ hỏi lại mã, vì nhóm có hai siêu thị.)';
    }
    replyText(ev.replyToken,
      'Nhóm này không có siêu thị mã “' + laDuoc[0] + '”.' + NL + NL +
      'Nhóm đang gắn:' + NL +
      ds.map(function (x) { return dongChonSieuThi(baseCmd, x); }).join(NL) + goiYThem);
    return null;
  }

  if (!store) {
    if (ds.length === 1) { store = ds[0]; }
    else {
      // KHONG tu chon giup: chon nham la nhom xem so cua sieu thi khac.
      replyText(ev.replyToken,
        'Nhóm này có ' + ds.length + ' siêu thị — gõ kèm MÃ siêu thị:' + NL +
        ds.map(function (x) { return dongChonSieuThi(baseCmd, x); }).join(NL));
      return null;
    }
  }
  return { store: store, trang: trang || 1 };
}

// 1 phần tử ảnh (là "url" hoặc {url[,preview]}) -> 1 message ảnh LINE.
// Ảnh thường KHÔNG có bản xem trước riêng -> previewImageUrl trỏ cùng file với
// originalContentUrl. Trước đây gọi bust() HAI LẦN nên ra hai chuỗi ?t= khác
// nhau (Date.now() nhích 1ms), thành hai URL khác nhau -> LINE tải CÙNG MỘT
// tấm ảnh hai lượt, và CDN cũng không dùng lại được. Với ảnh ~900KB thì đó là
// gấp đôi băng thông vô ích. Giờ dùng CHUNG một chuỗi đã bust.
function imageToMessage(im, phienBan) {
  var u = (typeof im === 'string') ? im : im.url;
  var p = (im && im.preview) ? im.preview : null;
  var uB = bustAnh(u, phienBan);
  return { type: 'image', originalContentUrl: uB, previewImageUrl: p ? bustAnh(p, phienBan) : uB };
}

// LINE cho tối đa 5 message mỗi lượt Reply. Reply thì MIỄN PHÍ; Push thì TỐN
// QUOTA và tính theo SỐ NGƯỜI trong nhóm — siêu thị 9 nhân viên gõ /bc một lần
// là đẩy 4 ảnh bằng Push, nhân với ~10 người trong nhóm = ~40 tin, trong khi gói
// miễn phí chỉ có 500 tin/tháng.
//
// Nên CHIA TRANG thay vì Push: mỗi lượt gửi tối đa 4 ảnh + 1 dòng nhắc lệnh xem
// tiếp (vừa đủ 5 message). Người dùng gõ lệnh tiếp theo -> lại là một lượt Reply
// mới -> vẫn miễn phí. Không phải gộp ảnh (thẻ cá nhân đã cao 1880×7052 và nặng
// ~920KB, gộp lại sẽ vượt giới hạn ảnh xem trước 1MB của LINE và đọc không nổi).
var ANH_MOI_TRANG = 4;

function replyImagesPaged(replyToken, images, page, baseCmd, label, phienBan) {
  var total = images.length;
  var thanhTin = function (im) { return imageToMessage(im, phienBan); };
  // Vừa đủ 1 lượt thì gửi hết, khỏi bắt gõ thêm lệnh.
  if (total <= 5 && page <= 1) { reply(replyToken, images.map(thanhTin)); return; }

  var start = (page - 1) * ANH_MOI_TRANG;
  if (start >= total) {
    replyText(replyToken, 'Hết rồi — ' + label + ' chỉ có ' + total + ' ảnh. Gõ /' + baseCmd + ' để xem lại từ đầu.');
    return;
  }
  var phan = images.slice(start, start + ANH_MOI_TRANG);
  var msgs = phan.map(thanhTin);
  var con = total - (start + phan.length);
  if (con > 0) {
    msgs.push({ type: 'text', text: '📄 ' + (start + 1) + '–' + (start + phan.length) + '/' + total +
      '. Còn ' + con + ' ảnh — gõ  /' + baseCmd + (page + 1) + '  để xem tiếp.' });
  }
  reply(replyToken, msgs);
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
