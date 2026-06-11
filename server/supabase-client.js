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
  const data = normalizeData(event.data);
  const visitorId = limitText(event.visitorId || data.visitorId, 120);

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
    visitorId,
    data: visitorId ? { ...data, visitorId } : data
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

function eventToSupabaseRow(event, { includeVisitorId = true } = {}) {
  const row = {
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

  if (includeVisitorId) {
    row.visitor_id = event.visitorId || event.data?.visitorId || null;
  }

  return row;
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
    visitorId: row.visitor_id || row.data?.visitorId || "",
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
  error.details = data;
  throw error;
}

function isMissingVisitorIdColumn(data) {
  const text = JSON.stringify(data || {}).toLowerCase();
  return text.includes("visitor_id") && (text.includes("column") || text.includes("schema cache"));
}

async function saveTrackingEvent(event) {
  const { url, tableName } = getSupabaseConfig();
  const endpoint = `${url}/rest/v1/${tableName}`;
  const headers = supabaseHeaders({
    "Content-Type": "application/json",
    Prefer: "return=minimal"
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(eventToSupabaseRow(event))
  });

  if (!response.ok) {
    const data = await parseSupabaseResponse(response.clone());
    if (isMissingVisitorIdColumn(data)) {
      const fallbackResponse = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(eventToSupabaseRow(event, { includeVisitorId: false }))
      });

      await throwIfSupabaseError(fallbackResponse);
      return;
    }
  }

  await throwIfSupabaseError(response);
}

function getBaseTrackingColumns() {
  return [
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
  ];
}

async function fetchTrackingEvents({ columns, limit, offset }) {
  const { url, tableName } = getSupabaseConfig();
  const searchParams = new URLSearchParams({
    select: columns.join(","),
    order: "created_at.desc",
    limit: String(limit),
    offset: String(offset)
  });
  const response = await fetch(`${url}/rest/v1/${tableName}?${searchParams}`, {
    method: "GET",
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    const data = await parseSupabaseResponse(response.clone());
    return { ok: false, data, response };
  }

  const data = await parseSupabaseResponse(response);
  return { ok: true, data };
}

async function listTrackingEvents(options = 300) {
  const requestedLimit =
    typeof options === "object" && options !== null ? options.limit : Number(options) || 300;
  const offset = typeof options === "object" && options !== null ? Math.max(0, Number(options.offset) || 0) : 0;
  const safeLimit = Math.min(500, Math.max(1, Number(requestedLimit) || 300));
  const fetchLimit = safeLimit + 1;
  const baseColumns = getBaseTrackingColumns();
  const visitorColumns = [...baseColumns.slice(0, 4), "visitor_id", ...baseColumns.slice(4)];
  let hasVisitorIdColumn = true;

  let result = await fetchTrackingEvents({
    columns: visitorColumns,
    limit: fetchLimit,
    offset
  });

  if (!result.ok && isMissingVisitorIdColumn(result.data)) {
    hasVisitorIdColumn = false;
    result = await fetchTrackingEvents({
      columns: baseColumns,
      limit: fetchLimit,
      offset
    });
  }

  if (!result.ok) {
    await throwIfSupabaseError(result.response);
  }

  const rows = Array.isArray(result.data) ? result.data.map(fromSupabaseRow) : [];
  const visibleRows = rows.slice(0, safeLimit);

  return {
    rows: visibleRows,
    hasMore: rows.length > safeLimit,
    nextOffset: offset + visibleRows.length,
    hasVisitorIdColumn
  };
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
