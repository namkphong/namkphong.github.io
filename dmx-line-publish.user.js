// ==UserScript==
// @name         DMX — Đẩy ảnh Realtime lên Supabase (đa cụm)
// @namespace    namkphong.github.io
// @version      2.9.0
// @description  realtimenv.html: nút "Đẩy ảnh" (Storage 'bc') + "Đẩy DB" (ycx_lines). realtime.html: nút "Đẩy ảnh RT" (bảng ngành hàng/doanh thu tổng realtime) — gộp field rtUrl vào cùng manifest bc/latest.json.
// @match        https://namkphong.github.io/realtimenv.html*
// @match        https://namkphong.github.io/realtime.html*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      kyyoihvcsrnmylnmbcis.supabase.co
// @require      https://namkphong.github.io/dmx-cluster-shared.js
// @updateURL    https://namkphong.github.io/dmx-line-publish.user.js
// @downloadURL  https://namkphong.github.io/dmx-line-publish.user.js
// ==/UserScript==

(function () {
  'use strict';

  // Số bản hiện trên thanh công cụ. LẤY TỪ @version của chính script khi trình
  // duyệt cho phép (Tampermonkey có GM_info kể cả @grant none; Violentmonkey
  // với @grant none thì không) — hằng số bên dưới chỉ là đường lui.
  // Từng lệch thật: @version 0.26.0 mà nhãn vẫn ghi 0.24.1, người dùng tưởng
  // Violentmonkey không chịu cập nhật (04/09/2026).
  var VER = (function () {
    try { return (GM_info && GM_info.script && GM_info.script.version) || '2.9.0'; }
    catch (e) { return '2.9.0'; }
  })();
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

  // Nhận diện siêu thị từ tên in trong báo cáo → mã ngắn (tên file trên
  // Supabase) — giờ lấy từ cấu hình cụm chung (dmx_clusters, tra theo
  // site_code) thay vì đóng cứng cho 1 cụm. Dựng ở loadStores() bên dưới,
  // chạy TRƯỚC khi gắn nút (xem cuối file).
  var STORES = [];
  async function loadStores() {
    // pickSiteCode(): mã đang lưu (sửa nếu lệch dấu) -> chỉ có 1 cụm -> mới hỏi.
    var got = await DMXCluster.pickSiteCode(DMXCluster.getSiteCode());
    var site = got.code;
    if (!site) throw new Error('Chưa có mã cụm.');
    if (site !== DMXCluster.getSiteCode()) DMXCluster.setSiteCode(site);
    var config = got.config;
    if (!config || !config.stores || !config.stores.length) {
      throw new Error('Cụm "' + site + '" chưa có cấu hình siêu thị — chạy dmx.user.js (cào số) 1 lần trước để tạo cấu hình.');
    }
    STORES = config.stores.map(function (s) { return { key: s.key, label: s.name }; });
  }

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

  // Nhận diện siêu thị từ MỘT CHUỖI bất kỳ (dùng chung: đọc DOM lẫn tên trả về
  // từ RTSHARE.buildAll() trên realtime.html).
  function detectStoreFromText(txt) {
    var t = DMXCluster.chuanHoaTen(txt);
    if (!t) return null;
    for (var i = 0; i < STORES.length; i++) {
      var s = DMXCluster.chuanHoaTen(STORES[i].label);
      if (s && (t.indexOf(s) !== -1 || s.indexOf(t) !== -1)) return STORES[i];
    }
    return null;
  }
  // Nhận diện siêu thị: đọc textContent (#captureArea có thể display:none sau khi chụp).
  function detectStore() {
    var area = document.getElementById('captureArea') || document.body;
    return detectStoreFromText(area.textContent || '');
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
  /* KHO ẢNH — Supabase (hiện tại) hoặc Cloudflare R2 (khi cần mở rộng)  */
  /* ================================================================== */
  // Supabase gói miễn phí chỉ 5 GB băng thông tải ra/tháng, đã vượt 134% với
  // MỘT cụm. R2 không thu tiền băng thông tải ra. Xem cloudflare/HUONG-DAN.md.
  // Để trống 2 dòng dưới = chạy Supabase như cũ.
  // ⚠ Bật ở đây thì phải bật cả dmx.user.js và line_webhook.gs — 3 chỗ phải
  //   cùng trỏ 1 kho, không được ảnh nửa nơi này nửa nơi kia.
  var R2_BASE = '';   // ví dụ: 'https://dmx-anh.<tên>.workers.dev'
  var R2_KEY = '';    // trùng secret DMX_UPLOAD_KEY của Worker
  function dungR2() { return !!(R2_BASE && R2_KEY); }

  function upload(path, blob, contentType) {
    contentType = contentType || 'image/jpeg';
    var duR2 = dungR2();
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: duR2 ? 'PUT' : 'POST',
        url: duR2
          ? (R2_BASE.replace(/\/+$/, '') + '/up/' + encodeURIComponent(path))
          : (SB_URL + '/storage/v1/object/' + BUCKET + '/' + path),
        headers: duR2
          ? { 'x-dmx-key': R2_KEY, 'Content-Type': contentType }
          : { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'x-upsert': 'true', 'Cache-Control': 'max-age=60', 'Content-Type': contentType },
        data: blob,
        onload: function (r) { if (r.status >= 400) reject(new Error((duR2 ? 'R2 ' : 'Supabase ') + r.status + ': ' + (r.responseText || '').slice(0, 160))); else resolve(); },
        onerror: function () { reject(new Error('Lỗi mạng khi đẩy ảnh.')); },
        ontimeout: function () { reject(new Error('Quá thời gian đẩy ảnh.')); }
      });
    });
  }
  function publicUrl(path) {
    if (dungR2()) return R2_BASE.replace(/\/+$/, '') + '/' + path;
    return SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + path;
  }

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
    // Ưu tiên store_key mà realtimenv.html đã gắn sẵn cho TỪNG DÒNG theo mã đơn hàng.
    // Chỉ khi dòng không có (bản trang cũ) mới đoán theo tên siêu thị đọc từ báo cáo —
    // cách đoán này dồn cả file vào một kho, nên từng gây lẫn số liệu 2 siêu thị.
    var coStoreKeyTungDong = lines.every(function (l) { return !!l.store_key; });
    var store = null;
    if (!coStoreKeyTungDong) {
      store = storeHint || detectStore();
      if (!store) throw new Error('Không nhận ra siêu thị để gắn store_key.');
    }
    var now = new Date().toISOString();
    var rows = lines.map(function (l) {
      var r = { updated_at: now };
      if (!coStoreKeyTungDong) r.store_key = store.key;
      for (var k in l) r[k] = l[k];
      return r;
    });
    for (var i = 0; i < rows.length; i += DB_CHUNK) {
      await dbUpsertChunk(rows.slice(i, i + DB_CHUNK));
    }

    // DỌN DÒNG ĐÃ BỊ TRẢ / HUỶ ĐƠN.
    // Bảng chỉ UPSERT nên đơn bị trả SAU khi đẩy nằm lại vĩnh viễn và bị cộng
    // thừa mãi, không báo lỗi gì. Mỗi lần đẩy gửi lại TOÀN BỘ khoảng ngày, nên
    // dòng nào trong khoảng đó còn mang mốc CŨ HƠN lần đẩy này là dòng đã biến
    // mất khỏi file xuất — xoá đi.
    // Đo 04/09/2026: mỗi kho có 3 dòng như vậy; riêng cáp Baseus 0,069 ở kho 396
    // đủ làm chương trình "Cáp - Sạc" lệch, tìm cả ngày mới ra.
    // CHỈ chạy sau khi mọi lô upsert đã xong — dừng giữa chừng mà xoá là mất
    // dòng thật.
    var xoa = 0;
    try {
      var theoKho = {};
      rows.forEach(function (r) {
        if (!r.store_key || !r.ngay_xuat) return;
        var g = theoKho[r.store_key] || (theoKho[r.store_key] = { tu: r.ngay_xuat, den: r.ngay_xuat });
        if (r.ngay_xuat < g.tu) g.tu = r.ngay_xuat;
        if (r.ngay_xuat > g.den) g.den = r.ngay_xuat;
      });
      for (var k2 in theoKho) {
        var g2 = theoKho[k2];
        xoa += await dbXoaCu(k2, g2.tu, g2.den, now);
      }
    } catch (e) {
      // Dọn hỏng KHÔNG làm hỏng cả lần đẩy — số đã vào bảng rồi. Báo ra thôi.
      return { pushed: rows.length, loiDon: e.message || String(e) };
    }
    return { pushed: rows.length, xoa: xoa };
  }

  // Xoá dòng cũ trong đúng khoảng ngày vừa đẩy. Trả về số dòng đã xoá.
  function dbXoaCu(storeKey, tu, den, moc) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: 'DELETE',
        url: SB_URL + '/rest/v1/' + DB_TABLE +
          '?store_key=eq.' + encodeURIComponent(storeKey) +
          '&ngay_xuat=gte.' + tu + '&ngay_xuat=lte.' + den +
          '&updated_at=lt.' + encodeURIComponent(moc),
        headers: {
          apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
          Prefer: 'return=representation', 'Content-Type': 'application/json'
        },
        onload: function (r) {
          if (r.status >= 400) return reject(new Error('Xoá DB ' + r.status + ': ' + (r.responseText || '').slice(0, 160)));
          var n = 0;
          try { n = (JSON.parse(r.responseText || '[]') || []).length; } catch (e) {}
          resolve(n);
        },
        onerror: function () { reject(new Error('Lỗi mạng khi dọn DB.')); }
      });
    });
  }

  async function doPush() {
    var store = detectStore();
    if (!store) throw new Error('Không nhận ra siêu thị trong báo cáo (cần thấy tên 1 trong ' + STORES.map(function (s) { return s.label; }).join(', ') + ').');
    var b64 = currentImageB64();
    if (!b64) throw new Error('Chưa có ảnh — bấm "Báo Cáo Thẻ Chi Tiết" tạo ảnh trước.');
    toast('Đang đẩy ảnh ' + store.label + '…');
    await upload(store.key + '.jpg', b64ToBlob(b64, 'image/jpeg'));
    var prev = await makePreviewB64(b64);
    await upload(store.key + '_preview.jpg', b64ToBlob(prev, 'image/jpeg'));
    // Ghi url/preview vào manifest bc/latest.json TRÊN SUPABASE (khác file cùng tên
    // trên git repo mà /số từng đọc qua GitHub — xem ghi chú readManifest/writeManifest).
    // Không đụng field rtUrl (do doPushRT ghi) nếu đã có sẵn cho kho này.
    try {
      var man0 = await readManifest();
      if (!man0.stores) man0.stores = {};
      man0.stores[store.key] = man0.stores[store.key] || {};
      man0.stores[store.key].key = store.key;
      man0.stores[store.key].label = store.label;
      man0.stores[store.key].url = publicUrl(store.key + '.jpg');
      man0.stores[store.key].preview = publicUrl(store.key + '_preview.jpg');
      man0.stores[store.key].at = new Date().toISOString();
      man0.updatedAt = new Date().toISOString();
      await writeManifest(man0);
    } catch (e) { /* ảnh vẫn tính là thành công dù ghi manifest lỗi */ }
    var dbNote = '';
    try {
      var res = await pushLinesToDb(store);
      dbNote = res.pushed ? ('\n+ ' + res.pushed + ' dòng dữ liệu DB' +
        (res.xoa ? ', dọn ' + res.xoa + ' dòng bị trả/huỷ' : '') +
        (res.loiDon ? '\n⚠ Dọn dòng cũ lỗi: ' + res.loiDon : '')) : '';
    } catch (e) { dbNote = '\n⚠ DB lỗi: ' + (e.message || e); } // ảnh vẫn tính là thành công dù DB lỗi
    toast('✓ Đã đẩy ảnh: ' + store.label + dbNote + '\n' + publicUrl(store.key + '.jpg'), 'ok');
  }

  // Nút riêng: chỉ đẩy DB, không cần đã tạo ảnh. Dùng để BACKFILL — nạp 1 file
  // lịch sử (không cần bấm "Báo Cáo Thẻ Chi Tiết") rồi bấm nút này là đủ.
  async function doPushDbOnly() {
    // KHÔNG bắt buộc nhận ra siêu thị. realtimenv.html đã gắn store_key cho TỪNG
    // DÒNG theo mã đơn hàng, nên dữ liệu tự đủ; pushLinesToDb chỉ cần store khi
    // dòng thiếu store_key (bản trang cũ).
    // Trước đây hàm này gọi detectStore() rồi ném lỗi ngay — mà detectStore()
    // đọc bảng báo cáo của NGÀY HÔM NAY, nên nạp file lịch sử (không có đơn nào
    // xuất hôm nay) là luôn hỏng, đúng lúc cần backfill nhất. Đã dính khi nạp
    // file tháng 8 ngày 04/09/2026: "Không nhận ra siêu thị (cần đã nạp file
    // Excel)" trong khi file có đủ 739 dòng mang sẵn store_key 142.
    var lines = W.dmxYcxLines || [];
    var duStoreKey = lines.length && lines.every(function (l) { return !!l.store_key; });
    var store = duStoreKey ? null : detectStore();
    if (!duStoreKey && !store) {
      throw new Error('Không nhận ra siêu thị, và dòng hàng cũng chưa có store_key. ' +
                      'Nạp lại file Excel bằng bản realtimenv.html mới.');
    }
    var nhan = store ? store.label
      : [].concat.apply([], [Object.keys(lines.reduce(function (m, l) {
          m[l.store_key] = 1; return m;
        }, {}))]).join(', ');
    toast('Đang đẩy DB ' + nhan + '…');
    var res = await pushLinesToDb(store);
    if (!res.pushed) throw new Error(res.reason || 'Không có dữ liệu.');
    toast('✓ Đã đẩy DB: ' + nhan + ' — ' + res.pushed + ' dòng' +
      (res.xoa ? ', dọn ' + res.xoa + ' dòng bị trả/huỷ' : '') +
      (res.loiDon ? '\n⚠ Dọn dòng cũ lỗi: ' + res.loiDon : ''), 'ok');
  }

  /* ================================================================== */
  /* MANIFEST bc/latest.json TRÊN SUPABASE STORAGE — LƯU Ý: khác file    */
  /* cùng tên trên git repo (namkphong.github.io/bc/latest.json, đọc qua */
  /* raw.githubusercontent.com) mà line_webhook.gs từng dùng cho /số.    */
  /* readManifest/writeManifest ở đây luôn ĐỌC-SỬA-GHI (merge theo       */
  /* store.key), không đụng field của kho khác hay field đã có (url/     */
  /* preview do doPush ghi, rtUrl do doPushRT ghi).                      */
  /* ================================================================== */
  function readManifest() {
    return new Promise(function (resolve) {
      GM_xmlhttpRequest({
        method: 'GET', url: publicUrl('latest.json') + '?t=' + Date.now(),
        headers: { 'Cache-Control': 'no-cache' },
        onload: function (r) {
          try { resolve(r.status === 200 ? JSON.parse(r.responseText) : { stores: {} }); }
          catch (e) { resolve({ stores: {} }); }
        },
        onerror: function () { resolve({ stores: {} }); },
        ontimeout: function () { resolve({ stores: {} }); }
      });
    });
  }
  function writeManifest(man) {
    var json = JSON.stringify(man, null, 2);
    var bytes = new TextEncoder().encode(json);
    return upload('latest.json', new Blob([bytes], { type: 'application/json' }), 'application/json');
  }

  async function doPushRT() {
    if (!W.RTSHARE || !W.RTSHARE.ready) throw new Error('Trang chưa sẵn sàng (RTSHARE chưa có) — tải lại trang.');
    var d1 = document.getElementById('dataInput1'), d2 = document.getElementById('dataInput2');
    if (!d1 || !d2) throw new Error('Không tìm thấy ô nhập liệu Ô1/Ô2.');
    toast('Đang dựng ảnh Realtime…');
    var results = await W.RTSHARE.buildAll(d1.value, d2.value);
    if (!results.length) throw new Error('Không dựng được ảnh — thiếu dữ liệu Ô1 hoặc Ô2.');

    var man = await readManifest();
    if (!man.stores) man.stores = {};
    var done = [];
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var store = detectStoreFromText(r.store);
      if (!store) { toast('⚠ Không nhận ra siêu thị "' + r.store + '" — bỏ qua ảnh này.', 'err'); continue; }
      var comma = r.image.indexOf(',');
      await upload('rt_' + store.key + '.jpg', b64ToBlob(r.image.slice(comma + 1), 'image/jpeg'));
      man.stores[store.key] = man.stores[store.key] || {};
      man.stores[store.key].rtUrl = publicUrl('rt_' + store.key + '.jpg');
      // Dấu thời gian để bot LINE biết ảnh này CÒN MỚI hay không. Thiếu nó thì
      // ảnh Realtime cũ nằm lại trong manifest sẽ được gửi kèm /số mãi mãi,
      // trông y như số hôm nay (đã xảy ra sau khi BI ngừng hoạt động).
      man.stores[store.key].rtAt = new Date().toISOString();
      done.push(store.label);
    }
    if (!done.length) throw new Error('Không đẩy được ảnh nào (không nhận ra siêu thị nào).');
    man.updatedAt = new Date().toISOString();
    await writeManifest(man);
    toast('✓ Đã đẩy ảnh RT: ' + done.join(', '), 'ok');
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

  function injectButtonsRT() {
    var sb = document.getElementById('screenshotBtn');
    if (!sb || document.getElementById('dmxpub-rt-bar')) return;
    var wrap = document.createElement('span');
    wrap.id = 'dmxpub-rt-bar';
    wrap.style.cssText = 'display:inline-flex;gap:8px;align-items:center';
    var b = document.createElement('button');
    b.textContent = '⬆ Đẩy ảnh RT';
    b.className = sb.className;
    b.style.background = '#0f766e';
    bind(b, doPushRT);
    wrap.appendChild(b);
    sb.parentNode.insertBefore(wrap, sb.nextSibling);
  }

  (async function () {
    try { await loadStores(); }
    catch (e) { toast('✗ DMX Publish: ' + (e.message || e), 'err'); return; }

    var path = location.pathname;
    var iv;
    if (path.indexOf('/realtimenv.html') !== -1) {
      iv = setInterval(injectButtons, 600);
      injectButtons();
      toast('DMX Publish v' + VER + ' (Supabase) sẵn sàng · tạo ảnh rồi bấm "Đẩy ảnh" (cũng tự đẩy DB).');
    } else if (path.indexOf('/realtime.html') !== -1) {
      iv = setInterval(injectButtonsRT, 600);
      injectButtonsRT();
      toast('DMX Publish v' + VER + ' (Realtime) sẵn sàng · dán Ô1+Ô2 rồi bấm "Đẩy ảnh RT".');
    }
    if (iv) setTimeout(function () { clearInterval(iv); }, 60000);
  })();
})();
