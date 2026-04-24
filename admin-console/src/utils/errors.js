/**
 * Format an API error for display to the operator.
 *
 * Handles the error shape thrown by `api.request()` — which attaches a
 * `body` string, a `message`, and optionally a `requestId` captured from
 * the server's `X-Request-Id` response header. Falls back to the provided
 * `fallback` message when no structured error information is available.
 *
 * When a `requestId` is present on the error, it is appended to the
 * returned string as `" (id: <requestId>)"` so operators can correlate
 * the failure with server-side logs.
 *
 * @param {unknown} error Thrown error or API response.
 * @param {string} fallback Human-readable message to show when no
 *   structured error information is available.
 * @returns {string}
 */
export function formatApiError(error, fallback) {
  let message = fallback;
  if (error?.body) {
    try {
      const parsed = JSON.parse(error.body);
      if (typeof parsed?.error === 'string' && parsed.error) {
        message = parsed.error;
      } else if (typeof error?.message === 'string' && error.message) {
        message = error.message;
      }
    } catch {
      if (typeof error?.message === 'string' && error.message) {
        message = error.message;
      }
    }
  } else if (typeof error?.message === 'string' && error.message) {
    message = error.message;
  }
  const requestId = typeof error?.requestId === 'string' ? error.requestId : null;
  return requestId ? `${message} (id: ${requestId})` : message;
}
