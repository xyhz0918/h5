import { checkAdminPassword, listTrackingEvents, parseJsonBody } from "../server/supabase-client.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const body = parseJsonBody(req.body);

  if (!checkAdminPassword(body.password)) {
    res.status(401).json({ ok: false, message: "后台密码不正确。" });
    return;
  }

  try {
    const limit = Math.min(500, Math.max(1, Number(body.limit) || 300));
    const offset = Math.max(0, Number(body.offset) || 0);
    const result = await listTrackingEvents({ limit, offset });
    res.status(200).json({
      ok: true,
      rows: result.rows,
      hasMore: result.hasMore,
      nextOffset: result.nextOffset,
      hasVisitorIdColumn: result.hasVisitorIdColumn
    });
  } catch (error) {
    res.status(error.code === "CONFIG_MISSING" ? 503 : error.statusCode || 500).json({
      ok: false,
      message: error.message || "后台数据读取失败。"
    });
  }
}
