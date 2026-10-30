# MWG - BI Suite

Trang tĩnh phân tích số bán siêu thị Điện Máy Xanh, chạy trên GitHub Pages.
**Mọi dữ liệu chỉ lưu trên MÁY người dùng (localStorage) — không máy chủ, không
đăng nhập.** Ngoại lệ duy nhất: *Trạm Drive* (tuỳ chọn, mục dưới) giữ gói số trên
Google Drive của chính chủ trong lúc chờ máy tính lấy, lấy xong là xoá vĩnh viễn.

## Quy trình

1. **[nhap-so.html](nhap-so.html)** — dán các bảng *Chép bảng* từ app DMXWork → dựng gói số (lưu trên máy).
2. **[nv.html](nv.html)** — mục *Nguồn Số Mới → Chạy*: tự điền số, tính điểm thi đua, chia target tuần, chẩn đoán D1–D4 cho từng nhân viên.
3. **[sieuthi.html](sieuthi.html)** — tự lấy số từ bước 2 (không nhập lại), ra báo cáo kinh doanh cả siêu thị.

Trang chủ [index.html](index.html) gom 3 bước trên.
[qlst.html](qlst.html) là trang chấm *checklist công việc* (dùng với bot LINE).

## Nhập số từ điện thoại (Trạm Drive)

Chép bảng trong app DMXWork trên điện thoại → dán vào nhap-so.html **ngay trên điện
thoại** → gói số đi qua Google Drive sang nv.html trên máy tính.

Cài một lần:

1. Vào [script.google.com](https://script.google.com) → *Dự án mới* → dán toàn bộ
   [drive_relay.gs](drive_relay.gs) → Lưu.
2. Chọn hàm `capQuyen` → *Chạy* → cho phép quyền Google Drive.
3. Bánh răng *Cài đặt dự án* → *Thuộc tính tập lệnh* → thêm `KHOA` = một chuỗi dài
   tự nghĩ (đừng đưa ai).
4. *Triển khai → Triển khai mới* → loại *Ứng dụng web*, thực thi với tư cách *Tôi*,
   ai có quyền truy cập *Bất kỳ ai* → chép URL kết thúc bằng `/exec`.
5. Điện thoại: nhap-so.html → *⚙ Trạm Drive* → dán URL + KHOA → *Lưu & thử kết nối*.
   Máy tính: nv.html → *⬇ Số mới* → *⚙ Trạm Drive* → làm y như vậy.

Hằng ngày: điện thoại dán 5 bảng → tích *Gửi luôn sang máy tính* → *Dựng & đẩy*.
Máy tính: nv.html → *⬇ Số mới* → *📥 Lấy số từ điện thoại* — trang lấy gói, bảo
trạm xoá file trên Drive, rồi tự chạy như nút Nạp. Drive chỉ giữ 1 gói mới nhất.

## Kỹ thuật

Mỗi trang là một file HTML tự chứa, dùng [Tailwind CSS](https://tailwindcss.com/)
(CDN, ghim 3.4.16) — không cần build. Hàm dùng chung ở [assets/](assets):
`common.js`, `muc-tieu-card.js`, `nhan-xet-ai.js`, `the-phuc-vu.js`; tiện ích cụm ở
`dmx-cluster-shared.js`. Dữ liệu nằm trong `localStorage` của trình duyệt trên máy
đang dùng — mở máy/trình duyệt khác sẽ không thấy số của máy này.

`line_webhook.gs` là bot LINE (Apps Script), chỉ còn phần *checklist công việc*.
