/**
 * cloudflare/worker.js — Cửa ra vào cho kho ảnh Cloudflare R2 của bộ công cụ DMX.
 * =========================================================================
 * VÌ SAO CẦN WORKER, KHÔNG GỌI THẲNG R2:
 * Khoá truy cập R2 (S3 access key) KHÔNG an toàn để lộ, khác hẳn khoá
 * publishable của Supabase vốn được thiết kế để nhúng công khai. Userscript
 * chạy trong trình duyệt và mã nguồn nằm công khai trên GitHub, nên nếu gọi
 * thẳng R2 thì ai cũng lấy được khoá và xoá sạch kho ảnh. Worker giữ khoá ở
 * phía máy chủ (qua R2 binding), y hệt cách Edge Function "nhan-xet" giữ khoá
 * Anthropic.
 *
 * VÌ SAO CHUYỂN SANG R2:
 * Supabase gói miễn phí giới hạn 5 GB băng thông tải ra/tháng và đã vượt 134%.
 * Cloudflare R2 KHÔNG thu tiền băng thông tải ra — đúng thứ đang chạm trần.
 * Gói miễn phí: 10 GB lưu trữ (đang dùng 26,6 MB), 1 triệu lượt ghi và 10 triệu
 * lượt đọc mỗi tháng.
 *
 * MỨC BẢO MẬT — CỐ Ý GIỮ NGANG BẰNG HIỆN TẠI, KHÔNG THẮT CHẶT HƠN:
 * Bucket Supabase 'bc' hiện cho phép ghi công khai. Worker này cũng vậy, chỉ
 * chặn bằng 1 token dùng chung (cản người vô tình, không cản được người cố ý).
 * Nâng mức bảo mật là việc riêng, làm sau — đổi ở đây mà quên đổi 3 userscript
 * là gãy đường đẩy ảnh.
 *
 * ĐƯỜNG DẪN:
 *   PUT  /up/<tên-file>   (kèm header x-dmx-key)  -> ghi vào R2
 *   GET  /<tên-file>                              -> trả file, đúng kiểu nội dung
 *   GET  /_ping                                   -> kiểm tra Worker sống
 *
 * CÀI ĐẶT: xem cloudflare/HUONG-DAN.md
 */

// Chỉ nhận các đuôi này — chặn việc kho ảnh bị dùng làm nơi chứa file lung tung.
const DUOI_CHO_PHEP = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  json: 'application/json',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

// Ảnh/manifest ghi đè cùng tên mỗi ngày. Cho CDN giữ 1 giờ: xem lại trong giờ đó
// không phải tải lại. Manifest JSON để ngắn hơn vì bot đọc để biết ảnh mới.
function cacheCho(duoi) {
  return duoi === 'json' ? 'public, max-age=60' : 'public, max-age=3600';
}

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-dmx-key',
    'Access-Control-Max-Age': '86400'
  };
}

function loi(msg, status, origin) {
  return new Response(JSON.stringify({ error: msg }), {
    status: status,
    headers: Object.assign({ 'content-type': 'application/json' }, cors(origin))
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (url.pathname === '/_ping') {
      return new Response('DMX R2 OK', {
        headers: Object.assign({ 'content-type': 'text/plain; charset=utf-8' }, cors(origin))
      });
    }

    // ---------- GHI ----------
    if (request.method === 'PUT' && url.pathname.startsWith('/up/')) {
      if (!env.DMX_UPLOAD_KEY) return loi('Worker chưa đặt secret DMX_UPLOAD_KEY', 500, origin);
      if (request.headers.get('x-dmx-key') !== env.DMX_UPLOAD_KEY) return loi('Sai khoá đẩy', 403, origin);

      const key = decodeURIComponent(url.pathname.slice('/up/'.length));
      // Chặn đi ngược thư mục và tên rỗng.
      if (!key || key.indexOf('..') !== -1 || key.startsWith('/')) return loi('Tên file không hợp lệ', 400, origin);

      const duoi = (key.split('.').pop() || '').toLowerCase();
      const kieu = DUOI_CHO_PHEP[duoi];
      if (!kieu) return loi('Đuôi file không được phép: ' + duoi, 400, origin);

      await env.BUCKET.put(key, request.body, {
        httpMetadata: { contentType: kieu, cacheControl: cacheCho(duoi) }
      });
      return new Response(JSON.stringify({ ok: true, key: key }), {
        headers: Object.assign({ 'content-type': 'application/json' }, cors(origin))
      });
    }

    // ---------- ĐỌC ----------
    if (request.method === 'GET' || request.method === 'HEAD') {
      const key = decodeURIComponent(url.pathname.slice(1));
      if (!key) return loi('Thiếu tên file', 400, origin);

      const obj = await env.BUCKET.get(key);
      if (!obj) return loi('Không có file: ' + key, 404, origin);

      const duoi = (key.split('.').pop() || '').toLowerCase();
      const h = new Headers(cors(origin));
      // Kiểu nội dung phải ĐÚNG, nếu không LINE sẽ không hiện được ảnh (đây
      // chính là lý do GitHub Release đính kèm không dùng được — nó trả về
      // application/octet-stream kèm Content-Disposition: attachment).
      h.set('content-type', (obj.httpMetadata && obj.httpMetadata.contentType) || DUOI_CHO_PHEP[duoi] || 'application/octet-stream');
      h.set('cache-control', (obj.httpMetadata && obj.httpMetadata.cacheControl) || cacheCho(duoi));
      h.set('etag', obj.httpEtag);
      return new Response(request.method === 'HEAD' ? null : obj.body, { headers: h });
    }

    return loi('Không hỗ trợ ' + request.method, 405, origin);
  }
};
