/**
 * TRẠM CHUYỂN SỐ ĐIỆN THOẠI → MÁY TÍNH (Google Apps Script, chạy dưới tài khoản Google của anh).
 *
 *   Điện thoại (nhap-so.html) ──gui──▶ 1 file tạm trong Google Drive của anh
 *   Máy tính  (nv.html)        ──lay──▶ đọc file  ──xoa──▶ XOÁ VĨNH VIỄN file (không vào Thùng rác)
 *
 * Dữ liệu chỉ nằm trên Drive trong khoảng giữa lúc gửi và lúc máy tính lấy.
 * Mọi lệnh phải kèm KHOA (chuỗi bí mật, đặt ở Script Properties) — không có khoá thì từ chối.
 *
 * CÀI (làm 1 lần, xem README mục "Nhập số từ điện thoại"):
 *   1. script.google.com → Dự án mới → dán file này.
 *   2. Cài đặt dự án (bánh răng) → Thuộc tính tập lệnh → thêm KHOA = <chuỗi dài tự nghĩ>.
 *   3. Triển khai → Triển khai mới → Ứng dụng web: Thực thi với tư cách "Tôi",
 *      Người có quyền truy cập "Bất kỳ ai" → Triển khai → cấp quyền Drive → chép URL /exec.
 *   4. Dán URL + KHOA vào ô "⚙ Trạm Drive" trên nhap-so.html (điện thoại) và nv.html (máy tính).
 */

var TEN_FILE = 'dmx-goi-tam.json';

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

// Chạy tay 1 lần trong trình soạn thảo để Google hỏi cấp quyền (Drive + gọi mạng).
function capQuyen() {
  DriveApp.getRootFolder();
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user',
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
}
