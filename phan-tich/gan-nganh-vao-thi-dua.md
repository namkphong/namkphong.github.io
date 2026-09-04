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
