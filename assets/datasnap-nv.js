/* DataSnap → nv.html (08/11/2026)
 * Dựng "gói g" (đúng shape nhap-so.html dựng) từ gói LŨY KẾ DataSnap + thẻ Sức khỏe NV,
 * để nv.html chạy nguyên đường cũ goiThanhCapture → 4 ô → Phân tích & Lưu. KHÔNG sửa bộ phân tích.
 *
 *  ô1 thi đua siêu thị  : bảng Thi đua lũy kế của gói (thực hiện, target, % HT, % dự báo, hạng vùng).
 *  ô2 doanh thu NV      : bảng Nhân viên lũy kế (DTQĐ). App không có DT thực → cột DTLK = DTQĐ.
 *  ô4 trả chậm NV       : DT TRẢ GÓP QĐ ÷ DTQĐ (nền quy đổi như sieuthi.html).
 *  ô3 thi đua TỪNG NV   : có báo cáo "Thi đua CT" cấp nhân viên trong gói → số thật.
 *                         Không có → TÍNH NGƯỢC từ thẻ Sức khỏe: thẻ ghi % từng chương trình của NV,
 *                         DMX tính % = thực hiện NV ÷ (target chương trình của siêu thị ÷ số NV).
 *                         Kiểm 08/11 cụm 14285: cộng ngược khớp 100% số siêu thị ở mọi chương trình
 *                         chỉ do NV chính bán (phần lệch = NV đã chuyển / online / hỗ trợ).
 *                         Sai số do % làm tròn: ±0,5% × (target ÷ số NV). Thẻ là số tới hết HÔM QUA.
 *  NV chính: danh sách thẻ Sức khỏe (app đã lọc theo giờ công). Chưa có thẻ → lọc giờ công trong gói.
 */
(function (W) {
  'use strict';
  function chuan(x) { return String(x || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function r2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function ngayISO(luc) { var m = /^(\d{4}-\d{2}-\d{2})/.exec(String(luc || '')); return m ? m[1] : null; }

  /**
   * @param goi    gói dmxsnap/1 kỳ LŨY KẾ (thô, như app ghi)
   * @param skList SucKhoe.docTatCa() — [{ma, ten, ngay, nv:[thẻ đã tách]}]
   * @returns {g, canhBao:[], uoc:{mãST:true}}  uoc = siêu thị có ô3 là số ƯỚC từ thẻ
   */
  function dungGoi(goi, skList) {
    var D = W.DmxSnap, canhBao = [], uoc = {};
    if (!D) return { loi: 'Thiếu assets/dmxsnap.js' };
    if (!goi || !Array.isArray(goi.lan)) return { loi: 'Chưa có gói DataSnap trên máy.' };
    var kq = D.docGoi(goi);
    if (kq.ky !== 'luyke') return { loi: 'Gói DataSnap đang là ' + (kq.ky || '?') + ' — cần gói LŨY KẾ (app: chế độ Lũy kế → Quét cụm).' };
    kq.canhBao.forEach(function (c) { canhBao.push(c); });
    var gc = goi.gioCong ? D.docGioCong(goi.gioCong) : null;
    var skTheoST = {}; (skList || []).forEach(function (s) { skTheoST[s.ma] = s; });

    var g = { v: 1, nguon: 'datasnap', ngay: ngayISO(goi.luc), thang: null, quyTacLoc: 'Tất cả nhân viên', canhBao: canhBao,
      cum: { siteCode: String(goi.cum || '') }, thiDuaSieuThi: [], thiDuaNhanVien: [], sieuThi: [] };
    if (g.ngay) g.thang = g.ngay.slice(0, 7);

    kq.thuTu.forEach(function (ma) {
      var s = kq.sieuThi[ma], sk = skTheoST[ma], ten = s.ten;
      var td = (s.thiDua || []).filter(function (t) { return t.target > 0 || t.th; });

      // ---- NV chính ----
      var laChinh;
      if (sk && sk.nv.length) {
        var coThe = {}; sk.nv.forEach(function (n) { coThe[n.ma] = 1; });
        laChinh = function (n) { return !!coThe[n.ma]; };
      } else {
        var bang = gc && gc.theoST[ma];
        laChinh = function (n) { return n.chinhThuc && (!bang || !!(bang[n.ma] && bang[n.ma].aio)); };
        canhBao.push(ten + ': chưa có thẻ Sức khỏe — NV chính lọc theo giờ công' + (bang ? '' : ' (gói không có giờ công → lấy mọi NV có mã)') + '.');
      }
      var dsNV = (s.nv || []).filter(laChinh);
      if (sk) sk.nv.forEach(function (c) {   // có thẻ nhưng không có dòng ở tab Nhân viên (chưa bán gì) → vẫn đưa vào, số 0
        if (!dsNV.some(function (n) { return n.ma === c.ma; })) dsNV.push({ ma: c.ma, ten: c.ten, dtqd: 0, traGop: 0 });
      });

      g.sieuThi.push({ ten: ten, mwg: ma, salegroupId: null, lineKey: '',
        tong: { targetQd: (s.tong && s.tong.target) || 0, dtqd: (s.tong && s.tong.dtqd) || 0, traGopQd: (s.tong && s.tong.traGop) || 0 },
        tongHop: null,
        nhanVien: dsNV.map(function (n) {
          var gop = n.traGop || 0;
          return { ten: n.ten, ma: n.ma, thang: { dt: n.dtqd || 0, dtqd: n.dtqd || 0, traCham: gop, traChamQd: gop }, ngayLam: [] };
        }) });

      // ---- ô1: thi đua siêu thị ----
      td.forEach(function (t) {
        var sl = t.loai === 'SL';
        g.thiDuaSieuThi.push({ sieuThi: ten, salegroupId: null, ten: t.ten, dt: sl ? 0 : (t.th || 0), sl: sl ? (t.th || 0) : 0,
          target: t.target || 0, pct: t.ht, pctDuBao: t.duBao, hangVung: t.hang && t.hang !== '—' ? t.hang : null, loai: sl ? 2 : 0 });
      });

      // ---- ô3: thi đua từng NV ----
      var tdNV = s.tdNV && Object.keys(s.tdNV).length ? s.tdNV : null;
      if (tdNV) {
        dsNV.forEach(function (n) {
          var x = tdNV[n.ma]; if (!x) return;
          td.forEach(function (t) {
            var c = x.ct[t.ten], v = c ? c.so || 0 : 0, sl = t.loai === 'SL';
            g.thiDuaNhanVien.push({ mwg: ma, maNv: n.ma, ten: t.ten, dt: sl ? 0 : v, sl: sl ? v : 0, loai: sl ? 2 : 0 });
          });
        });
      } else if (sk && sk.nv.length) {
        uoc[ma] = true;
        var N = sk.nv.length, the = {};
        sk.nv.forEach(function (c) { the[c.ma] = c; });
        dsNV.forEach(function (n) {
          var c = the[n.ma], ct = (c && c.thiDua && c.thiDua.ct) || [];
          td.forEach(function (t) {
            var sl = t.loai === 'SL', m = ct.filter(function (x) { return chuan(x.ten) === chuan(t.ten); })[0];
            var v = m && t.target > 0 ? m.pct / 100 * t.target / N : 0;
            v = sl ? Math.round(v) : r2(v);
            g.thiDuaNhanVien.push({ mwg: ma, maNv: n.ma, ten: t.ten, dt: sl ? 0 : v, sl: sl ? v : 0, loai: sl ? 2 : 0 });
          });
        });
        canhBao.push(ten + ': thi đua từng NV là số ƯỚC từ % trên thẻ Sức khỏe (tới hết ' + (sk.nv[0].denNgay || 'hôm qua') + ').');
      } else {
        canhBao.push(ten + ': không có thẻ Sức khỏe lẫn thi đua cấp NV → ô3 trống, nv.html sẽ không phân tích siêu thị này.');
      }
    });
    return { g: g, canhBao: canhBao, uoc: uoc };
  }

  W.DataSnapNV = { dungGoi: dungGoi };
})(typeof window !== 'undefined' ? window : globalThis);
