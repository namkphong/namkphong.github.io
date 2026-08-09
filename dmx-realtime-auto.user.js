// ==UserScript==
// @name         DMX — Realtime tự động (Supabase + hẹn giờ + cảnh báo Telegram)
// @namespace    namkphong.github.io
// @version      0.6.2
// @description  Tự xuất excel 2 siêu thị → tạo ảnh → đẩy Supabase; hẹn giờ mỗi 10 phút CHỈ trong 8–22h; phát hiện đăng xuất MWG → gửi cảnh báo Telegram.
// @match        https://report.mwgroup.vn/*
// @match        https://namkphong.github.io/realtimenv.html*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      cdnv2.tgdd.vn
// @connect      api.telegram.org
// @updateURL    https://namkphong.github.io/dmx-realtime-auto.user.js
// @downloadURL  https://namkphong.github.io/dmx-realtime-auto.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VER = '0.6.2';
  var W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  var JOB = 'dmx_auto_job_v1';
  var DONE_STATUS = 'Đã xuất xong, có thể tải file';
  var RT_URL = 'https://namkphong.github.io/realtimenv.html';
  var MD_URL = 'https://report.mwgroup.vn/ManagerDownload';
  var D77_URL = 'https://report.mwgroup.vn/home/dashboard/77';

  var STORES = [
    { key: '396', name: '396 Nguyễn Văn Cừ', code: '14285', match: 'Nguyễn Văn Cừ' },
    { key: '142', name: 'Ngọc Thụy',         code: '8807',  match: 'Ngọc Thụy' }
  ];
  function storeByKey(k) { for (var i = 0; i < STORES.length; i++) if (STORES[i].key === k) return STORES[i]; return null; }

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
        tgAlert('⚠️ MWG ĐĂNG XUẤT (cụm 14285) lúc ' + new Date().toLocaleTimeString('vi') +
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
    var log = document.createElement('div');
    log.style.cssText = 'background:#000;color:#3bf07a;font:11px/1.5 monospace;padding:8px;border-radius:6px;margin-top:8px;height:150px;overflow:auto;white-space:pre-wrap;word-break:break-word';
    document.body.appendChild(box); document.body.appendChild(bubble);
    var api = {
      log: function (m) { log.textContent += m + '\n'; log.scrollTop = log.scrollHeight; try { console.log('[dmx-auto] ' + m); } catch (e) {} },
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
      var from = new Date(); from.setDate(from.getDate() - 14); from.setHours(0, 0, 0, 0);
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

      var ftext = win.querySelector('input.filterText, input[placeholder*="Tìm kiếm siêu thị"]');
      if (ftext) { ftext.value = store.code; ['input', 'keyup', 'change'].forEach(function (ev) { ftext.dispatchEvent(new Event(ev, { bubbles: true })); }); await sleep(1500); }
      var anchor = await waitFor(function () { return [].slice.call(win.querySelectorAll('a.jstree-anchor')).filter(function (a) { var t = a.textContent || ''; return t.indexOf(store.code) !== -1 && new RegExp(esc(store.match), 'i').test(t); })[0]; }, 8000);
      if (!anchor) throw new Error('Không thấy "' + store.name + '" (mã ' + store.code + ') trong cây.');
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

    ui.btn('▶ Chạy tất cả (xuất 2 ST trước, tự động)', '#16a34a', function () {
      jobSet({ mode: 'auto', queue: ['396', '142'], phase: 'export', exportAt: 0, files: [], i: 0, dlTry: 0, hops: 0 });
      ui.log('=== BẮT ĐẦU · trang sẽ tự chuyển/tải lại nhiều lần, cứ để yên ===');
      return runAuto();
    });
    ui.btn('Thử điền form + Xuất: 396', '#1d4ed8', function () { return doExport(storeByKey('396'), ui.log); });
    ui.btn('Thử điền form + Xuất: Ngọc Thụy', '#1d4ed8', function () { return doExport(storeByKey('142'), ui.log); });
    ui.btn('Dừng tự động', '#475569', function () { jobClear(); ui.log('Đã dừng.'); });
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
      ui.log('⏰ Tới cữ ' + INTERVAL_MIN + ' phút — tự chạy.');
      jobSet({ mode: 'auto', queue: ['396', '142'], phase: 'export', exportAt: 0, files: [], i: 0, dlTry: 0, hops: 0, sched: true });
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
      await sleep(500); location.href = RT_URL;
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

    var job = jobGet();
    if (job && job.mode === 'auto' && job.phase === 'download') {
      ui.log('↻ Tự động: chờ đủ file rồi tải…');
      autoDownload(job).catch(function (e) { ui.log('✗ ' + (e.message || e)); jobClear(); });
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
      else { jobClear(); GM_setValue(LAST_RUN, Date.now()); ui.log('=== ✓ XONG CẢ ' + job.files.length + ' SIÊU THỊ ==='); ui.log('→ Tự về dashboard 77 (chờ cữ sau)…'); await sleep(2000); location.href = D77_URL; }
    }

    ui.btn('▶ Chạy (nếu không tự chạy)', '#16a34a', run);
    ui.btn('Bỏ việc đang chờ', '#475569', function () { jobClear(); ui.log('Đã bỏ việc.'); });
    ui.log('Có ' + job.files.length + ' file chờ (đang ở ' + ((job.i || 0) + 1) + '/' + job.files.length + ').');
    run().catch(function (e) { ui.log('✗ ' + (e.message || e)); });
  }

  /* ---------------- định tuyến ---------------- */
  var host = location.hostname, path = location.pathname;
  if (host.indexOf('report.mwgroup.vn') !== -1) {
    if (/dashboard\/77/.test(path)) dashboard77();
    else if (/ManagerDownload/i.test(path)) managerDownload();
    else maybeLoggedOut();
  } else if (host.indexOf('namkphong.github.io') !== -1) realtimenv();
})();
