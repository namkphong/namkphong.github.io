// ==UserScript==
// @name         DMX — Coupon Giờ vàng giá sốc → bot LINE (/cp)
// @namespace    namkphong.github.io
// @version      1.0.0
// @description  Mở portal Mail đã nhận: tự tìm mail "MÃ COUPON … GIỜ VÀNG GIÁ SỐC" của siêu thị mình, đọc mã theo model + ngày, gửi lên bot LINE để nhân viên gõ /cp lấy mã.
// @match        https://portal.thegioididong.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @downloadURL  https://namkphong.github.io/gvgs-coupon.user.js
// @updateURL    https://namkphong.github.io/gvgs-coupon.user.js
// ==/UserScript==

(function () {
  'use strict';
  var VER = '1.0.0';
  // Siêu thị lấy coupon (mail có dòng "PMH NÀY DÀNH CHO SIÊU THỊ: 14,285").
  var SIEU_THI = '14285';
  var BOT_URL = 'https://script.google.com/macros/s/AKfycbxyrv1Z5c_eRU-JHIbT4oHfACkSMOlQ1BaVofrdADC3T5ozmPuAZTBoKjYlxg8m66vc/exec';
  var TU_KHOA = 'GIỜ VÀNG GIÁ SỐC';

  var ngu = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var dangChay = false;

  // Khoá riêng của máy này (bot chỉ nhận coupon từ máy đã gửi lần đầu).
  function khoaMay() {
    var k = GM_getValue('khoa', '');
    if (!/^[0-9a-f]{32}$/.test(k)) {
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      k = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      GM_setValue('khoa', k);
    }
    return k;
  }

  /* ---------- Đọc mail ---------- */
  function hang() {   // các dòng mail coupon GVGS đang hiện trong danh sách
    return Array.prototype.filter.call(document.querySelectorAll('div.group.cursor-pointer'), function (r) {
      var t = r.innerText || '';
      return /MÃ COUPON/i.test(t) && /GIỜ VÀNG/i.test(t);
    });
  }
  function tieuDe(r) {
    return ((r.innerText || '').split('\n').filter(function (x) { return /MÃ COUPON/i.test(x); })[0] || '').trim();
  }
  function hai(n) { return ('0' + n).slice(-2); }
  // "… 13/11 - 15/11/2026" → {tu:'20261113', den:'20261115'}
  function kyCua(td) {
    var m = /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(td);
    if (!m) return null;
    var nam = +m[6], namTu = m[3] ? +m[3] : (+m[2] > +m[5] ? nam - 1 : nam);
    return { tu: namTu + hai(m[2]) + hai(m[1]), den: nam + hai(m[5]) + hai(m[4]) };
  }
  function nhomCua(td) {   // "MÃ COUPON ÁP DỤNG CHO TỦ LẠNH - GIỜ VÀNG…" → "TỦ LẠNH"
    var m = /CHO\s+(.+?)\s*(?:[-–]|NGÀY|GIỜ VÀNG|$)/i.exec(td);
    return m ? m[1].trim() : '';
  }
  function boDau(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
      .replace(/\(imei\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function soTien(s) { return +String(s || '').replace(/[^\d]/g, '') || 0; }

  // Bóc nội dung 1 mail đang mở.
  function bocMail(text, nhom) {
    var dong = text.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    var st = '', gia = [], ds = [];
    dong.forEach(function (l) {
      var m;
      if ((m = /PMH NÀY DÀNH CHO SIÊU THỊ\s*:\s*([\d.,\s]+)/i.exec(l))) st = m[1].replace(/\D/g, '');
      else if ((m = /^\d{10,}\s+(.+?)\s+([\d][\d.,]{4,})\s+([\d][\d.,]{4,})\s*$/.exec(l)))
        gia.push({ k: boDau(m[1]), ny: soTien(m[2]), gia: soTien(m[3]) });
      else if ((m = /Ngày\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*:\s*Mã\s*Coupon\s*\d+\s*[-–]\s*dùng cho\s+(.+?)\s*:\s*([A-Z0-9]{6,30})\s*$/i.exec(l)))
        ds.push({ ngay: m[3] + hai(m[2]) + hai(m[1]), model: m[4].trim(), ma: m[5].toUpperCase(), nhom: nhom });
    });
    ds.forEach(function (x) {
      var k = boDau(x.model);
      var g = gia.filter(function (p) { return p.k === k || p.k.indexOf(k) === 0 || k.indexOf(p.k) === 0; })[0];
      if (g) { x.gia = g.gia; x.giaNY = g.ny; }
    });
    return { st: st, ds: ds };
  }
  function maDau(text) { var m = /dùng cho .+?:\s*([A-Z0-9]{6,30})\s*$/im.exec(text); return m ? m[1] : ''; }

  async function moMail(r, maTruoc) {
    var duongTruoc = location.pathname;
    r.click();
    for (var i = 0; i < 60; i++) {   // ≤15 giây
      await ngu(250);
      var t = document.body.innerText;
      if (location.pathname !== duongTruoc && /PMH NÀY DÀNH CHO SIÊU THỊ/i.test(t) && maDau(t) && maDau(t) !== maTruoc) {
        await ngu(500);
        return document.body.innerText;
      }
    }
    return null;
  }
  async function timKiem() {   // gõ từ khoá vào ô tìm của portal
    var o = document.querySelector('input[placeholder*="Nhập từ khoá tìm kiếm"]');
    if (!o) return;
    var dat = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    dat.call(o, TU_KHOA); o.dispatchEvent(new Event('input', { bubbles: true }));
    ['keydown', 'keypress', 'keyup'].forEach(function (k) {
      o.dispatchEvent(new KeyboardEvent(k, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    });
    await ngu(3500);
  }

  async function chay(tuDong) {
    if (dangChay) return;
    dangChay = true;
    try {
      var ds = hang();
      if (!ds.length) { bao('Đang tìm mail "' + TU_KHOA + '"…'); await timKiem(); ds = hang(); }
      if (!ds.length) { bao('❌ Không thấy mail coupon trong danh sách. Gõ tìm "' + TU_KHOA + '" rồi bấm lại.', 'loi'); return; }
      // Chỉ lấy kỳ MỚI NHẤT (theo ngày kết thúc trong tiêu đề).
      var moi = null;
      ds.forEach(function (r) { var k = kyCua(tieuDe(r)); if (k && (!moi || k.den > moi.den)) moi = k; });
      if (!moi) { bao('❌ Không đọc được ngày trong tiêu đề mail.', 'loi'); return; }
      ds = ds.filter(function (r) { var k = kyCua(tieuDe(r)); return k && k.den === moi.den; });
      var tatCa = [], nganh = [], maTruoc = '', boQua = 0;
      for (var i = 0; i < ds.length; i++) {
        var td = tieuDe(ds[i]);
        bao('Đọc mail ' + (i + 1) + '/' + ds.length + ': ' + nhomCua(td));
        var t = await moMail(ds[i], maTruoc);
        if (!t) { bao('⚠ Mail "' + td.slice(0, 60) + '" mở không kịp — bỏ qua', 'loi'); await ngu(1500); continue; }
        maTruoc = maDau(t);
        var kq = bocMail(t, nhomCua(td));
        if (kq.st !== SIEU_THI) { boQua++; continue; }
        if (kq.ds.length) { tatCa = tatCa.concat(kq.ds); nganh.push(nhomCua(td) + ' ' + kq.ds.length); }
      }
      if (!tatCa.length) { bao('❌ Không có mã nào của siêu thị ' + SIEU_THI + ' trong kỳ ' + moi.tu + '–' + moi.den + '.', 'loi'); return; }
      bao('Gửi ' + tatCa.length + ' mã lên bot…');
      var tl = await gui({ lenh: 'coupon', khoa: khoaMay(), st: SIEU_THI, tu: moi.tu, den: moi.den, ds: tatCa, ver: VER });
      if (tl && tl.ok) {
        GM_setValue('daGui', SIEU_THI + '-' + moi.tu + '-' + tatCa.length);
        bao('✅ Bot đã nhận ' + tl.ma + ' mã · ' + tl.model + ' model · kỳ ' + tl.ky + '\n' + nganh.join(' · ') +
          (tl.daGiao ? '\n(đã giao trước đó: ' + tl.daGiao + ' mã — giữ nguyên)' : '') + '\nNhân viên gõ /cp trong nhóm LINE.', 'xong');
      } else bao('❌ Bot từ chối: ' + ((tl && tl.loi) || 'không rõ'), 'loi');
    } catch (e) {
      bao('❌ Lỗi: ' + e.message, 'loi');
    } finally { dangChay = false; }
  }
  function gui(goi) {
    return new Promise(function (ok) {
      GM_xmlhttpRequest({
        method: 'POST', url: BOT_URL, data: JSON.stringify(goi), headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        timeout: 60000,
        onload: function (r) { try { ok(JSON.parse(r.responseText)); } catch (e) { ok({ ok: false, loi: 'bot trả: ' + String(r.responseText).slice(0, 120) }); } },
        onerror: function () { ok({ ok: false, loi: 'không kết nối được bot' }); },
        ontimeout: function () { ok({ ok: false, loi: 'bot không trả lời (60s)' }); }
      });
    });
  }

  /* ---------- Giao diện ---------- */
  var hop, chu;
  function veNut() {
    if (hop && document.body.contains(hop)) return;
    hop = document.createElement('div');
    hop.style.cssText = 'position:fixed;right:16px;bottom:84px;z-index:99999;max-width:340px;font:13px/1.4 system-ui,sans-serif';
    var nut = document.createElement('button');
    nut.textContent = '🎟 Gửi coupon GVGS lên bot';
    nut.title = 'Đọc mail coupon Giờ vàng giá sốc của siêu thị ' + SIEU_THI + ' và gửi cho bot LINE (/cp)';
    nut.style.cssText = 'display:block;margin-left:auto;padding:8px 12px;border:0;border-radius:18px;background:#0B2A5B;color:#fff;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)';
    nut.onclick = function () { chay(false); };
    chu = document.createElement('div');
    chu.style.cssText = 'display:none;margin-top:6px;padding:8px 10px;border-radius:8px;background:#fff;color:#111;white-space:pre-wrap;box-shadow:0 2px 8px rgba(0,0,0,.2)';
    hop.appendChild(nut); hop.appendChild(chu);
    document.body.appendChild(hop);
  }
  function bao(s, kieu) {
    veNut();
    chu.style.display = 'block';
    chu.style.borderLeft = '4px solid ' + (kieu === 'loi' ? '#C2410C' : kieu === 'xong' ? '#0A7A3D' : '#0B2A5B');
    chu.textContent = s;
  }

  // Tự chạy: đang ở Mail đã nhận và thấy mail coupon của kỳ MỚI chưa gửi.
  var daThuTuDong = {};
  setInterval(function () {
    if (!/^\/mail/.test(location.pathname)) { if (hop) hop.style.display = 'none'; return; }
    veNut(); hop.style.display = '';
    if (dangChay) return;
    var ds = hang(), moi = null;
    ds.forEach(function (r) { var k = kyCua(tieuDe(r)); if (k && (!moi || k.den > moi.den)) moi = k; });
    if (!moi) return;
    var khoaKy = SIEU_THI + '-' + moi.tu;
    if (String(GM_getValue('daGui', '')).indexOf(khoaKy + '-') === 0 || daThuTuDong[khoaKy]) return;
    daThuTuDong[khoaKy] = 1;
    bao('Thấy coupon Giờ vàng giá sốc kỳ mới — tự gửi lên bot sau 3 giây…');
    setTimeout(function () { chay(true); }, 3000);
  }, 2000);
})();
