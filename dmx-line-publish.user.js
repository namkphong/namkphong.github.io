// ==UserScript==
// @name         DMX — Đẩy ảnh Realtime lên Supabase (cụm 14285)
// @namespace    namkphong.github.io
// @version      2.1.0
// @description  Thêm nút "Đẩy ảnh" (Storage bucket 'bc') và "Đẩy DB" (bảng ycx_lines — cấp dòng hàng, tích luỹ lịch sử cho dashboard.html) vào realtimenv.html.
// @match        https://namkphong.github.io/realtimenv.html*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      kyyoihvcsrnmylnmbcis.supabase.co
// @updateURL    https://namkphong.github.io/dmx-line-publish.user.js
// @downloadURL  https://namkphong.github.io/dmx-line-publish.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VER = '2.1.0';
  var W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window; // đọc window.dmxYcxLines của trang

  /* ================================================================== */
  /* CẤU HÌNH                                                            */
  /* ================================================================== */
  // Supabase (khoá publishable công khai — Storage bucket 'bc' + bảng ycx_lines
  // đều cho phép ghi công khai, cùng mức bảo mật như ảnh /số đang public).
  var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  var SB_KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
  var BUCKET = 'bc';
  var DB_TABLE = 'ycx_lines';
  var DB_CHUNK = 500; // số dòng mỗi lần POST — tránh payload quá lớn

  // Nhận diện siêu thị từ tên in trong báo cáo → mã ngắn (tên file trên Supabase).
  var STORES = [
    { key: '396', label: '396 Nguyễn Văn Cừ', match: ['nguyễn văn cừ', 'nguyen van cu', '396'] },
    { key: '142', label: 'Ngọc Thụy',         match: ['ngọc thụy', 'ngoc thuy'] }
  ];

  /* ================================================================== */
  /* TIỆN ÍCH                                                            */
  /* ================================================================== */
  function toast(msg, kind) {
    var t = document.getElementById('dmxpub-toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'dmxpub-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483647;max-width:92vw;padding:11px 16px;border-radius:10px;font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.4);white-space:pre-wrap;text-align:center';
      document.body.appendChild(t);
    }
    t.style.background = kind === 'err' ? '#dc2626' : (kind === 'ok' ? '#16a34a' : '#1d4ed8');
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._h); t._h = setTimeout(function () { t.style.display = 'none'; }, kind === 'err' ? 8000 : 4500);
    try { console.log('[dmx-publish] ' + msg); } catch (e) {}
  }

  function b64ToBlob(b64, type) {
    var bin = atob(b64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: type });
  }

  // Nhận diện siêu thị: đọc textContent (#captureArea có thể display:none sau khi chụp).
  function detectStore() {
    var area = document.getElementById('captureArea') || document.body;
    var txt = (area.textContent || '').toLowerCase();
    for (var i = 0; i < STORES.length; i++)
      for (var j = 0; j < STORES[i].match.length; j++)
        if (txt.indexOf(STORES[i].match[j]) !== -1) return STORES[i];
    return null;
  }

  function currentImageB64() {
    var img = document.getElementById('previewImage');
    var src = img && img.getAttribute('src');
    if (!src || src.indexOf('data:image') !== 0) return null;
    var c = src.indexOf(','); return c === -1 ? null : src.slice(c + 1);
  }

  // Thu nhỏ ảnh làm preview cho LINE (< 1MB).
  function makePreviewB64(fullB64) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var maxW = 1080, scale = img.width > maxW ? maxW / img.width : 1;
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var d = c.toDataURL('image/jpeg', 0.72);
        resolve(d.slice(d.indexOf(',') + 1));
      };
      img.onerror = function () { resolve(fullB64); };
      img.src = 'data:image/jpeg;base64,' + fullB64;
    });
  }

  /* ================================================================== */
  /* UPLOAD SUPABASE STORAGE                                             */
  /* ================================================================== */
  function upload(path, blob) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: 'POST',
        url: SB_URL + '/storage/v1/object/' + BUCKET + '/' + path,
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'x-upsert': 'true', 'Cache-Control': 'max-age=60', 'Content-Type': 'image/jpeg' },
        data: blob,
        onload: function (r) { if (r.status >= 400) reject(new Error('Supabase ' + r.status + ': ' + (r.responseText || '').slice(0, 160))); else resolve(); },
        onerror: function () { reject(new Error('Lỗi mạng khi upload Supabase.')); },
        ontimeout: function () { reject(new Error('Quá thời gian upload.')); }
      });
    });
  }
  function publicUrl(path) { return SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + path; }

  /* ================================================================== */
  /* UPSERT BẢNG ycx_lines (cấp dòng hàng — lịch sử cho dashboard.html)  */
  /* ================================================================== */
  // window.dmxYcxLines do realtimenv.html tự dựng mỗi lần nạp file (KHÔNG giới
  // hạn "hôm nay" — toàn bộ khoảng ngày có trong file). Upsert dedup theo
  // (store_key, ma_don_hang, line_seq) nên chạy lại nhiều lần / đè lên khoảng
  // ngày cũ đều an toàn, không tạo dòng trùng.
  function dbUpsertChunk(rows) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: 'POST',
        url: SB_URL + '/rest/v1/' + DB_TABLE + '?on_conflict=store_key,ma_don_hang,line_seq',
        headers: {
          apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        data: JSON.stringify(rows),
        onload: function (r) { if (r.status >= 400) reject(new Error('DB ' + r.status + ': ' + (r.responseText || '').slice(0, 200))); else resolve(); },
        onerror: function () { reject(new Error('Lỗi mạng khi ghi DB.')); },
        ontimeout: function () { reject(new Error('Quá thời gian ghi DB.')); }
      });
    });
  }

  async function pushLinesToDb(storeHint) {
    var lines = W.dmxYcxLines;
    if (!lines || !lines.length) return { pushed: 0, reason: 'không có dữ liệu dòng hàng (chưa nạp file hoặc file rỗng)' };
    var store = storeHint || detectStore();
    if (!store) throw new Error('Không nhận ra siêu thị để gắn store_key.');
    var now = new Date().toISOString();
    var rows = lines.map(function (l) {
      var r = { store_key: store.key, updated_at: now };
      for (var k in l) r[k] = l[k];
      return r;
    });
    for (var i = 0; i < rows.length; i += DB_CHUNK) {
      await dbUpsertChunk(rows.slice(i, i + DB_CHUNK));
    }
    return { pushed: rows.length };
  }

  async function doPush() {
    var store = detectStore();
    if (!store) throw new Error('Không nhận ra siêu thị trong báo cáo (cần thấy 396 NVC hoặc Ngọc Thụy).');
    var b64 = currentImageB64();
    if (!b64) throw new Error('Chưa có ảnh — bấm "Báo Cáo Thẻ Chi Tiết" tạo ảnh trước.');
    toast('Đang đẩy ảnh ' + store.label + '…');
    await upload(store.key + '.jpg', b64ToBlob(b64, 'image/jpeg'));
    var prev = await makePreviewB64(b64);
    await upload(store.key + '_preview.jpg', b64ToBlob(prev, 'image/jpeg'));
    var dbNote = '';
    try {
      var res = await pushLinesToDb(store);
      dbNote = res.pushed ? ('\n+ ' + res.pushed + ' dòng dữ liệu DB') : '';
    } catch (e) { dbNote = '\n⚠ DB lỗi: ' + (e.message || e); } // ảnh vẫn tính là thành công dù DB lỗi
    toast('✓ Đã đẩy ảnh: ' + store.label + dbNote + '\n' + publicUrl(store.key + '.jpg'), 'ok');
  }

  // Nút riêng: chỉ đẩy DB, không cần đã tạo ảnh. Dùng để BACKFILL — nạp 1 file
  // lịch sử (không cần bấm "Báo Cáo Thẻ Chi Tiết") rồi bấm nút này là đủ.
  async function doPushDbOnly() {
    var store = detectStore();
    if (!store) throw new Error('Không nhận ra siêu thị (cần đã nạp file Excel).');
    toast('Đang đẩy DB ' + store.label + '…');
    var res = await pushLinesToDb(store);
    if (!res.pushed) throw new Error(res.reason || 'Không có dữ liệu.');
    toast('✓ Đã đẩy DB: ' + store.label + ' — ' + res.pushed + ' dòng', 'ok');
  }

  /* ================================================================== */
  /* GẮN NÚT VÀO MODAL                                                   */
  /* ================================================================== */
  function bind(btn, fn) {
    btn.addEventListener('click', function () {
      btn.disabled = true;
      Promise.resolve().then(fn).catch(function (e) { toast('✗ ' + (e.message || e), 'err'); }).then(function () { btn.disabled = false; });
    });
  }
  function injectButtons() {
    var dl = document.getElementById('downloadBtn');
    if (!dl || document.getElementById('dmxpub-bar')) return;
    var wrap = document.createElement('span');
    wrap.id = 'dmxpub-bar';
    wrap.style.cssText = 'display:inline-flex;gap:8px;align-items:center';
    var b = document.createElement('button');
    b.textContent = '⬆ Đẩy ảnh';
    b.className = 'px-4 py-2 rounded-md text-white font-bold shadow transition';
    b.style.cssText = 'background:#0f766e;border:0;cursor:pointer';
    bind(b, doPush);
    var bDb = document.createElement('button');
    bDb.textContent = '⬆ Đẩy DB';
    bDb.title = 'Chỉ đẩy dữ liệu dòng hàng lên Supabase (dùng cho backfill lịch sử) — không cần ảnh';
    bDb.className = 'px-4 py-2 rounded-md text-white font-bold shadow transition';
    bDb.style.cssText = 'background:#6d28d9;border:0;cursor:pointer';
    bind(bDb, doPushDbOnly);
    wrap.appendChild(b);
    wrap.appendChild(bDb);
    dl.parentNode.insertBefore(wrap, dl);
  }

  var iv = setInterval(injectButtons, 600);
  injectButtons();
  toast('DMX Publish v' + VER + ' (Supabase) sẵn sàng · tạo ảnh rồi bấm "Đẩy ảnh" (cũng tự đẩy DB).');
  setTimeout(function () { clearInterval(iv); }, 60000);
})();
