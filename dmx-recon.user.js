// ==UserScript==
// @name         DMX — Dò trang dashboard 77 (recon, tạm thời)
// @namespace    namkphong.github.io
// @version      1.1.0
// @description  Chỉ để KHẢO SÁT cấu trúc report.mwgroup.vn cho việc dựng script tự chạy. Cài tạm, dò xong gỡ đi.
// @match        https://report.mwgroup.vn/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  function txt(el) { return (el && (el.textContent || el.value) || '').replace(/\s+/g, ' ').trim(); }
  function attrs(el) {
    if (!el) return '';
    return el.tagName.toLowerCase() +
      (el.id ? '#' + el.id : '') +
      (el.name ? '[name=' + el.name + ']' : '') +
      (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.') : '');
  }
  function labelNear(el) {
    // Nhãn gần ô: <label>, hoặc text ngay trước trong cùng khối
    var p = el;
    for (var i = 0; i < 4 && p; i++) {
      p = p.parentElement;
      if (!p) break;
      var lb = p.querySelector('label');
      if (lb && txt(lb)) return txt(lb);
      var t = (p.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && t.length < 40) return t;
    }
    return '';
  }

  function gather() {
    var out = [];
    var push = function (s) { out.push(s); };

    push('=== DMX RECON ===');
    push('URL: ' + location.href);
    push('path: ' + location.pathname);
    push('libs: jQuery=' + (typeof window.jQuery) + ' angular=' + (typeof window.angular) +
         ' kendo=' + (typeof window.kendo) +
         ' kendoDatePicker=' + (window.jQuery && window.jQuery.fn && !!window.jQuery.fn.kendoDatePicker));

    // 1) Kendo DatePicker
    push('\n--- DATE PICKERS (kendoDatePicker) ---');
    var dpN = 0;
    if (window.jQuery) {
      window.jQuery('input').each(function (i, el) {
        var kdp = null;
        try { kdp = window.jQuery(el).data('kendoDatePicker'); } catch (e) {}
        if (kdp) {
          dpN++;
          var val = '';
          try { val = kdp.value() ? kdp.value().toString().slice(0, 24) : '(rỗng)'; } catch (e) { val = '?'; }
          push('[dp' + dpN + '] ' + attrs(el) + ' | nhãn="' + labelNear(el) + '" | value=' + val);
        }
      });
    }
    if (!dpN) push('(không thấy kendoDatePicker — có thể chưa ở trang có bộ lọc)');

    // 2) Select / dropdown (Tìm theo, Loại yêu cầu…)
    push('\n--- SELECT / DROPDOWN ---');
    [].slice.call(document.querySelectorAll('select')).slice(0, 12).forEach(function (s, i) {
      var opts = [].slice.call(s.options).slice(0, 8).map(function (o) { return txt(o); }).join(' | ');
      push('[sel' + i + '] ' + attrs(s) + ' | nhãn="' + labelNear(s) + '" | options: ' + opts);
    });
    // Kendo dropdownlist thường là <span class="k-dropdown"> chứa text đang chọn
    [].slice.call(document.querySelectorAll('.k-dropdown, .k-dropdownlist, [data-role=dropdownlist]')).slice(0, 10).forEach(function (s, i) {
      push('[kdd' + i + '] ' + attrs(s) + ' | text="' + txt(s).slice(0, 40) + '" | nhãn="' + labelNear(s) + '"');
    });

    // 3) Nút / link theo chữ khoá
    push('\n--- NÚT / LINK theo chữ ---');
    var keys = ['xuất excel', 'chọn siêu thị', 'siêu thị được chọn', 'xong', 'xem báo cáo',
                'tải file', 'tìm kiếm siêu thị', 'kho tạo', 'kho xuất', 'áp dụng', 'tìm kiếm'];
    var seen = {};
    [].slice.call(document.querySelectorAll('button,a,input[type=button],input[type=submit],span,div,label'))
      .forEach(function (el) {
        var t = txt(el).toLowerCase();
        if (!t || t.length > 45) return;
        keys.forEach(function (k) {
          if (t.indexOf(k) !== -1 && !seen[k + '|' + t]) {
            seen[k + '|' + t] = 1;
            push('· "' + txt(el) + '" → ' + attrs(el));
          }
        });
      });

    // 4) Bảng (dùng khi ở ManagerDownload)
    push('\n--- BẢNG (table) ---');
    var tbls = [].slice.call(document.querySelectorAll('table'));
    push('số bảng: ' + tbls.length);
    tbls.slice(0, 3).forEach(function (t, i) {
      var head = [].slice.call(t.querySelectorAll('thead th, thead td')).map(txt).join(' | ');
      var row0 = t.querySelector('tbody tr');
      var cells0 = row0 ? [].slice.call(row0.children).map(txt).join(' | ') : '(không có dòng)';
      push('[tbl' + i + '] ' + attrs(t) + '\n   head: ' + head.slice(0, 160) + '\n   row0: ' + cells0.slice(0, 200));
    });

    // 5) Thử đọc LINKDOWNLOAD qua angular scope (ManagerDownload)
    push('\n--- LINKDOWNLOAD (angular scope) ---');
    if (window.angular) {
      var links = [].slice.call(document.querySelectorAll('[ng-click*="DownloadFile"], a[ng-click], [ng-click*="ownload"]')).slice(0, 5);
      if (!links.length) push('(không thấy phần tử ng-click DownloadFile — chưa ở ManagerDownload?)');
      links.forEach(function (a, i) {
        var link = '?';
        try {
          var sc = window.angular.element(a).scope();
          link = (sc && sc.dataItem && (sc.dataItem.LINKDOWNLOAD || JSON.stringify(Object.keys(sc.dataItem)).slice(0, 120))) || '(scope không có dataItem)';
        } catch (e) { link = 'lỗi: ' + e.message; }
        push('[dl' + i + '] ' + attrs(a) + ' | ' + String(link).slice(0, 120));
      });
    } else {
      push('(angular không có trên trang này)');
    }

    // 6) Kendo widgets (tìm dropdown "Kho tạo")
    push('\n--- KENDO WIDGETS (dropdown/combo) ---');
    if (window.jQuery) {
      var $ = window.jQuery;
      var roles = ['kendoDropDownList', 'kendoComboBox', 'kendoMultiSelect', 'kendoAutoComplete', 'kendoDropDownTree'];
      var wN = 0;
      $('.k-widget, [data-role]').each(function (i, el) {
        var w = null, role = null;
        for (var r = 0; r < roles.length; r++) { try { var x = $(el).data(roles[r]); if (x) { w = x; role = roles[r]; break; } } catch (e) {} }
        if (!w) return;
        wN++;
        var cur = '?'; try { cur = w.value ? w.value() : (w.text ? w.text() : '?'); } catch (e) {}
        var items = []; try { (w.dataSource.data() || []).slice(0, 8).forEach(function (d) { items.push(typeof d === 'object' ? (d.text || d.Text || d.Name || d.name || d.value || JSON.stringify(d).slice(0, 40)) : d); }); } catch (e) {}
        push('[kw' + wN + '] ' + role + ' ' + attrs(el) + ' | value="' + cur + '" | items: ' + items.join(' | '));
      });
      if (!wN) push('(không thấy kendo dropdown widget)');
    }

    // 7) Modal .k-window đang mở (Chọn siêu thị)
    push('\n--- MODAL (.k-window) đang mở ---');
    var wins = [].slice.call(document.querySelectorAll('.k-window')).filter(function (w) { var r = w.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (!wins.length) push('(không có modal đang mở — MỞ "Chọn siêu thị" rồi bấm Dò lại)');
    wins.forEach(function (win, wi) {
      push('[win' + wi + '] title="' + txt(win.querySelector('.k-window-title')) + '"');
      [].slice.call(win.querySelectorAll('input')).slice(0, 12).forEach(function (inp, ii) {
        push('   input[' + ii + '] type=' + inp.type + ' ' + attrs(inp) + ' ph="' + (inp.placeholder || '') + '"');
      });
      var cbs = [].slice.call(win.querySelectorAll('input[type=checkbox]'));
      push('   checkbox: ' + cbs.length);
      cbs.slice(0, 6).forEach(function (cb, ci) {
        var row = cb.closest('tr,li,.row,div');
        push('     cb[' + ci + '] ' + attrs(cb) + ' | dòng="' + (row ? txt(row).slice(0, 55) : '') + '"');
      });
      [].slice.call(win.querySelectorAll('button,a,.k-button')).slice(0, 10).forEach(function (b) {
        if (txt(b)) push('   nút "' + txt(b) + '" → ' + attrs(b));
      });
    });

    return out.join('\n');
  }

  function panel() {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:70px;z-index:2147483647;background:#0b1220;' +
      'color:#e6f6ff;border:1px solid #2dd4ff;border-radius:12px;padding:12px;font:12px/1.4 monospace;max-height:70vh;overflow:auto';
    var ta = document.createElement('textarea');
    ta.style.cssText = 'width:100%;height:40vh;background:#000;color:#3bf07a;border:0;font:11px/1.4 monospace;white-space:pre';
    ta.value = gather();
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:8px;margin-top:8px';
    var copy = document.createElement('button');
    copy.textContent = 'Copy';
    copy.style.cssText = 'flex:1;padding:10px;background:#16a34a;color:#fff;border:0;border-radius:8px;font-weight:bold';
    copy.onclick = function () {
      ta.select();
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(function () { copy.textContent = 'Đã copy ✓'; },
        function () { document.execCommand('copy'); copy.textContent = 'Đã copy ✓'; });
      else { document.execCommand('copy'); copy.textContent = 'Đã copy ✓'; }
    };
    var re = document.createElement('button');
    re.textContent = 'Dò lại';
    re.style.cssText = 'padding:10px;background:#1d4ed8;color:#fff;border:0;border-radius:8px';
    re.onclick = function () { ta.value = gather(); };
    var cl = document.createElement('button');
    cl.textContent = 'Đóng';
    cl.style.cssText = 'padding:10px;background:#475569;color:#fff;border:0;border-radius:8px';
    cl.onclick = function () { box.remove(); };
    bar.appendChild(copy); bar.appendChild(re); bar.appendChild(cl);
    box.appendChild(ta); box.appendChild(bar);
    document.body.appendChild(box);
  }

  var btn = document.createElement('div');
  btn.textContent = '🔍 Dò trang';
  btn.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;background:#0b1220;color:#2dd4ff;' +
    'border:2px solid #2dd4ff;border-radius:24px;padding:10px 14px;font:bold 13px sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.5)';
  btn.onclick = panel;
  document.body.appendChild(btn);
})();
