/**
 * dmx-cluster-shared.js — module dùng CHUNG cho các userscript DMX (dmx.user.js,
 * dmx-realtime-auto.user.js, dmx-line-publish.user.js, dmx-gio-cong.user.js).
 * KHÔNG phải userscript — nạp bằng @require từ mỗi script.
 *
 * Mục đích: mỗi cụm (Quản lý) có tên/mã siêu thị riêng — thay vì đóng cứng
 * trong từng file (như trước đây), toàn bộ cấu hình 1 cụm nằm trên Supabase
 * (bảng "dmx_clusters"), tra theo "site_code" do Quản lý tự đặt. Xem
 * C:\Users\trant\.claude\plans\generic-bouncing-adleman.md để rõ bối cảnh.
 *
 * Cung cấp qua window.DMXCluster:
 *   getSiteCode() / setSiteCode(code)   — localStorage của ĐÚNG origin hiện tại
 *                                          (không dùng chung được giữa các origin
 *                                          khác nhau — mỗi origin tự hỏi 1 lần).
 *   fetchConfig(siteCode)               — đọc config từ Supabase (hoặc null).
 *   saveConfig(siteCode, config)        — ghi đè (upsert) config lên Supabase.
 *   listSiteCodes()                     — mọi mã cụm đã có trên Supabase.
 *   askSiteCode(extra?)                 — hỏi tay NHƯNG gợi ý sẵn mã đã có (đỡ
 *                                          phải nhớ gõ lại chính xác từng chữ).
 *   chuanHoaTen(s) / matchStoreByText() — so tên lỏng, y hệt Chung.chuanHoaTen
 *                                          (assets/common.js) dùng bên các trang.
 */
(function () {
  'use strict';

  var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  var SB_KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
  var TABLE = 'dmx_clusters';
  var LS_KEY = 'dmx_site_code';

  function getSiteCode() {
    try { return localStorage.getItem(LS_KEY) || ''; } catch (e) { return ''; }
  }
  function setSiteCode(code) {
    try { localStorage.setItem(LS_KEY, code); } catch (e) {}
  }

  async function fetchConfig(siteCode) {
    if (!siteCode) return null;
    var url = SB_URL + '/rest/v1/' + TABLE + '?select=config&site_code=eq.' + encodeURIComponent(siteCode);
    var res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    if (!res.ok) throw new Error('Đọc cấu hình cụm lỗi HTTP ' + res.status);
    var rows = await res.json();
    return (rows && rows[0] && rows[0].config) || null;
  }

  // Toàn bộ mã cụm đã có sẵn trên Supabase — dùng để GỢI Ý thay vì bắt gõ lại
  // chính xác từng ký tự (dễ gõ sai/lệch dấu, gây "không tìm thấy cấu hình"
  // dù thực ra đã tạo rồi).
  async function listSiteCodes() {
    var url = SB_URL + '/rest/v1/' + TABLE + '?select=site_code&order=updated_at.desc';
    try {
      var res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
      if (!res.ok) return [];
      var rows = await res.json();
      return (rows || []).map(function (r) { return r.site_code; }).filter(Boolean);
    } catch (e) { return []; }
  }

  // Hỏi site_code theo cách ÍT LỖI hơn window.prompt trống: CHỈ ĐÚNG 1 cụm đã
  // có sẵn trong toàn hệ thống thì TỰ DÙNG LUÔN, không hỏi gì cả (mỗi máy/mỗi
  // trang chỉ cần vậy 1 lần, sau lưu local). Nếu nhiều cụm, liệt kê rõ để
  // chọn đúng (gõ nguyên mã) — không tự đoán được ai đang dùng máy này. Nếu
  // chưa cụm nào, để trống cho tự đặt mã mới. Trả về chuỗi đã .trim() (rỗng
  // nếu người dùng huỷ/không nhập, chỉ xảy ra khi có ≥2 cụm hoặc chưa cụm nào).
  async function askSiteCode(promptExtra) {
    var codes = await listSiteCodes();
    if (codes.length === 1) return codes[0]; // chỉ 1 cụm -> khỏi hỏi, dùng luôn
    var msg = 'Mã cụm (site code) của bạn';
    var def = '';
    if (codes.length > 1) {
      msg += ' — các cụm đã có: ' + codes.map(function (c) { return '"' + c + '"'; }).join(', ') + '. Gõ ĐÚNG NGUYÊN 1 mã ở trên, hoặc gõ mã mới để tạo cụm khác:';
    } else {
      msg += ' — CHƯA có cụm nào, tự đặt 1 mã dễ nhớ (dùng thống nhất về sau):';
    }
    if (promptExtra) msg += '\n' + promptExtra;
    return (window.prompt(msg, def) || '').trim();
  }

  async function saveConfig(siteCode, config) {
    if (!siteCode) throw new Error('Thiếu site_code.');
    var res = await fetch(SB_URL + '/rest/v1/' + TABLE, {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({ site_code: siteCode, config: config, updated_at: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('Lưu cấu hình cụm lỗi HTTP ' + res.status + ': ' + (await res.text()).slice(0, 160));
  }

  // Y hệt Chung.chuanHoaTen trong assets/common.js — bỏ dấu, chỉ giữ chữ+số,
  // lowercase — để so tên siêu thị không phụ thuộc viết hoa/dấu câu.
  function chuanHoaTen(name) {
    return String(name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  // Tìm store trong danh sách config.stores khớp với 1 đoạn text bất kỳ (tên
  // cào được từ BI, tên nhóm LINE...) — so lỏng, chứa nhau là được.
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

  var api = {
    getSiteCode: getSiteCode,
    setSiteCode: setSiteCode,
    fetchConfig: fetchConfig,
    saveConfig: saveConfig,
    listSiteCodes: listSiteCodes,
    askSiteCode: askSiteCode,
    chuanHoaTen: chuanHoaTen,
    matchStoreByText: matchStoreByText
  };

  // @require chạy CHUNG bối cảnh (sandbox hay không) với userscript đã nạp nó,
  // nên gán vào "window" bình thường ở đây (KHÔNG ép unsafeWindow — khác hẳn
  // trường hợp đọc biến do TRANG tự set như window.RTSHARE, vốn luôn nằm ở
  // window thật bất kể userscript có sandbox hay không). Gán thêm vào
  // unsafeWindow (nếu khác window) để chắc ăn cho mọi kiểu @grant.
  window.DMXCluster = api;
  try { if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) unsafeWindow.DMXCluster = api; } catch (e) {}
})();
