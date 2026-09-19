// ==UserScript==
// @name         DMX — Tự đẩy Thẻ Mục Tiêu /bc lên GitHub (cụm 14285)
// @namespace    namkphong.github.io
// @version      1.1.0
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

/* =====================================================================
 * FILE SINH TỰ ĐỘNG — ĐỪNG SỬA TAY. Nguồn: userscript-src/dmx-themuctieu-publish.js,
 * đóng gói bằng: node tools/dong-goi-userscript.js
 *
 * VỎ TỰ CẬP NHẬT. Mỗi lần trang mở: đọc userscript-ban.json trên
 * namkphong.github.io; nếu có lõi MỚI HƠN bản mang sẵn (1.1.0) thì tải
 * dmx-themuctieu-publish.core.js, kiểm mã băm, dịch thử rồi chạy — bản vá tới máy ngay lần
 * tải trang kế tiếp, không ai phải bấm "Cập nhật". Mọi đường hỏng (mất mạng,
 * trình duyệt chặn eval, lõi cụt/không dịch được) đều quay về BẢN DỰ PHÒNG
 * mang sẵn bên dưới — xấu nhất vẫn chạy y như trước khi có vỏ.
 * Tra nhanh đang chạy bản nào: window.__DMX_VO trong Console.
 * ===================================================================== */
(function () {
  var TEN = 'dmx-themuctieu-publish', BAN_GOI = '1.1.0', CO_THU_VIEN = false;
  var GOC = 'https://namkphong.github.io/';
  var W0 = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  var THAM_SO = ['GM_info', 'GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_xmlhttpRequest', 'unsafeWindow'];

  function giaTri(ver, nguon) {
    var that = null;
    try { that = (typeof GM_info !== 'undefined') ? GM_info : null; } catch (e) {}
    var info = { script: { name: TEN, version: ver }, scriptHandler: that && that.scriptHandler, nguon: nguon };
    return [info,
      (typeof GM_getValue !== 'undefined') ? GM_getValue : undefined,
      (typeof GM_setValue !== 'undefined') ? GM_setValue : undefined,
      (typeof GM_deleteValue !== 'undefined') ? GM_deleteValue : undefined,
      (typeof GM_xmlhttpRequest !== 'undefined') ? GM_xmlhttpRequest : undefined,
      W0];
  }
  function ghiDau(ver, nguon, loi) {
    try { (W0.__DMX_VO = W0.__DMX_VO || {})[TEN] = { ver: ver, nguon: nguon, loi: loi || '', luc: new Date().toLocaleTimeString() }; } catch (e) {}
    if (loi) { try { console.warn('[' + TEN + '] ' + loi); } catch (e) {} }
  }
  function bam(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function soSanh(a, b) {
    var x = String(a).split('.'), y = String(b).split('.');
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0);
      if (d) return d;
    }
    return 0;
  }
  function doc(k) {
    try { if (typeof GM_getValue !== 'undefined') return GM_getValue(k, null); } catch (e) {}
    try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; }
  }
  function ghi(k, v) {
    try { if (typeof GM_setValue !== 'undefined') { GM_setValue(k, v); return; } } catch (e) {}
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function tai(url, ms) {
    return Promise.race([
      fetch(url, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }),
      new Promise(function (_, hong) { setTimeout(function () { hong(new Error('quá ' + ms + ' ms')); }, ms); })
    ]);
  }
  function chayDongGoi(lyDo) {
    ghiDau(BAN_GOI, 'mang sẵn', lyDo);
    __DMX_LOI_DONG_GOI__.apply(null, giaTri(BAN_GOI, 'mang sẵn'));
  }
  // Lấy mã từ bộ nhớ nếu đúng mã băm, không thì tải rồi cất.
  async function layMa(khoa, url, bamCan, ms) {
    var nho = doc(khoa);
    if (nho && nho.bam === bamCan && nho.ma && bam(nho.ma) === bamCan) return nho.ma;
    var ma = await tai(url, ms);
    if (bam(ma) !== bamCan) throw new Error('mã băm không khớp (tải cụt hoặc bản trên mạng vừa đổi)');
    ghi(khoa, { bam: bamCan, ma: ma });
    return ma;
  }

  async function batDau() {
    var ban;
    try { ban = JSON.parse(await tai(GOC + 'userscript-ban.json?p=' + Math.floor(Date.now() / 60000), 4000)); }
    catch (e) { return chayDongGoi('không đọc được bảng phiên bản: ' + e.message); }
    var moi = ban && ban[TEN];
    if (!moi || soSanh(moi.ver, BAN_GOI) <= 0) return chayDongGoi('');

    var ma, f;
    try { ma = await layMa('dmx_vo_loi_' + TEN, GOC + TEN + '.core.js?b=' + moi.bam, moi.bam, 8000); }
    catch (e) { return chayDongGoi('không tải được lõi ' + moi.ver + ': ' + e.message); }
    try { f = new Function(THAM_SO.join(','), ma); }
    catch (e) { return chayDongGoi('lõi ' + moi.ver + ' không chạy được ở đây (' + e.name + ': ' + e.message + ')'); }

    // Thư viện dùng chung cũng lấy bản mới (bản @require chỉ đổi khi script đổi).
    var tv = ban['dmx-cluster-shared'];
    if (CO_THU_VIEN && tv && tv.bam) {
      try {
        var maTv = await layMa('dmx_vo_thuvien', GOC + 'dmx-cluster-shared.js?b=' + tv.bam, tv.bam, 6000);
        new Function('unsafeWindow', maTv)(W0);
      } catch (e) { ghiDau(moi.ver, 'mạng', 'giữ thư viện cũ: ' + e.message); }
    }

    ghiDau(moi.ver, 'mạng', '');
    // Lõi đã dịch được thì KHÔNG quay về bản mang sẵn khi nó lỗi lúc chạy: có
    // thể nó đã dựng xong một nửa (panel, hẹn giờ), chạy thêm bản thứ hai là
    // hai chuỗi tự động giẫm lên nhau. Ghi lỗi để tra.
    try { f.apply(null, giaTri(moi.ver, 'mạng')); }
    catch (e) { ghiDau(moi.ver, 'mạng', 'lõi lỗi khi chạy: ' + (e && e.message)); try { console.error(e); } catch (e2) {} }
  }
  batDau();

  function __DMX_LOI_DONG_GOI__(GM_info, GM_getValue, GM_setValue, GM_deleteValue, GM_xmlhttpRequest, unsafeWindow) {
    (function () {
      'use strict';
      // Số bản đang CHẠY — vỏ tự cập nhật truyền vào qua GM_info (có thể là lõi mới
      // hơn bản cài). Đóng cứng thì nhãn nói dối, xem userscript-nhan-so-ban-noi-doi.
      var VER = (function () {
        try { return (GM_info && GM_info.script && GM_info.script.version) || '1.1.0'; }
        catch (e) { return '1.1.0'; }
      })();

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
  }
})();
