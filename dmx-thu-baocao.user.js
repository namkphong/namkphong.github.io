// ==UserScript==
// @name         DMX — Thu gói số (baocao.dienmayxanh.com) [THỬ NGHIỆM]
// @namespace    namkphong.github.io
// @version      0.28.0
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

  // Số bản hiện trên thanh công cụ. LẤY TỪ @version của chính script khi trình
  // duyệt cho phép (Tampermonkey có GM_info kể cả @grant none; Violentmonkey
  // với @grant none thì không) — hằng số bên dưới chỉ là đường lui.
  // Từng lệch thật: @version 0.26.0 mà nhãn vẫn ghi 0.24.1, người dùng tưởng
  // Violentmonkey không chịu cập nhật (04/09/2026).
  var VER = (function () {
    try { return (GM_info && GM_info.script && GM_info.script.version) || '0.28.0'; }
    catch (e) { return '0.28.0'; }
  })();

  // Phòng ban của nhân viên bán hàng. Mọi bảng của trang này đều trả về ĐỦ mọi
  // người phát sinh doanh thu tại siêu thị: nhân viên online (mã "online"),
  // "administrator", trưởng ca, quản lý, và nhân viên siêu thị khác bán hộ.
  // Bảng cũ trên BI chỉ hiện nhân viên chính, nên muốn số khớp nếp cũ thì phải
  // tự lọc. Quy ước đã chốt: CHỈ "BP All In One".
  //
  // So theo PHẦN ĐẦU, không gắn cứng cả chuỗi. Phòng ban có đuôi theo chuỗi cửa
  // hàng ("BP All In One - ĐMX", và chuỗi khác thì đuôi khác). Gắn cứng "- ĐMX"
  // thì cụm TGDĐ/ĐMS sẽ lọc ra 0 người rồi script dừng với thông báo khó hiểu
  // "không còn siêu thị nào" — trong khi số liệu vẫn đủ cả.
  var PHONG_BAN_CHINH = 'BP All In One';

  function laBanHang(phongBan) {
    var s = window.DMXCluster ? DMXCluster.chuanHoaTen(phongBan)
                              : String(phongBan || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return s.indexOf('bpallinone') === 0;
  }

  // Đối chiếu bản đang chạy với bản trên trang. Sinh ra vì @grant none nên
  // không có GM_info: số hiện trên thanh công cụ là hằng số, quên bump một lần
  // là người dùng thấy số cũ rồi kết luận "Violentmonkey không chịu cập nhật"
  // và đi tìm lỗi ở chỗ khác (mất một buổi ngày 04/09/2026).
  async function kiemTraBanMoi() {
    var o = document.getElementById('dmxthu-ban');
    if (!o) return;
    try {
      var r = await fetch('https://namkphong.github.io/dmx-thu-baocao.user.js?t=' + Date.now(),
                          { cache: 'no-store' });
      var m = (await r.text()).match(/@versions+([d.]+)/);
      if (!m || m[1] === VER) return;
      o.style.cssText = 'color:#fca5a5;font-weight:700;margin-left:6px';
      o.textContent = ' → có bản ' + m[1] + ', hãy Cập nhật';
    } catch (e) {}
  }

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
        // Tiền tố chuỗi có thể CÓ SỐ ("ĐMS3_TNG_PBI - Kha Sơn"). Mẫu cũ chỉ nhận
        // chữ cái nên cụm ĐMS bị giữ nguyên cả tiền tố làm tên siêu thị — đã thấy
        // thật trong cấu hình cụm 1473 ngày 30/08/2026.
        var tenDayDu = String(s.Value).replace(/^\s*\d+\s*-\s*/, '');
        var gon = tenDayDu.replace(/^[A-ZĐ][A-Z0-9Đ]{1,5}_[A-Z0-9]{2,5}_[A-Z0-9]{2,5}\s*-\s*/, '');
        sieuThis.push({
          mwg: String(s.id), tenDayDu: tenDayDu, ten: gon, khuVucId: khuVucs[k].id
        });
      }
    }
    // Hai siêu thị rút gọn ra CÙNG MỘT TÊN thì phải tách ra bằng mã thương hiệu,
    // nếu không mọi chỗ so tên (ô chọn siêu thị, nhãn nhóm LINE, khopTenLong,
    // matchStoreByText) đều coi chúng là một.
    // Đo thật cụm Huyện Gia Lâm 04/09/2026: "13884 - AAR_HNO_GLA - Yên Viên" và
    // "1472 - ĐML_HNO_GLA - Yên Viên" cùng rút về "Yên Viên" -> cấu hình chỉ nhận
    // 1, siêu thị kia đẩy ảnh đè lên nhóm LINE của siêu thị này.
    var demTen = {};
    sieuThis.forEach(function (s) { demTen[s.ten] = (demTen[s.ten] || 0) + 1; });
    sieuThis.forEach(function (s) {
      if (demTen[s.ten] < 2) return;
      var hieu = (s.tenDayDu.match(/^([A-ZĐ][A-Z0-9Đ]{1,5})_/) || [])[1];
      s.ten = hieu ? (s.ten + ' (' + hieu + ')') : (s.ten + ' (' + s.mwg + ')');
      s.tachTen = true;   // để bước lưu cấu hình đổi luôn tên mục cũ
    });

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
    async function docGioCong(tu, den) {
      return await post('reports/timekeeping-get', {
        FROMDATE: ymdSo(tu), TODATE: ymdSo(den),
        STOREIDS: maSieuThis.join(','), PAGEINDEX: 1, PAGESIZE: 0
      });
    }
    function coBanHang(ds) {
      return ds.some(function (r) { return laBanHang(r.phong_ban); });
    }

    var rows = await docGioCong(dauThang, homNay);

    // NGÀY ĐẦU THÁNG chưa ai chấm công: cửa sổ "đầu tháng -> hôm nay" chỉ có
    // đúng một ngày và trả về 0 dòng, thế là lọc sạch nhân viên -> lọc sạch luôn
    // siêu thị -> script dừng với thông báo khó hiểu "không còn siêu thị nào".
    // Đã gặp thật sáng 01/09/2026: 01/09 ra 0 dòng, trong khi 31/08 có 61 dòng.
    // Danh sách nhân viên là DANH SÁCH NGƯỜI, không phải số liệu theo tháng, nên
    // nới cửa sổ về 30 ngày là hợp lý — và phải NÓI RA chứ không lặng lẽ đổi.
    if (!coBanHang(rows)) {
      // Nới 7 NGÀY, không phải 30. Lúc này danh sách siêu thị chưa được lọc nên
      // còn cả Callcenter/Văn Phòng (Văn Phòng Ba Tháng Hai ~50 người) — cửa sổ
      // càng rộng càng dễ nghẽn, đã ăn 504 thật sáng 01/09/2026.
      // Đo trên chính 7 siêu thị ứng viên đó: 3 ngày ra 314 dòng/15 nhân viên,
      // 7 ngày 743 dòng/15, 30 ngày 3.402 dòng/15 — kéo thêm 4,5 lần dữ liệu mà
      // KHÔNG thêm được một người nào. Danh sách người vốn ổn định, 7 ngày là đủ.
      var truoc = new Date(homNay.getTime() - 7 * 86400000);
      log('⚠ Khoảng từ đầu tháng chưa có ai chấm công (' + rows.length + ' dòng).');
      log('  Nới sang 7 ngày gần nhất để lấy danh sách nhân viên…');
      var rong = await docGioCong(truoc, homNay);
      if (coBanHang(rong)) {
        rows = rong;
        log('  ✓ Lấy được từ 7 ngày gần nhất (' + rows.length + ' dòng).');
      } else {
        log('  ✗ 7 ngày gần nhất cũng không có ai — kiểm tra lại quyền xem giờ công.');
      }
    }

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
      // GIỮ LẠI DANH SÁCH NGÀY, không chỉ đếm. Nhịp bán chia cho ngày LỊCH thì
      // người nghỉ nhiều bị coi là bán yếu; chia cho ngày ĐI LÀM mới đúng sức.
      // API timekeeping-get vốn trả từng ngày, trước đây gộp thành con số rồi vứt.
      x.ngayLam = Object.keys(x.ngayCong).sort();
      x.ngayCong = x.ngayLam.length;
      return x;
    });
    var chinh = tatCa.filter(function (x) { return laBanHang(x.phongBan); });

    var giuPb = [];
    chinh.forEach(function (x) { if (giuPb.indexOf(x.phongBan) === -1) giuPb.push(x.phongBan); });

    var pbKhac = {};
    tatCa.forEach(function (x) {
      if (!laBanHang(x.phongBan)) pbKhac[x.phongBan] = (pbKhac[x.phongBan] || 0) + 1;
    });

    log('✓ Giờ công: ' + tatCa.length + ' người chấm công → giữ ' + chinh.length +
        ' người "' + PHONG_BAN_CHINH + '"' +
        (giuPb.length ? ' (' + giuPb.join(', ') + ')' : ''));
    Object.keys(pbKhac).forEach(function (p) {
      log('  · bỏ ' + pbKhac[p] + ' người ' + p);
    });
    return { tatCa: tatCa, chinh: chinh };
  }

  /* ================================================================== */
  /* CẤU HÌNH CỤM — tạo nếu chưa có                                     */
  /* ================================================================== */
  /*
   * Trước đây cấu hình cụm do dmx.user.js tạo lúc cào BI. BI chết, script đó bỏ
   * đi, mà script này thì chưa bao giờ tạo — nên Quản lý MỚI cài xong sẽ:
   *   · không có mã cụm  -> bước giờ công báo lỗi
   *   · không có mã LINE -> ảnh /bc, /bcnv không bao giờ được đẩy
   *   · lệnh /dangky trong nhóm LINE vô dụng vì bảng dmx_clusters chưa có cụm đó
   * Ba thứ đó hỏng lặng lẽ, người mới không thể tự đoán ra.
   *
   * Giờ tự tạo từ chính danh sách siêu thị vừa nhận diện được. KHÔNG bao giờ ghi
   * đè cấu hình đang có — chỉ thêm siêu thị còn thiếu, vì "key" của cụm cũ đang
   * được dùng làm tên file ảnh và mối nối nhóm LINE, đổi là đứt hết.
   */
  // Tự đặt tên cụm từ chính mã siêu thị. KHÔNG hỏi người dùng.
  //
  // Trước đây gọi thẳng pickSiteCode(), và với máy chưa có gì nó bật hộp thoại
  // "Mã cụm (site code) của bạn — GÕ SỐ để chọn cụm đã có: 1 = Cụm 1473…".
  // Quản lý mới không biết "mã cụm" là gì, lại bị mời chọn cụm của NGƯỜI KHÁC,
  // và bấm Huỷ thì cụm không bao giờ được tạo — chỉ còn một dòng cảnh báo nhỏ
  // trong nhật ký. Đã gặp thật 31/08/2026.
  //
  // Ta biết thừa mã siêu thị nên tự đặt được: "Cụm <mã siêu thị đầu>" — đúng
  // dạng tên các cụm đang có ("Cụm 14285"). Nếu tên đó đã có người dùng mà
  // KHÔNG chung siêu thị nào thì thêm mã nhân viên cho khỏi giẫm chân nhau.
  // Tìm cụm ĐÃ CÓ chứa bất kỳ siêu thị nào của mình — chốt chặn quan trọng nhất
  // cho trường hợp HAI QUẢN LÝ CHUNG MỘT CỤM. Quản lý thứ hai chạy trên máy mới
  // thì chưa có dấu hiệu nào (mã nhân viên chưa nằm trong cấu hình), nếu chỉ dựa
  // vào tên tự đặt thì dễ đẻ ra cụm trùng lặp — số một cụm nằm ở hai chỗ, ảnh
  // LINE đè nhau, không ai biết.
  // So theo MÃ siêu thị chứ không theo tên: mã là thật, tên thì mỗi người gõ một kiểu.
  async function timCumTheoSieuThi(maSt, log) {
    try {
      var r = await fetch(SB_URL + '/rest/v1/dmx_clusters?select=site_code,config',
        { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
      if (!r.ok) return null;
      var rows = await r.json();
      for (var i = 0; i < rows.length; i++) {
        if (/^zz-/i.test(rows[i].site_code || '')) continue;
        var st = (rows[i].config && rows[i].config.stores) || [];
        var chung = st.some(function (x) { return maSt.indexOf(String(x.mwgCode)) !== -1; });
        if (chung) {
          log('  (siêu thị của bạn đã nằm trong cụm "' + rows[i].site_code + '" — dùng chung)');
          return { code: rows[i].site_code, config: rows[i].config };
        }
      }
    } catch (e) {}
    return null;
  }

  async function tuDatTenCum(sieuThis, mwgUser, log) {
    var maSt = sieuThis.map(function (s) { return String(s.mwg); }).sort();
    var ten = 'Cụm ' + maSt[0];

    var cfgCu = null;
    try { cfgCu = await DMXCluster.fetchConfig(ten); } catch (e) {}
    if (cfgCu && cfgCu.stores && cfgCu.stores.length) {
      var chung = cfgCu.stores.some(function (x) {
        return maSt.indexOf(String(x.mwgCode)) !== -1;
      });
      if (chung) { log('  (nối vào cụm đã có: ' + ten + ')'); return ten; }
      ten = ten + (mwgUser ? '-' + mwgUser : '-' + maSt[maSt.length - 1]);
      log('  (tên "Cụm ' + maSt[0] + '" đã có người khác dùng — đặt thành "' + ten + '")');
    }
    return ten;
  }

  // Cấu hình này có phải của tài khoản đang đăng nhập không? Đo bằng việc CÓ ÍT
  // NHẤT MỘT siêu thị trùng mã. Cụm có thêm siêu thị mới thì vẫn trùng phần cũ,
  // nên phép thử này không cản việc mở rộng cụm.
  function trungSieuThi(stores, sieuThis) {
    if (!stores || !stores.length) return true;      // cụm rỗng thì cho qua
    var ma = {};
    stores.forEach(function (x) { ma[String(x.mwgCode || x.key)] = 1; });
    return sieuThis.some(function (s) { return !!ma[String(s.mwg)]; });
  }

  async function damBaoCauHinhCum(sieuThis, log) {
    if (!window.DMXCluster) throw new Error('Chưa nạp được dmx-cluster-shared.js.');

    var mwgUser = '';
    try { mwgUser = String(DMXCluster.detectMwgUser() || ''); } catch (e) {}

    // Nhận ra cụm sẵn có: mã đang lưu trên máy, rồi tới dấu hiệu (mã nhân viên
    // đã ghi trong cấu hình). Đây là đường mà máy đã dùng lâu nay vẫn đi.
    var site = DMXCluster.getSiteCode() || '';
    var cfg = null;
    if (site) { try { cfg = await DMXCluster.fetchConfig(site); } catch (e) {} }
    // CHỐT CHẶN. Mã cụm lưu trên máy là của LẦN CHẠY TRƯỚC, không phải của tài
    // khoản đang đăng nhập. Đăng nhập tài khoản cụm khác trên cùng máy rồi chạy
    // chuỗi là nhét siêu thị của họ vào cấu hình cụm cũ, im lặng.
    // Đã xảy ra thật 04/09/2026: máy của cụm 14285 đăng nhập tài khoản cụm Gia
    // Lâm để xem API -> cấu hình "Cụm 14285" phình từ 2 lên 7 siêu thị và nuốt
    // luôn mã nhân viên 23963 của người ta.
    if (cfg && !trungSieuThi(cfg.stores, sieuThis)) {
      log('⚠ Mã cụm lưu trên máy ("' + site + '") KHÔNG có siêu thị nào trùng với ' +
          'tài khoản đang đăng nhập — BỎ QUA, dò lại từ đầu.');
      site = ''; cfg = null;
    }
    if (!cfg) {
      try {
        var ev = await DMXCluster.findClusterByEvidence();
        if (ev && ev.code && trungSieuThi(ev.config && ev.config.stores, sieuThis)) {
          site = ev.code; cfg = ev.config; log('  (nhận ra cụm qua ' + ev.vi + ')');
        }
      } catch (e) {}
    }
    // Chưa nhận ra qua dấu hiệu thì soi tiếp theo MÃ SIÊU THỊ — bắt được trường
    // hợp Quản lý thứ hai của cùng một cụm chạy lần đầu trên máy mới.
    if (!site) {
      var theoSt = await timCumTheoSieuThi(
        sieuThis.map(function (s) { return String(s.mwg); }), log);
      if (theoSt) { site = theoSt.code; cfg = theoSt.config; }
    }
    if (!site) site = await tuDatTenCum(sieuThis, mwgUser, log);
    DMXCluster.setSiteCode(site);
    if (!cfg) { try { cfg = await DMXCluster.fetchConfig(site); } catch (e) {} }

    var got = { code: site, config: cfg, mwgUser: mwgUser, clusterId: '' };
    var laCumMoi = !cfg || !cfg.stores || !cfg.stores.length;
    cfg = cfg || {};
    var stores = cfg.stores || [];
    var them = [], doiTen = false;

    sieuThis.forEach(function (s) {
      var co = stores.filter(function (x) { return String(x.mwgCode) === String(s.mwg); })[0];
      if (!co) {
        // Dò theo TÊN chỉ để vá mục cấu hình CŨ chưa có mwgCode. Dò tên với mục
        // đã mang mã khác là GỘP NHẦM hai siêu thị: matchStoreByText so lỏng bằng
        // substring hai chiều nên "AAR Yên Viên" khớp luôn "Yên Viên". Cụm 10129
        // dính thật (04/09/2026): Yên Viên có 2 siêu thị, cấu hình chỉ nhận 1, cái
        // còn lại bị gán chung lineKey nên ảnh hai nơi đè nhau ở cùng nhóm LINE.
        co = DMXCluster.matchStoreByText(
          stores.filter(function (x) { return !x.mwgCode; }), s.ten);
      }
      if (co) {
        if (!co.mwgCode) co.mwgCode = s.mwg;      // vá dần cho cấu hình cũ thiếu mã
        // Mục đã lưu từ hồi chưa tách tên vẫn mang tên trùng ("Yên Viên") —
        // đổi theo tên đã tách, nếu không cụm vẫn thấy hai dòng giống hệt nhau.
        if (s.tachTen && co.name !== s.ten) { co.name = s.ten; doiTen = true; }
        s.lineKey = co.key;
        return;
      }
      // Cụm mới: lấy luôn mã MWG làm mã ngắn nội bộ — có sẵn, không trùng nhau,
      // và không đổi theo tháng.
      stores.push({ key: s.mwg, name: s.ten, mwgCode: s.mwg, biRawId: '', biRawIdMonth: '' });
      s.lineKey = s.mwg;
      them.push(s.ten);
    });

    // Ghi mã nhân viên vào cấu hình — ĐÂY là thứ giúp lần chạy sau tự nhận ra
    // cụm mà không hỏi gì (findClusterByEvidence tra theo dấu hiệu này). Thiếu
    // nó thì máy nào cũng bị hỏi lại mỗi lần, kể cả đã tạo cụm xong.
    var doiDauHieu = false;
    try { doiDauHieu = DMXCluster.apDungDauHieu(cfg, got); } catch (e) {}

    if (laCumMoi || them.length || doiTen || doiDauHieu) {
      cfg.stores = stores;
      cfg.groupToStore = cfg.groupToStore || {};
      await DMXCluster.saveConfig(site, cfg);
      log('✓ Đã lưu cấu hình cụm "' + site + '" (' + stores.length + ' siêu thị' +
          (them.length ? ', thêm mới: ' + them.join(', ') : '') + ')');
      // Siêu thị MỚI THÊM cũng cần /dangky, không riêng cụm mới. Thiếu dòng này
      // thì nhóm LINE của siêu thị vừa thêm im lặng không có ảnh mà không ai biết.
      var canDangKy = laCumMoi ? stores
        : stores.filter(function (x) { return them.indexOf(x.name) !== -1; });
      if (canDangKy.length) {
        log(laCumMoi ? '⚠ CỤM MỚI: vào TỪNG nhóm LINE của siêu thị, gõ một lần:'
                     : '⚠ SIÊU THỊ MỚI: vào nhóm LINE của siêu thị đó, gõ một lần:');
        canDangKy.forEach(function (x) { log('     /dangky ' + x.key + '   → ' + x.name); });
        log('  (mã đó cũng chính là số đứng đầu tên nhóm LINE)');
        log('  Chưa làm bước này thì /bc và /bcnv chưa trả ảnh cho nhóm.');
      }
    } else {
      log('✓ Cụm "' + site + '" đã có cấu hình (' + stores.length + ' siêu thị)');
    }
    return { site: site, laCumMoi: laCumMoi, canDangKy: canDangKy || [] };
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

    // File RỖNG thì ĐỪNG đẩy. Cửa sổ xuất là "đầu tháng -> hôm nay", nên sáng
    // ngày 1 chưa ai chấm công là ra 0 dòng — đẩy lên sẽ ghi đè mất file tháng
    // trước đang tốt, và trang Tổng hợp mất sạch giờ công mà không báo gì.
    // Giữ file cũ rồi nói ra, chạy lại lúc có số là tự thay.
    if (!job.result_rows) {
      log('  ⚠ 0 dòng (đầu tháng chưa ai chấm công) — GIỮ NGUYÊN file cũ, không ghi đè.');
      return { boQua: true, lyDo: 'giờ công 0 dòng' };
    }

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

    // NGÀY 1 CỦA THÁNG -> lấy trọn theo THÁNG TRƯỚC.
    // Đúng quy ước sẵn có của nv.html: bản ghi mang nhãn ngày D chứa số chốt hết
    // ngày D-1, nên bản ghi ngày 01/09 chính là số chốt cuối tháng 8.
    // Đo thật sáng 01/09/2026: tháng 9 có 0 dòng thi đua, 0 dòng giờ công, doanh
    // thu -10,6tr (mới có trả hàng); tháng 8 có 74 dòng Ô1, 379 dòng Ô3, 37 NV.
    // Lấy theo tháng 9 là ra một bản ghi rỗng vô dụng; lấy theo tháng 8 là đúng
    // báo cáo chốt tháng mà Quản lý cần sáng ngày 1.
    var laNgayDau = homNay.getDate() === 1;
    var ngayChot = laNgayDau
      ? new Date(homNay.getFullYear(), homNay.getMonth(), 0)   // ngày cuối tháng trước
      : homNay;
    var dauThang = new Date(ngayChot.getFullYear(), ngayChot.getMonth(), 1);
    var tuNgay = ymdSo(dauThang), denNgay = ymdSo(ngayChot);

    // Khoảng CÙNG KỲ THÁNG TRƯỚC: mùng 1 -> đúng ngày chốt của tháng liền trước
    // (chốt ngày 31 mà tháng trước chỉ có 30 ngày thì kẹp về ngày cuối).
    var thangTruocDau = new Date(ngayChot.getFullYear(), ngayChot.getMonth() - 1, 1);
    var soNgayThangTruoc = new Date(thangTruocDau.getFullYear(), thangTruocDau.getMonth() + 1, 0).getDate();
    var thangTruocChot = new Date(thangTruocDau.getFullYear(), thangTruocDau.getMonth(),
                                  Math.min(ngayChot.getDate(), soNgayThangTruoc));
    var tuNgayTr = ymdSo(thangTruocDau), denNgayTr = ymdSo(thangTruocChot);
    if (laNgayDau) {
      log('📅 Hôm nay là ngày 1 — lấy số CHỐT THÁNG TRƯỚC (tháng ' + thangKey(ngayChot) + ').');
    }

    log('① Nhận diện cụm…');
    var cum = await nhanDienCum(log);
    var maSieuThis = cum.sieuThis.map(function (s) { return s.mwg; });

    log('② Danh sách nhân viên (giờ công)…');
    var nv = await layDanhSachNV(dauThang, ngayChot, maSieuThis, log);

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

    // Làm SAU khi lọc siêu thị (chỉ ghi vào cấu hình siêu thị bán hàng thật),
    // và TRƯỚC bước giờ công vì bước đó cần mã cụm để đặt tên file.
    var cum14 = null;
    try {
      cum14 = await damBaoCauHinhCum(cum.sieuThis, log);
      if (cum14 && (cum14.canDangKy || []).length) {
        canhBao.push('Cần gõ /dangky trong nhóm LINE cho: ' + cum14.canDangKy
          .map(function (x) { return x.key + ' = ' + x.name; }).join('; ') +
          '. Chưa gõ thì nhóm đó không nhận được ảnh.');
      }
    } catch (e) {
      canhBao.push('Chưa lưu được cấu hình cụm: ' + (e.message || e) +
                   ' — sẽ không đẩy được ảnh lên nhóm LINE.');
      log('⚠ Cấu hình cụm: ' + (e.message || e));
    }

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
          gioCong: info.gioCong, ngayCong: info.ngayCong, ngayLam: info.ngayLam || [],
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
          gioCong: x.gioCong, ngayCong: x.ngayCong, ngayLam: x.ngayLam || [],
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
          MONTHKEY: thangKey(ngayChot), VIEWLEVEL: 'STOREGROUP',
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
          MONTHKEY: thangKey(ngayChot), VIEWLEVEL: 'STORE', VIEWIDS: sgIds.join(','),
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
    } else if (!thiDuaST.length) {
      // API trả 200 kèm MẢNG RỖNG — không phải lỗi nên không rơi vào nhánh trên,
      // và nếu im lặng thì gói vẫn "thành công" trong khi Ô1/Ô3 rỗng ruột.
      // Đầu tháng hay gặp: chương trình thi đua tháng mới chưa được khai báo.
      // Đã gặp thật sáng 01/09/2026: MONTHKEY 202609 trả về 0 dòng.
      canhBao.push('CHƯA CÓ CHƯƠNG TRÌNH THI ĐUA cho tháng ' + thangKey(ngayChot) +
                   ' (hệ thống trả về 0 dòng). Thường là do đầu tháng chưa khai báo. ' +
                   'Gói vẫn có doanh thu nhân viên, nhưng Ô1 (target ngành hàng) và ' +
                   'Ô3 (chi tiết bán) sẽ RỖNG — chờ khai báo xong rồi chạy lại.');
      log('⚠ Tháng ' + thangKey(ngayChot) + ' chưa có chương trình thi đua nào.');
    } else if (!thiDuaST.filter(function (r) { return r.target > 0; }).length) {
      // CÓ chương trình, CÓ doanh thu, nhưng CHƯA GIAO TARGET. Đây là trạng thái
      // riêng, không phải hai nhánh trên, và trước đây script im lặng nên bảng
      // nhân viên hiện "0 / 0 · 0%" ở mọi ngành trông y như hỏng.
      // Đo thật sáng 02/09/2026: MONTHKEY 202609 trả 35 dòng, doanh thu 348,1tr,
      // target 0 trên CẢ 35 dòng — thử đủ TIMETYPE 1/2/3 và ISVIEWSTORE 0/1 đều
      // vậy, trong khi tháng 8 có 73/74 dòng target (tổng 9.918,8). Tức là MWG
      // chưa giao target tháng mới, không phải mình lấy sai.
      canhBao.push('CHƯA GIAO TARGET THI ĐUA cho tháng ' + thangKey(ngayChot) +
                   ': có ' + thiDuaST.length + ' chương trình và đã có doanh thu, ' +
                   'nhưng target = 0 ở TẤT CẢ. Bảng ngành hàng sẽ hiện 0/0 và 0% — ' +
                   'đó là số thật của nguồn, không phải lỗi. Chạy lại khi MWG giao target.');
      log('⚠ Tháng ' + thangKey(ngayChot) + ': có ' + thiDuaST.length +
          ' chương trình thi đua nhưng CHƯA GIAO TARGET (target = 0 hết).');
    }

    log('⑥ Giờ công (file cho dashboard)…');
    try {
      var kqGC = await dayGioCong(dauThang, ngayChot, maSieuThis, log);
      if (kqGC && kqGC.boQua) {
        canhBao.push('Chưa cập nhật được file giờ công (' + kqGC.lyDo + '). Trang Tổng hợp ' +
                     'vẫn đang dùng file của lần chạy trước — chạy lại khi đã có chấm công.');
      }
    } catch (e) {
      canhBao.push('Không đẩy được file giờ công: ' + (e.message || e));
      log('⚠ Bỏ qua giờ công: ' + (e.message || e));
    }

    log('⑦ Tổng hợp từng siêu thị (ngành hàng, lợi nhuận, phục vụ)…');
    // Trước đây gọi bi-category-get ở VIEWLEVEL 'ALL' — ra số của cả công ty,
    // không dùng được cho báo cáo TỪNG siêu thị. Nay gọi theo từng siêu thị.
    var nganhHang = [];
    for (var q = 0; q < cum.sieuThis.length; q++) {
      var sq = cum.sieuThis[q];
      var th = { nganhHang: [], loiNhuan: null, phucVu: null, traCham: null };
      var chungST = { FROMDATE: tuNgay, TODATE: denNgay, VIEWLEVEL: 'STORE',
                      VIEWIDS: sq.mwg, VIEWID: sq.mwg, STOREIDS: sq.mwg,
                      CHAINIDS: '1,2,16', MONTHKEY: thangKey(ngayChot),
                      MAINGROUPIDS: null, SUBGROUPIDS: null, PAGEINDEX: 1, PAGESIZE: 0 };
      try {
        th.nganhHang = await post('reports/bi-category-get', {
          FROMDATE: tuNgay, TODATE: denNgay, VIEWLEVEL: 'STORE', VIEWID: sq.mwg,
          BRANDIDLIST: null, LEVEL1ID: null, LEVEL2ID: null
        });
      } catch (e) { canhBao.push(sq.ten + ': không lấy được ngành hàng — ' + (e.message || e)); }

      // DOANH THU OFFLINE (trang "Hiệu quả kinh doanh", trường dtlk).
      // Một siêu thị bán qua HAI kênh: offline và online.
      //  · hợp nhất (revenue-consolidated-card-get) = offline + online -> số TỔNG đúng
      //  · offline  (revenue-target-get.dtlk)       = phần nhân viên siêu thị bán
      // THI ĐUA ngành hàng tính theo nguồn OFFLINE, nên không được đem so với số
      // hợp nhất. Đo tháng 8/2026: 396 NVC hợp nhất 7.234,4 − offline 6.869,6 =
      // 364,8, đúng bằng online quy đổi 398,8 (lệch 34 do làm tròn nội bộ);
      // Ngọc Thụy 2.823,9 − 2.703,3 = 120,7 so với online 126,3.
      try { th.offline = (await post('reports/revenue-target-get', chungST))[0] || null; } catch (e) {}

      // Ba cái dưới là phụ: hỏng thì bỏ qua, đừng để chết cả bước.
      // grossprofit-* và margin-* trả 403 với tài khoản Quản lý (cần quyền
      // BI_DASH_GR/BI_DASH_MA) nên KHÔNG gọi — lãi gộp hiện không lấy được.
      try { th.loiNhuan = (await post('reports/directprofit-lk-get', chungST))[0] || null; } catch (e) {}
      try { th.phucVu   = (await post('reports/servicerate-get',    chungST))[0] || null; } catch (e) {}
      try { th.traCham  = (await post('reports/revenue-tragop-get', chungST))[0] || null; } catch (e) {}

      // SỐ CÙNG KỲ THÁNG TRƯỚC — phải gọi riêng, KHÔNG dùng cột revenue_lastmonth.
      // Cột đó là doanh thu THỰC: đo 8/2026 ở 396 NVC, cộng revenue_lastmonth ra
      // 4.367,6 đúng bằng doanh thu thực tháng 7, trong khi quy đổi tháng 7 là
      // 5.867,4. Quản lý chỉ nhìn DOANH THU QUY ĐỔI, lấy nhầm cột đó thì tăng
      // trưởng báo +58% thay vì +17%.
      try {
        var chungTr = Object.assign({}, chungST, {
          FROMDATE: tuNgayTr, TODATE: denNgayTr, MONTHKEY: thangKey(thangTruocChot)
        });
        var cardTr = (await post('reports/revenue-consolidated-card-get', {
          FROMDATE: tuNgayTr, TODATE: denNgayTr, VIEWLEVEL: 'STORE', VIEWIDS: sq.mwg,
          CHAINIDS: '1,2,16', MAINGROUPIDS: null, SUBGROUPIDS: null
        }))[0] || {};
        var offTr = (await post('reports/revenue-target-get', chungTr))[0] || {};
        var catTr = await post('reports/bi-category-get', {
          FROMDATE: tuNgayTr, TODATE: denNgayTr, VIEWLEVEL: 'STORE', VIEWID: sq.mwg,
          BRANDIDLIST: null, LEVEL1ID: null, LEVEL2ID: null
        });
        th.thangTruoc = {
          tu: tuNgayTr, den: denNgayTr,
          dtqdHopNhat: so(cardTr.revenue_kfactor),
          dtqdOffline: so(offTr.dtlk),
          // Chỉ giữ cấp 1: đủ cho biểu đồ tăng/giảm mà gói không phình thêm.
          nganh: (catTr || []).filter(function (r) { return !r.level2_id; })
            .map(function (r) {
              return { id: r.level1_id, ten: r.level1_name, dtqd: so(r.revenue_kfactor) };
            })
        };
      } catch (e) {
        canhBao.push(sq.ten + ': không lấy được số quy đổi cùng kỳ tháng trước — ' +
                     (e.message || e) + '. Thẻ "cùng kỳ tháng trước" sẽ để trống.');
      }

      sq.tongHop = th;
      nganhHang = nganhHang.concat(th.nganhHang);
      log('  · ' + sq.ten + ': ' + th.nganhHang.length + ' dòng ngành hàng' +
          (th.loiNhuan ? ', có lợi nhuận' : '') + (th.phucVu ? ', có tỷ lệ phục vụ' : ''));
    }

    var nguoiDung = '';
    try { nguoiDung = (JSON.parse(localStorage.getItem('user') || '{}') || {}).full_name || ''; } catch (e) {}

    return {
      v: 1,
      nguon: 'baocao.dienmayxanh.com',
      scriptVer: VER,
      layLuc: new Date().toString(),
      ngay: ngayMay(homNay),
      thang: thangKey(ngayChot),
      chotDenNgay: ngayMay(ngayChot),
      laSoChotThangTruoc: laNgayDau,
      khoangNgay: { tu: tuNgay, den: denNgay },
      cum: {
        vungs: cum.vungs, khuVucs: cum.khuVucs, nguoiDung: nguoiDung,
        // Kèm sẵn mã cụm để bên nhận khỏi phải tự dò. Cấu hình cụm lưu theo
        // TỪNG origin, nên trang nv.html của người mới chưa hề có bản sao nào.
        siteCode: (cum14 && cum14.site) || ''
      },
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
  /* REALTIME THI ĐUA THEO NHÂN VIÊN                                    */
  /* ================================================================== */
  /*
   * Trả lời câu hỏi: TRONG CA HÔM NAY, ai đang bán ngành thi đua nào, ai chưa
   * chạm tới ngành nào cả.
   *
   * Vì sao KHÔNG cần report 77: report 77 cho ngành hàng KẾ TOÁN
   * ("1034 - Dụng cụ nhà bếp"), còn thi đua là CHƯƠNG TRÌNH ("Máy lọc không
   * khí - Hút bụi - Hút ẩm", "Trả chậm HomeCredit") — hai hệ khác nhau, ghép
   * lại là đoán mò. baocao trả thẳng số theo NHÂN VIÊN × CHƯƠNG TRÌNH.
   *
   * Vì sao phải TRỪ MỐC: competition-bymsg-get chỉ có LŨY KẾ THÁNG, không có
   * trường riêng cho hôm nay. Lấy số bây giờ trừ mốc đầu ngày là ra phần bán
   * trong ngày. Mốc = ảnh chụp CUỐI CÙNG của hôm qua, để không sót phần bán
   * trước lần chạy đầu tiên trong ngày.
   *
   * Số nguồn làm mới khoảng 15-20 phút/lần (xem rt_loaded_at), nên chạy dày
   * hơn cũng không ra số mới.
   */
  var RT_KHOA = 'dmx_rt_thidua_v1';      // mốc + ảnh chụp gần nhất (localStorage của baocao)
  var RT_BAT = 'dmx_rt_bat';             // '1' = đang bật tự đẩy
  var RT_PHUT = 15;

  function rtDoc() {
    try { return JSON.parse(localStorage.getItem(RT_KHOA) || 'null') || {}; } catch (e) { return {}; }
  }
  function rtGhi(o) {
    try { localStorage.setItem(RT_KHOA, JSON.stringify(o)); } catch (e) {}
  }

  /* Gom số hiện tại: ai đi làm hôm nay + thi đua theo từng người. */
  async function rtThuSo() {
    var cum = await nhanDienCum(function () {});
    var maSieuThis = cum.sieuThis.map(function (s) { return s.mwg; });
    var homNay = new Date();
    var nd = ymdSo(homNay);

    // 1) Giờ công. LẤY CẢ 7 NGÀY chứ không riêng hôm nay.
    //    Quản lý thường xác nhận công CUỐI NGÀY, nên trong ngày bảng này thiếu
    //    người: đo 04/09/2026 lúc 11:33 ở cụm Gia Lâm thì cả 5 siêu thị đều hụt
    //    đúng 1 người so với hôm qua (6→5, 3→2, 3→2, 2→1, 2→1). Số giờ cũng là
    //    CA ĐĂNG KÝ cả ngày chứ không phải giờ đã làm — một người lúc 11:33 đã
    //    ghi Ca 1→Ca 4 tổng 10h. Vậy nên:
    //      • 7 ngày dùng để LỌC SIÊU THỊ (Văn Phòng/Callcenter không bao giờ có
    //        nhân viên BP All In One, nên vẫn bị loại đúng);
    //      • hôm nay dùng để biết ai ĐÃ XÁC NHẬN CÔNG;
    //      • ai chưa xác nhận công mà đã có phát sinh bán hôm nay thì vẫn được
    //        đưa vào (xem rtDungGoi) — bán được là chắc chắn đang đi làm.
    var ndTruoc = ymdSo(new Date(homNay.getTime() - 6 * 86400000));
    var gcTuan = [], gc = [];
    try {
      gcTuan = await post('reports/timekeeping-get', {
        FROMDATE: ndTruoc, TODATE: nd, STOREIDS: maSieuThis.join(','), PAGEINDEX: 1, PAGESIZE: 0
      });
    } catch (e) {}
    gc = gcTuan.filter(function (r) { return String(r.ngay || '').replace(/D/g, '') === String(nd); });
    var nguoi = {};
    gc.forEach(function (r) {
      if (!laBanHang(r.phong_ban)) return;      // chỉ BP All In One
      var ma = String(r.ma_nv);
      if (!nguoi[ma]) nguoi[ma] = { ma: ma, ten: r.ten_nv, mwg: String(r.ma_sieu_thi), gio: 0, ca: {}, coCong: true };
      nguoi[ma].gio += so(r.tong_gio_cong);
      if (r.ca) nguoi[ma].ca[r.ca] = 1;
    });

    // CHỈ GIỮ SIÊU THỊ BÁN HÀNG THẬT. nhanDienCum() trả về mọi nơi tài khoản
    // nhìn thấy — Callcenter, Văn Phòng, C2... Chuỗi ngày lọc bằng "có nhân viên
    // BP All In One không"; ở đây làm y hệt, dựa vào chính danh sách vừa lọc.
    // Không lọc thì trang realtime hiện cả "Văn Phòng Ba Tháng Hai" (đã gặp).
    // Lọc siêu thị theo CẢ TUẦN, không theo hôm nay: cả ca chưa ai xác nhận công
    // thì siêu thị vẫn phải hiện, chỉ là chưa có người nào trong đó.
    var khoThat = {}, nvTuan = {};
    gcTuan.forEach(function (r) {
      if (!laBanHang(r.phong_ban)) return;
      khoThat[String(r.ma_sieu_thi)] = 1;
      (nvTuan[String(r.ma_sieu_thi)] = nvTuan[String(r.ma_sieu_thi)] || {})[String(r.ma_nv)] = 1;
    });
    cum.sieuThis = cum.sieuThis.filter(function (s) { return !!khoThat[s.mwg]; });
    maSieuThis = cum.sieuThis.map(function (s) { return s.mwg; });
    if (!maSieuThis.length) {
      throw new Error('7 ngày qua không siêu thị nào có nhân viên "' + PHONG_BAN_CHINH + '" chấm công.');
    }
    // 2) Thi đua CẤP SIÊU THỊ — gọi RIÊNG từng siêu thị để biết dòng nào của ai.
    //    Bảng cấp siêu thị không có cột storeid, gọi gộp thì không tách được.
    //    Đây cũng là nơi DUY NHẤT có target: MWG giao target cho SIÊU THỊ, cấp
    //    nhân viên target = 0 hết (đo 03/09/2026: cấp siêu thị 69/70 dòng có
    //    target tổng 17.101; cấp nhân viên 0/127). Phần chia cho từng người là
    //    việc của Quản lý, không nằm trong nguồn này.
    var sg = {}, ctST = {};
    for (var si = 0; si < cum.sieuThis.length; si++) {
      var mwgST = cum.sieuThis[si].mwg;
      for (var k = 0; k < cum.khuVucs.length; k++) {
        var st = [];
        try {
          st = await post('reports/competition-bymsg-get', {
            MONTHKEY: thangKey(homNay), VIEWLEVEL: 'STOREGROUP',
            VIEWIDS: String(cum.khuVucs[k].id), ISVIEWSTORE: 0, TIMETYPE: 2,
            STOREIDS: mwgST, PAGESIZE: 0
          });
        } catch (e) {}
        st.forEach(function (r) {
          sg[r.salegroupid] = 1;
          (ctST[mwgST] = ctST[mwgST] || {})[r.programid] = {
            ten: r.programname, loai: r.competitiontype,
            target: so(r.target), dt: so(r.revenue), sl: so(r.quantity),
            pct: so(r.targetpercent_month), duKien: so(r.targetpercent_predict)
          };
        });
      }
    }
    var sgIds = Object.keys(sg);
    if (!sgIds.length) throw new Error('Chưa có chương trình thi đua cho tháng này.');
    if (!sgIds.length) throw new Error('Chưa có chương trình thi đua cho tháng này.');

    // 3) Thi đua theo NHÂN VIÊN (lũy kế tháng).
    var rows = await post('reports/competition-bymsg-get', {
      MONTHKEY: thangKey(homNay), VIEWLEVEL: 'STORE', VIEWIDS: sgIds.join(','),
      ISVIEWSTORE: 0, TIMETYPE: 2, STOREIDS: maSieuThis.join(','), PAGESIZE: 0
    });

    // 4) Dấu thời gian của số realtime, để trang nói rõ số cũ cỡ nào.
    var rtLuc = '';
    try {
      var card = (await post('reports/revenue-consolidated-card-get', {
        FROMDATE: nd, TODATE: nd, VIEWLEVEL: 'STORE', VIEWIDS: maSieuThis[0],
        CHAINIDS: '1,2,16', MAINGROUPIDS: null, SUBGROUPIDS: null
      }))[0] || {};
      rtLuc = card.rt_loaded_at || '';
    } catch (e) {}

    return { cum: cum, nguoi: nguoi, nvTuan: nvTuan, rows: rows, ctST: ctST,
             rtLuc: rtLuc, ngay: ngayMay(homNay) };
  }

  /* Dựng gói để đẩy lên: trừ mốc ra phần bán TRONG NGÀY. */
  function rtDungGoi(thu) {
    var kho = rtDoc();
    var homNay = thu.ngay;

    // Ảnh chụp hiện tại: "mã NV|mã chương trình" -> {dt, sl}
    var nay = {};
    thu.rows.forEach(function (r) {
      var ma = String(r.staffuser || '');
      if (!ma) return;
      nay[ma + '|' + r.programid] = { dt: so(r.revenue), sl: so(r.quantity) };
    });

    // Mốc đầu ngày. Lần đầu chạy trong ngày thì lấy ảnh chụp CUỐI của hôm qua;
    // chưa có gì thì lấy chính ảnh hiện tại và ĐÁNH DẤU là chưa đủ mốc — thà
    // nói "chưa có mốc" còn hơn hiện số 0 khiến người xem tưởng cả ca không bán.
    var chuaCoMoc = false;
    if (!kho.moc || kho.mocNgay !== homNay) {
      if (kho.cuoi && kho.cuoiNgay && kho.cuoiNgay !== homNay) {
        kho.moc = kho.cuoi;                 // ảnh cuối của hôm qua = mốc hôm nay
      } else {
        kho.moc = nay; chuaCoMoc = true;    // chưa từng chạy -> mốc là chính lúc này
      }
      kho.mocNgay = homNay;
    }
    var moc = kho.moc || {};

    // Ai CHƯA XÁC NHẬN CÔNG mà đã có phát sinh bán hôm nay thì vẫn phải hiện:
    // bán được là chắc chắn đang đi làm. Quản lý xác nhận công cuối ngày nên
    // trong ca bảng giờ công luôn thiếu người.
    var khoOK = {};
    (thu.cum.sieuThis || []).forEach(function (s) { khoOK[String(s.mwg)] = 1; });
    var themNgoai = {};
    thu.rows.forEach(function (r) {
      var ma2 = String(r.staffuser || '');
      if (!ma2 || thu.nguoi[ma2] || themNgoai[ma2]) return;
      if (!khoOK[String(r.storeid)]) return;
      // Phải TỪNG CHẤM CÔNG trong 7 ngày ở siêu thị đó. Bảng thi đua có cả tài
      // khoản kênh ('Online - 18001060') và nhân viên đã nghỉ trong tháng — thấy
      // ở kho 1472 ngày 04/09/2026: 12 người có dòng thi đua nhưng chỉ 5 xác nhận
      // công. Không chốt lại thì mấy thứ đó lọt vào danh sách người đang đi làm.
      var dsTuan = (thu.nvTuan || {})[String(r.storeid)] || {};
      if (!dsTuan[ma2]) return;
      var k2 = ma2 + '|' + r.programid;
      var m2 = moc[k2] || { dt: 0, sl: 0 };
      if (so(r.revenue) - m2.dt <= 0 && so(r.quantity) - m2.sl <= 0) return;
      themNgoai[ma2] = { ma: ma2, ten: r.salegroupname || ma2, mwg: String(r.storeid),
                         gio: 0, ca: {}, coCong: false };
    });
    var moiNguoi = {};
    Object.keys(thu.nguoi).forEach(function (m) { moiNguoi[m] = thu.nguoi[m]; });
    Object.keys(themNgoai).forEach(function (m) { moiNguoi[m] = themNgoai[m]; });

    var ds = [];
    Object.keys(moiNguoi).forEach(function (ma) {
      var n = moiNguoi[ma];
      var mucST = (thu.ctST || {})[n.mwg] || {};
      var ct = [];
      thu.rows.forEach(function (r) {
        if (String(r.staffuser || '') !== ma) return;
        var k = ma + '|' + r.programid;
        var m = moc[k] || { dt: 0, sl: 0 };
        var dtNay = so(r.revenue), slNay = so(r.quantity);
        var theoSL = LOAI_SLLK_RT[r.competitiontype];
        var homNayDT = Math.max(0, dtNay - m.dt), homNaySL = Math.max(0, slNay - m.sl);
        // Giữ dòng nếu CÓ BÁN hôm nay HOẶC đã bán trong tháng. Không lọc theo
        // target: target cấp nhân viên luôn = 0 (MWG chỉ giao cho SIÊU THỊ).
        var ctSt = mucST[r.programid] || null;
        // Giữ cả dòng CHƯA BÁN GÌ nếu siêu thị được giao target ngành đó — đấy
        // chính là danh sách "được giao mà chưa đụng" mà Quản lý cần nhìn.
        if (!homNayDT && !homNaySL && !dtNay && !slNay && !(ctSt && ctSt.target > 0)) return;
        ct.push({
          ten: r.programname, loai: r.competitiontype, donVi: theoSL ? 'SL' : 'DT',
          thang: theoSL ? slNay : dtNay,
          homNay: theoSL ? homNaySL : homNayDT,
          // target/%HT là của SIÊU THỊ, không phải của riêng người này.
          targetST: ctSt ? ctSt.target : 0, pctST: ctSt ? ctSt.pct : 0,
          duKienST: ctSt ? ctSt.duKien : 0
        });
      });
      ct.sort(function (a, b) { return b.homNay - a.homNay; });
      ds.push({
        ma: n.ma, ten: n.ten, mwg: n.mwg, gioCong: Math.round(n.gio * 10) / 10,
        coCong: n.coCong !== false,
        ca: Object.keys(n.ca).sort(), ct: ct,
        homNayTong: ct.reduce(function (a, x) { return a + (x.donVi === 'DT' ? x.homNay : 0); }, 0),
        // Mẫu số là chương trình SIÊU THỊ được giao target, không phải số
        // chương trình người này có tên — hỏi "trong ca có bám ngành thi đua
        // của shop không" thì mẫu số phải là của shop.
        soCtDaCham: ct.filter(function (x) { return x.homNay > 0 && x.targetST > 0; }).length,
        soCtCoTarget: Object.keys(mucST).filter(function (id) { return mucST[id].target > 0; }).length
      });
    });
    ds.sort(function (a, b) { return b.homNayTong - a.homNayTong; });

    kho.cuoi = nay; kho.cuoiNgay = homNay; rtGhi(kho);

    return {
      v: 1, ngay: homNay, luc: new Date().toISOString(), rtLuc: thu.rtLuc,
      chuaCoMoc: chuaCoMoc,
      // Tháng chưa được giao target thi đua thì mọi %HT đều 0 — trang phải nói
      // ra, nếu không người xem tưởng cả cụm không ai đạt gì.
      chuaGiaoTarget: !Object.keys(thu.ctST || {}).some(function (m) {
        return Object.keys(thu.ctST[m]).some(function (id) { return thu.ctST[m][id].target > 0; });
      }),
      // Giờ công hôm nay mới xác nhận được bao nhiêu người so với cả tuần —
      // trang phải nói ra, nếu không người xem tưởng hôm nay ca mỏng.
      cong: (function () {
        var xn = 0, tuan = 0;
        Object.keys(thu.nguoi).forEach(function (m) { if (thu.nguoi[m].coCong) xn++; });
        Object.keys(thu.nvTuan || {}).forEach(function (k) {
          tuan += Object.keys(thu.nvTuan[k]).length;
        });
        return { daXacNhan: xn, thayTrongTuan: tuan, themVaoNhoCoSo: Object.keys(themNgoai).length };
      })(),
      sieuThi: thu.cum.sieuThis.map(function (s) {
        var muc = (thu.ctST || {})[s.mwg] || {};
        var dsCt = Object.keys(muc).map(function (id) { return muc[id]; })
          .filter(function (x) { return x.target > 0; })
          .map(function (x) {
            var theoSL = LOAI_SLLK_RT[x.loai];
            return { ten: x.ten, donVi: theoSL ? 'SL' : 'DT',
                     thang: theoSL ? x.sl : x.dt, target: x.target,
                     pct: x.pct, duKien: x.duKien };
          })
          // Xếp theo DỰ KIẾN cuối tháng, không theo %HT luỹ kế: ngày 4 thì ngành
          // nào cũng dưới 100% nên %HT không phân biệt được ngành nào thật sự hụt.
          .sort(function (a, b) { return a.duKien - b.duKien; });
        return { mwg: s.mwg, ten: s.ten, ct: dsCt };
      }),
      nv: ds
    };
  }
  var LOAI_SLLK_RT = { 2: 1, 6: 1 };   // giống LOAI_SLLK bên nv.html: loại 2/6 đo SỐ LƯỢNG

  async function rtDayLen(log) {
    var thu = await rtThuSo();
    var goi = rtDungGoi(thu);
    var site = DMXCluster.getSiteCode() || '';
    var ten = 'rt_thidua_' + (DMXCluster.maCumChoTenFile(site) || 'chua-ro') + '.json';
    var body = new TextEncoder().encode(JSON.stringify(goi));
    var up = await fetch(SB_URL + '/storage/v1/object/' + BUCKET + '/' + ten, {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,
        'x-upsert': 'true', 'Cache-Control': 'max-age=60',
        'Content-Type': 'application/json'
      },
      body: body
    });
    if (!up.ok) throw new Error('Supabase ' + up.status + ': ' + (await up.text()).slice(0, 120));
    log('☁ ' + ten + ' · ' + goi.nv.length + ' NV trong ca · ' +
        Math.round(body.length / 1024) + ' KB' + (goi.chuaCoMoc ? ' (chưa có mốc đầu ngày)' : ''));
    return goi;
  }

  /* Hẹn giờ tự đẩy. Chỉ chạy khi tab baocao còn mở — nói rõ trong panel để
     không ai tưởng nó chạy cả khi đóng máy. */
  var rtHen = null;
  function rtDangBat() { try { return localStorage.getItem(RT_BAT) === '1'; } catch (e) { return false; } }
  function rtDatBat(b) { try { localStorage.setItem(RT_BAT, b ? '1' : '0'); } catch (e) {} }

  function rtBatDau(log, veNut) {
    if (rtHen) clearInterval(rtHen);
    var chay = function () {
      rtDayLen(log).catch(function (e) { log('✗ realtime: ' + (e.message || e)); });
    };
    chay();
    rtHen = setInterval(chay, RT_PHUT * 60000);
    rtDatBat(true); if (veNut) veNut();
    log('⏱ Tự đẩy realtime mỗi ' + RT_PHUT + ' phút — GIỮ TAB NÀY MỞ.');
  }
  function rtDung(log, veNut) {
    if (rtHen) clearInterval(rtHen);
    rtHen = null; rtDatBat(false); if (veNut) veNut();
    log('⏹ Đã tắt tự đẩy realtime.');
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
    setTimeout(kiemTraBanMoi, 1500);

    var w = document.createElement('div');
    w.id = 'dmxthu';
    w.innerHTML =
      '<button class="fab">📦 Lấy gói số</button>' +
      '<div class="box">' +
        '<h4><span>📦 Thu gói số v' + VER + '<span id="dmxthu-ban"></span></span><span class="x">×</span></h4>' +
        '<button class="act chinh" data-a="chuoi">⚡ Chạy cả chuỗi (lấy số → nv.html)</button>' +
        '<div class="phu">Hoặc làm từng bước:</div>' +
        '<button class="act" data-a="chay">▶ Lấy gói dữ liệu</button>' +
        '<button class="act" data-a="gui" disabled>🔎 Xem số trên trang thử nghiệm</button>' +
        '<div class="phu">Dự phòng khi hỏng:</div>' +
        '<button class="act" data-a="chep" disabled>📋 Chép rồi dán tay</button>' +
        '<button class="act" data-a="tai" disabled>💾 Tải file .json</button>' +
        '<div class="phu">Realtime thi đua theo nhân viên:</div>' +
        '<button class="act" data-a="rt">⏱ Bật tự đẩy realtime (15 phút)</button>' +
        '<button class="act" data-a="rt1">🔄 Đẩy realtime một lần</button>' +
        '<pre></pre>' +
      '</div>';
    document.body.appendChild(w);

    var pre = w.querySelector('pre');

    // Nhãn nút realtime đổi theo trạng thái, để nhìn là biết đang bật hay tắt.
    function veNutRt() {
      var b = w.querySelector('[data-a="rt"]');
      if (!b) return;
      var bat = rtDangBat();
      b.textContent = bat ? '⏹ Tắt tự đẩy realtime (đang BẬT)' : '⏱ Bật tự đẩy realtime (15 phút)';
      b.style.background = bat ? '#b45309' : '';
    }
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

      if (a === 'rt') {
        if (rtDangBat()) rtDung(log, veNutRt); else rtBatDau(log, veNutRt);
        return;
      }
      if (a === 'rt1') {
        b.disabled = true;
        try { await rtDayLen(log); } catch (e2) { log('✗ realtime: ' + (e2.message || e2)); }
        b.disabled = false;
        return;
      }

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

    // Đang bật từ lần trước thì chạy tiếp ngay khi tải lại trang — nếu không,
    // đóng/mở tab một cái là im lặng ngừng đẩy mà không ai biết.
    veNutRt();
    if (rtDangBat()) rtBatDau(log, veNutRt);
  }

  if (document.body) dungGiaoDien();
  else window.addEventListener('DOMContentLoaded', dungGiaoDien);
})();
