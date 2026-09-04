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
 *     luôn còn sai số dư.
 *   - baocao GHI CÔNG vài đơn cho người khác với cột "Người tạo". Đo tháng 8 trên
 *     "Máy giặt, Máy sấy, Máy rửa chén": 9/15 người khớp chính xác, số lệch đi
 *     THEO CẶP BÙ TRỪ (61228 +6,84 / 61323 −6,84) nên tổng siêu thị vẫn đúng.
 *     Vì vậy KHÔNG đòi 100% phương trình nhân viên; ngưỡng đặt ở 70%.
 *   - Tháng 8 còn một khoản DƯ ~1-4% ở cấp siêu thị mà chưa lý giải được (ycx
 *     nhiều hơn baocao 3,58 ở kho 14285 và 10,17 ở kho 8807, dồn vào đúng một
 *     nhân viên mỗi kho). ĐÃ LOẠI TRỪ: không phải do hình thức xuất (thử bỏ
 *     pre-order / đổi bảo hành / ưu đãi NV / TCĐM đều không đổi số). Chừng nào
 *     chưa hiểu khoản dư này thì đừng tin kết quả dò của tháng 8.
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
    // Ngưỡng rộng (0,5) chứ không phải EPS: người có target 0 vẫn có thể lệch
    // vài trăm nghìn do đơn được ghi công cho người khác. Chặt quá là loại oan.
    m.forEach((v, n) => { if (v > 0.5) loai.add(n); });
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
    // Chấm TÁCH LÀM HAI. Phương trình SIÊU THỊ là thước đo chính vì nó chắc
    // chắn; phương trình NHÂN VIÊN chỉ để phân định khi hai bộ lọc ngang nhau.
    // Lý do: baocao ghi công vài đơn cho NGƯỜI KHÁC với cột "Người tạo" — đo
    // 04/09/2026 trên "Máy giặt, Máy sấy, Máy rửa chén" tháng 8 thì 9/15 người
    // khớp chính xác, còn lại lệch THEO CẶP BÙ TRỪ (61228 +6,84 / 61323 −6,84;
    // 221037 +15,53 / 98372 −15,52) nên tổng siêu thị vẫn đúng. Bắt khớp tuyệt
    // đối mọi phương trình nhân viên là loại oan chính đáp án đúng.
    let eKho = 0, khopKho = 0, eNguoi = 0, khopNguoi = 0, tongNguoi = 0;
    const nguoi = new Set();
    muc.forEach((v, k) => nguoi.add(k));
    tong.forEach((v, k) => nguoi.add(k));
    nguoi.forEach(k => {
      if (!mucKho.has(k.split('|')[0])) return;
      const can = muc.get(k) || 0;
      const d = (tong.get(k) || 0) - can;
      eNguoi += Math.abs(d); tongNguoi++;
      if (Math.abs(d) < Math.max(EPS, Math.abs(can) * 0.01)) khopNguoi++;
    });
    mucKho.forEach((v, m) => {
      const d = (tongKho.get(m) || 0) - v;
      eKho += Math.abs(d);
      if (Math.abs(d) < Math.max(EPS, Math.abs(v) * 0.01)) khopKho++;
    });
    return {
      e: eKho, eNguoi: eNguoi,
      khopKho: khopKho, tongKho: mucKho.size,
      khopNguoi: khopNguoi, tongNguoi: tongNguoi,
      // "tot hơn" = sai số siêu thị nhỏ hơn; ngang nhau thì xét tới nhân viên.
      // Lấy TỔNG sai số nhân viên làm chính (cộng thêm sai số siêu thị có trọng
      // số). Chỉ chấm theo tổng siêu thị thì cả cụm chỉ có 2 phương trình — quá
      // ít để định ra hàng trăm nhóm hàng, bộ dò khớp bừa ra quy tắc vô lý.
      // Phương trình nhân viên tuy nhiễu (vài đơn ghi công người khác) nhưng
      // nhiễu đó nhỏ và cố định, còn chọn sai nhóm thì sai số vọt lên hẳn.
      diem: eNguoi + eKho * 3
    };
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
      if (s.diem < tot.diem - 1e-9 && (!hay || s.diem < hay.s.diem)) hay = { n: n, s: s };
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
        if (s.diem < tot.diem - 1e-9 && (!hay || s.diem < hay.s.diem)) hay = { h: h, s: s };
      }
      if (!hay) break;
      bo.push(hay.h); tot = hay.s;
    }
  }

  // Bước 5 — bộ lọc đặc biệt (trả chậm), lấy cái nào tốt hơn
  let dacBiet = null;
  LOC_DAC_BIET.forEach(x => {
    const s = saiSo(x.f);
    if (s.diem < tot.diem - 1e-9) { tot = s; dacBiet = x.ten; }
  });

  // Chương trình mà MỌI số đều bằng 0 thì bộ lọc rỗng cũng 'khớp' — đừng đánh
  // dấu đạt, không có gì để học cả.
  const coSo = ct.kho.some(x => Math.abs(x.v) > EPS) || ct.nv.some(x => Math.abs(x.v) > EPS);
  return {
    ten: ct.ten,
    donVi: ct.donVi,
    coSo: coSo,
    quyTac: dacBiet ? { loc: dacBiet } : { nhom: chon.slice().sort(), boHang: bo.slice().sort() },
    khopKho: tot.khopKho + '/' + tot.tongKho,
    khopNguoi: tot.khopNguoi + '/' + tot.tongNguoi,
    saiSoKho: +tot.e.toFixed(3),
    // ĐẠT = mọi siêu thị khớp VÀ ít nhất 80% nhân viên khớp. Không đòi 100%
    // nhân viên vì baocao ghi công vài đơn cho người khác (xem ghi chú ở saiSo).
    dat: coSo && tot.khopKho === tot.tongKho &&
         (tot.tongNguoi === 0 || tot.khopNguoi / tot.tongNguoi >= 0.7)
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
    .sort((a, b) => (b.dat - a.dat) || (a.saiSoKho - b.saiSoKho));

  console.log('\n' + 'CHƯƠNG TRÌNH'.padEnd(40) + 'ST'.padStart(6) + 'NV'.padStart(9) +
    'lệch ST'.padStart(10) + '  QUY TẮC');
  kq.forEach(r => {
    const q = r.quyTac.loc ? r.quyTac.loc
      : (r.quyTac.nhom.length ? 'nhóm ' + r.quyTac.nhom.join('+') : '(không tìm ra)') +
      (r.quyTac.boHang.length ? '  · bỏ hãng ' + r.quyTac.boHang.join(', ') : '');
    console.log((r.dat ? '✓ ' : (r.coSo ? '  ' : '· ')) + r.ten.slice(0, 39).padEnd(40) +
      r.khopKho.padStart(6) + r.khopNguoi.padStart(9) +
      String(r.saiSoKho).padStart(10) + '  ' + q);
  });
  const dat = kq.filter(r => r.dat).length;
  console.log('\nGán chắc chắn ' + dat + '/' + kq.length +
    ' chương trình có phát sinh số. Dấu · = tháng này không có số nào, không dò được.');

  if (o.ra) {
    fs.writeFileSync(o.ra, JSON.stringify({ thang: o.thang, luc: new Date().toISOString(), ketQua: kq }, null, 1));
    console.log('Đã ghi ' + o.ra);
  }
})().catch(e => { console.error('LỖI: ' + e.message); process.exit(1); });
