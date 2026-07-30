// ==UserScript==
// @name         DMX — Realtime tự động (v0.1: tải→ảnh→đẩy GitHub)
// @namespace    namkphong.github.io
// @version      0.1.0
// @description  Trên ManagerDownload: tải file mới nhất → nạp realtimenv.html → tạo ảnh → tự bấm Đẩy GitHub. Bạn chỉ cần bấm "Xuất excel" bằng tay. (v0.2 sẽ tự điền form + hẹn giờ.)
// @match        https://report.mwgroup.vn/ManagerDownload*
// @match        https://namkphong.github.io/realtimenv.html*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      cdnv2.tgdd.vn
// @updateURL    https://namkphong.github.io/dmx-realtime-auto.user.js
// @downloadURL  https://namkphong.github.io/dmx-realtime-auto.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VER = '0.1.0';
  var W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window; // truy cập angular/generatePreview của trang
  var JOB = 'dmx_auto_job_v1';   // băng chuyền mang file qua realtimenv (GM storage, xuyên origin)
  var DONE_STATUS = 'Đã xuất xong, có thể tải file';

  /* ---------------- tiện ích ---------------- */
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function waitFor(fn, timeout, step) {
    timeout = timeout || 20000; step = step || 400;
    var t0 = Date.now();
    for (;;) {
      var v; try { v = fn(); } catch (e) { v = null; }
      if (v) return v;
      if (Date.now() - t0 > timeout) return null;
      await sleep(step);
    }
  }
  function abToB64(buf) {
    var bytes = new Uint8Array(buf), bin = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    return btoa(bin);
  }
  function b64ToBytes(b64) {
    var bin = atob(b64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  /* ---------------- panel + log (xem được trên điện thoại) ---------------- */
  function makePanel(title) {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:10px;z-index:2147483647;background:#0b1220;' +
      'color:#e6f6ff;border:1px solid #2dd4ff;border-radius:12px;padding:12px;font:13px/1.45 sans-serif;max-height:80vh;overflow:auto';
    box.innerHTML = '<b style="color:#2dd4ff">' + title + ' · v' + VER + '</b>';
    var log = document.createElement('div');
    log.style.cssText = 'background:#000;color:#3bf07a;font:11px/1.5 monospace;padding:8px;border-radius:6px;' +
      'margin-top:8px;height:150px;overflow:auto;white-space:pre-wrap;word-break:break-word';
    document.body.appendChild(box);
    var api = {
      box: box,
      log: function (m) { log.textContent += m + '\n'; log.scrollTop = log.scrollHeight; try { console.log('[dmx-auto] ' + m); } catch (e) {} },
      btn: function (label, bg, fn) {
        var b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = 'display:block;width:100%;margin:6px 0;padding:11px;border:0;border-radius:8px;font-weight:bold;color:#fff;background:' + bg;
        b.onclick = function () { b.disabled = true; Promise.resolve().then(fn).catch(function (e) { api.log('✗ ' + (e.message || e)); }).then(function () { b.disabled = false; }); };
        box.appendChild(b); return b;
      },
      attach: function () { box.appendChild(log); }
    };
    return api;
  }

  /* ================================================================== */
  /* TRANG ManagerDownload — lấy file mới nhất rồi chuyển sang realtimenv */
  /* ================================================================== */
  function managerDownload() {
    var ui = makePanel('DMX Auto · Tải & Đẩy');

    // Lấy dòng trên cùng: anchor "Tải file excel" đầu tiên, kèm dataItem của nó.
    function topRow() {
      var links = [].slice.call(document.querySelectorAll('a')).filter(function (a) {
        return /tải file excel/i.test((a.textContent || '').trim());
      });
      if (!links.length) return null;
      var a = links[0];
      var item = null;
      try { item = W.angular.element(a).scope().dataItem; } catch (e) {}
      var tr = a.closest('tr');
      var rowText = tr ? (tr.textContent || '').replace(/\s+/g, ' ').trim() : '';
      return { a: a, item: item, rowText: rowText };
    }

    async function fetchXlsx(url) {
      ui.log('Tải file: ' + url.slice(0, 70) + '…');
      return new Promise(function (resolve, reject) {
        GM_xmlhttpRequest({
          method: 'GET', url: url, responseType: 'arraybuffer',
          onload: function (r) {
            if (r.status >= 400) { reject(new Error('Tải lỗi HTTP ' + r.status)); return; }
            var buf = r.response;
            if (!buf || !buf.byteLength) { reject(new Error('File rỗng.')); return; }
            resolve(buf);
          },
          onerror: function () { reject(new Error('Lỗi mạng khi tải file.')); },
          ontimeout: function () { reject(new Error('Quá thời gian tải file.')); }
        });
      });
    }

    async function run() {
      var row = topRow();
      if (!row) throw new Error('Không thấy dòng nào có "Tải file excel". Bấm "Xem báo cáo" để làm mới bảng.');
      ui.log('Dòng trên cùng: ' + row.rowText.slice(0, 80));
      if (row.rowText.indexOf(DONE_STATUS) === -1)
        throw new Error('Dòng trên cùng CHƯA "Đã xuất xong". Đợi thêm rồi bấm lại.');
      if (!row.item || !row.item.LINKDOWNLOAD)
        throw new Error('Không đọc được LINKDOWNLOAD (angular scope). Báo mình cấu trúc mới.');

      var buf = await fetchXlsx(row.item.LINKDOWNLOAD);
      ui.log('✓ Đã tải ' + Math.round(buf.byteLength / 1024) + ' KB. Đưa sang realtimenv…');
      GM_setValue(JOB, { phase: 'render', name: 'Chitiet_YCX.xlsx', b64: abToB64(buf), at: Date.now() });
      await sleep(400);
      location.href = 'https://namkphong.github.io/realtimenv.html';
    }

    ui.btn('⬇ Tải bản trên cùng → tạo ảnh → Đẩy GitHub', '#0f766e', run);
    ui.btn('Làm mới bảng (Xem báo cáo)', '#1d4ed8', function () {
      var b = [].slice.call(document.querySelectorAll('button,a')).filter(function (x) { return /xem báo cáo/i.test((x.textContent || '').trim()); })[0];
      if (b) { b.click(); ui.log('Đã bấm "Xem báo cáo".'); } else ui.log('Không thấy nút Xem báo cáo.');
    });
    ui.attach();

    var j = GM_getValue(JOB, null);
    ui.log(j ? 'Có việc đang chờ ở realtimenv (từ ' + new Date(j.at).toLocaleTimeString() + ').' :
               'Sẵn sàng. Xuất excel xong, đợi "Đã xuất xong" rồi bấm nút xanh.');
  }

  /* ================================================================== */
  /* TRANG realtimenv.html — nạp file, tạo ảnh, bấm Đẩy GitHub          */
  /* ================================================================== */
  function realtimenv() {
    var job = GM_getValue(JOB, null);
    if (!job || job.phase !== 'render') return;   // không có việc → không làm gì

    var ui = makePanel('DMX Auto · Nạp & Đẩy');
    ui.attach();

    async function run() {
      ui.log('Nhận file ' + job.name + ' (' + Math.round(job.b64.length * 0.75 / 1024) + ' KB).');

      // 1) Nhồi file vào ô upload
      var input = document.getElementById('fileUpload');
      if (!input) throw new Error('Không thấy ô #fileUpload.');
      var bytes = b64ToBytes(job.b64);
      var file = new File([bytes], job.name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      ui.log('Đã nạp file, chờ trang phân tích…');

      // 2) Chờ trang parse xong (nút hành động hiện ra)
      var ready = await waitFor(function () {
        var ab = document.getElementById('actionButtons');
        return ab && !ab.classList.contains('hidden');
      }, 25000);
      if (!ready) throw new Error('Trang chưa phân tích được file (không thấy nút hành động).');
      ui.log('✓ Trang đã phân tích. Tạo ảnh…');
      await sleep(600);

      // 3) Tạo ảnh "Báo Cáo Thẻ Chi Tiết"
      if (typeof W.generatePreview !== 'function') throw new Error('Trang không có hàm generatePreview().');
      W.generatePreview();

      // 4) Chờ ảnh render (previewImage có data:)
      var img = await waitFor(function () {
        var el = document.getElementById('previewImage');
        return el && /^data:image/.test(el.getAttribute('src') || '') ? el : null;
      }, 30000);
      if (!img) throw new Error('Ảnh chưa render (previewImage rỗng).');
      ui.log('✓ Đã có ảnh. Bấm Đẩy GitHub…');
      await sleep(400);

      // 5) Bấm nút "⬆ Đẩy GitHub" của userscript A
      var pushBtn = await waitFor(function () {
        return [].slice.call(document.querySelectorAll('#dmxpub-bar button, button')).filter(function (b) {
          return /đẩy github/i.test((b.textContent || '').trim());
        })[0];
      }, 8000);
      if (!pushBtn) throw new Error('Không thấy nút "Đẩy GitHub" — userscript A (dmx-line-publish) đã bật chưa?');
      pushBtn.click();
      ui.log('Đã bấm Đẩy GitHub, chờ kết quả…');

      // 6) Chờ toast kết quả của userscript A
      var res = await waitFor(function () {
        var t = document.getElementById('dmxpub-toast');
        if (!t || t.style.display === 'none') return null;
        var m = t.textContent || '';
        if (/đã đẩy github/i.test(m)) return { ok: true, msg: m };
        if (/✗|lỗi/i.test(m)) return { ok: false, msg: m };
        return null;
      }, 30000);

      GM_deleteValue(JOB);   // xong việc, xoá băng chuyền
      if (!res) { ui.log('⚠ Không rõ kết quả đẩy (không bắt được thông báo). Kiểm tra bằng /số hoặc latest.json.'); return; }
      if (res.ok) ui.log('✓ XONG: ' + res.msg);
      else throw new Error('Đẩy thất bại: ' + res.msg);
    }

    ui.btn('▶ Chạy: nạp file → tạo ảnh → Đẩy GitHub', '#16a34a', run);
    ui.btn('Bỏ việc đang chờ', '#475569', function () { GM_deleteValue(JOB); ui.log('Đã bỏ việc.'); });
    ui.log('Có file chờ nạp (từ ManagerDownload lúc ' + new Date(job.at).toLocaleTimeString() + ').');
    ui.log('Bấm nút xanh để chạy. (Sau này v0.2 sẽ tự chạy, không cần bấm.)');
  }

  /* ---------------- định tuyến ---------------- */
  if (location.hostname.indexOf('report.mwgroup.vn') !== -1) managerDownload();
  else if (location.hostname.indexOf('namkphong.github.io') !== -1) realtimenv();
})();
