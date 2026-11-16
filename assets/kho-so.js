/* Kho số theo ngày — lưu trên CHÍNH MÁY NÀY (IndexedDB), không gửi lên mạng.
 * Mỗi bản = 1 ngày × 1 kỳ (realtime | luyke) × 1 siêu thị; cùng ngày thì bản chụp mới hơn đè bản cũ.
 * doc-so.html / nv.html (qua DriveRelay.ghiGoiXuat) / tra-cuu.html gọi KhoSo.luuGoi(GOI) mỗi khi có gói mới.
 * Siêu thị ẩn ở doc-so (⚙ Siêu thị → dmxsnap_anst_v1) không được lưu.
 * NV chính: cùng quy tắc doc-so — tích tay (dmxsnap_nvphu_v1) thắng; còn lại = có mã NV và (chưa có giờ công
 * hoặc có ngày làm "BP All In One" tại đúng siêu thị đó). Không bao giờ xét doanh thu. */
(function (W) {
  var TEN_DB = 'dmxsnap_kho', BANG = 'ban';
  function jget(k, mac) { try { return JSON.parse(W.localStorage.getItem(k) || 'null') || mac; } catch (e) { return mac; } }
  var dbHua = null;
  function mo() {
    if (dbHua) return dbHua;
    dbHua = new Promise(function (ok, loi) {
      if (!W.indexedDB) return loi(new Error('Trình duyệt không có IndexedDB'));
      var r = W.indexedDB.open(TEN_DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(BANG, { keyPath: 'id' }); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { dbHua = null; loi(r.error); };
    });
    return dbHua;
  }
  function docLuc(s) {
    var m = /^(\d\d):(\d\d):(\d\d) (\d\d)\/(\d\d)\/(\d{4})$/.exec(s || '');
    return m ? new Date(+m[6], m[5] - 1, +m[4], +m[1], +m[2], +m[3]) : new Date(s);
  }
  // "3/11/2026" → 20261103 (để xếp ngày)
  function khoaNgay(ngay) { var p = String(ngay || '').split('/'); return p.length === 3 ? (+p[2]) * 10000 + (+p[1]) * 100 + (+p[0]) : 0; }

  function banGoi(goiCap) {
    var D = W.DmxSnap; if (!D) return [];
    var anST = jget('dmxsnap_anst_v1', {}), tay = jget('dmxsnap_nvphu_v1', {});
    var gcGoi = ['realtime', 'luyke'].map(function (k) { return goiCap[k]; }).filter(function (g) { return g && g.gioCong; })
      .sort(function (a, b) { return docLuc(b.luc) - docLuc(a.luc); })[0];
    var gc = gcGoi ? D.docGioCong(gcGoi.gioCong) : null;
    var ra = [];
    ['realtime', 'luyke'].forEach(function (ky) {
      var g = goiCap[ky]; if (!g) return;
      var kq; try { kq = D.docGoi(g); } catch (e) { return; }
      if (kq.ky !== ky) return;
      var l = docLuc(g.luc), ngayGoi = l.getDate() + '/' + (l.getMonth() + 1) + '/' + l.getFullYear();
      kq.thuTu.forEach(function (ma) {
        if (anST[ma]) return;
        var s = kq.sieuThi[ma], t = s.tong, ngay = s.ngay || ngayGoi, bang = gc && gc.theoST[ma], tt = tay[ma] || {};
        if (!s.nv.length && !s.nganh.length) return;     // lượt hỏng: đừng đè bản tốt
        var chinh = function (n) {
          var o = tt[n.ma]; if (o === 'c') return true; if (o) return false;
          return !!n.chinhThuc && (!bang || !!(bang[n.ma] && bang[n.ma].aio));
        };
        ra.push({
          id: ngay + '|' + ky + '|' + ma, ngay: ngay, k: khoaNgay(ngay), ky: ky, ma: ma, ten: s.ten, luc: g.luc, capNhat: s.capNhat,
          tong: { dtqd: t.dtqd, target: t.target, ht: t.ht != null ? t.ht : (t.target ? t.dtqd / t.target * 100 : null), duBao: t.duBao, traGop: t.traGop, sl: t.sl },
          nganh: s.nganh.map(function (x) { return [x.ten, x.sl, x.dtqd]; }),
          nv: s.nv.map(function (n) {
            return { ma: n.ma, ten: n.ten, chinh: chinh(n), dtqd: n.dtqd, sl: n.sl, traGop: n.traGop,
              ng: n.nganh.filter(function (x) { return x.dtqd || x.sl; }).map(function (x) { return [x.ten, x.sl, x.dtqd]; }) };
          }),
          td: (s.thiDua || []).map(function (x) { return { ten: x.ten, loai: x.loai, th: x.th, target: x.target, ht: x.ht, duBao: x.duBao }; }),
          tdNV: s.tdNV || null
        });
      });
    });
    return ra;
  }

  // Ghi; bản cùng ngày/kỳ/siêu thị chỉ bị đè bởi bản chụp MỚI HƠN (app nạp lại gói cũ không làm lùi số).
  // Chỉ ghi bản MỚI HƠN. khongDay = bản kéo từ Supabase về: không đẩy ngược lên.
  function ghi(ds, khongDay) {
    return mo().then(function (db) {
      return new Promise(function (ok, loi) {
        var tx = db.transaction(BANG, 'readwrite'), b = tx.objectStore(BANG), moi = [];
        ds.forEach(function (x) {
          var r = b.get(x.id);
          r.onsuccess = function () {
            var cu = r.result;
            if (!cu || docLuc(x.luc) > docLuc(cu.luc)) { b.put(x); moi.push(x); }   // cùng lúc chụp = đã có, khỏi ghi/đẩy lại
          };
        });
        tx.oncomplete = function () {
          if (moi.length && !khongDay && W.KhoMay && W.KhoMay.san()) W.KhoMay.day(moi).catch(function () {});   // bản mới → Supabase (chỉ siêu thị của tôi)
          ok(moi.length);
        };
        tx.onerror = function () { loi(tx.error); };
      });
    });
  }
  function luuGoi(goiCap) {
    var ds = banGoi(goiCap || jget('dmxsnap_goi_v1', {}));
    return ds.length ? ghi(ds) : Promise.resolve(0);
  }
  function tatCa() {
    return mo().then(function (db) {
      return new Promise(function (ok, loi) {
        var r = db.transaction(BANG).objectStore(BANG).getAll();
        r.onsuccess = function () { ok(r.result || []); };
        r.onerror = function () { loi(r.error); };
      });
    });
  }
  function xoa(ids) {
    return mo().then(function (db) {
      return new Promise(function (ok, loi) {
        var tx = db.transaction(BANG, 'readwrite'), b = tx.objectStore(BANG);
        ids.forEach(function (id) { b.delete(id); });
        tx.oncomplete = function () { ok(ids.length); };
        tx.onerror = function () { loi(tx.error); };
      });
    });
  }
  // Khôi phục từ tệp sao lưu: luôn đè theo quy tắc "mới hơn thắng"
  function nhap(ds) { return ghi((ds || []).filter(function (x) { return x && x.id && x.ma && x.ky; })); }

  W.KhoSo = { luuGoi: luuGoi, banGoi: banGoi, ghi: ghi, tatCa: tatCa, xoa: xoa, nhap: nhap, khoaNgay: khoaNgay, docLuc: docLuc };

  /* ---------- KhoMay: bản sao trên Supabase của anh (bảng kho_so, RLS theo tài khoản) ----------
   * QUY ĐỊNH: chỉ siêu thị anh/chị TỰ TÍCH "của tôi" (cfg.cua) mới được đưa lên; siêu thị ẩn (⚙ ở doc-so)
   * không bao giờ lên, kể cả đã tích. Không lưu mật khẩu — chỉ giữ phiên đăng nhập (token) trên máy. */
  var K_CFG = 'dmx_kho_may_v1', K_PHIEN = 'dmx_kho_may_phien_v1';
  function cfg() { var c = jget(K_CFG, {}); c.cua = c.cua || {}; return c; }
  function luuCfg(c) { W.localStorage.setItem(K_CFG, JSON.stringify(c)); }
  function phien() { return jget(K_PHIEN, null); }
  function goc() { return String(cfg().url || '').replace(/\/+$/, ''); }
  function san() { var c = cfg(); return !!(c.url && c.key && phien() && Object.keys(c.cua).length); }
  function duocLen(ma) { var c = cfg(), an = jget('dmxsnap_anst_v1', {}); return !!c.cua[ma] && !an[ma]; }
  function goiAuth(loai, than) {
    return fetch(goc() + '/auth/v1/token?grant_type=' + loai, {
      method: 'POST', headers: { apikey: cfg().key, 'Content-Type': 'application/json' }, body: JSON.stringify(than)
    }).then(function (r) { return r.json().then(function (j) {
      if (!r.ok || !j.access_token) throw new Error(j.error_description || j.msg || j.message || ('Đăng nhập lỗi ' + r.status));
      var p = { access_token: j.access_token, refresh_token: j.refresh_token, het: Date.now() + (j.expires_in || 3600) * 1000, email: (j.user || {}).email || (phien() || {}).email };
      W.localStorage.setItem(K_PHIEN, JSON.stringify(p)); return p;
    }); });
  }
  function dangNhap(email, matKhau) { return goiAuth('password', { email: email, password: matKhau }); }
  function dangXuat() { W.localStorage.removeItem(K_PHIEN); }
  function token() {
    var p = phien(); if (!p) return Promise.reject(new Error('Chưa đăng nhập Supabase'));
    if (p.het - Date.now() > 60000) return Promise.resolve(p.access_token);
    return goiAuth('refresh_token', { refresh_token: p.refresh_token }).then(function (q) { return q.access_token; })
      .catch(function (e) { dangXuat(); throw e; });
  }
  function rest(duongDan, tuyChon) {
    return token().then(function (tk) {
      tuyChon = tuyChon || {};
      var h = { apikey: cfg().key, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' };
      Object.keys(tuyChon.headers || {}).forEach(function (k) { h[k] = tuyChon.headers[k]; });
      return fetch(goc() + '/rest/v1/' + duongDan, { method: tuyChon.method || 'GET', headers: h, body: tuyChon.body });
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('Supabase ' + r.status + ': ' + t.slice(0, 200)); });
      return r;
    });
  }
  // Đẩy lên (upsert theo id). Lọc lần cuối ở đây: siêu thị không phải "của tôi" bị bỏ, không ngoại lệ.
  function day(ds) {
    var len = (ds || []).filter(function (x) { return duocLen(x.ma); });
    if (!len.length) return Promise.resolve(0);
    var dong = len.map(function (x) { return { id: x.id, ma: x.ma, ngay: x.ngay, ky: x.ky, k: x.k, luc: String(x.luc || ''), du_lieu: x }; });
    var phan = [], i; for (i = 0; i < dong.length; i += 50) phan.push(dong.slice(i, i + 50));
    return phan.reduce(function (p, lo) {
      return p.then(function () { return rest('kho_so?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(lo) }); });
    }, Promise.resolve()).then(function () { var c = cfg(); c.lanDay = new Date().toISOString(); luuCfg(c); return len.length; });
  }
  // Kéo về máy (chia trang 500 dòng — Supabase trả tối đa 1000 dòng/lượt)
  function keo() {
    var ma = Object.keys(cfg().cua).filter(duocLen);
    if (!ma.length) return Promise.resolve(0);
    var tat = [];
    function trang(tu) {
      return rest('kho_so?select=du_lieu&ma=in.(' + ma.map(encodeURIComponent).join(',') + ')&order=id', { headers: { Range: tu + '-' + (tu + 499) } })
        .then(function (r) { return r.json(); }).then(function (ds) {
          ds.forEach(function (d) { if (d.du_lieu && d.du_lieu.id) tat.push(d.du_lieu); });
          return ds.length === 500 ? trang(tu + 500) : null;
        });
    }
    return trang(0).then(function () { return ghi(tat, true); });
  }
  // Đưa toàn bộ kho trên máy (của siêu thị của tôi) lên — dùng lần đầu
  function dayHet() { return tatCa().then(day); }

  W.KhoMay = { cfg: cfg, luuCfg: luuCfg, phien: phien, san: san, duocLen: duocLen, dangNhap: dangNhap, dangXuat: dangXuat, day: day, keo: keo, dayHet: dayHet };
})(window);
