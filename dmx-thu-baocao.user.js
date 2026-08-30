// ==UserScript==
// @name         DMX — Thu gói số (baocao.dienmayxanh.com) [THỬ NGHIỆM]
// @namespace    namkphong.github.io
// @version      0.8.0
// @description  Gọi thẳng API /kb-api/ của baocao.dienmayxanh.com, lọc nhân viên BP All In One bằng giờ công, gói thành 1 JSON, đẩy luôn file giờ công, rồi tự chuyển sang nv.html nhập số. Thay cho việc cào bảng trên bi.thegioididong.com (đã bị chặn).
// @author       Phong
// @match        https://baocao.dienmayxanh.com/*
// @run-at       document-idle
// @grant        none
// @require      https://namkphong.github.io/dmx-cluster-shared.js
// @updateURL    https://namkphong.github.io/dmx-thu-baocao.user.js
// @downloadURL  https://namkphong.github.io/dmx-thu-baocao.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VER = '0.8.0';

  // Phòng ban của nhân viên bán hàng. Mọi bảng của trang này đều trả về ĐỦ mọi
  // người phát sinh doanh thu tại siêu thị: nhân viên online (mã "online"),
  // "administrator", trưởng ca, quản lý, và nhân viên siêu thị khác bán hộ.
  // Bảng cũ trên BI chỉ hiện nhân viên chính, nên muốn số khớp nếp cũ thì phải
  // tự lọc. Quy ước đã chốt: CHỈ "BP All In One".
  var PHONG_BAN_CHINH = 'BP All In One - ĐMX';

  var TRANG_THU = 'https://namkphong.github.io/thunghiem.html';
  var TRANG_NV = 'https://namkphong.github.io/nv.html';
  var GOC_TRANG_THU = 'https://namkphong.github.io';

  /* ================================================================== */
  /* CHUỖI TỰ ĐỘNG: lấy số -> mở nv.html -> nhập số -> đẩy ảnh LINE     */
  /* ================================================================== */

  // Mẹo then chốt: MỞ TAB TRƯỚC rồi mới đi lấy số. window.open phải nằm ngay
  // trong nhịp bấm nút, đặt nó sau ~10s await là mất dấu thao tác người dùng và
  // trình duyệt chặn pop-up (đã thử: gọi từ code không có cú bấm thì trả null).
  // Tab kia nằm chờ, lấy xong ta mới bắn gói sang.
  function chuoiTuDong(log) {
    var cua = window.open(TRANG_NV, 'dmx_nv');
    if (!cua) {
      log('✗ Trình duyệt chặn mở tab mới. Cho phép pop-up cho trang này rồi bấm lại.');
      return null;
    }
    log('… Đã mở nv.html, đang lấy số…');

    var xong = false, iv = null;
    function donDep() { window.removeEventListener('message', nhan); if (iv) { clearInterval(iv); iv = null; } }

    function nhan(ev) {
      if (ev.origin !== GOC_TRANG_THU) return;
      if (!ev.data) return;
      if (ev.data.loai === 'dmx-da-nhan' && !xong) {
        xong = true;
        log('🚀 nv.html đã nhận gói và đang nhập số. Chuyển sang tab đó xem.');
        donDep();
      }
    }
    window.addEventListener('message', nhan);

    return {
      gui: function (goi) {
        // Bắn lặp: không biết chắc lúc nào trang kia tải xong, và nếu tab đã mở
        // sẵn từ trước thì nó không chào lại nữa.
        iv = setInterval(function () {
          if (xong) { donDep(); return; }
          try { cua.postMessage({ loai: 'dmx-goi-api', goi: goi }, GOC_TRANG_THU); } catch (e) {}
        }, 500);
        try { cua.postMessage({ loai: 'dmx-goi-api', goi: goi }, GOC_TRANG_THU); } catch (e) {}
        setTimeout(function () {
          if (xong) return;
          donDep();
          log('⚠ nv.html không phản hồi sau 20s. Mở nv.html rồi bấm "⬇ Số mới" để chạy tay.');
        }, 20000);
      },
      huy: function (ly) { donDep(); log('✗ ' + ly); }
    };
  }

  /* ================================================================== */
  /* GỬI THẲNG SANG TRANG THỬ NGHIỆM                                    */
  /* ================================================================== */

  // Bản đầu bắt người dùng bấm "Chép" rồi tự sang tab kia dán. Thực tế chạy thử
  // 30/08/2026: bấm nhầm sang thẳng "Mở trang thử nghiệm" nên ô dán rỗng và
  // tưởng script hỏng. Nhớ đúng thứ tự 3 bước là việc của máy, không phải của
  // người — nên giờ script tự gửi dữ liệu qua postMessage.
  //
  // Trang bên kia vừa tải xong sẽ liên tục gọi "sanSang" về cửa sổ mẹ; ta nghe
  // được thì bắn gói sang. Phải gắn tai nghe TRƯỚC khi window.open, vì trang
  // nhẹ có thể gọi trước khi mình kịp nghe.
  function guiSangTrangThu(goi, log) {
    var xong = false;

    function nhan(ev) {
      if (ev.origin !== GOC_TRANG_THU) return;             // chỉ tin đúng trang của mình
      if (!ev.data) return;
      if (ev.data.loai === 'thunghiem-san-sang') {
        ev.source.postMessage({ loai: 'thunghiem-goi', goi: goi }, GOC_TRANG_THU);
        return;
      }
      if (ev.data.loai === 'thunghiem-da-nhan' && !xong) {
        xong = true;
        log('🚀 Trang thử nghiệm đã nhận đủ số. Chuyển sang tab đó xem.');
        donDep();
      }
    }

    var iv = null;
    function donDep() {
      window.removeEventListener('message', nhan);
      if (iv) { clearInterval(iv); iv = null; }
    }

    // Gắn tai nghe TRƯỚC window.open: trang bên kia nhẹ, có thể lên tiếng trước
    // khi mình kịp nghe.
    window.addEventListener('message', nhan);

    // window.open PHẢI chạy ngay trong nhịp bấm nút. Đặt nó sau bất kỳ await nào
    // là mất dấu thao tác người dùng và trình duyệt chặn pop-up (đã thử: gọi từ
    // code không có cú bấm thì window.open trả về null).
    var cua = window.open(TRANG_THU, 'dmx_thunghiem');
    if (!cua) {
      donDep();
      log('✗ Trình duyệt chặn mở tab mới. Cho phép pop-up cho trang này, hoặc dùng 2 nút dự phòng bên dưới.');
      chepDuPhong(goi, log);
      return;
    }
    log('… Đang mở trang thử nghiệm…');

    // Bắn thẳng theo chu kỳ, không chỉ dựa vào lời chào. Lý do: nếu tab đó đã mở
    // sẵn từ trước thì nó đã chào xong lâu rồi và sẽ không chào lại nữa.
    iv = setInterval(function () {
      if (xong) { donDep(); return; }
      try { cua.postMessage({ loai: 'thunghiem-goi', goi: goi }, GOC_TRANG_THU); } catch (e) {}
    }, 500);

    setTimeout(function () {
      if (xong) return;
      donDep();
      log('⚠ Trang thử nghiệm không phản hồi sau 15s.');
      chepDuPhong(goi, log);
    }, 15000);

    // Chép sẵn vào bộ nhớ luôn — hỏng đường tự động thì chỉ việc dán, khỏi bấm
    // thêm nút nào. Làm SAU window.open để không cướp mất nhịp bấm.
    chepDuPhong(goi, log);
  }

  function chepDuPhong(goi, log) {
    try {
      navigator.clipboard.writeText(JSON.stringify(goi)).then(function () {
        log('📋 (Đã chép sẵn vào bộ nhớ — nếu cần thì dán tay vào trang thử nghiệm.)');
      }, function () {});
    } catch (e) {}
  }

  /* ================================================================== */
  /* TIỆN ÍCH                                                           */
  /* ================================================================== */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Ngày theo GIỜ MÁY. KHÔNG dùng toISOString() vì hàm đó trả giờ UTC mà Việt
  // Nam là UTC+7 -> từ 00:00 đến 07:00 sáng sẽ ra ngày hôm trước.
  function ngayMay(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function ymdSo(d) { // 20260830 — kiểu số mà API đòi
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function thangKey(d) { return d.getFullYear() * 100 + (d.getMonth() + 1); }

  function so(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }

  /* ================================================================== */
  /* GỌI API                                                            */
  /* ================================================================== */

  // Token nằm ở localStorage.access_token — chính là thứ trang tự gắn vào mọi
  // request. Đọc lại mỗi lần gọi (không nhớ sẵn) vì trang tự làm mới token.
  function token() {
    var t = localStorage.getItem('access_token');
    if (!t) throw new Error('Chưa đăng nhập (không thấy access_token). Tải lại trang rồi thử lại.');
    return t;
  }

  // Nơi ghi nhật ký cho các hàm ở tầng dưới. thuGoi() gắn vào lúc bắt đầu chạy.
  var ghiLog = function () {};

  function nghi(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Máy chủ MWG thỉnh thoảng trả 502 rồi lần sau lại bình thường (đã gặp thật
  // 30/08/2026: hỏng giữa bước ④, thử lại ngay sau đó thì 4/4 lần đều 200).
  // Không thử lại thì một cú hắt hơi của server làm mất trắng cả chục giây vừa
  // chạy. Chỉ thử lại với lỗi máy chủ (5xx) và lỗi mạng — 400/401/403 là sai
  // tham số hoặc hết quyền, thử lại bao nhiêu lần cũng vô ích.
  var SO_LAN_THU = 4;

  async function post(path, body) {
    var loiCuoi = null;

    for (var lan = 1; lan <= SO_LAN_THU; lan++) {
      var r = null, loiMang = null;
      try {
        r = await fetch('/kb-api/' + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
          body: JSON.stringify(body)
        });
      } catch (e) { loiMang = e; }

      if (!loiMang) {
        var j = null;
        try { j = await r.json(); } catch (e) { j = null; }
        if (r.ok && j && j.success !== false) return j.data || [];

        loiCuoi = new Error(path + ' lỗi ' + r.status + (j && j.message ? ': ' + j.message : ''));
        if (r.status < 500) throw loiCuoi;              // lỗi của mình, thử lại vô ích
      } else {
        loiCuoi = new Error(path + ' lỗi mạng: ' + (loiMang.message || loiMang));
      }

      if (lan < SO_LAN_THU) {
        var cho = 800 * Math.pow(2, lan - 1);           // 0,8s → 1,6s → 3,2s
        ghiLog('  ⟳ ' + path + ' hỏng (' + (loiCuoi.message || '') + '), thử lại lần ' +
               (lan + 1) + '/' + SO_LAN_THU + ' sau ' + (cho / 1000) + 's…');
        await nghi(cho);
      }
    }
    throw loiCuoi;
  }

  /* ================================================================== */
  /* TỰ NHẬN CỤM                                                        */
  /* ================================================================== */

  // API tự cắt theo quyền của người đăng nhập: vùng -> khu vực -> siêu thị chỉ
  // trả về phần mình quản lý. Nhờ vậy KHÔNG phải đóng cứng mã nào, cụm khác cài
  // script này vẫn chạy đúng.
  // Lưu ý: danh sách vùng có lẫn mục rác "422 - Khác" không có khu vực con nào,
  // nên phải duyệt hết rồi bỏ mục rỗng chứ đừng lấy mục đầu tiên.
  async function nhanDienCum(log) {
    var vungs = await post('common/filter-rsm-getlist',
      { KEYWORD: '', PAGEINDEX: 1, PAGESIZE: 100000, PERKEY: '', COMPANYIDLIST: null });

    var khuVucs = [];
    for (var i = 0; i < vungs.length; i++) {
      var ds = await post('common/filter-am-getbyrsmlist', {
        KEYWORD: '', PAGEINDEX: 1, PAGESIZE: 100000, PERKEY: '',
        PARENTVALUE: String(vungs[i].id), COMPANYIDLIST: null
      });
      for (var a = 0; a < ds.length; a++) {
        khuVucs.push({
          id: ds[a].id, ten: ds[a].Value,
          vungId: vungs[i].id, vungTen: vungs[i].Value
        });
      }
    }
    if (!khuVucs.length) {
      throw new Error('Không nhận được khu vực nào — tài khoản này có thể không có quyền xem cấp cụm.');
    }

    var sieuThis = [], daThay = {};
    for (var k = 0; k < khuVucs.length; k++) {
      var ds2 = await post('common/filter-store-getbyasmlist', {
        KEYWORD: '', PAGEINDEX: 1, PAGESIZE: 10000000, PERKEY: '',
        AMIDS: String(khuVucs[k].id), RSMIDS: String(khuVucs[k].vungId),
        AsUser: null, COMPANYIDLIST: null
      });
      for (var m = 0; m < ds2.length; m++) {
        var s = ds2[m];
        if (daThay[s.id]) continue;
        daThay[s.id] = 1;
        // "14285 - ĐML_HNO_LBI - 396 Nguyễn Văn Cừ" -> tên gọn "396 Nguyễn Văn Cừ"
        var tenDayDu = String(s.Value).replace(/^\s*\d+\s*-\s*/, '');
        var gon = tenDayDu.replace(/^[A-ZĐ]{2,4}_[A-Z]{2,4}_[A-Z]{2,4}\s*-\s*/, '');
        sieuThis.push({
          mwg: String(s.id), tenDayDu: tenDayDu, ten: gon, khuVucId: khuVucs[k].id
        });
      }
    }
    if (!sieuThis.length) throw new Error('Không nhận được siêu thị nào.');

    log('✓ Cụm: ' + khuVucs.map(function (x) { return x.ten; }).join(', ') +
        ' — ' + sieuThis.length + ' siêu thị: ' +
        sieuThis.map(function (x) { return x.ten; }).join(', '));
    return { vungs: vungs, khuVucs: khuVucs, sieuThis: sieuThis };
  }

  /* ================================================================== */
  /* DANH SÁCH NHÂN VIÊN CHÍNH (theo giờ công)                          */
  /* ================================================================== */

  // Lấy giờ công TỪ ĐẦU THÁNG đến hôm nay chứ không riêng hôm nay, để người
  // nghỉ phép hôm nay vẫn còn trong danh sách. Đổi lại, nhân viên mới vào làm
  // hôm nay mà chưa chấm công lần nào sẽ chưa xuất hiện — trường hợp đó script
  // báo ở phần "canhBao" chứ không im lặng bỏ qua.
  async function layDanhSachNV(dauThang, homNay, maSieuThis, log) {
    var rows = await post('reports/timekeeping-get', {
      FROMDATE: ymdSo(dauThang), TODATE: ymdSo(homNay),
      STOREIDS: maSieuThis.join(','), PAGEINDEX: 1, PAGESIZE: 0
    });

    var map = {}; // "maSieuThi|maNV" -> thông tin
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var key = String(r.ma_sieu_thi) + '|' + String(r.ma_nv);
      if (!map[key]) {
        map[key] = {
          mwg: String(r.ma_sieu_thi), ma: String(r.ma_nv), ten: r.ten_nv,
          phongBan: r.phong_ban, chucVu: r.chuc_vu, gioCong: 0, ngayCong: {}
        };
      }
      map[key].gioCong += so(r.tong_gio_cong);
      map[key].ngayCong[r.ngay] = 1;
    }

    var tatCa = Object.keys(map).map(function (key) {
      var x = map[key];
      x.gioCong = Math.round(x.gioCong * 10) / 10;
      x.ngayCong = Object.keys(x.ngayCong).length;
      return x;
    });
    var chinh = tatCa.filter(function (x) { return x.phongBan === PHONG_BAN_CHINH; });

    var pbKhac = {};
    tatCa.forEach(function (x) {
      if (x.phongBan !== PHONG_BAN_CHINH) pbKhac[x.phongBan] = (pbKhac[x.phongBan] || 0) + 1;
    });

    log('✓ Giờ công: ' + tatCa.length + ' người chấm công → giữ ' + chinh.length +
        ' người "' + PHONG_BAN_CHINH + '"');
    Object.keys(pbKhac).forEach(function (p) {
      log('  · bỏ ' + pbKhac[p] + ' người ' + p);
    });
    return { tatCa: tatCa, chinh: chinh };
  }

  /* ================================================================== */
  /* GIỜ CÔNG — gộp từ dmx-gio-cong.user.js                             */
  /* ================================================================== */
  /*
   * dashboard.html và giocong.html đọc file gio_cong_<mã cụm>.xlsx trên Supabase
   * Storage bằng XLSX.read(). API có timekeeping-get trả JSON, nhưng đổi sang
   * JSON thì phải sửa cả 2 trang đọc — nên cứ dùng đúng luồng xuất file sẵn có:
   * tạo job -> chờ -> tải -> đẩy Storage.
   *
   * Tên file phải khớp TUYỆT ĐỐI với thứ dashboard đi tìm, nên dùng chung
   * DMXCluster.maCumChoTenFile() chứ không tự chuẩn hoá lại — lệch một ký tự là
   * dashboard không thấy file mà chẳng báo lỗi gì.
   */
  var SB_URL = 'https://kyyoihvcsrnmylnmbcis.supabase.co';
  var SB_KEY = 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C';
  var BUCKET = 'bc';

  async function apiGet(path) {
    var r = await fetch('/kb-api/' + path, {
      headers: { Authorization: 'Bearer ' + token() }, credentials: 'include'
    });
    var t = await r.text();
    if (!r.ok) throw new Error(path + ' lỗi ' + r.status + ': ' + t.slice(0, 120));
    try { return JSON.parse(t); } catch (e) { throw new Error(path + ' trả về không phải JSON.'); }
  }

  async function dayGioCong(dauThang, homNay, maSieuThis, log) {
    if (!window.DMXCluster) throw new Error('Chưa nạp được dmx-cluster-shared.js.');
    var site = DMXCluster.getSiteCode();
    if (!site) throw new Error('Chưa đặt mã cụm trên trang này (dmx_site_code).');

    var created = await (await fetch('/kb-api/reports/export/timekeeping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      body: JSON.stringify({
        FROMDATE: ymdSo(dauThang), TODATE: ymdSo(homNay), STOREIDS: maSieuThis.join(',')
      })
    })).json();
    var jobId = created && created.job_id;
    if (!jobId) throw new Error('Không lấy được job_id.');
    log('  job ' + jobId + ' — chờ xử lý…');

    var job = null;
    for (var i = 0; i < 40; i++) {                    // tối đa ~2 phút
      await nghi(3000);
      job = await apiGet('reports/export/status/' + jobId);
      if (job.state === 'done') break;
      if (job.state === 'error' || job.state === 'failed') {
        throw new Error('job lỗi: ' + (job.message || job.state));
      }
    }
    if (!job || job.state !== 'done') throw new Error('chờ quá lâu, job chưa xong.');
    log('  ✓ ' + job.result_rows + ' dòng');

    var dl = await apiGet('reports/export/download/' + jobId);
    if (!dl || !dl.downloadUrl) throw new Error('không có downloadUrl.');

    var r = await fetch(dl.downloadUrl);            // link chỉ sống ~120s
    if (!r.ok) throw new Error('tải file lỗi ' + r.status);
    var buf = await r.arrayBuffer();
    if (!buf || !buf.byteLength) throw new Error('file rỗng.');

    var ten = 'gio_cong_' + DMXCluster.maCumChoTenFile(site) + '.xlsx';
    var up = await fetch(SB_URL + '/storage/v1/object/' + BUCKET + '/' + ten, {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
        'x-upsert': 'true',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      body: buf
    });
    if (!up.ok) throw new Error('Supabase ' + up.status + ': ' + (await up.text()).slice(0, 120));
    log('  ☁ đã đẩy ' + ten + ' (' + Math.round(buf.byteLength / 1024) + ' KB)');
  }

  /* ================================================================== */
  /* THU GÓI                                                            */
  /* ================================================================== */

  async function thuGoi(log) {
    ghiLog = log;                       // để post() báo được lúc phải thử lại
    var homNay = new Date();
    var dauThang = new Date(homNay.getFullYear(), homNay.getMonth(), 1);
    var tuNgay = ymdSo(dauThang), denNgay = ymdSo(homNay);

    log('① Nhận diện cụm…');
    var cum = await nhanDienCum(log);
    var maSieuThis = cum.sieuThis.map(function (s) { return s.mwg; });

    log('② Danh sách nhân viên (giờ công)…');
    var nv = await layDanhSachNV(dauThang, homNay, maSieuThis, log);

    var laChinh = {}; // "mwg|maNV" -> nhân viên chính
    nv.chinh.forEach(function (x) { laChinh[x.mwg + '|' + x.ma] = x; });

    // Danh sách siêu thị lấy được ở bước ① còn lẫn rác: nhánh "AM_Khác" kéo theo
    // Callcenter, C2, Văn Phòng… Chúng KHÔNG phải siêu thị bán hàng nhưng vẫn
    // trả về số nếu cứ thế gọi tiếp, và số đó sẽ lặng lẽ trộn vào báo cáo.
    // Lọc bằng dữ liệu chứ không theo tên: giữ nơi có ít nhất 1 nhân viên
    // "BP All In One". Kiểm chứng 30/08/2026: 4 nơi không có giờ công, riêng
    // Văn Phòng Ba Tháng Hai có giờ công nhưng toàn khiếu nại/dịch vụ KH -> bị
    // loại đúng, còn lại đúng 2 siêu thị thật.
    var coBanHang = {};
    nv.chinh.forEach(function (x) { coBanHang[x.mwg] = (coBanHang[x.mwg] || 0) + 1; });

    var canhBao = [];
    var biLoai = cum.sieuThis.filter(function (s) { return !coBanHang[s.mwg]; });
    cum.sieuThis = cum.sieuThis.filter(function (s) { return !!coBanHang[s.mwg]; });
    if (!cum.sieuThis.length) {
      throw new Error('Không còn siêu thị nào có nhân viên "' + PHONG_BAN_CHINH +
                      '" — kiểm tra lại quyền hoặc giờ công.');
    }
    if (biLoai.length) {
      // Loại thì phải NÓI RA. Bỏ im lặng là kiểu lỗi khó phát hiện nhất.
      log('✓ Bỏ ' + biLoai.length + ' nơi không phải siêu thị bán hàng: ' +
          biLoai.map(function (s) { return s.ten; }).join(', '));
      canhBao.push('Đã bỏ ' + biLoai.length + ' nơi không có nhân viên "' + PHONG_BAN_CHINH +
                   '": ' + biLoai.map(function (s) { return s.ten + ' (' + s.mwg + ')'; }).join(', '));
    }
    maSieuThis = cum.sieuThis.map(function (s) { return s.mwg; });
    log('✓ Còn ' + cum.sieuThis.length + ' siêu thị: ' +
        cum.sieuThis.map(function (s) { return s.ten; }).join(', '));

    log('③ Doanh thu theo nhân viên + số tổng siêu thị…');
    for (var i = 0; i < cum.sieuThis.length; i++) {
      var s = cum.sieuThis[i];

      // Gọi TÁCH TỪNG siêu thị chứ không gọi gộp: người bán ở cả 2 siêu thị bị
      // API gộp thành 1 dòng nếu truyền chung, làm số của họ dính sang siêu thị
      // không phải nhà mình.
      var chung = {
        FROMDATE: tuNgay, TODATE: denNgay, VIEWLEVEL: 'STORE', VIEWIDS: s.mwg,
        CHAINIDS: '1,2,16', MAINGROUPIDS: null, SUBGROUPIDS: null,
        OUTPUTTYPEIDS: null, PAGEINDEX: 1, PAGESIZE: 0, GROUPBY: 'STAFF'
      };
      var thang = await post('reports/revenue-consolidated-get', chung);
      var ngay = await post('reports/revenue-consolidated-get',
        Object.assign({}, chung, { FROMDATE: denNgay }));

      var theoNgay = {};
      ngay.forEach(function (r) { theoNgay[String(r.rowcode)] = r; });

      var giu = [], bo = [];
      thang.forEach(function (r) {
        var ma = String(r.rowcode);
        var info = laChinh[s.mwg + '|' + ma];
        if (!info) { bo.push({ ma: ma, ten: r.rowname, dt: so(r.revenue) }); return; }
        var n = theoNgay[ma] || {};
        giu.push({
          ma: ma, ten: r.rowname, phongBan: info.phongBan, chucVu: info.chucVu,
          gioCong: info.gioCong, ngayCong: info.ngayCong,
          thang: {
            dt: so(r.revenue), dtqd: so(r.revenue_kfactor), sl: so(r.quantity),
            traCham: so(r.revenue_tragop), traChamQd: so(r.revenue_tragop_kfactor),
            onl: so(r.revenue_onl), off: so(r.revenue_off), tb3thang: so(r.avg3month)
          },
          ngay: {
            dt: so(n.revenue), dtqd: so(n.revenue_kfactor),
            sl: so(n.quantity), traCham: so(n.revenue_tragop)
          }
        });
      });

      // Nhân viên chính mà bảng doanh thu KHÔNG có dòng nào (chưa bán được gì)
      // vẫn phải hiện ra với số 0 — "bán 0 đồng" chính là thứ cần nhìn thấy.
      nv.chinh.filter(function (x) { return x.mwg === s.mwg; }).forEach(function (x) {
        var coRoi = giu.some(function (g) { return g.ma === x.ma; });
        if (coRoi) return;
        giu.push({
          ma: x.ma, ten: x.ten, phongBan: x.phongBan, chucVu: x.chucVu,
          gioCong: x.gioCong, ngayCong: x.ngayCong,
          thang: { dt: 0, dtqd: 0, sl: 0, traCham: 0, traChamQd: 0, onl: 0, off: 0, tb3thang: 0 },
          ngay: { dt: 0, dtqd: 0, sl: 0, traCham: 0 },
          chuaCoDoanhThu: true
        });
        canhBao.push(x.ten + ' (' + x.ma + ' · ' + s.ten + ') có giờ công nhưng chưa có dòng doanh thu nào.');
      });

      giu.sort(function (a, b) { return b.thang.dt - a.thang.dt; });

      // PHẢI gọi 2 lần. Thẻ tổng trả về "revenue" = doanh thu trong ĐÚNG khoảng
      // FROMDATE→TODATE, nên gọi 1/8→hôm nay ra số CẢ THÁNG chứ không phải số
      // hôm nay. Muốn có số hôm nay thì FROMDATE = TODATE = hôm nay.
      // (revenue_cum thì luôn là lũy kế đã chốt, tính đến hết hôm qua.)
      var theCard = { FROMDATE: tuNgay, TODATE: denNgay, VIEWLEVEL: 'STORE',
        VIEWIDS: s.mwg, CHAINIDS: '1,2,16', MAINGROUPIDS: null, SUBGROUPIDS: null };
      var cardThang = (await post('reports/revenue-consolidated-card-get', theCard))[0] || {};
      var cardNgay = (await post('reports/revenue-consolidated-card-get',
        Object.assign({}, theCard, { FROMDATE: denNgay })))[0] || {};

      s.nhanVien = giu;
      s.daBo = bo.sort(function (a, b) { return b.dt - a.dt; });
      s.tong = {
        thang: {
          dt: so(cardThang.revenue), dtqd: so(cardThang.revenue_kfactor),
          traCham: so(cardThang.revenue_tragop), sl: so(cardThang.quantity),
          luotKhach: so(cardThang.svc_visitors), luotBill: so(cardThang.svc_bills)
        },
        ngay: {
          dt: so(cardNgay.revenue), dtqd: so(cardNgay.revenue_kfactor),
          traCham: so(cardNgay.revenue_tragop), sl: so(cardNgay.quantity),
          luotKhach: so(cardNgay.svc_visitors), luotBill: so(cardNgay.svc_bills)
        },
        luyKe: {
          dt: so(cardThang.revenue_cum), dtqd: so(cardThang.revenue_kfactor_cum),
          chotDenNgay: cardThang.cum_as_of_date_key
        },
        target: so(cardThang.target), targetQd: so(cardThang.target_kfactor),
        tb3thang: so(cardThang.avg3month), tb3thangQd: so(cardThang.avg3month_kfactor),
        soNgayLuyKe: cardThang.numday_cum, soNgayThang: cardThang.numday_month,
        realtimeLuc: cardThang.rt_loaded_at
      };
      log('  · ' + s.ten + ': giữ ' + giu.length + ' NV, bỏ ' + bo.length + ' dòng ngoài danh sách');
    }

    log('④ Thi đua theo siêu thị…');
    // Thử hết mọi cách vẫn hỏng thì KHÔNG ném lỗi làm mất trắng bước ①②③ đã
    // chạy xong. Ghi cảnh báo thật to rồi đi tiếp — nhưng phải nói rõ là thiếu
    // thi đua thì không dựng được Ô1 và Ô3 cho nv.html.
    var thiDuaST = [], salegroup = {}, hongThiDua = null;
    for (var k = 0; k < cum.khuVucs.length; k++) {
      var rows = [];
      try {
        rows = await post('reports/competition-bymsg-get', {
          MONTHKEY: thangKey(homNay), VIEWLEVEL: 'STOREGROUP',
          VIEWIDS: String(cum.khuVucs[k].id), ISVIEWSTORE: 0, TIMETYPE: 2,
          STOREIDS: maSieuThis.join(','), PAGESIZE: 0
        });
      } catch (e) {
        hongThiDua = e.message || String(e);
        log('✗ Thi đua siêu thị hỏng: ' + hongThiDua);
        break;
      }
      rows.forEach(function (r) {
        salegroup[r.salegroupname] = r.salegroupid;
        thiDuaST.push({
          sieuThi: r.salegroupname, salegroupId: r.salegroupid,
          maCt: r.programid, ten: r.programname, loai: r.competitiontype,
          dt: so(r.revenue), dtqd: so(r.revenue_kfactor), sl: so(r.quantity),
          target: so(r.target), pct: so(r.targetpercent_month),
          pctDuBao: so(r.targetpercent_predict),
          hangVung: r.compe_ranking_in_rsm, hangCty: r.compe_ranking_in_company
        });
      });
    }
    var sgIds = Object.keys(salegroup).map(function (t) { return salegroup[t]; });

    // Gắn mã siêu thị nội bộ vào từng siêu thị, để bên nhận khỏi phải dò tên
    // trong chuỗi. Dò tên sẽ khớp nhầm ở cụm có 2 siêu thị tên lồng nhau
    // (vd "Ngọc Thụy" và "Ngọc Thụy 2").
    cum.sieuThis.forEach(function (s) {
      var ten = Object.keys(salegroup).filter(function (t) {
        return t === s.tenDayDu || t.indexOf(s.ten) !== -1;
      }).sort(function (a, b) { return a.length - b.length; })[0];
      if (ten) s.salegroupId = salegroup[ten];
      else if (thiDuaST.length) {
        canhBao.push('Không khớp được mã thi đua cho siêu thị ' + s.ten +
                     ' — Ô1/Ô3 của siêu thị này có thể thiếu.');
      }
    });
    log('✓ ' + thiDuaST.length + ' dòng thi đua siêu thị (mã nội bộ: ' + sgIds.join(', ') + ')');

    log('⑤ Thi đua theo nhân viên…');
    // Bấm vào tên siêu thị trên web = đổi VIEWLEVEL sang STORE và VIEWIDS sang
    // salegroupid. Truyền cả 2 salegroupid một lượt là ra cả cụm, khỏi gọi 2 lần.
    var thiDuaNV = [];
    if (sgIds.length) {
      var rows2 = [];
      try {
        rows2 = await post('reports/competition-bymsg-get', {
          MONTHKEY: thangKey(homNay), VIEWLEVEL: 'STORE', VIEWIDS: sgIds.join(','),
          ISVIEWSTORE: 0, TIMETYPE: 2, STOREIDS: maSieuThis.join(','), PAGESIZE: 0
        });
      } catch (e) {
        hongThiDua = (hongThiDua ? hongThiDua + ' | ' : '') + (e.message || String(e));
        log('✗ Thi đua nhân viên hỏng: ' + (e.message || e));
      }
      rows2.forEach(function (r) {
        var mwg = String(r.storeid), ma = String(r.salegroupid);
        if (!laChinh[mwg + '|' + ma]) return; // bỏ online / hỗ trợ / trưởng ca
        thiDuaNV.push({
          mwg: mwg, maNv: ma, tenNv: r.salegroupname,
          maCt: r.programid, ten: r.programname, loai: r.competitiontype,
          dt: so(r.revenue), dtqd: so(r.revenue_kfactor), sl: so(r.quantity),
          hangTrongSt: r.compe_ranking_in_rsm
        });
      });
      log('✓ ' + rows2.length + ' dòng thô → giữ ' + thiDuaNV.length + ' dòng của nhân viên chính');
    }

    if (hongThiDua) {
      canhBao.push('THIẾU DỮ LIỆU THI ĐUA (' + hongThiDua + '). Gói vẫn có doanh thu ' +
                   'nhân viên, nhưng KHÔNG dựng được Ô1 (target ngành hàng) và Ô3 ' +
                   '(chi tiết bán) cho nv.html. Chờ vài phút rồi chạy lại.');
    }

    log('⑥ Giờ công (file cho dashboard)…');
    try {
      await dayGioCong(dauThang, homNay, maSieuThis, log);
    } catch (e) {
      canhBao.push('Không đẩy được file giờ công: ' + (e.message || e));
      log('⚠ Bỏ qua giờ công: ' + (e.message || e));
    }

    log('⑦ Ngành hàng siêu thị…');
    var nganhHang = [];
    try {
      nganhHang = await post('reports/bi-category-get', {
        FROMDATE: tuNgay, TODATE: denNgay, VIEWLEVEL: 'ALL', VIEWID: null,
        BRANDIDLIST: null, LEVEL1ID: null, LEVEL2ID: null
      });
      log('✓ ' + nganhHang.length + ' dòng ngành hàng');
    } catch (e) {
      canhBao.push('Không lấy được ngành hàng: ' + (e.message || e));
      log('⚠ Bỏ qua ngành hàng: ' + (e.message || e));
    }

    var nguoiDung = '';
    try { nguoiDung = (JSON.parse(localStorage.getItem('user') || '{}') || {}).full_name || ''; } catch (e) {}

    return {
      v: 1,
      nguon: 'baocao.dienmayxanh.com',
      scriptVer: VER,
      layLuc: new Date().toString(),
      ngay: ngayMay(homNay),
      thang: thangKey(homNay),
      khoangNgay: { tu: tuNgay, den: denNgay },
      cum: { vungs: cum.vungs, khuVucs: cum.khuVucs, nguoiDung: nguoiDung },
      quyTacLoc: PHONG_BAN_CHINH,
      sieuThi: cum.sieuThis,
      noiDaBo: biLoai,
      // Chỉ giữ người của các siêu thị còn lại — kèm cả người của Callcenter/Văn
      // Phòng vào đây thì gói phình ra mà chẳng ai dùng, lại dễ gây hiểu nhầm.
      nhanVienCoChamCong: nv.tatCa.filter(function (x) { return !!coBanHang[x.mwg]; }),
      thiDuaSieuThi: thiDuaST,
      thiDuaNhanVien: thiDuaNV,
      nganhHang: nganhHang,
      canhBao: canhBao
    };
  }

  /* ================================================================== */
  /* GIAO DIỆN                                                          */
  /* ================================================================== */

  function themCSS() {
    var s = document.createElement('style');
    s.textContent = [
      '#dmxthu{position:fixed;right:16px;bottom:16px;z-index:2147483647;',
      'font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
      '#dmxthu .fab{background:#0f766e;color:#fff;border:0;border-radius:999px;',
      'padding:12px 18px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.3)}',
      '#dmxthu .box{display:none;width:min(94vw,470px);max-height:78vh;overflow:auto;',
      'background:#0b1120;color:#e5e7eb;border:1px solid #1f2937;border-radius:14px;',
      'padding:14px;box-shadow:0 20px 50px rgba(0,0,0,.5)}',
      '#dmxthu.mo .box{display:block}#dmxthu.mo .fab{display:none}',
      '#dmxthu h4{margin:0 0 8px;font-size:14px;color:#5eead4;display:flex;',
      'justify-content:space-between;align-items:center}',
      '#dmxthu .x{cursor:pointer;color:#94a3b8;font-size:20px;line-height:1}',
      '#dmxthu button.act{display:block;width:100%;margin:6px 0;padding:10px;border:0;',
      'border-radius:9px;background:#134e4a;color:#a7f3d0;font-weight:600;cursor:pointer}',
      '#dmxthu button.act.chinh{background:#0d9488;color:#fff}',
      '#dmxthu button.act:disabled{opacity:.45;cursor:default}',
      '#dmxthu .phu{margin:12px 0 2px;font-size:11px;color:#64748b;text-align:center}',
      '#dmxthu pre{white-space:pre-wrap;word-break:break-word;background:#111827;',
      'border:1px solid #1f2937;border-radius:9px;padding:9px;margin:8px 0 0;',
      'max-height:36vh;overflow:auto;color:#cbd5e1;',
      'font:11px/1.5 ui-monospace,Menlo,Consolas,monospace}'
    ].join('');
    document.head.appendChild(s);
  }

  function dungGiaoDien() {
    if (document.getElementById('dmxthu')) return;
    themCSS();

    var w = document.createElement('div');
    w.id = 'dmxthu';
    w.innerHTML =
      '<button class="fab">📦 Lấy gói số</button>' +
      '<div class="box">' +
        '<h4><span>📦 Thu gói số v' + VER + '</span><span class="x">×</span></h4>' +
        '<button class="act chinh" data-a="chuoi">⚡ Chạy cả chuỗi (lấy số → nv.html)</button>' +
        '<div class="phu">Hoặc làm từng bước:</div>' +
        '<button class="act" data-a="chay">▶ Lấy gói dữ liệu</button>' +
        '<button class="act" data-a="gui" disabled>🔎 Xem số trên trang thử nghiệm</button>' +
        '<div class="phu">Dự phòng khi hỏng:</div>' +
        '<button class="act" data-a="chep" disabled>📋 Chép rồi dán tay</button>' +
        '<button class="act" data-a="tai" disabled>💾 Tải file .json</button>' +
        '<pre></pre>' +
      '</div>';
    document.body.appendChild(w);

    var pre = w.querySelector('pre');
    var goi = null;

    function log(m) { pre.textContent += m + '\n'; pre.scrollTop = pre.scrollHeight; }
    function batNut(bat) {
      ['gui', 'chep', 'tai'].forEach(function (a) {
        w.querySelector('[data-a="' + a + '"]').disabled = !bat;
      });
    }

    w.querySelector('.fab').onclick = function () { w.classList.add('mo'); };
    w.querySelector('.x').onclick = function () { w.classList.remove('mo'); };

    w.addEventListener('click', async function (e) {
      var b = e.target.closest ? e.target.closest('button.act') : null;
      if (!b) return;
      var a = b.getAttribute('data-a');

      if (a === 'chuoi') {
        b.disabled = true; batNut(false); pre.textContent = '';
        // Mở tab NGAY trong nhịp bấm, rồi mới đi lấy số (xem chuoiTuDong).
        var keo = chuoiTuDong(log);
        if (!keo) { b.disabled = false; return; }
        var t1 = Date.now();
        try {
          goi = await thuGoi(log);
          var n1 = goi.sieuThi.reduce(function (n, s) { return n + s.nhanVien.length; }, 0);
          log('');
          log('✅ Lấy xong sau ' + ((Date.now() - t1) / 1000).toFixed(1) + 's — ' +
              n1 + ' nhân viên chính / ' + goi.sieuThi.length + ' siêu thị');
          if (goi.canhBao.length) {
            goi.canhBao.forEach(function (c) { log('⚠ ' + c); });
          }
          batNut(true);
          keo.gui(goi);
        } catch (err) {
          keo.huy(err.message || err);
        }
        b.disabled = false;
        return;
      }

      if (a === 'chay') {
        b.disabled = true; batNut(false); pre.textContent = '';
        var t0 = Date.now();
        try {
          goi = await thuGoi(log);
          var soNV = goi.sieuThi.reduce(function (n, s) { return n + s.nhanVien.length; }, 0);
          log('');
          log('✅ XONG sau ' + ((Date.now() - t0) / 1000).toFixed(1) + 's — ' +
              soNV + ' nhân viên chính / ' + goi.sieuThi.length + ' siêu thị');
          if (goi.canhBao.length) {
            log('');
            log('⚠ ' + goi.canhBao.length + ' cảnh báo:');
            goi.canhBao.forEach(function (c) { log('  · ' + c); });
          }
          batNut(true);
          log('');
          log('👉 Bấm nút xanh "🚀 Xem số trên trang thử nghiệm" ở trên.');
        } catch (err) {
          log('');
          log('✗ ' + (err.message || err));
        }
        b.disabled = false;
        return;
      }

      if (!goi) return;

      if (a === 'chep') {
        var text = JSON.stringify(goi);
        try {
          await navigator.clipboard.writeText(text);
          log('📋 Đã chép ' + Math.round(text.length / 1024) + ' KB. Sang trang thử nghiệm dán vào.');
        } catch (err) {
          window.prompt('Không tự chép được. Bấm Ctrl+C để chép tay:', text);
        }
      }

      if (a === 'tai') {
        var url = URL.createObjectURL(
          new Blob([JSON.stringify(goi, null, 1)], { type: 'application/json' }));
        var link = document.createElement('a');
        link.href = url;
        link.download = 'goi-so-' + goi.ngay + '.json';
        link.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        log('💾 Đã tải goi-so-' + goi.ngay + '.json');
      }

      if (a === 'gui') {
        guiSangTrangThu(goi, log);
      }
    });
  }

  if (document.body) dungGiaoDien();
  else window.addEventListener('DOMContentLoaded', dungGiaoDien);
})();
