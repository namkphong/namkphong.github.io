// ==UserScript==
// @name         DMX — Lấy số BI (đa cụm)
// @namespace    namkphong.github.io
// @version      2.7.0
// @description  Cào số bán từ bi.thegioididong.com bằng điện thoại, đẩy Supabase, nạp vào nv.html + sieuthi.html. Dùng chung cho nhiều cụm (mỗi Quản lý tự đặt site_code, cấu hình lưu trên Supabase, tự dò mã BI đổi theo tháng).
// @author       Phong
// @match        https://bi.thegioididong.com/*
// @match        https://namkphong.github.io/*
// @run-at       document-idle
// @grant        none
// @require      https://namkphong.github.io/dmx-cluster-shared.js
// @updateURL    https://namkphong.github.io/dmx.user.js
// @downloadURL  https://namkphong.github.io/dmx.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VER = '2.7.0';
  document.documentElement.setAttribute('data-dmx', VER); // trang dmx.html dò thuộc tính này

  /* ================================================================== */
  /* CẤU HÌNH                                                           */
  /* ================================================================== */
  var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  var SB_KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
  var KV_KEY = 'biRawCapture';
  var BUCKET = 'bc';                                                   // Supabase Storage: kho ảnh cho bot LINE

  // Tên/mã siêu thị của TỪNG CỤM giờ lấy từ Supabase (bảng dmx_clusters, tra
  // theo "site_code" — mỗi Quản lý tự đặt 1 lần) thay vì đóng cứng cho cụm
  // 14285 như trước — để nhiều Quản lý (cụm khác) dùng chung được bộ script
  // này. Xem dmx-cluster-shared.js (@require ở đầu file) + ensureClusterConfig()
  // bên dưới. 4 biến dưới đây được DỰNG LẠI từ config lúc khởi động (giữ
  // nguyên shape cũ để phần code phía sau khỏi phải sửa).
  var LINE_CODE = {}; // tên siêu thị -> mã file/nhóm LINE
  var STORES = {};    // id BI (có .0) -> tên siêu thị
  var IDS = {};        // tên siêu thị -> id BI (có .0), dùng cho sieu-thi-con
  var RAWID = {};       // tên siêu thị -> id BI (không .0), dùng cho thi-dua-st
  var CLUSTER_CONFIG = null; // config đầy đủ vừa tải (stores/groupToStore/...)

  var LS_STAGE = 'dmx_stage_v1';
  var LS_AUTH  = 'dmx_sb_auth_v1';
  var LS_QUEUE = 'dmx_queue_v1';

  var NV_FIELDS = { o1: 'target-input', o2: 'revenue-input', o3: 'details-input', o4: 'credit-input' };

  /* ================================================================== */
  /* TIỆN ÍCH CHUNG                                                     */
  /* ================================================================== */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function waitFor(fn, timeout, step) {
    timeout = timeout || 15000; step = step || 300;
    var t0 = Date.now();
    for (;;) {
      var v; try { v = fn(); } catch (e) { v = null; }
      if (v) return v;
      if (Date.now() - t0 > timeout) return null;
      await sleep(step);
    }
  }

  function jget(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }

  /* ================================================================== */
  /* CẤU HÌNH CỤM (đa cụm) — mỗi Quản lý tự đặt "site_code" 1 lần, toàn  */
  /* bộ tên/mã siêu thị nằm trên Supabase (bảng dmx_clusters). Xem       */
  /* dmx-cluster-shared.js (@require ở đầu file).                       */
  /* ================================================================== */

  // Dựng lại 4 biến "kiểu cũ" (LINE_CODE/STORES/IDS/RAWID) từ config vừa tải
  // — giữ nguyên shape cũ để phần code cào số phía dưới khỏi phải sửa.
  function buildLegacyMaps(config) {
    LINE_CODE = {}; STORES = {}; IDS = {}; RAWID = {};
    (config.stores || []).forEach(function (s) {
      LINE_CODE[s.name] = s.key;
      if (s.biRawId) {
        IDS[s.name] = s.biRawId + '.0';
        RAWID[s.name] = s.biRawId;
        STORES[s.biRawId] = s.name;
        STORES[s.biRawId + '.0'] = s.name;
      }
    });
  }

  // Lần đầu tiên 1 site_code chưa có cấu hình trên Supabase — TỰ DÒ tên + số
  // lượng siêu thị + mã BI tháng này, từ CHÍNH ô chọn siêu thị (select#filter-
  // store) mà maybeRefreshBiRawIds() bên dưới vẫn dùng để tự cập nhật mã BI
  // hàng tháng — không cần gõ tay tên/đếm số lượng. Chỉ hỏi xác nhận 1 "mã
  // ngắn nội bộ" (key, dùng đặt tên file/ảnh) mỗi siêu thị — mã này KHÔNG có
  // nguồn nào để tự suy chắc chắn (không liên quan tên hay mã BI), nhưng đã
  // gợi ý sẵn nên thường chỉ cần bấm OK. Mã MWG cố định (mwgCode, cần cho
  // dmx-gio-cong.user.js/dashboard-77) để trống — dmx-gio-cong.user.js tự dò
  // bổ sung khi chạy trên baocao.dienmayxanh.com (nơi CÓ hiện mã này rõ ràng).
  //
  // Trang HIỆN TẠI phải có select#filter-store thì mới dò được (thường là
  // trang sieu-thi-con) — nếu không, trả về null, ensureClusterConfig() sẽ
  // báo rõ cần mở đúng loại trang nào.
  // Trang "sieu-thi-con" là nguồn DUY NHẤT đáng tin cho biRawId (mã xoay theo
  // tháng, dùng trong tabURL/thiDuaURL) — CÙNG select#filter-store nhưng trên
  // trang "khoi-ban-hang-sub" lại hiện mã MWG cố định (14285/8807, KHÔNG xoay
  // tháng) trong ô value, đã xác nhận trực tiếp trên trang thật. Trộn 2 nguồn
  // này từng làm ghi đè biRawId ĐÚNG thành SAI mỗi khi mở lại trang
  // khoi-ban-hang-sub (dùng để tự dò tên/số lượng siêu thị lần đầu). Nên: chỉ
  // lấy biRawId khi CHẮC CHẮN đang ở sieu-thi-con; các trang khác (vd
  // khoi-ban-hang-sub) chỉ dùng để dò TÊN, để trống biRawId — sieu-thi-con sẽ
  // tự điền đúng ở lần ghé sau (đằng nào cũng ghé mỗi ngày lúc cào số o2/o3/o4).
  function isSieuThiConPage() { return location.pathname.indexOf('sieu-thi-con') !== -1; }

  // cuStores (tuỳ chọn) = danh sách đang lưu, để dò LẠI mà không mất những thứ
  // không đọc được từ trang: "key" Quản lý đã đặt (quyết định tên file/ảnh —
  // đổi là lệch hết dữ liệu cũ) và mã đã dò được trước đó.
  async function autoDetectStoresFromFilterSelect(site, cuStores) {
    var sel = document.getElementById('filter-store');
    if (!sel || !sel.options || !sel.options.length) return null;
    var onSieuThiCon = isSieuThiConPage();
    var month = todayISO().slice(0, 7);
    var stores = [];
    function cuCua(name) {
      return (cuStores || []).filter(function (s) { return DMXCluster.matchStoreByText([s], name); })[0] || null;
    }
    for (var i = 0; i < sel.options.length; i++) {
      var opt = sel.options[i];
      var rawText = (opt.textContent || '').trim();
      var rawVal = (opt.value || '').replace(/\.0$/, '');
      if (!rawText || !rawVal) continue;
      // Text dạng "<mã MWG>-<vùng>_<khu> - <Tên siêu thị>" — lấy phần TÊN sau
      // dấu " - " CUỐI để khỏi lẫn với mã đứng đầu chuỗi.
      var parts = rawText.split(' - ');
      var name = parts.length > 1 ? parts[parts.length - 1].trim() : rawText;
      if (stores.some(function (s) { return s.name === name; })) continue; // ô chọn hay lặp lại cùng 1 siêu thị nhiều lần
      var cu = cuCua(name);

      // Ngoài trang sieu-thi-con, value của ô chọn CHÍNH LÀ mã MWG cố định —
      // đã kiểm chứng trên trang thật (khoi-ban-hang-sub: value 14285/8807
      // trùng đúng mã MWG xác minh được bên baocao.dienmayxanh.com, và trùng
      // luôn số mở đầu chuỗi text). Chỉ nhận khi 2 nguồn đó khớp nhau, để
      // không đoán bừa nếu trang khác có cấu trúc khác. Lấy được ở đây thì
      // Quản lý mới khỏi phải chạy thêm bước "🔍 Tự dò mã MWG" bên trang giờ công.
      var mDau = /^(\d+)\s*-/.exec(rawText);
      var mwgTuTrang = (!onSieuThiCon && mDau && mDau[1] === rawVal) ? rawVal : '';

      var mTen = /^(\d+)/.exec(name);
      var defKey = (cu && cu.key) || (mTen ? mTen[1] : DMXCluster.chuanHoaTen(name).slice(0, 8));
      var key = (window.prompt('Đã tự dò siêu thị "' + name + '" — xác nhận mã ngắn nội bộ (key, đặt tên file/ảnh — nếu đã dùng bộ đặt tên cũ thì gõ ĐÚNG mã cũ vào đây):', defKey) || defKey).trim();
      stores.push({
        key: key,
        name: name,
        mwgCode: mwgTuTrang || (cu && cu.mwgCode) || '',
        biRawId: onSieuThiCon ? rawVal : ((cu && cu.biRawId) || ''),
        biRawIdMonth: onSieuThiCon ? month : ((cu && cu.biRawIdMonth) || '')
      });
    }
    if (!stores.length) return null;
    var cfgCu = CLUSTER_CONFIG || {};
    var config = {
      stores: stores,
      groupToStore: cfgCu.groupToStore || {},
      biClusterO1Id: cfgCu.biClusterO1Id || '-1',
      biClusterO2Id: cfgCu.biClusterO2Id || ''
    };
    await DMXCluster.saveConfig(site, config);
    var thieuMwg = stores.filter(function (s) { return !s.mwgCode; });
    window.alert('Đã dò và lưu ' + stores.length + ' siêu thị cho cụm "' + site + '":\n' +
      stores.map(function (s) { return '· ' + s.name + (s.mwgCode ? ' (mã ' + s.mwgCode + ')' : ''); }).join('\n') +
      (onSieuThiCon ? '' : '\n\nMã BI (đổi theo tháng) sẽ tự dò thêm khi mở trang "sieu-thi-con".') +
      (thieuMwg.length ? '\n\nChưa có mã MWG cho: ' + thieuMwg.map(function (s) { return s.name; }).join(', ') +
        ' — bấm "🔍 Tự dò mã MWG" trên baocao.dienmayxanh.com.' : ''));
    return config;
  }

  // Chạy 1 lần lúc khởi động (cả 2 origin bi.thegioididong.com lẫn
  // namkphong.github.io) — TRƯỚC boot(), vì mọi panel đều cần LINE_CODE/
  // STORES/IDS/RAWID đã dựng xong.
  async function ensureClusterConfig() {
    // pickSiteCode() tự lo hết: mã đang lưu (sửa nếu lệch dấu) -> tên cụm đọc
    // thẳng từ ô #selectRSM trên trang BI -> chỉ có 1 cụm -> mới hỏi. Trên BI
    // thì gần như không bao giờ phải hỏi (xem dmx-cluster-shared.js).
    var got;
    try { got = await DMXCluster.pickSiteCode(DMXCluster.getSiteCode(), '(dùng THỐNG NHẤT trên mọi trang — BI lẫn namkphong.github.io)'); }
    catch (e) { throw new Error('Không tải được cấu hình cụm: ' + (e.message || e)); }
    var site = got.code;
    if (!site) throw new Error('Chưa có mã cụm — không thể chạy.');
    if (site !== DMXCluster.getSiteCode()) DMXCluster.setSiteCode(site);

    var config = got.config;
    if (!config) config = await autoDetectStoresFromFilterSelect(site);
    if (!config) {
      throw new Error('Chưa có cấu hình cụm "' + site + '" — mở 1 trang BI có ô chọn siêu thị (vd trang "sieu-thi-con", hoặc chạm tên 1 siêu thị trên trang cụm) để hệ thống tự dò, rồi tải lại.');
    }

    // Ghi lại những gì tự đọc được từ trang: mã "Khối bán hàng" (Ô2 — chính là
    // value ô #selectRSM, trước phải tự tìm "id=" trong URL rồi gõ tay) và mã
    // nhân viên MWG. Mã nhân viên là thứ giúp các trang KHÁC (giờ công,
    // report.mwgroup.vn) nhận ra cụm mà khỏi hỏi lần nào.
    if (DMXCluster.apDungDauHieu(config, got)) {
      try { await DMXCluster.saveConfig(site, config); } catch (e) { console.warn('[dmx] Lưu dấu hiệu cụm lỗi:', e); }
    }

    CLUSTER_CONFIG = config;
    buildLegacyMaps(config);
  }

  // Dò LẠI danh sách siêu thị cho cụm ĐÃ CÓ cấu hình. Trước đây autoDetect chỉ
  // chạy khi cụm chưa có cấu hình, nên một cụm lỡ lưu sai (thiếu siêu thị, tên
  // lẫn mã, trùng lặp — đã xảy ra thật với 1 cụm dùng bản cũ) thì không tự sửa
  // được, phải nhờ người quản trị sửa tay trên Supabase. Nút này cho mỗi Quản
  // lý tự dò lại. Giữ nguyên "key" cũ của siêu thị nào tên vẫn khớp, để dữ
  // liệu/ảnh đã đẩy theo key đó không bị lệch khoá.
  async function redetectStores(ui) {
    var site = DMXCluster.getSiteCode();
    if (!site) { window.alert('Chưa có mã cụm.'); return; }
    var sel = document.getElementById('filter-store');
    if (!sel || !sel.options || !sel.options.length) {
      window.alert('Trang này không có ô chọn siêu thị.\nMở trang BI của cụm (vd "khoi-ban-hang-sub" hoặc "sieu-thi-con") rồi bấm lại.');
      return;
    }
    var cu = (CLUSTER_CONFIG && CLUSTER_CONFIG.stores) || [];
    var moTa = cu.length ? cu.map(function (s) { return s.name; }).join(', ') : '(chưa có)';
    if (!window.confirm('Dò lại danh sách siêu thị cho cụm "' + site + '"?\n\nĐang lưu: ' + moTa + '\n\nDanh sách sẽ được dựng lại từ ô chọn siêu thị của trang này.')) return;
    var config = await autoDetectStoresFromFilterSelect(site, cu);
    if (!config) { window.alert('Không dò được siêu thị nào từ trang này.'); return; }
    CLUSTER_CONFIG = config;
    buildLegacyMaps(config);
    if (ui && ui.log) ui.log('✓ Đã dò lại: ' + config.stores.map(function (s) { return s.name; }).join(', '));
    window.alert('Xong — tải lại trang để áp dụng.');
  }

  // Cho CHỌN trong danh sách cụm đã có (gõ số) thay vì bắt gõ lại nguyên mã.
  async function changeSiteCode() {
    var cur = DMXCluster.getSiteCode();
    var site = await DMXCluster.askSiteCode('(đang dùng: "' + cur + '")');
    if (!site || site === cur) return;
    DMXCluster.setSiteCode(site);
    window.alert('Đã đổi mã cụm — tải lại trang để áp dụng.');
  }

  // Trang BI có ô chọn siêu thị (select#filter-store, giá trị = mã BI THÁNG
  // NÀY) trên nhiều loại trang khác nhau — tận dụng THỤ ĐỘNG: bất cứ lúc nào
  // gặp ô này (không cần điều hướng riêng), tự đối chiếu tên rồi lưu lại nếu
  // mã đã đổi tháng. Cố tình KHÔNG chen vào state machine runQueue() sẵn có —
  // an toàn hơn nhiều so với thêm 1 bước điều hướng riêng vào hàng đợi.
  async function maybeRefreshBiRawIds() {
    if (!CLUSTER_CONFIG || !CLUSTER_CONFIG.stores || !CLUSTER_CONFIG.stores.length) return;
    if (!isSieuThiConPage()) return; // xem lý do ở isSieuThiConPage() — chỉ trang này mới có mã ĐÚNG
    var sel = document.getElementById('filter-store');
    if (!sel || !sel.options || !sel.options.length) return;
    var month = todayISO().slice(0, 7);
    var changed = false;
    CLUSTER_CONFIG.stores.forEach(function (s) {
      if (s.biRawIdMonth === month) return; // đã đúng tháng này rồi
      for (var i = 0; i < sel.options.length; i++) {
        var opt = sel.options[i];
        if (!DMXCluster.matchStoreByText([s], opt.textContent || '')) continue;
        var val = (opt.value || '').replace(/\.0$/, '');
        if (!val) continue;
        s.biRawId = val; s.biRawIdMonth = month; changed = true;
        break;
      }
    });
    if (!changed) return;
    buildLegacyMaps(CLUSTER_CONFIG);
    try {
      await DMXCluster.saveConfig(DMXCluster.getSiteCode(), CLUSTER_CONFIG);
      console.log('[dmx] Đã tự dò + cập nhật mã BI tháng ' + month + '.');
    } catch (e) { console.warn('[dmx] Dò được mã BI mới nhưng lưu lên Supabase lỗi:', e); }
  }

  // Trích bảng y hệt thao tác bôi đen + copy tay: giữ nguyên \t và các ô trống
  // liên tiếp — đúng định dạng mà parser của nv.html / sieuthi.html cần.
  function grabTable(tbl) {
    var r = document.createRange();
    r.selectNode(tbl);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    var txt = sel.toString();
    sel.removeAllRanges();
    return txt;
  }

  /* ---- NHẬT KÝ · giữ lại qua mỗi lần trang tải lại ----
     Trên điện thoại không mở được console, mà trang lại hay tự tải lại.
     Nhật ký nằm trong localStorage nên mở panel là thấy nguyên chuyện vừa xảy ra. */
  var LS_LOG = 'dmx_log_v1';
  function stamp() {
    var t = new Date();
    return pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds());
  }
  function logPush(m) {
    var line = stamp() + ' ' + m;
    var arr = jget(LS_LOG) || [];
    arr.push(line);
    if (arr.length > 300) arr = arr.slice(-300);
    try { localStorage.setItem(LS_LOG, JSON.stringify(arr)); } catch (e) {}
    return line;
  }
  function logRead() { return (jget(LS_LOG) || []).join('\n'); }
  function logClear() { try { localStorage.removeItem(LS_LOG); } catch (e) {} }

  /* ================================================================== */
  /* BỘ KHUNG GIAO DIỆN (dùng chung cho cả 3 trang)                      */
  /* ================================================================== */
  var CSS = [
    '.dmx-bub{position:fixed;right:14px;bottom:14px;z-index:2147483646;width:56px;height:56px;',
    'border-radius:50%;background:#0b1220;border:2px solid #2dd4ff;color:#2dd4ff;display:flex;',
    'align-items:center;justify-content:center;font:700 13px/1 ui-monospace,Menlo,monospace;',
    'letter-spacing:.06em;box-shadow:0 6px 20px rgba(0,0,0,.5);cursor:pointer;user-select:none;',
    '-webkit-tap-highlight-color:transparent}',
    '.dmx-p{position:fixed;left:8px;right:8px;bottom:12px;z-index:2147483647;background:#0b1220;',
    'border:1px solid #2dd4ff;border-radius:14px;padding:14px;color:#e6f6ff;',
    'font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    'box-shadow:0 12px 40px rgba(0,0,0,.55);max-height:82vh;overflow:auto}',
    '.dmx-p h4{margin:0 0 10px;font:600 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;',
    'color:#2dd4ff;text-transform:uppercase;border-bottom:1px solid #1e3a55;padding-bottom:9px}',
    '.dmx-p .x{position:absolute;top:9px;right:14px;color:#8fb6cc;font-size:22px;line-height:1;cursor:pointer}',
    '.dmx-p .row{display:flex;justify-content:space-between;gap:12px;margin:5px 0;font-size:13px;color:#9fc4dc}',
    '.dmx-p .row b{color:#fff;text-align:right;font-weight:600}',
    '.dmx-p button{display:block;width:100%;margin:7px 0;padding:12px;border:0;border-radius:8px;',
    'background:#1d9bf0;color:#fff;font-size:14px;font-weight:600;cursor:pointer}',
    '.dmx-p button:active{opacity:.65}',
    '.dmx-p button.go{background:#16a34a}',
    '.dmx-p button.sm{background:#243b52;font-weight:500;font-size:13px;padding:9px;margin:5px 0}',
    '.dmx-p .sep{margin:12px 0 4px;font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;',
    'color:#5d8299;text-transform:uppercase}',
    '.dmx-log{background:#000;color:#3bf07a;font:11px/1.55 ui-monospace,Menlo,monospace;padding:9px;',
    'border-radius:6px;height:130px;overflow:auto;margin-top:10px;white-space:pre-wrap;word-break:break-word}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('dmx-css')) return;
    var s = document.createElement('style');
    s.id = 'dmx-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  // Nút bong bóng; chạm vào mới dựng panel, không chiếm màn hình khi không dùng
  function mount(title, build, autoOpen) {
    injectCSS();
    var bub = document.createElement('div');
    bub.className = 'dmx-bub';
    bub.textContent = 'DMX';
    document.body.appendChild(bub);

    function open() {
      bub.style.display = 'none';
      var box = document.createElement('div');
      box.className = 'dmx-p';
      box.innerHTML = '<span class="x">&times;</span><h4>' + title + ' · v' + VER + '</h4>';
      document.body.appendChild(box);

      var logEl = document.createElement('div');
      logEl.className = 'dmx-log';

      var api = {
        rows: {},
        row: function (label, id) {
          var d = document.createElement('div');
          d.className = 'row';
          d.innerHTML = '<span></span><b>—</b>';
          d.firstChild.textContent = label;
          box.appendChild(d);
          api.rows[id] = d.querySelector('b');
          return api;
        },
        sep: function (t) {
          var d = document.createElement('div');
          d.className = 'sep'; d.textContent = t;
          box.appendChild(d); return api;
        },
        btn: function (label, cls, fn) {
          var b = document.createElement('button');
          b.className = cls; b.textContent = label;
          b.onclick = function () {
            Promise.resolve().then(fn).catch(function (e) { api.log('✗ ' + (e.message || e)); });
          };
          box.appendChild(b); return api;
        },
        log: function (m) {
          logEl.textContent += logPush(m) + '\n';
          logEl.scrollTop = logEl.scrollHeight;
        },
        done: function () {
          var old = logRead();
          if (old) logEl.textContent = old + '\n';
          box.appendChild(logEl);
          var cp = document.createElement('button');
          cp.className = 'sm'; cp.textContent = 'Chép nhật ký';
          cp.onclick = function () {
            var t = logRead();
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(t).then(function () { api.log('Đã chép nhật ký.'); },
                                                    function () { window.prompt('Chép tay:', t); });
            } else { window.prompt('Chép tay:', t); }
          };
          box.appendChild(cp);
          logEl.scrollTop = logEl.scrollHeight;
        }
      };

      box.querySelector('.x').onclick = function () {
        box.remove(); bub.style.display = 'flex';
      };

      build(api);
      api.done();
    }

    bub.addEventListener('click', open);
    if (autoOpen) open();
  }

  /* ================================================================== */
  /* SUPABASE                                                           */
  /* ================================================================== */
  function decodeUid(tok) {
    var p = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(p)))).sub;
  }

  // Trên BI: đăng nhập bằng email/mật khẩu, token lưu trong máy.
  // NHẬP MẬT KHẨU 1 LẦN: lưu kèm refresh_token để lần sau token hết hạn thì tự
  // làm mới NGẦM (không hỏi lại). KHÔNG lưu mật khẩu — chỉ lưu refresh token.
  function saveAuth(email, j) {
    var auth = {
      email: email, token: j.access_token, refresh: j.refresh_token,
      uid: decodeUid(j.access_token), exp: Date.now() + (j.expires_in - 60) * 1000
    };
    localStorage.setItem(LS_AUTH, JSON.stringify(auth));
    return auth;
  }
  async function biAuth(log) {
    var a = jget(LS_AUTH);
    if (a && a.exp > Date.now()) return a;                       // token còn hạn
    // Token hết hạn nhưng còn refresh_token → làm mới ngầm, khỏi nhập mật khẩu.
    if (a && a.refresh) {
      try {
        var r = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: a.refresh })
        });
        var rj = await r.json();
        if (rj && rj.access_token) {
          if (log) log('Đã làm mới phiên Supabase (không cần nhập lại).');
          return saveAuth(a.email, { access_token: rj.access_token, refresh_token: rj.refresh_token || a.refresh, expires_in: rj.expires_in });
        }
      } catch (e) {}
      if (log) log('Phiên hết hạn lâu — cần nhập lại mật khẩu 1 lần.');
    }
    var email = (a && a.email) || prompt('Email Supabase (tài khoản nv.html):', '');
    if (!email) throw new Error('Chưa nhập email.');
    var pass = prompt('Mật khẩu Supabase:', '');
    if (!pass) throw new Error('Chưa nhập mật khẩu.');
    log('Đang đăng nhập Supabase…');
    var res = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: pass })
    });
    var j = await res.json();
    if (!j.access_token) throw new Error('Đăng nhập thất bại: ' + (j.error_description || j.msg || res.status));
    return saveAuth(email.trim(), j);
  }

  // Trên namkphong.github.io: mượn luôn phiên đăng nhập sẵn có của trang
  function siteToken() {
    var ks = Object.keys(localStorage).filter(function (k) { return k.indexOf('sb-') === 0; });
    for (var i = 0; i < ks.length; i++) {
      var v = jget(ks[i]);
      if (v && v.access_token) return v.access_token;
    }
    return null;
  }

  async function kvGet(token, uid) {
    var q = SB_URL + '/rest/v1/kv_store?select=payload&store_key=eq.' + KV_KEY +
            (uid ? '&user_id=eq.' + uid : '');
    var res = await fetch(q, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } });
    var rows = await res.json();
    return (rows && rows[0] && rows[0].payload) || null;
  }

  // Đọc bản cào có THỬ LẠI: khi tự chuyển từ BI sang nv.html, bản vừa đẩy đôi khi
  // chưa kịp hiện trên cloud / phiên đăng nhập trang chưa sẵn sàng ngay lúc trang
  // vừa tải. Thử lại vài lần cách nhau ~1.5s trước khi bỏ cuộc.
  async function kvGetRetry(auth, tries, log) {
    for (var i = 0; i < tries; i++) {
      var cap = await kvGet(auth.token, auth.uid);
      if (cap && cap.stores) return cap;
      if (i < tries - 1) {
        if (log) log('… chưa thấy bản cào trên cloud, thử lại (' + (i + 1) + '/' + (tries - 1) + ')…');
        await sleep(1500);
      }
    }
    return null;
  }

  async function kvPut(auth, payload) {
    var res = await fetch(SB_URL + '/rest/v1/kv_store?on_conflict=user_id,store_key', {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: 'Bearer ' + auth.token,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        user_id: auth.uid, store_key: KV_KEY,
        payload: payload, updated_at: new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error('Đẩy lỗi ' + res.status + ': ' + (await res.text()).slice(0, 150));
  }

  /* ================================================================== */
  /* ĐẨY ẢNH BÁO CÁO NHÂN VIÊN LÊN LINE (lệnh /bcnv của bot)            */
  /* nv.html expose window.NVSHARE.buildAll() -> mảng dataURL JPEG.      */
  /* Ta upload từng ảnh lên Supabase Storage 'bc' rồi ghi manifest       */
  /* bc/nv_cards.json để bot LINE /bcnv đọc và trả ảnh cho đúng nhóm.    */
  /* ================================================================== */
  function dataURLtoBytes(durl) {
    var b64 = String(durl).split(',')[1] || '';
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  function sbPublicUrl(key) { return SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + key; }
  async function sbStorageUpload(key, body, contentType) {
    var res = await fetch(SB_URL + '/storage/v1/object/' + BUCKET + '/' + key, {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': contentType, 'x-upsert': 'true'
      },
      body: body
    });
    if (!res.ok) throw new Error('upload ' + key + ' lỗi ' + res.status + ': ' + (await res.text()).slice(0, 120));
  }
  async function nvReadManifest() {
    try {
      var r = await fetch(sbPublicUrl('nv_cards.json') + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) return (await r.json()) || {};
    } catch (e) {}
    return {};
  }
  // Dựng ảnh cho siêu thị ĐANG CHỌN trên nv.html rồi đẩy lên Storage + cập nhật manifest.
  async function nvsPublish(name, log) {
    var code = LINE_CODE[name];
    if (!code) { log('⚠ Không có mã LINE cho "' + name + '" — bỏ qua đẩy ảnh.'); return; }
    if (!window.NVSHARE || !window.NVSHARE.ready) { log('⚠ nv.html chưa có NVSHARE (bản cũ?) — bỏ qua đẩy ảnh.'); return; }
    log('📷 Dựng ảnh báo cáo NV cho ' + name + '…');
    var imgs = await window.NVSHARE.buildAll();
    if (!imgs || !imgs.length) { log('⚠ Không dựng được ảnh (chưa có phân tích?).'); return; }
    var urls = [];
    for (var i = 0; i < imgs.length; i++) {
      var key = 'nv_' + code + '_' + (i + 1) + '.jpg';
      await sbStorageUpload(key, dataURLtoBytes(imgs[i]), 'image/jpeg');
      urls.push(sbPublicUrl(key));
    }
    log('☁ Đã đẩy ' + urls.length + ' ảnh cho ' + name + '.');
    var man = await nvReadManifest();
    man[code] = { date: todayISO(), label: name, images: urls };
    await sbStorageUpload('nv_cards.json', new TextEncoder().encode(JSON.stringify(man)), 'application/json');
    log('☁ Đã cập nhật manifest nv_cards.json (' + name + ').');
  }

  /* ================================================================== */
  /* ĐẨY ẢNH TRANG CÁ NHÂN NV LÊN LINE (lệnh /bc của bot)                */
  /* nv.html expose window.NVSHARE.buildPersonalAll() -> mảng dataURL,   */
  /* mỗi ảnh là Trang Cá Nhân của 1 nhân viên (đã có sẵn thẻ mục tiêu).  */
  /* Song song với nvsPublish() (đẩy nv_cards.json cho /bcnv), chỉ khác  */
  /* manifest + tiền tố tên file để không đè lên nhau.                  */
  /* ================================================================== */
  async function nvsReadPersonalManifest() {
    try {
      var r = await fetch(sbPublicUrl('nv_personal_cards.json') + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) return (await r.json()) || {};
    } catch (e) {}
    return {};
  }
  async function nvsPublishPersonal(name, log) {
    var code = LINE_CODE[name];
    if (!code) { log('⚠ Không có mã LINE cho "' + name + '" — bỏ qua đẩy Trang Cá Nhân.'); return; }
    if (!window.NVSHARE || !window.NVSHARE.ready || typeof window.NVSHARE.buildPersonalAll !== 'function') {
      log('⚠ nv.html chưa có NVSHARE.buildPersonalAll (bản cũ?) — bỏ qua đẩy Trang Cá Nhân.'); return;
    }
    log('📷 Dựng ảnh Trang Cá Nhân cho ' + name + '…');
    var imgs = await window.NVSHARE.buildPersonalAll();
    if (!imgs || !imgs.length) { log('⚠ Không dựng được ảnh Trang Cá Nhân (chưa có phân tích?).'); return; }
    var urls = [];
    for (var i = 0; i < imgs.length; i++) {
      var key = 'nvp_' + code + '_' + (i + 1) + '.jpg';
      await sbStorageUpload(key, dataURLtoBytes(imgs[i]), 'image/jpeg');
      urls.push(sbPublicUrl(key));
    }
    log('☁ Đã đẩy ' + urls.length + ' ảnh Trang Cá Nhân cho ' + name + '.');
    var man = await nvsReadPersonalManifest();
    man[code] = { date: todayISO(), label: name, images: urls };
    await sbStorageUpload('nv_personal_cards.json', new TextEncoder().encode(JSON.stringify(man)), 'application/json');
    log('☁ Đã cập nhật manifest nv_personal_cards.json (' + name + ').');
  }

  /* STRAM TUẦN (lệnh /tuan): nv.html sinh VĂN BẢN tổng kết tuần -> đẩy nv_stram_week.json */
  async function nvsReadWeekManifest() {
    try {
      var r = await fetch(sbPublicUrl('nv_stram_week.json') + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) return (await r.json()) || {};
    } catch (e) {}
    return {};
  }
  async function nvsPublishStramWeek(name, log) {
    var code = LINE_CODE[name];
    if (!code) { log('⚠ Không có mã LINE cho "' + name + '" — bỏ qua Mục Tiêu Tuần.'); return; }
    if (!window.NVSHARE || typeof window.NVSHARE.buildStramWeekImages !== 'function') {
      log('⚠ nv.html chưa có NVSHARE.buildStramWeekImages (bản cũ?) — bỏ qua Mục Tiêu Tuần.'); return;
    }
    log('📷 Dựng ảnh Mục Tiêu Tuần (AI) cho ' + name + '…');
    var imgs = await window.NVSHARE.buildStramWeekImages();
    if (!imgs || !imgs.length) { log('⚠ Không dựng được ảnh Mục Tiêu Tuần (chưa có phân tích?).'); return; }
    var urls = [];
    for (var i = 0; i < imgs.length; i++) {
      var key = 'nvw_' + code + '_' + (i + 1) + '.jpg';
      await sbStorageUpload(key, dataURLtoBytes(imgs[i]), 'image/jpeg');
      urls.push(sbPublicUrl(key));
    }
    log('☁ Đã đẩy ' + urls.length + ' ảnh Mục Tiêu Tuần cho ' + name + '.');
    var man = await nvsReadWeekManifest();
    man[code] = { date: todayISO(), label: name, images: urls };
    await sbStorageUpload('nv_stram_week.json', new TextEncoder().encode(JSON.stringify(man)), 'application/json');
    log('☁ Đã cập nhật Mục Tiêu Tuần nv_stram_week.json (' + name + ').');
  }

  /* ================================================================== */
  /* TRANG BI — CÀO SỐ                                                  */
  /* ================================================================== */
  function biPanel() {
    maybeRefreshBiRawIds().catch(function (e) { console.warn('[dmx] maybeRefreshBiRawIds lỗi:', e); }); // thụ động, không chờ
    function stage() { return jget(LS_STAGE) || { date: todayISO(), stores: {} }; }

    function store() {
      var m = /[?&]id=([0-9.]+)/.exec(location.search);
      if (m) {
        if (STORES[m[1]]) return STORES[m[1]];
        if (STORES[m[1] + '.0']) return STORES[m[1] + '.0'];
      }
      var txt = document.body.innerText || '';
      for (var id in STORES) if (txt.indexOf(STORES[id]) !== -1) return STORES[id];
      return null;
    }

    // KHÔNG dùng offsetParent để lọc: trên giao diện mobile, bảng nằm trong
    // khung position:fixed vẫn hiện nhưng offsetParent trả về null.
    function shown(t) {
      if (!t || !t.innerText) return false;
      var r = t.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }

    function allTables() {
      return [].slice.call(document.querySelectorAll('table')).filter(shown);
    }

    function vtable(marker) {
      var l = allTables();
      for (var i = 0; i < l.length; i++) {
        if (l[i].innerText.indexOf(marker) !== -1) return l[i];
      }
      return null;
    }

    // Bảng dài nhất đang hiện — dùng khi mốc chữ không khớp
    function bigTable() {
      return allTables().sort(function (a, b) {
        return b.innerText.length - a.innerText.length;
      })[0];
    }

    // Tìm theo mốc; không thấy thì lấy bảng dài nhất và báo rõ trong log
    async function findTable(marker, log, minLen) {
      var t = await waitFor(function () { return vtable(marker); }, 12000);
      if (t) return t;
      var b = bigTable();
      if (b && b.innerText.length > (minLen || 200)) {
        log('⚠ Không khớp mốc "' + marker + '", dùng bảng dài nhất (' + b.innerText.length + ' ký tự)');
        return b;
      }
      return null;
    }

    // Tab trên BI đổi bằng tham số ?tab= chứ không phải bấm nút. Đi thẳng bằng
    // địa chỉ chắc ăn hơn nhiều so với dò chữ trên nút, vốn hay lệch ở bản mobile.
    function curTab() {
      var m = /[?&]tab=([a-z0-9_-]+)/i.exec(location.search);
      return m ? m[1] : '';
    }

    function tabURL(code, name) {
      return 'https://bi.thegioididong.com/sieu-thi-con?id=' + IDS[name] +
             '&tab=' + code + '&rt=2&dm=1';
    }

    // Trang target ngành hàng — mỗi siêu thị một địa chỉ riêng
    function thiDuaURL(name) {
      return 'https://bi.thegioididong.com/thi-dua-st?id=' + RAWID[name] +
             '&tab=1&rt=2&dm=2&mt=1';
    }

    function onThiDua(name) {
      return location.pathname.indexOf('thi-dua-st') !== -1 &&
             location.search.indexOf('id=' + RAWID[name]) !== -1;
    }

    // Bấm nút tab — chỉ dùng khi chưa biết mã tab. So khớp lỏng, bỏ qua dấu cách thừa.
    function clickTab(part) {
      var want = part.toLowerCase().replace(/\s+/g, ' ').trim();
      var els = [].slice.call(document.querySelectorAll('a,button,li,span,div,[role=tab]'));
      for (var i = 0; i < els.length; i++) {
        var t = (els[i].textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (t && t.length < 60 && t.indexOf(want) !== -1) {
          var r = els[i].getBoundingClientRect();
          if (r.width > 0 && r.height > 0) { els[i].click(); return true; }
        }
      }
      return false;
    }

    function setSel(id, text) {
      var s = document.getElementById(id);
      if (!s) return false;
      var o = [].slice.call(s.options).filter(function (x) {
        return (x.text || '').indexOf(text) !== -1;
      })[0];
      if (!o) return false;
      s.value = o.value;
      s.dispatchEvent(new Event('change', { bubbles: true }));
      if (window.jQuery) { try { window.jQuery(s).trigger('change'); } catch (e) {} }
      return true;
    }

    function expandRow(tbl, re) {
      var row = [].slice.call(tbl.querySelectorAll('tr')).filter(function (tr) {
        return re.test(tr.textContent || '');
      })[0];
      if (!row) return false;
      var p = row.querySelector('i.fa-plus, i.fa-solid.fa-plus');
      if (p) { p.click(); return true; }
      return 'already';
    }

    /* ---- từng ô ---- */
    async function capO2(log) {
      log('Ô2 · DTQĐ nhân viên…');
      if (!await waitFor(function () { return document.getElementById('showdatacomprog'); }, 15000))
        throw new Error('Không thấy select chế độ — chưa ở tab BC Doanh thu nhân viên.');
      log('  đổi chế độ: ' + setSel('showdatacomprog', 'Ngành hàng chính'));
      await sleep(1300);
      var t = await findTable('BP All In One', log);
      if (!t) throw new Error('Không thấy bảng DTQĐ nhân viên. Bấm "Chẩn đoán bảng" để xem trang có gì.');
      expandRow(t, /BP All In One/);
      await sleep(1500);
      var txt = grabTable(vtable('BP All In One') || bigTable());
      if (txt.length < 100) throw new Error('Ô2 quá ngắn (' + txt.length + ').');
      log('Ô2 ✓ ' + txt.length + ' ký tự');
      return txt;
    }

    async function capO3(log) {
      log('Ô3 · Chương trình thi đua…');
      if (!setSel('showdatacomprog', 'Chương trình thi đua'))
        throw new Error('Không đổi được chế độ Chương trình thi đua.');
      await sleep(2500);
      var t = await findTable('BP All In One', log);
      if (!t) throw new Error('Bảng thi đua chưa render.');
      expandRow(t, /BP All In One/);
      await sleep(1500);
      var txt = grabTable(vtable('BP All In One') || bigTable());
      if (txt.length < 100) throw new Error('Ô3 quá ngắn.');
      log('Ô3 ✓ ' + txt.length + ' ký tự');
      return txt;
    }

    async function capO4(log) {
      log('Ô4 · Trả chậm…');
      if (!await waitFor(function () { return document.getElementById('mode-view-bctg'); }, 15000))
        throw new Error('Không thấy select trả chậm — chưa ở tab bctg.');
      log('  đổi chế độ: ' + setSel('mode-view-bctg', 'Tỷ Trọng Trả Chậm'));
      await sleep(2000);
      var t = await findTable('HomeCredit', log, 50);
      if (!t) throw new Error('Không thấy bảng Trả Chậm (mốc HomeCredit).');
      var txt = grabTable(t);
      if (txt.length < 50) throw new Error('Ô4 quá ngắn.');
      log('Ô4 ✓ ' + txt.length + ' ký tự');
      return txt;
    }

    // Ô riêng của sieuthi.html — tab bcdtnh, bắt buộc mở dấu + ở NNH Điện gia dụng
    async function capS1(log) {
      if (location.search.indexOf('tab=bcdtnh') === -1)
        throw new Error('Bấm "Mở tab Ngành hàng" trước đã.');
      log('S1 · Doanh thu ngành hàng…');
      if (!await waitFor(function () {
        var b = bigTable(); return b && b.innerText.length > 200 ? b : null;
      }, 20000)) throw new Error('Bảng ngành hàng chưa render.');
      expandRow(bigTable(), /Điện gia dụng/);
      await sleep(1500);
      var txt = grabTable(bigTable());
      if (txt.indexOf('Lọc nước') === -1)
        throw new Error('Thiếu ngành Lọc nước — dấu + của Điện gia dụng chưa mở. Mở tay rồi bấm lại.');
      log('S1 ✓ ' + txt.length + ' ký tự (có Lọc nước)');
      return txt;
    }

    async function capO1(log) {
      log('Ô1 · Target ngành hàng…');
      if (location.pathname.indexOf('thi-dua') === -1)
        throw new Error('Ô1 phải chạy trên trang thi-dua-st.');
      if (!await waitFor(function () {
        var b = bigTable(); return b && b.innerText.length > 150 ? b : null;
      }, 20000)) throw new Error('Bảng Target chưa render.');
      var all = allTables().filter(function (x) { return x.innerText.length > 80; });
      var txt = all.map(grabTable).join('\n');
      if (txt.length < 150) throw new Error('Ô1 quá ngắn (' + txt.length + ').');
      log('Ô1 ✓ ' + txt.length + ' ký tự (' + all.length + ' khối)');
      return txt;
    }

    mount('DMX · Lấy số', function (ui) {
      /* ---------------- hàng đợi chạy tự động ----------------
         Trang tải lại mỗi lần đổi tab, script bị nạp lại từ đầu.
         Nên tiến độ phải nằm trong localStorage chứ không thể giữ trong biến. */
      function qGet() { return jget(LS_QUEUE); }
      function qSet(q) { localStorage.setItem(LS_QUEUE, JSON.stringify(q)); }
      function qClear() { localStorage.removeItem(LS_QUEUE); }

      // Bảng hay chưa kịp render xong lúc trang còn đang tải (đặc biệt mạng
      // chậm/điện thoại) — thay vì dừng hẳn hàng đợi ngay lần lỗi đầu, tải lại
      // trang thử lại vài lần trước khi bỏ cuộc.
      var Q_MAX_RETRY = 3;

      // Mỗi bước tự khai báo: đang ở đúng trang chưa (at) và đi tới đâu (go)
      var PLAN = [
        { key: 'o1', fn: capO1,
          at: onThiDua,
          go: thiDuaURL },
        { key: 'o2', fn: capO2,
          at: function () { return curTab() === 'bcdtnv'; },
          go: function (n) { return tabURL('bcdtnv', n); } },
        { key: 'o3', fn: capO3,
          at: function () { return curTab() === 'bcdtnv'; },
          go: function (n) { return tabURL('bcdtnv', n); } },
        { key: 'o4', fn: capO4,
          at: function () { return curTab() === 'bctg'; },
          go: function (n) { return tabURL('bctg', n); } },
        { key: 's1', fn: capS1,
          at: function () { return curTab() === 'bcdtnh'; },
          go: function (n) { return tabURL('bcdtnh', n); } }
      ];

      async function runQueue(ui) {
        var q = qGet();
        if (!q) return;
        if (++q.hops > 40) { qClear(); ui.log('✗ Chạy vòng quá nhiều, đã dừng.'); return; }
        qSet(q);

        while (q.si < q.stores.length) {
          var name = q.stores[q.si];

          if (store() !== name) {                       // sang siêu thị kế tiếp
            ui.log('→ Chuyển sang ' + name + '…');
            qSet(q);
            location.href = PLAN[q.pi].go(name);
            return;
          }

          while (q.pi < PLAN.length) {
            var st = PLAN[q.pi];
            if (!st.at(name)) {                          // chưa đúng trang thì đi tới
              ui.log('→ Mở trang cho ' + st.key + '…');
              qSet(q);
              location.href = st.go(name);
              return;
            }
            try {
              save(st.key, await st.fn(ui.log));
            } catch (e) {
              ui.log('✗ ' + (e.message || e));
              var retry = (q.retry || 0) + 1;
              if (retry <= Q_MAX_RETRY) {
                ui.log('↻ Có thể bảng chưa kịp render — tải lại trang, thử lại (' + retry + '/' + Q_MAX_RETRY + ') sau 3s…');
                q.retry = retry; qSet(q);
                setTimeout(function () { location.reload(); }, 3000);
                return;
              }
              ui.log('✗ Đã thử lại ' + Q_MAX_RETRY + ' lần vẫn lỗi — dừng hàng đợi. Sửa xong bấm lại từng nút riêng.');
              qClear();
              return;
            }
            q.retry = 0; // bước này đã qua — reset đếm thử lại cho bước kế tiếp
            var vuaXong = st.key;
            q.pi++; qSet(q);
            // Nút lẻ / nhóm: dừng đúng chỗ, không chạy lan sang các ô khác.
            if (q.stop && vuaXong === q.stop) {
              qClear();
              ui.log('Xong ' + (q.stop === q.from ? q.stop : q.from + '→' + q.stop) + '.');
              return;
            }
          }

          q.si++; q.pi = 0; qSet(q);
        }

        qClear();
        ui.log('=== ĐÃ LẤY XONG CẢ ' + q.stores.length + ' SIÊU THỊ ===');
        try {
          await pushCloud(ui);
          ui.log('→ Tự mở nv.html để phân tích (chuỗi tự động)…');
          await sleep(1200);
          location.href = 'https://namkphong.github.io/nv.html#dmxauto';
        } catch (e) {
          ui.log('✗ Đẩy lỗi: ' + (e.message || e) + ' — KHÔNG chuyển trang. Sửa xong bấm "Đẩy lên Supabase" rồi mở nv.html.');
        }
      }

      async function pushCloud(ui) {
        var s = stage();
        var names = Object.keys(s.stores || {});
        if (!names.length) throw new Error('Chưa có gì để đẩy.');
        var auth = await biAuth(ui.log);
        ui.log('Gộp với bản trên cloud…');
        var remote = await kvGet(auth.token, auth.uid);
        if (!remote || !remote.stores || remote.date !== s.date) remote = { date: s.date, stores: {} };
        names.forEach(function (n) {
          remote.stores[n] = Object.assign({}, remote.stores[n], s.stores[n]);
        });
        remote.date = s.date;
        remote.capturedAt = new Date().toISOString();
        await kvPut(auth, remote);
        ui.log('☁ Đã đẩy: ' + names.join(', '));
      }

      function refresh() {
        var s = stage();
        ui.rows.st.textContent = store() || 'chưa vào siêu thị';
        ui.rows.dt.textContent = s.date;
        var out = [];
        Object.keys(s.stores || {}).forEach(function (n) {
          var k = Object.keys(s.stores[n]).filter(function (x) { return /^[os]\d$/.test(x); }).sort();
          out.push(n.split(' ').pop() + ': ' + k.join(' '));
        });
        ui.rows.got.textContent = out.length ? out.join(' | ') : 'chưa có';
      }

      function save(field, txt) {
        var n = store();
        if (!n) throw new Error('Chưa nhận diện được siêu thị.');
        var s = stage();
        if (s.date !== todayISO()) s = { date: todayISO(), stores: {} };
        s.stores[n] = s.stores[n] || {};
        s.stores[n][field] = txt;
        s.stores[n].at = new Date().toISOString();
        localStorage.setItem(LS_STAGE, JSON.stringify(s));
        refresh();
      }

      // Trước đây các nút lẻ cào thẳng trên tab đang mở — sai tab thì ra dữ liệu
      // rỗng hoặc của bảng khác. Giờ chúng đi qua đúng cơ chế của LẤY TẤT CẢ:
      // chưa ở đúng tab thì tự mở tab rồi cào tiếp sau khi trang tải lại.
      function idxOf(key) {
        for (var i = 0; i < PLAN.length; i++) if (PLAN[i].key === key) return i;
        return -1;
      }
      async function layO(from, to, ui) {
        var n = store();
        if (!n) throw new Error('Chưa nhận diện được siêu thị.');
        ui.log('--- ' + n + ' · ' + (from === to ? from : from + '→' + to) + ' ---');
        qSet({ stores: [n], si: 0, pi: idxOf(from), from: from, stop: to, hops: 0 });
        await runQueue(ui);
      }

      ui.row('Siêu thị', 'st').row('Ngày', 'dt').row('Đã lấy', 'got');

      ui.sep('Tự động');
      var tenCacSieuThi = CLUSTER_CONFIG.stores.map(function (s) { return s.name; });
      ui.btn('LẤY TẤT CẢ DATA (' + tenCacSieuThi.length + ' siêu thị)', 'go', async function () {
        qSet({ stores: tenCacSieuThi.slice(), si: 0, pi: 0, hops: 0 });
        ui.log('=== BẮT ĐẦU · trang sẽ tự tải lại nhiều lần ===');
        ui.log('Đừng chạm vào gì cho tới khi thấy ĐÃ LẤY XONG.');
        await runQueue(ui);
      });
      ui.btn('Dừng chạy tự động', 'sm', function () {
        qClear(); ui.log('Đã dừng hàng đợi.');
      });
      ui.btn('🔄 Dò lại danh sách siêu thị', 'sm', function () { return redetectStores(ui); });
      ui.btn('⚙ Đổi mã cụm (site code)', 'sm', changeSiteCode);

      ui.sep('Cho nv.html');
      ui.btn('Lấy Ô2 + Ô3 + Ô4', 'go', async function () { await layO('o2', 'o4', ui); });
      ui.btn('Chỉ Ô2 · DTQĐ nhân viên', 'sm', async function () { await layO('o2', 'o2', ui); });
      ui.btn('Chỉ Ô3 · Chương trình thi đua', 'sm', async function () { await layO('o3', 'o3', ui); });
      ui.btn('Chỉ Ô4 · Trả chậm', 'sm', async function () { await layO('o4', 'o4', ui); });

      ui.sep('Cho sieuthi.html');
      ui.btn('Mở tab Ngành hàng', 'sm', function () {
        var n = store();
        if (!n) throw new Error('Chưa nhận diện được siêu thị.');
        location.href = 'https://bi.thegioididong.com/sieu-thi-con?id=' + IDS[n] + '&tab=bcdtnh&rt=2&dm=1';
      });
      ui.btn('Lấy S1 · Doanh thu ngành hàng', 'sm', async function () { await layO('s1', 's1', ui); });

      ui.sep('Target ngành hàng');
      ui.btn('Mở trang Target', 'sm', function () {
        var n = store();
        if (!n) throw new Error('Chưa nhận diện được siêu thị.');
        location.href = thiDuaURL(n);
      });
      ui.btn('Ô1 · Target ngành hàng', 'sm', async function () { await layO('o1', 'o1', ui); });

      ui.sep('Gửi đi');
      ui.btn('Đẩy lên Supabase', '', async function () {
        await pushCloud(ui);
        ui.log('→ Mở nv.html, chạm DMX, Nạp.');
      });
      ui.btn('Kiểm tra Supabase', 'sm', async function () {
        var auth = await biAuth(ui.log);
        var r = await kvGet(auth.token, auth.uid);
        if (!r) { ui.log('✗ Chưa có gì trên Supabase.'); return; }
        ui.log('☁ Ngày: ' + r.date + ' · lúc ' + (r.capturedAt || '?').slice(11, 19));
        Object.keys(r.stores || {}).forEach(function (n) {
          var d = r.stores[n];
          var parts = ['o1', 'o2', 'o3', 'o4', 's1'].map(function (k) {
            return d[k] ? k + ':' + d[k].length : k + ':—';
          });
          ui.log('  ' + n);
          ui.log('    ' + parts.join(' '));
        });
      });
      ui.btn('Xóa dữ liệu tạm', 'sm', function () {
        localStorage.removeItem(LS_STAGE); refresh(); ui.log('Đã xóa.');
      });

      ui.sep('Sửa lỗi');
      ui.btn('Chẩn đoán bảng', 'sm', function () {
        var raw = [].slice.call(document.querySelectorAll('table'));
        ui.log('=== ' + raw.length + ' bảng, ' +
               document.querySelectorAll('iframe').length + ' iframe ===');
        raw.forEach(function (t, i) {
          var r = t.getBoundingClientRect();
          var s = (t.innerText || '').replace(/\s+/g, ' ').trim();
          ui.log('[' + i + '] ' + Math.round(r.width) + 'x' + Math.round(r.height) +
                 ' op:' + (t.offsetParent ? 'y' : 'n') + ' len:' + s.length);
          if (s.length) ui.log('    ' + s.slice(0, 70));
        });
        ['showdatacomprog', 'mode-view-bctg'].forEach(function (id) {
          var e = document.getElementById(id);
          ui.log('select #' + id + ': ' + (e ? [].slice.call(e.options).map(function (o) {
            return o.text.trim();
          }).join(' | ') : 'KHÔNG CÓ'));
        });
      });

      ui.btn('Chẩn đoán tab', 'sm', function () {
        ui.log('tab hiện tại: "' + (curTab() || 'không có') + '"');
        var seen = {};
        [].slice.call(document.querySelectorAll('a[href]')).forEach(function (a) {
          var m = /[?&]tab=([a-z0-9_-]+)/i.exec(a.getAttribute('href') || '');
          if (m && !seen[m[1]]) {
            seen[m[1]] = 1;
            ui.log('  tab=' + m[1] + ' → ' + (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40));
          }
        });
        if (!Object.keys(seen).length) ui.log('  không thấy link nào có ?tab=');
      });

      refresh();
      // Khoá 'dmx_rtauto_lock' (localStorage, ghi timestamp) — dmx-realtime-auto.user.js
      // đặt khoá này khi nó đang mượn trang BI cho việc cào Ô1/Ô2 riêng, để script
      // này không tự location.href tiếp tục hàng đợi của mình đè lên giữa chừng.
      // Trước đây dùng tham số &rtauto=1 trên URL nhưng BI (Angular) có thể không
      // giữ nguyên query param lạ nên marker mất giữa chừng mà không báo — đổi
      // sang localStorage (sống sót qua điều hướng, không phụ thuộc URL).
      // Đợi 600ms trước khi kiểm tra: 2 script cùng chạy ở document-idle, không
      // chắc ai chạy trước — chờ chút để bên kia kịp đặt khoá nếu nó cũng vừa tới.
      setTimeout(function () {
        var lockAt = Number(localStorage.getItem('dmx_rtauto_lock') || 0);
        var locked = lockAt && (Date.now() - lockAt < 90000);
        if (locked) {
          ui.log('⏸ Trang do script Realtime điều khiển — tạm nhường, không tự chạy.');
          return;
        }
        var q0 = qGet();
        if (q0) {
          ui.log('↻ Đang chạy tự động, tiếp tục…');
          runQueue(ui);
        } else {
          ui.log('Sẵn sàng. ' + (store() || 'Chạm tên siêu thị trên trang cụm trước.'));
        }
      }, 600);
    }, !!jget(LS_QUEUE));
  }

  /* ================================================================== */
  /* NẠP SỐ VÀO TRANG namkphong.github.io                                */
  /*                                                                    */
  /* Vì sao phức tạp hơn "điền rồi bấm lưu":                            */
  /* cloud-sync.js của trang chạy pullAll() sau khi tải xong. Hễ thấy   */
  /* bất kỳ dòng nào trên Supabase khác với máy — KỂ CẢ khóa của trang  */
  /* khác như biRawCapture — nó ghi đè localStorage rồi location.reload(). */
  /* Cú reload đó rơi đúng vào lúc đang điền/lưu (2-4 giây sau khi mở    */
  /* trang), nên số vừa lưu bay mất và màn hình quay về bản hôm trước.   */
  /*                                                                    */
  /* Ba lớp chống:                                                      */
  /*  1. Đồng bộ trước các khóa lạ (biRawCapture) xuống máy -> pullAll   */
  /*     không còn thấy khác biệt -> không reload.                       */
  /*  2. Lưu xong đẩy thẳng lên cloud NGAY (không chờ debounce 800ms),   */
  /*     để bản trên cloud luôn bằng bản dưới máy.                       */
  /*  3. Việc đang làm ghi trong localStorage. Nếu trang vẫn bị tải lại  */
  /*     vì lý do khác, script tự chạy tiếp đúng chỗ đang dở.            */
  /* ================================================================== */

  var LS_JOB = 'dmx_job_v1';

  function jobGet() { return jget(LS_JOB); }
  // Ghi có TỰ DỌN CHỖ: localStorage đầy (thường do sao lưu ngầm cloudSyncBackup_v1
  // của cloud-sync phình to) làm setItem văng quota → chuỗi gãy. Gặp quota thì bỏ
  // sao lưu ngầm (rồi tới nhật ký) để nhường chỗ cho việc đang làm.
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) {}
    try { localStorage.removeItem('cloudSyncBackup_v1'); } catch (e2) {}
    try { localStorage.setItem(key, val); return true; } catch (e3) {}
    try { localStorage.removeItem(LS_LOG); } catch (e4) {}
    try { localStorage.setItem(key, val); return true; } catch (e5) { return false; }
  }
  function jobSet(j) { safeSet(LS_JOB, JSON.stringify(j)); }
  function jobClear() { localStorage.removeItem(LS_JOB); }

  // ---- Cờ "chuỗi tự động" truyền qua URL khi nhảy giữa hai MIỀN khác nhau ----
  // BI (bi.thegioididong.com) và namkphong.github.io KHÔNG chung localStorage, nên
  // sau khi cào xong không thể đặt "job" cho nv.html bằng localStorage. Ta báo bằng
  // dấu #dmxauto trên URL; nv.html thấy dấu này thì tự bắt đầu nạp.
  // (nv.html -> sieuthi.html CÙNG miền nên "job" tự mang theo, không cần dấu này.)
  function autoFlag() { return location.hash.indexOf('dmxauto') !== -1; }
  function stripAutoFlag() {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  // Trả về ĐÚNG chuỗi ô đang giữ sau khi dán, hoặc null nếu không thấy ô.
  // Trình duyệt chuẩn hóa xuống dòng (\r\n -> \n) khi gán vào textarea, nên chuỗi
  // đọc lại có thể khác chuỗi đưa vào. Phải đối chiếu bằng chuỗi đọc lại này.
  function fillEl(id, txt) {
    var el = document.getElementById(id);
    if (!el) return null;
    el.value = txt;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  }

  function norm(s) { return String(s == null ? '' : s).replace(/\r\n?/g, '\n'); }

  // Bảng cào từ BI có một cột RỖNG ở đầu (cột chứa dấu + để mở dòng con).
  // parseInputData của trang loại bỏ MỌI dòng có ô đầu rỗng, nên cả bảng bị vứt,
  // rồi runAnalysis thoát sớm và KHÔNG lưu gì — nhưng vẫn im lặng như đã lưu.
  // Chỉ cắt khi TẤT CẢ dòng có chữ đều bắt đầu bằng tab, để không đụng bảng lành.
  function donCotRong(txt) {
    var s = norm(txt);
    for (var lan = 0; lan < 3; lan++) {
      var lines = s.split('\n');
      var coChu = lines.filter(function (l) { return l.trim() !== ''; });
      if (!coChu.length) break;
      var deu = coChu.every(function (l) { return l.charAt(0) === '\t'; });
      if (!deu) break;
      s = lines.map(function (l) { return l.charAt(0) === '\t' ? l.slice(1) : l; }).join('\n');
    }
    return s;
  }

  // Ô3 (Chương trình thi đua) cào ra thành HAI KHỐI rời:
  //   khối 1: tên chương trình xếp dọc, mỗi tên một dòng (cột trái dính của bảng)
  //   khối 2: bảng số, MỌI dòng đều bắt đầu bằng tab (kể cả dòng nhân viên)
  // nv.html vốn hiểu đúng bố cục này (lấy tên từ các dòng một ô nằm trước dòng
  // nhân viên đầu tiên), nhưng parseInputData vứt mọi dòng có ô đầu rỗng nên cả
  // khối số bị mất sạch. Ở đây bỏ 1 tab đầu của MỌI dòng có tab, không đòi hỏi
  // toàn bộ dòng đều có — khác với donCotRong dùng cho ô1/ô2.
  function donTabDauMoiDong(txt) {
    return norm(txt).split('\n').map(function (l) {
      return l.charAt(0) === '\t' ? l.slice(1) : l;
    }).join('\n');
  }

  // Soi ô3 đúng cách nv.html sẽ hiểu: bao nhiêu chương trình, bao nhiêu nhân viên,
  // mỗi nhân viên bao nhiêu cột số. Số chương trình phải bằng số cột thì mới khớp.
  function soiO3(txt) {
    var sep = /\t|\s{2,}/;
    var rows = norm(txt).split('\n')
      .map(function (l) { return l.split(sep).map(function (c) { return c.trim(); }); })
      .filter(function (r) { return r.length > 0 && r[0] !== ''; });
    var laNV = function (r) { return /\s-\s\d+/.test(r[0] || ''); };
    var i = -1;
    for (var k = 0; k < rows.length; k++) { if (laNV(rows[k])) { i = k; break; } }
    var junk = ['phòng ban', 'bp all in one', 'dtlk', 'dtqđ', 'sllk'];
    var cats = rows.slice(0, i > -1 ? i : 0).filter(function (r) {
      if (r.length !== 1) return false;
      var t = (r[0] || '').toLowerCase().trim();
      return t !== 'tổng' && !junk.some(function (j) { return t.indexOf(j) !== -1; });
    }).length;
    var nv = rows.slice(i > -1 ? i : rows.length).filter(laNV);
    return { cats: cats, nv: nv.length, cot: nv.length ? nv[0].length - 1 : 0 };
  }

  // Đếm số dòng mà parser của trang thật sự nhận. Bằng 0 nghĩa là trang sẽ không lưu.
  function soDongDungDuoc(txt, sep) {
    return norm(txt).split('\n').map(function (l) {
      return String(l.split(sep)[0] || '').trim();
    }).filter(function (c) { return c !== ''; }).length;
  }

  // Mô tả chỗ lệch để đọc được trên điện thoại: dài bao nhiêu, lệch từ đâu, hai bên là gì.
  function diffInfo(daLuu, canCo) {
    var a = norm(daLuu), b = norm(canCo);
    if (a === b) return null;
    var n = Math.min(a.length, b.length), i = 0;
    while (i < n && a.charAt(i) === b.charAt(i)) i++;
    function ex(t) { return t.slice(i, i + 28).replace(/\n/g, '⏎').replace(/\t/g, '→'); }
    return 'dài ' + a.length + ' vs ' + b.length + ', lệch từ ký tự ' + i +
           ' · đã lưu "' + ex(a) + '" · cần "' + ex(b) + '"';
  }

  function siteAuth() {
    var tok = siteToken();
    if (!tok) throw new Error('Chưa đăng nhập trang này (mở Trang chủ đăng nhập trước).');
    var uid = null;
    try { uid = decodeUid(tok); } catch (e) {}
    return { token: tok, uid: uid };
  }

  // Lớp chống 1: kéo mọi khóa trên cloud mà máy chưa có / khác, TRỪ khóa
  // của chính trang này (khóa đó ta sắp ghi đè bằng số mới).
  async function mirrorForeignKeys(auth, ownKey, log) {
    var q = SB_URL + '/rest/v1/kv_store?select=store_key,payload' + (auth.uid ? '&user_id=eq.' + auth.uid : '');
    var res = await fetch(q, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + auth.token } });
    if (!res.ok) { log('⚠ Không đọc được danh sách khóa cloud (' + res.status + ')'); return; }
    var rows = await res.json();
    var n = 0;
    (rows || []).forEach(function (r) {
      if (r.store_key === ownKey) return;
      var inc = JSON.stringify(r.payload);
      if (localStorage.getItem(r.store_key) !== inc) {
        try { localStorage.setItem(r.store_key, inc); n++; } catch (e) {}
      }
    });
    log('Đồng bộ trước ' + n + ' khóa lạ (chặn reload giữa chừng).');
  }

  // Lớp chống 2: đẩy ngay khóa của trang lên cloud, không chờ debounce.
  async function pushOwnKey(auth, key, log) {
    var raw = localStorage.getItem(key);
    if (!raw) { log('⚠ Chưa có ' + key + ' để đẩy.'); return false; }
    var payload; try { payload = JSON.parse(raw); } catch (e) { payload = raw; }
    var res = await fetch(SB_URL + '/rest/v1/kv_store?on_conflict=user_id,store_key', {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: 'Bearer ' + auth.token,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({ user_id: auth.uid, store_key: key, payload: payload, updated_at: new Date().toISOString() })
    });
    if (!res.ok) { log('⚠ Đẩy ' + key + ' lỗi ' + res.status); return false; }
    log('☁ Đã đẩy ' + key + ' lên cloud.');
    return true;
  }

  function findBtn(id, words) {
    var b = document.getElementById(id);
    if (b) return b;
    return [].slice.call(document.querySelectorAll('button,input[type=button],input[type=submit],a'))
      .filter(function (x) {
        var t = (x.textContent || x.value || '').toLowerCase().replace(/\s+/g, ' ').trim();
        return t.indexOf(words) !== -1 && t.length < 50;
      })[0] || null;
  }

  /* ================================================================== */
  /* TRANG nv.html                                                       */
  /* ================================================================== */
  function nvPanel() {
    var OWN = 'analysisAppData_v2';

    function storeSelect() {
      var s = document.getElementById('sieu-thi-select');
      if (s) return s;
      var ss = [].slice.call(document.querySelectorAll('select'));
      for (var i = 0; i < ss.length; i++) {
        var ok = [].slice.call(ss[i].options).some(function (o) {
          var t = (o.text || '').trim();
          return CLUSTER_CONFIG.stores.some(function (s) { return s.name === t; });
        });
        if (ok) return ss[i];
      }
      return null;
    }

    function pick(sel, text) {
      var o = [].slice.call(sel.options).filter(function (x) { return (x.text || '').trim() === text; })[0];
      if (!o) return false;
      sel.value = o.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    // Trang bỏ qua việc lưu nếu Target tháng siêu thị trống (runAnalysis thoát
    // sớm). Ô này không nằm trong dữ liệu cào nên phải lấy lại từ bản gần nhất.
    function ensureTarget(name, log) {
      var el = document.getElementById('target_thang');
      if (!el) return;
      if (String(el.value || '').trim()) return;
      var d = jget(OWN);
      var h = d && d.supermarkets && d.supermarkets[name] && d.supermarkets[name].history;
      if (!h) { log('⚠ Chưa có TARGET THÁNG SIÊU THỊ cho "' + name + '". Nhập tay ô đó trên trang rồi bấm Nạp lại.'); return; }
      var dates = Object.keys(h).sort();
      for (var i = dates.length - 1; i >= 0; i--) {
        if (h[dates[i]].supermarketTarget) {
          el.value = h[dates[i]].supermarketTarget;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          log('Target tháng lấy lại từ ' + dates[i] + ': ' + el.value);
          return;
        }
      }
      log('⚠ Chưa có TARGET THÁNG SIÊU THỊ cho "' + name + '". Nhập tay ô đó trên trang rồi bấm Nạp lại — không có nó trang sẽ không lưu.');
    }

    function verify(name, day, o2txt) {
      var d = jget(OWN);
      var rec = d && d.supermarkets && d.supermarkets[name] && d.supermarkets[name].history[day];
      if (!rec) return 'thiếu bản ghi ' + day;
      var dd = diffInfo(rec.revenueInput, o2txt);
      if (dd) {
        var live = document.getElementById('revenue-input');
        return 'số đã lưu khác số vừa nạp — ' + dd +
               ' · ô nhập đang giữ ' + (live ? live.value.length : '?') + ' ký tự';
      }
      return null;
    }

    mount('DMX · Nạp nv.html', function (ui) {
      async function step(auth, cap, name) {
        var d = cap.stores[name] || {};
        var day = todayISO();
        ui.log('--- ' + name + ' ---');

        var sel = storeSelect();
        if (!sel) throw new Error('Không thấy ô Chọn Siêu Thị.');
        if (!pick(sel, name)) throw new Error('Không chọn được siêu thị "' + name + '".');
        await sleep(1200);

        var SEP = { o1: /\t|\s{4,}/, o2: /\t|\s{4,}/, o3: /\t|\s{2,}/ };
        var giu = {};
        ['o1', 'o2', 'o3', 'o4'].forEach(function (k) {
          if (!d[k]) { ui.log('— ' + k + ' không có trong bản cào'); return; }
          var txt = (k === 'o3') ? donTabDauMoiDong(d[k]) : donCotRong(d[k]);
          var got = fillEl(NV_FIELDS[k], txt);
          if (got === null) { ui.log('✗ ' + k + ' · không thấy ô nhập'); return; }
          giu[k] = got;
          var note = '';
          if (txt.length !== norm(d[k]).length) note += ' · đã cắt tab đầu dòng';
          if (k === 'o3') {
            var o3 = soiO3(got);
            note += ' · ' + o3.cats + ' chương trình · ' + o3.nv + ' nhân viên · ' + o3.cot + ' cột số';
            if (o3.nv === 0) note += ' ⚠ KHÔNG NHẬN RA NHÂN VIÊN NÀO';
            else if (o3.cats !== o3.cot) note += ' ⚠ LỆCH CỘT, SỐ SẼ SAI';
          } else if (SEP[k]) {
            var n = soDongDungDuoc(got, SEP[k]);
            note += ' · ' + n + ' dòng dùng được';
            if (n === 0) note += ' ⚠ TRANG SẼ KHÔNG LƯU';
          }
          ui.log('✓ ' + k + ' · ' + got.length + ' ký tự' + note);
        });
        ensureTarget(name, ui.log);
        await sleep(400);

        var btn = findBtn('analyze-btn', 'phân tích');
        if (!btn) throw new Error('Không thấy nút Phân Tích & Lưu.');
        btn.click();
        ui.log('Đã bấm Phân Tích & Lưu, chờ…');
        await sleep(3000);

        var mong = giu.o2 != null ? giu.o2 : (d.o2 || '');
        var bad = verify(name, day, mong);
        if (bad) {
          ui.log('⚠ Lần 1 chưa ăn (' + bad + '), thử lại…');
          ensureTarget(name, ui.log);
          btn.click();
          await sleep(3000);
          bad = verify(name, day, mong);
        }
        if (bad) throw new Error('Lưu không thành công: ' + bad);
        ui.log('✓ Đã lưu ' + day);

        await pushOwnKey(auth, OWN, ui.log);
      }

      async function runJob() {
        var job = jobGet();
        if (!job || job.page !== 'nv') return;
        if (++job.hops > 12) { jobClear(); ui.log('✗ Tải lại quá nhiều lần, đã dừng.'); return; }
        jobSet(job);

        var auth = siteAuth();
        var day = todayISO();

        if (!job.cap) {
          ui.log('Tải bản cào từ cloud…');
          var cap = await kvGetRetry(auth, 6, ui.log);
          if (!cap || !cap.stores) {
            // Vừa sang từ BI, phiên đăng nhập trang đôi khi CHƯA SẴN SÀNG nên đọc hụt
            // (trong nhật ký: lúc có "↻ tải lại" là chạy được ngay). Tự TẢI LẠI trang
            // để làm mới phiên rồi thử tiếp — thay vì bắt bấm tay "Nạp & lưu".
            var ct = job.capTries || 0;
            if (ct < 3) {
              job.capTries = ct + 1; jobSet(job);
              ui.log('Chưa thấy bản cào — tải lại trang làm mới phiên rồi thử tiếp (' + job.capTries + '/3)…');
              await sleep(2500);
              location.reload();
              return;
            }
            jobClear(); ui.log('✗ Chưa có biRawCapture trên cloud — cào trên BI trước (đã thử tải lại 3 lần).'); return;
          }
          job.cap = cap;
          job.list = Object.keys(cap.stores);
          if (!job.list.length) { jobClear(); ui.log('✗ Bản cào rỗng.'); return; }
          jobSet(job);
          ui.log('Bản cào ngày ' + cap.date + ' — ' + job.list.join(', '));
          if (cap.date !== todayISO())
            ui.log('⚠ Bản cào KHÔNG phải hôm nay (' + todayISO() + ') — số sẽ là số cũ. Cào lại trên BI nếu cần.');
          await mirrorForeignKeys(auth, 'analysisAppData_v2', ui.log);
        }

        // Duyệt cả danh sách, mỗi siêu thị đều nạp + phân tích lại rồi dựng ảnh.
        // (step idempotent: cloud-sync có thể đã ghi đè bản vừa lưu, làm lại cho chắc.)
        for (var i = 0; i < job.list.length; i++) {
          var name = job.list[i];
          // Luôn nạp + phân tích lại (kể cả đã có số hôm nay) để render TƯƠI rồi
          // dựng ảnh /bcnv. step() idempotent (ghi đè cùng số) nên an toàn.
          try {
            await step(auth, job.cap, name);
          } catch (e) {
            ui.log('✗ ' + (e.message || e));
            ui.log('Đã dừng. Sửa xong bấm "Nạp & lưu" lại.');
            jobClear();
            return;
          }
          job.i = i + 1; jobSet(job);
          // Dựng + đẩy ảnh báo cáo NV lên LINE (thứ yếu — lỗi không chặn chuỗi).
          try { await nvsPublish(name, ui.log); }
          catch (e) { ui.log('⚠ Đẩy ảnh LINE (/bcnv) lỗi (' + (e.message || e) + ') — số vẫn đã lưu.'); }
          try { await nvsPublishPersonal(name, ui.log); }
          catch (e) { ui.log('⚠ Đẩy ảnh LINE (/bc) lỗi (' + (e.message || e) + ') — số vẫn đã lưu.'); }
          try { await nvsPublishStramWeek(name, ui.log); }
          catch (e) { ui.log('⚠ Đẩy STRAM tuần (/tuan) lỗi (' + (e.message || e) + ') — số vẫn đã lưu.'); }
        }
        var wasAuto = job.auto;
        jobClear();
        ui.log('=== XONG nv.html ===');
        if (wasAuto) {
          ui.log('→ Tự chuyển sang sieuthi.html (chuỗi tự động)…');
          // Cùng miền: đặt job cho sieuthi rồi điều hướng, trang kia tự chạy tiếp.
          jobSet({ page: 'st', auto: true, list: null, i: 0, hops: 0, cap: null, day: todayISO() });
          await sleep(1000);
          location.href = 'https://namkphong.github.io/sieuthi.html';
        } else {
          ui.log('Mở sieuthi.html rồi bấm "Nạp & phân tích" để chạy tiếp.');
        }
      }

      // Ghi việc XUỐNG MÁY TRƯỚC KHI gọi mạng. Trang có thể bị cloud-sync tải lại
      // ngay giây thứ 2-4; nếu lúc đó chưa có việc nào được ghi thì mọi thứ mất trắng.
      ui.btn('Nạp & lưu cả ' + CLUSTER_CONFIG.stores.length + ' siêu thị', 'go', async function () {
        siteAuth();
        // auto:true để nv.html xong tự chuyển tiếp sang sieuthi.html.
        jobSet({ page: 'nv', auto: true, list: null, i: 0, hops: 0, cap: null, day: todayISO() });
        ui.log('=== BẮT ĐẦU · trang có thể tự tải lại, cứ để yên ===');
        await runJob();
      });

      ui.btn('Kiểm tra đã lưu hôm nay chưa', 'sm', function () {
        var d = jget(OWN), day = todayISO();
        if (!d || !d.supermarkets) { ui.log('Chưa có ' + OWN + '.'); return; }
        Object.keys(d.supermarkets).forEach(function (n) {
          var h = d.supermarkets[n].history || {};
          var dates = Object.keys(h).sort();
          ui.log(n + ': ' + (h[day] ? '✓ có ' + day : '✗ chưa có ' + day) +
                 ' · gần nhất ' + (dates[dates.length - 1] || '—'));
        });
      });

      ui.btn('Bỏ việc đang dở', 'sm', function () { jobClear(); ui.log('Đã bỏ việc đang dở.'); });
      ui.btn('Xóa nhật ký', 'sm', function () { logClear(); ui.log('Đã xóa nhật ký.'); });

      var j = jobGet();
      if (j && j.page === 'nv') {
        ui.log('↻ Trang vừa tải lại — chạy tiếp' + (j.list && j.list[j.i] ? ' từ "' + j.list[j.i] + '"' : '') + '…');
        runJob();
      } else if (autoFlag()) {
        // Đến từ BI trong chuỗi tự động: tự bắt đầu như vừa bấm nút.
        stripAutoFlag();
        ui.log('⚙ Chuỗi tự động từ BI — bắt đầu nạp nv.html…');
        jobSet({ page: 'nv', auto: true, list: null, i: 0, hops: 0, cap: null, day: todayISO() });
        runJob().catch(function (e) {
          jobClear();
          ui.log('✗ ' + (e.message || e) + ' — cần đăng nhập trang này trước (mở Trang chủ).');
        });
      } else {
        ui.log('Sẵn sàng.');
      }
    }, !!(jobGet() && jobGet().page === 'nv') || autoFlag());
  }

  /* ================================================================== */
  /* TRANG sieuthi.html                                                  */
  /* Ô1 = S1 từ cloud · Ô2 = Ô1 của nv.html · Ô3 = Ô3 của nv.html        */
  /* ================================================================== */
  function stPanel() {
    var OWN = 'businessReportAppV3';

    function optionOf(sel, name) {
      return [].slice.call(sel.options).filter(function (x) { return (x.text || '').trim() === name; })[0] || null;
    }

    // Trang thêm siêu thị bằng prompt(). Mượn tạm prompt để trả về đúng tên
    // đang cần, bấm nút +, rồi trả prompt về như cũ.
    async function addStore(name) {
      var btn = document.getElementById('addSupermarketBtn');
      if (!btn) return false;
      var orig = window.prompt;
      window.prompt = function () { return name; };
      try { btn.click(); } finally {
        setTimeout(function () { window.prompt = orig; }, 0);
      }
      await sleep(600);
      window.prompt = orig;
      var sel = document.getElementById('supermarketSelect');
      return !!(sel && optionOf(sel, name));
    }

    // Bản ghi nv.html của hôm nay; không có thì lấy bản gần nhất và báo rõ.
    function nvRecord(name, log) {
      var nv = jget('analysisAppData_v2');
      var h = nv && nv.supermarkets && nv.supermarkets[name] && nv.supermarkets[name].history;
      if (!h) return null;
      var day = todayISO();
      if (h[day]) return { day: day, rec: h[day] };
      var dates = Object.keys(h).sort();
      var last = dates[dates.length - 1];
      if (!last) return null;
      log('⚠ nv.html chưa có ' + day + ', dùng tạm bản ' + last);
      return { day: last, rec: h[last] };
    }

    // Có bản ghi hôm nay CHƯA ĐỦ — phải đúng là số vừa nạp, vì cloud-sync có thể
    // đã kéo bản cũ đè lên.
    function verify(name, day, s1) {
      var r = jget(OWN);
      var rec = r && r.reports && r.reports[name] && r.reports[name][day];
      if (!rec) return 'thiếu bản ghi ' + day;
      if (!s1) return null;
      var dd = diffInfo(rec.monthlyReport, s1);
      if (dd) {
        var live = document.getElementById('dataInput');
        return 'số đã lưu khác số vừa nạp — ' + dd +
               ' · ô nhập đang giữ ' + (live ? live.value.length : '?') + ' ký tự';
      }
      return null;
    }

    mount('DMX · Nạp sieuthi', function (ui) {
      async function step(auth, cap, name) {
        var day = todayISO();
        ui.log('--- ' + name + ' ---');

        var s1 = (cap.stores[name] || {}).s1;
        if (!s1) throw new Error('Thiếu S1 (chưa cào tab Ngành hàng) cho ' + name + '.');
        var nvr = nvRecord(name, ui.log);
        if (!nvr) throw new Error('nv.html chưa có dữ liệu cho ' + name + ' — chạy nv.html trước.');

        var sel = document.getElementById('supermarketSelect');
        if (!sel) throw new Error('Không thấy #supermarketSelect.');
        var o = optionOf(sel, name);
        if (!o) {
          ui.log('Siêu thị "' + name + '" chưa có trong sieuthi.html — tự thêm…');
          if (!await addStore(name)) throw new Error('Không thêm được siêu thị "' + name + '".');
          sel = document.getElementById('supermarketSelect');
          o = optionOf(sel, name);
          if (!o) throw new Error('Đã thêm nhưng vẫn không chọn được "' + name + '".');
          ui.log('✓ Đã thêm "' + name + '".');
        }
        sel.value = o.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(1000);

        s1 = donCotRong(s1);
        var giuS1 = fillEl('dataInput', s1);
        ui.log((giuS1 === null ? '✗ ' : '✓ ') + 'ô1 · ' + s1.length + ' ký tự' +
               (giuS1 !== null && giuS1.length !== s1.length ? ' (ô giữ ' + giuS1.length + ')' : ''));
        if (nvr.rec.targetInput)
          ui.log((fillEl('categoryDataInput', donCotRong(nvr.rec.targetInput)) === null ? '✗ ' : '✓ ') + 'ô2 · ' + nvr.rec.targetInput.length);
        else ui.log('⚠ nv.html thiếu Ô1 (target) — ô2 để trống.');
        var o3txt = donTabDauMoiDong(nvr.rec.detailsInput || '');
        var o3 = soiO3(o3txt);
        ui.log((fillEl('employeeDataInput', o3txt) === null ? '✗ ' : '✓ ') +
               'ô3 · ' + o3txt.length + ' ký tự · ' + o3.cats + ' chương trình · ' +
               o3.nv + ' nhân viên · ' + o3.cot + ' cột số' +
               (o3.nv === 0 ? ' ⚠ KHÔNG NHẬN RA NHÂN VIÊN NÀO'
                            : (o3.cats !== o3.cot ? ' ⚠ LỆCH CỘT, SỐ SẼ SAI' : '')));
        await sleep(400);

        var btn = findBtn('analyzeBtn', 'phân tích');
        if (!btn) throw new Error('Không thấy nút Phân Tích.');
        btn.click();
        ui.log('Đã bấm Lưu & Phân Tích, chờ…');
        await sleep(3000);

        var mongS1 = giuS1 != null ? giuS1 : s1;
        var bad = verify(name, day, mongS1);
        if (bad) {
          ui.log('⚠ Lần 1 chưa ăn (' + bad + '), thử lại…');
          btn.click();
          await sleep(3000);
          bad = verify(name, day, mongS1);
        }
        if (bad) throw new Error('Lưu không thành công: ' + bad);
        ui.log('✓ Đã lưu ' + day);

        await pushOwnKey(auth, OWN, ui.log);
      }

      async function runJob() {
        var job = jobGet();
        if (!job || job.page !== 'st') return;
        if (++job.hops > 12) { jobClear(); ui.log('✗ Tải lại quá nhiều lần, đã dừng.'); return; }
        jobSet(job);

        var auth = siteAuth();
        var day = todayISO();

        if (!job.cap) {
          ui.log('Tải bản cào từ cloud…');
          var cap = await kvGetRetry(auth, 6, ui.log);
          if (!cap || !cap.stores) { jobClear(); ui.log('✗ Chưa có biRawCapture trên cloud.'); return; }
          job.cap = cap;
          job.list = Object.keys(cap.stores);
          jobSet(job);
          ui.log('Bản cào ngày ' + cap.date + ' — ' + job.list.join(', '));
          await mirrorForeignKeys(auth, 'businessReportAppV3', ui.log);
        }

        for (var i = 0; i < job.list.length; i++) {
          var name = job.list[i];
          var bad = verify(name, day, donCotRong((job.cap.stores[name] || {}).s1 || ''));
          if (!bad) { ui.log('• ' + name + ': đã có số hôm nay, bỏ qua.'); continue; }
          try {
            await step(auth, job.cap, name);
          } catch (e) {
            ui.log('✗ ' + (e.message || e));
            jobClear();
            return;
          }
          job.i = i + 1; jobSet(job);
        }
        var wasAuto = job.auto;
        jobClear();
        if (wasAuto)
          ui.log('=== 🎉 XONG TẤT CẢ: cào ' + CLUSTER_CONFIG.stores.length + ' siêu thị → nv.html → sieuthi.html. Giờ kiểm số rồi xuất ảnh. ===');
        else
          ui.log('=== XONG sieuthi.html · kiểm số rồi xuất ảnh ===');
      }

      ui.btn('Nạp & phân tích cả ' + CLUSTER_CONFIG.stores.length + ' siêu thị', 'go', async function () {
        siteAuth();
        if (!jget('analysisAppData_v2')) throw new Error('Chưa có analysisAppData_v2 — chạy nv.html trước.');
        jobSet({ page: 'st', list: null, i: 0, hops: 0, cap: null, day: todayISO() });
        ui.log('=== BẮT ĐẦU · trang có thể tự tải lại, cứ để yên ===');
        await runJob();
      });

      ui.btn('Kiểm tra đã lưu hôm nay chưa', 'sm', function () {
        var r = jget(OWN), day = todayISO();
        if (!r || !r.reports) { ui.log('Chưa có ' + OWN + '.'); return; }
        Object.keys(r.reports).forEach(function (n) {
          var dates = Object.keys(r.reports[n]).sort();
          ui.log(n + ': ' + (r.reports[n][day] ? '✓ có ' + day : '✗ chưa có ' + day) +
                 ' · gần nhất ' + (dates[dates.length - 1] || '—'));
        });
      });

      ui.btn('Bỏ việc đang dở', 'sm', function () { jobClear(); ui.log('Đã bỏ việc đang dở.'); });
      ui.btn('Xóa nhật ký', 'sm', function () { logClear(); ui.log('Đã xóa nhật ký.'); });

      var j = jobGet();
      if (j && j.page === 'st') {
        ui.log('↻ Trang vừa tải lại — chạy tiếp' + (j.list && j.list[j.i] ? ' từ "' + j.list[j.i] + '"' : '') + '…');
        runJob();
      } else {
        ui.log('Cần nv.html đã có số hôm nay trước.');
      }
    }, !!(jobGet() && jobGet().page === 'st'));
  }

  /* ================================================================== */
  /* ĐỊNH TUYẾN                                                         */
  /* ================================================================== */
  function route() {
    if (document.getElementById('supermarketSelect') && document.getElementById('dataInput')) { stPanel(); return true; }
    if (document.getElementById('revenue-input')) { nvPanel(); return true; }
    return false;
  }

  function boot() {
    if (location.hostname.indexOf('bi.thegioididong.com') !== -1) { biPanel(); return; }
    if (location.hostname.indexOf('namkphong.github.io') === -1) return;
    if (route()) return;
    var n = 0, iv = setInterval(function () {           // trang render chậm — thử lại
      if (route() || ++n > 12) clearInterval(iv);
    }, 800);
  }

  // Tải cấu hình cụm (site_code) TRƯỚC boot() — mọi panel đều cần
  // LINE_CODE/STORES/IDS/RAWID đã dựng xong. Lỗi (chưa nhập site_code, mạng
  // lỗi...) thì báo rõ + dừng, không chạy boot() với cấu hình rỗng.
  async function bootAsync() {
    try { await ensureClusterConfig(); }
    catch (e) { console.error('[dmx] Lỗi tải cấu hình cụm:', e); window.alert('DMX: ' + (e.message || e)); return; }
    boot();
  }

  if (document.body) bootAsync();
  else document.addEventListener('DOMContentLoaded', bootAsync);
})();
