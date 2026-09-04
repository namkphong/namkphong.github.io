# Gán ngành hàng (report 77) vào chương trình thi đua (baocao)

Bảng thi đua của baocao chỉ có **luỹ kế tháng**, làm mới 15–20 phút/lần. Muốn biết
trong ca ai đang bán ngành thi đua nào thì phải đi từ **dòng hàng của report 77**
(`ycx_lines`) rồi gán vào chương trình.

## Nguyên tắc: dò ngược từ số, không gán theo tên

Với mỗi chương trình, tìm tập **nhóm hàng** nào cộng lại bằng đúng con số baocao trả
về cho siêu thị đó trong tháng. Khớp thì mới nhận. Cách này **tự nói khi nó sai** —
khác hẳn gán theo tên, vốn sai âm thầm.

So sánh phải kẹp giữa hai mốc, vì baocao chốt số giữa ngày còn `ycx_lines` có tới
hiện tại: tính tổng **qua ngày N‑1** và **qua ngày N**, số của baocao phải nằm giữa.

## Chốt quan trọng: gán ở cấp NHÓM HÀNG, không phải NGÀNH HÀNG

`Máy giặt` = nhóm `1099 - Máy giặt (IMEI)` + `3659 - Máy sấy lồng ngang`, **không gồm**
`3859 - Máy rửa chén` — tức nhỏ hơn cả ngành `1756 - Máy giặt, sấy`. Gán theo ngành là
sai ngay từ chương trình đầu tiên.

## Đã kiểm trên kho 396, tháng 9/2026

| Chương trình | baocao | = tổng nhóm hàng | Kết quả |
|---|---|---|---|
| MÁY LỌC KHÔNG KHÍ - HÚT/TẠO ẨM - HÚT BỤI | 38,90 | 4439 + 3639 + 7099 + 4155 | khớp chính xác |
| Nồi cơm - nồi chiên | 10,92 | 4157 + 4156 + 4158 + 4099 | khớp chính xác |
| Đồng hồ tháng 9 | 23,88 | 2391 + 7259 + 4063 | khớp chính xác |
| Máy nước nóng | 1,84 | 911 | khớp chính xác |
| Camera | 1,91 | 6479 | khớp chính xác |
| SIM tổng (SL) | 5 | 1891 | khớp chính xác |
| TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT | 74,33 | 1097 → 68,48…77,71 | đúng, lệch do giờ chốt |
| Máy giặt | 35,73 | 1099 + 3659 → 30,00…37,03 | đúng, lệch do giờ chốt |
| **Cáp - Sạc** | 1,38 | 3345 + 14 = 1,45…1,79 | **CHƯA khớp — chưa rõ quy tắc** |

## Đã kiểm thêm sau khi có 2 cột mới (04/09/2026)

| Chương trình | baocao | Quy tắc | Kết quả |
|---|---|---|---|
| ĐIỆN THOẠI & TABLET ANDROID | 38,74 | ngành `13` + `244`, **loại `nha_san_xuat = Apple`** | khớp chính xác |
| ĐT & ĐL & GD Toshiba/Comfee | 7,78 | `nha_san_xuat` chứa Toshiba hoặc Comfee | khớp chính xác |
| Điện thoại Vivo · realme | 0 | ngành `13` + hãng tương ứng | khớp (cả hai đều 0) |
| **TRẢ CHẬM HOMECREDIT** | 99,28 | `la_tra_gop` **và `hinh_thuc_thanh_toan = "Công nợ chuyển khoản"`** | khớp chính xác |
| TRẢ CHẬM FECREDIT/SHINHAN/SAMSUNG F+ | 0 | không có dòng nào | khớp |
| TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG | 63,91 | `la_tra_gop` + ngành `1755·1756·1754·484·1214·1116·304` | khớp chính xác |

### Phát hiện đáng nhớ: bên cho vay nằm ở cột **Hình thức thanh toán**

Cột Q không ghi tên HomeCredit mà ghi **`Công nợ chuyển khoản`** — chính là nó.
Tìm ra bằng cách dò tập con: trong 10 dòng trả góp tháng 9, tập cộng lại đúng 99,28
chính là toàn bộ dòng `Công nợ chuyển khoản`. Phần `Công nợ tiền mặt` (46,39 tr)
KHÔNG thuộc HomeCredit và cũng không thuộc FeCredit/Shinhan (chương trình đó = 0) —
**chưa biết là bên nào**, cần thêm dữ liệu tháng khác để chốt.

`CTKM_1` rỗng trên mọi dòng trả góp, đừng mất công tìm ở đó.

## Chưa gán được — chỉ còn nhóm dịch vụ thu hộ

| Nhóm | Ví dụ | Vì sao |
|---|---|---|
| **Dịch vụ thu hộ** | Bảo hiểm tổng · Bảo hiểm Thợ ĐMX · VAS · OTT MANGO+ · Vay tiền mặt · Ví trả sau | các dòng `Xuất dịch vụ thu hộ *` bị **lọc bỏ khi đẩy**, đúng theo định nghĩa doanh thu |

⚠ **Đừng nhét dòng thu hộ vào `ycx_lines`.** Mọi truy vấn hiện nay đều mặc định
"dòng nào trong bảng cũng là doanh thu hợp lệ" — thêm vào là thổi phồng doanh thu ở
khắp nơi mà không ai biết. Muốn đo mấy chương trình đó thì làm **bảng riêng**.


## Nền số: THỰC, không phải quy đổi (kiểm 04/09/2026)

Đã thử giả thuyết "phụ kiện tính theo doanh thu quy đổi". **Không phải.** Bằng chứng
sạch nhất là chương trình `Camera` = nhóm `6479`, kiểm trên HAI siêu thị cùng lúc:

| | cần | nền THỰC | nền QUY ĐỔI |
|---|---|---|---|
| kho 396 | 1,91 | **1,91 khớp** | 6,43 sai |
| kho 142 | 0,40 | **0,40 khớp** | 1,34 sai |

Dùng hai siêu thị làm ràng buộc đồng thời là cách rẻ nhất để giết các khớp giả:
một tháng một siêu thị thì `Phụ kiện IT và nhóm khác` có tới **508 tập con** cùng
khớp — vô dụng.

## Danh mục chương trình ĐỔI THEO THÁNG

Đừng đóng cứng bảng gán. Tháng 8/2026 so với tháng 9/2026:

| Tháng 8 | Tháng 9 |
|---|---|
| `Máy giặt, Máy sấy, Máy rửa chén` | `Máy giặt` (bỏ máy rửa chén) |
| `Camera` đo bằng **SỐ LƯỢNG** | `Camera` đo bằng **DOANH THU** |

Nên bảng gán phải gắn với `MONTHKEY`, và phải **tự kiểm lại mỗi tháng** bằng cách
đối chiếu số như trên — lệch thì báo, đừng ra số sai.

## Cáp - Sạc = nhóm 3345 + 14, trừ một dòng lạ

- kho 142: 0,87 — **khớp chính xác**.
- kho 396: cộng 6 dòng ra 1,449 nhưng baocao ghi 1,38 — chênh **đúng 0,069**, là dòng
  `Cáp Lightning 1m Baseus Cafule` ngày 02/09. Dòng này cũng là một trong 3 dòng
  **thiếu hẳn `nha_san_xuat`** trong file gốc. Chưa rõ baocao loại nó vì lý do gì —
  cần thêm tháng khác để chốt, đừng vội đặt luật "bỏ dòng thiếu hãng".

## Còn treo

`Phụ kiện IT và nhóm khác` — cần 42,97 (kho 396) và 2,10 (kho 142). Ở kho 396 tổng cả
ba ngành phụ kiện (16+184+364) chỉ có 21,69 nên chương trình này **phải gồm cả ngành
khác** (Laptop 20,36? Wearable 22,48?); nhưng ở kho 142 những ngành đó đều bằng 0 mà
vẫn phải ra 2,10. Chưa có tổ hợp nào thoả cả hai — cần thêm dữ liệu tháng 8.


## Dò bằng tháng 8 — công cụ mạnh nhất là số THEO TỪNG NHÂN VIÊN

Tháng 8 đủ **31/31 ngày** (396: 1.604 dòng / 5.195 tr; 142: 754 dòng / 2.063 tr) nên
không còn lệch giờ chốt. Quan trọng hơn: `competition-bymsg-get` cấp NHÂN VIÊN cho
thêm hàng chục phương trình, mà cùng một quy tắc phải đúng cho mọi người.

### Gán người bằng `nguoi_tao` (Người tạo) là ĐÚNG

Kiểm trên chương trình `Camera` tháng 9 (đã chứng minh khớp ở cấp siêu thị):

| nhân viên | baocao | ycx theo Người tạo |
|---|---|---|
| 238383 Ngô Hoàng Anh | 1,130 | 1,135 |
| 30899 Nguyễn Ngọc Đức | 0,770 | 0,772 |
| 286768 Nguyễn Đức Tiến | 0,400 | 0,398 |

3/3 khớp. Vậy dùng `nguoi_tao` để chia theo nhân viên là được.

### CÓ chương trình loại trừ ở cấp SẢN PHẨM, không chỉ nhóm hàng

`Đồng hồ (DHTT + SMW)` tháng 8: kho 142 khớp chính xác (3,65 = toàn bộ ngành 23+1274).
Kho 396 thì ngành 23+1274 ra 71,56 nhưng chương trình chỉ 64,56. Chia theo nhân viên:
**5/7 người khớp chính xác**, lệch dồn vào 2 người — rồi lệch của người đầu là
**đúng một dòng: Apple Watch SE 3, 5,917 tr**.

⇒ Quy tắc: ngành `23` + `1274`, **loại hãng Apple**. Còn dư 1,08 tr ở nhân viên
238383 chưa lý giải được (không dòng nào bằng đúng số đó).

**Bài học cho bộ dò:** đừng giả định chương trình = hợp của các nhóm hàng. Có loại trừ
theo hãng/sản phẩm, nên thuật toán vét cạn trên tập nhóm sẽ trả về **0 nghiệm** và làm
tưởng là bế tắc. Cách đúng: chia theo nhân viên trước, khoanh vào người lệch, rồi mở
từng dòng của người đó ra xem.

**Bẫy đã dính:** lấy danh sách nhân viên bị cắt cụt thì người có target thật bị coi là
0, và luật "người target 0 mà bán nhóm N ⇒ loại N" sẽ loại oan đúng cái nhóm cần tìm.
Luôn kiểm số dòng trả về trước khi tin kết quả.

## Kiểm lại khi cần

Lấy hai vế rồi so:

```bash
SB="https://kyyoihvcsrnmylnmbcis.supabase.co"
KEY="sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C"
curl -s "$SB/rest/v1/ycx_lines?store_key=eq.396&ngay_xuat=gte.2026-09-01&select=*&limit=1000" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

Vế kia gọi `reports/competition-bymsg-get` với `VIEWLEVEL:'STOREGROUP'` và
`STOREIDS` là **một** siêu thị (bảng cấp siêu thị không có cột `storeid`, gọi gộp là
không tách được ai). Đơn vị đo theo `competitiontype`: loại 2 và 6 là SỐ LƯỢNG, còn
lại là DOANH THU.
