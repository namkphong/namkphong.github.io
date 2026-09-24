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
