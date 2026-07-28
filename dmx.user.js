// ==UserScript==
// @name         DMX — Lấy số BI cụm 14285
// @namespace    namkphong.github.io
// @version      1.2.0
// @description  Cào số bán từ bi.thegioididong.com bằng điện thoại, đẩy Supabase, nạp vào nv.html + sieuthi.html
// @author       Phong
// @match        https://bi.thegioididong.com/*
// @match        https://namkphong.github.io/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://namkphong.github.io/dmx.user.js
// @downloadURL  https://namkphong.github.io/dmx.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VER = '1.2.0';
  document.documentElement.setAttribute('data-dmx', VER); // trang dmx.html dò thuộc tính này

  /* ================================================================== */
  /* CẤU HÌNH                                                           */
  /* ================================================================== */
  var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  var SB_KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
  var KV_KEY = 'biRawCapture';

  var STORES = { '88255.0': '396 Nguyễn Văn Cừ', '86858.0': 'Ngọc Thụy' };
  var IDS    = { '396 Nguyễn Văn Cừ': '88255.0', 'Ngọc Thụy': '86858.0' };

  var LS_STAGE = 'dmx_stage_v1';
  var LS_AUTH  = 'dmx_sb_auth_v1';

  var NV_FIELDS = { o1: 'target-input', o2: 'revenue-input', o3: 'details-input', o4: 'credit-input' };

  /* ================================================================== */
  /* TIỆN ÍCH CHUNG                                                     */
  /* ================================================================== */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function waitFor(fn, timeout, step) {
    timeout = timeout || 15000; step = step || 300;
    var t0 = Date.now();
    for (;;) {
      var v; try { v = fn(); } catch (e) { v = null; }
      if (v) return v;
      if (Date.now() - t0 > timeout) return null;
      await sleep(step);
    }
  }

  function jget(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }

  // Trích bảng y hệt thao tác bôi đen + copy tay: giữ nguyên \t và các ô trống
  // liên tiếp — đúng định dạng mà parser của nv.html / sieuthi.html cần.
  function grabTable(tbl) {
    var r = document.createRange();
    r.selectNode(tbl);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    var txt = sel.toString();
    sel.removeAllRanges();
    return txt;
  }

  /* ================================================================== */
  /* BỘ KHUNG GIAO DIỆN (dùng chung cho cả 3 trang)                      */
  /* ================================================================== */
  var CSS = [
    '.dmx-bub{position:fixed;right:14px;bottom:14px;z-index:2147483646;width:56px;height:56px;',
    'border-radius:50%;background:#0b1220;border:2px solid #2dd4ff;color:#2dd4ff;display:flex;',
    'align-items:center;justify-content:center;font:700 13px/1 ui-monospace,Menlo,monospace;',
    'letter-spacing:.06em;box-shadow:0 6px 20px rgba(0,0,0,.5);cursor:pointer;user-select:none;',
    '-webkit-tap-highlight-color:transparent}',
    '.dmx-p{position:fixed;left:8px;right:8px;bottom:12px;z-index:2147483647;background:#0b1220;',
    'border:1px solid #2dd4ff;border-radius:14px;padding:14px;color:#e6f6ff;',
    'font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    'box-shadow:0 12px 40px rgba(0,0,0,.55);max-height:82vh;overflow:auto}',
    '.dmx-p h4{margin:0 0 10px;font:600 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;',
    'color:#2dd4ff;text-transform:uppercase;border-bottom:1px solid #1e3a55;padding-bottom:9px}',
    '.dmx-p .x{position:absolute;top:9px;right:14px;color:#8fb6cc;font-size:22px;line-height:1;cursor:pointer}',
    '.dmx-p .row{display:flex;justify-content:space-between;gap:12px;margin:5px 0;font-size:13px;color:#9fc4dc}',
    '.dmx-p .row b{color:#fff;text-align:right;font-weight:600}',
    '.dmx-p button{display:block;width:100%;margin:7px 0;padding:12px;border:0;border-radius:8px;',
    'background:#1d9bf0;color:#fff;font-size:14px;font-weight:600;cursor:pointer}',
    '.dmx-p button:active{opacity:.65}',
    '.dmx-p button.go{background:#16a34a}',
    '.dmx-p button.sm{background:#243b52;font-weight:500;font-size:13px;padding:9px;margin:5px 0}',
    '.dmx-p .sep{margin:12px 0 4px;font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;',
    'color:#5d8299;text-transform:uppercase}',
    '.dmx-log{background:#000;color:#3bf07a;font:11px/1.55 ui-monospace,Menlo,monospace;padding:9px;',
    'border-radius:6px;height:130px;overflow:auto;margin-top:10px;white-space:pre-wrap;word-break:break-word}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('dmx-css')) return;
    var s = document.createElement('style');
    s.id = 'dmx-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  // Nút bong bóng; chạm vào mới dựng panel, không chiếm màn hình khi không dùng
  function mount(title, build) {
    injectCSS();
    var bub = document.createElement('div');
    bub.className = 'dmx-bub';
    bub.textContent = 'DMX';
    document.body.appendChild(bub);

    bub.addEventListener('click', function () {
      bub.style.display = 'none';
      var box = document.createElement('div');
      box.className = 'dmx-p';
      box.innerHTML = '<span class="x">&times;</span><h4>' + title + ' · v' + VER + '</h4>';
      document.body.appendChild(box);

      var logEl = document.createElement('div');
      logEl.className = 'dmx-log';

      var api = {
        rows: {},
        row: function (label, id) {
          var d = document.createElement('div');
          d.className = 'row';
          d.innerHTML = '<span></span><b>—</b>';
          d.firstChild.textContent = label;
          box.appendChild(d);
          api.rows[id] = d.querySelector('b');
          return api;
        },
        sep: function (t) {
          var d = document.createElement('div');
          d.className = 'sep'; d.textContent = t;
          box.appendChild(d); return api;
        },
        btn: function (label, cls, fn) {
          var b = document.createElement('button');
          b.className = cls; b.textContent = label;
          b.onclick = function () {
            Promise.resolve().then(fn).catch(function (e) { api.log('✗ ' + (e.message || e)); });
          };
          box.appendChild(b); return api;
        },
        log: function (m) {
          logEl.textContent += '> ' + m + '\n';
          logEl.scrollTop = logEl.scrollHeight;
        },
        done: function () { box.appendChild(logEl); }
      };

      box.querySelector('.x').onclick = function () {
        box.remove(); bub.style.display = 'flex';
      };

      build(api);
      api.done();
    });
  }

  /* ================================================================== */
  /* SUPABASE                                                           */
  /* ================================================================== */
  function decodeUid(tok) {
    var p = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(p)))).sub;
  }

  // Trên BI: đăng nhập bằng email/mật khẩu, token lưu trong máy
  async function biAuth(log) {
    var a = jget(LS_AUTH);
    if (a && a.exp > Date.now()) return a;
    var email = (a && a.email) || prompt('Email Supabase (tài khoản nv.html):', '');
    if (!email) throw new Error('Chưa nhập email.');
    var pass = prompt('Mật khẩu Supabase:', '');
    if (!pass) throw new Error('Chưa nhập mật khẩu.');
    log('Đang đăng nhập Supabase…');
    var res = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: pass })
    });
    var j = await res.json();
    if (!j.access_token) throw new Error('Đăng nhập thất bại: ' + (j.error_description || j.msg || res.status));
    var auth = {
      email: email.trim(), token: j.access_token,
      uid: decodeUid(j.access_token), exp: Date.now() + (j.expires_in - 60) * 1000
    };
    localStorage.setItem(LS_AUTH, JSON.stringify(auth));
    return auth;
  }

  // Trên namkphong.github.io: mượn luôn phiên đăng nhập sẵn có của trang
  function siteToken() {
    var ks = Object.keys(localStorage).filter(function (k) { return k.indexOf('sb-') === 0; });
    for (var i = 0; i < ks.length; i++) {
      var v = jget(ks[i]);
      if (v && v.access_token) return v.access_token;
    }
    return null;
  }

  async function kvGet(token, uid) {
    var q = SB_URL + '/rest/v1/kv_store?select=payload&store_key=eq.' + KV_KEY +
            (uid ? '&user_id=eq.' + uid : '');
    var res = await fetch(q, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } });
    var rows = await res.json();
    return (rows && rows[0] && rows[0].payload) || null;
  }

  async function kvPut(auth, payload) {
    var res = await fetch(SB_URL + '/rest/v1/kv_store?on_conflict=user_id,store_key', {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: 'Bearer ' + auth.token,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        user_id: auth.uid, store_key: KV_KEY,
        payload: payload, updated_at: new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error('Đẩy lỗi ' + res.status + ': ' + (await res.text()).slice(0, 150));
  }

  /* ================================================================== */
  /* TRANG BI — CÀO SỐ                                                  */
  /* ================================================================== */
  function biPanel() {
    function stage() { return jget(LS_STAGE) || { date: todayISO(), stores: {} }; }

    function store() {
      var m = /[?&]id=([0-9.]+)/.exec(location.search);
      if (m) {
        if (STORES[m[1]]) return STORES[m[1]];
        if (STORES[m[1] + '.0']) return STORES[m[1] + '.0'];
      }
      var txt = document.body.innerText || '';
      for (var id in STORES) if (txt.indexOf(STORES[id]) !== -1) return STORES[id];
      return null;
    }

    // KHÔNG dùng offsetParent để lọc: trên giao diện mobile, bảng nằm trong
    // khung position:fixed vẫn hiện nhưng offsetParent trả về null.
    function shown(t) {
      if (!t || !t.innerText) return false;
      var r = t.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }

    function allTables() {
      return [].slice.call(document.querySelectorAll('table')).filter(shown);
    }

    function vtable(marker) {
      var l = allTables();
      for (var i = 0; i < l.length; i++) {
        if (l[i].innerText.indexOf(marker) !== -1) return l[i];
      }
      return null;
    }

    // Bảng dài nhất đang hiện — dùng khi mốc chữ không khớp
    function bigTable() {
      return allTables().sort(function (a, b) {
        return b.innerText.length - a.innerText.length;
      })[0];
    }

    // Tìm theo mốc; không thấy thì lấy bảng dài nhất và báo rõ trong log
    async function findTable(marker, log, minLen) {
      var t = await waitFor(function () { return vtable(marker); }, 12000);
      if (t) return t;
      var b = bigTable();
      if (b && b.innerText.length > (minLen || 200)) {
        log('⚠ Không khớp mốc "' + marker + '", dùng bảng dài nhất (' + b.innerText.length + ' ký tự)');
        return b;
      }
      return null;
    }

    function clickTab(label) {
      var els = [].slice.call(document.querySelectorAll('a,button,li,span,[role=tab]'));
      for (var i = 0; i < els.length; i++) {
        if ((els[i].textContent || '').trim() === label) { els[i].click(); return true; }
      }
      return false;
    }

    function setSel(id, text) {
      var s = document.getElementById(id);
      if (!s) return false;
      var o = [].slice.call(s.options).filter(function (x) {
        return (x.text || '').indexOf(text) !== -1;
      })[0];
      if (!o) return false;
      s.value = o.value;
      s.dispatchEvent(new Event('change', { bubbles: true }));
      if (window.jQuery) { try { window.jQuery(s).trigger('change'); } catch (e) {} }
      return true;
    }

    function expandRow(tbl, re) {
      var row = [].slice.call(tbl.querySelectorAll('tr')).filter(function (tr) {
        return re.test(tr.textContent || '');
      })[0];
      if (!row) return false;
      var p = row.querySelector('i.fa-plus, i.fa-solid.fa-plus');
      if (p) { p.click(); return true; }
      return 'already';
    }

    /* ---- từng ô ---- */
    async function capO2(log) {
      log('Ô2 · DTQĐ nhân viên…');
      clickTab('BC Doanh thu theo nhân viên');
      if (!await waitFor(function () { return document.getElementById('showdatacomprog'); }, 15000))
        throw new Error('Không thấy select chế độ. Đã vào trang siêu thị chưa?');
      log('  đổi chế độ: ' + setSel('showdatacomprog', 'Ngành hàng chính'));
      await sleep(1300);
      var t = await findTable('BP All In One', log);
      if (!t) throw new Error('Không thấy bảng DTQĐ nhân viên. Bấm "Chẩn đoán bảng" để xem trang có gì.');
      expandRow(t, /BP All In One/);
      await sleep(1500);
      var txt = grabTable(vtable('BP All In One') || bigTable());
      if (txt.length < 100) throw new Error('Ô2 quá ngắn (' + txt.length + ').');
      log('Ô2 ✓ ' + txt.length + ' ký tự');
      return txt;
    }

    async function capO3(log) {
      log('Ô3 · Chương trình thi đua…');
      if (!setSel('showdatacomprog', 'Chương trình thi đua'))
        throw new Error('Không đổi được chế độ Chương trình thi đua.');
      await sleep(2500);
      var t = await findTable('BP All In One', log);
      if (!t) throw new Error('Bảng thi đua chưa render.');
      expandRow(t, /BP All In One/);
      await sleep(1500);
      var txt = grabTable(vtable('BP All In One') || bigTable());
      if (txt.length < 100) throw new Error('Ô3 quá ngắn.');
      log('Ô3 ✓ ' + txt.length + ' ký tự');
      return txt;
    }

    async function capO4(log) {
      log('Ô4 · Trả chậm…');
      clickTab('BC Trả Chậm');
      await sleep(2000);
      log('  đổi chế độ: ' + setSel('mode-view-bctg', 'Tỷ Trọng Trả Chậm'));
      await sleep(2000);
      var t = await findTable('HomeCredit', log, 50);
      if (!t) throw new Error('Không thấy bảng Trả Chậm (mốc HomeCredit).');
      var txt = grabTable(t);
      if (txt.length < 50) throw new Error('Ô4 quá ngắn.');
      log('Ô4 ✓ ' + txt.length + ' ký tự');
      return txt;
    }

    // Ô riêng của sieuthi.html — tab bcdtnh, bắt buộc mở dấu + ở NNH Điện gia dụng
    async function capS1(log) {
      if (location.search.indexOf('tab=bcdtnh') === -1)
        throw new Error('Bấm "Mở tab Ngành hàng" trước đã.');
      log('S1 · Doanh thu ngành hàng…');
      if (!await waitFor(function () {
        var b = bigTable(); return b && b.innerText.length > 200 ? b : null;
      }, 20000)) throw new Error('Bảng ngành hàng chưa render.');
      expandRow(bigTable(), /Điện gia dụng/);
      await sleep(1500);
      var txt = grabTable(bigTable());
      if (txt.indexOf('Lọc nước') === -1)
        throw new Error('Thiếu ngành Lọc nước — dấu + của Điện gia dụng chưa mở. Mở tay rồi bấm lại.');
      log('S1 ✓ ' + txt.length + ' ký tự (có Lọc nước)');
      return txt;
    }

    async function capO1(log) {
      if (location.pathname.indexOf('thi-dua') === -1)
        throw new Error('Ô1 phải chạy trên trang BC Thi đua.');
      if (!await waitFor(function () { return vtable('Target') || vtable('%HT'); }, 15000))
        throw new Error('Không thấy bảng Target.');
      var all = allTables().filter(function (x) { return x.innerText.length > 80; });
      var txt = all.map(grabTable).join('\n');
      log('Ô1 ✓ ' + txt.length + ' ký tự (' + all.length + ' khối)');
      return txt;
    }

    mount('DMX · Lấy số', function (ui) {
      function refresh() {
        var s = stage();
        ui.rows.st.textContent = store() || 'chưa vào siêu thị';
        ui.rows.dt.textContent = s.date;
        var out = [];
        Object.keys(s.stores || {}).forEach(function (n) {
          var k = Object.keys(s.stores[n]).filter(function (x) { return /^[os]\d$/.test(x); }).sort();
          out.push(n.split(' ').pop() + ': ' + k.join(' '));
        });
        ui.rows.got.textContent = out.length ? out.join(' | ') : 'chưa có';
      }

      function save(field, txt) {
        var n = store();
        if (!n) throw new Error('Chưa nhận diện được siêu thị.');
        var s = stage();
        if (s.date !== todayISO()) s = { date: todayISO(), stores: {} };
        s.stores[n] = s.stores[n] || {};
        s.stores[n][field] = txt;
        s.stores[n].at = new Date().toISOString();
        localStorage.setItem(LS_STAGE, JSON.stringify(s));
        refresh();
      }

      ui.row('Siêu thị', 'st').row('Ngày', 'dt').row('Đã lấy', 'got');

      ui.sep('Cho nv.html');
      ui.btn('Lấy Ô2 + Ô3 + Ô4', 'go', async function () {
        ui.log('--- ' + (store() || '?') + ' ---');
        save('o2', await capO2(ui.log));
        save('o3', await capO3(ui.log));
        save('o4', await capO4(ui.log));
        ui.log('Xong 3 ô.');
      });
      ui.btn('Chỉ Ô2 · DTQĐ nhân viên', 'sm', async function () { save('o2', await capO2(ui.log)); });
      ui.btn('Chỉ Ô3 · Chương trình thi đua', 'sm', async function () { save('o3', await capO3(ui.log)); });
      ui.btn('Chỉ Ô4 · Trả chậm', 'sm', async function () { save('o4', await capO4(ui.log)); });

      ui.sep('Cho sieuthi.html');
      ui.btn('Mở tab Ngành hàng', 'sm', function () {
        var n = store();
        if (!n) throw new Error('Chưa nhận diện được siêu thị.');
        location.href = 'https://bi.thegioididong.com/sieu-thi-con?id=' + IDS[n] + '&tab=bcdtnh&rt=2&dm=1';
      });
      ui.btn('Lấy S1 · Doanh thu ngành hàng', 'sm', async function () { save('s1', await capS1(ui.log)); });

      ui.sep('Đầu tháng');
      ui.btn('Ô1 · Target tháng (trang Thi đua)', 'sm', async function () { save('o1', await capO1(ui.log)); });

      ui.sep('Gửi đi');
      ui.btn('Đẩy lên Supabase', '', async function () {
        var s = stage();
        var names = Object.keys(s.stores || {});
        if (!names.length) throw new Error('Chưa có gì để đẩy.');
        var auth = await biAuth(ui.log);
        ui.log('Gộp với bản trên cloud…');
        var remote = await kvGet(auth.token, auth.uid);
        if (!remote || !remote.stores || remote.date !== s.date) remote = { date: s.date, stores: {} };
        names.forEach(function (n) {
          remote.stores[n] = Object.assign({}, remote.stores[n], s.stores[n]);
        });
        remote.date = s.date;
        remote.capturedAt = new Date().toISOString();
        await kvPut(auth, remote);
        ui.log('☁ Đã đẩy: ' + names.join(', '));
        ui.log('→ Mở nv.html, chạm DMX, Nạp.');
      });
      ui.btn('Xóa dữ liệu tạm', 'sm', function () {
        localStorage.removeItem(LS_STAGE); refresh(); ui.log('Đã xóa.');
      });

      ui.sep('Sửa lỗi');
      ui.btn('Chẩn đoán bảng', 'sm', function () {
        var raw = [].slice.call(document.querySelectorAll('table'));
        ui.log('=== ' + raw.length + ' bảng, ' +
               document.querySelectorAll('iframe').length + ' iframe ===');
        raw.forEach(function (t, i) {
          var r = t.getBoundingClientRect();
          var s = (t.innerText || '').replace(/\s+/g, ' ').trim();
          ui.log('[' + i + '] ' + Math.round(r.width) + 'x' + Math.round(r.height) +
                 ' op:' + (t.offsetParent ? 'y' : 'n') + ' len:' + s.length);
          if (s.length) ui.log('    ' + s.slice(0, 70));
        });
        ['showdatacomprog', 'mode-view-bctg'].forEach(function (id) {
          var e = document.getElementById(id);
          ui.log('select #' + id + ': ' + (e ? [].slice.call(e.options).map(function (o) {
            return o.text.trim();
          }).join(' | ') : 'KHÔNG CÓ'));
        });
      });

      refresh();
      ui.log('Sẵn sàng. ' + (store() || 'Chạm tên siêu thị trên trang cụm trước.'));
    });
  }

  /* ================================================================== */
  /* TRANG nv.html — NẠP SỐ                                             */
  /* ================================================================== */
  function nvPanel() {
    function fill(id, txt) {
      var ta = document.getElementById(id);
      if (!ta) return false;
      ta.value = txt;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    function storeSelect() {
      var ss = [].slice.call(document.querySelectorAll('select'));
      for (var i = 0; i < ss.length; i++) {
        var t = ss[i].innerText || '';
        if (t.indexOf('396 Nguyễn Văn Cừ') !== -1 || t.indexOf('Ngọc Thụy') !== -1) return ss[i];
      }
      return null;
    }
    function pick(sel, text) {
      var o = [].slice.call(sel.options).filter(function (x) { return (x.text || '').trim() === text; })[0];
      if (!o) return false;
      sel.value = o.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    mount('DMX · Nạp nv.html', function (ui) {
      ui.btn('Nạp & lưu cả 2 siêu thị', 'go', async function () {
        var tok = siteToken();
        if (!tok) throw new Error('Chưa đăng nhập trang này.');
        ui.log('Tải dữ liệu từ cloud…');
        var cap = await kvGet(tok, null);
        if (!cap) throw new Error('Chưa có biRawCapture trên cloud.');
        ui.log('Ngày ' + cap.date + ' — ' + Object.keys(cap.stores).join(', '));
        if (cap.date !== todayISO()) ui.log('⚠ Không phải hôm nay (' + todayISO() + '), vẫn nạp.');

        var sel = storeSelect();
        if (!sel) throw new Error('Không thấy ô Chọn Siêu Thị.');

        var names = Object.keys(cap.stores);
        for (var i = 0; i < names.length; i++) {
          var name = names[i], d = cap.stores[name];
          ui.log('--- ' + name + ' ---');
          if (!pick(sel, name)) { ui.log('✗ Không chọn được, bỏ qua.'); continue; }
          await sleep(1200);
          ['o1', 'o2', 'o3', 'o4'].forEach(function (k) {
            if (d[k]) ui.log((fill(NV_FIELDS[k], d[k]) ? '✓ ' : '✗ ') + k + ' · ' + d[k].length);
          });
          await sleep(400);
          var btn = [].slice.call(document.querySelectorAll('button')).filter(function (x) {
            return /Phân Tích & Lưu/.test(x.textContent || '');
          })[0];
          if (!btn) throw new Error('Không thấy nút Phân Tích & Lưu.');
          btn.click();
          ui.log('Đã bấm lưu, chờ…');
          await sleep(3500);
          var dd = jget('analysisAppData_v2');
          var has = dd && dd.supermarkets[name] && dd.supermarkets[name].history[cap.date];
          ui.log(has ? '✓ Đã lưu ' + cap.date : '⚠ Chưa thấy ' + cap.date + ' trong lịch sử');
        }
        ui.log('XONG. Giờ mở sieuthi.html chạy tiếp.');
      });
      ui.log('Sẵn sàng.');
    });
  }

  /* ================================================================== */
  /* TRANG sieuthi.html — NẠP SỐ                                        */
  /* Ô1 = S1 từ cloud · Ô2 = nv.html targetInput · Ô3 = nv.html detailsInput */
  /* ================================================================== */
  function stPanel() {
    function fill(id, txt) {
      var ta = document.getElementById(id);
      if (!ta) return false;
      ta.value = txt;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    mount('DMX · Nạp sieuthi', function (ui) {
      ui.btn('Nạp & phân tích cả 2 siêu thị', 'go', async function () {
        var tok = siteToken();
        if (!tok) throw new Error('Chưa đăng nhập trang này.');

        var nv = jget('analysisAppData_v2');
        if (!nv || !nv.supermarkets) throw new Error('Chưa có analysisAppData_v2 — chạy nv.html trước.');

        ui.log('Tải S1 từ cloud…');
        var cap = await kvGet(tok, null);
        if (!cap) throw new Error('Chưa có biRawCapture trên cloud.');
        var date = cap.date;
        ui.log('Ngày ' + date);

        var sel = document.getElementById('supermarketSelect');
        if (!sel) throw new Error('Không thấy #supermarketSelect.');

        var names = Object.keys(cap.stores);
        for (var i = 0; i < names.length; i++) {
          var name = names[i];
          ui.log('--- ' + name + ' ---');

          var s1 = cap.stores[name].s1;
          if (!s1) { ui.log('✗ Thiếu S1 (chưa lấy tab Ngành hàng), bỏ qua.'); continue; }

          var h = nv.supermarkets[name] && nv.supermarkets[name].history[date];
          if (!h) { ui.log('✗ nv.html chưa có ngày ' + date + ', bỏ qua.'); continue; }
          if (!h.targetInput) ui.log('⚠ nv.html thiếu Ô1 (target) — ô 2 sẽ trống.');

          var o = [].slice.call(sel.options).filter(function (x) {
            return (x.text || '').trim() === name;
          })[0];
          if (!o) { ui.log('✗ Không chọn được siêu thị.'); continue; }
          sel.value = o.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          await sleep(1000); // phải chọn TRƯỚC khi dán, đổi sau sẽ nạp đè dữ liệu cũ

          ui.log((fill('dataInput', s1) ? '✓ ' : '✗ ') + 'ô1 · ' + s1.length);
          if (h.targetInput)
            ui.log((fill('categoryDataInput', h.targetInput) ? '✓ ' : '✗ ') + 'ô2 · ' + h.targetInput.length);
          ui.log((fill('employeeDataInput', h.detailsInput || '') ? '✓ ' : '✗ ') +
                 'ô3 · ' + (h.detailsInput || '').length);

          await sleep(400);
          var btn = document.getElementById('analyzeBtn');
          if (!btn) throw new Error('Không thấy #analyzeBtn.');
          btn.click();
          ui.log('Đã bấm Lưu & Phân Tích, chờ…');
          await sleep(3000);

          var r = jget('businessReportAppV3');
          var ok = r && r.reports && r.reports[name] && r.reports[name][date];
          ui.log(ok ? '✓ Đã lưu ' + date : '⚠ Chưa thấy ' + date + ' trong businessReportAppV3');
        }
        ui.log('XONG. Kiểm số rồi chụp ảnh báo cáo.');
      });
      ui.log('Cần nv.html đã có số hôm nay trước.');
    });
  }

  /* ================================================================== */
  /* ĐỊNH TUYẾN                                                         */
  /* ================================================================== */
  function route() {
    if (document.getElementById('supermarketSelect') && document.getElementById('dataInput')) { stPanel(); return true; }
    if (document.getElementById('revenue-input')) { nvPanel(); return true; }
    return false;
  }

  function boot() {
    if (location.hostname.indexOf('bi.thegioididong.com') !== -1) { biPanel(); return; }
    if (location.hostname.indexOf('namkphong.github.io') === -1) return;
    if (route()) return;
    var n = 0, iv = setInterval(function () {           // trang render chậm — thử lại
      if (route() || ++n > 12) clearInterval(iv);
    }, 800);
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
