#!/usr/bin/env tsx
import { Client } from "pg";

const UPDATE_SQL = `
ALTER TABLE psgc_admin
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS search_text TEXT;

UPDATE psgc_admin p
SET
  display_name = CASE
    WHEN p.level = 'brgy' THEN CONCAT(p.name, ', ', COALESCE(cm.name, ''), ', Iloilo')
    WHEN p.level = 'city' OR p.level = 'mun' THEN CONCAT(p.name, ', Iloilo')
    WHEN p.level = 'prov' THEN p.name
    ELSE p.name
  END,
  search_text = LOWER(CONCAT_WS(' ',
    p.code,
    p.name,
    p.level,
    cm.name,
    prov.name,
    region.name
  ))
FROM psgc_admin cm
LEFT JOIN psgc_admin prov ON prov.code = p.province_code
LEFT JOIN psgc_admin region ON region.code = p.region_code
WHERE (p.city_municipality_code IS NULL OR cm.code = p.city_municipality_code)
  AND cm.level IN ('city', 'mun');

CREATE INDEX IF NOT EXISTS psgc_admin_search_text_idx
  ON psgc_admin USING GIN (to_tsvector('simple', COALESCE(search_text, '')));
`;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(UPDATE_SQL);
    await client.query("COMMIT");
    console.log("Search index fields refreshed.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("build-search-index failed", error);
  process.exit(1);
});
