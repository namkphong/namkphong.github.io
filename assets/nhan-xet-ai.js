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

  // Gom số của mọi NV trong 1 siêu thị rồi gọi Edge Function 1 lần.
  async function compute(storeName) {
    _cache = {};
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
          tham_nien_nam: ctx.tham_nien_nam || null
        };
      });

      var url = fnUrl();
      var key = (window.CLOUD && window.CLOUD.anonKey) || '';
      if (!url) return;

      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 60000);
      var resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Authorization': 'Bearer ' + key, 'apikey': key },
        body: JSON.stringify({ store: storeName, employees: employees }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!resp.ok) { console.warn('[NXAI] Edge Function lỗi', resp.status); return; }
      var j = await resp.json();
      _cache = (j && j.comments) || {};
      var n = Object.keys(_cache).length;
      console.log('[NXAI] nhận xét AI cho ' + n + '/' + employees.length + ' NV (' + storeName + ')');
    } catch (err) {
      console.warn('[NXAI] compute lỗi -> dùng template:', err);
      _cache = {};
    }
  }

  function get(name) {
    if (!name) return null;
    var key = ('' + name).split(' - ')[0].trim();
    return _cache[key] || null;
  }

  window.NXAI = { compute: compute, get: get, CONTEXT: CONTEXT, _cacheRef: function () { return _cache; } };
})();
