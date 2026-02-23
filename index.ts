/**
 * 2026-02-23 — async retry utility
 * Retries an async function with exponential backoff and optional per-attempt timeout.
 *
 * @template T
 * @param {() => Promise<T>} fn - async function to run
 * @param {object} [opts]
 * @param {number} [opts.retries=3] - number of retries (total attempts = retries + 1)
 * @param {number} [opts.delayMs=100] - initial delay before first retry
 * @param {number} [opts.factor=2] - exponential backoff factor
 * @param {(err: any, attempt: number) => void} [opts.onRetry] - called when an attempt fails (attempt is 1-based)
 * @param {number} [opts.timeoutMs] - per-attempt timeout in ms
 * @returns {Promise<T>}
 */
export async function retry<T>(fn: () => Promise<T>, opts?: {
  retries?: number; delayMs?: number; factor?: number;
  onRetry?: (err: any, attempt: number) => void; timeoutMs?: number;
}): Promise<T> {
  const { retries = 3, delayMs = 100, factor = 2, onRetry, timeoutMs } = opts || {};
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
  const withTimeout = <U>(p: Promise<U>, ms?: number) => {
    if (ms == null) return p;
    return Promise.race([p, new Promise<U>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  };
  let attempt = 0;
  let delay = delayMs;
  while (attempt <= retries) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err) {
      if (attempt === retries) throw err;
      onRetry?.(err, attempt + 1);
      await sleep(delay);
      delay = Math.floor(delay * factor);
      attempt++;
    }
  }
  // unreachable
  throw new Error('retry failed');
}