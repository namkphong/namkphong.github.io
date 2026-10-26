#!/usr/bin/env node
/*
 * GOM DỮ LIỆU MỘT THÁNG ĐỂ DÒ QUY TẮC — một lần tải, thử giả thuyết thoải mái.
 * =============================================================================
 * Mọi kho có gói rt_thidua_cum*.json -> { key, ten, ngayGoi, ct, hn, dong } ghi ra
 * <thư mục tạm>/du-lieu-<thang>.json. Lọc dòng đã trả/huỷ y hệt kiem-bang-gan.js.
 * ct[tên chương trình] = { v: luỹ kế tháng ĐẾN HẾT HÔM QUA (của baocao), dv, tg }.
 *
 * Dùng cùng phan-tich/thu-quy-tac.js. Dữ liệu KHÔNG đưa vào git (có tên nhân viên).
 *
 * CHẠY:  node phan-tich/gom-du-lieu-thang.js [--thang 202610]
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const khoFile = require('./kho-file');   // kho file chung: Supabase hay R2 đổi ở dmx-cluster-shared.js
const SB = 'https://kyyoihvcsrnmylnmbcis.supabase.co', KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const arg = process.argv.indexOf('--thang');
const THANG = arg > 0 ? process.argv[arg + 1]
  : (() => { const d = new Date(Date.now() + 7 * 3600e3); return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0'); })();
const TU = THANG.slice(0, 4) + '-' + THANG.slice(4) + '-01';
const DEN = new Date(Date.UTC(+THANG.slice(0, 4), +THANG.slice(4), 1)).toISOString().slice(0, 10);
const RA = path.join(os.tmpdir(), 'du-lieu-' + THANG + '.json');

async function timGoi() {
  const out = [];
  for (const f of await khoFile.ds('rt_thidua_cum')) {
    if (!/^rt_thidua_cum.*\.json$/.test(f.name)) continue;
    try { out.push({ ten: f.name, goi: await (await fetch(khoFile.moi(f.name))).json() }); } catch (e) {}
  }
  return out;
}
/* BẢN SAO THỪA (26/10/2026). Vài lần đẩy (15/10 Phú Cường, 17/10 Ngọc Thụy, 19/10 Mai Đình)
 * ghi MỖI dòng hàng 2 lần với số thứ tự dòng dời lên (dòng 1 thành 2…). Lần đẩy sau ghi đè
 * dòng 1, bản thứ hai nằm lại mãi — đơn tạo trước cửa sổ của cữ mới nhất thì không bị coi là
 * "đã trả" nên bị CỘNG HAI LẦN (Ngọc Thụy 01–25/10: file 77 ra 2,79 tỷ thay vì 2,12 tỷ).
 * Dòng nào có bản GIỐNG HỆT (cùng đơn, cùng sản phẩm, cùng tiền, cùng số lượng) được đẩy
 * MỚI HƠN thì bỏ. Hai món giống nhau thật trong một đơn luôn đi cùng một lần đẩy nên giữ đủ. */
function boBanSaoCu(rows) {
  var k = function (x) { return [x.ma_don_hang, x.ma_san_pham || x.ten_san_pham, x.quy_doi, x.so_luong].join('|'); };
  var moi = {};
  rows.forEach(function (x) { var kk = k(x); if (!moi[kk] || x.updated_at > moi[kk]) moi[kk] = x.updated_at; });
  return rows.filter(function (x) { return x.updated_at === moi[k(x)]; });
}
async function layDong(key) {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const u = SB + '/rest/v1/ycx_lines?store_key=eq.' + encodeURIComponent(key) +
      '&ngay_xuat=gte.' + TU + '&ngay_xuat=lt.' + DEN + '&select=*&order=id.asc&limit=1000&offset=' + off;
    const r = await fetch(u, { headers: H }); if (!r.ok) break;
    const j = await r.json(); out.push(...j); if (j.length < 1000) break;
  }
  if (!out.length) return [];
  // Bỏ dòng đã trả/huỷ: chỉ trong khoảng ngày mà cữ đẩy mới nhất có phủ (xem kiem-bang-gan.js).
  const moc = out.map(x => x.updated_at).sort().pop();
  // Khoảng phủ theo NGÀY TẠO (report 77 lọc theo ngày tạo; pre-order tạo sớm xuất muộn).
  const ngTao = x => x.ngay_tao || x.ngay_xuat;
  const tk = out.filter(x => x.updated_at === moc).map(ngTao);
  const dTu = tk.reduce((m, v) => v < m ? v : m), dDen = tk.reduce((m, v) => v > m ? v : m);
  return boBanSaoCu(out).filter(x => !(x.updated_at !== moc && ngTao(x) >= dTu && ngTao(x) <= dDen))
    .map(r => ({ d: r.ngay_xuat, don: r.ma_don_hang, tao: r.nguoi_tao, nganh: r.nganh_hang, nhom: r.nhom_hang,
                 sp: r.ma_san_pham, ten: r.ten_san_pham, hang: r.nha_san_xuat, sl: r.so_luong, gia: r.gia_ban_1,
                 qd: r.quy_doi, tg: r.la_tra_gop, ht: r.hinh_thuc_xuat, tt: r.hinh_thuc_thanh_toan }));
}
(async () => {
  const goi = await timGoi(), kho = [];
  for (const g of goi) for (const s of (g.goi.sieuThi || [])) {
    if (!s.key || !(s.ct || []).length) continue;
    // Gói phải CÙNG THÁNG: đầu tháng gói còn của tháng trước thì ct là số tháng trước.
    if (String(g.goi.ngay || '').slice(0, 7).replace('-', '') !== THANG) continue;
    const dong = await layDong(s.key);
    if (!dong.length) continue;
    const ct = {}; (s.ct || []).forEach(c => { ct[c.ten] = { v: c.thang, dv: c.donVi, tg: c.target }; });
    const hn = {}; (s.banHomNay || []).forEach(c => { hn[c.ten] = c.homNay; });
    kho.push({ key: s.key, mwg: s.mwg, ten: s.ten, ngayGoi: g.goi.ngay, ct, hn, dong });
  }
  fs.writeFileSync(RA, JSON.stringify(kho));
  console.log(THANG + ': ' + kho.length + ' kho · ' + kho.reduce((a, k) => a + k.dong.length, 0) + ' dòng -> ' + RA);
})();
