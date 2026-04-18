#!/usr/bin/env tsx
import { Client } from "pg";

const ILOILO_PROVINCE_CODE = "0630";
const ILOILO_CITY_CODE = "064502000";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS psgc_admin (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  parent_code TEXT,
  region_code TEXT,
  province_code TEXT,
  city_municipality_code TEXT,
  barangay_code TEXT,
  source TEXT NOT NULL DEFAULT 'psgc'
);
`;

const UPSERT_PSGC_SQL = `
WITH filtered AS (
  SELECT
    p.code,
    p.name,
    p.level,
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
INSERT INTO psgc_admin (
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
  source = EXCLUDED.source;
`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(CREATE_TABLE_SQL);
    const result = await client.query(UPSERT_PSGC_SQL, [ILOILO_PROVINCE_CODE, ILOILO_CITY_CODE]);
    await client.query("COMMIT");

    console.log(`Imported/updated ${result.rowCount ?? 0} PSGC rows for Iloilo coverage.`);
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
