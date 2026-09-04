/*
 * kiem-cong-thuc.js — đối chiếu CÔNG THỨC GIAO MỤC TIÊU với kết quả bán thật.
 *
 * Chạy:  node phan-tich/kiem-cong-thuc.js
 *        node phan-tich/kiem-cong-thuc.js 2026-08     (chỉ định tháng)
 *
 * Nguồn số: bảng ycx_lines trên Supabase (dòng hàng xuất, có nguoi_tao +
 * ngay_xuat + quy_doi). Không cần đăng nhập — đọc bằng khoá publishable.
 *
 * VÌ SAO CẦN: mục tiêu tuần giao cho nhân viên tính bằng công thức có mấy hằng
 * số chọn tay (hệ số theo D, trần vượt target, sàn 70tr/tuần). Không đo lại thì
 * không biết mấy hằng số đó còn hợp hay không khi cụm mới, mùa vụ, hay cách
 * giao target thay đổi.
 *
 * CÁCH ĐO: với mỗi nhân viên, mỗi ngày D trong tháng, dựng lại đúng trạng thái
 * thẻ nhìn thấy hôm đó (chỉ số tới hết ngày D-1), tính mục tiêu 7 ngày, rồi so
 * với doanh thu THỰC 7 ngày sau đó.
 *
 * LƯU Ý VỀ TARGET: ycx_lines không có target cá nhân, nên lấy "target = chính
 * số nhân viên làm được cả tháng" làm mốc trung tính, rồi quét thêm kịch bản
 * target giao cao/thấp hơn thực lực để xem kết luận có bền không. Đừng đọc con
 * số tuyệt đối; đọc SO SÁNH giữa các phương án.
 */
'use strict';
const https = require('https');

const SB = 'kyyoihvcsrnmylnmbcis.supabase.co';
const KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';

/* Hằng số ĐANG DÙNG trong nv.html — sửa bên đó thì sửa cả ở đây, nếu không
   phép đo sẽ đo một công thức khác với công thức đang chạy. */
const STRETCH = { D1: 1.10, D2: 1.20, D3: 1.15, D4: 1.05 };
const HE_SO_VUOT = 1.25;
const SAN_NGAY = 10;
const SAN_TUAN = 70;

function tai(duong) {
  return new Promise((ok, hong) => {
    https.get({ host: SB, path: duong, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }, r => {
      let s = '';
      r.on('data', d => s += d);
      r.on('end', () => { try { ok(JSON.parse(s)); } catch (e) { hong(new Error('JSON hong: ' + s.slice(0, 120))); } });
    }).on('error', hong);
  });
}

async function layKho(kho, tu, den) {
  const ra = [];
  for (let off = 0; off < 20000; off += 1000) {
    const p = '/rest/v1/ycx_lines?store_key=eq.' + encodeURIComponent(kho)
      + '&ngay_xuat=gte.' + tu + '&ngay_xuat=lte.' + den
      + '&select=nguoi_tao,ngay_xuat,quy_doi,updated_at&order=id.asc&limit=1000&offset=' + off;
    const t = await tai(p);
    if (!Array.isArray(t) || !t.length) break;
    ra.push.apply(ra, t);
    if (t.length < 1000) break;
  }
  // BỎ DÒNG ĐÃ BỊ TRẢ/HUỶ. ycx_lines chỉ upsert, không bao giờ xoá, nên đơn bị
  // trả sau khi đẩy nằm lại vĩnh viễn. Dòng còn hợp lệ mang updated_at của cữ
  // đẩy mới nhất. Chỉ xét TRONG khoảng ngày cữ đó phủ — report chỉ đổ 14–30
  // ngày, dòng cũ hơn mãi mãi mang mốc cũ mà không phải vì bị trả.
  if (!ra.length) return ra;
  const moc = ra.map(x => x.updated_at).sort().pop();
  const ng = ra.filter(x => x.updated_at === moc).map(x => x.ngay_xuat);
  if (!ng.length) return ra;
  const dTu = ng.reduce((m, v) => v < m ? v : m), dDen = ng.reduce((m, v) => v > m ? v : m);
  return ra.filter(x => !(x.updated_at !== moc && x.ngay_xuat >= dTu && x.ngay_xuat <= dDen));
}

const tb = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const soNgayThang = th => { const p = th.split('-').map(Number); return new Date(p[0], p[1], 0).getDate(); };
const dsNgay = (th, n) => Array.from({ length: n }, (_, i) => th + '-' + String(i + 1).padStart(2, '0'));

/* Dựng lại đúng mục tiêu 7 ngày mà thẻ giao ở ngày D. */
function giaoNgay(ban, ds, D, N, target, heSoTran) {
  const daQua = D - 1, conLai = N - D;
  if (daQua < 2 || conLai < 7) return null;
  const deltas = ds.slice(0, daQua).map(d => ban[d] || 0);
  const dat = deltas.reduce((a, b) => a + b, 0);
  const monthAvg = dat / daQua;
  const nhip = monthAvg > 0 ? 0.5 * tb(deltas.slice(-4)) + 0.5 * monthAvg : tb(deltas.slice(-4));
  const kyVong = D / N * 100, pctHT = target > 0 ? dat / target * 100 : 0;
  const r0 = kyVong > 0 ? pctHT / kyVong : 0;
  const d = r0 >= 1 ? 'D4' : r0 >= 0.85 ? 'D3' : 'D2';
  const cap = nhip > 0 ? nhip * STRETCH[d] : 0;
  const needed = Math.max(0, target - dat) / conLai;
  const tyLeSan = D <= Math.ceil(N / 3) ? 1 : 0.55;
  const floor = cap > 0 ? Math.min(needed * tyLeSan, cap * 1.5) : needed * tyLeSan;
  const tran = heSoTran ? Math.max(0, target * heSoTran - dat) / conLai : Infinity;
  const ngayMuc = Math.max(SAN_NGAY, Math.min(cap, tran), floor);
  return Math.max(SAN_TUAN, ngayMuc * 7);
}

function chay(bo, heSoTran, heSoTarget, chiTuanDiLam) {
  const r = [];
  Object.keys(bo).forEach(k => {
    const th = k.split('|')[1], N = soNgayThang(th), ds = dsNgay(th, N);
    Object.keys(bo[k]).forEach(nv => {
      const ban = bo[k][nv];
      const tong = ds.reduce((a, d) => a + (ban[d] || 0), 0);
      if (tong < 50) return;
      const target = tong * heSoTarget;
      for (let D = 3; D <= N - 7; D++) {
        const giao = giaoNgay(ban, ds, D, N, target, heSoTran);
        if (giao === null) continue;
        const tuan = ds.slice(D - 1, D - 1 + 7);
        const thuc = tuan.reduce((a, d) => a + (ban[d] || 0), 0);
        const ngayBan = tuan.filter(d => ban[d] > 0).length;
        if (thuc <= 0) continue;
        if (chiTuanDiLam && ngayBan < 5) continue;
        r.push(giao / thuc);
      }
    });
  });
  r.sort((a, b) => a - b);
  const q = p => r[Math.floor(r.length * p)] || 0;
  return {
    n: r.length, tv: q(0.5),
    trung: r.length ? r.filter(x => x >= 0.75 && x <= 1.5).length / r.length * 100 : 0,
    qua2: r.length ? r.filter(x => x > 2).length / r.length * 100 : 0,
    duoi05: r.length ? r.filter(x => x < 0.5).length / r.length * 100 : 0
  };
}

async function main() {
  let thang = process.argv[2];
  if (!thang) {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    thang = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  const N = soNgayThang(thang);
  const tu = thang + '-01', den = thang + '-' + String(N).padStart(2, '0');

  // Lấy danh sách kho từ chính cấu hình cụm — không đóng cứng, cụm mới tự vào.
  const cum = await tai('/rest/v1/dmx_clusters?select=site_code,config');
  const khos = [];
  (Array.isArray(cum) ? cum : []).forEach(c => {
    if (/^zz-/i.test(c.site_code || '')) return;
    ((c.config && c.config.stores) || []).forEach(s => {
      if (s.key && khos.indexOf(s.key) === -1) khos.push(s.key);
    });
  });

  console.log('KIEM CONG THUC GIAO MUC TIEU — thang ' + thang);
  console.log('Nguon: ycx_lines · ' + khos.length + ' kho trong cau hinh cum');
  console.log('');

  const bo = {};
  for (let i = 0; i < khos.length; i++) {
    const rows = await layKho(khos[i], tu, den);
    if (!rows.length) continue;
    const k = khos[i] + '|' + thang;
    bo[k] = {};
    rows.forEach(x => {
      const nv = String(x.nguoi_tao || '?').trim();
      const ng = String(x.ngay_xuat || '').slice(0, 10);
      if (!ng) return;
      bo[k][nv] = bo[k][nv] || {};
      bo[k][nv][ng] = (bo[k][nv][ng] || 0) + (Number(x.quy_doi) || 0) / 1e6;
    });
  }
  if (!Object.keys(bo).length) { console.log('✗ Khong co du lieu cho thang nay.'); return; }

  console.log('KHO CO SO:');
  Object.keys(bo).sort().forEach(k => {
    const nvs = Object.keys(bo[k]);
    let t = 0; nvs.forEach(n => Object.keys(bo[k][n]).forEach(d => t += bo[k][n][d]));
    console.log('  ' + k.split('|')[0].padEnd(10) + String(nvs.length).padStart(3) + ' NV · ' + t.toFixed(0).padStart(6) + ' tr');
  });
  console.log('');

  const in1 = (nhan, r) => console.log('  ' + nhan.padEnd(30) + String(r.n).padStart(5) + ' ca | trung vi ' +
    r.tv.toFixed(2) + ' | TRUNG ' + r.trung.toFixed(1).padStart(5) + '% | qua 2x ' + r.qua2.toFixed(1).padStart(5) +
    '% | duoi 0,5x ' + r.duoi05.toFixed(1).padStart(5) + '%');

  console.log('MUC TIEU GIAO / DOANH THU THUC 7 NGAY SAU  (1,00 = khop)');
  in1('tat ca cac tuan', chay(bo, HE_SO_VUOT, 1, false));
  in1('chi tuan di lam >=5/7 ngay', chay(bo, HE_SO_VUOT, 1, true));
  console.log('');

  console.log('QUET HE SO TRAN (tuan di lam binh thuong, target dung thuc luc):');
  [null, 1.10, 1.15, 1.25, 1.40, 1.60].forEach(h =>
    in1(h ? ('tran ' + h.toFixed(2)) : 'khong tran', chay(bo, h, 1, true)));
  console.log('');

  console.log('DO BEN — neu quan ly giao target LECH so thuc luc (TRUNG %, tran dang dung ' + HE_SO_VUOT + '):');
  let d2 = '  ';
  [0.7, 0.85, 1.0, 1.15, 1.3].forEach(t => {
    d2 += ('target ' + Math.round(t * 100) + '%: ' + chay(bo, HE_SO_VUOT, t, true).trung.toFixed(1) + '%').padEnd(20);
  });
  console.log(d2);
  console.log('');
  console.log('DOC KET QUA:');
  console.log('  · TRUNG duoi 45% o tuan di lam binh thuong -> cong thuc dang lech, xem lai.');
  console.log('  · Chi doi he so tran khi mot muc khac hon muc dang dung >5 diem o NHIEU cot');
  console.log('    target. Hon o dung mot cot la do cach giao target thang do, khong phai cong thuc.');
  console.log('  · "qua 2x" cao ma dong "chi tuan di lam" lai thap -> loi do NV nghi, khong phai cong thuc.');
}

main().catch(e => { console.error('✗ ' + (e.message || e)); process.exit(1); });
