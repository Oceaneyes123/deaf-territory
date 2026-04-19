#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

import { getPgClientConfig } from "../lib/pg-config";
import { loadLocalEnv } from "./_lib/env";

loadLocalEnv();

const SCHEMA_SQL = fs.readFileSync(path.resolve("sql/schema.sql"), "utf8");
const INDEX_SQL = fs.readFileSync(path.resolve("sql/indexes.sql"), "utf8");

const RESET_SQL = `
TRUNCATE TABLE barangays, municipalities RESTART IDENTITY;
`;

const MATERIALIZE_MUNICIPALITIES_SQL = `
WITH municipality_geometry AS (
  SELECT
    city_municipality_code AS psgc_code,
    ST_Multi(ST_Union(geom)) AS geom
  FROM barangay_boundary_staging
  GROUP BY city_municipality_code
),
province_lookup AS (
  SELECT code, name
  FROM psgc_admin_staging
  WHERE level = 'prov'
),
municipality_rows AS (
  SELECT
    admin.city_municipality_code AS psgc_code,
    admin.region_code AS region_psgc_code,
    admin.province_code AS province_psgc_code,
    admin.name,
    COALESCE(province_lookup.name, 'Iloilo') AS province_name,
    CASE WHEN admin.level = 'city' THEN 'city' ELSE 'municipality' END AS type,
    LOWER(CONCAT_WS(' ',
      admin.code,
      admin.name,
      COALESCE(province_lookup.name, 'Iloilo'),
      CASE WHEN admin.level = 'city' THEN 'city' ELSE 'municipality' END
    )) AS search_text,
    municipality_geometry.geom
  FROM psgc_admin_staging admin
  JOIN municipality_geometry ON municipality_geometry.psgc_code = admin.city_municipality_code
  LEFT JOIN province_lookup ON province_lookup.code = admin.province_code
  WHERE admin.level IN ('mun', 'city')
)
INSERT INTO municipalities (
  psgc_code,
  region_psgc_code,
  province_psgc_code,
  name,
  province_name,
  type,
  search_text,
  geom,
  geom_simplified,
  centroid,
  bbox
)
SELECT
  psgc_code,
  region_psgc_code,
  province_psgc_code,
  name,
  province_name,
  type,
  search_text,
  geom,
  ST_Multi(ST_SimplifyPreserveTopology(geom, 0.00015)),
  ST_Centroid(geom),
  ST_SetSRID(ST_Envelope(geom), 4326)::geometry(Polygon, 4326)
FROM municipality_rows
ON CONFLICT (psgc_code) DO UPDATE
SET
  region_psgc_code = EXCLUDED.region_psgc_code,
  province_psgc_code = EXCLUDED.province_psgc_code,
  name = EXCLUDED.name,
  province_name = EXCLUDED.province_name,
  type = EXCLUDED.type,
  search_text = EXCLUDED.search_text,
  geom = EXCLUDED.geom,
  geom_simplified = EXCLUDED.geom_simplified,
  centroid = EXCLUDED.centroid,
  bbox = EXCLUDED.bbox,
  updated_at = NOW();
`;

const MATERIALIZE_BARANGAYS_SQL = `
WITH province_lookup AS (
  SELECT code, name
  FROM psgc_admin_staging
  WHERE level = 'prov'
),
region_lookup AS (
  SELECT code, name
  FROM psgc_admin_staging
  WHERE level = 'reg'
)
INSERT INTO barangays (
  psgc_code,
  municipality_psgc_code,
  municipality_name,
  province_name,
  region_name,
  name,
  display_name,
  search_text,
  geom,
  geom_simplified,
  centroid,
  bbox
)
SELECT
  admin.code AS psgc_code,
  admin.city_municipality_code AS municipality_psgc_code,
  municipality.name AS municipality_name,
  COALESCE(province_lookup.name, municipality.province_name) AS province_name,
  COALESCE(region_lookup.name, 'Western Visayas') AS region_name,
  admin.name,
  CONCAT(admin.name, ', ', municipality.name, ', ', municipality.province_name) AS display_name,
  LOWER(CONCAT_WS(' ',
    admin.code,
    admin.name,
    municipality.name,
    municipality.province_name,
    COALESCE(region_lookup.name, 'Western Visayas')
  )) AS search_text,
  boundary.geom,
  ST_Multi(ST_SimplifyPreserveTopology(boundary.geom, 0.00008)),
  ST_Centroid(boundary.geom),
  ST_SetSRID(ST_Envelope(boundary.geom), 4326)::geometry(Polygon, 4326)
FROM psgc_admin_staging admin
JOIN barangay_boundary_staging boundary ON boundary.psgc_code = admin.code
JOIN municipalities municipality ON municipality.psgc_code = admin.city_municipality_code
LEFT JOIN province_lookup ON province_lookup.code = admin.province_code
LEFT JOIN region_lookup ON region_lookup.code = admin.region_code
WHERE admin.level = 'brgy'
ON CONFLICT (psgc_code) DO UPDATE
SET
  municipality_psgc_code = EXCLUDED.municipality_psgc_code,
  municipality_name = EXCLUDED.municipality_name,
  province_name = EXCLUDED.province_name,
  region_name = EXCLUDED.region_name,
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  search_text = EXCLUDED.search_text,
  geom = EXCLUDED.geom,
  geom_simplified = EXCLUDED.geom_simplified,
  centroid = EXCLUDED.centroid,
  bbox = EXCLUDED.bbox,
  updated_at = NOW();
`;

async function main() {
  const client = new Client(getPgClientConfig());

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(SCHEMA_SQL);
    await client.query(INDEX_SQL);
    await client.query(RESET_SQL);
    await client.query(MATERIALIZE_MUNICIPALITIES_SQL);
    await client.query(MATERIALIZE_BARANGAYS_SQL);
    await client.query("COMMIT");
    console.log("Canonical municipalities and barangays refreshed.");
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
