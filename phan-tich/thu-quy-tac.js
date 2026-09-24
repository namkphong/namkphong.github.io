/*
 * THỬ NHANH MỘT GIẢ THUYẾT QUY TẮC trên dữ liệu đã gom bằng gom-du-lieu-thang.js.
 * =============================================================================
 *   const { KHO, thu, ma } = require('./phan-tich/thu-quy-tac.js')('202610');
 *   thu('Tivi TCL', r => ma(r.nganh) === '304' && /tcl/i.test(r.hang || ''));
 *
 * So với luỹ kế baocao ĐẾN HẾT HÔM QUA (mốc chuẩn, xem kiem-bang-gan.js). Chỉ tính
 * kho có dữ liệu ĐỦ THÁNG (ngày sớm nhất <= mùng 2) — kho vào giữa tháng luôn "hụt".
 * Dòng r: { d, don, tao, nganh, nhom, sp, ten, hang, sl, gia, qd, tg, ht, tt }.
 *
 * Tiêu chí nhận quy tắc (đã dùng khi dò 24/09/2026):
 *   · khớp từng đồng (±0,06 tr; SL đúng tuyệt đối) ở TỪ 5 KHO trở lên;
 *   · kho lệch phải giải thích được (thiếu dữ liệu, hàng cồng kềnh giao chậm);
 *     kho DƯ mà không giải thích được là dấu hiệu quy tắc ôm thừa.
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
module.exports = function (thang) {
  const KHO = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), 'du-lieu-' + thang + '.json'), 'utf8'));
  const ma = s => String(s || '').split(' - ')[0].trim();
  const mung2 = thang.slice(0, 4) + '-' + thang.slice(4) + '-02';
  KHO.forEach(k => { k.tu = k.dong.map(r => r.d).sort()[0]; k.du = k.tu <= mung2; });
  function thu(ten, loc, o) {
    o = o || {};
    const kq = [];
    KHO.forEach(k => {
      const c = k.ct[ten]; if (!c) return;
      const d0 = new Date(k.ngayGoi + 'T00:00:00Z'); d0.setUTCDate(d0.getUTCDate() - 1);
      const hq = d0.toISOString().slice(0, 10);
      const dong = k.dong.filter(r => r.d <= hq && loc(r));
      const sl = c.dv === 'SL';
      const v = dong.reduce((s, r) => s + (sl ? (Number(r.sl) || 0) : (Number(r.gia) || 0) / 1e6), 0);
      kq.push({ key: k.key, du: k.du, can: c.v, duoc: v, khop: Math.abs(c.v - v) <= (sl ? 0.01 : 0.06), dong });
    });
    const du = kq.filter(x => x.du), ok = du.filter(x => x.khop).length;
    if (!o.im) {
      console.log((ten + ' ').padEnd(46) + ok + '/' + du.length + ' kho đủ tháng khớp');
      if (!o.gon) kq.forEach(x => console.log('   ' + (x.khop ? '✓' : '✗') + ' ' + x.key.padEnd(7) +
        (x.du ? '' : '(thiếu đầu tháng) ') + 'cần ' + x.can.toFixed(2) + '  được ' + x.duoc.toFixed(2) +
        (x.khop ? '' : '  lệch ' + (x.duoc - x.can).toFixed(2))));
    }
    return { ok, tong: du.length, kq };
  }
  return { KHO, thu, ma };
};
