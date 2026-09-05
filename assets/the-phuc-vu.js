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

    /* Dựng HTML thẻ. Trả '' nếu không có số — gọi xong cứ gán thẳng vào DOM.
     *
     * Theo đúng hợp đồng "stat tile" của skill dataviz:
     *   nhãn (viết thường, không hai chấm) · giá trị (đậm, số tỷ lệ tự nhiên)
     *   · delta NGAY TRÊN Ô kèm tên kỳ so sánh · tia xu hướng.
     *
     * Bản trước tôi tách delta xuống một bảng riêng bên dưới — mắt phải nhảy
     * qua lại giữa con số và mức tăng giảm của nó. Nay dán liền nhau.
     *
     * Màu delta = hướng × việc tăng có tốt không. Ở đây tăng là tốt cho cả lượt
     * khách lẫn bill nên xanh = tăng. Đừng bê nguyên quy ước này sang chỉ số mà
     * tăng là xấu (tồn kho, đơn huỷ).
     *
     * ai: 'hero' -> dùng cho panel riêng, con số ≥48px (skill: đúng MỘT con số
     * chủ đạo mỗi màn). Mặc định là thẻ thường cho trang Tổng quan.
     */
    ve: function (kq, ai) {
      if (!kq || kq.thieuSo) return '';
      var hero = (ai === 'hero');
      var so = function (v) { return Number(v || 0).toLocaleString('vi-VN'); };

      var delta = function (v, ky) {
        if (v == null) return '<span class="tpv-trong">chưa có số ' + ky + '</span>';
        var len = v >= 0;
        return '<span class="tpv-d ' + (len ? 'tpv-len' : 'tpv-xuong') + '">' +
          (len ? '▲' : '▼') + ' ' + Math.abs(v).toFixed(1) + '%</span>' +
          '<span class="tpv-ky"> ' + ky + '</span>';
      };
      var o = function (nhan, giaTri, a, b) {
        return '<div class="tpv-o"><div class="tpv-nho">' + nhan + '</div>' +
          '<div class="tpv-vua">' + giaTri + '</div>' +
          '<div class="tpv-delta">' + delta(a, 'cùng kỳ th.trước') + '</div>' +
          '<div class="tpv-delta">' + delta(b, 'cùng kỳ năm trước') + '</div></div>';
      };

      return '<div class="tpv' + (hero ? ' tpv-hero' : '') + '">' +
        '<div class="tpv-dau">' +
          '<h3 class="tpv-tieu">Tỷ lệ phục vụ thành công</h3>' +
          '<div class="tpv-lon">' + kq.tyLe.toFixed(2) + '<small>%</small></div>' +
        '</div>' +
        (kq.tia || '') +
        '<div class="tpv-o2">' +
          o('Lượt khách', so(kq.luotKhach), kq.khachThang, kq.khachNam) +
          o('Lượt bill', so(kq.luotBill), kq.billThang, kq.billNam) +
        '</div></div>';
    },

    /* Tia xu hướng 12 tháng — vẽ bằng SVG, không thư viện.
     * Skill: tia dùng màu nhạt, kỳ hiện tại nhấn bằng màu chính; nét 2px;
     * KHÔNG ghi số lên từng điểm. */
    veTia: function (goi, khoa) {
      if (!goi || !goi.sieuThi) return '';
      var k = String(khoa);
      var st = goi.sieuThi.filter(function (x) {
        return String(x.key) === k || String(x.mwg) === k; })[0];
      if (!st) return '';
      var ms = Object.keys(st.thang).sort().slice(-12);
      var v = ms.map(function (m) {
        var t = st.thang[m];
        // Tháng máy đếm chạy thiếu ngày cho số thấp giả — bỏ hẳn khỏi tia,
        // vẽ vào là tạo ra một cú sụt không có thật.
        var du = (t.soNgay || 0) >= (t.soNgayThang || 30) * 0.9;
        return (du && t.luotVao > 0) ? (t.offBan || 0) / t.luotVao * 100 : null;
      });
      var co = v.filter(function (x) { return x != null; });
      if (co.length < 3) return '';
      var lo = Math.min.apply(null, co), hi = Math.max.apply(null, co);
      var W = 260, H = 34, dai = v.length - 1 || 1;
      var x = function (i) { return (i / dai) * (W - 4) + 2; };
      var y = function (n) { return hi === lo ? H / 2 : H - 4 - ((n - lo) / (hi - lo)) * (H - 8); };
      var d = '', mo = false;
      v.forEach(function (n, i) {
        if (n == null) { mo = false; return; }
        d += (mo ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(n).toFixed(1) + ' ';
        mo = true;
      });
      var cuoi = -1;
      v.forEach(function (n, i) { if (n != null) cuoi = i; });
      return '<div class="tpv-tia"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" ' +
        'role="img" aria-label="Xu hướng tỷ lệ phục vụ 12 tháng">' +
        '<path d="' + d.trim() + '" fill="none" stroke="var(--tpv-nhat)" stroke-width="2" ' +
        'stroke-linejoin="round" stroke-linecap="round"/>' +
        (cuoi >= 0 ? '<circle cx="' + x(cuoi).toFixed(1) + '" cy="' + y(v[cuoi]).toFixed(1) +
          '" r="3.5" fill="var(--tpv-chinh)"/>' : '') +
        '</svg><span class="tpv-tia-nhan">12 tháng · cao nhất ' + hi.toFixed(1) +
        '% · thấp nhất ' + lo.toFixed(1) + '%</span></div>';
    },

    /* CSS nhúng một lần. Màu theo bảng đã kiểm của skill dataviz: một sắc xanh
     * làm màu chính, xanh lá / đỏ chỉ dùng cho trạng thái tăng-giảm. */
    css: function () {
      return '.tpv{--tpv-chinh:#2a78d6;--tpv-nhat:#bcd6f2;' +
        'background:#fff;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.05);' +
        'padding:18px 20px;font-size:13px;color:#0f172a}' +
        '.tpv-dau{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}' +
        '.tpv-tieu{font-size:16px;font-weight:700;color:#1e293b;margin:0}' +
        // Số lớn dùng con số tỷ lệ tự nhiên — tabular-nums làm số cỡ lớn trông rời rạc.
        '.tpv-lon{font-size:34px;font-weight:800;color:var(--tpv-chinh);line-height:1.05;' +
        'font-variant-numeric:proportional-nums}' +
        '.tpv-hero .tpv-lon{font-size:52px}' +
        '.tpv-hero .tpv-dau{display:block}' +
        '.tpv-hero .tpv-tieu{margin-bottom:2px}' +
        '.tpv-lon small{font-size:.42em;font-weight:700;margin-left:2px}' +
        '.tpv-tia{margin:12px 0 2px}' +
        '.tpv-tia svg{width:100%;height:34px;display:block}' +
        '.tpv-tia-nhan{display:block;font-size:10.5px;color:#94a3b8;margin-top:2px}' +
        '.tpv-o2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}' +
        '.tpv-o{background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:9px 11px}' +
        '.tpv-nho{font-size:11px;font-weight:600;color:#64748b}' +
        '.tpv-vua{font-size:22px;font-weight:800;margin:1px 0 4px;' +
        'font-variant-numeric:proportional-nums}' +
        '.tpv-delta{font-size:11px;line-height:1.5;white-space:nowrap}' +
        '.tpv-d{font-weight:700}.tpv-len{color:#15803d}.tpv-xuong{color:#b91c1c}' +
        '.tpv-ky{color:#94a3b8}' +
        '.tpv-trong{color:#cbd5e1;font-style:italic}';
    }
  };
})(window);
