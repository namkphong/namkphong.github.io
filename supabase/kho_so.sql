-- Kho số tra cứu (tra-cuu.html → assets/kho-so.js → KhoMay).
-- Chỉ chứa số của siêu thị anh/chị TỰ TÍCH "của tôi"; mỗi tài khoản chỉ đọc/ghi được dòng của chính mình (RLS).
-- Chạy 1 lần: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
create table if not exists public.kho_so (
  id        text primary key,                       -- "15/11/2026|luyke|14285"
  owner     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ma        text not null,                          -- mã siêu thị
  ngay      text not null,
  ky        text not null,                          -- luyke | realtime
  k         int  not null,                          -- 20261115 (để xếp ngày)
  luc       text,
  du_lieu   jsonb not null,
  cap_nhat  timestamptz not null default now()
);
create index if not exists kho_so_owner_ma on public.kho_so (owner, ma, k);
alter table public.kho_so enable row level security;
drop policy if exists "kho_so cua toi" on public.kho_so;
create policy "kho_so cua toi" on public.kho_so for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
-- Dọn số của siêu thị không còn quản lý (đổi mã cho đúng):
-- delete from public.kho_so where ma = '8807';
