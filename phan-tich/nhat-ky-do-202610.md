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
