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
