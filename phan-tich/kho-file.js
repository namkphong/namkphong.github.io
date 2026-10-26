/* phan-tich/kho-file.js — kho file (ảnh + gói JSON) cho các script Node.
 *
 * Dùng LẠI đúng công tắc trong dmx-cluster-shared.js (KHO_R2_BASE / KHO_R2_KEY),
 * chạy trong hộp cát riêng để không gắn "window" giả vào môi trường Node. Đổi
 * nơi lưu (Supabase -> Cloudflare R2) thì chỉ sửa file đó, script ở đây tự theo.
 *
 *   const kho = require('./kho-file');
 *   kho.url('396.jpg')        // địa chỉ đọc công khai
 *   kho.moi('latest.json')    // địa chỉ đọc bản mới nhất (?t=)
 *   await kho.ds('rt_thidua_cum')            // [{ name, size, updated }]
 *   await kho.ghi(ten, body, { kieu: 'application/json' })
 *   await kho.docJson('goi_tong_cum14285.json')   // tiện ích: đọc + parse, lỗi trả null
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

const hop = {
  window: {}, console, fetch, setTimeout, clearTimeout, encodeURIComponent, decodeURIComponent,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
};
vm.createContext(hop);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'dmx-cluster-shared.js'), 'utf8'), hop);
const kho = hop.window.KhoFile;

kho.docJson = async function (ten) {
  try {
    const r = await fetch(kho.moi(ten), { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
};

module.exports = kho;
