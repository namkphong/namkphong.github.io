/* ===================================================================
 * assets/suc-khoe-ui.js — mục "Sức khỏe NV (DMXWork)" của nv.html
 *   · Tổng hợp NV   · Trang cá nhân   · Chỉnh target (thay chia đều)
 * Số lấy từ thẻ "Sức khỏe nhân viên" do app DataSnap 5.8 chụp (assets/suc-khoe.js đọc).
 * Chỉ dùng localStorage của máy này — không gửi đi đâu.
 * =================================================================== */
(function (W) {
  'use strict';
  var S = W.SucKhoe, K_XEM = 'skn_xem_v1';
  var X = (function () { try { return JSON.parse(localStorage.getItem(K_XEM) || 'null') || {}; } catch (e) { return {}; } })();
  X.tab = X.tab || 'tong';
  var DS = [], el = null;

  function luuXem() { try { localStorage.setItem(K_XEM, JSON.stringify(X)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function f1(v) { return v == null || isNaN(v) ? '—' : (Math.round(v * 10) / 10).toLocaleString('vi-VN'); }
  function f0(v) { return v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('vi-VN'); }
  function pc(v) { return v == null || isNaN(v) ? '—' : f0(v) + '%'; }
  function mau(p) { return p == null ? 'text-gray-400' : p >= 100 ? 'text-emerald-600' : p >= 80 ? 'text-amber-600' : 'text-rose-600'; }
  function nen(p) { return p == null ? 'bg-gray-300' : p >= 100 ? 'bg-emerald-500' : p >= 80 ? 'bg-amber-400' : 'bg-rose-500'; }
  function thanh(p, max) { var w = p == null ? 0 : Math.max(2, Math.min(100, p / (max || 100) * 100)); return '<div class="h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-2 ' + nen(p) + '" style="width:' + w + '%"></div></div>'; }

  function stHienTai() { var s = DS.find(function (x) { return x.ma === X.st; }) || DS[0]; if (s) X.st = s.ma; return s; }

  function ve() {
    el = el || document.getElementById('skn-content');
    if (!el || !S) return;
    DS = S.docTatCa();
    var st = stHienTai();
    var dau = '<div class="flex flex-wrap items-center gap-2 mb-4">' +
      DS.map(function (s) { return '<button data-st="' + esc(s.ma) + '" class="px-3 py-1.5 rounded-full text-sm font-semibold ' + (st && s.ma === st.ma ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + '">' + esc(s.ten || s.ma) + ' · ' + s.nv.length + ' NV</button>'; }).join('') +
      '<label class="ml-auto px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-300 cursor-pointer hover:bg-gray-50">📂 Nạp tệp<input id="skn-tep" type="file" accept=".json,application/json" class="hidden"></label></div>';
    if (!st) {
      el.innerHTML = dau + '<div class="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm leading-6">' +
        '<b>Chưa có thẻ Sức khỏe nhân viên trên máy này.</b><br>1. Cài app DataSnap bản 5.8 trở lên, bấm <b>Quét cụm</b> trên DMXWork (app tự mở thẻ từng NV, mỗi ngày 1 lần).<br>' +
        '2. Mở trang này <b>trong app DataSnap</b> (cùng máy với doc-so) — số tự hiện.<br>Hoặc bấm <b>📂 Nạp tệp</b> và chọn tệp <code>dmxsnap-realtime.json</code> / <code>dmxsnap-suckhoe.json</code> lấy từ điện thoại.</div>';
      ganChung(); return;
    }
    var n0 = st.nv[0] || {};
    var tabs = [['tong', 'Tổng hợp NV'], ['canhan', 'Trang cá nhân'], ['target', 'Chỉnh target']];
    var bt = S.bangTarget(st);
    dau += '<div class="text-xs text-gray-500 mb-3">Thẻ DMXWork tháng ' + esc(n0.thang) + ' · số tới hết ngày ' + esc(n0.denNgay) + ' (' + (n0.ngayQua || '?') + '/' + (n0.ngayThang || '?') + ' ngày) · đọc ' + esc(st.ngay) +
      ' · target: <b class="' + (bt.cach === 'deu' ? 'text-gray-600' : 'text-orange-700') + '">' + ({ deu: 'chia đều như DMX', nangluc: 'theo năng lực', tay: 'đã chỉnh tay' }[bt.cach] || 'đã chỉnh') + '</b>' +
      (st.boQua.length ? ' · <span title="' + esc(st.boQua.join(', ')) + '">không tính ' + st.boQua.length + ' NV không có giờ công</span>' : '') + '</div>' +
      '<div class="flex gap-1 border-b border-gray-200 mb-4">' + tabs.map(function (t) {
        return '<button data-tab="' + t[0] + '" class="px-4 py-2 text-sm font-semibold -mb-px border-b-2 ' + (X.tab === t[0] ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-800') + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    el.innerHTML = dau + (X.tab === 'canhan' ? veCaNhan(st, bt) : X.tab === 'target' ? veTarget(st, bt) : veTong(st, bt));
    ganChung();
    if (X.tab === 'target') ganTarget(st, bt);
  }

  function ganChung() {
    el.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function () { X.st = b.dataset.st; luuXem(); ve(); }; });
    el.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { X.tab = b.dataset.tab; luuXem(); ve(); }; });
    el.querySelectorAll('[data-nv]').forEach(function (b) { b.onclick = function () { X.nv = b.dataset.nv; X.tab = 'canhan'; luuXem(); ve(); }; });
    var tep = document.getElementById('skn-tep');
    if (tep) tep.onchange = function () {
      var t = tep.files[0]; if (!t) return;
      var fr = new FileReader();
      fr.onload = function () { var r = S.napTay(fr.result); thongBao(r.replace(/^(ok|loi): /, ''), /^ok/.test(r)); ve(); };
      fr.readAsText(t);
    };
  }
  function thongBao(s, ok) { if (W.Chung && Chung.thongBao) Chung.thongBao(s, ok ? 'thanhcong' : 'canhbao'); else alert(s); }

  /* ---------- Tổng hợp NV ---------- */
  function veTong(st, bt) {
    var hang = st.nv.map(function (n) { return { n: n, t: S.tinh(n, bt.tg[n.ma]) }; });
    hang.sort(function (a, b) { return (b.t.pctTienDo || -1) - (a.t.pctTienDo || -1); });
    var tDT = 0, tTG = 0; hang.forEach(function (h) { tDT += h.n.dtqd || 0; tTG += h.t.target || 0; });
    var tong = S.tinh(Object.assign({}, n0(st), { dtqd: tDT }), tTG);
    var cs = function (n, k) { var o = n.chiSo[k]; return o ? '<span class="' + (o.xu === '↑' ? 'text-emerald-600' : o.xu === '↓' ? 'text-rose-600' : '') + '">' + pc(o.gt) + '</span>' : '—'; };
    var th = 'px-2 py-2 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap';
    var td = 'px-2 py-2 whitespace-nowrap text-right';
    return '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">' +
      oSo('DTQĐ siêu thị', f1(tDT) + ' tr', 'Target ' + f1(tTG) + ' tr') +
      oSo('% theo tiến độ', '<span class="' + mau(tong.pctTienDo) + '">' + pc(tong.pctTienDo) + '</span>', 'DTQĐ ÷ (target × ' + (n0(st).ngayQua || '?') + '/' + (n0(st).ngayThang || '?') + ')') +
      oSo('Dự kiến cuối tháng', f1(tong.duKien) + ' tr', '<span class="' + mau(tong.pctDuKien) + '">' + pc(tong.pctDuKien) + ' target</span>') +
      oSo('Cần mỗi ngày còn lại', f1(tong.canMoiNgay) + ' tr', 'đang bán ' + f1(tong.nhipHienTai) + ' tr/ngày') + '</div>' +
      '<div class="overflow-x-auto bg-white rounded-xl border border-gray-200"><table class="min-w-full text-sm"><thead class="bg-gray-50"><tr>' +
      ['Hạng DMX', 'Nhân viên', 'Điểm', 'DTQĐ', 'Target', '% tiến độ', 'Dự kiến', 'Cần/ngày', 'Thi đua đạt', '% Quy đổi', '% Trả chậm', '% Bán kèm'].map(function (x, i) { return '<th class="' + th + (i === 1 ? ' text-left' : ' text-right') + '">' + x + '</th>'; }).join('') +
      '</tr></thead><tbody class="divide-y divide-gray-100">' + hang.map(function (h) {
        var n = h.n, t = h.t, lech = n.mt != null && Math.abs((t.target || 0) - n.mt) > 0.05;
        return '<tr data-nv="' + esc(n.ma) + '" class="hover:bg-orange-50 cursor-pointer">' +
          '<td class="' + td + ' text-gray-500">' + (n.hang || '—') + '/' + (n.soNV || '—') + '</td>' +
          '<td class="px-2 py-2 text-left"><div class="font-semibold text-gray-800">' + esc(n.ten) + '</div><div class="text-[11px] text-gray-400">' + esc(n.ma) + '</div></td>' +
          '<td class="' + td + '">' + f0(n.diem) + '<span class="text-gray-400">/' + f0(n.diemMax) + '</span></td>' +
          '<td class="' + td + ' font-semibold">' + f1(n.dtqd) + '</td>' +
          '<td class="' + td + '">' + f1(t.target) + (lech ? '<div class="text-[10px] text-orange-600">DMX ' + f1(n.mt) + '</div>' : '') + '</td>' +
          '<td class="' + td + ' font-bold ' + mau(t.pctTienDo) + '">' + pc(t.pctTienDo) + '</td>' +
          '<td class="' + td + '">' + f1(t.duKien) + '<div class="text-[10px] ' + mau(t.pctDuKien) + '">' + pc(t.pctDuKien) + '</div></td>' +
          '<td class="' + td + '">' + f1(t.canMoiNgay) + '</td>' +
          '<td class="' + td + '">' + (n.thiDua.tong ? n.thiDua.dat + '/' + n.thiDua.tong : '—') + '</td>' +
          '<td class="' + td + '">' + cs(n, '% QUY ĐỔI') + '</td><td class="' + td + '">' + cs(n, '% TRẢ CHẬM') + '</td><td class="' + td + '">' + cs(n, '% BÁN KÈM') + '</td></tr>';
      }).join('') +
      '<tr class="bg-gray-50 font-bold"><td></td><td class="px-2 py-2 text-left">Tổng ' + hang.length + ' NV</td><td></td><td class="' + td + '">' + f1(tDT) + '</td><td class="' + td + '">' + f1(tTG) + '</td><td class="' + td + ' ' + mau(tong.pctTienDo) + '">' + pc(tong.pctTienDo) + '</td><td class="' + td + '">' + f1(tong.duKien) + '</td><td class="' + td + '">' + f1(tong.canMoiNgay) + '</td><td colspan="4"></td></tr>' +
      '</tbody></table></div><p class="text-xs text-gray-400 mt-2">Bấm vào một nhân viên để xem trang cá nhân. Mũi tên màu ở các cột % = so với trung bình siêu thị (DMX).</p>';
  }
  function n0(st) { return st.nv[0] || {}; }
  function oSo(nhan, gt, phu) { return '<div class="bg-white rounded-xl border border-gray-200 p-3"><div class="text-[11px] font-bold text-gray-400 uppercase">' + nhan + '</div><div class="text-xl font-bold text-gray-800 mt-1">' + gt + '</div><div class="text-xs text-gray-500 mt-0.5">' + phu + '</div></div>'; }

  /* ---------- Trang cá nhân ---------- */
  function veCaNhan(st, bt) {
    var ds = st.nv.slice().sort(function (a, b) { return (a.hang || 99) - (b.hang || 99); });
    var n = ds.find(function (x) { return x.ma === X.nv; }) || ds[0]; X.nv = n.ma;
    var t = S.tinh(n, bt.tg[n.ma]);
    var chon = '<div class="flex flex-wrap gap-1.5 mb-4">' + ds.map(function (x) { return '<button data-nv="' + esc(x.ma) + '" class="px-2.5 py-1 rounded-lg text-xs font-semibold ' + (x.ma === n.ma ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200') + '">' + esc(x.ten) + '</button>'; }).join('') + '</div>';
    var diemPct = n.diemMax ? n.diem / n.diemMax * 100 : 0;
    var dau = '<div class="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-center mb-4">' +
      '<div class="relative w-20 h-20 rounded-full flex items-center justify-center" style="background:conic-gradient(#ea580c ' + diemPct + '%,#f3f4f6 0)"><div class="w-16 h-16 bg-white rounded-full flex flex-col items-center justify-center"><b class="text-xl">' + f0(n.diem) + '</b><span class="text-[10px] text-gray-400">/' + f0(n.diemMax) + '</span></div></div>' +
      '<div class="flex-1 min-w-[200px]"><div class="text-lg font-bold text-gray-800">' + esc(n.ten) + '</div><div class="text-xs text-gray-500">' + esc(n.ma) + ' · ' + esc(n.boPhan) + ' · ' + esc(n.sieuThi) + '</div>' +
      '<div class="text-sm mt-1">Hạng <b>' + (n.hang || '—') + '/' + (n.soNV || '—') + '</b> · Hoàn thành ' + pc(n.hoanThanh) + ' · tháng ' + esc(n.thang) + ' (' + n.ngayQua + '/' + n.ngayThang + ' ngày)</div></div>' +
      '<div class="grid grid-cols-5 gap-2 w-full md:w-auto">' + Object.keys(n.nhom).map(function (k) { var o = n.nhom[k], p = o.max ? o.d / o.max * 100 : 0; return '<div class="text-center"><div class="text-[10px] font-bold text-gray-400">' + k + '</div><div class="font-bold">' + o.d + '<span class="text-gray-400">/' + o.max + '</span></div>' + thanh(p) + '</div>'; }).join('') + '</div></div>';
    var nx = n.nhanXet.length ? '<div class="mb-4 space-y-1">' + n.nhanXet.map(function (x) { return '<div class="text-sm px-3 py-2 rounded-lg ' + (/^★/.test(x) ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800') + '">' + esc(x) + '</div>'; }).join('') + '</div>' : '';
    var lech = n.mt != null && Math.abs((t.target || 0) - n.mt) > 0.05;
    var muc = '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">' +
      oSo('DTQĐ tháng', f1(n.dtqd) + ' tr', 'TB siêu thị ' + f1(n.dtqdTB) + ' tr') +
      oSo('Target tháng', f1(t.target) + ' tr', lech ? '<span class="text-orange-600">DMX chia đều ' + f1(n.mt) + ' tr</span>' : 'như DMX (chia đều)') +
      oSo('% theo tiến độ', '<span class="' + mau(t.pctTienDo) + '">' + pc(t.pctTienDo) + '</span>', 'DMX ghi ' + pc(n.pctTarget)) +
      oSo('Cần mỗi ngày', f1(t.canMoiNgay) + ' tr', 'đang bán ' + f1(t.nhipHienTai) + ' tr/ngày · dự kiến ' + pc(t.pctDuKien)) + '</div>';
    var chiSo = khung('Chỉ số so với trung bình siêu thị', '<div class="grid grid-cols-1 gap-x-6">' + Object.keys(n.chiSo).filter(function (k) { return k !== 'DOANH THU QĐ' && k !== '% TARGET'; }).map(function (k) {
      var o = n.chiSo[k]; return dongSo(k, o.chu || f1(o.gt), o.tb, o.xu, /%/.test(k) ? '%' : '');
    }).join('') + '</div>');
    var kt = n.khaiThac.length ? khung('Hiệu quả khai thác (100% = bằng TB siêu thị)', n.khaiThac.map(function (k) { return '<div class="flex items-center gap-2 py-1"><div class="w-36 text-sm text-gray-700">' + esc(k.ten) + '</div><div class="flex-1">' + thanh(k.pct, 200) + '</div><div class="w-12 text-right text-sm font-semibold ' + mau(k.pct) + '">' + pc(k.pct) + '</div></div>'; }).join('')) : '';
    var td = n.thiDua, tdHtml = khung('Thi đua — ' + esc(td.trangThai || '') + (td.tong ? ' · ' + td.dat + '/' + td.tong + ' chương trình đạt' : '') + (td.nv != null ? ' · NV ' + pc(td.nv) + ' (TB siêu thị ' + pc(td.tbST) + ')' : ''),
      '<div class="flex flex-wrap gap-2 text-xs mb-3">' + [['Đạt', td.soDat, 'bg-emerald-100 text-emerald-800'], ['Gần đạt', td.soGan, 'bg-amber-100 text-amber-800'], ['Cần cố gắng', td.soCan, 'bg-rose-100 text-rose-800'], ['Chưa có số', td.soChua, 'bg-gray-100 text-gray-700']].map(function (x) { return x[1] == null ? '' : '<span class="px-2 py-1 rounded-full font-semibold ' + x[2] + '">' + x[0] + ' ' + x[1] + '</span>'; }).join('') + '</div>' +
      td.ct.map(function (c) { return '<div class="flex items-center gap-2 py-1"><div class="flex-1 min-w-0 text-sm text-gray-700 truncate" title="' + esc(c.ten) + '">' + esc(c.ten) + '</div><div class="w-28 md:w-48">' + thanh(c.pct) + '</div><div class="w-14 text-right text-sm font-bold ' + mau(c.pct) + '">' + pc(c.pct) + '</div></div>'; }).join('') +
      (td.chuaCoSo.length ? '<details class="mt-3 text-sm"><summary class="cursor-pointer text-gray-600 font-semibold">Chưa có số (' + td.chuaCoSo.length + ') — chưa bán được</summary><div class="mt-2 flex flex-wrap gap-1">' + td.chuaCoSo.map(function (x) { return '<span class="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700">' + esc(x) + '</span>'; }).join('') + '</div></details>' : '') +
      (td.khongTarget.length ? '<div class="mt-2 text-xs text-gray-400">Siêu thị không có target: ' + esc(td.khongTarget.join(' · ')) + '</div>' : ''));
    var dg = n.donGia.length ? khung('Đơn giá (triệu/sản phẩm)', '<div class="grid grid-cols-1 gap-x-6">' + n.donGia.map(function (o) { return dongSo(o.ten, o.gt == null ? '–' : f1(o.gt) + ' tr', o.tb, o.xu, ' tr'); }).join('') + '</div>') : '';
    var tt = n.tyTrong.length ? khung('Tỷ trọng ngành hàng', n.tyTrong.map(function (k) { return '<div class="flex items-center gap-2 py-1"><div class="w-44 text-sm text-gray-700">' + esc(k.ten) + '</div><div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-2 bg-sky-500" style="width:' + Math.min(100, k.pct || 0) + '%"></div></div><div class="w-10 text-right text-sm">' + pc(k.pct) + '</div></div>'; }).join('')) : '';
    var maxTh = Math.max.apply(null, n.theoThang.map(function (x) { return x.dtqd || 0; }).concat([t.target || 0, t.duKien || 0, 1]));
    var th = n.theoThang.length ? khung('DTQĐ từng tháng (triệu) — tháng này: đã bán + dự kiến, vạch cam = target',
      '<div class="flex items-end gap-3 h-40 pt-4 relative">' + n.theoThang.map(function (x) {
        var nay = x.thang === n.thang, h = (x.dtqd || 0) / maxTh * 100, hk = nay && t.duKien ? t.duKien / maxTh * 100 : 0;
        return '<div class="flex-1 flex flex-col items-center justify-end h-full relative">' +
          (nay && t.target ? '<div class="absolute left-0 right-0 border-t-2 border-dashed border-orange-500" style="bottom:calc(' + (t.target / maxTh * 100) + '% + 18px)"></div>' : '') +
          '<div class="text-[10px] text-gray-600 mb-0.5">' + f0(nay ? t.duKien : x.dtqd) + '</div>' +
          '<div class="w-full max-w-[44px] relative" style="height:' + Math.max(h, hk) + '%">' + (nay ? '<div class="absolute inset-0 bg-orange-200 rounded-t"></div>' : '') +
          '<div class="absolute bottom-0 left-0 right-0 rounded-t ' + (nay ? 'bg-orange-500' : 'bg-gray-400') + '" style="height:' + (hk ? h / hk * 100 : 100) + '%"></div></div>' +
          '<div class="text-[10px] text-gray-500 mt-1 h-3">' + esc(x.thang.slice(0, 2)) + '</div></div>';
      }).join('') + '</div>') : '';
    return chon + dau + nx + muc + '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' + '<div class="space-y-4">' + tdHtml + th + '</div><div class="space-y-4">' + chiSo + kt + dg + tt + '</div></div>';
  }
  function khung(tieuDe, noiDung) { return '<div class="bg-white rounded-xl border border-gray-200 p-4"><div class="text-sm font-bold text-gray-800 mb-2">' + tieuDe + '</div>' + noiDung + '</div>'; }
  function dongSo(nhan, gt, tb, xu, dv) {
    return '<div class="flex items-center justify-between py-1.5 border-b border-gray-50 text-sm"><span class="text-gray-600">' + esc(nhan) + '</span><span><b class="' + (xu === '↑' ? 'text-emerald-600' : xu === '↓' ? 'text-rose-600' : 'text-gray-800') + '">' + (xu ? xu + ' ' : '') + esc(gt) + '</b>' +
      (tb != null ? '<span class="text-xs text-gray-400 ml-2">TB ' + f1(tb) + (dv === '%' ? '%' : dv) + '</span>' : '') + '</span></div>';
  }

  /* ---------- Chỉnh target ---------- */
  function veTarget(st, bt) {
    var tong = st.nv.reduce(function (a, n) { return a + (bt.tg[n.ma] || 0); }, 0), lech = tong - bt.tong;
    var td = 'px-2 py-2 whitespace-nowrap text-right';
    return '<div class="bg-white rounded-xl border border-gray-200 p-4 mb-4"><div class="flex flex-wrap items-end gap-4">' +
      '<label class="text-sm"><div class="text-[11px] font-bold text-gray-400 uppercase mb-1">Target siêu thị tháng (triệu)</div><input id="skn-tong" type="number" step="0.1" value="' + (Math.round(bt.tong * 10) / 10) + '" class="w-40 p-2 border border-gray-300 rounded-lg text-right font-bold"></label>' +
      '<div class="text-xs text-gray-500 pb-2">DMX: ' + f1(n0(st).mt) + ' tr × ' + st.nv.length + ' NV = <b>' + f1(bt.tongDMX) + ' tr</b></div>' +
      '<div class="flex flex-wrap gap-2 ml-auto">' +
      '<button id="skn-deu" class="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 font-semibold">Chia đều (như DMX)</button>' +
      '<button id="skn-nl" class="px-3 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 font-semibold" title="Theo DTQĐ trung bình 3 tháng gần nhất">Chia theo năng lực 3 tháng</button>' +
      '<button id="skn-mokhoa" class="px-3 py-2 rounded-lg text-sm bg-white border border-gray-300 hover:bg-gray-50">Mở khoá tất cả</button></div></div>' +
      '<p class="text-xs text-gray-500 mt-3">Sửa target một người → người đó được <b>khoá</b> 🔒, phần còn lại tự chia cho những người <b>chưa khoá</b> (giữ tỷ lệ giữa họ). Tổng luôn bằng target siêu thị. Lưu trên máy này, sang tháng mới tự về chia đều.</p></div>' +
      '<div class="overflow-x-auto bg-white rounded-xl border border-gray-200"><table class="min-w-full text-sm"><thead class="bg-gray-50"><tr>' +
      ['Nhân viên', 'TB 3 tháng', 'DTQĐ tháng này', 'Target DMX', 'Target mới (tr)', 'Tỷ trọng', '🔒', '% tiến độ', 'Cần/ngày'].map(function (x, i) { return '<th class="px-2 py-2 text-[11px] font-bold text-gray-500 uppercase whitespace-nowrap ' + (i ? 'text-right' : 'text-left') + '">' + x + '</th>'; }).join('') +
      '</tr></thead><tbody class="divide-y divide-gray-100">' + st.nv.slice().sort(function (a, b) { return (bt.tg[b.ma] || 0) - (bt.tg[a.ma] || 0); }).map(function (n) {
        var t = S.tinh(n, bt.tg[n.ma]), nl = S.nangLuc(n);
        return '<tr><td class="px-2 py-2"><div class="font-semibold">' + esc(n.ten) + '</div><div class="text-[11px] text-gray-400">' + esc(n.ma) + '</div></td>' +
          '<td class="' + td + '">' + f1(nl) + '</td><td class="' + td + '">' + f1(n.dtqd) + '</td><td class="' + td + ' text-gray-500">' + f1(n.mt) + '</td>' +
          '<td class="' + td + '"><input data-tg="' + esc(n.ma) + '" type="number" step="0.1" value="' + (Math.round((bt.tg[n.ma] || 0) * 10) / 10) + '" class="w-24 p-1.5 border rounded text-right font-semibold ' + (bt.khoa[n.ma] ? 'border-orange-400 bg-orange-50' : 'border-gray-300') + '"></td>' +
          '<td class="' + td + '">' + pc(bt.tong ? (bt.tg[n.ma] || 0) / bt.tong * 100 : null) + '</td>' +
          '<td class="' + td + '"><input data-khoa="' + esc(n.ma) + '" type="checkbox" ' + (bt.khoa[n.ma] ? 'checked' : '') + ' class="w-4 h-4 accent-orange-600"></td>' +
          '<td class="' + td + ' font-bold ' + mau(t.pctTienDo) + '">' + pc(t.pctTienDo) + '</td><td class="' + td + '">' + f1(t.canMoiNgay) + '</td></tr>';
      }).join('') +
      '<tr class="bg-gray-50 font-bold"><td class="px-2 py-2">Tổng</td><td></td><td class="' + td + '">' + f1(st.nv.reduce(function (a, n) { return a + (n.dtqd || 0); }, 0)) + '</td><td class="' + td + '">' + f1(bt.tongDMX) + '</td><td class="' + td + '">' + f1(tong) + '</td><td class="' + td + '">' + pc(bt.tong ? tong / bt.tong * 100 : null) + '</td><td colspan="3" class="px-2 py-2 text-xs ' + (Math.abs(lech) > 0.1 ? 'text-rose-600' : 'text-emerald-600') + '">' +
      (Math.abs(lech) > 0.1 ? (lech > 0 ? 'Vượt ' : 'Thiếu ') + f1(Math.abs(lech)) + ' tr so với target siêu thị — mở khoá bớt người để chia lại' : '✓ Khớp target siêu thị') + '</td></tr></tbody></table></div>';
  }
  function ganTarget(st, bt) {
    function xong(cach) { bt.cach = cach || 'tay'; S.luuTarget(st, bt); ve(); }
    el.querySelectorAll('[data-tg]').forEach(function (inp) {
      inp.onchange = function () {
        var v = parseFloat(inp.value); if (isNaN(v) || v < 0) v = 0;
        bt.tg[inp.dataset.tg] = v; bt.khoa[inp.dataset.tg] = 1;
        var con = S.canLai(st, bt);
        if (con < 0) thongBao('Tổng target người đã khoá vượt target siêu thị ' + f1(-con) + ' tr', false);
        xong('tay');
      };
    });
    el.querySelectorAll('[data-khoa]').forEach(function (cb) { cb.onchange = function () { if (cb.checked) bt.khoa[cb.dataset.khoa] = 1; else delete bt.khoa[cb.dataset.khoa]; xong(bt.cach); }; });
    var tongInp = document.getElementById('skn-tong');
    tongInp.onchange = function () { var v = parseFloat(tongInp.value); if (isNaN(v) || v <= 0) return ve(); bt.tong = v; S.canLai(st, bt); xong(bt.cach === 'deu' ? 'tay' : bt.cach); };
    document.getElementById('skn-deu').onclick = function () { S.xoaTarget(st); ve(); };
    document.getElementById('skn-mokhoa').onclick = function () { bt.khoa = {}; xong(bt.cach); };
    document.getElementById('skn-nl').onclick = function () {
      var ds = st.nv.map(S.nangLuc).filter(function (v) { return v != null && v > 0; });
      if (!ds.length) return thongBao('Chưa có DTQĐ các tháng trước để chia theo năng lực', false);
      var tb = ds.reduce(function (a, v) { return a + v; }, 0) / ds.length;
      bt.khoa = {};
      // NV mới (chưa đủ tháng) lấy TB nhóm; không ai dưới 50% TB nhóm để target không về gần 0.
      S.canLai(st, bt, function (n) { var v = S.nangLuc(n); return Math.max(v == null || v <= 0 ? tb : v, tb * 0.5); });
      xong('nangluc');
      thongBao('Đã chia theo DTQĐ trung bình 3 tháng gần nhất (thấp nhất = 50% trung bình nhóm).', true);
    };
  }

  W.SknUI = { ve: ve };
})(window);
