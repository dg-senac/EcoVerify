/**
 * Small in-memory sliding-window rate limiter.
 *
 * Good enough to stop brute force and spam on a single server instance. On a
 * multi-instance / serverless deployment each instance keeps its own counters, so
 * swap this for a shared store (e.g. Upstash Redis) when the app scales.
 */

const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hits] of buckets) {
    if (!hits.length || now - hits[hits.length - 1] > windowMs) buckets.delete(key);
  }
}

/** Returns true when the action is allowed, false when the limit was reached. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now, windowMs);
  const hits = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

/** Clears the counter for a key (e.g. after a successful login). */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}
