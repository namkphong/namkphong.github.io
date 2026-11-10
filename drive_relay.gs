/**
 * TRẠM CHUYỂN SỐ ĐIỆN THOẠI → MÁY TÍNH (Google Apps Script, chạy dưới tài khoản Google của anh).
 *
 *   Điện thoại (nhap-so.html) ──gui──▶ 1 file tạm trong Google Drive của anh
 *   Máy tính  (nv.html)        ──lay──▶ đọc file  ──xoa──▶ XOÁ VĨNH VIỄN file (không vào Thùng rác)
 *
 * Dữ liệu chỉ nằm trên Drive trong khoảng giữa lúc gửi và lúc máy tính lấy — không ai lấy thì tối đa 6 tiếng.
 * Dùng chung cho: nhap-so.html → nv.html, và app DataSnap (doc-so.html) → doc-so.html / nv.html máy tính.
 * Mọi lệnh phải kèm KHOA (chuỗi bí mật, đặt ở Script Properties) — không có khoá thì từ chối.
 *
 * CÀI (làm 1 lần, xem README mục "Nhập số từ điện thoại"):
 *   1. script.google.com → Dự án mới → dán file này.
 *   2. Cài đặt dự án (bánh răng) → Thuộc tính tập lệnh → thêm KHOA = <chuỗi dài tự nghĩ>.
 *   3. Triển khai → Triển khai mới → Ứng dụng web: Thực thi với tư cách "Tôi",
 *      Người có quyền truy cập "Bất kỳ ai" → Triển khai → cấp quyền Drive → chép URL /exec.
 *      Rồi chọn hàm capQuyen → Chạy 1 lần (cài lịch tự dọn mỗi giờ).
 *   4. Dán URL + KHOA vào ô "⚙ Trạm Drive" trên doc-so.html (app DataSnap, điện thoại) và doc-so.html / nv.html (máy tính).
 */

var TEN_FILE = 'dmx-goi-tam.json';
// Gói không ai lấy quá 6 tiếng → tự xoá vĩnh viễn (lúc có lệnh bất kỳ + trình kích hoạt mỗi giờ, cài bằng capQuyen).
var GIU_GIO = 6;

function doGet() {
  return traVe({ ok: true, ten: 'dmx-drive-relay' });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var khoa = PropertiesService.getScriptProperties().getProperty('KHOA');
    if (!khoa) return traVe({ ok: false, loi: 'Trạm chưa đặt KHOA trong Thuộc tính tập lệnh.' });
    if (req.khoa !== khoa) return traVe({ ok: false, loi: 'Sai khoá.' });

    if (req.lenh === 'gui') {
      if (!req.duLieu) return traVe({ ok: false, loi: 'Thiếu dữ liệu.' });
      xoaHet();                                  // chỉ giữ đúng 1 gói mới nhất
      var f = DriveApp.createFile(TEN_FILE, JSON.stringify(req.duLieu), 'application/json');
      return traVe({ ok: true, luc: new Date().toISOString(), kichThuoc: f.getSize() });
    }
    if (req.lenh === 'lay') {
      donDep();
      var it = DriveApp.getFilesByName(TEN_FILE);
      if (!it.hasNext()) return traVe({ ok: true, duLieu: null });
      var file = it.next();
      return traVe({ ok: true, duLieu: JSON.parse(file.getBlob().getDataAsString('UTF-8')),
                     luc: file.getDateCreated().toISOString() });
    }
    if (req.lenh === 'xoa') {
      return traVe({ ok: true, daXoa: xoaHet() });
    }
    return traVe({ ok: false, loi: 'Lệnh lạ: ' + req.lenh });
  } catch (err) {
    return traVe({ ok: false, loi: String(err && err.message || err) });
  }
}

// Xoá gói đã nằm quá GIU_GIO tiếng (không ai lấy). Trình kích hoạt theo giờ gọi hàm này.
function donDep() {
  var it = DriveApp.getFilesByName(TEN_FILE), han = Date.now() - GIU_GIO * 3600e3, cu = false;
  while (it.hasNext()) { if (it.next().getDateCreated().getTime() < han) cu = true; }
  return cu ? xoaHet() : 0;
}

// Xoá VĨNH VIỄN (gọi Drive API), không để nằm trong Thùng rác 30 ngày.
function xoaHet() {
  var it = DriveApp.getFilesByName(TEN_FILE), n = 0;
  while (it.hasNext()) {
    var id = it.next().getId();
    UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id, {
      method: 'delete',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    n++;
  }
  return n;
}

function traVe(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Chạy tay 1 lần trong trình soạn thảo để Google hỏi cấp quyền (Drive + gọi mạng) và cài lịch dọn mỗi giờ.
function capQuyen() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'donDep') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('donDep').timeBased().everyHours(1).create();
  DriveApp.getRootFolder();
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user',
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
}
