/* ==========================================================================
 * THẺ TỶ LỆ PHỤC VỤ THÀNH CÔNG  (lượt bill / lượt khách)
 * ==========================================================================
 * Nguồn: bc/luotkhach_cum<mã>.json trên Supabase, do dmx-realtime-auto gom từ
 * hai báo cáo của baocao.dienmayxanh.com và đẩy lên mỗi ngày một lần.
 *
 * ĐỊNH NGHĨA BILL — chỗ dễ sai nhất:
 * Đo 05/09/2026 kho 14285 giai đoạn 01→04/09, baocao hiện 132 bill / 974 khách
 * = 13,55%. Tổng bill bán hàng cả Offline lẫn Online là 148, cộng thêm thu hộ
 * thành 194 — không khớp cái nào. Chỉ riêng Offline mới ra 132. Hợp lý: "tỷ lệ
 * phục vụ thành công" đo khách BƯỚC VÀO CỬA, đơn Online đâu đến từ lượt khách
 * vào siêu thị. Gói số lưu đủ 4 loại nên đổi định nghĩa chỉ cần sửa hàm này.
 *
 * BỘ ĐẾM KHÁCH HỎNG THẤT THƯỜNG: kho 14285 tháng 9 và 10/2025 không có dòng
 * nào, tháng 11/2025 chỉ 22/30 ngày. Nên tháng nào thiếu ngày thì ẨN HẲN phần
 * so sánh chứ không hiện 0 hay ↓100% — nhìn như sập doanh thu, mà thật ra chỉ
 * là hỏng máy đếm. Ngưỡng: phải có ít nhất 90% số ngày của tháng.
 */
(function (global) {
  'use strict';

  var SB = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  var KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';

  function maThang(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function luiThang(n) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); return maThang(d); }

  // Bill tính vào tỷ lệ phục vụ = CHỈ Offline (xem ghi chú đầu file).
  function soBill(t) { return (t.offBan || 0) + 0; }

  // Tháng đáng tin khi máy đếm chạy gần đủ ngày.
  //
  // Tháng ĐANG chạy chỉ đòi đủ tới HÔM QUA, không đòi tới hôm nay: gói số gom
  // một lần mỗi ngày và bản thân máy đếm cũng thường trễ một ngày. Đòi tới hôm
  // nay là sáng nào thẻ cũng biến mất rồi chiều mới hiện lại — đã dính đúng lúc
  // chạy thử ngày 05/09/2026 (có số tới 04/09, bị chấm là thiếu).
  function dangTin(t, maT) {
    if (!t || !t.luotVao) return false;
    var nay = maThang(new Date());
    var can = (maT === nay) ? Math.max(1, new Date().getDate() - 1) : (t.soNgayThang || 30);
    return (t.soNgay || 0) >= can * 0.9;
  }

  function tang(nay, truoc) {
    if (!truoc) return null;
    return (nay - truoc) / truoc * 100;
  }

  global.ThePhucVu = {
    /* Đọc gói số của cụm. Trả null nếu chưa có (cụm chưa chạy bản mới). */
    doc: function (maCum) {
      var so = String(maCum || '').replace(/\D/g, '');
      if (!so) return Promise.resolve(null);
      return fetch(SB + '/storage/v1/object/public/bc/luotkhach_cum' + so + '.json?t=' + Date.now())
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    },

    /* Tính các con số cho MỘT siêu thị (theo key nội bộ hoặc mã MWG). */
    tinh: function (goi, khoa) {
      if (!goi || !goi.sieuThi) return null;
      var k = String(khoa);
      var st = goi.sieuThi.filter(function (x) {
        return String(x.key) === k || String(x.mwg) === k;
      })[0];
      if (!st) return null;

      var nay = maThang(new Date());
      var tNay = st.thang[nay];
      if (!dangTin(tNay, nay)) return { ten: st.ten, thieuSo: true };

      var billNay = soBill(tNay);
      var kq = {
        ten: st.ten,
        luotKhach: tNay.luotVao,
        luotBill: billNay,
        tyLe: tNay.luotVao > 0 ? billNay / tNay.luotVao * 100 : 0,
        khachThang: null, khachNam: null, billThang: null, billNam: null
      };

      // SO CÙNG KỲ, không so với tổng tháng.
      //
      // Đem 4 ngày đầu tháng này so với cả 31 ngày tháng trước thì ra "giảm
      // 88%" — số đúng về phép tính nhưng vô nghĩa, mà lại nhìn như sập tiệm.
      // Gói số đã có sẵn khối cungKy (ngày 1 → cùng ngày của tháng trước / năm
      // trước) nên chỉ việc dùng. Gói cũ chưa có khối đó thì ẩn phần so sánh,
      // KHÔNG quay về so với tổng tháng.
      var ck = st.cungKy || {};
      var duCK = function (c) {
        return c && c.luotVao > 0 && (c.soNgay || 0) >= (c.soNgayCan || 1) * 0.9;
      };
      if (duCK(ck.thangTruoc)) {
        kq.khachThang = tang(tNay.luotVao, ck.thangTruoc.luotVao);
        kq.billThang = tang(billNay, soBill(ck.thangTruoc));
      }
      if (duCK(ck.namTruoc)) {
        kq.khachNam = tang(tNay.luotVao, ck.namTruoc.luotVao);
        kq.billNam = tang(billNay, soBill(ck.namTruoc));
      }
      return kq;
    },

    /* Dựng HTML thẻ. Trả '' nếu không có số — gọi xong cứ gán thẳng vào DOM. */
    ve: function (kq) {
      if (!kq || kq.thieuSo) return '';
      var so = function (v) { return Number(v || 0).toLocaleString('vi-VN'); };
      var mui = function (v) {
        if (v == null) return '';   // không đủ số để so -> ẩn hẳn, không hiện 0
        var len = v >= 0;
        return '<span class="tpv-mui ' + (len ? 'tpv-len' : 'tpv-xuong') + '">' +
          (len ? '▲' : '▼') + ' ' + Math.abs(v).toFixed(1) + '%</span>';
      };
      var dong = function (nhan, a, b) {
        var oA = a == null ? '<span class="tpv-trong">chưa có số</span>' : mui(a);
        var oB = b == null ? '<span class="tpv-trong">chưa có số</span>' : mui(b);
        return '<div class="tpv-dong"><span class="tpv-nhan">' + nhan + '</span>' +
          '<span>cùng kỳ th.trước ' + oA + '</span><span>cùng kỳ năm trước ' + oB + '</span></div>';
      };
      return '<div class="tpv">' +
        '<div class="tpv-dau">TỶ LỆ PHỤC VỤ THÀNH CÔNG</div>' +
        '<div class="tpv-lon">' + kq.tyLe.toFixed(2) + '<small>%</small></div>' +
        '<div class="tpv-o2">' +
          '<div class="tpv-o"><div class="tpv-nho">LƯỢT KHÁCH</div><div class="tpv-vua">' + so(kq.luotKhach) + '</div></div>' +
          '<div class="tpv-o"><div class="tpv-nho">LƯỢT BILL</div><div class="tpv-vua">' + so(kq.luotBill) + '</div></div>' +
        '</div>' +
        dong('Khách', kq.khachThang, kq.khachNam) +
        dong('Bill', kq.billThang, kq.billNam) +
        '</div>';
    },

    /* CSS nhúng một lần. Tự dùng biến màu của trang nếu có. */
    css: function () {
      return '.tpv{background:linear-gradient(160deg,#2563eb,#1d4ed8);color:#fff;border-radius:14px;' +
        'padding:14px 16px;font-size:13px}' +
        '.tpv-dau{font-weight:800;letter-spacing:.4px;font-size:12px;opacity:.92}' +
        '.tpv-lon{font-size:38px;font-weight:800;line-height:1.15;margin:2px 0 10px}' +
        '.tpv-lon small{font-size:16px;font-weight:700;margin-left:2px}' +
        '.tpv-o2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}' +
        '.tpv-o{background:rgba(255,255,255,.16);border-radius:9px;padding:7px 10px}' +
        '.tpv-nho{font-size:10px;opacity:.9;font-weight:700;letter-spacing:.3px}' +
        '.tpv-vua{font-size:20px;font-weight:800}' +
        '.tpv-dong{display:grid;grid-template-columns:44px 1fr 1fr;gap:6px;align-items:center;' +
        'font-size:11px;padding:3px 0;border-top:1px solid rgba(255,255,255,.18)}' +
        '.tpv-nhan{font-weight:700;opacity:.9}' +
        '.tpv-mui{font-weight:800}.tpv-len{color:#bbf7d0}.tpv-xuong{color:#fecaca}' +
        '.tpv-trong{opacity:.55;font-style:italic}';
    }
  };
})(window);
