#!/usr/bin/env node
/* ĐÓNG GÓI USERSCRIPT — "VỎ TỰ CẬP NHẬT" + BẢN DỰ PHÒNG MANG SẴN
 *
 * Chạy:  node tools/dong-goi-userscript.js
 *
 * Nguồn thật nằm ở userscript-src/<tên>.js (khối ==UserScript== + thân là một
 * khối (function(){…})()). SỬA Ở ĐÓ, rồi chạy lệnh này. Nó sinh ra:
 *
 *   <tên>.user.js      — thứ người dùng CÀI trong Violentmonkey. Gồm:
 *                          · khối ==UserScript== giữ nguyên (quyền, @match…);
 *                          · VỎ: mỗi lần trang mở, đọc userscript-ban.json; có
 *                            bản lõi MỚI HƠN bản mang sẵn thì tải <tên>.core.js,
 *                            kiểm mã băm, dịch thử rồi chạy;
 *                          · BẢN DỰ PHÒNG: nguyên thân script, chạy khi không có
 *                            bản mới, mất mạng, trình duyệt chặn eval, lõi tải
 *                            về hỏng/không dịch được. Xấu nhất = y như trước.
 *   <tên>.core.js      — thân script (không có khối ==UserScript==).
 *   userscript-ban.json — { "<tên>": { ver, bam }, "dmx-cluster-shared": { bam } }
 *
 * Vì sao: sửa xong phải chờ Violentmonkey tự cập nhật (ngày một lần) hoặc từng
 * máy bấm tay. Với vỏ, bản vá tới mọi máy ở lần tải trang kế tiếp.
 *
 * QUY ƯỚC PHIÊN BẢN: sửa thân thì TĂNG @version trong userscript-src — vỏ chỉ
 * tải lõi khi số trên mạng LỚN HƠN số mang sẵn, nên quên tăng là không ai nhận.
 */
'use strict';
const fs = require('fs'), path = require('path');
const GOC = process.env.DG_OUT || path.resolve(__dirname, '..');   // DG_OUT/DG_SRC: chỉ để chạy thử
const SRC = process.env.DG_SRC || path.join(GOC, 'userscript-src');

// FNV-1a 32 bit trên mã UTF-16 — vỏ tính y hệt để phát hiện lõi tải về hỏng/cụt.
function bam(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ('0000000' + h.toString(16)).slice(-8);
}

const VO = String.raw`
/* =====================================================================
 * FILE SINH TỰ ĐỘNG — ĐỪNG SỬA TAY. Nguồn: userscript-src/__TEN__.js,
 * đóng gói bằng: node tools/dong-goi-userscript.js
 *
 * VỎ TỰ CẬP NHẬT. Mỗi lần trang mở: đọc userscript-ban.json trên
 * namkphong.github.io; nếu có lõi MỚI HƠN bản mang sẵn (__VER__) thì tải
 * __TEN__.core.js, kiểm mã băm, dịch thử rồi chạy — bản vá tới máy ngay lần
 * tải trang kế tiếp, không ai phải bấm "Cập nhật". Mọi đường hỏng (mất mạng,
 * trình duyệt chặn eval, lõi cụt/không dịch được) đều quay về BẢN DỰ PHÒNG
 * mang sẵn bên dưới — xấu nhất vẫn chạy y như trước khi có vỏ.
 * Tra nhanh đang chạy bản nào: window.__DMX_VO trong Console.
 * ===================================================================== */
(function () {
  var TEN = '__TEN__', BAN_GOI = '__VER__', CO_THU_VIEN = __CO_THU_VIEN__;
  var GOC = 'https://namkphong.github.io/';
  var W0 = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  var THAM_SO = ['GM_info', 'GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_xmlhttpRequest', 'unsafeWindow'];

  function giaTri(ver, nguon) {
    var that = null;
    try { that = (typeof GM_info !== 'undefined') ? GM_info : null; } catch (e) {}
    var info = { script: { name: TEN, version: ver }, scriptHandler: that && that.scriptHandler, nguon: nguon };
    return [info,
      (typeof GM_getValue !== 'undefined') ? GM_getValue : undefined,
      (typeof GM_setValue !== 'undefined') ? GM_setValue : undefined,
      (typeof GM_deleteValue !== 'undefined') ? GM_deleteValue : undefined,
      (typeof GM_xmlhttpRequest !== 'undefined') ? GM_xmlhttpRequest : undefined,
      W0];
  }
  function ghiDau(ver, nguon, loi) {
    try { (W0.__DMX_VO = W0.__DMX_VO || {})[TEN] = { ver: ver, nguon: nguon, loi: loi || '', luc: new Date().toLocaleTimeString() }; } catch (e) {}
    if (loi) { try { console.warn('[' + TEN + '] ' + loi); } catch (e) {} }
  }
  function bam(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function soSanh(a, b) {
    var x = String(a).split('.'), y = String(b).split('.');
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0);
      if (d) return d;
    }
    return 0;
  }
  function doc(k) {
    try { if (typeof GM_getValue !== 'undefined') return GM_getValue(k, null); } catch (e) {}
    try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; }
  }
  function ghi(k, v) {
    try { if (typeof GM_setValue !== 'undefined') { GM_setValue(k, v); return; } } catch (e) {}
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function tai(url, ms) {
    return Promise.race([
      fetch(url, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }),
      new Promise(function (_, hong) { setTimeout(function () { hong(new Error('quá ' + ms + ' ms')); }, ms); })
    ]);
  }
  function chayDongGoi(lyDo) {
    ghiDau(BAN_GOI, 'mang sẵn', lyDo);
    __DMX_LOI_DONG_GOI__.apply(null, giaTri(BAN_GOI, 'mang sẵn'));
  }
  // Lấy mã từ bộ nhớ nếu đúng mã băm, không thì tải rồi cất.
  async function layMa(khoa, url, bamCan, ms) {
    var nho = doc(khoa);
    if (nho && nho.bam === bamCan && nho.ma && bam(nho.ma) === bamCan) return nho.ma;
    var ma = await tai(url, ms);
    if (bam(ma) !== bamCan) throw new Error('mã băm không khớp (tải cụt hoặc bản trên mạng vừa đổi)');
    ghi(khoa, { bam: bamCan, ma: ma });
    return ma;
  }

  async function batDau() {
    var ban;
    try { ban = JSON.parse(await tai(GOC + 'userscript-ban.json?p=' + Math.floor(Date.now() / 60000), 4000)); }
    catch (e) { return chayDongGoi('không đọc được bảng phiên bản: ' + e.message); }
    var moi = ban && ban[TEN];
    if (!moi || soSanh(moi.ver, BAN_GOI) <= 0) return chayDongGoi('');

    var ma, f;
    try { ma = await layMa('dmx_vo_loi_' + TEN, GOC + TEN + '.core.js?b=' + moi.bam, moi.bam, 8000); }
    catch (e) { return chayDongGoi('không tải được lõi ' + moi.ver + ': ' + e.message); }
    try { f = new Function(THAM_SO.join(','), ma); }
    catch (e) { return chayDongGoi('lõi ' + moi.ver + ' không chạy được ở đây (' + e.name + ': ' + e.message + ')'); }

    // Thư viện dùng chung cũng lấy bản mới (bản @require chỉ đổi khi script đổi).
    var tv = ban['dmx-cluster-shared'];
    if (CO_THU_VIEN && tv && tv.bam) {
      try {
        var maTv = await layMa('dmx_vo_thuvien', GOC + 'dmx-cluster-shared.js?b=' + tv.bam, tv.bam, 6000);
        new Function('unsafeWindow', maTv)(W0);
      } catch (e) { ghiDau(moi.ver, 'mạng', 'giữ thư viện cũ: ' + e.message); }
    }

    ghiDau(moi.ver, 'mạng', '');
    // Lõi đã dịch được thì KHÔNG quay về bản mang sẵn khi nó lỗi lúc chạy: có
    // thể nó đã dựng xong một nửa (panel, hẹn giờ), chạy thêm bản thứ hai là
    // hai chuỗi tự động giẫm lên nhau. Ghi lỗi để tra.
    try { f.apply(null, giaTri(moi.ver, 'mạng')); }
    catch (e) { ghiDau(moi.ver, 'mạng', 'lõi lỗi khi chạy: ' + (e && e.message)); try { console.error(e); } catch (e2) {} }
  }
  batDau();

  function __DMX_LOI_DONG_GOI__(GM_info, GM_getValue, GM_setValue, GM_deleteValue, GM_xmlhttpRequest, unsafeWindow) {
__THAN__
  }
})();
`;

const bang = {};
const ds = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
for (const tep of ds) {
  const ten = tep.replace(/\.js$/, '');
  const nguon = fs.readFileSync(path.join(SRC, tep), 'utf8').replace(/\r\n/g, '\n');
  const m = nguon.match(/^([\s\S]*?\/\/ ==\/UserScript==\n)([\s\S]*)$/);
  if (!m) throw new Error(tep + ': không thấy khối ==UserScript==');
  const dau = m[1], than = m[2].replace(/^\s+/, '');
  const ver = (dau.match(/@version\s+([\d.]+)/) || [])[1];
  if (!ver) throw new Error(tep + ': thiếu @version');
  if (!/^\(function\s*\(\)\s*\{/.test(than)) throw new Error(tep + ': thân phải mở đầu bằng (function () {');
  const coThuVien = /@require\s+https:\/\/namkphong\.github\.io\/dmx-cluster-shared\.js/.test(dau);

  // Dịch thử thân trong đúng khung tham số mà vỏ dùng — lỗi cú pháp thì dừng
  // ngay ở máy mình, không để nó lên mạng.
  new Function('GM_info', 'GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_xmlhttpRequest', 'unsafeWindow', than);

  const core = '// ' + ten + ' — lõi ' + ver + ' · FILE SINH TỰ ĐỘNG từ userscript-src/' + tep + '\n' + than;
  fs.writeFileSync(path.join(GOC, ten + '.core.js'), core);
  const vo = VO.replace(/__TEN__/g, ten).replace(/__VER__/g, ver)
    .replace('__CO_THU_VIEN__', String(coThuVien))
    // HÀM thay thế, không phải chuỗi: thân có sẵn "$1", "$&"… trong các lệnh
    // .replace() của nó, đưa chuỗi vào là JS hiểu thành mẫu thay thế và làm hỏng mã.
    .replace('__THAN__', () => than.replace(/\n$/, '').split('\n').map(l => l ? '    ' + l : l).join('\n'));
  const userjs = dau + vo;
  new Function(userjs.replace(/^\/\/.*$/mg, ''));        // dịch thử cả vỏ
  fs.writeFileSync(path.join(GOC, ten + '.user.js'), userjs);
  bang[ten] = { ver: ver, bam: bam(core) };
  console.log(('  ' + ten).padEnd(28) + ver.padEnd(9) + 'lõi ' + Math.round(core.length / 1024) + ' KB · băm ' + bang[ten].bam +
    (coThuVien ? ' · + thư viện chung' : ''));
}
const tv = fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'dmx-cluster-shared.js'), 'utf8');
bang['dmx-cluster-shared'] = { bam: bam(tv) };
fs.writeFileSync(path.join(GOC, 'userscript-ban.json'), JSON.stringify(bang, null, 1) + '\n');
console.log('  userscript-ban.json: ' + Object.keys(bang).length + ' mục');
