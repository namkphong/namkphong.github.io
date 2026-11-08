/* ===================================================================
 * assets/suc-khoe.js — đọc thẻ "Sức khỏe nhân viên" của DMXWork (app DataSnap 5.8 chụp chữ thô)
 * và tính target từng NV (chỉnh tay thay cho chia đều).
 *
 * Gói dmxsnap/1 có thêm:  sucKhoe: [ {sieuThi:{ma,ten}, ngay:"dd/MM/yyyy", boQua:[…], nv:[{ma,ten,chu:[…]}]} ]
 * "chu" = chữ trên thẻ theo thứ tự (bắt đầu "Sức khỏe nhân viên · T11/2026").
 *
 * Quy tắc DMX (kiểm tay 08/11/2026):
 *   MT (target tháng NV) = target siêu thị ÷ số NV được tính  (chia đều)
 *   % TARGET = DTQĐ ÷ (MT × ngày đã qua / số ngày tháng)       (số tới hết hôm qua)
 * Trang này cho chỉnh target từng NV; tổng vẫn = target siêu thị. Lưu máy: skn_target_v1.
 * =================================================================== */
(function (W) {
  'use strict';

  function so(s) {   // "192.3 tr" → 192.3 · "365,068" → 365068 · "121%" → 121 · "–" → null
    if (s == null) return null;
    var t = String(s).replace(/tr|%|đ/gi, '').trim();
    if (!t || /^[–-]$/.test(t)) return null;
    if (/,/.test(t) && !/\./.test(t)) t = t.replace(/,/g, '');
    else t = t.replace(/,/g, '');
    var v = parseFloat(t);
    return isNaN(v) ? null : v;
  }

  var NHOM = ['DOANH THU', 'NĂNG SUẤT', 'HIỆU QUẢ', 'ĐƠN GIÁ', 'THI ĐUA'];

  /** chữ thô 1 thẻ → đối tượng. Không bám vị trí cứng: tìm theo nhãn. */
  function tach(c) {
    c = (c || []).map(function (x) { return String(x).trim(); });
    var r = { chiSo: {}, nhom: {}, khaiThac: [], thiDua: { ct: [], chuaCoSo: [], khongTarget: [] }, donGia: [], tyTrong: [], theoThang: [], nhanXet: [] };
    var i, m;
    // dòng định danh "155467 · BP All In One - ĐMX · ĐMM_HNO_LBI - Ngọc Thụy"
    i = c.findIndex(function (x) { return /^\d+ · .+ · .+$/.test(x); });
    if (i >= 0) {
      m = c[i].match(/^(\d+) · (.*?) · (.*)$/);
      r.ma = m[1]; r.boPhan = m[2]; r.sieuThi = m[3];
      r.ten = c[i - 1];
      var d = c.slice(0, i).findIndex(function (x) { return /^\/\d+$/.test(x); });
      if (d > 0) { r.diem = so(c[d - 1]); r.diemMax = so(c[d].slice(1)); }
    }
    c.some(function (x) { m = x.match(/^Hạng (\d+) \/ (\d+)/); if (m) { r.hang = +m[1]; r.soNV = +m[2]; } return !!m; });
    c.some(function (x) {
      m = x.match(/^Hoàn thành ([\d.]+)%\s*·\s*Tháng (\d+\/\d{4})\s*·\s*(\d+)\/(\d+) ngày/);
      if (m) { r.hoanThanh = +m[1]; r.thang = m[2]; r.ngayQua = +m[3]; r.ngayThang = +m[4]; }
      return !!m;
    });
    c.some(function (x) { m = x.match(/^Số tới hết ngày ([\d\/]+)/); if (m) r.denNgay = m[1]; return !!m; });
    // 5 nhóm điểm: "DOANH THU", "5", "/", "6"
    NHOM.forEach(function (k) {
      for (var j = 0; j < c.length - 3; j++) if (c[j] === k && c[j + 2] === '/') { r.nhom[k] = { d: so(c[j + 1]), max: so(c[j + 3]) }; break; }
    });
    r.nhanXet = c.filter(function (x) { return /^[★●▲▼⚠✓✗]/.test(x) && x.length > 6 && !/^[✓✗✕] /.test(x); });

    var iKT = c.indexOf('HIỆU QUẢ KHAI THÁC');
    var iTD = c.findIndex(function (x, k) { return x === 'THI ĐUA' && k > 40 && /^[✓✗✕!●]|Đạt|Chưa|Không/.test(c[k + 1] || ''); });
    var iDG = c.findIndex(function (x, k) { return x === 'ĐƠN GIÁ' && k > 40 && /^\d+\/\d+$/.test(c[k + 1] || ''); });
    var iTT = c.indexOf('TỶ TRỌNG NGÀNH HÀNG');
    var iTH = c.indexOf('DOANH THU QĐ TỪNG THÁNG');

    // Chỉ số: NHÃN, (↑/↓), (TB x), (MT x), giá trị — vùng trước khai thác + vùng đơn giá
    function laNhan(x, k) {
      if (!x || x.length > 40 || /ⓘ|^\d|^TB [\d.,]|^MT |^[↑↓]/.test(x)) return false;
      if (x !== x.toUpperCase() || !/[A-ZĐ]/.test(x)) return false;
      if (/^\d+\/\d+$/.test(c[k + 1] || '') || c[k + 2] === '/') return false;   // tiêu đề nhóm: "5/6" hoặc "5","/","6"
      return /^[↑↓]|^TB |^MT |^[–-]$|^[\d.,]+( tr)?%?$/.test(c[k + 1] || '');
    }
    function docChiSo(tu, den, dich) {
      for (var k = tu; k >= 0 && k < den; k++) {
        if (!laNhan(c[k], k)) continue;
        var o = { tb: null, mt: null, gt: null, xu: '' }, j = k + 1;
        for (; j < Math.min(den, k + 6); j++) {
          var y = c[j];
          if (/^[↑↓]/.test(y)) o.xu = y.charAt(0);
          else if (/^TB /.test(y)) o.tb = so(y.slice(3));
          else if (/^MT /.test(y)) o.mt = so(y.slice(3));
          else { o.gt = so(y); o.chu = y; break; }
        }
        dich(c[k], o); k = j;
      }
    }
    docChiSo(0, iKT < 0 ? (iTD < 0 ? c.length : iTD) : iKT, function (n, o) { r.chiSo[n] = o; });
    if (iDG >= 0) docChiSo(iDG + 2, iTT < 0 ? c.length : iTT, function (n, o) { r.donGia.push({ ten: n, gt: o.gt, tb: o.tb, xu: o.xu }); });

    // Hiệu quả khai thác: "% Phụ kiện", "40%" (thang so với 100% TB)
    if (iKT >= 0) for (var k = iKT; k < (iTD < 0 ? c.length : iTD); k++)
      if (/^% /.test(c[k]) && /%$|^[–-]$/.test(c[k + 1] || '')) { r.khaiThac.push({ ten: c[k].slice(2), pct: so(c[k + 1]) }); k++; }

    // Thi đua
    if (iTD >= 0) {
      var td = r.thiDua, het = iDG > iTD ? iDG : c.length;
      td.trangThai = c[iTD + 1];
      for (k = iTD; k < het; k++) {
        var x = c[k];
        if ((m = x.match(/^so với TB siêu thị ([\d.,-]+)%$/))) { td.tbST = so(m[1]); if (/%$/.test(c[k + 1] || '')) td.nv = so(c[k + 1]); }
        else if ((m = x.match(/^(\d+)\/(\d+) chương trình đạt$/))) { td.dat = +m[1]; td.tong = +m[2]; }
        else if ((m = x.match(/^(Đạt|Gần đạt|Cần cố gắng|Chưa có số) (\d+)$/))) td[{ 'Đạt': 'soDat', 'Gần đạt': 'soGan', 'Cần cố gắng': 'soCan', 'Chưa có số': 'soChua' }[m[1]]] = +m[2];
        else if ((m = x.match(/^Chưa có số liệu \(\d+\):\s*(.*)$/))) td.chuaCoSo = m[1].split(' · ').filter(Boolean);
        else if ((m = x.match(/^Siêu thị không có target[^:]*:\s*(.*)$/))) td.khongTarget = m[1].split(' · ').filter(Boolean);
      }
      var s0 = c.findIndex(function (y, j) { return j > iTD && /^Chưa có số \d+$/.test(y); });
      if (s0 < 0) s0 = c.findIndex(function (y, j) { return j > iTD && /chương trình đạt$/.test(y); });
      for (k = s0 + 1; s0 >= 0 && k < het; k++) {
        if (/^Chưa có số liệu|^Siêu thị không có target/.test(c[k])) break;
        if (!/%$/.test(c[k]) && /^-?[\d.,]+%$/.test(c[k + 1] || '')) { td.ct.push({ ten: c[k], pct: so(c[k + 1]) }); k++; }
      }
    }
    // Tỷ trọng ngành hàng
    if (iTT >= 0) for (k = iTT + 1; k < (iTH < 0 ? c.length : iTH); k++)
      if (!/%$|ⓘ/.test(c[k]) && /^[\d.,]+%$/.test(c[k + 1] || '')) { r.tyTrong.push({ ten: c[k], pct: so(c[k + 1]) }); k++; }
    // DTQĐ từng tháng: "341.3", "06/2026"
    if (iTH >= 0) for (k = iTH + 1; k < c.length; k++)
      if (/^\d\d\/\d{4}$/.test(c[k])) r.theoThang.push({ thang: c[k], dtqd: so(c[k - 1]) });

    var dt = r.chiSo['DOANH THU QĐ'] || {}, pt = r.chiSo['% TARGET'] || {};
    r.dtqd = dt.gt; r.dtqdTB = dt.tb; r.mt = pt.mt; r.pctTarget = pt.gt;
    return r;
  }

  /* ---------- nguồn dữ liệu ---------- */
  var K_GOI = 'dmxsnap_goi_v1', K_SK = 'skn_goi_v1', K_TG = 'skn_target_v1';
  function jget(k, mac) { try { return JSON.parse(localStorage.getItem(k) || 'null') || mac; } catch (e) { return mac; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function ngayNum(s) { var m = /(\d\d)\/(\d\d)\/(\d{4})/.exec(s || ''); return m ? +(m[3] + m[2] + m[1]) : 0; }

  /** Gom thẻ: gói của doc-so (cùng máy) + bản đã nạp tay. Mỗi siêu thị lấy bản ngày mới nhất. */
  function docTatCa() {
    var ds = [], g = jget(K_GOI, {});
    ['realtime', 'luyke'].forEach(function (k) { if (g[k] && Array.isArray(g[k].sucKhoe)) ds = ds.concat(g[k].sucKhoe); });
    ds = ds.concat(jget(K_SK, []));
    var theoST = {};
    ds.forEach(function (s) {
      if (!s || !s.sieuThi || !Array.isArray(s.nv) || !s.nv.length) return;
      var cu = theoST[s.sieuThi.ma];
      if (!cu || ngayNum(s.ngay) >= ngayNum(cu.ngay)) theoST[s.sieuThi.ma] = s;
    });
    return Object.keys(theoST).map(function (ma) {
      var s = theoST[ma];
      return { ma: ma, ten: s.sieuThi.ten, ngay: s.ngay, boQua: s.boQua || [],
        nv: s.nv.map(function (n) { var t = tach(n.chu); t.ma = t.ma || n.ma; t.ten = t.ten || n.ten; return t; }) };
    });
  }

  /** Nạp tay: gói dmxsnap/1 (có sucKhoe), tệp dmxsnap-suckhoe.json (mảng) hoặc 1 siêu thị. */
  function napTay(chuoi) {
    var g; try { g = typeof chuoi === 'string' ? JSON.parse(chuoi) : chuoi; } catch (e) { return 'loi: JSON hỏng'; }
    var ds = Array.isArray(g) ? g : (g && Array.isArray(g.sucKhoe) ? g.sucKhoe : (g && g.sieuThi && g.nv ? [g] : null));
    if (!ds || !ds.length) return 'loi: tệp không có thẻ Sức khỏe (cần app DataSnap 5.8)';
    var cu = jget(K_SK, []).filter(function (s) { return !ds.some(function (d) { return d.sieuThi && s.sieuThi && d.sieuThi.ma === s.sieuThi.ma; }); });
    if (!jset(K_SK, cu.concat(ds))) return 'loi: bộ nhớ máy đầy';
    return 'ok: ' + ds.map(function (s) { return (s.sieuThi || {}).ten + ' ' + (s.nv || []).length + ' NV'; }).join(' · ');
  }

  /* ---------- target từng NV ----------
   * skn_target_v1 = { mãST: { thang:"11/2026", tong:số|null, nv:{mãNV:triệu}, khoa:{mãNV:1}, cach:"deu|nangluc|tay" } }
   * Sang tháng mới (thang khác) → bỏ bản cũ, về chia đều DMX. */
  function tongDMX(st) { var mt = (st.nv.find(function (n) { return n.mt; }) || {}).mt || 0; return mt * st.nv.length; }

  function bangTarget(st) {
    var all = jget(K_TG, {}), thang = (st.nv[0] || {}).thang || '';
    var b = all[st.ma];
    if (!b || b.thang !== thang) b = { thang: thang, tong: null, nv: {}, khoa: {}, cach: 'deu' };
    var tong = b.tong != null ? b.tong : tongDMX(st);
    var tg = {}, coSua = false;
    st.nv.forEach(function (n) { if (b.nv[n.ma] != null) { tg[n.ma] = b.nv[n.ma]; coSua = true; } });
    if (!coSua) st.nv.forEach(function (n) { tg[n.ma] = st.nv.length ? tong / st.nv.length : 0; });
    else st.nv.forEach(function (n) { if (tg[n.ma] == null) tg[n.ma] = 0; });   // NV mới vào giữa tháng: 0 tới khi chỉnh
    return { thang: thang, tong: tong, tongDMX: tongDMX(st), tg: tg, khoa: b.khoa || {}, cach: coSua ? b.cach || 'tay' : 'deu' };
  }
  function luuTarget(st, bt) {
    var all = jget(K_TG, {});
    all[st.ma] = { thang: bt.thang, tong: Math.abs(bt.tong - bt.tongDMX) < 0.05 ? null : bt.tong, nv: bt.tg, khoa: bt.khoa, cach: bt.cach };
    return jset(K_TG, all);
  }
  function xoaTarget(st) { var all = jget(K_TG, {}); delete all[st.ma]; jset(K_TG, all); }

  /** Chia phần còn lại (tổng − người đã khoá) cho người chưa khoá, theo tỷ lệ [trongSo]. */
  function canLai(st, bt, trongSo) {
    var mo = st.nv.filter(function (n) { return !bt.khoa[n.ma]; });
    var daKhoa = st.nv.reduce(function (a, n) { return a + (bt.khoa[n.ma] ? bt.tg[n.ma] || 0 : 0); }, 0);
    var con = bt.tong - daKhoa;
    var ts = mo.map(function (n) { return Math.max(0, trongSo ? trongSo(n) : (bt.tg[n.ma] || 0)); });
    var tongTS = ts.reduce(function (a, v) { return a + v; }, 0);
    mo.forEach(function (n, i) { bt.tg[n.ma] = Math.max(0, tongTS > 0 ? con * ts[i] / tongTS : con / mo.length); });
    return con;
  }
  /** Năng lực = DTQĐ trung bình 3 tháng đủ gần nhất (bỏ tháng đang chạy). NV chưa đủ số → lấy TB nhóm. */
  function nangLuc(n) {
    var ds = (n.theoThang || []).filter(function (x) { return x.thang !== n.thang && x.dtqd != null; }).slice(-3);
    return ds.length ? ds.reduce(function (a, x) { return a + x.dtqd; }, 0) / ds.length : null;
  }

  /** Chỉ số theo target đã chỉnh. */
  function tinh(n, target) {
    var q = n.ngayQua || 0, t = n.ngayThang || 30, dt = n.dtqd || 0;
    var r = { target: target, dtqd: dt };
    r.pctTienDo = target > 0 && q > 0 ? dt / (target * q / t) * 100 : null;      // cùng công thức % TARGET của DMX
    r.duKien = q > 0 ? dt / q * t : null;
    r.pctDuKien = target > 0 && r.duKien != null ? r.duKien / target * 100 : null;
    r.canMoiNgay = t - q > 0 ? Math.max(0, target - dt) / (t - q) : null;
    r.nhipHienTai = q > 0 ? dt / q : null;
    return r;
  }

  W.SucKhoe = { tach: tach, so: so, docTatCa: docTatCa, napTay: napTay, bangTarget: bangTarget, luuTarget: luuTarget,
    xoaTarget: xoaTarget, canLai: canLai, nangLuc: nangLuc, tinh: tinh, tongDMX: tongDMX };
})(typeof window !== 'undefined' ? window : globalThis);
