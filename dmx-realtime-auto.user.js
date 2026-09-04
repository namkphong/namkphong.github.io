// ==UserScript==
// @name         DMX — Realtime tự động (Supabase + hẹn giờ + cảnh báo Telegram)
// @namespace    namkphong.github.io
// @version      0.35.2
// @description  Tự xuất excel N siêu thị từ dashboard 77 → tạo ảnh doanh thu → đẩy Supabase; hẹn giờ mỗi 10 phút CHỈ trong 8–22h; nhật ký gộp cả chu kỳ; phát hiện đăng xuất MWG → gửi cảnh báo Telegram. Dùng chung cho nhiều cụm (site_code, cấu hình lưu trên Supabase — xem dmx.user.js). TỪ 0.23.0: BỎ HẲN phần cào BI (bi.thegioididong.com đã ngừng hoạt động) — chỉ còn nguồn duy nhất là report 77.
// @match        https://report.mwgroup.vn/*
// @match        https://namkphong.github.io/realtimenv.html*
// @match        https://namkphong.github.io/naplichsu.html*
// @match        https://baocao.dienmayxanh.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      cdnv2.tgdd.vn
// @connect      api.telegram.org
// @connect      kyyoihvcsrnmylnmbcis.supabase.co
// @require      https://namkphong.github.io/dmx-cluster-shared.js
// @updateURL    https://namkphong.github.io/dmx-realtime-auto.user.js
// @downloadURL  https://namkphong.github.io/dmx-realtime-auto.user.js
// ==/UserScript==

(function () {
  'use strict';
  var NGAT = String.fromCharCode(10) + String.fromCharCode(10);

  var VER = '0.35.2';
  var W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  var JOB = 'dmx_auto_job_v1';
  // Số ngày lùi lại khi đặt khoảng ngày xuất ở dashboard 77.
  //
  // Doanh thu tính theo NGÀY XUẤT HÀNG, mà đơn có thể lên từ trước rồi mới xuất
  // (hàng đặt, chờ về, giao lắp...). Cửa sổ càng rộng càng ít bỏ sót nhóm "lên
  // đơn tháng trước, xuất tháng này" — nhưng càng rộng thì report càng lâu ra
  // file, mà chuỗi này chạy lại MỖI 10 PHÚT.
  //
  // Nên chia hai loại cữ:
  //   · cữ THƯỜNG 14 ngày — nhanh, đủ cho số trong ngày và mấy ngày gần đây;
  //   · cữ QUÉT SÂU 30 ngày — thưa hơn, để nhặt hai thứ mà cữ thường không thấy:
  //       (a) đơn lên từ lâu nay mới xuất,
  //       (b) đơn cũ BỊ NHẬP TRẢ — dòng đã trả chỉ biến mất khỏi file xuất,
  //           không có dòng âm nào báo, nên phải quét lại mới dọn được.
  //
  // 30 ngày vẫn KHÔNG cứu được đơn trả của hàng bán trên 30 ngày — cái đó
  // baocao ghi thành số âm và không cách nào dò từ ycx_lines. Xem mục
  // cuaSo21Ngay trong phan-tich/bang-gan-*.json.
  var SO_NGAY_THUONG = 14;
  var SO_NGAY_SAU = 30;
  var GIO_GIUA_HAI_CU_SAU = 3;              // ~5-8 cữ sâu mỗi ngày
  var K_CU_SAU = 'dmx_auto_cu_sau_v1';

  // Hẹn theo ĐỒNG HỒ chứ không đếm số lượt: lượt chạy có thể đứt giữa chừng,
  // trình duyệt tải lại, máy ngủ — đếm lượt là cữ sâu thưa hẳn đi mà không ai
  // biết. Theo đồng hồ thì dù chuỗi có đứt bao nhiêu lần, cứ quá hạn là quét.
  function denCuSau() {
    try { return (Date.now() - (+localStorage.getItem(K_CU_SAU) || 0)) > GIO_GIUA_HAI_CU_SAU * 3600e3; }
    catch (e) { return true; }              // không đọc được thì quét sâu, thà chậm còn hơn sót
  }
  function danhDauCuSau() { try { localStorage.setItem(K_CU_SAU, String(Date.now())); } catch (e) {} }
  var DONE_STATUS = 'Đã xuất xong, có thể tải file';
  var RT_URL = 'https://namkphong.github.io/realtimenv.html';
  var NLS_URL = 'https://namkphong.github.io/naplichsu.html';
  var MD_URL = 'https://report.mwgroup.vn/ManagerDownload';
  var D77_URL = 'https://report.mwgroup.vn/home/dashboard/77';

  /* ------------------------------------------------------------------
     ĐÃ BỎ PHẦN BI (từ 0.23.0)
     bi.thegioididong.com đã ngừng hoạt động, nên chuỗi cũ
       … → render → bi1 (Ô1 ngành hàng) → bi2 (Ô2 doanh thu tổng) → rt
     luôn chết ở bi1 và KHÔNG BAO GIỜ tới được bước đẩy ảnh, đồng thời treo
     luôn cả phần đã chạy xong trước đó. Nay chuỗi kết thúc ngay sau render.
     HỆ QUẢ: ảnh Realtime (rt_<mã>.jpg — lệnh /số của bot LINE) KHÔNG còn được
     cập nhật, vì Ô1/Ô2 chỉ có ở BI. Ảnh doanh thu từng siêu thị (<mã>.jpg) thì
     VẪN chạy bình thường vì lấy từ report 77.
     ------------------------------------------------------------------ */
  var STORES = [];
  function storeByKey(k) { for (var i = 0; i < STORES.length; i++) if (STORES[i].key === k) return STORES[i]; return null; }

  var SITE_CODE_KEY = 'dmx_site_code';
  function getSiteCode() { return GM_getValue(SITE_CODE_KEY, ''); }
  function setSiteCode(c) { GM_setValue(SITE_CODE_KEY, c); }
  // Cho CHỌN trong danh sách cụm đã có (gõ số) thay vì bắt gõ lại nguyên mã —
  // gõ tay mã có dấu tiếng Việt là nguồn lỗi chính khi dùng nhiều origin.
  async function changeSiteCode() {
    var cur = getSiteCode();
    var site = await DMXCluster.askSiteCode('(đang dùng: "' + cur + '")');
    if (!site || site === cur) return;
    setSiteCode(site);
    window.alert('Đã đổi mã cụm sang "' + site + '" — tải lại trang để áp dụng.');
  }

  // Chạy 1 lần lúc khởi động, TRƯỚC mọi điều hướng/panel khác (xem cuối file).
  // Vẫn gọi apDungDauHieu() để DUY TRÌ cấu hình cụm dùng chung (mã MWG từng siêu
  // thị — script giờ công cần) dù bản thân script này không còn đụng tới BI.
  async function ensureClusterConfig() {
    // KHÔNG gọi pickSiteCode() nữa. Với máy chưa có gì, hàm đó bật hộp thoại
    // "Mã cụm (site code) của bạn — GÕ SỐ để chọn cụm đã có: 1 = Cụm 1473…".
    // Quản lý mới không biết mã cụm là gì, lại bị mời chọn cụm của NGƯỜI KHÁC —
    // chọn nhầm là ảnh của họ đè lên cụm khác. Đã gặp thật bên script lấy số.
    //
    // Thay bằng: mã đang lưu -> nhận qua DẤU HIỆU (mã nhân viên đã ghi trong
    // cấu hình, do script lấy số ghi vào). Không ra thì chỉ đường rõ ràng chứ
    // không đưa danh sách cụm ra cho chọn bừa.
    var site = getSiteCode();
    var config = null;
    if (site) { try { config = await DMXCluster.fetchConfig(site); } catch (e) {} }

    var got = { code: site, config: config, mwgUser: '', clusterId: '' };
    if (!config) {
      var ev = null;
      try { ev = await DMXCluster.findClusterByEvidence(); } catch (e) {}
      if (ev && ev.code) {
        site = ev.code; config = ev.config; got = ev;
        console.info('[dmx-auto] Nhận ra cụm "' + site + '" qua ' + ev.vi);
      }
    }
    try { got.mwgUser = got.mwgUser || String(DMXCluster.detectMwgUser() || ''); } catch (e) {}

    if (!site || !config || !config.stores || !config.stores.length) {
      // NÓI RÕ HỎNG Ở ĐÂU. Hai nguyên nhân này cần hai cách xử lý khác hẳn nhau,
      // mà thông báo cũ gộp chung nên người dùng chạy ⚡ lại lần nữa vẫn hỏng.
      //   · không dò ra mã nhân viên -> lỗi phía script/trang (đã gặp: tài khoản
      //     nằm trong thẻ có thẻ con nên hàm dò bỏ qua — vá ở 0.25.0);
      //   · dò ra mã nhưng chưa cụm nào khai mã đó -> chưa chạy ⚡ lần nào, hoặc
      //     chạy bằng tài khoản MWG khác.
      var loi;
      if (!got.mwgUser) {
        loi = 'Không đọc được mã nhân viên trên trang này.\n\n' +
              'Kiểm tra góc trên bên phải có hiện "<mã> - <tên>" không. Có mà vẫn báo lỗi ' +
              'thì là lỗi script: mở Tampermonkey, bấm cập nhật script "DMX Realtime Auto" ' +
              'lên bản mới nhất rồi tải lại trang.';
      } else {
        loi = 'Đọc được mã nhân viên ' + got.mwgUser + ' nhưng chưa cụm nào khai mã này.\n\n' +
              'Mở baocao.dienmayxanh.com, bấm nút 📦 rồi bấm "⚡ Chạy cả chuỗi" MỘT LẦN — ' +
              'cụm sẽ tự tạo và ghi mã của bạn vào đó. Xong quay lại trang này và tải lại.\n\n' +
              'Lưu ý: phải chạy ⚡ bằng CHÍNH tài khoản MWG này (' + got.mwgUser + ').';
      }
      throw new Error('Chưa nhận ra cụm của bạn.\n\n' + loi +
        '\n\n(Vẫn không được: bấm "⚙ Đổi mã cụm" để chọn tay.)');
    }
    if (site !== getSiteCode()) setSiteCode(site);
    var changed = false;
    // Vẫn gọi để DUY TRÌ cấu hình cụm dùng chung (mã MWG từng siêu thị — script
    // giờ công cần). Script này không còn đọc được ô #selectRSM (không chạy trên
    // BI nữa), nhưng dmx.user.js vẫn điền hộ nên cấu hình không bị thiếu.
    if (DMXCluster.apDungDauHieu(config, got)) changed = true;
    if (got.nguoiLa) {
      // Không tự ghi mã người lạ vào cụm của người khác. Nói ra chứ không im
      // lặng: im lặng thì cụm này lẳng lặng nuốt mã của cụm kia (04/09/2026).
      throw new Error(
        'Mã nhân viên ' + got.mwgUser + ' không thuộc cụm "' + site + '" đang lưu trên máy này.' +
        NGAT + 'Nếu đây là máy của người khác thì ĐỪNG chạy tiếp — số sẽ đổ vào cụm của họ.' +
        NGAT + 'Nếu đúng là cụm của bạn: mở baocao.dienmayxanh.com, bấm 📦 rồi "⚡ Chạy cả chuỗi" ' +
        'MỘT LẦN bằng chính tài khoản này để được ghi tên vào cụm, xong quay lại đây.');
    }
    if (changed) { try { await DMXCluster.saveConfig(site, config); } catch (e) { console.warn('[dmx-auto] Lưu cấu hình cụm lỗi:', e); } }

    STORES = config.stores.map(function (s) { return { key: s.key, name: s.name, code: s.mwgCode }; });
  }

  // Hẹn giờ: chạy mỗi INTERVAL_MIN phút (kể từ lần chạy xong gần nhất) khi BẬT.
  // Cần giữ tab dashboard 77 mở.
  var SCHED_ON = 'dmx_sched_on', LAST_RUN = 'dmx_last_run';
  var INTERVAL_MIN = 10;
  var WORK_START = 8, WORK_END = 22; // chỉ chạy + cảnh báo trong 8–22h
  var TG_TOKEN = 'dmx_tg_token', TG_CHAT = 'dmx_tg_chat', TG_LAST = 'dmx_tg_last';

  function inWorkHours() { var h = new Date().getHours(); return h >= WORK_START && h < WORK_END; }

  // Gửi cảnh báo Telegram. Token/chat lưu trong Violentmonkey của MÁY (không nằm
  // trong mã nguồn công khai). Giới hạn 1 tin / 15 phút để khỏi spam.
  function tgAlert(text, force) {
    var token = GM_getValue(TG_TOKEN, ''), chat = GM_getValue(TG_CHAT, '');
    if (!token || !chat) return false;
    if (!force && Date.now() - GM_getValue(TG_LAST, 0) < 15 * 60 * 1000) return false;
    GM_setValue(TG_LAST, Date.now());
    GM_xmlhttpRequest({
      method: 'POST', url: 'https://api.telegram.org/bot' + token + '/sendMessage',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ chat_id: chat, text: text }),
      onload: function () {}, onerror: function () {}
    });
    return true;
  }

  // Trang report.mwgroup.vn KHÁC dashboard/ManagerDownload: có ô mật khẩu → đã văng
  // ra đăng nhập → cảnh báo Telegram + banner + bỏ job kẹt (để sau đăng nhập chạy lại).
  function maybeLoggedOut() {
    setTimeout(function () {
      if (!document.querySelector('input[type=password]')) return;
      GM_deleteValue(JOB);
      if (GM_getValue(SCHED_ON, false) && inWorkHours()) {
        tgAlert('⚠️ MWG ĐĂNG XUẤT (cụm ' + getSiteCode() + ') lúc ' + new Date().toLocaleTimeString('vi') +
                '.\nRemote vào laptop đăng nhập lại để DMX chạy tiếp.');
      }
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;z-index:2147483647;background:#dc2626;color:#fff;padding:12px;border-radius:10px;font:14px sans-serif;text-align:center';
      d.textContent = '⚠️ MWG đã đăng xuất — đăng nhập lại để DMX chạy tiếp.';
      document.body.appendChild(d);
    }, 4000);
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function waitFor(fn, timeout, step) {
    timeout = timeout || 20000; step = step || 400; var t0 = Date.now();
    for (;;) { var v; try { v = fn(); } catch (e) { v = null; } if (v) return v; if (Date.now() - t0 > timeout) return null; await sleep(step); }
  }
  function abToB64(buf) { var b = new Uint8Array(buf), s = '', C = 0x8000; for (var i = 0; i < b.length; i += C) s += String.fromCharCode.apply(null, b.subarray(i, i + C)); return btoa(s); }
  function b64ToBytes(b64) { var bin = atob(b64), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function parseVNDateTime(s) { var m = (s || '').match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/); return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime() : null; }
  function jobGet() { return GM_getValue(JOB, null); }
  function jobSet(j) { GM_setValue(JOB, j); }
  function jobClear() { GM_deleteValue(JOB); }

  // Nhật ký GỘP cả chu kỳ — CẢ chuỗi (report.mwgroup.vn → namkphong.github.io →
  // bi.thegioididong.com → …) đi qua nhiều gốc (origin) khác nhau, mỗi trang chỉ
  // có panel/log RIÊNG của trang đó nên bắt kịp đúng lúc lỗi để chụp màn hình rất
  // khó. Dùng GM storage (KHÔNG phải localStorage) vì nó dùng chung được xuyên
  // suốt mọi origin — y hệt cách "job" đã hoạt động. Mỗi dòng ui.log() ở BẤT KỲ
  // panel nào cũng tự động góp vào đây, kèm tên panel + giờ, để xem lại được
  // toàn bộ tiến trình sau khi lỗi xảy ra, khỏi phải chụp đúng khoảnh khắc.
  var LOGALL = 'dmx_auto_logall_v1';
  function logAllGet() { return GM_getValue(LOGALL, []); }
  function logAllClear() { GM_deleteValue(LOGALL); }
  function logAllPush(tag, m) {
    var arr = logAllGet();
    arr.push(new Date().toLocaleTimeString('vi-VN') + '  [' + tag + ']  ' + m);
    if (arr.length > 500) arr = arr.slice(-500);
    GM_setValue(LOGALL, arr);
  }

  function makePanel(title) {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:10px;z-index:2147483647;background:#0b1220;color:#e6f6ff;border:1px solid #2dd4ff;border-radius:12px;padding:12px;font:13px/1.45 sans-serif;max-height:80vh;overflow:auto';
    var bubble = document.createElement('div');
    bubble.textContent = 'DMX';
    bubble.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;display:none;width:52px;height:52px;border-radius:50%;background:#0b1220;border:2px solid #2dd4ff;color:#2dd4ff;align-items:center;justify-content:center;font:700 13px monospace;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.5)';
    bubble.onclick = function () { box.style.display = 'block'; bubble.style.display = 'none'; };
    var x = document.createElement('span'); x.textContent = '✕'; x.title = 'Ẩn';
    x.style.cssText = 'float:right;cursor:pointer;color:#8fb6cc;font-size:18px;line-height:1;padding:0 2px;margin-left:8px';
    x.onclick = function () { box.style.display = 'none'; bubble.style.display = 'flex'; };
    box.appendChild(x);
    var h = document.createElement('b'); h.style.color = '#2dd4ff'; h.textContent = title + ' · v' + VER; box.appendChild(h);
    var link = document.createElement('a');
    link.href = 'https://namkphong.github.io/cai-realtime.html';
    link.target = '_blank';
    link.textContent = '⚙ Cài / cập nhật script';
    link.style.cssText = 'display:block;margin-top:6px;font-size:11px;color:#8fb6cc;text-decoration:underline';
    box.appendChild(link);

    // Bảng cập nhật CHO MỌI SCRIPT, không riêng script đang chạy.
    // Lý do: mỗi script chỉ @match trang của nó, nên menu Violentmonkey trên
    // dashboard 77 chỉ hiện đúng 1 script — muốn nâng dmx-line-publish (chỉ
    // chạy ở realtimenv.html) thì phải mò sang trang khác. Người dùng báo khó
    // cập nhật lên 2.8.0 vì đúng chuyện này (04/09/2026).
    var oBan = document.createElement('div');
    oBan.style.cssText = 'margin-top:6px;font-size:11px;line-height:1.7;color:#8fb6cc';
    oBan.textContent = 'Đang đọc bản mới nhất…';
    box.appendChild(oBan);
    (function () {
      var DS = [
        { ten: 'Lấy số hằng ngày', f: 'dmx-thu-baocao.user.js' },
        { ten: 'Realtime tự động', f: 'dmx-realtime-auto.user.js', dangChay: VER },
        { ten: 'Đẩy ảnh / Đẩy DB', f: 'dmx-line-publish.user.js' },
        { ten: 'Giờ công', f: 'dmx-gio-cong.user.js' }
      ];
      Promise.all(DS.map(function (s) {
        return fetch('https://namkphong.github.io/' + s.f + '?t=' + Date.now(), { cache: 'no-store' })
          .then(function (r) { return r.text(); })
          .then(function (t) { s.moi = (t.match(/@version\s+([\d.]+)/) || [])[1] || '?'; })
          .catch(function () { s.moi = '?'; });
      })).then(function () {
        oBan.textContent = '';
        var tieu = document.createElement('div');
        tieu.style.cssText = 'color:#cbd5e1;font-weight:700';
        tieu.textContent = 'Cập nhật script (bấm để cài bản mới):';
        oBan.appendChild(tieu);
        DS.forEach(function (s) {
          var a = document.createElement('a');
          a.href = 'https://namkphong.github.io/' + s.f;
          a.target = '_blank';
          var lech = s.dangChay && s.dangChay !== s.moi;
          a.textContent = (lech ? '⚠ ' : '• ') + s.ten + ' — v' + s.moi +
            (s.dangChay ? (lech ? ' (đang chạy ' + s.dangChay + ')' : ' (đang chạy, đã mới nhất)') : '');
          a.style.cssText = 'display:block;text-decoration:underline;color:' +
            (lech ? '#fca5a5' : '#8fb6cc');
          oBan.appendChild(a);
        });
      });
    })();
    var copyBtn = document.createElement('a');
    copyBtn.href = '#';
    copyBtn.textContent = '📋 Chép nhật ký CẢ CHU KỲ (mọi trang)';
    copyBtn.style.cssText = 'display:block;margin-top:4px;font-size:11px;color:#3bf07a;text-decoration:underline';
    copyBtn.onclick = function (ev) {
      ev.preventDefault();
      var text = logAllGet().join('\n') || '(chưa có gì)';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { api.log('Đã chép nhật ký cả chu kỳ.'); },
                                                   function () { window.prompt('Chép tay:', text); });
      } else { window.prompt('Chép tay:', text); }
    };
    box.appendChild(copyBtn);
    var log = document.createElement('div');
    log.style.cssText = 'background:#000;color:#3bf07a;font:11px/1.5 monospace;padding:8px;border-radius:6px;margin-top:8px;height:150px;overflow:auto;white-space:pre-wrap;word-break:break-word';
    document.body.appendChild(box); document.body.appendChild(bubble);
    var api = {
      log: function (m) {
        log.textContent += m + '\n'; log.scrollTop = log.scrollHeight;
        try { console.log('[dmx-auto] ' + m); } catch (e) {}
        logAllPush(title, m);
      },
      btn: function (label, bg, fn) {
        var b = document.createElement('button'); b.textContent = label;
        b.style.cssText = 'display:block;width:100%;margin:6px 0;padding:11px;border:0;border-radius:8px;font-weight:bold;color:#fff;background:' + bg;
        b.onclick = function () { b.disabled = true; Promise.resolve().then(fn).catch(function (e) { api.log('✗ ' + (e.message || e)); }).then(function () { b.disabled = false; }); };
        box.appendChild(b); return b;
      },
      attach: function () { box.appendChild(log); }
    };
    return api;
  }

  /* ================================================================== */
  /* DASHBOARD 77                                                       */
  /* ================================================================== */
  function dashboard77() {
    var ui = makePanel('DMX Auto · Dashboard 77');

    async function setDates(log) {
      var $ = W.jQuery; if (!$) throw new Error('jQuery chưa sẵn sàng.');
      var dps = [];
      $('input').each(function (i, el) { var k; try { k = $(el).data('kendoDatePicker'); } catch (e) {} if (k) { var r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) dps.push({ el: el, k: k }); } });
      if (dps.length < 2) throw new Error('Chỉ thấy ' + dps.length + ' ô ngày (cần 2).');
      // Chế độ NẠP LỊCH SỬ truyền thẳng khoảng ngày của tháng cần bổ sung; chế
      // độ thường thì tính cửa sổ lùi như cũ.
      var jobD = jobGet();
      var coDinh = (jobD && jobD.mode === 'lichsu' && jobD.dsThang && jobD.dsThang[jobD.ti || 0]) || null;
      var sau = false, soNgay = 0, from, to;
      if (coDinh) {
        from = new Date(coDinh.tu + 'T00:00:00'); to = new Date(coDinh.den + 'T00:00:00');
      } else {
        sau = denCuSau();
        soNgay = sau ? SO_NGAY_SAU : SO_NGAY_THUONG;
        to = new Date(); to.setHours(0, 0, 0, 0);
        from = new Date(); from.setDate(from.getDate() - soNgay); from.setHours(0, 0, 0, 0);
      }
      dps[0].k.value(from); dps[0].k.trigger('change');
      dps[1].k.value(to); dps[1].k.trigger('change');
      [dps[0].el, dps[1].el].forEach(function (el) { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
      // Đánh dấu NGAY khi đặt xong ngày, không chờ hết chuỗi: chuỗi đứt ở khâu
      // sau thì cũng chỉ mất một cữ sâu, còn hơn là mỗi lần đứt lại quét sâu
      // lại từ đầu — 30 ngày mà lặp liên tục thì report nghẽn.
      if (sau) danhDauCuSau();
      log('Đặt ngày: ' + from.toLocaleDateString('vi') + ' → ' + to.toLocaleDateString('vi') +
        (coDinh ? '  (NẠP LỊCH SỬ ' + coDinh.nhan + ')'
                : '  (' + soNgay + ' ngày' + (sau ? ' — CỮ QUÉT SÂU, nhặt đơn cũ và đơn bị trả' : '') + ')'));
      await sleep(300);
    }

    function setKhoTao(log) {
      var $ = W.jQuery, found = null, val = null;
      $('input, .k-widget, [data-role]').each(function (i, el) {
        if (found) return;
        var dd; try { dd = $(el).data('kendoComboBox'); } catch (e) {}
        if (!dd || !dd.dataSource) return;
        var data; try { data = dd.dataSource.data(); } catch (e) { return; }
        for (var k = 0; k < data.length; k++) { if (/^\s*kho tạo\s*$/i.test((data[k].Title || data[k].text || '') + '')) { found = dd; val = (data[k].Value != null ? data[k].Value : data[k].value); break; } }
      });
      if (!found) throw new Error('Không tìm được combobox "Kho tạo".');
      try { found.select(function (d) { return /^\s*kho tạo\s*$/i.test((d.Title || d.text || '') + ''); }); } catch (e) {}
      if (!found.value()) { try { found.value(String(val)); } catch (e) {} }
      found.trigger('change');
      log('Đã chọn Tìm theo = Kho tạo (value=' + found.value() + ').');
    }

    async function selectStore(store, log) {
      var $ = W.jQuery;
      var cands = [];
      [].slice.call(document.querySelectorAll('body *')).forEach(function (s) {
        if (s.closest && s.closest('.k-window')) return;
        if (s.tagName === 'INPUT' || s.tagName === 'TEXTAREA') { if (/siêu thị được chọn/i.test(s.value || '')) cands.push(s); return; }
        var own = ''; for (var n = 0; n < s.childNodes.length; n++) { if (s.childNodes[n].nodeType === 3) own += s.childNodes[n].nodeValue; }
        if (/siêu thị được chọn/i.test(own)) cands.push(s);
      });
      cands.sort(function (a, b) { return (a.textContent || a.value || '').length - (b.textContent || b.value || '').length; });
      var el = cands[0];
      if (!el) throw new Error('Không thấy ô "... Siêu thị được chọn" (ngoài modal).');

      function findModal() { return [].slice.call(document.querySelectorAll('.k-window')).filter(function (w) { var r = w.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (/chọn siêu thị/i.test(w.textContent || '') || w.querySelector('input.filterText')); })[0]; }
      var win = findModal();
      if (!win) { var cs = [el], p = el; for (var ci = 0; ci < 5 && p; ci++) { p = p.parentElement; if (p) cs.push(p); } for (var c = 0; c < cs.length && !win; c++) { cs[c].click(); win = await waitFor(findModal, 2500, 300); } }
      if (!win) throw new Error('Modal "Chọn siêu thị" không mở.');
      await sleep(500);

      // Bỏ chọn siêu thị cũ TRƯỚC (bắt buộc, tránh xuất gộp nhiều siêu thị).
      var treeEl = win.querySelector('.jstree'), tree = null;
      try { tree = $.jstree.reference(treeEl); } catch (e) {}
      if (tree) { try { tree.deselect_all(); } catch (e) {} }

      // store.code (mã MWG) có thể CHƯA có (đang chờ dmx-gio-cong.user.js tự dò) —
      // vẫn tìm được bằng tên, chỉ là kém chắc chắn hơn nếu trùng tên với siêu thị khác.
      var ftext = win.querySelector('input.filterText, input[placeholder*="Tìm kiếm siêu thị"]');
      if (ftext) { ftext.value = store.code || store.name; ['input', 'keyup', 'change'].forEach(function (ev) { ftext.dispatchEvent(new Event(ev, { bubbles: true })); }); await sleep(1500); }
      var anchor = await waitFor(function () { return [].slice.call(win.querySelectorAll('a.jstree-anchor')).filter(function (a) { var t = a.textContent || ''; return (!store.code || t.indexOf(store.code) !== -1) && new RegExp(esc(store.name), 'i').test(t); })[0]; }, 8000);
      if (!anchor) throw new Error('Không thấy "' + store.name + '"' + (store.code ? ' (mã ' + store.code + ')' : '') + ' trong cây.');
      if (tree) { try { tree.select_node(anchor.id.replace(/_anchor$/, '')); } catch (e) { anchor.click(); } } else anchor.click();
      await sleep(700);
      var sel = '?'; if (tree) { try { sel = tree.get_selected().length; } catch (e) {} }
      log('Đã chọn ' + store.name + ' (đang chọn: ' + sel + ').');
      var xong = [].slice.call(win.querySelectorAll('button,a,span,div')).filter(function (b) { return /^\s*xong\s*$/i.test(b.textContent || ''); })[0];
      if (!xong) throw new Error('Không thấy nút Xong.');
      xong.click();
      await sleep(900);
    }

    function clickXuatExcel(log) {
      var b = [].slice.call(document.querySelectorAll('button')).filter(function (x) { return /xuất excel/i.test((x.textContent || '').trim()) && /btn-success/.test(x.className || ''); })[0]
           || [].slice.call(document.querySelectorAll('button,a')).filter(function (x) { return /^\s*xuất excel\s*$/i.test((x.textContent || '').trim()); })[0];
      if (!b) throw new Error('Không thấy nút "Xuất excel".');
      b.click(); log('✓ Đã bấm Xuất excel.');
    }

    async function doExport(store, log) {
      log('--- ' + store.name + ' ---');
      await setDates(log);
      setKhoTao(log);
      await selectStore(store, log);
      await sleep(400);
      clickXuatExcel(log);
    }

    async function runAuto() {
      var job = jobGet();
      if (!job || (job.mode !== 'auto' && job.mode !== 'lichsu') || job.phase !== 'export') return;
      if (++job.hops > 40) { jobClear(); ui.log('✗ Quá nhiều bước, dừng.'); return; }
      jobSet(job);
      ui.log('=== Xuất excel cho ' + job.queue.length + ' siêu thị' +
        (job.mode === 'lichsu' ? ' · NẠP LỊCH SỬ ' + job.dsThang[job.ti || 0].nhan +
          ' (tháng ' + ((job.ti || 0) + 1) + '/' + job.dsThang.length + ')' : '') + ' ===');
      try {
        for (var i = 0; i < job.queue.length; i++) {
          await doExport(storeByKey(job.queue[i]), ui.log);
          await sleep(3500); // chờ lệnh xuất ghi nhận trước khi làm siêu thị kế
        }
      } catch (e) { ui.log('✗ ' + (e.message || e)); ui.log('Đã dừng. Sửa xong bấm lại.'); jobClear(); return; }
      job.phase = 'download'; job.exportAt = Date.now(); job.files = []; job.i = 0; job.dlTry = 0; jobSet(job);
      ui.log('→ Đã xuất cả ' + job.queue.length + '. Sang ManagerDownload…');
      await sleep(1500);
      location.href = MD_URL;
    }

    var maCacKey = STORES.map(function (s) { return s.key; });
    ui.btn('▶ Chạy tất cả (xuất ' + maCacKey.length + ' ST trước, tự động)', '#16a34a', function () {
      logAllClear();
      jobSet({ mode: 'auto', queue: maCacKey.slice(), phase: 'export', exportAt: 0, files: [], i: 0, dlTry: 0, hops: 0 });
      ui.log('=== BẮT ĐẦU · trang sẽ tự chuyển/tải lại nhiều lần, cứ để yên ===');
      return runAuto();
    });
    STORES.forEach(function (s) {
      ui.btn('Thử điền form + Xuất: ' + s.name, '#1d4ed8', function () { return doExport(storeByKey(s.key), ui.log); });
    });
    ui.btn('Dừng tự động', '#475569', function () { jobClear(); ui.log('Đã dừng.'); });
    ui.btn('⚙ Đổi mã cụm (site code)', '#334155', changeSiteCode);
    ui.btn('⚙ Cài Telegram cảnh báo', '#334155', function () {
      var tk = (window.prompt('Telegram BOT token (dạng 123456:ABC...):', GM_getValue(TG_TOKEN, '')) || '').trim();
      if (tk) GM_setValue(TG_TOKEN, tk);
      var ch = (window.prompt('Chat ID của bạn:', GM_getValue(TG_CHAT, '')) || '').trim();
      if (ch) GM_setValue(TG_CHAT, ch);
      if (tgAlert('✅ DMX: cảnh báo Telegram đã cài (tin test).', true)) ui.log('Đã gửi tin test — kiểm Telegram.');
      else ui.log('Chưa đủ token/chat.');
    });
    var schedBtn = ui.btn('', '#7c3aed', function () { GM_setValue(SCHED_ON, !GM_getValue(SCHED_ON, false)); updateSchedBtn(); ui.log('Tự chạy: ' + (GM_getValue(SCHED_ON, false) ? 'BẬT' : 'TẮT')); });
    function updateSchedBtn() { schedBtn.textContent = '⏰ Tự chạy mỗi ' + INTERVAL_MIN + ' phút: ' + (GM_getValue(SCHED_ON, false) ? 'BẬT — bấm để TẮT' : 'TẮT — bấm để BẬT'); }
    updateSchedBtn();
    ui.attach();

    // --- Bộ hẹn giờ: mỗi INTERVAL_MIN phút kể từ lần chạy XONG gần nhất ---
    function schedTick() {
      if (GM_getValue(SCHED_ON, false) !== true) return;
      if (!inWorkHours()) return; // chỉ chạy 8–22h
      if (jobGet()) return; // đang chạy dở
      if (Date.now() - GM_getValue(LAST_RUN, 0) < INTERVAL_MIN * 60 * 1000) return;
      logAllClear();
      ui.log('⏰ Tới cữ ' + INTERVAL_MIN + ' phút — tự chạy.');
      jobSet({ mode: 'auto', queue: STORES.map(function (s) { return s.key; }), phase: 'export', exportAt: 0, files: [], i: 0, dlTry: 0, hops: 0, sched: true });
      runAuto();
    }
    setInterval(schedTick, 60000);

    var j = jobGet();
    if (j && (j.mode === 'auto' || j.mode === 'lichsu') && j.phase === 'export') { ui.log('↻ Tiếp tục' + (j.mode === 'lichsu' ? ' nạp lịch sử' : ' tự động') + '…'); runAuto(); }
    else { ui.log('Sẵn sàng. Test "điền form" hoặc "Chạy tất cả". ' + (GM_getValue(SCHED_ON, false) ? 'Hẹn giờ ĐANG BẬT (mỗi ' + INTERVAL_MIN + ' phút).' : 'Hẹn giờ đang tắt.')); setTimeout(schedTick, 3000); }
  }

  /* ================================================================== */
  /* ManagerDownload — chờ đủ N file "Đã xuất xong" rồi tải hết         */
  /* ================================================================== */
  function managerDownload() {
    var ui = makePanel('DMX Auto · Tải & Đẩy');

    function topRows(n) {
      var links = [].slice.call(document.querySelectorAll('a')).filter(function (a) { return /tải file excel/i.test((a.textContent || '').trim()); });
      return links.slice(0, n).map(function (a) {
        var item = null; try { item = W.angular.element(a).scope().dataItem; } catch (e) {}
        var tr = a.closest('tr');
        return { a: a, item: item, rowText: tr ? (tr.textContent || '').replace(/\s+/g, ' ').trim() : '' };
      });
    }
    function clickXemBaoCao() {
      var els = [].slice.call(document.querySelectorAll('button,a,input[type=button],[ng-click],div,span')).filter(function (x) { var t = (x.textContent || x.value || '').replace(/\s+/g, ' ').trim(); return t.length < 30 && /xem báo cáo/i.test(t); });
      if (!els.length) return false;
      function rk(e) { if (e.tagName === 'BUTTON') return 0; if (e.tagName === 'A') return 1; if (e.getAttribute && e.getAttribute('ng-click')) return 2; return 5; }
      els.sort(function (a, b) { return rk(a) - rk(b); });
      var t = els[0], inner = t.querySelector ? t.querySelector('button,a,input[type=button],[ng-click]') : null;
      (inner || t).click(); return true;
    }
    function fetchXlsx(url) {
      return new Promise(function (resolve, reject) {
        GM_xmlhttpRequest({ method: 'GET', url: url, responseType: 'arraybuffer',
          onload: function (r) { if (r.status >= 400) return reject(new Error('Tải lỗi HTTP ' + r.status)); if (!r.response || !r.response.byteLength) return reject(new Error('File rỗng.')); resolve(r.response); },
          onerror: function () { reject(new Error('Lỗi mạng khi tải.')); }, ontimeout: function () { reject(new Error('Quá thời gian tải.')); } });
      });
    }

    async function downloadAll(job, rows) {
      var files = [];
      for (var i = 0; i < rows.length; i++) {
        ui.log('Tải file ' + (i + 1) + '/' + rows.length + '…');
        var buf = await fetchXlsx(rows[i].item.LINKDOWNLOAD);
        // Gắn kèm TÊN SIÊU THỊ. Thứ tự file khớp job.queue (chính là STORES), nên
        // tra ngược ra được. Trước chỉ đặt "Chitiet_1.xlsx" nên nhật ký lẫn bảng
        // xem lại đều không biết file nào của siêu thị nào.
        // TÊN SIÊU THỊ: đọc từ CHÍNH DÒNG trong bảng lịch sử xuất, không suy ra
        // theo thứ tự hàng đợi. Bảng đó xếp MỚI NHẤT LÊN ĐẦU, còn job.queue theo
        // thứ tự xuất, nên gán theo chỉ số là ĐẢO NGƯỢC — cụm 2 siêu thị bấm
        // "396 Nguyễn Văn Cừ" lại ra Ngọc Thụy và ngược lại (báo 04/09/2026).
        // Ảnh đẩy LINE không dính lỗi này vì bước đẩy tự đọc tên từ trang.
        var st = null, cach = '';
        var chu = rows[i].rowText || '';
        for (var s2 = 0; s2 < STORES.length && !st; s2++) {
          var v = DMXCluster.chuanHoaTen(STORES[s2].name);
          var m = DMXCluster.chuanHoaTen(chu);
          if (v && m.indexOf(v) !== -1) { st = STORES[s2]; cach = 'tên trong dòng'; }
        }
        if (!st) {
          for (var s3 = 0; s3 < STORES.length && !st; s3++) {
            if (STORES[s3].code && chu.indexOf(String(STORES[s3].code)) !== -1) {
              st = STORES[s3]; cach = 'mã trong dòng';
            }
          }
        }
        if (!st) {
          // Đường lui: bảng mới nhất lên đầu nên lấy hàng đợi theo chiều NGƯỢC.
          var khoaLui = (job.queue && job.queue[rows.length - 1 - i]) || '';
          st = khoaLui ? storeByKey(khoaLui) : null;
          cach = 'đoán theo thứ tự ngược';
        }
        var khoa = (st && st.key) || '';
        var ten = (st && st.name) || khoa || ('Siêu thị ' + (i + 1));
        files.push({ name: 'Chitiet_' + (i + 1) + '.xlsx', b64: abToB64(buf), key: khoa, ten: ten });
        ui.log('✓ ' + ten + ' — ' + Math.round(buf.byteLength / 1024) + ' KB. (nhận ra qua ' + cach + ')');
      }
      job.files = files; job.i = 0; job.dlTry = 0;
      // Nạp lịch sử đi sang naplichsu.html (chỉ đẩy DB, không dựng ảnh); chuỗi
      // thường đi sang realtimenv.html để dựng ảnh rồi đẩy như cũ.
      job.phase = (job.mode === 'lichsu') ? 'nap' : 'render';
      jobSet(job);
      await sleep(500);
      location.href = (job.mode === 'lichsu' ? NLS_URL : RT_URL) + '?t=' + Date.now();
    }

    async function autoDownload(job) {
      var N = (job.queue && job.queue.length) || 1;
      job.dlTry = (job.dlTry || 0) + 1; jobSet(job);
      var clicked = clickXemBaoCao();
      await sleep(6000);
      var rows = topRows(N);
      var allDone = rows.length >= N && rows.slice(0, N).every(function (r) { return r.rowText.indexOf(DONE_STATUS) !== -1 && r.item && r.item.LINKDOWNLOAD; });
      if (allDone) { ui.log('Đủ ' + N + ' file "Đã xuất xong". Tải…'); await downloadAll(job, rows.slice(0, N)); return; }
      var doneCount = rows.filter(function (r) { return r.rowText.indexOf(DONE_STATUS) !== -1; }).length;
      ui.log('Chờ đủ ' + N + ' "Đã xuất xong"… lần ' + job.dlTry + ' · refresh:' + (clicked ? 'ok' : 'KHÔNG THẤY') + ' · xong ' + doneCount + '/' + N);
      if (job.dlTry >= 30) { ui.log('✗ Chờ quá lâu, dừng.'); jobClear(); return; }
      await sleep(13000); location.reload();
    }

    // Nút thủ công: tải 1 file trên cùng (mode manual).
    ui.btn('⬇ Tải bản trên cùng → tạo ảnh → Đẩy ảnh', '#0f766e', async function () {
      var rows = topRows(1);
      if (!rows.length) throw new Error('Không thấy "Tải file excel". Bấm "Làm mới bảng".');
      if (rows[0].rowText.indexOf(DONE_STATUS) === -1) throw new Error('Dòng trên cùng chưa "Đã xuất xong".');
      if (!rows[0].item || !rows[0].item.LINKDOWNLOAD) throw new Error('Không đọc được LINKDOWNLOAD.');
      await downloadAll({ mode: 'manual' }, rows);
    });
    ui.btn('Làm mới bảng (Xem báo cáo)', '#1d4ed8', function () { ui.log(clickXemBaoCao() ? 'Đã bấm Xem báo cáo.' : 'Không thấy nút Xem báo cáo.'); });
    ui.attach();

    // Đôi khi hệ thống MWG tự làm mới phiên đăng nhập dùng chung rồi bật ngược
    // trình duyệt về "trang MWG gần nhất" — hay chính là ManagerDownload —
    // giữa lúc job đang dở ở phase render. KHÔNG PHẢI do
    // script tự điều hướng về đây (đã rà lại, script chỉ location.href = MD_URL
    // đúng 1 lần, ngay sau khi xuất excel). Coi đây là cú bật ngược ngoài ý
    // muốn, TỰ ĐIỀU HƯỚNG LẠI đúng hướng job đang cần, thay vì đứng im chờ tay.
    var BOUNCE_TARGET = { render: RT_URL + '?t=' + Date.now() };
    var BOUNCE_MAX = 5;

    var job = jobGet();
    if (job && (job.mode === 'auto' || job.mode === 'lichsu') && job.phase === 'download') {
      ui.log('↻ Tự động: chờ đủ file rồi tải…');
      autoDownload(job).catch(function (e) { ui.log('✗ ' + (e.message || e)); jobClear(); });
    } else if (job && job.mode === 'auto' && BOUNCE_TARGET[job.phase]) {
      var bounce = (job.biBounce || 0) + 1;
      if (bounce > BOUNCE_MAX) {
        ui.log('✗ Bị bật ngược về ManagerDownload ' + BOUNCE_MAX + ' lần liên tiếp — nghi phiên đăng nhập MWG có vấn đề. Dừng, chờ kiểm tra tay.');
        tgAlert('⚠️ DMX Auto: bị bật ngược về ManagerDownload ' + BOUNCE_MAX + ' lần lúc ' + new Date().toLocaleTimeString('vi') + '. Kiểm tra phiên đăng nhập MWG (report.mwgroup.vn).');
        jobClear();
      } else {
        job.biBounce = bounce; jobSet(job);
        ui.log('↩ Bị bật ngược về ManagerDownload (lần ' + bounce + '/' + BOUNCE_MAX + ') — tự quay lại ' + job.phase + '…');
        setTimeout(function () { location.href = BOUNCE_TARGET[job.phase]; }, 2000);
      }
    } else ui.log(job ? 'Có việc chờ ở realtimenv.' : 'Sẵn sàng. Xuất xong, đợi "Đã xuất xong" rồi bấm nút xanh.');
  }

  /* ================================================================== */
  /* realtimenv.html — xử lý lần lượt từng file (tải lại trang giữa 2)  */
  /* ================================================================== */

  /* ------------------------------------------------------------------
     XEM LẠI TỪNG SIÊU THỊ trên realtimenv.html.
     Trang chỉ nhớ được MỘT file (bản nhớ tạm ~2,6 MB, mà cả gốc
     namkphong.github.io chỉ có 5 MB nên không thể nhớ nhiều hơn), lại tải
     lại trang giữa hai siêu thị, nên chạy xong cụm nhiều siêu thị thì chỉ
     còn xem được siêu thị CUỐI.
     File của cả cụm vẫn nằm sẵn trong bộ nhớ của script (không đụng tới
     quota localStorage), nên chỉ cần giữ lại và cho nạp lại theo yêu cầu.
     Nạp lại KHÔNG đẩy ảnh lên LINE — chỉ để xem.
     ------------------------------------------------------------------ */
  var XEM = 'dmx_rt_xem_v1';

  function xemLuu(files) {
    try {
      GM_setValue(XEM, {
        ngay: new Date().toDateString(),
        ds: (files || []).map(function (f) { return { key: f.key || '', ten: f.ten || f.name, b64: f.b64 }; })
      });
    } catch (e) { console.warn('[dmx-auto] Không giữ được file để xem lại:', e); }
  }
  function xemDoc() {
    var g = GM_getValue(XEM, null);
    // Số realtime chỉ có nghĩa trong ngày — qua ngày là bỏ, khỏi xem nhầm số cũ.
    if (!g || g.ngay !== new Date().toDateString() || !g.ds || !g.ds.length) return null;
    return g;
  }

  function bangXemLai() {
    var g = xemDoc();
    if (!g || g.ds.length < 2) return;   // 1 siêu thị thì trang đang hiện sẵn rồi
    var job = jobGet();
    if (job && job.phase === 'render') return;   // đang chạy chuỗi, đừng chen vào

    var ui = makePanel('DMX · Xem lại theo siêu thị');
    ui.attach();
    ui.log('Chuỗi hôm nay chạy ' + g.ds.length + ' siêu thị. Bấm tên để xem số của siêu thị đó.');
    ui.log('(Chỉ hiện trên trang, KHÔNG đẩy ảnh lên LINE.)');

    // TỰ VỀ DASHBOARD 77. Hẹn giờ 10 phút sống trên trang 77; đứng lại ở
    // realtimenv.html là cữ sau KHÔNG BAO GIỜ nổ, tức mất luôn tự động mà không
    // báo gì (người dùng phát hiện 04/09/2026). Đếm ngược, mỗi lần bấm xem thì
    // đặt lại giờ để không cắt ngang lúc đang coi.
    var GIAY_VE = 120, conLai = GIAY_VE, dongHo = null;
    var nutVe = ui.btn('↩ Về dashboard 77 ngay', '#334155', function () { location.href = D77_URL; });
    function datLaiDongHo() {
      conLai = GIAY_VE;
      if (dongHo) return;
      dongHo = setInterval(function () {
        conLai--;
        if (nutVe) nutVe.textContent = '↩ Về dashboard 77 (tự động sau ' + conLai + 's)';
        if (conLai <= 0) { clearInterval(dongHo); location.href = D77_URL; }
      }, 1000);
    }
    datLaiDongHo();

    g.ds.forEach(function (f) {
      ui.btn('👁 ' + f.ten, '#0d9488', async function () {
        try {
          datLaiDongHo();               // đang xem thì đừng cắt ngang
          ui.log('Đang nạp ' + f.ten + '…');
          var modal = document.getElementById('previewModal'); if (modal) modal.classList.add('hidden');
          var input = document.getElementById('fileUpload');
          if (!input) throw new Error('Không thấy ô tải file.');
          var file = new File([b64ToBytes(f.b64)], (f.ten || 'Chitiet') + '.xlsx',
            { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          var dt = new DataTransfer(); dt.items.add(file);
          try { input.value = ''; } catch (e) {}
          input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
          var ok = await waitFor(function () {
            var ab = document.getElementById('actionButtons');
            return ab && !ab.classList.contains('hidden');
          }, 25000);
          ui.log(ok ? '✓ Đã hiện số của ' + f.ten : '✗ Trang chưa phân tích được file.');
        } catch (e) { ui.log('✗ ' + (e.message || e)); }
      });
    });
  }

  function realtimenv() {
    var job = jobGet();
    if (!job || job.phase !== 'render' || !job.files || !job.files.length) return;
    var ui = makePanel('DMX Auto · Nạp & Đẩy');
    ui.attach();

    async function processOne(file) {
      var modal = document.getElementById('previewModal'); if (modal) modal.classList.add('hidden');
      var input = document.getElementById('fileUpload');
      if (!input) throw new Error('Không thấy #fileUpload.');
      var f = new File([b64ToBytes(file.b64)], file.name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var dt = new DataTransfer(); dt.items.add(f);
      try { input.value = ''; } catch (e) {}
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
      ui.log('Đã nạp ' + file.name + ', chờ phân tích…');
      var ready = await waitFor(function () { var ab = document.getElementById('actionButtons'); return ab && !ab.classList.contains('hidden'); }, 25000);
      if (!ready) throw new Error('Trang chưa phân tích được file.');
      ui.log('✓ Phân tích xong. Tạo ảnh…'); await sleep(600);
      if (typeof W.generatePreview !== 'function') throw new Error('Không có hàm generatePreview().');
      W.generatePreview();
      var img = await waitFor(function () { var el = document.getElementById('previewImage'); return el && /^data:image/.test(el.getAttribute('src') || '') ? el : null; }, 30000);
      if (!img) throw new Error('Ảnh chưa render.');
      ui.log('✓ Có ảnh. Bấm Đẩy ảnh…'); await sleep(400);
      var toastEl = document.getElementById('dmxpub-toast');
      var before = toastEl ? toastEl.textContent : '';
      var pushBtn = await waitFor(function () { return [].slice.call(document.querySelectorAll('#dmxpub-bar button, button')).filter(function (b) { return /đẩy ảnh/i.test((b.textContent || '').trim()); })[0]; }, 8000);
      if (!pushBtn) throw new Error('Không thấy nút "Đẩy ảnh" — script A đã bật chưa?');
      pushBtn.click();
      ui.log('Đã bấm Đẩy ảnh, chờ…');
      var res = await waitFor(function () {
        var t = document.getElementById('dmxpub-toast'); if (!t || t.style.display === 'none') return null;
        var m = t.textContent || ''; if (m === before) return null;
        if (/đã đẩy ảnh/i.test(m)) return { ok: true, msg: m }; if (/✗|lỗi/i.test(m)) return { ok: false, msg: m }; return null;
      }, 30000);
      if (res && !res.ok) throw new Error('Đẩy thất bại: ' + res.msg);
      ui.log(res ? '✓ ' + res.msg.replace(/\n/g, ' ') : '⚠ Không bắt được thông báo (kiểm tra /số).');
    }

    async function run() {
      var i = job.i || 0;
      if (i >= job.files.length) { jobClear(); ui.log('=== ✓ XONG ==='); return; }
      ui.log('--- File ' + (i + 1) + '/' + job.files.length + ' ---');
      await processOne(job.files[i]);
      job.i = i + 1; jobSet(job);
      if (job.i < job.files.length) { ui.log('→ File kế tiếp, tải lại trang…'); await sleep(1200); location.reload(); }
      else {
        // HẾT CHUỖI Ở ĐÂY (từ 0.23.0). Trước đây còn đi tiếp sang BI cào Ô1/Ô2
        // rồi mới đẩy ảnh Realtime — BI đã ngừng hoạt động nên bước đó chỉ làm
        // chuỗi chết dở, phần ảnh doanh thu đã đẩy xong ở trên vẫn tính là được.
        // Giữ lại file của cả cụm để xem lại từng siêu thị trên trang (không đẩy LINE).
        xemLuu(job.files);
        ui.log('=== ✓ Xong ' + job.files.length + ' siêu thị (ảnh doanh thu) ===');
        // ĐI TIẾP sang baocao lấy số THI ĐUA NGÀNH HÀNG. Không gộp được vào
        // đây: API /kb-api/ cần token trong localStorage của chính baocao và
        // CORS chặn origin khác, nên chuỗi phải ghé qua trang đó một nhịp.
        job.phase = 'thidua'; job.i = 0; jobSet(job);
        ui.log('→ Sang baocao.dienmayxanh.com lấy số thi đua ngành hàng…');
        await sleep(1500); location.href = BC_URL;
      }
    }

    ui.btn('▶ Chạy (nếu không tự chạy)', '#16a34a', run);
    ui.btn('Bỏ việc đang chờ', '#475569', function () { jobClear(); ui.log('Đã bỏ việc.'); });
    ui.log('Có ' + job.files.length + ' file chờ (đang ở ' + ((job.i || 0) + 1) + '/' + job.files.length + ').');
    run().catch(function (e) { ui.log('✗ ' + (e.message || e)); });
  }

  /* ==================================================================
   * BƯỚC THI ĐUA NGÀNH HÀNG (chạy trên baocao.dienmayxanh.com)
   * ==================================================================
   * Vì sao phải chạy Ở ĐÂY chứ không gọi từ report 77 hay từ github.io:
   * API /kb-api/ cần access_token nằm trong localStorage CỦA CHÍNH baocao, và
   * CORS chặn mọi origin khác. Nên chuỗi phải ghé qua trang này một nhịp.
   *
   * TIMETYPE quyết định lấy gì:
   *   1 = REALTIME hôm nay -> doanh thu hôm nay, target NGÀY, %HT ngày
   *   2 = luỹ kế tháng     -> target tháng, %HT tháng, dự kiến cuối tháng
   * Đo 04/09/2026: TIMETYPE 1 cho "Bảo hiểm Thợ ĐMX" target 6,5433 — khớp đúng
   * con số trên tab Realtime của trang. Cấp NHÂN VIÊN với TIMETYPE 1 trả 0
   * DÒNG, nên realtime.html phải tự chia theo người bằng dòng hàng report 77.
   */
  var BC_URL = 'https://baocao.dienmayxanh.com/dashboard/thi-dua';
  // Trang thi đua tự chụp ảnh gửi /số rồi tự quay về dashboard 77.
  var TD_URL = 'https://namkphong.github.io/realtime.html?daylanh=1';
  var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  var SB_KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
  var LOAI_SL = { 2: 1, 6: 1 };            // 2 và 6 đo bằng SỐ LƯỢNG

  async function baocaoThiDua() {
    var job = jobGet();
    if (!job || job.phase !== 'thidua') return;
    var ui = makePanel('DMX Auto · Thi đua ngành hàng');
    ui.attach();

    async function xong(loi) {
      if (loi) ui.log('✗ ' + loi);
      jobClear(); GM_setValue(LAST_RUN, Date.now());
      // Ghé trang thi đua để nó tự chụp ảnh cho lệnh /số. Trang đó tự quay về
      // dashboard 77 sau khi xong, và có chốt chặn 3 phút phòng khi chụp kẹt —
      // dừng lại ở github.io là hẹn giờ 10 phút không bao giờ nổ nữa.
      // Đẩy số THI ĐUA hỏng thì bỏ luôn bước ảnh: chụp trang chưa có số chỉ ra
      // một tấm ảnh trống, mà bot vẫn gửi vì đã có dấu thời gian hôm nay — tệ
      // hơn là không gửi gì.
      if (loi) { ui.log('→ Bỏ bước chụp ảnh, về dashboard 77…'); await sleep(2500); location.href = D77_URL; return; }
      ui.log('→ Sang trang thi đua chụp ảnh cho /số…');
      await sleep(1500); location.href = TD_URL;
    }

    try {
      var tok = localStorage.getItem('access_token');
      if (!tok) throw new Error('Chưa đăng nhập baocao.dienmayxanh.com.');
      var post = async function (p, b) {
        var r = await fetch('/kb-api/' + p, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
          body: JSON.stringify(b)
        });
        var j = await r.json();
        return (j && j.data) || [];
      };

      ui.log('Đang dò khu vực…');
      var vungs = await post('common/filter-rsm-getlist',
        { KEYWORD: '', PAGEINDEX: 1, PAGESIZE: 100000, PERKEY: '', COMPANYIDLIST: null });
      var kvIds = [];
      for (var v = 0; v < vungs.length; v++) {
        var ds = await post('common/filter-am-getbyrsmlist', {
          KEYWORD: '', PAGEINDEX: 1, PAGESIZE: 100000, PERKEY: '',
          PARENTVALUE: String(vungs[v].id), COMPANYIDLIST: null
        });
        ds.forEach(function (a) { kvIds.push(String(a.id)); });
      }
      if (!kvIds.length) throw new Error('Không nhận được khu vực nào.');

      var d = new Date();
      var thang = d.getFullYear() * 100 + (d.getMonth() + 1);
      var ngay = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
        '-' + String(d.getDate()).padStart(2, '0');
      var so = function (x) { return Number(x) || 0; };

      var dsST = [];
      for (var i = 0; i < STORES.length; i++) {
        var s = STORES[i];
        if (!s.code) { ui.log('⚠ ' + s.name + ' chưa có mã MWG — bỏ qua.'); continue; }
        var rt = {}, lk = {};
        for (var k = 0; k < kvIds.length; k++) {
          // Bảng cấp siêu thị KHÔNG có cột storeid nên phải gọi RIÊNG từng siêu
          // thị; gọi gộp thì không biết dòng nào của ai.
          var a1 = [], a2 = [];
          try {
            a1 = await post('reports/competition-bymsg-get', {
              MONTHKEY: thang, VIEWLEVEL: 'STOREGROUP', VIEWIDS: kvIds[k],
              ISVIEWSTORE: 0, TIMETYPE: 1, STOREIDS: String(s.code), PAGESIZE: 0
            });
          } catch (e) {}
          try {
            a2 = await post('reports/competition-bymsg-get', {
              MONTHKEY: thang, VIEWLEVEL: 'STOREGROUP', VIEWIDS: kvIds[k],
              ISVIEWSTORE: 0, TIMETYPE: 2, STOREIDS: String(s.code), PAGESIZE: 0
            });
          } catch (e) {}
          a1.forEach(function (r) { rt[r.programid] = r; });
          a2.forEach(function (r) { lk[r.programid] = r; });
        }

        var banHomNay = Object.keys(rt).map(function (id) {
          var r = rt[id], sl = LOAI_SL[r.competitiontype];
          return {
            ten: r.programname, donVi: sl ? 'SL' : 'DT',
            homNay: sl ? so(r.quantity) : so(r.revenue),
            targetNgay: so(r.target), pctNgay: so(r.targetpercent_month)
          };
        }).filter(function (x) { return x.homNay > 0; })
          .sort(function (a, b) { return b.homNay - a.homNay; });

        var ct = Object.keys(lk).map(function (id) {
          var r = lk[id], sl = LOAI_SL[r.competitiontype];
          return {
            ten: r.programname, donVi: sl ? 'SL' : 'DT',
            thang: sl ? so(r.quantity) : so(r.revenue),
            target: so(r.target), pct: so(r.targetpercent_month),
            duKien: so(r.targetpercent_predict)
          };
        }).filter(function (x) { return x.target > 0; })
          .sort(function (a, b) { return a.duKien - b.duKien; });

        // DOANH THU QUY ĐỔI HỢP NHẤT — số tổng của siêu thị, KHÔNG phải cộng
        // các chương trình thi đua lại. Cộng chương trình là sai vì một dòng
        // hàng nằm trong nhiều chương trình cùng lúc (tủ lạnh Toshiba vào cả
        // "Tủ lạnh" lẫn "Toshiba/Comfee") nên bị đếm trùng — đo 04/09/2026:
        // cộng chương trình ra 45,0 tr trong khi số thật của 396 là 36 tr thực
        // / 50 tr quy đổi.
        //   VIEWLEVEL:'STORE' + VIEWIDS (KHÔNG phải STOREIDS) + CHAINIDS, và
        //   BẮT BUỘC có FROMDATE/TODATE — thiếu là 422.
        //   revenue_kfactor = quy đổi (hợp nhất offline + online)
        //   revenue         = thực
        // FROMDATE = TODATE = hôm nay -> số trong ngày; FROMDATE = đầu tháng ->
        // luỹ kế tháng.
        var dauThang = Number(String(thang) + '01');
        var ngaySo = Number(ngay.replace(/-/g, ''));
        var theCard = {
          VIEWLEVEL: 'STORE', VIEWIDS: String(s.code), CHAINIDS: '1,2,16',
          MAINGROUPIDS: null, SUBGROUPIDS: null
        };
        // TARGET nằm ngay trong thẻ hợp nhất (target_kfactor = target QUY ĐỔI
        // trọn kỳ), KHÔNG phải ở revenue-target-get — endpoint đó trả target = 0
        // ở cấp siêu thị, đó là lý do ô '% HT target tháng' trống trơn.
        // Đo 04/09/2026 kho 14285: target_kfactor 9.324,19 · luỹ kế quy đổi
        // 921,60 -> 9,9%, khớp con số 9,1% trên trang (lệch do thời điểm chốt).
        var hn = {};
        try {
          var cNgay = (await post('reports/revenue-consolidated-card-get',
            Object.assign({}, theCard, { FROMDATE: ngaySo, TODATE: ngaySo })))[0] || {};
          var cThang = (await post('reports/revenue-consolidated-card-get',
            Object.assign({}, theCard, { FROMDATE: dauThang, TODATE: ngaySo })))[0] || {};
          var tgQd = so(cThang.target_kfactor);
          var ngayThang = so(cThang.numday_month) || 30;
          hn = {
            dtqdNgay: so(cNgay.revenue_kfactor), dtNgay: so(cNgay.revenue),
            dtqdThang: so(cThang.revenue_kfactor), dtThang: so(cThang.revenue),
            targetThang: tgQd,
            pctThang: tgQd > 0 ? so(cThang.revenue_kfactor) / tgQd * 100 : 0,
            // Nhịp cần mỗi ngày để về đích — chia đều target cho số ngày trong
            // tháng. Không phải target ngày do MWG giao (thứ đó chỉ có ở cấp
            // chương trình thi đua), nên trang phải gọi đúng tên là 'nhịp cần'.
            nhipNgay: ngayThang > 0 ? tgQd / ngayThang : 0
          };
        } catch (e) { ui.log('⚠ ' + s.name + ': không lấy được doanh thu hợp nhất — ' + (e.message || e)); }

        dsST.push({ mwg: String(s.code), key: s.key, ten: s.name, banHomNay: banHomNay, ct: ct, hopNhat: hn });
        ui.log('✓ ' + s.name + ': ' + banHomNay.length + ' ngành đã bán hôm nay / ' +
          ct.length + ' ngành được giao target.');
      }
      if (!dsST.length) throw new Error('Không lấy được siêu thị nào.');

      var goi = { v: 2, ngay: ngay, luc: new Date().toISOString(), sieuThi: dsST };
      var ten = 'rt_thidua_cum' + String(getSiteCode()).replace(/\D/g, '') + '.json';
      await new Promise(function (ok, hong) {
        GM_xmlhttpRequest({
          method: 'POST', url: SB_URL + '/storage/v1/object/bc/' + ten,
          headers: {
            apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
            'Content-Type': 'application/json', 'x-upsert': 'true'
          },
          data: JSON.stringify(goi),
          onload: function (r) { r.status >= 400 ? hong(new Error('Đẩy lỗi ' + r.status)) : ok(); },
          onerror: function () { hong(new Error('Lỗi mạng khi đẩy.')); }
        });
      });
      ui.log('☁ Đã đẩy ' + ten);
      await xong(null);
    } catch (e) {
      // Hỏng bước này KHÔNG được làm mất cả chuỗi: ảnh doanh thu đã đẩy xong ở
      // bước trước rồi. Ghi lỗi, kết thúc êm, để cữ sau chạy lại.
      await xong(e.message || e);
    }
  }

  /* ================================================================== */
  /* naplichsu.html — DÒ THÁNG THIẾU rồi tự bổ sung từ report 77         */
  /* ================================================================== */
  //
  // Vì sao cần: dashboard.html và thẻ "cùng kỳ năm trước" của sieuthi.html đọc
  // ycx_lines. Kho nào mới dùng thì bảng chỉ có từ ngày bắt đầu đẩy trở đi, nên
  // mọi so sánh với quá khứ đều trống mà KHÔNG BÁO GÌ — đã đo 02/09/2026: 7/10
  // kho không có số 9/2025. Trước đây muốn bù phải tự vào report 77 đặt ngày,
  // xuất, tải, rồi kéo file vào trang này — làm tay từng tháng từng siêu thị.
  //
  // Thứ tự ưu tiên: THÁNG TRƯỚC (so tháng dùng ngay), rồi CÙNG KỲ NĂM TRƯỚC
  // (thẻ so sánh năm), rồi các tháng thiếu còn lại trong 12 tháng.

  function thangKe(lui) {
    var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - lui);
    var y = d.getFullYear(), m = d.getMonth();
    var cuoi = new Date(y, m + 1, 0).getDate();
    var p2 = function (n) { return String(n).length < 2 ? '0' + n : String(n); };
    return { ma: y + '-' + p2(m + 1), nhan: (m + 1) + '/' + y,
      tu: y + '-' + p2(m + 1) + '-01', den: y + '-' + p2(m + 1) + '-' + p2(cuoi) };
  }

  // Soát MỘT tháng của MỘT kho: bao nhiêu dòng, và phủ từ ngày nào đến ngày nào.
  //
  // ĐẾM DÒNG THÔI LÀ KHÔNG ĐỦ. Bản đầu tôi so số dòng với tháng đông nhất của
  // chính kho đó, dưới 40% coi là thiếu — sai ngay ở cụm 1122: kho mới dùng thì
  // MỌI tháng đều cụt, nên tháng đông nhất cũng cụt, và tháng 8 chỉ có dữ liệu
  // từ 21/08 vẫn được chấm "đủ". Đo 04/09/2026: 220 Vân Trì 137 dòng/14 ngày,
  // Nam Hồng 292 dòng/11 ngày — cả hai thiếu hẳn 20 ngày đầu mà ngưỡng % không
  // hề thấy.
  //
  // Xét ĐỘ PHỦ NGÀY thì không đánh lừa được: tháng đã qua phải có dòng từ đầu
  // tháng đến cuối tháng. Kho nghỉ bán vài ngày vẫn qua vì chỉ cần mốc đầu và
  // mốc cuối, không đòi đủ 30 ngày.
  async function soatThang(storeKey, t) {
    var g = '/rest/v1/ycx_lines?store_key=eq.' + encodeURIComponent(storeKey) +
      '&ngay_xuat=gte.' + t.tu + '&ngay_xuat=lte.' + t.den + '&select=ngay_xuat&limit=1';
    var hd = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };
    var r1 = await fetch(SB_URL + g + '&order=ngay_xuat.asc',
      { headers: Object.assign({ Prefer: 'count=exact', Range: '0-0' }, hd) });
    var a1 = await r1.json();
    var cr = r1.headers.get('content-range') || '';
    var n = parseInt((cr.split('/')[1] || '0'), 10); if (isNaN(n)) n = 0;
    if (!n || !a1.length) return { n: 0, tu: null, den: null, du: false };
    var r2 = await fetch(SB_URL + g + '&order=ngay_xuat.desc', { headers: hd });
    var a2 = await r2.json();
    var dTu = a1[0].ngay_xuat, dDen = (a2[0] || a1[0]).ngay_xuat;

    // Mép trên: tháng đã qua thì phải chạm cuối tháng; tháng ĐANG chạy thì chỉ
    // cần chạm hôm qua (hôm nay có thể chưa đẩy cữ nào).
    var homNay = new Date().toISOString().slice(0, 10);
    var mepDen = t.den < homNay ? t.den : homNay;
    var lechNgay = function (a, b) {
      return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
    };
    var du = lechNgay(t.tu, dTu) <= 3 && lechNgay(dDen, mepDen) <= 3;
    return { n: n, tu: dTu, den: dDen, du: du };
  }

  function napLichSu() {
    var job = jobGet();
    var ui = makePanel('DMX · Nạp lịch sử');
    ui.attach();

    /* ---------- đang có việc: nạp file vừa tải về ---------- */
    if (job && job.mode === 'lichsu' && job.phase === 'nap' && job.files && job.files.length) {
      (async function () {
        try {
          var i = job.i || 0, f = job.files[i];
          ui.log('--- ' + f.ten + ' · ' + job.dsThang[job.ti || 0].nhan +
            ' (file ' + (i + 1) + '/' + job.files.length + ') ---');
          var input = document.getElementById('fileUpload');
          if (!input) throw new Error('Không thấy #fileUpload trên trang.');
          var file = new File([b64ToBytes(f.b64)], f.name,
            { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          var dt = new DataTransfer(); dt.items.add(file);
          try { input.value = ''; } catch (e) {}
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          ui.log('Đã nạp file, chờ trang phân tích…');

          // Để CHÍNH TRANG đọc file: nó đã lọc "Tình trạng nhập trả" và dựng
          // dòng hàng đúng chuẩn. Chép logic sang đây là chắc chắn lệch về sau.
          var btn = await waitFor(function () {
            var b = document.getElementById('pushBtn');
            return (b && !b.disabled && b.offsetParent !== null) ? b : null;
          }, 30000);
          if (!btn) throw new Error('Trang chưa phân tích được file (không thấy nút đẩy).');
          ui.log('Phân tích xong. Đẩy lên kho dữ liệu…');
          btn.click();

          var kq = await waitFor(function () {
            var l = document.getElementById('pushLog');
            if (!l || l.classList.contains('hidden')) return null;
            var t = (l.textContent || '').trim();
            if (t.indexOf('Đã đẩy xong') !== -1) return { ok: true, msg: t };
            if (t.indexOf('Lỗi khi đẩy') !== -1) return { ok: false, msg: t };
            return null;
          }, 180000);
          if (!kq) throw new Error('Chờ quá lâu, không rõ kết quả đẩy.');
          if (!kq.ok) throw new Error(kq.msg);
          ui.log(kq.msg);

          job.i = i + 1; jobSet(job);
          if (job.i < job.files.length) {
            ui.log('→ File kế tiếp, tải lại trang…');
            await sleep(1200); location.reload(); return;
          }
          job.ti = (job.ti || 0) + 1;
          if (job.ti >= job.dsThang.length) {
            jobClear();
            ui.log('=== XONG TẤT CẢ ' + job.dsThang.length + ' THÁNG ===');
            ui.log('Mở lại dashboard.html / sieuthi.html là thấy số cũ.');
            return;
          }
          job.phase = 'export'; job.files = []; job.i = 0; job.dlTry = 0; jobSet(job);
          ui.log('→ Sang tháng ' + job.dsThang[job.ti].nhan + ', quay lại dashboard 77…');
          await sleep(1500); location.href = D77_URL;
        } catch (e) {
          ui.log('✗ ' + (e.message || e));
          ui.log('Đã dừng. Tải lại trang này để dò lại từ đầu.');
          jobClear();
        }
      })();
      return;
    }

    // ĐANG CHẠY DỞ thì nói rõ đang ở đâu, đừng bày lại bảng dò.
    //
    // Trước đây pha nào không phải 'nap' cũng rơi xuống nhánh dò, nên người dùng
    // thấy y hệt màn hình lúc đầu và bấm nút lần nữa — rồi nhận câu "Đang có
    // việc KHÁC chạy dở", trong khi việc đó là của chính họ vừa tạo 1 giây
    // trước. Gặp thật ở cụm 1122 ngày 04/09/2026.
    if (job && job.mode === 'lichsu') {
      var t0 = (job.dsThang || [])[job.ti || 0];
      ui.log('↻ ĐANG NẠP LỊCH SỬ — tháng ' + ((job.ti || 0) + 1) + '/' + (job.dsThang || []).length +
        (t0 ? ' (' + t0.nhan + ')' : '') + ' · bước: ' + job.phase);
      ui.log('Trang sẽ tự chuyển tiếp. Nếu đứng im quá 2 phút thì bấm nút dưới.');
      ui.btn('▶ Đẩy tiếp — sang dashboard 77', '#16a34a', function () { location.href = D77_URL; });
      ui.btn('Dừng hẳn / xoá việc', '#b91c1c', function () {
        jobClear(); ui.log('Đã xoá việc. Tải lại trang để dò lại từ đầu.');
      });
      return;
    }

    /* ---------- không có việc: dò xem thiếu tháng nào ---------- */
    ui.log('Đang dò 12 tháng gần nhất trên ' + STORES.length + ' siêu thị…');
    (async function () {
      var thangs = [];
      for (var k = 1; k <= 12; k++) thangs.push(thangKe(k));

      var soat = {}, tong = {};
      for (var a = 0; a < thangs.length; a++) {
        soat[thangs[a].ma] = {}; tong[thangs[a].ma] = 0;
        for (var b = 0; b < STORES.length; b++) {
          var kq = { n: 0, tu: null, den: null, du: false };
          try { kq = await soatThang(STORES[b].key, thangs[a]); } catch (e) {}
          soat[thangs[a].ma][STORES[b].key] = kq; tong[thangs[a].ma] += kq.n;
        }
      }

      function thieuO(t) {
        return STORES.filter(function (st) { return !(soat[t.ma][st.key] || {}).du; });
      }

      var maTruoc = thangs[0].ma;
      var maCungKy = thangKe(12).ma;
      var xepHang = thangs.slice().sort(function (x, y) {
        var uu = function (t) { return t.ma === maTruoc ? 0 : (t.ma === maCungKy ? 1 : 2); };
        if (uu(x) !== uu(y)) return uu(x) - uu(y);
        return y.ma.localeCompare(x.ma);
      });

      var can = xepHang.filter(function (t) { return thieuO(t).length; });
      ui.log('');
      xepHang.forEach(function (t) {
        var th = thieuO(t);
        var nhan = t.ma === maTruoc ? '  ← tháng trước'
                 : (t.ma === maCungKy ? '  ← cùng kỳ năm trước' : '');
        var ten = '  ' + t.nhan; while (ten.length < 11) ten += ' ';
        var so = String(tong[t.ma]); while (so.length < 6) so = ' ' + so;
        var mo = th.map(function (x) {
          var k = soat[t.ma][x.key] || {};
          return x.name + (k.n ? ' (chỉ có ' + k.tu + '→' + k.den + ')' : ' (trống)');
        }).join(', ');
        ui.log(ten + so + ' dòng   ' + (th.length ? 'THIẾU: ' + mo : 'đủ') + nhan);
      });

      if (!can.length) { ui.log(''); ui.log('Không tháng nào thiếu — không phải làm gì.'); return; }

      ui.log('');
      ui.log('Cần bổ sung ' + can.length + ' tháng, theo đúng thứ tự trên.');
      ui.log('Mỗi tháng phải xuất lại report cho từng siêu thị nên khá lâu — cứ để yên,');
      ui.log('trang sẽ tự chuyển qua lại nhiều lần.');

      var daBam = false;
      function batDau(ds, nhan) {
        // Chốt trong bộ nhớ, không hỏi lại jobGet(): sau cú bấm đầu thì job đã
        // tồn tại, hỏi lại sẽ ra câu "có việc KHÁC" — đổ oan cho chính mình.
        if (daBam) { ui.log('(đã bấm rồi — đang chuyển trang, chờ chút)'); return; }
        var cu = jobGet();
        if (cu) {
          ui.log('✗ Đang có việc ' + (cu.mode === 'auto' ? 'CHẠY TỰ ĐỘNG' : cu.mode) +
            ' chạy dở (bước ' + cu.phase + '). Chờ xong, hoặc bấm "Dừng tự động" ở dashboard 77.');
          return;
        }
        daBam = true;
        logAllClear();
        jobSet({ mode: 'lichsu', dsThang: ds, ti: 0,
          queue: STORES.map(function (s) { return s.key; }),
          phase: 'export', files: [], i: 0, dlTry: 0, hops: 0 });
        ui.log('=== BẮT ĐẦU ' + nhan + ' — sang dashboard 77, cứ để yên ===');
        setTimeout(function () { location.href = D77_URL; }, 1200);
      }
      ui.btn('▶ Bổ sung tự động ' + can.length + ' tháng', '#16a34a',
        function () { batDau(can, can.length + ' tháng'); });
      ui.btn('▶ Chỉ tháng ưu tiên nhất (' + can[0].nhan + ')', '#1d4ed8',
        function () { batDau([can[0]], can[0].nhan); });
      ui.btn('Dừng / xoá việc đang chạy', '#475569',
        function () { jobClear(); ui.log('Đã xoá việc.'); });
    })().catch(function (e) { ui.log('✗ Lỗi khi dò: ' + (e.message || e)); });
  }

  /* ---------------- định tuyến ---------------- */
  (async function () {
  try { await ensureClusterConfig(); }
  catch (e) { console.error('[dmx-auto] Lỗi tải cấu hình cụm:', e); window.alert('DMX Auto: ' + (e.message || e)); return; }

  var host = location.hostname, path = location.pathname;
  if (host.indexOf('report.mwgroup.vn') !== -1) {
    if (/dashboard\/77/.test(path)) dashboard77();
    else if (/ManagerDownload/i.test(path)) managerDownload();
    else maybeLoggedOut();
  } else if (host.indexOf('baocao.dienmayxanh.com') !== -1) {
    baocaoThiDua();
  } else if (host.indexOf('namkphong.github.io') !== -1) {
    if (path.indexOf('/realtimenv.html') !== -1) { realtimenv(); bangXemLai(); }
    else if (path.indexOf('/naplichsu.html') !== -1) napLichSu();
  }
  })();
})();
