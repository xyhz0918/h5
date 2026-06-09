import { checkAdminPassword, listTrackingEvents, parseJsonBody } from "../../server/supabase-client.js";

const headers = {
  "Content-Type": "application/json"
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, message: "Method not allowed" })
    };
  }

  const body = parseJsonBody(event.body);

  if (!checkAdminPassword(body.password)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ ok: false, message: "后台密码不正确。" })
    };
  }

  try {
    const limit = Math.min(500, Math.max(1, Number(body.limit) || 300));
    const rows = await listTrackingEvents(limit);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        rows
      })
    };
  } catch (error) {
    return {
      statusCode: error.code === "CONFIG_MISSING" ? 503 : error.statusCode || 500,
      headers,
      body: JSON.stringify({
        ok: false,
        message: error.message || "后台数据读取失败。"
      })
    };
  }
};
