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
// Bảng cụm đổi rất hiếm (gắn nhóm, thêm siêu thị) mà lệnh nào cũng tra — nên
// NHỚ 10 PHÚT trong CacheService, và xoá ngay khi chính bot ghi bảng
// (saveClusterConfig). Cache hỏng/không có thì cứ đọc thẳng như cũ.
var KHOA_CUM = 'dmx_clusters_v1';
function fetchAllClusters() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) { cache = null; }
  if (cache) {
    try { var nho = cache.get(KHOA_CUM); if (nho) return JSON.parse(nho); } catch (e) {}
  }
  try {
    var url = SB_URL + '/rest/v1/dmx_clusters?select=site_code,config';
    var res = UrlFetchApp.fetch(url, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }, muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      var txt = res.getContentText();
      if (cache && txt.length < 90000) { try { cache.put(KHOA_CUM, txt, 600); } catch (e) {} }
      return JSON.parse(txt);
    }
  } catch (e) { console.error('fetchAllClusters lỗi: ' + e); }
  return [];
}
function findClusterConfig(siteCode) {
  var rows = fetchAllClusters();
  for (var i = 0; i < rows.length; i++) if (rows[i].site_code === siteCode) return rows[i].config;
  return null;
}
function saveClusterConfig(siteCode, config) {
  try { CacheService.getScriptCache().remove(KHOA_CUM); } catch (e) {}   // bảng sắp đổi
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

/* ĐỌC NHIỀU JSON MỘT LƯỢT (song song). UrlFetchApp.fetch chờ xong cái này mới
 * gọi cái kia; /tonghop từng đọc 5 thứ nối đuôi nhau (hai manifest ~260 KB,
 * bảng cụm, hai gói số) nên nhóm phải chờ lâu mới thấy thẻ (18/09/2026: "trả
 * về rồi, muộn thôi"). fetchAll bắn cùng lúc, tổng thời gian ≈ cái chậm nhất.
 * Trả mảng cùng thứ tự; cái nào hỏng thì null, không làm hỏng cái khác. */
function docNhieuJson(urls) {
  try {
    var res = UrlFetchApp.fetchAll(urls.map(function (u) {
      return { url: bust(u), muteHttpExceptions: true };
    }));
    return res.map(function (r, i) {
      try { return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : null; }
      catch (e) { console.error('docNhieuJson hỏng (' + urls[i] + '): ' + e); return null; }
    });
  } catch (e) {
    console.error('docNhieuJson lỗi, đọc lần lượt: ' + e);
    return urls.map(readJson);
  }
}

// Dấu phiên bản của CHÍNH file này. Apps Script không tự cập nhật theo repo —
// phải Deploy tay, và trước giờ không có cách nào kiểm bản đang chạy ngoài việc
// gõ lệnh thật trong nhóm LINE. Sửa file thì TĂNG số này, rồi sau khi Deploy mở
// URL /exec là biết ngay đã ăn bản mới hay chưa.
var BOT_VER = '2026-09-19.1-tonghop-moi-ngay';

function doGet() {
  return ContentService.createTextOutput(
    'OK — bot đa cụm (/số /tomtat /tonghop /nv /bc /bcnv /sieuthi /tuan /dangky /gonhom) đang chạy. Bản: ' + BOT_VER);
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
      '• /tomtat — thẻ tóm tắt số realtime (nhẹ, có nút bấm xem ảnh /số, /bcnv).\n' +
      '• /tonghop — thẻ tổng hợp nhân viên: xếp hạng tiến độ + từng người (mục tiêu hôm nay, nhiệm vụ).\n' +
      '• /nv <mã siêu thị> <mã nhân viên> — chỉ MỘT ảnh trang cá nhân của người đó.\n' +
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

  // /nv <mã siêu thị> <mã nhân viên> — TRẢ ĐÚNG MỘT ảnh trang cá nhân của
  // người đó. Nút trên thẻ /tonghop gọi thẳng lệnh này, khỏi bắt cả nhóm tải 9
  // ảnh rồi tự tìm.
  //
  // PHẢI ĐẶT TRƯỚC NHÁNH /bcnv: "nv" vốn đã là tên gọi tắt của /bcnv. Bản đầu
  // đặt xuống dưới nên không bao giờ chạy tới — gõ "/nv 8807 155467" thì /bcnv
  // tóm lấy, đem 155467 đi tra MÃ SIÊU THỊ rồi báo "nhóm này không có siêu thị
  // mã 155467" (gặp thật trong nhóm 142NT chiều 16/09/2026).
  //
  // Và chỉ NHẬN lệnh khi trong câu có mã nhân viên; không có thì nhường xuống
  // cho /bcnv chạy y như trước, khỏi cướp lệnh của người đang quen gõ /nv.
  //
  // Vì sao đi theo MÃ NHÂN VIÊN chứ không theo vị trí: ảnh dựng theo thứ tự
  // results của nv.html, còn bảng tóm tắt xếp theo tiến độ giảm dần — hai thứ
  // tự khác nhau (396 hôm nay: Đức là ảnh 2, Mai Hạnh là ảnh 1). nv.html gắn
  // sẵn số thứ tự ảnh vào từng người (trường "anh"); thiếu trường đó thì NÓI RA
  // chứ tuyệt đối không đoán theo vị trí, gửi nhầm ảnh người khác là kiểu sai
  // không ai phát hiện được.
  var mNv = /^(?:nv|nhanvien|nhân viên|nhan vien)(?![a-zà-ỹđ])\s*(.*)$/.exec(cmd);
  var toksNv = [], maNV = '';
  if (mNv && groupId) {
    toksNv = String(mNv[1] || '').trim().split(/\s+/).filter(function (x) { return x; });
    // Mã siêu thị của chính nhóm này KHÔNG phải mã nhân viên: "/nv 8807" là gọi
    // bảng xếp hạng như cũ, không phải gọi người mang mã 8807.
    var dsNhomNv = findStoresByGroup(groupId) || [];
    var laMaSieuThi = function (t) {
      for (var z = 0; z < dsNhomNv.length; z++) {
        if (String(dsNhomNv[z].key) === t || String(dsNhomNv[z].mwgCode || '') === t) return true;
      }
      return false;
    };
    for (var iNv = toksNv.length - 1; iNv >= 0; iNv--) {
      if (/^\d{3,}$/.test(toksNv[iNv]) && !laMaSieuThi(toksNv[iNv])) {
        maNV = toksNv[iNv]; toksNv.splice(iNv, 1); break;
      }
    }
  }
  if (maNV) {
    var rNv = chonSieuThiChoLenh(ev, groupId, toksNv.join(' '), 'nv'); if (!rNv) return;
    var stN = rNv.store;
    var manN = readJson(pub('nv_personal_cards.json'));
    var eN = manN && manN[stN.key];
    if (!eN || !eN.tomTat || !eN.tomTat.nv || !eN.images || !eN.images.length) {
      replyText(ev.replyToken, 'Chưa có ảnh trang cá nhân cho ' + stN.label + '.' + NL +
        'Chạy chuỗi đẩy ảnh trên nv.html, nhớ tích "kèm /bc".');
      return;
    }
    var dsNv = eN.tomTat.nv, timNv = null;
    dsNv.forEach(function (n) { if (!timNv && String(n.ma) === String(maNV)) timNv = n; });
    if (!timNv) {
      // Sai mã: bày danh sách để bấm tiếp, đừng đoán bừa một người.
      replyText(ev.replyToken,
        'Không thấy mã nhân viên "' + maNV + '" ở ' + stN.label + '.' + NL + NL +
        dsNv.map(function (n) {
          return '   /nv ' + (stN.mwgCode || stN.key) + ' ' + n.ma + '   → ' + n.ten;
        }).join(NL));
      return;
    }
    if (!timNv.anh || !eN.images[timNv.anh - 1]) {
      replyText(ev.replyToken, 'Bảng số của ' + stN.label + ' chưa ghi ảnh riêng cho từng người ' +
        '(bản nv.html cũ).' + NL + 'Chạy lại chuỗi đẩy ảnh một lượt là có.' + NL +
        'Tạm thời gõ  /bc ' + (stN.mwgCode || stN.key) + '  để xem cả bộ.');
      return;
    }
    reply(ev.replyToken, [
      { type: 'text', text: '👤 ' + timNv.ten + ' · ' + stN.label +
        (timNv.trangThai ? NL + timNv.trangThai : '') },
      imageToMessage(eN.images[timNv.anh - 1], eN.luc || eN.date)
    ]);
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
  // /tomtat (/tt) — THẺ FLEX tóm tắt số realtime. Đọc đúng gói rt_thidua_cum*.json
  // mà trang realtime.html dùng, nên số khớp ảnh /số. Xem dungFlexTomTat.
  var mTt = /^(?:tomtat|tóm tắt|tom tat|tt)(?![a-zà-ỹđ])\s*(.*)$/.exec(cmd);
  if (mTt) {
    var rTt = chonSieuThiChoLenh(ev, groupId, mTt[1], 'tomtat'); if (!rTt) return;
    var stT = rTt.store;
    var site = siteCuaSieuThi(stT.key, groupId);
    if (!site) { replyText(ev.replyToken, 'Không tìm được cụm của ' + stT.label + '.'); return; }
    var goiT = readJson(pub('rt_thidua_cum' + String(site).replace(/\D/g, '') + '.json'));
    if (!goiT) {
      replyText(ev.replyToken, 'Chưa có số realtime cho ' + stT.label + '.' + NL +
        'Công cụ Realtime cần chạy ít nhất một cữ hôm nay.');
      return;
    }
    var the = dungFlexTomTat(goiT, stT, stT.mwgCode || stT.key, Date.now());
    if (!the) { replyText(ev.replyToken, 'Gói số chưa có ' + stT.label + '.'); return; }
    replyFlexAnToan(ev.replyToken, the);
    return;
  }

  // /tonghop (/th) — LỆNH RIÊNG cho thẻ Flex TỔNG HỢP nhân viên: gộp thông tin của
  // /bcnv (bảng xếp hạng) và /bc (trang cá nhân) vào một băng thẻ trượt ngang.
  // Theo yêu cầu 15/09/2026: không gắn thẻ vào /bcnv, /bc nữa — hai lệnh đó trả
  // ảnh như cũ. Số đọc từ manifest.tomTat do nv.html ghi cùng lúc đẩy ảnh.
  var mTh = /^(?:tonghop|tổng hợp|tong hop|th)(?![a-zà-ỹđ])\s*(.*)$/.exec(cmd);
  if (mTh) {
    var rTh = chonSieuThiChoLenh(ev, groupId, mTh[1], 'tonghop'); if (!rTh) return;
    var stH = rTh.store;
    // Lấy bản MỚI HƠN giữa hai manifest: /bc chỉ đẩy khi tích "kèm /bc", nên có
    // ngày bản /bcnv mới hơn. Cả hai cùng mang tomTat đầy đủ.
    var haiMf = docNhieuJson([pub('nv_personal_cards.json'), pub('nv_cards.json')]);
    var mA = haiMf[0], mB = haiMf[1];
    var eA = mA && mA[stH.key], eB = mB && mB[stH.key];
    var ds = [eA, eB].filter(function (x) { return x && x.tomTat && x.tomTat.nv && x.tomTat.nv.length; })
      .sort(function (a, b) { return String(b.luc || '').localeCompare(String(a.luc || '')); });
    if (!ds.length) {
      replyText(ev.replyToken, 'Chưa có số tổng hợp cho ' + stH.label + '.' + NL +
        'Chạy lại chuỗi đẩy ảnh trên nv.html một lượt (bản mới ghi kèm bảng số).');
      return;
    }
    // Số siêu thị: ưu tiên gói của CÔNG CỤ THU SỐ, xem nenSoSieuThi.
    var hnTH = null;
    try { hnTH = nenSoSieuThi(stH, groupId); }
    catch (eTH) { console.error('/tonghop đọc nền số lỗi: ' + eTH); }
    var theTH = dungFlexTongHop(ds[0], stH, Date.now(), hnTH);
    replyFlexAnToan(ev.replyToken, theTH);
    return;
  }


  // Lệnh lạ: im lặng.
}

/* Mã cụm (site_code) của một siêu thị — tên gói số đặt theo cụm.
 *
 * KHÔNG lấy cụm đầu tiên có siêu thị đó. Bảng dmx_clusters còn dòng rác
 * "zz-bo-khong-dung" chứa y hệt 396, 142 và đứng TRƯỚC "Cụm 14285"; lấy nhầm nó
 * thì mã cụm rỗng, bot đi đọc "rt_thidua_cum.json" không tồn tại và báo "chưa có
 * số" dù số vẫn nằm đó. Chạy thử lệnh trong hộp cát mới lộ.
 *
 * Nên: ưu tiên cụm mà CHÍNH NHÓM LINE NÀY đang gắn vào (groupToStore); không
 * có thì mới lấy cụm có siêu thị đó, bỏ qua dòng "zz-" và dòng không có số. */
function siteCuaSieuThi(key, groupId) {
  var rows = fetchAllClusters();
  var coKey = function (cfg) {
    return ((cfg && cfg.stores) || []).some(function (x) { return String(x.key) === String(key); });
  };
  for (var i = 0; i < rows.length; i++) {
    var cfg = rows[i].config, g = cfg && cfg.groupToStore && groupId && cfg.groupToStore[groupId];
    if (!g) continue;
    var ks = (Array.isArray(g) ? g : [g]).map(String);
    if (ks.indexOf(String(key)) !== -1 && coKey(cfg)) return rows[i].site_code;
  }
  for (var j = 0; j < rows.length; j++) {
    var sc = String(rows[j].site_code || '');
    if (/^zz/i.test(sc) || !/\d/.test(sc)) continue;
    if (coKey(rows[j].config)) return sc;
  }
  return '';
}

/* GỬI FLEX MÀ KHÔNG ĐƯỢC IM LẶNG.
 * reply() bỏ qua mã phản hồi của LINE. Với ảnh thì hiếm khi sai, nhưng Flex sai
 * một thuộc tính là LINE trả 400 và NHÓM KHÔNG NHẬN ĐƯỢC GÌ — gõ lệnh xong im
 * re, không ai biết vì sao. Nên KIỂM TRƯỚC bằng endpoint validate của LINE
 * (không gửi gì, không tốn tin); sai thì trả chữ nói rõ, đúng mới gửi thẻ. */
/* Thẻ có hợp lệ với LINE không — hỏi endpoint validate (không gửi, không tốn tin).
 * Dùng khi thẻ đi CHUNG lượt với ảnh: LINE từ chối một tin là bỏ cả lượt, nên thẻ
 * hỏng mà không kiểm thì nhóm MẤT LUÔN ẢNH. Kiểm trước, hỏng thì bỏ thẻ. */
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
  // Nhận một thẻ, hoặc một mảng thẻ: /tonghop gửi HAI tin (thẻ dọc ngành hàng +
  // băng thẻ nhân viên) vì một tin Flex chỉ chứa được một bubble HOẶC một
  // carousel, không trộn được. Kiểm cả cụm một lượt: hỏng cái nào thì cả reply
  // hỏng, nên phải biết trước khi gửi.
  var ds = Object.prototype.toString.call(msg) === '[object Array]' ? msg : [msg];
  if (!ds.length) return;
  var kiem = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/validate/reply', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + lineToken() },
    payload: JSON.stringify({ messages: ds }),
    muteHttpExceptions: true
  });
  if (kiem.getResponseCode() !== 200) {
    console.error('Flex không hợp lệ: ' + kiem.getContentText());
    replyText(replyToken, '⚠ Không dựng được thẻ tóm tắt (LINE từ chối định dạng). ' +
      'Gõ /số để xem ảnh.' + NL + String(kiem.getContentText()).slice(0, 200));
    return;
  }
  reply(replyToken, ds);
}

// ================== THẺ FLEX /tomtat ==================
// Vì sao Flex, bên cạnh ảnh:
//  · Nhẹ: vài KB chữ thay vì ảnh ~900KB — không ăn băng thông kho ảnh.
//  · Hiện ngay trong THÔNG BÁO (altText) và trong danh sách chat: nhóm thấy số
//    mà chưa cần mở. Ảnh thì thông báo chỉ ghi "đã gửi một ảnh".
//  · Có NÚT bấm: bấm là bot nhận lệnh /số, /bcnv — khỏi gõ tay mã siêu thị.
// Nhược: không bày được bảng dài như ảnh, nên thẻ chỉ TÓM TẮT; ảnh vẫn là bản đủ.
//
// Hàm DỰNG THẺ để thuần (không gọi LINE, không gọi mạng) — thử được ngoài
// Apps Script. `bayGio` truyền vào để kiểm "số cũ" mà không phụ thuộc đồng hồ.
function dungFlexTomTat(goi, st, maGoi, bayGio) {
  var s = null;
  (goi && goi.sieuThi || []).forEach(function (x) {
    if (!s && (String(x.key) === String(st.key) || (st.mwgCode && String(x.mwg) === String(st.mwgCode)))) s = x;
  });
  if (!s) return null;

  // Tự định dạng kiểu Việt (1.234,5): Apps Script không chắc có dữ liệu locale
  // vi-VN, gọi toLocaleString có thể ra kiểu Mỹ 1,234.5 và đọc thành số sai.
  var so1 = function (v) {
    var n = Math.round(Number(v || 0) * 10) / 10, am = n < 0; n = Math.abs(n);
    var nguyen = Math.floor(n), le = Math.round((n - nguyen) * 10);
    if (le === 10) { nguyen++; le = 0; }
    var t = String(nguyen).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (am ? '−' : '') + t + (le ? ',' + le : '');
  };
  var pct = function (v) { return Math.round(Number(v || 0)) + '%'; };
  var mauPct = function (v) { return v >= 100 ? '#0F9D58' : (v >= 80 ? '#E08E0B' : '#D93025'); };

  // Giờ Việt Nam (UTC+7), tự tính để chạy được cả ngoài Apps Script.
  var vn = function (iso) { var d = new Date(Date.parse(iso) + 7 * 3600e3); return d; };
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var luc = goi.luc ? vn(goi.luc) : null;
  var nay = vn(new Date(bayGio || Date.now()).toISOString());
  var ngayNay = nay.getUTCFullYear() + '-' + p2(nay.getUTCMonth() + 1) + '-' + p2(nay.getUTCDate());
  var cu = goi.ngay !== ngayNay;
  var chuLuc = luc ? (p2(luc.getUTCHours()) + ':' + p2(luc.getUTCMinutes()) + ' ' + p2(luc.getUTCDate()) + '/' + p2(luc.getUTCMonth() + 1)) : '?';

  var hn = s.hopNhat || null;
  var phanTram = hn && hn.nhipNgay > 0 ? hn.dtqdNgay / hn.nhipNgay * 100 : null;

  var dong = function (nhan, giaTri, mau, dam) {
    return { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: nhan, size: 'sm', color: '#555555', flex: 5 },
      { type: 'text', text: giaTri, size: 'sm', color: mau || '#111111', align: 'end', flex: 4, weight: dam ? 'bold' : 'regular' }
    ] };
  };

  var than = [];
  if (cu) than.push({ type: 'text', text: '⚠ Số của ngày ' + goi.ngay + ' — chưa có số hôm nay', size: 'xs', color: '#D93025', wrap: true });

  if (hn) {
    than.push({ type: 'text', text: 'DT QUY ĐỔI HÔM NAY', size: 'xxs', color: '#888888', weight: 'bold' });
    than.push({ type: 'box', layout: 'baseline', spacing: 'sm', contents: [
      { type: 'text', text: so1(hn.dtqdNgay), size: '3xl', weight: 'bold', color: '#111111', flex: 0 },
      { type: 'text', text: 'tr', size: 'sm', color: '#888888', flex: 0 },
      { type: 'text', text: phanTram == null ? '—' : (pct(phanTram) + ' tiến độ ngày'), size: 'sm', align: 'end',
        color: phanTram == null ? '#888888' : mauPct(phanTram), weight: 'bold' }
    ] });
    than.push(dong('Tiến độ cần mỗi ngày', so1(hn.nhipNgay) + ' tr'));
    than.push({ type: 'separator', margin: 'md' });
    than.push(dong('Luỹ kế tháng', so1(hn.dtqdThang) + ' / ' + so1(hn.targetThang), null, true));
    // Tô màu %HT theo NHỊP, không theo 100%: ngày 15 mà đạt 45% là đang đúng
    // nhịp (45/47), còn tô theo mốc 100% thì cả tháng lúc nào cũng đỏ.
    var soNgayThang = new Date(Date.UTC(nay.getUTCFullYear(), nay.getUTCMonth() + 1, 0)).getUTCDate();
    var kyVong = Math.max(1, nay.getUTCDate() - 1) / soNgayThang * 100;
    than.push(dong('% HT target (tiến độ ' + pct(kyVong) + ')', pct(hn.pctThang), mauPct(hn.pctThang / kyVong * 100), true));
  } else {
    than.push({ type: 'text', text: 'Gói số chưa có doanh thu tổng (công cụ Realtime bản cũ).', size: 'xs', color: '#888888', wrap: true });
  }

  // NGÀNH HÔM NAY — chia theo NHỊP, không lấy "3 cái đầu bảng".
  // Bản đầu lấy 3 ngành % cao nhất rồi gắn nhãn "chạy tốt", nên sáng sớm mới có
  // 3 ngành bán thì cả ngành 3% cũng được khen. Nay: đạt ≥100% mới vào nhóm tốt,
  // còn lại là dưới nhịp. Chưa bán ngành nào thì NÓI RA, đừng để trống thẻ.
  var bh = (s.banHomNay || []).filter(function (x) { return x.targetNgay > 0; });
  var dongNganh = function (x) {
    return { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: x.ten, size: 'xs', color: '#333333', flex: 7, wrap: false },
      { type: 'text', text: pct(x.pctNgay), size: 'xs', align: 'end', flex: 2, weight: 'bold', color: mauPct(x.pctNgay) }
    ] };
  };
  than.push({ type: 'separator', margin: 'md' });
  if (!bh.length) {
    than.push({ type: 'text', text: 'Chưa bán ngành thi đua nào hôm nay.', size: 'xs', color: '#888888', margin: 'md', wrap: true });
  } else {
    var tot = bh.filter(function (x) { return x.pctNgay >= 100; })
      .sort(function (a, b) { return b.pctNgay - a.pctNgay; });
    var duoi = bh.filter(function (x) { return x.pctNgay < 100; })
      .sort(function (a, b) { return a.pctNgay - b.pctNgay; });
    if (tot.length) {
      than.push({ type: 'text', text: '🔥 ĐẠT TIẾN ĐỘ HÔM NAY (' + tot.length + ')', size: 'xxs', color: '#0F9D58', weight: 'bold', margin: 'md' });
      tot.slice(0, 3).forEach(function (x) { than.push(dongNganh(x)); });
    }
    if (duoi.length) {
      than.push({ type: 'text', text: '🐢 DƯỚI TIẾN ĐỘ (' + duoi.length + ')', size: 'xxs', color: '#D93025', weight: 'bold', margin: 'md' });
      duoi.slice(0, 3).forEach(function (x) { than.push(dongNganh(x)); });
    }
  }

  var nut = function (nhan, lenh, mau) {
    return { type: 'button', style: 'primary', height: 'sm', color: mau,
      action: { type: 'message', label: nhan, text: lenh } };
  };

  var bubble = {
    type: 'bubble', size: 'mega',
    header: { type: 'box', layout: 'vertical', backgroundColor: '#0B5ED7', paddingAll: 'md', contents: [
      { type: 'text', text: s.ten || st.label, color: '#FFFFFF', weight: 'bold', size: 'md', wrap: true },
      { type: 'text', text: 'Cập nhật ' + chuLuc, color: '#DCE8FF', size: 'xxs' }
    ] },
    body: { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: 'lg', contents: than },
    footer: { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
      nut('📷 Ảnh /số', '/số ' + maGoi, '#0B5ED7'),
      nut('👥 Nhân viên', '/bcnv ' + maGoi, '#5F6368')
    ] }
  };

  // altText hiện trong THÔNG BÁO và danh sách chat — nên nhét số vào đó.
  var alt = (s.ten || st.label) + (hn
    ? (' · hôm nay ' + so1(hn.dtqdNgay) + 'tr' + (phanTram == null ? '' : ' (' + pct(phanTram) + ' tiến độ)') + ' · tháng ' + pct(hn.pctThang))
    : ' · tóm tắt số realtime');
  if (cu) alt = '⚠ ' + alt + ' (số cũ)';
  return { type: 'flex', altText: alt.slice(0, 400), contents: bubble };
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

function replyImagesPaged(replyToken, images, page, baseCmd, label, phienBan, theDau) {
  var total = images.length;
  var thanhTin = function (im) { return imageToMessage(im, phienBan); };
  /* THẺ ĐỨNG ĐẦU (Flex tóm tắt) chiếm MỘT trong 5 chỗ của lượt Reply, và chỉ
   * có ở trang 1. Nên trang 1 còn 3 ảnh (+1 dòng nhắc), các trang sau vẫn 4 ảnh —
   * phải tính lệch vị trí bắt đầu theo đó, không thì /bc2 lặp lại hoặc bỏ sót
   * một ảnh. */
  var coThe = !!theDau && page <= 1;
  if (coThe && total <= 4) { reply(replyToken, [theDau].concat(images.map(thanhTin))); return; }
  // Vừa đủ 1 lượt thì gửi hết, khỏi bắt gõ thêm lệnh.
  if (!theDau && total <= 5 && page <= 1) { reply(replyToken, images.map(thanhTin)); return; }

  var dauTrang1 = theDau ? ANH_MOI_TRANG - 1 : ANH_MOI_TRANG;
  var soAnhTrangNay = (page <= 1) ? dauTrang1 : ANH_MOI_TRANG;
  var start = (page <= 1) ? 0 : dauTrang1 + (page - 2) * ANH_MOI_TRANG;
  if (start >= total) {
    replyText(replyToken, 'Hết rồi — ' + label + ' chỉ có ' + total + ' ảnh. Gõ /' + baseCmd + ' để xem lại từ đầu.');
    return;
  }
  var phan = images.slice(start, start + soAnhTrangNay);
  var msgs = (coThe ? [theDau] : []).concat(phan.map(thanhTin));
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


/* NỀN SỐ CỦA SIÊU THỊ cho thẻ /tonghop.
 *
 * Thứ tự ưu tiên — và KHÔNG được đảo:
 *   1. goi_tong_cum<mã>.json — do CÔNG CỤ THU SỐ (dmx-thu-baocao 0.36.0+) đẩy
 *      lên ngay lúc thu. Đây là đúng bộ số sieuthi.html hiển thị: luỹ kế quy
 *      đổi OFFLINE cắt hết hôm qua, target quy đổi, tỷ trọng trả góp. Hai nơi
 *      vì thế bằng nhau từng đồng.
 *   2. rt_thidua_cum<mã>.json (hopNhat) — gói realtime, chỉ dùng khi chưa có
 *      gói (1). Cắt mốc khác nên số nhỉnh hơn đôi chút; thẻ phải NÓI RA đang
 *      lấy nguồn nào để không ai tưởng sieuthi.html sai.
 *   3. Không có gì: thẻ rơi về tổng cộng của nhân viên trong nv.html — thiếu
 *      NV hỗ trợ và nhân viên online, nên cũng phải nói ra.
 */
function nenSoSieuThi(st, groupId) {
  var site = '';
  try { site = siteCuaSieuThi(st.key, groupId); } catch (e) { site = ''; }
  var ma = String(site || '').replace(/\D/g, '');
  if (!ma) return null;

  var haiGoi = docNhieuJson([pub('goi_tong_cum' + ma + '.json'), pub('rt_thidua_cum' + ma + '.json')]);
  var gt = haiGoi[0];
  var r = gt && gt.sieuThi && (gt.sieuThi[String(st.key)] ||
          (st.mwgCode ? gt.sieuThi[String(st.mwgCode)] : null));
  if (r && Number(r.luyKe) > 0) {
    return {
      nguon: 'thu', luc: gt.luc,
      dtqd: Number(r.luyKe), target: Number(r.targetQd) || 0,
      traChamQd: r.traChamQd == null ? null : Number(r.traChamQd),
      tyTrongTraGop: Number(r.tyTrongTraGop) || 0,
      soNgayLuyKe: Number(r.soNgayLuyKe) || 0, soNgayThang: Number(r.soNgayThang) || 0,
      cungKy: r.cungKy || null
    };
  }

  var goi = haiGoi[1];
  var hn = null;
  ((goi && goi.sieuThi) || []).forEach(function (x) {
    if (!hn && (String(x.key) === String(st.key) ||
        (st.mwgCode && String(x.mwg) === String(st.mwgCode)))) hn = x.hopNhat || null;
  });
  if (hn && hn.dtqdThang != null && Number(hn.targetThang) > 0) {
    return {
      nguon: 'realtime', luc: goi.luc,
      dtqd: Number(hn.dtqdThang), target: Number(hn.targetThang),
      traChamQd: Number(hn.traChamQdThang) || null,
      tyTrongTraGop: (Number(hn.traChamQdThang) > 0 && Number(hn.dtqdThang) > 0)
        ? Number(hn.traChamQdThang) / Number(hn.dtqdThang) : 0,
      soNgayLuyKe: 0, soNgayThang: 0, cungKy: null
    };
  }
  return null;
}

// ================== THẺ FLEX /tonghop ==================
// GỬI HAI TIN, vì một tin Flex chỉ chứa được MỘT bubble hoặc MỘT carousel:
//   Tin 1 — thẻ dọc: ô tổng siêu thị + NGÀNH HÀNG THI ĐUA, mỗi ngành một KHỐI
//           (tên đầy đủ, thanh tiến trình, đã bán / target, %HT, còn thiếu).
//   Tin 2 — băng thẻ vuốt ngang: MỖI THẺ 2 NHÂN VIÊN xếp dọc, kèm mục tiêu
//           doanh thu hôm nay và nhiệm vụ hôm nay của từng người.
//
// Vì sao tách hai tin: để chung một carousel thì LINE kéo mọi thẻ cao bằng thẻ
// cao nhất — khối ngành hàng dài sẽ làm mỗi thẻ nhân viên thành một cột trắng
// lênh khênh.
//
// Danh sách ngành ở đây ĐÃ là ngành đang theo dõi: nv.html dựng
// categoriesToDisplay từ activeCategoryNames, vốn lọc sẵn theo ô "LỌC NGÀNH HÀNG
// HIỂN THỊ" (24/38 ngành ở 396 tháng 09/2026). Đừng lọc lần thứ hai ở đây.
function dungFlexTongHop(e, st, bayGio, hn) {
  var tt = e && e.tomTat;
  if (!tt || !tt.nv || !tt.nv.length) return null;
  var maGoi = st.mwgCode || st.key;

  var so1 = function (v) {
    var n = Math.round(Number(v || 0) * 10) / 10, am = n < 0; n = Math.abs(n);
    var ng = Math.floor(n), le = Math.round((n - ng) * 10);
    if (le === 10) { ng++; le = 0; }
    return (am ? '−' : '') + String(ng).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (le ? ',' + le : '');
  };
  var so0 = function (v) { return String(Math.round(Number(v || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var pct = function (v) { return Math.round(Number(v || 0)) + '%'; };
  var mau = function (v) { return v >= 100 ? '#0F9D58' : (v >= 80 ? '#E08E0B' : '#D93025'); };
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var vn = function (ms) { return new Date(ms + 7 * 3600e3); };
  var luc = e.luc ? vn(Date.parse(e.luc)) : null;
  var nay = vn(bayGio || Date.now());
  var ngayNay = nay.getUTCFullYear() + '-' + p2(nay.getUTCMonth() + 1) + '-' + p2(nay.getUTCDate());
  var cu = e.date && e.date !== ngayNay;
  var chuLuc = luc ? (p2(luc.getUTCHours()) + ':' + p2(luc.getUTCMinutes()) + ' ' + p2(luc.getUTCDate()) + '/' + p2(luc.getUTCMonth() + 1)) : '?';
  var T = tt.tong || {};
  var KY = tt.kyVong != null ? Number(tt.kyVong) : null;

  var chu = function (t, o) {
    var x = { type: 'text', text: String(t), size: 'xs', color: '#333333' };
    for (var k in o) x[k] = o[k];
    return x;
  };
  // Thanh tiến trình vẽ theo %HT (phần đã bán được thật trên target), còn MÀU
  // lấy theo TIẾN ĐỘ dự kiến — thứ quyết định có về đích hay không.
  var thanh = function (phanTram, mauThanh) {
    var rong = Math.max(2, Math.min(100, Math.round(Number(phanTram) || 0)));
    return { type: 'box', layout: 'vertical', height: '6px', backgroundColor: '#E6EBF0', cornerRadius: '3px', margin: 'sm',
      contents: [{ type: 'box', layout: 'vertical', height: '6px', width: rong + '%', backgroundColor: mauThanh, cornerRadius: '3px', contents: [{ type: 'filler' }] }] };
  };
  var nut = function (label, text, color) {
    return { type: 'button', style: 'primary', height: 'sm', color: color, action: { type: 'message', label: label, text: text } };
  };

  // ============ TIN 1: ô tổng + ngành hàng thi đua ============
  var than = [];
  if (cu) than.push(chu('⚠ Số của ngày ' + e.date + ' — chưa có số hôm nay', { color: '#D93025', wrap: true }));

  // Ô TỔNG LẤY SỐ CỦA MWG, KHÔNG LẤY TỔNG CỘNG CỦA NHÂN VIÊN.
  //
  // Hai nguồn không bằng nhau và không thể bằng nhau:
  //   · nv.html cộng doanh thu của những người CÓ TRONG DANH SÁCH (lọc theo giờ
  //     công, bộ phận bán hàng) và chia theo target Quản lý tự nhập.
  //   · Gói realtime lấy thẳng doanh thu OFFLINE + target của siêu thị trên
  //     trang MWG — đây mới là con số cả siêu thị bị chấm.
  // Ngày 17/09/2026 lệch thật: 396 thiếu 170 tr (4,8%), Ngọc Thụy thiếu 221 tr
  // (22,4%); target thì 396 nhập cao hơn MWG 960 tr, Ngọc Thụy nhập thấp hơn
  // 357 tr. Bày số cộng-theo-người rồi gọi là "DTQĐ luỹ kế" là nói sai về siêu
  // thị. Nên: ô tổng theo MWG, còn số chia theo người để riêng một dòng — mất
  // bao nhiêu chưa chia được cũng nói luôn.
  var nenMWG = hn && Number(hn.dtqd) > 0 && Number(hn.target) > 0;
  var dtHien = nenMWG ? Number(hn.dtqd) : T.dtqd;
  var tgHien = nenMWG ? Number(hn.target) : T.target;
  var htHien = tgHien > 0 ? dtHien / tgHien * 100 : 0;
  // Số ngày lấy của chính gói (sieuthi.html chia theo soNgayLuyKe); gói realtime
  // không có thì mượn số ngày của nv.html.
  var ngayQua = (nenMWG && hn.soNgayLuyKe > 0) ? hn.soNgayLuyKe : (Number(tt.ngayDuKien) || 0);
  var ngayThang = (nenMWG && hn.soNgayThang > 0) ? hn.soNgayThang : (Number(tt.soNgayThang) || 30);
  var tdHien = (nenMWG && ngayQua > 0) ? (dtHien / ngayQua * ngayThang) / tgHien * 100 : T.duKien;
  var nhanNen = nenMWG ? (hn.nguon === 'thu' ? ' · MWG' : ' · MWG (realtime)') : '';
  than.push({ type: 'box', layout: 'horizontal', contents: [
    { type: 'box', layout: 'vertical', flex: 5, contents: [
      chu('DTQĐ LUỸ KẾ' + nhanNen, { size: 'xxs', color: '#888888', weight: 'bold' }),
      { type: 'text', text: so1(dtHien), size: 'xl', weight: 'bold', color: '#111111', margin: 'xs' },
      chu('target ' + so1(tgHien), { size: 'xxs', color: '#888888', margin: 'xs' })
    ] },
    { type: 'box', layout: 'vertical', flex: 3, contents: [
      chu('% HT', { size: 'xxs', color: '#888888', weight: 'bold', align: 'end' }),
      { type: 'text', text: pct(htHien), size: 'lg', weight: 'bold', align: 'end', color: '#111111' }
    ] },
    { type: 'box', layout: 'vertical', flex: 3, contents: [
      chu('TIẾN ĐỘ', { size: 'xxs', color: '#888888', weight: 'bold', align: 'end' }),
      { type: 'text', text: pct(tdHien), size: 'lg', weight: 'bold', align: 'end', color: mau(tdHien) }
    ] }
  ] });
  than.push(chu('Ngành đạt ' + (T.nganh || '—') + (KY != null ? ' · kỳ vọng tháng ' + KY + '%' : ''), { size: 'xxs', color: '#888888' }));
  if (nenMWG) {
    var chenh = dtHien - T.dtqd;
    than.push(chu('⚖ Chia theo ' + tt.nv.length + ' NV: ' + so1(T.dtqd) + ' / target giao ' + so1(T.target) +
      ' (' + pct(T.ht) + ')' + (chenh >= 1 ? ' · ' + so1(chenh) +
        ' tr không thuộc ' + tt.nv.length + ' người này (NV hỗ trợ, online…)'
        // Số siêu thị NHỎ HƠN tổng nhân viên = gói siêu thị chốt SỚM hơn, không
        // phải "người ngoài" (19/09/2026 600 Nguyễn Nghiêm in ra "−211,7 tr không
        // thuộc 3 người này" vì gói realtime còn số tối qua).
        : (chenh <= -1 ? ' · số siêu thị chốt lúc ' + (hn.luc ? Utilities.formatDate(new Date(hn.luc),
            'Asia/Ho_Chi_Minh', 'HH:mm dd/MM') : '?') + ', cũ hơn số nhân viên' : '')),
      { size: 'xxs', color: '#888888', wrap: true, margin: 'sm' }));
  } else {
    than.push(chu('⚠ Chưa có gói realtime — số trên là TỔNG CỘNG CỦA ' + tt.nv.length +
      ' NHÂN VIÊN và target Quản lý nhập, không phải số siêu thị trên trang MWG.',
      { size: 'xxs', color: '#E08E0B', wrap: true, margin: 'sm' }));
  }

  // TRẢ GÓP của cả siêu thị: manifest chỉ có TỶ TRỌNG của từng người, nên cộng
  // ngược lại — DT trả góp của người i = dtqd_i × tyTrong_i — rồi chia cho tổng
  // DTQĐ. Ra đúng tỷ trọng siêu thị chứ không phải trung bình cộng các tỷ trọng
  // (người bán ít mà tỷ trọng cao sẽ kéo lệch con số kiểu đó).
  // Ưu tiên số của MWG: gói realtime từ 0.46.0 có traChamQdThang lấy thẳng
  // trong thẻ tổng hợp nhất (cùng nền quy đổi, cùng khoảng ngày với dtqdThang).
  // Gói cũ hơn thì mới cộng ngược từ tỷ trọng từng người — cách đó bỏ sót NV hỗ
  // trợ và nhân viên online nên phải dán nhãn "theo NV" cho khỏi hiểu nhầm.
  var tgDT = 0, tgNen = 0, tgNhan = ' · theo NV';
  if (hn && Number(hn.traChamQd) > 0 && Number(hn.dtqd) > 0) {
    tgDT = Number(hn.traChamQd); tgNen = Number(hn.dtqd); tgNhan = '';
  } else {
    tt.nv.forEach(function (n) {
      if (n.traGop == null) return;
      tgDT += (Number(n.dtqd) || 0) * (Number(n.traGop) || 0) / 100;
      tgNen += Number(n.dtqd) || 0;
    });
  }
  if (tgNen > 0) {
    var tgTy = tgDT / tgNen * 100;
    than.push({ type: 'box', layout: 'horizontal', margin: 'md', backgroundColor: '#F1F5FB',
      cornerRadius: '8px', paddingAll: 'sm', contents: [
      chu('💳 TRẢ GÓP' + tgNhan, { size: 'xxs', color: '#0B5ED7', weight: 'bold', flex: 5, gravity: 'center' }),
      chu(so1(tgDT) + ' tr · ' + pct(tgTy) + ' DTQĐ', { size: 'xs', color: '#0B5ED7', weight: 'bold',
        align: 'end', flex: 5, gravity: 'center' })
    ] });
  }

  var ng = tt.nganh || [];
  if (ng.length) {
    var ngDat = ng.filter(function (x) { return x.duKien >= 100; });
    // Xếp CAO XUỐNG THẤP theo yêu cầu. Tự xếp ở đây chứ không tin thứ tự có
    // sẵn: nv.html đưa sang theo chiều tăng dần.
    var conNgay = tt.laChotThang ? 0 : Math.max(0, (Number(tt.soNgayThang) || 0) - (Number(tt.ngayDuKien) || 0));
    var dsNg = ng.slice().sort(function (a, b) { return (b.duKien || 0) - (a.duKien || 0); });
    than.push({ type: 'separator', margin: 'lg' });
    than.push(chu('🏁 NGÀNH HÀNG THI ĐUA — ' + ngDat.length + '/' + ng.length + ' ngành dự kiến về đích',
      { size: 'xxs', color: '#888888', weight: 'bold', margin: 'lg', wrap: true }));
    // GIẢI THÍCH CON SỐ MÀU. Không có dòng này thì người trong nhóm dễ đọc nhầm
    // số bên phải thành %HT rồi hoảng, trong khi đó là con số DỰ BÁO.
    than.push(chu('Số % bên phải = TIẾN ĐỘ: bán theo đà từ đầu tháng tới giờ thì hết tháng đạt bao nhiêu ' +
      'phần trăm target. 🔴 dưới 80% — không kịp · 🟠 80–99% — sát nút · 🟢 từ 100% — về đích. ' +
      'Xếp từ cao xuống thấp.', { size: 'xxs', color: '#999999', wrap: true, margin: 'sm' }));
    // MỖI NGÀNH MỘT KHỐI DỌC. Bày mỗi ngành một dòng thì tên dài bị cắt cụt
    // ("MỞ THẺ TÍN DỤNG TPBANK EVO VÀ …") và không còn chỗ cho số còn thiếu —
    // mà đó mới là con số người bán cần biết.
    var TOI_DA_NGANH = 26;
    dsNg.slice(0, TOI_DA_NGANH).forEach(function (x, i) {
      var dv = x.donVi === 'SL' ? '' : ' tr';
      var thieu = (Number(x.target) || 0) - (Number(x.ban) || 0);
      // Vạch ngăn + lề rộng giữa các khối: bày sát nhau thì dòng "còn thiếu" của
      // ngành trên dính vào tên ngành dưới, nhìn như một đống chữ.
      if (i) than.push({ type: 'separator', margin: 'md', color: '#EEF1F5' });
      than.push({ type: 'box', layout: 'vertical', margin: 'md', paddingBottom: '2px', contents: [
        { type: 'box', layout: 'horizontal', contents: [
          chu(x.ten, { flex: 7, wrap: true, weight: 'bold', color: '#111111' }),
          chu(pct(x.duKien), { flex: 3, align: 'end', weight: 'bold', size: 'sm', color: mau(x.duKien), gravity: 'center' })
        ] },
        thanh(x.ht, mau(x.duKien)),
        { type: 'box', layout: 'horizontal', margin: 'sm', contents: [
          chu(so1(x.ban) + ' / ' + so1(x.target) + dv + ' · %HT ' + pct(x.ht), { size: 'xxs', color: '#666666', flex: 6, wrap: true }),
          // Kèm MỖI NGÀY CẦN BÁN = còn thiếu ÷ số ngày còn lại (tính cả hôm nay) —
          // y như tonghop.html; sửa cách tính thì sửa cả hai nơi.
          chu(thieu > 0 ? 'còn thiếu ' + so1(thieu) + dv + (conNgay > 0 ? ' · ' + so1(thieu / conNgay) + dv + '/ngày' : '')
            : 'đã đủ target', { size: 'xxs', align: 'end', flex: 4,
            color: thieu > 0 ? '#D93025' : '#0F9D58', wrap: true })
        ] }
      ] });
    });
    if (dsNg.length > TOI_DA_NGANH) {
      than.push(chu('… và ' + (dsNg.length - TOI_DA_NGANH) + ' ngành nữa: ' +
        dsNg.slice(TOI_DA_NGANH).map(function (x) { return x.ten + ' ' + pct(x.duKien); }).join(' · '),
        { size: 'xxs', color: '#777777', wrap: true, margin: 'md' }));
    }
  }
  than.push(chu('👉 Vuốt ngang băng thẻ bên dưới để xem từng nhân viên · bấm 📸 để lấy ảnh gửi nhóm khác',
    { size: 'xxs', color: '#0B5ED7', margin: 'lg', weight: 'bold', wrap: true }));

  var theNganh = {
    type: 'bubble', size: 'giga',
    header: { type: 'box', layout: 'vertical', backgroundColor: '#0B5ED7', paddingAll: 'md', contents: [
      { type: 'text', text: 'TỔNG HỢP · ' + (e.label || st.label), color: '#FFFFFF', weight: 'bold', size: 'md', wrap: true },
      { type: 'text', text: 'Cập nhật ' + chuLuc, color: '#DCE8FF', size: 'xxs' }
    ] },
    body: { type: 'box', layout: 'vertical', spacing: 'none', paddingAll: 'lg', contents: than },
    footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
      // NÚT CHIA SẺ. Thẻ Flex không chụp lại được thành một tấm (dài hơn màn
      // hình), mà nhóm thì hay muốn chuyển số này sang nhóm khác. Nút mở trang
      // tonghop.html: nó vẽ lại đúng nội dung thẻ rồi dựng MỘT ảnh ngay trên
      // máy người xem — không tốn băng thông kho ảnh, số lại luôn mới.
      { type: 'button', style: 'primary', height: 'sm', color: '#0F9D58',
        action: { type: 'uri', label: '📸 Ảnh để chia sẻ',
          uri: 'https://namkphong.github.io/tonghop.html?ma=' + encodeURIComponent(maGoi) } },
      { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
        nut('👥 Ảnh /bcnv', '/bcnv ' + maGoi, '#0B5ED7'), nut('👤 Ảnh /bc', '/bc ' + maGoi, '#5F6368')
      ] }
    ] }
  };

  // ============ TIN 2: băng thẻ nhân viên, MỖI THẺ 2 NGƯỜI ============
  // MỘT Ô NHÂN VIÊN — KHUÔN CỐ ĐỊNH, ô nào cũng đúng bấy nhiêu dòng:
  //   1. số hạng trong ô vuông tô màu + tên + tiến độ
  //   2. thanh tiến trình theo %HT
  //   3. ba ô số bằng nhau: DTQĐ / %HT / trả góp
  //   4. một dòng dự báo cuối tháng
  //   5. dải "hôm nay phải bán"
  //   6. ĐÚNG 4 dòng nhiệm vụ (thiếu thì chèn dòng trống cho đủ chiều cao)
  //   7. nút ảnh riêng
  //
  // Vì sao phải cố định: hai người nằm chung một thẻ, thẻ nào cũng đứng cạnh
  // nhau trong băng vuốt ngang. Ô trên cao thấp khác nhau là người thứ hai của
  // mỗi thẻ nằm lệch nhau — nhìn như bảng bị thò thụt. Thà để một dòng trống
  // còn hơn để hàng lệch.
  var CAO_VIEC = '17px', SO_VIEC = 4;
  var demTrong = function (cao) {
    return { type: 'box', layout: 'vertical', height: cao, contents: [{ type: 'filler' }] };
  };
  var oNhanVien = function (n, thu) {
    var m = mau(n.duKien);
    var oSo = function (nhan, giaTri, mauSo) {
      return { type: 'box', layout: 'vertical', flex: 1, contents: [
        chu(nhan, { size: 'xxs', color: '#9AA3AD', weight: 'bold' }),
        chu(giaTri, { size: 'xs', color: mauSo || '#111111', weight: 'bold' })
      ] };
    };
    var o = [];
    // Tên KHÔNG xuống dòng: tên dài hai dòng là ô cao hơn ô bên cạnh.
    o.push({ type: 'box', layout: 'horizontal', contents: [
      { type: 'box', layout: 'vertical', width: '22px', height: '22px', backgroundColor: m,
        cornerRadius: '5px', flex: 0, justifyContent: 'center',
        contents: [chu(String(thu), { size: 'xs', color: '#FFFFFF', weight: 'bold', align: 'center' })] },
      { type: 'box', layout: 'vertical', flex: 1, paddingStart: 'sm', contents: [
        chu(n.ten, { size: 'sm', weight: 'bold', color: '#111111' }),
        chu(n.trangThai || '—', { size: 'xxs', color: m })
      ] },
      chu(pct(n.duKien), { flex: 0, align: 'end', weight: 'bold', size: 'lg', color: m, gravity: 'center' })
    ] });
    o.push(thanh(n.ht, m));
    o.push({ type: 'box', layout: 'horizontal', margin: 'sm', contents: [
      oSo('DTQĐ', so1(n.dtqd) + '/' + so1(n.target)),
      oSo('%HT', pct(n.ht)),
      oSo('TRẢ GÓP', n.traGop == null ? '—' : pct(n.traGop), '#0B5ED7')
    ] });
    // Dòng dự báo LUÔN CÓ, chỉ đổi lời và màu — giữ chiều cao ô như nhau.
    o.push(n.duKienCuoiThang
      ? chu((n.duDat === false ? '⚠ Giữ đà này, hết tháng chỉ ~' : '✔ Giữ đà này, hết tháng ~') +
          so0(n.duKienCuoiThang) + ' tr', { size: 'xxs', color: n.duDat === false ? '#D93025' : '#0F9D58', margin: 'sm' })
      : chu('—', { size: 'xxs', color: '#BBBBBB', margin: 'sm' }));
    o.push({ type: 'box', layout: 'horizontal', backgroundColor: '#4F46E5', cornerRadius: '8px',
      paddingAll: 'sm', margin: 'sm', contents: [
      chu('🎯 HÔM NAY PHẢI BÁN', { size: 'xxs', color: '#E0E7FF', weight: 'bold', flex: 6, gravity: 'center' }),
      chu(n.mucTieuNgay ? so0(n.mucTieuNgay) + ' tr' : '—', { size: 'md', color: '#FFFFFF', weight: 'bold',
        align: 'end', flex: 4, gravity: 'center' })
    ] });
    var viec = (n.nhiemVu || []).slice(0, SO_VIEC);
    viec.forEach(function (v, k) {
      var h = { type: 'box', layout: 'horizontal', paddingAll: 'xs', contents: [
        chu((v.chot ? '🎯 ' : '• ') + v.ten, { size: 'xxs', color: '#333333', flex: 6 }),
        chu(v.giao, { size: 'xxs', color: '#111111', weight: 'bold', align: 'end', flex: 3 }),
        chu(pct(v.ht), { size: 'xxs', color: mau(v.ht), align: 'end', flex: 2 })
      ] };
      if (k % 2 === 0) h.backgroundColor = '#F7F9FC';
      o.push(h);
    });
    for (var t = viec.length; t < SO_VIEC; t++) o.push(demTrong(CAO_VIEC));
    // NÚT ẢNH RIÊNG. Chỉ gắn khi có mã nhân viên — lệnh /nv đi theo mã, không
    // theo vị trí, nên thiếu mã thì chèn khoảng trống bằng đúng chiều cao nút,
    // giữ hàng cho ô bên cạnh.
    o.push(n.ma
      ? { type: 'button', style: 'secondary', height: 'sm', margin: 'md',
          action: { type: 'message', label: '📄 Ảnh chi tiết', text: '/nv ' + maGoi + ' ' + n.ma } }
      : demTrong('40px'));
    return { type: 'box', layout: 'vertical', contents: o };
  };

  // LINE cho tối đa 12 thẻ một băng → 24 người. Cụm đông hơn thì bảng xếp hạng
  // đầy đủ vẫn nằm ở ảnh /bcnv, nên chỉ cần NÓI RA số người không có thẻ.
  var TOI_DA_THE = 12, MOI_THE = 2;
  var bubbles = [];
  for (var i = 0; i < tt.nv.length && bubbles.length < TOI_DA_THE; i += MOI_THE) {
    var cap = tt.nv.slice(i, i + MOI_THE), noi = [], batDau = i;
    cap.forEach(function (n, k) {
      if (k) noi.push({ type: 'separator', margin: 'lg' });
      noi.push(oNhanVien(n, batDau + k + 1));
    });
    bubbles.push({
      type: 'bubble', size: 'mega',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#C2410C', paddingAll: 'sm', contents: [
        { type: 'text', text: '👥 ' + (e.label || st.label) + ' · ' + (i + 1) + '–' + (i + cap.length) + '/' + tt.nv.length,
          color: '#FFFFFF', weight: 'bold', size: 'xs' },
        { type: 'text', text: '% = tiến độ cuối tháng · 🔴 <80 · 🟠 80–99 · 🟢 ≥100',
          color: '#FFE7D6', size: 'xxs' }
      ] },
      body: { type: 'box', layout: 'vertical', spacing: 'md', paddingAll: 'lg', contents: noi }
    });
  }
  var conLai = tt.nv.length - Math.min(tt.nv.length, TOI_DA_THE * MOI_THE);
  if (conLai > 0 && bubbles.length) {
    bubbles[bubbles.length - 1].body.contents.push(
      chu('(' + conLai + ' người cuối không có thẻ — xem ảnh /bcnv)', { size: 'xxs', color: '#888888', wrap: true, margin: 'md' }));
  }

  var dauBang = tt.nv[0], cuoiBang = tt.nv[tt.nv.length - 1];
  var yeu = (tt.nganh || []).filter(function (x) { return x.duKien < 80; }).slice(0, 2).map(function (x) { return x.ten; });
  var alt = (e.label || st.label) + ' · DTQĐ ' + so1(T.dtqd) + ' (' + pct(T.ht) + ', tiến độ ' + pct(T.duKien) + ')' +
    (yeu.length ? ' · ngành đuối: ' + yeu.join(', ') : '') +
    (dauBang ? ' · dẫn đầu ' + dauBang.ten + ' ' + pct(dauBang.duKien) : '') +
    (cuoiBang && cuoiBang !== dauBang ? ' · thấp nhất ' + cuoiBang.ten + ' ' + pct(cuoiBang.duKien) : '');
  if (cu) alt = '⚠ ' + alt + ' (số cũ)';

  return [
    { type: 'flex', altText: alt.slice(0, 400), contents: theNganh },
    { type: 'flex', altText: (e.label || st.label) + ' · ' + tt.nv.length + ' nhân viên — vuốt ngang để xem từng người',
      contents: { type: 'carousel', contents: bubbles } }
  ];
}
