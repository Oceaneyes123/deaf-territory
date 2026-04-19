#!/usr/bin/env tsx
import { Client } from "pg";

import { getPgClientConfig } from "../lib/pg-config";
import { loadLocalEnv } from "./_lib/env";

loadLocalEnv();

const ILOILO_PROVINCE_CODE = "0630";
const ILOILO_CITY_CODE = "063022000";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS psgc_admin_staging (
  code VARCHAR(10) PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  parent_code VARCHAR(10),
  region_code VARCHAR(2),
  province_code VARCHAR(4),
  city_municipality_code VARCHAR(9),
  barangay_code VARCHAR(10),
  source TEXT NOT NULL DEFAULT 'psgc',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const RESET_SQL = `
TRUNCATE TABLE psgc_admin_staging;
`;

const UPSERT_PSGC_SQL = `
WITH filtered AS (
  SELECT
    p.code,
    p.name,
    LOWER(p.level) AS level,
    p.parent_code,
    p.region_code,
    p.province_code,
    p.city_municipality_code,
    p.barangay_code
  FROM staging_psgc p
  WHERE
    p.province_code = $1
    OR p.code = $1
    OR p.city_municipality_code = $2
    OR p.code = $2
)
INSERT INTO psgc_admin_staging (
  code,
  name,
  level,
  parent_code,
  region_code,
  province_code,
  city_municipality_code,
  barangay_code,
  source
)
SELECT
  code,
  name,
  level,
  parent_code,
  region_code,
  province_code,
  city_municipality_code,
  barangay_code,
  'psgc'
FROM filtered
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  parent_code = EXCLUDED.parent_code,
  region_code = EXCLUDED.region_code,
  province_code = EXCLUDED.province_code,
  city_municipality_code = EXCLUDED.city_municipality_code,
  barangay_code = EXCLUDED.barangay_code,
  source = EXCLUDED.source,
  updated_at = NOW();
`;

const STAGING_TABLE_EXISTS_SQL = `
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = CURRENT_SCHEMA()
    AND table_name = 'staging_psgc'
) AS exists;
`;

const STAGING_TABLE_COUNT_SQL = `
SELECT COUNT(*)::int AS count
FROM staging_psgc;
`;

async function assertPsgcSourceExists(client: Client) {
  const existsResult = await client.query<{ exists: boolean }>(STAGING_TABLE_EXISTS_SQL);
  if (!existsResult.rows[0]?.exists) {
    throw new Error(
      [
        "Required source table `staging_psgc` does not exist.",
        "Load the raw PSGC dataset into `staging_psgc` before running `npm run db:prepare`.",
        "Expected columns: code, name, level, parent_code, region_code, province_code, city_municipality_code, barangay_code.",
      ].join(" "),
    );
  }

  const countResult = await client.query<{ count: number }>(STAGING_TABLE_COUNT_SQL);
  if ((countResult.rows[0]?.count ?? 0) === 0) {
    throw new Error(
      "Source table `staging_psgc` exists but is empty. Load the raw PSGC dataset into it before running `npm run db:prepare`.",
    );
  }
}

async function main() {
  const client = new Client(getPgClientConfig());

  await client.connect();
  try {
    await client.query("BEGIN");
    await assertPsgcSourceExists(client);
    await client.query(CREATE_TABLE_SQL);
    await client.query(RESET_SQL);
    const result = await client.query(UPSERT_PSGC_SQL, [ILOILO_PROVINCE_CODE, ILOILO_CITY_CODE]);
    await client.query("COMMIT");

    console.log(`Imported/updated ${result.rowCount ?? 0} PSGC staging rows for Iloilo coverage.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("import-psgc failed", error);
  process.exit(1);
});
