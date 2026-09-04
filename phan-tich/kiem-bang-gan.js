#!/usr/bin/env node
/*
 * KIỂM BẢNG GÁN trên TOÀN BỘ cụm đã góp dữ liệu.
 * =============================================================================
 * Đây là công cụ của hướng B: userscript chỉ GOM bằng chứng, việc dò làm tập
 * trung một lần cho cả hệ thống rồi phát bảng gán chung.
 *
 * VÌ SAO KHÔNG để script tự dò mỗi lần chạy: dò bằng dữ liệu MỘT cụm MỘT tháng
 * rất dễ ra khớp giả. Đo 04/09/2026: với hai kho, "Phụ kiện IT và nhóm khác" có
 * tới 508 tập nhóm hàng cùng khớp; thêm kho thứ ba mới lộ ra hai quy tắc tôi
 * tưởng đã chắc là sai ("Tủ lạnh" và "Trả chậm HomeCredit").
 *
 * Script này tự tìm mọi gói rt_thidua_cum*.json trên Supabase Storage — cụm nào
 * chạy chuỗi là tự góp, không phải khai báo gì — rồi:
 *   1. kiểm TỪNG quy tắc trong bảng gán trên TỪNG kho có dữ liệu;
 *   2. liệt kê chương trình CHƯA có quy tắc kèm số của từng kho, để dò tiếp.
 *
 * CHẠY:
 *   node phan-tich/kiem-bang-gan.js [--thang 202609] [--bang <file>]
 */

'use strict';

const fs = require('fs');
const SB = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
const KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';

const arg = (() => {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1];
  const d = new Date();
  o.thang = o.thang || (d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0'));
  o.bang = o.bang || 'phan-tich/bang-gan-' + o.thang + '.json';
  return o;
})();

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

/* ---------- tìm mọi gói cụm đã đẩy ---------- */
async function timGoi() {
  const r = await fetch(SB + '/storage/v1/object/list/bc', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, H),
    // prefix của Supabase Storage là ĐƯỜNG DẪN THƯ MỤC, không phải tiền tố tên
    // file — truyền 'rt_thidua' vào là trả về rỗng. Liệt kê hết rồi lọc bằng tên.
    body: JSON.stringify({ prefix: '', limit: 1000 })
  });
  const ds = await r.json();
  if (!Array.isArray(ds)) throw new Error('Không liệt kê được kho: ' + JSON.stringify(ds).slice(0, 120));
  const out = [];
  for (const f of ds) {
    if (!/^rt_thidua_cum.*\.json$/.test(f.name)) continue;
    try {
      const g = await (await fetch(SB + '/storage/v1/object/public/bc/' + f.name + '?t=' + Date.now())).json();
      out.push({ ten: f.name, luc: f.updated_at, goi: g });
    } catch (e) {}
  }
  return out;
}

/* ---------- dòng hàng của một kho trong tháng ---------- */
async function layDong(storeKey, thang) {
  const y = +thang.slice(0, 4), m = +thang.slice(4);
  const tu = thang.slice(0, 4) + '-' + thang.slice(4) + '-01';
  const den = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const out = [];
  for (let off = 0; ; off += 1000) {
    const u = SB + '/rest/v1/ycx_lines?store_key=eq.' + encodeURIComponent(storeKey) +
      '&ngay_xuat=gte.' + tu + '&ngay_xuat=lt.' + den +
      '&select=*&order=id.asc&limit=1000&offset=' + off;
    const r = await fetch(u, { headers: H });
    if (!r.ok) break;
    const j = await r.json();
    out.push.apply(out, j);
    if (j.length < 1000) break;
  }
  // Bỏ dòng đã bị TRẢ/HUỶ: bảng chỉ upsert nên đơn bị trả sau khi đẩy nằm lại.
  // Dòng còn hợp lệ mang updated_at của cữ đẩy mới nhất.
  if (!out.length) return { dong: [], boTra: 0 };
  const moc = out.map(x => x.updated_at).sort().pop();
  const giu = out.filter(x => x.updated_at === moc);
  return { dong: giu, boTra: out.length - giu.length };
}

/* ---------- áp một quy tắc lên một dòng ---------- */
const maNhom = r => String(r.nhom_hang || '').split(' - ')[0];
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
function giaTri(r, q) {
  if (q.donVi === 'SL') return Number(r.so_luong) || 0;
  return (Number(r[q.nen === 'quydoi' ? 'quy_doi' : 'gia_ban_1']) || 0) / 1e6;
}

(async function () {
  const bang = JSON.parse(fs.readFileSync(arg.bang, 'utf8'));
  const goi = await timGoi();
  if (!goi.length) throw new Error('Chưa cụm nào đẩy gói rt_thidua lên kho.');

  // Gom: kho -> { ten, dong }  và  chương trình -> { kho: luỹ kế tháng }
  const kho = new Map(), muc = new Map();
  let boQua = [];
  for (const g of goi) {
    for (const s of (g.goi.sieuThi || [])) {
      if (!s.key) { boQua.push(g.ten + ' · ' + s.ten + ' (gói cũ, thiếu mã nội bộ)'); continue; }
      if (!(s.ct || []).length) { boQua.push(g.ten + ' · ' + s.ten + ' (không có ct)'); continue; }
      const d = await layDong(s.key, arg.thang);
      if (!d.dong.length) { boQua.push(g.ten + ' · ' + s.ten + ' (không có dòng hàng tháng ' + arg.thang + ')'); continue; }
      kho.set(s.key, { ten: s.ten, dong: d.dong, boTra: d.boTra });
      s.ct.forEach(c => {
        if (!muc.has(c.ten)) muc.set(c.ten, { donVi: c.donVi, v: new Map() });
        muc.get(c.ten).v.set(s.key, c.thang);
      });
    }
  }
  if (!kho.size) throw new Error('Không kho nào vừa có gói vừa có dòng hàng.');

  const dsKho = Array.from(kho.keys());
  console.log('Tháng ' + arg.thang + ' · ' + goi.length + ' gói cụm · ' + dsKho.length + ' kho dùng được');
  dsKho.forEach(k => {
    const e = kho.get(k);
    console.log('   ' + k.padEnd(8) + e.ten.padEnd(24) + e.dong.length + ' dòng' +
      (e.boTra ? '  (bỏ ' + e.boTra + ' dòng bị trả/huỷ)' : ''));
  });
  if (boQua.length) {
    console.log('\nBỏ qua (chưa góp được):');
    boQua.forEach(x => console.log('   · ' + x));
  }

  /* ---------- kiểm từng quy tắc ---------- */
  console.log('\n' + 'QUY TẮC ĐANG DÙNG'.padEnd(46) + 'khớp'.padStart(7) + '  chi tiết từng kho');
  const hong = [];
  bang.quyTac.forEach(q => {
    const m = muc.get(q.ten);
    if (!m) { console.log('  ' + q.ten.slice(0, 42).padEnd(44) + '   —     (tháng này không có chương trình này)'); return; }
    let ok = 0, tong = 0, ct = [];
    m.v.forEach((can, k) => {
      // Kẹp giữa hai mốc: baocao chốt số giữa ngày, ycx có tới hiện tại.
      const ngayMax = kho.get(k).dong.map(r => r.ngay_xuat).sort().pop();
      const g = den => kho.get(k).dong.filter(r => r.ngay_xuat <= den && hop(r, q))
        .reduce((s, r) => s + giaTri(r, q), 0);
      const truoc = new Date(ngayMax + 'T00:00:00Z'); truoc.setUTCDate(truoc.getUTCDate() - 1);
      const a = g(truoc.toISOString().slice(0, 10)), b = g(ngayMax);
      const kh = can >= Math.min(a, b) - 0.05 && can <= Math.max(a, b) + 0.05;
      tong++; if (kh) ok++;
      ct.push(k + ':' + (kh ? '✓' : '✗ cần ' + can.toFixed(2) + ' được ' + b.toFixed(2)));
    });
    const dat = ok === tong;
    if (!dat) hong.push({ ten: q.ten, ok: ok, tong: tong, ct: ct });
    console.log((dat ? '✓ ' : '  ') + q.ten.slice(0, 42).padEnd(44) +
      (ok + '/' + tong).padStart(7) + '  ' + ct.join('  '));
  });

  /* ---------- chương trình chưa có quy tắc ---------- */
  const daCo = new Set(bang.quyTac.map(q => q.ten));
  const chua = Array.from(muc.keys()).filter(t => !daCo.has(t) && Array.from(muc.get(t).v.values()).some(v => Math.abs(v) > 0.05));
  if (chua.length) {
    console.log('\nCHƯA CÓ QUY TẮC — số từng kho để dò tiếp (' + chua.length + ' chương trình):');
    chua.sort().forEach(t => {
      const m = muc.get(t);
      console.log('  ' + t.slice(0, 44).padEnd(46) + m.donVi + '  ' +
        Array.from(m.v.entries()).map(([k, v]) => k + '=' + v.toFixed(2)).join('  '));
    });
  }

  console.log('\nTóm lại: ' + (bang.quyTac.length - hong.length) + '/' + bang.quyTac.length +
    ' quy tắc đúng trên MỌI kho có dữ liệu; ' + chua.length + ' chương trình chưa dò.');
  if (hong.length) {
    console.log('Cần xem lại: ' + hong.map(x => x.ten + ' (' + x.ok + '/' + x.tong + ')').join(' · '));
  }
  console.log('\nMuốn thêm ràng buộc thì bảo cụm khác cập nhật công cụ Realtime rồi chạy một cữ —');
  console.log('gói của họ tự lên kho, script này tự thấy, không phải khai báo gì.');
})().catch(e => { console.error('LỖI: ' + e.message); process.exit(1); });
