#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import * as shapefile from "shapefile";

import { loadLocalEnv } from "./_lib/env";

loadLocalEnv();

type SourceProperties = {
  adm2_psgc: number | string;
  adm3_psgc: number | string;
  adm4_psgc: number | string;
  adm4_en: string;
  area_km2?: number | string;
};

type SourceFeature = {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: SourceProperties;
};

type OutputFeature = {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: {
    code: string;
    psgc_code: string;
    name: string;
    city_municipality_code: string;
    province_code: string;
    area_km2: number | null;
  };
};

const DEFAULT_SOURCE_PATH = "data/source/ph-adm4/PH_Adm4_BgySubMuns.shp.shp";
const DEFAULT_OUTPUT_PATH = process.env.BOUNDARY_GEOJSON_PATH ?? "data/barangays.geojson";
const ILOILO_PROVINCE_CODE = 603000000;
const ILOILO_CITY_CODE = 631000000;

function normalizeNumericCode(value: string | number): string {
  return String(value).replace(/\D/g, "");
}

function padBarangayCode(value: string | number): string {
  return normalizeNumericCode(value).padStart(10, "0");
}

function deriveMunicipalityCode(barangayCode: string): string {
  return barangayCode.slice(0, 9);
}

function deriveProvinceCode(barangayCode: string): string {
  return barangayCode.slice(0, 4);
}

function normalizeArea(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getSourcePath(): string {
  const cliPath = process.argv[2]?.trim();
  const sourcePath = path.resolve(cliPath || DEFAULT_SOURCE_PATH);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(
      `Barangay shapefile not found at ${sourcePath}. Download/extract the Level 4 boundary shapefile first or pass the .shp path as an argument.`,
    );
  }

  return sourcePath;
}

function ensureOutputDirectory(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function main() {
  const sourcePath = getSourcePath();
  const outputPath = path.resolve(DEFAULT_OUTPUT_PATH);
  ensureOutputDirectory(outputPath);

  const features: OutputFeature[] = [];
  const source = await shapefile.open(sourcePath);

  for (;;) {
    const row = await source.read();
    if (row.done) {
      break;
    }

    const feature = row.value as SourceFeature;
    const properties = feature.properties;
    const provinceCode = Number(properties.adm2_psgc);
    const municipalityCode = Number(properties.adm3_psgc);

    if (provinceCode !== ILOILO_PROVINCE_CODE && municipalityCode !== ILOILO_CITY_CODE) {
      continue;
    }

    const barangayCode = padBarangayCode(properties.adm4_psgc);
    features.push({
      type: "Feature",
      geometry: feature.geometry,
      properties: {
        code: barangayCode,
        psgc_code: barangayCode,
        name: String(properties.adm4_en ?? "").trim(),
        city_municipality_code: deriveMunicipalityCode(barangayCode),
        province_code: deriveProvinceCode(barangayCode),
        area_km2: normalizeArea(properties.area_km2),
      },
    });
  }

  if (features.length === 0) {
    throw new Error("No Iloilo/Iloilo City barangay features were found in the provided shapefile.");
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify({ type: "FeatureCollection", features }, null, 2),
    "utf8",
  );

  console.log(`Generated ${features.length} Iloilo barangay features at ${outputPath}.`);
}

main().catch((error) => {
  console.error("generate-iloilo-boundaries failed", error);
  process.exit(1);
});
