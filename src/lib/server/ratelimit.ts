// Best-effort in-memory sliding-window limiter (per server instance). Protects the Gemini quota
// on a public demo; when exceeded, routes fall back to deterministic behaviour instead of failing.
const buckets = new Map<string, number[]>();

export function clientKey(req: Request) {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "anon";
}

export function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}

/** ~bytes of a base64 payload */
export const base64Bytes = (b64?: string) => (b64 ? Math.floor((b64.length * 3) / 4) : 0);
