// ==UserScript==
// @name         DMX — Giờ công cụm 14285 (baocao.dienmayxanh.com → Supabase)
// @namespace    namkphong.github.io
// @version      1.0.0
// @description  Xuất báo cáo "Giờ công làm việc" cho cụm 14285 (396 Nguyễn Văn Cừ + Ngọc Thụy), tải file, đẩy lên Supabase để dashboard.html tự đọc — khỏi phải tải tay mỗi ngày.
// @match        https://baocao.dienmayxanh.com/dashboard/timekeeping*
// @grant        none
// @updateURL    https://namkphong.github.io/dmx-gio-cong.user.js
// @downloadURL  https://namkphong.github.io/dmx-gio-cong.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VER = '1.0.0';
  var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  var SB_KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
  var BUCKET = 'bc';
  // Mã 2 siêu thị cụm 14285 — CỐ ĐỊNH (khác loại id đổi theo tháng bên BI), khớp
  // STORES[].code đã dùng sẵn trong dmx-realtime-auto.user.js.
  var STOREIDS = '14285,8807';

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function ymd(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

  function authHeader() {
    var t = localStorage.getItem('access_token');
    if (!t) throw new Error('Chưa đăng nhập trang này (không thấy access_token) — mở lại trang, đăng nhập rồi thử lại.');
    return 'Bearer ' + t;
  }

  // Gọi API của CHÍNH trang này (cùng gốc baocao.dienmayxanh.com) — dùng fetch()
  // thường, không cần GM_xmlhttpRequest/@connect vì cùng origin.
  function apiJson(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ Authorization: authHeader() }, opts.headers || {});
    return fetch(path, Object.assign({ credentials: 'include' }, opts, { headers: headers }))
      .then(function (r) {
        return r.text().then(function (t) {
          if (!r.ok) throw new Error('API ' + path + ' lỗi HTTP ' + r.status + ': ' + t.slice(0, 200));
          try { return JSON.parse(t); } catch (e) { throw new Error('API ' + path + ' trả về không phải JSON: ' + t.slice(0, 200)); }
        });
      });
  }

  // Tải nhị phân + đẩy lên Supabase — đã THỬ TRỰC TIẾP (không phải đoán): fetch()
  // thường gọi thẳng được cả cdnv2.tgdd.vn (link tải S3 tạm) lẫn Supabase Storage,
  // không bị chặn CORS — khỏi cần GM_xmlhttpRequest/@connect/sandbox.
  async function fetchBinary(url) {
    var r = await fetch(url);
    if (!r.ok) throw new Error('Tải file lỗi HTTP ' + r.status);
    var buf = await r.arrayBuffer();
    if (!buf || !buf.byteLength) throw new Error('File rỗng.');
    return buf;
  }

  async function uploadToSupabase(path, arrayBuffer, contentType) {
    var r = await fetch(SB_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'x-upsert': 'true', 'Content-Type': contentType },
      body: arrayBuffer
    });
    if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + (await r.text()).slice(0, 160));
  }

  // ---------------- panel nổi (mượn phong cách các script DMX khác) ----------------
  function makePanel(title) {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:10px;z-index:2147483647;background:#0b1220;color:#e6f6ff;border:1px solid #2dd4ff;border-radius:12px;padding:12px;font:13px/1.45 sans-serif;max-height:80vh;overflow:auto;max-width:420px;margin:0 auto';
    var bubble = document.createElement('div');
    bubble.textContent = 'GC';
    bubble.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;display:none;width:52px;height:52px;border-radius:50%;background:#0b1220;border:2px solid #2dd4ff;color:#2dd4ff;align-items:center;justify-content:center;font:700 13px monospace;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.5)';
    bubble.onclick = function () { box.style.display = 'block'; bubble.style.display = 'none'; };
    var x = document.createElement('span'); x.textContent = '✕'; x.title = 'Ẩn';
    x.style.cssText = 'float:right;cursor:pointer;color:#8fb6cc;font-size:18px;line-height:1;padding:0 2px;margin-left:8px';
    x.onclick = function () { box.style.display = 'none'; bubble.style.display = 'flex'; };
    box.appendChild(x);
    var h = document.createElement('b'); h.style.color = '#2dd4ff'; h.textContent = title + ' · v' + VER; box.appendChild(h);
    var log = document.createElement('div');
    log.style.cssText = 'background:#000;color:#3bf07a;font:11px/1.5 monospace;padding:8px;border-radius:6px;margin-top:8px;height:170px;overflow:auto;white-space:pre-wrap;word-break:break-word';
    document.body.appendChild(box); document.body.appendChild(bubble);
    var api = {
      log: function (m) { log.textContent += m + '\n'; log.scrollTop = log.scrollHeight; try { console.log('[dmx-gio-cong] ' + m); } catch (e) {} },
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

  // ---------------- luồng chính ----------------
  async function run(ui) {
    var today = new Date();
    var from = new Date(today.getFullYear(), today.getMonth(), 1); // đầu tháng hiện tại
    var fromYmd = ymd(from), toYmd = ymd(today);
    ui.log('Tạo job xuất (' + fromYmd + ' → ' + toYmd + ', cụm 14285)…');
    var created = await apiJson('/kb-api/reports/export/timekeeping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ FROMDATE: fromYmd, TODATE: toYmd, STOREIDS: STOREIDS })
    });
    var jobId = created && created.job_id;
    if (!jobId) throw new Error('Không lấy được job_id từ API export.');
    ui.log('✓ Job: ' + jobId + ' — chờ xử lý…');

    var job = null;
    for (var i = 0; i < 40; i++) { // tối đa ~2 phút
      await sleep(3000);
      job = await apiJson('/kb-api/reports/export/status/' + jobId);
      ui.log('  … ' + (job.state || '?') + (job.percent != null ? ' (' + job.percent + '%)' : ''));
      if (job.state === 'done') break;
      if (job.state === 'error' || job.state === 'failed') throw new Error('Job lỗi: ' + (job.message || job.state));
    }
    if (!job || job.state !== 'done') throw new Error('Chờ quá lâu, job chưa xong.');
    ui.log('✓ Xong: ' + job.result_rows + ' dòng (' + job.filename + ').');

    ui.log('Lấy link tải…');
    var dl = await apiJson('/kb-api/reports/export/download/' + jobId);
    if (!dl || !dl.downloadUrl) throw new Error('Không lấy được downloadUrl.');

    ui.log('Tải file (link chỉ sống ~120s)…');
    var buf = await fetchBinary(dl.downloadUrl);
    ui.log('✓ ' + Math.round(buf.byteLength / 1024) + ' KB.');

    ui.log('Đẩy lên Supabase (bc/gio_cong.xlsx)…');
    await uploadToSupabase('gio_cong.xlsx', buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    ui.log('✓ Đã đẩy. dashboard.html sẽ tự đọc file này ở lần mở trang kế tiếp.');
  }

  function boot() {
    var ui = makePanel('DMX · Giờ công cụm 14285');
    ui.attach();
    ui.btn('▶ Lấy giờ công cụm 14285 (đầu tháng → hôm nay)', '#16a34a', function () { return run(ui); });
    ui.log('Sẵn sàng. Bấm nút để lấy giờ công cả 2 siêu thị, đẩy lên Supabase cho dashboard.html tự đọc.');
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
