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

const MODEL = Deno.env.get("DMX_AI_MODEL") || "claude-sonnet-5";
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
- Nếu một nhóm ngành trống thì bỏ phần đó, đừng bịa cho đủ.`;

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
- TUYỆT ĐỐI KHÔNG nhắc D1-D4 / STRAM / S1-S4 / quỹ thưởng.`;

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

async function callClaude(apiKey: string, user: string, system: string): Promise<string> {
  const body = JSON.stringify({
    model: MODEL, max_tokens: MAX_TOKENS, system,
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

  const results = await Promise.all(emps.map(async (e) => {
    try {
      const text = await callClaude(apiKey, mkUser(e), sys);
      const lines = validate(text, e);
      return lines ? [e.ten, lines] as [string, string[]] : null;
    } catch (_) { return null; }
  }));

  const comments: Record<string, string[]> = {};
  for (const r of results) if (r) comments[r[0]] = r[1];
  return new Response(JSON.stringify({ comments }), { headers: H });
});
