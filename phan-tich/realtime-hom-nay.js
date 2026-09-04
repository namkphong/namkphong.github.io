#!/usr/bin/env node
/*
 * KẾT QUẢ THI ĐUA TRONG NGÀY THEO NHÂN VIÊN — từ dòng hàng report 77.
 * =============================================================================
 * Đây là phần lõi của realtime.html làm lại: thay vì trừ mốc trên bảng luỹ kế
 * tháng của baocao (chỉ làm mới 15-20 phút/lần, không có trường "hôm nay"), ta
 * đi thẳng từ DÒNG HÀNG của report 77 — có ngày xuất, có người tạo, có ngành
 * hàng — rồi gán vào chương trình thi đua bằng bảng đã đối chiếu.
 *
 * SỐ TỔNG của mỗi ngành luôn lấy từ baocao nên luôn đúng; bảng gán chỉ dùng để
 * CHIA theo nhân viên. Quy tắc có ganDung:true là chia GẦN ĐÚNG — đánh dấu ~ khi
 * in ra. Chương trình chưa dò ra thì để ở canTheoDoi và vẫn IN RA cuối báo cáo,
 * vì im lặng thì người xem tưởng ngành đó bằng 0.
 *
 * CHẠY:
 *   node phan-tich/realtime-hom-nay.js --kho 396 [--ngay 2026-09-04] [--bang phan-tich/bang-gan-202609.json]
 */

'use strict';

const fs = require('fs');
const SB = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
const KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';

const arg = (() => {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1];
  if (!o.kho) { console.error('Thiếu --kho. Ví dụ: --kho 396'); process.exit(1); }
  o.ngay = o.ngay || new Date().toISOString().slice(0, 10);
  o.bang = o.bang || 'phan-tich/bang-gan-' + o.ngay.slice(0, 4) + o.ngay.slice(5, 7) + '.json';
  return o;
})();

const maNhom = r => String(r.nhom_hang || '').split(' - ')[0];
const maNganh = r => String(r.nganh_hang || '').split(' - ')[0];
const hang = r => String(r.nha_san_xuat || '').trim();

// Một dòng có thể thuộc NHIỀU chương trình cùng lúc (điện thoại Android vừa vào
// "ĐT & Tablet Android" vừa vào "Trả chậm HomeCredit" nếu bán trả góp) — đúng
// như cách MWG tính, nên không được gán độc quyền.
function hop(r, q) {
  if (q.nhom && q.nhom.indexOf(maNhom(r)) === -1) return false;
  if (q.nganh && q.nganh.indexOf(maNganh(r)) === -1) return false;
  if (q.hang && !q.hang.some(h => hang(r).toLowerCase().indexOf(h.toLowerCase()) !== -1)) return false;
  if (q.boHang && q.boHang.some(h => hang(r).toLowerCase() === h.toLowerCase())) return false;
  // boTen: loại theo TÊN SẢN PHẨM (vd SIM MOBIFONE/VINAPHONE/SIM DMX = nhóm 1891 trừ Viettel).
  if (q.boTen && q.boTen.some(t => String(r.ten_san_pham || '').toLowerCase().indexOf(t.toLowerCase()) !== -1)) return false;
  if (q.traGop && !r.la_tra_gop) return false;
  if (q.thanhToan && q.thanhToan.indexOf(r.hinh_thuc_thanh_toan) === -1) return false;
  return true;
}

(async function () {
  const bang = JSON.parse(fs.readFileSync(arg.bang, 'utf8'));
  const u = SB + '/rest/v1/ycx_lines?store_key=eq.' + arg.kho +
    '&ngay_xuat=eq.' + arg.ngay + '&select=*&order=id.asc&limit=1000';
  const r = await fetch(u, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  const tho = await r.json();
  // LOẠI DÒNG ĐÃ BỊ TRẢ / HUỶ. ycx_lines chỉ UPSERT, không bao giờ xoá — đơn bị
  // trả sau khi đẩy nằm lại vĩnh viễn. Cữ đẩy nào cũng gửi lại toàn bộ khoảng
  // ngày, nên dòng còn hợp lệ mang updated_at của cữ mới nhất; mốc cũ hơn là dòng
  // đã biến mất khỏi file xuất. Đo 04/09/2026: mỗi kho 3 dòng, lọc đi thì
  // "Cáp - Sạc" lên 3/3 kho khớp chính xác.
  const mocMoi = tho.length ? tho.map(x => x.updated_at).sort().pop() : null;
  const dong = tho.filter(x => x.updated_at === mocMoi);
  const boTra = tho.length - dong.length;

  const moi = dong.map(x => x.updated_at).sort().pop();
  console.log('Kho ' + arg.kho + ' · ngày ' + arg.ngay + ' · ' + dong.length + ' dòng hàng' +
    (boTra ? '  (đã bỏ ' + boTra + ' dòng bị trả/huỷ đơn)' : ''));
  console.log('Số mới nhất đẩy lúc ' + (moi ? new Date(moi).toLocaleTimeString('vi-VN') : '—') +
    ' · bảng gán tháng ' + bang.thang + ' (' + bang.quyTac.length + ' chương trình đã đối chiếu)\n');
  if (!dong.length) { console.log('Chưa có dòng hàng nào hôm nay.'); return; }

  // gom: người -> chương trình -> giá trị
  const nguoi = new Map();
  dong.forEach(d => {
    const ten = String(d.nguoi_tao || '?');
    if (!nguoi.has(ten)) nguoi.set(ten, { ct: new Map(), dt: 0, sl: 0 });
    const n = nguoi.get(ten);
    n.dt += (+d.gia_ban_1 || 0) / 1e6;
    bang.quyTac.forEach(q => {
      if (!hop(d, q)) return;
      // NỀN SỐ theo từng chương trình. Đo 04/09/2026 thì cả 14 chương trình đều
      // là nền THỰC, nhưng cứ đọc từ bảng gán chứ không đóng cứng — gặp chương
      // trình tính trên quy đổi thì chỉ cần sửa JSON, không phải sửa code.
      const cot = q.nen === 'quydoi' ? 'quy_doi' : 'gia_ban_1';
      const v = q.donVi === 'SL' ? (+d.so_luong || 0) : (+d[cot] || 0) / 1e6;
      n.ct.set(q.ten, (n.ct.get(q.ten) || 0) + v);
    });
  });

  const ds = Array.from(nguoi.entries()).sort((a, b) => b[1].dt - a[1].dt);
  ds.forEach(([ten, n]) => {
    const ct = Array.from(n.ct.entries()).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    console.log('▌ ' + ten);
    console.log('   DT thực hôm nay: ' + n.dt.toFixed(2) + ' tr · chạm ' + ct.length +
      '/' + bang.quyTac.length + ' ngành thi đua đã đối chiếu');
    if (!ct.length) { console.log('   (chưa bán ngành thi đua nào)\n'); return; }
    ct.forEach(([k, v]) => {
      const q = bang.quyTac.find(x => x.ten === k);
      console.log('     · ' + k.padEnd(44) + (q.ganDung ? '~' : ' ') + v.toFixed(2).padStart(8) +
        (q.donVi === 'SL' ? ' cái' : (q.nen === 'quydoi' ? ' tr (quy đổi)' : ' tr')));
    });
    console.log('');
  });

  // tổng theo chương trình
  console.log('TỔNG CẢ SIÊU THỊ HÔM NAY');
  const tong = new Map();
  ds.forEach(([, n]) => n.ct.forEach((v, k) => tong.set(k, (tong.get(k) || 0) + v)));
  Array.from(tong.entries()).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => {
      const q = bang.quyTac.find(x => x.ten === k);
      console.log('   ' + k.padEnd(46) + v.toFixed(2).padStart(8) +
        (q.donVi === 'SL' ? ' cái' : (q.nen === 'quydoi' ? ' tr (quy đổi)' : ' tr')));
    });
  console.log('\n(dấu ~ = quy tắc chia GẦN ĐÚNG, tổng chia ra có thể lệch số của baocao)');

  // Luôn IN RA phần chưa đo được. Im lặng ở đây là người xem tưởng ngành đó
  // bằng 0 — kiểu hiểu nhầm tệ nhất, vì số 0 trông y như số thật.
  if (bang.canTheoDoi && bang.canTheoDoi.length) {
    console.log('\nĐANG THEO DÕI — chưa dò ra quy tắc nên chưa đưa vào bảng:');
    bang.canTheoDoi.forEach(x => console.log('   · ' + x));
  }
  console.log('\nKHÔNG ĐO ĐƯỢC từ dòng hàng:');
  (bang.khongDoDuoc || []).forEach(x => console.log('   · ' + x));
})().catch(e => { console.error('LỖI: ' + e.message); process.exit(1); });
