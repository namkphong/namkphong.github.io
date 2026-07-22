/*
 * bi-parse.js — Đọc 3 ô dữ liệu BI mà người dùng dán vào nv.html.
 *
 * Vì sao cần: file 77 chia doanh thu theo cột "Người tạo", mà doanh thu còn được
 * ghi nhận qua ĐỔI MÃ BÁN HÀNG nên cột đó không bao hàm hết. Số theo nhân viên
 * của BI mới là số chuẩn. File này bóc số BI ra khỏi kho dữ liệu của nv.html để
 * các trang khác dùng lại.
 *
 * Ba ô trong nv.html:
 *   ô 1 targetInput  — Target & lũy kế NGÀNH HÀNG (2 bảng: SLLK và DTLK)
 *   ô 2 revenueInput — Doanh thu NHÂN VIÊN (DTLK, DTQĐ)
 *   ô 4 creditInput  — Trả góp theo nhân viên (DT Siêu thị, Tỷ trọng trả chậm)
 *
 * ĐƠN VỊ: số trong nv.html tính bằng TRIỆU ĐỒNG. Mọi hàm ở đây trả về ĐỒNG.
 *
 * Lưu ý: ba ô lấy từ ba báo cáo BI khác nhau nên tổng của chúng KHÔNG bằng nhau
 * (đo trên dữ liệu 22/07/2026: ô2 = 3.123,15tr · ô4 = 3.191,93tr · ô1 = 3.320,70tr).
 * Đó là khác biệt có sẵn của BI, không phải lỗi. Quy ước đã chốt: tổng siêu thị
 * lấy theo Ô 2 để cộng các thẻ nhân viên ra đúng tổng.
 */
(function () {
  'use strict';

  var TRIEU = 1000000;

  function so(x) {
    if (x === null || x === undefined) return 0;
    var s = String(x).replace(/,/g, '').replace(/%/g, '').trim();
    if (!s) return 0;
    var v = parseFloat(s);
    return isFinite(v) ? v : 0;
  }

  function cotCua(dong) {
    return String(dong).split('\t').map(function (c) { return c.trim(); });
  }

  function laDongTong(ten) {
    return String(ten || '').trim().toLowerCase() === 'tổng';
  }

  /** Tách "Nguyễn Như Đồng - 141445" -> { ten, ma } */
  function tachTenMa(chuoi) {
    var m = String(chuoi || '').match(/^(.*?)[-–]\s*(\d{3,})\s*$/);
    if (m) return { ten: m[1].trim(), ma: m[2] };
    return { ten: String(chuoi || '').trim(), ma: '' };
  }

  // ---------- Ô 2: doanh thu nhân viên ----------
  // Nhân viên	DTLK	DTQĐ	Hiệu quả QĐ	Số lượng	Đơn giá
  // Tổng	3,123.15	4,227.69	...
  // Nguyễn Như Đồng - 141445	610.90	812.99	...
  function docDoanhThuNhanVien(text) {
    var kq = { tong: null, nhanVien: [], phongBan: [] };
    if (!text) return kq;

    String(text).split('\n').forEach(function (dong) {
      if (!dong.trim()) return;
      var c = cotCua(dong);
      if (c.length < 3) return;
      var nhan = c[0];
      if (!nhan || /^nhân viên$/i.test(nhan)) return;   // dòng tiêu đề

      var muc = {
        dtThuc: so(c[1]) * TRIEU,
        dtQuyDoi: so(c[2]) * TRIEU,
        soLuong: c.length > 4 ? so(c[4]) : null
      };

      if (laDongTong(nhan)) { kq.tong = muc; return; }

      var tm = tachTenMa(nhan);
      if (tm.ma) {
        muc.ma = tm.ma; muc.ten = tm.ten;
        kq.nhanVien.push(muc);
      } else {
        // "BP All In One - ĐMX", "BP Quản Lý Siêu Thị - ĐMX"...
        muc.ten = tm.ten;
        kq.phongBan.push(muc);
      }
    });
    return kq;
  }

  // ---------- Ô 4: trả góp theo nhân viên ----------
  // Phần đầu ô là khối tiêu đề nhiều dòng, dữ liệu bắt đầu từ dòng "Tổng".
  // Hai cột CUỐI của mỗi dòng là "DT Siêu thị (*)" và "Tỷ Trọng Trả Chậm (%)".
  function docTraGopNhanVien(text) {
    var kq = { tong: null, nhanVien: [] };
    if (!text) return kq;

    String(text).split('\n').forEach(function (dong) {
      if (!dong.trim()) return;
      var c = cotCua(dong).filter(function (x, i, a) { return !(x === '' && i === a.length - 1); });
      if (c.length < 3) return;
      var nhan = c[0];
      if (!nhan) return;

      var dtST = so(c[c.length - 2]) * TRIEU;
      var tyTrong = so(c[c.length - 1]);
      if (dtST <= 0) return;   // dòng tiêu đề hoặc dòng rỗng

      var muc = {
        ten: tachTenMa(nhan).ten,
        ma: tachTenMa(nhan).ma,
        dtSieuThi: dtST,
        tyTrongTraGop: tyTrong,
        dtTraGop: dtST * tyTrong / 100
      };
      if (laDongTong(nhan)) kq.tong = muc; else kq.nhanVien.push(muc);
    });
    return kq;
  }

  // ---------- Ô 1: ngành hàng ----------
  // Ô này chứa 2 bảng nối nhau. Bảng SLLK (số lượng) và bảng DTLK (doanh thu).
  // Chỉ lấy bảng DTLK. Nhận biết bằng dòng tiêu đề có chữ "DTLK".
  function docNganhHang(text) {
    var kq = { tong: null, nganhHang: [] };
    if (!text) return kq;

    var dangTrongBangDT = false;
    String(text).split('\n').forEach(function (dong) {
      if (!dong.trim()) return;
      var c = cotCua(dong);
      var nhan = c[0];

      if (/ngành hàng/i.test(nhan)) {                 // dòng tiêu đề
        dangTrongBangDT = c.some(function (x) { return /^DTLK$/i.test(x); });
        return;
      }
      if (!dangTrongBangDT || c.length < 3) return;

      var muc = {
        ten: nhan,
        dtThuc: so(c[1]) * TRIEU,
        target: so(c[2]) * TRIEU,
        phanTramHT: c.length > 3 ? so(c[3]) : null
      };
      if (laDongTong(nhan)) kq.tong = muc; else if (muc.ten) kq.nganhHang.push(muc);
    });
    return kq;
  }

  // ---------- Gộp: đọc cả kho dữ liệu nv.html ----------

  /**
   * @param {object} json  nội dung file JSON xuất từ nv.html (có thể bọc 1 lớp)
   * @param {string} tenSieuThi  tên siêu thị cần lấy; bỏ trống thì lấy lastSelected
   * @returns {object|null} { sieuThi, ngayChotSo, ngayBanGhi, tuNgay, denNgay,
   *                          doanhThu, traGop, nganhHang, targetSieuThi }
   */
  function docKhoNv(json, tenSieuThi) {
    var j = json;
    if (j && !j.supermarkets) {
      var boc = Object.keys(j).find(function (k) {
        return j[k] && typeof j[k] === 'object' && j[k].supermarkets;
      });
      if (boc) j = j[boc];
    }
    if (!j || !j.supermarkets) return null;

    var ten = tenSieuThi;
    if (!ten || !j.supermarkets[ten]) {
      var keys = Object.keys(j.supermarkets);
      if (tenSieuThi) {
        // dò khớp lỏng theo tên (bỏ dấu)
        var chuan = window.Chung ? window.Chung.chuanHoaTen(tenSieuThi) : tenSieuThi.toLowerCase();
        ten = keys.find(function (k) {
          var kc = window.Chung ? window.Chung.chuanHoaTen(k) : k.toLowerCase();
          return kc === chuan || chuan.indexOf(kc) !== -1 || kc.indexOf(chuan) !== -1;
        });
      }
      if (!ten) ten = (j.lastSelected && j.supermarkets[j.lastSelected]) ? j.lastSelected : keys[0];
    }
    if (!ten) return null;

    var hist = (j.supermarkets[ten] && j.supermarkets[ten].history) || {};
    var ngays = Object.keys(hist).sort();
    if (!ngays.length) return null;

    var ngayBanGhi = ngays[ngays.length - 1];
    var h = hist[ngayBanGhi] || {};

    // QUY ƯỚC: bản ghi mang nhãn ngày D chứa số CHỐT HẾT ngày D-1.
    var d = new Date(ngayBanGhi + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    var ngayChotSo = window.Chung ? window.Chung.ngayHomNay(d) : ngayBanGhi;
    var dauThang = ngayChotSo.slice(0, 8) + '01';

    return {
      sieuThi: ten,
      ngayBanGhi: ngayBanGhi,
      ngayChotSo: ngayChotSo,
      tuNgay: dauThang,
      denNgay: ngayChotSo,
      targetSieuThi: (parseFloat(String(h.supermarketTarget || '').replace(/,/g, '')) || 0) * TRIEU,
      doanhThu: docDoanhThuNhanVien(h.revenueInput),
      traGop: docTraGopNhanVien(h.creditInput),
      nganhHang: docNganhHang(h.targetInput)
    };
  }

  window.BIParse = {
    docDoanhThuNhanVien: docDoanhThuNhanVien,
    docTraGopNhanVien: docTraGopNhanVien,
    docNganhHang: docNganhHang,
    docKhoNv: docKhoNv
  };
})();
