/*
 * common.js — Các hàm dùng chung cho mọi trang dashboard.
 *
 * Mục đích: trước đây mỗi trang tự viết lại hàm tính ngày, đọc số, định dạng số...
 * nên sửa một lỗi phải sửa nhiều nơi và rất dễ sót (đúng như đã xảy ra với công
 * thức so sánh cùng kỳ). File này là chỗ để gom dần các hàm đó lại.
 *
 * Nạp TRƯỚC mã của trang:
 *   <script src="assets/common.js"></script>
 *
 * Tất cả nằm trong đối tượng Chung để không đụng tên biến của trang.
 */
(function () {
  'use strict';

  var Chung = {};

  // ---------- Ngày tháng ----------

  /**
   * Ngày YYYY-MM-DD theo GIỜ MÁY.
   *
   * KHÔNG dùng new Date().toISOString().slice(0,10) — hàm đó trả về giờ UTC,
   * mà Việt Nam là UTC+7, nên từ 00:00 đến 07:00 sáng nó cho ra ngày hôm trước.
   *
   * Quy ước dữ liệu của hệ thống: bản ghi mang nhãn ngày D chứa số chốt hết
   * ngày D-1 (xem sieuthi.html, chỗ chia lũy kế cho day-1).
   */
  Chung.ngayHomNay = function (date) {
    var d = date || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var ng = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + ng;
  };

  /** '2026-07-22' -> '22/07/2026' */
  Chung.ngayKieuViet = function (isoDate) {
    var p = String(isoDate || '').split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : isoDate;
  };

  // ---------- Số ----------

  /** '1,234' -> 1234 ; '45%' -> 0.45 ; rác -> 0 */
  Chung.docSo = function (str) {
    if (typeof str !== 'string' || !str) return 0;
    var s = str.replace(/,/g, '').trim();
    if (s.endsWith('%')) return parseFloat(s.slice(0, -1)) / 100;
    return parseFloat(s) || 0;
  };

  /** 1234.5 -> '1.234,5' (kiểu Việt Nam) */
  Chung.dinhDangSo = function (num, soLeToiDa) {
    if (isNaN(num)) return '0';
    return num.toLocaleString('vi-VN', {
      maximumFractionDigits: soLeToiDa === undefined ? 2 : soLeToiDa
    });
  };

  /** Bỏ dấu tiếng Việt + ký tự đặc biệt, để so tên giữa các app. */
  Chung.chuanHoaTen = function (name) {
    return String(name || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  };

  // ---------- Thông báo nổi (thay cho alert) ----------

  var hopToast = null;

  /**
   * Hiện thông báo nhỏ ở góc màn hình rồi tự tắt.
   * Khác alert(): không chặn màn hình, không bắt bấm OK.
   *
   * @param {string} noiDung
   * @param {string} loai  'thanhcong' | 'loi' | 'canhbao' | mặc định thông tin
   * @param {number} giay  thời gian hiện, mặc định 3.5s (lỗi thì 6s)
   */
  Chung.thongBao = function (noiDung, loai, giay) {
    if (!hopToast) {
      hopToast = document.createElement('div');
      hopToast.style.cssText =
        'position:fixed;z-index:99999;right:20px;bottom:20px;display:flex;' +
        'flex-direction:column;gap:10px;align-items:flex-end;pointer-events:none;' +
        'max-width:min(420px, calc(100vw - 40px));';
      document.body.appendChild(hopToast);
    }
    var mau = { thanhcong: '#2a9d8f', loi: '#d62828', canhbao: '#f9844a' }[loai] || '#0077b6';
    var icon = { thanhcong: '✅', loi: '⛔', canhbao: '⚠️' }[loai] || 'ℹ️';

    var o = document.createElement('div');
    o.style.cssText =
      'background:' + mau + ';color:#fff;padding:12px 16px;border-radius:10px;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.18);font-size:14px;line-height:1.5;' +
      'font-weight:500;opacity:0;transform:translateY(10px);' +
      // pointer-events:none — thông báo chỉ để đọc, TUYỆT ĐỐI không được chặn thao tác.
      // Trước đây để 'auto' nên toast nằm đè lên bảng là bấm không được vào ô bên dưới.
      'transition:opacity .25s ease,transform .25s ease;pointer-events:none;' +
      'display:flex;gap:10px;align-items:flex-start;';
    var spanIcon = document.createElement('span');
    spanIcon.textContent = icon;
    var spanText = document.createElement('span');
    spanText.textContent = noiDung;   // textContent: không cho HTML lọt vào
    o.appendChild(spanIcon);
    o.appendChild(spanText);
    hopToast.appendChild(o);

    requestAnimationFrame(function () {
      o.style.opacity = '1';
      o.style.transform = 'translateY(0)';
    });

    var ms = (giay || (loai === 'loi' ? 6 : 3.5)) * 1000;
    setTimeout(function () {
      o.style.opacity = '0';
      o.style.transform = 'translateY(10px)';
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 300);
    }, ms);
  };

  // ---------- Nhớ tạm dữ liệu file đã tải lên ----------

  // Vài trang chỉ đọc file Excel rồi hiện kết quả, đóng tab là mất sạch, mở lại
  // phải tải file lên từ đầu. Phần này nhớ lại dữ liệu thô của lần tải gần nhất.
  //
  // CHỈ lưu trên máy, KHÔNG đồng bộ đám mây: một file Excel có thể vài MB, đẩy
  // lên máy chủ mỗi lần đổi là quá nặng và không cần thiết.

  var GIOI_HAN = 3 * 1024 * 1024;   // 3MB — quá cỡ này thì bỏ qua, tránh đầy bộ nhớ trình duyệt

  Chung.NhoTam = {
    luu: function (khoa, duLieu, tenFile) {
      try {
        var goi = JSON.stringify({
          luuLuc: new Date().toISOString(),
          tenFile: tenFile || '',
          duLieu: duLieu
        });
        if (goi.length > GIOI_HAN) {
          console.warn('[NhoTam] Dữ liệu ' + Math.round(goi.length / 1048576) + 'MB, quá lớn để nhớ tạm. Bỏ qua.');
          return false;
        }
        localStorage.setItem(khoa, goi);
        return true;
      } catch (e) {
        console.warn('[NhoTam] Không lưu được (bộ nhớ trình duyệt đầy?):', e);
        return false;
      }
    },

    doc: function (khoa) {
      try {
        var raw = localStorage.getItem(khoa);
        if (!raw) return null;
        var g = JSON.parse(raw);
        if (!g || !g.duLieu) return null;
        return g;
      } catch (e) {
        return null;
      }
    },

    xoa: function (khoa) {
      try { localStorage.removeItem(khoa); } catch (e) {}
    },

    /** 'lúc 14:32 ngày 22/07/2026' — để hiện cho người dùng biết dữ liệu cũ cỡ nào */
    moTaThoiDiem: function (isoTimestamp) {
      var d = new Date(isoTimestamp);
      if (isNaN(d.getTime())) return '';
      var gio = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      return 'lúc ' + gio + ' ngày ' + Chung.ngayKieuViet(Chung.ngayHomNay(d));
    }
  };

  window.Chung = Chung;
})();
