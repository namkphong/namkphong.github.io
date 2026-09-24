#!/usr/bin/env node
/*
 * HỌC DANH SÁCH MẪU ĐƯỢC NHÂN HỆ SỐ trong một chương trình thi đua.
 * =============================================================================
 * Dò 24/09/2026 (anh Phong: "một số nhóm tủ lạnh có thi đua hãng, vd Toshiba áp
 * 1,2"): chương trình TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT = ngành 1755, nhưng MỘT SỐ MẪU tính
 * ×1,2. Không theo hãng (Toshiba RT236 ×1 mà Toshiba RF611 ×1,2), không theo giá,
 * CTKM trống — chỉ còn cách HỌC danh sách mẫu từ số liệu:
 *   mỗi kho:  Σ giá (cả ngành) + (hệ số − 1) × Σ giá(mẫu trong danh sách) = số baocao
 * => T_kho = (cần − Σ giá) / (hệ số − 1) = tổng giá các dòng thuộc mẫu ×hệ số.
 * Giải từng kho bằng vét tập con theo MÃ SẢN PHẨM (mọi dòng cùng mã đi cùng nhau),
 * kho ít mẫu chưa biết giải trước, đáp án DUY NHẤT mới nhận, rồi truyền sang kho
 * khác. Kho có nhiều nghiệm hoặc vô nghiệm thì để đó, báo ra.
 *
 * CHẠY:  node phan-tich/hoc-he-so-sp.js --thang 202609 --ct "TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT" \
 *          --nganh 1755 | --nhom 1099,3659 [--heso 1.2] [--biet 1751097000009=1.2,1751097000190=1]
 * --biet: mẫu đã biết (lấy từ heSoSP của quy tắc: =1.2; mẫu chắc chắn ×1: =1).
 * Cần chạy phan-tich/gom-du-lieu-thang.js trước.
 */
'use strict';
const A = process.argv, lay = (k, md) => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : md; };
const THANG = lay('thang'), CT = lay('ct'), HS = Number(lay('heso', '1.2'));
// Lọc dòng của chương trình: --nganh 1755 hoặc --nhom 1099,3659,3859 (Máy giặt đo theo NHÓM).
const NGANH = lay('nganh') ? lay('nganh').split(',') : null, NHOM = lay('nhom') ? lay('nhom').split(',') : null;
const { KHO, ma } = require('./thu-quy-tac.js')(THANG);
const biet = new Map();                       // mã SP -> hệ số đã biết
String(lay('biet', '')).split(',').filter(Boolean).forEach(x => { const [m, v] = x.split('='); biet.set(m, Number(v)); });

const kho = KHO.filter(k => k.du && k.ct[CT] && k.ct[CT].v > 0).map(k => {
  const d0 = new Date(k.ngayGoi + 'T00:00:00Z'); d0.setUTCDate(d0.getUTCDate() - 1);
  const hq = d0.toISOString().slice(0, 10);
  const dong = k.dong.filter(r => r.d <= hq && (!NGANH || NGANH.indexOf(ma(r.nganh)) !== -1) && (!NHOM || NHOM.indexOf(ma(r.nhom)) !== -1));
  const sp = new Map();                       // mã -> { ten, tien }
  dong.forEach(r => { const e = sp.get(r.sp) || { ten: r.ten, tien: 0 }; e.tien += r.gia / 1e6; sp.set(r.sp, e); });
  return { key: k.key, can: k.ct[CT].v, tong: dong.reduce((s, r) => s + r.gia / 1e6, 0), sp };
});

let doi = true, vong = 0;
const ketLuan = {};
while (doi && vong++ < 20) {
  doi = false;
  kho.sort((a, b) => [...a.sp.keys()].filter(m => !biet.has(m)).length - [...b.sp.keys()].filter(m => !biet.has(m)).length);
  for (const k of kho) {
    const T = (k.can - k.tong) / (HS - 1);
    let daCo = 0;
    const chua = [];
    k.sp.forEach((e, m) => { if (biet.has(m)) { if (biet.get(m) === HS) daCo += e.tien; } else chua.push([m, e.tien]); });
    const con = T - daCo;
    if (chua.length > 22) { ketLuan[k.key] = 'bỏ qua (' + chua.length + ' mẫu chưa biết)'; continue; }
    const nghiem = [];
    for (let s = 0; s < (1 << chua.length) && nghiem.length < 3; s++) {
      let t = 0; for (let i = 0; i < chua.length; i++) if (s >> i & 1) t += chua[i][1];
      if (Math.abs(t - con) <= 0.3) nghiem.push(s);      // ±0,3 tr: cần là số làm tròn 2 chữ số trên TỔNG ×0,2
    }
    if (!chua.length) { ketLuan[k.key] = Math.abs(con) <= 0.3 ? 'khớp' : 'LỆCH ' + con.toFixed(2) + ' (mọi mẫu đã biết)'; continue; }
    if (nghiem.length === 1) {
      chua.forEach(([m], i) => { biet.set(m, (nghiem[0] >> i & 1) ? HS : 1); });
      ketLuan[k.key] = 'giải được ' + chua.length + ' mẫu'; doi = true;
    } else ketLuan[k.key] = nghiem.length ? 'nhiều nghiệm (' + chua.length + ' mẫu chưa biết)' : 'VÔ NGHIỆM (' + chua.length + ' mẫu chưa biết, cần ' + con.toFixed(2) + ')';
  }
}
console.log(CT + ' — hệ số ' + HS);
kho.forEach(k => console.log('  ' + k.key.padEnd(7) + ketLuan[k.key]));
const ten = new Map(); kho.forEach(k => k.sp.forEach((e, m) => ten.set(m, e.ten)));
const ds = [...biet].filter(([m]) => ten.has(m)).sort((a, b) => b[1] - a[1]);
console.log('\nMẪU ×' + HS + ' (' + ds.filter(x => x[1] === HS).length + '):');
ds.filter(x => x[1] === HS).forEach(([m]) => console.log('  ' + m + '  ' + ten.get(m)));
console.log('\nMẪU ×1 (' + ds.filter(x => x[1] !== HS).length + ')');
console.log('\nJSON heSoSP: ' + JSON.stringify(Object.fromEntries(ds.filter(x => x[1] === HS).map(([m]) => [m, HS]))));
