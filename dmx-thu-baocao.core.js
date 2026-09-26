// dmx-thu-baocao — lõi 0.40.1 · FILE SINH TỰ ĐỘNG từ userscript-src/dmx-thu-baocao.js
try { (unsafeWindow.__DMX_LOI = unsafeWindow.__DMX_LOI || {})["dmx-thu-baocao"] = "0.40.1"; } catch (e) {}
(function () {
  'use strict';

  // Số bản hiện trên thanh công cụ. LẤY TỪ @version của chính script khi trình
  // duyệt cho phép (Tampermonkey có GM_info kể cả @grant none; Violentmonkey
  // với @grant none thì không) — hằng số bên dưới chỉ là đường lui.
  // Từng lệch thật: @version 0.26.0 mà nhãn vẫn ghi 0.24.1, người dùng tưởng
  // Violentmonkey không chịu cập nhật (04/09/2026).
  var VER = (function () {
    try { return (GM_info && GM_info.script && GM_info.script.version) || '0.40.1'; }
    catch (e) { return '0.40.1'; }
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
      var m = (await r.text()).match(/@version\s+([\d.]+)/);
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
    var cfg = null, loiDoc = false;
    if (site) { try { cfg = await DMXCluster.fetchConfig(site); } catch (e) { loiDoc = true; } }
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
    if (!cfg) { try { cfg = await DMXCluster.fetchConfig(site); } catch (e) { loiDoc = true; } }

    // ĐỌC LỖI KHÁC VỚI CHƯA CÓ (26/09/2026). Trước đây fetchConfig lỗi mạng thì
    // cfg rỗng -> coi là CỤM MỚI -> dựng lại cấu hình với groupToStore rỗng rồi
    // LƯU ĐÈ: mọi nhóm LINE đã /dangky của cụm mất sạch, im lặng. Mạng lỗi thì
    // dừng, lần sau chạy lại.
    if (!cfg && loiDoc) throw new Error('Không đọc được cấu hình cụm "' + site + '" (mạng lỗi) — dừng, KHÔNG tạo lại cụm để khỏi xoá các nhóm LINE đã /dangky. Chạy lại sau ít phút.');

    // tuTin: mọi đường tới được đây đều đã đối chiếu SIÊU THỊ của cấu hình với
    // danh sách lấy từ API bằng chính tài khoản đang đăng nhập (trungSieuThi),
    // hoặc là cụm mới do chính lần chạy này tạo ra. Nên ghi mã nhân viên vào là
    // an toàn. Các script khác KHÔNG có bằng chứng đó nên không đặt cờ này.
    var got = { code: site, config: cfg, mwgUser: mwgUser, clusterId: '', tuTin: true };
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

  /* GIỜ CÔNG: DỰNG FILE TỪ API XEM MÀN HÌNH, KHÔNG XUẤT EXCEL NỮA.
   *
   * Từ ~08/09/2026 baocao KHOÁ xuất file với bộ phận Quản lý siêu thị:
   *   POST reports/export/timekeeping -> 403 EXPORT_DEPARTMENT_DENIED
   *   "Bộ phận của bạn chỉ được xem báo cáo trên màn hình, không xuất file Excel."
   * Bản cũ không đọc mã lỗi, chỉ báo "Không lấy được job_id" — và mọi file
   * gio_cong_cum*.xlsx của tất cả các cụm đứng im từ 07-08/09.
   *
   * API xem trên màn hình reports/timekeeping-get vẫn chạy và trả ĐÚNG từng cột
   * của file xuất cũ (đối chiếu 13/09 trên file gio_cong_cum14285.xlsx: cùng 15
   * cột, cùng giá trị từng dòng). Nên dựng lại file xlsx y hệt ngay trong trình
   * duyệt rồi đẩy lên cùng tên — dashboard.html, giocong.html đọc theo TÊN CỘT
   * nên không phải sửa gì. */
  var COT_GIO_CONG = [
    ['NGÀY', 'ngay'], ['THÁNG', 'thang'], ['MÃ SIÊU THỊ', 'ma_sieu_thi'],
    ['TÊN SIÊU THỊ', 'ten_sieu_thi'], ['MÃ NV', 'ma_nv'], ['TÊN NV', 'ten_nv'],
    ['TÊN', 'ten'], ['PHÒNG BAN', 'phong_ban'], ['CHỨC VỤ', 'chuc_vu'], ['CA', 'ca'],
    ['TỔNG GIỜ CÔNG (X.NHẬN)', 'tong_gio_cong'], ['TÊN CÔNG TY', 'ten_cong_ty'],
    ['KHU VỰC', 'khu_vuc'], ['KHU VỰC RSM', 'khu_vuc_rsm'], ['KHU VỰC ASM', 'khu_vuc_am']
  ];

  async function dayGioCong(dauThang, homNay, maSieuThis, log) {
    if (!window.DMXCluster) throw new Error('Chưa nạp được dmx-cluster-shared.js.');
    var site = DMXCluster.getSiteCode();
    if (!site) throw new Error('Chưa đặt mã cụm trên trang này (dmx_site_code).');
    var XL = window.XLSX || (typeof XLSX !== 'undefined' ? XLSX : null);
    if (!XL) throw new Error('Chưa nạp được thư viện XLSX — cập nhật lại công cụ.');

    var rows = await post('reports/timekeeping-get', {
      FROMDATE: ymdSo(dauThang), TODATE: ymdSo(homNay),
      STOREIDS: maSieuThis.join(','), PAGEINDEX: 1, PAGESIZE: 0
    });
    if (!Array.isArray(rows)) throw new Error('timekeeping-get không trả danh sách.');
    log('  ✓ ' + rows.length + ' dòng giờ công (API xem màn hình)');

    // File RỖNG thì ĐỪNG đẩy. Cửa sổ là "đầu tháng -> hôm nay", nên sáng ngày 1
    // chưa ai chấm công là ra 0 dòng — đẩy lên sẽ ghi đè mất file đang tốt.
    if (!rows.length) {
      log('  ⚠ 0 dòng (đầu tháng chưa ai chấm công) — GIỮ NGUYÊN file cũ, không ghi đè.');
      return { boQua: true, lyDo: 'giờ công 0 dòng' };
    }

    var aoa = [COT_GIO_CONG.map(function (c) { return c[0]; })];
    rows.forEach(function (r) {
      aoa.push(COT_GIO_CONG.map(function (c) {
        var v = r[c[1]];
        // Giờ công là SỐ trong file cũ ("3.0000" -> 3), để trang cộng được.
        if (c[1] === 'tong_gio_cong') { var n = Number(v); return isFinite(n) ? n : 0; }
        return v == null ? '' : String(v);
      }));
    });
    var wb = XL.utils.book_new();
    XL.utils.book_append_sheet(wb, XL.utils.aoa_to_sheet(aoa), 'Sheet1');
    var buf = XL.write(wb, { bookType: 'xlsx', type: 'array' });
    if (!buf || !buf.byteLength) throw new Error('dựng file rỗng.');

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

    /* MỐC SO CÙNG KỲ = HẾT HÔM QUA, CẢ HAI BÊN.
     *
     * Bản cũ lấy đến HÔM NAY: ngày 13 thì so 01→13/09 với 01→13/08. Nhưng ngày
     * 13 tháng này mới bán được vài tiếng, còn 13/08 là trọn một ngày — thành ra
     * so ~12 ngày với 13 ngày đủ. Đo 13/09/2026 lúc 09:27 ở 396 NVC: thẻ báo
     * −9,97%, còn so đúng 12 ngày với 12 ngày chỉ −2,95%. Gần 7 điểm lệch là
     * do thừa đúng một ngày (riêng 13/08 đã 234,6 tr).
     *
     * Ngày 1 thì ngayChot đã là cuối tháng trước (trọn tháng) nên giữ nguyên. */
    var ngayCK = laNgayDau ? ngayChot
      : new Date(homNay.getFullYear(), homNay.getMonth(), homNay.getDate() - 1);
    var denNgayCK = ymdSo(ngayCK);
    var thangTruocDau = new Date(ngayChot.getFullYear(), ngayChot.getMonth() - 1, 1);
    var soNgayThangTruoc = new Date(thangTruocDau.getFullYear(), thangTruocDau.getMonth() + 1, 0).getDate();
    // Tháng trước ngắn hơn (chốt 31 mà tháng trước 30 ngày) thì kẹp về ngày cuối.
    var thangTruocChot = new Date(thangTruocDau.getFullYear(), thangTruocDau.getMonth(),
                                  Math.min(ngayCK.getDate(), soNgayThangTruoc));
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
          // TRẢ GÓP PHẢI GIỮ CẢ HAI NỀN. Tỷ trọng trả góp mà MWG hiện đứng trên
          // nền QUY ĐỔI, nên chỉ cất revenue_tragop (thực) là trang báo cáo
          // không dựng lại được tỷ lệ ấy — đúng chỗ vừa hụt ở sieuthi.html.
          traCham: so(cardThang.revenue_tragop),
          traChamQd: so(cardThang.revenue_tragop_kfactor),
          sl: so(cardThang.quantity),
          luotKhach: so(cardThang.svc_visitors), luotBill: so(cardThang.svc_bills)
        },
        ngay: {
          dt: so(cardNgay.revenue), dtqd: so(cardNgay.revenue_kfactor),
          traCham: so(cardNgay.revenue_tragop),
          traChamQd: so(cardNgay.revenue_tragop_kfactor),
          sl: so(cardNgay.quantity),
          luotKhach: so(cardNgay.svc_visitors), luotBill: so(cardNgay.svc_bills)
        },
        luyKe: {
          dt: so(cardThang.revenue_cum), dtqd: so(cardThang.revenue_kfactor_cum),
          traChamQd: so(cardThang.revenue_tragop_kfactor_cum),
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
      /* revenue-target-get ĐÃ BỊ BAOCAO GỠ (13/09/2026: trả 404 "Not Found").
       * Bản thay thế revenue-target-store-get thì đòi quyền
       * BI_DASH_REVENUE_TARGET_STORE mà tài khoản Quản lý không có (403).
       *
       * Nhưng không cần nó: thẻ tổng revenue-consolidated-card-get vẫn chạy và
       * có sẵn revenue_onl_kfactor, nên OFFLINE QUY ĐỔI = hợp nhất − online.
       * Đo lúc còn endpoint cũ (8/2026, 396 NVC): hợp nhất 7.234,4 − dtlk
       * 6.869,6 = 364,8 so với online quy đổi 398,8 — lệch ~0,5% tổng, do làm
       * tròn nội bộ của baocao. Đủ dùng; ghi rõ nguồn là SUY RA. */
      try {
        // Cắt ĐẾN HẾT HÔM QUA, cùng mốc với khoảng cùng kỳ tháng trước — xem
        // ghi chú ngayCK. Cũng khớp soNgayLuyKe mà trang dùng để chia nhịp.
        var cardNay = (await post('reports/revenue-consolidated-card-get', {
          FROMDATE: tuNgay, TODATE: denNgayCK, VIEWLEVEL: 'STORE', VIEWIDS: sq.mwg,
          CHAINIDS: '1,2,16', MAINGROUPIDS: null, SUBGROUPIDS: null
        }))[0] || null;
        if (cardNay) th.offline = {
          dtlk: so(cardNay.revenue_kfactor) - so(cardNay.revenue_onl_kfactor),
          hopNhat: so(cardNay.revenue_kfactor),
          tu: tuNgay, den: denNgayCK,
          nguon: 'suy ra: thẻ tổng hợp nhất − online quy đổi'
        };
      } catch (e) {}

      /* LỢI NHUẬN TRỰC TIẾP, TỶ LỆ PHỤC VỤ, TỶ TRỌNG TRẢ GÓP — KHÔNG GỌI NỮA.
       * 19/09/2026 cả ba trả 404 {"detail":"Not Found"}: directprofit-lk-get,
       * servicerate-get, revenue-tragop-get. Mã của chính trang baocao cũng đã
       * bỏ ba tên này; thay bằng họ "khoibanhang-uplevel-card-*-get" (profit,
       * servicerate, installment…) nhận {MONTH, TODATE} và trả số GỘP CẢ PHẠM
       * VI TÀI KHOẢN — không có mã siêu thị, childunit-get cũng chỉ chia tới
       * VÙNG (Miền Bắc > Vùng Hà Nội +). Tức không còn số riêng từng siêu thị.
       * Không mất gì trên báo cáo:
       *   · trả góp: sieuthi.html tự tính traChamQd ÷ dtqd (cùng thẻ tổng hợp
       *     nhất, cùng nền quy đổi) — đúng con số MWG hiện;
       *   · lợi nhuận: thẻ vốn đã ẨN vì tài khoản Quản lý chỉ nhận toàn 0;
       *   · tỷ lệ phục vụ: sieuthi.html không đọc khối này; lượt khách/lượt bill
       *     theo từng siêu thị do công cụ Realtime lấy từ peopleinstore-get và
       *     countbill-tgdd-get (vẫn chạy).
       * Gọi tiếp chỉ đẻ ra 6 dòng cảnh báo mỗi lượt thu. */
      th.loiNhuan = null; th.phucVu = null; th.traCham = null;

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
        // Cùng lý do ở trên: KHÔNG gọi revenue-target-get nữa (404). Trước đây
        // chính dòng này ném lỗi, kéo đổ nguyên khối -> thangTruoc không bao giờ
        // được gán, dù thẻ hợp nhất ngay phía trên vẫn lấy được bình thường. Thẻ
        // "cùng kỳ tháng trước" trống trơn là vì vậy.
        var offTr = { dtlk: so(cardTr.revenue_kfactor) - so(cardTr.revenue_onl_kfactor) };
        var catTr = await post('reports/bi-category-get', {
          FROMDATE: tuNgayTr, TODATE: denNgayTr, VIEWLEVEL: 'STORE', VIEWID: sq.mwg,
          BRANDIDLIST: null, LEVEL1ID: null, LEVEL2ID: null
        });
        /* THẺ TỔNG TRẢ 0 CHO KHOẢNG LẺ CỦA THÁNG CŨ — đo thẳng trên API
         * 17/09/2026, tài khoản Quản lý, siêu thị 14285:
         *   01/08–16/08  -> revenue_kfactor = 0      (kèm hay không kèm MONTHKEY)
         *   01/08–31/08  -> revenue_kfactor = 6.847,85   (trọn tháng thì có)
         *   01/09–16/09  -> revenue_kfactor = 3.717,95   (tháng này thì có)
         * Tức baocao chỉ phục vụ khoảng lẻ của THÁNG HIỆN TẠI. Vì vậy thẻ "cùng
         * kỳ tháng trước" trống trơn dù script chạy trơn tru — không phải lỗi
         * đăng nhập, không phải endpoint bị gỡ.
         *
         * Đường vòng: bi-category-get VẪN trả đủ cho khoảng lẻ tháng cũ (13
         * dòng cấp 1, cộng quy đổi 4.005,63). Nên hụt thì cộng ngành hàng.
         * Lưu ý nền hơi khác: cùng phép cộng ấy cho 01/09–16/09 ra 3.754,29 so
         * với 3.717,95 của thẻ tổng (+1,0%). Nên gói lưu LUÔN tổng ngành hàng
         * của THÁNG NÀY để trang so cùng một nền, thay vì đem số thẻ tổng so
         * với số cộng ngành. */
        var congNganh = function (ds) {
          return (ds || []).filter(function (r) { return !r.level2_id; })
            .reduce(function (t, r) { return t + so(r.revenue_kfactor); }, 0);
        };
        var qdTr = so(cardTr.revenue_kfactor), nguonTr = 'the-tong';
        if (!qdTr) { qdTr = congNganh(catTr); nguonTr = 'cong-nganh'; }
        th.thangTruoc = {
          tu: tuNgayTr, den: denNgayTr,
          nguon: nguonTr,
          dtqdNganhNay: congNganh(th.nganhHang),
          dtqdNganhTruoc: congNganh(catTr),
          dtqdHopNhat: qdTr,
          dtqdOffline: so(offTr.dtlk) || (nguonTr === 'cong-nganh' ? qdTr : 0),
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
  /* ĐẨY GÓI TỔNG HỢP LÊN KHO — goi_tong_cum<mã>.json                    */
  /* ================================================================== */
  /*
   * Vì sao cần: bot LINE (/tonghop) và trang tonghop.html trước đây phải cộng
   * doanh thu của từng nhân viên trong nv.html để ra số siêu thị. Cách đó luôn
   * THIẾU — nhân viên hỗ trợ và nhân viên online không nằm trong danh sách. Đo
   * 17/09/2026: 396 thiếu 170 tr (4,8%), Ngọc Thụy thiếu 221 tr (22,4%).
   *
   * Vì sao lấy từ ĐÂY chứ không lấy từ gói realtime: gói này là số của CHÍNH
   * công cụ thu số — cùng một lần gọi API, cùng cách cắt mốc "hết hôm qua" mà
   * sieuthi.html đang hiển thị. Số hai nơi vì thế bằng nhau từng đồng.
   *
   * Gói cố ý NHỎ (vài KB): chỉ những con số thẻ tổng cần, không kèm nhân viên,
   * không kèm ngành hàng — bot đọc mỗi lần có người gõ lệnh, nặng là tốn băng
   * thông kho (đang vượt 6,71/5 GB).
   *
   * Cách tính lấy ĐÚNG như veTuGoiMoi() của sieuthi.html:
   *   luyKe  = offline quy đổi (đã cắt hết hôm qua); không có thì dùng hợp nhất
   *   target = t.targetQd
   *   tỷ trọng trả góp = ty_trong_tra_cham của API, hỏng thì traChamQd ÷ dtqd
   * Sửa công thức bên kia thì phải sửa cả ở đây.
   */
  function dungGoiTong(goi) {
    var ds = {};
    (goi.sieuThi || []).forEach(function (s) {
      var t = s.tong || {}, thang = t.thang || {}, th = s.tongHop || {};
      var offline = th.offline ? so(th.offline.dtlk) : 0;
      var hopNhat = (th.offline && th.offline.hopNhat) ? so(th.offline.hopNhat) : so(thang.dtqd);
      var luyKe = offline > 0 ? offline : hopNhat;
      var tyTg = (th.traCham && th.traCham.ty_trong_tra_cham != null)
        ? so(th.traCham.ty_trong_tra_cham) / 100 : 0;
      var nguonTg = 'api';
      if (!tyTg && thang.traChamQd != null && so(thang.dtqd) > 0) {
        tyTg = so(thang.traChamQd) / so(thang.dtqd); nguonTg = 'tu-tinh';
      } else if (!tyTg) { nguonTg = 'thieu'; }
      var tr = th.thangTruoc || null;
      ds[String(s.key || s.mwg)] = {
        ten: s.ten, mwg: String(s.mwg || ''),
        luyKe: luyKe, dtqdOffline: offline, dtqdHopNhat: hopNhat,
        targetQd: so(t.targetQd), target: so(t.target),
        traChamQd: thang.traChamQd == null ? null : so(thang.traChamQd),
        tyTrongTraGop: tyTg, nguonTraGop: nguonTg,
        soNgayLuyKe: so(t.soNgayLuyKe), soNgayThang: so(t.soNgayThang),
        luotKhach: so(thang.luotKhach), luotBill: so(thang.luotBill),
        cungKy: tr ? { tu: tr.tu, den: tr.den, nguon: tr.nguon || 'the-tong',
                       dtqdOffline: so(tr.dtqdOffline), dtqdHopNhat: so(tr.dtqdHopNhat),
                       dtqdNganhNay: so(tr.dtqdNganhNay), dtqdNganhTruoc: so(tr.dtqdNganhTruoc) } : null
      };
    });
    return {
      v: 1, scriptVer: VER, luc: new Date().toISOString(),
      ngay: goi.ngay, chotDenNgay: goi.chotDenNgay, thang: goi.thang,
      canhBao: goi.canhBao || [], sieuThi: ds
    };
  }

  async function dayGoiTong(goi, log) {
    var site = DMXCluster.getSiteCode() || '';
    // CHỈ LẤY CHỮ SỐ của mã cụm. maCumChoTenFile("Cụm 14285") trả "cum14285" —
    // ghép thêm "goi_tong_cum" là ra "goi_tong_cumcum14285.json" (gặp thật
    // 19/09/2026), mà bot /tonghop và tonghop.html đọc "goi_tong_cum" + CHỮ SỐ
    // nên không bao giờ thấy gói. Lấy chữ số y như bên đọc thì hai bên khớp.
    var ma = String(site || '').replace(/\D/g, '');
    if (!ma) { log('⚠ chưa biết mã cụm — không đẩy được gói tổng hợp.'); return; }
    var ten = 'goi_tong_cum' + ma + '.json';
    var body = new TextEncoder().encode(JSON.stringify(dungGoiTong(goi)));
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
    log('☁ ' + ten + ' · ' + (goi.sieuThi || []).length + ' siêu thị · ' +
        Math.round(body.length / 1024 * 10) / 10 + ' KB (thẻ /tonghop đọc gói này)');
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
    // Đã gỡ "Tự đẩy realtime" (0.40.0, 24/09/2026): trường nv nó đẩy lên không còn
    // trang nào đọc từ 04/09, lại bị chuỗi Realtime tự động ghi đè mỗi cữ. Dọn
    // luôn cờ bật và ảnh chụp mốc nó để lại trong localStorage của baocao.
    try { localStorage.removeItem('dmx_rt_bat'); localStorage.removeItem('dmx_rt_thidua_v1'); } catch (e) {}
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
          try { await dayGoiTong(goi, log); } catch (e2) { log('⚠ không đẩy được gói tổng hợp: ' + (e2.message || e2)); }
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
          try { await dayGoiTong(goi, log); } catch (e2) { log('⚠ không đẩy được gói tổng hợp: ' + (e2.message || e2)); }
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
