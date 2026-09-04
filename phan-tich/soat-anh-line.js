#!/usr/bin/env node
/*
 * SOÁT: vì sao /số của cụm nào đó không ra đủ 2 ảnh.
 * =============================================================================
 * /số gửi tối đa 2 ảnh:
 *   1. ảnh báo cáo nhân viên  -> latest.json .url
 *   2. ảnh thi đua ngành hàng -> latest.json .rtUrl, VÀ CHỈ KHI .rtAt là HÔM NAY
 *
 * Điều kiện rtAt là cố ý: file rt_<mã>.jpg cũ vẫn nằm lại trong kho vĩnh viễn,
 * nên nếu chỉ nhìn rtUrl thì bot sẽ gửi ảnh cũ mèm như thể là số hôm nay —
 * kiểu sai tệ nhất vì người xem không có cách nào biết. Cụm 1359 đang đúng
 * cảnh đó: rtUrl trỏ ảnh ngày 27/08, thiếu rtAt, và bot bỏ qua (đúng).
 *
 * Script này soát TỪNG siêu thị của MỌI cụm và quy trách nhiệm về đúng khâu:
 * chưa chạy cào số / chưa cập nhật công cụ Realtime / đẩy ảnh hỏng / rtAt cũ.
 * Nhờ vậy khỏi phải đoán, và khỏi bắt cụm cài lại script khi lỗi nằm chỗ khác.
 *
 * CHẠY:  node phan-tich/soat-anh-line.js [--ngay 2026-09-04]
 */

'use strict';

const SB = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
const KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const arg = (() => {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1];
  o.ngay = o.ngay || new Date().toISOString().slice(0, 10);
  return o;
})();

(async function () {
  const files = await (await fetch(SB + '/storage/v1/object/list/bc', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, H),
    // prefix của Supabase Storage là ĐƯỜNG DẪN THƯ MỤC, không phải tiền tố tên
    // file — truyền 'rt_' vào là trả về rỗng. Liệt kê hết rồi lọc bằng tên.
    body: JSON.stringify({ prefix: '', limit: 1000 })
  })).json();
  if (!Array.isArray(files)) throw new Error('Không liệt kê được kho.');

  const anhRT = new Map();
  files.forEach(f => {
    const m = /^rt_(.+)\.jpg$/.exec(f.name);
    if (m) anhRT.set(m[1], String(f.updated_at).slice(0, 10));
  });

  const goi = new Map();
  for (const f of files.filter(x => /^rt_thidua_cum.*\.json$/.test(x.name))) {
    try {
      const g = await (await fetch(SB + '/storage/v1/object/public/bc/' + f.name + '?t=' + Date.now())).json();
      (g.sieuThi || []).forEach(s => { if (s.key) goi.set(s.key, g.ngay); });
    } catch (e) {}
  }

  const man = await (await fetch(SB + '/storage/v1/object/public/bc/latest.json?t=' + Date.now())).json();
  const st = man.stores || {};
  const cums = await (await fetch(SB + '/rest/v1/dmx_clusters?select=site_code,config', { headers: H })).json();

  console.log('/số ra mấy ảnh — soát ngày ' + arg.ngay + '\n');
  console.log('siêu thị              gói thi đua   ảnh rt_*.jpg   rtUrl  rtAt      kết quả');
  console.log('─'.repeat(88));

  const hong = [];
  let du = 0, tong = 0;
  cums.sort((a, b) => a.site_code.localeCompare(b.site_code)).forEach(c => {
    if (/^zz-/.test(c.site_code)) return;           // hàng rác cũ, không phải cụm thật
    ((c.config || {}).stores || []).forEach(s => {
      const e = st[s.key] || {};
      const coGoi = goi.get(s.key) === arg.ngay;
      const coAnh = anhRT.get(s.key) === arg.ngay;
      const coUrl = !!e.rtUrl;
      const rtAtOk = !!e.rtAt && String(e.rtAt).slice(0, 10) === arg.ngay;
      const soAnh = (e.url ? 1 : 0) + (coUrl && rtAtOk ? 1 : 0);
      tong++; if (soAnh === 2) du++;
      if (soAnh < 2) {
        hong.push({
          cum: c.site_code, ten: s.name,
          ly: !e.url ? 'chưa chạy cào số hôm nay (thiếu cả ảnh 1)'
            : !coGoi ? 'CHƯA CẬP NHẬT công cụ Realtime — không đẩy gói thi đua'
            : !coAnh ? 'có gói nhưng KHÔNG đẩy được ảnh thi đua'
            : !coUrl ? 'có ảnh nhưng KHÔNG ghi rtUrl vào manifest'
            : 'rtUrl có nhưng rtAt cũ/thiếu — bot bỏ qua để khỏi gửi ảnh cũ'
        });
      }
      console.log(
        String(s.name).slice(0, 20).padEnd(22) +
        (coGoi ? 'hôm nay' : (goi.has(s.key) ? 'CŨ ' + goi.get(s.key) : 'không')).padEnd(14) +
        (coAnh ? 'hôm nay' : (anhRT.has(s.key) ? 'CŨ ' + anhRT.get(s.key) : 'không')).padEnd(15) +
        (coUrl ? 'có' : '—').padEnd(7) +
        (rtAtOk ? 'hôm nay' : (e.rtAt ? 'CŨ' : '—')).padEnd(10) +
        (soAnh === 2 ? '2 ảnh ✓' : soAnh + ' ảnh'));
    });
  });

  console.log('\n' + '─'.repeat(88));
  console.log('Đủ 2 ảnh: ' + du + '/' + tong + ' siêu thị.');
  if (hong.length) {
    const nhom = {};
    hong.forEach(x => (nhom[x.ly] = nhom[x.ly] || []).push(x.cum + ' · ' + x.ten));
    Object.entries(nhom).sort((a, b) => b[1].length - a[1].length).forEach(([ly, ds]) => {
      console.log('\n' + ly + '  (' + ds.length + ')');
      ds.forEach(d => console.log('   · ' + d));
    });
    console.log('\nCụm "CHƯA CẬP NHẬT" chỉ cần cài lại 3 công cụ rồi chạy một cữ cả chuỗi:');
    ['dmx-thu-baocao', 'dmx-realtime-auto', 'dmx-line-publish']
      .forEach(f => console.log('   https://namkphong.github.io/' + f + '.user.js'));
  }
})().catch(e => { console.error('LỖI: ' + e.message); process.exit(1); });
