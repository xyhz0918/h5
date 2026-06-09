import { checkAdminPassword, forwardToGoogleSheet, parseJsonBody } from "../server/sheets-client.js";

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
    const data = await forwardToGoogleSheet("list", { limit });
    res.status(200).json({
      ok: true,
      rows: data.rows || []
    });
  } catch (error) {
    res.status(error.code === "CONFIG_MISSING" ? 503 : error.statusCode || 500).json({
      ok: false,
      message: error.message || "后台数据读取失败。"
    });
  }
}
