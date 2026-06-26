/** Small helpers for resilient async UI (no external deps). */

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const attempts = options?.attempts ?? 2;
  const delayMs = options?.delayMs ?? 800;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

export function friendlyError(err: unknown, fallback = 'Something went wrong'): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : fallback;

  if (/fetch|network|failed to fetch|timeout|ECONNREFUSED|Network request failed/i.test(msg)) {
    return 'Network error. Check your connection and try again.';
  }
  return msg || fallback;
}
