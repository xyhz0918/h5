const eventHeaders = [
  "serverTime",
  "clientTime",
  "eventName",
  "sessionId",
  "orderId",
  "page",
  "bugId",
  "bugType",
  "description",
  "stage",
  "progress",
  "sourceHost",
  "pathname",
  "userAgent",
  "viewport",
  "data"
];

function parseJsonBody(body) {
  if (!body) return {};
  if (typeof body === "object") return body;

  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function limitText(value, maxLength = 1200) {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeData(value) {
  if (!value || typeof value !== "object") return {};

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function normalizeEvent(input) {
  const event = input && typeof input === "object" ? input : {};

  return {
    clientTime: limitText(event.clientTime, 80),
    eventName: limitText(event.eventName, 80),
    sessionId: limitText(event.sessionId, 120),
    orderId: limitText(event.orderId, 120),
    page: limitText(event.page, 80),
    bugId: limitText(event.bugId, 120),
    bugType: limitText(event.bugType, 240),
    description: limitText(event.description, 1200),
    stage: limitText(event.stage, 120),
    progress: event.progress === "" ? "" : limitText(event.progress, 80),
    sourceHost: limitText(event.sourceHost, 160),
    pathname: limitText(event.pathname, 260),
    userAgent: limitText(event.userAgent, 500),
    viewport: limitText(event.viewport, 80),
    data: normalizeData(event.data)
  };
}

async function forwardToGoogleSheet(action, payload) {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const token = process.env.SHEET_WEBHOOK_TOKEN;

  if (!scriptUrl || !token) {
    const error = new Error("Google 表格后台还没配置环境变量。");
    error.code = "CONFIG_MISSING";
    throw error;
  }

  const response = await fetch(scriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action,
      token,
      ...payload
    })
  });
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || "Google 表格请求失败。");
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

function checkAdminPassword(password) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  return Boolean(expectedPassword && password && password === expectedPassword);
}

export {
  checkAdminPassword,
  eventHeaders,
  forwardToGoogleSheet,
  normalizeEvent,
  parseJsonBody
};
