/**
 * dmx-cluster-shared.js — tiện ích dùng chung, THUẦN LOCAL (30/10/2026).
 *
 * Toàn bộ dữ liệu chỉ nằm trên MÁY người dùng (localStorage) — không máy chủ,
 * không đồng bộ. File này chỉ còn các tiện ích cục bộ:
 *
 *   window.DMXCluster:
 *     getSiteCode()/setSiteCode(code)   — mã cụm đang chọn (localStorage).
 *     getCachedConfig(siteCode?)        — cấu hình cụm lưu sẵn trên máy.
 *     setCachedConfig(siteCode, config) — lưu cấu hình cụm vào máy.
 *     fetchConfig(siteCode)             — đọc bản trên máy (không mạng).
 *     chuanHoaTen(s) / matchStoreByText / maCumChoTenFile — so tên lỏng.
 *   window.KhoFile — ĐÃ VÔ HIỆU: url/moi trả '' , ghi/ds từ chối. Giữ lại để
 *                    các lệnh gọi cũ không văng.
 */
(function () {
  'use strict';

  var LS_KEY = 'dmx_site_code';
  var LS_CACHE = 'dmx_cluster_config_cache';

  function getSiteCode() {
    try { return localStorage.getItem(LS_KEY) || ''; } catch (e) { return ''; }
  }
  function setSiteCode(code) {
    try { localStorage.setItem(LS_KEY, code); } catch (e) {}
  }

  function cacheKey(siteCode) { return LS_CACHE + '_' + siteCode; }
  function getCachedConfig(siteCode) {
    siteCode = siteCode || getSiteCode();
    if (!siteCode) return null;
    try { return JSON.parse(localStorage.getItem(cacheKey(siteCode))) || null; } catch (e) { return null; }
  }
  function setCachedConfig(siteCode, config) {
    if (!siteCode || !config) return;
    try { localStorage.setItem(cacheKey(siteCode), JSON.stringify(config)); } catch (e) {}
  }

  // Mọi mã cụm có cấu hình lưu sẵn trên máy (quét các khoá cache cục bộ).
  function listSiteCodes() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LS_CACHE + '_') === 0) out.push(k.slice((LS_CACHE + '_').length));
      }
    } catch (e) {}
    return out;
  }

  // fetchConfig nay chỉ đọc bản trên máy (không còn gọi mạng).
  function fetchConfig(siteCode) {
    return Promise.resolve(getCachedConfig(siteCode));
  }
  // saveConfig nay chỉ lưu vào máy (không đẩy từ xa).
  function saveConfig(siteCode, config) {
    if (!siteCode) return Promise.reject(new Error('Thiếu site_code.'));
    setCachedConfig(siteCode, config);
    return Promise.resolve();
  }

  // Bỏ dấu, chỉ giữ chữ+số, lowercase — so tên siêu thị không phụ thuộc hoa/dấu.
  function chuanHoaTen(name) {
    return String(name || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  // Mã cụm đem đi đặt tên file cục bộ: "Cụm 14285" -> "cum14285".
  function maCumChoTenFile(siteCode) {
    var s = chuanHoaTen(siteCode);
    return s || 'chung';
  }

  // Tìm store trong config.stores khớp một đoạn text (so lỏng, chứa nhau là được).
  function matchStoreByText(stores, text) {
    var t = chuanHoaTen(text);
    if (!t || !stores) return null;
    for (var i = 0; i < stores.length; i++) {
      var s = chuanHoaTen(stores[i].name);
      if (!s) continue;
      if (t.indexOf(s) !== -1 || s.indexOf(t) !== -1) return stores[i];
    }
    return null;
  }

  function resolveSiteCode(input) {
    input = (input || '').trim();
    if (!input) return { code: '', kieu: '' };
    var codes = listSiteCodes();
    if (codes.indexOf(input) !== -1) return { code: input, kieu: 'khit' };
    var t = chuanHoaTen(input);
    if (!t) return { code: '', kieu: '' };
    var bangNhau = codes.filter(function (c) { return chuanHoaTen(c) === t; });
    if (bangNhau.length === 1) return { code: bangNhau[0], kieu: 'bo-dau' };
    return { code: '', kieu: '' };
  }

  // KHO FILE — đã vô hiệu (không còn từ xa). Giữ API để lệnh gọi cũ không văng.
  var kho = {
    url: function () { return ''; },
    moi: function () { return ''; },
    ghi: function () { return Promise.reject(new Error('Đã tắt kho từ xa — chỉ lưu local.')); },
    yeuCauGhi: function () { return null; },
    ds: function () { return Promise.resolve([]); },
    noi: function () { return 'local'; }
  };

  var api = {
    kho: kho,
    getSiteCode: getSiteCode,
    setSiteCode: setSiteCode,
    fetchConfig: fetchConfig,
    getCachedConfig: getCachedConfig,
    setCachedConfig: setCachedConfig,
    saveConfig: saveConfig,
    listSiteCodes: listSiteCodes,
    resolveSiteCode: resolveSiteCode,
    canonicalSiteCode: function () { return ''; },
    chuanHoaTen: chuanHoaTen,
    maCumChoTenFile: maCumChoTenFile,
    matchStoreByText: matchStoreByText,
    // Các đầu việc nhận-cụm tự động trước đây cần từ xa — nay trả rỗng.
    findClusterByEvidence: function () { return Promise.resolve(null); },
    pickSiteCode: function (current) { var c = current || getSiteCode(); return Promise.resolve({ code: c, config: getCachedConfig(c), clusterId: '', mwgUser: '' }); }
  };

  window.DMXCluster = api;
  window.KhoFile = kho;
  try { if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) { unsafeWindow.DMXCluster = api; unsafeWindow.KhoFile = kho; } } catch (e) {}
})();
