#!/usr/bin/env node
/*
 * LƯU LẠI DỮ LIỆU CỦA NHỮNG CHỖ CHƯA KHỚP — để lần sau dò theo SẢN PHẨM.
 * =============================================================================
 * Anh Phong dặn 26/09/2026: dữ liệu đã thấy mà chưa dò ra quy tắc thì phải LƯU LẠI,
 * lần sau còn khớp theo sản phẩm. Trước đây du-lieu-<thang>.json nằm ở thư mục tạm,
 * bị ghi đè mỗi ngày — số "cần" của hôm qua mất luôn.
 *
 * Giữ số hằng ngày có giá trị vì HIỆU hai ngày là một phương trình rất ít ẩn:
 *   cần(ngày gói B) − cần(ngày gói A) = Σ các dòng bán trong khoảng [A−1, B−1)
 * — chỉ vài mẫu thay vì cả tháng, nên hệ số theo mẫu / sản phẩm bị loại trừ lộ ra
 * ngay ở những kho mà vét cả tháng "nhiều nghiệm" hay "vô nghiệm".
 *
 * Ghi ra phan-tich/chua-khop-<thang>.json (đưa vào git, KHÔNG có tên nhân viên):
 *   sp         { mã: [tên, ngành, nhóm, hãng] }
 *   ban        { kho: [[mã, ngày, sl, tiền tr], …] }  // MỌI dòng hàng cả tháng, gộp mã × ngày,
 *                                                     // ghi đè bằng bản mới nhất (đơn trả đã bỏ)
 *   du         { kho: true | false }                  // kho đủ tháng?
 *   quyTac     { tên: { donVi, kho: { key: { ngayGoi: [cần, được] } } } }
 *                cần = số baocao luỹ kế ĐẾN HẾT HÔM QUA của gói ngày đó; được = quy tắc
 *                lúc ấy tính ra. CỘNG DỒN qua các ngày — đây là phần không lấy lại được.
 *   chuaQuyTac { tên: { donVi, kho: { key: { ngayGoi: cần } } } }  // gồm cả thu hộ
 * Chỉ ghi quy tắc còn lệch ở ít nhất một kho đủ tháng (ghi mọi kho của nó — kho khớp
 * cũng là ràng buộc). Quy tắc từng lệch mà nay khớp vẫn giữ lịch sử cũ.
 *
 * CHẠY (sau gom-du-lieu-thang.js):  node phan-tich/luu-chua-khop.js --thang 202609
 */
'use strict';
const fs = require('fs'), path = require('path');
const A = process.argv, i = A.indexOf('--thang');
const THANG = i > 0 ? A[i + 1]
  : (() => { const d = new Date(Date.now() + 7 * 3600e3); return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0'); })();
const { KHO, ma } = require('./thu-quy-tac.js')(THANG);
const BANG = JSON.parse(fs.readFileSync(path.join(__dirname, 'bang-gan-' + THANG + '.json'), 'utf8'));
const RA = path.join(__dirname, 'chua-khop-' + THANG + '.json');
const cu = fs.existsSync(RA) ? JSON.parse(fs.readFileSync(RA, 'utf8')) : {};

// Cùng logic hop()/giaTri() của kiem-bang-gan.js, trên dòng gọn của gom-du-lieu-thang.js.
// Sửa quy tắc lọc ở đó thì sửa cả ở đây.
const lo = s => String(s || '').toLowerCase();
function hop(r, q) {
  if (q.maSP) return q.maSP.indexOf(String(r.sp || '')) !== -1;
  if (q.nhom && q.nhom.indexOf(ma(r.nhom)) === -1) return false;
  if (q.nganh && q.nganh.indexOf(ma(r.nganh)) === -1) return false;
  if (q.hang && !q.hang.some(h => lo(r.hang).trim().indexOf(lo(h)) !== -1)) return false;
  if (q.boHang && q.boHang.some(h => lo(r.hang).trim() === lo(h))) return false;
  if (q.boTen && q.boTen.some(t => lo(r.ten).indexOf(lo(t)) !== -1)) return false;
  if (q.tenCo && !q.tenCo.some(t => lo(r.ten).indexOf(lo(t)) !== -1)) return false;
  if (q.traGop && !r.tg) return false;
  if (q.thanhToan && q.thanhToan.indexOf(r.tt || '') === -1) return false;
  return true;
}
function giaTri(r, q) {
  if (q.donVi === 'SL') return Number(r.sl) || 0;
  const hs = (q.heSoSP && q.heSoSP[String(r.sp || '')]) || 1;
  return (Number(q.nen === 'quydoi' ? r.qd : r.gia) || 0) / 1e6 * hs;
}
const homQua = k => { const d = new Date(k.ngayGoi + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
const r4 = x => Math.round(x * 1e4) / 1e4;

const out = { thang: THANG, capNhat: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16).replace('T', ' '),
  ghiChu: 'Dữ liệu những chỗ CHƯA KHỚP, để dò theo sản phẩm. Xem đầu tệp phan-tich/luu-chua-khop.js.',
  sp: {}, ban: {}, du: {}, quyTac: cu.quyTac || {}, chuaQuyTac: cu.chuaQuyTac || {} };
const coQT = new Set();
let soQT = 0, soDong = 0;

KHO.forEach(k => {
  const g = new Map();
  k.dong.forEach(r => {
    const id = r.sp + '|' + r.d;
    const e = g.get(id) || [String(r.sp), r.d.slice(8), 0, 0];
    e[2] += Number(r.sl) || 0; e[3] += (Number(r.gia) || 0) / 1e6;
    g.set(id, e);
    if (!out.sp[r.sp]) out.sp[r.sp] = [r.ten, ma(r.nganh), ma(r.nhom), r.hang || ''];
  });
  out.ban[k.key] = [...g.values()].map(e => (e[3] = r4(e[3]), e))
    .sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[0] < b[0] ? -1 : 1);
  out.du[k.key] = k.du; soDong += g.size;
});

BANG.quyTac.forEach(q => {
  coQT.add(q.ten);
  const kho = KHO.filter(k => k.ct[q.ten]);
  const kq = kho.map(k => {
    const hq = homQua(k);
    const v = k.dong.filter(r => r.d <= hq && hop(r, q)).reduce((s, r) => s + giaTri(r, q), 0);
    return { k, v, lech: Math.abs(v - k.ct[q.ten].v) > (q.donVi === 'SL' ? 0.01 : 0.06) };
  });
  if (!out.quyTac[q.ten] && !kq.some(x => x.k.du && x.lech)) return;   // chưa từng lệch: không cần lưu
  const o = out.quyTac[q.ten] || (out.quyTac[q.ten] = { donVi: q.donVi || 'DT', kho: {} });
  kq.forEach(({ k, v }) => { (o.kho[k.key] || (o.kho[k.key] = {}))[k.ngayGoi] = [k.ct[q.ten].v, r4(v)]; });
  soQT++;
});

// Chương trình chưa có quy tắc: chỉ lưu số theo ngày gói (thu hộ không có dòng hàng).
KHO.forEach(k => Object.keys(k.ct).forEach(ten => {
  if (coQT.has(ten)) return;
  const c = out.chuaQuyTac[ten] || (out.chuaQuyTac[ten] = { donVi: k.ct[ten].dv, kho: {} });
  (c.kho[k.key] || (c.kho[k.key] = {}))[k.ngayGoi] = k.ct[ten].v;
}));

// Mỗi quy tắc một dòng: diff git gọn, đọc lại vẫn là JSON chuẩn.
const dong = o => '{\n' + Object.keys(o).map(k => '    ' + JSON.stringify(k) + ': ' + JSON.stringify(o[k])).join(',\n') + '\n  }';
const txt = '{\n' + ['thang', 'capNhat', 'ghiChu'].map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(out[k])).join(',\n') +
  ',\n  "sp": ' + dong(out.sp) + ',\n  "ban": ' + dong(out.ban) + ',\n  "du": ' + JSON.stringify(out.du) + ',\n  "quyTac": ' + dong(out.quyTac) + ',\n  "chuaQuyTac": ' + dong(out.chuaQuyTac) + '\n}\n';
JSON.parse(txt);
fs.writeFileSync(RA, txt);
console.log(THANG + ': ghi ' + soQT + ' quy tắc (còn lệch hoặc từng lệch) · ' + Object.keys(out.chuaQuyTac).length + ' chương trình chưa có quy tắc · ' +
  soDong + ' dòng mã×ngày · ' + Object.keys(out.sp).length + ' mã -> ' + path.relative(process.cwd(), RA) + ' (' + Math.round(txt.length / 1024) + ' KB)');
