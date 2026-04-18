#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

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

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS barangay_boundaries (
  psgc_code TEXT PRIMARY KEY REFERENCES psgc_admin(code),
  barangay_name TEXT NOT NULL,
  city_municipality_code TEXT NOT NULL,
  province_code TEXT NOT NULL,
  geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
  source TEXT NOT NULL DEFAULT 'boundary-import'
);
`;

const INSERT_SQL = `
INSERT INTO barangay_boundaries (
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
  ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)),
  'boundary-import'
)
ON CONFLICT (psgc_code) DO UPDATE
SET
  barangay_name = EXCLUDED.barangay_name,
  city_municipality_code = EXCLUDED.city_municipality_code,
  province_code = EXCLUDED.province_code,
  geom = EXCLUDED.geom,
  source = EXCLUDED.source;
`;

const MATCH_SQL = `
SELECT code, city_municipality_code, province_code
FROM psgc_admin
WHERE level = 'brgy' AND (
  code = $1 OR LOWER(REPLACE(name, ' ', '')) = LOWER(REPLACE($2, ' ', ''))
)
LIMIT 1;
`;

function readGeoJson(filePath: string): FeatureCollection {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as FeatureCollection;
}

function readOverrides(filePath: string): OverrideMap {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as OverrideMap;
}

function featureKey(feature: Feature): string {
  const raw = String(feature.properties.code ?? feature.properties.psgc_code ?? "").trim();
  if (raw) return `code:${raw}`;

  const name = String(feature.properties.name ?? feature.properties.brgy_name ?? "").trim();
  const city = String(feature.properties.city ?? feature.properties.municipality ?? "").trim();
  return `name:${name}|city:${city}`;
}

async function resolvePsgcCode(client: Client, feature: Feature, overrides: OverrideMap): Promise<string | null> {
  const key = featureKey(feature);
  const override = overrides[key];
  if (override?.psgcCode) {
    return override.psgcCode;
  }

  const candidateCode = String(feature.properties.code ?? feature.properties.psgc_code ?? "").trim();
  const candidateName = String(feature.properties.name ?? feature.properties.brgy_name ?? "").trim();

  const found = await client.query(MATCH_SQL, [candidateCode, candidateName]);
  return found.rows[0]?.code ?? null;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const geoJson = readGeoJson(BOUNDARY_FILE);
  const overrides = readOverrides(OVERRIDES_FILE);

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(CREATE_TABLE_SQL);

    let mapped = 0;
    let skipped = 0;

    for (const feature of geoJson.features) {
      const psgcCode = await resolvePsgcCode(client, feature, overrides);
      if (!psgcCode) {
        skipped += 1;
        continue;
      }

      const admin = await client.query(
        "SELECT city_municipality_code, province_code FROM psgc_admin WHERE code = $1 LIMIT 1",
        [psgcCode],
      );
      if (!admin.rowCount) {
        skipped += 1;
        continue;
      }

      const name = String(feature.properties.name ?? feature.properties.brgy_name ?? "").trim();
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
    console.log(`Boundaries mapped: ${mapped}; skipped: ${skipped}`);
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
