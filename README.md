# MWG - BI Executive Suite

A static, single-page business intelligence dashboard suite for retail sales and
revenue analysis, hosted via GitHub Pages. **Mọi dữ liệu chỉ lưu trên MÁY của người
dùng (localStorage) — không có máy chủ, không đăng nhập, không đồng bộ ở đâu khác.**

## Pages

`index.html` is the home page. It groups the pages below into menu sections.

| File | Title | Mô tả |
|---|---|---|
| [nhap-so.html](nhap-so.html) | Nhập số từ app DMXWork | Dán "Chép bảng" → dựng gói số cho nv.html/sieuthi.html |
| [nv.html](nv.html) | Trang Phân Tích Dữ Liệu | Nhập số ngày, chấm điểm nhân viên, mục tiêu tuần, D1–D4 |
| [sieuthi.html](sieuthi.html) | BI Báo Cáo Kinh Doanh | Lũy kế tháng theo siêu thị, lãi gộp, cơ cấu ngành hàng |
| [dashboard.html](dashboard.html) | Dashboard Doanh Thu | Doanh thu theo khoảng ngày (cần dữ liệu lịch sử nạp tay) |
| [realtime.html](realtime.html) | Phân Tích RealTime Siêu Thị | Doanh thu vs mục tiêu ngày, dự báo cán đích |
| [realtimenv.html](realtimenv.html) | Báo Cáo Theo Nhân Viên | Doanh thu realtime theo từng nhân viên |
| [themuctieu.html](themuctieu.html) | Thẻ Mục Tiêu | Thẻ mục tiêu ngày cho từng nhân viên |
| [giocong.html](giocong.html) | Giờ Công Nhân Viên | Giờ công đã xác nhận theo siêu thị / bộ phận |

## Usage

Open [index.html](index.html) in a browser, or visit the live site at
[namkphong.github.io](https://namkphong.github.io).

Each page is a self-contained HTML file styled with [Tailwind CSS](https://tailwindcss.com/)
(via CDN, pinned to 3.4.16) — no build step or dependencies are required. Shared helpers
live in [assets/](assets): `common.js` (toasts, dates, number parsing), `bi-parse.js`,
`muc-tieu-card.js`.

Dữ liệu nhập/phân tích được lưu ngay trong `localStorage` của trình duyệt trên máy đang
dùng. Mở ở máy hoặc trình duyệt khác sẽ không thấy số của máy này — cố ý như vậy để không
có bất kỳ dữ liệu nào rời khỏi máy.
