/*
 * cloud-config.js — Cấu hình kết nối Supabase.
 *
 * Thay 2 giá trị dưới đây bằng thông tin project Supabase của bạn:
 *   Supabase Dashboard > Project Settings > API
 *     - "Project URL"      -> url
 *     - "anon public" key  -> anonKey   (đây là khóa CÔNG KHAI, an toàn để đặt ở đây
 *                                        KHI đã bật Row Level Security theo SUPABASE_SETUP.md)
 *
 * TUYỆT ĐỐI KHÔNG dán "service_role" key vào file này.
 */
window.CLOUD = {
  url: 'https://kyyoihvcsrnmylnmbcis.supabase.co',
  anonKey: 'sb_publishable_mYERJ2VA0jSHI9-ZD7JrXA_ET3cYG6C'
};
