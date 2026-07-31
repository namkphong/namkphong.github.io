// ==UserScript==
// @name         DMX — Tự đẩy Thẻ Mục Tiêu /bc lên GitHub (cụm 14285)
// @namespace    namkphong.github.io
// @version      1.0.0
// @description  Trên themuctieu.html: tự dựng thẻ mục tiêu + đẩy ảnh bc/mt/ và bc/cards.json lên GitHub cho lệnh /bc. Có nút bấm tay và chế độ TỰ ĐỘNG (mở themuctieu.html?auto=1) để hẹn giờ. Token GitHub cất trong kho Violentmonkey, KHÔNG nằm trong trang.
// @author       Phong
// @match        https://namkphong.github.io/themuctieu.html*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @updateURL    https://namkphong.github.io/dmx-themuctieu-publish.user.js
// @downloadURL  https://namkphong.github.io/dmx-themuctieu-publish.user.js
// ==/UserScript==

(function () {
  'use strict';
  var VER = '1.0.0';

  /* ================== CẤU HÌNH ================== */
  var GH_OWNER = 'namkphong', GH_REPO = 'namkphong.github.io', GH_BRANCH = 'main';
  var BC_DIR = 'bc/mt';                 // nơi chứa ảnh thẻ mục tiêu
  var K_GH_TOKEN = 'gh_token';          // fine-grained PAT (Contents R/W), trong kho Violentmonkey
  var READY_TIMEOUT = 20000;            // chờ trang dựng ảnh xong (ms)

  /* ================== TIỆN ÍCH ================== */
  function b64utf8(s) { return btoa(unescape(encodeURIComponent(s))); }
  function nowISO() { return new Date().toISOString(); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function toast(msg, kind) {
    var t = document.getElementById('tmtpub-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'tmtpub-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483647;' +
        'max-width:92vw;padding:11px 16px;border-radius:10px;font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;' +
        'color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.4);white-space:pre-wrap;text-align:center';
      document.body.appendChild(t);
    }
    t.style.background = kind === 'err' ? '#dc2626' : (kind === 'ok' ? '#16a34a' : '#1d4ed8');
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.style.display = 'none'; }, kind === 'err' ? 9000 : 4500);
    try { console.log('[tmt-publish] ' + msg); } catch (e) {}
  }

  function gmx(opt) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: opt.method || 'GET', url: opt.url, headers: opt.headers || {}, data: opt.data,
        onload: resolve,
        onerror: function () { reject(new Error('Lỗi mạng: ' + opt.url)); },
        ontimeout: function () { reject(new Error('Quá thời gian chờ: ' + opt.url)); }
      });
    });
  }

  function getToken(auto) {
    var v = GM_getValue(K_GH_TOKEN, '');
    if (v) return v;
    if (auto) throw new Error('Chưa lưu GitHub token — bấm ⚙ để nhập trước khi hẹn giờ.');
    v = (window.prompt('Dán GitHub token (fine-grained, quyền Contents R/W cho namkphong.github.io):') || '').trim();
    if (!v) throw new Error('Chưa nhập token');
    GM_setValue(K_GH_TOKEN, v);
    return v;
  }

  /* ================== GITHUB CONTENTS API ================== */
  function ghHeaders(token, extra) {
    var h = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function ghContentUrl(path) { return 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + path; }
  function rawUrl(path) { return 'https://raw.githubusercontent.com/' + GH_OWNER + '/' + GH_REPO + '/' + GH_BRANCH + '/' + path; }

  async function ghGetSha(token, path) {
    var r = await gmx({ url: ghContentUrl(path) + '?ref=' + GH_BRANCH + '&_=' + Date.now(),
                        headers: ghHeaders(token, { 'Cache-Control': 'no-cache' }) });
    if (r.status === 404) return null;
    if (r.status >= 400) throw new Error('GET ' + path + ' lỗi ' + r.status + ': ' + r.responseText.slice(0, 160));
    try { return JSON.parse(r.responseText).sha || null; } catch (e) { return null; }
  }
  async function ghPut(token, path, base64, message) {
    async function attempt(sha) {
      var body = { message: message, content: base64, branch: GH_BRANCH };
      if (sha) body.sha = sha;
      return gmx({ method: 'PUT', url: ghContentUrl(path), headers: ghHeaders(token, { 'Content-Type': 'application/json' }), data: JSON.stringify(body) });
    }
    var r = await attempt(await ghGetSha(token, path));
    if (r.status === 409 || r.status === 422) r = await attempt(await ghGetSha(token, path));
    if (r.status >= 400) throw new Error('PUT ' + path + ' lỗi ' + r.status + ': ' + r.responseText.slice(0, 200));
    return JSON.parse(r.responseText);
  }
  function dataUrlB64(d) { return d.slice(d.indexOf(',') + 1); }

  /* ================== ĐỌC ẢNH TỪ TRANG (window.TMT) ================== */
  var W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

  async function getStoresReady() {
    if (!W.TMT || typeof W.TMT.getStores !== 'function')
      throw new Error('Không thấy công cụ trang. Mở đúng https://namkphong.github.io/themuctieu.html');
    // Dựng lại thẻ cho chắc mới, rồi chờ trang báo sẵn sàng.
    try { W.TMT.rebuild(); } catch (e) {}
    var t0 = Date.now();
    while (!W.TMT.ready && Date.now() - t0 < READY_TIMEOUT) await sleep(300);
    var stores = W.TMT.getStores();
    if (!stores || !stores.length)
      throw new Error('Chưa có dữ liệu để dựng thẻ. Hãy đăng nhập ở Trang chủ (kéo số từ Supabase) hoặc cập nhật số ở nv.html trước.');
    return stores;
  }

  /* ================== HÀNH ĐỘNG ĐẨY /bc ================== */
  async function publish(auto) {
    var token = getToken(auto);
    toast('Đang dựng thẻ & chuẩn bị đẩy…');
    var stores = await getStoresReady();
    var total = stores.reduce(function (a, s) { return a + s.pngs.length; }, 0), done = 0;
    var manifest = { updatedAt: nowISO(), type: 'the-muc-tieu', stores: {} };

    for (var i = 0; i < stores.length; i++) {
      var s = stores[i], arr = [];
      for (var j = 0; j < s.pngs.length; j++) {
        var path = BC_DIR + '/' + s.key + '_' + (j + 1) + '.png';
        toast('Đẩy ' + s.label + ' — ảnh ' + (j + 1) + '/' + s.pngs.length + ' (' + (++done) + '/' + total + ')…');
        await ghPut(token, path, dataUrlB64(s.pngs[j]), 'bc/mt: ' + s.label + ' thẻ mục tiêu ' + (j + 1));
        arr.push({ url: rawUrl(path) });
      }
      manifest.stores[s.key] = { key: s.key, label: s.label, group: s.group, date: s.date, images: arr, at: nowISO() };
    }
    toast('Cập nhật bc/cards.json…');
    await ghPut(token, 'bc/cards.json', b64utf8(JSON.stringify(manifest, null, 2)),
                'bc: cập nhật cards.json (thẻ mục tiêu ' + (stores[0] && stores[0].date || '') + ')');
    toast('✓ Đã đẩy /bc xong (' + total + ' ảnh). Trong nhóm LINE gõ /bc để xem.', 'ok');
  }

  function settings() {
    var cur = GM_getValue(K_GH_TOKEN, '');
    var pick = window.prompt('Token GitHub cho /bc:\n  1 = Nhập / đổi token\n  x = Xoá token\n\n' +
      (cur ? '(đang có token đã lưu)' : '(chưa lưu token)'), '1');
    if (pick == null) return; pick = pick.trim().toLowerCase();
    if (pick === 'x') { GM_deleteValue(K_GH_TOKEN); toast('Đã xoá token.', 'ok'); return; }
    if (pick === '1') { var t = (window.prompt('Dán GitHub token mới:') || '').trim(); if (t) { GM_setValue(K_GH_TOKEN, t); toast('Đã lưu token.', 'ok'); } }
  }

  /* ================== GẮN NÚT + CHẾ ĐỘ TỰ ĐỘNG ================== */
  function mkBtn(label, bg) {
    var b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'border:0;border-radius:9px;padding:9px 13px;font:700 13px/1 -apple-system,Segoe UI,Roboto,sans-serif;color:#fff;cursor:pointer;background:' + bg;
    return b;
  }
  function runGuarded(btn, fn) {
    if (btn) btn.disabled = true;
    Promise.resolve().then(fn)
      .catch(function (e) { toast('✗ ' + (e.message || e), 'err'); })
      .then(function () { if (btn) btn.disabled = false; });
  }

  function injectBar() {
    if (document.getElementById('tmtpub-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'tmtpub-bar';
    bar.style.cssText = 'position:fixed;right:12px;bottom:14px;z-index:2147483646;display:flex;gap:8px;align-items:center';
    var bPub = mkBtn('⬆ Tự đẩy /bc (GitHub)', '#0f766e');
    var bCfg = mkBtn('⚙', '#475569'); bCfg.title = 'Đổi / xoá token GitHub';
    bPub.addEventListener('click', function () { runGuarded(bPub, function () { return publish(false); }); });
    bCfg.addEventListener('click', settings);
    bar.appendChild(bPub); bar.appendChild(bCfg);
    document.body.appendChild(bar);
  }

  injectBar();
  toast('DMX Thẻ Mục Tiêu Publish v' + VER + ' sẵn sàng.');

  // Chế độ TỰ ĐỘNG: mở themuctieu.html?auto=1 (hoặc #auto) -> tự đẩy không cần bấm.
  // Dùng cho scheduled task / hẹn giờ. Cần đã lưu token bằng nút ⚙ ít nhất 1 lần.
  if (/[?&#]auto\b/.test(location.href)) {
    setTimeout(function () { runGuarded(null, function () { return publish(true); }); }, 1500);
  }
})();
