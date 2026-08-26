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
 *   getCachedConfig(siteCode?)          — bản sao config trên máy, ĐỌC NGAY
 *                                          (đồng bộ) cho chỗ cần vẽ liền.
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

  // Bản sao cấu hình cụm lưu ngay trên máy. Vài chỗ CẦN cấu hình NGAY LÚC VẼ
  // (thẻ mục tiêu trong nv.html, gắn store_key cho từng dòng hàng ở
  // realtimenv.html) — chờ mạng xong mới vẽ được thì trang giật/hụt, nên đọc
  // bản sao này trước, còn fetchConfig() chạy nền để làm mới cho lần sau.
  var LS_CACHE = 'dmx_cluster_config_cache';
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

  async function docConfigTheoMa(siteCode) {
    var url = SB_URL + '/rest/v1/' + TABLE + '?select=config&site_code=eq.' + encodeURIComponent(siteCode);
    var res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    if (!res.ok) throw new Error('Đọc cấu hình cụm lỗi HTTP ' + res.status);
    var rows = await res.json();
    return (rows && rows[0] && rows[0].config) || null;
  }

  // Mã cụm lưu ở mỗi origin một bản (localStorage/GM riêng), gõ tay nên hay
  // lệch dấu — tra hụt là script báo "chưa có cấu hình" dù cụm vẫn còn nguyên
  // trên Supabase. Nên khi tra khít không ra thì dò lại theo dạng chuẩn hoá,
  // và ghi mã ĐÚNG vào lastCanonicalSiteCode để chỗ gọi lưu đè lại mã cũ bị
  // lệch (không tự setSiteCode ở đây vì mỗi script cất mã một kiểu — có script
  // dùng GM storage chứ không phải localStorage này).
  var lastCanonicalSiteCode = '';
  async function fetchConfig(siteCode) {
    if (!siteCode) return null;
    lastCanonicalSiteCode = '';
    var config = await docConfigTheoMa(siteCode);
    if (!config) {
      var r = await resolveSiteCode(siteCode);
      // Chỉ tự sửa khi khác mỗi dấu/hoa-thường — kiểu 'chua-nhau' phải hỏi,
      // để không âm thầm gắn người này vào cụm của người khác.
      if (r.code && r.kieu === 'bo-dau') {
        config = await docConfigTheoMa(r.code);
        if (config) { siteCode = r.code; lastCanonicalSiteCode = r.code; }
      } else if (r.code && r.kieu === 'chua-nhau') {
        var ok = await resolveSiteCodeXacNhan(siteCode);
        if (ok) {
          config = await docConfigTheoMa(ok);
          if (config) { siteCode = ok; lastCanonicalSiteCode = ok; }
        }
      }
    }
    if (config) setCachedConfig(siteCode, config);
    return config;
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

  // Mã cụm là chuỗi tự đặt, trước đây phải gõ lại CHÍNH XÁC từng ký tự ở mỗi
  // origin (BI, namkphong.github.io, report.mwgroup.vn, baocao...). Với mã có
  // dấu tiếng Việt + khoảng trắng như "Cụm 14285" thì cực dễ lệch (đã xảy ra
  // thật: một origin lưu "14285" nên tra không ra bản ghi "Cụm 14285", script
  // báo "chưa có cấu hình" dù đã cào số xong). Nên: so mã theo dạng đã chuẩn
  // hoá (bỏ dấu, bỏ ký tự đặc biệt, thường hoá) — khớp trọn vẹn trước, rồi mới
  // tới khớp CHỨA NHAU và chỉ nhận khi duy nhất 1 ứng viên (nhiều ứng viên thì
  // không đoán bừa, trả về rỗng để hỏi lại cho chắc).
  // Trả về { code, kieu } — kieu: 'khit' (trùng khít), 'bo-dau' (chỉ khác dấu/
  // hoa-thường/ký tự đặc biệt), 'chua-nhau' (chứa nhau, CẦN hỏi lại), '' (không
  // ra). Phân biệt 'chua-nhau' là bắt buộc: một Quản lý MỚI gõ "1359" để tạo
  // cụm riêng mà bị tự động gắn vào cụm "cum1359" của người khác thì thành lẫn
  // dữ liệu giữa 2 người — nên chỗ gọi phải xác nhận trước khi dùng.
  async function resolveSiteCode(input) {
    input = (input || '').trim();
    if (!input) return { code: '', kieu: '' };
    var codes = await listSiteCodes();
    if (codes.indexOf(input) !== -1) return { code: input, kieu: 'khit' };
    var t = chuanHoaTen(input);
    if (!t) return { code: '', kieu: '' };
    var bangNhau = codes.filter(function (c) { return chuanHoaTen(c) === t; });
    if (bangNhau.length === 1) return { code: bangNhau[0], kieu: 'bo-dau' };
    var chuaNhau = codes.filter(function (c) {
      var n = chuanHoaTen(c);
      return n && (n.indexOf(t) !== -1 || t.indexOf(n) !== -1);
    });
    if (chuaNhau.length === 1) return { code: chuaNhau[0], kieu: 'chua-nhau' };
    return { code: '', kieu: '' };
  }

  // Như resolveSiteCode nhưng CHỈ trả mã khi chắc chắn: khớp lỏng kiểu chứa
  // nhau thì hỏi người dùng xác nhận. Dùng cho mọi chỗ tự sửa mã cũ bị lệch.
  async function resolveSiteCodeXacNhan(input) {
    var r = await resolveSiteCode(input);
    if (!r.code) return '';
    if (r.kieu === 'chua-nhau') {
      if (!window.confirm('Không có cụm nào tên đúng "' + input + '".\n\nDùng cụm "' + r.code + '" phải không?\n\n(Bấm Huỷ nếu bạn muốn TẠO CỤM MỚI tên "' + input + '" — đừng dùng chung cụm của người khác.)')) return '';
    }
    return r.code;
  }

  // Hỏi site_code theo cách ÍT LỖI hơn window.prompt trống: CHỈ ĐÚNG 1 cụm đã
  // có sẵn trong toàn hệ thống thì TỰ DÙNG LUÔN, không hỏi gì cả (mỗi máy/mỗi
  // trang chỉ cần vậy 1 lần, sau lưu local). Nếu nhiều cụm thì cho CHỌN THEO
  // SỐ THỨ TỰ (gõ "1"/"2"...) thay vì bắt gõ lại nguyên mã — gõ tay mã có dấu
  // trên điện thoại là nguồn lỗi chính. Vẫn cho gõ mã mới để tạo cụm khác.
  // Trả về chuỗi đã .trim() (rỗng nếu người dùng huỷ/không nhập).
  async function askSiteCode(promptExtra) {
    var codes = await listSiteCodes();
    if (codes.length === 1) return codes[0]; // chỉ 1 cụm -> khỏi hỏi, dùng luôn
    var msg = 'Mã cụm (site code) của bạn';
    if (codes.length > 1) {
      msg += ' — GÕ SỐ để chọn cụm đã có:\n' +
        codes.map(function (c, i) { return '  ' + (i + 1) + ' = ' + c; }).join('\n') +
        '\n(hoặc gõ 1 mã mới để tạo cụm khác)';
    } else {
      msg += ' — CHƯA có cụm nào, tự đặt 1 mã dễ nhớ (dùng thống nhất về sau):';
    }
    if (promptExtra) msg += '\n' + promptExtra;
    var tra = (window.prompt(msg, '') || '').trim();
    if (!tra) return '';
    if (/^\d+$/.test(tra) && codes[+tra - 1]) return codes[+tra - 1];  // chọn theo số
    var canon = await resolveSiteCodeXacNhan(tra);   // gõ tay lệch dấu vẫn nhận ra
    return canon || tra;   // không ra thì coi như đặt mã mới
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
    setCachedConfig(siteCode, config);
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
    getCachedConfig: getCachedConfig,
    saveConfig: saveConfig,
    listSiteCodes: listSiteCodes,
    askSiteCode: askSiteCode,
    resolveSiteCode: resolveSiteCode,
    resolveSiteCodeXacNhan: resolveSiteCodeXacNhan,
    // Mã cụm ĐÚNG mà fetchConfig() vừa dò ra khi mã đang lưu bị lệch — chỗ gọi
    // nên lưu đè lại bằng cơ chế cất mã của riêng nó. Rỗng nếu không phải sửa.
    canonicalSiteCode: function () { return lastCanonicalSiteCode; },
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
