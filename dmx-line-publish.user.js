// ==UserScript==
// @name         DMX — Đẩy ảnh Realtime lên GitHub / LINE (cụm 14285)
// @namespace    namkphong.github.io
// @version      1.0.1
// @description  Thêm nút "Đẩy GitHub" (miễn phí) và "+ LINE" (tốn quota, có xác nhận) vào realtimenv.html. Ảnh host tại namkphong.github.io/bc/, kèm latest.json làm manifest cho bot trả lời /số.
// @author       Phong
// @match        https://namkphong.github.io/realtimenv.html*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @connect      raw.githubusercontent.com
// @connect      api.line.me
// @updateURL    https://namkphong.github.io/dmx-line-publish.user.js
// @downloadURL  https://namkphong.github.io/dmx-line-publish.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VER = '1.0.1';

  /* ================================================================== */
  /* CẤU HÌNH                                                            */
  /* ================================================================== */
  // Repo host ảnh (GitHub Pages). Không chứa gì bí mật — token nằm trong kho VM.
  var GH_OWNER  = 'namkphong';
  var GH_REPO   = 'namkphong.github.io';
  var GH_BRANCH = 'main';
  var BC_DIR    = 'bc';                 // thư mục chứa ảnh + latest.json

  // Nhận diện siêu thị từ tên in trong báo cáo → mã ngắn + nhóm LINE.
  // groupId không phải bí mật; token LINE mới là bí mật (nằm trong kho VM).
  var STORES = [
    { key: '396', label: '396 Nguyễn Văn Cừ', match: ['nguyễn văn cừ', 'nguyen van cu', '396'],
      group: 'Cd6981bde07d3c222623f363b8f5739bf' },
    { key: '142', label: 'Ngọc Thụy',         match: ['ngọc thụy', 'ngoc thuy'],
      group: 'Cd16f4cb26203b273afd91895cc10b66f' }
  ];

  // Khoá lưu trong kho Violentmonkey (GM storage) — KHÔNG in ra mã nguồn.
  var K_GH_TOKEN   = 'gh_token';        // GitHub fine-grained PAT (Contents: R/W)
  var K_LINE_TOKEN = 'line_token';      // LINE channel access token

  /* ================================================================== */
  /* TIỆN ÍCH                                                            */
  /* ================================================================== */
  function b64utf8(s) { return btoa(unescape(encodeURIComponent(s))); }
  function nowISO()   { return new Date().toISOString(); }

  // Toast nổi ở đáy màn hình — beginner nhìn được phản hồi mà không cần console.
  function toast(msg, kind) {
    var t = document.getElementById('dmxpub-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'dmxpub-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483647;' +
        'max-width:92vw;padding:11px 16px;border-radius:10px;font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;' +
        'color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.4);white-space:pre-wrap;text-align:center';
      document.body.appendChild(t);
    }
    t.style.background = kind === 'err' ? '#dc2626' : (kind === 'ok' ? '#16a34a' : '#1d4ed8');
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.style.display = 'none'; }, kind === 'err' ? 8000 : 4500);
    try { console.log('[dmx-publish] ' + msg); } catch (e) {}
  }

  // Bọc GM_xmlhttpRequest thành Promise. Dùng GM để tránh CORS và không lộ token
  // ra context trang.
  function gmx(opt) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: opt.method || 'GET',
        url: opt.url,
        headers: opt.headers || {},
        data: opt.data,
        onload: function (r) { resolve(r); },
        onerror: function () { reject(new Error('Lỗi mạng khi gọi ' + opt.url)); },
        ontimeout: function () { reject(new Error('Quá thời gian chờ: ' + opt.url)); }
      });
    });
  }

  function ghHeaders(token, extra) {
    var h = {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  function getToken(key, promptLabel) {
    var v = GM_getValue(key, '');
    if (v) return v;
    v = (window.prompt(promptLabel) || '').trim();
    if (!v) throw new Error('Chưa nhập ' + promptLabel);
    GM_setValue(key, v);
    return v;
  }

  /* ================================================================== */
  /* NHẬN DIỆN SIÊU THỊ + ẢNH HIỆN TẠI                                   */
  /* ================================================================== */
  // Tên siêu thị được trang in vào <h2> "… SIÊU THỊ <tên>" trong #captureArea.
  function detectStore() {
    // Dùng textContent (không phải innerText): khu báo cáo có thể đang display:none
    // sau khi chụp ảnh, khi đó innerText trả về rỗng còn textContent vẫn đọc được.
    var area = document.getElementById('captureArea') || document.body;
    var txt = (area.textContent || '').toLowerCase();
    for (var i = 0; i < STORES.length; i++) {
      var s = STORES[i];
      for (var j = 0; j < s.match.length; j++) {
        if (txt.indexOf(s.match[j]) !== -1) return s;
      }
    }
    return null;
  }

  // Chuỗi base64 thuần của ảnh JPEG đang xem trong modal (bỏ tiền tố data:).
  function currentImageB64() {
    var img = document.getElementById('previewImage');
    var src = img && img.getAttribute('src');
    if (!src || src.indexOf('data:image') !== 0) return null;
    var comma = src.indexOf(',');
    return comma === -1 ? null : src.slice(comma + 1);
  }

  // Thu nhỏ ảnh để làm previewImageUrl cho LINE (bắt buộc < 1MB). Trả base64 JPEG.
  function makePreviewB64(fullB64) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var maxW = 1000;
        var scale = img.width > maxW ? maxW / img.width : 1;
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var d = c.toDataURL('image/jpeg', 0.7);
        resolve(d.slice(d.indexOf(',') + 1));
      };
      img.onerror = function () { resolve(fullB64); };
      img.src = 'data:image/jpeg;base64,' + fullB64;
    });
  }

  /* ================================================================== */
  /* GITHUB CONTENTS API                                                 */
  /* ================================================================== */
  function ghContentUrl(path) {
    return 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + path;
  }

  // Lấy sha của file (để cập nhật). null nếu file chưa tồn tại.
  // Thêm &_=Date.now() để URL luôn khác nhau → tránh trình duyệt trả 304 (nội
  // dung rỗng) từ cache, vốn khiến không đọc được sha → PUT thiếu sha → lỗi 422.
  async function ghGetSha(token, path) {
    var r = await gmx({
      url: ghContentUrl(path) + '?ref=' + GH_BRANCH + '&_=' + Date.now(),
      headers: ghHeaders(token, { 'Cache-Control': 'no-cache' })
    });
    if (r.status === 404) return null;
    if (r.status >= 400) throw new Error('GitHub GET ' + path + ' lỗi ' + r.status + ': ' + r.responseText.slice(0, 160));
    try { return JSON.parse(r.responseText).sha || null; } catch (e) { return null; }
  }

  // Tạo/ghi đè 1 file bằng nội dung base64. Nếu GitHub báo 422 (thường do sha
  // cũ/thiếu vì cache), lấy lại sha mới và thử ghi lần nữa.
  async function ghPut(token, path, base64, message) {
    async function attempt(sha) {
      var body = { message: message, content: base64, branch: GH_BRANCH };
      if (sha) body.sha = sha;
      return gmx({
        method: 'PUT', url: ghContentUrl(path),
        headers: ghHeaders(token, { 'Content-Type': 'application/json' }),
        data: JSON.stringify(body)
      });
    }
    var r = await attempt(await ghGetSha(token, path));
    if (r.status === 409 || r.status === 422) {         // sha lệch/thiếu → lấy lại rồi thử lại
      r = await attempt(await ghGetSha(token, path));
    }
    if (r.status >= 400) throw new Error('GitHub PUT ' + path + ' lỗi ' + r.status + ': ' + r.responseText.slice(0, 200));
    return JSON.parse(r.responseText);
  }

  // Đọc latest.json hiện có (để gộp, không ghi đè siêu thị kia).
  async function ghReadManifest(token) {
    var r = await gmx({
      url: ghContentUrl(BC_DIR + '/latest.json') + '?ref=' + GH_BRANCH + '&_=' + Date.now(),
      headers: ghHeaders(token, { 'Accept': 'application/vnd.github.raw+json', 'Cache-Control': 'no-cache' })
    });
    if (r.status === 404) return { updatedAt: null, stores: {} };
    if (r.status >= 400) return { updatedAt: null, stores: {} };
    try { var m = JSON.parse(r.responseText); if (!m.stores) m.stores = {}; return m; }
    catch (e) { return { updatedAt: null, stores: {} }; }
  }

  // Đẩy ảnh của 1 siêu thị lên bc/<key>.jpg và cập nhật manifest.
  async function pushToGitHub(store, imgB64) {
    var token = getToken(K_GH_TOKEN, 'Dán GitHub token (fine-grained, quyền Contents cho namkphong.github.io):');
    var file  = BC_DIR + '/' + store.key + '.jpg';
    toast('Đang đẩy ảnh ' + store.label + ' lên GitHub…');
    await ghPut(token, file, imgB64, 'bc: cập nhật ảnh ' + store.label + ' ' + nowISO());

    var manifest = await ghReadManifest(token);
    var pageUrl = 'https://' + GH_OWNER + '.github.io/' + file;
    manifest.stores[store.key] = {
      key: store.key, label: store.label, group: store.group,
      file: file, url: pageUrl, at: nowISO()
    };
    manifest.updatedAt = nowISO();
    await ghPut(token, BC_DIR + '/latest.json', b64utf8(JSON.stringify(manifest, null, 2)),
                'bc: cập nhật manifest ' + store.label);
    return pageUrl;
  }

  /* ================================================================== */
  /* LINE MESSAGING API                                                  */
  /* ================================================================== */
  // Ảnh LINE phải là URL công khai (không phải data:). Dùng raw.githubusercontent
  // vì cập nhật tức thì sau commit (GitHub Pages trễ build 10–60s).
  function rawUrl(file) {
    return 'https://raw.githubusercontent.com/' + GH_OWNER + '/' + GH_REPO + '/' + GH_BRANCH + '/' + file;
  }

  async function linePushImage(store, origFile, prevFile) {
    var token = getToken(K_LINE_TOKEN, 'Dán LINE channel access token (Messaging API):');
    var bust = '?t=' + Date.now();
    var body = {
      to: store.group,
      messages: [{
        type: 'image',
        originalContentUrl: rawUrl(origFile) + bust,
        previewImageUrl: rawUrl(prevFile) + bust
      }]
    };
    var r = await gmx({
      method: 'POST', url: 'https://api.line.me/v2/bot/message/push',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      data: JSON.stringify(body)
    });
    if (r.status >= 400) throw new Error('LINE push lỗi ' + r.status + ': ' + r.responseText.slice(0, 200));
  }

  /* ================================================================== */
  /* HÀNH ĐỘNG NÚT                                                       */
  /* ================================================================== */
  async function doGitHub() {
    var store = detectStore();
    if (!store) throw new Error('Không nhận ra siêu thị trong báo cáo (cần thấy tên 396 NVC hoặc Ngọc Thụy).');
    var b64 = currentImageB64();
    if (!b64) throw new Error('Chưa có ảnh — bấm "Báo Cáo Thẻ Chi Tiết" tạo ảnh trước.');
    var url = await pushToGitHub(store, b64);
    toast('✓ Đã đẩy GitHub: ' + store.label + '\n' + url + '\n(Pages trễ 10–60s mới đổi ảnh)', 'ok');
  }

  async function doLine() {
    var store = detectStore();
    if (!store) throw new Error('Không nhận ra siêu thị trong báo cáo.');
    var b64 = currentImageB64();
    if (!b64) throw new Error('Chưa có ảnh — tạo ảnh trước.');

    // Cảnh báo tốn quota: LINE tính theo SỐ NGƯỜI trong nhóm, không phải số lần gửi.
    if (!window.confirm('Gửi ảnh "' + store.label + '" vào nhóm LINE?\n\n' +
        '⚠ TỐN QUOTA: LINE tính theo số người trong nhóm.\n' +
        'Free 500 tin/tháng. Chỉ dùng cho lượt chốt, không gửi liên tục.\n\n' +
        'Bấm OK để gửi.')) {
      toast('Đã huỷ gửi LINE.');
      return;
    }

    // Bước 1: đảm bảo ảnh đã có trên GitHub (LINE cần URL công khai).
    toast('Đẩy ảnh lên GitHub trước khi gửi LINE…');
    await pushToGitHub(store, b64);
    // Bước 2: tạo bản preview < 1MB rồi đẩy thêm bc/<key>_preview.jpg.
    var prevB64 = await makePreviewB64(b64);
    var token = getToken(K_GH_TOKEN, 'Dán GitHub token:');
    await ghPut(token, BC_DIR + '/' + store.key + '_preview.jpg', prevB64,
                'bc: preview ' + store.label + ' cho LINE');
    // Bước 3: push vào nhóm.
    toast('Đang gửi vào nhóm LINE…');
    await linePushImage(store, BC_DIR + '/' + store.key + '.jpg', BC_DIR + '/' + store.key + '_preview.jpg');
    toast('✓ Đã gửi ảnh vào nhóm ' + store.label, 'ok');
  }

  function openSettings() {
    var pick = window.prompt(
      'Đổi token nào?\n' +
      '  1 = GitHub token\n' +
      '  2 = LINE token\n' +
      '  x = Xoá cả hai (đăng xuất)\n\n' +
      'Nhập 1, 2 hoặc x:', '1');
    if (pick == null) return;
    pick = pick.trim().toLowerCase();
    if (pick === 'x') {
      GM_deleteValue(K_GH_TOKEN); GM_deleteValue(K_LINE_TOKEN);
      toast('Đã xoá token đã lưu.', 'ok'); return;
    }
    if (pick === '1') {
      var g = (window.prompt('Dán GitHub token mới:') || '').trim();
      if (g) { GM_setValue(K_GH_TOKEN, g); toast('Đã lưu GitHub token.', 'ok'); }
    } else if (pick === '2') {
      var l = (window.prompt('Dán LINE token mới:') || '').trim();
      if (l) { GM_setValue(K_LINE_TOKEN, l); toast('Đã lưu LINE token.', 'ok'); }
    }
  }

  function bind(btn, fn) {
    btn.addEventListener('click', function () {
      btn.disabled = true;
      Promise.resolve().then(fn)
        .catch(function (e) { toast('✗ ' + (e.message || e), 'err'); })
        .then(function () { btn.disabled = false; });
    });
  }

  /* ================================================================== */
  /* GẮN NÚT VÀO MODAL (cạnh nút "Tải Ảnh Xuống")                        */
  /* ================================================================== */
  function mkBtn(label, bg) {
    var b = document.createElement('button');
    b.textContent = label;
    b.className = 'px-4 py-2 rounded-md text-white font-bold shadow transition';
    b.style.cssText = 'background:' + bg + ';border:0;cursor:pointer';
    return b;
  }

  function injectButtons() {
    var dl = document.getElementById('downloadBtn');
    if (!dl || document.getElementById('dmxpub-bar')) return;
    var footer = dl.parentNode;              // hàng nút cuối modal (flex justify-end)

    var wrap = document.createElement('span');
    wrap.id = 'dmxpub-bar';
    wrap.style.cssText = 'display:inline-flex;gap:8px;align-items:center';

    var bGit  = mkBtn('⬆ Đẩy GitHub', '#0f766e');
    var bLine = mkBtn('+ LINE',       '#f59e0b');
    var bCfg  = mkBtn('⚙',            '#475569');
    bCfg.title = 'Đổi / xoá token';

    bind(bGit,  doGitHub);
    bind(bLine, doLine);
    bCfg.addEventListener('click', openSettings);

    wrap.appendChild(bGit); wrap.appendChild(bLine); wrap.appendChild(bCfg);
    footer.insertBefore(wrap, dl);           // đặt trước nút Tải Ảnh Xuống
  }

  // Modal được tạo sẵn trong HTML nhưng nút chỉ có ý nghĩa khi modal mở; gắn sớm,
  // và theo dõi phòng trường hợp trang dựng lại footer.
  var iv = setInterval(injectButtons, 600);
  injectButtons();
  toast('DMX Publish v' + VER + ' sẵn sàng · tạo ảnh rồi bấm "Đẩy GitHub".');
  // Dọn interval sau 60s cho nhẹ (nút đã gắn thì thôi).
  setTimeout(function () { clearInterval(iv); }, 60000);
})();
