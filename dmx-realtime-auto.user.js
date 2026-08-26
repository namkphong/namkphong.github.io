// ==UserScript==
// @name         DMX — Realtime tự động (Supabase + hẹn giờ + cảnh báo Telegram)
// @namespace    namkphong.github.io
// @version      0.19.0
// @description  Tự xuất excel N siêu thị → tạo ảnh doanh thu → đẩy Supabase → cào Ô1+Ô2 BI → đẩy ảnh Realtime (tự thử lại tối đa 3 lần nếu lỗi); hẹn giờ mỗi 10 phút CHỈ trong 8–22h; nhật ký gộp cả chu kỳ; phát hiện đăng xuất MWG → gửi cảnh báo Telegram. Dùng chung cho nhiều cụm (site_code, cấu hình lưu trên Supabase — xem dmx.user.js).
// @match        https://report.mwgroup.vn/*
// @match        https://namkphong.github.io/realtimenv.html*
// @match        https://namkphong.github.io/realtime.html*
// @match        https://bi.thegioididong.com/thi-dua*
// @match        https://bi.thegioididong.com/khoi-ban-hang-sub*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      cdnv2.tgdd.vn
// @connect      api.telegram.org
// @connect      kyyoihvcsrnmylnmbcis.supabase.co
// @require      https://namkphong.github.io/dmx-cluster-shared.js
// @updateURL    https://namkphong.github.io/dmx-realtime-auto.user.js
// @downloadURL  https://namkphong.github.io/dmx-realtime-auto.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VER = '0.19.0';
  var W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  var JOB = 'dmx_auto_job_v1';
  // Số ngày lùi lại khi đặt khoảng ngày xuất ở dashboard 77.
  // Doanh thu tính theo NGÀY XUẤT HÀNG, mà đơn có thể lên từ trước rồi mới xuất
  // (hàng đặt, chờ về, giao lắp...). Cửa sổ càng rộng thì càng ít bỏ sót nhóm
  // "lên đơn tháng trước, xuất tháng này". 14 -> 21 ngày để chắc ăn hơn.
  var SO_NGAY_CAO = 21;
  var DONE_STATUS = 'Đã xuất xong, có thể tải file';
  var RT_URL = 'https://namkphong.github.io/realtimenv.html';
  var MD_URL = 'https://report.mwgroup.vn/ManagerDownload';
  var D77_URL = 'https://report.mwgroup.vn/home/dashboard/77';
  var RTP_URL = 'https://namkphong.github.io/realtime.html'; // khác RT_URL (realtimenv.html)

  // Ô1 (ngành hàng) + Ô2 (doanh thu tổng) — URL CỐ ĐỊNH cho CẢ CỤM (id không
  // phải mã riêng từng siêu thị) — giờ lấy từ cấu hình cụm (Supabase, tra theo
  // site_code) thay vì đóng cứng cho cụm 14285. Dựng ở ensureClusterConfig()
  // bên dưới, chạy trước mọi thứ khác (xem cuối file).
  var BI_O1_URL = null, BI_O2_URL = null;
  var STORES = [];
  function storeByKey(k) { for (var i = 0; i < STORES.length; i++) if (STORES[i].key === k) return STORES[i]; return null; }

  var SITE_CODE_KEY = 'dmx_site_code';
  function getSiteCode() { return GM_getValue(SITE_CODE_KEY, ''); }
  function setSiteCode(c) { GM_setValue(SITE_CODE_KEY, c); }
  function changeSiteCode() {
    var cur = getSiteCode();
    var site = (window.prompt('Đổi mã cụm (đang là "' + cur + '"):', cur) || '').trim();
    if (!site || site === cur) return;
    setSiteCode(site);
    window.alert('Đã đổi mã cụm — tải lại trang để áp dụng.');
  }

  // Chạy 1 lần lúc khởi động, TRƯỚC mọi điều hướng/panel khác (xem cuối file).
  // id=-1 (Ô1) mặc định luôn cho mọi cụm (nghi là sentinel "cả tài khoản đang
  // đăng nhập", chưa kiểm chứng được với cụm khác — nếu sai, sửa lại bằng
  // config.biClusterO1Id qua Supabase). id=90564 (Ô2) thì KHÔNG có mặc định an
  // toàn — hỏi 1 lần, để trống được (tính năng Ô2/ảnh Realtime tạm không chạy
  // cho tới khi cấu hình đúng).
  async function ensureClusterConfig() {
    var site = getSiteCode();
    if (!site) {
      site = await DMXCluster.askSiteCode();
      if (!site) throw new Error('Chưa có mã cụm.');
      setSiteCode(site);
    }
    var config = await DMXCluster.fetchConfig(site);
    if (!config || !config.stores || !config.stores.length) {
      throw new Error('Cụm "' + site + '" chưa có cấu hình siêu thị — chạy dmx.user.js (cào số) 1 lần trước để tạo cấu hình.');
    }
    var changed = false;
    if (!config.biClusterO1Id) { config.biClusterO1Id = '-1'; changed = true; }
    if (!config.biClusterO2Id && !config.biClusterO2IdAsked) {
      var v = (window.prompt('Mã "Khối bán hàng" (Ô2 — doanh thu tổng cả cụm) trên BI.\nVào BI → Khối kinh doanh → tab "BC Doanh thu siêu thị", xem URL có "id=" gì thì gõ vào đây (để trống nếu chưa biết — ảnh Realtime tạm không chạy, có thể cấu hình lại sau):', '') || '').trim();
      config.biClusterO2Id = v; config.biClusterO2IdAsked = true; changed = true;
    }
    if (changed) { try { await DMXCluster.saveConfig(site, config); } catch (e) { console.warn('[dmx-auto] Lưu cấu hình cụm lỗi:', e); } }

    STORES = config.stores.map(function (s) { return { key: s.key, name: s.name, code: s.mwgCode }; });
    BI_O1_URL = 'https://bi.thegioididong.com/thi-dua?id=' + config.biClusterO1Id + '&tab=1&rt=1&dm=2&mt=2';
    BI_O2_URL = config.biClusterO2Id ? ('https://bi.thegioididong.com/khoi-ban-hang-sub?id=' + config.biClusterO2Id + '&tab=bcdtst&rt=1&dm=1') : null;
  }

  // Hẹn giờ: chạy mỗi INTERVAL_MIN phút (kể từ lần chạy xong gần nhất) khi BẬT.
  // Cần giữ tab dashboard 77 mở.
  var SCHED_ON = 'dmx_sched_on', LAST_RUN = 'dmx_last_run';
  var INTERVAL_MIN = 10;
  var WORK_START = 8, WORK_END = 22; // chỉ chạy + cảnh báo trong 8–22h
  var TG_TOKEN = 'dmx_tg_token', TG_CHAT = 'dmx_tg_chat', TG_LAST = 'dmx_tg_last';

  function inWorkHours() { var h = new Date().getHours(); return h >= WORK_START && h < WORK_END; }

  // Gửi cảnh báo Telegram. Token/chat lưu trong Violentmonkey của MÁY (không nằm
  // trong mã nguồn công khai). Giới hạn 1 tin / 15 phút để khỏi spam.
  function tgAlert(text, force) {
    var token = GM_getValue(TG_TOKEN, ''), chat = GM_getValue(TG_CHAT, '');
    if (!token || !chat) return false;
    if (!force && Date.now() - GM_getValue(TG_LAST, 0) < 15 * 60 * 1000) return false;
    GM_setValue(TG_LAST, Date.now());
    GM_xmlhttpRequest({
      method: 'POST', url: 'https://api.telegram.org/bot' + token + '/sendMessage',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ chat_id: chat, text: text }),
      onload: function () {}, onerror: function () {}
    });
    return true;
  }

  // Trang report.mwgroup.vn KHÁC dashboard/ManagerDownload: có ô mật khẩu → đã văng
  // ra đăng nhập → cảnh báo Telegram + banner + bỏ job kẹt (để sau đăng nhập chạy lại).
  function maybeLoggedOut() {
    setTimeout(function () {
      if (!document.querySelector('input[type=password]')) return;
      GM_deleteValue(JOB);
      if (GM_getValue(SCHED_ON, false) && inWorkHours()) {
        tgAlert('⚠️ MWG ĐĂNG XUẤT (cụm ' + getSiteCode() + ') lúc ' + new Date().toLocaleTimeString('vi') +
                '.\nRemote vào laptop đăng nhập lại để DMX chạy tiếp.');
      }
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;z-index:2147483647;background:#dc2626;color:#fff;padding:12px;border-radius:10px;font:14px sans-serif;text-align:center';
      d.textContent = '⚠️ MWG đã đăng xuất — đăng nhập lại để DMX chạy tiếp.';
      document.body.appendChild(d);
    }, 4000);
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function waitFor(fn, timeout, step) {
    timeout = timeout || 20000; step = step || 400; var t0 = Date.now();
    for (;;) { var v; try { v = fn(); } catch (e) { v = null; } if (v) return v; if (Date.now() - t0 > timeout) return null; await sleep(step); }
  }
  function abToB64(buf) { var b = new Uint8Array(buf), s = '', C = 0x8000; for (var i = 0; i < b.length; i += C) s += String.fromCharCode.apply(null, b.subarray(i, i + C)); return btoa(s); }
  function b64ToBytes(b64) { var bin = atob(b64), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function parseVNDateTime(s) { var m = (s || '').match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/); return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime() : null; }
  function jobGet() { return GM_getValue(JOB, null); }
  function jobSet(j) { GM_setValue(JOB, j); }
  function jobClear() { GM_deleteValue(JOB); }

  // Khoá chống va chạm với dmx.user.js (script cào số hàng ngày, match toàn bộ
  // bi.thegioididong.com/*, tự location.href để tiếp tục hàng đợi riêng của nó
  // — kể cả khi mình đang mượn trang BI cho việc cào Ô1/Ô2). Dùng localStorage
  // TRÊN CHÍNH bi.thegioididong.com (không phải GM storage) vì: (a) 2 script có
  // thể đọc trực tiếp, không cần @grant thêm; (b) sống sót qua điều hướng full
  // trang; (c) KHÔNG như tham số &rtauto=1 trên URL — BI (Angular) có thể không
  // giữ nguyên query param lạ, làm marker mất giữa chừng mà không báo lỗi gì.
  // Ghi timestamp (không phải cờ true/false) để tự hết hạn nếu job của mình bị
  // kẹt/crash quên xoá khoá — khỏi khoá cứng dmx.user.js vĩnh viễn.
  var BI_LOCK = 'dmx_rtauto_lock';
  function biLock() { try { localStorage.setItem(BI_LOCK, String(Date.now())); } catch (e) {} }
  function biUnlock() { try { localStorage.removeItem(BI_LOCK); } catch (e) {} }

  // Nhật ký GỘP cả chu kỳ — CẢ chuỗi (report.mwgroup.vn → namkphong.github.io →
  // bi.thegioididong.com → …) đi qua nhiều gốc (origin) khác nhau, mỗi trang chỉ
  // có panel/log RIÊNG của trang đó nên bắt kịp đúng lúc lỗi để chụp màn hình rất
  // khó. Dùng GM storage (KHÔNG phải localStorage) vì nó dùng chung được xuyên
  // suốt mọi origin — y hệt cách "job" đã hoạt động. Mỗi dòng ui.log() ở BẤT KỲ
  // panel nào cũng tự động góp vào đây, kèm tên panel + giờ, để xem lại được
  // toàn bộ tiến trình sau khi lỗi xảy ra, khỏi phải chụp đúng khoảnh khắc.
  var LOGALL = 'dmx_auto_logall_v1';
  function logAllGet() { return GM_getValue(LOGALL, []); }
  function logAllClear() { GM_deleteValue(LOGALL); }
  function logAllPush(tag, m) {
    var arr = logAllGet();
    arr.push(new Date().toLocaleTimeString('vi-VN') + '  [' + tag + ']  ' + m);
    if (arr.length > 500) arr = arr.slice(-500);
    GM_setValue(LOGALL, arr);
  }

  // "Bôi đen + copy" 1 bảng — y hệt thao tác tay, giữ đúng \t giữa các cột mà
  // parseCategoryData()/parseSummaryData() của realtime.html cần.
  function shownTable(t) { if (!t) return false; var r = t.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function grabTable(tbl) {
    var r = document.createRange(); r.selectNode(tbl);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    var txt = sel.toString(); sel.removeAllRanges(); return txt;
  }
  function visibleTablesWithText() {
    return [].slice.call(document.querySelectorAll('table')).filter(shownTable)
      .filter(function (t) { return (t.innerText || '').trim().length > 30; });
  }
  // Trang Angular render bảng SAU khi tải xong — đợi tới khi số bảng ổn định
  // (2 lần đo liên tiếp ra cùng số, cách nhau 700ms) VÀ đạt tối thiểu minCount.
  async function waitForStableTables(minCount, timeoutMs) {
    var last = -1, stable = 0, t0 = Date.now();
    while (Date.now() - t0 < (timeoutMs || 20000)) {
      var n = visibleTablesWithText().length;
      if (n === last && n >= minCount) { stable++; if (stable >= 2) return n; } else stable = 0;
      last = n;
      await sleep(700);
    }
    return last;
  }

  // Trang khoi-ban-hang-sub nhảy thẳng URL (kể cả có sẵn &tab=bcdtst) không tự
  // lên đúng bảng — trang chỉ hiện "vỏ" (thường rơi về .../khoi-ban-hang-sub/-1).
  // Phải BẤM đúng tab "BC Doanh thu siêu thị" (giống người dùng bấm tay) thì
  // Angular mới thực sự tải dữ liệu. Không tìm thấy thì trả false, để nơi gọi
  // tự quyết định (có thể trang đã sẵn đúng bảng rồi, không cần bấm).
  function clickBCDoanhThuST() {
    var all = [].slice.call(document.querySelectorAll('[role=tab],li,button,[ng-click],div,span,a')).filter(function (x) {
      var t = (x.textContent || '').replace(/\s+/g, ' ').trim();
      return t.length < 40 && /doanh thu si[êe]u th[ịi]/i.test(t);
    });
    if (!all.length) return false;
    // Tab thật (đổi view tại chỗ, không đổi trang) LUÔN ưu tiên hơn <a href> —
    // trang còn có 1 LINK menu tổng quan khác cũng khớp chữ "doanh thu siêu
    // thị" nhưng dẫn hẳn sang trang khác (/salebcdtst), đã từng bắt nhầm vào
    // đó. Chỉ dùng <a> khi không còn lựa chọn nào khác.
    var tabs = all.filter(function (x) { return x.tagName !== 'A'; });
    var els = tabs.length ? tabs : all;
    function rk(e) { if (e.getAttribute && e.getAttribute('role') === 'tab') return 0; if (e.tagName === 'LI') return 1; if (e.tagName === 'BUTTON') return 2; if (e.getAttribute && e.getAttribute('ng-click')) return 3; return 5; }
    els.sort(function (a, b) { return rk(a) - rk(b); });
    var t = els[0], inner = t.querySelector ? t.querySelector('[role=tab],li,button,[ng-click]') : null;
    (inner || t).click(); return true;
  }

  function makePanel(title) {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:10px;z-index:2147483647;background:#0b1220;color:#e6f6ff;border:1px solid #2dd4ff;border-radius:12px;padding:12px;font:13px/1.45 sans-serif;max-height:80vh;overflow:auto';
    var bubble = document.createElement('div');
    bubble.textContent = 'DMX';
    bubble.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;display:none;width:52px;height:52px;border-radius:50%;background:#0b1220;border:2px solid #2dd4ff;color:#2dd4ff;align-items:center;justify-content:center;font:700 13px monospace;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.5)';
    bubble.onclick = function () { box.style.display = 'block'; bubble.style.display = 'none'; };
    var x = document.createElement('span'); x.textContent = '✕'; x.title = 'Ẩn';
    x.style.cssText = 'float:right;cursor:pointer;color:#8fb6cc;font-size:18px;line-height:1;padding:0 2px;margin-left:8px';
    x.onclick = function () { box.style.display = 'none'; bubble.style.display = 'flex'; };
    box.appendChild(x);
    var h = document.createElement('b'); h.style.color = '#2dd4ff'; h.textContent = title + ' · v' + VER; box.appendChild(h);
    var link = document.createElement('a');
    link.href = 'https://namkphong.github.io/cai-realtime.html';
    link.target = '_blank';
    link.textContent = '⚙ Cài / cập nhật script';
    link.style.cssText = 'display:block;margin-top:6px;font-size:11px;color:#8fb6cc;text-decoration:underline';
    box.appendChild(link);
    var copyBtn = document.createElement('a');
    copyBtn.href = '#';
    copyBtn.textContent = '📋 Chép nhật ký CẢ CHU KỲ (mọi trang)';
    copyBtn.style.cssText = 'display:block;margin-top:4px;font-size:11px;color:#3bf07a;text-decoration:underline';
    copyBtn.onclick = function (ev) {
      ev.preventDefault();
      var text = logAllGet().join('\n') || '(chưa có gì)';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { api.log('Đã chép nhật ký cả chu kỳ.'); },
                                                   function () { window.prompt('Chép tay:', text); });
      } else { window.prompt('Chép tay:', text); }
    };
    box.appendChild(copyBtn);
    var log = document.createElement('div');
    log.style.cssText = 'background:#000;color:#3bf07a;font:11px/1.5 monospace;padding:8px;border-radius:6px;margin-top:8px;height:150px;overflow:auto;white-space:pre-wrap;word-break:break-word';
    document.body.appendChild(box); document.body.appendChild(bubble);
    var api = {
      log: function (m) {
        log.textContent += m + '\n'; log.scrollTop = log.scrollHeight;
        try { console.log('[dmx-auto] ' + m); } catch (e) {}
        logAllPush(title, m);
      },
      btn: function (label, bg, fn) {
        var b = document.createElement('button'); b.textContent = label;
        b.style.cssText = 'display:block;width:100%;margin:6px 0;padding:11px;border:0;border-radius:8px;font-weight:bold;color:#fff;background:' + bg;
        b.onclick = function () { b.disabled = true; Promise.resolve().then(fn).catch(function (e) { api.log('✗ ' + (e.message || e)); }).then(function () { b.disabled = false; }); };
        box.appendChild(b); return b;
      },
      attach: function () { box.appendChild(log); }
    };
    return api;
  }

  /* ================================================================== */
  /* DASHBOARD 77                                                       */
  /* ================================================================== */
  function dashboard77() {
    var ui = makePanel('DMX Auto · Dashboard 77');

    async function setDates(log) {
      var $ = W.jQuery; if (!$) throw new Error('jQuery chưa sẵn sàng.');
      var dps = [];
      $('input').each(function (i, el) { var k; try { k = $(el).data('kendoDatePicker'); } catch (e) {} if (k) { var r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) dps.push({ el: el, k: k }); } });
      if (dps.length < 2) throw new Error('Chỉ thấy ' + dps.length + ' ô ngày (cần 2).');
      var to = new Date(); to.setHours(0, 0, 0, 0);
      var from = new Date(); from.setDate(from.getDate() - SO_NGAY_CAO); from.setHours(0, 0, 0, 0);
      dps[0].k.value(from); dps[0].k.trigger('change');
      dps[1].k.value(to); dps[1].k.trigger('change');
      [dps[0].el, dps[1].el].forEach(function (el) { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
      log('Đặt ngày: ' + from.toLocaleDateString('vi') + ' → ' + to.toLocaleDateString('vi'));
      await sleep(300);
    }

    function setKhoTao(log) {
      var $ = W.jQuery, found = null, val = null;
      $('input, .k-widget, [data-role]').each(function (i, el) {
        if (found) return;
        var dd; try { dd = $(el).data('kendoComboBox'); } catch (e) {}
        if (!dd || !dd.dataSource) return;
        var data; try { data = dd.dataSource.data(); } catch (e) { return; }
        for (var k = 0; k < data.length; k++) { if (/^\s*kho tạo\s*$/i.test((data[k].Title || data[k].text || '') + '')) { found = dd; val = (data[k].Value != null ? data[k].Value : data[k].value); break; } }
      });
      if (!found) throw new Error('Không tìm được combobox "Kho tạo".');
      try { found.select(function (d) { return /^\s*kho tạo\s*$/i.test((d.Title || d.text || '') + ''); }); } catch (e) {}
      if (!found.value()) { try { found.value(String(val)); } catch (e) {} }
      found.trigger('change');
      log('Đã chọn Tìm theo = Kho tạo (value=' + found.value() + ').');
    }

    async function selectStore(store, log) {
      var $ = W.jQuery;
      var cands = [];
      [].slice.call(document.querySelectorAll('body *')).forEach(function (s) {
        if (s.closest && s.closest('.k-window')) return;
        if (s.tagName === 'INPUT' || s.tagName === 'TEXTAREA') { if (/siêu thị được chọn/i.test(s.value || '')) cands.push(s); return; }
        var own = ''; for (var n = 0; n < s.childNodes.length; n++) { if (s.childNodes[n].nodeType === 3) own += s.childNodes[n].nodeValue; }
        if (/siêu thị được chọn/i.test(own)) cands.push(s);
      });
      cands.sort(function (a, b) { return (a.textContent || a.value || '').length - (b.textContent || b.value || '').length; });
      var el = cands[0];
      if (!el) throw new Error('Không thấy ô "... Siêu thị được chọn" (ngoài modal).');

      function findModal() { return [].slice.call(document.querySelectorAll('.k-window')).filter(function (w) { var r = w.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (/chọn siêu thị/i.test(w.textContent || '') || w.querySelector('input.filterText')); })[0]; }
      var win = findModal();
      if (!win) { var cs = [el], p = el; for (var ci = 0; ci < 5 && p; ci++) { p = p.parentElement; if (p) cs.push(p); } for (var c = 0; c < cs.length && !win; c++) { cs[c].click(); win = await waitFor(findModal, 2500, 300); } }
      if (!win) throw new Error('Modal "Chọn siêu thị" không mở.');
      await sleep(500);

      // Bỏ chọn siêu thị cũ TRƯỚC (bắt buộc, tránh xuất gộp nhiều siêu thị).
      var treeEl = win.querySelector('.jstree'), tree = null;
      try { tree = $.jstree.reference(treeEl); } catch (e) {}
      if (tree) { try { tree.deselect_all(); } catch (e) {} }

      // store.code (mã MWG) có thể CHƯA có (đang chờ dmx-gio-cong.user.js tự dò) —
      // vẫn tìm được bằng tên, chỉ là kém chắc chắn hơn nếu trùng tên với siêu thị khác.
      var ftext = win.querySelector('input.filterText, input[placeholder*="Tìm kiếm siêu thị"]');
      if (ftext) { ftext.value = store.code || store.name; ['input', 'keyup', 'change'].forEach(function (ev) { ftext.dispatchEvent(new Event(ev, { bubbles: true })); }); await sleep(1500); }
      var anchor = await waitFor(function () { return [].slice.call(win.querySelectorAll('a.jstree-anchor')).filter(function (a) { var t = a.textContent || ''; return (!store.code || t.indexOf(store.code) !== -1) && new RegExp(esc(store.name), 'i').test(t); })[0]; }, 8000);
      if (!anchor) throw new Error('Không thấy "' + store.name + '"' + (store.code ? ' (mã ' + store.code + ')' : '') + ' trong cây.');
      if (tree) { try { tree.select_node(anchor.id.replace(/_anchor$/, '')); } catch (e) { anchor.click(); } } else anchor.click();
      await sleep(700);
      var sel = '?'; if (tree) { try { sel = tree.get_selected().length; } catch (e) {} }
      log('Đã chọn ' + store.name + ' (đang chọn: ' + sel + ').');
      var xong = [].slice.call(win.querySelectorAll('button,a,span,div')).filter(function (b) { return /^\s*xong\s*$/i.test(b.textContent || ''); })[0];
      if (!xong) throw new Error('Không thấy nút Xong.');
      xong.click();
      await sleep(900);
    }

    function clickXuatExcel(log) {
      var b = [].slice.call(document.querySelectorAll('button')).filter(function (x) { return /xuất excel/i.test((x.textContent || '').trim()) && /btn-success/.test(x.className || ''); })[0]
           || [].slice.call(document.querySelectorAll('button,a')).filter(function (x) { return /^\s*xuất excel\s*$/i.test((x.textContent || '').trim()); })[0];
      if (!b) throw new Error('Không thấy nút "Xuất excel".');
      b.click(); log('✓ Đã bấm Xuất excel.');
    }

    async function doExport(store, log) {
      log('--- ' + store.name + ' ---');
      await setDates(log);
      setKhoTao(log);
      await selectStore(store, log);
      await sleep(400);
      clickXuatExcel(log);
    }

    async function runAuto() {
      var job = jobGet();
      if (!job || job.mode !== 'auto' || job.phase !== 'export') return;
      if (++job.hops > 40) { jobClear(); ui.log('✗ Quá nhiều bước, dừng.'); return; }
      jobSet(job);
      ui.log('=== Xuất excel cho ' + job.queue.length + ' siêu thị ===');
      try {
        for (var i = 0; i < job.queue.length; i++) {
          await doExport(storeByKey(job.queue[i]), ui.log);
          await sleep(3500); // chờ lệnh xuất ghi nhận trước khi làm siêu thị kế
        }
      } catch (e) { ui.log('✗ ' + (e.message || e)); ui.log('Đã dừng. Sửa xong bấm lại.'); jobClear(); return; }
      job.phase = 'download'; job.exportAt = Date.now(); job.files = []; job.i = 0; job.dlTry = 0; jobSet(job);
      ui.log('→ Đã xuất cả ' + job.queue.length + '. Sang ManagerDownload…');
      await sleep(1500);
      location.href = MD_URL;
    }

    var maCacKey = STORES.map(function (s) { return s.key; });
    ui.btn('▶ Chạy tất cả (xuất ' + maCacKey.length + ' ST trước, tự động)', '#16a34a', function () {
      logAllClear();
      jobSet({ mode: 'auto', queue: maCacKey.slice(), phase: 'export', exportAt: 0, files: [], i: 0, dlTry: 0, hops: 0 });
      ui.log('=== BẮT ĐẦU · trang sẽ tự chuyển/tải lại nhiều lần, cứ để yên ===');
      return runAuto();
    });
    STORES.forEach(function (s) {
      ui.btn('Thử điền form + Xuất: ' + s.name, '#1d4ed8', function () { return doExport(storeByKey(s.key), ui.log); });
    });
    ui.btn('Dừng tự động', '#475569', function () { jobClear(); ui.log('Đã dừng.'); });
    ui.btn('⚙ Đổi mã cụm (site code)', '#334155', changeSiteCode);
    ui.btn('⚙ Cài Telegram cảnh báo', '#334155', function () {
      var tk = (window.prompt('Telegram BOT token (dạng 123456:ABC...):', GM_getValue(TG_TOKEN, '')) || '').trim();
      if (tk) GM_setValue(TG_TOKEN, tk);
      var ch = (window.prompt('Chat ID của bạn:', GM_getValue(TG_CHAT, '')) || '').trim();
      if (ch) GM_setValue(TG_CHAT, ch);
      if (tgAlert('✅ DMX: cảnh báo Telegram đã cài (tin test).', true)) ui.log('Đã gửi tin test — kiểm Telegram.');
      else ui.log('Chưa đủ token/chat.');
    });
    var schedBtn = ui.btn('', '#7c3aed', function () { GM_setValue(SCHED_ON, !GM_getValue(SCHED_ON, false)); updateSchedBtn(); ui.log('Tự chạy: ' + (GM_getValue(SCHED_ON, false) ? 'BẬT' : 'TẮT')); });
    function updateSchedBtn() { schedBtn.textContent = '⏰ Tự chạy mỗi ' + INTERVAL_MIN + ' phút: ' + (GM_getValue(SCHED_ON, false) ? 'BẬT — bấm để TẮT' : 'TẮT — bấm để BẬT'); }
    updateSchedBtn();
    ui.attach();

    // --- Bộ hẹn giờ: mỗi INTERVAL_MIN phút kể từ lần chạy XONG gần nhất ---
    function schedTick() {
      if (GM_getValue(SCHED_ON, false) !== true) return;
      if (!inWorkHours()) return; // chỉ chạy 8–22h
      if (jobGet()) return; // đang chạy dở
      if (Date.now() - GM_getValue(LAST_RUN, 0) < INTERVAL_MIN * 60 * 1000) return;
      logAllClear();
      ui.log('⏰ Tới cữ ' + INTERVAL_MIN + ' phút — tự chạy.');
      jobSet({ mode: 'auto', queue: STORES.map(function (s) { return s.key; }), phase: 'export', exportAt: 0, files: [], i: 0, dlTry: 0, hops: 0, sched: true });
      runAuto();
    }
    setInterval(schedTick, 60000);

    var j = jobGet();
    if (j && j.mode === 'auto' && j.phase === 'export') { ui.log('↻ Tiếp tục tự động…'); runAuto(); }
    else { ui.log('Sẵn sàng. Test "điền form" hoặc "Chạy tất cả". ' + (GM_getValue(SCHED_ON, false) ? 'Hẹn giờ ĐANG BẬT (mỗi ' + INTERVAL_MIN + ' phút).' : 'Hẹn giờ đang tắt.')); setTimeout(schedTick, 3000); }
  }

  /* ================================================================== */
  /* ManagerDownload — chờ đủ N file "Đã xuất xong" rồi tải hết         */
  /* ================================================================== */
  function managerDownload() {
    var ui = makePanel('DMX Auto · Tải & Đẩy');

    function topRows(n) {
      var links = [].slice.call(document.querySelectorAll('a')).filter(function (a) { return /tải file excel/i.test((a.textContent || '').trim()); });
      return links.slice(0, n).map(function (a) {
        var item = null; try { item = W.angular.element(a).scope().dataItem; } catch (e) {}
        var tr = a.closest('tr');
        return { a: a, item: item, rowText: tr ? (tr.textContent || '').replace(/\s+/g, ' ').trim() : '' };
      });
    }
    function clickXemBaoCao() {
      var els = [].slice.call(document.querySelectorAll('button,a,input[type=button],[ng-click],div,span')).filter(function (x) { var t = (x.textContent || x.value || '').replace(/\s+/g, ' ').trim(); return t.length < 30 && /xem báo cáo/i.test(t); });
      if (!els.length) return false;
      function rk(e) { if (e.tagName === 'BUTTON') return 0; if (e.tagName === 'A') return 1; if (e.getAttribute && e.getAttribute('ng-click')) return 2; return 5; }
      els.sort(function (a, b) { return rk(a) - rk(b); });
      var t = els[0], inner = t.querySelector ? t.querySelector('button,a,input[type=button],[ng-click]') : null;
      (inner || t).click(); return true;
    }
    function fetchXlsx(url) {
      return new Promise(function (resolve, reject) {
        GM_xmlhttpRequest({ method: 'GET', url: url, responseType: 'arraybuffer',
          onload: function (r) { if (r.status >= 400) return reject(new Error('Tải lỗi HTTP ' + r.status)); if (!r.response || !r.response.byteLength) return reject(new Error('File rỗng.')); resolve(r.response); },
          onerror: function () { reject(new Error('Lỗi mạng khi tải.')); }, ontimeout: function () { reject(new Error('Quá thời gian tải.')); } });
      });
    }

    async function downloadAll(job, rows) {
      var files = [];
      for (var i = 0; i < rows.length; i++) {
        ui.log('Tải file ' + (i + 1) + '/' + rows.length + '…');
        var buf = await fetchXlsx(rows[i].item.LINKDOWNLOAD);
        files.push({ name: 'Chitiet_' + (i + 1) + '.xlsx', b64: abToB64(buf) });
        ui.log('✓ ' + Math.round(buf.byteLength / 1024) + ' KB.');
      }
      job.files = files; job.phase = 'render'; job.i = 0; job.dlTry = 0; jobSet(job);
      await sleep(500); location.href = RT_URL + '?t=' + Date.now();
    }

    async function autoDownload(job) {
      var N = (job.queue && job.queue.length) || 1;
      job.dlTry = (job.dlTry || 0) + 1; jobSet(job);
      var clicked = clickXemBaoCao();
      await sleep(6000);
      var rows = topRows(N);
      var allDone = rows.length >= N && rows.slice(0, N).every(function (r) { return r.rowText.indexOf(DONE_STATUS) !== -1 && r.item && r.item.LINKDOWNLOAD; });
      if (allDone) { ui.log('Đủ ' + N + ' file "Đã xuất xong". Tải…'); await downloadAll(job, rows.slice(0, N)); return; }
      var doneCount = rows.filter(function (r) { return r.rowText.indexOf(DONE_STATUS) !== -1; }).length;
      ui.log('Chờ đủ ' + N + ' "Đã xuất xong"… lần ' + job.dlTry + ' · refresh:' + (clicked ? 'ok' : 'KHÔNG THẤY') + ' · xong ' + doneCount + '/' + N);
      if (job.dlTry >= 30) { ui.log('✗ Chờ quá lâu, dừng.'); jobClear(); return; }
      await sleep(13000); location.reload();
    }

    // Nút thủ công: tải 1 file trên cùng (mode manual).
    ui.btn('⬇ Tải bản trên cùng → tạo ảnh → Đẩy ảnh', '#0f766e', async function () {
      var rows = topRows(1);
      if (!rows.length) throw new Error('Không thấy "Tải file excel". Bấm "Làm mới bảng".');
      if (rows[0].rowText.indexOf(DONE_STATUS) === -1) throw new Error('Dòng trên cùng chưa "Đã xuất xong".');
      if (!rows[0].item || !rows[0].item.LINKDOWNLOAD) throw new Error('Không đọc được LINKDOWNLOAD.');
      await downloadAll({ mode: 'manual' }, rows);
    });
    ui.btn('Làm mới bảng (Xem báo cáo)', '#1d4ed8', function () { ui.log(clickXemBaoCao() ? 'Đã bấm Xem báo cáo.' : 'Không thấy nút Xem báo cáo.'); });
    ui.attach();

    // Đôi khi hệ thống MWG/BI tự làm mới phiên đăng nhập dùng chung rồi bật
    // ngược trình duyệt về "trang MWG gần nhất" — hay chính là ManagerDownload
    // — giữa lúc job đang dở ở phase khác (bi1/bi2/rt/render). KHÔNG PHẢI do
    // script tự điều hướng về đây (đã rà lại, script chỉ location.href = MD_URL
    // đúng 1 lần, ngay sau khi xuất excel). Coi đây là cú bật ngược ngoài ý
    // muốn, TỰ ĐIỀU HƯỚNG LẠI đúng hướng job đang cần, thay vì đứng im chờ tay.
    var BOUNCE_TARGET = { bi1: BI_O1_URL, bi2: BI_O2_URL, render: RT_URL + '?t=' + Date.now(), rt: RTP_URL + '?t=' + Date.now() };
    var BOUNCE_MAX = 5;

    var job = jobGet();
    if (job && job.mode === 'auto' && job.phase === 'download') {
      ui.log('↻ Tự động: chờ đủ file rồi tải…');
      autoDownload(job).catch(function (e) { ui.log('✗ ' + (e.message || e)); jobClear(); });
    } else if (job && job.mode === 'auto' && BOUNCE_TARGET[job.phase]) {
      var bounce = (job.biBounce || 0) + 1;
      if (bounce > BOUNCE_MAX) {
        ui.log('✗ Bị bật ngược về ManagerDownload ' + BOUNCE_MAX + ' lần liên tiếp — nghi phiên đăng nhập BI có vấn đề. Dừng, chờ kiểm tra tay.');
        tgAlert('⚠️ DMX Auto: bị bật ngược về ManagerDownload ' + BOUNCE_MAX + ' lần lúc ' + new Date().toLocaleTimeString('vi') + '. Kiểm tra phiên đăng nhập BI.');
        jobClear();
      } else {
        job.biBounce = bounce; jobSet(job);
        ui.log('↩ Bị bật ngược về ManagerDownload (lần ' + bounce + '/' + BOUNCE_MAX + ') — tự quay lại ' + job.phase + '…');
        setTimeout(function () { location.href = BOUNCE_TARGET[job.phase]; }, 2000);
      }
    } else ui.log(job ? 'Có việc chờ ở realtimenv.' : 'Sẵn sàng. Xuất xong, đợi "Đã xuất xong" rồi bấm nút xanh.');
  }

  /* ================================================================== */
  /* realtimenv.html — xử lý lần lượt từng file (tải lại trang giữa 2)  */
  /* ================================================================== */
  function realtimenv() {
    var job = jobGet();
    if (!job || job.phase !== 'render' || !job.files || !job.files.length) return;
    var ui = makePanel('DMX Auto · Nạp & Đẩy');
    ui.attach();

    async function processOne(file) {
      var modal = document.getElementById('previewModal'); if (modal) modal.classList.add('hidden');
      var input = document.getElementById('fileUpload');
      if (!input) throw new Error('Không thấy #fileUpload.');
      var f = new File([b64ToBytes(file.b64)], file.name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var dt = new DataTransfer(); dt.items.add(f);
      try { input.value = ''; } catch (e) {}
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
      ui.log('Đã nạp ' + file.name + ', chờ phân tích…');
      var ready = await waitFor(function () { var ab = document.getElementById('actionButtons'); return ab && !ab.classList.contains('hidden'); }, 25000);
      if (!ready) throw new Error('Trang chưa phân tích được file.');
      ui.log('✓ Phân tích xong. Tạo ảnh…'); await sleep(600);
      if (typeof W.generatePreview !== 'function') throw new Error('Không có hàm generatePreview().');
      W.generatePreview();
      var img = await waitFor(function () { var el = document.getElementById('previewImage'); return el && /^data:image/.test(el.getAttribute('src') || '') ? el : null; }, 30000);
      if (!img) throw new Error('Ảnh chưa render.');
      ui.log('✓ Có ảnh. Bấm Đẩy ảnh…'); await sleep(400);
      var toastEl = document.getElementById('dmxpub-toast');
      var before = toastEl ? toastEl.textContent : '';
      var pushBtn = await waitFor(function () { return [].slice.call(document.querySelectorAll('#dmxpub-bar button, button')).filter(function (b) { return /đẩy ảnh/i.test((b.textContent || '').trim()); })[0]; }, 8000);
      if (!pushBtn) throw new Error('Không thấy nút "Đẩy ảnh" — script A đã bật chưa?');
      pushBtn.click();
      ui.log('Đã bấm Đẩy ảnh, chờ…');
      var res = await waitFor(function () {
        var t = document.getElementById('dmxpub-toast'); if (!t || t.style.display === 'none') return null;
        var m = t.textContent || ''; if (m === before) return null;
        if (/đã đẩy ảnh/i.test(m)) return { ok: true, msg: m }; if (/✗|lỗi/i.test(m)) return { ok: false, msg: m }; return null;
      }, 30000);
      if (res && !res.ok) throw new Error('Đẩy thất bại: ' + res.msg);
      ui.log(res ? '✓ ' + res.msg.replace(/\n/g, ' ') : '⚠ Không bắt được thông báo (kiểm tra /số).');
    }

    async function run() {
      var i = job.i || 0;
      if (i >= job.files.length) { jobClear(); ui.log('=== ✓ XONG ==='); return; }
      ui.log('--- File ' + (i + 1) + '/' + job.files.length + ' ---');
      await processOne(job.files[i]);
      job.i = i + 1; jobSet(job);
      if (job.i < job.files.length) { ui.log('→ File kế tiếp, tải lại trang…'); await sleep(1200); location.reload(); }
      else {
        ui.log('=== ✓ XONG CẢ ' + job.files.length + ' SIÊU THỊ (ảnh doanh thu) ===');
        job.phase = 'bi1'; jobSet(job);
        ui.log('→ Sang BI cào Ô1 (ngành hàng)…');
        // Không biLock() được ở đây — trang đang ở namkphong.github.io, khác gốc
        // (origin) với bi.thegioididong.com nên localStorage không dùng chung.
        // biO1() bên BI sẽ tự khoá ngay khi trang đó vừa tải xong.
        await sleep(1500); location.href = BI_O1_URL;
      }
    }

    ui.btn('▶ Chạy (nếu không tự chạy)', '#16a34a', run);
    ui.btn('Bỏ việc đang chờ', '#475569', function () { jobClear(); ui.log('Đã bỏ việc.'); });
    ui.log('Có ' + job.files.length + ' file chờ (đang ở ' + ((job.i || 0) + 1) + '/' + job.files.length + ').');
    run().catch(function (e) { ui.log('✗ ' + (e.message || e)); });
  }

  /* ================================================================== */
  /* BI — Ô1 (ngành hàng), URL CỐ ĐỊNH cho cả cụm (id=-1, không theo ST) */
  /* ================================================================== */
  function biO1() {
    var job = jobGet();
    if (!job || job.mode !== 'auto' || job.phase !== 'bi1') return;
    biLock();
    var ui = makePanel('DMX Auto · BI Ô1 (ngành hàng)');
    ui.attach();
    (async function () {
      ui.log('Chờ bảng ngành hàng render…');
      var n = await waitForStableTables(5, 25000);
      if (n < 1) throw new Error('Không thấy bảng ngành hàng nào (n=' + n + ').');
      var tables = visibleTablesWithText();
      var txt = tables.map(grabTable).join('\n');
      ui.log('✓ Cào được ' + tables.length + ' bảng, ' + txt.length + ' ký tự.');
      job.o1 = txt;
      if (!BI_O2_URL) {
        ui.log('⚠ Chưa cấu hình mã Ô2 (biClusterO2Id) cho cụm này — dừng, không có ảnh Realtime lần này.');
        jobClear(); biUnlock(); return;
      }
      job.phase = 'bi2'; jobSet(job);
      ui.log('→ Sang BI cào Ô2 (doanh thu tổng)…');
      biLock();
      await sleep(1200); location.href = BI_O2_URL;
    })().catch(function (e) { ui.log('✗ ' + (e.message || e)); jobClear(); biUnlock(); });
  }

  /* ================================================================== */
  /* BI — Ô2 (doanh thu tổng), URL CỐ ĐỊNH cho cả cụm (id=90564)        */
  /* ================================================================== */
  var O2_MAX_RETRY = 3;
  function biO2() {
    var job = jobGet();
    if (!job || job.mode !== 'auto' || job.phase !== 'bi2') return;
    biLock();
    var ui = makePanel('DMX Auto · BI Ô2 (doanh thu tổng)' + (job.o2Retry ? ' (thử lại ' + job.o2Retry + '/' + O2_MAX_RETRY + ')' : ''));
    ui.attach();
    (async function () {
      ui.log('Tìm & bấm tab "BC Doanh thu siêu thị"…');
      var clicked = await waitFor(function () { return clickBCDoanhThuST() ? true : null; }, 15000);
      ui.log(clicked ? '✓ Đã bấm tab.' : '⚠ Không thấy tab để bấm — thử đọc bảng luôn (có thể trang đã đúng sẵn).');
      if (clicked) await sleep(800);
      // Trang từng có lúc bấm nhầm sang link menu khác (/salebcdtst) thay vì
      // đúng tab tại chỗ — kiểm tra lại đường dẫn trước khi ngồi chờ bảng vô ích.
      if (location.pathname.indexOf('/khoi-ban-hang-sub') === -1) {
        throw new Error('Bấm nhầm, đã rời khỏi trang (đang ở ' + location.pathname + ').');
      }
      ui.log('Chờ bảng doanh thu tổng render…');
      var n = await waitForStableTables(1, 20000);
      if (n < 1) throw new Error('Không thấy bảng doanh thu tổng (n=' + n + ').');
      var tables = visibleTablesWithText();
      var txt = tables.map(grabTable).join('\n');
      ui.log('✓ Cào được ' + tables.length + ' bảng, ' + txt.length + ' ký tự.');
      job.o2 = txt; job.phase = 'rt'; jobSet(job);
      ui.log('→ Sang realtime.html dán + đẩy ảnh…');
      biUnlock(); // rời BI, nhường lại cho dmx.user.js
      await sleep(1200); location.href = RTP_URL + '?t=' + Date.now();
    })().catch(function (e) {
      ui.log('✗ ' + (e.message || e));
      var retry = (job.o2Retry || 0) + 1;
      if (retry <= O2_MAX_RETRY) {
        job.o2Retry = retry; jobSet(job);
        ui.log('↻ Thử lại (' + retry + '/' + O2_MAX_RETRY + ') sau 2s…');
        setTimeout(function () { location.href = BI_O2_URL; }, 2000);
      } else {
        ui.log('✗ Đã thử lại ' + O2_MAX_RETRY + ' lần vẫn lỗi — dừng.');
        jobClear(); biUnlock();
      }
    });
  }

  /* ================================================================== */
  /* realtime.html — dán Ô1+Ô2 rồi bấm "Đẩy ảnh RT" của script A        */
  /* ================================================================== */
  var RT_MAX_RETRY = 3;
  function realtimePage() {
    var job = jobGet();
    if (!job || job.mode !== 'auto' || job.phase !== 'rt') return;
    var ui = makePanel('DMX Auto · Đẩy ảnh Realtime' + (job.rtRetry ? ' (thử lại ' + job.rtRetry + '/' + RT_MAX_RETRY + ')' : ''));
    ui.attach();
    (async function () {
      var d1 = document.getElementById('dataInput1'), d2 = document.getElementById('dataInput2');
      if (!d1 || !d2) throw new Error('Không thấy ô dataInput1/dataInput2.');
      d1.value = job.o1 || ''; d2.value = job.o2 || '';
      ui.log('Đã dán Ô1 (' + d1.value.length + ' ký tự) + Ô2 (' + d2.value.length + ' ký tự).');
      var toastEl = document.getElementById('dmxpub-toast');
      var before = toastEl ? toastEl.textContent : '';
      var pushBtn = await waitFor(function () {
        return [].slice.call(document.querySelectorAll('#dmxpub-rt-bar button, button')).filter(function (b) { return /đẩy ảnh rt/i.test((b.textContent || '').trim()); })[0];
      }, 8000);
      if (!pushBtn) throw new Error('Không thấy nút "Đẩy ảnh RT" — script A đã bật chưa?');
      pushBtn.click();
      ui.log('Đã bấm Đẩy ảnh RT, chờ…');
      var res = await waitFor(function () {
        var t = document.getElementById('dmxpub-toast'); if (!t || t.style.display === 'none') return null;
        var m = t.textContent || ''; if (m === before) return null;
        if (/đã đẩy ảnh rt/i.test(m)) return { ok: true, msg: m }; if (/✗|lỗi/i.test(m)) return { ok: false, msg: m }; return null;
      }, 30000);
      if (res && !res.ok) throw new Error('Đẩy ảnh RT thất bại: ' + res.msg);
      if (!res) throw new Error('Không bắt được thông báo kết quả sau 30s — có thể trang treo/đẩy chưa xong.');
      ui.log('✓ ' + res.msg);
      jobClear(); GM_setValue(LAST_RUN, Date.now());
      ui.log('=== ✓ HOÀN TẤT TOÀN BỘ CHU KỲ ===');
      ui.log('→ Tự về dashboard 77 (chờ cữ sau)…');
      await sleep(2000); location.href = D77_URL;
    })().catch(function (e) {
      ui.log('✗ ' + (e.message || e));
      var retry = (job.rtRetry || 0) + 1;
      if (retry <= RT_MAX_RETRY) {
        job.rtRetry = retry; jobSet(job);
        ui.log('↻ Tải lại trang, thử lại (' + retry + '/' + RT_MAX_RETRY + ') sau 3s…');
        setTimeout(function () { location.href = RTP_URL + '?t=' + Date.now(); }, 3000);
      } else {
        ui.log('✗ Đã thử lại ' + RT_MAX_RETRY + ' lần vẫn lỗi — bỏ chu kỳ này, về dashboard 77 chờ cữ sau.');
        tgAlert('⚠️ DMX Auto: đẩy ảnh Realtime lỗi ' + RT_MAX_RETRY + ' lần liên tiếp lúc ' + new Date().toLocaleTimeString('vi') + '. Kiểm tra realtime.html/script A.');
        jobClear();
        setTimeout(function () { location.href = D77_URL; }, 3000);
      }
    });
  }

  /* ---------------- định tuyến ---------------- */
  (async function () {
  try { await ensureClusterConfig(); }
  catch (e) { console.error('[dmx-auto] Lỗi tải cấu hình cụm:', e); window.alert('DMX Auto: ' + (e.message || e)); return; }

  var host = location.hostname, path = location.pathname;
  if (host.indexOf('report.mwgroup.vn') !== -1) {
    if (/dashboard\/77/.test(path)) dashboard77();
    else if (/ManagerDownload/i.test(path)) managerDownload();
    else maybeLoggedOut();
  } else if (host.indexOf('namkphong.github.io') !== -1) {
    if (path.indexOf('/realtimenv.html') !== -1) realtimenv();
    else if (path.indexOf('/realtime.html') !== -1) realtimePage();
  } else if (host.indexOf('bi.thegioididong.com') !== -1) {
    (async function () {
      var job = jobGet();
      if (!job || job.mode !== 'auto') return;
      var wantFrag = job.phase === 'bi1' ? '/thi-dua' : job.phase === 'bi2' ? '/khoi-ban-hang-sub' : null;
      if (!wantFrag) return;
      // BI (Angular) luôn mở "vỏ" mặc định (/khoi-ban-hang-sub/-1) trước, rồi
      // mới tự đổi URL NGẦM (không tải lại trang, không kích hoạt document-idle
      // lần 2) sang đúng chỗ cần. Nếu chỉ nhìn URL đúng 1 LẦN ngay lúc script
      // vừa chạy sẽ bắt hụt (còn đang ở trang vỏ) — và vì không có lần 2 nên
      // biO1()/biO2() không bao giờ được gọi dù URL sau đó đã đúng. Đợi URL ổn
      // định đúng chỗ job đang cần (tối đa 10s) rồi mới quyết định gọi hàm nào.
      var t0 = Date.now();
      while (location.pathname.indexOf(wantFrag) === -1 && Date.now() - t0 < 10000) await sleep(400);
      if (location.pathname.indexOf(wantFrag) === -1) {
        var targetUrl = wantFrag === '/thi-dua' ? BI_O1_URL : BI_O2_URL;
        var retry = (job.urlRetry || 0) + 1;
        var ui = makePanel('DMX Auto · Chờ URL BI' + (retry > 1 ? ' (thử lại ' + retry + '/4)' : ''));
        ui.attach();
        if (retry > 4) {
          ui.log('✗ Đợi 10s vẫn ở "' + location.pathname + '", đã thử lại 4 lần vẫn không tự đổi sang "' + wantFrag + '" — dừng.');
          tgAlert('⚠️ DMX Auto: BI không tự chuyển sang ' + wantFrag + ' sau 4 lần thử lúc ' + new Date().toLocaleTimeString('vi') + '.');
          jobClear();
          return;
        }
        // location.reload() TRƯỚC ĐÂY chỉ tải lại ĐÚNG trang vỏ đang đứng (vô
        // ích, lặp lại đúng vòng lặp hỏng) — phải điều hướng THẲNG lại URL đích
        // (không phải reload) thì lần sau app mới có cơ hội tự đổi đúng chỗ.
        ui.log('✗ Đợi 10s vẫn ở "' + location.pathname + '", chưa thấy đổi sang "' + wantFrag + '" — điều hướng lại URL đích, thử lại (' + retry + '/4)…');
        job.urlRetry = retry; jobSet(job);
        setTimeout(function () { location.href = targetUrl; }, 1500);
        return;
      }
      if (wantFrag === '/thi-dua') biO1(); else biO2();
    })();
  }
  })();
})();
