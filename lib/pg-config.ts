import type { ClientConfig, PoolConfig } from "pg";

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SSL_ENABLED_VALUES = new Set(["1", "allow", "prefer", "require", "true", "verify-ca", "verify-full", "yes"]);
const SSL_DISABLED_VALUES = new Set(["0", "disable", "false", "no"]);

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return connectionString;
}

function parseConnectionString(connectionString: string): URL | null {
  try {
    return new URL(connectionString);
  } catch {
    return null;
  }
}

function normalizeEnvValue(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function getSslPreference(parsedUrl: URL | null): string | null {
  return (
    normalizeEnvValue(process.env.PGSSLMODE) ??
    normalizeEnvValue(process.env.DATABASE_SSL_MODE) ??
    normalizeEnvValue(process.env.DATABASE_SSL) ??
    normalizeEnvValue(parsedUrl?.searchParams.get("sslmode") ?? undefined)
  );
}

function getRejectUnauthorizedPreference(): boolean | null {
  const value =
    normalizeEnvValue(process.env.PGSSLREJECTUNAUTHORIZED) ??
    normalizeEnvValue(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED);

  if (!value) {
    return null;
  }

  if (SSL_ENABLED_VALUES.has(value)) {
    return true;
  }

  if (SSL_DISABLED_VALUES.has(value)) {
    return false;
  }

  return null;
}

function shouldUseSsl(parsedUrl: URL | null): boolean {
  const sslPreference = getSslPreference(parsedUrl);
  if (sslPreference) {
    if (SSL_DISABLED_VALUES.has(sslPreference)) {
      return false;
    }

    if (SSL_ENABLED_VALUES.has(sslPreference)) {
      return true;
    }
  }

  if (!parsedUrl) {
    return false;
  }

  return !LOCAL_DATABASE_HOSTS.has(parsedUrl.hostname.toLowerCase());
}

function buildConnectionString(parsedUrl: URL | null, original: string): string {
  if (!parsedUrl) {
    return original;
  }

  parsedUrl.searchParams.delete("sslmode");
  return parsedUrl.toString();
}

function buildSslConfig(parsedUrl: URL | null): ClientConfig["ssl"] | undefined {
  if (!shouldUseSsl(parsedUrl)) {
    return undefined;
  }

  const sslPreference = getSslPreference(parsedUrl);
  const rejectUnauthorizedPreference = getRejectUnauthorizedPreference();

  if (sslPreference === "verify-ca" || sslPreference === "verify-full") {
    return { rejectUnauthorized: rejectUnauthorizedPreference ?? true };
  }

  return { rejectUnauthorized: rejectUnauthorizedPreference ?? false };
}

export function getPgClientConfig(): ClientConfig {
  const connectionString = getConnectionString();
  const parsedUrl = parseConnectionString(connectionString);
  const ssl = buildSslConfig(parsedUrl);

  return {
    connectionString: buildConnectionString(parsedUrl, connectionString),
    ...(ssl ? { ssl } : {}),
  };
}

export function getPgPoolConfig(): PoolConfig {
  return {
    ...getPgClientConfig(),
    max: 10,
    idleTimeoutMillis: 30_000,
  };
}
