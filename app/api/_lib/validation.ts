const PSGC_CODE_PATTERN = /^\d{9,10}$/;

export function validatePsgcCode(psgcCode: string | null): string | null {
  if (!psgcCode) {
    return null;
  }

  const normalized = psgcCode.trim();
  if (!PSGC_CODE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

export function validateSearchQuery(q: string | null): string | null {
  if (!q) {
    return null;
  }

  const normalized = q.trim().replace(/\s+/g, " ");
  if (normalized.length < 2) {
    return null;
  }

  return normalized;
}
