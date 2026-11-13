/**
 * TRẠM CHUYỂN SỐ ĐIỆN THOẠI → MÁY TÍNH (Google Apps Script, chạy dưới tài khoản Google của anh).
 *
 *   Điện thoại (doc-so.html trong app DataSnap) ──gui──▶ LƯU 1 tệp mới trong Google Drive CỦA ANH
 *                                                          (tên theo giờ: dmx-goi-2026-11-13_0805.json)
 *   Máy tính  (doc-so.html / nv.html)          ──lay──▶ đọc tệp MỚI NHẤT
 *
 * 13/11: Drive là của riêng từng quản lý → trạm KHÔNG xoá gì nữa (không xoá sau khi lấy, không tự dọn
 * sau 6 giờ). Các gói nằm lại trong thư mục để tự lưu theo ngày; muốn dọn thì tự xoá trên Drive.
 * Mọi lệnh phải kèm KHOA (chuỗi bí mật, đặt ở Script Properties) — không có khoá thì từ chối.
 *
 * CÀI (làm 1 lần, xem huong-dan-tram-drive.html):
 *   1. script.google.com → Dự án mới → dán file này.
 *   2. Chọn hàm capQuyen → Chạy 1 lần (cấp quyền Google Drive).
 *   3. Cài đặt dự án (bánh răng) → Thuộc tính tập lệnh → thêm KHOA = <chuỗi dài tự nghĩ>.
 *   4. Triển khai → Triển khai mới → Ứng dụng web: Thực thi với tư cách "Tôi",
 *      Người có quyền truy cập "Bất kỳ ai" → Triển khai → chép URL /exec.
 *   5. Dán URL + KHOA vào ô "⚙ Trạm Drive" trên doc-so.html (app DataSnap, điện thoại) và nv.html / doc-so.html (máy tính).
 *
 * ĐANG DÙNG BẢN CŨ (có tự xoá)? Dán đè file này → Lưu → Triển khai → Quản lý các lần triển khai → ✏ →
 * Phiên bản: "Phiên bản mới" → Triển khai (URL giữ nguyên). Lịch tự dọn cũ sẽ tự gỡ ở lần chạy kế tiếp.
 */

var TIEN_TO = 'dmx-goi-';   // dmx-goi-<ngày>_<giờ>.json; bản cũ để 'dmx-goi-tam.json' — vẫn đọc được

function doGet() {
  return traVe({ ok: true, ten: 'dmx-drive-relay', tuXoa: false });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var khoa = PropertiesService.getScriptProperties().getProperty('KHOA');
    if (!khoa) return traVe({ ok: false, loi: 'Trạm chưa đặt KHOA trong Thuộc tính tập lệnh.' });
    if (req.khoa !== khoa) return traVe({ ok: false, loi: 'Sai khoá.' });

    if (req.lenh === 'gui') {
      if (!req.duLieu) return traVe({ ok: false, loi: 'Thiếu dữ liệu.' });
      var ten = TIEN_TO + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd_HHmmss') + '.json';
      var f = thuMuc().createFile(ten, JSON.stringify(req.duLieu), 'application/json');
      return traVe({ ok: true, luc: new Date().toISOString(), ten: ten, kichThuoc: f.getSize() });
    }
    if (req.lenh === 'lay') {
      var file = moiNhat();
      if (!file) return traVe({ ok: true, duLieu: null });
      return traVe({ ok: true, duLieu: JSON.parse(file.getBlob().getDataAsString('UTF-8')),
                     luc: file.getDateCreated().toISOString(), ten: file.getName() });
    }
    if (req.lenh === 'xoa') {
      return traVe({ ok: true, daXoa: 0, ghiChu: 'Trạm không xoá gói (lưu trên Drive cá nhân).' });   // trang cũ còn gọi
    }
    return traVe({ ok: false, loi: 'Lệnh lạ: ' + req.lenh });
  } catch (err) {
    return traVe({ ok: false, loi: String(err && err.message || err) });
  }
}

// Gói nằm CÙNG THƯ MỤC với dự án Apps Script này (tạo dự án trong thư mục Drive nào thì gói nằm ở đó).
// Không xác định được thư mục → thư mục gốc My Drive.
function thuMuc() {
  try { var p = DriveApp.getFileById(ScriptApp.getScriptId()).getParents(); if (p.hasNext()) return p.next(); } catch (e) {}
  return DriveApp.getRootFolder();
}

// Tệp gói mới nhất trong thư mục (theo giờ tạo).
function moiNhat() {
  var it = thuMuc().searchFiles("title contains '" + TIEN_TO + "' and trashed = false"), tot = null;
  while (it.hasNext()) {
    var f = it.next();
    if (!/\.json$/i.test(f.getName())) continue;
    if (!tot || f.getDateCreated() > tot.getDateCreated()) tot = f;
  }
  return tot;
}

// Bản cũ cài lịch gọi donDep mỗi giờ để tự xoá. Nay donDep chỉ GỠ lịch đó, không xoá tệp nào.
function donDep() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'donDep') ScriptApp.deleteTrigger(t);
  });
}

function traVe(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Chạy tay 1 lần trong trình soạn thảo để Google hỏi cấp quyền Drive (và gỡ lịch tự xoá của bản cũ nếu có).
function capQuyen() {
  donDep();
  DriveApp.getRootFolder();
}
