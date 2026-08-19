# MWG - BI Executive Suite

A static, single-page business intelligence dashboard suite for retail sales and revenue analysis, hosted via GitHub Pages.

## Pages

`index.html` is the home page. It groups every page below into three menu sections.

### Trong ngày (realtime, dùng trong ca)

| File | Title | Description |
|---|---|---|
| [realtime.html](realtime.html) | Phân Tích Dữ Liệu RealTime Siêu Thị | Real-time revenue vs. daily target, landing forecast |
| [realtimenv.html](realtimenv.html) | Báo Cáo Doanh Thu Theo Nhân Viên | Real-time revenue per employee, LINE card images |
| [themuctieu.html](themuctieu.html) | Thẻ Mục Tiêu — cụm 14285 | Daily goal cards pushed to GitHub for the LINE `/bc` bot |

### Phân tích & lũy kế (số đã chốt)

| File | Title | Description |
|---|---|---|
| [nv.html](nv.html) | Trang Phân Tích Dữ Liệu | Daily data entry, employee scoring, weekly targets, D1–D4 |
| [sieuthi.html](sieuthi.html) | BI Báo Cáo Kinh Doanh | Month-to-date store performance, gross profit, category mix |
| [dashboard.html](dashboard.html) | Dashboard Doanh Thu | Revenue for any date range, instalments, avg. price per unit |
| [giocong.html](giocong.html) | Giờ Công Nhân Viên | Confirmed working hours by store, department and employee |

### Công cụ & hệ thống (cài 1 lần)

| File | Title | Description |
|---|---|---|
| [dmx_2.html](dmx_2.html) | DMX — Cài đặt công cụ lấy số | Install guide for the BI data-grabbing userscript |
| [cai-realtime.html](cai-realtime.html) | DMX — Cài báo cáo realtime tự động | Install guide for the automatic realtime reporter |

## Usage

Open [index.html](index.html) in a browser, or visit the live site at [namkphong.github.io](https://namkphong.github.io).

Each page is a self-contained HTML file styled with [Tailwind CSS](https://tailwindcss.com/) (via CDN, pinned to 3.4.16) — no build step or dependencies are required. Shared helpers live in [assets/](assets): `common.js` (toasts, dates, number parsing), `cloud-sync.js` + `cloud-config.js` (Supabase login and cloud backup), `bi-parse.js`, `muc-tieu-card.js`.

Signing in happens on the home page (top-right bar); the session then applies to every sub-page.
