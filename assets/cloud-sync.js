/*
 * cloud-sync.js — Lớp đăng nhập + đồng bộ đám mây (Supabase) cho các dashboard.
 *
 * Nguyên tắc:
 *  - KHÔNG đăng nhập  => app hoạt động y như cũ, dữ liệu chỉ nằm trong localStorage của máy.
 *  - CÓ đăng nhập     => dữ liệu trong các "khóa" localStorage được chỉ định sẽ được
 *                        mirror lên Supabase (mỗi user chỉ thấy dữ liệu của mình nhờ RLS),
 *                        và tự kéo về khi mở lại trên bất kỳ thiết bị nào.
 *
 * Cách dùng trong mỗi trang (đặt SAU khi đã nạp thư viện supabase-js và cloud-config.js):
 *   CloudSync.init({
 *     keys:     ['businessReportAppV3'],   // các khóa localStorage cần đồng bộ (khớp chính xác)
 *     prefixes: ['realtimeData_'],         // (tùy chọn) đồng bộ mọi khóa bắt đầu bằng prefix
 *   });
 *
 * Bảo mật: chỉ dùng anon/public key (an toàn để nhúng frontend khi đã bật Row Level Security).
 * TUYỆT ĐỐI không đặt service_role key vào đây.
 */
(function () {
  'use strict';

  var supa = null;
  var user = null;
  var cfg = { keys: [], prefixes: [] };
  var ready = false;

  // Giữ tham chiếu gốc để ghi localStorage mà KHÔNG kích hoạt đẩy lên cloud (tránh vòng lặp).
  var origSetItem = window.localStorage.setItem.bind(window.localStorage);
  var suppressPush = false;
  var pushTimers = {};

  function isSyncedKey(key) {
    if (!key) return false;
    if (cfg.keys.indexOf(key) !== -1) return true;
    for (var i = 0; i < cfg.prefixes.length; i++) {
      if (key.indexOf(cfg.prefixes[i]) === 0) return true;
    }
    return false;
  }

  function syncedLocalKeys() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (isSyncedKey(k)) out.push(k);
    }
    return out;
  }

  // ---- Đồng bộ dữ liệu ----

  function pushKey(key, rawValue) {
    if (!user || !supa) return;
    var payload;
    try { payload = JSON.parse(rawValue); } catch (e) { payload = rawValue; }
    supa.from('kv_store').upsert(
      { user_id: user.id, store_key: key, payload: payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,store_key' }
    ).then(function (res) {
      if (res.error) console.error('[CloudSync] Lỗi lưu đám mây:', res.error.message);
    });
  }

  // Gộp nhiều lần ghi liên tiếp (debounce) để đỡ gọi mạng quá nhiều.
  function schedulePush(key, rawValue) {
    if (pushTimers[key]) clearTimeout(pushTimers[key]);
    pushTimers[key] = setTimeout(function () { pushKey(key, rawValue); }, 800);
  }

  async function pullAll() {
    if (!user || !supa) return;
    var res = await supa.from('kv_store').select('store_key,payload').eq('user_id', user.id);
    if (res.error) { console.error('[CloudSync] Lỗi tải đám mây:', res.error.message); return; }
    var rows = res.data || [];
    var cloudKeys = {};
    var changed = false;

    suppressPush = true;
    rows.forEach(function (row) {
      cloudKeys[row.store_key] = true;
      var incoming = JSON.stringify(row.payload);
      if (localStorage.getItem(row.store_key) !== incoming) {
        origSetItem(row.store_key, incoming);
        changed = true;
      }
    });
    suppressPush = false;

    // Lần đầu đăng nhập mà đám mây chưa có: đẩy dữ liệu local hiện có lên để không mất.
    syncedLocalKeys().forEach(function (k) {
      if (!cloudKeys[k]) pushKey(k, localStorage.getItem(k));
    });

    // Nếu dữ liệu đám mây khác dữ liệu đang hiển thị => nạp lại trang để app đọc dữ liệu mới.
    if (changed) location.reload();
  }

  // ---- Xác thực ----

  async function refreshUser() {
    var res = await supa.auth.getSession();
    user = (res.data && res.data.session) ? res.data.session.user : null;
  }

  async function signIn(email, password) {
    var res = await supa.auth.signInWithPassword({ email: email, password: password });
    if (res.error) { alert('Đăng nhập lỗi: ' + res.error.message); return; }
    // onAuthStateChange sẽ xử lý phần còn lại.
  }

  async function signUp(email, password) {
    var res = await supa.auth.signUp({ email: email, password: password });
    if (res.error) { alert('Tạo tài khoản lỗi: ' + res.error.message); return; }
    if (res.data && res.data.user && !res.data.session) {
      alert('Đã gửi email xác nhận tới ' + email + '. Vui lòng mở email, bấm xác nhận rồi đăng nhập.');
    }
  }

  async function signOut() {
    await supa.auth.signOut();
    user = null;
    renderBar();
  }

  // ---- Giao diện thanh đăng nhập ----

  var lastRenderState = null;

  function renderBar() {
    // Chỉ vẽ lại khi TRẠNG THÁI đổi (đăng nhập/đăng xuất). Nếu không, giữ nguyên
    // để tránh xóa mất Email/Mật khẩu người dùng đang gõ khi getSession() trả về muộn.
    var state = user ? ('in:' + user.email) : (cfg.loginHere ? 'out:form' : 'out:link');
    if (state === lastRenderState && document.getElementById('cloud-sync-bar')) return;
    lastRenderState = state;

    var bar = document.getElementById('cloud-sync-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'cloud-sync-bar';
      bar.style.cssText = [
        'position:fixed', 'top:0', 'right:0', 'z-index:99999',
        'display:flex', 'align-items:center', 'gap:8px',
        'padding:6px 10px', 'margin:8px', 'border-radius:10px',
        'background:rgba(17,24,39,0.92)', 'color:#fff',
        'font:500 13px/1.2 Inter,system-ui,sans-serif',
        'box-shadow:0 6px 18px rgba(0,0,0,0.25)'
      ].join(';');
      document.body.appendChild(bar);
    }

    if (user) {
      bar.innerHTML =
        '<span style="opacity:.85">☁️ ' + escapeHtml(user.email) + '</span>' +
        '<button id="cs-logout" style="' + btnStyle('#ef4444') + '">Đăng xuất</button>';
      document.getElementById('cs-logout').onclick = signOut;
    } else if (!cfg.loginHere) {
      // Trang con khi chưa đăng nhập: chỉ nhắc, không hiện ô đăng nhập.
      bar.innerHTML =
        '<a href="' + cfg.homeUrl + '" style="color:#fff;text-decoration:none;opacity:.9">' +
        '🔒 Đăng nhập ở Trang chủ để lưu đám mây</a>';
    } else {
      bar.innerHTML =
        '<input id="cs-email" type="email" placeholder="Email" style="' + inputStyle() + '">' +
        '<input id="cs-pass" type="password" placeholder="Mật khẩu" style="' + inputStyle() + '">' +
        '<button id="cs-login" style="' + btnStyle('#2563eb') + '">Đăng nhập</button>' +
        '<button id="cs-signup" style="' + btnStyle('#059669') + '">Tạo tài khoản</button>';
      // Đọc giá trị tươi ngay lúc bấm + bắt buộc nhập đủ, tránh gửi email rỗng
      // (email rỗng khiến Supabase báo "Anonymous sign-ins are disabled").
      function creds() {
        var e = (document.getElementById('cs-email').value || '').trim();
        var p = document.getElementById('cs-pass').value || '';
        if (!e || !p) { alert('Vui lòng nhập cả Email và Mật khẩu.'); return null; }
        if (p.length < 6) { alert('Mật khẩu cần tối thiểu 6 ký tự.'); return null; }
        return { email: e, password: p };
      }
      document.getElementById('cs-login').onclick = function () { var c = creds(); if (c) signIn(c.email, c.password); };
      document.getElementById('cs-signup').onclick = function () { var c = creds(); if (c) signUp(c.email, c.password); };
      document.getElementById('cs-pass').onkeydown = function (e) { if (e.key === 'Enter') { var c = creds(); if (c) signIn(c.email, c.password); } };
    }
  }

  function inputStyle() {
    return 'padding:5px 8px;border:none;border-radius:6px;font-size:13px;width:120px;color:#111';
  }
  function btnStyle(bg) {
    return 'padding:5px 10px;border:none;border-radius:6px;color:#fff;font-size:13px;cursor:pointer;background:' + bg;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Khởi tạo ----

  function init(options) {
    options = options || {};
    cfg.keys = options.keys || [];
    cfg.prefixes = options.prefixes || [];
    // loginHere=true  => hiện ô đăng nhập ngay tại trang này (dùng cho Trang chủ).
    // loginHere=false => trang con: không hiện ô đăng nhập, chỉ nhắc về Trang chủ;
    //                    vẫn đồng bộ dữ liệu bình thường vì phiên đăng nhập dùng chung.
    cfg.loginHere = options.loginHere !== false;
    cfg.homeUrl = options.homeUrl || 'index.html';

    if (!window.CLOUD || !window.CLOUD.url || window.CLOUD.url.indexOf('REPLACE') === 0) {
      console.warn('[CloudSync] Chưa cấu hình Supabase (assets/cloud-config.js). Bỏ qua đồng bộ đám mây.');
      return;
    }
    if (!window.supabase || !window.supabase.createClient) {
      console.error('[CloudSync] Chưa nạp thư viện supabase-js.');
      return;
    }

    supa = window.supabase.createClient(window.CLOUD.url, window.CLOUD.anonKey);

    // Chặn ghi localStorage: ghi bình thường, đồng thời đẩy lên cloud nếu là khóa cần đồng bộ.
    window.localStorage.setItem = function (key, value) {
      origSetItem(key, value);
      if (!suppressPush && user && isSyncedKey(key)) schedulePush(key, value);
    };

    supa.auth.onAuthStateChange(function (_event, session) {
      user = session ? session.user : null;
      renderBar();
      if (user) pullAll();
    });

    // Trạng thái ban đầu (nếu đã đăng nhập từ trước).
    refreshUser().then(function () {
      ready = true;
      renderBar();
      if (user) pullAll();
    });
  }

  window.CloudSync = { init: init };
})();
