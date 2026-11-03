/* ===================================================================
 * DmxSnap — đọc GÓI THÔ "dmxsnap/1" do app DataSnap chụp từ DMXWork
 * (màn "Doanh thu hợp nhất"). App chỉ chụp bảng, KHÔNG tự hiểu số;
 * mọi phân loại nằm ở đây để sửa/kiểm một chỗ.
 *
 * Gói:
 *   { dinhDang:'dmxsnap/1', nguon, luc:ISO, cum:'14285',
 *     lan:[ { ky:'realtime'|'luyke', nen:'dtqd', sieuThi:{ma,ten}, the:'Thi đua',
 *             capNhat:'08:38:59 3/11/2026', chu:[chữ ngoài lưới, theo thứ tự],
 *             luoi:[ [ {o:[ô...], cap:'cha'|''} ...hàng ] ...GridView ] } ] }
 *   Ô = text của nút, rỗng thì contentDescription (tiêu đề cột nằm ở desc).
 *   cap='cha' khi hàng có nút "Mở rộng dòng"/"Thu gọn dòng".
 *
 * Phân loại bảng theo TIÊU ĐỀ (không theo tên thẻ đã bấm):
 *   CHƯƠNG TRÌNH…            → thi đua   (tên "T11 - Máy giặt DT")
 *   NGÀNH HÀNG BI…           → ngành BI  (tên "7 - Máy giặt, sấy")
 *   NHÂN VIÊN…               → nhân viên (mã ≥3 số) + ngành con (mã 1–2 số)
 *   Siêu thị + "Tổng doanh thu" → tổng hợp; Siêu thị/Khu vực/Vùng → doanh thu
 * Bảng của lượt nào không khớp siêu thị đang lọc / kỳ đã ghi → BỎ, ghi cảnh báo.
 * =================================================================== */
(function (goc) {
  'use strict';

  function so(s) {
    if (s == null) return null;
    var t = String(s).trim().split(/\s+/)[0].replace(/,/g, '').replace(/%$/, '');
    if (t === '' || t === '—' || t === '-') return null;
    var n = parseFloat(t);
    return isFinite(n) ? n : null;
  }
  function khongDau(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }

  var DAU_BANG = /^(CHƯƠNG TRÌNH|NGÀNH HÀNG BI|NHÂN VIÊN|Siêu thị|Khu vực|Vùng)/;
  function laTieuDe(o) {
    if (!o || o.length < 2 || !DAU_BANG.test(o[0])) return false;
    return o.slice(1).every(function (c) { return !/^([-+]?[\d.,]+%?|—)$/.test(c.split(' ')[0]); }) &&
      o.slice(1).some(function (c) { return /[A-ZĐ]{2,}/.test(c); });
  }
  function loaiBang(tieuDe, hang) {
    var c0 = tieuDe[0];
    if (/^CHƯƠNG TRÌNH/.test(c0)) return 'thiDua';
    if (/^NGÀNH HÀNG BI/.test(c0)) return 'nganh';
    if (/^NHÂN VIÊN/.test(c0)) return 'nhanVien';
    if (hang.some(function (h) { return /^Tổng doanh thu/.test(h.o[0]); })) return 'tongHop';
    return 'doanhThu';
  }
  // kỳ suy từ tiêu đề cột: có NGÀY = realtime; có THÁNG/DỰ BÁO = lũy kế; không rõ = null
  function kyTheoTieuDe(tieuDe) {
    var s = tieuDe.join(' ').replace(/TB \d+ THÁNG/g, '');   // "TB 3 THÁNG" có ở cả 2 kỳ
    if (/NGÀY/.test(s)) return 'realtime';
    if (/THÁNG|DỰ BÁO|DỰ KIẾN/.test(s)) return 'luyke';
    return null;
  }

  // gộp mọi GridView của 1 lượt thành các bảng {tieuDe, loai, hang[], tong}
  function tachBang(lan) {
    var bang = [], cur = null;
    (lan.luoi || []).forEach(function (g) {
      (g || []).forEach(function (h) {
        var o = (h.o || []).map(function (c) { return String(c == null ? '' : c).trim(); });
        if (!o.length || !o[0]) return;
        if (laTieuDe(o)) { cur = { tieuDe: o, hang: [], tong: null }; bang.push(cur); return; }
        if (!cur) return;
        if (/^Tổng \(\d+ dòng\)/.test(o[0])) { cur.tong = o; return; }
        if (o[0] === 'Trống') return;
        cur.hang.push({ o: o, cap: h.cap || '' });
      });
    });
    bang.forEach(function (b) { b.loai = loaiBang(b.tieuDe, b.hang); b.ky = kyTheoTieuDe(b.tieuDe); });
    return bang;
  }

  // chỉ số cột theo tên tiêu đề (regex); không có → -1
  function cot(tieuDe, re) {
    for (var i = 1; i < tieuDe.length; i++) if (re.test(tieuDe[i])) return i;
    return -1;
  }
  function lay(o, i) { return i < 0 ? null : so(o[i]); }
  function maTen(s) {
    var m = String(s || '').match(/^(\d+)\s*-\s*(.*)$/);
    return m ? { ma: m[1], ten: m[2].trim() } : { ma: '', ten: String(s || '').trim() };
  }

  function docThiDua(b) {
    var cTH = cot(b.tieuDe, /^THỰC HIỆN/), cTG = cot(b.tieuDe, /^TARGET/),
      cHT = cot(b.tieuDe, /^% HT/), cDB = cot(b.tieuDe, /DỰ BÁO|DỰ KIẾN/), cHg = cot(b.tieuDe, /^HẠNG/);
    var ds = [];
    b.hang.forEach(function (h) {
      var m = h.o[0].match(/^T(\d{1,2})\s*-\s*(.*?)\s+(DT|SL)$/);
      if (!m) return;                               // hàng con (tên siêu thị) khi xem cấp gộp
      var ht = lay(h.o, cHT), duBao = lay(h.o, cDB);
      // Lũy kế gộp 2 số vào 1 ô "% DỰ KIẾN HOÀN THÀNH": "HT 1.3% 17.3% Dự kiến hoàn thành 17.3%, hiện đạt 1.3%"
      var gop = cDB < 0 ? null : String(h.o[cDB] || '').match(/^HT\s+([-+]?[\d.,]+)%\s+([-+]?[\d.,]+)%/);
      if (gop) { if (ht == null) ht = so(gop[1]); duBao = so(gop[2]); }
      ds.push({
        tenDu: h.o[0], ten: m[2].trim(), loai: m[3], thang: +m[1],
        th: lay(h.o, cTH), target: lay(h.o, cTG), ht: ht,
        duBao: duBao, hang: cHg < 0 ? null : (String(h.o[cHg] || '').trim() || null)
      });
    });
    return ds;
  }
  function docNganh(b) {
    var cSL = cot(b.tieuDe, /^SỐ LƯỢNG/), cDT = cot(b.tieuDe, /^DOANH THU/), cTT = cot(b.tieuDe, /TỈ TRỌNG/);
    var ds = [];
    b.hang.forEach(function (h) {
      if (!/^\d{1,2}\s*-\s*/.test(h.o[0])) return;  // nhóm/sản phẩm khi lỡ mở rộng: bỏ
      var mt = maTen(h.o[0]);
      ds.push({ ma: mt.ma, ten: mt.ten, sl: lay(h.o, cSL), dtqd: lay(h.o, cDT), tiTrong: lay(h.o, cTT) });
    });
    return ds;
  }
  function docNhanVien(b) {
    var t = b.tieuDe;
    var c = {
      sl: cot(t, /^SỐ LƯỢNG/), dt: cot(t, /^DOANH THU/), vay: cot(t, /KHOẢN VAY/), tt: cot(t, /TỈ TRỌNG/),
      thang: cot(t, /TRẢ THẲNG/), gop: cot(t, /TRẢ GÓP/), nhap: cot(t, /NHẬP TRẢ/)
    };
    function dong(o) {
      return { sl: lay(o, c.sl), dtqd: lay(o, c.dt), khoanVay: lay(o, c.vay), tiTrong: lay(o, c.tt),
        traThang: lay(o, c.thang), traGop: lay(o, c.gop), nhapTra: lay(o, c.nhap) };
    }
    var nv = [], cuoi = null;
    b.hang.forEach(function (h) {
      var nhan = h.o[0];
      var laNganh = /^\d{1,2}\s*-\s*/.test(nhan);
      if (!laNganh) {                                // dòng nhân viên (hoặc Online/administrator…)
        var mt = maTen(nhan), x = dong(h.o);
        x.ma = mt.ma; x.ten = mt.ten || nhan; x.nhan = nhan; x.nganh = [];
        x.chinhThuc = /^\d{3,}$/.test(mt.ma);         // không có mã NV → xếp "NV khác / online"
        nv.push(x); cuoi = x;
      } else if (cuoi) {
        var mn = maTen(nhan), y = dong(h.o); y.ma = mn.ma; y.ten = mn.ten;
        cuoi.nganh.push(y);
      }
    });
    return nv;
  }
  function docDoanhThu(b, ma) {
    var t = b.tieuDe;
    var c = { sl: cot(t, /^SỐ LƯỢNG/), dt: cot(t, /^DOANH THU/), tg: cot(t, /^TARGET/), ht: cot(t, /^% HT/),
      tt: cot(t, /TỈ TRỌNG/), db: cot(t, /^%.*(DỰ BÁO|DỰ KIẾN)/), dbTien: cot(t, /^DT (DỰ BÁO|DỰ KIẾN)/) };
    var r = { dong: null, khac: [] };
    b.hang.forEach(function (h) {
      var mt = maTen(h.o[0]);
      if (mt.ma === String(ma)) {
        // Lũy kế 03/11: "DT DỰ KIẾN" là TIỀN cả tháng (tr) → % dự báo = tiền ÷ target
        var d = { nhan: h.o[0], sl: lay(h.o, c.sl), dtqd: lay(h.o, c.dt), target: lay(h.o, c.tg),
          ht: lay(h.o, c.ht), duBao: lay(h.o, c.db), duKienTien: lay(h.o, c.dbTien) };
        if (d.duBao == null && d.duKienTien != null && d.target) d.duBao = Math.round(d.duKienTien / d.target * 1000) / 10;
        r.dong = d;
      } else r.khac.push(h.o[0]);
    });
    return r;
  }
  function docTongHop(b) {
    var t = b.tieuDe, h = null;
    b.hang.forEach(function (x) { if (/^Tổng doanh thu/.test(x.o[0])) h = x; });
    if (!h) return null;
    return { sl: lay(h.o, cot(t, /^SỐ LƯỢNG/)), dtqd: lay(h.o, cot(t, /^DOANH THU/)),
      traThang: lay(h.o, cot(t, /TRẢ THẲNG/)), traGop: lay(h.o, cot(t, /TRẢ GÓP/)), nhapTra: lay(h.o, cot(t, /NHẬP TRẢ/)) };
  }
  // thẻ KPI: nhãn rồi giá trị ở vài chữ kế tiếp
  function kpi(chu, reNhan) {
    for (var i = 0; i < chu.length; i++) {
      if (!reNhan.test(chu[i])) continue;
      var ra = { nhan: chu[i], giaTri: null, phu: null };
      for (var j = i + 1; j < Math.min(chu.length, i + 6); j++) {
        if (ra.giaTri == null && /^[-\d.,]+%?$/.test(chu[j])) ra.giaTri = so(chu[j]);
        else if (ra.giaTri != null && !ra.phu) { ra.phu = chu[j]; break; }
      }
      return ra;
    }
    return null;
  }

  // ===== dựng kết quả theo siêu thị cho 1 gói (1 kỳ) =====
  function docGoi(goi) {
    var kq = { ky: null, luc: goi && goi.luc, nguon: goi && goi.nguon, sieuThi: {}, thuTu: [], canhBao: [] };
    if (!goi || goi.dinhDang !== 'dmxsnap/1' || !Array.isArray(goi.lan)) {
      kq.canhBao.push('Không phải gói dmxsnap/1.'); return kq;
    }
    goi.lan.forEach(function (lan) {
      var st = lan.sieuThi || {}, ma = String(st.ma || '');
      var ten = '[' + (st.ten || ma) + ' · ' + lan.the + ' · ' + lan.ky + '] ';
      if (!ma) { kq.canhBao.push(ten + 'thiếu mã siêu thị — bỏ.'); return; }
      if (!kq.ky) kq.ky = lan.ky;
      if (lan.ky !== kq.ky) { kq.canhBao.push(ten + 'khác kỳ với gói — bỏ.'); return; }
      var chu = lan.chu || [];
      // chốt chặn 1: bộ lọc trên màn phải đúng siêu thị của lượt này
      var loc = chu.filter(function (s) { return /^Siêu thị (\d+ - |Chọn)/.test(s); })[0];
      if (loc && loc.indexOf('Siêu thị ' + ma + ' - ') !== 0) {
        kq.canhBao.push(ten + 'bộ lọc trên màn là "' + loc.replace(/ Xóa bộ lọc$/, '') + '" — bỏ để khỏi lẫn số.'); return;
      }
      var s = kq.sieuThi[ma];
      if (!s) {
        s = kq.sieuThi[ma] = { ma: ma, ten: st.ten || ma, capNhat: '', tong: {}, thiDua: [], nganh: [], nv: [], daDoc: {} };
        kq.thuTu.push(ma);
      }
      if (lan.capNhat) {
        lan.capNhat = String(lan.capNhat).replace(/^Cập nhật lúc:\s*/, '');   // app 5.0 để nguyên tiền tố
        var ngay = lan.capNhat.split(' ')[1] || '';
        if (s.ngay && ngay && ngay !== s.ngay) kq.canhBao.push(ten + 'chụp ngày ' + ngay + ', các bảng khác ngày ' + s.ngay + ' — số có thể lệch nhau.');
        if (!s.ngay) s.ngay = ngay;
        if (lan.capNhat > s.capNhat) s.capNhat = lan.capNhat;
      }
      var tl = kpi(chu, /^TLPVTC/);
      if (tl && tl.giaTri != null) { s.tong.tlpvtc = tl.giaTri; s.tong.tlpvtcPhu = tl.phu; }
      // "Target trọn kỳ 8,075 · tiến độ 6.7%" = phần tháng đã qua → dự báo khi ô "Dự kiến" chưa bật
      chu.forEach(function (c) { var m = /tiến độ\s*([\d.,]+)%/.exec(c); if (m) s.tong.tienDo = so(m[1]); });

      tachBang(lan).forEach(function (b) {
        // chốt chặn 2: tiêu đề cột phải cùng kỳ với lượt
        if (b.ky && b.ky !== lan.ky) { kq.canhBao.push(ten + 'bảng ' + b.loai + ' có cột của kỳ ' + b.ky + ' — bỏ.'); return; }
        if (b.loai === 'thiDua') { s.thiDua = docThiDua(b); s.daDoc.thiDua = 1; }
        else if (b.loai === 'nganh') { s.nganh = docNganh(b); s.daDoc.nganh = 1; }
        else if (b.loai === 'nhanVien') { s.nv = docNhanVien(b); s.daDoc.nhanVien = 1; }
        else if (b.loai === 'tongHop') {
          var th = docTongHop(b);
          if (th) { ['traThang', 'traGop', 'nhapTra'].forEach(function (k) { if (th[k] != null) s.tong[k] = th[k]; }); s.daDoc.tongHop = 1; }
        } else if (b.loai === 'doanhThu') {
          var dt = docDoanhThu(b, ma);
          if (dt.khac.length) kq.canhBao.push(ten + 'bảng doanh thu có dòng lạ: ' + dt.khac.join(', '));
          if (!dt.dong) { kq.canhBao.push(ten + 'bảng doanh thu không có dòng ' + ma + ' — bỏ.'); return; }
          ['sl', 'dtqd', 'target', 'ht', 'duBao', 'duKienTien'].forEach(function (k) { if (dt.dong[k] != null) s.tong[k] = dt.dong[k]; });
          s.daDoc.doanhThu = 1;
        }
      });
    });
    kq.thuTu.forEach(function (ma) {
      var s = kq.sieuThi[ma], t = s.tong;
      if (kq.ky === 'luyke' && t.duBao == null && t.tienDo > 0 && t.target) {
        var ht = t.ht != null ? t.ht : t.dtqd / t.target * 100;
        t.duBao = Math.round(ht / t.tienDo * 1000) / 10;
        t.duKienTien = Math.round(t.target * t.duBao / 100);
      }
      ['doanhThu', 'tongHop', 'thiDua', 'nhanVien'].forEach(function (k) {
        if (!s.daDoc[k]) kq.canhBao.push('[' + s.ten + '] chưa đọc được bảng ' + k + '.');
      });
    });
    return kq;
  }

  var api = { docGoi: docGoi, tachBang: tachBang, so: so, khongDau: khongDau };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else goc.DmxSnap = api;
})(this);
