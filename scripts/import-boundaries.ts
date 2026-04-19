#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

import { getPgClientConfig } from "../lib/pg-config";
import { loadLocalEnv } from "./_lib/env";

loadLocalEnv();

type Feature = {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

type OverrideMap = Record<
  string,
  {
    psgcCode: string;
    notes?: string;
  }
>;

const BOUNDARY_FILE = process.env.BOUNDARY_GEOJSON_PATH ?? "data/barangays.geojson";
const OVERRIDES_FILE = path.resolve("scripts/mappings/barangay-code-overrides.json");

const ENSURE_POSTGIS_SQL = `
CREATE EXTENSION IF NOT EXISTS postgis;
`;

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS barangay_boundary_staging (
  psgc_code VARCHAR(10) PRIMARY KEY,
  barangay_name TEXT NOT NULL,
  city_municipality_code VARCHAR(9) NOT NULL,
  province_code VARCHAR(4),
  geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
  source TEXT NOT NULL DEFAULT 'boundary-import',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const INSERT_SQL = `
WITH input_geometry AS (
  SELECT ST_MakeValid(ST_GeomFromGeoJSON($5)) AS geom
)
INSERT INTO barangay_boundary_staging (
  psgc_code,
  barangay_name,
  city_municipality_code,
  province_code,
  geom,
  source
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  (
    SELECT ST_Multi(
      ST_CollectionExtract(
        CASE
          WHEN
            ABS(ST_XMin(geom)) > 180
            OR ABS(ST_XMax(geom)) > 180
            OR ABS(ST_YMin(geom)) > 90
            OR ABS(ST_YMax(geom)) > 90
          THEN ST_Transform(ST_SetSRID(geom, 32651), 4326)
          ELSE ST_SetSRID(geom, 4326)
        END,
        3
      )
    )
    FROM input_geometry
  ),
  'boundary-import'
)
ON CONFLICT (psgc_code) DO UPDATE
SET
  barangay_name = EXCLUDED.barangay_name,
  city_municipality_code = EXCLUDED.city_municipality_code,
  province_code = EXCLUDED.province_code,
  geom = EXCLUDED.geom,
  source = EXCLUDED.source,
  updated_at = NOW();
`;

const MATCH_SQL = `
SELECT p.code
FROM psgc_admin_staging p
LEFT JOIN psgc_admin_staging municipality
  ON municipality.code = p.city_municipality_code
WHERE p.level = 'brgy'
  AND (
    p.code = $1
    OR (
      LOWER(REPLACE(p.name, ' ', '')) = LOWER(REPLACE($2, ' ', ''))
      AND (
        $3 = ''
        OR p.city_municipality_code = $3
        OR LOWER(REPLACE(COALESCE(municipality.name, ''), ' ', '')) = LOWER(REPLACE($3, ' ', ''))
      )
    )
  )
LIMIT 1;
`;

function readGeoJson(filePath: string): FeatureCollection {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Boundary GeoJSON not found at ${filePath}. Add the file or set BOUNDARY_GEOJSON_PATH to the correct location before running npm run db:prepare.`,
    );
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as FeatureCollection;
}

function readOverrides(filePath: string): OverrideMap {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as OverrideMap;
}

function normalizedText(value: unknown): string {
  return String(value ?? "").trim();
}

function featureKey(feature: Feature): string {
  const rawCode = normalizedText(feature.properties.code ?? feature.properties.psgc_code);
  if (rawCode) return `code:${rawCode}`;

  const name = normalizedText(feature.properties.name ?? feature.properties.brgy_name);
  const city = normalizedText(
    feature.properties.city ??
      feature.properties.city_name ??
      feature.properties.municipality ??
      feature.properties.municipality_name,
  );
  return `name:${name}|city:${city}`;
}

async function resolvePsgcCode(client: Client, feature: Feature, overrides: OverrideMap): Promise<string | null> {
  const key = featureKey(feature);
  const override = overrides[key];
  if (override?.psgcCode) {
    return override.psgcCode;
  }

  const candidateCode = normalizedText(feature.properties.code ?? feature.properties.psgc_code);
  const candidateName = normalizedText(feature.properties.name ?? feature.properties.brgy_name);
  const candidateMunicipality = normalizedText(
    feature.properties.city ??
      feature.properties.city_name ??
      feature.properties.municipality ??
      feature.properties.municipality_name ??
      feature.properties.city_municipality_code,
  );

  const found = await client.query<{ code: string }>(MATCH_SQL, [candidateCode, candidateName, candidateMunicipality]);
  return found.rows[0]?.code ?? null;
}

async function main() {
  const client = new Client(getPgClientConfig());
  const geoJson = readGeoJson(BOUNDARY_FILE);
  const overrides = readOverrides(OVERRIDES_FILE);

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(ENSURE_POSTGIS_SQL);
    await client.query(CREATE_TABLE_SQL);

    let mapped = 0;
    let skipped = 0;

    for (const feature of geoJson.features) {
      const psgcCode = await resolvePsgcCode(client, feature, overrides);
      if (!psgcCode) {
        skipped += 1;
        continue;
      }

      const admin = await client.query<{ city_municipality_code: string; province_code: string | null }>(
        "SELECT city_municipality_code, province_code FROM psgc_admin_staging WHERE code = $1 LIMIT 1",
        [psgcCode],
      );

      if (!admin.rowCount) {
        skipped += 1;
        continue;
      }

      const name = normalizedText(feature.properties.name ?? feature.properties.brgy_name);
      await client.query(INSERT_SQL, [
        psgcCode,
        name,
        admin.rows[0].city_municipality_code,
        admin.rows[0].province_code,
        JSON.stringify(feature.geometry),
      ]);
      mapped += 1;
    }

    await client.query("COMMIT");
    console.log(`Boundaries mapped into staging: ${mapped}; skipped: ${skipped}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("import-boundaries failed", error);
  process.exit(1);
});
