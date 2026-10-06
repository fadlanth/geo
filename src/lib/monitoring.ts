/// <reference types="vite/client" />
// Titik pelaporan error runtime terpusat.
// Jika VITE_ERROR_REPORT_URL diisi, error dikirim via navigator.sendBeacon / fetch POST.
// Jika tidak diisi, error cukup tercatat di console (fallback aman untuk dev/internal).

const REPORT_URL = import.meta.env.VITE_ERROR_REPORT_URL as string | undefined;

export interface ErrorReport {
  message: string;
  stack?: string;
  source?: string;
  timestamp: string;
}

function sendReport(report: ErrorReport): void {
  if (!REPORT_URL) return;
  try {
    const body = JSON.stringify(report);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(REPORT_URL, new Blob([body], { type: "application/json" }));
      return;
    }
    fetch(REPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Jangan mengganggu aplikasi jika pelaporan gagal
    });
  } catch {
    // abaikan kegagalan pelaporan
  }
}

export function reportError(err: unknown, source = "runtime"): void {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error(`[${source}]`, error);
  sendReport({
    message: error.message,
    stack: error.stack,
    source,
    timestamp: new Date().toISOString(),
  });
}

export function initMonitoring(): void {
  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, "window.onerror");
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, "unhandledrejection");
  });
}
