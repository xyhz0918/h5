import type { PageId, WorkOrder } from "../types";

export type FunnelEventName =
  | "page_view"
  | "bug_selected"
  | "order_created"
  | "stage_entered"
  | "stage_completed"
  | "ingredient_progress"
  | "liked_changed"
  | "report_generated"
  | "report_saved"
  | "report_save_failed"
  | "report_shared"
  | "report_share_cancelled"
  | "report_share_failed"
  | "purchase_clicked";

type TrackFunnelEventInput = {
  eventName: FunnelEventName;
  page: PageId | "admin";
  order?: WorkOrder | null;
  selectedBugId?: string | null;
  bugType?: string;
  description?: string;
  stage?: string;
  progress?: number;
  data?: Record<string, unknown>;
};

const sessionIdKey = "horsh:funnel-session:v1";

function getSessionId() {
  try {
    const storedSessionId = window.sessionStorage.getItem(sessionIdKey);
    if (storedSessionId) return storedSessionId;

    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.sessionStorage.setItem(sessionIdKey, sessionId);
    return sessionId;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function postTrackingPayload(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/track", blob)) return;
    }
  } catch {
    // Fall back to fetch below.
  }

  void fetch("/api/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body,
    keepalive: true
  }).catch(() => undefined);
}

export function trackFunnelEvent({
  eventName,
  page,
  order,
  selectedBugId,
  bugType,
  description,
  stage,
  progress,
  data = {}
}: TrackFunnelEventInput) {
  if (typeof window === "undefined") return;

  const viewport = `${window.innerWidth}x${window.innerHeight}`;
  const payload = {
    eventName,
    clientTime: new Date().toISOString(),
    sessionId: getSessionId(),
    page,
    orderId: order?.id ?? "",
    bugId: selectedBugId ?? "",
    bugType: bugType ?? order?.bugType ?? "",
    description: description ?? order?.description ?? "",
    stage: stage ?? "",
    progress: typeof progress === "number" && Number.isFinite(progress) ? progress : "",
    sourceHost: window.location.host,
    pathname: window.location.pathname,
    userAgent: navigator.userAgent,
    viewport,
    data
  };

  postTrackingPayload(payload);
}
