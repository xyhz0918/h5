const defaultEventsTable = "h5_events";

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

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const tableName = process.env.SUPABASE_EVENTS_TABLE || defaultEventsTable;

  if (!url || !key) {
    const error = new Error("Supabase 后台还没有配置环境变量。");
    error.code = "CONFIG_MISSING";
    throw error;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    const error = new Error("Supabase 表名只能包含字母、数字和下划线。");
    error.code = "CONFIG_MISSING";
    throw error;
  }

  return { url, key, tableName };
}

function supabaseHeaders(extraHeaders = {}) {
  const { key } = getSupabaseConfig();

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extraHeaders
  };
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toProgressOrNull(value) {
  if (value === "" || value === undefined || value === null) return null;
  const progress = Number(value);
  return Number.isFinite(progress) ? progress : null;
}

function eventToSupabaseRow(event) {
  return {
    client_time: toIsoOrNull(event.clientTime),
    event_name: event.eventName,
    session_id: event.sessionId,
    order_id: event.orderId || null,
    page: event.page || null,
    bug_id: event.bugId || null,
    bug_type: event.bugType || null,
    description: event.description || null,
    stage: event.stage || null,
    progress: toProgressOrNull(event.progress),
    source_host: event.sourceHost || null,
    pathname: event.pathname || null,
    user_agent: event.userAgent || null,
    viewport: event.viewport || null,
    data: event.data || {}
  };
}

function fromSupabaseRow(row) {
  return {
    serverTime: row.created_at || "",
    clientTime: row.client_time || "",
    eventName: row.event_name || "",
    sessionId: row.session_id || "",
    orderId: row.order_id || "",
    page: row.page || "",
    bugId: row.bug_id || "",
    bugType: row.bug_type || "",
    description: row.description || "",
    stage: row.stage || "",
    progress: row.progress ?? "",
    sourceHost: row.source_host || "",
    pathname: row.pathname || "",
    userAgent: row.user_agent || "",
    viewport: row.viewport || "",
    data: row.data || {}
  };
}

async function parseSupabaseResponse(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function throwIfSupabaseError(response) {
  if (response.ok) return;

  const data = await parseSupabaseResponse(response);
  const error = new Error(data?.message || data?.hint || "Supabase request failed");
  error.statusCode = response.status;
  throw error;
}

async function saveTrackingEvent(event) {
  const { url, tableName } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${tableName}`, {
    method: "POST",
    headers: supabaseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    }),
    body: JSON.stringify(eventToSupabaseRow(event))
  });

  await throwIfSupabaseError(response);
}

async function listTrackingEvents(limit = 300) {
  const { url, tableName } = getSupabaseConfig();
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 300));
  const columns = [
    "created_at",
    "client_time",
    "event_name",
    "session_id",
    "order_id",
    "page",
    "bug_id",
    "bug_type",
    "description",
    "stage",
    "progress",
    "source_host",
    "pathname",
    "user_agent",
    "viewport",
    "data"
  ].join(",");
  const searchParams = new URLSearchParams({
    select: columns,
    order: "created_at.desc",
    limit: String(safeLimit)
  });
  const response = await fetch(`${url}/rest/v1/${tableName}?${searchParams}`, {
    method: "GET",
    headers: supabaseHeaders()
  });

  await throwIfSupabaseError(response);
  const data = await parseSupabaseResponse(response);

  return Array.isArray(data) ? data.map(fromSupabaseRow) : [];
}

function checkAdminPassword(password) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  return Boolean(expectedPassword && password && password === expectedPassword);
}

export {
  checkAdminPassword,
  listTrackingEvents,
  normalizeEvent,
  parseJsonBody,
  saveTrackingEvent
};
