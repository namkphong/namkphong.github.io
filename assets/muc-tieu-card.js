/* =======================================================================
 * assets/muc-tieu-card.js — Lõi tính & vẽ THẺ MỤC TIÊU NHÂN VIÊN.
 * Tách nguyên (không đổi logic) từ themuctieu.html để dùng chung cho cả
 * themuctieu.html (đẩy /bc lên GitHub) và nv.html (Trang Cá Nhân NV).
 * Xuất: window.MucTieuCard = { STORES, MNAME, PRIORITY, buildCards, renderStore, cardH, drawCard, groupsOf }
 * ===================================================================== */
(function () {
  'use strict';

  /* ---- Cấu hình siêu thị: code (khoá render) -> key kho / nhãn / nhóm LINE ---- */
  var STORES = [
    { code:'396', name:'396 Nguyễn Văn Cừ', key:'396', label:'396 Nguyễn Văn Cừ', group:'Cd6981bde07d3c222623f363b8f5739bf' },
    { code:'NT',  name:'Ngọc Thụy',          key:'142', label:'Ngọc Thụy',          group:'Cd16f4cb26203b273afd91895cc10b66f' }
  ];
  var MNAME    = { '396':'396 NGUYỄN VĂN CỪ', 'NT':'NGỌC THỤY' };
  var PRIORITY = { '396':'Ưu tiên: KHÓA 6 nhóm dễ về số nhất + 3 nhóm dự phòng (giao NV giỏi) → tăng xác suất đủ 6 nhóm về đích',
                   'NT' :'Ưu tiên: KHÓA 6 nhóm dễ về số nhất + 3 nhóm dự phòng (giao NV giỏi) → tăng xác suất đủ 6 nhóm về đích' };

  /* ================== TIỆN ÍCH SỐ / CHUỖI (khớp analyze.py) ================== */
  function num(s){ s=(''+s).trim().replace('%','').replace(/,/g,''); var m=s.match(/-?\d+\.?\d*/); return m?parseFloat(m[0]):0; }
  function norm(s){ return (s||'').replace(/\s+/g,' ').trim(); }
  function r1(x){ return Math.round(x*10)/10; }
  function gfmt(x){ return String(parseFloat((+x).toFixed(1))); }        // như %g cho 1 chữ số thập phân
  function keysSorted(o){ return Object.keys(o).sort(); }
  function clampv(x,lo,hi){ return Math.max(lo,Math.min(hi,x)); }
  // Mã NV nằm cuối tên ("Tên - 141445") — mã càng cao thường càng mới (quan sát thực tế).
  function empCode(nm){ var mtc=/-\s*(\d+)\s*$/.exec(nm||''); return mtc?parseInt(mtc[1],10):null; }
  var NEW_HIRE_CODE = 270000;   // mã NV > ngưỡng này -> coi là nhân viên mới

  /* ================== 23 NHÓM THI ĐUA + giá TB (khớp analyze.py) ================== */
  var YELLOW = {"Laptop":"Laptop","Đồng hồ - Phụ kiện":"Đồng hồ-Phụ kiện","ĐIỆN THOẠI & TABLET ANDROID":"ĐT&Tablet Android","Camera":"Camera","DOANH THU ĐỒNG HỒ":"Doanh thu đồng hồ","Điện thoại Realme":"Điện thoại Realme","Điện thoại Vivo":"Điện thoại Vivo","TRẢ CHẬM HOMECREDIT":"Trả chậm HomeCredit","FECREDIT, SHINHAN, SAMSUNG FINANCE+":"Trả chậm FE/Shinhan","TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG":"Trả chậm ĐM&GD","Sim Tổng":"Sim Tổng","NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG THÁNG 07/2026":"Nạp rút tiền","Dịch vụ VAS":"VAS","Cho vay tiền mặt":"Cho vay tiền mặt","BẢO HIỂM":"Bảo hiểm",
    // "Bảo hiểm thợ Điện Máy Xanh" là ngành RIÊNG, khác hẳn "Bảo hiểm" (target và lũy kế đều
    // khác) — trước đây không có trong bảng nên bị bỏ qua hoàn toàn dù đang có số thật.
    // Đây mới là ngành được chọn làm chip "luôn quan tâm" hằng ngày.
    "Bảo hiểm thợ Điện Máy Xanh":"Bảo hiểm thợ ĐMX",
    // Alias: BI đôi khi xuất tên kèm tiền tố "Trả chậm " -> _sig khác hẳn khoá gốc nên trước đây
    // nhóm này (hệ số 2) bị loại khỏi 23 nhóm thi đua, không bao giờ được giao.
    "Trả chậm FECredit, Shinhan, Samsung Finance+":"Trả chậm FE/Shinhan","MÁY LỌC KHÔNG KHÍ - HÚT ẨM - HÚT BỤI":"Máy lọc không khí (x2)","Máy Lọc Nước":"Máy lọc nước","Máy Lạnh NAGAKAWA":"Nagakawa","ĐIỆN TỬ & ĐIỆN LẠNH, ĐIỆN GIA DỤNG HÃNG LG":"Điện lạnh LG","TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT":"Tủ lạnh","Điện tử":"Điện tử","Quạt gió":"Quạt mát","MÁY GIẶT":"Máy giặt"};
  var QTY = ["Camera","Sim Tổng","NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG THÁNG 07/2026","Dịch vụ VAS"];
  var HARD = ["Cho vay tiền mặt","Máy Lạnh NAGAKAWA"];
  var UNIT = {'Máy lọc không khí':3.7,'Máy lọc nước':5,'ĐT&Tablet':7,'Laptop':21,'Tủ lạnh':8.3,'Điện tử':9.7,'Điện lạnh LG':7,'Đồng hồ-Phụ kiện':1,'Nagakawa':6.6,'Trả chậm HomeCredit':5,'Trả chậm FE/Shinhan':5,'Trả chậm ĐM&GD':5,'Điện thoại Realme':5,'Điện thoại Vivo':8,'Cho vay tiền mặt':10,'Doanh thu đồng hồ':1.3,'Máy giặt':6.7,'Quạt mát':1,'Bảo hiểm':0.4};   // 'Bảo hiểm' khớp luôn cả 'Bảo hiểm thợ ĐMX' qua unitOf()
  // Hệ số stretch theo D (D1-D4, mô hình STRAM/Lãnh đạo Linh hoạt) — khớp đúng
  // Target Tuần trong nv.html (classifyStramD) và skill dmx-stram-target. D2 (vỡ mộng,
  // đáy đường cong phát triển) cần cú hích LỚN NHẤT, không phải thấp nhất.
  var STRAM_STRETCH = {D1:1.10, D2:1.20, D3:1.15, D4:1.05};
  // Khớp tên ngành theo _nz (bỏ "tháng N/N" + thường hoá) và _sig (TẬP TỪ) — chống lỗi khi đổi tháng / hoa-thường / đảo thứ tự chữ (v9).
  function _nz(s){ return (s||'').toLowerCase().replace(/tháng\s*\d+\/\d+/g,'').replace(/\s+/g,' ').trim(); }
  function _sig(s){ return _nz(s).split(/[\s\-/,&]+/).filter(function(w){return w.length>1;}).sort().join('|'); }
  var YN={}, YSIG={}, QN={}, QSIG={}, HN={}, HSIG={};
  Object.keys(YELLOW).forEach(function(k){ YN[_nz(k)]=YELLOW[k]; var sg=_sig(k); if(YSIG[sg]===undefined) YSIG[sg]=YELLOW[k]; });
  QTY.forEach(function(x){ QN[_nz(x)]=1; QSIG[_sig(x)]=1; });
  HARD.forEach(function(x){ HN[_nz(x)]=1; HSIG[_sig(x)]=1; });
  function gdisp(c){ var v=YN[_nz(c)]; if(v!==undefined) return v; v=YSIG[_sig(c)]; return v!==undefined?v:null; }  // nhãn ngành hoặc null
  function isQty(c){ return QN[_nz(c)]===1 || QSIG[_sig(c)]===1; }
  function isHard(c){ return HN[_nz(c)]===1 || HSIG[_sig(c)]===1; }
  function unitOf(l){ var k=l.replace(' (x2)','').replace(' Android',''); for(var u in UNIT){ if(k.indexOf(u)!==-1||u.indexOf(k)!==-1) return UNIT[u]; } return 3; }
  function unitWord(l){ return /Trả chậm|vay|FE|Shinhan|HomeCredit/i.test(l) ? '1 đơn' : '1 cái'; }
  function shortCat(c){ var d=gdisp(c); if(d) return d.replace(' (x2)',''); return c.replace(/^(Điện thoại |DOANH THU )/,'').split(',')[0].split(' - ')[0].trim(); }

  /* ================== PARSE các ô nhập (khớp analyze.py) ================== */
  function parseRev(t){ var emp={}, tot=0; (t||'').split('\n').forEach(function(ln){ var c=ln.split('\t'); var nm=c.length?norm(c[0]):''; if(nm.indexOf('Tổng')===0 && c.length>2) tot=num(c[2]); else if(/ - \d/.test(nm) && c.length>2) emp[nm]=num(c[2]); }); return {emp:emp,tot:tot}; }
  function parseTargetFull(t){ var out={}; var lines=(t||'').split('\n'); for(var i=1;i<lines.length;i++){ var c=lines[i].split('\t'); if(c.length<5) continue; var cat=norm(c[0]); if(cat && cat!=='Tổng') out[cat]={lk:num(c[1]),tg:num(c[2]),ht:num(c[3]),dk:num(c[4])}; } return out; }
  function parseDetails(t){ var lines=(t||'').split('\n'); var cats=[], hi=null;
    for(var i=0;i<lines.length;i++){ if(i===0) continue; var ln=lines[i]; var low=ln.toLowerCase();
      if((low.indexOf('dtlk')!==-1||low.indexOf('sllk')!==-1) && ln.split('\t').filter(function(x){return x.trim();}).length>1){ hi=i; break; }
      var nm=norm(ln.split('\t')[0]); if(nm && nm.toLowerCase()!=='tổng' && nm.toLowerCase().indexOf('phòng ban')===-1) cats.push(nm); }
    var emp={};
    if(hi!==null){ for(var j=hi+1;j<lines.length;j++){ var c=lines[j].split('\t'); var nm2=norm(c[0]); if(/ - \d/.test(nm2)){ var vals=c.slice(1,1+cats.length); var cell={}; for(var k=0;k<cats.length;k++) cell[cats[k]]= k<vals.length?num(vals[k]):0; emp[nm2]=cell; } } }
    return {cats:cats,emp:emp}; }

  function analyzeMarket(SM, name){
    var m=SM[name]; var dates=keysSorted(m.history); var last=dates[dates.length-1];
    var alloc=m.targetAllocation||{}; var supT=num(m.history[last].supermarketTarget||0); var h=m.history[last];
    var pr=parseRev(h.revenueInput||''); var rev=pr.emp;
    var smfull=parseTargetFull(h.targetInput||'');
    var pd=parseDetails(h.detailsInput||''); var dcats=pd.cats, dmat=pd.emp;
    var emps=Object.keys(rev).filter(function(nm){ return alloc[nm] && parseFloat(alloc[nm])>0; });
    var rank={}, matrix={};
    emps.forEach(function(nm){ var a=parseFloat(alloc[nm])/100; rank[nm]={dtqd:rev[nm]||0,target:Math.round(supT*a)};
      var cells={}; dcats.forEach(function(cat){ var lk=(dmat[nm]&&dmat[nm][cat])||0; var tgt=((smfull[cat]&&smfull[cat].tg)||0)*a; cells[cat]={lk:lk,tg:tgt,ht:tgt>0?Math.round(lk/tgt*100):0}; }); matrix[nm]=cells; });
    var series={}; emps.forEach(function(nm){ series[nm]={}; });
    dates.forEach(function(dt){ var r=parseRev(SM[name].history[dt].revenueInput||'').emp; emps.forEach(function(nm){ if(r[nm]!==undefined) series[nm][dt]=r[nm]; }); });
    return {last:last,emps:emps,rank:rank,matrix:matrix,dcats:dcats,series:series,supT:supT,smfull:smfull};
  }

  /* ================== nhịp độ / phong độ (khớp analyze.py) ================== */
  function dnum(x){ return parseInt(x.split('-')[2],10); }
  function facets(series, CHOT){
    var days=keysSorted(series);
    if(days.length<2) return {monthAvg:0,recent:0,nhipGiao:0,yday:0,st:'stable',rc:'mid'};
    var rates=[]; for(var i=1;i<days.length;i++) rates.push(r1((series[days[i]]-series[days[i-1]])/Math.max(1,dnum(days[i])-dnum(days[i-1]))));
    var cur=series[days[days.length-1]]; var yday=rates.length?rates[rates.length-1]:0;
    var monthAvg=r1(cur/CHOT);
    var recent=rates.length?r1(rates.slice(-2).reduce(function(a,b){return a+b;},0)/Math.min(2,rates.length)):0;
    var older = rates.length>=4 ? rates.slice(-4,-2).reduce(function(a,b){return a+b;},0)/2 : recent;
    var last4=rates.slice(-4); var mean=last4.length?last4.reduce(function(a,b){return a+b;},0)/last4.length:0;
    var cv = mean>0 ? Math.sqrt(last4.reduce(function(a,r){return a+(r-mean)*(r-mean);},0)/last4.length)/mean : 1;
    var st = (recent>older*1.2 && recent>0) ? 'improve' : (recent<older*0.8 ? 'decline' : (cv<0.55?'stable':'unstable'));
    var rc = recent>monthAvg*1.15 ? 'hi' : (recent<monthAvg*0.85 ? 'lo' : 'mid');
    // Nhịp DÙNG ĐỂ GIAO MỤC TIÊU: trung bình 2 ngày (recent) một mình quá nhạy — vài ngày yếu
    // bất thường của NV giỏi kéo target xuống dưới năng lực thật, còn 1-2 ngày may mắn của NV
    // yếu lại đẩy target vượt quá sức (phản hồi quản lý thực tế). Neo lại: trung bình 4 khoảng
    // gần nhất (mean) + nhịp bình quân cả tháng (monthAvg, đã qua CHOT ngày nên ổn định hơn
    // nhiều) — mỗi bên 50%.
    var nhipGiao = r1(0.5*mean + 0.5*monthAvg);
    return {monthAvg:monthAvg,recent:recent,nhipGiao:nhipGiao,yday:r1(yday),st:st,rc:rc};
  }

  /* ================== THƯ VIỆN NHẬN XÉT >300 câu + xoay theo ngày (khớp light_render.py v10) ================== */
  var NHIEMVU_STR='';  // buildCards đặt = meta.NHIEMVU trước khi soạn câu → pick() xoay theo ngày
  function pick(name,slot,pool){ var h=BigInt('0x'+md5(name+'|'+slot+'|'+NHIEMVU_STR)); return pool[Number(h % BigInt(pool.length))]; }
  function joinList(xs){ xs=xs.filter(function(x){return x;}); if(xs.length===1) return xs[0]; if(xs.length===2) return xs[0]+' và '+xs[1]; return xs.join(', '); }
  var MO={
   'top':["Từ đầu tháng em đóng góp rất tốt cho team","Đầu tháng tới giờ em là điểm sáng của nhóm","Em đang gánh tốt cho cả team từ đầu tháng","Đầu tháng em bứt lên dẫn đầu, quá ổn","Em đang là đầu tàu doanh thu của nhóm","Số của em đang vượt xa kỳ vọng, rất đáng khen","Em mở màn tháng cực tốt, giữ phong độ này nhé","Đầu tháng em kéo cả nhóm đi lên, giỏi lắm","Em đang vượt nhịp kế hoạch, rất tự lực","Phong độ đầu tháng của em thuộc nhóm tốt nhất","Em bám và vượt mục tiêu ngay từ đầu tháng","Số em đang bay tốt, giữ vững đà này","Đầu tháng em làm rất chắc tay, vượt chỉ tiêu","Em đang dẫn nhịp cho team, tiếp tục phát huy","Kết quả đầu tháng của em rất ấn tượng","Em vượt kỳ vọng rõ rệt, cả nhóm nhìn vào học theo","Em đang cầm trịch doanh thu nhóm, rất tốt","Đầu tháng em chạy trước kế hoạch, quá ngon","Em mở tháng bằng phong độ rất cao","Đầu tháng em làm gương cho cả nhóm","Số em đang thuộc top đầu, giữ lửa nhé","Em bứt tốc sớm, tạo khoảng cách tốt với chỉ tiêu"],
   'ok':["Từ đầu tháng em bám tốt kế hoạch của team","Em đang đi đúng nhịp kế hoạch tháng","Đầu tháng tới giờ em bám sát mục tiêu","Em giữ đúng nhịp kỳ vọng, ổn định","Số em đang khớp kế hoạch tháng, tốt","Em theo sát tiến độ chung, giữ vậy nhé","Đầu tháng em đi đều và đúng hướng","Em đang trên chuẩn kỳ vọng một chút, tốt","Nhịp của em đang khớp mục tiêu, phát huy nhé","Em bám kế hoạch chắc, cố duy trì","Em đang đạt đúng vạch kỳ vọng, ổn định","Tiến độ của em khớp target, giữ phong độ","Em đi đúng lộ trình tháng, không có gì lo","Số em nằm đúng nhịp kế hoạch, tiếp tục","Em giữ được nhịp đều, đúng kỳ vọng","Đầu tháng em ổn định, bám sát mục tiêu chung","Em đi đúng kế hoạch, không đáng lo","Số em khớp tiến độ, giữ đều là đạt tháng","Em bám nhịp chắc chắn, tiếp tục nhé","Em đang trên chuẩn một nhịp, ổn định","Tiến độ em đúng hẹn, phát huy","Em giữ phong độ đúng kỳ vọng, tốt"],
   'kha':["Từ đầu tháng em đóng góp ở mức khá","Em đóng góp khá ổn cho team, ráng thêm chút","Em ở mức khá, vẫn còn dư địa để lên","Em đang gần chạm kỳ vọng, cố thêm là tốt","Số em khá ổn, đẩy thêm chút nữa là đạt","Em bám gần kế hoạch, thêm lực là bắt kịp","Em đang sát nhịp kỳ vọng, ráng nhích lên","Đóng góp của em khá, cần thêm một nhịp nữa","Em gần đuổi kịp kế hoạch rồi, cố lên","Số em ở mức tạm ổn, còn kéo lên được","Em chỉ còn thiếu chút là đạt kỳ vọng","Em đang khá, mình đẩy thêm cho chắc nhé","Em bám khá sát, thêm chút quyết tâm là ổn","Đầu tháng em ở mức ổn, ráng bứt thêm","Em gần tới vạch kỳ vọng, giữ nhịp rồi vượt","Số em khá, còn khoảng trống để bung thêm","Em ổn nhưng chưa bung hết, cố thêm nhé","Số em khá, đẩy một nhịp là vượt kỳ vọng","Em sát nút kế hoạch, ráng chút là qua","Đóng góp em khá, mình đẩy cho về chuẩn","Em còn ít nữa là đạt, giữ quyết tâm","Số em tạm ổn, thêm lực là bắt kịp nhóm"],
   'cham':["Từ đầu tháng em đóng góp chưa nhiều, cần bứt lên","Em đang hơi chậm so kế hoạch, cần tăng tốc","Đóng góp đầu tháng còn khiêm tốn, đẩy thêm nhé","Em đang dưới kỳ vọng chút, cần đẩy mạnh hơn","Số em còn thấp hơn kế hoạch, phải tăng nhịp","Em chậm hơn nhịp chung, mình cùng đẩy lại","Đầu tháng em chưa bung được, cần tập trung hơn","Em đang hụt so kỳ vọng, gắng thêm nhé","Số em còn cách kế hoạch một khoảng, cần cố","Em đang đi chậm nhịp, phải bứt lên sớm","Đóng góp của em chưa tới, cần đẩy quyết liệt","Em thấp hơn mục tiêu chút, tăng tốc lại nào","Em đang tụt nhịp nhẹ, mình gỡ lại trong tuần","Số em chưa theo kịp kế hoạch, ráng thêm","Đầu tháng em khởi động chậm, cần tăng lực","Em còn dưới vạch kỳ vọng, đẩy mạnh hơn nhé","Em chậm hơn kế hoạch, mình lên nhịp lại nào","Số em còn thiếu, cần bám khách kỹ hơn","Em hụt nhịp nhẹ, gỡ sớm trong tuần nhé","Đóng góp em chưa tới, tập trung hơn nữa","Em đang dưới chuẩn, cần một cú tăng tốc","Số em còn cách kế hoạch, ráng đẩy đều mỗi ngày"],
   'yeu':["Từ đầu tháng em đang chậm rõ so với team","Em đang thấp so với nhóm, cần bứt tốc ngay","Đầu tháng tới giờ em chưa theo kịp team","Số em đang thấp rõ, phải hành động ngay hôm nay","Em đang đứng cuối nhịp nhóm, cần thay đổi cách làm","Đóng góp của em còn rất ít, mình phải gỡ ngay","Em đang hụt xa kỳ vọng, cần tăng tốc gấp","Số em thấp so kế hoạch nhiều, tập trung lại nhé","Em đang chậm hẳn so với team, cần cú bứt phá","Đầu tháng em gần như chưa có nhịp, phải đẩy mạnh","Em đang ở nhóm thấp nhất, mình cùng vực lại","Số em kém xa mục tiêu, cần quyết tâm rõ hơn","Em chưa vào guồng, phải bắt nhịp ngay hôm nay","Đóng góp em còn yếu, cần bám sát từng đơn","Em đang bị bỏ lại so kế hoạch, tăng tốc gấp","Số em thấp, mình xem lại cách tiếp khách nhé","Em cần đổi cách làm để có số ngay hôm nay","Số em còn rất mỏng, bám từng khách kỹ hơn","Em đang đuối rõ, mình ngồi lại gỡ cùng nhau","Đóng góp em thấp, cần cam kết mạnh hơn tuần này","Em chưa có nhịp, phải quyết liệt từ hôm nay","Số em kém, tập trung nhóm dễ về trước đã"]
  };
  var RCP={
   'hi':["mấy ngày gần đây số cao hơn trung bình ngày","gần đây nhịp bán nhỉnh hơn trung bình","mấy hôm nay em bán tốt hơn mức trung bình","nhịp mấy ngày qua đang trên trung bình ngày","gần đây em đẩy số lên trên mức trung bình","mấy bữa nay em bán trên trung bình, tốt","nhịp gần đây của em nhỉnh hơn thường ngày","mấy ngày qua số em cao hơn mặt bằng chung","gần đây em tăng nhịp rõ so trung bình","số mấy hôm nay em vượt mức trung bình ngày","nhịp bán gần đây khỏe hơn trung bình","mấy ngày này em giữ số trên trung bình","gần đây em bán trên mặt bằng chung, tốt","mấy hôm nay nhịp em ấm hơn thường lệ","số gần đây của em trội hơn trung bình ngày","nhịp mấy bữa nay em đẩy lên trên chuẩn"],
   'lo':["mấy ngày gần đây số thấp hơn trung bình ngày","gần đây nhịp bán chậm hơn trung bình","mấy hôm nay số dưới mức trung bình ngày","nhịp mấy ngày qua tụt dưới trung bình ngày","gần đây số em xuống dưới mức trung bình","mấy bữa nay em bán dưới trung bình, cần đẩy","nhịp gần đây của em yếu hơn thường ngày","mấy ngày qua số em thấp hơn mặt bằng chung","gần đây em hụt nhịp so trung bình","số mấy hôm nay dưới mức trung bình ngày","nhịp bán gần đây chậm hơn trung bình","mấy ngày này số em dưới trung bình, ráng lên","gần đây em bán dưới mặt bằng chung, cần đẩy","mấy hôm nay nhịp em nguội hơn thường lệ","số gần đây của em kém hơn trung bình ngày","nhịp mấy bữa nay em tụt dưới chuẩn, gỡ lại"],
   'mid':["mấy ngày gần đây số quanh mức trung bình","nhịp gần đây giữ quanh trung bình ngày","mấy hôm nay số đều quanh trung bình","nhịp mấy ngày qua ổn quanh trung bình ngày","gần đây em giữ số sát mức trung bình","mấy bữa nay em bán quanh trung bình, đều","nhịp gần đây của em ngang thường ngày","mấy ngày qua số em bám mức trung bình chung","gần đây em giữ nhịp quanh trung bình","số mấy hôm nay dao động quanh trung bình ngày","nhịp bán gần đây đều quanh trung bình","mấy ngày này số em ổn quanh trung bình","gần đây em bám sát mặt bằng chung","mấy hôm nay nhịp em ngang mức thường lệ","số gần đây của em quanh mức trung bình ngày","nhịp mấy bữa nay em giữ đúng chuẩn"]
  };
  var STB={
   'improve':["Số đang có cải thiện rõ","Đà đang đi lên","Số bắt đầu nhích lên tốt","Nhịp đang tăng dần, tín hiệu tốt","Em đang lấy lại đà, giữ nhé","Đà bán đang khỏe lên từng ngày","Số đang lên nhịp đều, rất tốt","Em đang vào guồng dần","Đường số đang dốc lên, phát huy","Nhịp cải thiện thấy rõ qua từng ngày","Em đang bứt lên đúng hướng","Đà đi lên ổn, cố duy trì","Số đang ấm lên rõ rệt","Em đang tăng tốc đúng lúc","Đà lên đều, tín hiệu rất tích cực","Em đang leo dốc tốt, giữ sức nhé"],
   'decline':["Số đang chững lại đôi chút","Nhịp gần đây hơi thụt lùi","Đà đang chậm lại","Số có dấu hiệu đi xuống, cần để ý","Nhịp bán đang yếu dần","Đà đang hạ, mình chặn lại sớm nhé","Số đang tụt nhịp nhẹ","Em đang mất đà chút, kéo lại nào","Đường số đang đi ngang xuống","Nhịp giảm thấy rõ mấy hôm nay","Em đang chững, cần cú hích","Đà bán đang nguội đi","Số đang lùi nhẹ, tập trung lại","Nhịp đang xuống, mình gỡ ngay","Đà đang nguội, cần hâm nóng lại sớm","Số chững mấy hôm, mình bắt nhịp lại nào"],
   'stable':["Số bán khá ổn định","Nhịp bán đều tay","Số giữ ổn định","Em duy trì nhịp đều, tốt","Số đi ngang ổn, chắc tay","Nhịp bán vững, không trồi sụt","Em giữ phong độ đều đặn","Số ổn định qua các ngày","Nhịp em đều, dễ quản","Em bán chắc và đều","Số giữ được sự ổn định","Nhịp đều tay, giữ vậy nhé","Em duy trì tốt, ổn định","Số bám nhịp đều đặn","Em bán chắc từng ngày, rất yên tâm","Nhịp em ổn định, nền tốt để bứt lên"],
   'unstable':["Số bán chưa ổn định, lúc cao lúc thấp","Nhịp còn trồi sụt","Số chưa đều giữa các ngày","Em bán lúc bùng lúc lặng, cần đều hơn","Nhịp còn phập phù","Số dao động mạnh, cần ổn định lại","Em chưa giữ được nhịp đều","Số lên xuống thất thường","Nhịp bán còn chưa chắc tay","Em cần bán đều tay hơn giữa các ngày","Số còn nhấp nhô","Nhịp chưa ổn, dễ hụt cuối kỳ","Em bán chưa đều, cần giữ nhịp","Số trồi sụt, mình chỉnh lại cho đều","Nhịp em còn hên xui, cần đều tay hơn","Số chưa chắc, dễ hụt nếu không giữ nhịp"]
  };
  var SGP=["Em đang làm tốt ở ","Điểm mạnh của em: ","Em bán ổn ở ","Em đang chắc tay ở ","Ngành em đang khỏe: ","Em đang lên số tốt ở ","Em giữ phong độ tốt ở ","Em đang dẫn nhóm ở ","Điểm sáng của em nằm ở ","Em bán rất tốt mảng ","Em đang về số đều ở ","Mảng em đang tốt: ","Em cầm trịch tốt ở ","Em đang bám target tốt ở ","Em đang có duyên với ","Ghi nhận em mạnh ở ","Em đang khai thác tốt ","Em làm chủ tốt mảng ","Em có phong độ tốt ở ","Đáng khen là em mạnh ở "];
  var NRP=[" sắp về số, cố thêm chút là đạt."," gần chạm target, đẩy nốt nhé."," sắp đạt, tập trung là về."," chỉ còn chút nữa là về đích."," gần tới rồi, ráng đẩy cho về."," sắp cán mốc, cố nốt hôm nay."," chỉ thiếu một nhịp là đạt."," gần đủ target, đẩy thêm là xong."," sắp về, đừng buông tay nhé."," còn chút xíu là chạm mốc."," gần đạt rồi, tập trung nốt."," sắp hoàn thành, cố lên nào."," chỉ cần thêm 1-2 đơn là về."," gần về đích, giữ nhịp là đạt."," sắp tới vạch, đẩy dứt điểm."," cận kề target, cố nốt cho chắc."," chỉ còn một bước là về đích."," gần đủ rồi, dồn lực hôm nay là đạt."," sắp chạm mốc, giữ tinh thần nhé."," gần về số, thêm quyết tâm là xong."];
  var ZRP=[" chưa có số — nắm chắc kiến thức sản phẩm để tư vấn nhé."," chưa phát sinh — em tìm hiểu thêm về sản phẩm ngành này."," đang trống — kiến thức ngành này ổn chưa, mình hỗ trợ thêm nhé."," chưa có đơn nào — em ôn lại tính năng để tự tin tư vấn."," chưa mở số — thử chủ động gợi ý khách mảng này."," còn 0 — em xem lại cách tiếp cận ngành này nhé."," chưa phát sinh — mình cùng luyện câu tư vấn cho mảng này."," đang bỏ trống — em để ý chào thêm ngành này với khách."," chưa có số — nắm giá và khuyến mãi để chào cho chắc."," chưa lên đơn — em thử combo ngành này với khách nhé."," còn trống — kiến thức mảng này em bồi thêm chút."," chưa có — em chủ động hỏi nhu cầu khách mảng này."," chưa phát sinh — mình xem sản phẩm chủ lực ngành này nhé."," đang 0 số — em tập chào ngành này mỗi khách."," chưa có đơn — nắm điểm mạnh sản phẩm để thuyết phục."," chưa mở — em đừng bỏ quên mảng này khi tư vấn."," còn 0 — em thử mở lời với mỗi khách về mảng này."," chưa phát sinh — mình cùng xem kịch bản tư vấn nhé."," đang trống — em nắm khuyến mãi để chào cho chắc."," chưa có số — chịu khó gợi ý thêm là sẽ có đơn."];
  var FOC=["Hôm nay tập trung thêm","Hôm nay ưu tiên đẩy","Hôm nay để ý thêm","Hôm nay mình cùng đẩy","Hôm nay bám thêm","Hôm nay chú trọng","Hôm nay dồn lực cho","Hôm nay nhớ đẩy","Hôm nay cố thêm mảng","Hôm nay tập trung khai thác","Hôm nay ráng lên số","Hôm nay đẩy mạnh","Hôm nay ưu tiên chốt","Hôm nay bám sát","Hôm nay quyết đẩy","Hôm nay mình dồn cho"];
  function _yd(yday){
    if(!(yday && yday>0)) return "";
    return pick('_','yd',[", hôm qua bán được ~"+gfmt(yday)+" tr",", hôm qua em chốt ~"+gfmt(yday)+" tr",", hôm qua đạt ~"+gfmt(yday)+" tr",", hôm qua em làm được ~"+gfmt(yday)+" tr",", ngày qua bán ~"+gfmt(yday)+" tr",", bữa qua em bán ~"+gfmt(yday)+" tr"]);
  }
  function msgRevenue(e, KY){
    var n=e.n, rr = KY>0 ? e.td/KY : 0;
    var tier = rr>=1.08?'top':(rr>=1.0?'ok':(rr>=0.88?'kha':(rr>=0.75?'cham':'yeu')));
    var mo=pick(n,'mo',MO[tier]), rcm=pick(n,'rc',RCP[e.rc]), stm=pick(n,'st',STB[e.st]);
    var yd=_yd(e.yday), fl=pick(n,'fl',FOC);
    return mo+", "+rcm+". "+stm+yd+". "+fl+" "+e.focustask+".";
  }
  function msgCategory(e){
    var n=e.n, parts=[];
    if(e.strong.length) parts.push(pick(n,'sg',SGP)+joinList(e.strong.slice(0,2))+".");
    if(e.near.length) parts.push(joinList(e.near.slice(0,1))+pick(n,'nr',NRP));
    if(e.zero.length) parts.push(joinList(e.zero.slice(0,1))+pick(n,'zr',ZRP));
    if(!parts.length) parts=[pick(n,'np',["Cần phủ đều thêm các ngành thi đua trong ngày.","Hôm nay cố mở số ở nhiều ngành thi đua hơn nhé.","Ráng phủ thêm vài ngành thi đua trong ngày.","Mình cùng phủ đều các ngành thi đua hôm nay.","Tập trung mở số thêm ở các ngành thi đua."])];
    return parts.slice(0,2).join(" ");
  }

  /* ================== BÀI TOÁN GIAO MỤC TIÊU (khớp analyze.py build_cards) ================== */
  function buildCards(root){
    var SM=root.supermarkets;
    // ngày: file chứa số chốt của ngày TRƯỚC ngày mới nhất
    var firstStore=Object.keys(SM)[0];
    var ld=keysSorted(SM[firstStore].history); ld=ld[ld.length-1];
    var p=ld.split('-'); var kd=new Date(+p[0],+p[1]-1,+p[2]); var chotd=new Date(kd.getTime()-86400000);
    var CHOT=chotd.getDate(); var DIM=new Date(chotd.getFullYear(),chotd.getMonth()+1,0).getDate();
    var REM=Math.max(1,DIM-CHOT); var KY=Math.round(CHOT/DIM*100);
    function ddmm(d){ var z=function(x){return (x<10?'0':'')+x;}; return z(d.getDate())+'/'+z(d.getMonth()+1); }
    var chotlbl=ddmm(chotd), nvlbl=ddmm(kd);
    var meta={CHOT:chotlbl, NHIEMVU:nvlbl, KY:KY, year:kd.getFullYear(), dateFull:nvlbl+'/'+kd.getFullYear()};
    NHIEMVU_STR=nvlbl;  // pick() xoay câu nhận xét theo ngày
    var out={}, focuslog={};

    STORES.forEach(function(S){
      if(!SM[S.name]){ return; }
      var A=analyzeMarket(SM,S.name); var emps=A.emps, rank=A.rank, sm=A.smfull;
      var rows=emps.slice().sort(function(a,b){ return rank[b].dtqd-rank[a].dtqd; });

      // CẦU NỐI CANONICAL (v9): matrix keyed theo tên targetInput; lũy kế lấy từ detailsInput qua gdisp; target = số siêu thị × alloc.
      var disp2dc={}; A.dcats.forEach(function(dc){ var g=gdisp(dc); if(g && disp2dc[g]===undefined) disp2dc[g]=dc; });
      var matrix={};
      emps.forEach(function(nm){ var a=A.supT?rank[nm].target/A.supT:0; var cells={};
        Object.keys(sm).forEach(function(c){ var g=gdisp(c); if(!g) return; var dc=disp2dc[g];
          var lk=dc?((A.matrix[nm][dc]&&A.matrix[nm][dc].lk)||0):0; var tg=sm[c].tg*a;
          cells[c]={lk:lk,tg:tg,ht:tg>0?Math.round(lk/tg*100):0}; });
        matrix[nm]=cells; });

      // ---- Tín hiệu bổ sung để chẩn đoán D sát thực tế hơn (đánh giá theo lịch sử NHIỀU
      // THÁNG đã lưu, không chỉ tháng hiện tại) ----
      var histAll = SM[S.name].history;
      // 1) Số tháng đã từng có doanh thu của mỗi NV (đếm qua toàn bộ lịch sử đã lưu) —
      //    dùng để biết mã NV cao có thật sự còn "mới" hay đã qua giai đoạn onboarding.
      var monthsOf={};
      Object.keys(histAll).forEach(function(dt){
        var ym=dt.slice(0,7); var r=parseRev(histAll[dt].revenueInput||'').emp;
        Object.keys(r).forEach(function(nm){ (monthsOf[nm]=monthsOf[nm]||{})[ym]=1; });
      });
      function monthsActive(nm){ return Object.keys(monthsOf[nm]||{}).length; }
      // 2) Xu hướng DÀI HẠN: so nhịp tháng này (tới nay) với nhịp cuối tháng liền trước —
      //    chỉ dùng làm ghi chú/điều chỉnh nhẹ, không tự ý lật D chỉ từ 1 tháng dữ liệu.
      function longTermTrend(nm,curMonthAvg){
        var yms=Object.keys(monthsOf[nm]||{}).sort();
        if(yms.length<2) return 'chua_du';
        var prevYm=yms[yms.length-2];
        var dsInMonth=Object.keys(histAll).filter(function(dt){ return dt.slice(0,7)===prevYm; }).sort();
        var lastDt=dsInMonth[dsInMonth.length-1]; if(!lastDt) return 'chua_du';
        var v=(parseRev(histAll[lastDt].revenueInput||'').emp||{})[nm]; if(v===undefined) return 'chua_du';
        var day=parseInt(lastDt.split('-')[2],10); if(!(day>0)) return 'chua_du';
        var prevRate=v/day; if(!(prevRate>0)) return 'chua_du';
        if(curMonthAvg>prevRate*1.15) return 'tang';
        if(curMonthAvg<prevRate*0.85) return 'giam';
        return 'on_dinh';
      }
      // 3) Năng lực = so nhịp bán TUYỆT ĐỐI với MẶT BẰNG CHUNG của siêu thị (không chỉ so
      //    với target cá nhân — tránh %HT ảo do được giao target thấp). Cam kết = có thêm
      //    tín hiệu % target được giao so với mặt bằng chung (NV được tin giao % cao hơn
      //    trung bình xem như tín hiệu cam kết/tín nhiệm cao hơn).
      var allocMap = SM[S.name].targetAllocation||{};
      var avgMonthAvg=0, avgAlloc=0;
      if(rows.length){
        avgMonthAvg = rows.reduce(function(a,nm){ return a+facets(A.series[nm],CHOT).monthAvg; },0)/rows.length;
        avgAlloc = rows.reduce(function(a,nm){ return a+(parseFloat(allocMap[nm])||0); },0)/rows.length;
      }

      // phong độ mỗi NV — chẩn đoán D1-D4 theo mô hình STRAM (Lãnh đạo Linh hoạt),
      // khớp đúng cách "Target Tuần" trong nv.html (classifyStramD) — xem skill dmx-stram-target.
      // D không phải thang tuyến tính D1<D2<D3<D4 mà là đường cong chữ U: D2 (vỡ mộng) là
      // đáy, không phải D1 (mới, còn nhiệt tình).
      var pdi={};
      rows.forEach(function(nm,ri){ var r=rank[nm]; var f=facets(A.series[nm],CHOT);
        var pct=r.target?r.dtqd/r.target*100:0;
        var soDiem=Object.keys(A.series[nm]).length;
        var code=empCode(nm), isNewHire=(code!==null && code>NEW_HIRE_CODE), soThang=monthsActive(nm);
        var xuHuongDaiHan=longTermTrend(nm,f.monthAvg);
        var d,pd;
        if(soDiem===0){ d='D1'; pd='Mới — cần xác nhận'; }
        else if(isNewHire && soThang<=2){ d='D1'; pd='Mới — nhân viên mới (mã NV)'; }
        else{
          var ratio = KY>0 ? pct/KY : (pct>0?2:0);   // %HT ÷ nhịp kỳ vọng chuẩn
          // Năng lực: nhịp bán của NV so với mặt bằng chung siêu thị. Cam kết: % target
          // được giao so với mặt bằng chung. Điều chỉnh NHẸ (tối đa ±15% / ±10%) quanh
          // tín hiệu chính %HT÷kỳ vọng — không để 2 biến phụ này lật ngược hoàn toàn D.
          var competenceRatio = avgMonthAvg>0 ? f.monthAvg/avgMonthAvg : 1;
          var allocRatio = avgAlloc>0 ? (parseFloat(allocMap[nm])||0)/avgAlloc : 1;
          var adj = ratio * clampv(1+0.15*(competenceRatio-1),0.85,1.15) * clampv(1+0.10*(allocRatio-1),0.9,1.1);
          if(adj>=1){ d='D4'; pd = f.st==='decline' ? 'Vững, cần giữ nhịp' : 'Tự lực — vượt nhịp'; }
          else if(adj>=0.85){ d='D3'; pd = f.st==='improve' ? 'Đang hồi phục tốt' : 'Vững, đang đà lên'; }
          else { d='D2'; pd = xuHuongDaiHan==='giam' ? 'Cần tiếp sức — nhiều tháng liền dưới nhịp' : 'Cần tiếp sức'; }
        }
        pdi[nm]={d:d,pd:pd,pct:pct,f:f,rank:ri+1,isNewHire:isNewHire,soThang:soThang,xuHuongDaiHan:xuHuongDaiHan};
      });

      // 23 nhóm cấp siêu thị (có target)
      var g23={}; Object.keys(sm).forEach(function(c){ if(gdisp(c)!==null && sm[c].tg>0) g23[c]=sm[c]; });
      var mlkcat=Object.keys(g23).filter(function(c){ return c.toLowerCase().indexOf('lọc không khí')!==-1; })[0]||null;
      // Bảo hiểm thợ ĐMX: luôn quan tâm giống MLK — nhắc bán mỗi ngày kể cả đã đạt target.
      // (KHÔNG phải ngành "Bảo hiểm" thường — 2 ngành riêng, số liệu khác hẳn nhau.)
      var bhcat=Object.keys(g23).filter(function(c){ return gdisp(c)==='Bảo hiểm thợ ĐMX'; })[0]||null;
      var carecats=[mlkcat,bhcat].filter(function(x){ return x; });
      function unitsNeed(c){ var con=Math.max(0,g23[c].tg-g23[c].lk); if(isQty(c)) return con; var pu=unitOf(gdisp(c)); return pu>0?con/pu:con; }

      // ---- Hệ số ngành do quản lý cài trong nv.html ("CHỌN HỆ SỐ NGÀNH HÀNG": 0.5/1/1.5/2)
      // = mức độ QUAN TRỌNG của ngành với siêu thị. Trước đây thẻ mục tiêu bỏ qua hoàn toàn,
      // nên nhóm trả góp (hệ số 2) gần như không bao giờ được giao. ----
      var coefN={}; var coefRaw=SM[S.name].coefficients||{};
      Object.keys(coefRaw).forEach(function(k){ var v=parseFloat(coefRaw[k]); if(v>0) coefN[_nz(k)]=v; });
      function hesoOf(c){ var v=coefN[_nz(c)]; return v>0?v:1; }

      // ---- Chuỗi ngày liên tiếp KHÔNG phát sinh số của từng ngành (cấp siêu thị, tháng này).
      // Ngành chết số dài ngày = cả siêu thị đã không còn bán được/không còn quan tâm — giao
      // tiếp cũng vô ích, nên hạ hẳn ưu tiên và nhường chỗ cho nhóm khả thi hơn. ----
      var curYm=ld.slice(0,7);
      var lkSeries={};
      Object.keys(histAll).filter(function(dt){ return dt.slice(0,7)===curYm; }).sort().forEach(function(dt){
        var tf=parseTargetFull(histAll[dt].targetInput||'');
        Object.keys(tf).forEach(function(c){ (lkSeries[c]=lkSeries[c]||{})[dt]=tf[c].lk; });
      });
      function streakOf(c){
        var byday=lkSeries[c]; if(!byday) return 0;
        var ds=keysSorted(byday), s=0;
        for(var i=ds.length-1;i>0;i--){ if(byday[ds[i]]-byday[ds[i-1]]<=0.0001) s++; else break; }
        return s;
      }
      // Ngành VỪA CÓ SỐ TRỞ LẠI sau chuỗi chết dài = cơ hội bất chợt: không đưa vào nhóm chính
      // (vì nền vẫn yếu) mà giao thêm cho NV giỏi kèm nhắc hỗ trợ siêu thị.
      function justRevived(c){
        var byday=lkSeries[c]; if(!byday) return false;
        var ds=keysSorted(byday); if(ds.length<3) return false;
        if(!(byday[ds[ds.length-1]]-byday[ds[ds.length-2]]>0.0001)) return false;
        var s=0;
        for(var i=ds.length-2;i>0;i--){ if(byday[ds[i]]-byday[ds[i-1]]<=0.0001) s++; else break; }
        return s>=4;
      }

      // Ngành coi như BỊ BỎ RƠI khi: chết số ≥7 ngày liên tiếp, HOẶC cả tháng chưa mở được số
      // nào mà đã ≥5 ngày liên tiếp im lặng (đầu tháng chưa đủ 7 ngày dữ liệu để chạm ngưỡng
      // trên, nhưng 0 đồng suốt 5 ngày đã đủ kết luận không ai bán).
      var DEAD_DAYS=7;
      function isDead(c){ var st=streakOf(c); return st>=DEAD_DAYS || (g23[c].lk<=0 && st>=5); }
      // Điểm ưu tiên = nhiều tín hiệu SONG SONG, không chỉ "dễ về số" như trước:
      //   ease  — còn cần ít đơn vị thì dễ chốt
      //   alive — còn đang bán được (chuỗi chết càng dài càng bị dìm)
      //   hệ số — mức độ quan trọng quản lý đã cài
      //   đà    — dự kiến cuối tháng, cộng thêm chút
      function opp(c){
        var ease=1/(1+unitsNeed(c)/3);
        var alive = isDead(c) ? 0.15 : 1/(1+streakOf(c)/4);
        return hesoOf(c)*(0.55*ease+0.45*alive) + clampv(g23[c].dk/100,0,1.5)*0.15;
      }
      var secure=Object.keys(g23).filter(function(c){ return g23[c].ht>=100 || g23[c].dk>=110; });
      var nonsecure=Object.keys(g23).filter(function(c){ return secure.indexOf(c)===-1 && !isHard(c); });
      var focusAll=nonsecure.slice().sort(function(a,b){ return opp(b)-opp(a); });
      var focus6=focusAll.slice(0,6);
      // Ngành vừa hồi sinh: đánh dấu "cơ hội" ở MỌI nơi nó xuất hiện (kể cả khi đã tự leo vào
      // nhóm chính), đồng thời được ưu tiên đứng trước nhóm dự phòng khi giao thêm cho NV giỏi.
      var revivedAll=nonsecure.filter(function(c){ return carecats.indexOf(c)===-1 && justRevived(c); })
                              .sort(function(a,b){ return hesoOf(b)-hesoOf(a); });
      var revived=revivedAll.filter(function(c){ return focus6.indexOf(c)===-1; }).slice(0,2);
      var backup=revived.concat(focusAll.filter(function(c){ return focus6.indexOf(c)===-1 && carecats.indexOf(c)===-1 && revived.indexOf(c)===-1 && !isDead(c); })).slice(0,3);
      focuslog[S.code]={chot:chotlbl, secure:secure.map(shortCat), focus:focus6.map(shortCat), backup:backup.map(shortCat), revived:revivedAll.map(shortCat)};

      // gán nhóm focus cho NV: phủ đủ nhu cầu siêu thị, người mạnh gánh nhiều
      var assigned={}; emps.forEach(function(nm){ assigned[nm]={}; });
      if(mlkcat) emps.forEach(function(nm){ assigned[nm][mlkcat]='mlk'; });
      if(bhcat) emps.forEach(function(nm){ assigned[nm][bhcat]='care'; });
      focus6.forEach(function(c){ if(carecats.indexOf(c)!==-1) return;
        emps.forEach(function(nm){ var cell=matrix[nm][c]||{}; var rem=(cell.tg||0)-(cell.lk||0); if(rem>0) assigned[nm][c]='focus'; });
      });

      // dựng dữ liệu thẻ từng NV
      var cards=[];
      rows.forEach(function(nm){
        var info=pdi[nm], d=info.d, w=STRAM_STRETCH[d], f=info.f, r=rank[nm], cells=matrix[nm];
        var cr={}; Object.keys(cells).forEach(function(c){ if(gdisp(c)!==null) cr[c]={lk:cells[c].lk,tg:cells[c].tg,ht:cells[c].ht,rem:r1(cells[c].tg-cells[c].lk)}; });
        var order=[]; if(mlkcat && assigned[nm][mlkcat]) order.push(mlkcat);
        if(bhcat && assigned[nm][bhcat]) order.push(bhcat);
        focus6.forEach(function(c){ if(assigned[nm][c] && carecats.indexOf(c)===-1) order.push(c); });
        var items=[], used={};
        order.forEach(function(c){ if(used[c]) return; used[c]=1; var cc=cr[c]; if(!cc) return;
          var label=gdisp(c), ismlk=(c===mlkcat)?1:0, iscare=(c===bhcat)?1:0, isrev=(revivedAll.indexOf(c)!==-1)?1:0;
          if(isQty(c)){ items.push({label:label,disp:'1 cái',chot:0,mlk:ismlk,care:iscare,cohoi:isrev,lk:Math.round(cc.lk),tg:Math.round(cc.tg),ht:cc.ht}); return; }
          var daily=r1(cc.rem/REM*w), up=unitOf(label); var disp = daily<up ? unitWord(label) : (daily.toFixed(1)+' tr');
          items.push({label:label,disp:disp,chot:0,mlk:ismlk,care:iscare,cohoi:isrev,lk:Math.round(cc.lk),tg:Math.round(cc.tg),ht:cc.ht});
        });
        // P2: NV mạnh (D4/D3) gánh thêm nhóm dự phòng — D2/D1 không gánh thêm, giữ vừa sức.
        // Nhóm vừa hồi sinh (revived) hiện chip "cơ hội" để nhắc bán thêm hỗ trợ siêu thị.
        if(d==='D4'||d==='D3'){ var bk = d==='D4'?backup:backup.slice(0,2);
          bk.forEach(function(c){ if(used[c]||!cr[c]) return; var cc=cr[c]; used[c]=1;
            var isrev=(revivedAll.indexOf(c)!==-1)?1:0;
            if(isQty(c)){ items.push({label:gdisp(c),disp:'1 cái',chot:1,mlk:0,cohoi:isrev,lk:Math.round(cc.lk),tg:Math.round(cc.tg),ht:cc.ht}); return; }
            var daily=r1(cc.rem/REM*w), up=unitOf(gdisp(c)); var disp = daily<up ? unitWord(gdisp(c)) : (daily.toFixed(1)+' tr');
            items.push({label:gdisp(c),disp:disp,chot:1,mlk:0,cohoi:isrev,lk:Math.round(cc.lk),tg:Math.round(cc.tg),ht:cc.ht});
          });
        }
        // Mục tiêu doanh thu/ngày = nhịp gần đây × hệ số stretch theo D (KHÔNG dùng
        // "còn lại ÷ ngày còn lại" làm công thức CHÍNH — phi thực tế với người đang chậm, xem
        // skill dmx-stram-target/target_formulas.md). Nhưng vẫn phải chạm sàn theo target được
        // giao: nếu nhịp vừa sức thấp hơn 55% mức cần để về đích, cả tháng sẽ không bao giờ
        // đuổi kịp target — nâng sàn lên, chặn trên 1.5x nhịp vừa sức để tránh sốc ngược.
        var dNgCapability = f.nhipGiao>0 ? f.nhipGiao*w : 0;
        var neededPace = REM>0 ? Math.max(0, r.target-r.dtqd)/REM : 0;
        var dNgFloor = Math.min(neededPace*0.55, dNgCapability*1.5);
        var dNg=Math.max(10,Math.round(Math.max(dNgCapability, dNgFloor)));
        var duKienCuoiThang=Math.round(r.dtqd + dNg*REM);
        var duDatTarget = duKienCuoiThang >= r.target*0.97;
        var crk=Object.keys(cr);
        var strong=crk.filter(function(c){ return cr[c].ht>=90 && cr[c].tg>=3; }).sort(function(a,b){ return cr[b].ht-cr[a].ht; }).slice(0,2).map(shortCat);
        var near=crk.filter(function(c){ return cr[c].ht>=60 && cr[c].ht<100; }).sort(function(a,b){ return cr[b].ht-cr[a].ht; }).slice(0,2).map(shortCat);
        var zero=crk.filter(function(c){ return cr[c].lk<=0 && cr[c].tg>=3; }).sort(function(a,b){ return cr[b].tg-cr[a].tg; }).slice(0,2).map(shortCat);

        var e={ n:nm.split(' - ')[0], d:d, pd:info.pd, td:info.pct, dat:Math.round(r.dtqd), tgt:r.target, dNg:dNg,
                duKien:duKienCuoiThang, duDat:duDatTarget,
                big:(r.target>=800), rank:info.rank, monthAvg:f.monthAvg, recent:f.recent, yday:f.yday, st:f.st, rc:f.rc,
                strong:strong, near:near, zero:zero, tasks:items };
        // focustask = nhóm 'tr' lớn nhất, không thì máy lọc không khí
        var trs=items.filter(function(t){ return t.disp.indexOf('tr')!==-1; });
        e.focustask = trs.length ? trs.reduce(function(a,b){ return parseFloat(b.disp)>parseFloat(a.disp)?b:a; }).label.replace(' (x2)','') : 'máy lọc không khí';
        e.msg1=msgRevenue(e,KY); e.msg2=msgCategory(e);
        // Ưu tiên nhận xét AI nếu có (NXAI.compute đã chạy trước); lỗi/không có -> giữ template.
        try{ if(window.NXAI&&NXAI.get){ var _ax=NXAI.get(e.n); if(_ax&&_ax[0])e.msg1=_ax[0]; if(_ax&&_ax[1])e.msg2=_ax[1]; } }catch(_ex){}
        cards.push(e);
      });
      out[S.code]=cards;
    });
    return {meta:meta, stores:out, focuslog:focuslog};
  }

  /* =================================================================== */
  /* ================== VẼ THẺ BẰNG CANVAS (khớp light_render.py) ======= */
  /* =================================================================== */
  var S=3, ZOOM=1.42;
  var BG=[238,241,245], WHITE=[255,255,255], INK=[30,41,59], SUB=[100,116,139], LINE=[226,232,240];
  var GREEN=[22,163,74], AMBER=[217,119,6], RED=[220,38,38], BLUE=[29,78,216], GOLD=[180,120,10], MSGRED=[190,40,40], PURPLE=[126,34,206];
  // Màu theo D (STRAM) — khớp STRAM_CARD_COLOR trong nv.html/Target Tuần: D4 xanh, D3 cam, D2 đỏ, D1 xám.
  var COL={D4:[22,163,74],D3:[224,139,26],D2:[220,38,38],D1:[100,116,139]}, PILLBG={D4:[220,252,231],D3:[255,237,213],D2:[254,226,226],D1:[241,245,249]};
  var CW=820, CHIPH=104;
  function rgb(t){ return 'rgb('+t[0]+','+t[1]+','+t[2]+')'; }
  function F(s,b){ return (b?'bold ':'')+(s*S)+'px Arial, "Segoe UI", Roboto, sans-serif'; }
  function anc(a){ if(!a) return ['left','top']; var h={l:'left',m:'center',r:'right'}[a[0]]; var v={a:'top',m:'middle',s:'alphabetic',d:'bottom'}[a[1]]; return [h,v]; }

  var mcanvas=document.createElement('canvas'); var mctx=mcanvas.getContext('2d');
  function measure(str,font){ mctx.font=font; return mctx.measureText(str).width; }
  function fit(str,font,w){ while(measure(str,font)>w*S && str.length>2) str=str.slice(0,-2); return str; }
  function wrapn(str,font,w,maxl){ var words=str.split(' '), lines=[], cur='';
    for(var i=0;i<words.length;i++){ var t=(cur+' '+words[i]).trim(); if(measure(t,font)<=w*S) cur=t; else { lines.push(cur); cur=words[i]; if(lines.length>=maxl) break; } }
    if(cur && lines.length<maxl) lines.push(cur); return lines; }
  function htc(v){ return v>=100?GREEN:(v>=50?AMBER:RED); }

  // hàm vẽ theo ctx hiện thời
  var ctx=null;
  function T(x,y,str,font,fill,a){ ctx.font=font; ctx.fillStyle=rgb(fill); var m=anc(a); ctx.textAlign=m[0]; ctx.textBaseline=m[1]; ctx.fillText(str, x*S, y*S); }
  function RR(box,r,fill,outline,width){ var x0=box[0]*S,y0=box[1]*S,x1=box[2]*S,y1=box[3]*S; ctx.beginPath(); ctx.roundRect(x0,y0,x1-x0,y1-y0,r*S); if(fill){ ctx.fillStyle=rgb(fill); ctx.fill(); } if(outline){ ctx.strokeStyle=rgb(outline); ctx.lineWidth=(width||1)*S; ctx.stroke(); } }
  function LN(x0,y0,x1,y1,fill,width){ ctx.beginPath(); ctx.moveTo(x0*S,y0*S); ctx.lineTo(x1*S,y1*S); ctx.strokeStyle=rgb(fill); ctx.lineWidth=width*S; ctx.stroke(); }

  function m1l(e){ return wrapn(e.msg1,F(12.5),CW-44,2); }
  function m2l(e){ return wrapn(e.msg2,F(12.5),CW-44,2); }
  function cardH(e){ return 58+58 + (e.duDat===false?18:0) + m1l(e).length*18 + m2l(e).length*18 + 8 + 64 + CHIPH + 22; }

  function drawCard(x,y,e,KY){
    var W=CW, acc=COL[e.d], H=cardH(e);
    RR([x,y,x+W,y+H],14,WHITE,LINE,1);
    RR([x,y,x+9,y+H],14,acc,null,0);
    T(x+24,y+30, fit(e.n,F(23,true),W-240), F(23,true), INK,'lm');
    RR([x+W-196,y+15,x+W-18,y+50],16,PILLBG[e.d],null,0);
    T(x+W-107,y+32, e.pd, F(12,true), acc,'mm');
    var yy=y+58;
    T(x+24,yy+14,"TIẾN ĐỘ THÁNG",F(12,true),SUB,'lm');
    T(x+W-24,yy+14, e.td.toFixed(1)+"%  ·  kỳ vọng "+KY+"%", F(12,true), INK,'rm');
    var bx=x+24, bw=W-48, by=yy+28;
    RR([bx,by,bx+bw,by+12],6,[230,235,240],null,0);
    var fw=Math.max(6,Math.min(bw,bw*e.td/100)); RR([bx,by,bx+fw,by+12],6,acc,null,0);
    var mx=bx+bw*KY/100; LN(mx,by-3,mx,by+15,[51,65,85],2);
    T(x+24,by+30,"Đã đạt: "+e.dat+" / "+e.tgt+" tr",F(14,true),INK,'lm');
    yy=by+48;
    if(e.duDat===false){
      T(x+24,yy,fit("⚠ Theo nhịp này, dự kiến cuối tháng chỉ "+e.duKien+" tr — chưa đủ target.",F(11,true),W-48),F(11,true),RED,'lm');
      yy+=18;
    }
    m1l(e).forEach(function(ln){ T(x+24,yy,ln,F(12.5),acc,'lm'); yy+=18; });
    m2l(e).forEach(function(ln){ T(x+24,yy,ln,F(12.5),MSGRED,'lm'); yy+=18; });
    yy+=10;
    T(x+24,yy+26,"NHIỆM VỤ HÔM NAY",F(14,true),INK,'lm');
    // badge mục tiêu doanh thu ngày (gradient indigo)
    var bw2=346, bx2=x+W-24-bw2, by2=yy;
    var g=ctx.createLinearGradient(0,by2*S,0,(by2+56)*S); g.addColorStop(0,'rgb(99,102,241)'); g.addColorStop(1,'rgb(67,56,202)');
    ctx.beginPath(); ctx.roundRect(bx2*S,by2*S,(x+W-24-bx2)*S,56*S,14*S); ctx.fillStyle=g; ctx.fill();
    RR([bx2,by2,x+W-24,by2+56],14,null,[67,56,202],1);
    T(bx2+22,by2+19,"MỤC TIÊU DOANH THU HÔM NAY",F(11.5,true),[224,231,255],'lm');
    T(x+W-46,by2+33, e.dNg+" tr", F(32,true), WHITE,'rm');
    yy+=64;
    var n=e.tasks.length, gap=10, cw=(W-40-gap*(n-1))/n;
    e.tasks.forEach(function(t,i){
      var cx=x+20+i*(cw+gap), ch=CHIPH, mlk=t.mlk, chot=t.chot, care=t.care, cohoi=t.cohoi;
      var bg=mlk?[255,251,235]:(care?[239,246,255]:(cohoi?[250,245,255]:[248,250,252]));
      var bd=mlk?[245,158,11]:(care?[59,130,246]:(cohoi?[147,51,234]:LINE));
      RR([cx,yy,cx+cw,yy+ch],10,bg,bd,(mlk||care||cohoi)?2:1);
      // Nhãn chip rút gọn còn tối đa 2 "từ" để wrapn(maxl=2) không nuốt mất chữ cuối, và để
      // 3 nhóm trả chậm không hiện y hệt nhau ("Trả chậm" + biến thể).
      var nm=t.label.replace(' (x2)','').replace('Điện thoại ','ĐT ')
        .replace('Máy lọc không khí','Lọc khí')
        .replace('Bảo hiểm thợ ĐMX','BH thợ')
        .replace('Trả chậm HomeCredit','TC Home')
        .replace('Trả chậm FE/Shinhan','TC FE-SHB')
        .replace('Trả chậm ĐM&GD','TC ĐM-GD')
        .replace('Đồng hồ-Phụ kiện','ĐH-Phụ kiện');
      var nl=wrapn(nm,F(11,true),cw-14,2); var ty=yy+16-(nl.length-1)*7;
      nl.forEach(function(ln){ T(cx+cw/2,ty,ln,F(11,true),INK,'mm'); ty+=13; });
      if(mlk) T(cx+cw/2,yy+40,"x2",F(11,true),GOLD,'mm');
      else if(care) T(cx+cw/2,yy+40,"quan tâm",F(10,true),BLUE,'mm');
      else if(cohoi) T(cx+cw/2,yy+40,"cơ hội",F(10,true),PURPLE,'mm');
      else if(chot) T(cx+cw/2,yy+40,"chốt nốt",F(10,true),GREEN,'mm');
      var big = t.disp.indexOf('cái')!==-1 || t.disp.indexOf('đơn')!==-1 || t.disp.indexOf('lượt')!==-1;
      var dcol = (t.disp.indexOf('cái')!==-1||t.disp.indexOf('đơn')!==-1)?GREEN:BLUE;
      T(cx+cw/2,yy+60,t.disp,F(big?15:17,true),dcol,'mm');
      T(cx+cw/2,yy+78,t.lk+"/"+t.tg+" · "+t.ht+"%",F(10),SUB,'mm');
      var bbx=cx+12,bbw=cw-24,bby=yy+90;
      RR([bbx,bby,bbx+bbw,bby+6],3,[230,235,240],null,0);
      var ff=Math.max(3,Math.min(bbw,bbw*Math.min(t.ht,100)/100)); RR([bbx,bby,bbx+ff,bby+6],3,htc(t.ht),null,0);
    });
    return H;
  }

  function groupsOf(lst,mx){ mx=mx||2; var n=lst.length; if(n<=mx) return [lst];
    var ng=Math.ceil(n/mx), base=Math.floor(n/ng), rem=n%ng, out=[], i=0;
    for(var g=0;g<ng;g++){ var sz=base+(g<rem?1:0); out.push(lst.slice(i,i+sz)); i+=sz; } return out; }

  function renderStore(code, cards, meta){
    var grps=groupsOf(cards,2), PAD=24, GAP=18, HDR=96, results=[];
    grps.forEach(function(g,gi){
      var W=PAD*2+CW; var total=g.reduce(function(a,e){ return a+cardH(e)+GAP; },0)-GAP; var H=HDR+PAD+total+36;
      var render=document.createElement('canvas'); render.width=Math.round(W*S); render.height=Math.round(H*S);
      ctx=render.getContext('2d'); ctx.fillStyle=rgb(BG); ctx.fillRect(0,0,render.width,render.height);
      RR([0,0,W,HDR],0,[15,23,42],null,0);
      T(W/2,26,"THẺ MỤC TIÊU NHÂN VIÊN — "+MNAME[code],F(23,true),[255,210,63],'ma');
      T(W/2,54,"Số chốt hết ngày "+meta.CHOT+"  ·  Nhiệm vụ hôm nay "+meta.NHIEMVU+"  ·  Nhóm "+(gi+1)+"/"+grps.length,F(12),[203,213,225],'ma');
      T(W/2,74,fit(PRIORITY[code],F(11),W-40),F(11,true),[235,200,90],'ma');
      var yy=HDR+PAD;
      g.forEach(function(e){ drawCard(PAD,yy,e,meta.KY); yy+=cardH(e)+GAP; });
      T(PAD,H-22,"Nguồn: BI TGDĐ · MT ngành/ngày = còn lại ÷ ngày còn lại; nếu < giá 1 món thì để '1 cái/đơn' · Số dưới chip = lũy kế/target · %HT · Triệu đồng",F(10),SUB);
      // hạ xuống ZOOM cho mượt + nhẹ file
      var fin=document.createElement('canvas'); fin.width=Math.round(W*ZOOM); fin.height=Math.round(H*ZOOM);
      var fctx=fin.getContext('2d'); fctx.imageSmoothingEnabled=true; fctx.imageSmoothingQuality='high';
      fctx.drawImage(render,0,0,render.width,render.height,0,0,fin.width,fin.height);
      results.push(fin);
    });
    return results;
  }

  // Vẽ MỘT thẻ, KHÔNG có banner tiêu đề siêu thị/nhóm — dùng cho trang xem 1 nhân viên
  // (nv.html/Trang Cá Nhân NV), nơi tiêu đề riêng được dựng bằng HTML bên ngoài canvas.
  function renderSingleCard(e, KY){
    var PAD=24, W=PAD*2+CW, H=PAD*2+cardH(e);
    var render=document.createElement('canvas'); render.width=Math.round(W*S); render.height=Math.round(H*S);
    ctx=render.getContext('2d'); ctx.fillStyle=rgb(BG); ctx.fillRect(0,0,render.width,render.height);
    drawCard(PAD,PAD,e,KY);
    var fin=document.createElement('canvas'); fin.width=Math.round(W*ZOOM); fin.height=Math.round(H*ZOOM);
    var fctx=fin.getContext('2d'); fctx.imageSmoothingEnabled=true; fctx.imageSmoothingQuality='high';
    fctx.drawImage(render,0,0,render.width,render.height,0,0,fin.width,fin.height);
    return fin;
  }

  /* ================== MD5 (để pick() câu nhận xét trùng bản Python) ================== */
  function md5(s){
    s=unescape(encodeURIComponent(s));
    function add32(a,b){ return (a+b)&0xFFFFFFFF; }
    function cmn(q,a,b,x,sft,t){ a=add32(add32(a,q),add32(x,t)); return add32((a<<sft)|(a>>>(32-sft)),b); }
    function ff(a,b,c,d,x,s,t){ return cmn((b&c)|((~b)&d),a,b,x,s,t); }
    function gg(a,b,c,d,x,s,t){ return cmn((b&d)|(c&(~d)),a,b,x,s,t); }
    function hh(a,b,c,d,x,s,t){ return cmn(b^c^d,a,b,x,s,t); }
    function ii(a,b,c,d,x,s,t){ return cmn(c^(b|(~d)),a,b,x,s,t); }
    function cycle(x,k){ var a=x[0],b=x[1],c=x[2],d=x[3];
      a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);
      a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);
      a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);
      a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);
      a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);
      a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);
      a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);
      a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);
      a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);
      a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);
      a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189);
      a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651);
      a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);
      a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);
      a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);
      a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551);
      x[0]=add32(a,x[0]);x[1]=add32(b,x[1]);x[2]=add32(c,x[2]);x[3]=add32(d,x[3]); }
    function blk(s,i){ var m=[]; for(var j=0;j<64;j+=4) m[j>>2]=s.charCodeAt(i+j)+(s.charCodeAt(i+j+1)<<8)+(s.charCodeAt(i+j+2)<<16)+(s.charCodeAt(i+j+3)<<24); return m; }
    var n=s.length, state=[1732584193,-271733879,-1732584194,271733878], i;
    for(i=64;i<=n;i+=64) cycle(state,blk(s,i-64));
    s=s.substring(i-64);
    var tail=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    for(i=0;i<s.length;i++) tail[i>>2]|=s.charCodeAt(i)<<((i%4)<<3);
    tail[i>>2]|=0x80<<((i%4)<<3);
    if(i>55){ cycle(state,tail); for(i=0;i<16;i++) tail[i]=0; }
    tail[14]=n*8; cycle(state,tail);
    function rhex(nn){ var h='',j; for(j=0;j<4;j++) h+=((nn>>(j*8+4))&0x0F).toString(16)+((nn>>(j*8))&0x0F).toString(16); return h; }
    return state.map(rhex).join('');
  }

  window.MucTieuCard = { STORES: STORES, MNAME: MNAME, PRIORITY: PRIORITY, buildCards: buildCards, renderStore: renderStore, renderSingleCard: renderSingleCard, cardH: cardH, drawCard: drawCard, groupsOf: groupsOf };

})();
