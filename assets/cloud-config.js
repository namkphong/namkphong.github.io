/*
 * cloud-config.js — ĐÃ TẮT đồng bộ đám mây (30/10/2026).
 *
 * Trước đây file này chứa URL + khóa công khai của project Supabase để các trang
 * mirror localStorage lên cloud (CloudSync). Theo yêu cầu TUÂN THỦ của công ty,
 * toàn bộ dữ liệu cụm KHÔNG được lưu trên cloud nữa — mọi trang chạy THUẦN LOCAL
 * (chỉ localStorage của máy). Để trống url => CloudSync.init() tự bỏ qua, không
 * tạo client, không đăng nhập, không đẩy/kéo gì. Trang vẫn hoạt động bình thường.
 *
 * Muốn bật lại cloud sau này: điền lại url + anonKey của project Supabase.
 */
window.CLOUD = {
  url: '',          // trống = tắt cloud (CloudSync bỏ qua)
  anonKey: ''
};
