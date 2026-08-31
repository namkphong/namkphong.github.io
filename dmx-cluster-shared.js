/**
 * dmx-cluster-shared.js — module dùng CHUNG cho các userscript DMX (dmx.user.js,
 * dmx-realtime-auto.user.js, dmx-line-publish.user.js, dmx-gio-cong.user.js).
 * KHÔNG phải userscript — nạp bằng @require từ mỗi script.
 *
 * Mục đích: mỗi cụm (Quản lý) có tên/mã siêu thị riêng — thay vì đóng cứng
 * trong từng file (như trước đây), toàn bộ cấu hình 1 cụm nằm trên Supabase
 * (bảng "dmx_clusters"), tra theo "site_code" do Quản lý tự đặt. Xem
 * C:\Users\trant\.claude\plans\generic-bouncing-adleman.md để rõ bối cảnh.
 *
 * Cung cấp qua window.DMXCluster:
 *   getSiteCode() / setSiteCode(code)   — localStorage của ĐÚNG origin hiện tại
 *                                          (không dùng chung được giữa các origin
 *                                          khác nhau — mỗi origin tự hỏi 1 lần).
 *   fetchConfig(siteCode)               — đọc config từ Supabase (hoặc null).
 *   getCachedConfig(siteCode?)          — bản sao config trên máy, ĐỌC NGAY
 *                                          (đồng bộ) cho chỗ cần vẽ liền.
 *   saveConfig(siteCode, config)        — ghi đè (upsert) config lên Supabase.
 *   listSiteCodes()                     — mọi mã cụm đã có trên Supabase.
 *   askSiteCode(extra?)                 — hỏi tay NHƯNG gợi ý sẵn mã đã có (đỡ
 *                                          phải nhớ gõ lại chính xác từng chữ).
 *   chuanHoaTen(s) / matchStoreByText() — so tên lỏng, y hệt Chung.chuanHoaTen
 *                                          (assets/common.js) dùng bên các trang.
 */
(function () {
  'use strict';

  var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  var SB_KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
  var TABLE = 'dmx_clusters';
  var LS_KEY = 'dmx_site_code';

  function getSiteCode() {
    try { return localStorage.getItem(LS_KEY) || ''; } catch (e) { return ''; }
  }
  function setSiteCode(code) {
    try { localStorage.setItem(LS_KEY, code); } catch (e) {}
  }

  // Bản sao cấu hình cụm lưu ngay trên máy. Vài chỗ CẦN cấu hình NGAY LÚC VẼ
  // (thẻ mục tiêu trong nv.html, gắn store_key cho từng dòng hàng ở
  // realtimenv.html) — chờ mạng xong mới vẽ được thì trang giật/hụt, nên đọc
  // bản sao này trước, còn fetchConfig() chạy nền để làm mới cho lần sau.
  var LS_CACHE = 'dmx_cluster_config_cache';
  function cacheKey(siteCode) { return LS_CACHE + '_' + siteCode; }
  function getCachedConfig(siteCode) {
    siteCode = siteCode || getSiteCode();
    if (!siteCode) return null;
    try { return JSON.parse(localStorage.getItem(cacheKey(siteCode))) || null; } catch (e) { return null; }
  }
  function setCachedConfig(siteCode, config) {
    if (!siteCode || !config) return;
    try { localStorage.setItem(cacheKey(siteCode), JSON.stringify(config)); } catch (e) {}
  }

  async function docConfigTheoMa(siteCode) {
    var url = SB_URL + '/rest/v1/' + TABLE + '?select=config&site_code=eq.' + encodeURIComponent(siteCode);
    var res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    if (!res.ok) throw new Error('Đọc cấu hình cụm lỗi HTTP ' + res.status);
    var rows = await res.json();
    return (rows && rows[0] && rows[0].config) || null;
  }

  // Mã cụm lưu ở mỗi origin một bản (localStorage/GM riêng), gõ tay nên hay
  // lệch dấu — tra hụt là script báo "chưa có cấu hình" dù cụm vẫn còn nguyên
  // trên Supabase. Nên khi tra khít không ra thì dò lại theo dạng chuẩn hoá,
  // và ghi mã ĐÚNG vào lastCanonicalSiteCode để chỗ gọi lưu đè lại mã cũ bị
  // lệch (không tự setSiteCode ở đây vì mỗi script cất mã một kiểu — có script
  // dùng GM storage chứ không phải localStorage này).
  var lastCanonicalSiteCode = '';
  async function fetchConfig(siteCode) {
    if (!siteCode) return null;
    lastCanonicalSiteCode = '';
    var config = await docConfigTheoMa(siteCode);
    if (!config) {
      var r = await resolveSiteCode(siteCode);
      // Chỉ tự sửa khi khác mỗi dấu/hoa-thường — kiểu 'chua-nhau' phải hỏi,
      // để không âm thầm gắn người này vào cụm của người khác.
      if (r.code && r.kieu === 'bo-dau') {
        config = await docConfigTheoMa(r.code);
        if (config) { siteCode = r.code; lastCanonicalSiteCode = r.code; }
      } else if (r.code && r.kieu === 'chua-nhau') {
        var ok = await resolveSiteCodeXacNhan(siteCode);
        if (ok) {
          config = await docConfigTheoMa(ok);
          if (config) { siteCode = ok; lastCanonicalSiteCode = ok; }
        }
      }
    }
    if (config) setCachedConfig(siteCode, config);
    return config;
  }

  // Toàn bộ mã cụm đã có sẵn trên Supabase — dùng để GỢI Ý thay vì bắt gõ lại
  // chính xác từng ký tự (dễ gõ sai/lệch dấu, gây "không tìm thấy cấu hình"
  // dù thực ra đã tạo rồi).
  async function listSiteCodes() {
    var url = SB_URL + '/rest/v1/' + TABLE + '?select=site_code&order=updated_at.desc';
    try {
      var res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
      if (!res.ok) return [];
      var rows = await res.json();
      return (rows || []).map(function (r) { return r.site_code; }).filter(Boolean);
    } catch (e) { return []; }
  }

  // Mã cụm là chuỗi tự đặt, trước đây phải gõ lại CHÍNH XÁC từng ký tự ở mỗi
  // origin (BI, namkphong.github.io, report.mwgroup.vn, baocao...). Với mã có
  // dấu tiếng Việt + khoảng trắng như "Cụm 14285" thì cực dễ lệch (đã xảy ra
  // thật: một origin lưu "14285" nên tra không ra bản ghi "Cụm 14285", script
  // báo "chưa có cấu hình" dù đã cào số xong). Nên: so mã theo dạng đã chuẩn
  // hoá (bỏ dấu, bỏ ký tự đặc biệt, thường hoá) — khớp trọn vẹn trước, rồi mới
  // tới khớp CHỨA NHAU và chỉ nhận khi duy nhất 1 ứng viên (nhiều ứng viên thì
  // không đoán bừa, trả về rỗng để hỏi lại cho chắc).
  // Trả về { code, kieu } — kieu: 'khit' (trùng khít), 'bo-dau' (chỉ khác dấu/
  // hoa-thường/ký tự đặc biệt), 'chua-nhau' (chứa nhau, CẦN hỏi lại), '' (không
  // ra). Phân biệt 'chua-nhau' là bắt buộc: một Quản lý MỚI gõ "1359" để tạo
  // cụm riêng mà bị tự động gắn vào cụm "cum1359" của người khác thì thành lẫn
  // dữ liệu giữa 2 người — nên chỗ gọi phải xác nhận trước khi dùng.
  async function resolveSiteCode(input) {
    input = (input || '').trim();
    if (!input) return { code: '', kieu: '' };
    var codes = await listSiteCodes();
    if (codes.indexOf(input) !== -1) return { code: input, kieu: 'khit' };
    var t = chuanHoaTen(input);
    if (!t) return { code: '', kieu: '' };
    var bangNhau = codes.filter(function (c) { return chuanHoaTen(c) === t; });
    if (bangNhau.length === 1) return { code: bangNhau[0], kieu: 'bo-dau' };
    var chuaNhau = codes.filter(function (c) {
      var n = chuanHoaTen(c);
      return n && (n.indexOf(t) !== -1 || t.indexOf(n) !== -1);
    });
    if (chuaNhau.length === 1) return { code: chuaNhau[0], kieu: 'chua-nhau' };
    return { code: '', kieu: '' };
  }

  // Như resolveSiteCode nhưng CHỈ trả mã khi chắc chắn: khớp lỏng kiểu chứa
  // nhau thì hỏi người dùng xác nhận. Dùng cho mọi chỗ tự sửa mã cũ bị lệch.
  async function resolveSiteCodeXacNhan(input) {
    var r = await resolveSiteCode(input);
    if (!r.code) return '';
    if (r.kieu === 'chua-nhau') {
      if (!window.confirm('Không có cụm nào tên đúng "' + input + '".\n\nDùng cụm "' + r.code + '" phải không?\n\n(Bấm Huỷ nếu bạn muốn TẠO CỤM MỚI tên "' + input + '" — đừng dùng chung cụm của người khác.)')) return '';
    }
    return r.code;
  }

  // Trang BI hiện SẴN tên cụm của tài khoản đang đăng nhập ở ô chọn #selectRSM
  // (vd "Cụm 14285"), và value của nó chính là mã cụm dùng cho URL "Khối bán
  // hàng" (vd 90564 — đúng bằng biClusterO2Id đang lưu, đã đối chiếu trên trang
  // thật). Đọc thẳng ở đây thì Quản lý KHỎI PHẢI gõ hay xác nhận mã cụm, cũng
  // khỏi phải tự đi tìm "id=" trong URL. Chỉ có trên bi.thegioididong.com —
  // các origin khác (report.mwgroup.vn, baocao..., namkphong.github.io) không
  // có ô này nên vẫn cần các đường dự phòng ở chỗ gọi.
  function detectFromPage() {
    var sel = document.getElementById('selectRSM');
    if (!sel || !sel.options || !sel.options.length) {
      // Dự phòng: ô chọn có ĐÚNG 1 lựa chọn trông như tên cụm.
      var all = [].slice.call(document.querySelectorAll('select'));
      sel = all.filter(function (s) {
        return s.options && s.options.length === 1 && /^C[uụ]m\s+\S+/i.test((s.options[0].textContent || '').trim());
      })[0];
      if (!sel) return null;
    }
    var opt = sel.selectedOptions && sel.selectedOptions[0] ? sel.selectedOptions[0] : sel.options[0];
    var ten = ((opt && opt.textContent) || '').replace(/\s+/g, ' ').trim();
    if (!ten) return null;
    return { siteCode: ten, clusterId: ((opt && opt.value) || '').replace(/\.0$/, '') };
  }

  // Mã nhân viên MWG đang đăng nhập — dấu hiệu nhận cụm dùng được ở CẢ HAI
  // trang MWG (đã kiểm chứng trên trang thật):
  //   · baocao.dienmayxanh.com — localStorage "user" = {"employee_code":"5509",...}
  //   · bi.thegioididong.com   — <span> ở đầu trang ghi "5509 - Phong Trần Tuấn"
  // Chỉ lấy phần MÃ SỐ, cố ý KHÔNG lưu tên người (bảng dmx_clusters đọc công
  // khai bằng khoá publishable — không cần thiết thì không đưa tên người lên).
  function detectMwgUser() {
    try {
      var u = JSON.parse(localStorage.getItem('user') || 'null');
      var ec = u && (u.employee_code || u.username);
      if (ec && /^\d{3,7}$/.test(String(ec).trim())) return String(ec).trim();
    } catch (e) {}
    // Dự phòng (BI không có localStorage "user"): CHỈ tìm trong thanh
    // header/menu tài khoản. Quét cả trang thì dính luôn các dòng bộ lọc dạng
    // "3953 - Quận Long Biên" / "14285 - ĐML_..." (đã thấy 8 dòng như vậy trên
    // trang giờ công) — ghi nhầm mã nhân viên sẽ làm người khác bị gắn nhầm
    // cụm, nên thà không nhận ra còn hơn nhận sai.
    var HEADER = 'nav, header, #account, #userDropdown, [class*="navbar"], [class*="header"], [class*="topbar"]';
    var els = [].slice.call(document.querySelectorAll('span, div, a'));
    for (var i = 0; i < els.length; i++) {
      if (els[i].children.length) continue;
      var t = (els[i].textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length > 60) continue;
      var m = /^(\d{3,7})\s*-\s*\D/.exec(t);   // "5509 - Tên"
      if (!m) continue;
      try { if (!els[i].closest(HEADER)) continue; } catch (e) { continue; }
      return m[1];
    }
    return '';
  }

  // Tên siêu thị đang có sẵn trên MÁY (trang namkphong.github.io) — dùng nhận
  // cụm ở origin không có dấu hiệu nào của MWG.
  function localStoreNames() {
    var names = [];
    ['analysisAppData_v2', 'businessReportAppV3'].forEach(function (k) {
      try {
        var d = JSON.parse(localStorage.getItem(k) || 'null');
        if (!d) return;
        d = d[k] || d;
        var kho = d.supermarkets || d.reports;
        if (kho) names = names.concat(Object.keys(kho));
      } catch (e) {}
    });
    return names;
  }

  // Nhận cụm KHÔNG cần hỏi, ở origin không có ô #selectRSM: đối chiếu mã nhân
  // viên đã ghi trong cấu hình cụm, rồi tới tên siêu thị có sẵn trên máy. Chỉ
  // nhận khi ra ĐÚNG 1 cụm — nhiều cụm khớp thì không đoán bừa.
  async function findClusterByEvidence() {
    var user = detectMwgUser(), names = localStoreNames();
    if (!user && !names.length) return null;
    var rows;
    try {
      var res = await fetch(SB_URL + '/rest/v1/' + TABLE + '?select=site_code,config', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
      if (!res.ok) return null;
      rows = await res.json();
    } catch (e) { return null; }
    if (!rows || !rows.length) return null;

    // MỘT CỤM CÓ THỂ CÓ NHIỀU QUẢN LÝ cùng đổ số (đã gặp thật). Nên mã nhân viên
    // lưu thành DANH SÁCH "mwgUsers"; "mwgUser" giữ lại cho bản script cũ còn
    // đang chạy đọc được. Chỉ so mwgUser thì hai người sẽ ghi đè nhau vòng
    // quanh, và ai vừa bị xoá mã thì máy không nhận ra cụm nữa.
    if (user) {
      var theoUser = rows.filter(function (r) {
        var c = r.config;
        if (!c) return false;
        if (Array.isArray(c.mwgUsers) && c.mwgUsers.map(String).indexOf(user) !== -1) return true;
        return String(c.mwgUser || '') === user;
      });
      if (theoUser.length === 1) return { code: theoUser[0].site_code, config: theoUser[0].config, vi: 'mã nhân viên' };
    }
    if (names.length) {
      var theoTen = rows.filter(function (r) {
        var st = (r.config && r.config.stores) || [];
        return st.length && st.some(function (s) { return names.some(function (n) { return matchStoreByText([s], n); }); });
      });
      if (theoTen.length === 1) return { code: theoTen[0].site_code, config: theoTen[0].config, vi: 'tên siêu thị trên máy' };
    }
    return null;
  }

  // Hỏi site_code theo cách ÍT LỖI hơn window.prompt trống: CHỈ ĐÚNG 1 cụm đã
  // có sẵn trong toàn hệ thống thì TỰ DÙNG LUÔN, không hỏi gì cả (mỗi máy/mỗi
  // trang chỉ cần vậy 1 lần, sau lưu local). Nếu nhiều cụm thì cho CHỌN THEO
  // SỐ THỨ TỰ (gõ "1"/"2"...) thay vì bắt gõ lại nguyên mã — gõ tay mã có dấu
  // trên điện thoại là nguồn lỗi chính. Vẫn cho gõ mã mới để tạo cụm khác.
  // Trả về chuỗi đã .trim() (rỗng nếu người dùng huỷ/không nhập).
  async function askSiteCode(promptExtra) {
    var codes = await listSiteCodes();
    if (codes.length === 1) return codes[0]; // chỉ 1 cụm -> khỏi hỏi, dùng luôn
    var msg = 'Mã cụm (site code) của bạn';
    if (codes.length > 1) {
      msg += ' — GÕ SỐ để chọn cụm đã có:\n' +
        codes.map(function (c, i) { return '  ' + (i + 1) + ' = ' + c; }).join('\n') +
        '\n(hoặc gõ 1 mã mới để tạo cụm khác)';
    } else {
      msg += ' — CHƯA có cụm nào, tự đặt 1 mã dễ nhớ (dùng thống nhất về sau):';
    }
    if (promptExtra) msg += '\n' + promptExtra;
    var tra = (window.prompt(msg, '') || '').trim();
    if (!tra) return '';
    if (/^\d+$/.test(tra) && codes[+tra - 1]) return codes[+tra - 1];  // chọn theo số
    var canon = await resolveSiteCodeXacNhan(tra);   // gõ tay lệch dấu vẫn nhận ra
    return canon || tra;   // không ra thì coi như đặt mã mới
  }

  // Xác định mã cụm nên dùng — MỤC TIÊU: không hỏi gì nếu tự biết được.
  // Thứ tự: 1) mã đang lưu (tự sửa nếu lệch dấu) → 2) tên cụm đọc thẳng từ ô
  // #selectRSM trên trang BI → 3) hệ thống chỉ có đúng 1 cụm → 4) mới phải hỏi.
  // Trả về { code, config, clusterId } — config có thể null (cụm mới, chưa dò
  // siêu thị); clusterId chỉ có khi đọc được từ trang.
  //
  // Cố ý ƯU TIÊN mã đang lưu hơn tên đọc từ trang: một cụm đã dùng có thể được
  // đặt site_code khác hẳn tên hiển thị trên BI (vd "cum1359"), lấy tên trang
  // đè lên sẽ tạo cụm mới và mất sạch cấu hình cũ của họ.
  async function pickSiteCode(current, promptExtra) {
    var tuTrang = detectFromPage();
    var chung = {
      clusterId: (tuTrang && tuTrang.clusterId) || '',
      mwgUser: detectMwgUser()
    };
    function ra(code, config) {
      return { code: code, config: config, clusterId: chung.clusterId, mwgUser: chung.mwgUser };
    }

    if (current) {
      var cfg = await fetchConfig(current);        // tự sửa lệch dấu bên trong
      if (cfg) return ra(lastCanonicalSiteCode || current, cfg);
    }

    if (tuTrang && tuTrang.siteCode) {
      // Tên trang có thể chỉ khác dấu so với mã đã đăng ký (vd trang hiện
      // "Cụm 1359" trong khi cụm đã lưu tên "cum1359") — nối lại đúng cụm cũ
      // thay vì đẻ thêm cụm mới.
      var r = await resolveSiteCode(tuTrang.siteCode);
      var ma = (r.kieu === 'khit' || r.kieu === 'bo-dau') ? r.code : tuTrang.siteCode;
      return ra(ma, await fetchConfig(ma));
    }

    // Origin không có ô #selectRSM (baocao.dienmayxanh.com, report.mwgroup.vn,
    // namkphong.github.io): nhận cụm qua mã nhân viên đã ghi trong cấu hình,
    // hoặc tên siêu thị có sẵn trên máy.
    var theoDauHieu = await findClusterByEvidence();
    if (theoDauHieu) {
      setCachedConfig(theoDauHieu.code, theoDauHieu.config);
      return ra(theoDauHieu.code, theoDauHieu.config);
    }

    var codes = await listSiteCodes();
    if (codes.length === 1) return ra(codes[0], await fetchConfig(codes[0]));

    var hoi = await askSiteCode(promptExtra);
    if (!hoi) return ra('', null);
    return ra(hoi, await fetchConfig(hoi));
  }

  // Ghi những thứ TỰ ĐỌC ĐƯỢC từ trang vào cấu hình cụm (mã cụm BI + mã nhân
  // viên), để các origin khác sau này nhận ra cụm mà khỏi hỏi. Trả về true nếu
  // có thay đổi (chỗ gọi tự quyết định lưu chung với thay đổi khác của nó).
  function apDungDauHieu(config, got) {
    if (!config || !got) return false;
    var doi = false;
    if (got.clusterId && config.biClusterO2Id !== got.clusterId) { config.biClusterO2Id = got.clusterId; doi = true; }

    // GHI THÊM chứ không ghi đè: một cụm có thể có nhiều Quản lý cùng đổ số.
    // Trước đây gán thẳng config.mwgUser nên hai người ghi đè nhau vòng quanh —
    // mỗi lần chạy lại ghi Supabase một lần vô ích, và người vừa bị xoá mã thì
    // máy không nhận ra cụm nữa, phải đi chọn tay.
    if (got.mwgUser) {
      var ds = Array.isArray(config.mwgUsers) ? config.mwgUsers.map(String) : [];
      // Gộp nốt mã cũ kiểu 1-người vào danh sách để không mất ai khi nâng cấp.
      if (config.mwgUser && ds.indexOf(String(config.mwgUser)) === -1) {
        ds.push(String(config.mwgUser)); doi = true;
      }
      if (ds.indexOf(String(got.mwgUser)) === -1) { ds.push(String(got.mwgUser)); doi = true; }
      if (doi) config.mwgUsers = ds;
      // Giữ mwgUser cho bản script cũ còn đang chạy đọc được. Không đổi nếu đã
      // có — đổi qua đổi lại chỉ tạo ghi thừa mà chẳng ai được lợi.
      if (!config.mwgUser) { config.mwgUser = String(got.mwgUser); doi = true; }
    }
    return doi;
  }

  async function saveConfig(siteCode, config) {
    if (!siteCode) throw new Error('Thiếu site_code.');
    var res = await fetch(SB_URL + '/rest/v1/' + TABLE, {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({ site_code: siteCode, config: config, updated_at: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('Lưu cấu hình cụm lỗi HTTP ' + res.status + ': ' + (await res.text()).slice(0, 160));
    setCachedConfig(siteCode, config);
  }

  // Y hệt Chung.chuanHoaTen trong assets/common.js — bỏ dấu, chỉ giữ chữ+số,
  // lowercase — để so tên siêu thị không phụ thuộc viết hoa/dấu câu.
  function chuanHoaTen(name) {
    return String(name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  // Mã cụm ĐEM ĐI ĐẶT TÊN FILE. Từ khi tự dò tên cụm ở ô #selectRSM bên BI, mã
  // cụm có dạng "Cụm 14285" — CÓ DẤU CÁCH VÀ DẤU TIẾNG VIỆT. Supabase Storage
  // từ chối thẳng tên file như vậy ("InvalidKey"), đã gặp thật khi đẩy file giờ
  // công. Nên mọi chỗ ghép mã cụm vào tên file PHẢI đi qua hàm này.
  //
  // ⚠ Bên GHI và bên ĐỌC phải dùng CHUNG hàm này, lệch nhau là đẩy lên được mà
  //   trang đọc không thấy file — hỏng âm thầm, khó lần ra.
  function maCumChoTenFile(siteCode) {
    var s = chuanHoaTen(siteCode);          // "Cụm 14285" -> "cum14285"
    return s || 'chung';                    // phòng khi mã toàn ký tự lạ
  }

  // Tìm store trong danh sách config.stores khớp với 1 đoạn text bất kỳ (tên
  // cào được từ BI, tên nhóm LINE...) — so lỏng, chứa nhau là được.
  function matchStoreByText(stores, text) {
    var t = chuanHoaTen(text);
    if (!t || !stores) return null;
    for (var i = 0; i < stores.length; i++) {
      var s = chuanHoaTen(stores[i].name);
      if (!s) continue;
      if (t.indexOf(s) !== -1 || s.indexOf(t) !== -1) return stores[i];
    }
    return null;
  }

  var api = {
    getSiteCode: getSiteCode,
    setSiteCode: setSiteCode,
    fetchConfig: fetchConfig,
    getCachedConfig: getCachedConfig,
    saveConfig: saveConfig,
    listSiteCodes: listSiteCodes,
    askSiteCode: askSiteCode,
    resolveSiteCode: resolveSiteCode,
    resolveSiteCodeXacNhan: resolveSiteCodeXacNhan,
    detectFromPage: detectFromPage,
    detectMwgUser: detectMwgUser,
    findClusterByEvidence: findClusterByEvidence,
    pickSiteCode: pickSiteCode,
    apDungDauHieu: apDungDauHieu,
    // Mã cụm ĐÚNG mà fetchConfig() vừa dò ra khi mã đang lưu bị lệch — chỗ gọi
    // nên lưu đè lại bằng cơ chế cất mã của riêng nó. Rỗng nếu không phải sửa.
    canonicalSiteCode: function () { return lastCanonicalSiteCode; },
    chuanHoaTen: chuanHoaTen,
    maCumChoTenFile: maCumChoTenFile,
    matchStoreByText: matchStoreByText
  };

  // @require chạy CHUNG bối cảnh (sandbox hay không) với userscript đã nạp nó,
  // nên gán vào "window" bình thường ở đây (KHÔNG ép unsafeWindow — khác hẳn
  // trường hợp đọc biến do TRANG tự set như window.RTSHARE, vốn luôn nằm ở
  // window thật bất kể userscript có sandbox hay không). Gán thêm vào
  // unsafeWindow (nếu khác window) để chắc ăn cho mọi kiểu @grant.
  window.DMXCluster = api;
  try { if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) unsafeWindow.DMXCluster = api; } catch (e) {}
})();
