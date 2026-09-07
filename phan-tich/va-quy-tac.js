#!/usr/bin/env node
/*
 * VÁ QUY TẮC ĐANG TỤT.
 * =============================================================================
 * Bảng gán lập hồi chỉ có 4-5 kho. Nay 15 kho, nhiều quy tắc tụt hẳn (TỦ LẠNH
 * 2/12, Cáp - Sạc 5/15). Kiểu sai lại rất đều: hoặc THIẾU ở mọi kho, hoặc DƯ ở
 * mọi kho — nghĩa là quy tắc sót một nhóm hàng, hoặc ôm thừa một nhóm.
 *
 * Script này không đoán: nó lấy độ lệch của TỪNG KHO rồi đi tìm nhóm hàng nào
 * có đúng dãy số đó. Một nhóm khớp được độ lệch ở NHIỀU kho thì gần như chắc
 * chắn là nhóm bị sót/thừa; khớp một kho thì chỉ là trùng hợp.
 *
 * CHẠY:  node phan-tich/va-quy-tac.js ["tên quy tắc"]
 *        không truyền tên thì soi mọi quy tắc chưa đạt 100%.
 */
'use strict';
const fs = require('fs');
const SB = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
const KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const THANG = '2026-09';
// Ngày cuối tháng phải TÍNH, không được ghi cứng '-31': tháng 9 chỉ có 30 ngày
// nên PostgREST trả 400 "date/time field value out of range" và script đọc về
// RỖNG mà vẫn chạy tiếp — báo "Đọc 0 siêu thị" chứ không báo lỗi.
const CUOI_THANG = (() => {
  const [y, m] = THANG.split('-').map(Number);
  return THANG + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0');
})();
const TOL = 0.05;

const mNganh = r => String(r.nganh_hang || '').split(' - ')[0];
const mNhom  = r => String(r.nhom_hang || '').split(' - ')[0];
const hangSX = r => String(r.nha_san_xuat || '').trim();

function hop(r, q) {
  // maSP: DANH SÁCH MÃ SẢN PHẨM. Dùng cho chương trình không dò được bằng ngành
  // hay nhóm ("Phụ kiện IT và nhóm khác"). Có maSP thì nó QUYẾT ĐỊNH, các vế
  // ngành/nhóm bên dưới không cần nữa. Xem phan-tich/danh-sach-sp.js.
  if (q.maSP) return q.maSP.indexOf(String(r.ma_san_pham || '')) !== -1;
  if (q.nhom && q.nhom.indexOf(mNhom(r)) === -1) return false;
  if (q.nganh && q.nganh.indexOf(mNganh(r)) === -1) return false;
  if (q.hang && !q.hang.some(h => hangSX(r).toLowerCase().indexOf(h.toLowerCase()) !== -1)) return false;
  if (q.boHang && q.boHang.some(h => hangSX(r).toLowerCase() === h.toLowerCase())) return false;
  if (q.boTen && q.boTen.some(t => String(r.ten_san_pham || '').toLowerCase().indexOf(t.toLowerCase()) !== -1)) return false;
  if (q.traGop && !r.la_tra_gop) return false;
  if (q.thanhToan && q.thanhToan.indexOf(r.hinh_thuc_thanh_toan || '') === -1) return false;
  return true;
}
const giaTri = (r, q) => q.donVi === 'SL' ? (Number(r.so_luong) || 0)
  : (q.nen === 'quydoi' ? (Number(r.quy_doi) || 0) : (Number(r.gia_ban_1) || 0)) / 1e6;

async function tatCa(key) {
  let ra = [], t = 0;
  for (;;) {
    const r = await fetch(SB + '/rest/v1/ycx_lines?store_key=eq.' + encodeURIComponent(key) +
      '&ngay_xuat=gte.' + THANG + '-01&ngay_xuat=lte.' + CUOI_THANG +
      '&select=*&order=id.asc&offset=' + t + '&limit=1000', { headers: H });
    const a = await r.json();
    if (!r.ok || !Array.isArray(a)) throw new Error('ycx_lines ' + key + ': ' + JSON.stringify(a).slice(0, 160));
    if (!a.length) break;
    ra = ra.concat(a); t += 1000; if (a.length < 1000) break;
  }
  return ra;
}
function locTra(a) {
  if (!a.length) return a;
  const m = a.map(x => x.updated_at).sort().pop();
  const k = a.filter(x => x.updated_at === m).map(x => x.ngay_xuat);
  const tu = k.reduce((p, v) => v < p ? v : p, '9999'), den = k.reduce((p, v) => v > p ? v : p, '0000');
  return a.filter(x => !(x.updated_at !== m && x.ngay_xuat >= tu && x.ngay_xuat <= den));
}

(async function () {
  const bang = JSON.parse(fs.readFileSync('phan-tich/bang-gan-' + THANG.replace('-', '') + '.json', 'utf8'));
  const ds = await (await fetch(SB + '/storage/v1/object/list/bc', {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H),
    body: JSON.stringify({ prefix: '', limit: 1000 })
  })).json();

  const kho = new Map();
  for (const f of ds.filter(x => /^rt_thidua_cum.*\.json$/.test(x.name))) {
    const g = await (await fetch(SB + '/storage/v1/object/public/bc/' + f.name + '?t=' + Date.now())).json();
    for (const s of (g.sieuThi || [])) {
      if (!s.key || kho.has(s.key)) continue;
      const a = locTra(await tatCa(s.key));
      if (!a.length) continue;
      const muc = new Map();
      (s.ct || []).forEach(c => muc.set(c.ten, { donVi: c.donVi, v: Number(c.thang) || 0 }));
      kho.set(s.key, { ten: s.ten, dong: a, muc: muc, ngayGoi: g.ngay });
    }
  }
  console.log('Đọc ' + kho.size + ' siêu thị.\n');

  const loc = process.argv[2];
  for (const q of bang.quyTac) {
    if (loc && q.ten !== loc) continue;
    // độ lệch từng kho, dùng mốc "đến hôm qua / đến hôm nay" như kiem-bang-gan
    const lech = new Map();
    let dat = 0, co = 0;
    kho.forEach((e, k) => {
      const m = e.muc.get(q.ten); if (!m) return;
      co++;
      // MỐC CHUẨN: ct.thang là luỹ kế ĐẾN HẾT HÔM QUA (xem kiem-bang-gan.js).
      // Dò lệch mà lấy sai mốc thì phần "thiếu" gồm luôn hàng bán hôm nay, và
      // đi tìm nhóm hàng khớp với một con số vô nghĩa.
      const maxN = e.dong.map(r => r.ngay_xuat).sort().pop();
      const goc = e.ngayGoi || maxN;
      const hq = new Date(goc + 'T00:00:00Z'); hq.setUTCDate(hq.getUTCDate() - 1);
      const denHQ = hq.toISOString().slice(0, 10);
      const g = den => e.dong.filter(r => r.ngay_xuat <= den && hop(r, q)).reduce((s, r) => s + giaTri(r, q), 0);
      const a = g(denHQ);
      if (Math.abs(m.v - a) <= TOL) { dat++; return; }
      lech.set(k, m.v - a);          // dương = quy tắc THIẾU, âm = quy tắc DƯ
    });
    if (!co || dat === co) continue;

    const thieu = [...lech.values()].filter(v => v > 0).length;
    const du = [...lech.values()].filter(v => v < 0).length;
    console.log('▌ ' + q.ten + '   ' + dat + '/' + co + '   (' + thieu + ' kho thiếu · ' + du + ' kho dư)');

    // ứng viên: nhóm chưa nằm trong quy tắc (để THÊM) hoặc đang nằm trong (để BỎ)
    const diem = new Map();
    kho.forEach((e, k) => {
      const d = lech.get(k); if (d === undefined) return;
      const goc2 = e.ngayGoi || e.dong.map(r => r.ngay_xuat).sort().pop();
      const hq2 = new Date(goc2 + 'T00:00:00Z'); hq2.setUTCDate(hq2.getUTCDate() - 1);
      const denHQ2 = hq2.toISOString().slice(0, 10);
      const theoNhom = new Map();
      e.dong.filter(r => r.ngay_xuat <= denHQ2).forEach(r => {
        if (q.nganh && q.nganh.indexOf(mNganh(r)) === -1 && d > 0) { /* vẫn xét để THÊM */ }
        const n = mNganh(r) + '/' + mNhom(r);
        if (!theoNhom.has(n)) theoNhom.set(n, { v: 0, ten: r.nhom_hang, trongQt: q.nhom ? q.nhom.indexOf(mNhom(r)) !== -1 : null });
        theoNhom.get(n).v += giaTri(r, q);
      });
      theoNhom.forEach((o, n) => {
        // thiếu -> tìm nhóm có giá trị đúng bằng phần thiếu; dư -> đúng bằng phần dư
        if (Math.abs(o.v - Math.abs(d)) <= TOL) {
          if (!diem.has(n)) diem.set(n, { ten: o.ten, kho: [], huong: d > 0 ? 'THÊM' : 'BỎ' });
          diem.get(n).kho.push(k);
        }
      });
    });
    const xep = [...diem.entries()].sort((a, b) => b[1].kho.length - a[1].kho.length).slice(0, 6);
    if (!xep.length) { console.log('   không nhóm nào khớp đúng phần lệch — sai ở cấp thấp hơn nhóm.\n'); continue; }
    xep.forEach(([n, o]) => console.log('   ' + o.huong + ' ' + String(n).padEnd(12) + String(o.ten || '').slice(0, 34).padEnd(35) +
      'giải thích ' + o.kho.length + '/' + lech.size + ' kho lệch  (' + o.kho.slice(0, 8).join(' ') + ')'));
    console.log('');
  }
})().catch(e => { console.error('LỖI: ' + e.message); process.exit(1); });
