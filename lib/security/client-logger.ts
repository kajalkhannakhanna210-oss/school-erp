export type ClientActionPayload = {
  action: string;
  module?: string;
  page?: string;
  resource?: string;
  requestMethod?: string;
  statusCode?: number;
  outcome?: string;
  responseTimeMs?: number;
  metadata?: Record<string, unknown>;
};

export function logUserAction(payload: ClientActionPayload): void {
  if (typeof window === "undefined") return;

  const currentPath = window.location.pathname + window.location.search;
  const body = {
    action: payload.action,
    module: payload.module,
    page: payload.page,
    resource: payload.resource || currentPath,
    requestMethod: payload.requestMethod || "POST",
    statusCode: payload.statusCode || 200,
    responseTimeMs: payload.responseTimeMs || 65,
    outcome: payload.outcome || `${payload.action} executed`,
    metadata: payload.metadata,
  };

  try {
    const jsonString = JSON.stringify(body);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([jsonString], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/audit/action", blob);
      if (sent) return;
    }

    fetch("/api/audit/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonString,
      keepalive: true,
    }).catch(() => {});
  } catch (err) {
    // Non-blocking catch
  }
}
