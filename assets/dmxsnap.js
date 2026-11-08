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
    // "TB 3 THÁNG" có ở cả 2 kỳ; 08/11 DMX thêm "DT DỰ KIẾN" vào cả bảng ngành Realtime → bỏ cả 2 trước khi đoán kỳ
    var s = tieuDe.join(' ').replace(/TB \d+ THÁNG/g, '').replace(/(^|\s)DT DỰ KIẾN(?=\s|$)/g, ' ');
    if (/NGÀY/.test(s)) return 'realtime';
    if (/THÁNG|DỰ BÁO|DỰ KIẾN/.test(s)) return 'luyke';
    return null;
  }

  // app 5.0 nối chữ trùng của 1 ô: "T11 - Sim DT T11 - Sim DT" → "T11 - Sim DT"
  function boLap(s) {
    var n = s.length;
    if (n % 2 === 1) { var a = s.slice(0, (n - 1) / 2); if (s === a + ' ' + a) return a; }
    return s;
  }
  // gộp mọi GridView của 1 lượt thành các bảng {tieuDe, loai, hang[], tong}
  function tachBang(lan) {
    var bang = [], cur = null;
    (lan.luoi || []).forEach(function (g) {
      (g || []).forEach(function (h) {
        var o = (h.o || []).map(function (c) { return boLap(String(c == null ? '' : c).trim()); });
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
    var m = String(s || '').match(/^(-?\d+)\s*-\s*(.*)$/);   // "-1 - CHƯA PHÂN LOẠI"
    if (m) return { ma: m[1], ten: m[2].trim() };
    // 08/11 DMX đổi dòng nhân viên thành "Nguyễn Như Đồng id: 141445"
    var n = String(s || '').match(/^(.*?)\s*id:\s*(\d+)\s*$/i);
    return n ? { ma: n[2], ten: n[1].trim() } : { ma: '', ten: String(s || '').trim() };
  }

  function docThiDua(b) {
    var cTH = cot(b.tieuDe, /^THỰC HIỆN/), cTG = cot(b.tieuDe, /^TARGET/),
      cHT = cot(b.tieuDe, /^% HT/), cDB = cot(b.tieuDe, /DỰ BÁO|DỰ KIẾN/), cHg = cot(b.tieuDe, /^HẠNG/);
    var ds = [];
    // Tên chương trình DMX đổi theo tháng ("T11 - Sim DT" → 08/11 "Thi đua tập trung CE LG DT", "Sim ĐMX SL"…).
    // KHÔNG dựa vào kiểu tên: mọi dòng của bảng CHƯƠNG TRÌNH là 1 chương trình, trừ dòng tên siêu thị / Tổng / Trống.
    // Tiền tố tháng "Txx -", "★", "Thi đua tập trung" đều tuỳ chọn; đuôi DT/SL không có thì đoán theo cột THỰC HIỆN.
    b.hang.forEach(function (h) {
      var nhan = String(h.o[0] || '').trim();
      if (!nhan || /^\d{3,}\s*-/.test(nhan) || /^(TỔNG|Tổng)\b/.test(nhan) || nhan === 'Trống') return;   // dòng con = siêu thị
      if (h.cap && h.cap !== 'cha') return;
      var sao = /^★/.test(nhan); nhan = nhan.replace(/^★\s*/, '');
      var mT = nhan.match(/^T(\d{1,2})\s*-\s*/); if (mT) nhan = nhan.slice(mT[0].length);
      var mL = nhan.match(/\s+(DT|SL)$/), loai;
      if (mL) { loai = mL[1]; nhan = nhan.slice(0, -mL[0].length); }
      else loai = /[.,]\d{2}$/.test(String(h.o[cTH] || '')) ? 'DT' : 'SL';
      var tapTrung = /^Thi đua tập trung\s/i.test(nhan);
      var m = [null, mT ? mT[1] : null, nhan, loai];
      var ht = lay(h.o, cHT), duBao = lay(h.o, cDB);
      // Lũy kế gộp 2 số vào 1 ô "% DỰ KIẾN HOÀN THÀNH": "HT 1.3% 17.3% Dự kiến hoàn thành 17.3%, hiện đạt 1.3%"
      var gop = cDB < 0 ? null : String(h.o[cDB] || '').match(/^HT\s+([-+]?[\d.,]+)%\s+([-+]?[\d.,]+)%/);
      if (gop) { if (ht == null) ht = so(gop[1]); duBao = so(gop[2]); }
      ds.push({
        // "Thi đua tập trung CE LG" → "CE LG": khớp tên cũ (★ mặc định, lựa chọn đã lưu); tapTrung = DMX đánh dấu trọng tâm
        tenDu: h.o[0], ten: m[2].replace(/^Thi đua tập trung\s+/i, '').trim(), tapTrung: tapTrung || sao,
        loai: m[3], thang: m[1] ? +m[1] : null,
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
      if (!/^-?\d{1,2}\s*-\s*/.test(h.o[0])) return;  // nhóm/sản phẩm khi lỡ mở rộng: bỏ
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
      var laNganh = /^-?\d{1,2}\s*-\s*/.test(nhan);
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
    var cDT = cot(t, /^DOANH THU/);
    var r = { sl: lay(h.o, cot(t, /^SỐ LƯỢNG/)), dtqd: lay(h.o, cDT),
      traThang: lay(h.o, cot(t, /TRẢ THẲNG/)), traGop: lay(h.o, cot(t, /TRẢ GÓP/)), nhapTra: lay(h.o, cot(t, /NHẬP TRẢ/)) };
    // không bật cột trả góp (Realtime) → lấy hàng "Bán trả góp", cột DOANH THU
    if (r.traGop == null) b.hang.forEach(function (x) { if (/^Bán trả góp/.test(x.o[0])) r.traGop = lay(x.o, cDT); });
    return r;
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

  /* ===== Báo cáo "Thi đua" riêng của DMXWork (app 5.8): lượt the='Thi đua CT', chu[0]='CAP=sieuthi'|'CAP=nhanvien'
   * luoi = [tiêu đề 1 dòng, bảng, tiêu đề, bảng…] — mỗi chương trình 1 cặp.
   *   Siêu thị  Lũy kế : ★ T11 - CE LG | DOANH THU | TARGET | % HT THÁNG | % DỰ BÁO | HẠNG VÙNG | TOP/BOTTOM VÙNG
   *             Realtime: … | DOANH THU (RT) | TARGET (ngày) | % HT NGÀY | % DỰ BÁO (—) | HẠNG VÙNG | …
   *             dòng: TỔNG · "ĐMM_HNO_LBI - Ngọc Thụy" (tên, KHÔNG có mã)
   *   Nhân viên (chỉ Lũy kế): … | DOANH THU|SỐ LƯỢNG | HẠNG TRONG ST | TOP/BOTTOM ST | BỘ PHẬN | SIÊU THỊ
   *             dòng: TỔNG · "155467 - Tên" … "8807 - ĐMM_HNO_LBI - Ngọc Thụy"; "online - Online - 18001060" (không mã)
   * Tên chương trình bỏ "T11 - " để khớp bảng thi đua cũ (bỏ đuôi DT/SL). ★ = chương trình được đánh dấu trọng tâm. */
  function tenCT(s) { return String(s || '').replace(/^★\s*/, '').replace(/^T\d{1,2}\s*-\s*/, '').replace(/^Thi đua tập trung\s+/i, '').trim(); }
  function docThiDuaCT(lan) {
    var cap = /CAP=(\w+)/.exec((lan.chu || [])[0] || ''); cap = cap ? cap[1] : '';
    var g = lan.luoi || [], ds = [];
    for (var k = 0; k + 1 < g.length; k += 2) {
      var td = ((g[k][0] || {}).o || []).map(function (c) { return String(c || '').trim(); });
      if (!td[0] || td.length < 3 || !td.slice(1).some(function (x) { return /^TARGET/.test(x); })) continue;   // tiêu đề chương trình: nhận theo cột TARGET, không theo tên
      var c = { so: 1, tg: cot(td, /^TARGET/), ht: cot(td, /^% HT/), db: cot(td, /DỰ BÁO/),
        hang: cot(td, /^HẠNG/), tb: cot(td, /^TOP/), st: cot(td, /^SIÊU THỊ/) };
      var ct = { ten: tenCT(td[0]), sao: /^★/.test(td[0]), loai: /SỐ LƯỢNG/.test(td[1] || '') ? 'SL' : 'DT', tong: null, dong: [] };
      (g[k + 1] || []).forEach(function (h) {
        var o = (h.o || []).map(function (x) { return String(x == null ? '' : x).trim(); });
        if (!o[0]) return;
        var d = { nhan: o[0], so: lay(o, c.so), tg: lay(o, c.tg), ht: lay(o, c.ht), db: lay(o, c.db),
          hang: c.hang < 0 ? null : (so(o[c.hang]) != null ? so(o[c.hang]) : null),
          tb: c.tb < 0 ? '' : (/^(TOP|BOTTOM)$/.test(o[c.tb]) ? o[c.tb] : '') };
        if (o[0] === 'TỔNG') { ct.tong = d; return; }
        if (cap === 'nhanvien') {
          var mt = maTen(o[0]); d.ma = mt.ma; d.ten = mt.ma ? mt.ten : o[0].replace(/\s*-\s*\d{6,}$/, '');
          d.chinhThuc = /^\d{3,}$/.test(mt.ma);
          var ms = /^(\d+)\s*-/.exec(c.st < 0 ? '' : o[c.st] || ''); d.st = ms ? ms[1] : '';
        } else {
          d.tenST = o[0].split(' - ').pop().trim();
        }
        ct.dong.push(d);
      });
      ds.push(ct);
    }
    return { cap: cap, ky: lan.ky, capNhat: String(lan.capNhat || '').replace(/^Cập nhật lúc:\s*/, ''), ds: ds };
  }

  // ===== dựng kết quả theo siêu thị cho 1 gói (1 kỳ) =====
  function docGoi(goi) {
    var kq = { ky: null, luc: goi && goi.luc, nguon: goi && goi.nguon, sieuThi: {}, thuTu: [], canhBao: [] };
    if (!goi || goi.dinhDang !== 'dmxsnap/1' || !Array.isArray(goi.lan)) {
      kq.canhBao.push('Không phải gói dmxsnap/1.'); return kq;
    }
    var ctLan = [];
    goi.lan.forEach(function (lan) {
      if (lan.the === 'Thi đua CT') { ctLan.push(lan); return; }   // báo cáo Thi đua riêng — gắn vào siêu thị ở cuối
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
        if (b.loai === 'thiDua') {
          var td = docThiDua(b);
          // 18:24 03/11: chụp lúc màn còn "Đang tải..." → bảng chỉ có "Trống"
          if (!td.length) { kq.canhBao.push(ten + 'bảng thi đua trống (chụp khi trang còn đang tải?) — quét lại.'); return; }
          s.thiDua = td; s.daDoc.thiDua = 1;
        }
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
      // App chưa bật được ô "Dự kiến" ở bảng Doanh thu → mượn hệ số dự kiến/HT của chính DMX trong bảng thi đua cùng gói
      // (vd 3,7% → 22% = ×5,95 ngày 06/11: số ngày tháng ÷ số ngày đã qua). Lấy trung vị để bỏ dòng làm tròn lệch.
      if (kq.ky === 'luyke' && t.duBao == null && t.target) {
        var hs = (s.thiDua || []).filter(function (x) { return x.ht >= 1 && x.duBao != null; })
          .map(function (x) { return x.duBao / x.ht; }).sort(function (a, b) { return a - b; });
        if (hs.length >= 3) {
          var hsGiua = hs[Math.floor(hs.length / 2)], ht2 = t.ht != null ? t.ht : t.dtqd / t.target * 100;
          t.heSoDuKien = Math.round(hsGiua * 100) / 100;
          t.duBao = Math.round(ht2 * hsGiua * 10) / 10;
          t.duKienTien = Math.round(t.target * t.duBao / 100);
          t.duBaoUoc = true;                               // ước theo hệ số thi đua, không phải cột của DMX
        }
      }
      if (kq.ky === 'luyke' && t.heSoDuKien == null && t.duBao != null && t.ht > 0) t.heSoDuKien = Math.round(t.duBao / t.ht * 100) / 100;
      ['doanhThu', 'tongHop', 'thiDua', 'nhanVien'].forEach(function (k) {
        if (!s.daDoc[k]) kq.canhBao.push('[' + s.ten + '] chưa đọc được bảng ' + k + '.');
      });
    });
    // Thi đua chi tiết → s.tdCT = [{ten, sao, loai, so, tg, ht, db, hang, tb}] (cấp siêu thị)
    //                    s.tdNV = {mãNV: {ten, chinhThuc, ct:{tênCT: {so, hang, tb, loai}}}} (cấp nhân viên, lũy kế)
    kq.thiDuaCT = { capNhat: '' };
    ctLan.forEach(function (lan) {
      var r = docThiDuaCT(lan);
      if (r.capNhat > kq.thiDuaCT.capNhat) kq.thiDuaCT.capNhat = r.capNhat;
      kq.thiDuaCT[r.cap] = r;
      if (!r.ds.length) kq.canhBao.push('[Thi đua chi tiết · ' + r.cap + '] chưa đọc được chương trình nào.');
      r.ds.forEach(function (ct) {
        ct.dong.forEach(function (d) {
          var s = null;
          if (r.cap === 'nhanvien') s = kq.sieuThi[d.st];
          else kq.thuTu.forEach(function (m) {
            var t = kq.sieuThi[m].ten;
            if (!s && (d.tenST === t || khongDau(d.tenST) === khongDau(t) || khongDau(t).slice(-khongDau(d.tenST).length) === khongDau(d.tenST))) s = kq.sieuThi[m];
          });
          if (!s) return;                                  // siêu thị ngoài cụm đang xem
          if (r.cap === 'nhanvien') {
            var key = d.ma || d.ten, x = (s.tdNV = s.tdNV || {})[key] = (s.tdNV || {})[key] || { ma: d.ma, ten: d.ten, chinhThuc: d.chinhThuc, ct: {} };
            x.ct[ct.ten] = { so: d.so, hang: d.hang, tb: d.tb, loai: ct.loai };
          } else {
            (s.tdCT = s.tdCT || []).push({ ten: ct.ten, sao: ct.sao, loai: ct.loai, so: d.so, tg: d.tg, ht: d.ht, db: d.db, hang: d.hang, tb: d.tb });
          }
        });
      });
    });
    return kq;
  }

  /* Giờ công (gói.gioCong, app 5.5): bảng "Giờ Công Làm Việc" của DMXWork, đủ mọi trang.
   *   { tu:'28/10/2026', den:'03/11/2026', tong:87, tieuDe:['NGÀY',…,'PHÒNG BAN',…], hang:[[ô…]…] }
   * → { theoST:{mãST:{mãNV:{pb, cv, aio}}}, tu, den, du } — aio = có ngày làm ở "BP All In One".
   * NV chính = phòng ban BP All In One theo giờ công của đúng siêu thị đó (không bao giờ xét doanh thu). */
  function docGioCong(gc) {
    if (!gc || !Array.isArray(gc.hang) || !gc.hang.length) return null;
    var t = (gc.tieuDe || []).map(function (x) { return String(x || '').trim().toUpperCase(); });
    function i(re, mac) { for (var k = 0; k < t.length; k++) if (re.test(t[k])) return k; return mac; }
    var c = { st: i(/^SIÊU THỊ/, 2), nv: i(/^NHÂN VIÊN/, 3), pb: i(/^PHÒNG BAN/, 5), cv: i(/^CHỨC VỤ/, 6) };
    var theoST = {};
    gc.hang.forEach(function (o) {
      var st = /^(\d+)\s*-/.exec(String(o[c.st] || '')), nv = /^(\d+)\s*-/.exec(String(o[c.nv] || ''));
      if (!st || !nv) return;                          // dòng TỔNG / tiêu đề lặp
      var pb = String(o[c.pb] || ''), x = (theoST[st[1]] = theoST[st[1]] || {});
      var y = x[nv[1]] = x[nv[1]] || { pb: pb, cv: String(o[c.cv] || ''), aio: false };
      if (/all in one/i.test(pb)) { y.aio = true; y.pb = pb; }
    });
    return { theoST: theoST, tu: gc.tu, den: gc.den, du: !gc.tong || gc.hang.length >= gc.tong };
  }

  var api = { docGoi: docGoi, docGioCong: docGioCong, tachBang: tachBang, so: so, khongDau: khongDau };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else goc.DmxSnap = api;
})(this);
