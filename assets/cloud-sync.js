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

  // ---- Sổ mốc đồng bộ ----
  // Với mỗi khóa, ghi nhớ hai mốc (đơn vị: milli giây):
  //   at   = lần cuối TRANG NÀY ghi khóa đó xuống máy
  //   base = bản trên đám mây mà MÁY NÀY đã từng nhìn thấy
  // Có 'base' mới được quyền nói "bản của tôi mới hơn". Máy chưa từng thấy bản
  // đám mây thì không thể tự nhận là mới hơn — đây chính là chỗ bản vá trước sai,
  // khiến máy mới mở lần đầu đẩy bản rỗng đè lên dữ liệu tốt.
  var META_KEY = 'cloudSyncMeta_v1';   // không nằm trong danh sách đồng bộ

  function ts(x) {
    if (typeof x === 'number') return x;
    var t = Date.parse(x);
    return isNaN(t) ? 0 : t;
  }
  function metaAll() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function metaGet(k) { return metaAll()[k] || null; }
  function metaSet(k, patch) {
    var m = metaAll();
    var cur = m[k] || {};
    if (patch.at !== undefined) cur.at = ts(patch.at);
    if (patch.base !== undefined) cur.base = ts(patch.base);
    m[k] = cur;
    try { origSetItem(META_KEY, JSON.stringify(m)); } catch (e) {}
  }

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

  // ---- Xuất dữ liệu ra file JSON (để mang đi xử lý: báo cáo, thuyết trình...) ----

  function exportData() {
    var out = {};
    syncedLocalKeys().forEach(function (k) {
      var raw = localStorage.getItem(k);
      try { out[k] = JSON.parse(raw); } catch (e) { out[k] = raw; }
    });
    var page = (location.pathname.split('/').pop() || 'export').replace(/\.html$/i, '') || 'export';
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'du-lieu-' + page + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ---- Đồng bộ dữ liệu ----

  function pushKey(key, rawValue) {
    if (!user || !supa || rawValue == null) return;
    var payload;
    try { payload = JSON.parse(rawValue); } catch (e) { payload = rawValue; }
    var stamp = new Date().toISOString();
    supa.from('kv_store').upsert(
      { user_id: user.id, store_key: key, payload: payload, updated_at: stamp },
      { onConflict: 'user_id,store_key' }
    ).then(function (res) {
      if (res.error) { console.error('[CloudSync] Lỗi lưu đám mây:', res.error.message); return; }
      // Đẩy xong thì bản đám mây chính là bản của máy: chốt cả hai mốc.
      metaSet(key, { base: stamp, at: stamp });
    });
  }

  // Gộp nhiều lần ghi liên tiếp (debounce) để đỡ gọi mạng quá nhiều.
  function schedulePush(key, rawValue) {
    if (pushTimers[key]) clearTimeout(pushTimers[key]);
    pushTimers[key] = setTimeout(function () { pushKey(key, rawValue); }, 800);
  }

  // ---- Gộp hai bản thay vì chọn một bên thắng ----
  // Chọn-một-bên luôn làm mất dữ liệu: trang tự ghi localStorage mỗi lần tải nên
  // mốc ghi của máy luôn mới nhất, kể cả khi bản dưới máy đang thiếu ngày mà máy
  // khác vừa thêm. Gộp thì không bên nào mất gì.
  // Đánh đổi: bản ghi đã XÓA có thể quay lại. Với dữ liệu lịch sử theo ngày (chỉ
  // thêm, không xóa) thì đây là đánh đổi có lợi.
  function laObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

  function gop(a, b, uuTienA) {
    if (laObj(a) && laObj(b)) {
      var out = {};
      Object.keys(a).forEach(function (k) { out[k] = a[k]; });
      Object.keys(b).forEach(function (k) {
        out[k] = Object.prototype.hasOwnProperty.call(a, k) ? gop(a[k], b[k], uuTienA) : b[k];
      });
      return out;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      var base = uuTienA ? a : b, khac = uuTienA ? b : a;
      var out2 = base.slice();
      khac.forEach(function (v) {
        if (typeof v !== 'object' && out2.indexOf(v) === -1) out2.push(v);
      });
      return out2;
    }
    if (a === undefined) return b;
    if (b === undefined) return a;
    return uuTienA ? a : b;
  }

  // So sánh bỏ qua thứ tự khóa, tránh nạp lại trang oan chỉ vì khóa xếp khác thứ tự.
  function chuanHoa(x) {
    if (Array.isArray(x)) return '[' + x.map(chuanHoa).join(',') + ']';
    if (laObj(x)) {
      return '{' + Object.keys(x).sort().map(function (k) {
        return JSON.stringify(k) + ':' + chuanHoa(x[k]);
      }).join(',') + '}';
    }
    return JSON.stringify(x === undefined ? null : x);
  }

  async function pullAll() {
    if (!user || !supa) return;
    var res = await supa.from('kv_store').select('store_key,payload,updated_at').eq('user_id', user.id);
    if (res.error) { console.error('[CloudSync] Lỗi tải đám mây:', res.error.message); return; }
    var rows = res.data || [];
    var cloudKeys = {};
    var changed = false;

    suppressPush = true;
    rows.forEach(function (row) {
      // Chỉ đụng vào khóa mà trang này thật sự đồng bộ. Khóa của trang khác
      // (vd biRawCapture) để nguyên, nếu không cứ mở trang là reload một lần.
      if (!isSyncedKey(row.store_key)) return;

      var k = row.store_key;
      cloudKeys[k] = true;

      var incoming = JSON.stringify(row.payload);
      var localRaw = localStorage.getItem(k);
      var cloudAt = ts(row.updated_at);
      var m = metaGet(k);

      // Giống nhau rồi: chỉ chốt lại mốc, không làm gì thêm.
      if (localRaw === incoming) {
        metaSet(k, { base: cloudAt, at: (m && m.at) || cloudAt });
        return;
      }

      var mayObj = null;
      try { mayObj = localRaw ? JSON.parse(localRaw) : null; } catch (e) { mayObj = null; }

      // Khi cùng một khóa lá lệch nhau thì ưu tiên bên nào:
      //   chưa từng thấy bản đám mây  -> bên nhiều dữ liệu hơn
      //   đã từng thấy               -> bên có mốc ghi mới hơn
      var uuTienMay = (!m || !m.base)
        ? !!(localRaw && localRaw.length > incoming.length)
        : (ts(m.at) > cloudAt);

      var gopLai = (laObj(mayObj) && laObj(row.payload))
        ? gop(mayObj, row.payload, uuTienMay)
        : (uuTienMay && mayObj !== null ? mayObj : row.payload);

      var gopStr = JSON.stringify(gopLai);
      var cGop = chuanHoa(gopLai);

      if (cGop !== chuanHoa(mayObj)) {          // máy còn thiếu -> bổ sung rồi nạp lại
        origSetItem(k, gopStr);
        metaSet(k, { base: cloudAt, at: Date.now() });
        changed = true;
      }
      if (cGop !== chuanHoa(row.payload)) {     // đám mây còn thiếu -> đẩy bản gộp lên
        pushKey(k, gopStr);
      } else {
        metaSet(k, { base: cloudAt });
      }
    });
    suppressPush = false;

    // Đám mây chưa có khóa này: đẩy bản dưới máy lên để không mất.
    syncedLocalKeys().forEach(function (k) {
      if (!cloudKeys[k]) pushKey(k, localStorage.getItem(k));
    });

    // Chỉ nạp lại trang khi đã thật sự thay dữ liệu đang hiển thị.
    if (changed) location.reload();
  }

  // ---- Xác thực (chỉ dùng TÊN TÀI KHOẢN + MẬT KHẨU) ----
  //
  // Supabase bắt buộc phải có email, nên ta ghép tên tài khoản thành một email
  // nội bộ: "phong" -> "phong@nkp-app.com". Người dùng không cần biết email này,
  // cũng không cần xác nhận email (nhớ TẮT "Confirm email" trong Supabase).

  var USER_DOMAIN = '@nkp-app.com';

  // Nếu người dùng gõ có dấu "@" => đó là email thật (tài khoản CŨ tạo bằng email),
  // giữ nguyên. Nếu không có "@" => là tên tài khoản kiểu mới, tự ghép domain nội bộ.
  function toEmail(input) {
    var s = String(input).trim().toLowerCase();
    return s.indexOf('@') !== -1 ? s : s + USER_DOMAIN;
  }
  // Hiển thị: email nội bộ thì cắt bỏ đuôi, email thật thì giữ nguyên cho dễ nhận ra.
  function toUsername(email) {
    var s = String(email || '');
    return s.indexOf(USER_DOMAIN) !== -1 ? s.replace(USER_DOMAIN, '') : s;
  }

  // Cho phép: tên tài khoản mới (chữ thường/số/. _ -) HOẶC một email thật hợp lệ.
  function validAccount(u) {
    if (u.indexOf('@') !== -1) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u);
    return /^[a-z0-9._-]{3,30}$/.test(u);
  }

  // Dịch lỗi Supabase sang tiếng Việt dễ hiểu.
  function viError(msg) {
    var m = String(msg || '');
    if (/already registered|already exists/i.test(m)) return 'Tên tài khoản này đã có người dùng. Hãy chọn tên khác.';
    if (/Invalid login credentials/i.test(m)) return 'Sai tên tài khoản hoặc mật khẩu.';
    if (/Email not confirmed/i.test(m)) return 'Tài khoản chưa được kích hoạt. Báo quản trị tắt "Confirm email" trong Supabase.';
    if (/Password should be/i.test(m)) return 'Mật khẩu cần tối thiểu 6 ký tự.';
    return m;
  }

  async function refreshUser() {
    var res = await supa.auth.getSession();
    user = (res.data && res.data.session) ? res.data.session.user : null;
  }

  async function signIn(username, password) {
    var res = await supa.auth.signInWithPassword({ email: toEmail(username), password: password });
    if (res.error) { alert('Đăng nhập lỗi: ' + viError(res.error.message)); return; }
    // onAuthStateChange sẽ xử lý phần còn lại.
  }

  async function signUp(username, password) {
    // Tài khoản mới: chỉ nhận tên thuần (không @), để thống nhất một kiểu về sau.
    if (String(username).indexOf('@') !== -1) {
      alert('Tạo tài khoản mới thì chỉ nhập TÊN, không nhập email.\nVí dụ: phong, nv.ngocthuy, kho_396');
      return;
    }
    var res = await supa.auth.signUp({ email: toEmail(username), password: password });
    if (res.error) { alert('Tạo tài khoản lỗi: ' + viError(res.error.message)); return; }
    if (res.data && res.data.session) return; // Đã đăng nhập luôn, không cần xác nhận email.
    // Không có session => Supabase vẫn đang bật xác nhận email. Thử đăng nhập thẳng.
    var login = await supa.auth.signInWithPassword({ email: toEmail(username), password: password });
    if (login.error) {
      alert('Đã tạo tài khoản nhưng chưa đăng nhập được: ' + viError(login.error.message) +
            '\n\nCần vào Supabase > Authentication > Sign In / Providers > Email và TẮT "Confirm email".');
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
      var hasData = syncedLocalKeys().length > 0;
      bar.innerHTML =
        '<span style="opacity:.85">☁️ ' + escapeHtml(toUsername(user.email)) + '</span>' +
        (hasData ? '<button id="cs-export" style="' + btnStyle('#0891b2') + '">⬇️ Xuất JSON</button>' : '') +
        '<button id="cs-logout" style="' + btnStyle('#ef4444') + '">Đăng xuất</button>';
      document.getElementById('cs-logout').onclick = signOut;
      if (hasData) document.getElementById('cs-export').onclick = exportData;
    } else if (!cfg.loginHere) {
      // Trang con khi chưa đăng nhập: chỉ nhắc, không hiện ô đăng nhập.
      bar.innerHTML =
        '<a href="' + cfg.homeUrl + '" style="color:#fff;text-decoration:none;opacity:.9">' +
        '🔒 Đăng nhập ở Trang chủ để lưu đám mây</a>';
    } else {
      bar.innerHTML =
        '<input id="cs-user" type="text" autocomplete="username" placeholder="Tên tài khoản / email cũ" style="' + inputStyle() + '">' +
        '<input id="cs-pass" type="password" autocomplete="current-password" placeholder="Mật khẩu" style="' + inputStyle() + '">' +
        '<button id="cs-login" style="' + btnStyle('#2563eb') + '">Đăng nhập</button>' +
        '<button id="cs-signup" style="' + btnStyle('#059669') + '">Tạo tài khoản</button>';
      // Đọc giá trị tươi ngay lúc bấm + bắt buộc nhập đủ, tránh gửi tên rỗng
      // (tên rỗng khiến Supabase báo "Anonymous sign-ins are disabled").
      function creds() {
        var u = (document.getElementById('cs-user').value || '').trim().toLowerCase();
        var p = document.getElementById('cs-pass').value || '';
        if (!u || !p) { alert('Vui lòng nhập cả Tên tài khoản và Mật khẩu.'); return null; }
        if (!validAccount(u)) {
          alert('Tên tài khoản 3–30 ký tự (chữ thường không dấu, số, dấu . _ -),\nhoặc email đầy đủ nếu là tài khoản cũ.\nVí dụ: phong, nv.ngocthuy, kho_396');
          return null;
        }
        if (p.length < 6) { alert('Mật khẩu cần tối thiểu 6 ký tự.'); return null; }
        return { username: u, password: p };
      }
      document.getElementById('cs-login').onclick = function () { var c = creds(); if (c) signIn(c.username, c.password); };
      document.getElementById('cs-signup').onclick = function () { var c = creds(); if (c) signUp(c.username, c.password); };
      document.getElementById('cs-pass').onkeydown = function (e) { if (e.key === 'Enter') { var c = creds(); if (c) signIn(c.username, c.password); } };
    }
  }

  function inputStyle() {
    return 'padding:5px 8px;border:none;border-radius:6px;font-size:13px;width:130px;color:#111';
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
      if (!suppressPush && isSyncedKey(key)) {
        metaSet(key, { at: Date.now() });         // ghi mốc trước, kể cả khi chưa đăng nhập
        if (user) schedulePush(key, value);
      }
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
