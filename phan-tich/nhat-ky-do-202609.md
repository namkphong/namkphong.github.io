# Nhật ký dò bảng gán tháng 202609

Mỗi ngày một mục. Công cụ: `node phan-tich/kiem-bang-gan.js --thang 202609`.
"Kho đủ tháng" = bỏ 3 kho dữ liệu dòng hàng thiếu: 5124 (64 dòng cả tháng),
8304 (25 dòng), 715 (Uy Nỗ — được 0 ở nhiều chương trình). Số `x/y` dưới đây tính
trên kho đủ tháng; kho nào không bán chương trình đó thì không nằm trong mẫu số.

## 24/09/2026 (lượt đầu của lịch dò hằng ngày)

Dữ liệu: 17 gói cụm · 27 kho có dòng hàng · 6 kho chưa góp được (cụm 10129, 1263).

| Quy tắc | Khớp (kho đủ tháng) | Ghi chú |
|---|---|---|
| TABLET ANDROID | 22/24 | lệch 396 dư 2,74 · 8592 thiếu hẳn 31,28 |
| SIM tổng | 21/24 | |
| T09 - T10 IPHONE 18 series, iPhone Duo | 19/23 | lệch đều là thiếu đúng giá 1–2 máy |
| Camera | 16/24 | |
| Điện thoại realme | 15/24 | gần đúng (ganDung) |
| Laptop (trừ Apple) | 14/24 | |
| Điện thoại Vivo | 14/24 | |
| TAI NGHE | 12/24 | gần đúng |
| SIM MOBIFONE/VINAPHONE/SIM DMX | 12/24 | gần đúng |
| Tivi TCL | 12/13 | chỉ 4860 thiếu 7,49 |
| Điện tử Sony | 11/13 | 3935 · 737 thiếu (hàng cồng kềnh) |
| PHỤ KIỆN CÔNG NGHỆ | 11/17 | gần đúng |
| Máy nước nóng | 10/14 | |
| Máy giặt | 9/14 | hụt hàng cồng kềnh |
| TRẢ CHẬM HOMECREDIT + FECREDIT (đo gộp) | 9/24 | ⚠ dưới một nửa |
| QUẠT GIÓ | 8/14 | |
| TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG | 8/14 | |
| SẠC DỰ PHÒNG | 8/24 | gần đúng |
| T09 - Máy Lạnh | 8/13 | gần đúng |
| ĐIỆN TỬ & ĐIỆN LẠNH & GIA DỤNG Toshiba/Comfee | 7/14 | đúng một nửa |
| ĐIỆN THOẠI & TABLET ANDROID | 7/24 | ⚠ dưới một nửa |
| Nồi cơm - nồi chiên | 6/14 | ⚠ dưới một nửa |
| MÁY LỌC KHÔNG KHÍ - HÚT/ TẠO ẨM - HÚT BỤI | 5/14 | ⚠ dưới một nửa |
| MÁY LỌC NƯỚC | 5/14 | ⚠ dưới một nửa |
| ĐIỆN TỬ | 5/14 | gần đúng |
| Đồng hồ | 4/7 | 8592 · 715 thiếu nhiều, 1043 lệch 0,18 |
| Gia dụng Kangaroo | 3/14 | ⚠ dưới một nửa |
| Cáp - Sạc | 2/24 | ⚠ dưới một nửa — đa số kho DƯ nhẹ 0,1–1 tr |
| Phụ kiện IT và nhóm khác | 1/24 | danh sách sản phẩm, cố ý không khớp tổng |
| TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT | 0/14 | hụt hàng cồng kềnh, xem `hutHangCongKenh` — chưa bao giờ đạt |
| Đồng hồ tháng 9 | 0/0 | chỉ kho 8304 (thiếu dữ liệu) dùng tên này; ở đó khớp |

**Quy tắc mới thêm:** không có — không còn chương trình hàng hoá nào chưa có quy tắc.

**Quy tắc bị đánh dấu ganDung hôm nay:** không. Đây là lượt đầu nên chưa đủ "hai ngày
liền". Bảy quy tắc ⚠ ở trên (hai TRẢ CHẬM tính là một) đang dưới một nửa số kho đủ tháng
và trước đây từng ghi "4/4 kho — chắc": **nếu lượt 25/09 vẫn dưới một nửa thì đặt
ganDung: true** cho: ĐIỆN THOẠI & TABLET ANDROID · TRẢ CHẬM HOMECREDIT · TRẢ CHẬM FECREDIT,
SHINHAN, SAMSUNG FINANCE+ · Nồi cơm - nồi chiên · MÁY LỌC KHÔNG KHÍ… · MÁY LỌC NƯỚC ·
Gia dụng Kangaroo · Cáp - Sạc.

**Chương trình còn chưa có quy tắc (8):** toàn bộ là dịch vụ thu hộ — Bảo hiểm Thợ ĐMX ·
Bảo hiểm tổng · Mở thẻ tín dụng TPBank EVO/VPBank · Nạp rút tiền tài khoản ngân hàng ·
OTT MANGO+/ICALLME · VAS · Vay tiền mặt · Ví trả sau. Không nằm trong ycx_lines, không dò.

## 25/09/2026

Dữ liệu: 17 gói cụm · 25 kho có dòng hàng (8874 hôm nay không có gói) · 8 kho chưa góp
được (cụm 10129, 1263, 2 kho của cụm 5263). **Kho đủ tháng** hôm nay bỏ thêm **10715
(21D Hàng Bài) và 8592 (21 Hàng Gai)**: hai kho này KHÔNG có dòng hàng ngày 1–6/09, nên
hụt ở mọi chương trình — không phải quy tắc sai. Cùng với 5124 · Hải Bối · 8304 · 715 là
6 kho không dùng làm bằng chứng. Số `x/y` dưới đây vì vậy nhỏ hơn hôm qua một chút.

| Quy tắc | 24/09 | 25/09 | Ghi chú |
|---|---|---|---|
| Tivi TCL | 12/13 | **11/11** | đúng mọi kho |
| SIM tổng | 21/24 | 18/19 | |
| TABLET ANDROID | 22/24 | 18/19 | 396 dư 2,74 |
| T09 - T10 IPHONE 18 series, iPhone Duo | 19/23 | 16/19 | vẫn thiếu đúng giá 1–2 máy |
| Điện tử Sony | 11/13 | 9/11 | |
| Máy nước nóng | 10/14 | 8/11 | |
| **Gia dụng Kangaroo** | 3/14 | **8/11** | **sửa quy tắc** — xem dưới |
| PHỤ KIỆN CÔNG NGHỆ | 11/17 | 10/14 | |
| Laptop (trừ Apple) | 14/24 | 13/19 | |
| Đồng hồ | 4/7 | 4/6 | |
| TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG | 8/14 | 7/11 | |
| T09 - Máy Lạnh | 8/13 | 7/11 | |
| Điện thoại realme | 15/24 | 12/19 | |
| Camera | 16/24 | 11/19 | |
| SIM MOBIFONE/VINAPHONE/SIM DMX | 12/24 | 11/19 | |
| Điện thoại Vivo | 14/24 | 11/19 | |
| QUẠT GIÓ | 8/14 | 6/11 | |
| Máy giặt | 9/14 | 6/11 | thử hệ số theo mẫu: không ra |
| TAI NGHE | 12/24 | 10/19 | |
| **TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT** | 0/14 | **5/11** | **+14 mẫu ×1,2** |
| MÁY LỌC KHÔNG KHÍ - HÚT/ TẠO ẨM - HÚT BỤI | 5/14 | 5/11 | ⚠ đặt ganDung |
| Nồi cơm - nồi chiên | 6/14 | 5/11 | ⚠ đặt ganDung |
| ĐIỆN TỬ & ĐIỆN LẠNH & GIA DỤNG Toshiba/Comfee | 7/14 | 5/11 | ⚠ ngày đầu dưới một nửa |
| ĐIỆN TỬ | 5/14 | 5/11 | thử hệ số theo mẫu: không nhận |
| TRẢ CHẬM HOMECREDIT + FECREDIT (đo gộp) | 9/24 | 7/19 | ⚠ đặt ganDung |
| MÁY LỌC NƯỚC | 5/14 | 4/11 | ⚠ đặt ganDung |
| ĐIỆN THOẠI & TABLET ANDROID | 7/24 | 6/19 | ⚠ đặt ganDung — đa số kho DƯ |
| SẠC DỰ PHÒNG | 8/24 | 5/19 | đã gần đúng |
| Cáp - Sạc | 2/24 | 2/19 | ⚠ đặt ganDung — đa số kho DƯ nhẹ |
| Phụ kiện IT và nhóm khác | 1/24 | 0/19 | danh sách sản phẩm, cố ý |
| Đồng hồ tháng 9 | 0/0 | 0/0 | chỉ kho 8304 |

**Quy tắc mới thêm:** không có — 8 chương trình chưa có quy tắc vẫn toàn là dịch vụ thu hộ.

**Sửa quy tắc — Gia dụng Kangaroo:** thêm `nganh` 484 · 1116 · 1214 · 1754, tức bỏ **tủ
đông Kangaroo** (ngành 1755) và **lõi lọc** (ngành 1394). `va-quy-tac.js` chỉ ra lõi lọc;
kho 396 dư đúng 10,18 = một tủ đông Kangaroo. Từ 3/11 lên 8/11 kho. Còn 1122 dư 2,38 ·
4860 dư 4,15 (≈ một máy lọc nước tủ đứng 4,16) · 3935 hụt → để `ganDung: true`.

**Mẫu hệ số ×1,2 mới học — TỦ LẠNH (20 → 34 mẫu):** Toshiba GR-RF606WI · GR-RF677WI ·
GR-RF665WIA · Samsung RB27N4020B1 · RT22M4032BY · RB30N4190B1 · AQUA AQR-S633XA ·
Panasonic NR-XZ550CWKV · NR-BX471GPKV · Hitachi R-WB640PGV1 · HRSN9563DWDXVN · LG F58BGD ·
Haier HM650AGWVNU1 · HM829AWMBVNU1. Kho khớp 1/11 → 5/11 (1122 · 142 · 8107 · 1902 ·
9021). Kho 8966 hôm qua khớp nay hụt 11,26 dù mọi mẫu ở đó đã biết — nghi thiếu dòng
hàng ngày 24/09, chưa sửa gì.

**Thử mà không nhận:**
- Máy giặt (--nhom 1099,3659,3859): không ra mẫu ×1,2 nào; kho 142 hụt 71 trên tổng 117
  — quá mức 20% nên không phải thi đua hãng.
- ĐIỆN TỬ (--nganh 304): công cụ ra 6 mẫu nhưng chỉ học từ kho thiếu dữ liệu và làm kho
  1902 mâu thuẫn — bỏ. 142 hụt 69 trên 156, cũng quá mức 20%.
- MÁY LỌC KHÔNG KHÍ + nhóm 7459 (phụ kiện máy hút bụi): vá được 8966 · 4860 nhưng làm
  hỏng 3935 — chưa nhận, để theo dõi.

**Quy tắc bị đánh dấu ganDung hôm nay (dưới một nửa HAI NGÀY LIỀN, trước từng "4/4 kho —
chắc"):** ĐIỆN THOẠI & TABLET ANDROID · TRẢ CHẬM HOMECREDIT · TRẢ CHẬM FECREDIT, SHINHAN,
SAMSUNG FINANCE+ · Nồi cơm - nồi chiên · MÁY LỌC KHÔNG KHÍ… · MÁY LỌC NƯỚC · Cáp - Sạc.
(Gia dụng Kangaroo cũng ganDung nhưng vì vừa sửa quy tắc.) **Theo dõi mai:** ĐIỆN TỬ &
ĐIỆN LẠNH & GIA DỤNG Toshiba/Comfee 5/11 — nếu 26/09 vẫn dưới một nửa thì đánh dấu.

**Chương trình còn chưa có quy tắc (8):** toàn bộ dịch vụ thu hộ — Bảo hiểm Thợ ĐMX ·
Bảo hiểm tổng · Mở thẻ tín dụng TPBank EVO/VPBank · Nạp rút tiền tài khoản ngân hàng ·
OTT MANGO+/ICALLME · VAS · Vay tiền mặt · Ví trả sau. Không dò.

## 26/09/2026

Dữ liệu: 17 gói cụm · 27 kho có dòng hàng (8874 có gói trở lại) · 6 kho chưa góp được
(cụm 10129, 1263). Kho đủ tháng: bỏ 6 kho như hôm qua — 5124 · Hải Bối · 8304 · 715
(thiếu nhiều ngày) và 10715 · 8592 (không có dòng ngày 1–6/09). Mẫu số lớn hơn hôm qua vì
có thêm 8874 và 5263/12947 bán thêm chương trình.

| Quy tắc | 25/09 | 26/09 | Ghi chú |
|---|---|---|---|
| SIM tổng | 18/19 | 20/21 | 737 hụt 3 |
| TABLET ANDROID | 18/19 | 20/21 | 396 dư 12,41 |
| T09 - T10 IPHONE 18 series, iPhone Duo | 16/19 | 17/21 | vẫn thiếu đúng giá 1–2 máy |
| Tivi TCL | 11/11 | 12/13 | 3935 hụt 14,49 |
| Điện tử Sony | 9/11 | 11/13 | 3935 · 737 hụt |
| Laptop (trừ Apple) | 13/19 | 13/21 | |
| Điện thoại realme | 12/19 | 13/21 | |
| Camera | 11/19 | 12/21 | |
| SIM MOBIFONE/VINAPHONE/SIM DMX | 11/19 | 12/21 | |
| Điện thoại Vivo | 11/19 | 12/21 | |
| TAI NGHE | 10/19 | 11/21 | |
| PHỤ KIỆN CÔNG NGHỆ | 10/14 | 10/14 | |
| Máy nước nóng | 8/11 | 9/13 | |
| T09 - Máy Lạnh | 7/11 | 9/13 | |
| Gia dụng Kangaroo | 8/11 | 8/13 | 8874 dư 19,35 |
| Máy giặt | 6/11 | 8/13 | |
| Đồng hồ | 4/6 | 4/6 | |
| **TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT** | 5/11 | **7/13** | 8874 · 5263 khớp; vẫn ganDung |
| TRẢ CHẬM HOMECREDIT + FECREDIT (đo gộp) | 7/19 | 10/21 | vẫn ganDung |
| QUẠT GIÓ | 6/11 | 6/13 | ⚠ ngày đầu dưới một nửa |
| TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG | 7/11 | 6/13 | ⚠ ngày đầu dưới một nửa |
| MÁY LỌC KHÔNG KHÍ - HÚT/ TẠO ẨM - HÚT BỤI | 5/11 | 6/13 | ganDung |
| **ĐIỆN TỬ & ĐIỆN LẠNH & GIA DỤNG Toshiba/Comfee** | 5/11 | 6/13 | ⚠ **đặt ganDung** |
| Nồi cơm - nồi chiên | 5/11 | 5/13 | ganDung |
| MÁY LỌC NƯỚC | 4/11 | 5/13 | ganDung |
| ĐIỆN TỬ | 5/11 | 5/13 | ganDung |
| ĐIỆN THOẠI & TABLET ANDROID | 6/19 | 5/21 | ganDung — đa số kho DƯ |
| SẠC DỰ PHÒNG | 5/19 | 7/21 | ganDung |
| Cáp - Sạc | 2/19 | 2/21 | ganDung — đa số kho DƯ nhẹ |
| Phụ kiện IT và nhóm khác | 0/19 | 0/21 | danh sách sản phẩm, cố ý |
| Đồng hồ tháng 9 | 0/0 | 0/0 | chỉ kho 8304 |

**Quy tắc mới thêm:** không có — 8 chương trình chưa có quy tắc vẫn toàn là dịch vụ thu hộ.

**Mẫu hệ số ×1,2 mới học:** không có. Chạy `hoc-he-so-sp.js` cho TỦ LẠNH với 34 mẫu đã
biết: 8 kho khớp; 12947 (2 mẫu chưa biết) · 4860 (5) · 396 (12) vô nghiệm, 5263 nhiều
nghiệm, 737 · 3935 quá nhiều mẫu chưa biết. 8966 vẫn hụt 11,26 dù mọi mẫu đã biết (như
hôm qua) — nghi thiếu dòng hàng, không sửa. Ba kho "vô nghiệm" cho thấy ngoài danh sách
mẫu có thể còn yếu tố khác (hoặc thiếu dòng) — chưa đoán thêm.

**Quy tắc bị đánh dấu ganDung hôm nay:** ĐIỆN TỬ & ĐIỆN LẠNH & GIA DỤNG Toshiba/Comfee —
dưới một nửa hai ngày liền (5/11 rồi 6/13), trước từng ghi "4/4 kho — chắc". Lệch cả hai
chiều (142 · 5263 · 8874 dư; 4860 · 737 hụt).

**Theo dõi mai:** QUẠT GIÓ 6/13 và TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG 6/13 — lần đầu dưới một
nửa; nếu 27/09 vẫn dưới thì đánh dấu.

**Chương trình còn chưa có quy tắc (8):** toàn bộ dịch vụ thu hộ — Bảo hiểm Thợ ĐMX ·
Bảo hiểm tổng · Mở thẻ tín dụng TPBank EVO/VPBank · Nạp rút tiền tài khoản ngân hàng ·
OTT MANGO+/ICALLME · VAS · Vay tiền mặt · Ví trả sau. Không dò.

## 26/09/2026 — dò lại buổi tối (23h)

Lịch 22h30 chạy lại trên gói mới trong ngày (buổi sáng đã dò lúc 09h). Vẫn 27 kho có
dòng hàng, 6 kho chưa góp được (cụm 10129, 1263); vẫn bỏ 6 kho thiếu dữ liệu như sáng.
Đã chạy `luu-chua-khop.js` — lịch sử cần/được có thêm các gói mới đẩy trong ngày.

| Quy tắc | Sáng | Tối | Ghi chú |
|---|---|---|---|
| SIM tổng | 20/21 | 20/21 | 737 |
| TABLET ANDROID | 20/21 | 19/21 | 396 dư 2,74 · 781 hụt 1,13 |
| T09 - T10 IPHONE 18 series, iPhone Duo | 17/21 | 16/21 | |
| Tivi TCL | 12/13 | 11/13 | 4860 · 3935 |
| Điện tử Sony | 11/13 | 10/13 | 4860 · 3935 · 737 |
| Camera | 12/21 | 13/21 | |
| Laptop (trừ Apple) | 13/21 | 12/21 | |
| Điện thoại realme | 13/21 | 13/21 | |
| SIM MOBIFONE/VINAPHONE/SIM DMX | 12/21 | 12/21 | |
| Điện thoại Vivo | 12/21 | 12/21 | |
| TAI NGHE | 11/21 | 11/21 | |
| Máy nước nóng | 9/13 | 10/13 | |
| PHỤ KIỆN CÔNG NGHỆ | 10/14 | 9/14 | |
| QUẠT GIÓ | 6/13 | **8/13** | trở lại trên một nửa |
| T09 - Máy Lạnh | 9/13 | 7/13 | |
| Máy giặt | 8/13 | 8/13 | |
| Gia dụng Kangaroo | 8/13 | 8/13 | |
| **TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT** | 7/13 | 7/13 | +3 mẫu ×1,2, 5263 khớp đúng; vẫn ganDung |
| MÁY LỌC NƯỚC | 5/13 | 7/13 | ganDung |
| TRẢ CHẬM HOMECREDIT + FECREDIT (đo gộp) | 10/21 | 10/21 | ganDung |
| TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG | 6/13 | 6/13 | ⚠ vẫn dưới một nửa (cùng ngày, chưa tính là ngày thứ hai) |
| SẠC DỰ PHÒNG | 7/21 | 8/21 | ganDung |
| MÁY LỌC KHÔNG KHÍ - HÚT/ TẠO ẨM - HÚT BỤI | 6/13 | 4/13 | ganDung |
| ĐIỆN TỬ & ĐIỆN LẠNH & GIA DỤNG Toshiba/Comfee | 6/13 | 4/13 | ganDung (đặt sáng nay) |
| Nồi cơm - nồi chiên | 5/13 | 4/13 | ganDung |
| ĐIỆN TỬ | 5/13 | 4/13 | ganDung |
| ĐIỆN THOẠI & TABLET ANDROID | 5/21 | 5/21 | ganDung |
| Đồng hồ | 4/6 | 3/6 | đúng một nửa |
| Cáp - Sạc | 2/21 | 2/21 | ganDung |
| Phụ kiện IT và nhóm khác | 0/21 | 0/21 | danh sách sản phẩm, cố ý |
| Đồng hồ tháng 9 | 0/0 | 0/0 | chỉ kho 8304 |

**Quy tắc mới thêm:** không có.

**Mẫu hệ số ×1,2 mới học (TỦ LẠNH):** 3 mẫu, giải duy nhất ở kho 5263 (gói mới hôm nay):
Samsung RS70F65Q3TSV · Tủ đông AQUA AQF-C4801EN · Hitachi HRSN9563DDXVN → 37 mẫu. Kho
5263 ra đúng 286,00 (trước thiếu 8,31); kiểm lại toàn bảng, số kho khớp không giảm ở quy
tắc nào. 8966 vẫn hụt dù mọi mẫu đã biết; 12947 · 4860 · 396 · 737 vô nghiệm.

**Quy tắc bị đánh dấu:** không có thêm. **Theo dõi 27/09:** TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG
(6/13) — nếu 27/09 vẫn dưới một nửa thì đánh dấu. QUẠT GIÓ đã lên 8/13, bỏ theo dõi.

**Chương trình còn chưa có quy tắc (8):** toàn bộ dịch vụ thu hộ — không dò.

## 27/09/2026

Chạy lúc 11h40 (anh Phong bảo chạy). 27 kho có dòng hàng, 6 kho chưa góp được (cụm 10129,
1263); vẫn bỏ 6 kho thiếu dữ liệu (5124 · Hải Bối · 8304 · 715 · 10715 · 8592). 7 kho đã có
gói ngày 27 (12947 · 311 · 1359 · 396 · 142 · 15885 · 781), còn lại gói 26 trở về trước.

| Quy tắc | 26/09 tối | 27/09 | Ghi chú |
|---|---|---|---|
| TABLET ANDROID | 19/21 | 20/21 | 396 dư 2,74 |
| SIM tổng | 20/21 | 19/21 | 15885 · 737 |
| Tivi TCL | 11/13 | 11/13 | 4860 · 3935 |
| Điện tử Sony | 10/13 | 10/13 | 4860 · 3935 · 737 |
| Máy nước nóng | 10/13 | 10/13 | |
| **T09 - T10 IPHONE 18 series, iPhone Duo** | 16/21 | 14/21 | ⚠ lỗi DỮ LIỆU, xem dưới |
| Camera | 13/21 | 14/21 | |
| Laptop (trừ Apple) | 12/21 | 14/21 | |
| Điện thoại realme | 13/21 | 14/21 | |
| Điện thoại Vivo | 12/21 | 12/21 | |
| SIM MOBIFONE/VINAPHONE/SIM DMX | 12/21 | 11/21 | |
| TAI NGHE | 11/21 | 11/21 | |
| PHỤ KIỆN CÔNG NGHỆ | 9/14 | 9/14 | |
| Máy giặt | 8/13 | 9/13 | |
| Gia dụng Kangaroo | 8/13 | 8/13 | |
| TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT | 7/13 | 7/13 | ganDung |
| T09 - Máy Lạnh | 7/13 | 7/13 | |
| MÁY LỌC KHÔNG KHÍ - HÚT/ TẠO ẨM - HÚT BỤI | 4/13 | 7/13 | ganDung |
| QUẠT GIÓ | 8/13 | 6/13 | ⚠ dưới một nửa lại |
| **TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG** | 6/13 | 6/13 | ⚠ **đặt ganDung** |
| MÁY LỌC NƯỚC | 7/13 | 5/13 | ganDung |
| ĐIỆN TỬ | 4/13 | 5/13 | ganDung |
| Nồi cơm - nồi chiên | 4/13 | 4/13 | ganDung |
| ĐIỆN TỬ & ĐIỆN LẠNH & GIA DỤNG Toshiba/Comfee | 4/13 | 4/13 | ganDung |
| TRẢ CHẬM HOMECREDIT + FECREDIT (đo gộp) | 10/21 | 10/21 | ganDung |
| SẠC DỰ PHÒNG | 8/21 | 8/21 | ganDung |
| ĐIỆN THOẠI & TABLET ANDROID | 5/21 | 7/21 | ganDung |
| Đồng hồ | 3/6 | 3/6 | |
| Cáp - Sạc | 2/21 | 1/21 | ganDung |
| Phụ kiện IT và nhóm khác | 0/21 | 0/21 | danh sách sản phẩm, cố ý |
| Đồng hồ tháng 9 | 0/0 | 0/0 | chỉ kho 8304 |

**⚠ Lỗi dữ liệu iPhone 18 (không phải lỗi quy tắc):** cữ đẩy 27/09 11h40 (updated_at
04:40 UTC) của 396 · 142 · 781 (và 12947) phủ ngày 13–27/09 nhưng **không có dòng pre-order
điện thoại nào** (chỉ pre-order phụ kiện, dụng cụ bếp). Bộ lọc "bỏ dòng đã trả" (dòng cũ
trong khoảng cữ mới phủ mà cữ mới không có) nên coi các máy iPhone 18 pre-order ngày 18/09
như đã trả: 396 còn 35,64 / cần 1080,31 (23 máy vẫn nằm ở cữ 10h15); 142 36,10 / 287,44;
781 252,26 / 878,05; 12947 36,10 / 209,68. Trang realtime của các kho này hôm nay sẽ hiện
số iPhone 18 THẤP. Không sửa quy tắc; cần xem cữ đẩy 11h40 lấy dữ liệu thế nào.

**Quy tắc mới thêm:** không có.

**Mẫu hệ số ×1,2 mới học:** không có (TỦ LẠNH --biet 37 mẫu: 8 kho khớp; 5124 · 8966 ·
12947 · 4860 · 396 · 737 vô nghiệm; 3935 quá nhiều mẫu chưa biết).

**Quy tắc bị đánh dấu ganDung hôm nay:** TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG — dưới một nửa hai
ngày liền (6/13 ngày 26 và 27), trước từng 7/11 và "4/4 kho — chắc". Lệch cả hai chiều.

**Theo dõi mai:** QUẠT GIÓ 6/13 (26/09 tối lên 8/13 nên chưa tính hai ngày liền).

**Chương trình còn chưa có quy tắc (8):** toàn bộ dịch vụ thu hộ — không dò.

## 28/09/2026

Chạy lúc 08h40 (lịch tự động). 27 kho có dòng hàng, 6 kho chưa góp được (cụm 10129,
1263); vẫn bỏ 6 kho thiếu dữ liệu (5124 · Hải Bối · 8304 · 715 · 10715 · 8592). Đã chạy
`luu-chua-khop.js` — lịch sử cần/được thêm các gói mới.

| Quy tắc | 27/09 | 28/09 | Ghi chú |
|---|---|---|---|
| TABLET ANDROID | 20/21 | 20/21 | 396 dư 2,74 |
| SIM tổng | 19/21 | 20/21 | 737 |
| Tivi TCL | 11/13 | 12/13 | 4860 |
| Điện tử Sony | 10/13 | 12/13 | 737 |
| Máy nước nóng | 10/13 | 10/13 | |
| Camera | 14/21 | 14/21 | |
| Laptop (trừ Apple) | 14/21 | 14/21 | |
| Điện thoại realme | 14/21 | 13/21 | |
| TAI NGHE | 11/21 | 12/21 | |
| SIM MOBIFONE/VINAPHONE/SIM DMX | 11/21 | 12/21 | |
| Điện thoại Vivo | 12/21 | 12/21 | |
| PHỤ KIỆN CÔNG NGHỆ | 9/14 | 9/14 | |
| QUẠT GIÓ | 6/13 | 8/13 | trở lại trên một nửa — bỏ theo dõi |
| TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT | 7/13 | 8/13 | ganDung |
| Máy giặt | 9/13 | 8/13 | |
| Gia dụng Kangaroo | 8/13 | 8/13 | |
| T09 - Máy Lạnh | 7/13 | 7/13 | |
| MÁY LỌC KHÔNG KHÍ - HÚT/ TẠO ẨM - HÚT BỤI | 7/13 | 7/13 | ganDung |
| MÁY LỌC NƯỚC | 5/13 | 7/13 | ganDung |
| Nồi cơm - nồi chiên | 4/13 | 5/13 | ganDung |
| ĐIỆN TỬ | 5/13 | 5/13 | ganDung |
| TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG | 6/13 | 5/13 | ganDung (từ 27/09) |
| ĐIỆN TỬ & ĐIỆN LẠNH & GIA DỤNG Toshiba/Comfee | 4/13 | 4/13 | ganDung |
| TRẢ CHẬM HOMECREDIT + FECREDIT (đo gộp) | 10/21 | 8/21 | ganDung |
| SẠC DỰ PHÒNG | 8/21 | 8/21 | ganDung |
| ĐIỆN THOẠI & TABLET ANDROID | 7/21 | 8/21 | ganDung |
| **Đồng hồ** | 3/6 | 2/6 | ⚠ lần đầu dưới một nửa |
| **T09 - T10 IPHONE 18 series, iPhone Duo** | 14/21 | **5/21** | ⚠ lỗi DỮ LIỆU, xem dưới |
| Cáp - Sạc | 1/21 | 2/21 | ganDung |
| Phụ kiện IT và nhóm khác | 0/21 | 0/21 | danh sách sản phẩm, cố ý |
| Đồng hồ tháng 9 | 0/0 | 0/0 | chỉ kho 8304 |

**⚠ Lỗi dữ liệu iPhone 18 lan rộng:** hôm qua chỉ 396 · 142 · 781 · 12947 hụt, nay 16/21
kho đủ tháng đều HỤT (không kho nào dư) — cùng kiểu: máy pre-order iPhone 18 ngày 18/09
vắng khỏi các cữ đẩy mới nên bộ lọc "bỏ dòng đã trả" gạt đi (vd 396 được 35,64 / cần
1080,31; 1043 234,20 / 1539,95; 3935 36,10 / 1026,63). Quy tắc không sai; trang realtime
đang hiện iPhone 18 THẤP ở hầu hết kho. Không đánh dấu ganDung vì nguyên nhân là dữ liệu.

**Quy tắc mới thêm:** không có.

**Mẫu hệ số ×1,2 mới học:** không có (TỦ LẠNH --biet 37 mẫu: 8 kho khớp; 12947 · 5263 ·
4860 · 396 · 737 vô nghiệm; 3935 quá nhiều mẫu chưa biết). 12947 cần/được đứng yên
38,68 / 20,96 qua ba ngày gói 23–27/09 — thiếu 17,7 không giải được bằng ×1,2. 5263 ngày
27 "được" giảm 6,19 so với ngày 26 trong khi "cần" tăng 10,23 — có dòng bị gạt, cùng kiểu
lỗi dữ liệu trên.

**Quy tắc bị đánh dấu ganDung hôm nay:** không có.

**Theo dõi mai:** Đồng hồ 2/6 (lần đầu dưới một nửa).

**Chương trình còn chưa có quy tắc (8):** toàn bộ dịch vụ thu hộ — không dò.

## 29/09/2026

Chạy lúc 08h10 (lịch tự động). 27 kho có dòng hàng, 6 kho chưa góp được (cụm 10129,
1263); vẫn bỏ 6 kho thiếu dữ liệu (5124 · Hải Bối · 8304 · 715 · 10715 · 8592). Đã chạy
`luu-chua-khop.js` — lịch sử cần/được thêm các gói mới (1043 đã có gói 29/09).

| Quy tắc | 28/09 | 29/09 | Ghi chú |
|---|---|---|---|
| TABLET ANDROID | 20/21 | 19/21 | 396 dư 2,74 · 781 |
| SIM tổng | 20/21 | 18/21 | |
| Tivi TCL | 12/13 | 12/13 | 4860 |
| Điện tử Sony | 12/13 | 12/13 | 737 |
| Máy nước nóng | 10/13 | 10/13 | |
| Camera | 14/21 | 13/21 | |
| Điện thoại realme | 13/21 | 14/21 | |
| TAI NGHE | 12/21 | 12/21 | |
| Điện thoại Vivo | 12/21 | 12/21 | |
| Laptop (trừ Apple) | 14/21 | 11/21 | |
| PHỤ KIỆN CÔNG NGHỆ | 9/14 | 9/14 | |
| TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT | 8/13 | 7/13 | ganDung · 1902 mới lệch −59,47 |
| Máy giặt | 8/13 | 7/13 | |
| MÁY LỌC KHÔNG KHÍ - HÚT/ TẠO ẨM - HÚT BỤI | 7/13 | 7/13 | ganDung |
| T09 - Máy Lạnh | 7/13 | 7/13 | |
| ĐIỆN TỬ | 5/13 | 7/13 | ganDung |
| **QUẠT GIÓ** | 8/13 | **6/13** | ⚠ lại dưới một nửa — theo dõi |
| **Gia dụng Kangaroo** | 8/13 | **6/13** | ⚠ lần đầu dưới một nửa (đã ganDung sẵn) |
| MÁY LỌC NƯỚC | 7/13 | 6/13 | ganDung |
| TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG | 5/13 | 6/13 | ganDung |
| ĐIỆN TỬ & ĐIỆN LẠNH & GIA DỤNG Toshiba/Comfee | 4/13 | 5/13 | ganDung |
| Nồi cơm - nồi chiên | 5/13 | 2/13 | ganDung |
| **SIM MOBIFONE/VINAPHONE/SIM DMX** | 12/21 | **9/21** | ⚠ lần đầu dưới một nửa (đã ganDung sẵn) |
| TRẢ CHẬM HOMECREDIT + FECREDIT (đo gộp) | 8/21 | 8/21 | ganDung |
| ĐIỆN THOẠI & TABLET ANDROID | 8/21 | 6/21 | ganDung |
| SẠC DỰ PHÒNG | 8/21 | 6/21 | ganDung |
| **Đồng hồ** | 2/6 | **2/6** | ⚠ hai ngày liền dưới một nửa → **đặt ganDung** |
| T09 - T10 IPHONE 18 series, iPhone Duo | 5/21 | 4/21 | lỗi DỮ LIỆU (xem 27–28/09), không phải lỗi quy tắc |
| Cáp - Sạc | 2/21 | 4/21 | ganDung |
| Phụ kiện IT và nhóm khác | 0/21 | 0/21 | danh sách sản phẩm, cố ý |
| Đồng hồ tháng 9 | 0/0 | 0/0 | chỉ kho 8304 |

Nhiều quy tắc tụt 1–3 kho cùng lúc so với hôm qua (Laptop, Nồi cơm, SIM, Quạt), cả
hai chiều — gói ngày 28/09 của nhiều cụm là gói mới, lệch dồn vào khoảng 27/09.

**Quy tắc mới thêm:** không có.

**Mẫu hệ số ×1,2 mới học:** không có.
- TỦ LẠNH (--biet 37 mẫu): 8 kho khớp; 12947 · 1902 · 4860 · 737 vô nghiệm, 396 nhiều
  nghiệm, 3935 quá nhiều mẫu chưa biết.
- QUẠT GIÓ (thử ×1,2 lần đầu, không --biet): không kho nào có nghiệm duy nhất; 396 DƯ
  +4,33 và 5 kho vô nghiệm ⇒ không phải chỉ hệ số theo mẫu.
- Máy giặt (thử ×1,2, không --biet): 142 · 8874 · 5263 · 1122 vô nghiệm ⇒ không phải chỉ
  hệ số theo mẫu.

**Quy tắc bị đánh dấu ganDung hôm nay:** Đồng hồ — 2/6 hai ngày liền (28 và 29/09), trước
3/6–4/6. Lệch đều là HỤT nhỏ (1043 −0,18 · 396 −1,47 · 311 −2,15 · 737 −3,63).

**Theo dõi mai:** QUẠT GIÓ 6/13 (chưa ganDung; nếu mai vẫn dưới một nửa thì đánh dấu).

**Chương trình còn chưa có quy tắc (8):** toàn bộ dịch vụ thu hộ — không dò.
