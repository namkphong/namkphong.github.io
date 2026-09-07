#!/usr/bin/env node
/*
 * DỰNG DANH SÁCH MÃ SẢN PHẨM cho chương trình không dò được bằng ngành/nhóm.
 * =============================================================================
 * "Phụ kiện IT và nhóm khác" đã chứng minh được là KHÔNG có quy tắc cấp nhóm
 * (xem khongDoDuoc trong bảng gán). Theo yêu cầu của Phong: tạm ghi nhận theo
 * DANH SÁCH SẢN PHẨM — lấy chính những mặt hàng các kho đang bán.
 *
 * Cách dựng: gom mọi mã sản phẩm bán trong tháng thuộc khối ngành phụ kiện,
 * TRỪ những nhóm đã có chương trình khác nhận (cáp-sạc, tai nghe, sạc dự phòng,
 * camera, phụ kiện công nghệ) — vì tên chương trình có chữ "và nhóm khác", tức
 * nó là phần CÒN LẠI.
 *
 * ĐÂY LÀ BẢN GẦN ĐÚNG, KHÔNG PHẢI QUY TẮC ĐÚNG. Tổng tiền sẽ KHÔNG khớp số
 * baocao (đã đo: kho 396 cần 44,69 mà cả khối phụ kiện chỉ có 32,17 — chương
 * trình còn với sang ngành khác). Mục đích duy nhất là CHIA ĐƯỢC THEO NGƯỜI
 * BÁN, thay vì để trống hoàn toàn như trước.
 *
 * CHẠY:  node phan-tich/danh-sach-sp.js [--ghi]
 *        không có --ghi thì chỉ in ra, có --ghi thì cập nhật thẳng bảng gán.
 */
'use strict';
const fs = require('fs');
const SB = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
const KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const THANG = '2026-09';
const TEN = 'Phụ kiện IT và nhóm khác';
// Khối ngành mang nghĩa "phụ kiện / IT / nhóm lặt vặt".
const NGANH = ['16', '364', '184', '1394', '764', '24'];
const GHI = process.argv.indexOf('--ghi') !== -1;

const cuoiThang = (() => {
  const [y, m] = THANG.split('-').map(Number);
  return THANG + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0');
})();

(async function () {
  const p = 'phan-tich/bang-gan-' + THANG.replace('-', '') + '.json';
  const bang = JSON.parse(fs.readFileSync(p, 'utf8'));

  // Nhóm đã có chương trình KHÁC nhận -> loại ra, vì "nhóm khác" là phần còn lại.
  const daNhan = new Set();
  bang.quyTac.forEach(q => { if (q.ten !== TEN) (q.nhom || []).forEach(n => daNhan.add(n)); });

  let a = [], t = 0;
  for (;;) {
    const r = await fetch(SB + '/rest/v1/ycx_lines?ngay_xuat=gte.' + THANG + '-01' +
      '&ngay_xuat=lte.' + cuoiThang +
      '&select=ma_san_pham,ten_san_pham,nganh_hang,nhom_hang,gia_ban_1,store_key' +
      '&order=id.asc&offset=' + t + '&limit=1000', { headers: H });
    const b = await r.json();
    if (!r.ok || !Array.isArray(b)) throw new Error('ycx_lines: ' + JSON.stringify(b).slice(0, 160));
    if (!b.length) break;
    a = a.concat(b); t += 1000; if (b.length < 1000) break;
  }

  const nganh = r => String(r.nganh_hang || '').split(' - ')[0];
  const nhom = r => String(r.nhom_hang || '').split(' - ')[0];
  const sp = new Map();
  a.filter(r => NGANH.indexOf(nganh(r)) !== -1 && !daNhan.has(nhom(r)))
   .forEach(r => {
     if (!sp.has(r.ma_san_pham)) sp.set(r.ma_san_pham, { ten: r.ten_san_pham, nhom: r.nhom_hang, v: 0, n: 0, kho: new Set() });
     const o = sp.get(r.ma_san_pham);
     o.v += (Number(r.gia_ban_1) || 0) / 1e6; o.n++; o.kho.add(r.store_key);
   });

  const ds = [...sp.entries()].sort((x, y) => y[1].v - x[1].v);
  console.log('Tháng ' + THANG + ': ' + a.length + ' dòng, lọc ra ' + ds.length + ' mã sản phẩm.');
  console.log('Nhóm bị loại vì đã có chương trình khác nhận: ' + [...daNhan].join(', ') + '\n');
  console.log('   tiền(tr)  dòng  kho   mã sản phẩm      tên');
  ds.slice(0, 20).forEach(([m, o]) => console.log('  ' + o.v.toFixed(2).padStart(8) +
    String(o.n).padStart(6) + String(o.kho.size).padStart(5) + '   ' + m + '  ' + String(o.ten).slice(0, 42)));
  if (ds.length > 20) console.log('  … còn ' + (ds.length - 20) + ' mã nữa');
  console.log('\nTổng tiền của danh sách: ' + ds.reduce((s, [, o]) => s + o.v, 0).toFixed(2) + ' tr');

  if (!GHI) { console.log('\n(chạy lại với --ghi để cập nhật vào bảng gán)'); return; }

  let q = bang.quyTac.find(x => x.ten === TEN);
  if (!q) { q = { ten: TEN, donVi: 'DT', nen: 'thuc' }; bang.quyTac.push(q); }
  q.maSP = ds.map(([m]) => m);
  q.ganDung = true;
  q.kiem = 'DANH SÁCH SẢN PHẨM, KHÔNG PHẢI QUY TẮC. Đã chứng minh chương trình này ' +
    'không có quy tắc cấp nhóm (xem khongDoDuoc). Theo yêu cầu 07/09/2026: tạm ghi nhận ' +
    'theo danh sách mã sản phẩm các kho đang bán — lấy khối ngành ' + NGANH.join('/') +
    ' rồi trừ những nhóm đã có chương trình khác nhận, vì tên có chữ "và nhóm khác" tức ' +
    'là phần còn lại. ' + ds.length + ' mã, dựng ngày ' + new Date().toISOString().slice(0, 10) + '. ' +
    'TỔNG TIỀN SẼ KHÔNG KHỚP baocao (kho 396 cần 44,69 mà cả khối phụ kiện chỉ có 32,17) — ' +
    'mục đích duy nhất là CHIA ĐƯỢC THEO NGƯỜI BÁN thay vì để trống. Dựng lại mỗi tháng ' +
    'bằng: node phan-tich/danh-sach-sp.js --ghi';
  fs.writeFileSync(p, JSON.stringify(bang, null, 2) + '\n', 'utf8');
  console.log('\n✓ Đã ghi ' + ds.length + ' mã vào ' + p);
})().catch(e => { console.error('LỖI: ' + e.message); process.exit(1); });
