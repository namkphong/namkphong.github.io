# Hướng dẫn bật đăng nhập + lưu đám mây (Supabase)

Trang web chạy trên GitHub Pages (web tĩnh) nên không tự chạy server được.
Ta dùng **Supabase** — dịch vụ đám mây có sẵn đăng nhập + cơ sở dữ liệu, gói miễn phí — làm nơi lưu.
Bạn chỉ cần làm **2 việc một lần**; phần code đã làm sẵn.

---

## Việc 1 — Tạo project Supabase (khoảng 3 phút)

1. Vào https://supabase.com → **Start your project** → đăng nhập bằng GitHub (hoặc email).
2. Bấm **New project**:
   - **Name**: gì cũng được, ví dụ `bao-cao-kinh-doanh`.
   - **Database Password**: tạo một mật khẩu (lưu lại phòng khi cần, nhưng phần web không dùng tới).
   - **Region**: chọn **Southeast Asia (Singapore)** cho gần Việt Nam.
   - Bấm **Create new project**, đợi ~1–2 phút cho project khởi tạo xong.

## Việc 2 — Lấy 2 giá trị gửi lại

Vào **Project Settings** (icon bánh răng) → **API**, copy 2 giá trị:

- **Project URL** — dạng `https://xxxxxxxx.supabase.co`
- **anon public** (mục *Project API keys*) — một chuỗi dài bắt đầu bằng `eyJ...`

> ⚠️ Chỉ lấy khóa **anon public**. KHÔNG lấy khóa **service_role** (khóa đó là bí mật, không được đặt lên web).

Gửi 2 giá trị này lại cho mình. Mình sẽ dán vào `assets/cloud-config.js` giúp bạn.

## Việc 3 — Tạo bảng dữ liệu (copy–paste 1 lần)

Trong Supabase, mở **SQL Editor** (icon `</>` bên trái) → **New query** → dán toàn bộ đoạn dưới → bấm **Run**:

```sql
-- Bảng lưu dữ liệu báo cáo (mỗi user một phần riêng)
create table if not exists public.kv_store (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  store_key  text        not null,
  payload    jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, store_key)
);

-- Bật Row Level Security: mỗi người chỉ đọc/ghi được dữ liệu của chính mình
alter table public.kv_store enable row level security;

create policy "kv select own" on public.kv_store
  for select using (auth.uid() = user_id);
create policy "kv insert own" on public.kv_store
  for insert with check (auth.uid() = user_id);
create policy "kv update own" on public.kv_store
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "kv delete own" on public.kv_store
  for delete using (auth.uid() = user_id);
```

Thấy dòng **Success. No rows returned** là xong.

## (Tùy chọn) Việc 4 — Cho đăng nhập ngay không cần xác nhận email

Nếu muốn đăng nhập nhanh khỏi phải mở email xác nhận:
**Authentication → Providers → Email** → tắt **Confirm email** → **Save**.
(Có thể bật lại sau khi đã ổn.)

---

## Sau khi bạn gửi 2 giá trị

Mình sẽ:
1. Dán URL + anon key vào `assets/cloud-config.js`.
2. Đẩy code lên và cùng bạn kiểm tra: đăng nhập → dán dữ liệu → mở lại thấy dữ liệu vẫn còn.

Cơ chế hoạt động:
- **Không đăng nhập** → app chạy y như cũ, dữ liệu chỉ nằm trên máy (localStorage).
- **Đăng nhập** → dữ liệu tự đồng bộ lên Supabase, mở ở máy khác đăng nhập vào là thấy lại.
