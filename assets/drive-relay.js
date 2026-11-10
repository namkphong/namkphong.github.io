/* Trạm Drive — chuyển gói số từ điện thoại (nhap-so.html) sang máy tính (nv.html)
 * qua Apps Script drive_relay.gs. Mỗi máy nhớ URL trạm + khoá trong localStorage
 * (KHÔNG ghi vào repo vì trang công khai). Gửi bằng POST text/plain để không bị
 * preflight CORS, khoá nằm trong thân request chứ không trên URL. */
(function () {
  'use strict';
  var KEY = 'dmx_drive_relay_v1';

  function cauHinh() {
    try { var c = JSON.parse(localStorage.getItem(KEY) || 'null'); return c && c.url && c.khoa ? c : null; }
    catch (e) { return null; }
  }
  function luuCauHinh(url, khoa) {
    url = String(url || '').trim(); khoa = String(khoa || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url))
      throw new Error('URL phải có dạng https://script.google.com/macros/s/…/exec');
    if (khoa.length < 8) throw new Error('Khoá quá ngắn (ít nhất 8 ký tự).');
    localStorage.setItem(KEY, JSON.stringify({ url: url, khoa: khoa }));
  }

  async function goi(lenh, duLieu) {
    var c = cauHinh();
    if (!c) throw new Error('Chưa cài Trạm Drive trên máy này (bấm ⚙ Trạm Drive).');
    var r = await fetch(c.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ lenh: lenh, khoa: c.khoa, duLieu: duLieu })
    });
    if (!r.ok) throw new Error('Trạm Drive trả HTTP ' + r.status);
    var j = await r.json();
    if (!j.ok) throw new Error(j.loi || 'Trạm Drive báo lỗi.');
    return j;
  }

  // Ô cài đặt dùng chung: chèn vào phần tử `noi`, gọi xong(true) khi lưu được.
  function veOCaiDat(noi, xong) {
    var c = cauHinh() || { url: '', khoa: '' };
    noi.innerHTML =
      '<div style="font-size:12px;opacity:.8;margin:4px 0">Dán URL ứng dụng web (…/exec) và KHOA đã đặt trong Apps Script. Mỗi máy cài 1 lần.</div>' +
      '<input data-r="url" placeholder="https://script.google.com/macros/s/…/exec" style="width:100%;margin:3px 0;padding:7px;border-radius:7px;border:1px solid #94a3b8;box-sizing:border-box">' +
      '<input data-r="khoa" type="password" placeholder="KHOA" style="width:100%;margin:3px 0;padding:7px;border-radius:7px;border:1px solid #94a3b8;box-sizing:border-box">' +
      '<button type="button" data-r="luu" style="margin-top:4px;padding:7px 12px;border:0;border-radius:7px;background:#0d9488;color:#fff;font-weight:700;cursor:pointer">Lưu &amp; thử kết nối</button>' +
      ' <span data-r="tb" style="font-size:12px"></span>';
    noi.querySelector('[data-r="url"]').value = c.url;
    noi.querySelector('[data-r="khoa"]').value = c.khoa;
    noi.querySelector('[data-r="luu"]').onclick = async function () {
      var tb = noi.querySelector('[data-r="tb"]');
      try {
        luuCauHinh(noi.querySelector('[data-r="url"]').value, noi.querySelector('[data-r="khoa"]').value);
        tb.textContent = 'đang thử…';
        await goi('lay');                       // chỉ đọc, không xoá — để kiểm khoá đúng
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
    bot.tat = true; bot.chiXem = true;
    bot.dau = ['realtime', 'luyke'].map(function (k) { return cu[k] ? cu[k].luc : ''; }).join('|');
    localStorage.setItem('dmxsnap_bot_v1', JSON.stringify(bot));
    return so;
  }

  window.DriveRelay = {
    K_XUAT: K_XUAT,
    ghiGoiXuat: ghiGoiXuat,
    daCai: function () { return !!cauHinh(); },
    veOCaiDat: veOCaiDat,
    gui: function (duLieu) { return goi('gui', duLieu); },
    lay: function () { return goi('lay'); },
    xoa: function () { return goi('xoa'); }
  };
})();
