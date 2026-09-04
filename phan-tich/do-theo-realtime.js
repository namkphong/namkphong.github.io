#!/usr/bin/env node
/*
 * DÒ QUY TẮC BẰNG SỐ REALTIME TRONG NGÀY.
 * =============================================================================
 * Vì sao cần cái này bên cạnh kiem-bang-gan.js (vốn dò bằng luỹ kế tháng):
 * chương trình có luỹ kế THÁNG bằng 0 ở mọi kho vẫn dò được, miễn là so với số
 * REALTIME trong ngày — chỉ cần MỘT dòng hàng bán hôm nay. Đúng cách đã tìm ra
 * "PHỤ KIỆN CÔNG NGHỆ = nhóm 7359" ngày 04/09/2026, sau khi đã gạt nhầm chương
 * trình đó sang mục "không có gì để dò" vì chỉ nhìn luỹ kế.
 *
 * Số trong ngày lại ÍT dòng nên vét cạn tổ hợp nhóm hàng là làm được, trong khi
 * với luỹ kế cả tháng thì không.
 *
 * CHẠY:
 *   node phan-tich/do-theo-realtime.js [--ngay 2026-09-04] [--bang <file>]
 */

'use strict';

const fs = require('fs');
const SB = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
const KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const arg = (() => {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1];
  o.ngay = o.ngay || new Date().toISOString().slice(0, 10);
  o.bang = o.bang || 'phan-tich/bang-gan-' + o.ngay.slice(0, 4) + o.ngay.slice(5, 7) + '.json';
  return o;
})();

const maNhom = r => String(r.nhom_hang || '?').split(' - ')[0];
const maNganh = r => String(r.nganh_hang || '').split(' - ')[0];
const hangSX = r => String(r.nha_san_xuat || '').trim();

function hop(r, q) {
  if (q.nhom && q.nhom.indexOf(maNhom(r)) === -1) return false;
  if (q.nganh && q.nganh.indexOf(maNganh(r)) === -1) return false;
  if (q.hang && !q.hang.some(h => hangSX(r).toLowerCase().indexOf(h.toLowerCase()) !== -1)) return false;
  if (q.boHang && q.boHang.some(h => hangSX(r).toLowerCase() === h.toLowerCase())) return false;
  // boTen: loại theo TÊN SẢN PHẨM. Cần cho những chương trình cùng nhóm hàng mà
  // chỉ khác nhà mạng/dòng máy, vd SIM MOBIFONE/VINAPHONE/SIM DMX = nhóm 1891 trừ Viettel.
  if (q.boTen && q.boTen.some(t => String(r.ten_san_pham || '').toLowerCase().indexOf(t.toLowerCase()) !== -1)) return false;
  if (q.traGop && !r.la_tra_gop) return false;
  if (q.thanhToan && q.thanhToan.indexOf(r.hinh_thuc_thanh_toan) === -1) return false;
  return true;
}

async function layDongNgay(storeKey, ngay) {
  const r = await fetch(SB + '/rest/v1/ycx_lines?store_key=eq.' + encodeURIComponent(storeKey) +
    '&ngay_xuat=eq.' + ngay + '&select=*&order=id.asc&limit=1000', { headers: H });
  if (!r.ok) return [];
  const a = await r.json();
  if (!a.length) return [];
  // Bỏ dòng đã bị trả/huỷ (xem ghi chú donTra trong bảng gán).
  const moc = a.map(x => x.updated_at).sort().pop();
  return a.filter(x => x.updated_at === moc);
}

(async function () {
  const bang = JSON.parse(fs.readFileSync(arg.bang, 'utf8'));
  const daCo = new Set(bang.quyTac.map(q => q.ten));

  const ds = await (await fetch(SB + '/storage/v1/object/list/bc', {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H),
    body: JSON.stringify({ prefix: '', limit: 1000 })
  })).json();

  const kho = new Map();     // storeKey -> { ten, dong }
  const rt = new Map();      // chương trình -> Map(storeKey -> {donVi, v})
  let goiCu = 0;
  for (const f of ds.filter(x => /^rt_thidua_cum.*\.json$/.test(x.name))) {
    const g = await (await fetch(SB + '/storage/v1/object/public/bc/' + f.name + '?t=' + Date.now())).json();
    if (g.ngay !== arg.ngay) continue;                 // gói của ngày khác thì bỏ
    for (const s of (g.sieuThi || [])) {
      if (!s.key) { goiCu++; continue; }
      if (!(s.banHomNay || []).length) continue;
      const dong = await layDongNgay(s.key, arg.ngay);
      if (!dong.length) continue;
      kho.set(s.key, { ten: s.ten, dong: dong });
      s.banHomNay.forEach(c => {
        if (!rt.has(c.ten)) rt.set(c.ten, new Map());
        rt.get(c.ten).set(s.key, { donVi: c.donVi, v: c.homNay });
      });
    }
  }
  if (!kho.size) throw new Error('Không kho nào có gói realtime NGÀY ' + arg.ngay + ' kèm dòng hàng.');

  console.log('Ngày ' + arg.ngay + ' · ' + kho.size + ' kho có cả gói realtime lẫn dòng hàng' +
    (goiCu ? '  (bỏ ' + goiCu + ' siêu thị gói cũ thiếu mã nội bộ)' : ''));
  kho.forEach((e, k) => console.log('   ' + k.padEnd(7) + e.ten.padEnd(22) + e.dong.length + ' dòng'));

  const chua = Array.from(rt.keys()).filter(t => !daCo.has(t));
  if (!chua.length) { console.log('\nMọi chương trình có số hôm nay đều đã có quy tắc.'); return; }

  console.log('\nDÒ ' + chua.length + ' chương trình chưa có quy tắc (vét cạn tổ hợp nhóm hàng):');
  chua.sort().forEach(ten => {
    const m = rt.get(ten);
    const dv = Array.from(m.values())[0].donVi;
    const canIn = Array.from(m.entries()).map(([k, x]) => k + '=' + x.v.toFixed(2)).join(' · ');
    console.log('\n▌ ' + ten + '   (' + dv + ')   ' + canIn);

    // Vét cạn trên tập nhóm hàng của NGÀY đó — ít dòng nên làm được.
    const ks = new Set();
    kho.forEach((e, k) => { if (m.has(k)) e.dong.forEach(r => ks.add(maNhom(r))); });
    const cs = Array.from(ks);
    if (cs.length > 22) { console.log('   (còn ' + cs.length + ' nhóm, quá nhiều để vét cạn)'); return; }

    const gtri = (r) => dv === 'SL' ? (Number(r.so_luong) || 0) : (Number(r.gia_ban_1) || 0) / 1e6;
    const nghiem = [];
    for (let msk = 1; msk < (1 << cs.length); msk++) {
      const tap = cs.filter((_, i) => msk & (1 << i));
      let du = true;
      m.forEach((x, k) => {
        if (!du) return;
        const s = kho.get(k).dong.filter(r => tap.indexOf(maNhom(r)) !== -1)
          .reduce((a2, r) => a2 + gtri(r), 0);
        if (Math.abs(s - x.v) > 0.02) du = false;
      });
      if (du) { nghiem.push(tap); if (nghiem.length > 8) break; }
    }
    if (!nghiem.length) { console.log('   ✗ không tổ hợp nhóm hàng nào khớp — chương trình này lọc ở cấp khác (hãng / cách thanh toán / sản phẩm).'); return; }
    // Ưu tiên tập ÍT nhóm nhất: tập càng nhiều nhóm càng dễ là khớp giả.
    nghiem.sort((a, b) => a.length - b.length);
    console.log('   ➜ ' + nghiem.length + ' tổ hợp khớp, gọn nhất trước:');
    nghiem.slice(0, 4).forEach(t => {
      const ten2 = t.map(c => {
        let nh = '';
        kho.forEach(e => { const r = e.dong.find(x => maNhom(x) === c); if (r && !nh) nh = r.nhom_hang; });
        return nh || c;
      });
      console.log('      { ' + ten2.join('  +  ') + ' }');
    });
  });

  console.log('\nLƯU Ý: một ngày chỉ vài chục dòng nên rất dễ có khớp giả — tổ hợp nào gọn');
  console.log('và có nghĩa theo tên chương trình mới nên nhận, rồi để kiem-bang-gan.js xác nhận lại.');
})().catch(e => { console.error('LỖI: ' + e.message); process.exit(1); });
