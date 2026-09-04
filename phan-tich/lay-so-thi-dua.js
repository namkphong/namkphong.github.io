/*
 * LẤY SỐ THI ĐUA cho bộ dò — dán cả file này vào Console của tab
 * baocao.dienmayxanh.com (node không đăng nhập được vào trang đó).
 *
 * Sửa 3 dòng CẤU HÌNH bên dưới rồi chạy. Kết quả tự tải về máy thành file
 * so-thi-dua-<tháng>.json, đưa cho do-gan-thi-dua.js bằng tham số --thidua.
 *
 * File có kèm soDongNV để bộ dò tự phát hiện thiếu dòng — đã dính một lần
 * (04/09/2026): danh sách bị cắt cụt làm người có target thật bị coi là 0, và
 * bộ dò loại oan đúng cái nhóm hàng cần tìm mà không báo gì.
 */
(async function () {
  /* ---------- CẤU HÌNH ---------- */
  const THANG = 202608;                 // tháng cần lấy, dạng yyyymm
  const KHU_VUC = '3953';               // mã khu vực (ASM) của cụm
  const KHOS = ['14285', '8807'];       // mã MWG của các siêu thị
  /* ------------------------------- */

  const tok = localStorage.getItem('access_token');
  if (!tok) { alert('Chưa đăng nhập baocao.dienmayxanh.com'); return; }
  const post = async b => {
    const r = await fetch('/kb-api/reports/competition-bymsg-get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify(b)
    });
    const j = await r.json();
    return (j && j.data) || [];
  };
  // loại 2 và 6 đo bằng SỐ LƯỢNG, còn lại đo bằng DOANH THU
  const SL = { 2: 1, 6: 1 };
  const dv = t => (SL[t] ? 'SL' : 'DT');
  const val = x => (SL[x.competitiontype] ? +x.quantity : +x.revenue);

  const kho = [], sg = {};
  for (const m of KHOS) {
    // Bảng cấp siêu thị KHÔNG có cột storeid nên phải gọi RIÊNG từng siêu thị,
    // gọi gộp thì không biết dòng nào của ai.
    const d = await post({
      MONTHKEY: THANG, VIEWLEVEL: 'STOREGROUP', VIEWIDS: KHU_VUC,
      ISVIEWSTORE: 0, TIMETYPE: 2, STOREIDS: m, PAGESIZE: 0
    });
    d.forEach(x => {
      sg[x.salegroupid] = 1;
      kho.push([x.programname, dv(x.competitiontype), m, +val(x).toFixed(3)]);
    });
  }
  const nvRaw = await post({
    MONTHKEY: THANG, VIEWLEVEL: 'STORE', VIEWIDS: Object.keys(sg).join(','),
    ISVIEWSTORE: 0, TIMETYPE: 2, STOREIDS: KHOS.join(','), PAGESIZE: 0
  });
  const nv = nvRaw.map(x => [x.programname, dv(x.competitiontype),
    String(x.storeid), String(x.staffuser || ''), +val(x).toFixed(3)]);

  const goi = { thang: String(THANG), khuVuc: KHU_VUC, khos: KHOS, soDongNV: nv.length, kho: kho, nv: nv };

  // Đẩy thẳng lên Supabase Storage thay vì tải về máy: bộ dò chạy bằng node sẽ
  // tự tải xuống, khỏi phải chuyển file bằng tay giữa trình duyệt và máy.
  const SB = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  const KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
  const ten = 'thidua_' + THANG + '_' + KHOS.join('-') + '.json';
  const r = await fetch(SB + '/storage/v1/object/bc/' + ten, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body: JSON.stringify(goi)
  });
  console.log(r.ok
    ? 'Đã đẩy ' + ten + ' — ' + kho.length + ' dòng cấp siêu thị, ' +
      nv.length + ' dòng cấp nhân viên.\nChạy:  node phan-tich/do-gan-thi-dua.js --thang ' +
      THANG + ' --kho <storeKey:mwg,...> --thidua ' + ten
    : 'Đẩy lỗi: ' + r.status);
})();
