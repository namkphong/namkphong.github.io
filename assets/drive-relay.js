/* Chuyển gói số điện thoại → máy tính. Hai đường:
 *  1) MẶC ĐỊNH (14/11) — TRẠM BOT: dùng bot LINE sẵn có, không ai phải tạo tài khoản.
 *     Điện thoại gửi gói kèm khoá máy (khoá bot của doc-so, dmxsnap_bot_v1.khoa) → bot giữ 2 tiếng.
 *     Ghép máy 1 lần: điện thoại "Lấy mã ghép" (6 số, 10 phút) → máy tính gõ mã → nhận thẻ, lưu ở K_BOT_THE.
 *  2) NÂNG CAO — Trạm Drive riêng (drive_relay.gs trên Drive của từng quản lý): giữ cho ai đã cài.
 *     Điện thoại có cài Drive thì gửi CẢ HAI; máy tính đã ghép bot thì lấy ở bot trước, chưa có thì lấy Drive.
 * POST text/plain để không bị preflight CORS; khoá/thẻ nằm trong thân request, không trên URL. */
(function () {
  'use strict';
  var KEY = 'dmx_drive_relay_v1', K_BOT_THE = 'dmx_tram_bot_v1';
  var BOT_URL = 'https://script.google.com/macros/s/AKfycbxyrv1Z5c_eRU-JHIbT4oHfACkSMOlQ1BaVofrdADC3T5ozmPuAZTBoKjYlxg8m66vc/exec';
  var TRONG_APP = !!window.DataSnapApp;

  function docJ(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function cauHinh() { var c = docJ(KEY); return c && c.url && c.khoa ? c : null; }
  function theBot() { var t = docJ(K_BOT_THE); return t && /^[0-9a-f]{32}$/.test(t.the || '') ? t : null; }
  // Khoá máy = khoá bot của doc-so (cùng 1 khoá cho /so và trạm). Chưa có thì tạo, ghi đúng chỗ doc-so đọc.
  function khoaMay() {
    // Trên doc-so: dùng chính khoaBot() của trang (trang giữ BOT trong bộ nhớ — tự tạo ở đây sẽ bị trang ghi đè, làm hỏng ghép).
    if (typeof window.khoaBot === 'function') return window.khoaBot();
    var b = docJ('dmxsnap_bot_v1') || {};
    if (!/^[0-9a-f]{32}$/.test(b.khoa || '')) {
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      b.khoa = Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      localStorage.setItem('dmxsnap_bot_v1', JSON.stringify(b));
    }
    return b.khoa;
  }
  function luuCauHinh(url, khoa) {
    url = String(url || '').trim(); khoa = String(khoa || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url))
      throw new Error('URL phải có dạng https://script.google.com/macros/s/…/exec');
    if (khoa.length < 8) throw new Error('Khoá quá ngắn (ít nhất 8 ký tự).');
    localStorage.setItem(KEY, JSON.stringify({ url: url, khoa: khoa }));
  }

  async function post(url, than, ten) {
    var r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(than) });
    if (!r.ok) throw new Error(ten + ' trả HTTP ' + r.status);
    var j = await r.json();
    if (!j.ok) { var e = new Error(j.loi || (ten + ' báo lỗi.')); e.ghepLai = !!j.ghepLai; throw e; }
    return j;
  }
  function goiDrive(lenh, duLieu) {
    var c = cauHinh();
    if (!c) return Promise.reject(new Error('Chưa cài Trạm Drive trên máy này.'));
    return post(c.url, { lenh: lenh, khoa: c.khoa, duLieu: duLieu }, 'Trạm Drive');
  }
  function goiBot(lenh, than) { than.lenh = lenh; return post(BOT_URL, than, 'Trạm bot'); }

  // Gửi: luôn gửi trạm bot; có Drive thì gửi thêm Drive. Thành công nếu ít nhất 1 đường được.
  async function gui(duLieu) {
    var kq = await Promise.allSettled([goiBot('tramGui', { khoa: khoaMay(), duLieu: duLieu }), cauHinh() ? goiDrive('gui', duLieu) : Promise.resolve(null)]);
    if (kq[0].status === 'fulfilled' || (kq[1].status === 'fulfilled' && kq[1].value)) return { ok: true, bot: kq[0].status === 'fulfilled' };
    throw kq[0].reason || kq[1].reason;
  }
  // Lấy: máy đã ghép bot → bot (gói chưa quá 2 tiếng); không có thì Drive (nếu cài).
  async function lay() {
    var t = theBot();
    if (t) {
      var j = await goiBot('tramLay', { the: t.the });
      if (j.duLieu || !cauHinh()) { if (!j.duLieu) j.ghiChu = 'Điện thoại chưa gửi gói nào trong 2 tiếng qua — trên điện thoại mở DataSnap, Quét cụm (hoặc bấm 💻 Gửi sang máy tính).'; return j; }
    }
    if (cauHinh()) return goiDrive('lay');
    throw new Error('Máy này chưa ghép với điện thoại — bấm ⚙ Ghép điện thoại, gõ mã 6 số hiện trên điện thoại.');
  }

  var NUT = 'margin-top:4px;padding:7px 12px;border:0;border-radius:7px;background:#0d9488;color:#fff;font-weight:700;cursor:pointer';
  var O = 'width:100%;margin:3px 0;padding:7px;border-radius:7px;border:1px solid #94a3b8;box-sizing:border-box';
  // Ô cài đặt dùng chung: chèn vào `noi`, gọi xong(true) khi ghép/lưu được.
  function veOCaiDat(noi, xong) {
    var t = theBot(), c = cauHinh() || { url: '', khoa: '' };
    var phanBot = TRONG_APP
      ? '<div style="font-size:13px;margin:4px 0"><b>Điện thoại này tự gửi số sang máy tính</b> sau mỗi lần quét (bot giữ 2 tiếng rồi tự xoá). ' +
        'Máy tính mới: bấm nút dưới, rồi gõ mã 6 số vào máy tính (ô <b>Ghép điện thoại</b> ở nv.html hoặc doc-so.html). Mỗi máy tính ghép 1 lần.</div>' +
        '<button type="button" data-r="ma" style="' + NUT + '">🔗 Lấy mã ghép máy tính</button> <span data-r="tbma" style="font-size:13px"></span>'
      : '<div style="font-size:13px;margin:4px 0">' + (t ? '✓ Máy này <b>đã ghép</b> với điện thoại. Bấm Lấy số là có gói mới nhất (trong 2 tiếng).' :
        'Trên điện thoại: DataSnap → trang Đọc số → <b>💻 Máy tính</b> → <b>🔗 Lấy mã ghép</b>. Gõ 6 số đó vào đây:') + '</div>' +
        '<input data-r="ghep" inputmode="numeric" maxlength="7" placeholder="Mã 6 số" style="' + O + ';max-width:160px;font-size:18px;letter-spacing:3px">' +
        ' <button type="button" data-r="nutghep" style="' + NUT + '">' + (t ? 'Ghép lại' : 'Ghép') + '</button> <span data-r="tbghep" style="font-size:13px"></span>';
    noi.innerHTML = phanBot +
      '<details style="margin-top:10px"><summary style="font-size:12px;cursor:pointer;opacity:.8">Nâng cao: Trạm Drive riêng' + (cauHinh() ? ' (đang cài)' : '') + '</summary>' +
      '<div style="font-size:12px;opacity:.8;margin:4px 0">Chỉ dành cho ai đã tự cài trạm trên Google Drive của mình. Không cần thì bỏ qua.</div>' +
      '<input data-r="url" placeholder="https://script.google.com/macros/s/…/exec" style="' + O + '">' +
      '<input data-r="khoa" type="password" placeholder="KHOA" style="' + O + '">' +
      '<button type="button" data-r="luu" style="' + NUT + '">Lưu &amp; thử kết nối</button> <span data-r="tb" style="font-size:12px"></span></details>';
    var q = function (r) { return noi.querySelector('[data-r="' + r + '"]'); };
    if (TRONG_APP) {
      q('ma').onclick = async function () {
        var tb = q('tbma'); tb.textContent = 'đang lấy mã…';
        try { var j = await goiBot('tramGhep', { khoa: khoaMay() }); tb.innerHTML = 'Mã: <b style="font-size:22px;letter-spacing:4px">' + j.ma + '</b> (dùng trong ' + j.phut + ' phút)'; }
        catch (e) { tb.textContent = '✗ ' + (e.message || e); }
      };
    } else {
      q('nutghep').onclick = async function () {
        var tb = q('tbghep'); tb.textContent = 'đang ghép…';
        try {
          var j = await goiBot('tramNhan', { ma: q('ghep').value });
          localStorage.setItem(K_BOT_THE, JSON.stringify({ the: j.the, luc: new Date().toISOString() }));
          tb.textContent = '✓ Đã ghép. Từ giờ bấm Lấy số là có gói mới nhất.';
          if (xong) xong(true);
        } catch (e) { tb.textContent = '✗ ' + (e.message || e); }
      };
    }
    q('url').value = c.url; q('khoa').value = c.khoa;
    q('luu').onclick = async function () {
      var tb = q('tb');
      try {
        luuCauHinh(q('url').value, q('khoa').value);
        tb.textContent = 'đang thử…';
        await goiDrive('lay');
        tb.textContent = '✓ Kết nối được';
        if (xong) xong(true);
      } catch (e) { tb.textContent = '✗ ' + (e.message || e); }
    };
  }

  /* Gói "dmxsnap-xuat/1" (doc-so 💻 Gửi sang máy tính): {goi:{realtime,luyke}, caiDat:{khoá localStorage: chuỗi}}.
   * Ghi vào máy này y như điện thoại (doc-so + nv.html cùng đọc), rồi đánh dấu máy này CHỈ XEM:
   * không gửi bot LINE (bot giữ khoá theo điện thoại, máy tính gửi sẽ bị từ chối). Trả về số kỳ đã ghi. */
  var K_XUAT = ['dmxsnap_quantam_v1', 'dmxsnap_nvphu_v1', 'dmxsnap_nganhqt_v1', 'dmxsnap_sao_v1', 'skn_goi_v1', 'skn_target_v1'];
  function ghiGoiXuat(x) {
    if (!x || x.dinhDang !== 'dmxsnap-xuat/1') return 0;
    var cu = {}; try { cu = JSON.parse(localStorage.getItem('dmxsnap_goi_v1') || '{}') || {}; } catch (e) {}
    var so = 0, g = x.goi || {};
    ['realtime', 'luyke'].forEach(function (k) { if (g[k] && g[k].dinhDang === 'dmxsnap/1' && Array.isArray(g[k].lan)) { cu[k] = g[k]; so++; } });
    if (!so) return 0;
    localStorage.setItem('dmxsnap_goi_v1', JSON.stringify(cu));
    var cd = x.caiDat || {};
    K_XUAT.forEach(function (k) { if (cd[k] != null) try { localStorage.setItem(k, cd[k]); } catch (e) {} });
    var bot = {}; try { bot = JSON.parse(localStorage.getItem('dmxsnap_bot_v1') || '{}') || {}; } catch (e) {}
    if (!TRONG_APP) { bot.tat = true; bot.chiXem = true; }   // điện thoại trong app luôn là máy gửi bot
    bot.dau = ['realtime', 'luyke'].map(function (k) { return cu[k] ? cu[k].luc : ''; }).join('|');
    localStorage.setItem('dmxsnap_bot_v1', JSON.stringify(bot));
    return so;
  }

  window.DriveRelay = {
    K_XUAT: K_XUAT,
    ghiGoiXuat: ghiGoiXuat,
    // Điện thoại trong app: luôn gửi được (trạm bot). Máy tính: đã ghép bot hoặc đã cài Drive.
    daCai: function () { return TRONG_APP || !!theBot() || !!cauHinh(); },
    daGhep: function () { return !!theBot(); },
    coDrive: function () { return !!cauHinh(); },
    veOCaiDat: veOCaiDat,
    gui: gui,
    lay: lay,
    xoa: function () { return Promise.resolve({ ok: true }); }
  };
})();
