import { normalizeEvent, parseJsonBody, saveTrackingEvent } from "../server/supabase-client.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  try {
    const body = parseJsonBody(req.body);
    const event = normalizeEvent(body);

    if (!event.eventName || !event.sessionId) {
      res.status(400).json({ ok: false, message: "Invalid tracking event" });
      return;
    }

    await saveTrackingEvent(event);
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(error.code === "CONFIG_MISSING" ? 503 : error.statusCode || 500).json({
      ok: false,
      message: error.message || "Tracking failed"
    });
  }
}
