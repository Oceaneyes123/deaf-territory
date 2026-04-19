const MUNICIPALITY_PSGC_CODE_PATTERN = /^\d{9}$/;
const BARANGAY_PSGC_CODE_PATTERN = /^\d{10}$/;

function normalizeCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function validateMunicipalityPsgcCode(psgcCode: string | null): string | null {
  const normalized = normalizeCode(psgcCode);
  if (!normalized || !MUNICIPALITY_PSGC_CODE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

export function validateBarangayPsgcCode(psgcCode: string | null): string | null {
  const normalized = normalizeCode(psgcCode);
  if (!normalized || !BARANGAY_PSGC_CODE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

export function validateSearchQuery(q: string | null): string | null {
  if (!q) {
    return null;
  }

  const normalized = q.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 80) {
    return null;
  }

  return normalized;
}
