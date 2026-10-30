# MWG - BI Suite

Trang tĩnh phân tích số bán siêu thị Điện Máy Xanh, chạy trên GitHub Pages.
**Mọi dữ liệu chỉ lưu trên MÁY người dùng (localStorage) — không máy chủ, không
đăng nhập, không đồng bộ ở đâu khác.**

## Quy trình

1. **[nhap-so.html](nhap-so.html)** — dán các bảng *Chép bảng* từ app DMXWork → dựng gói số (lưu trên máy).
2. **[nv.html](nv.html)** — mục *Nguồn Số Mới → Chạy*: tự điền số, tính điểm thi đua, chia target tuần, chẩn đoán D1–D4 cho từng nhân viên.
3. **[sieuthi.html](sieuthi.html)** — tự lấy số từ bước 2 (không nhập lại), ra báo cáo kinh doanh cả siêu thị.

Trang chủ [index.html](index.html) gom 3 bước trên.
[qlst.html](qlst.html) là trang chấm *checklist công việc* (dùng với bot LINE).

## Kỹ thuật

Mỗi trang là một file HTML tự chứa, dùng [Tailwind CSS](https://tailwindcss.com/)
(CDN, ghim 3.4.16) — không cần build. Hàm dùng chung ở [assets/](assets):
`common.js`, `muc-tieu-card.js`, `nhan-xet-ai.js`, `the-phuc-vu.js`; tiện ích cụm ở
`dmx-cluster-shared.js`. Dữ liệu nằm trong `localStorage` của trình duyệt trên máy
đang dùng — mở máy/trình duyệt khác sẽ không thấy số của máy này.

`line_webhook.gs` là bot LINE (Apps Script), chỉ còn phần *checklist công việc*.
