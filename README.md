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

**App DataSnap (10/11/2026):** hướng dẫn từng bước cho quản lý ở
[huong-dan-tram-drive.html](huong-dan-tram-drive.html). Điện thoại (doc-so trong app) gửi
gói `dmxsnap-xuat/1` (2 kỳ + lựa chọn lọc + target NV) lên trạm, có thể tự gửi sau mỗi lần
quét. Máy tính: doc-so.html *☁ Lấy số từ điện thoại* hoặc nv.html *📥 Lấy số từ điện thoại*
→ lưu vào máy → trạm xoá vĩnh viễn. Không ai lấy: trạm tự xoá sau 6 giờ (lịch `donDep`
cài khi chạy `capQuyen`). Chưa có trạm: nút *💻 Gửi gói sang máy tính* chia sẻ tệp .json.

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

## Coupon Giờ vàng giá sốc (bot LINE /cp)

Cài userscript [gvgs-coupon.user.js](gvgs-coupon.user.js) vào Violentmonkey trên máy
tính. Mỗi thứ 6 mở portal → **Mail đã nhận**: script tự thấy mail "MÃ COUPON … GIỜ VÀNG
GIÁ SỐC" kỳ mới, mở từng mail, chỉ lấy mail có dòng *PMH NÀY DÀNH CHO SIÊU THỊ: 14,285*,
đọc mã theo model + ngày rồi gửi cho bot. Không thấy mail thì bấm nút
**🎟 Gửi coupon GVGS lên bot** góc phải dưới (hoặc gõ tìm "GIỜ VÀNG GIÁ SỐC" trước).

Nhân viên gõ `/cp` trong nhóm → chọn ngành → **Lấy mã** đúng model → **📋 Sao chép mã**.
Danh sách không bao giờ hiện mã, chỉ hiện số mã còn; mỗi lần bấm bot giao 1 mã cho
người bấm và gỡ mã đó ngay. Bot giao mã của hôm nay trước, rồi mã ngày trước còn dư;
không giao mã ngày sau. `/cp tivi` mở thẳng 1 ngành, `/cp ls` xem ai lấy mã nào.
Bot giữ mã tới hết hạn coupon + 1 ngày rồi tự xoá. Đổi máy gửi: xoá Script Property
`KHOA_CP` trong Apps Script.

## Kỹ thuật

Mỗi trang là một file HTML tự chứa, dùng [Tailwind CSS](https://tailwindcss.com/)
(CDN, ghim 3.4.16) — không cần build. Hàm dùng chung ở [assets/](assets):
`common.js`, `muc-tieu-card.js`, `nhan-xet-ai.js`, `the-phuc-vu.js`; tiện ích cụm ở
`dmx-cluster-shared.js`. Dữ liệu nằm trong `localStorage` của trình duyệt trên máy
đang dùng — mở máy/trình duyệt khác sẽ không thấy số của máy này.

`line_webhook.gs` là bot LINE (Apps Script): checklist công việc, số DataSnap
(/so /tonghop /nv) và coupon Giờ vàng giá sốc (/cp). Sửa xong phải deploy tay.
