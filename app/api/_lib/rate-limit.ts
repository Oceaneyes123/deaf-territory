type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_BUCKETS = new Map<string, RateLimitRecord>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = RATE_LIMIT_BUCKETS.get(key);

  if (!existing || existing.resetAt <= now) {
    RATE_LIMIT_BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  RATE_LIMIT_BUCKETS.set(key, existing);
  return true;
}

export function getRequestKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return "anonymous";
  }

  return forwardedFor.split(",")[0]?.trim() || "anonymous";
}
