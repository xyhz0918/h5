import { normalizeEvent, parseJsonBody, saveTrackingEvent } from "../../server/supabase-client.js";

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

  try {
    const body = parseJsonBody(event.body);
    const trackingEvent = normalizeEvent(body);

    if (!trackingEvent.eventName || !trackingEvent.sessionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, message: "Invalid tracking event" })
      };
    }

    await saveTrackingEvent(trackingEvent);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    return {
      statusCode: error.code === "CONFIG_MISSING" ? 503 : error.statusCode || 500,
      headers,
      body: JSON.stringify({
        ok: false,
        message: error.message || "Tracking failed"
      })
    };
  }
};
