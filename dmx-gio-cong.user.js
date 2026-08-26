// ==UserScript==
// @name         DMX — Giờ công (đa cụm, baocao.dienmayxanh.com → Supabase)
// @namespace    namkphong.github.io
// @version      1.5.0
// @description  Xuất báo cáo "Giờ công làm việc" cho cụm của bạn, tải file, đẩy lên Supabase để dashboard.html tự đọc — khỏi phải tải tay mỗi ngày.
// @match        https://baocao.dienmayxanh.com/dashboard/timekeeping*
// @grant        none
// @require      https://namkphong.github.io/dmx-cluster-shared.js
// @updateURL    https://namkphong.github.io/dmx-gio-cong.user.js
// @downloadURL  https://namkphong.github.io/dmx-gio-cong.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VER = '1.5.0';
  var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  var SB_KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
  var BUCKET = 'bc';

  // Mã MWG cố định (KHÔNG đổi theo tháng, khác loại id bên BI) của từng siêu
  // thị trong cụm — giờ lấy từ cấu hình cụm chung (dmx_clusters, tra theo
  // site_code) thay vì đóng cứng "14285,8807" của 1 cụm cố định. Chạy trên 1
  // origin duy nhất (baocao.dienmayxanh.com) nên chỉ cần hỏi site_code 1 lần.
  //
  // File đẩy lên đặt tên theo site_code ("gio_cong_<site>.xlsx") để nhiều cụm
  // cùng dùng không ghi đè lẫn nhau — dashboard.html đọc theo đúng quy ước này
  // (có dự phòng đường dẫn cũ "gio_cong.xlsx" cho dữ liệu đẩy trước khi đổi).
  async function getStoreIds() {
    var site = DMXCluster.getSiteCode();
    if (!site) {
      site = await DMXCluster.askSiteCode();
      if (!site) throw new Error('Chưa có mã cụm.');
      DMXCluster.setSiteCode(site);
    }
    var config = await DMXCluster.fetchConfig(site);
    if (!config || !config.stores || !config.stores.length) {
      throw new Error('Cụm "' + site + '" chưa có cấu hình siêu thị — chạy dmx.user.js (cào số) 1 lần trước để tạo cấu hình.');
    }
    var thieu = config.stores.filter(function (s) { return !s.mwgCode; });
    if (thieu.length) {
      throw new Error('Chưa có mã MWG cho: ' + thieu.map(function (s) { return s.name; }).join(', ') + ' — bấm "🔍 Tự dò mã MWG" trước.');
    }
    return config.stores.map(function (s) { return s.mwgCode; }).join(',');
  }

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

  // ---------------- tự dò mã MWG (thử nghiệm) ----------------
  // Trang này có 3 bộ lọc tầng (Vùng -> Khu vực -> Siêu thị); chọn "Chọn tất
  // cả" ở Vùng + Khu vực thì Siêu thị hiện ra 1 danh sách khá RỘNG (cả
  // callcenter/văn phòng không liên quan, không chỉ đúng cụm của mình) —
  // không sao vì bước match dưới đây chỉ nhận đúng tên đã có sẵn trong cấu
  // hình cụm. Mỗi dòng có dạng "14285 - ĐML_HNO_LBI - 396 Nguyễn Văn Cừ" — số
  // đầu chính là mã MWG cần tìm. Đã test trực tiếp bằng code (không chỉ suy
  // đoán) qua Browser pane: toàn bộ luồng bấm Vùng/Khu vực/Siêu thị + "Chọn
  // tất cả" + đọc & khớp tên đều chạy đúng.
  function sleepMs(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  // CHỈ dò <button> — dò thêm div/span sẽ trúng thẻ div bọc ngoài (chứa cả
  // label lẫn nút con), .click() vào đó không có tác dụng gì (đã xác nhận
  // trực tiếp trên trang thật: div "VùngChọn" bọc ngoài không mở dropdown,
  // trong khi <button> bên trong mới là phần tử thật sự bắt click).
  function findClickable(label) {
    var els = [].slice.call(document.querySelectorAll('button'));
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (t.indexOf(label) === 0 && t.length < label.length + 20) return els[i];
    }
    return null;
  }
  function findButtonByText(text) {
    var els = [].slice.call(document.querySelectorAll('button'));
    for (var i = 0; i < els.length; i++) {
      if ((els[i].textContent || '').indexOf(text) !== -1) return els[i];
    }
    return null;
  }

  async function detectMwgCodes(ui) {
    var site = DMXCluster.getSiteCode();
    if (!site) throw new Error('Chưa có mã cụm.');
    var config = await DMXCluster.fetchConfig(site);
    if (!config || !config.stores || !config.stores.length) throw new Error('Chưa có cấu hình siêu thị — chạy dmx.user.js trước.');

    ui.log('Bấm bộ lọc "Vùng"…');
    var vungBtn = findClickable('Vùng');
    if (!vungBtn) throw new Error('Không thấy bộ lọc "Vùng" trên trang — vào lại /dashboard/timekeeping rồi thử lại.');
    vungBtn.click();
    await sleepMs(500);
    var chonTatCa1 = findButtonByText('Chọn tất cả');
    if (!chonTatCa1) throw new Error('Không thấy nút "Chọn tất cả" (Vùng).');
    chonTatCa1.click();
    ui.log('✓ Đã chọn tất cả Vùng.');
    await sleepMs(800);

    ui.log('Bấm bộ lọc "Khu vực"…');
    var khuVucBtn = findClickable('Khu vực');
    if (khuVucBtn) {
      khuVucBtn.click();
      await sleepMs(500);
      var chonTatCa2 = findButtonByText('Chọn tất cả');
      if (chonTatCa2) { chonTatCa2.click(); ui.log('✓ Đã chọn tất cả Khu vực.'); await sleepMs(800); }
      else ui.log('⚠ Không thấy "Chọn tất cả" (Khu vực) — bỏ qua, thử đọc Siêu thị luôn.');
    } else ui.log('⚠ Không thấy bộ lọc "Khu vực" (có thể đã tự chọn sẵn) — thử đọc Siêu thị luôn.');

    ui.log('Mở bộ lọc "Siêu thị"…');
    var sieuThiBtn = findClickable('Siêu thị');
    if (!sieuThiBtn) throw new Error('Không thấy bộ lọc "Siêu thị".');
    sieuThiBtn.click();
    await sleepMs(600);

    var items = [].slice.call(document.querySelectorAll('label, div, span')).map(function (el) {
      return (el.textContent || '').replace(/\s+/g, ' ').trim();
    }).filter(function (t) { return /^\d{3,6}\s*-/.test(t) && t.length < 80; });
    // Khử trùng lặp (nhiều thẻ lồng nhau có thể cùng chứa 1 dòng text)
    items = items.filter(function (t, i) { return items.indexOf(t) === i; });
    ui.log('Đọc được ' + items.length + ' dòng "mã - tên": ' + (items.join(' | ') || '(rỗng)'));
    if (!items.length) throw new Error('Không đọc được danh sách siêu thị — cấu trúc trang có thể khác dự kiến.');

    var found = 0;
    items.forEach(function (t) {
      var m = /^(\d{3,6})\s*-\s*(.+)$/.exec(t);
      if (!m) return;
      var code = m[1], rest = m[2];
      var store = DMXCluster.matchStoreByText(config.stores, rest);
      if (store && !store.mwgCode) { store.mwgCode = code; found++; }
    });
    if (!found) { ui.log('⚠ Không khớp được siêu thị nào trong cấu hình với danh sách vừa đọc.'); return; }
    await DMXCluster.saveConfig(site, config);
    ui.log('✓ Đã điền mã MWG cho ' + found + ' siêu thị và lưu lên Supabase.');
  }

  // ---------------- luồng chính ----------------
  async function run(ui) {
    var storeIds = await getStoreIds();
    var today = new Date();
    var from = new Date(today.getFullYear(), today.getMonth(), 1); // đầu tháng hiện tại
    var fromYmd = ymd(from), toYmd = ymd(today);
    ui.log('Tạo job xuất (' + fromYmd + ' → ' + toYmd + ', mã ' + storeIds + ')…');
    var created = await apiJson('/kb-api/reports/export/timekeeping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ FROMDATE: fromYmd, TODATE: toYmd, STOREIDS: storeIds })
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

    var fileName = 'gio_cong_' + DMXCluster.getSiteCode() + '.xlsx';
    ui.log('Đẩy lên Supabase (bc/' + fileName + ')…');
    await uploadToSupabase(fileName, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    ui.log('✓ Đã đẩy. dashboard.html sẽ tự đọc file này ở lần mở trang kế tiếp.');
  }

  function boot() {
    var ui = makePanel('DMX · Giờ công');
    ui.attach();
    ui.btn('▶ Lấy giờ công cụm của bạn (đầu tháng → hôm nay)', '#16a34a', function () { return run(ui); });
    ui.btn('🔍 Tự dò mã MWG (thử nghiệm, làm 1 lần)', '#7c3aed', function () { return detectMwgCodes(ui); });
    ui.log('Sẵn sàng. Nếu lần đầu dùng, bấm "🔍 Tự dò mã MWG" trước 1 lần, sau đó bấm nút xanh để lấy giờ công.');
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
