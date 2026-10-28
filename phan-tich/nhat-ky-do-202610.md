# Nhật ký dò bảng gán tháng 202610

Mỗi ngày một mục. Công cụ: `node phan-tich/kiem-bang-gan.js --thang 202610`.
Bảng 202610 chép từ 202609 ngày 24/09/2026; mọi quy tắc đang "CHƯA KIỂM tháng 10",
heSoSP (tủ lạnh 37 mẫu) chép sang chỉ là tạm — danh sách thi đua hãng có thể đã đổi.

## 01/10/2026 (lượt chạy 11h03 giờ VN)

Dữ liệu: **chưa có** — `kiem-bang-gan.js` báo "Không kho nào vừa có gói vừa có dòng
hàng"; `gom-du-lieu-thang.js` ra 0 kho · 0 dòng; `luu-chua-khop.js` ghi tệp
chua-khop-202610.json rỗng (khung sẵn để các ngày sau cộng dồn).

- Bảng tóm tắt quy tắc: chưa kiểm được (0 kho có số).
- Quy tắc mới thêm: không (đầu tháng, dưới 3 ngày dữ liệu — theo luật chỉ ghi nhật ký).
- Mẫu hệ số ×1,2 mới học: không.
- Quy tắc bị đánh dấu: không.
- Chương trình còn chưa có quy tắc: chưa biết — danh mục chương trình tháng 10 chưa
  xuất hiện trong gói số.

Việc của các lượt sau: khi đủ ≥3 ngày và ≥5 kho có số, kiểm lại cả 32 quy tắc; quy tắc
có heSoSP mà kho đang khớp lại lệch thì học lại từ đầu (không truyền --biet).

## 01/10/2026 (lượt chạy 23h50 giờ VN)

Dữ liệu: vẫn **chưa kiểm được** — `kiem-bang-gan.js` lại báo "Không kho nào vừa có gói
vừa có dòng hàng". Soi nguyên nhân (khác lượt 11h03):
- Dòng hàng tháng 10 **đã có**: 556 dòng ycx_lines ngày 01/10 (cữ đẩy mới nhất 22h27 VN).
- Gói rt_thidua ngày 01/10 của 11 cụm (1043, 10715, 1122, 12947, 1359, 14285, 1430, 15885,
  28686, 3935, 631) đều có siêu thị nhưng **0 chương trình thi đua** (ct rỗng) — danh mục
  thi đua tháng 10 chưa lên baocao ngày đầu tháng. 7 cụm còn lại gói vẫn đứng ở tháng 9.
- `gom-du-lieu-thang.js` 0 kho · 0 dòng; `luu-chua-khop.js` chỉ cập nhật giờ (0 quy tắc,
  0 chương trình).

- Bảng tóm tắt quy tắc: chưa kiểm được.
- Quy tắc mới thêm: không. Mẫu hệ số ×1,2 mới học: không. Quy tắc bị đánh dấu: không.
- Chương trình còn chưa có quy tắc: chưa biết — chờ danh mục tháng 10 xuất hiện trong gói.

## 02/10/2026 (lượt chạy 11h36 giờ VN, anh Phong bấm chạy tay)

Dữ liệu: danh mục thi đua tháng 10 **đã xuất hiện**: gói ngày 02/10 của 7 cụm (1043, 1122, 12947,
15885, 28686, 3935 + 311/781/8966) có 22–36 chương trình; 9 kho dùng được, 413 dòng
(ngày 01–02/10). Mọi chương trình đổi tên sang tiền tố **"T10 - …"** nên 31 quy tắc tháng 9
không còn trùng tên chương trình nào ("tháng này không có chương trình này"). Chỉ quy tắc
"T09 - T10 IPHONE 18 series, iPhone Duo" còn trùng tên: 0/9 — đúng ra phải thế, vì số cần
là LUỸ KẾ TỪ THÁNG 9 (vd 1043 cần 2359,69 mà dòng tháng 10 chỉ 101,83). Trang realtime chỉ
dùng quy tắc để chia số TRONG NGÀY nên không bị ảnh hưởng.

Dưới 3 ngày dữ liệu ⇒ theo luật CHƯA sửa bảng gán. Đã THỬ (bản nháp ngoài repo) gắn quy tắc
tháng 9 sang tên T10 tương ứng, kết quả để các lượt sau dùng:

| Tên T10 | dùng quy tắc tháng 9 | khớp (kho) | ghi chú |
|---|---|---|---|
| T10 - CAMERA | Camera | 9/9 | |
| T10 - LAPTOP | Laptop (trừ Apple) | 9/9 | |
| T10 - SIM TỔNG | SIM tổng | 9/9 | |
| T10 - ĐIỆN THOẠI & TABLET ANDROID | cùng tên | 9/9 | |
| T10 - TAI NGHE | TAI NGHE | 9/9 | |
| T10 - ĐIỆN THOẠI VIVO | Điện thoại Vivo | 9/9 | |
| T10 - QUẠT GIÓ | QUẠT GIÓ | 4/4 | |
| T10 - MÁY GIẶT | Máy giặt | 4/4 | |
| T10 - MÁY LỌC NƯỚC | MÁY LỌC NƯỚC | 4/4 | |
| T10 - Máy Lạnh | T09 - Máy Lạnh | 4/4 | |
| T10 - ĐỒNG HỒ | Đồng hồ | 3/3 | |
| T10 - CÁP - SẠC | Cáp - Sạc | 8/9 | 311 dư 0,38 |
| T10 - SẠC DỰ PHÒNG | SẠC DỰ PHÒNG | 8/9 | 781 dư 2,36 |
| T10 - ĐIỆN THOẠI REALME | Điện thoại realme | 8/9 | 781 dư 14,65 (cần 0) |
| T10 - SIM MOBIFONE/SIM DMX | SIM MOBIFONE/VINAPHONE/SIM DMX | 6/7 | 781 dư 3 (cần 0) |
| T10 - NỒI CƠM & NỒI CHIÊN | Nồi cơm - nồi chiên | 3/4 | 8966 cần −0,09 (đơn trả) |
| T10 - TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT | cùng tên (heSoSP 37 mẫu) | 3/4 | 3935 hụt 28,31 — nghi hệ số mẫu tháng 10 đổi |
| T10 - TIVI | ĐIỆN TỬ (ngành 304) | 3/4 | 3935 dư 21,47 (cần 0) — TIVI hẹp hơn ngành 304 |
| T10 - TRẢ CHẬM HOMECREDIT + FE/SHINHAN/SAMSUNG | gộp như tháng 9 | tổng HC+FE: 15885 khớp (119,42); 311, 781, 3935 dư | |
| T10 - TABLET ANDROID VÀ MÁY ĐỌC SÁCH | TABLET ANDROID | 2/9 | số cần TRÙNG số "ĐT & tablet" ở 1122/311/15885/3935 — lạ, chờ thêm ngày |
| T10 - PHỤ KIỆN IT - NHÓM KHÁC | danh sách mã tháng 9 | 1/9 | danh sách mã đã đổi, phải dò lại |

Kho 781 lệch ở nhiều chương trình cùng lúc (dư) — có thể gói 781 chưa cập nhật kịp, xem lại khi có thêm ngày.

- Quy tắc mới thêm: không (dưới 3 ngày). Mẫu hệ số ×1,2 mới học: không. Quy tắc bị đánh dấu: không.
- Chương trình hàng hoá chưa có quy tắc nào để thử: T10 - AUDIO, T10 - HÚT BỤI, T10 - PANASONIC
  (3935 = 258,74). Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_ICT, Bảo hiểm tổng, Mở thẻ tín dụng,
  Nạp - rút tiền, VAS, Vay tiền mặt.

Việc của lượt sau (từ 03/10, đủ 3 ngày): đổi tên/thêm quy tắc T10 theo bảng trên cho những dòng
khớp từ 5 kho trở lên; dò AUDIO, HÚT BỤI, PANASONIC, PHỤ KIỆN IT; học lại heSoSP tủ lạnh từ đầu.

## 02/10/2026 (11h50, sửa tay theo yêu cầu anh Phong — realtime cần hiện ngành tháng 10 ngay)

Đổi luật "dưới 3 ngày chưa sửa": anh Phong cần realtime chia được ngành tháng 10 ngay, nên
đã ĐỔI TÊN quy tắc tháng 9 sang tên T10 (trường `tenThang9` giữ tên cũ) và thêm quy tắc mới.
Kiểm bằng `kiem-bang-gan.js` trên 9 kho (dữ liệu 01/10): mọi quy tắc T10 khớp mọi kho trừ
các dòng đã ghi trong `kiem` từng quy tắc.

- Đổi tên (khớp): CAMERA 9/9, LAPTOP 9/9, SIM TỔNG 9/9, ĐT & TABLET ANDROID 8/9, TAI NGHE 8/9,
  VIVO 9/9, QUẠT GIÓ 4/4, MÁY GIẶT 4/4, MÁY LỌC NƯỚC 4/4, Máy Lạnh 4/4, ĐỒNG HỒ 3/3,
  CÁP - SẠC 8/9, SẠC DỰ PHÒNG 8/9, REALME 8/9, SIM MOBIFONE/SIM DMX 6/7, NỒI CƠM &  NỒI CHIÊN 3/4
  (tên có HAI dấu cách như baocao), TỦ LẠNH 3/4, ĐIỆN TỬ TCL 4/4 (từ Tivi TCL),
  PHỤ KIỆN CÔNG NGHỆ 8/8, MÁY NƯỚC NÓNG FERROLI 4/4 (thêm hãng Ferroli), trả chậm HC + FE (gộp như cũ).
- Sửa: T10 - TIVI = NHÓM 1094 Tivi LED (thay ngành 304) — 4/4; 3935 có soundbar mà TIVI = 0.
- Mới: T10 - HÚT BỤI = nhóm 4439+4155+7459 (4/4; nhóm 956 không thuộc); T10 - AUDIO = nhóm
  875/880/1031/4779 với hệ số chung `heSo: 1.5` (3935: soundbar 2,39 × 1,5 = 3,58 — realtime.html,
  kiem-bang-gan.js, luu-chua-khop.js đã hiểu trường heSo); T10 - MÁY SẤY & MÁY RỬA CHÉN = nhóm
  3659+3859 (chưa có bằng chứng dương); T10 - TABLET ANDROID VÀ MÁY ĐỌC SÁCH = TẠM dùng bộ lọc
  ĐT & TABLET ANDROID vì baocao trả số TRÙNG chương trình đó ở 6/9 kho (7/9 khớp).
- CHƯA dò được: PHỤ KIỆN IT - NHÓM KHÁC (số cần lớn hơn cả ngành 16 của kho — chương trình
  ôm ngoài ngành phụ kiện), PANASONIC (3935 cần 258,74 mà dòng Panasonic chỉ 48).

Việc của lượt sau: kiểm lại các quy tắc T10 hằng ngày như thường lệ (trường `kiem`); học lại
heSoSP TỦ LẠNH từ đầu (3935 hụt 28,31); dò PHỤ KIỆN IT - NHÓM KHÁC, PANASONIC, AUDIO (nhóm loa
chưa có bằng chứng), TABLET + MÁY ĐỌC SÁCH (xem baocao có sửa số trùng không).

## 02/10/2026 (19h, kiểm lại theo yêu cầu anh Phong — 20 kho, 1.099 dòng)

Tóm tắt: **31/36 quy tắc đúng ở mọi kho**. 20/20: CAMERA, LAPTOP, SIM TỔNG, TAI NGHE, trả chậm
HC+FE (gộp). 11/11: FERROLI, QUẠT GIÓ, MÁY GIẶT, TIVI, ĐIỆN TỬ TCL, HÚT BỤI, MÁY SẤY & RỬA CHÉN,
AUDIO (sau khi sửa). 7/7 ĐỒNG HỒ.

- Sửa: T10 - AUDIO bỏ nhóm 1031 Loa di động (631 bán loa Xiaomi 2,49 mà AUDIO = 0) → 11/11.
- Lệch còn lại: ĐT & TABLET ANDROID 17/20 (1902, 5263, 8592 dư — nghi không tính ĐT phổ thông
  nhóm 18 Masstel); TABLET + MÁY ĐỌC SÁCH 14/20; CÁP - SẠC 18/20; SẠC DỰ PHÒNG 18/20 (396, 781);
  VIVO 19/20 (8592 dư); REALME 19/20 (781); SIM MOBIFONE 14/16; TỦ LẠNH 10/11 (3935 hụt 2,79);
  MÁY LỌC NƯỚC 10/11 (631 cần −12,70: đơn trả); Máy Lạnh 10/11; NỒI CƠM 10/11 (8966 đơn trả).
- PANASONIC: kho KHÔNG bán Panasonic vẫn có số (396 = 31,14; Ngọc Thụy 21,01; 8874 23,88) ⇒
  không đo bằng dòng tháng 10; nghi cộng dồn từ tháng 9.
- Chưa có quy tắc: PANASONIC, PHỤ KIỆN IT - NHÓM KHÁC + dịch vụ thu hộ.
- Lịch dò hằng ngày đã được cập nhật hướng dẫn cho tháng 10 (đổi tên ngay khi sang tháng,
  heSo, danh sách việc còn mở).

## 02/10/2026 (lượt dò hằng ngày 22h40 giờ VN — 20 kho, 1.186 dòng)

Gói số vẫn là cữ trưa 02/10 nên phần lớn giống lượt 19h. Tóm tắt: **31/36 quy tắc đúng ở mọi kho**
(8 quy tắc tên tháng 9 "tháng này không có chương trình").

| Quy tắc | khớp | ghi chú |
|---|---|---|
| CAMERA, LAPTOP, SIM TỔNG, TAI NGHE, trả chậm HC+FE (gộp) | 20/20 | |
| FERROLI, QUẠT GIÓ, TỦ LẠNH, MÁY GIẶT, TIVI, ĐIỆN TỬ TCL, HÚT BỤI, AUDIO, MÁY SẤY & RỬA CHÉN | 11/11 | TỦ LẠNH: 3935 nay đã khớp |
| ĐỒNG HỒ | 7/7 | |
| REALME 19/20 · VIVO 19/20 · CÁP - SẠC 18/20 · SẠC DỰ PHÒNG 18/20 | | 781 / 8592 / 8592+311 / 396+781 |
| ĐT & TABLET ANDROID | 17/20 | 8592, 1902, 5263 dư |
| PHỤ KIỆN CÔNG NGHỆ 15/16 · SIM MOBIFONE 14/16 · TABLET + MÁY ĐỌC SÁCH 14/20 | | |
| NỒI CƠM 10/11 · MÁY LỌC NƯỚC 10/11 · Máy Lạnh 10/11 | | đơn trả (8966, 631); 396 cần 1 máy |
| T09 - T10 IPHONE 18 | 0/20 | cộng dồn từ tháng 9 — bình thường |

Đã thử, đều KHÔNG ra (ghi lại để khỏi dò lại):
- ĐT & TABLET ANDROID bỏ nhóm 18 (ĐT phổ thông): **bác** — 5 kho đang khớp (8572, 311, 1359, 142,
  15885) đều có máy nhóm 18 trong số. Manh mối mới ở 8592: ĐT dư 2,99, VIVO dư 5,74, hiệu = đúng
  vivo Y05 2,74 ⇒ nghi máy vivo Y39 trả góp (6,54) được baocao tính ~3,54. Chờ thêm ngày.
- PANASONIC cộng dồn từ tháng 9: **bác** — lấy dòng Panasonic từ mọi ngày bắt đầu 01/09…01/10,
  không mốc nào khớp quá 1/11 kho; 1122 bán Panasonic 22 tr cuối tháng 9 mà cần 0; 631 bán máy giặt
  Panasonic 8,79 tháng 10 mà cần 2,09; 396 bán 12,12 cuối tháng 9 mà cần 31,14. Số PANASONIC cũng
  không trùng chương trình hay ngành nào khác. Còn mở.
- PHỤ KIỆN IT - NHÓM KHÁC: không trùng chương trình/ngành nào. Còn mở — chờ chua-khop có ≥2 ngày gói.

- Quy tắc mới/sửa: không. Mẫu hệ số ×1,2 mới học: không (tủ lạnh đã khớp 11/11, chưa cần học lại).
- Quy tắc bị đánh dấu: không (chưa quy tắc nào tụt dưới nửa số kho hai ngày liền).
- Chưa có quy tắc (hàng hoá): PANASONIC, PHỤ KIỆN IT - NHÓM KHÁC. Dịch vụ thu hộ bỏ qua: Bảo hiểm
  thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS, Vay tiền mặt, Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 02/10 (16 quy tắc lệch/từng lệch, 1.053 dòng mã×ngày).

## 03/10/2026 (lượt dò hằng ngày 22h40 giờ VN — 24 kho, 2.315 dòng, gói 03/10)

Gói 03/10 của 15 cụm (1902/9021 còn gói 02/10). **Lưu ý cách chấm:** `kiem-bang-gan.js` đang
đọc `g.ngay` trên vỏ gói (luôn trống) nên rơi về cách chấm LỎNG "nằm giữa luỹ kế hết hôm qua và
gồm hôm nay" → in ra 25/37 quy tắc đúng mọi kho. Chấm CHẶT (đúng mốc hết hôm qua, như
`thu-quy-tac.js`) thì chỉ **3 quy tắc đúng mọi kho** (FERROLI 14/14, ĐIỆN TỬ TCL 14/14, AUDIO
14/14). Bảng dưới là chấm CHẶT; không sửa công cụ (ngoài phạm vi lịch dò) — cần anh Phong cho sửa.

| Quy tắc | khớp | kho lệch |
|---|---|---|
| FERROLI · ĐIỆN TỬ TCL · AUDIO | 14/14 | |
| CAMERA 23/24 · LAPTOP 23/24 · VIVO 23/24 | | 781 · 737 (gói 11h38, chỉ tính 1 laptop đơn tháng 9) · 8592 |
| SIM TỔNG 22/24 · REALME 22/24 · trả chậm HC+FE (gộp) 22/24 | | |
| SẠC DỰ PHÒNG 20/24 · TAI NGHE 19/24 · CÁP - SẠC 19/24 | | đều DƯ vài trăm nghìn (1043, 311, 15885, 781…) |
| TABLET ANDROID VÀ MÁY ĐỌC SÁCH | 20/24 | **đã sửa** (dưới) — 1902/9021 gói cũ; 15885, 781 dư 1 máy |
| PHỤ KIỆN CÔNG NGHỆ 16/17 · SIM MOBIFONE 15/18 | | |
| QUẠT GIÓ · TIVI · Máy Lạnh · HÚT BỤI · MÁY SẤY & RỬA CHÉN | 13/14 | 4860 (quạt hụt, tivi cần âm = đơn trả) · 737 · 1122 (hút bụi/máy sấy cần mà không có dòng) |
| TỦ LẠNH | 12/14 | **học lại** (dưới) — 396 nhiều nghiệm, 3935 vô nghiệm |
| MÁY GIẶT 12/14 · NỒI CƠM 11/14 · MÁY LỌC NƯỚC 11/14 · trả chậm điện máy 11/12 | | 3935, 737, 8966/631 (đơn trả) |
| ĐỒNG HỒ | 6/8 | 1043 hụt 2,36; 8592 hụt 3,51 (chỉ có 1 dòng đồng hồ 1,01 — nghi thiếu dữ liệu) |
| ĐT & TABLET ANDROID | 13/24 | DƯ ở 10 kho, phần lớn từ dòng 02/10 (15885 dư 13,54 = đúng 2 máy Xiaomi; 1359 dư 6,10) — chưa ra quy luật |
| GIA DỤNG SUNHOUSE (mới) | 9/12 | |
| T09 - T10 IPHONE 18 | 0/24 | cộng dồn từ tháng 9 — bình thường |

- **Sửa:** T10 - TABLET ANDROID VÀ MÁY ĐỌC SÁCH — baocao THÔI trả số trùng ĐT & tablet; nay = ngành 244
  máy tính bảng trừ Apple (bỏ ngành 13): 4/24 → 20/24 (kiem-bang-gan cũng 4 → 20). Chưa kho nào bán máy đọc sách.
- **Mới:** T10 - GIA DỤNG SUNHOUSE = hãng Sunhouse, ngành 484/1754/1034/1214/1116 (KHÔNG tính 1394 lõi lọc —
  5263 và 631 dư đúng 3 lõi 0,27): 9/12 kho khớp từng đồng (8 kho số dương). 737 dư = nồi cơm «đổi bảo hành»;
  3935 dư 0,34 chưa rõ; 1122 cần 0,16 = đơn xuất 03/10. ganDung.
- **Mẫu hệ số ×1,2 mới (TỦ LẠNH, học lại từ đầu):** 3051097001877 Panasonic NR-BX471GPKV, 1751097000074 Aqua
  AQR-M536XA, 3050893000076 Tủ đông Sanaky VH 5699HY (+ Toshiba GR-RS696WI đã có). Gộp danh sách cũ: 10/14 → 12/14.
- Quy tắc bị đánh dấu: không (không quy tắc nào dưới nửa số kho).
- Chương trình mới xuất hiện: «Thi đua TEST» (8 kho, 1122 = 15,08 trùng số HÚT BỤI) — chương trình thử của
  baocao, không dò.
- Chưa có quy tắc (hàng hoá): PANASONIC, PHỤ KIỆN IT - NHÓM KHÁC. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT,
  Bảo hiểm tổng, VAS, Vay tiền mặt, Ví trả sau, Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03/10.

## 05/10/2026 (lượt dò hằng ngày, chạy bù lúc 10h40 giờ VN — 23 kho, 3.014 dòng, gói 02–05/10)

Lượt 04/10 bị lỡ (không có commit). Gói: 1902/9021 vẫn 02/10, 737 gói 03/10, còn lại 04–05/10. Chấm CHẶT
(luỹ kế đến hết hôm trước ngày gói, như lượt 03/10); cột «kẹp giữa» cho kết quả gần như y hệt.
**5/30 quy tắc đúng mọi kho** (03/10: 3) — CAMERA 23/23, SIM TỔNG 23/23, FERROLI 14/14, ĐIỆN TỬ TCL 14/14,
AUDIO 14/14. (`kiem-bang-gan.js` cách chấm lỏng: 25/37.)

| Quy tắc | khớp | kho lệch / ghi chú |
|---|---|---|
| CAMERA · SIM TỔNG | 23/23 | |
| FERROLI · ĐIỆN TỬ TCL · AUDIO | 14/14 | |
| MÁY GIẶT | **13/14** (trước 9/14) | **đã sửa** (dưới); 631 hụt đúng 1 máy bán ngày gói |
| LAPTOP 22/23 · VIVO 21/23 · REALME 20/23 · TABLET + MÁY ĐỌC SÁCH 20/23 | | 737 · 8592/781 · 1043/8592/781 · 1902/9021 gói cũ, 4860 đơn trả |
| trả chậm HC+FE (gộp) 21/23 · trả chậm điện máy 11/12 | | 781, 3935 hụt (3935 hụt 27,5 ở cả hai — nghi thiếu dòng) |
| TAI NGHE 19/23 · SẠC DỰ PHÒNG 17/23 · CÁP - SẠC 12/23 | | DƯ nhỏ = dòng «Xuất đổi bảo hành» (dưới) |
| QUẠT GIÓ 13/14 · TỦ LẠNH 12/14 · TIVI 12/14 · Máy Lạnh 12/14 · HÚT BỤI 12/14 | | 4860 · 396/3935 · 396/4860 · 3935/737 · 5263/631 |
| PHỤ KIỆN CÔNG NGHỆ 12/16 · SIM MOBIFONE 13/17 · MÁY LỌC NƯỚC 11/14 · MÁY SẤY & RỬA CHÉN 11/14 | | |
| NỒI CƠM 10/14 · GIA DỤNG SUNHOUSE 9/12 | | 8966 đơn trả; 737/5263 nồi «đổi bảo hành» |
| ĐT & TABLET ANDROID | 12/23 | lệch nhỏ cả hai chiều — còn mở |
| ĐỒNG HỒ | 5/8 | 1043, 8592, 781 hụt |
| T09 - T10 IPHONE 18 | 0/23 | cộng dồn từ tháng 9 — bình thường |

- **Sửa:** T10 - MÁY GIẶT = chỉ nhóm 1099 (bỏ 3659 máy sấy + 3859 máy rửa chén — tháng 10 đã thành chương trình
  riêng). 9/14 → 13/14; kiem-bang-gan 9/14 → 14/14. Mọi lệch cũ (3935, 737, 12947, 396, 631) đúng bằng dòng máy sấy/rửa chén.
- **Phát hiện (chưa áp được):** baocao KHÔNG tính dòng «Xuất đổi bảo hành» không trả góp. Bỏ các dòng đó thì CÁP - SẠC
  12 → 18/23, SẠC DỰ PHÒNG 17 → 20/23, TAI NGHE 19 → 22/23, NỒI CƠM +1, SUNHOUSE +1 (đúng giải thích 737 «đổi bảo hành» lượt
  03/10). Nhưng dòng đổi bảo hành TRẢ GÓP thì có tính (bỏ luôn làm trả chậm 21 → 19, tablet 20 → 19). Bảng gán chưa có trường
  loại theo hình thức xuất ⇒ cần sửa realtime.html + 3 công cụ (hop()) — ngoài phạm vi lịch dò, chờ anh Phong.
- **TỦ LẠNH học lại từ đầu:** 10 kho khớp, 7 mẫu ×1,2 — đều đã có sẵn, không mẫu mới. 396 (cần 76,22, cả ngành chỉ
  55,23) và 3935 vô nghiệm — không phải thiếu mẫu.
- **MÁY SẤY & RỬA CHÉN:** 12947/631/737 khớp với số dương ×1 — bằng chứng dương đầu tiên. 3935 cần 30,81 = đúng 2 × máy
  rửa bát Junger 15,41 (nghi ×2, mới 1 kho); 1122 cần 12,55 mà không có dòng nào.
- **ĐT & TABLET ANDROID:** thử chỉ ngành 13 → 9/23, bỏ trả góp → 4/23: đều bác.
- Mẫu hệ số ×1,2 mới học: không. Quy tắc bị đánh dấu: không (ĐT & TABLET 12/23, CÁP - SẠC 12/23 vẫn trên một nửa).
- Chưa có quy tắc (hàng hoá): PANASONIC, PHỤ KIỆN IT - NHÓM KHÁC (không dò thêm lượt này). «Thi đua TEST» bỏ qua.
  Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS, Vay tiền mặt, Ví trả sau, Mở thẻ, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 04–05/10.

## 06/10/2026 (lượt dò hằng ngày, 08h giờ VN — 23 kho, 3.540 dòng, gói 02–06/10)

Gói: 1902/9021 vẫn 02/10, 737 gói 03/10, 1043/8572/10715/8592/12947/311 gói 04/10, còn lại 05–06/10. Chấm CHẶT
(luỹ kế đến hết hôm trước ngày gói). **5/32 quy tắc đúng mọi kho** (05/10: 5/30) — CAMERA 23/23, SIM TỔNG 23/23,
FERROLI 14/14, ĐIỆN TỬ TCL 14/14, Hút bụi - 20 Tỉnh 3/3 (mới). AUDIO tụt 14 → 13/14. (`kiem-bang-gan.js` cách chấm lỏng: 25/39.)

| Quy tắc | khớp | kho lệch / ghi chú |
|---|---|---|
| CAMERA · SIM TỔNG | 23/23 | |
| FERROLI · ĐIỆN TỬ TCL | 14/14 | |
| Hút bụi - 20 Tỉnh (mới) | 3/3 | |
| LAPTOP 21/23 · trả chậm HC+FE (gộp) 21/23 · REALME 20/23 · VIVO 20/23 · TABLET + MÁY ĐỌC SÁCH 20/23 | | 781/737 · 781/3935 hụt · 1043/8592 bán realme mà cần 0 · 1430 vivo 3,35 mà cần 0 · 1902/9021 gói cũ |
| TAI NGHE 19/23 · SẠC DỰ PHÒNG 17/23 · CÁP - SẠC 12/23 | | dư nhỏ = dòng «Xuất đổi bảo hành» (phát hiện 05/10, chưa áp) |
| AUDIO 13/14 · HÚT BỤI 13/14 · Máy Lạnh 13/14 | | 3935 dư 1,13 · 631 hụt 3,52 · 737 dư 1 máy |
| QUẠT GIÓ 12/14 · MÁY GIẶT 12/14 · TIVI 12/14 · SIM MOBIFONE 13/17 · PHỤ KIỆN CÔNG NGHỆ 12/16 | | 396/4860 · 5263/631 hụt · 396/4860 |
| TỦ LẠNH | **11/14** (trước 10/14) | 2 mẫu ×1,2 mới; 396/3935 vô nghiệm, 8107 thiếu dòng |
| PANASONIC (mới) | 11/14 | 1902/9021 gói 02/10; 12947 dư 0,42 |
| trả chậm điện máy 11/12 · MÁY LỌC NƯỚC 11/14 · MÁY SẤY & RỬA CHÉN 11/14 · NỒI CƠM 10/14 · SUNHOUSE 9/12 | | 3935 hụt 17,2 · 3935/631/737 dư · 1122/396/3935 hụt |
| ĐT & TABLET ANDROID | 12/23 | dư nhỏ ở 10 kho — còn mở |
| ĐỒNG HỒ | 6/8 | 1043, 8592 hụt |
| T09 - T10 IPHONE 18 | 0/23 | cộng dồn từ tháng 9 — bình thường |

- **Mới:** T10 - Hút bụi - 20 Tỉnh (chương trình mới, chỉ 3 kho 4860/8107/3935) — số cần TRÙNG y hệt T10 - HÚT BỤI ⇒ cùng bộ
  lọc nhóm 4439 + 4155 + 7459: 3/3 khớp từng đồng (3935 = 93,43). ganDung (mới 3 kho).
- **Mới:** T10 - PANASONIC = hãng Panasonic, mọi ngành hàng hoá TRỪ phụ kiện ngành 16 (pin Alkaline không tính: 4860 cần 0 có
  pin 0,06; 631 dư đúng 3 vỉ pin). 11/14 kho khớp, 6 kho số dương (1122, 396, 3935 = 117,80, 5263, 631, 737) ⇒ quy tắc chắc.
  **Bác giả thuyết cộng dồn tháng 9** (đọc thẳng ycx_lines tháng 9: 3935 = 733,91, 737 = 464,38 — không chứa trong số cần).
  Số «lạ» cũ (396 = 31,14 lúc 02/10) chỉ là số ngày đầu tháng; 1902/9021 còn gói 02/10 nên vẫn lệch. 12947 dư 0,42 = đúng
  dòng hút bụi Panasonic MC-CL603GN49 nhóm 956 — cũng chính dòng baocao bỏ ở HÚT BỤI.
- **Mẫu hệ số ×1,2 mới (TỦ LẠNH):** 1751097000095 Samsung RS70F65Q3TSV 680 lít, 1751097000188 Funiki HR SS8535SDG (5263
  thiếu 4,93 = đúng 20% của hai tủ này, nghiệm duy nhất). 10 → 11/14; kiem-bang-gan 10 → 11/14.
- **ĐT & TABLET ANDROID — bác «bỏ nhóm 18»:** 10715 bán 5 Masstel (2,55) ngày 03/10 mà độ dư giữ nguyên 3,90 từ gói 03 sang
  04; 8107 gói 03/10 cần 0,51 = đúng 1 Masstel ⇒ nhóm 18 CÓ tính. Độ dư mỗi kho gần như không đổi qua các ngày gói (1430 luôn
  6,97; 10715 luôn 3,90; 1043 nhảy 17,7 → 66,9 khi có 60,2 tr dòng «Xuất đổi bảo hành») ⇒ lệch dồn ở vài dòng đầu tháng + dòng
  đổi bảo hành; chưa ra quy luật.
- **PHỤ KIỆN IT - NHÓM KHÁC:** thử danh sách mã tháng 9 (1/23), cả 3 ngành phụ kiện nền thực (0/23, cần lớn hơn ở 20 kho) và
  nền quy đổi (0/23, quá lớn) — đều bác. 9021 cần 0 mà có 0,56 phụ kiện ⇒ có loại trừ. Còn mở.
- Quy tắc bị đánh dấu: không (thấp nhất ĐT & TABLET 12/23, CÁP - SẠC 12/23 — vẫn trên một nửa).
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC. «Thi đua TEST» bỏ qua. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT,
  Bảo hiểm tổng, VAS, Vay tiền mặt, Ví trả sau, Mở thẻ tín dụng, Nạp - rút tiền.
- Lưu ý: chạy `gom-du-lieu-thang.js --thang 202609` lúc này chỉ gom được 4 kho (gói đã sang tháng 10) và GHI ĐÈ tệp tạm
  du-lieu-202609.json — muốn dữ liệu tháng 9 thì đọc thẳng ycx_lines theo từng kho.
- chua-khop-202610.json: đã lưu cữ gói 04–06/10.

## 06/10/2026 (lượt dò hằng ngày, 22h40 giờ VN — 23 kho, 4.007 dòng, gói 02–06/10)

Gói gần như y hệt lượt sáng (1902/9021 vẫn 02/10, 737 03/10, 1043/8572/10715/8592/12947/311 04/10, 1359 05/10, còn lại
06/10) — chỉ thêm dòng bán trong ngày. Chấm CHẶT (luỹ kế đến hết hôm trước ngày gói): **5/32 quy tắc đúng mọi kho**
(sáng 06/10: 5/32) — CAMERA 23/23, SIM TỔNG 23/23, FERROLI 14/14, ĐIỆN TỬ TCL 14/14, MÁY GIẶT 14/14 (Hút bụi - 20 Tỉnh rơi
khỏi nhóm này vì giờ có 8 kho, xem dưới). `kiem-bang-gan.js` cách chấm lỏng (kẹp giữa): 6 quy tắc ✓ (thêm Hút bụi - 20 Tỉnh 8/8).

| Quy tắc | khớp | kho lệch / ghi chú |
|---|---|---|
| CAMERA · SIM TỔNG | 23/23 | |
| FERROLI · ĐIỆN TỬ TCL · MÁY GIẶT | 14/14 | |
| LAPTOP 21/23 · REALME 20/23 · VIVO 20/23 · TABLET + MÁY ĐỌC SÁCH 20/23 · TAI NGHE 19/23 | | 781/737 · 1043/8592 cần 0 · 1430 cần 0 · 1902/9021 gói cũ |
| trả chậm HC+FE (gộp, lỏng) 22/23 · trả chậm điện máy 10/12 | | 3935 hụt 32,6 · 396/3935 hụt |
| SẠC DỰ PHÒNG 16/23 · CÁP - SẠC 12/23 | | dư nhỏ = dòng «Xuất đổi bảo hành» (phát hiện 05/10, chưa áp) |
| QUẠT GIÓ 13/14 · AUDIO 13/14 | | 4860 hụt · 3935 hụt 3,03 |
| TIVI 12/14 · MÁY SẤY & RỬA CHÉN 12/14 · PHỤ KIỆN CÔNG NGHỆ 12/16 · SIM MOBIFONE 12/17 | | 4860/3935 · 396/3935 hụt lớn |
| TỦ LẠNH 11/14 · Máy Lạnh 11/14 · MÁY LỌC NƯỚC 11/14 · PANASONIC 11/14 | | 396/8107/3935 · 396/3935/737 · 3935/631/737 dư · 1902/9021 gói cũ, 12947 dư 0,42 |
| HÚT BỤI 10/14 (lỏng 12/14) · Hút bụi - 20 Tỉnh 6/8 (lỏng 8/8) | | 1122/3935 chỉ lệch ở cách chặt (dòng bán ngày gói); 12947 dư 0,42; 8874 hụt 0,64 |
| NỒI CƠM 10/14 · SUNHOUSE 9/12 | | dư nhỏ 3935/5263/737 |
| ĐT & TABLET ANDROID | 12/23 | dư nhỏ — còn mở |
| ĐỒNG HỒ | 6/8 | 1043 hụt 2,37 · 8592 hụt 0,70 (cả hai từ gói 03/10, không đổi) |
| T09 - T10 IPHONE 18 | 0/23 | cộng dồn từ tháng 9 — bình thường |

- **Sửa:** T10 - HÚT BỤI và T10 - Hút bụi - 20 Tỉnh THÊM nhóm 956 Hút bụi (thường). 631 cần 4,05 = đúng Hitachi CV-SF20V
  2,325 + Samsung VCC8835V37 1,196 + Deerma DX115C 0,525 (trước hụt 3,52 hai lượt liền). Lời «956 không thuộc» ngày 02/10 chỉ
  dựa vào MỘT dòng 12947 Panasonic MC-CL603GN49 0,42 (01/10) — chính dòng đó baocao cũng bỏ ở T10 - PANASONIC ⇒ lệch riêng
  của dòng, không phải của nhóm. kiem-bang-gan: HÚT BỤI 12/14 → 12/14 (631 về khớp, 12947 lệch), Hút bụi - 20 Tỉnh 7/8 → 8/8.
  Hút bụi - 20 Tỉnh nay có ở 8 kho, số vẫn trùng HÚT BỤI ở cả 8; giữ ganDung.
- **ĐỒNG HỒ:** soi dòng ycx_lines gốc (kể cả dòng bị trả) của 1043 và 8592: 1043 không có dòng nào thiếu; 8592 có một Garmin
  Forerunner 165 bị trả ngày 02/10 nhưng giá không khớp độ hụt 0,70. Chưa ra.
- **8874 HÚT BỤI hụt 0,64:** kho chỉ 62 dòng cả tháng, không có dòng hút bụi nào khác — nghi thiếu dữ liệu, không dùng làm bằng chứng.
- Mẫu hệ số ×1,2 mới học: không (không có ngày gói mới cho TỦ LẠNH so với lượt sáng). Quy tắc bị đánh dấu: không.
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC (không dò thêm lượt này, gói không đổi so với sáng). Dịch vụ thu hộ bỏ qua.
- chua-khop-202610.json: đã lưu cữ gói 02–06/10 (bản tối).

## 08/10/2026 (lượt dò hằng ngày, 09h40 giờ VN — 23 kho, 4.570 dòng, gói 03–08/10)

Không có lượt 07/10 (bỏ lỡ một ngày — chua-khop không có cữ gói của riêng ngày đó ở các kho đã sang gói 07/10). Gói: 737 vẫn
03/10, 1043/8572/10715/8592 04/10, 1359 05/10, **1902/9021 lên gói 08/10** (trước đứng ở 02/10 suốt 6 ngày), còn lại 07/10.
Chấm bằng `kiem-bang-gan.js` (kẹp giữa hai mốc): **5/32 quy tắc đúng mọi kho** — FERROLI 14/14, SIM TỔNG 23/23, ĐIỆN TỬ TCL
14/14, AUDIO 14/14 (lên từ 13/14), Hút bụi - 20 Tỉnh 10/10 (nay 10 kho). CAMERA rơi 23 → 22/23 vì 1902 có gói mới.
Lưu ý: chuỗi tự động của cụm 14285 đẩy dòng mới ĐANG lúc chạy — 396 từ 17 lên 25 dòng bị trả/huỷ giữa hai lần chấm, nên
số của 396 ở MÁY SẤY & RỬA CHÉN, TỦ LẠNH, SẠC DỰ PHÒNG nhảy trong lượt này.

| Quy tắc | khớp | kho lệch / ghi chú |
|---|---|---|
| SIM TỔNG | 23/23 | |
| FERROLI · ĐIỆN TỬ TCL · AUDIO | 14/14 | |
| Hút bụi - 20 Tỉnh | 10/10 | |
| CAMERA 22/23 · trả chậm HC+FE (gộp) 22/23 · TABLET + MÁY ĐỌC SÁCH 22/23 · LAPTOP 21/23 | | 1902 dư đúng dòng EZVIZ 06/10 0,88 · 3935 hụt 7,14 · 4860 cần −3,83 · 781/737 |
| REALME 20/23 · VIVO 20/23 · TAI NGHE 18/23 · SẠC DỰ PHÒNG 17/23 | | 1043/8592 cần 0 · 1430 cần 0 · dư nhỏ («Xuất đổi bảo hành», chưa áp) |
| HÚT BỤI 13/14 · PANASONIC 13/14 | | cùng một dòng 12947 Panasonic MC-CL603GN49 0,42 |
| **TỦ LẠNH 12/14** (trước 11/14) | | 3 mẫu ×1,2 mới; 396/3935 vô nghiệm |
| MÁY GIẶT 12/14 (trước 14/14) · TIVI 12/14 · trả chậm điện máy 12/14 | | 1902 (gói mới)/631 hụt ~4 · 4860/631 dư · 3935 hụt/631 dư |
| ĐT & TABLET ANDROID | 14/23 (trước 12/23) | dư ở 9 kho — còn mở |
| CÁP - SẠC 13/23 · PHỤ KIỆN CÔNG NGHỆ 12/16 · SIM MOBIFONE 12/17 | | dư nhỏ · 3935 cần 12,04 được 0 |
| QUẠT GIÓ 11/14 · NỒI CƠM 11/14 · MÁY LỌC NƯỚC 11/14 · Máy Lạnh 11/14 · SUNHOUSE 11/14 · MÁY SẤY & RỬA CHÉN 11/14 | | 1902 hụt (gói mới) · 3935/631/737 dư · 396 máy sấy ~21 tr vừa bị trả |
| ĐỒNG HỒ | 6/8 | 1043 hụt 2,37 · 781 dư 0,18 |
| T09 - T10 IPHONE 18 | 0/23 | cộng dồn từ tháng 9 — bình thường |

- **Mẫu hệ số ×1,2 mới (TỦ LẠNH):** học lại từ đầu (không --biet) — 11 kho nghiệm duy nhất, ra 16 mẫu; 3 mẫu chưa có trong
  danh sách: 3050893000192 Tủ đông Sanaky VH-6699HY3, 1751097000218 Panasonic NR-XZ550CWKV, 3051097001918 Panasonic
  NR-DZ601VGKV. Thêm vào: kiem-bang-gan 10/14 → 12/14 (1902, 12947 về khớp), không kho nào tụt. 396, 3935 vẫn vô nghiệm.
- **1902 Phú Thị** lần đầu có gói mới (08/10) sau 6 ngày: lệch lẻ tẻ cả hai chiều (CAMERA dư 0,88 = đúng dòng 06/10; QUẠT GIÓ,
  MÁY GIẶT hụt) ⇒ nghi số baocao của gói này chưa tính hết ngày 06–07/10 hoặc dữ liệu dòng của kho chưa đủ. Chưa sửa gì, theo dõi.
- **PHỤ KIỆN IT - NHÓM KHÁC (còn mở):** thử mọi tổ hợp NGÀNH (18 ngành nhỏ, nền thực và quy đổi): tốt nhất 3/23 — bác gán theo
  ngành. Số cần luôn nằm GIỮA nền thực và nền quy đổi của ngành 16+184. Hồi quy không âm theo NHÓM trên nền quy đổi: các nhóm
  thuộc chương trình khác (pin sạc dự phòng 12, cáp 3345, tai nghe BT 3346/4540, camera 6479, phụ kiện công nghệ 4128) và đồ
  Apple, smartwatch, đồng hồ đều ra hệ số 0; Miếng dán kính 4199, Loa di động 1031, Thẻ nhớ 16, Bàn phím 4900, Thiết bị mạng
  3479, Màn hình 1273, Pin 531, Tai nghe dây 15… ra gần 1 ⇒ hướng tiếp: **ngành 16+184+364 nền QUY ĐỔI, bỏ nhóm của chương trình
  khác, bỏ Apple** — thử thẳng ra 0/23 (dư ở kho nhiều ốp lưng/dán kính, hụt ở kho khác) nên còn thiếu một loại trừ. Kho 8107:
  gói 03→06/10 không đổi (4,35) dù bán cáp, phụ kiện Apple, dụng cụ nhà bếp ⇒ các nhóm đó KHÔNG thuộc (nếu dữ liệu 8107 đủ).
- Quy tắc bị đánh dấu: không (không quy tắc nào dưới một nửa số kho, trừ IPHONE 18 cộng dồn).
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS,
  Vay tiền mặt, Ví trả sau, Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–08/10 (chạy lại sau khi 396/142 đẩy dòng mới).

## 10/10/2026 (lượt dò hằng ngày, 09h50 giờ VN — 24 kho, 6.651 dòng, gói 03–10/10)

Không có lượt 09/10. Gói: 737 vẫn đứng ở 03/10, 15885/781/1902/9021 ở 08/10, 1043/3935/631 đã lên gói 10/10, còn lại 09/10.
Chấm bằng `kiem-bang-gan.js`: **3/32 quy tắc đúng mọi kho** — FERROLI 14/14, ĐIỆN TỬ TCL 14/14, SIM TỔNG 24/24 (lượt chấm lại
23/24 vì 28686 đang đẩy dòng 09/10 giữa chừng). Tụt nhiều so với 08/10, gần như dồn vào **3935 · 631 · 4860 · 28686 · 737**
(3935 bỏ 58, 631 bỏ 52, 396 bỏ 37 dòng bị trả/huỷ; 737 có dòng đến 03/10 mà trả/huỷ vẫn cập nhật) — lệch cả hai chiều ở nhiều
ngành cùng lúc ⇒ do dữ liệu dòng/gói của các kho đó, không phải quy tắc. AUDIO, Hút bụi - 20 Tỉnh rơi khỏi "đúng mọi kho" chỉ vì 3935.

| Quy tắc | khớp | kho lệch / ghi chú |
|---|---|---|
| FERROLI · ĐIỆN TỬ TCL | 14/14 | |
| SIM TỔNG | 24/24 | (23/24 lượt chấm lại, 28686 đang đẩy) |
| TABLET + MÁY ĐỌC SÁCH 22/24 · CAMERA 21/24 · LAPTOP 21/24 · VIVO 21/24 · trả chậm HC+FE (gộp) 21/24 | | 4860 cần −3,83 · 1902/12947 dư nhỏ · 781/737/1902 laptop dư · 3935/631 hụt |
| REALME 19/24 · SẠC DỰ PHÒNG 16/24 · TAI NGHE 15/24 · PHỤ KIỆN CÔNG NGHỆ 12/17 | | dư nhỏ |
| AUDIO 13/14 · PANASONIC 13/14 · HÚT BỤI 12/14 · Hút bụi - 20 Tỉnh 9/10 | | 3935 · 12947 Panasonic MC-CL603GN49 0,42 |
| QUẠT GIÓ · MÁY GIẶT · MÁY LỌC NƯỚC · TIVI · trả chậm điện máy · SUNHOUSE | 11/14 | 3935/631/737/4860/1902 |
| **TỦ LẠNH 10/14** (lượt đầu 8/14) · NỒI CƠM 10/14 · Máy Lạnh 10/14 · MÁY SẤY & RỬA CHÉN 10/14 | | 396/3935/4860 hụt · 631 dư |
| **ĐT & TABLET ANDROID 11/24** (08/10: 14/23) · CÁP - SẠC 12/24 (lượt lại 11/24) | | dư ở 13 kho |
| **SIM MOBIFONE/SIM DMX 8/18** (08/10: 12/17) | | dư ở kho cần 0 |
| ĐỒNG HỒ | 5/8 | 1043 hụt · 8592/781 dư ~1 |
| T09 - T10 IPHONE 18 | 0/24 | cộng dồn từ tháng 9 — bình thường |

- **Mẫu hệ số ×1,2 mới (TỦ LẠNH):** học lại từ đầu (không --biet) — 9 kho nghiệm duy nhất, ra 19 mẫu; 2 mẫu chưa có:
  3051097001790 Samsung RT22M4032BY/SV, 1751097000219 Panasonic NR-XZ590CWKV. Thêm vào: 8 → 10/14 (8966, 8874 về khớp), không kho
  nào tụt. 396, 3935, 4860, 631 VÔ NGHIỆM (631 cần ít hơn cả ngành ⇒ dòng trả chưa lên).
- **ĐT & TABLET ANDROID:** thử bỏ nhóm 18 (ĐT phổ thông Masstel/Nokia/Mobell) như ghi chú cũ gợi ý → 2/24 — **BÁC**, nhóm 18 CÓ
  tính. Bỏ dòng «Xuất đổi bảo hành» → vẫn 10/24 nhưng dư co mạnh (1043 +74 → +7, 1359 +71 → +6) và 1122 thành hụt 12 ⇒ hướng
  tiếp: đổi bảo hành chỉ tính một phần (có thể chỉ khi máy cũ mua tháng trước?). Chưa sửa quy tắc.
- **PHỤ KIỆN IT - NHÓM KHÁC (còn mở) — phát hiện mới bằng hiệu số ngày gói:**
  · 8107: 03→07/10 +0,30 = đúng chuột Rapoo N1200 nền quy đổi 0,296; 07→09/10 +1,09 = thẻ nhớ Kioxia 64GB quy đổi 1,092.
    Trong khi đó cáp Xmobile (04, 06, 09/10), chảo/dao Elmich-Delites, cáp Apple KHÔNG làm số nhích ⇒ cáp, dụng cụ nhà bếp, phụ
    kiện Apple KHÔNG thuộc.
  · 12947: gói 03→04 +2,18 = 2 thẻ nhớ Kioxia bán TRẢ GÓP tính 1,092/cái ⇒ **nền quy đổi KHÔNG nhân hệ số trả góp** (cột qd của
    dòng trả góp đã ×1,3: 1,42). 07→09 +1,09 = thẻ nhớ 08/10. Khoảng 04→07 +0,56 chưa giải (miếng dán tablet 0,31 + ?).
  · Thử ngành 16+184+364, bỏ nhóm của chương trình khác, bỏ Apple, bỏ đổi bảo hành, nền quy đổi ÷1,3 nếu trả góp: 4/24 — đa số
    HỤT (1043 −72, 28686 −42, 8592 −46) ⇒ còn ngành khác (đồng hồ định vị trẻ em 7259? smartwatch?) nhưng 8107 hụt 1,91 đã có từ
    trước gói 03/10 mà kho không bán đồng hồ. Công cụ hiện chỉ hiểu nền thực/quy đổi, chưa có "quy đổi bỏ hệ số trả góp" — nếu
    chốt được quy tắc sẽ phải thêm kiểu nền mới vào realtime.html và công cụ (ngoài phạm vi lịch dò).
- Quy tắc bị đánh dấu: không. Lần đầu dưới nửa số kho: ĐT & TABLET ANDROID 11/24, SIM MOBIFONE 8/18 — nếu lượt sau vẫn dưới
  thì đánh ganDung.
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS,
  Vay tiền mặt, Ví trả sau, Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–10/10.

## 13/10/2026 (lượt dò hằng ngày, 09h giờ VN — 26 kho, 9.544 dòng, gói 03–13/10)

Không có lượt 11–12/10. Gói: 737 vẫn đứng ở 03/10, 1902/9021 ở 08/10, 12947/311 ở 09/10, 1043/631 ở 10/10, 8572/10715/8592/
1122/8966/haiboi/8304 ở 11/10, 396/142/28686 đã lên gói 13/10, còn lại 12/10. **Kho mới: haiboi (Hải Bối)** — hụt cùng lúc ở
rất nhiều ngành (TIVI 158 cần / 79 được, trả chậm HC+FE 533/398, trả chậm điện máy 202/121, TỦ LẠNH, MÁY GIẶT, MÁY LỌC NƯỚC,
PANASONIC) ⇒ dòng hàng của kho chưa đủ, không dùng làm bằng chứng. 8874 và 5263 cũng hụt nhiều ngành điện máy cùng lúc.
Chấm bằng `kiem-bang-gan.js`: **2/32 quy tắc đúng mọi kho** — FERROLI 16/16, ĐIỆN TỬ TCL 16/16. SIM TỔNG rơi 24/24 → 25/26 chỉ vì
haiboi (cần 13 được 12).

| Quy tắc | khớp | kho lệch / ghi chú |
|---|---|---|
| FERROLI · ĐIỆN TỬ TCL | 16/16 | |
| SIM TỔNG 25/26 · TABLET + MÁY ĐỌC SÁCH 24/26 · VIVO 23/26 | | haiboi · 4860 cần −3,83 / 28686 · 8592/781/1430 |
| CAMERA 22/26 · LAPTOP 22/26 · REALME 21/26 · trả chậm HC+FE (gộp) 20/26 | | dư nhỏ 8592/12947/1902 · 781/737/1902 laptop dư · haiboi/8874/5263 hụt |
| SẠC DỰ PHÒNG 17/26 · TAI NGHE 16/26 · PHỤ KIỆN CÔNG NGHỆ 14/18 | | dư nhỏ · 10715/3935 cần >0 được 0 |
| HÚT BỤI 14/16 · AUDIO 14/16 · Hút bụi - 20 Tỉnh 10/11 · PANASONIC 13/16 · NỒI CƠM 13/16 | | 3935 · 12947 Panasonic MC-CL603GN49 0,42 · haiboi |
| QUẠT GIÓ 12/16 · MÁY SẤY & RỬA CHÉN 12/16 · SUNHOUSE 12/16 | | 4860/8107/1902/8874 hụt · 1122 cần 12,55 được 0 |
| MÁY GIẶT · MÁY LỌC NƯỚC · TIVI · trả chậm điện máy · Máy Lạnh | 11/16 | haiboi/8304/5263/631/3935/737 |
| **TỦ LẠNH 9/16** (lượt đầu 7/16; 10/10: 10/14) | | 396/4860/haiboi/3935/5263/8874 hụt · 631 dư |
| ĐỒNG HỒ | 7/9 | 1043 hụt 2,37 · 8592 dư 10,82 |
| **ĐT & TABLET ANDROID 10/26** (10/10: 11/24) · CÁP - SẠC 10/26 (10/10: 12/24) | | dư ở nhiều kho |
| SIM MOBIFONE/SIM DMX | 8/20 | dư ở kho cần 0 (đã ganDung) |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- **Mẫu hệ số ×1,2 mới (TỦ LẠNH):** học lại từ đầu (không --biet) — 8 kho nghiệm duy nhất (thêm 142, 8304), ra 18 mẫu; 3 mẫu chưa
  có: 3051097001936 Panasonic NR-TX461GPKV, 1751097000222 Panasonic NR-XZ590HGKV 520 lít, 1751097000149 Samsung RB27N4020B1/SV.
  Thêm vào: 7 → 9/16 (142, 8304 về khớp), không kho nào tụt. Danh sách nay 33 mẫu. 4860, 8874, 631, 396, 5263, haiboi VÔ NGHIỆM,
  3935 bỏ qua (25 mẫu chưa biết). 8874 hụt 36,8 — hơn cả 20% cả ngành ⇒ thiếu dòng, không phải mẫu.
- **Quy tắc bị đánh dấu: T10 - ĐIỆN THOẠI & TABLET ANDROID → ganDung** (dưới một nửa số kho hai lượt liền: 11/24 rồi 10/26).
  Kho DƯ không có dòng đổi bảo hành nào (8966 +14,31; 1430 +6,85; 8874 +3,40) ⇒ không chỉ do đổi bảo hành. Hiệu số ngày gói:
  8966 gói 09→11/10 cần chỉ +1,38 trong khi bán 15,68 (Samsung A17 trả góp 4,44 + Moto G06 3,39 + A27 7,85); 8874 gói 06→07/10
  +5,75 trong khi bán 9,15 (Redmi 17 5,55 + Moto G06 3,60). Không hiệu số nào bằng một tập dòng ⇒ nghi baocao chốt số giữa ngày
  hoặc tính theo nền khác cho một số máy — chưa ra quy luật, giữ bộ lọc.
- CÁP - SẠC lần đầu dưới nửa số kho (10/26) — nếu lượt sau vẫn dưới thì đánh ganDung.
- Không có quy tắc mới. PHỤ KIỆN IT - NHÓM KHÁC vẫn mở (hướng dò ở mục 10/10: nền quy đổi không nhân hệ số trả góp — công cụ
  chưa có kiểu nền này). PANASONIC giờ 13/16 (lệch còn lại là 3935, haiboi thiếu dòng, 12947 dòng 0,42) — chưa cần thử cộng dồn
  tháng 9.
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS,
  Vay tiền mặt, Ví trả sau, Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–13/10.

## 14/10/2026 (lượt dò hằng ngày, 08h giờ VN — 26 kho, 10.568 dòng, gói 03–14/10)

Gói: 737 vẫn đứng ở 03/10, 1902/9021 ở 08/10, 311/12947 ở 09/10, 1043 ở 10/10, 8304/haiboi ở 11/10, 5263/8874 ở 12/10,
1430/3935/4860/8107 đã lên gói 14/10, còn lại 13/10. haiboi vẫn hụt nhiều ngành điện máy cùng lúc (TIVI 158 cần / 79 được) ⇒
dòng hàng chưa đủ, không dùng làm bằng chứng.
Chấm bằng `kiem-bang-gan.js`: **2/32 quy tắc đúng mọi kho** — FERROLI 16/16, ĐIỆN TỬ TCL 16/16. SIM TỔNG 25/26 (chỉ haiboi).

| Quy tắc | khớp | kho lệch / ghi chú |
|---|---|---|
| FERROLI · ĐIỆN TỬ TCL | 16/16 | |
| SIM TỔNG 25/26 · TABLET + MÁY ĐỌC SÁCH 24/26 | | haiboi · 4860 cần −3,83 / 28686 |
| CAMERA 22/26 · LAPTOP 21/26 · VIVO 21/26 · REALME 20/26 · trả chậm HC+FE (gộp) 20/26 | | dư nhỏ 8592/12947/1902 · 781/1902/28686/631/737 laptop dư |
| SẠC DỰ PHÒNG 17/26 · TAI NGHE 16/26 · PHỤ KIỆN CÔNG NGHỆ 13/18 | | dư nhỏ · 1043/10715/3935 cần >0 được 0 |
| QUẠT GIÓ 14/16 (13/10: 12) · TIVI 14/16 (11) · MÁY SẤY & RỬA CHÉN 14/16 (12) · HÚT BỤI 14/16 · AUDIO 14/16 · Hút bụi - 20 Tỉnh 10/11 | | 4860/1902 · haiboi/631 · 3935 |
| MÁY GIẶT 13/16 (11) · Máy Lạnh 13/16 (11) · PANASONIC 13/16 | | haiboi/8304/1902 · 396/4860/737 · 12947/haiboi/3935 |
| NỒI CƠM 12/16 · SUNHOUSE 12/16 · MÁY LỌC NƯỚC 11/16 · trả chậm điện máy 11/16 | | 3935/631/737/haiboi/8304 |
| **TỦ LẠNH 10/16** (lượt đầu 9/16) | | 396/4860/8107/haiboi/3935 hụt · 631 dư |
| **ĐT & TABLET ANDROID 12/26** (đã ganDung) · **CÁP - SẠC 12/26** | | dư ở nhiều kho |
| SIM MOBIFONE/SIM DMX | 7/20 | dư ở kho cần 0 (đã ganDung) |
| ĐỒNG HỒ | 7/9 | 1043 hụt 2,37 · 8592 dư 3,71 |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- **Mẫu hệ số ×1,2 mới (TỦ LẠNH):** học lại từ đầu (không --biet) — 9 kho khớp, ra 22 mẫu; 2 mẫu chưa có: 3051097001998 Hitachi
  R-WB640VGV0 GBK, 3051097001788 Samsung RT20HAR8DBU/SV. Thêm vào: 9 → 10/16 (8874 về khớp), không kho nào tụt. Danh sách nay
  35 mẫu. 4860/396/631/haiboi VÔ NGHIỆM, 8107/5263 nhiều nghiệm, 3935 bỏ qua (27 mẫu chưa biết).
- **Quy tắc bị đánh dấu: T10 - CÁP - SẠC → ganDung** (dưới một nửa số kho hai lượt liền: 10/26 rồi 12/26; từng đạt 19/24 ngày
  03/10). Dư nhỏ ở nhiều kho — hướng cũ: dòng «Xuất đổi bảo hành» (05/10), công cụ chưa có cách loại theo hình thức xuất.
- Không có quy tắc mới, không sửa bộ lọc. PHỤ KIỆN IT - NHÓM KHÁC vẫn mở (hướng dò ở mục 10/10: nền quy đổi không nhân hệ số
  trả góp — công cụ chưa có kiểu nền này).
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS,
  Vay tiền mặt, Ví trả sau, Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–14/10.

## 14/10/2026 (lượt dò hằng ngày thứ hai, 22h40 giờ VN — 26 kho, 10.716 dòng, gói 03–14/10)

Từ lượt sáng: 142/396/781/1122/1359/8572/8592/8966/10715/15885/28686 đã lên gói 14/10; 737 vẫn đứng ở 03/10, 1902/9021 ở
08/10, 311/12947 ở 09/10, 1043/631 ở 10–13/10, 8304/haiboi ở 11/10. haiboi vẫn hụt nhiều ngành điện máy cùng lúc ⇒ không dùng
làm bằng chứng. Chấm bằng `kiem-bang-gan.js`: **2/32 quy tắc đúng mọi kho** — FERROLI 16/16, ĐIỆN TỬ TCL 16/16.

| Quy tắc | khớp (sáng 14/10) | kho lệch / ghi chú |
|---|---|---|
| FERROLI · ĐIỆN TỬ TCL | 16/16 | |
| TABLET + MÁY ĐỌC SÁCH 23/26 (24) · SIM TỔNG 23/26 (25) | | 1359/4860/28686 · 8592/781 thiếu 3–5 SIM, haiboi |
| LAPTOP 21/26 · VIVO 21/26 · REALME 20/26 | | laptop dư 781/1902/28686/631/737 |
| **CAMERA 19/26** (22) · trả chậm HC+FE (gộp) 19/26 (20) | | thêm 781 hụt, 5263/8874 hụt · 8572 cần 114 được 69 |
| SẠC DỰ PHÒNG 16/26 (17) · **TAI NGHE 13/26** (16) · PHỤ KIỆN CÔNG NGHỆ 13/18 | | dư/hụt nhỏ nhiều kho · 1043/10715/3935 cần >0 được 0 |
| MÁY SẤY & RỬA CHÉN 15/16 (14) · QUẠT GIÓ 13/16 (14) · HÚT BỤI · AUDIO · PANASONIC · Máy Lạnh 13/16 | | 396/4860/1902 quạt · 3935/5263 · 631 audio dư 12,5 |
| MÁY GIẶT 12/16 (13) · TIVI 12/16 (14) · trả chậm điện máy 12/16 (11) | | haiboi/8304/1902/5263 · 396 tivi dư 40,3, 4860 dư 9,3 |
| SUNHOUSE 11/16 (12) · NỒI CƠM 10/16 (12) · MÁY LỌC NƯỚC 10/16 (11) | | 3935/5263/631/737/8966/8874 |
| **TỦ LẠNH 10/16** | | 4860/8107/haiboi/3935/5263 hụt · 631 dư |
| ĐT & TABLET ANDROID 12/26 (ganDung) · CÁP - SẠC 11/26 (ganDung) · SIM MOBIFONE/SIM DMX 10/20 | | dư ở nhiều kho |
| ĐỒNG HỒ | 7/9 | 1043 hụt 2,37 · 8592 hụt 1,55 |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- Phần lớn chỗ tụt so với sáng nằm ở kho vừa lên gói 14/10 (thêm một ngày dòng hàng 13/10 vào phép so) — chưa phải dấu hiệu
  quy tắc sai; xem lại ở lượt sau.
- **Mẫu hệ số ×1,2 mới (TỦ LẠNH):** học lại từ đầu (không --biet) — 9 kho khớp, ra 23 mẫu; 1 mẫu chưa có: 1751097000170 Hitachi
  HRSN9563DWDXVN (142 bán ngày 13/10 — không có mẫu này 142 hụt đúng 3,07 = 20% × 15,34). Thêm vào: giữ 10/16, không kho nào
  tụt. Danh sách nay 36 mẫu. 4860/631/396/haiboi/5263 VÔ NGHIỆM, 8107 nhiều nghiệm, 3935 bỏ qua (27 mẫu chưa biết).
- Không quy tắc nào bị đánh dấu mới. TAI NGHE xuống đúng một nửa (13/26, sáng 16/26) — đã ganDung từ trước; lượt sau còn
  dưới một nửa thì ghi rõ. Không có quy tắc mới, không sửa bộ lọc.
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC (hướng dò ở mục 10/10: nền quy đổi không nhân hệ số trả góp — công cụ
  chưa có kiểu nền này). Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS, Vay tiền mặt, Ví trả sau, Mở thẻ
  tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–14/10 (tối).

## 16/10/2026 (lượt dò hằng ngày, 22h30 giờ VN — 26 kho, 12.060 dòng, gói 03–16/10)

Không có lượt 15/10. Gói: 737 vẫn đứng ở 03/10, 12947/311 ở 09/10, 1043 ở 10/10, 8304/haiboi ở 11/10, 631 ở 13/10,
8572/10715/8592/1902/9021/28686 ở 15/10, còn lại đã lên gói 16/10. haiboi vẫn hụt nhiều ngành điện máy cùng lúc (TIVI 158 cần /
79 được) ⇒ không dùng làm bằng chứng. Chấm bằng `kiem-bang-gan.js`: **2/32 quy tắc đúng mọi kho** — FERROLI 16/16, ĐIỆN TỬ TCL 16/16.

| Quy tắc | khớp (14/10 tối) | kho lệch / ghi chú |
|---|---|---|
| FERROLI · ĐIỆN TỬ TCL | 16/16 | |
| **CAMERA 22/26** (19) · LAPTOP 21/26 · VIVO 21/26 · SIM TỔNG 21/26 (23) · TABLET + MÁY ĐỌC SÁCH 21/26 (23) | | dư nhỏ 8592/12947/1902 · laptop dư 781/1902/28686/631/737 · SIM thiếu 8592 (−9), 781 |
| REALME 20/26 · trả chậm HC+FE (gộp) 18/26 (19) | | 8572 cần 130 được 69, 8592 cần 399 được 258, haiboi |
| **Máy Lạnh 14/16** (13) · HÚT BỤI 14/16 · MÁY SẤY & RỬA CHÉN 14/16 (15) · Hút bụi - 20 Tỉnh 10/11 | | 4860/737 · 3935 · haiboi/3935 |
| QUẠT GIÓ 13/16 · AUDIO 13/16 · PANASONIC 13/16 · PHỤ KIỆN CÔNG NGHỆ 13/18 | | 1122/4860/1902 · 631 audio dư 12,5 · 3935/haiboi/12947 · 10715/3935 cần 22 được 0 |
| MÁY GIẶT 12/16 · TIVI 12/16 · trả chậm điện máy 12/16 | | 4860/haiboi/8304/1902 · 396 tivi dư 22,5, 4860 dư 9,3 |
| NỒI CƠM 11/16 (10) · SUNHOUSE 11/16 · MÁY LỌC NƯỚC 10/16 | | 3935/737/8966/5263 · 631/3935 lọc nước dư |
| **TỦ LẠNH 9/16** (10) | | 396/8107/haiboi/3935/5263 hụt · 142 hụt 0,34 (mới) · 631 dư 3,8 |
| TAI NGHE 14/26 (13) · SẠC DỰ PHÒNG 13/26 (16) · ĐT & TABLET ANDROID 11/26 (12) · CÁP - SẠC 9/26 (11) · SIM MOBIFONE/SIM DMX 5/20 (10) | | đều đã ganDung |
| **ĐỒNG HỒ 6/9** (7) | | 1043 hụt 2,37 · 8592 hụt 8,2 · 781 hụt 2,6 (mới) |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- **Mẫu hệ số ×1,2 (TỦ LẠNH):** học lại từ đầu (không --biet) — 8 kho khớp, ra 11 mẫu, 10 đã có. Mẫu mới duy nhất
  1750893000051 Tủ đông Kangaroo KGFZA268IK2 (nghiệm ở 631) — **CHƯA THÊM**: thêm vào vẫn 9/16 nhưng ở phép chấm 631 dư thêm
  (108,86 → 114,07), mâu thuẫn với lần học ⇒ ghi là ứng viên, chờ kho khác bán mẫu này. Danh sách giữ 36 mẫu. 4860/142/396/1902/
  haiboi/5263 VÔ NGHIỆM, 8107 nhiều nghiệm, 3935 bỏ qua (36 mẫu chưa biết).
- Không quy tắc nào bị đánh dấu mới: SẠC DỰ PHÒNG đúng một nửa (13/26), các quy tắc dưới một nửa đều đã ganDung từ trước.
  ĐỒNG HỒ xuống 6/9 — theo dõi; nếu lượt sau dưới 5/9 thì xem lại bộ lọc (bỏ Apple) bằng va-quy-tac.js.
- Không có quy tắc mới, không sửa bộ lọc.
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC (hướng dò ở mục 10/10: nền quy đổi không nhân hệ số trả góp — công cụ
  chưa có kiểu nền này). Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS, Vay tiền mặt, Ví trả sau, Mở thẻ
  tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–16/10 (bỏ lỡ cữ 15/10).

## 18/10/2026 (lượt dò hằng ngày, 10h giờ VN — 26 kho, 12.700 dòng, gói 03–18/10)

Không có lượt 17/10. Gói: 737 vẫn đứng ở 03/10, 12947/311 ở 09/10, haiboi/8304 ở 11/10, 631 ở 13/10, 8572/10715/8592/1902/9021
ở 15/10, 1430/4860/8107 ở 16/10, 1122/8966/1359/15885/781/28686/3935/5263/8874 ở 17/10, 1043/396/142 ở 18/10.
**Dữ liệu thiếu — không dùng làm bằng chứng:** 1043 dòng hàng dừng ở 09/10 dù gói 18/10 (vì thế hụt lớn ở mọi chương trình:
ĐT & tablet 986 cần / 607 được, laptop 192/74, trả chậm 785/396); 8572/10715/8592 thiếu 14–15/10; haiboi thiếu 11/10.
Chấm bằng `kiem-bang-gan.js`: **2/32 quy tắc đúng mọi kho** — FERROLI 16/16, ĐIỆN TỬ TCL 16/16.

| Quy tắc | khớp 18/10 (16/10) | kho lệch / ghi chú |
|---|---|---|
| FERROLI · ĐIỆN TỬ TCL | 16/16 | |
| CAMERA 21/26 (22) · LAPTOP 20/26 (21) · VIVO 20/26 (21) · SIM TỔNG 20/26 (21) · TABLET + MÁY ĐỌC SÁCH 20/26 (21) · REALME 20/26 | | thêm lệch đều do 1043 thiếu dòng |
| trả chậm HC+FE (gộp) 16/26 (18) | | 1043 · 8572/8592 (thiếu ngày) · 396 hụt 11,8 · 1359 · 4860 · haiboi · 781 · 28686 · 631 |
| MÁY SẤY & RỬA CHÉN 14/16 · Máy Lạnh 13/16 (14) · HÚT BỤI 13/16 (14) · PANASONIC 13/16 · Hút bụi - 20 Tỉnh 9/11 (10) | | 142 máy lạnh cần 5 được 8 (mới) · 1122 hút bụi dư 9,2 (mới) |
| QUẠT GIÓ 12/16 (13) · AUDIO 12/16 (13) · MÁY GIẶT 12/16 · TIVI 12/16 · PHỤ KIỆN CÔNG NGHỆ 13/18 | | 142 quạt dư 5,4 (mới) · 396 audio dư 2,6 (mới) |
| trả chậm điện máy 11/16 (12) · NỒI CƠM 10/16 (11) · SUNHOUSE 10/16 (11) · MÁY LỌC NƯỚC 10/16 | | 396 trả chậm ĐM dư 13,4 (mới) · 1122 Sunhouse cần 9,99 được 19,54 (mới) · 142 nồi cơm dư 0,67 |
| TỦ LẠNH 9/16 | | 396/8107/haiboi/3935/5263 hụt · 142/631 dư |
| TAI NGHE 13/26 (14) · SẠC DỰ PHÒNG 11/26 (13) · ĐT & TABLET ANDROID 10/26 (11) · CÁP - SẠC 7/26 (9) · SIM MOBIFONE/SIM DMX 6/20 (5) | | đều đã ganDung |
| ĐỒNG HỒ 6/9 | | 1043 (thiếu dòng) · 8592 · 781 hụt |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- Phần lớn số kho tụt 1–2 là do 1043 (gói mới nhưng dòng hàng cũ) — không phải quy tắc sai.
- **Mẫu hệ số ×1,2 (TỦ LẠNH):** học lại từ đầu (không --biet) — 7 kho khớp, ra 6 mẫu, 5 đã có. Kangaroo KGFZA268IK2
  (1750893000051) lại ra nghiệm lần hai nhưng thêm vào vẫn 9/16 và 631 dư thêm (112,68 → 114,07) ⇒ **vẫn chưa thêm**,
  giữ 36 mẫu. 4860/1902/5263/haiboi VÔ NGHIỆM, 8107/8874/142/396 nhiều nghiệm, 3935 bỏ qua (40 mẫu chưa biết).
- Đầu mối mới (chưa sửa): 1122 Sunhouse dư 9,55 ≈ máy lọc nước RO tủ đứng Sunhouse 8,32 bán 17/10 + 2 dòng ngày 17 — nhiều
  khả năng baocao chưa cộng ngày 17 (gói 17/10), xem lại lượt sau; nếu vẫn dư thì nghi máy lọc nước không thuộc chương trình.
- Không quy tắc nào bị đánh dấu mới (quy tắc chưa ganDung đều ≥ một nửa số kho). Không có quy tắc mới, không sửa bộ lọc.
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC (như cũ). Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm
  tổng, VAS, Vay tiền mặt, Ví trả sau, Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–18/10 (bỏ lỡ cữ 17/10).

## 19/10/2026 (lượt dò hằng ngày, sáng giờ VN — 26 kho, 14.489 dòng, gói 03–19/10)

Không có lượt 18/10 tối. Gói: 737 vẫn đứng ở 03/10, 12947/311 ở 09/10, haiboi/8304 ở 11/10, 631 ở 13/10,
8572/10715/8592 ở 15/10 (dòng hàng dừng 13/10 — thiếu 14–15/10), 1043/1122/8966/1359/396/142/15885/781/1902/9021/28686 ở 18/10,
1430/4860/8107/3935/5263/8874 ở 19/10. **1043 đã đủ dòng hàng 01–18/10** (lượt trước dừng ở 09/10). 9021 thiếu ngày 16/10,
haiboi thiếu 11/10. Lượt này nhiều dòng bị trả/huỷ bất thường: 28686 bỏ 464, 142 bỏ 335, 4860 bỏ 294.
Chấm bằng `kiem-bang-gan.js`: **1/32 quy tắc đúng mọi kho** — FERROLI 16/16 (ĐIỆN TỬ TCL tụt 15/16).

| Quy tắc | khớp 19/10 (18/10) | kho lệch / ghi chú |
|---|---|---|
| FERROLI | 16/16 | |
| **ĐIỆN TỬ TCL 15/16** (16) | | 4860 cần 18,55 được 26,10 — baocao TRỪ 4,44 từ gói 16 sang 19 (xem dưới) |
| SIM TỔNG 23/26 (20) · CAMERA 21/26 · LAPTOP 21/26 (20) · TABLET + MÁY ĐỌC SÁCH 21/26 (20) · REALME 20/26 · trả chậm HC+FE (gộp) 20/26 (16) · VIVO 19/26 (20) | | 1043 hết lệch ở phần lớn chương trình; 8572/8592 thiếu ngày |
| **MÁY GIẶT 14/16** (12) · QUẠT GIÓ 13/16 (12) · MÁY SẤY & RỬA CHÉN 13/16 (14) · PANASONIC 13/16 · PHỤ KIỆN CÔNG NGHỆ 13/18 | | haiboi/8304 · 142 quạt dư 5,4 · 396 sấy dư 13 |
| Máy Lạnh 12/16 (13) · TIVI 12/16 · AUDIO 12/16 · HÚT BỤI 11/16 (13) · trả chậm điện máy 11/16 · Hút bụi - 20 Tỉnh 9/11 | | 1122 hút bụi dư 9,2 · 396 tivi dư 66 · 396 trả chậm ĐM dư 48,6 |
| MÁY LỌC NƯỚC 10/16 · NỒI CƠM 9/16 (10) · SUNHOUSE 9/16 (10) · TỦ LẠNH 9/16 | | 1122 Sunhouse vẫn dư 6,8 |
| TAI NGHE 12/26 (13) · SẠC DỰ PHÒNG 11/26 · ĐT & TABLET ANDROID 11/26 (10) · CÁP - SẠC 6/26 (7) · SIM MOBIFONE/SIM DMX 5/20 (6) | | đều đã ganDung |
| ĐỒNG HỒ 6/9 | | 1043 hụt 3,2 · 8592 hụt 8,2 · 781 dư 13,6 |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- **Mẫu hệ số ×1,2 (TỦ LẠNH):** học lại từ đầu (không --biet) — 7 kho khớp, ra 6 mẫu, 5 đã có. Kangaroo KGFZA268IK2
  (1750893000051) ra nghiệm lần ba nhưng 631 vẫn đứng gói 13/10 (không có bằng chứng mới, lần thử trước làm 631 dư thêm)
  ⇒ **vẫn chưa thêm**, giữ 36 mẫu. 4860/1902/5263/haiboi VÔ NGHIỆM, 8107/8874/142/396 nhiều nghiệm, 3935 bỏ qua (50 mẫu chưa biết).
- Đầu mối 1043 (dữ liệu nay đủ): REALME cần 10,44 = ĐÚNG hai máy C100i (08/10 4,713 + trả góp 15/10 5,731); baocao KHÔNG tính
  2 máy realme ngày 02/10 (6,58) và C85 ngày 14/10 (3,04). ĐT & TABLET ANDROID ở 1043 cũng dư ngay từ ngày 02/10 (17,71) ⇒ nhiều
  khả năng 1043 có đơn bị trả/đổi mà ycx chưa đánh dấu, không phải bộ lọc sai. Chưa sửa gì.
- Đầu mối 4860 TCL: dữ liệu có 3 tivi 55P635 (02/10 ×2 đều 8,66 và 15/10 8,79); baocao 8,66 → 22,99 (gói 16) → 18,55 (gói 19).
  Hai dòng 8,66 cùng ngày nhiều khả năng là một đơn bán – trả – bán lại; chờ lượt sau, không sửa bộ lọc.
- 1122 Sunhouse vẫn dư (cần 19,42 / được 26,18). Giả thuyết lượt trước «máy lọc nước không thuộc chương trình» BỊ BÁC: máy lọc
  nước Sunhouse bán ở 396, 8107, 1902, 5263 mà các kho đó vẫn khớp. Chưa rõ nguyên nhân, chưa sửa.
- Không quy tắc nào bị đánh dấu mới (quy tắc chưa ganDung đều ≥ một nửa số kho). Không có quy tắc mới, không sửa bộ lọc.
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC (như cũ). Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm
  tổng, VAS, Vay tiền mặt, Ví trả sau, Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–19/10.

## 22/10/2026 (lượt dò hằng ngày, 00h30 giờ VN — 26 kho, 16.126 dòng, gói 03–21/10)

Không có lượt 20–21/10. Gói: 737 vẫn đứng ở 03/10, 12947/311 ở 09/10, haiboi/8304 ở 11/10, 631 ở 13/10,
8572/10715/8592 ở 15/10 (dòng hàng dừng 13/10), 1902/9021 ở 18/10, 5263/8874 ở 19/10, 1043 ở 20/10, còn lại ở 21/10.
9021 thiếu ngày 16/10, haiboi thiếu 11/10. Lần đầu kiem-bang-gan báo lỗi mạng "terminated", chạy lại thì được.

**Phát hiện mới — DỮ LIỆU BỊ NHÂN ĐÔI:** ở **142 (100 dòng thừa), 4860 (137), 28686 (157)** cùng một đơn + cùng mã sản phẩm
xuất hiện 2–5 lần, dồn vào ngày **01–06/10** (vd 142 đơn 08807SO26100159874 tivi Samsung UA43F6000 có 9 dòng: 5 dòng đẩy
18/10 15h18 + 4 dòng đẩy 17/10 12h21). Ngày đó nằm ngoài khoảng phủ của cữ đẩy mới nhất nên bộ lọc "bị trả/huỷ" không gạt
được ⇒ mọi bản đẩy lặp đều được cộng. Giá trị thừa: 142 ≈ 190 tr, 4860 ≈ 256 tr, 28686 ≈ 429 tr (28686 riêng ngành điện thoại
353 tr). ⇒ ba kho này DƯ ở rất nhiều chương trình — **lỗi đường đẩy dữ liệu, không phải quy tắc sai; không sửa bộ lọc.**
(Ở 396/631/1902 cũng có dòng trùng nhưng là máy lạnh nhiều bộ trong một đơn — hợp lệ.)

Chấm bằng `kiem-bang-gan.js`: **1/32 quy tắc đúng mọi kho** — FERROLI 16/16.

| Quy tắc | khớp 21/10 (19/10) | kho lệch / ghi chú |
|---|---|---|
| FERROLI | 16/16 | |
| ĐIỆN TỬ TCL 15/16 (15) | | 4860 (dòng nhân đôi) |
| TABLET + MÁY ĐỌC SÁCH 21/26 (21) · SIM TỔNG 21/26 (23) · LAPTOP 20/26 (21) · REALME 19/26 (20) · VIVO 18/26 (19) · **CAMERA 18/26** (21) | | 142/4860/28686 dư (nhân đôi) · 781 nay hụt (gói 21/10 mới) · 1902/631/737 laptop dư |
| trả chậm HC+FE (gộp) 16/26 (20) | | 8572/8592 thiếu ngày · 142/4860/28686 dư · 781/396/haiboi/631/1359 hụt |
| MÁY SẤY & RỬA CHÉN 14/16 (13) · MÁY GIẶT 13/16 (14) · QUẠT GIÓ 13/16 · PHỤ KIỆN CÔNG NGHỆ 12/18 (13) | | |
| TIVI 11/16 (12) · AUDIO 11/16 (12) · Máy Lạnh 11/16 (12) · PANASONIC 11/16 (13) · trả chậm điện máy 11/16 | | 142/4860 kéo tụt |
| MÁY LỌC NƯỚC 10/16 · HÚT BỤI 10/16 (11) · NỒI CƠM 9/16 · SUNHOUSE 9/16 · TỦ LẠNH 9/16 · Hút bụi - 20 Tỉnh 8/11 (9) | | 1122/8966/3935 hút bụi dư |
| TAI NGHE 10/26 (12) · SẠC DỰ PHÒNG 11/26 · ĐT & TABLET ANDROID 10/26 (11) · CÁP - SẠC 6/26 · SIM MOBIFONE/SIM DMX 5/20 | | đều đã ganDung |
| ĐỒNG HỒ 7/9 (6) | | 8592 (thiếu ngày) · 781 dư 0,66 |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- Tụt 1–4 kho ở nhiều quy tắc phần lớn do 142/4860/28686 (nhân đôi) và 781 (gói mới 21/10, nhiều chương trình nay hụt nhẹ —
  có thể do baocao chốt sau lúc dòng hàng đẩy). Chưa sửa gì; chờ dữ liệu được dọn rồi chấm lại.
- **Mẫu hệ số ×1,2 (TỦ LẠNH):** học lại từ đầu (không --biet) — 6 kho khớp, ra 6 mẫu, 5 đã có. Kangaroo KGFZA268IK2
  ra nghiệm lần bốn nhưng 631 vẫn đứng gói 13/10 ⇒ **vẫn chưa thêm**, giữ 36 mẫu. 142/4860/1902/haiboi/396/5263 VÔ NGHIỆM
  (142/4860 vì dòng nhân đôi), 1122/8107/8874 nhiều nghiệm, 3935 bỏ qua (52 mẫu chưa biết).
- Không quy tắc nào bị đánh dấu mới (quy tắc chưa ganDung đều ≥ một nửa số kho). Không có quy tắc mới, không sửa bộ lọc.
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC (như cũ, không dò thêm — dữ liệu 3 kho đang bẩn). Dịch vụ thu hộ bỏ qua:
  Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS, Vay tiền mặt, Ví trả sau, Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–21/10 (bỏ lỡ cữ 20/10). Lưu ý: số "được" của 142/4860/28686 trong cữ này có lẫn dòng nhân đôi.

## 24/10/2026 (lượt dò hằng ngày, 15h45 giờ VN — 26 kho, 17.651 dòng, gói 03–24/10)

Không có lượt 22–23/10. Gói: 737 vẫn đứng ở 03/10, 12947/311 ở 09/10, haiboi/8304 ở 11/10, 631 ở 13/10,
8572/10715/8592 ở 15/10 (dòng hàng dừng 13/10), 1902/9021 ở 18/10, 5263/8874 ở 19/10, 1043/1122/8966/28686 ở 23/10,
còn lại (1359, 396, 142, 1430, 4860, 8107, 15885, 781, 3935) ở 24/10. 9021 thiếu 16/10, haiboi thiếu 11/10, 5263 thiếu 19/10.

**Dòng nhân đôi CHƯA được dọn, còn nặng hơn:** đếm cùng đơn + mã + giá + SL: 142 thừa 175 dòng (≈288 tr), 4860 207 (≈410 tr),
28686 221 (≈609 tr); 3935 44 dòng (≈122 tr — một phần có thể là máy lạnh nhiều bộ, chưa tách). Vẫn là lỗi đường đẩy, không sửa bộ lọc.

Chấm bằng `kiem-bang-gan.js`: **1/32 quy tắc đúng mọi kho** — FERROLI 16/16.

| Quy tắc | khớp 24/10 (21/10) | kho lệch / ghi chú |
|---|---|---|
| FERROLI | 16/16 (16) | |
| MÁY SẤY & RỬA CHÉN 15/16 (14) · ĐIỆN TỬ TCL 14/16 (15) | | TCL: 142 nay dư (nhân đôi) + 4860 như cũ |
| TABLET + MÁY ĐỌC SÁCH 21/26 (21) · SIM TỔNG 21/26 (21) · LAPTOP 19/26 (20) · REALME 19/26 (19) · VIVO 18/26 (18) · CAMERA 18/26 (18) | | 737 laptop cần 22,43 được 85,33 (gói đứng 03/10) |
| trả chậm HC+FE (gộp) 14/26 (16) · QUẠT GIÓ 13/16 · PHỤ KIỆN CÔNG NGHỆ 12/18 | | 8572/8592 thiếu ngày · haiboi hụt 135 |
| MÁY GIẶT 11/16 (13) · TIVI 11/16 · AUDIO 11/16 · Máy Lạnh 11/16 · PANASONIC 11/16 | | haiboi tivi hụt 79, giặt hụt 19 |
| **TỦ LẠNH 9/16** (9 — trước khi thêm mẫu là 8) · MÁY LỌC NƯỚC 9/16 (10) · HÚT BỤI 9/16 (10) · NỒI CƠM 9/16 · trả chậm điện máy 9/16 (11) · SUNHOUSE 8/16 (9) · Hút bụi - 20 Tỉnh 7/11 (8) | | 142/4860/3935 dư nhiều chương trình |
| SẠC DỰ PHÒNG 13/26 (11) · TAI NGHE 9/26 (10) · ĐT & TABLET ANDROID 8/26 (10) · CÁP - SẠC 5/26 (6) · SIM MOBIFONE/SIM DMX 5/20 | | đều đã ganDung |
| ĐỒNG HỒ 6/9 (7) | | 1043 hụt 1,7 · 8592 thiếu ngày · 781 dư 17 |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- **Mẫu hệ số ×1,2 (TỦ LẠNH):** học lại từ đầu (không --biet) — 7 kho khớp (631 nay khớp), ra 12 mẫu, 9 đã có. **Thêm 2 mẫu:**
  Aqua AQR-T388FA(WGB) `1751097000265` (8966 về khớp) và LG LTB31BLM `1751097000045` ⇒ 8/16 → 9/16, không kho nào mất. Kangaroo
  KGFZA268IK2 ra lần năm nhưng thêm vào làm 631 dư thêm (112,68 → 114,07) ⇒ **vẫn không thêm**. Nay 38 mẫu.
  haiboi/1902/4860/142/5263/396 VÔ NGHIỆM, 8107/8874 nhiều nghiệm, 3935 bỏ qua (58 mẫu chưa biết).
- Không quy tắc nào bị đánh dấu mới (quy tắc chưa ganDung đều ≥ một nửa số kho: thấp nhất TRẢ CHẬM ĐIỆN MÁY 9/16, MÁY LỌC NƯỚC 9/16).
  Không có quy tắc mới, không sửa bộ lọc.
- PHỤ KIỆN IT - NHÓM KHÁC (chưa có quy tắc) — thử nhanh trên kho sạch: 1430 cần 178,56 nhưng ngành 16+184+364 nền thực chỉ 104,54
  (quy đổi 374,41); 8107 cần 8,89 < thực 16+184 = 9,37. Không nền thực, không nền quy đổi, không hệ số chung nào khớp cả hai ⇒ có thể là
  hệ số theo nhóm hoặc gồm ngành khác (Laptop/Wearable). Chưa ra, để dò tiếp bằng hiệu số giữa hai ngày gói trong chua-khop.
- Chưa có quy tắc (hàng hoá): PHỤ KIỆN IT - NHÓM KHÁC. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS,
  Vay tiền mặt, Ví trả sau, Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–24/10 (bỏ lỡ cữ 22–23/10).

## 25/10/2026 (lượt dò hằng ngày, 09h–10h giờ VN — 26 kho, 18.043 dòng, gói 03–25/10)

Gói: 737 vẫn đứng ở 03/10, 12947/311 ở 09/10, haiboi/8304 ở 11/10, 631 ở 13/10, 8572/10715/8592 ở 15/10, 1902/9021 ở 18/10,
5263/8874 ở 19/10, 1122/8966/28686 ở 23/10, còn lại ở 24/10; 3935 và 396 đã sang 25/10. Lượt chấm đầu (09h10) chỉ 25 kho (28686 chưa có
danh mục); lượt thứ hai (10h) đủ 26 kho nhưng **396 đang giữa cữ đẩy sáng 25/10** (baocao đã sang, dòng hàng chưa đủ) nên 396 lệch tạm ở
20 chương trình — kéo tụt TỦ LẠNH, MÁY SẤY, LAPTOP, MÁY LỌC NƯỚC mỗi cái 1 kho. Không phải quy tắc sai. Dòng nhân đôi ở 142/4860
(175/207 dòng thừa) và 28686 vẫn chưa được dọn.

Chấm bằng `kiem-bang-gan.js` (lượt 10h): **1/33 quy tắc đúng mọi kho** — FERROLI 16/16.

| Quy tắc | khớp 25/10 (24/10) | ghi chú |
|---|---|---|
| FERROLI | 16/16 (16) | |
| MÁY SẤY & RỬA CHÉN 14/16 (15) · ĐIỆN TỬ TCL 14/16 (14) | | 396 lệch tạm |
| TABLET + MÁY ĐỌC SÁCH 21/26 · SIM TỔNG 21/26 · REALME 19/26 · VIVO 18/26 · LAPTOP 17/26 (19) · CAMERA 17/26 (18) | | |
| trả chậm HC+FE (gộp) 15/26 (14) · QUẠT GIÓ 12/16 (13) · PHỤ KIỆN CÔNG NGHỆ 12/18 | | |
| MÁY GIẶT 11/16 · TIVI 11/16 · AUDIO 11/16 · Máy Lạnh 11/16 · PANASONIC 11/16 | | |
| NỒI CƠM 9/16 · HÚT BỤI 9/16 · trả chậm điện máy 9/16 · TỦ LẠNH 8/16 (9) · MÁY LỌC NƯỚC 8/16 (9) · SUNHOUSE 8/16 · Hút bụi - 20 Tỉnh 7/11 | | |
| SẠC DỰ PHÒNG 12/26 (13) · TAI NGHE 9/26 · ĐT & TABLET ANDROID 9/26 (8) · CÁP - SẠC 5/26 · SIM MOBIFONE/SIM DMX 5/20 | | đều đã ganDung |
| ĐỒNG HỒ 6/9 (6) | | |
| **T10 - PHỤ KIỆN IT - NHÓM KHÁC (MỚI)** | **9/26** | ganDung |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- **Quy tắc MỚI — T10 - PHỤ KIỆN IT - NHÓM KHÁC** (dò ra bằng hiệu số giữa các ngày gói trong chua-khop): ngành 16 phụ kiện tiện ích
  TRỪ các nhóm đã có chương trình riêng (sạc dự phòng 12, sạc 14, cáp 3345, tai nghe 3346/4540/15, camera 6479/4219, robot 7359) và trừ
  nhóm Apple 4659/2831/6400, 4128, máy chiếu 4860, máy ảnh 409, hàng giá rẻ 4095/2691 — tính **giá thực × 3,37**; cộng ngành 184 nhóm dán
  kính 4199, ốp lưng 431, dán mặt trước 1231, túi chống sốc 5975 tính **giá thực × 6** (heSoSP = 6 cho 247 mã đã thấy). Mở khoá ở 8107:
  4,35 = 3 dán kính × 0,2417 × 6; +0,30 = chuột × 3,37; +1,09 = thẻ nhớ × 3,37; +0,66 = ốp lưng × 6. Khớp từng đồng 9 kho (1043, 12947, 8304,
  15885, 1902, 9021, 8874, 631, 737 — sáu kho khớp cả 4 mốc ngày), gần khớp 781/1430/1359/8966/8107; DƯ chưa rõ ở 1122 (+29) và 311 (+3,6)
  ⇒ để ganDung. Mã 184 mới chưa có trong danh sách sẽ chỉ ×3,37 (hơi hụt) — lượt sau nên bổ sung mã.
- **Mẫu hệ số ×1,2 (TỦ LẠNH):** học lại từ đầu — 7 kho khớp, 12 mẫu, 11 đã có; Kangaroo KGFZA268IK2 ra lần sáu nhưng 631 vẫn đứng gói 13/10
  ⇒ không thêm, giữ 38 mẫu.
- Không quy tắc nào bị đánh dấu mới (thấp nhất MÁY LỌC NƯỚC 8/16 = đúng một nửa, do 396 lệch tạm). Không sửa bộ lọc quy tắc cũ.
- Chưa có quy tắc (hàng hoá): không còn. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS, Vay tiền mặt, Ví trả sau,
  Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–25/10.

## 26/10/2026 (lượt dò hằng ngày, 09h giờ VN — 26 kho, 19.126 dòng, gói 03–26/10)

Gói: 737 vẫn đứng ở 03/10, 12947/311 ở 09/10, haiboi/8304 ở 11/10, 631 ở 13/10, 8572/10715/8592 ở 15/10; **1902, 9021, 5263, 8874 đã
lên lại** (25/10) cùng 1043/1122/8966/1359/396/142/15885/781/3935; 1430/4860/8107/28686 đã sang 26/10. Dòng nhân đôi ở 142/4860/28686 vẫn
chưa được dọn (bỏ 164/155/318 dòng trả/huỷ). **15885 có dòng CŨ (ngày 03–10/10) mới đẩy muộn** — iPhone Air 03/10, Galaxy S26 06/10,
thẻ nhớ Sandisk 07/10, vivo V70 10/10… — baocao không tính, làm dư nhiều chương trình ở 15885 (lỗi đường đẩy, không phải quy tắc).

Chấm bằng `kiem-bang-gan.js`: **1/33 quy tắc đúng mọi kho** — FERROLI 16/16.

| Quy tắc | khớp 26/10 (25/10) | ghi chú |
|---|---|---|
| FERROLI | 16/16 (16) | |
| MÁY SẤY & RỬA CHÉN 14/16 (14) · ĐIỆN TỬ TCL 13/16 (14) | | 1902 TCL hụt 11,6 |
| TABLET + MÁY ĐỌC SÁCH 20/26 (21) · SIM TỔNG 19/26 (21) · REALME 19/26 · VIVO 18/26 · CAMERA 16/26 (17) · LAPTOP 15/26 (17) | | 15885 dòng muộn; 1902 lên gói mới |
| trả chậm HC+FE (gộp) 14/26 (15) · PHỤ KIỆN CÔNG NGHỆ 12/18 · QUẠT GIÓ 11/16 (12) | | |
| AUDIO 11/16 · PANASONIC 11/16 · MÁY GIẶT 10/16 (11) · TIVI 10/16 (11) · Máy Lạnh 10/16 (11) · HÚT BỤI 10/16 (9) | | |
| TỦ LẠNH 9/16 (8) · trả chậm điện máy 8/16 (9) · Hút bụi - 20 Tỉnh 8/11 (7) · NỒI CƠM 7/16 (9) · SUNHOUSE 7/16 (8) · MÁY LỌC NƯỚC 7/16 (8) | | |
| SẠC DỰ PHÒNG 11/26 (12) · TAI NGHE 10/26 (9) · ĐT & TABLET ANDROID 8/26 (9) · CÁP - SẠC 6/26 (5) · SIM MOBIFONE/SIM DMX 4/20 (5) | | đều đã ganDung |
| ĐỒNG HỒ 6/9 (6) | | |
| T10 - PHỤ KIỆN IT - NHÓM KHÁC | 8/26 (9) | ganDung — mất 15885 (dòng muộn) và 1902 (hụt 1,50), được 3935 |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- **PHỤ KIỆN IT - NHÓM KHÁC:** bổ sung 5 mã nhóm 184 mới vào heSoSP ×6 (3 ốp lưng, 1 túi chống sốc, 1 dán kính — đa số ở 28686) ⇒ 252 mã;
  chấm lại vẫn 8/26, không kho nào mất. Soát 15885: ngày 24/10 khớp từng đồng (+11,78 = 3 dán kính + 3 ốp lưng ×6, chuột ×3,37; Apple 4659
  và cáp không cộng — xác nhận lại bộ lọc); phần dư 5,90 đúng bằng thẻ nhớ Sandisk 256GB ngày 07/10 (1,75 × 3,37) mới đẩy muộn.
  1902 hụt 1,50 (đã hụt 1,12 ở mốc 18/10, trước khi gói đứng một tuần) — chưa rõ, để theo dõi.
- **Mẫu hệ số ×1,2 (TỦ LẠNH):** học lại từ đầu — 6 kho khớp, 15 mẫu, cả 15 đã có ⇒ không thêm, giữ 38 mẫu. 8107/631/haiboi/142/4860/396
  vô nghiệm, 8874/5263/1902 nhiều nghiệm, 3935 bỏ qua (59 mẫu chưa biết).
- Không quy tắc nào bị đánh dấu mới: MÁY LỌC NƯỚC 7/16 lần đầu dưới một nửa (hôm qua 8/16 = đúng một nửa) — mai còn dưới thì đánh dấu.
  Không có quy tắc mới, không sửa bộ lọc quy tắc cũ.
- Chưa có quy tắc (hàng hoá): không còn. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS, Vay tiền mặt, Ví trả sau,
  Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–26/10.

## 27/10/2026 (lượt dò hằng ngày, 22h40 giờ VN — 26 kho, 19.523 dòng, gói 03–27/10)

Gói: 737 vẫn đứng ở 03/10, 12947/311 ở 09/10, haiboi/8304 ở 11/10, 631 ở 13/10, 8572/10715/8592 ở 15/10, 1122/8966/1902/9021/5263/8874
ở 25/10; 11 kho đã sang 27/10 (1043, 1359, 396, 142, 1430, 4860, 8107, 15885, 781, 28686, 3935). Dòng nhân đôi ở 142/4860/28686 vẫn chưa
được dọn (bỏ 351/349/613 dòng trả/huỷ). Cụm 10129/12329/1263/715 vẫn không có dòng hàng tháng 10.

Chấm bằng `kiem-bang-gan.js`: **1/33 quy tắc đúng mọi kho** — FERROLI 16/16.

| Quy tắc | khớp 27/10 (26/10) | ghi chú |
|---|---|---|
| FERROLI | 16/16 (16) | |
| MÁY SẤY & RỬA CHÉN 14/16 (14) · ĐIỆN TỬ TCL 14/16 (13) | | |
| SIM TỔNG 21/26 (19) · VIVO 20/26 (18) · TABLET + MÁY ĐỌC SÁCH 20/26 · REALME 19/26 · LAPTOP 19/26 (15) · CAMERA 18/26 (16) | | lên lại sau ngày 15885 dòng muộn |
| PHỤ KIỆN CÔNG NGHỆ 12/18 · QUẠT GIÓ 11/16 · MÁY GIẶT 11/16 (10) | | |
| **trả chậm HC+FE (gộp) 12/26 (14)** | | lần đầu dưới một nửa |
| TIVI 10/16 · Máy Lạnh 10/16 · HÚT BỤI 10/16 · AUDIO 10/16 (11) · PANASONIC 10/16 (11) · trả chậm điện máy 10/16 (8) | | |
| MÁY LỌC NƯỚC 9/16 (7) · TỦ LẠNH 8/16 (9) · NỒI CƠM 8/16 (7) · SUNHOUSE 8/16 (7) · Hút bụi - 20 Tỉnh 8/11 | | |
| SẠC DỰ PHÒNG 13/26 (11) · TAI NGHE 9/26 (10) · ĐT & TABLET ANDROID 9/26 (8) · CÁP - SẠC 6/26 · SIM MOBIFONE/SIM DMX 4/20 | | đều đã ganDung |
| ĐỒNG HỒ 6/9 (6) | | |
| T10 - PHỤ KIỆN IT - NHÓM KHÁC | 7/26 (8) | ganDung |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- **PHỤ KIỆN IT - NHÓM KHÁC:** bổ sung 4 mã nhóm 184 mới (đều ở 781: dán kính REDMI NOTE 15 JC, dán kính Galaxy A37/A57 Mipow, ốp lưng
  Galaxy S26 Ultra Slim Magnet, ốp lưng Galaxy A57 Silicone) vào heSoSP ×6 ⇒ 256 mã; chấm lại vẫn 7/26, không kho nào mất.
- **Mẫu hệ số ×1,2 (TỦ LẠNH):** học lại từ đầu — 6 kho khớp (737, 12947, 8304, 9021, 8966, 1122), 15 mẫu, cả 15 đã có ⇒ không thêm, giữ 38
  mẫu. 631/haiboi vô nghiệm, 8107/8874/142/4860/5263/1902/396 nhiều nghiệm, 3935 bỏ qua (64 mẫu chưa biết).
- **MÁY LỌC NƯỚC** lên lại 9/16 (hôm qua 7/16) ⇒ không đánh dấu. **Trả chậm HomeCredit + FE/Shinhan/Samsung (gộp)** lần đầu xuống dưới một
  nửa (12/26) — mai còn dưới thì đánh dấu ganDung. Không quy tắc nào bị đánh dấu mới, không có quy tắc mới, không sửa bộ lọc quy tắc cũ.
- Chưa có quy tắc (hàng hoá): không còn. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS, Vay tiền mặt, Ví trả sau,
  Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–27/10.

## 28/10/2026 (lượt dò hằng ngày, 15h40 giờ VN — 26 kho, 19.683 dòng, gói 03–28/10)

Gói: 737 vẫn đứng ở 03/10, 12947/311 ở 09/10, haiboi/8304 ở 11/10, 631 ở 13/10, 8572/10715/8592 ở 15/10, 1122/8966/1902/9021/5263/8874
ở 25/10, 1359/396/142/15885/781 ở 27/10; 6 kho đã sang 28/10 (1043, 1430, 4860, 8107, 28686, 3935). Dòng nhân đôi ở 142/4860/28686 vẫn
chưa được dọn (bỏ 351/349/600 dòng trả/huỷ). Cụm 10129/12329/1263/715 vẫn không có dòng hàng tháng 10. Số gần như y hệt hôm qua vì đa số
kho chưa lên gói mới.

Chấm bằng `kiem-bang-gan.js`: **1/33 quy tắc đúng mọi kho** — FERROLI 16/16.

| Quy tắc | khớp 28/10 (27/10) | ghi chú |
|---|---|---|
| FERROLI | 16/16 (16) | |
| ĐIỆN TỬ TCL 14/16 (14) · MÁY SẤY & RỬA CHÉN 13/16 (14) | | |
| SIM TỔNG 21/26 · VIVO 20/26 · TABLET + MÁY ĐỌC SÁCH 20/26 · REALME 19/26 · LAPTOP 19/26 · CAMERA 18/26 | | không đổi |
| PHỤ KIỆN CÔNG NGHỆ 12/18 · QUẠT GIÓ 11/16 · MÁY GIẶT 11/16 · HÚT BỤI 11/16 (10) · Hút bụi - 20 Tỉnh 9/11 (8) | | |
| TIVI 10/16 · AUDIO 10/16 · PANASONIC 10/16 · trả chậm điện máy 10/16 · Máy Lạnh 9/16 (10) · MÁY LỌC NƯỚC 9/16 | | |
| NỒI CƠM 8/16 · SUNHOUSE 8/16 · TỦ LẠNH 7/16 (8) | | TỦ LẠNH đã ganDung từ trước |
| **trả chậm HC+FE (gộp) 12/26 (12)** | | **ĐÁNH DẤU ganDung** — hai ngày liền dưới một nửa |
| SẠC DỰ PHÒNG 13/26 · TAI NGHE 9/26 · ĐT & TABLET ANDROID 8/26 (9) · CÁP - SẠC 6/26 · SIM MOBIFONE/SIM DMX 4/20 | | đều đã ganDung |
| ĐỒNG HỒ 6/9 (6) | | |
| T10 - PHỤ KIỆN IT - NHÓM KHÁC | 8/26 (7) | ganDung |
| T09 - T10 IPHONE 18 | 0/26 | cộng dồn từ tháng 9 — bình thường |

- **Đánh dấu:** T10 - TRẢ CHẬM HOMECREDIT và T10 - TRẢ CHẬM FECREDIT, SHINHAN, SAMSUNG FINANCE+ (đo gộp) → `ganDung: true`. 27/10 và 28/10
  đều 12/26, trước đó từng đạt 20/20. Lệch dồn ở 8572/8592/haiboi (hụt từ giữa tháng, gói đứng), 781/1359/396 hụt, 142/28686/3935/5263
  dư (dòng nhân đôi). Không sửa bộ lọc.
- **PHỤ KIỆN IT - NHÓM KHÁC:** thêm 2 mã nhóm 184 mới ×6 (bao da iPad Pro 11 UNIQ, dán kính iPad Pro 11 JCPAL — cả hai ở 1043 ngày 27/10)
  ⇒ 258 mã. Chấm lại vẫn 8/26, không kho nào mất; 1043 hụt giảm từ 16,49 xuống 13,34.
- **Mẫu hệ số ×1,2 (TỦ LẠNH):** học lại từ đầu — 6 kho khớp (737, 12947, 8304, 9021, 8966, 1122), 15 mẫu, cả 15 đã có ⇒ không thêm, giữ 38
  mẫu. 631/haiboi vô nghiệm, 8107/8874/142/4860/5263/1902/396 nhiều nghiệm, 3935 bỏ qua (66 mẫu chưa biết).
- Không có quy tắc mới, không sửa bộ lọc quy tắc cũ.
- Chưa có quy tắc (hàng hoá): không còn. Dịch vụ thu hộ bỏ qua: Bảo hiểm thợ ĐMX_CE/_ICT, Bảo hiểm tổng, VAS, Vay tiền mặt, Ví trả sau,
  Mở thẻ tín dụng, Nạp - rút tiền.
- chua-khop-202610.json: đã lưu cữ gói 03–28/10.
