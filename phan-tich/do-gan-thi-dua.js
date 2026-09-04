#!/usr/bin/env node
/*
 * DÒ BẢNG GÁN: ngành hàng (report 77 / ycx_lines)  ->  chương trình thi đua (baocao)
 * =============================================================================
 * Vì sao cần: bảng thi đua của baocao chỉ có LUỸ KẾ THÁNG và làm mới 15-20 phút/lần.
 * Muốn biết trong ca ai đang bán ngành thi đua nào thì phải đi từ dòng hàng của
 * report 77 rồi gán vào chương trình. Danh mục chương trình ĐỔI THEO THÁNG nên
 * bảng gán không được đóng cứng — phải dò lại mỗi tháng bằng chính số thật.
 *
 * NGUYÊN TẮC: không đoán theo tên. Tìm bộ lọc nào cộng lại ĐÚNG con số baocao trả
 * về. Khớp mới nhận. Cách này tự nói khi nó sai.
 *
 * QUY TRÌNH (đã chứng minh bằng tay ngày 04/09/2026):
 *   1. Chia theo NHÂN VIÊN trước — cùng một quy tắc phải đúng cho mọi người, nên
 *      mỗi nhân viên là một phương trình. Gán người bằng cột "Người tạo"
 *      (nguoi_tao) là ĐÚNG: chương trình Camera khớp 3/3 người tới 3 số lẻ.
 *   2. Loại nhóm chắc chắn không thuộc: người có target 0 mà bán nhóm N thì N
 *      không thuộc chương trình.
 *   3. Ghép tham lam phần còn lại, mỗi lần thêm nhóm nào giảm sai số nhiều nhất.
 *   4. Còn dư thì thử LOẠI TRỪ THEO HÃNG — có chương trình loại ở cấp sản phẩm
 *      chứ không chỉ nhóm hàng (Đồng hồ tháng 8 loại đúng dòng Apple Watch SE 3).
 *   5. Thử thêm bộ lọc đặc biệt cho nhóm trả chậm ("Công nợ chuyển khoản" chính
 *      là HomeCredit — đo 04/09/2026, khớp chính xác 99,28).
 *
 * BẪY ĐÃ DÍNH — đọc kỹ trước khi sửa:
 *   - Danh sách nhân viên lấy về mà BỊ CẮT CỤT thì người có target thật bị coi là
 *     0, rồi bước 2 loại oan đúng cái nhóm cần tìm. Script từ chối chạy nếu file
 *     tự khai số dòng không khớp.
 *   - Đừng giả định chương trình = hợp của các nhóm hàng. Vét cạn trên tập nhóm
 *     trả về 0 nghiệm là chuyện bình thường, không phải bế tắc.
 *   - Tháng CHƯA chốt thì baocao chốt số giữa ngày còn ycx có tới hiện tại, nên
 *     luôn còn sai số dư. Dò thì dùng THÁNG ĐÃ CHỐT cho sạch.
 *
 * CHẠY:
 *   node phan-tich/do-gan-thi-dua.js --thang 202608 --kho 396:14285,142:8807 \
 *        --thidua thidua_202608_14285-8807.json  [--chuongtrinh "Tên"]  [--ra ket-qua.json]
 *
 *   Tên file đó do đoạn mã trong phan-tich/lay-so-thi-dua.js — dán vào
 *   Console tab baocao đẩy lên Supabase Storage (node không đăng nhập được vào baocao).
 */

'use strict';

const fs = require('fs');
const SB = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
const KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
const EPS = 0.03;                       // sai số chấp nhận (triệu đồng, hoặc cái)

/* ---------------- tham số ---------------- */
function thamSo() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1];
  if (!o.thang || !o.kho || !o.thidua) {
    console.error('Thiếu tham số. Xem phần CHẠY ở đầu file.');
    process.exit(1);
  }
  o.kho = o.kho.split(',').map(x => {
    const p = x.split(':');
    return { storeKey: p[0], mwg: p[1] };
  });
  return o;
}

/* ---------------- lấy dòng hàng từ Supabase (có phân trang) ---------------- */
async function layDong(storeKey, thang) {
  const y = +thang.slice(0, 4), m = +thang.slice(4);
  const tu = thang.slice(0, 4) + '-' + thang.slice(4) + '-01';
  const den = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const out = [];
  for (let off = 0; ; off += 1000) {
    const u = SB + '/rest/v1/ycx_lines?store_key=eq.' + storeKey +
      '&ngay_xuat=gte.' + tu + '&ngay_xuat=lt.' + den +
      '&select=*&order=id.asc&limit=1000&offset=' + off;
    const r = await fetch(u, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
    if (!r.ok) throw new Error('Supabase ' + r.status + ' khi đọc ycx_lines');
    const j = await r.json();
    out.push.apply(out, j);
    if (j.length < 1000) break;
  }
  return out;
}

/* ---------------- các chiều dùng để lọc ---------------- */
const maNhom = r => String(r.nhom_hang || '?').split(' - ')[0];
const maNV = r => String(r.nguoi_tao || '').split(' - ')[0].trim();
const hang = r => String(r.nha_san_xuat || '').trim();

// Nhóm trả chậm không suy ra được từ nhóm hàng — phải lọc theo cách thanh toán.
const LOC_DAC_BIET = [
  { ten: 'trả góp', f: r => !!r.la_tra_gop },
  { ten: 'trả góp · Công nợ chuyển khoản (= HomeCredit)', f: r => !!r.la_tra_gop && r.hinh_thuc_thanh_toan === 'Công nợ chuyển khoản' },
  { ten: 'trả góp · Công nợ tiền mặt', f: r => !!r.la_tra_gop && r.hinh_thuc_thanh_toan === 'Công nợ tiền mặt' }
];

/* ---------------- lõi: dò một chương trình ---------------- */
function doMotChuongTrinh(ct, dong) {
  const col = ct.donVi === 'SL' ? 'so_luong' : 'gia_ban_1';
  const chia = ct.donVi === 'SL' ? 1 : 1e6;
  const gt = r => (+r[col] || 0) / chia;

  const muc = new Map();                       // "mwg|maNV" -> giá trị cần
  ct.nv.forEach(x => muc.set(x.mwg + '|' + x.ma, x.v));
  const mucKho = new Map();
  ct.kho.forEach(x => mucKho.set(x.mwg, x.v));

  const trong = dong.filter(r => mucKho.has(r._mwg));
  const khoa = r => r._mwg + '|' + maNV(r);

  // Bước 2 — người có target 0 mà bán nhóm N thì N không thuộc chương trình.
  const loai = new Set();
  const theoKhoa = new Map();
  trong.forEach(r => {
    const k = khoa(r);
    if (!theoKhoa.has(k)) theoKhoa.set(k, new Map());
    const m = theoKhoa.get(k);
    m.set(maNhom(r), (m.get(maNhom(r)) || 0) + gt(r));
  });
  theoKhoa.forEach((m, k) => {
    if (!muc.has(k)) return;                   // người không nằm trong chương trình: bỏ qua
    if (muc.get(k) > EPS) return;
    m.forEach((v, n) => { if (v > EPS) loai.add(n); });
  });

  const ungVien = [];
  trong.forEach(r => {
    const n = maNhom(r);
    if (!loai.has(n) && ungVien.indexOf(n) === -1) ungVien.push(n);
  });

  // sai số của một bộ lọc trên MỌI phương trình (nhân viên + siêu thị)
  function saiSo(f) {
    const tong = new Map(), tongKho = new Map();
    trong.forEach(r => {
      if (!f(r)) return;
      tong.set(khoa(r), (tong.get(khoa(r)) || 0) + gt(r));
      tongKho.set(r._mwg, (tongKho.get(r._mwg) || 0) + gt(r));
    });
    let e = 0, khop = 0, tongPt = 0;
    const nguoi = new Set();
    muc.forEach((v, k) => nguoi.add(k));
    tong.forEach((v, k) => nguoi.add(k));
    nguoi.forEach(k => {
      if (!mucKho.has(k.split('|')[0])) return;
      const d = (tong.get(k) || 0) - (muc.get(k) || 0);
      e += Math.abs(d); tongPt++; if (Math.abs(d) < EPS) khop++;
    });
    mucKho.forEach((v, m) => {
      const d = (tongKho.get(m) || 0) - v;
      e += Math.abs(d); tongPt++; if (Math.abs(d) < EPS) khop++;
    });
    return { e: e, khop: khop, tongPt: tongPt };
  }

  // Bước 3 — ghép tham lam theo nhóm hàng
  const chon = [];
  let tot = saiSo(function () { return false; });
  for (;;) {
    let hay = null;
    for (let i = 0; i < ungVien.length; i++) {
      const n = ungVien[i];
      if (chon.indexOf(n) !== -1) continue;
      const thu = chon.concat(n);
      const s = saiSo(r => thu.indexOf(maNhom(r)) !== -1);
      if (s.e < tot.e - 1e-9 && (!hay || s.e < hay.s.e)) hay = { n: n, s: s };
    }
    if (!hay) break;
    chon.push(hay.n); tot = hay.s;
  }

  // Bước 4 — còn dư thì thử loại theo HÃNG
  const bo = [];
  if (tot.e > EPS && chon.length) {
    const hangCo = [];
    trong.forEach(r => {
      if (chon.indexOf(maNhom(r)) === -1) return;
      const h = hang(r);
      if (h && hangCo.indexOf(h) === -1) hangCo.push(h);
    });
    for (;;) {
      let hay = null;
      for (let i = 0; i < hangCo.length; i++) {
        const h = hangCo[i];
        if (bo.indexOf(h) !== -1) continue;
        const thu = bo.concat(h);
        const s = saiSo(r => chon.indexOf(maNhom(r)) !== -1 && thu.indexOf(hang(r)) === -1);
        if (s.e < tot.e - 1e-9 && (!hay || s.e < hay.s.e)) hay = { h: h, s: s };
      }
      if (!hay) break;
      bo.push(hay.h); tot = hay.s;
    }
  }

  // Bước 5 — bộ lọc đặc biệt (trả chậm), lấy cái nào tốt hơn
  let dacBiet = null;
  LOC_DAC_BIET.forEach(x => {
    const s = saiSo(x.f);
    if (s.e < tot.e - 1e-9) { tot = s; dacBiet = x.ten; }
  });

  return {
    ten: ct.ten,
    donVi: ct.donVi,
    quyTac: dacBiet ? { loc: dacBiet } : { nhom: chon.slice().sort(), boHang: bo.slice().sort() },
    khop: tot.khop,
    tongPhuongTrinh: tot.tongPt,
    saiSo: +tot.e.toFixed(3),
    dat: tot.khop === tot.tongPt
  };
}

/* ---------------- chạy ---------------- */
(async function () {
  const o = thamSo();
  // --thidua nhận TÊN FILE trên Supabase Storage (bucket bc) hoặc đường dẫn máy.
  // Ưu tiên Storage: trang baocao tự đẩy lên đó, khỏi chuyển file bằng tay.
  const td = /[\/]/.test(o.thidua) || fs.existsSync(o.thidua)
    ? JSON.parse(fs.readFileSync(o.thidua, 'utf8'))
    : await (async () => {
        const u = SB + '/storage/v1/object/public/bc/' + o.thidua + '?t=' + Date.now();
        const r = await fetch(u);
        if (!r.ok) throw new Error('Không tải được ' + o.thidua + ' trên Supabase Storage (' + r.status + ')');
        return r.json();
      })();

  if (!td.kho || !td.nv) throw new Error('File thi đua thiếu khoá "kho" hoặc "nv".');
  if (td.thang && String(td.thang) !== String(o.thang)) {
    throw new Error('File thi đua là tháng ' + td.thang + ' nhưng đang dò tháng ' + o.thang);
  }
  // Chặn bẫy cắt cụt — thiếu dòng là dò ra kết quả sai mà trông vẫn bình thường.
  if (td.soDongNV !== undefined && td.soDongNV !== td.nv.length) {
    throw new Error('File thi đua BỊ THIẾU DÒNG: khai ' + td.soDongNV + ' nhưng chỉ có ' +
      td.nv.length + '. Lấy lại, đừng chạy tiếp.');
  }

  const dong = [];
  for (let i = 0; i < o.kho.length; i++) {
    const k = o.kho[i];
    const d = await layDong(k.storeKey, o.thang);
    d.forEach(r => { r._mwg = k.mwg; });
    dong.push.apply(dong, d);
    const ngay = new Set(d.map(r => r.ngay_xuat));
    console.log('kho ' + k.storeKey + ' (' + k.mwg + '): ' + d.length + ' dòng · ' + ngay.size + ' ngày có số');
  }
  if (!dong.length) throw new Error('Không có dòng hàng nào — kiểm lại tháng và mã kho.');

  // CHỐT CHẶN. Hai cột nha_san_xuat / hinh_thuc_thanh_toan mới thêm 04/09/2026,
  // và "Đẩy DB" mỗi lần chỉ phủ 14 ngày gần nhất — nên tháng cũ còn hàng loạt
  // dòng rỗng. Chạy tiếp trên đó thì bước "loại theo hãng" và bộ lọc trả chậm
  // làm việc trên dữ liệu rỗng: ra quy tắc vô lý mà trông vẫn như đã dò xong.
  // Đã dính thật với tháng 8 (777/1604 dòng có cột mới -> chỉ gán được 3/37).
  const coHang = dong.filter(r => String(r.nha_san_xuat || '').trim()).length;
  const coTT = dong.filter(r => String(r.hinh_thuc_thanh_toan || '').trim()).length;
  const tyLe = Math.min(coHang, coTT) / dong.length;
  console.log('Cột hãng / hình thức thanh toán: ' + coHang + ' và ' + coTT + ' / ' + dong.length + ' dòng');
  if (tyLe < 0.9) {
    throw new Error('Tháng này mới có ' + Math.round(tyLe * 100) + '% số dòng mang cột ' +
      'nha_san_xuat / hinh_thuc_thanh_toan. Dò tiếp sẽ ra quy tắc sai mà không báo gì.\n' +
      'Cách sửa: mở realtimenv.html, nạp file report 77 của ĐÚNG tháng này rồi bấm "⬆ Đẩy DB" ' +
      'để nạp lại — mỗi lần đẩy tự động chỉ phủ 14 ngày gần nhất.');
  }

  const ctMap = new Map();
  td.kho.forEach(x => {                        // [tên, đơn vị, mwg, giá trị]
    if (!ctMap.has(x[0])) ctMap.set(x[0], { ten: x[0], donVi: x[1], kho: [], nv: [] });
    ctMap.get(x[0]).kho.push({ mwg: String(x[2]), v: x[3] });
  });
  td.nv.forEach(x => {                         // [tên, đơn vị, mwg, mã NV, giá trị]
    if (ctMap.has(x[0])) ctMap.get(x[0]).nv.push({ mwg: String(x[2]), ma: String(x[3]), v: x[4] });
  });

  let ds = Array.from(ctMap.values());
  if (o.chuongtrinh) ds = ds.filter(c => c.ten === o.chuongtrinh);

  const kq = ds.map(c => doMotChuongTrinh(c, dong))
    .sort((a, b) => (b.dat - a.dat) || (a.saiSo - b.saiSo));

  console.log('\n' + 'CHƯƠNG TRÌNH'.padEnd(44) + 'khớp'.padStart(8) + 'sai số'.padStart(10) + '  QUY TẮC');
  kq.forEach(r => {
    const q = r.quyTac.loc ? r.quyTac.loc
      : (r.quyTac.nhom.length ? 'nhóm ' + r.quyTac.nhom.join('+') : '(không tìm ra)') +
      (r.quyTac.boHang.length ? '  · bỏ hãng ' + r.quyTac.boHang.join(', ') : '');
    console.log((r.dat ? '✓ ' : '  ') + r.ten.slice(0, 41).padEnd(42) +
      (r.khop + '/' + r.tongPhuongTrinh).padStart(8) + String(r.saiSo).padStart(10) + '  ' + q);
  });
  const dat = kq.filter(r => r.dat).length;
  console.log('\nGán chắc chắn ' + dat + '/' + kq.length +
    ' chương trình (khớp MỌI phương trình nhân viên và siêu thị).');

  if (o.ra) {
    fs.writeFileSync(o.ra, JSON.stringify({ thang: o.thang, luc: new Date().toISOString(), ketQua: kq }, null, 1));
    console.log('Đã ghi ' + o.ra);
  }
})().catch(e => { console.error('LỖI: ' + e.message); process.exit(1); });
