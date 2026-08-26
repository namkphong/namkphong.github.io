/*
 * nhan-xet-ai.js — Gọi Edge Function "nhan-xet" để lấy 2 dòng nhận xét AI cho từng NV,
 * rồi cache lại để muc-tieu-card.js dùng thay 2 dòng template (msg1/msg2).
 *
 * Luồng: buildPersonalAll() (nv.html) gọi  await NXAI.compute(store)  TRƯỚC khi dựng thẻ.
 *        Trong buildCards() (muc-tieu-card.js), sau khi soạn template sẽ ưu tiên NXAI.get(tên).
 * An toàn: lỗi mạng / chưa deploy function => cache rỗng => web tự dùng template, KHÔNG gãy.
 *
 * Key Anthropic KHÔNG nằm ở đây — nó là secret trong Edge Function. File này chỉ gửi SỐ.
 */
(function () {
  'use strict';

  // ==== Ngữ cảnh con người (sửa tại đây khi nhân sự đổi) — chỉ ghi người có lưu ý đặc biệt ====
  var CONTEXT = {
    'Nguyễn Bình Minh': {
      tham_nien_nam: 10,
      ghichu: 'Vai trò chính hậu cần (mạnh kho, giao hàng, trưng bày), được giao thêm bán hàng — kỹ năng bán còn mới.',
      quytac: ['Khi nhận xét doanh số, KHÔNG so sánh gay gắt với NV bán chuyên — Minh mạnh mảng hậu cần.']
    },
    'Vũ Quang Huy': {
      ghichu: 'Mới chuyển về cụm, số đang thấp là tạm thời.',
      quytac: ['Mới chuyển về, ít cơ hội tiếp khách — số thấp là TẠM THỜI. Ghi nhận đang vào guồng, KHÔNG nói tụt/sa sút.']
    },
    'Nguyễn Ngọc Đức': {
      tham_nien_nam: 10,
      ghichu: 'Thâm niên ~10 năm, chuyển nội bộ.'
    }
  };

  var _cache = {};   // { 'Tên NV': ['dòng1','dòng2'] }

  function fnUrl() {
    var base = (window.CLOUD && window.CLOUD.url) || '';
    return base ? base.replace(/\/+$/, '') + '/functions/v1/nhan-xet' : '';
  }

  /* ================= TIẾT KIỆM CHI PHÍ AI =================
     Edge Function gọi Anthropic MỘT LẦN CHO MỖI NHÂN VIÊN, nên 1 lần chạy cả
     chuỗi của cụm 15 người = 30 lượt gọi (ngày + tuần). Trước đây không cache gì
     cả: chạy lại đúng số liệu cũ vẫn tốn tiền đầy đủ — chạy thử vài lần là tốn
     thật. Hai chốt chặn:

     1) TẮT AI: đặt cờ để chạy thử mà không gọi API lần nào (web tự dùng câu mẫu
        có sẵn, không gãy gì).
     2) CACHE theo NGÀY + VÂN TAY SỐ LIỆU: số liệu y hệt thì trả lại kết quả cũ,
        KHÔNG gọi API. Số đổi (cào số mới) -> vân tay đổi -> gọi lại bình thường,
        nên không bao giờ hiện nhận xét cũ trên số mới.

     Cache giữ MỘT Ô cho mỗi (chế độ, siêu thị, ngày) — số mới ghi đè số cũ, không
     giữ lịch sử. Cố ý làm vậy: trong ngày số chỉ tiến về phía trước (cào lần sau
     luôn mới hơn), mà localStorage của trang này từng bị đầy nên không đáng phình
     thêm. Hệ quả chấp nhận được: nếu số lùi về đúng bộ cũ thì gọi lại 1 lần.     */
  var LS_OFF = 'dmx_ai_off';          // '1' = tắt hẳn AI
  var LS_CACHE = 'nxai_cache_v1';     // { khoa: {vt: '<vân tay>', c: {...}} }
  var CACHE_GIU_NGAY = 3;             // dọn mục cũ hơn 3 ngày cho khỏi phình

  function aiTat() {
    try { return localStorage.getItem(LS_OFF) === '1'; } catch (e) { return false; }
  }

  function homNay() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  // Vân tay số liệu: đổi 1 con số bất kỳ là đổi chuỗi này. Hàm băm 32-bit đơn
  // giản (djb2) — chỉ cần phát hiện KHÁC NHAU, không cần chống va chạm mã hoá.
  function vanTay(obj) {
    var s = JSON.stringify(obj), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + '.' + s.length;
  }

  function docKho() {
    try { return JSON.parse(localStorage.getItem(LS_CACHE) || '{}') || {}; } catch (e) { return {}; }
  }
  function ghiKho(kho) {
    // Dọn mục quá cũ trước khi ghi (khoá có dạng "<mode>|<store>|<ngày>").
    try {
      var moc = new Date(Date.now() - CACHE_GIU_NGAY * 864e5).toISOString().slice(0, 10);
      Object.keys(kho).forEach(function (k) {
        var ngay = k.split('|')[2] || '';
        if (ngay && ngay < moc) delete kho[k];
      });
      localStorage.setItem(LS_CACHE, JSON.stringify(kho));
    } catch (e) { /* hết chỗ thì thôi, chỉ mất cache chứ không gãy */ }
  }

  function khoaCache(mode, store) { return (mode || 'day') + '|' + store + '|' + homNay(); }

  function layCache(mode, store, vt) {
    var m = docKho()[khoaCache(mode, store)];
    return (m && m.vt === vt) ? (m.c || null) : null;
  }
  function luuCache(mode, store, vt, comments) {
    var kho = docKho();
    kho[khoaCache(mode, store)] = { vt: vt, c: comments || {} };
    ghiKho(kho);
  }

  // st (muc-tieu-card) -> nhãn xu hướng tuần cho AI
  function _xuHuong(st) {
    return st === 'improve' ? 'đang tăng tốc'
         : st === 'decline' ? 'đang chững lại'
         : st === 'unstable' ? 'còn trồi sụt'
         : 'đều tay';
  }

  // Gom số của mọi NV trong 1 siêu thị rồi gọi Edge Function 1 lần.
  // mode: 'week' => tổng kết tuần (SYSTEM tuần trên server); mặc định: nhận xét ngày.
  async function compute(storeName, mode) {
    _cache = {};
    var isWeek = (mode === 'week');
    try {
      if (!window.MucTieuCard || typeof MucTieuCard.buildCards !== 'function') return;
      var root = null;
      try { root = JSON.parse(localStorage.getItem('analysisAppData_v2') || 'null'); } catch (e) {}
      if (!root || !root.supermarkets) return;

      var cfg = MucTieuCard.STORES.find(function (s) { return s.name === storeName; });
      if (!cfg) return;

      var res = MucTieuCard.buildCards(root);
      var cards = (res.stores && res.stores[cfg.code]) || [];
      if (!cards.length) return;
      var KY = res.meta.KY;

      // Cuối tháng (7 ngày cuối): dồn sức nhóm dự kiến 85-99% để về số.
      var _now = new Date();
      var _totalDays = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).getDate();
      var _soNgayConLai = Math.max(0, _totalDays - _now.getDate());
      var _cuoiThang = _soNgayConLai >= 1 && _soNgayConLai <= 7;

      var employees = cards.map(function (e) {
        var ctx = CONTEXT[e.n] || {};
        return {
          ten: e.n,
          td: e.td,
          ky: KY,
          tocdo: Math.round(e.monthAvg || 0),
          canNgay: e.dNg,
          duDat: !!e.duDat,
          dat: e.dat,
          tgt: e.tgt,
          yday: e.yday,
          strong: e.strong || [],
          near: e.near || [],
          zero: e.zero || [],
          focustask: e.focustask || '',
          ghichu: ctx.ghichu || '',
          quytac: ctx.quytac || [],
          tham_nien_nam: ctx.tham_nien_nam || null,
          // trường phục vụ chế độ tuần
          xuHuong: _xuHuong(e.st),
          tuanTarget: Math.max(70, Math.round((e.dNg || 0) * 7)),
          // trường cuối tháng (nước rút về số)
          cuoiThang: _cuoiThang,
          soNgayConLai: _soNgayConLai,
          duKienPct: (e.tgt > 0) ? Math.round(((e.dat || 0) + (e.monthAvg || 0) * _soNgayConLai) / e.tgt * 100) : 0
        };
      });

      var url = fnUrl();
      var key = (window.CLOUD && window.CLOUD.anonKey) || '';
      if (!url) return;

      if (aiTat()) { console.log('[NXAI] AI đang TẮT — dùng câu mẫu, không gọi API.'); return; }

      // Số liệu y hệt lần trước trong NGÀY -> lấy lại kết quả cũ, không tốn tiền.
      var vt = vanTay(employees);
      var sanCo = layCache(isWeek ? 'week' : 'day', storeName, vt);
      if (sanCo) {
        _cache = sanCo;
        console.log('[NXAI] dùng CACHE (' + (isWeek ? 'tuần' : 'ngày') + ', ' +
          Object.keys(_cache).length + ' NV, ' + storeName + ') — không gọi API.');
        return;
      }

      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 60000);
      var resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Authorization': 'Bearer ' + key, 'apikey': key },
        body: JSON.stringify({ store: storeName, mode: isWeek ? 'week' : 'day', employees: employees }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!resp.ok) { console.warn('[NXAI] Edge Function lỗi', resp.status); return; }
      var j = await resp.json();
      _cache = (j && j.comments) || {};
      var n = Object.keys(_cache).length;
      if (n) luuCache(isWeek ? 'week' : 'day', storeName, vt, _cache);
      console.log('[NXAI] ' + (isWeek ? 'tổng kết TUẦN' : 'nhận xét NGÀY') + ' cho ' + n + '/' + employees.length + ' NV (' + storeName + ') — đã gọi API + lưu cache.');
    } catch (err) {
      console.warn('[NXAI] compute lỗi -> dùng template:', err);
      _cache = {};
    }
  }

  // Gọi Edge Function với payload ĐÃ DỰNG SẴN (không tự lấy từ buildCards).
  // Dùng cho Mục Tiêu Tuần: số liệu lấy đúng từ thẻ target tuần (showWeeklyTargetReport)
  // để nhận xét AI khớp 100% với con số hiển thị trên thẻ. Trả { 'Tên': ['d1','d2'] }.
  async function computeRaw(storeName, employees, mode) {
    try {
      var url = fnUrl();
      var key = (window.CLOUD && window.CLOUD.anonKey) || '';
      if (!url || !employees || !employees.length) return {};

      // Nút "Mục tiêu tuần" trong nv.html gọi thẳng vào đây MỖI LẦN BẤM — bấm 3
      // lần là 3 lượt gọi đầy đủ cho từng nhân viên. Cache + công tắc chặn ở đây
      // quan trọng không kém compute().
      if (aiTat()) { console.log('[NXAI] AI đang TẮT — dùng câu mẫu, không gọi API.'); return {}; }
      var md = (mode === 'week' ? 'week' : 'day');
      var vt = vanTay(employees);
      var sanCo = layCache(md, storeName, vt);
      if (sanCo) {
        console.log('[NXAI] dùng CACHE (' + md + ', ' + Object.keys(sanCo).length + ' NV, ' + storeName + ') — không gọi API.');
        return sanCo;
      }

      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 60000);
      var resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Authorization': 'Bearer ' + key, 'apikey': key },
        body: JSON.stringify({ store: storeName, mode: mode === 'week' ? 'week' : 'day', employees: employees }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!resp.ok) { console.warn('[NXAI] computeRaw EF lỗi', resp.status); return {}; }
      var j = await resp.json();
      var cmt = (j && j.comments) || {};
      if (Object.keys(cmt).length) luuCache(md, storeName, vt, cmt);
      return cmt;
    } catch (err) {
      console.warn('[NXAI] computeRaw lỗi', err);
      return {};
    }
  }

  function get(name) {
    if (!name) return null;
    var key = ('' + name).split(' - ')[0].trim();
    return _cache[key] || null;
  }

  // Sinh VĂN BẢN TỔNG KẾT TUẦN cho 1 siêu thị (gọi AI chế độ tuần rồi ghép chữ).
  // Dùng cho lệnh LINE /tuan — userscript đẩy chuỗi này lên Supabase (nv_stram_week.json).
  async function buildWeekText(storeName) {
    await compute(storeName, 'week');
    var out = ['TỔNG KẾT TUẦN — ' + storeName, ''];
    try {
      var root = JSON.parse(localStorage.getItem('analysisAppData_v2') || 'null');
      var cfg = MucTieuCard.STORES.find(function (s) { return s.name === storeName; });
      var res = MucTieuCard.buildCards(root);
      var cards = (res.stores && res.stores[cfg.code]) || [];
      cards.forEach(function (c) {
        var a = _cache[c.n];
        if (a && a[0]) {
          out.push('● ' + c.n);
          out.push(a[0]);
          if (a[1]) out.push(a[1]);
          out.push('');
        }
      });
    } catch (e) { console.warn('[NXAI] buildWeekText lỗi', e); }
    return out.join('\n').trim();
  }

  window.NXAI = {
    compute: compute,
    computeWeek: function (s) { return compute(s, 'week'); },
    computeRaw: computeRaw,
    buildWeekText: buildWeekText,
    get: get, CONTEXT: CONTEXT, _cacheRef: function () { return _cache; },

    // --- điều khiển chi phí (dùng ở panel DMX trên nv.html) ---
    aiDangTat: aiTat,
    datAiTat: function (tat) {
      try { if (tat) localStorage.setItem(LS_OFF, '1'); else localStorage.removeItem(LS_OFF); } catch (e) {}
      return aiTat();
    },
    xoaCache: function () {
      try { localStorage.removeItem(LS_CACHE); } catch (e) {}
    },
    // Số mục cache đang giữ — để panel hiện cho biết hôm nay đã gọi API chưa.
    soMucCache: function () { return Object.keys(docKho()).length; }
  };
})();
