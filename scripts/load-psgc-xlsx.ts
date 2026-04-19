#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import * as XLSX from "xlsx";

import { getPgClientConfig } from "../lib/pg-config";
import { loadLocalEnv } from "./_lib/env";

loadLocalEnv();

type RawRow = {
  "10-digit PSGC"?: string | number | null;
  Name?: string | null;
  "Correspondence Code"?: string | number | null;
  "Geographic Level"?: string | null;
};

type NormalizedLevel = "reg" | "prov" | "city" | "mun" | "brgy";

type StagingRow = {
  code: string;
  name: string;
  level: NormalizedLevel;
  parentCode: string | null;
  regionCode: string | null;
  provinceCode: string | null;
  cityMunicipalityCode: string | null;
  barangayCode: string | null;
};

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS staging_psgc (
  code VARCHAR(10) PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  parent_code VARCHAR(10),
  region_code VARCHAR(2),
  province_code VARCHAR(4),
  city_municipality_code VARCHAR(9),
  barangay_code VARCHAR(10)
);
`;

const TRUNCATE_SQL = `TRUNCATE TABLE staging_psgc;`;

function getWorkbookPath(): string {
  const cliPath = process.argv[2]?.trim();
  const envPath = process.env.PSGC_XLSX_PATH?.trim();
  const resolved = cliPath || envPath;

  if (!resolved) {
    throw new Error("PSGC XLSX path is required. Pass it as an argument or set PSGC_XLSX_PATH.");
  }

  const filePath = path.resolve(resolved);
  if (!fs.existsSync(filePath)) {
    throw new Error(`PSGC XLSX file not found: ${filePath}`);
  }

  return filePath;
}

function normalizeDigits(value: string | number | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLevel(value: string | null | undefined): NormalizedLevel | null {
  const normalized = normalizeText(value).toLowerCase();

  switch (normalized) {
    case "reg":
      return "reg";
    case "prov":
      return "prov";
    case "city":
      return "city";
    case "mun":
      return "mun";
    case "bgy":
    case "brgy":
      return "brgy";
    default:
      return null;
  }
}

function normalizePsgcCode(code: string): string {
  return code.padStart(10, "0");
}

function normalizeCorrespondenceCode(code: string): string {
  return code.padStart(9, "0");
}

function deriveHierarchy(level: NormalizedLevel, correspondenceCode: string): {
  regionCode: string | null;
  provinceCode: string | null;
  cityMunicipalityCode: string | null;
} {
  const regionCode = correspondenceCode.slice(0, 2);

  switch (level) {
    case "reg":
      return {
        regionCode,
        provinceCode: null,
        cityMunicipalityCode: null,
      };
    case "prov":
      return {
        regionCode,
        provinceCode: correspondenceCode.slice(0, 4),
        cityMunicipalityCode: null,
      };
    case "city":
    case "mun":
      return {
        regionCode,
        provinceCode: correspondenceCode.slice(0, 4),
        cityMunicipalityCode: correspondenceCode,
      };
    case "brgy":
      return {
        regionCode,
        provinceCode: correspondenceCode.slice(0, 4),
        cityMunicipalityCode: `${correspondenceCode.slice(0, 6)}000`,
      };
    default:
      return {
        regionCode,
        provinceCode: null,
        cityMunicipalityCode: null,
      };
  }
}

function deriveParentCode(
  level: NormalizedLevel,
  regionCode: string | null,
  provinceCode: string | null,
  cityMunicipalityCode: string | null,
): string | null {
  switch (level) {
    case "reg":
      return null;
    case "prov":
      return regionCode ? `${regionCode}00000000` : null;
    case "city":
    case "mun":
      return provinceCode ? `${provinceCode}000000` : null;
    case "brgy":
      return cityMunicipalityCode ? `${cityMunicipalityCode}0` : null;
    default:
      return null;
  }
}

function normalizeRow(row: RawRow): StagingRow | null {
  const name = normalizeText(row.Name);
  const level = normalizeLevel(row["Geographic Level"]);
  const psgcCode = normalizeDigits(row["10-digit PSGC"]);
  const correspondenceCode = normalizeDigits(row["Correspondence Code"]);

  if (!name || !level || !psgcCode || !correspondenceCode) {
    return null;
  }

  const code = normalizePsgcCode(psgcCode);
  const normalizedCorrespondenceCode = normalizeCorrespondenceCode(correspondenceCode);
  const { regionCode, provinceCode, cityMunicipalityCode } = deriveHierarchy(level, normalizedCorrespondenceCode);
  const barangayCode = level === "brgy" ? code : null;
  const parentCode = deriveParentCode(level, regionCode, provinceCode, cityMunicipalityCode);

  return {
    code,
    name,
    level,
    parentCode,
    regionCode,
    provinceCode,
    cityMunicipalityCode,
    barangayCode,
  };
}

function readWorksheetRows(filePath: string): StagingRow[] {
  const workbook = XLSX.readFile(filePath, { raw: false });
  const worksheet = workbook.Sheets.PSGC;

  if (!worksheet) {
    throw new Error("Worksheet `PSGC` not found in the provided XLSX file.");
  }

  const rawRows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: null });
  const normalizedRows = rawRows
    .map((row) => normalizeRow(row))
    .filter((row): row is StagingRow => row !== null);

  if (normalizedRows.length === 0) {
    throw new Error("No PSGC rows were parsed from the `PSGC` worksheet.");
  }

  return normalizedRows;
}

async function insertBatch(client: Client, rows: StagingRow[]) {
  const values: unknown[] = [];
  const tuples = rows.map((row, index) => {
    const offset = index * 8;
    values.push(
      row.code,
      row.name,
      row.level,
      row.parentCode,
      row.regionCode,
      row.provinceCode,
      row.cityMunicipalityCode,
      row.barangayCode,
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
  });

  await client.query(
    `
    INSERT INTO staging_psgc (
      code,
      name,
      level,
      parent_code,
      region_code,
      province_code,
      city_municipality_code,
      barangay_code
    )
    VALUES ${tuples.join(", ")}
    ON CONFLICT (code) DO UPDATE
    SET
      name = EXCLUDED.name,
      level = EXCLUDED.level,
      parent_code = EXCLUDED.parent_code,
      region_code = EXCLUDED.region_code,
      province_code = EXCLUDED.province_code,
      city_municipality_code = EXCLUDED.city_municipality_code,
      barangay_code = EXCLUDED.barangay_code;
    `,
    values,
  );
}

async function main() {
  const filePath = getWorkbookPath();
  const rows = readWorksheetRows(filePath);
  const client = new Client(getPgClientConfig());

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(CREATE_TABLE_SQL);
    await client.query(TRUNCATE_SQL);

    const batchSize = 500;
    for (let index = 0; index < rows.length; index += batchSize) {
      await insertBatch(client, rows.slice(index, index + batchSize));
    }

    await client.query("COMMIT");
    console.log(`Loaded ${rows.length} PSGC rows into staging_psgc from ${filePath}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("load-psgc-xlsx failed", error);
  process.exit(1);
});
