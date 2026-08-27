# Chuyển kho ảnh sang Cloudflare R2

*Chuẩn bị sẵn ngày 27/08/2026. **Chưa bật** — hệ thống vẫn đang chạy Supabase.*

## Vì sao

Supabase gói miễn phí giới hạn **5 GB băng thông tải ra/tháng**. Chỉ một cụm đã dùng **6,71 GB (134%)**. Hết ân hạn **25/09/2026** là dự án bị khoá, mọi yêu cầu trả lỗi 402 — chết cả hệ thống.

Cloudflare R2 **không thu tiền băng thông tải ra**. Gói miễn phí: 10 GB lưu trữ (đang dùng 26,6 MB), 1 triệu lượt ghi + 10 triệu lượt đọc mỗi tháng.

## Vì sao KHÔNG dùng GitHub

Đã thử và loại cả hai cách:

| Cách | Vấn đề |
|---|---|
| Đẩy ảnh vào repo | Git giữ **vĩnh viễn mọi phiên bản**. Đo được: **203 bản ảnh, 117 MB** rác trong lịch sử, riêng `bc/396.jpg` có **70 bản**. Đây đúng là lý do trước đây phải bỏ GitHub. |
| Release đính kèm | Trả về `Content-Type: application/octet-stream` + `Content-Disposition: attachment` → **LINE không hiện được ảnh**. |

---

## Các bước cài (làm 1 lần)

### 1. Tạo bucket R2

Cloudflare Dashboard → **R2 Object Storage** → **Create bucket**
- Tên: `dmx-anh`
- Location: **Asia-Pacific (APAC)** cho gần Việt Nam
- **KHÔNG** bật public access — Worker sẽ lo phần phục vụ file

> Lần đầu vào R2, Cloudflare hỏi thêm thẻ thanh toán để xác minh dù dùng gói miễn phí. Không bị trừ tiền khi còn trong hạn mức.

### 2. Tạo Worker

Dashboard → **Workers & Pages** → **Create** → **Start with Hello World** → đặt tên `dmx-anh` → Deploy.

Xong bấm **Edit code**, xoá hết, dán toàn bộ nội dung file `cloudflare/worker.js` trong repo này vào, rồi Deploy.

### 3. Nối Worker với bucket

Worker `dmx-anh` → tab **Settings** → **Bindings** → **Add** → **R2 bucket**
- Variable name: `BUCKET`  ← **phải đúng chữ này**
- R2 bucket: `dmx-anh`

### 4. Đặt token đẩy

Cùng trang Settings → **Variables and Secrets** → **Add** → loại **Secret**
- Tên: `DMX_UPLOAD_KEY`
- Giá trị: tự đặt một chuỗi ngẫu nhiên dài (ví dụ 32 ký tự chữ + số)

Ghi lại chuỗi này — bước 6 cần dùng.

### 5. Kiểm tra Worker sống

Mở trên trình duyệt:

```
https://dmx-anh.<tên-tài-khoản>.workers.dev/_ping
```

Phải thấy dòng chữ `DMX R2 OK`. Chưa thấy thì chưa làm tiếp.

### 6. Bật trong code

Sửa **3 file**, tất cả phải cùng trỏ về một kho — không được nửa nơi này nửa nơi kia:

| File | Sửa gì |
|---|---|
| `dmx.user.js` | Điền `R2_BASE` và `R2_KEY` (gần đầu file, tìm chữ `KHO ẢNH`) |
| `dmx-line-publish.user.js` | Điền tương tự (đẩy ảnh realtime `/số`) |
| `line_webhook.gs` | Đổi hàm `pub()` sang địa chỉ Worker, rồi **deploy lại Apps Script** |

`R2_BASE` không có dấu `/` ở cuối. `R2_KEY` phải trùng đúng `DMX_UPLOAD_KEY` ở bước 4.

### 7. Chép ảnh cũ sang (tuỳ chọn)

Không bắt buộc — chạy cào số một lần là ảnh mới tự sinh trên R2. Nhưng trong lúc chưa chạy, lệnh LINE sẽ báo "chưa có ảnh". Muốn liền mạch thì chép trước 42 file (26,6 MB) từ Supabase sang.

---

## Kiểm chứng sau khi bật

1. Chạy cào số một lần.
2. Mở nhật ký panel DMX — phải thấy đẩy ảnh không lỗi.
3. Gõ `/bc` trong nhóm LINE → **ảnh phải hiện được**. Đây là phép thử quan trọng nhất: nếu kiểu nội dung sai thì LINE chỉ hiện ô trống.
4. Kiểm tra một URL ảnh bất kỳ:

```bash
curl -sI "https://dmx-anh.<tên>.workers.dev/nvp_396_1.jpg" | grep -i "content-type\|cache-control"
```

Phải thấy `image/jpeg`, **không phải** `octet-stream`.

## Nếu hỏng thì lùi lại

Xoá giá trị `R2_BASE` / `R2_KEY` ở 2 userscript, khôi phục `pub()` trong `line_webhook.gs`, deploy lại Apps Script. Ảnh cũ vẫn còn nguyên trên Supabase nên quay về là chạy ngay.

## Điểm cần biết trước

- **Bảo mật giữ NGANG BẰNG hiện tại, không hơn.** Bucket Supabase `bc` vốn cho ghi công khai; Worker cũng vậy, chỉ chặn bằng token dùng chung nằm trong userscript (mã nguồn công khai). Token cản người vô tình, không cản người cố ý. Muốn chặt hơn là việc riêng, làm sau.
- **Worker miễn phí 100.000 lượt/ngày.** Mỗi lần xem ảnh tính 1 lượt. Với vài chục Quản lý vẫn còn rất xa hạn mức.
- **Địa chỉ `workers.dev` phụ thuộc tên tài khoản Cloudflare.** Đổi tên tài khoản là đổi địa chỉ, phải sửa lại 3 file.
