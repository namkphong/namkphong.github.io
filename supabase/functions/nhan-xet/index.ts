// supabase/functions/nhan-xet/index.ts
// Edge Function: sinh 2 dòng NHẬN XÉT/NV bằng Claude — cụm 14285.
// Key Anthropic cất ở secret (Supabase), KHÔNG bao giờ lộ ra web.
//
// Deploy 1 lần:
//   supabase functions deploy nhan-xet --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// nv.html gọi: POST {SB_URL}/functions/v1/nhan-xet
//   body: { store, employees:[{ten,td,ky,tocdo,canNgay,duDat,dat,tgt,yday,strong,near,zero,focustask,ghichu,quytac}] }
//   trả:  { comments: { "<ten>": ["dòng1","dòng2"] } }   // chỉ NV nào AI đạt; NV lỗi bị bỏ qua (web tự giữ template)

// Model TÁCH RIÊNG theo việc, để trả đúng tiền cho đúng độ khó:
//  • nhận xét NGÀY  — 2 câu ngắn theo khuôn, số liệu đã dọn sẵn -> Haiku là đủ,
//                     và đây là phần chạy MỖI NGÀY nên tiết kiệm ở đây ăn nhất.
//  • mục tiêu TUẦN  — cần cân nhắc xu hướng/giao mục tiêu -> giữ Sonnet.
// Vẫn đổi được bằng biến môi trường mà không phải sửa code (đổi xong Deploy lại).
const MODEL_DAY = Deno.env.get("DMX_AI_MODEL_DAY") || Deno.env.get("DMX_AI_MODEL") || "claude-haiku-4-5";
const MODEL_WEEK = Deno.env.get("DMX_AI_MODEL_WEEK") || Deno.env.get("DMX_AI_MODEL") || "claude-sonnet-5";
const API_URL = "https://api.anthropic.com/v1/messages";
const MAX_TOKENS = 1024;
const MAX_LINE_LEN = 240;
const BANNED = /(\bD[1-4]\b|STRAM|\bS[1-4]\b|quỹ thưởng|thi đua miền|nhịp)/i;

// Chỉ cho web thật gọi (giảm gọi phá tốn credit). Thêm domain nếu cần.
const ALLOW_ORIGINS = ["https://namkphong.github.io"];

const SYSTEM = `Bạn viết NHẬN XÉT NGẮN cho quản lý siêu thị Điện Máy Xanh gửi nhân viên mỗi ngày.
Giọng: một quản lý NAM lớn tuổi, nhiều kinh nghiệm, nói trực tiếp với nhân viên (đều ÍT TUỔI HƠN mình) — gần gũi, động viên nhưng thẳng thắn, cụ thể, không sáo rỗng.

XƯNG HÔ BẮT BUỘC:
- Quản lý tự xưng "anh", gọi nhân viên là "em" (hoặc gọi thẳng tên rồi "em").
- TUYỆT ĐỐI KHÔNG gọi nhân viên là "anh"/"chị" (VD cấm: "Anh Đức", "Chị Hạnh"). Quản lý lớn tuổi hơn mà gọi nhân viên bằng "anh/chị" nghe như mỉa mai, trách móc rất nặng.

ĐỊNH DẠNG BẮT BUỘC — trả về ĐÚNG 2 DÒNG, không lời dẫn, không markdown, không emoji, không ghi "Dòng 1/2":
- Dòng 1 (DOANH THU — NGẮN GỌN): em đang bao nhiêu % target; nếu giữ tốc độ hiện tại (~X tr/ngày) thì SẼ / SẼ KHÔNG theo kịp target — nếu không kịp, nói cần bán khoảng ~Y tr/ngày. Giữ trách nhiệm cá nhân. Một câu, ≤ 26 từ.
- Dòng 2 (NGÀNH HÀNG — TRỌNG TÂM, cụ thể hơn dòng 1): tập trung ngành đang CHẬM cần đẩy hôm nay (nêu tên cụ thể được cấp), có thể ghi nhận 1 ngành đang tốt để giữ, và nếu có ngành chưa phát sinh thì nhắc tìm hiểu sản phẩm để tư vấn. Một câu, ≤ 36 từ.

TỪ NGỮ & XƯNG HÔ:
- TUYỆT ĐỐI KHÔNG dùng từ "nhịp" (nhân viên không hiểu). Nói cụ thể: "chạy ~X tr/ngày như hiện tại", "cần bán ~Y tr/ngày mới kịp target".
- Nói tiếng Việt tự nhiên, KHÔNG dùng gạch dưới, KHÔNG ký hiệu lạ. Được RÚT GỌN tên ngành cho tự nhiên nhưng KHÔNG đổi sang tên khác, KHÔNG bịa tên mới.

QUY TẮC CỨNG:
- CHỈ dùng số liệu và tên ngành ĐƯỢC CUNG CẤP. TUYỆT ĐỐI không bịa số, không bịa tên ngành, không bịa sự kiện.
- Nếu KHÔNG có danh sách ngành nào được cấp: dòng 2 chỉ nói chung "tìm hiểu kỹ sản phẩm các ngành em đang phụ trách" — CẤM tự nêu tên ngành cụ thể.
- GIỮ TRÁCH NHIỆM CÁ NHÂN: TUYỆT ĐỐI KHÔNG lấy việc "cả siêu thị cũng yếu / cũng sau kế hoạch" ra làm lý do trấn an hay bào chữa. Không nói kiểu "siêu thị yếu nên em yếu cũng không sao".
- Không gọi người đang dưới target là "khá"/"tốt". Khen cụ thể khi theo kịp/vượt; động viên và thúc khi chưa kịp — thẳng nhưng không chê nặng.
- Tôn trọng ghi chú ngữ cảnh: nếu ghi chú nói kết quả thấp là TẠM THỜI (mới chuyển về) thì GHI NHẬN đang vào guồng, KHÔNG nói tụt/sa sút. Nếu em mạnh mảng hậu cần thì KHÔNG so sánh gay gắt mảng bán.
- KHÔNG nhắc thuật ngữ nội bộ (D1/D2/D3/D4, STRAM, S1-S4), KHÔNG nhắc quỹ thưởng.
- Nếu một nhóm ngành trống thì bỏ phần đó, đừng bịa cho đủ.

CUỐI THÁNG (CHỈ áp dụng khi user cung cấp dòng bắt đầu bằng "CUỐI THÁNG" — đọc "dự kiến chốt tháng" để dồn trọng tâm):
- SẮP VỀ ĐÍCH (dự kiến 85–99%): đây là nhóm ưu tiên số 1 — thúc MẠNH nước rút, nói rõ chỉ còn thiếu một chút là về số, cần bán thêm ~X tr/ngày trong mấy ngày cuối để cán đích; giọng dồn sức, quyết tâm về số.
- SẼ VƯỢT (dự kiến ≥100%): ghi nhận, động viên giữ đà và ráng bứt thêm.
- CÒN XA (dự kiến <85%): KHÔNG ép về số phi thực tế; động viên thực tế, tập trung ngành hàng và tích lũy kỹ năng, giữ đều tay.`;

function buildUser(e: any): string {
  const L: string[] = [];
  L.push(`Nhân viên: ${e.ten}`);
  if (e.tham_nien_nam) L.push(`Thâm niên: ~${e.tham_nien_nam} năm`);
  L.push(`Đang đạt: ${e.dat} tr / target ${e.tgt} tr = ${e.td}% HT (kỳ vọng đến hôm nay ${e.ky}%).`);
  const kip = e.duDat ? "SẼ THEO KỊP" : "SẼ KHÔNG THEO KỊP";
  L.push(`Tốc độ bán hiện tại: ~${e.tocdo} tr/ngày. Cần bán ~${e.canNgay} tr/ngày mới đạt target. => Giữ tốc độ hiện tại, em ${kip} target.`);
  if (e.strong && e.strong.length) L.push(`Ngành đang TỐT (ghi nhận, giữ phong độ): ${e.strong.join(", ")}`);
  if (e.near && e.near.length) L.push(`Ngành SẮP về số (đẩy nốt): ${e.near.join(", ")}`);
  if (e.zero && e.zero.length) L.push(`Ngành CHƯA có số (tìm hiểu sản phẩm để tư vấn): ${e.zero.join(", ")}`);
  const coNganh = (e.strong && e.strong.length) || (e.near && e.near.length) || (e.zero && e.zero.length);
  if (!coNganh) L.push(`KHÔNG có dữ liệu ngành → dòng 2 nói chung, CẤM nêu tên ngành cụ thể.`);
  if (e.quytac) (Array.isArray(e.quytac) ? e.quytac : [e.quytac]).forEach((q: string) => q && L.push(`LƯU Ý NGỮ CẢNH: ${q}`));
  if (e.ghichu) L.push(`Ghi chú: ${e.ghichu}`);
  if (e.cuoiThang) {
    const band = e.duKienPct >= 100 ? "SẼ VƯỢT target — giữ đà, ráng bứt thêm"
      : e.duKienPct >= 85 ? "SẮP VỀ ĐÍCH — chỉ còn thiếu một chút, DỒN SỨC nước rút để về số"
      : "CÒN XA target — động viên thực tế, tập trung ngành hàng, KHÔNG ép về số";
    L.push(`CUỐI THÁNG (còn ${e.soNgayConLai} ngày): dự kiến chốt tháng ~${e.duKienPct}% target → ${band}.`);
  }
  L.push(`\nViết 2 dòng nhận xét theo đúng định dạng và quy tắc.`);
  return L.join("\n");
}

// ================== CHẾ ĐỘ TUẦN (STRAM tuần — gửi nhân viên, KHÔNG hiện D) ==================
const SYSTEM_WEEK = `Bạn viết TỔNG KẾT TUẦN ngắn cho quản lý siêu thị Điện Máy Xanh gửi nhân viên (cuối tuần / đầu tuần).
Giọng: một quản lý NAM lớn tuổi, nhiều kinh nghiệm, nói với nhân viên (đều ÍT TUỔI HƠN) — gần gũi, ghi nhận nỗ lực cả tuần rồi định hướng tuần tới, thẳng nhưng không chê nặng.

XƯNG HÔ BẮT BUỘC: xưng "anh", gọi nhân viên "em". TUYỆT ĐỐI KHÔNG gọi nhân viên là "anh"/"chị" (nghe mỉa mai).

ĐỊNH DẠNG — trả về ĐÚNG 2 DÒNG, không lời dẫn, không markdown, không emoji, không ghi "Dòng 1/2":
- Dòng 1 (TUẦN RỒI + TUẦN TỚI, doanh thu): ghi nhận tuần rồi em chạy thế nào (đang tăng tốc / chững lại / đều tay) và đang đạt bao nhiêu % target tháng; rồi nói tuần tới cần bán khoảng bao nhiêu tr/ngày (hoặc tr/tuần) để theo kịp/vượt target. Một câu, ≤ 30 từ.
- Dòng 2 (NGÀNH HÀNG, tuần tới): tuần rồi em mạnh ở [ngành tốt]; tuần tới tập trung đẩy [ngành đang chậm], và nếu có ngành chưa phát sinh thì tìm hiểu sản phẩm để tư vấn. Một câu, ≤ 36 từ.

TỪ NGỮ & QUY TẮC (giống bản ngày):
- TUYỆT ĐỐI KHÔNG dùng từ "nhịp". Nói "chạy ~X tr/ngày", "cần ~Y tr/ngày (hoặc ~Z tr/tuần)".
- CHỈ dùng số và tên ngành ĐƯỢC CẤP; không bịa số, không bịa tên ngành. Được rút gọn tên ngành nhưng không đổi tên.
- Nếu không có danh sách ngành: dòng 2 chỉ nói chung "tìm hiểu kỹ sản phẩm các ngành em phụ trách", cấm nêu tên ngành cụ thể.
- GIỮ TRÁCH NHIỆM CÁ NHÂN — không lấy việc siêu thị yếu ra bào chữa.
- Tôn trọng ghi chú: nếu số thấp là TẠM THỜI (mới về) thì ghi nhận đang vào guồng, không nói tụt/sa sút. Em mạnh hậu cần thì không so sánh gay gắt mảng bán.
- TUYỆT ĐỐI KHÔNG nhắc D1-D4 / STRAM / S1-S4 / quỹ thưởng.

CUỐI THÁNG (CHỈ khi có dòng "CUỐI THÁNG"): SẮP VỀ ĐÍCH (dự kiến 85–99%) → nhóm ưu tiên, dồn sức tuần cuối, nói rõ còn thiếu một chút, cần ~X tr/ngày (~Z tr/tuần) để về số; SẼ VƯỢT (≥100%) → giữ đà, ráng bứt thêm; CÒN XA (<85%) → thực tế, tập trung ngành hàng, KHÔNG ép về số.`;

function buildUserWeek(e: any): string {
  const L: string[] = [];
  L.push(`Nhân viên: ${e.ten}`);
  if (e.tham_nien_nam) L.push(`Thâm niên: ~${e.tham_nien_nam} năm`);
  L.push(`Cả tháng đang đạt: ${e.dat} tr / target ${e.tgt} tr = ${e.td}% HT (kỳ vọng ${e.ky}%).`);
  L.push(`Xu hướng tuần rồi: ${e.xuHuong || "đều tay"}. Tốc độ gần đây: ~${e.tocdo} tr/ngày.`);
  const kip = e.duDat ? "sẽ theo kịp" : "chưa kịp";
  L.push(`Tuần tới cần bán ~${e.canNgay} tr/ngày (~${e.tuanTarget} tr/tuần) để đạt target — hiện ${kip}.`);
  if (e.strong && e.strong.length) L.push(`Tuần rồi mạnh ở: ${e.strong.join(", ")}`);
  if (e.near && e.near.length) L.push(`Ngành sắp về số (đẩy nốt tuần tới): ${e.near.join(", ")}`);
  if (e.zero && e.zero.length) L.push(`Ngành chưa có số (tìm hiểu sản phẩm): ${e.zero.join(", ")}`);
  const coNganh = (e.strong && e.strong.length) || (e.near && e.near.length) || (e.zero && e.zero.length);
  if (!coNganh) L.push(`KHÔNG có dữ liệu ngành → dòng 2 nói chung, CẤM nêu tên ngành cụ thể.`);
  if (e.quytac) (Array.isArray(e.quytac) ? e.quytac : [e.quytac]).forEach((q: string) => q && L.push(`LƯU Ý NGỮ CẢNH: ${q}`));
  if (e.ghichu) L.push(`Ghi chú: ${e.ghichu}`);
  if (e.cuoiThang) {
    const band = e.duKienPct >= 100 ? "SẼ VƯỢT target — giữ đà, ráng bứt thêm"
      : e.duKienPct >= 85 ? "SẮP VỀ ĐÍCH — chỉ còn thiếu một chút, DỒN SỨC tuần cuối để về số"
      : "CÒN XA target — động viên thực tế, tập trung ngành hàng, KHÔNG ép về số";
    L.push(`CUỐI THÁNG (còn ${e.soNgayConLai} ngày): dự kiến chốt tháng ~${e.duKienPct}% target → ${band}.`);
  }
  L.push(`\nViết 2 dòng TỔNG KẾT TUẦN theo đúng định dạng và quy tắc.`);
  return L.join("\n");
}

// ---- kiểm định (port từ ai_nhan_xet.py) ----
function cleanLine(l: string): string {
  return l.replace(/^\s*(dòng|line)\s*\d+\s*[:\.\)\-]?\s*/i, "")
          .replace(/^\s*\d+\s*[\.\)]\s*/, "")
          .replace(/^\s*(doanh thu|ngành hàng|dt)\s*[:\-]\s*/i, "")
          .replace(/^[\s\-•\t]+|[\s\-•\t]+$/g, "");
}
function extractTwo(text: string): string[] {
  let lines = (text || "").split("\n").map(cleanLine).filter((x) => x);
  if (lines.length >= 2) return lines.slice(0, 2);
  if (lines.length === 1) {
    const parts = lines[0].split(/(?<=[\.\!\?])\s+/).map((p) => p.trim()).filter((p) => p);
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(" ")];
  }
  return lines;
}
function parseNumber(tok: string): number | null {
  let t = tok.trim().replace(/^[.,]+|[.,]+$/g, "");
  if (!t) return null;
  if (t.includes(",") && t.includes(".")) t = t.replace(/,/g, "");
  else if (t.includes(",")) { const frac = t.split(",").pop() || ""; t = frac.length <= 2 ? t.replace(",", ".") : t.replace(/,/g, ""); }
  const v = parseFloat(t);
  return isNaN(v) ? null : v;
}
function validate(text: string, e: any): string[] | null {
  const lines = extractTwo(text);
  if (lines.length < 2) return null;
  const allowed = new Set<number>();
  [e.td, e.ky, e.tocdo, e.canNgay, e.dat, e.tgt, e.yday, e.tuanTarget].forEach((v: any) => {
    if (typeof v === "number") { allowed.add(Math.round(v)); allowed.add(Math.round(v * 100) / 100); }
  });
  for (const l of lines.slice(0, 2)) {
    if (l.length > MAX_LINE_LEN) return null;
    if (BANNED.test(l)) return null;
    const toks = l.match(/\d[\d.,]*/g) || [];
    for (const tk of toks) {
      const val = parseNumber(tk);
      if (val === null) continue;
      if (val >= 1000) {
        let ok = false;
        for (const a of allowed) { if (Math.abs(val - a) <= Math.max(3, 0.03 * a)) { ok = true; break; } }
        if (!ok) return null;
      }
    }
  }
  return lines.slice(0, 2);
}

async function callClaude(apiKey: string, user: string, system: string, model: string, maxTokens?: number): Promise<string> {
  const body = JSON.stringify({
    model, max_tokens: maxTokens || MAX_TOKENS, system,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: user }],
  });
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body,
  });
  if (!r.ok) throw new Error("Anthropic " + r.status + " " + (await r.text()).slice(0, 200));
  const data = await r.json();
  return (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
}

// ================== GỘP CẢ SIÊU THỊ VÀO MỘT LƯỢT GỌI ==================
// Trước đây emps.map() gọi Claude MỘT LƯỢT MỖI NHÂN VIÊN: cụm 15 người là 15
// lượt mỗi ngày (~450 lượt/tháng), mà mỗi lượt gửi lại nguyên system prompt
// (~1.300 token) — phần lặp vô ích chiếm gần hết chi phí.
// Nay gửi cả siêu thị trong MỘT lượt, model trả JSON theo số thứ tự. System
// prompt gửi 1 lần thay vì N lần.
//
// AN TOÀN: ai không có trong JSON hoặc không qua kiểm định thì gọi RIÊNG cho
// đúng người đó. Bình thường số lượt gọi riêng = 0; gặp sự cố thì tệ nhất cũng
// chỉ quay về đúng cách cũ, không ai mất nhận xét.
const TOKEN_MOI_NV = 320;      // 2 dòng tiếng Việt + khung JSON
const TOKEN_TRAN = 8192;

function tokenChoGop(n: number): number {
  return Math.max(MAX_TOKENS, Math.min(TOKEN_TRAN, n * TOKEN_MOI_NV + 400));
}

// Bỏ câu lệnh cuối của bản 1 người ("Viết 2 dòng…") vì bản gộp có lệnh riêng.
function boLenhCuoi(s: string): string {
  return s.replace(/\n+Viết 2 dòng[\s\S]*$/i, "").trim();
}

function buildUserGop(emps: any[], mkUser: (e: any) => string, isWeek: boolean): string {
  const L: string[] = [];
  L.push(`Dưới đây là ${emps.length} nhân viên của cùng một siêu thị.`);
  L.push(`Viết nhận xét cho TỪNG người, ĐỘC LẬP với nhau — không so sánh người này với người kia, không dùng số của người khác.`);
  L.push("");
  emps.forEach((e, i) => {
    L.push(`=== NHÂN VIÊN #${i + 1} ===`);
    L.push(boLenhCuoi(mkUser(e)));
    L.push("");
  });
  L.push(`TRẢ VỀ DUY NHẤT một đối tượng JSON, KHÔNG lời dẫn, KHÔNG markdown, KHÔNG rào \`\`\`:`);
  L.push(`{"1":["dòng1","dòng2"],"2":["dòng1","dòng2"]}`);
  L.push(`Khoá là SỐ THỨ TỰ nhân viên ở trên (1..${emps.length}), đủ cả ${emps.length} người.`);
  L.push(`Mỗi người ĐÚNG 2 dòng ${isWeek ? "TỔNG KẾT TUẦN" : "nhận xét"}, theo đúng định dạng và quy tắc đã nêu.`);
  return L.join("\n");
}

// Model đôi khi kèm lời dẫn hoặc rào ``` — cắt lấy phần trong ngoặc nhọn.
function docJsonLong(text: string): Record<string, unknown> {
  const t = (text || "").trim();
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i === -1 || j === -1 || j <= i) return {};
  try {
    const o = JSON.parse(t.slice(i, j + 1));
    return (o && typeof o === "object") ? o as Record<string, unknown> : {};
  } catch { return {}; }
}

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const H = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: H });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "Thiếu ANTHROPIC_API_KEY secret" }), { status: 500, headers: H });

  let payload: any;
  try { payload = await req.json(); } catch { return new Response(JSON.stringify({ error: "body không phải JSON" }), { status: 400, headers: H }); }
  const emps: any[] = Array.isArray(payload?.employees) ? payload.employees : [];
  if (!emps.length) return new Response(JSON.stringify({ comments: {} }), { headers: H });

  const isWeek = payload?.mode === "week";
  const sys = isWeek ? SYSTEM_WEEK : SYSTEM;
  const mkUser = isWeek ? buildUserWeek : buildUser;
  const model = isWeek ? MODEL_WEEK : MODEL_DAY;

  // --- 1) MỘT lượt gọi cho cả siêu thị ---
  const comments: Record<string, string[]> = {};
  let tho: Record<string, unknown> = {};
  try {
    const text = await callClaude(apiKey, buildUserGop(emps, mkUser, isWeek), sys, model, tokenChoGop(emps.length));
    tho = docJsonLong(text);
  } catch (err) {
    console.error("[nhan-xet] lượt gộp lỗi:", String(err).slice(0, 200));
  }

  // --- 2) Nhận từng người, ai không qua kiểm định thì để gọi lại riêng ---
  const conThieu: any[] = [];
  emps.forEach((e, i) => {
    const v = tho[String(i + 1)];
    const lines = Array.isArray(v) ? validate(v.join("\n"), e) : null;
    if (lines) comments[e.ten] = lines; else conThieu.push(e);
  });

  // --- 3) Gọi RIÊNG cho phần còn thiếu (bình thường là 0 người) ---
  if (conThieu.length) {
    console.warn("[nhan-xet] gọi riêng cho " + conThieu.length + "/" + emps.length + " NV không qua lượt gộp.");
    const rs = await Promise.all(conThieu.map(async (e) => {
      try {
        const text = await callClaude(apiKey, mkUser(e), sys, model, MAX_TOKENS);
        const lines = validate(text, e);
        return lines ? [e.ten, lines] as [string, string[]] : null;
      } catch (_) { return null; }
    }));
    for (const r of rs) if (r) comments[r[0]] = r[1];
  }

  return new Response(JSON.stringify({ comments }), { headers: H });
});
