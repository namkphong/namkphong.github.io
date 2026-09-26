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
